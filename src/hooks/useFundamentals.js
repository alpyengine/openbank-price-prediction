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

// Strip .US suffix for US markets — FMP uses bare ticker for NYSE/NASDAQ
// European suffixes (.DE, .AS, .PA, .L) are kept as FMP supports them
function fmpSymbol(ticker) {
  return ticker.replace(/\.US$/i, '')
}

// Strip .US suffix for Twelve Data — also strip EU suffixes as TD uses bare tickers
function tdSymbol(ticker) {
  return ticker.replace(/\.(US|DE|AS|PA|L|MC)$/i, '')
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

// Twelve Data: GET /statistics?symbol=TER&apikey=KEY
async function fetchTDForwardPE(ticker) {
  const symbol = tdSymbol(ticker)
  const url    = `${TD_URL}/statistics?symbol=${encodeURIComponent(symbol)}&apikey=${TD_KEY}`
  const data   = await fetchWithTimeout(url)
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
          sector:       fmpData.sector       || '--',
          industry:     fmpData.industry     || '--',
          marketCap:    fmpData.marketCap    || null,
          beta:         fmpData.beta         || null,
          website:      fmpData.website      || null,
          lastDividend: fmpData.lastDividend || null,
          cik:          fmpData.cik          || null,
          description:  fmpData.description  || null,
          forwardPE:    fwdPE,
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
