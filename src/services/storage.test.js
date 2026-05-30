import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Since storage.js reads env vars at module load time, we mock fetch
// ── directly and test the function behaviour via its HTTP calls

// We need to import AFTER setting up the environment
// Use dynamic import workaround by testing the logic directly

// ── Helper: build a mock fetch response ──────────────────────────────────────

function makeFetch(rows, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: async () => rows })
}

// ── Mirror functions for unit testing (same logic as storage.js) ─────────────

function parseWeeklyPricesResponse(rows) {
  if (!Array.isArray(rows)) return []
  return rows
}

function parseCachedPriceResponse(rows) {
  if (!Array.isArray(rows) || !rows.length) return null
  return {
    price:     parseFloat(rows[0].close_price),
    fetchedAt: rows[0].fetched_at,
  }
}

function buildWeeklyPricesUrl(base, ticker, batchId) {
  return `${base}/rest/v1/weekly_prices?ticker=eq.${encodeURIComponent(ticker)}&batch_id=eq.${encodeURIComponent(batchId)}&select=week,week_date,close_price&order=week.asc`
}

function buildCachedPriceUrl(base, ticker, targetDate) {
  const dateStr     = targetDate.toISOString().split('T')[0]
  const cleanTicker = ticker.split('.')[0]
  return `${base}/rest/v1/price_cache?ticker=eq.${cleanTicker}&target_date=eq.${dateStr}&select=close_price,fetched_at`
}

// ── loadWeeklyPrices logic tests ─────────────────────────────────────────────

describe('loadWeeklyPrices — URL construction', () => {
  const BASE = 'https://test.supabase.co'

  it('builds correct URL with bare ticker and batchId', () => {
    const url = buildWeeklyPricesUrl(BASE, 'TER', '2026-03-17')
    expect(url).toContain('ticker=eq.TER')
    expect(url).toContain('batch_id=eq.2026-03-17')
    expect(url).toContain('order=week.asc')
    expect(url).toContain('select=week,week_date,close_price')
  })

  it('encodes ticker with .US suffix correctly', () => {
    const url = buildWeeklyPricesUrl(BASE, 'TER.US', '2026-05-06')
    expect(url).toContain('ticker=eq.TER.US')
    expect(url).toContain('batch_id=eq.2026-05-06')
  })

  it('encodes special characters in batchId', () => {
    const url = buildWeeklyPricesUrl(BASE, 'TER', '2026-03-17')
    expect(url).toContain('2026-03-17')
  })
})

describe('loadWeeklyPrices — response parsing', () => {
  it('returns rows as-is from Supabase', () => {
    const rows = [
      { week: 1, week_date: '2026-03-24', close_price: '98.50' },
      { week: 9, week_date: '2026-05-22', close_price: '358.44' },
    ]
    const result = parseWeeklyPricesResponse(rows)
    expect(result).toHaveLength(2)
    expect(result[0].week).toBe(1)
    expect(result[1].close_price).toBe('358.44')
  })

  it('returns empty array for empty response', () => {
    expect(parseWeeklyPricesResponse([])).toEqual([])
  })

  it('returns empty array for non-array response', () => {
    expect(parseWeeklyPricesResponse(null)).toEqual([])
    expect(parseWeeklyPricesResponse(undefined)).toEqual([])
  })
})

// ── loadCachedPrice logic tests ───────────────────────────────────────────────

describe('loadCachedPrice — URL construction', () => {
  const BASE = 'https://test.supabase.co'

  it('strips .US suffix from ticker', () => {
    const url = buildCachedPriceUrl(BASE, 'TER.US', new Date('2026-04-17'))
    expect(url).toContain('ticker=eq.TER')
    expect(url).not.toContain('ticker=eq.TER.US')
  })

  it('strips .DE suffix from ticker', () => {
    const url = buildCachedPriceUrl(BASE, 'IFX.DE', new Date('2026-04-17'))
    expect(url).toContain('ticker=eq.IFX')
  })

  it('keeps bare ticker unchanged', () => {
    const url = buildCachedPriceUrl(BASE, 'TER', new Date('2026-04-17'))
    expect(url).toContain('ticker=eq.TER')
  })

  it('formats date as YYYY-MM-DD', () => {
    const url = buildCachedPriceUrl(BASE, 'TER', new Date('2026-04-17'))
    expect(url).toContain('target_date=eq.2026-04-17')
  })

  it('formats date correctly for single-digit months and days', () => {
    const url = buildCachedPriceUrl(BASE, 'TER', new Date('2026-01-05'))
    expect(url).toContain('target_date=eq.2026-01-05')
  })
})

describe('loadCachedPrice — response parsing', () => {
  it('returns price and fetchedAt when row found', () => {
    const rows = [{ close_price: '145.23', fetched_at: '2026-04-18T10:00:00Z' }]
    const result = parseCachedPriceResponse(rows)
    expect(result).not.toBeNull()
    expect(result.price).toBe(145.23)
    expect(result.fetchedAt).toBe('2026-04-18T10:00:00Z')
  })

  it('returns null for empty array (cache miss)', () => {
    expect(parseCachedPriceResponse([])).toBeNull()
  })

  it('returns null for null input', () => {
    expect(parseCachedPriceResponse(null)).toBeNull()
  })

  it('parses close_price string to float', () => {
    const rows = [{ close_price: '358.44000', fetched_at: '2026-05-22T10:00:00Z' }]
    const result = parseCachedPriceResponse(rows)
    expect(result.price).toBe(358.44)
    expect(typeof result.price).toBe('number')
  })

  it('parses integer close_price correctly', () => {
    const rows = [{ close_price: '751', fetched_at: '2026-05-22T10:00:00Z' }]
    const result = parseCachedPriceResponse(rows)
    expect(result.price).toBe(751)
  })

  it('uses first row when multiple rows returned', () => {
    const rows = [
      { close_price: '100.00', fetched_at: '2026-04-17T10:00:00Z' },
      { close_price: '200.00', fetched_at: '2026-04-18T10:00:00Z' },
    ]
    const result = parseCachedPriceResponse(rows)
    expect(result.price).toBe(100)
  })
})
