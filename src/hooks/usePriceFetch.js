import { useState, useCallback } from 'react'

const API_KEY  = import.meta.env.VITE_TWELVE_DATA_KEY
const BASE_URL = 'https://api.twelvedata.com'
const TIMEOUT  = 15000

/**
 * Fetch prev close for a batch of tickers from Twelve Data.
 * Twelve Data supports comma-separated symbols in one request.
 * Free tier: 800 requests/day, 8 requests/minute.
 *
 * Endpoint: GET /price?symbol=AAPL,MSFT&apikey=KEY
 * Returns:  { AAPL: { price: "123.45" }, MSFT: { price: "456.78" } }
 * Or single ticker: { price: "123.45" }
 */
async function fetchBatch(tickers) {
  if (!API_KEY) throw new Error('VITE_TWELVE_DATA_KEY not set in .env')

  const symbols = tickers.join(',')
  const url     = `${BASE_URL}/price?symbol=${encodeURIComponent(symbols)}&apikey=${API_KEY}`

  const ctrl = new AbortController()
  const tid  = setTimeout(() => ctrl.abort(), TIMEOUT)

  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(tid)

    if (!res.ok) throw new Error('Twelve Data HTTP ' + res.status)

    const data = await res.json()

    // Normalise response — single ticker returns { price } directly
    // Multiple tickers return { TICKER: { price } }
    if (tickers.length === 1) {
      if (data.code && data.message) throw new Error(data.message)
      return { [tickers[0]]: data }
    }
    return data

  } catch (err) {
    clearTimeout(tid)
    throw err
  }
}

export function usePriceFetch() {
  const [autoPrices, setAutoPrices] = useState({})
  const [fetching,   setFetching]   = useState(false)
  const [log,        setLog]        = useState('Import stocks, then click Fetch')

  const fetchPrices = useCallback(async (stocks) => {
    if (!stocks.length) return
    setFetching(true)
    setLog('Fetching prices from Twelve Data...')

    const tickers = stocks.map(s => s.t)

    try {
      const raw = await fetchBatch(tickers)

      const newPrices = {}
      const failed    = []

      for (const s of stocks) {
        const entry = raw[s.t]
        if (!entry) {
          newPrices[s.t] = null
          failed.push(`${s.t}(not found)`)
          continue
        }
        // Twelve Data error for individual ticker
        if (entry.code || entry.status === 'error') {
          newPrices[s.t] = null
          failed.push(`${s.t}(${entry.message || 'error'})`)
          continue
        }
        const price = parseFloat(entry.price)
        if (isNaN(price)) {
          newPrices[s.t] = null
          failed.push(`${s.t}(invalid price)`)
          continue
        }
        newPrices[s.t] = price
      }

      setAutoPrices(newPrices)
      const ok = tickers.length - failed.length
      setLog(
        `${ok}/${tickers.length} prices loaded` +
        (failed.length ? ' | Failed: ' + failed.join(', ') : '')
      )

    } catch (err) {
      setLog('Fetch error: ' + classifyError(err))
    } finally {
      setFetching(false)
    }
  }, [])

  const reset = useCallback(() => {
    setAutoPrices({})
    setLog('Import stocks, then click Fetch')
  }, [])

  return { autoPrices, fetching, log, fetchPrices, reset, setLog }
}

function classifyError(err) {
  const msg = err?.message || String(err)
  if (msg.includes('abort') || msg.includes('AbortError'))
    return 'Timeout — Twelve Data did not respond in time'
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError'))
    return 'No internet connection'
  if (msg.includes('not set'))
    return 'API key missing — check your .env file'
  return msg
}
