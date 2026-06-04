/**
 * stocks.test.js — Tests for stock prediction utility functions
 *
 * Coverage:
 *   evaluatePrediction() — full verdict system including new verdicts
 *   SNAPSHOT_PARAMS      — fixed parameters per horizon
 *   getTarget()          — target price resolution
 *   distancePct()        — distance calculation
 *   getEffectivePrice()  — price resolution priority
 *   priceStatus()        — legacy helper (backwards compat)
 *
 * Test naming convention:
 *   Each test describes the input condition and expected output.
 *   Numbers in comments show the calculation path for verification.
 */
import { describe, it, expect } from 'vitest'
import {
  evaluatePrediction,
  getTarget,
  distancePct,
  getEffectivePrice,
  priceStatus,
  SNAPSHOT_PARAMS,
  CLOSE_RATIO_DEFAULT,
} from './stocks.js'

// ── SNAPSHOT_PARAMS constants ─────────────────────────────────────────────────

describe('SNAPSHOT_PARAMS', () => {
  it('1M has H=3 and R=2.0', () => {
    expect(SNAPSHOT_PARAMS['1M'].H).toBe(3)
    expect(SNAPSHOT_PARAMS['1M'].R).toBe(2.0)
  })

  it('3M has H=5 and R=2.0', () => {
    expect(SNAPSHOT_PARAMS['3M'].H).toBe(5)
    expect(SNAPSHOT_PARAMS['3M'].R).toBe(2.0)
  })

  it('6M has H=7 and R=1.8', () => {
    expect(SNAPSHOT_PARAMS['6M'].H).toBe(7)
    expect(SNAPSHOT_PARAMS['6M'].R).toBe(1.8)
  })

  it('12M has H=10 and R=1.6', () => {
    expect(SNAPSHOT_PARAMS['12M'].H).toBe(10)
    expect(SNAPSHOT_PARAMS['12M'].R).toBe(1.6)
  })

  it('CLOSE_RATIO_DEFAULT is 2.4', () => {
    expect(CLOSE_RATIO_DEFAULT).toBe(2.4)
  })
})

// ── evaluatePrediction — live mode (slider) ───────────────────────────────────

describe('evaluatePrediction — live mode (bullish)', () => {
  // base=100, target=110, hitMargin=5 (default), closeRatio=2.4 (default)
  // closeThreshold = 5 × 2.4 = 12%
  // Exceeded: price > 110 × 1.05 = 115.50
  // Hit:      price within ±5% of 110 → 104.5 to 115.5
  // Close:    price between 96.8 (−12%) and 104.5 (−5%) of 110
  // Miss:     price < 96.8 and price >= base
  // Wrong way: price < base (100)

  const base = 100
  const target = 110

  it('returns exceeded when price surpasses target by more than H%', () => {
    // price=120 > 110 × 1.05=115.5 → exceeded
    const r = evaluatePrediction(120, target, base)
    expect(r.verdict).toBe('exceeded')
    expect(r.direction).toBe('bullish')
  })

  it('returns hit when price is exactly at target', () => {
    const r = evaluatePrediction(110, target, base)
    expect(r.verdict).toBe('hit')
  })

  it('returns hit when price is within +H% of target', () => {
    // price=114 → dist = (114-110)/110 × 100 = 3.6% → hit
    const r = evaluatePrediction(114, target, base)
    expect(r.verdict).toBe('hit')
  })

  it('returns hit when price is within −H% of target', () => {
    // price=106 → dist = 3.6% below target → hit
    const r = evaluatePrediction(106, target, base)
    expect(r.verdict).toBe('hit')
  })

  it('returns close when price is between −H% and −closeThreshold%', () => {
    // price=100 → 9.1% below target → between 5% and 12% → close
    const r = evaluatePrediction(100, target, base)
    expect(r.verdict).toBe('close')
  })

  it('returns miss when price is more than −closeThreshold% below target but above base', () => {
    // price=95, dist from target = 13.6% > 12% → miss (still above base=100? no, below)
    // Actually price=95 < base=100 → wrong_way. Use price=97 which is below target
    // but 97 < 100 (base) so also wrong_way. Need price between base and close threshold.
    // base=100, target=110. Price must be: >= 100 and < 96.8 (impossible together)
    // So let's use base=80, target=110. Price=93: above base(80), below close threshold
    const r = evaluatePrediction(93, 110, 80)
    expect(r.verdict).toBe('miss')
  })

  it('returns wrong_way when bullish prediction but price fell below base', () => {
    // base=100, target=110 (bullish). Price=85 < base=100 → wrong_way
    const r = evaluatePrediction(85, target, base)
    expect(r.verdict).toBe('wrong_way')
    expect(r.direction).toBe('bullish')
  })

  it('returns null verdict when price is null', () => {
    expect(evaluatePrediction(null, target, base).verdict).toBeNull()
  })

  it('returns null verdict when target is null', () => {
    expect(evaluatePrediction(100, null, base).verdict).toBeNull()
  })

  it('always returns direction field', () => {
    expect(evaluatePrediction(110, 105, 100).direction).toBe('bullish')
  })

  it('always returns H and closeThreshold in result', () => {
    const r = evaluatePrediction(110, 105, 100)
    expect(typeof r.H).toBe('number')
    expect(typeof r.closeThreshold).toBe('number')
  })
})

