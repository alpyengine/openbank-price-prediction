/**
 * useFundamentals.js — Fundamentals data fetching hook
 *
 * Fetches company fundamentals from Financial Modeling Prep (FMP) API:
 * sector, industry, market cap, beta, website, last dividend, description.
 *
 * Data is fetched once per ticker per session and cached in component state.
 * When a saved batch is loaded, fundamentals are restored from the batch
 * instead of fetching again (restoreFundamentals).
 *
 * API used: FMP /stable/profile (free tier — 250 req/day)
 * Rate limit: 800ms pause between requests (safe for FMP free plan)
 *
 * Hook returns:
 *   fundamentals     — { [ticker]: { sector, industry, marketCap, ... } | null }
 *                      undefined = not yet fetched
 *                      null      = fetch failed
 *   loading          — true while fetching
 *   log              — status message for FetchBar
 *   fetchFundamentals(stocks) — fetch for all stocks in batch
 *   reset()          — clear all fundamentals state
 *   restoreFundamentals(saved) — restore from saved batch (avoids API calls)
 */
import { useState, useCallback } from 'react'

const TD_KEY  = import.meta.env.VITE_TWELVE_DATA_KEY
const FMP_KEY = import.meta.env.VITE_FMP_KEY
const TD_URL  = 'https://api.twelvedata.com'
const FMP_URL = 'https://financialmodelingprep.com/stable'
const TIMEOUT = 15000

/**
 * fmtMarketCap — formats a raw market cap number into a human-readable string.
 * @param {number|null} val — market cap in USD
 * @returns {string} e.g. "45.2B", "1.3T", "850M", or "--"
 */
export function fmtMarketCap(val) {
  if (!val) return '--'
  if (val >= 1e12) return (val / 1e12).toFixed(1) + 'T'
  if (val >= 1e9)  return (val / 1e9).toFixed(1) + 'B'
  if (val >= 1e6)  return (val / 1e6).toFixed(1) + 'M'
  return val.toLocaleString()
}

/**
 * fetchWithTimeout — wraps fetch() with a configurable abort timeout.
 * Aborts the request if it takes longer than TIMEOUT milliseconds.
 */
async function fetchWithTimeout(url) {
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

// Strip .US suffix for US markets — FMP uses bare ticker for NYSE/NASDAQ
// European suffixes (.DE, .AS, .PA, .L) are kept as FMP supports them
/**
 * fmpSymbol — strips the .US suffix from a ticker for FMP API calls.
 * FMP uses bare tickers for NYSE/NASDAQ (e.g. "TER" not "TER.US").
 * European suffixes (.DE, .AS, .PA, .L) are preserved as FMP supports them.
 */
function fmpSymbol(ticker) {
  return ticker.replace(/\.US$/i, '')
}

// FMP: GET /stable/profile?symbol=TER&apikey=KEY (or IFX.DE for EU)
async function fetchFMPProfile(ticker) {
  const symbol = fmpSymbol(ticker)
  const url    = `${FMP_URL}/profile?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`
  const data   = await fetchWithTimeout(url)
  if (!Array.isArray(data) || !data.length) throw new Error('FMP: no data')
  const p = data[0]
  return {
    sector:       p.sector       || '--',
    industry:     p.industry     || '--',
    marketCap:    p.marketCap    || null,
    beta:         p.beta         || null,
    website:      p.website      || null,
    lastDividend: p.lastDividend || null,
    cik:          p.cik          || null,
    description:  p.description  || null,
  }
}

/**
 * useFundamentals — React hook for fetching and managing company fundamentals.
 * See module header for full documentation.
 */
export function useFundamentals() {
  const [fundamentals, setFundamentals] = useState({})
  const [loading,      setLoading]      = useState(false)
  const [log,          setLog]          = useState('')

  const fetchFundamentals = useCallback(async (stocks) => {
    if (!stocks.length) return
    setLoading(true)
    setLog('Fetching fundamentals...')

    const newData = { ...fundamentals }
    let ok = 0, failed = []

    for (const s of stocks) {
      if (newData[s.t] !== undefined) { ok++; continue }

      try {
        setLog(`Fetching ${s.t}...`)

        // FMP profile — single call, free plan
        const fmpData = await fetchFMPProfile(s.t).catch(() => ({}))

        newData[s.t] = {
          sector:       fmpData.sector       || '--',
          industry:     fmpData.industry     || '--',
          marketCap:    fmpData.marketCap    || null,
          beta:         fmpData.beta         || null,
          website:      fmpData.website      || null,
          lastDividend: fmpData.lastDividend || null,
          cik:          fmpData.cik          || null,
          description:  fmpData.description  || null,
        }

        ok++
        setLog(`✓ ${s.t}: ${newData[s.t].sector}`)
        setFundamentals({ ...newData })

      } catch (err) {
        newData[s.t] = null
        failed.push(s.t)
        setLog(`✗ ${s.t}: ${err.message}`)
        setFundamentals({ ...newData })
      }

      // Rate limit: FMP 250/day, TD 8/min — 800ms gap is safe
      await new Promise(r => setTimeout(r, 800))
    }

    setLoading(false)
    setLog(
      `Fundamentals: ${ok}/${stocks.length} loaded` +
      (failed.length ? ' | Failed: ' + failed.join(', ') : '')
    )
  }, [fundamentals])

  const reset = useCallback(() => {
    setFundamentals({})
    setLog('')
  }, [])

  const restoreFundamentals = useCallback((saved) => {
    if (saved && Object.keys(saved).length > 0) {
      setFundamentals(saved)
      setLog(`Fundamentals: ${Object.keys(saved).length} stocks restored from saved batch`)
    }
  }, [])

  return { fundamentals, loading, log, fetchFundamentals, reset, restoreFundamentals }
}
