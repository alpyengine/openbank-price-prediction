/**
 * usePriceFetch.js — Price fetching hook (current + historical)
 *
 * Handles all price data for the batch view:
 *
 * 1. Current prices (autoPrices)
 *    - Twelve Data API: US stocks, chunks of 8, rate limit 8 req/min
 *    - Alpha Vantage: European stocks (.DE, .AS, .PA, .L, .MC), 1 req/s
 *    - Provider is auto-detected from ticker suffixes
 *
 * 2. Historical prices (histPrices)
 *    - Used when a horizon has expired — shows closing price on target date
 *    - First checks Supabase price_cache (populated by pg_cron automation)
 *    - Falls back to API if not cached
 *    - Key format: "TICKER_HORIZON" e.g. "TER_1M"
 *
 * 3. Restore from saved batch (restoreHistPrices)
 *    - When loading a batch from history, histPrices are rebuilt from
 *      batch.results[].priceOnDate — avoids all API calls
 *
 * Hook returns:
 *   autoPrices              — { [ticker]: number | null } current prices
 *   histPrices              — { [ticker_horizon]: { price, date, fromCache } | null }
 *   fetching                — true while fetching current prices
 *   log                     — status message for FetchBar
 *   chunkProgress           — { total, done, waiting, waitSecs } for multi-chunk progress bar
 *   fetchCurrentBatch(stocks)                           — fetch current prices
 *   fetchHistoricalForHorizon(stocks, horizon, dateMap) — fetch expired horizon prices
 *   reset()                 — clear all price state
 *   restoreHistPrices(results)                          — restore from batch.results
 *   setLog(msg)             — manually set log message
 */
import { useState, useCallback } from 'react'
import { loadCachedPrice } from '../services/storage.js'

// ── API config ────────────────────────────────────────────────────────────────
const TD_KEY   = import.meta.env.VITE_TWELVE_DATA_KEY
const AV_KEY   = import.meta.env.VITE_ALPHA_VANTAGE_KEY
const TD_URL   = 'https://api.twelvedata.com'
const AV_URL   = 'https://www.alphavantage.co/query'
const TIMEOUT  = 20000
const CHUNK_SIZE = 8  // Twelve Data free tier: 8 req/min

// ── Market suffix detection ───────────────────────────────────────────────────
// .US → Twelve Data (NYSE/NASDAQ)
// .DE .AS .PA .L → Alpha Vantage (European markets)

const EU_SUFFIXES = ['DE', 'AS', 'PA', 'L', 'MC']

function getSuffix(ticker) {
  const parts = ticker.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'US'
}

/**
 * detectProvider — determines which API to use based on ticker suffixes.
 * Returns 'alphavantage' if any ticker has an EU suffix (.DE, .AS, .PA, .L, .MC).
 * Returns 'twelvedata' otherwise (US market).
 */
function detectProvider(tickers) {
  // If ANY ticker has a EU suffix → use Alpha Vantage for the whole batch
  const hasEU = tickers.some(t => EU_SUFFIXES.includes(getSuffix(t)))
  return hasEU ? 'alphavantage' : 'twelvedata'
}

// Strip .US suffix for Twelve Data (it doesn't use suffixes)
function tdSymbol(ticker) {
  return getSuffix(ticker) === 'US' ? ticker.replace(/\.US$/i, '') : ticker
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function classifyError(err) {
  const msg = err?.message || String(err)
  if (msg.includes('abort') || msg.includes('AbortError')) return 'Timeout — API did not respond'
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) return 'No internet connection'
  if (msg.includes('not set')) return 'API key missing — check your .env file'
  return msg
}

