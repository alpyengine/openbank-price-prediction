import { describe, it, expect } from 'vitest'

// ── Mirror of restoreHistPrices logic from usePriceFetch.js ──────────────────
// Extracted for unit testing without React hooks

function restoreHistPrices(results) {
  if (!results?.length) return {}
  const restored = {}
  for (const r of results) {
    if (r.priceOnDate && r.ticker && r.horizon) {
      const key = `${r.ticker}_${r.horizon}`
      restored[key] = {
        price:        r.priceOnDate,
        date:         r.targetDate ?? null,
        fromCache:    false,
        isHistorical: true,
      }
    }
  }
  return restored
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('restoreHistPrices', () => {

  it('returns empty object for null input', () => {
    expect(restoreHistPrices(null)).toEqual({})
  })

  it('returns empty object for empty array', () => {
    expect(restoreHistPrices([])).toEqual({})
  })

  it('restores a single result with priceOnDate', () => {
    const results = [{
      ticker: 'TER', horizon: '1M',
      priceOnDate: 145.23, targetDate: '17 Apr 2026',
      verdict: 'hit',
    }]
    const restored = restoreHistPrices(results)
    expect(restored['TER_1M']).toBeDefined()
    expect(restored['TER_1M'].price).toBe(145.23)
    expect(restored['TER_1M'].isHistorical).toBe(true)
    expect(restored['TER_1M'].fromCache).toBe(false)
    expect(restored['TER_1M'].date).toBe('17 Apr 2026')
  })

  it('restores multiple horizons for same ticker', () => {
    const results = [
      { ticker: 'TER', horizon: '1M', priceOnDate: 145.23, targetDate: '17 Apr 2026' },
      { ticker: 'TER', horizon: '3M', priceOnDate: 162.50, targetDate: '17 Jun 2026' },
      { ticker: 'TER', horizon: '6M', priceOnDate: 178.00, targetDate: '17 Sep 2026' },
    ]
    const restored = restoreHistPrices(results)
    expect(Object.keys(restored)).toHaveLength(3)
    expect(restored['TER_1M'].price).toBe(145.23)
    expect(restored['TER_3M'].price).toBe(162.50)
    expect(restored['TER_6M'].price).toBe(178.00)
  })

  it('restores multiple tickers', () => {
    const results = [
      { ticker: 'TER', horizon: '1M', priceOnDate: 145.23, targetDate: '17 Apr 2026' },
      { ticker: 'HWM', horizon: '1M', priceOnDate: 88.50,  targetDate: '17 Apr 2026' },
      { ticker: 'NEM', horizon: '1M', priceOnDate: 52.10,  targetDate: '17 Apr 2026' },
    ]
    const restored = restoreHistPrices(results)
    expect(Object.keys(restored)).toHaveLength(3)
    expect(restored['TER_1M']).toBeDefined()
    expect(restored['HWM_1M']).toBeDefined()
    expect(restored['NEM_1M']).toBeDefined()
  })

  it('skips results without priceOnDate', () => {
    const results = [
      { ticker: 'TER', horizon: '1M', priceOnDate: 145.23 },
      { ticker: 'HWM', horizon: '1M', priceOnDate: null },   // no price
      { ticker: 'NEM', horizon: '1M' },                      // no price field
    ]
    const restored = restoreHistPrices(results)
    expect(Object.keys(restored)).toHaveLength(1)
    expect(restored['TER_1M']).toBeDefined()
    expect(restored['HWM_1M']).toBeUndefined()
    expect(restored['NEM_1M']).toBeUndefined()
  })

  it('skips results without ticker', () => {
    const results = [
      { horizon: '1M', priceOnDate: 145.23 },
    ]
    const restored = restoreHistPrices(results)
    expect(Object.keys(restored)).toHaveLength(0)
  })

  it('skips results without horizon', () => {
    const results = [
      { ticker: 'TER', priceOnDate: 145.23 },
    ]
    const restored = restoreHistPrices(results)
    expect(Object.keys(restored)).toHaveLength(0)
  })

  it('sets date to null when targetDate is missing', () => {
    const results = [
      { ticker: 'TER', horizon: '1M', priceOnDate: 145.23 },
    ]
    const restored = restoreHistPrices(results)
    expect(restored['TER_1M'].date).toBeNull()
  })

  it('handles awaiting results (no priceOnDate) gracefully', () => {
    const results = [
      { ticker: 'TER', horizon: '1M', verdict: 'awaiting', priceOnDate: null },
      { ticker: 'TER', horizon: '3M', verdict: 'awaiting', priceOnDate: null },
      { ticker: 'HWM', horizon: '1M', verdict: 'hit', priceOnDate: 88.50, targetDate: '17 Apr 2026' },
    ]
    const restored = restoreHistPrices(results)
    expect(Object.keys(restored)).toHaveLength(1)
    expect(restored['HWM_1M'].price).toBe(88.50)
  })

  it('key format is TICKER_HORIZON', () => {
    const results = [
      { ticker: 'SLB.US', horizon: '12M', priceOnDate: 52.10, targetDate: '18 Mar 2027' },
    ]
    const restored = restoreHistPrices(results)
    expect(restored['SLB.US_12M']).toBeDefined()
  })

  it('fromCache is always false for restored prices', () => {
    const results = [
      { ticker: 'TER', horizon: '1M', priceOnDate: 145.23, targetDate: '17 Apr 2026' },
    ]
    const restored = restoreHistPrices(results)
    expect(restored['TER_1M'].fromCache).toBe(false)
  })

  it('isHistorical is always true for restored prices', () => {
    const results = [
      { ticker: 'TER', horizon: '1M', priceOnDate: 145.23, targetDate: '17 Apr 2026' },
    ]
    const restored = restoreHistPrices(results)
    expect(restored['TER_1M'].isHistorical).toBe(true)
  })
})
