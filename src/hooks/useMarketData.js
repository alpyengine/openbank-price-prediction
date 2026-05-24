import { useState, useCallback } from 'react'

const TD_KEY = import.meta.env.VITE_TWELVE_DATA_KEY
const AV_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY
const TD_URL = 'https://api.twelvedata.com'
const AV_URL = 'https://www.alphavantage.co/query'
const TIMEOUT = 20000

// ── Sector → ETF SPDR mapping (US) ───────────────────────────────────────────
export const SECTOR_ETF = {
  'Technology':                          'XLK',
  'Information Technology':              'XLK',
  'Energy':                              'XLE',
  'Oil & Gas':                           'XLE',
  'Oil & Gas Equipment & Services':      'XLE',
  'Oil & Gas Exploration & Production':  'XLE',
  'Oil, Gas & Consumable Fuels':         'XLE',
  'Financials':                          'XLF',
  'Financial Services':                  'XLF',
  'Financial':                           'XLF',
  'Banks':                               'XLF',
  'Insurance':                           'XLF',
  'Insurance - Life':                    'XLF',
  'Insurance - Property & Casualty':     'XLF',
  'Healthcare':                          'XLV',
  'Health Care':                         'XLV',
  'Biotechnology':                       'XLV',
  'Pharmaceuticals':                     'XLV',
  'Industrials':                         'XLI',
  'Aerospace & Defense':                 'XLI',
  'Industrial Conglomerates':            'XLI',
  'Basic Materials':                     'XLB',
  'Materials':                           'XLB',
  'Gold':                                'XLB',
  'Chemicals':                           'XLB',
  'Mining':                              'XLB',
  'Metals & Mining':                     'XLB',
  'Consumer Discretionary':              'XLY',
  'Consumer Cyclical':                   'XLY',
  'Retail':                              'XLY',
  'Consumer Staples':                    'XLP',
  'Consumer Defensive':                  'XLP',
  'Utilities':                           'XLU',
  'Real Estate':                         'XLRE',
  'Communication Services':              'XLC',
  'Telecommunication Services':          'XLC',
  'Media':                               'XLC',
}

// ── Industry → ETF mapping (US, free tier only) ───────────────────────────────
// Only ETFs confirmed available on Twelve Data free plan
// Removed: BITE, CARZ, REZ, INDS, RTL, SIL, COPX, SLX, OGIG, CLOU, IHI, IHF, IAI
export const INDUSTRY_ETF = {
  // Technology
  'Semiconductors':                       'SOXX',
  'Semiconductor Equipment':              'SOXX',
  'Software - Application':               'IGV',
  'Software - Infrastructure':            'IGV',
  'Software':                             'IGV',
  // Healthcare
  'Biotechnology':                        'XBI',
  'Drug Manufacturers':                   'XPH',
  // Energy
  'Oil & Gas E&P':                        'XOP',
  'Oil & Gas Exploration & Production':   'XOP',
  'Oil & Gas Equipment & Services':       'OIH',
  'Oil & Gas Integrated':                 'XOP',
  // Materials
  'Gold':                                 'GDX',
  'Metals & Mining':                      'GDX',
  // Industrials
  'Aerospace & Defense':                  'ITA',
  'Airlines':                             'JETS',
  // Consumer
  'Specialty Retail':                     'XRT',
  // Residential Construction
  'Residential Construction':             'ITB',
  // Financials — banks only (KBE free tier)
  'Banks - Regional':                     'KBE',
  'Banks':                                'KBE',
}

