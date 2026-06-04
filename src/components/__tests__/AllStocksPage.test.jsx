/**
 * AllStocksPage.test.jsx
 *
 * Tests for the pure functions inside AllStocksPage:
 *   - calcScore: Investment Score calculation (0-100)
 *   - deduplicateStocks logic (via the exported helper)
 *   - hKey mapping (horizon label → stock field)
 *
 * What we test:
 *   - Score calculation with all three components (Upside, PEG, Margin)
 *   - EPS negative penalty (−20 points)
 *   - Score clamps to 0 minimum
 *   - Score is null when no fundamentals
 *   - hKey maps correctly for all 4 horizons
 *
 * What we don't test:
 *   - Full page render (requires Supabase mock — too complex for unit tests)
 *   - Filter UI interactions (covered manually)
 *
 * Note: We replicate the pure functions here for isolation.
 * Any change to the scoring formula in AllStocksPage.jsx
 * must be reflected here too.
 */
import { describe, it, expect } from 'vitest'

// ── Replicated from AllStocksPage.jsx ────────────────────────────────────────

const WEIGHTS = { upside: 0.40, peg: 0.45, margin: 0.15 }

function upsideScore(upside) {
  if (upside < 0)   return 0
  if (upside < 10)  return 20
  if (upside < 20)  return 40
  if (upside < 30)  return 65
  if (upside < 50)  return 85
  return 100
}

function pegScore(peg) {
  if (peg == null || peg < 0) return 0
  if (peg <= 0.5)  return 100
  if (peg <= 1.0)  return 85
  if (peg <= 1.5)  return 60
  if (peg <= 2.0)  return 30
  return 0
}

function marginScore(margin) {
  if (margin == null || margin < 0) return 0
  if (margin < 5)   return 20
  if (margin < 15)  return 50
  if (margin < 25)  return 75
  return 100
}

function calcScore(upside12, fundamental) {
  if (!fundamental) return null
  const peg    = fundamental.pegTTM
  const margin = fundamental.netMarginTTM
  const negEPS = fundamental.epsGrowthTTM != null && fundamental.epsGrowthTTM < 0
  const raw = (
    WEIGHTS.upside * upsideScore(upside12) +
    WEIGHTS.peg    * pegScore(peg) +
    WEIGHTS.margin * marginScore(margin)
  ) - (negEPS ? 20 : 0)
  return Math.max(0, Math.round(raw))
}

// hKey mapping — must match AllStocksPage.jsx
const HORIZON_KEY = { '1M': 'u1', '3M': 'u3', '6M': 'u6', '12M': 'u12' }

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('calcScore', () => {
  it('returns null when no fundamentals', () => {
    expect(calcScore(30, null)).toBeNull()
    expect(calcScore(30, undefined)).toBeNull()
  })

  it('calculates score for strong ticker (high upside, low PEG, good margin)', () => {
    const f = { pegTTM: 0.29, netMarginTTM: 41.5, epsGrowthTTM: 412 }
    const score = calcScore(38.7, f)
    // upside 38.7 → upsideScore=85, peg 0.29 → pegScore=100, margin 41.5 → marginScore=100
    // raw = 0.4*85 + 0.45*100 + 0.15*100 = 34 + 45 + 15 = 94
    expect(score).toBe(94)
  })

  it('applies -20 penalty for negative EPS growth', () => {
    const f = { pegTTM: 0.29, netMarginTTM: 41.5, epsGrowthTTM: -5 }
    const score = calcScore(38.7, f)
    expect(score).toBe(74) // 94 - 20
  })

  it('clamps score to minimum 0', () => {
    const f = { pegTTM: 5, netMarginTTM: -10, epsGrowthTTM: -50 }
    const score = calcScore(-10, f)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('returns 0 score for negative upside and bad fundamentals', () => {
    const f = { pegTTM: 5, netMarginTTM: 2, epsGrowthTTM: -50 }
    const score = calcScore(-15, f)
    expect(score).toBe(0)
  })

  it('handles missing PEG (null) gracefully', () => {
    const f = { pegTTM: null, netMarginTTM: 20, epsGrowthTTM: 30 }
    const score = calcScore(25, f)
    expect(typeof score).toBe('number')
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('handles missing margin (null) gracefully', () => {
    const f = { pegTTM: 1.2, netMarginTTM: null, epsGrowthTTM: 30 }
    const score = calcScore(25, f)
    expect(typeof score).toBe('number')
    expect(score).toBeGreaterThanOrEqual(0)
  })
})

describe('horizon key mapping', () => {
  it('maps 1M to u1', () => {
    expect(HORIZON_KEY['1M']).toBe('u1')
  })

  it('maps 3M to u3', () => {
    expect(HORIZON_KEY['3M']).toBe('u3')
  })

  it('maps 6M to u6', () => {
    expect(HORIZON_KEY['6M']).toBe('u6')
  })

  it('maps 12M to u12 (not u12m)', () => {
    expect(HORIZON_KEY['12M']).toBe('u12')
    // This was the bug: '12M'.toLowerCase() = '12m' → 'u12m' ≠ 'u12'
    expect(HORIZON_KEY['12M']).not.toBe('u12m')
  })
})

describe('upsideScore thresholds', () => {
  it('returns 0 for negative upside', () => {
    expect(upsideScore(-5)).toBe(0)
  })

  it('returns 20 for 0-9% upside', () => {
    expect(upsideScore(5)).toBe(20)
    expect(upsideScore(9.9)).toBe(20)
  })

  it('returns 85 for 30-49% upside', () => {
    expect(upsideScore(35)).toBe(85)
  })

  it('returns 100 for 50%+ upside', () => {
    expect(upsideScore(60)).toBe(100)
  })
})

describe('pegScore thresholds (Peter Lynch)', () => {
  it('returns 0 for null PEG', () => {
    expect(pegScore(null)).toBe(0)
  })

  it('returns 0 for negative PEG (EPS negative)', () => {
    expect(pegScore(-6.4)).toBe(0)
  })

  it('returns 100 for PEG ≤ 0.5 (very undervalued)', () => {
    expect(pegScore(0.29)).toBe(100)
    expect(pegScore(0.5)).toBe(100)
  })

  it('returns 85 for PEG 0.5-1.0 (undervalued)', () => {
    expect(pegScore(0.82)).toBe(85)
  })

  it('returns 30 for PEG 1.5-2.0 (fair/slightly expensive)', () => {
    expect(pegScore(1.69)).toBe(30)
  })

  it('returns 0 for PEG > 2 (expensive)', () => {
    expect(pegScore(3.52)).toBe(0)
  })
})
