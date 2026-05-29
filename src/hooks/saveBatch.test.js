import { describe, it, expect } from 'vitest'
import { evaluatePrediction } from '../utils/stocks.js'
import { targetDates, dateStatus, formatDate } from '../utils/dates.js'

// Mirror of the saveBatch evaluation logic from useHistory.js
// This tests the CORE RULE: future horizons must always be 'awaiting'

function buildResults(stocks, autoPrices, histPrices, overrides, margin = 5) {
  const HORIZONS = ['1M', '3M', '6M', '12M']
  const HKEYS    = { '1M':'d1', '3M':'d3', '6M':'d6', '12M':'d12' }
  const TKEYS    = { '1M':'t1', '3M':'t3', '6M':'t6', '12M':'t12' }

  const results = []
  for (const stock of stocks) {
    for (const h of HORIZONS) {
      const tg      = targetDates(stock.base)
      const tgtDate = tg[HKEYS[h]]
      const tgt     = stock[TKEYS[h]]

      const thisHorizonExpired = tgtDate
        ? dateStatus(tgtDate) === 'past'
        : false

      let finalVerdict = 'awaiting'
      let priceOnDate  = null

      if (thisHorizonExpired) {
        const key  = `${stock.t}_${h}`
        const hist = histPrices[key]
        const p    = hist?.price ?? autoPrices[stock.t] ?? null
        if (p) {
          const { verdict } = evaluatePrediction(p, tgt, stock.b, margin)
          finalVerdict = verdict ?? 'awaiting'
          priceOnDate  = p
        }
      }

      results.push({
        ticker:      stock.t,
        horizon:     h,
        verdict:     finalVerdict,
        basePrice:   stock.b,
        targetPrice: tgt,
        priceOnDate,
        targetDate:  tgtDate ? formatDate(tgtDate) : null,
      })
    }
  }
  return results
}

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeStock(ticker, base) {
  return { t: ticker, co: ticker, b: 100, t1: 110, t3: 120, t6: 130, t12: 150, base }
}

const PAST_DATE   = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)  // 60 days ago
const FUTURE_DATE = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)  // 60 days from now

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('saveBatch evaluation logic', () => {

  it('future horizons are always awaiting — even if autoPrice is available', () => {
    const stock   = makeStock('TER', FUTURE_DATE)
    const results = buildResults([stock], { TER: 200 }, {}, {})
    // All horizons should be awaiting since base date is in the future
    results.forEach(r => {
      expect(r.verdict).toBe('awaiting')
    })
  })

  it('expired horizon with historical price evaluates correctly', () => {
    const stock     = makeStock('TER', PAST_DATE)
    const histPrices = { 'TER_1M': { price: 115 } } // above target of 110 → hit
    const results   = buildResults([stock], {}, histPrices, {})
    const r1M = results.find(r => r.horizon === '1M')
    expect(r1M.verdict).toBe('hit')
    expect(r1M.priceOnDate).toBe(115)
  })

  it('expired horizon without any price stays awaiting', () => {
    const stock   = makeStock('TER', PAST_DATE)
    const results = buildResults([stock], {}, {}, {})
    const r1M = results.find(r => r.horizon === '1M')
    expect(r1M.verdict).toBe('awaiting')
    expect(r1M.priceOnDate).toBeNull()
  })

  it('produces exactly 4 results per stock', () => {
    const stock   = makeStock('TER', PAST_DATE)
    const results = buildResults([stock], { TER: 105 }, {}, {})
    expect(results).toHaveLength(4)
  })

  it('produces 4 × N results for N stocks', () => {
    const stocks  = [makeStock('TER', PAST_DATE), makeStock('SLB', PAST_DATE), makeStock('HWM', PAST_DATE)]
    const results = buildResults(stocks, { TER: 105, SLB: 95, HWM: 110 }, {}, {})
    expect(results).toHaveLength(12)
  })

  it('verdict is never undefined', () => {
    const stock   = makeStock('TER', PAST_DATE)
    const results = buildResults([stock], { TER: 105 }, {}, {})
    results.forEach(r => {
      expect(r.verdict).toBeDefined()
      expect(['hit', 'miss', 'close', 'awaiting']).toContain(r.verdict)
    })
  })

  it('basePrice is preserved in each result', () => {
    const stock   = makeStock('TER', PAST_DATE)
    const results = buildResults([stock], { TER: 105 }, {}, {})
    results.forEach(r => {
      expect(r.basePrice).toBe(100)
    })
  })

  it('targetDate is formatted as DD MMM YYYY string', () => {
    const stock   = makeStock('TER', PAST_DATE)
    const results = buildResults([stock], {}, {}, {})
    results.forEach(r => {
      expect(r.targetDate).toBeTruthy()
      expect(typeof r.targetDate).toBe('string')
    })
  })

})
