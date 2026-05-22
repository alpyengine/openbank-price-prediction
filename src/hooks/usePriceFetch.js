import { useState, useCallback } from 'react'

const API_KEY  = import.meta.env.VITE_TWELVE_DATA_KEY
const BASE_URL = 'https://api.twelvedata.com'
const TIMEOUT  = 20000

// ── Helpers ───────────────────────────────────────────────────────────────────

function toYMD(date) {
  // Format Date → 'YYYY-MM-DD'
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
  if (msg.includes('abort') || msg.includes('AbortError'))
    return 'Timeout — Twelve Data did not respond'
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError'))
    return 'No internet connection'
  if (msg.includes('not set'))
    return 'API key missing — check your .env file'
  return msg
}

async function fetchWithTimeout(url) {
  if (!API_KEY) throw new Error('VITE_TWELVE_DATA_KEY not set')
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

// ── Current price (today) ─────────────────────────────────────────────────────
// Fetches tickers in chunks of 8 (free tier limit: 8 req/min)
// with a 62s pause between chunks to avoid rate limit 429.

const CHUNK_SIZE = 8

async function fetchCurrentPrices(tickers) {
  const result = {}

  // Split into chunks of CHUNK_SIZE
  const chunks = []
  for (let i = 0; i < tickers.length; i += CHUNK_SIZE) {
    chunks.push(tickers.slice(i, i + CHUNK_SIZE))
  }

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk   = chunks[ci]
    const symbols = chunk.join(',')
    const url     = `${BASE_URL}/price?symbol=${encodeURIComponent(symbols)}&apikey=${API_KEY}`
    const data    = await fetchWithTimeout(url)

    // Normalise: single ticker returns { price } directly, multiple returns { TICKER: { price } }
    if (chunk.length === 1) {
      if (data.code || data.status === 'error') {
        result[chunk[0]] = null
      } else {
        result[chunk[0]] = parseFloat(data.price)
      }
    } else {
      for (const tk of chunk) {
        const entry = data[tk]
        if (!entry || entry.code || entry.status === 'error') {
          result[tk] = null
        } else {
          result[tk] = parseFloat(entry.price)
        }
      }
    }

    // Pause 62s between chunks to respect 8 req/min rate limit
    if (ci < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 62000))
    }
  }

  return result
}

// ── Historical price (on or near a specific date) ────────────────────────────
// Uses /time_series with a ±5 day window to handle weekends and holidays.
// Returns the closing price of the trading day closest to targetDate
// without going past it (i.e. last trading day on or before targetDate).

async function fetchHistoricalPrice(ticker, targetDate) {
  const start = toYMD(addDays(targetDate, -7))  // look back 7 days
  const end   = toYMD(targetDate)               // up to target date
  const url   = `${BASE_URL}/time_series?symbol=${encodeURIComponent(ticker)}&interval=1day&start_date=${start}&end_date=${end}&apikey=${API_KEY}`

  const data = await fetchWithTimeout(url)

  if (data.status === 'error' || data.code) {
    throw new Error(data.message || 'Historical data unavailable')
  }

  const values = data.values
  if (!values || !values.length) {
    throw new Error('No trading data found near ' + toYMD(targetDate))
  }

  // values are sorted newest → oldest; first entry is the closest to targetDate
  const entry = values[0]
  return {
    price:    parseFloat(entry.close),
    date:     entry.datetime,
    isHistorical: true,
  }
}

// ── Main hook ─────────────────────────────────────────────────────────────────
//
// State shape:
//   autoPrices  — { TICKER: number | null }   current market price
//   histPrices  — { TICKER_HORIZON: { price, date, isHistorical } | null }
//                 keyed by `${ticker}_${horizon}` e.g. 'TER_1M'
//   fetching    — boolean
//   log         — status string

