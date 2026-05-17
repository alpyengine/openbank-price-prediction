import { useState, useCallback } from 'react'

const TD_KEY  = import.meta.env.VITE_TWELVE_DATA_KEY
const FMP_KEY = import.meta.env.VITE_FMP_KEY
const TD_URL  = 'https://api.twelvedata.com'
const FMP_URL = 'https://financialmodelingprep.com/stable'
const TIMEOUT = 15000

export function fmtMarketCap(val) {
  if (!val) return '--'
  if (val >= 1e12) return (val / 1e12).toFixed(1) + 'T'
  if (val >= 1e9)  return (val / 1e9).toFixed(1) + 'B'
  if (val >= 1e6)  return (val / 1e6).toFixed(1) + 'M'
  return val.toLocaleString()
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

// FMP: GET /stable/profile?symbol=TER&apikey=KEY
// Returns array — take first element
async function fetchFMPProfile(ticker) {
  const url  = `${FMP_URL}/profile?symbol=${encodeURIComponent(ticker)}&apikey=${FMP_KEY}`
  const data = await fetchWithTimeout(url)
  if (!Array.isArray(data) || !data.length) throw new Error('FMP: no data')
  const p = data[0]
  return {
    sector:    p.sector    || '--',
    industry:  p.industry  || '--',
    marketCap: p.marketCap || null,
    beta:      p.beta      || null,
  }
}

// Twelve Data: GET /statistics?symbol=TER&apikey=KEY
// Returns forwardPE from valuations_metrics
async function fetchTDForwardPE(ticker) {
  const url  = `${TD_URL}/statistics?symbol=${encodeURIComponent(ticker)}&apikey=${TD_KEY}`
  const data = await fetchWithTimeout(url)
  if (data?.status === 'error') throw new Error(data.message || 'TD error')
  return data?.statistics?.valuations_metrics?.forward_pe || null
}

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

        // FMP and Twelve Data in parallel
        const [fmp, forwardPE] = await Promise.allSettled([
          fetchFMPProfile(s.t),
          fetchTDForwardPE(s.t),
        ])

        const fmpData  = fmp.status === 'fulfilled' ? fmp.value : {}
        const fwdPE    = forwardPE.status === 'fulfilled' ? forwardPE.value : null

        newData[s.t] = {
          sector:    fmpData.sector    || '--',
          industry:  fmpData.industry  || '--',
          marketCap: fmpData.marketCap || null,
          beta:      fmpData.beta      || null,
          forwardPE: fwdPE,
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

  return { fundamentals, loading, log, fetchFundamentals, reset }
}
