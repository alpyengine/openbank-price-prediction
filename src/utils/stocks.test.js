import { describe, it, expect } from 'vitest'
import {
  evaluatePrediction,
  getTarget,
  distancePct,
  getEffectivePrice,
  priceStatus,
} from './stocks.js'

// ── evaluatePrediction ────────────────────────────────────────────────────────

describe('evaluatePrediction', () => {

  // Bullish (target > base)
  describe('bullish direction', () => {
    const base = 100

    it('returns hit when price reaches bullish target', () => {
      expect(evaluatePrediction(110, 110, base).verdict).toBe('hit')
    })

    it('returns hit when price exceeds bullish target', () => {
      expect(evaluatePrediction(120, 110, base).verdict).toBe('hit')
    })

    it('returns close when price is within default ±5% of target', () => {
      // price = 106, target = 110 → dist = 3.6% → close
      expect(evaluatePrediction(106, 110, base).verdict).toBe('close')
    })

    it('returns miss when price is far below bullish target', () => {
      expect(evaluatePrediction(90, 110, base).verdict).toBe('miss')
    })

    it('returns close with custom margin 10%', () => {
      // price = 101, target = 110 → dist = 8.2% → close at margin=10
      expect(evaluatePrediction(101, 110, base, 10).verdict).toBe('close')
    })

    it('returns miss with strict margin 2%', () => {
      // price = 106, target = 110 → dist = 3.6% → miss at margin=2
      expect(evaluatePrediction(106, 110, base, 2).verdict).toBe('miss')
    })
  })

  // Bearish (target < base)
  describe('bearish direction', () => {
    const base = 100

    it('returns hit when price drops to bearish target', () => {
      expect(evaluatePrediction(80, 80, base).verdict).toBe('hit')
    })

    it('returns hit when price drops below bearish target', () => {
      expect(evaluatePrediction(75, 80, base).verdict).toBe('hit')
    })

    it('returns close when price is within ±5% above bearish target', () => {
      // price = 83, target = 80 → dist = 3.75% → close
      expect(evaluatePrediction(83, 80, base).verdict).toBe('close')
    })

    it('returns miss when price stays above bearish target', () => {
      expect(evaluatePrediction(95, 80, base).verdict).toBe('miss')
    })
  })

  // Neutral (target = base)
  describe('neutral direction', () => {
    it('returns hit when price is within margin of neutral target', () => {
      expect(evaluatePrediction(102, 100, 100).verdict).toBe('hit')
    })

    it('returns miss when price is far from neutral target', () => {
      expect(evaluatePrediction(115, 100, 100).verdict).toBe('miss')
    })
  })

  // Edge cases
  describe('edge cases', () => {
    it('returns null verdict when price is null', () => {
      expect(evaluatePrediction(null, 100, 90).verdict).toBeNull()
    })

    it('returns null verdict when target is null', () => {
      expect(evaluatePrediction(100, null, 90).verdict).toBeNull()
    })

    it('returns hit when price equals target exactly', () => {
      expect(evaluatePrediction(100, 100, 90).verdict).toBe('hit')
    })

    it('always returns direction field', () => {
      const r = evaluatePrediction(110, 105, 100)
      expect(r.direction).toBe('bullish')
    })

    it('always returns distAbs field when price and target given', () => {
      const r = evaluatePrediction(110, 100, 90)
      expect(typeof r.distAbs).toBe('number')
      expect(r.distAbs).toBeCloseTo(10)
    })
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
  const ticker = 'AAPL'

  it('override takes priority over everything', () => {
    const result = getEffectivePrice(ticker, '1M', { AAPL: 200 }, { AAPL_1M: { price: 150 } }, { AAPL: 999 }, false)
    expect(result.price).toBe(999)
    expect(result.isHistorical).toBe(false)
  })

  it('uses historical price when horizon expired', () => {
    const histPrices = { AAPL_1M: { price: 155, date: '18 Apr 2026' } }
    const result = getEffectivePrice(ticker, '1M', { AAPL: 160 }, histPrices, {}, true)
    expect(result.price).toBe(155)
    expect(result.isHistorical).toBe(true)
  })

  it('uses autoPrice when horizon not expired', () => {
    const result = getEffectivePrice(ticker, '3M', { AAPL: 160 }, {}, {}, false)
    expect(result.price).toBe(160)
    expect(result.isHistorical).toBe(false)
  })

  it('returns null price when nothing available', () => {
    const result = getEffectivePrice(ticker, '1M', {}, {}, {}, false)
    expect(result.price).toBeNull()
  })

  it('falls back to autoPrice when expired but no historical price', () => {
    const result = getEffectivePrice(ticker, '1M', { AAPL: 160 }, {}, {}, true)
    expect(result.price).toBe(160)
    expect(result.isHistorical).toBe(false)
  })
})

// ── priceStatus (legacy) ──────────────────────────────────────────────────────

describe('priceStatus', () => {
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
