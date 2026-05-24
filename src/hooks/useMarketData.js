import { useState, useCallback } from 'react'

const TD_KEY = import.meta.env.VITE_TWELVE_DATA_KEY
const TD_URL = 'https://api.twelvedata.com'
const TIMEOUT = 20000

// ── Sector → ETF SPDR mapping ─────────────────────────────────────────────────
// FMP returns sector names that don't always match standard names
// Map all known variants to the correct ETF
export const SECTOR_ETF = {
  // Technology
  'Technology':                          'XLK',
  'Information Technology':              'XLK',
  // Energy
  'Energy':                              'XLE',
  'Oil & Gas':                           'XLE',
  'Oil & Gas Equipment & Services':     'XLE',
  'Oil & Gas Exploration & Production':  'XLE',
  'Oil, Gas & Consumable Fuels':         'XLE',
  // Financials
  'Financials':                          'XLF',
  'Financial Services':                  'XLF',
  'Banks':                               'XLF',
  // Healthcare
  'Healthcare':                          'XLV',
  'Health Care':                         'XLV',
  'Biotechnology':                       'XLV',
  'Pharmaceuticals':                     'XLV',
  // Industrials
  'Industrials':                         'XLI',
  'Aerospace & Defense':                 'XLI',
  'Industrial Conglomerates':            'XLI',
  // Materials
  'Basic Materials':                     'XLB',
  'Materials':                           'XLB',
  'Gold':                                'XLB',
  'Chemicals':                           'XLB',
  'Mining':                              'XLB',
  'Metals & Mining':                     'XLB',
  // Consumer Discretionary
  'Consumer Discretionary':              'XLY',
  'Consumer Cyclical':                   'XLY',
  'Retail':                              'XLY',
  // Consumer Staples
  'Consumer Staples':                    'XLP',
  'Consumer Defensive':                  'XLP',
  // Utilities
  'Utilities':                           'XLU',
  // Real Estate
  'Real Estate':                         'XLRE',
  // Communication Services
  'Communication Services':              'XLC',
  'Telecommunication Services':          'XLC',
  'Media':                               'XLC',
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

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

// ── Fetch price on a specific date (historical close) ─────────────────────────

async function fetchPriceOnDate(symbol, date) {
  const start = toYMD(addDays(date, -7))
  const end   = toYMD(date)
  const url   = `${TD_URL}/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&start_date=${start}&end_date=${end}&apikey=${TD_KEY}`
  const data  = await fetchJSON(url)
  if (data.status === 'error' || data.code) throw new Error(data.message || 'TD error')
  const values = data.values
  if (!values?.length) throw new Error(`No data for ${symbol} near ${toYMD(date)}`)
  return parseFloat(values[0].close)
}

// ── Fetch current price ───────────────────────────────────────────────────────

async function fetchCurrentPrice(symbol) {
  const url  = `${TD_URL}/price?symbol=${encodeURIComponent(symbol)}&apikey=${TD_KEY}`
  const data = await fetchJSON(url)
  if (data.code || data.status === 'error') throw new Error(data.message || 'TD error')
  return parseFloat(data.price)
}

// ── Compute % change ──────────────────────────────────────────────────────────

function pctChange(base, current) {
  if (!base || !current) return null
  return ((current - base) / base) * 100
}

// ── Main hook ─────────────────────────────────────────────────────────────────
// marketData shape:
// {
//   spy: { basePrice, currentPrice, changePct },
//   etfs: {
//     'XLK': { basePrice, currentPrice, changePct },
//     'XLI': { ... }
//   }
// }

export function useMarketData() {
  const [marketData, setMarketData] = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [log,        setLog]        = useState('')

  const reset = useCallback(() => {
    setMarketData(null)
    setLog('')
  }, [])

  const fetchMarketData = useCallback(async ({ stocks, fundamentals, baseDate }) => {
    if (!stocks.length || !baseDate) {
      setLog('No stocks or base date — cannot fetch market data')
      return
    }

    // Only for .US batches
    const isUS = stocks.every(s => s.t.toUpperCase().endsWith('.US') || !s.t.includes('.'))
    if (!isUS) {
      setLog('Market comparison only available for .US batches')
      return
    }

    setLoading(true)
    setLog('Fetching market data (SPY + sector ETFs)…')

    try {
      const result = { spy: null, etfs: {} }

      // Collect unique sector ETFs needed
      const sectorsNeeded = new Set()
      for (const stock of stocks) {
        const sector = fundamentals?.[stock.t]?.sector
        const etf    = sector ? SECTOR_ETF[sector] : null
        if (etf) sectorsNeeded.add(etf)
      }

      // All symbols to fetch: SPY + unique ETFs
      const allSymbols = ['SPY', ...sectorsNeeded]
      setLog(`Fetching SPY + ${sectorsNeeded.size} sector ETF${sectorsNeeded.size !== 1 ? 's' : ''} — ~${12 * allSymbols.length}s total…`)

      for (let i = 0; i < allSymbols.length; i++) {
        const symbol = allSymbols[i]
        setLog(`Fetching ${symbol} (${i + 1}/${allSymbols.length})…`)
        try {
          // Sequential: first historical, then current — with pause between
          const basePrice = await fetchPriceOnDate(symbol, baseDate)
          await sleep(2000)  // pause between the two calls for same symbol
          const currentPrice = await fetchCurrentPrice(symbol)
          const changePct = pctChange(basePrice, currentPrice)
          const entry = { basePrice, currentPrice, changePct }
          if (symbol === 'SPY') result.spy = entry
          else result.etfs[symbol] = entry
          setLog(`✓ ${symbol}: base ${basePrice?.toFixed(2)} → now ${currentPrice?.toFixed(2)} (${changePct?.toFixed(2)}%)`)
        } catch (err) {
          console.warn(`[useMarketData] failed ${symbol}:`, err.message)
          if (symbol === 'SPY') result.spy = null
          else result.etfs[symbol] = null
          setLog(`⚠ ${symbol} unavailable — ${err.message}`)
        }
        // 10s pause between symbols to avoid rate limit
        // Each symbol uses 2 TD credits; free tier = 8/min
        if (i < allSymbols.length - 1) {
          setLog(`Waiting 10s before next symbol…`)
          await sleep(10000)
        }
      }

      setMarketData(result)
      const etfCount = Object.keys(result.etfs).length
      setLog(`Market data loaded — SPY + ${etfCount} sector ETF${etfCount !== 1 ? 's' : ''}`)

    } catch (err) {
      setLog('Market data fetch error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { marketData, loading, log, fetchMarketData, reset }
}
