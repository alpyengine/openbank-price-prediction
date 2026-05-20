import { useState, useCallback, useEffect, useMemo } from 'react'
import { usePriceFetch }     from './hooks/usePriceFetch.js'
import { useFundamentals }   from './hooks/useFundamentals.js'
import { DEFAULT_STOCKS }    from './utils/stocks.js'
import { targetDates, dateStatus } from './utils/dates.js'

import Header           from './components/Header.jsx'
import FetchBar         from './components/FetchBar.jsx'
import FundamentalsBar  from './components/FundamentalsBar.jsx'
import SectorControls   from './components/SectorControls.jsx'
import SummaryCards     from './components/SummaryCards.jsx'
import HorizonTabs      from './components/HorizonTabs.jsx'
import StockTable       from './components/StockTable.jsx'
import ImportBox        from './components/ImportBox.jsx'
import EmailPreview     from './components/EmailPreview.jsx'

export default function App() {
  const [stocks,       setStocks]       = useState(DEFAULT_STOCKS)
  const [horizon,      setHorizon]      = useState('best')
  const [overrides,    setOverrides]    = useState({})
  const [showEmail,    setShowEmail]    = useState(false)
  const [darkMode,     setDarkMode]     = useState(false)

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Sector controls
  const [filterSector,   setFilterSector]   = useState('all')
  const [filterIndustry, setFilterIndustry] = useState('all')
  const [groupBySector,  setGroupBySector]  = useState(false)
  const [sortBySector,   setSortBySector]   = useState(false)

  const {
    autoPrices, histPrices,
    fetching, log,
    fetchCurrentBatch, fetchHistoricalForHorizon,
    reset: resetPrices,
  } = usePriceFetch()

  const {
    fundamentals, loading: fundLoading, log: fundLog,
    fetchFundamentals, reset: resetFundamentals,
  } = useFundamentals()

  // Auto-fetch historical on expired horizon switch
  useEffect(() => {
    if (horizon === 'best' || !stocks.length) return
    const firstBase = stocks.find(s => s.base)?.base
    if (!firstBase) return
    const KEYS = { '1M': 'd1', '3M': 'd3', '6M': 'd6', '12M': 'd12' }
    const tg   = targetDates(firstBase)
    const date = tg[KEYS[horizon]]
    if (!date || dateStatus(date) !== 'past') return
    const needFetch = stocks.filter(s => !histPrices[`${s.t}_${horizon}`])
    if (!needFetch.length) return
    const targetDateMap = {}
    for (const s of stocks) {
      if (!s.base) continue
      targetDateMap[s.t] = targetDates(s.base)[KEYS[horizon]]
    }
    fetchHistoricalForHorizon(needFetch, horizon, targetDateMap)
  }, [horizon, stocks])

  // Unique sectors from fetched fundamentals
  const sectors = useMemo(() => {
    const set = new Set()
    for (const s of stocks) {
      const f = fundamentals[s.t]
      if (f?.sector) set.add(f.sector)
    }
    return [...set].sort()
  }, [stocks, fundamentals])

  // Unique industries — filtered by selected sector
  const industries = useMemo(() => {
    const set = new Set()
    for (const s of stocks) {
      const f = fundamentals[s.t]
      if (!f?.industry) continue
      if (filterSector !== 'all' && f.sector !== filterSector) continue
      set.add(f.industry)
    }
    return [...set].sort()
  }, [stocks, fundamentals, filterSector])

  // Handlers
  const handleImport = useCallback((newStocks) => {
    setStocks(newStocks)
    setOverrides({})
    setHorizon('best')
    setFilterSector('all')
    setFilterIndustry('all')
    setGroupBySector(false)
    setSortBySector(false)
    resetPrices()
    resetFundamentals()
  }, [resetPrices, resetFundamentals])

  const handleOverrideChange = useCallback((ticker, value) => {
    setOverrides(prev => {
      if (value == null) { const next = { ...prev }; delete next[ticker]; return next }
      return { ...prev, [ticker]: value }
    })
  }, [])

  // Horizon expired?
  const firstBase = stocks.find(s => s.base)?.base
  const KEYS = { '1M': 'd1', '3M': 'd3', '6M': 'd6', '12M': 'd12' }
  const activeTargetDate = firstBase && horizon !== 'best'
    ? targetDates(firstBase)[KEYS[horizon]] : null
  const horizonExpired = activeTargetDate ? dateStatus(activeTargetDate) === 'past' : false

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto' }}>
      <Header
        stocks={stocks}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(v => !v)}
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

      <FundamentalsBar
        log={fundLog}
        loading={fundLoading}
        onFetch={() => fetchFundamentals(stocks)}
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

      <SectorControls
        sectors={sectors}
        industries={industries}
        filterSector={filterSector}
        filterIndustry={filterIndustry}
        groupBySector={groupBySector}
        sortBySector={sortBySector}
        onFilterSectorChange={(v) => { setFilterSector(v); setFilterIndustry('all') }}
        onFilterIndustryChange={setFilterIndustry}
        onGroupToggle={() => setGroupBySector(v => !v)}
        onSortToggle={() => setSortBySector(v => !v)}
      />

      <StockTable
        stocks={stocks}
        horizon={horizon}
        autoPrices={autoPrices}
        histPrices={histPrices}
        overrides={overrides}
        horizonExpired={horizonExpired}
        fundamentals={fundamentals}
        groupBySector={groupBySector}
        filterSector={filterSector}
        filterIndustry={filterIndustry}
        sortBySector={sortBySector}
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
          fundamentals={fundamentals}
          onClose={() => setShowEmail(false)}
        />
      )}
    </div>
  )
}
