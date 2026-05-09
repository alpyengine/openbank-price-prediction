import { useState, useCallback } from 'react'
import { usePriceFetch }   from './hooks/usePriceFetch.js'
import { DEFAULT_STOCKS }  from './utils/stocks.js'

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

  const { autoPrices, fetching, log, fetchPrices, reset } = usePriceFetch()

  const handleImport = useCallback((newStocks) => {
    setStocks(newStocks)
    setOverrides({})
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
        onFetch={() => fetchPrices(stocks)}
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
