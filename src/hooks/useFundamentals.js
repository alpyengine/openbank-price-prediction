import { useState, useCallback } from 'react'

const API_KEY  = import.meta.env.VITE_TWELVE_DATA_KEY
const BASE_URL = 'https://api.twelvedata.com'
const TIMEOUT  = 15000

// { TICKER: { sector, industry, marketCap, forwardPE, beta } | null }
// null = fetch failed, undefined = not yet fetched

function fmt(url) {
  return url + '&apikey=' + API_KEY
}

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

/** Format market cap to human readable: 4.4T, 180B, 2.3M */
export function fmtMarketCap(val) {
  if (!val) return '--'
  if (val >= 1e12) return (val / 1e12).toFixed(1) + 'T'
  if (val >= 1e9)  return (val / 1e9).toFixed(1) + 'B'
  if (val >= 1e6)  return (val / 1e6).toFixed(1) + 'M'
  return val.toLocaleString()
}

export function useFundamentals() {
  const [fundamentals, setFundamentals] = useState({})  // { TICKER: data | null }
  const [loading,      setLoading]      = useState(false)
  const [log,          setLog]          = useState('')

  const fetchFundamentals = useCallback(async (stocks) => {
    if (!stocks.length) return
    setLoading(true)
    setLog('Fetching fundamentals...')

    const newData = { ...fundamentals }
    let ok = 0, failed = []

    for (const s of stocks) {
      // Skip if already fetched successfully
      if (newData[s.t] !== undefined) { ok++; continue }

      try {
        setLog(`Fetching ${s.t} fundamentals...`)

        // Fetch profile (sector, industry) and statistics (marketCap, forwardPE, beta) in parallel
        const [profileData, statsData] = await Promise.all([
          fetchWithTimeout(fmt(`${BASE_URL}/profile?symbol=${encodeURIComponent(s.t)}`)),
          fetchWithTimeout(fmt(`${BASE_URL}/statistics?symbol=${encodeURIComponent(s.t)}`)),
        ])

        const sector   = profileData?.sector   || '--'
        const industry = profileData?.industry  || '--'

        const stats    = statsData?.statistics
        const marketCap = stats?.valuations_metrics?.market_capitalization || null
        const forwardPE = stats?.valuations_metrics?.forward_pe            || null
        const beta      = stats?.stock_price_summary?.beta                 || null

        newData[s.t] = { sector, industry, marketCap, forwardPE, beta }
        ok++
        setLog(`✓ ${s.t}: ${sector}`)

      } catch (err) {
        newData[s.t] = null
        failed.push(s.t)
        setLog(`✗ ${s.t}: ${err.message}`)
      }

      // Respect free tier rate limit (8 req/min = 2 parallel calls per ticker)
      await new Promise(r => setTimeout(r, 800))
    }

    setFundamentals(newData)
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

  return { fundamentals, loading, log, fetchFundamentals, reset }
}