describe('evaluatePrediction — live mode (bearish)', () => {
  // base=100, target=80 (bearish)
  // H=5 (default), closeThreshold=12%
  // Exceeded: price < 80 × (1 - 0.05) = 76
  // Hit:      price within ±5% of 80 → 76 to 84
  // Close:    price between 84 (+5%) and 89.6 (+12%) above target
  // Miss:     price > 89.6 and price <= base
  // Wrong way: price > base (100)

  const base = 100
  const target = 80

  it('returns exceeded when price dropped more than H% below target', () => {
    // price=74 < 80 × 0.95=76 → exceeded
    const r = evaluatePrediction(74, target, base)
    expect(r.verdict).toBe('exceeded')
    expect(r.direction).toBe('bearish')
  })

  it('returns hit when price is exactly at bearish target', () => {
    expect(evaluatePrediction(80, target, base).verdict).toBe('hit')
  })

  it('returns hit when price is within +H% of bearish target', () => {
    // price=83 → 3.75% above target → within H=5% → hit
    const r = evaluatePrediction(83, target, base)
    expect(r.verdict).toBe('hit')
  })

  it('returns close when price is between +H% and +closeThreshold% above target', () => {
    // price=87 → 8.75% above target → between 5% and 12% → close
    const r = evaluatePrediction(87, target, base)
    expect(r.verdict).toBe('close')
  })

  it('returns wrong_way when bearish prediction but price rose above base', () => {
    // base=100, target=80 (bearish). Price=115 > base=100 → wrong_way
    const r = evaluatePrediction(115, target, base)
    expect(r.verdict).toBe('wrong_way')
    expect(r.direction).toBe('bearish')
  })
})

// ── evaluatePrediction — snapshot mode ───────────────────────────────────────

describe('evaluatePrediction — snapshot mode', () => {
  // Snapshot mode uses SNAPSHOT_PARAMS[horizon] instead of hitMargin
  // base=100, target=110 (bullish)

  it('1M snapshot: H=3, close threshold=6% — price at exactly target is hit', () => {
    const r = evaluatePrediction(110, 110, 100, 5, { horizon: '1M' })
    expect(r.verdict).toBe('hit')
    expect(r.H).toBe(3)
    expect(r.closeThreshold).toBe(6)
  })

  it('1M snapshot: price 2% below target is hit (within H=3%)', () => {
    // price=107.8 → 2% below 110 → within H=3% → hit
    const r = evaluatePrediction(107.8, 110, 100, 5, { horizon: '1M' })
    expect(r.verdict).toBe('hit')
  })

  it('1M snapshot: price 5% below target is close (between 3% and 6%)', () => {
    // price=104.5 → 5% below 110 → between H=3% and closeThreshold=6% → close
    const r = evaluatePrediction(104.5, 110, 100, 5, { horizon: '1M' })
    expect(r.verdict).toBe('close')
  })

  it('3M snapshot: H=5, close threshold=10%', () => {
    const r = evaluatePrediction(110, 110, 100, 5, { horizon: '3M' })
    expect(r.H).toBe(5)
    expect(r.closeThreshold).toBe(10)
  })

  it('12M snapshot: H=10, close threshold=16%', () => {
    const r = evaluatePrediction(110, 110, 100, 5, { horizon: '12M' })
    expect(r.H).toBe(10)
    expect(r.closeThreshold).toBe(16)
  })

  it('snapshot mode ignores the hitMargin parameter', () => {
    // hitMargin=99 should be ignored when horizon is provided
    const r = evaluatePrediction(110, 110, 100, 99, { horizon: '3M' })
    expect(r.H).toBe(5) // uses SNAPSHOT_PARAMS['3M'].H not 99
  })

  it('exceeded in snapshot mode: 1M price 5% above target', () => {
    // target=110, price=116 → 5.45% above target > H=3% → exceeded
    const r = evaluatePrediction(116, 110, 100, 5, { horizon: '1M' })
    expect(r.verdict).toBe('exceeded')
  })
})

// ── evaluatePrediction — custom closeRatio in live mode ───────────────────────

