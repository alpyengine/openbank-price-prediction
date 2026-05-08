import { useState, useCallback } from 'react'

const SERVER = '/api'
const TIMEOUT_MS = 60000

export function usePriceFetch() {
  const [autoPrices, setAutoPrices] = useState({})  // { TICKER: number | null }
  const [sources,    setSources]    = useState({})  // { TICKER: string }
  const [fetching,   setFetching]   = useState(false)
  const [log,        setLog]        = useState('Import stocks first, then click Fetch')

  const fetchPrices = useCallback(async (stocks) => {
    if (!stocks.length) return
    setFetching(true)
    setLog('Fetching prices...')

    const tickers    = stocks.map(s => s.t).join(',')
    const currencies = stocks.map(s => s.cu || 'USD').join(',')
    const url        = `${SERVER}/prices?tickers=${encodeURIComponent(tickers)}&currencies=${encodeURIComponent(currencies)}`

    const ctrl = new AbortController()
    const tid  = setTimeout(() => ctrl.abort(), TIMEOUT_MS)

    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
      clearTimeout(tid)

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'HTTP ' + res.status)
      }

      const results = await res.json()

      const newPrices = {}
      const newSources = {}
      const failed = []

      for (const s of stocks) {
        const r = results[s.t]
        if (r && typeof r.price === 'number' && !r.error) {
          newPrices[s.t]  = r.price
          newSources[s.t] = r.source || ''
        } else {
          newPrices[s.t]  = null
          newSources[s.t] = ''
          failed.push(`${s.t}(${r?.error || 'no data'})`)
        }
      }

      setAutoPrices(newPrices)
      setSources(newSources)

      const ok = stocks.length - failed.length
      setLog(`${ok}/${stocks.length} prices loaded${failed.length ? ' | Failed: ' + failed.join(', ') : ''}`)

    } catch (err) {
      clearTimeout(tid)
      const msg = classifyError(err)
      setLog('Fetch error: ' + msg)
    } finally {
      setFetching(false)
    }
  }, [])

  const reset = useCallback(() => {
    setAutoPrices({})
    setSources({})
    setLog('Import stocks first, then click Fetch')
  }, [])

  return { autoPrices, sources, fetching, log, fetchPrices, reset, setLog }
}

function classifyError(err) {
  const msg = err?.message || String(err)
  if (msg.includes('abort') || msg.includes('AbortError'))
    return 'Timeout — server took too long'
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError'))
    return 'Cannot reach server — is run.py running?'
  return msg || 'Unknown error'
}
