import { describe, it, expect } from 'vitest'

// Extract the computed function for testing
// Since it's not exported, we test it via its inputs/outputs pattern
// by recreating it here — keeping it in sync with useHistory.js

import { evaluatePrediction } from '../utils/stocks.js'

// Mirror of the computed() function from useHistory.js
function computed(history, margin = 5) {
  if (!history?.batches?.length) return null

  const HORIZONS = ['1M', '3M', '6M', '12M']
  const all = history.batches.flatMap(b => b.results)

  const byHorizon = HORIZONS.map(h => {
    const allRows  = all.filter(r => r.horizon === h)
    const rows     = allRows.filter(r => r.verdict !== 'awaiting')
    const hit      = rows.filter(r => r.verdict === 'hit').length
    const close    = rows.filter(r => r.verdict === 'close').length
    const miss     = rows.filter(r => r.verdict === 'miss').length
    const awaiting = allRows.filter(r => r.verdict === 'awaiting').length
    const total    = rows.length
    const hitRate  = total ? Math.round(hit / total * 100) : null
    const hitClose = total ? Math.round((hit + close) / total * 100) : null
    return { horizon: h, total, hit, close, miss, awaiting, hitRate, hitClose }
  })

  const evaluated     = all.filter(r => r.verdict !== 'awaiting')
  const totalHit      = evaluated.filter(r => r.verdict === 'hit').length
  const totalAwaiting = all.filter(r => r.verdict === 'awaiting').length
  const overallRate   = evaluated.length ? Math.round(totalHit / evaluated.length * 100) : null
  const uniqueTickers = new Set(all.map(r => r.ticker)).size

  const ranked = byHorizon.filter(h => h.hitRate !== null).sort((a, b) => b.hitRate - a.hitRate)
  const bestH  = ranked[0] ?? null
  const worstH = ranked[ranked.length - 1] ?? null

  const batchSummary = history.batches.map(b => {
    const res       = b.results
    const evaluated = res.filter(r => r.verdict !== 'awaiting')
    const hit       = evaluated.filter(r => r.verdict === 'hit').length
    const miss      = evaluated.filter(r => r.verdict === 'miss').length
    const awaiting  = res.filter(r => r.verdict === 'awaiting').length
    const hitRate   = evaluated.length ? Math.round(hit / evaluated.length * 100) : null
    return { id: b.id, date: b.date, stocks: b.stocks, evaluated: evaluated.length, hit, miss, awaiting, hitRate }
  })

  return { byHorizon, overallRate, bestH, worstH, evaluated: evaluated.length, totalAwaiting, uniqueTickers, totalBatches: history.batches.length, batchSummary }
}

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeResult(ticker, horizon, verdict) {
  return { ticker, horizon, verdict, basePrice: 100, targetPrice: 110, priceOnDate: null }
}