async function fetchJSON(url) {
  const ctrl = new AbortController()
  const tid  = setTimeout(() => ctrl.abort(), TIMEOUT)
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(tid)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json()
  } catch (err) {
    clearTimeout(tid)
    throw err
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Twelve Data: current prices (chunks of 8, 62s pause) ─────────────────────

/**
 * fetchCurrentPrices_TD — fetches current prices for US tickers via Twelve Data.
 * Processes tickers in chunks of CHUNK_SIZE (8) to respect the 8 req/min limit.
 * Waits 62 seconds between chunks. Calls onProgress() after each chunk.
 */
async function fetchCurrentPrices_TD(tickers, onProgress) {
  const result = {}
  const chunks = []
  for (let i = 0; i < tickers.length; i += CHUNK_SIZE) chunks.push(tickers.slice(i, i + CHUNK_SIZE))

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk   = chunks[ci]
    const symbols = chunk.map(tdSymbol).join(',')
    const url     = `${TD_URL}/price?symbol=${encodeURIComponent(symbols)}&apikey=${TD_KEY}`
    const data    = await fetchJSON(url)

    if (chunk.length === 1) {
      const origTicker = chunk[0]
      result[origTicker] = (data.code || data.status === 'error') ? null : parseFloat(data.price)
    } else {
      for (const tk of chunk) {
        const entry = data[tdSymbol(tk)]
        result[tk] = (!entry || entry.code || entry.status === 'error') ? null : parseFloat(entry.price)
      }
    }

    if (onProgress) onProgress({ total: chunks.length, done: ci + 1, waiting: false, waitSecs: 0, waitTotal: 62 })

    if (ci < chunks.length - 1) {
      const WAIT = 62
      for (let s = WAIT; s > 0; s--) {
        if (onProgress) onProgress({ total: chunks.length, done: ci + 1, waiting: true, waitSecs: s, waitTotal: WAIT })
        await sleep(1000)
      }
    }
  }
  return result
}

// ── Alpha Vantage: current prices (1 req/s, 25/day) ──────────────────────────

/**
 * fetchCurrentPrices_AV — fetches current prices for EU tickers via Alpha Vantage.
 * Processes one ticker at a time with 1.2s pause (1 req/s limit, 25 req/day).
 */
async function fetchCurrentPrices_AV(tickers, onProgress) {
  const result = {}
  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i]
    const url    = `${AV_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${AV_KEY}`
    try {
      const data  = await fetchJSON(url)
      const quote = data['Global Quote']
      result[ticker] = (quote && quote['05. price']) ? parseFloat(quote['05. price']) : null
    } catch {
      result[ticker] = null
    }
    if (onProgress) onProgress({ total: tickers.length, done: i + 1, waiting: false, waitSecs: 0, waitTotal: 0 })
    // 1.2s pause between requests to respect 1 req/s limit
    if (i < tickers.length - 1) await sleep(1200)
  }
  return result
}

// ── Twelve Data: historical price ─────────────────────────────────────────────

/**
 * fetchHistoricalPrice_TD — fetches historical closing price from Twelve Data.
 * Searches the 7-day window ending on targetDate for the nearest trading day.
 * Returns { price, date, isHistorical: true }.
 */
async function fetchHistoricalPrice_TD(ticker, targetDate) {
  const start = toYMD(addDays(targetDate, -7))
  const end   = toYMD(targetDate)
  const sym   = tdSymbol(ticker)
  const url   = `${TD_URL}/time_series?symbol=${encodeURIComponent(sym)}&interval=1day&start_date=${start}&end_date=${end}&apikey=${TD_KEY}`
  const data  = await fetchJSON(url)
  if (data.status === 'error' || data.code) throw new Error(data.message || 'Historical data unavailable')
  const values = data.values
  if (!values?.length) throw new Error('No trading data found near ' + toYMD(targetDate))
  const entry = values[0]
  return { price: parseFloat(entry.close), date: entry.datetime, isHistorical: true }
}

// ── Alpha Vantage: historical price ──────────────────────────────────────────

/**
 * fetchHistoricalPrice_AV — fetches historical closing price from Alpha Vantage.
 * Finds the closest trading day on or before targetDate in the daily time series.
 * Returns { price, date, isHistorical: true }.
 */
async function fetchHistoricalPrice_AV(ticker, targetDate) {
  const url  = `${AV_URL}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(ticker)}&outputsize=compact&apikey=${AV_KEY}`
  const data = await fetchJSON(url)
  const ts   = data['Time Series (Daily)']
  if (!ts) throw new Error('AV historical data unavailable for ' + ticker)

  // Find closest trading day on or before targetDate
  const targetStr = toYMD(targetDate)
  const dates     = Object.keys(ts).sort().reverse()  // newest first
  const found     = dates.find(d => d <= targetStr)
  if (!found) throw new Error('No AV data found near ' + targetStr)

  return { price: parseFloat(ts[found]['4. close']), date: found, isHistorical: true }
}

// ── Main hook ─────────────────────────────────────────────────────────────────

/**
 * usePriceFetch — React hook for fetching and managing stock prices.
 * See module header for full documentation.
 */
