/**
 * useFundamentals.js — Fundamentals data fetching hook
 *
 * Fetches company fundamentals from two sources:
 *
 * 1. Finnhub /stock/metric (free plan — 30 req/sec)
 *    Fields: peTTM, forwardPE, pegTTM, forwardPEG, netProfitMarginTTM,
 *            roeTTM, epsGrowthTTMYoy, epsGrowth3Y, epsGrowth5Y,
 *            revenueGrowthTTMYoy, beta, totalDebt/totalEquityAnnual,
 *            currentDividendYieldTTM
 *
 * 2. FMP /stable/profile (free plan — profile only, still works for all US tickers)
 *    Fields: sector, industry, marketCap, website, description
 *
 * Data is fetched once per ticker per session and cached in component state.
 * When a saved batch is loaded, fundamentals are restored from the batch
 * instead of fetching again (restoreFundamentals).
 *
 * Hook returns:
 *   fundamentals          — { [ticker]: { sector, peTTM, pegTTM, ... } | null }
 *                           undefined = not yet fetched
 *                           null      = fetch failed
 *   loading               — true while fetching
 *   log                   — status message for FetchBar
 *   fetchFundamentals(stocks) — fetch for all stocks in batch
 *   reset()               — clear all fundamentals state
 *   restoreFundamentals(saved) — restore from saved batch (avoids API calls)
 */
import { useState, useCallback } from 'react'

const FMP_KEY     = import.meta.env.VITE_FMP_KEY
const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_KEY
const FMP_URL     = 'https://financialmodelingprep.com/stable'
const FINNHUB_URL = 'https://finnhub.io/api/v1'
const TIMEOUT     = 15000

/**
 * fmtMarketCap — formats a raw market cap number into a human-readable string.
 * @param {number|null} val — market cap in USD (millions from Finnhub)
 * @returns {string} e.g. "45.2B", "1.3T", "850M", or "--"
 */