function makeBatch(id, results) {
  return { id, date: `01/01/202${id}`, stocks: new Set(results.map(r => r.ticker)).size, results }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('computed stats', () => {

  it('returns null when history is null', () => {
    expect(computed(null)).toBeNull()
  })

  it('returns null when batches array is empty', () => {
    expect(computed({ batches: [] })).toBeNull()
  })

  it('calculates correct overall hit rate — not 200% or 280%', () => {
    const results = [
      makeResult('TER', '1M', 'hit'),
      makeResult('TER', '3M', 'miss'),
      makeResult('TER', '6M', 'miss'),
      makeResult('TER', '12M', 'awaiting'),
      makeResult('SLB', '1M', 'hit'),
      makeResult('SLB', '3M', 'miss'),
      makeResult('SLB', '6M', 'miss'),
      makeResult('SLB', '12M', 'awaiting'),
    ]
    // 2 hits, 4 miss, 2 awaiting → rate = 2/6 = 33%
    const stats = computed({ batches: [makeBatch(1, results)] })
    expect(stats.overallRate).toBe(33)
    expect(stats.overallRate).toBeLessThanOrEqual(100)
  })

  it('awaiting predictions do NOT count in the hit rate denominator', () => {
    const results = [
      makeResult('TER', '1M', 'hit'),
      makeResult('TER', '3M', 'awaiting'),
      makeResult('TER', '6M', 'awaiting'),
      makeResult('TER', '12M', 'awaiting'),
    ]
    // 1 hit, 0 miss, 3 awaiting → rate = 1/1 = 100%
    const stats = computed({ batches: [makeBatch(1, results)] })
    expect(stats.overallRate).toBe(100)
    expect(stats.evaluated).toBe(1)
  })

  it('totalAwaiting counts all awaiting across all batches', () => {
    const b1 = makeBatch(1, [
      makeResult('TER', '1M', 'hit'),
      makeResult('TER', '3M', 'awaiting'),
    ])
    const b2 = makeBatch(2, [
      makeResult('SLB', '1M', 'miss'),
      makeResult('SLB', '3M', 'awaiting'),
      makeResult('SLB', '6M', 'awaiting'),
    ])
    const stats = computed({ batches: [b1, b2] })
    expect(stats.totalAwaiting).toBe(3)
  })

  it('byHorizon always returns 4 entries', () => {
    const stats = computed({ batches: [makeBatch(1, [makeResult('TER', '1M', 'hit')])] })
    expect(stats.byHorizon).toHaveLength(4)
    expect(stats.byHorizon.map(h => h.horizon)).toEqual(['1M', '3M', '6M', '12M'])
  })

  it('uniqueTickers counts distinct tickers across all batches', () => {
    const b1 = makeBatch(1, [makeResult('TER', '1M', 'hit'), makeResult('SLB', '1M', 'miss')])
    const b2 = makeBatch(2, [makeResult('TER', '1M', 'hit'), makeResult('HWM', '1M', 'hit')])
    const stats = computed({ batches: [b1, b2] })
    expect(stats.uniqueTickers).toBe(3) // TER, SLB, HWM
  })

  it('batchSummary hitRate uses evaluated count — not total stocks', () => {
    // Bug check: 5 stocks × 4 horizons = 20 predictions
    // If only 1M expired: 5 evaluated, not 5 stocks
    const results = [
      makeResult('A', '1M', 'hit'), makeResult('A', '3M', 'awaiting'), makeResult('A', '6M', 'awaiting'), makeResult('A', '12M', 'awaiting'),
      makeResult('B', '1M', 'hit'), makeResult('B', '3M', 'awaiting'), makeResult('B', '6M', 'awaiting'), makeResult('B', '12M', 'awaiting'),
      makeResult('C', '1M', 'miss'), makeResult('C', '3M', 'awaiting'), makeResult('C', '6M', 'awaiting'), makeResult('C', '12M', 'awaiting'),
      makeResult('D', '1M', 'miss'), makeResult('D', '3M', 'awaiting'), makeResult('D', '6M', 'awaiting'), makeResult('D', '12M', 'awaiting'),
      makeResult('E', '1M', 'miss'), makeResult('E', '3M', 'awaiting'), makeResult('E', '6M', 'awaiting'), makeResult('E', '12M', 'awaiting'),
    ]
    const stats = computed({ batches: [makeBatch(1, results)] })
    const summary = stats.batchSummary[0]
    // 2 hits / 5 evaluated = 40% — NOT 2/5stocks = 40% (happens to be same here)
    // but evaluated.length should be 5 not 20
    expect(summary.evaluated).toBe(5)
    expect(summary.hitRate).toBe(40)
    expect(summary.hitRate).toBeLessThanOrEqual(100) // never > 100%
    expect(summary.awaiting).toBe(15)
  })

  it('identifies bestH and worstH correctly', () => {
    const results = [
      makeResult('A', '1M', 'hit'), makeResult('A', '1M', 'hit'), // 2 hits
      makeResult('B', '3M', 'miss'), makeResult('B', '3M', 'miss'), // 0 hits
    ]
    const stats = computed({ batches: [makeBatch(1, results)] })
    expect(stats.bestH?.horizon).toBe('1M')
    expect(stats.worstH?.horizon).toBe('3M')
  })

  it('totalBatches matches number of batches in history', () => {
    const stats = computed({ batches: [
      makeBatch(1, [makeResult('A', '1M', 'hit')]),
      makeBatch(2, [makeResult('B', '1M', 'miss')]),
      makeBatch(3, [makeResult('C', '1M', 'hit')]),
    ]})
    expect(stats.totalBatches).toBe(3)
  })

})
