import { describe, it, expect } from 'vitest'

// Extract the computed function for testing
// Since it's not exported, we test it via its inputs/outputs pattern
// by recreating it here — keeping it in sync with useHistory.js

import { evaluatePrediction } from '../utils/stocks.js'

// Mirror of the computed() function from useHistory.js
// v7.19.0 — 3-tier hit-rate ladder (each metric includes the previous one):
//   hitRate      = hit / evaluated
//   hitRateClose = (hit + close) / evaluated
//   hitRateExt   = (hit + close + exceeded) / evaluated
// miss and wrong_way never count toward any rate.
//
// NOTE: this mirror was out of sync with the real computed() before this change
// (missing exceeded, wrongWay, hitRateExt, market, direction). Rewritten here to
// match useHistory.js field-for-field, including chartDataByMetric.
function computed(history, margin = 5) {
  if (!history?.batches?.length) return null

  const HORIZONS = ['1M', '3M', '6M', '12M']

  const parseBatchDate = (str) => {
    if (!str) return new Date(0)
    const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1])
    const d = new Date(str)
    return isNaN(d) ? new Date(0) : d
  }

  const sortedBatches = [...history.batches].sort(
    (a, b) => parseBatchDate(a.date) - parseBatchDate(b.date)
  )

  const all = sortedBatches.flatMap(b => b.results)

  const byHorizon = HORIZONS.map(h => {
    const allRows  = all.filter(r => r.horizon === h)
    const rows     = allRows.filter(r => r.verdict !== 'awaiting')
    const hit      = rows.filter(r => r.verdict === 'hit').length
    const exceeded = rows.filter(r => r.verdict === 'exceeded').length
    const close    = rows.filter(r => r.verdict === 'close').length
    const miss     = rows.filter(r => r.verdict === 'miss').length
    const wrongWay = rows.filter(r => r.verdict === 'wrong_way').length
    const awaiting = allRows.filter(r => r.verdict === 'awaiting').length
    const total    = rows.length
    const hitRate      = total ? Math.round(hit / total * 100) : null
    const hitRateClose = total ? Math.round((hit + close) / total * 100) : null
    const hitRateExt   = total ? Math.round((hit + close + exceeded) / total * 100) : null
    return { horizon: h, total, hit, exceeded, close, miss, wrongWay, awaiting, hitRate, hitRateClose, hitRateExt }
  })

  const evaluated        = all.filter(r => r.verdict !== 'awaiting')
  const totalHit         = evaluated.filter(r => r.verdict === 'hit').length
  const totalClose       = evaluated.filter(r => r.verdict === 'close').length
  const totalExceeded    = evaluated.filter(r => r.verdict === 'exceeded').length
  const totalAwaiting    = all.filter(r => r.verdict === 'awaiting').length
  const overallRate      = evaluated.length ? Math.round(totalHit / evaluated.length * 100) : null
  const overallRateClose = evaluated.length ? Math.round((totalHit + totalClose) / evaluated.length * 100) : null
  const overallRateExt   = evaluated.length ? Math.round((totalHit + totalClose + totalExceeded) / evaluated.length * 100) : null
  const uniqueTickers    = new Set(all.map(r => r.ticker)).size

  const ranked = byHorizon.filter(h => h.hitRate !== null).sort((a, b) => b.hitRate - a.hitRate)
  const bestH  = ranked[0] ?? null
  const worstH = ranked[ranked.length - 1] ?? null

  const batchSummary = [...sortedBatches].reverse().map(b => {
    const res       = b.results
    const evaluated = res.filter(r => r.verdict !== 'awaiting')
    const hit       = evaluated.filter(r => r.verdict === 'hit').length
    const exceeded  = evaluated.filter(r => r.verdict === 'exceeded').length
    const close     = evaluated.filter(r => r.verdict === 'close').length
    const miss      = evaluated.filter(r => r.verdict === 'miss').length
    const wrongWay  = evaluated.filter(r => r.verdict === 'wrong_way').length
    const awaiting  = res.filter(r => r.verdict === 'awaiting').length
    const hitRate      = evaluated.length ? Math.round(hit / evaluated.length * 100) : null
    const hitRateClose = evaluated.length ? Math.round((hit + close) / evaluated.length * 100) : null
    const hitRateExt   = evaluated.length ? Math.round((hit + close + exceeded) / evaluated.length * 100) : null
    return {
      id: b.id, date: b.date,
      savedAt: b.savedAt, updatedAt: b.updatedAt,
      stocks: b.stocks, evaluated: evaluated.length,
      hit, exceeded, close, miss, wrongWay, awaiting,
      hitRate, hitRateClose, hitRateExt,
      direction: b.direction ?? 'bullish',
      // market: marketOf(b.results?.[0]?.ticker) in the real computed() — marketOf()
      // lives in storage.js and isn't exercised by these tests, so it's omitted here.
    }
  })

  const chartBatches = sortedBatches
  const chartDataByMetric = {
    hit: HORIZONS.map(h => chartBatches.map(b => {
      const rows = b.results.filter(r => r.horizon === h && r.verdict !== 'awaiting')
      const hit  = rows.filter(r => r.verdict === 'hit').length
      return rows.length ? Math.round(hit / rows.length * 100) : null
    })),
    hitClose: HORIZONS.map(h => chartBatches.map(b => {
      const rows  = b.results.filter(r => r.horizon === h && r.verdict !== 'awaiting')
      const hit   = rows.filter(r => r.verdict === 'hit').length
      const close = rows.filter(r => r.verdict === 'close').length
      return rows.length ? Math.round((hit + close) / rows.length * 100) : null
    })),
    hitExt: HORIZONS.map(h => chartBatches.map(b => {
      const rows     = b.results.filter(r => r.horizon === h && r.verdict !== 'awaiting')
      const hit      = rows.filter(r => r.verdict === 'hit').length
      const close    = rows.filter(r => r.verdict === 'close').length
      const exceeded = rows.filter(r => r.verdict === 'exceeded').length
      return rows.length ? Math.round((hit + close + exceeded) / rows.length * 100) : null
    })),
  }
  const chartData   = chartDataByMetric.hit
  const chartLabels = chartBatches.map(b => b.date)

  return {
    byHorizon, overallRate, overallRateClose, overallRateExt, bestH, worstH,
    evaluated: evaluated.length,
    totalAwaiting,
    uniqueTickers,
    totalBatches: history.batches.length,
    batchSummary, chartData, chartDataByMetric, chartLabels,
  }
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

  // ── v7.19.0 — 3-tier hit-rate ladder ────────────────────────────────────────

  it('hitRateClose counts hit + close, matching the 89-case real-data scenario', () => {
    // Mirrors the real batch that motivated this change: 9 close out of 89 evaluated.
    // Here scaled down: 4 hit, 2 close, 3 miss = 9 evaluated.
    const results = [
      makeResult('A', '1M', 'hit'), makeResult('B', '1M', 'hit'),
      makeResult('C', '1M', 'hit'), makeResult('D', '1M', 'hit'),
      makeResult('E', '1M', 'close'), makeResult('F', '1M', 'close'),
      makeResult('G', '1M', 'miss'), makeResult('H', '1M', 'miss'), makeResult('I', '1M', 'miss'),
    ]
    const stats = computed({ batches: [makeBatch(1, results)] })
    const h1M = stats.byHorizon.find(h => h.horizon === '1M')
    expect(h1M.hit).toBe(4)
    expect(h1M.close).toBe(2)
    expect(h1M.hitRate).toBe(44)       // 4/9
    expect(h1M.hitRateClose).toBe(67)  // (4+2)/9
  })

  it('hitRateExt includes close verdicts, not just exceeded (the bug this version fixes)', () => {
    const results = [
      makeResult('A', '1M', 'hit'),
      makeResult('B', '1M', 'close'),
      makeResult('C', '1M', 'exceeded'),
      makeResult('D', '1M', 'miss'),
    ]
    const stats = computed({ batches: [makeBatch(1, results)] })
    const h1M = stats.byHorizon.find(h => h.horizon === '1M')
    // Before this fix hitRateExt would have been (hit+exceeded)/total = 2/4 = 50%,
    // silently dropping the 'close' verdict. It must now be (hit+close+exceeded)/total = 3/4 = 75%.
    expect(h1M.hitRateExt).toBe(75)
    expect(h1M.hitRateClose).toBe(50) // (hit+close)/total = 2/4
  })

  it('the ladder never goes backwards: hitRateExt >= hitRateClose >= hitRate', () => {
    const scenarios = [
      [makeResult('A', '1M', 'hit'), makeResult('B', '1M', 'close'), makeResult('C', '1M', 'exceeded'), makeResult('D', '1M', 'miss')],
      [makeResult('A', '3M', 'close'), makeResult('B', '3M', 'close'), makeResult('C', '3M', 'wrong_way')],
      [makeResult('A', '6M', 'exceeded'), makeResult('B', '6M', 'miss')],
      [makeResult('A', '12M', 'hit'), makeResult('B', '12M', 'hit')],
    ]
    for (const results of scenarios) {
      const stats = computed({ batches: [makeBatch(1, results)] })
      for (const h of stats.byHorizon) {
        if (h.hitRate === null) continue
        expect(h.hitRateExt).toBeGreaterThanOrEqual(h.hitRateClose)
        expect(h.hitRateClose).toBeGreaterThanOrEqual(h.hitRate)
      }
    }
  })

  it('miss and wrong_way never count toward any of the 3 rates', () => {
    const results = [
      makeResult('A', '1M', 'miss'), makeResult('B', '1M', 'wrong_way'),
      makeResult('C', '1M', 'miss'), makeResult('D', '1M', 'wrong_way'),
    ]
    const stats = computed({ batches: [makeBatch(1, results)] })
    const h1M = stats.byHorizon.find(h => h.horizon === '1M')
    expect(h1M.hitRate).toBe(0)
    expect(h1M.hitRateClose).toBe(0)
    expect(h1M.hitRateExt).toBe(0)
    expect(h1M.wrongWay).toBe(2)
  })

  it('batchSummary exposes hitRateClose alongside hitRate/hitRateExt, ladder holds', () => {
    const results = [
      makeResult('A', '1M', 'hit'), makeResult('B', '1M', 'close'), makeResult('C', '1M', 'exceeded'),
    ]
    const stats = computed({ batches: [makeBatch(1, results)] })
    const summary = stats.batchSummary[0]
    expect(summary.hitRate).toBe(33)       // 1/3
    expect(summary.hitRateClose).toBe(67)  // 2/3
    expect(summary.hitRateExt).toBe(100)   // 3/3
    expect(summary.hitRateExt).toBeGreaterThanOrEqual(summary.hitRateClose)
    expect(summary.hitRateClose).toBeGreaterThanOrEqual(summary.hitRate)
  })

  it('overallRateClose and overallRateExt follow the same ladder as byHorizon', () => {
    const results = [
      makeResult('A', '1M', 'hit'), makeResult('B', '1M', 'close'),
      makeResult('C', '3M', 'exceeded'), makeResult('D', '3M', 'miss'),
    ]
    const stats = computed({ batches: [makeBatch(1, results)] })
    expect(stats.overallRate).toBe(25)       // 1/4
    expect(stats.overallRateClose).toBe(50)  // 2/4
    expect(stats.overallRateExt).toBe(75)    // 3/4
  })

  it('chartDataByMetric exposes 3 parallel series and chartData aliases the hit series', () => {
    const results = [
      makeResult('A', '1M', 'hit'), makeResult('A', '3M', 'close'),
      makeResult('A', '6M', 'exceeded'), makeResult('A', '12M', 'miss'),
    ]
    const stats = computed({ batches: [makeBatch(1, results)] })
    expect(stats.chartDataByMetric).toHaveProperty('hit')
    expect(stats.chartDataByMetric).toHaveProperty('hitClose')
    expect(stats.chartDataByMetric).toHaveProperty('hitExt')
    expect(stats.chartData).toEqual(stats.chartDataByMetric.hit)
  })

})