export function usePriceFetch() {
  const [autoPrices,    setAutoPrices]    = useState({})
  const [histPrices,    setHistPrices]    = useState({})
  const [fetching,      setFetching]      = useState(false)
  const [log,           setLog]           = useState('Import stocks, then click Fetch')
  const [chunkProgress, setChunkProgress] = useState(null)

  const resetPrices = useCallback(() => {
    setAutoPrices({})
    setHistPrices({})
    setLog('Import stocks, then click Fetch')
    setChunkProgress(null)
  }, [])

  // Restore histPrices from saved batch results — avoids API calls for expired horizons
  const restoreHistPrices = useCallback((results) => {
    if (!results?.length) return
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
    if (Object.keys(restored).length > 0) {
      setHistPrices(restored)
      setLog(`Prices restored from saved batch (${Object.keys(restored).length} historical)`)
    }
  }, [])

  // ── Fetch current prices ───────────────────────────────────────────────────
  const fetchCurrentBatch = useCallback(async (stocks) => {
    if (!stocks.length) return
    setFetching(true)
    setChunkProgress(null)

    const tickers  = stocks.map(s => s.t)
    const provider = detectProvider(tickers)
    const isAV     = provider === 'alphavantage'
    const nChunks  = isAV ? tickers.length : Math.ceil(tickers.length / CHUNK_SIZE)
    const multiChunk = !isAV && nChunks > 1

    if (isAV) {
      setLog(`Fetching ${tickers.length} ticker${tickers.length>1?'s':''} via Alpha Vantage (EU markets · 25 req/day limit)…`)
      setChunkProgress({ total: tickers.length, done: 0, waiting: false, waitSecs: 0, waitTotal: 0 })
    } else {
      setLog(multiChunk
        ? `Fetching ${tickers.length} tickers via Twelve Data in ${nChunks} batches…`
        : `Fetching ${tickers.length} ticker${tickers.length>1?'s':''} via Twelve Data…`
      )
      if (multiChunk) setChunkProgress({ total: nChunks, done: 0, waiting: false, waitSecs: 0, waitTotal: 62 })
    }

    try {
      const prices = isAV
        ? await fetchCurrentPrices_AV(tickers, p => setChunkProgress(p))
        : await fetchCurrentPrices_TD(tickers, multiChunk ? p => setChunkProgress(p) : null)

      const newPrices = {}
      const failed    = []
      for (const s of stocks) {
        const p = prices[s.t]
        if (p != null && !isNaN(p)) newPrices[s.t] = p
        else { newPrices[s.t] = null; failed.push(s.t) }
      }
      setAutoPrices(newPrices)
      const ok  = stocks.length - failed.length
      const src = isAV ? 'Alpha Vantage' : 'Twelve Data'
      setLog(`${ok}/${stocks.length} prices loaded via ${src}${failed.length ? ' | Failed: ' + failed.join(', ') : ''}`)
      setChunkProgress(null)

    } catch (err) {
      setLog('Fetch error: ' + classifyError(err))
      setChunkProgress(null)
    } finally {
      setFetching(false)
    }
  }, [])

  // ── Fetch historical price for expired horizon ─────────────────────────────
  const fetchHistoricalForHorizon = useCallback(async (stocks, horizon, targetDateMap) => {
    if (!stocks.length) return
    for (let i = 0; i < stocks.length; i++) {
      const stock      = stocks[i]
      const ticker     = stock.t
      const targetDate = targetDateMap[ticker]
      const horizonKey = `${ticker}_${horizon}`
      if (!targetDate) continue

      setHistPrices(prev => ({ ...prev, [horizonKey]: undefined }))

      try {
        // 1. Check Supabase price_cache first (populated by pg_cron automation)
        const cached = await loadCachedPrice(ticker, targetDate)
        if (cached?.price) {
          setHistPrices(prev => ({
            ...prev,
            [horizonKey]: { price: cached.price, date: targetDate, fromCache: true }
          }))
          continue  // Skip API call — price already in cache
        }

        // 2. Fallback: fetch from API
        const provider = detectProvider([ticker])
        const isAV     = provider === 'alphavantage'
        const result = isAV
          ? await fetchHistoricalPrice_AV(ticker, targetDate)
          : await fetchHistoricalPrice_TD(ticker, targetDate)

        if (result) result.fromCache = false
        setHistPrices(prev => ({ ...prev, [horizonKey]: result }))
      } catch (err) {
        console.warn(`[usePriceFetch] historical fetch failed for ${ticker}:`, err.message)
        setHistPrices(prev => ({ ...prev, [horizonKey]: null }))
      }

      if (i < stocks.length - 1) await sleep(600)
    }
  }, [])

  return {
    autoPrices,
    histPrices,
    fetching,
    log,
    chunkProgress,
    fetchCurrentBatch,
    fetchHistoricalForHorizon,
    reset: resetPrices,
    restoreHistPrices,
    setLog,
  }
}