export function fmtMarketCap(val) {
  if (!val) return '--'
  if (val >= 1e6)  return (val / 1e6).toFixed(1) + 'T'
  if (val >= 1e3)  return (val / 1e3).toFixed(1) + 'B'
  if (val >= 1)    return val.toFixed(0) + 'M'
  return '--'
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

/**
 * finnhubSymbol — strips the .US suffix for Finnhub API calls.
 * Finnhub uses bare tickers for NYSE/NASDAQ (e.g. "TER" not "TER.US").
 * European suffixes (.DE, .AS, .PA, .L, .MC) are preserved.
 */
function finnhubSymbol(ticker) {
  return ticker.replace(/\.US$/i, '')
}

/**
 * fmpSymbol — strips the .US suffix for FMP API calls.
 * Same logic as finnhubSymbol — FMP also uses bare tickers for US stocks.
 */
function fmpSymbol(ticker) {
  return ticker.replace(/\.US$/i, '')
}

/**
 * isEuropeanTicker — returns true for tickers with European exchange suffixes.
 * Used to show the "Partial data" badge when Finnhub coverage is limited.
 */
function isEuropeanTicker(ticker) {
  return /\.(DE|AS|PA|L|MC)$/i.test(ticker)
}

/**
 * fetchFinnhubMetrics — fetches fundamentals from Finnhub /stock/metric.
 * Returns an object with all available metric fields, or throws on error.
 */
async function fetchFinnhubMetrics(ticker) {
  const symbol = finnhubSymbol(ticker)
  const url    = `${FINNHUB_URL}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${FINNHUB_KEY}`
  const data   = await fetchWithTimeout(url)
  if (!data.metric) throw new Error('Finnhub: no metric data')
  const m = data.metric
  return {
    // Valuation
    peTTM:        m.peTTM             ?? null,
    forwardPE:    m.forwardPE         ?? null,
    pegTTM:       m.pegTTM            ?? null,
    forwardPEG:   m.forwardPEG        ?? null,
    pfcfTTM:      m.pfcfShareTTM      ?? null,
    // Quality
    netMarginTTM: m.netProfitMarginTTM ?? null,
    roeTTM:       m.roeTTM            ?? null,
    roaTTM:       m.roaTTM            ?? null,
    debtEquity:   m['totalDebt/totalEquityAnnual'] ?? null,
    // Growth
    epsGrowthTTM: m.epsGrowthTTMYoy   ?? null,
    epsGrowth3Y:  m.epsGrowth3Y       ?? null,
    epsGrowth5Y:  m.epsGrowth5Y       ?? null,
    revGrowthTTM: m.revenueGrowthTTMYoy ?? null,
    // Risk & income
    beta:         m.beta              ?? null,
    divYield:     m.currentDividendYieldTTM ?? null,
    // Market
    marketCapFH:  m.marketCapitalization ?? null, // in millions
  }
}

/**
 * fetchFMPProfile — fetches company profile from FMP /stable/profile.
 * Returns sector, industry, description. Falls back silently on error.
 */
async function fetchFMPProfile(ticker) {
  if (!FMP_KEY) return {}
  const symbol = fmpSymbol(ticker)
  const url    = `${FMP_URL}/profile?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`
  const data   = await fetchWithTimeout(url)
  if (!Array.isArray(data) || !data.length) throw new Error('FMP: no data')
  const p = data[0]
  return {
    sector:      p.sector      || '--',
    industry:    p.industry    || '--',
    marketCap:   p.marketCap   || null, // in USD (absolute)
    website:     p.website     || null,
    description: p.description || null,
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

  const fetchFundamentals = useCallback(async (stocks, forceRefresh = false) => {
    if (!stocks?.length) return
    if (!FINNHUB_KEY) {
      setLog('⚠ VITE_FINNHUB_KEY not set in .env — add your Finnhub API key')
      return
    }
    setLoading(true)
    setLog(forceRefresh ? 'Refreshing fundamentals...' : 'Fetching fundamentals...')

    // forceRefresh: start from empty so all tickers get re-fetched
    const newData = forceRefresh ? {} : { ...fundamentals }
    let ok = 0, failed = []

    for (const s of stocks) {
      // Skip only if we already have real data AND not forcing refresh
      if (!forceRefresh && newData[s.t] !== undefined && newData[s.t] !== null && Object.keys(newData[s.t]).length > 0) {
        ok++; continue
      }

      try {
        setLog(`Fetching ${s.t}...`)

        // Finnhub — primary source for all metrics
        const fh = await fetchFinnhubMetrics(s.t).catch(() => ({}))

        // FMP profile — secondary source for sector/industry/description
        const fmp = await fetchFMPProfile(s.t).catch(() => ({}))

        // Determine partial data flag for European tickers or missing key fields
        const keyFields = [fh.peTTM, fh.pegTTM, fh.netMarginTTM, fh.epsGrowthTTM]
        const missingCount = keyFields.filter(v => v == null).length
        const partialData = isEuropeanTicker(s.t) || missingCount >= 3

        newData[s.t] = {
          // Identity
          sector:       fmp.sector      || '--',
          industry:     fmp.industry    || '--',
          marketCap:    fmp.marketCap   || (fh.marketCapFH ? fh.marketCapFH * 1e6 : null),
          website:      fmp.website     || null,
          description:  fmp.description || null,
          // Valuation (Finnhub)
          peTTM:        fh.peTTM,
          forwardPE:    fh.forwardPE,
          pegTTM:       fh.pegTTM,
          forwardPEG:   fh.forwardPEG,
          pfcfTTM:      fh.pfcfTTM,
          // Quality (Finnhub)
          netMarginTTM: fh.netMarginTTM,
          roeTTM:       fh.roeTTM,
          roaTTM:       fh.roaTTM,
          debtEquity:   fh.debtEquity,
          // Growth (Finnhub)
          epsGrowthTTM: fh.epsGrowthTTM,
          epsGrowth3Y:  fh.epsGrowth3Y,
          epsGrowth5Y:  fh.epsGrowth5Y,
          revGrowthTTM: fh.revGrowthTTM,
          // Risk & income (Finnhub)
          beta:         fh.beta,
          divYield:     fh.divYield,
          // Meta
          partialData,
          fetchedAt:    new Date().toISOString(), // timestamp for freshness indicator
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

      // Rate limit: Finnhub 30 req/sec — 400ms gap is safe
      await new Promise(r => setTimeout(r, 400))
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
