import { useState, useCallback } from 'react'
import { useServerHealth } from './hooks/useServerHealth.js'
import { usePriceFetch }   from './hooks/usePriceFetch.js'
import { DEFAULT_STOCKS }  from './utils/stocks.js'

import Header       from './components/Header.jsx'
import ServerWarn   from './components/ServerWarn.jsx'
import FetchBar     from './components/FetchBar.jsx'
import SummaryCards from './components/SummaryCards.jsx'
import HorizonTabs  from './components/HorizonTabs.jsx'
import StockTable   from './components/StockTable.jsx'
import ImportBox    from './components/ImportBox.jsx'
import EmailPreview from './components/EmailPreview.jsx'

export default function App() {
  // ── Data state ─────────────────────────────────────────────────────────────
  const [stocks,    setStocks]    = useState(DEFAULT_STOCKS)
  const [horizon,   setHorizon]   = useState('best')
  const [overrides, setOverrides] = useState({})   // { TICKER: number }
  const [showEmail, setShowEmail] = useState(false)

  // ── Server + fetch ──────────────────────────────────────────────────────────
  const { status: serverStatus, retry: retryServer } = useServerHealth()
  const { autoPrices, sources, fetching, log, fetchPrices, reset: resetPrices } = usePriceFetch()

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleImport = useCallback((newStocks) => {
    setStocks(newStocks)
    setOverrides({})
    resetPrices()
  }, [resetPrices])

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

  const handleClearOverrides = useCallback(() => {
    setOverrides({})
  }, [])

  const handleFetch = useCallback(() => {
    fetchPrices(stocks)
  }, [fetchPrices, stocks])

  return (
    <div style={styles.wrap}>
      <Header
        stocks={stocks}
        onClearOverrides={handleClearOverrides}
        onEmailReport={() => setShowEmail(v => !v)}
      />

      <ServerWarn status={serverStatus} onRetry={retryServer} />

      <FetchBar
        log={log}
        fetching={fetching}
        serverOk={serverStatus === 'ok'}
        onFetch={handleFetch}
      />

      <SummaryCards
        stocks={stocks}
        horizon={horizon}
        autoPrices={autoPrices}
        overrides={overrides}
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
        sources={sources}
        overrides={overrides}
        onOverrideChange={handleOverrideChange}
      />

      <ImportBox onImport={handleImport} />

      {showEmail && (
        <EmailPreview
          stocks={stocks}
          horizon={horizon}
          autoPrices={autoPrices}
          overrides={overrides}
          onClose={() => setShowEmail(false)}
        />
      )}
    </div>
  )
}

const styles = {
  wrap: { maxWidth: 1080, margin: '0 auto' },
}