describe('evaluatePrediction — custom closeRatio', () => {
  it('respects custom closeRatio in opts', () => {
    // base=100, target=110, H=5, closeRatio=3.0 → threshold=15%
    // price=102 → 7.3% below target → between 5% and 15% → close
    const r = evaluatePrediction(102, 110, 100, 5, { closeRatio: 3.0 })
    expect(r.verdict).toBe('close')
    expect(r.closeThreshold).toBe(15)
  })

  it('miss with tighter closeRatio', () => {
    // closeRatio=1.0 → threshold=5% = same as H → very tight
    // price=102 → 7.3% below target → > threshold=5% → miss
    const r = evaluatePrediction(102, 110, 100, 5, { closeRatio: 1.0 })
    expect(r.verdict).toBe('miss')
  })
})

// ── getTarget ─────────────────────────────────────────────────────────────────

describe('getTarget', () => {
  const stock = { t1: 50, t3: 60, t6: 70, t12: 100 }

  it('returns t1 for 1M horizon', () => {
    expect(getTarget(stock, '1M')).toBe(50)
  })

  it('returns t3 for 3M horizon', () => {
    expect(getTarget(stock, '3M')).toBe(60)
  })

  it('returns t6 for 6M horizon', () => {
    expect(getTarget(stock, '6M')).toBe(70)
  })

  it('returns t12 for 12M horizon', () => {
    expect(getTarget(stock, '12M')).toBe(100)
  })

  it('returns highest target for best horizon', () => {
    expect(getTarget(stock, 'best')).toBe(100)
  })

  it('returns highest target for best horizon when 6M is highest', () => {
    const s = { t1: 50, t3: 60, t6: 200, t12: 100 }
    expect(getTarget(s, 'best')).toBe(200)
  })
})

// ── distancePct ───────────────────────────────────────────────────────────────

describe('distancePct', () => {
  it('returns positive % when price above target', () => {
    expect(distancePct(110, 100)).toBeCloseTo(10)
  })

  it('returns negative % when price below target', () => {
    expect(distancePct(90, 100)).toBeCloseTo(-10)
  })

  it('returns 0 when price equals target', () => {
    expect(distancePct(100, 100)).toBe(0)
  })

  it('returns null when price is null', () => {
    expect(distancePct(null, 100)).toBeNull()
  })

  it('returns null when target is 0', () => {
    expect(distancePct(100, 0)).toBeNull()
  })
})

// ── getEffectivePrice ─────────────────────────────────────────────────────────

describe('getEffectivePrice', () => {
  const ticker = 'MU'

  it('override takes priority over everything', () => {
    const r = getEffectivePrice(ticker, '1M', { MU: 200 }, { MU_1M: { price: 150 } }, { MU: 999 }, false)
    expect(r.price).toBe(999)
    expect(r.isHistorical).toBe(false)
  })

  it('uses historical price when horizon expired', () => {
    const histPrices = { MU_1M: { price: 155, date: '18 Apr 2026' } }
    const r = getEffectivePrice(ticker, '1M', { MU: 160 }, histPrices, {}, true)
    expect(r.price).toBe(155)
    expect(r.isHistorical).toBe(true)
    expect(r.historicalDate).toBe('18 Apr 2026')
  })

  it('uses autoPrice when horizon not expired', () => {
    const r = getEffectivePrice(ticker, '3M', { MU: 160 }, {}, {}, false)
    expect(r.price).toBe(160)
    expect(r.isHistorical).toBe(false)
  })

  it('returns null price when nothing available', () => {
    const r = getEffectivePrice(ticker, '1M', {}, {}, {}, false)
    expect(r.price).toBeNull()
  })

  it('falls back to autoPrice when expired but no historical data', () => {
    const r = getEffectivePrice(ticker, '1M', { MU: 160 }, {}, {}, true)
    expect(r.price).toBe(160)
    expect(r.isHistorical).toBe(false)
  })

  it('does NOT use historical price when horizon is best', () => {
    // 'best' horizon never uses historical price — always live
    const histPrices = { MU_best: { price: 155 } }
    const r = getEffectivePrice(ticker, 'best', { MU: 160 }, histPrices, {}, true)
    expect(r.price).toBe(160)
    expect(r.isHistorical).toBe(false)
  })
})

// ── priceStatus (legacy) ──────────────────────────────────────────────────────

describe('priceStatus (legacy)', () => {
  it('returns hit when within margin', () => {
    expect(priceStatus(103, 100)).toBe('hit')
  })

  it('returns close when within 3x margin', () => {
    expect(priceStatus(112, 100)).toBe('close')
  })

  it('returns below when far from target', () => {
    expect(priceStatus(80, 100)).toBe('below')
  })

  it('returns null when price is null', () => {
    expect(priceStatus(null, 100)).toBeNull()
  })

  it('respects custom margin', () => {
    expect(priceStatus(108, 100, 10)).toBe('hit')
  })
})