// ── European market index mapping ─────────────────────────────────────────────
// suffix → { benchmarkSymbol, benchmarkLabel, provider }
export const EU_MARKET_INDEX = {
  'DE': { symbol: 'DAX',   label: 'DAX (Germany)',     provider: 'td' },
  'AS': { symbol: 'AEX',   label: 'AEX (Netherlands)', provider: 'td' },
  'PA': { symbol: 'CAC40', label: 'CAC 40 (France)',   provider: 'td' },
  'L':  { symbol: 'UKX',   label: 'FTSE 100 (UK)',     provider: 'td' },
  'MC': { symbol: 'IBEX35',label: 'IBEX 35 (Spain)',   provider: 'td' },
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

// ── Twelve Data: price on date + current price ────────────────────────────────

async function fetchPriceOnDate_TD(symbol, date) {
  const start = toYMD(addDays(date, -7))
  const end   = toYMD(date)
  const url   = `${TD_URL}/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&start_date=${start}&end_date=${end}&apikey=${TD_KEY}`
  const data  = await fetchJSON(url)
  if (data.status === 'error' || data.code) throw new Error(data.message || 'TD error')
  const values = data.values
  if (!values?.length) throw new Error(`No data for ${symbol} near ${toYMD(date)}`)
  return parseFloat(values[0].close)
}

async function fetchCurrentPrice_TD(symbol) {
  const url  = `${TD_URL}/price?symbol=${encodeURIComponent(symbol)}&apikey=${TD_KEY}`
  const data = await fetchJSON(url)
  if (data.code || data.status === 'error') throw new Error(data.message || 'TD error')
  return parseFloat(data.price)
}

// ── Alpha Vantage: price on date + current price (for EU indices) ─────────────

async function fetchPriceOnDate_AV(symbol, date) {
  const url  = `${AV_URL}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${AV_KEY}`
  const data = await fetchJSON(url)
  const ts   = data['Time Series (Daily)']
  if (!ts) throw new Error(`AV: no data for ${symbol}`)
  const targetStr = toYMD(date)
  const dates     = Object.keys(ts).sort().reverse()
  const found     = dates.find(d => d <= targetStr)
  if (!found) throw new Error(`AV: no data near ${targetStr} for ${symbol}`)
  return parseFloat(ts[found]['4. close'])
}

async function fetchCurrentPrice_AV(symbol) {
  const url  = `${AV_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${AV_KEY}`
  const data = await fetchJSON(url)
  const q    = data['Global Quote']
  if (!q || !q['05. price']) throw new Error(`AV: no quote for ${symbol}`)
  return parseFloat(q['05. price'])
}

function pctChange(base, current) {
  if (!base || !current) return null
  return ((current - base) / base) * 100
}

// ── Detect batch market ───────────────────────────────────────────────────────

function detectBatchMarket(stocks) {
  if (!stocks.length) return 'US'
  const suffix = stocks[0].t.split('.').pop().toUpperCase()
  if (['DE','AS','PA','L','MC'].includes(suffix)) return suffix
  return 'US'
}

// ── Fetch one symbol — reuse basePrice if already saved ───────────────────────

async function fetchSymbolData(symbol, date, provider = 'td', existingEntry = null) {
  // If basePrice already saved — skip historical fetch (saves 1 TD credit per symbol)
  let basePrice = existingEntry?.basePrice ?? null
  const hadBasePrice = basePrice != null

  if (!hadBasePrice) {
    // First time — fetch historical close on base date
    if (provider === 'av') {
      basePrice = await fetchPriceOnDate_AV(symbol, date)
      await sleep(1200)
    } else {
      basePrice = await fetchPriceOnDate_TD(symbol, date)
      await sleep(2000)
    }
  }

  // Always fetch current price — it changes every day
  const currentPrice = provider === 'av'
    ? await fetchCurrentPrice_AV(symbol)
    : await fetchCurrentPrice_TD(symbol)

  return { basePrice, currentPrice, changePct: pctChange(basePrice, currentPrice), hadBasePrice }
}

// ── Main hook ─────────────────────────────────────────────────────────────────
// marketData shape:
// {
//   market: 'US' | 'DE' | 'AS' | 'PA' | 'L' | 'MC'
//   spy:  { basePrice, currentPrice, changePct }  ← SPY for US, index for EU
//   benchmark: { symbol, label }                  ← what "spy" actually is
//   etfs: { 'XLK': {...}, 'XLE': {...} }          ← sector ETFs (US only)
//   industryEtfs: { 'SOXX': {...} }               ← industry ETFs (US only)
// }

export function useMarketData() {
  const [marketData, setMarketData] = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [log,        setLog]        = useState('')

  const reset = useCallback(() => {
    setMarketData(null)
    setLog('')
  }, [])

  const fetchMarketData = useCallback(async ({ stocks, fundamentals, baseDate, existingMarketData }) => {
    if (!stocks.length || !baseDate) {
      setLog('No stocks or base date — cannot fetch market data')
      return
    }

    // If marketData already loaded for same base date — skip fetch
    if (existingMarketData?.baseDate === toYMD(baseDate)) {
      setMarketData(existingMarketData)
      setLog('Market data restored from saved batch')
      return
    }

    const market = detectBatchMarket(stocks)
    const isUS   = market === 'US'
    const isEU   = !isUS

    setLoading(true)

    try {
      const result = {
        baseDate:     toYMD(baseDate),
        market,
        spy:          null,
        benchmark:    null,
        etfs:         {},
        industryEtfs: {},
      }

      if (isUS) {
        // ── US batch: SPY + sector ETFs + industry ETFs ──────────────────────
        const sectorsNeeded   = new Set()
        const industriesNeeded = new Set()

        for (const stock of stocks) {
          const fund     = fundamentals?.[stock.t]
          const sector   = fund?.sector
          const industry = fund?.industry
          const sEtf     = sector   ? SECTOR_ETF[sector]     : null
          const iEtf     = industry ? INDUSTRY_ETF[industry] : null
          if (sEtf) sectorsNeeded.add(sEtf)
          if (iEtf) industriesNeeded.add(iEtf)
        }

        const allSymbols = ['SPY', ...sectorsNeeded, ...industriesNeeded]
        result.benchmark = { symbol: 'SPY', label: 'S&P 500 (SPY)' }
        const hasCached     = !!existingMarketData
        const secsPerSymbol = hasCached ? 8 : 22
        const cacheNote     = hasCached ? ' (base prices cached — faster)' : ''
        setLog(`Fetching SPY + ${sectorsNeeded.size} sector + ${industriesNeeded.size} industry ETFs — ~${secsPerSymbol * allSymbols.length}s${cacheNote}…`)

        for (let i = 0; i < allSymbols.length; i++) {
          const symbol = allSymbols[i]
          // Get existing entry if available — to reuse basePrice
          const existingEntry = existingMarketData
            ? (symbol === 'SPY'
                ? existingMarketData.spy
                : (existingMarketData.etfs?.[symbol] ?? existingMarketData.industryEtfs?.[symbol]))
            : null

          const label = existingEntry?.basePrice != null ? `${symbol} (base cached)` : symbol
          setLog(`Fetching ${label} (${i + 1}/${allSymbols.length})…`)
          try {
            const entry = await fetchSymbolData(symbol, baseDate, 'td', existingEntry)
            if (symbol === 'SPY')                  result.spy = entry
            else if (sectorsNeeded.has(symbol))    result.etfs[symbol] = entry
            else if (industriesNeeded.has(symbol)) result.industryEtfs[symbol] = entry
            const cached = entry.hadBasePrice ? ' (base cached)' : ''
            setLog(`✓ ${symbol}${cached}: base ${entry.basePrice?.toFixed(2)} → now ${entry.currentPrice?.toFixed(2)} (${entry.changePct?.toFixed(2)}%)`)
          } catch (err) {
            console.warn(`[useMarketData] failed ${symbol}:`, err.message)
            setLog(`⚠ ${symbol} — ${err.message}`)
          }
          if (i < allSymbols.length - 1) {
            // If basePrice was cached, only 1 request was made (currentPrice)
            // so we only need 8s pause instead of 20s
            const pause = existingMarketData ? 8000 : 20000
            setLog(`Waiting ${pause/1000}s before next symbol (${i + 2}/${allSymbols.length})…`)
            await sleep(pause)
          }
        }

      } else {
        // ── EU batch: local index via TD ──────────────────────────────────────
        const idx = EU_MARKET_INDEX[market]
        if (!idx) {
          setLog(`No index configured for market .${market}`)
          setLoading(false)
          return
        }
        result.benchmark = { symbol: idx.symbol, label: idx.label }
        const existingEntry = existingMarketData?.spy ?? null
        const label = existingEntry?.basePrice != null ? `${idx.label} (base cached)` : idx.label
        setLog(`Fetching ${label}…`)

        try {
          const entry = await fetchSymbolData(idx.symbol, baseDate, idx.provider, existingEntry)
          result.spy  = entry
          const cached = entry.hadBasePrice ? ' (base cached)' : ''
          setLog(`✓ ${idx.symbol}${cached}: base ${entry.basePrice?.toFixed(2)} → now ${entry.currentPrice?.toFixed(2)} (${entry.changePct?.toFixed(2)}%)`)
        } catch (err) {
          console.warn(`[useMarketData] failed ${idx.symbol}:`, err.message)
          setLog(`⚠ ${idx.symbol} unavailable — ${err.message}`)
        }
      }

      setMarketData(result)
      setLog(`Market data loaded — ${result.benchmark?.label ?? 'done'}`)

    } catch (err) {
      setLog('Market data fetch error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const restoreMarketData = useCallback((saved) => {
    setMarketData(saved)
    setLog('Market data restored from saved batch')
  }, [])

  return { marketData, loading, log, fetchMarketData, reset, restoreMarketData }
}