export function usePriceFetch() {
  const [autoPrices,    setAutoPrices]    = useState({})
  const [histPrices,    setHistPrices]    = useState({})
  const [fetching,      setFetching]      = useState(false)
  const [log,           setLog]           = useState('Import stocks, then click Fetch')
  const [chunkProgress, setChunkProgress] = useState(null)
  // chunkProgress: { total: N, done: N, waiting: bool, waitSecs: N, waitTotal: N } | null

  // ── fetchCurrentBatch ───────────────────────────────────────────────────────
  const fetchCurrentBatch = useCallback(async (stocks) => {
    if (!stocks.length) return
    setFetching(true)
    setChunkProgress(null)

    const tickers  = stocks.map(s => s.t)
    const nChunks  = Math.ceil(tickers.length / CHUNK_SIZE)
    const multiChunk = nChunks > 1

    setLog(multiChunk
      ? `Fetching ${tickers.length} tickers in ${nChunks} batches of ${CHUNK_SIZE}…`
      : 'Fetching current prices…'
    )

    if (multiChunk) {
      setChunkProgress({ total: nChunks, done: 0, waiting: false, waitSecs: 0, waitTotal: 62 })
    }

    try {
      const result = {}
      const chunks = []
      for (let i = 0; i < tickers.length; i += CHUNK_SIZE) chunks.push(tickers.slice(i, i + CHUNK_SIZE))

      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk   = chunks[ci]
        const symbols = chunk.join(',')
        const url     = `${BASE_URL}/price?symbol=${encodeURIComponent(symbols)}&apikey=${API_KEY}`
        const data    = await fetchWithTimeout(url)

        if (chunk.length === 1) {
          result[chunk[0]] = (data.code || data.status === 'error') ? null : parseFloat(data.price)
        } else {
          for (const tk of chunk) {
            const entry = data[tk]
            result[tk] = (!entry || entry.code || entry.status === 'error') ? null : parseFloat(entry.price)
          }
        }

        if (multiChunk) {
          setChunkProgress({ total: nChunks, done: ci + 1, waiting: false, waitSecs: 0, waitTotal: 62 })
        }

        // Pause between chunks with countdown
        if (ci < chunks.length - 1) {
          const WAIT = 62
          for (let s = WAIT; s > 0; s--) {
            setChunkProgress({ total: nChunks, done: ci + 1, waiting: true, waitSecs: s, waitTotal: WAIT })
            await new Promise(r => setTimeout(r, 1000))
          }
          setChunkProgress({ total: nChunks, done: ci + 1, waiting: false, waitSecs: 0, waitTotal: 62 })
        }
      }

      const newPrices = {}
      const failed    = []
      for (const s of stocks) {
        const p = result[s.t]
        if (p != null && !isNaN(p)) newPrices[s.t] = p
        else { newPrices[s.t] = null; failed.push(s.t) }
      }
      setAutoPrices(newPrices)
      const ok = stocks.length - failed.length
      setLog(`${ok}/${stocks.length} current prices loaded${failed.length ? ' | Failed: ' + failed.join(', ') : ''}`)
      setChunkProgress(null)

    } catch (err) {
      setLog('Fetch error: ' + classifyError(err))
      setChunkProgress(null)
    } finally {
      setFetching(false)
    }
  }, [])

  // ── fetchHistoricalForHorizon ───────────────────────────────────────────────
  // Called when user clicks into an expired horizon tab.
  // Fetches the historical closing price for each stock on that horizon's date.

  const fetchHistoricalForHorizon = useCallback(async (stocks, horizon, targetDates) => {
    if (!stocks.length) return
    setFetching(true)
    setLog(`Fetching historical prices for ${horizon} target dates...`)

    const newHist = { ...histPrices }
    const failed  = []
    let   ok      = 0

    for (const s of stocks) {
      const key        = `${s.t}_${horizon}`
      const targetDate = targetDates[s.t]

      // Skip if already fetched
      if (newHist[key]) { ok++; continue }

      if (!targetDate) {
        newHist[key] = null
        failed.push(s.t + '(no date)')
        continue
      }

      setLog(`Fetching ${s.t} on ${toYMD(targetDate)}...`)
      try {
        const result   = await fetchHistoricalPrice(s.t, targetDate)
        newHist[key]   = result
        ok++
        setLog(`✓ ${s.t} on ${result.date} = ${result.price.toFixed(2)}`)
      } catch (err) {
        newHist[key] = null
        failed.push(`${s.t}(${err.message})`)
        setLog(`✗ ${s.t}: ${err.message}`)
      }

      // Small delay to respect rate limits (8 req/min on free tier)
      await new Promise(r => setTimeout(r, 500))
    }

    setHistPrices(newHist)
    setLog(
      `Historical prices loaded: ${ok}/${stocks.length}` +
      (failed.length ? ' | Failed: ' + failed.join(', ') : '')
    )
    setFetching(false)
  }, [histPrices])

  const reset = useCallback(() => {
    setAutoPrices({})
    setHistPrices({})
    setLog('Import stocks, then click Fetch')
  }, [])

  return {
    autoPrices,
    histPrices,
    fetching,
    log,
    chunkProgress,
    fetchCurrentBatch,
    fetchHistoricalForHorizon,
    reset,
    setLog,
  }
}
