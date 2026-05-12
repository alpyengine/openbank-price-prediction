import { useState, useCallback, useEffect } from 'react'
import { usePriceFetch }  from './hooks/usePriceFetch.js'
import { DEFAULT_STOCKS } from './utils/stocks.js'
import { targetDates, dateStatus } from './utils/dates.js'

import Header       from './components/Header.jsx'
import FetchBar     from './components/FetchBar.jsx'
import SummaryCards from './components/SummaryCards.jsx'
import HorizonTabs  from './components/HorizonTabs.jsx'
import StockTable   from './components/StockTable.jsx'
import ImportBox    from './components/ImportBox.jsx'
import EmailPreview from './components/EmailPreview.jsx'

export default function App() {
  const [stocks,    setStocks]    = useState(DEFAULT_STOCKS)
  const [horizon,   setHorizon]   = useState('best')
  const [overrides, setOverrides] = useState({})
  const [showEmail, setShowEmail] = useState(false)

  const {
    autoPrices, histPrices,
    fetching, log,
    fetchCurrentBatch, fetchHistoricalForHorizon,
    reset,
  } = usePriceFetch()

  // ── When horizon changes to an expired one, auto-fetch historical prices ───
  useEffect(() => {
    if (horizon === 'best' || !stocks.length) return

    // Check if this horizon is expired for the first stock (all share same base in typical use)
    const firstBase = stocks.find(s => s.base)?.base
    if (!firstBase) return

    const KEYS = { '1M': 'd1', '3M': 'd3', '6M': 'd6', '12M': 'd12' }
    const tg   = targetDates(firstBase)
    const date = tg[KEYS[horizon]]
    if (!date) return

    const status = dateStatus(date)
    if (status !== 'past') return

    // Build targetDates map per stock for this horizon
    const stocksNeedingFetch = stocks.filter(s => {
      const key = `${s.t}_${horizon}`
      return !histPrices[key] // skip already fetched
    })
    if (!stocksNeedingFetch.length) return

    // Build { TICKER: Date } map
    const targetDateMap = {}
    for (const s of stocks) {
      if (!s.base) continue
      const tg = targetDates(s.base)
      targetDateMap[s.t] = tg[KEYS[horizon]]
    }

    fetchHistoricalForHorizon(stocksNeedingFetch, horizon, targetDateMap)
  }, [horizon, stocks]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleImport = useCallback((newStocks) => {
    setStocks(newStocks)
    setOverrides({})
    setHorizon('best')
    reset()
  }, [reset])

  const handleOverrideChange = useCallback((ticker, value) => {
    setOverrides(prev => {
      if (value == null) {
        const next = { ...prev }
        delete next[ticker]
        return next
      }
      return { ...prev, [ticker]: value }
    })
  }, [])

  // Determine if active horizon is expired
  const firstBase = stocks.find(s => s.base)?.base
  const KEYS = { '1M': 'd1', '3M': 'd3', '6M': 'd6', '12M': 'd12' }
  const activeTargetDate = firstBase && horizon !== 'best'
    ? targetDates(firstBase)[KEYS[horizon]]
    : null
  const horizonExpired = activeTargetDate ? dateStatus(activeTargetDate) === 'past' : false

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <Header
        stocks={stocks}
        onClearOverrides={() => setOverrides({})}
        onToggleEmail={() => setShowEmail(v => !v)}
      />

      <FetchBar
        log={log}
        fetching={fetching}
        horizonExpired={horizonExpired}
        horizon={horizon}
        onFetch={() => fetchCurrentBatch(stocks)}
      />

      <SummaryCards
        stocks={stocks}
        horizon={horizon}
        autoPrices={autoPrices}
        histPrices={histPrices}
        overrides={overrides}
        horizonExpired={horizonExpired}
      />

      <HorizonTabs
        horizon={horizon}
        stocks={stocks}
        onHorizonChange={setHorizon}
      />

      <StockTable
        stocks={stocks}
        horizon={horizon}
        autoPrices={autoPrices}
        histPrices={histPrices}
        overrides={overrides}
        horizonExpired={horizonExpired}
        onOverrideChange={handleOverrideChange}
      />

      <ImportBox onImport={handleImport} />

      {showEmail && (
        <EmailPreview
          stocks={stocks}
          horizon={horizon}
          autoPrices={autoPrices}
          histPrices={histPrices}
          overrides={overrides}
          horizonExpired={horizonExpired}
          onClose={() => setShowEmail(false)}
        />
      )}
    </div>
  )
}
