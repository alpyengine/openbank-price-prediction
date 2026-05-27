import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { usePriceFetch }     from './hooks/usePriceFetch.js'
import { useFundamentals }   from './hooks/useFundamentals.js'
import { useHistory }        from './hooks/useHistory.js'
import { DEFAULT_STOCKS }    from './utils/stocks.js'
import { targetDates, dateStatus, parseDate, today as getToday } from './utils/dates.js'
import Sidebar          from './components/Sidebar.jsx'
import Header           from './components/Header.jsx'
import FetchBar         from './components/FetchBar.jsx'
import FundamentalsBar  from './components/FundamentalsBar.jsx'
import SectorControls   from './components/SectorControls.jsx'
import SummaryCards     from './components/SummaryCards.jsx'
import HorizonTabs      from './components/HorizonTabs.jsx'
import StockTable       from './components/StockTable.jsx'
import ImportBox        from './components/ImportBox.jsx'
import EmailPreview     from './components/EmailPreview.jsx'
import AccuracyChart    from './components/AccuracyChart.jsx'
import { useMarketData }      from './hooks/useMarketData.js'
import MarketBar         from './components/MarketBar.jsx'

export default function App() {
  const [stocks,       setStocks]       = useState(DEFAULT_STOCKS)
  const [horizon,      setHorizon]      = useState('best')
  const [overrides,    setOverrides]    = useState({})
  const [notes,        setNotes]        = useState({})  // { ticker: noteText }
  const [showEmail,    setShowEmail]    = useState(false)
  const [darkMode,     setDarkMode]     = useState(false)
  const [activePage,   setActivePage]   = useState('batch')
  const sidebarFileRef = useRef(null)

  // Apply dark mode via .dark class on html — Tailwind 4 style
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // Sector controls
  const [filterSector,   setFilterSector]   = useState('all')
  const [filterIndustry, setFilterIndustry] = useState('all')
  const [groupBySector,  setGroupBySector]  = useState(false)
  const [sortBySector,   setSortBySector]   = useState(false)

  // Batch indicator — date of currently loaded batch
  const [loadedBatchDate, setLoadedBatchDate] = useState(null)

  // Currency symbol derived from batch stocks
  const batchCurrency = useMemo(() => {
    const cu = stocks.find(s => s.cu)?.cu ?? 'USD'
    if (cu === 'EUR') return '€'
    if (cu === 'GBP') return '£'
    return '$'
  }, [stocks])

  const {
    autoPrices, histPrices,
    fetching, log, chunkProgress,
    fetchCurrentBatch, fetchHistoricalForHorizon,
    reset: resetPrices,
  } = usePriceFetch()

  const {
    history, stats, loading: histLoading, saving: histSaving,
    log: histLog, configured: histConfigured,
    load: loadHistory, saveBatch, deleteBatch,
  } = useHistory()

  const {
    marketData, loading: marketLoading, log: marketLog,
    fetchMarketData, reset: resetMarketData, restoreMarketData,
  } = useMarketData()

  const {
    fundamentals, loading: fundLoading, log: fundLog,
    fetchFundamentals, reset: resetFundamentals, restoreFundamentals,
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
  const handleNoteChange = useCallback((ticker, text) => {
    setNotes(prev => ({ ...prev, [ticker]: text }))
  }, [])

  const handleImport = useCallback((newStocks) => {
    setStocks(newStocks)
    setLoadedBatchDate(null)
    setOverrides({})
    setNotes({})
    setHorizon('best')
    setFilterSector('all')
    setFilterIndustry('all')
    setGroupBySector(false)
    setSortBySector(false)
    resetPrices()
    resetFundamentals()
    resetMarketData()
  }, [resetPrices, resetFundamentals, resetMarketData])
  const handleLoadBatch = useCallback((batch) => {
    // Extract unique stocks from batch results
    const seen = new Set()
    const newStocks = []
    for (const r of batch.results) {
      if (seen.has(r.ticker)) continue
      seen.add(r.ticker)
      // Rebuild stock object from result rows
      const rows = batch.results.filter(x => x.ticker === r.ticker)
      const get  = (h) => rows.find(x => x.horizon === h)?.targetPrice ?? 0
      // Parse base date from "DD/MM/YYYY" or "DD Mon YYYY"
      let base = null
      if (batch.date) {
        const parts = batch.date.split('/')
        if (parts.length === 3) {
          base = new Date(+parts[2], +parts[1] - 1, +parts[0])
        }
      }
      newStocks.push({
        t:    r.ticker,
        co:   r.company,
        cu:   'USD',
        b:    r.basePrice,
        t1:   get('1M'),
        t3:   get('3M'),
        t6:   get('6M'),
        t12:  get('12M'),
        base: base || new Date(),
      })
    }
    if (!newStocks.length) return
    setStocks(newStocks)
    setLoadedBatchDate(batch.date)  // e.g. "17/03/2026"
    setOverrides({})
    // Restore notes from saved batch results
    const restoredNotes = {}
    for (const r of batch.results) {
      if (r.note && !restoredNotes[r.ticker]) restoredNotes[r.ticker] = r.note
    }
    setNotes(restoredNotes)
    // Restore marketData if saved
    if (batch.marketData) restoreMarketData(batch.marketData)
    else resetMarketData()
    // Restore fundamentals if saved and non-empty
    if (batch.fundamentals && Object.keys(batch.fundamentals).length > 0)
      restoreFundamentals(batch.fundamentals)
    else resetFundamentals()
    setHorizon('best')
    setFilterSector('all')
    setFilterIndustry('all')
    setGroupBySector(false)
    setSortBySector(false)
    resetPrices()
    // Scroll to top so user sees the loaded stocks
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [resetPrices, restoreMarketData, resetMarketData, restoreFundamentals, resetFundamentals])

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
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--tw-bg)' }}>
      {/* Hidden file input for sidebar CSV upload */}
      <input
        ref={sidebarFileRef}
        type="file"
        accept=".csv,.txt"
        style={{ display:'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = (ev) => {
            const text = ev.target.result
            const lines = text.trim().split('\n').filter(l => l.trim())
            const firstCell = lines[0]?.split(',')[0]?.trim().toLowerCase()
            const isHeader = isNaN(firstCell) && ['ticker','symbol','stock','company','name'].some(w => firstCell?.includes(w))
            const dataLines = isHeader ? lines.slice(1) : lines
            const TODAY = getToday()
            const parsed = dataLines.map(line => {
              const p = line.split(',').map(x => x.trim())
              if (p.length < 8) return null
              const base = p[8] ? parseDate(p[8]) : TODAY
              return { t:p[0].toUpperCase(), co:p[1], cu:p[2], b:+p[3]||0, t1:+p[4]||0, t3:+p[5]||0, t6:+p[6]||0, t12:+p[7]||0, base:base||TODAY }
            }).filter(Boolean)
            if (parsed.length) { handleImport(parsed); setActivePage('batch') }
          }
          reader.readAsText(file)
          e.target.value = ''
        }}
      />
      <Sidebar active={activePage} onNav={setActivePage} onUploadCSV={() => sidebarFileRef.current?.click()} />

      <main style={{ flex:1, overflowY:'auto', minWidth:0 }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px 28px' }}>

          {/* Header — always visible */}
          <Header
            stocks={stocks}
            darkMode={darkMode}
            activePage={activePage}
            onToggleDark={() => setDarkMode(v => !v)}
            onClearOverrides={() => setOverrides({})}
            onToggleEmail={() => setShowEmail(v => !v)}
            loadedBatchDate={loadedBatchDate}
            batchCurrency={batchCurrency}
          />

          {/* ── BATCH OVERVIEW ── */}
          {activePage === 'batch' && (
            <>
              <FetchBar
                log={log}
                fetching={fetching}
                chunkProgress={chunkProgress}
                horizonExpired={horizonExpired}
                horizon={horizon}
                onFetch={() => fetchCurrentBatch(stocks)}
              />

              <FundamentalsBar
                log={fundLog}
                loading={fundLoading}
                onFetch={() => fetchFundamentals(stocks)}
              />

      <MarketBar
        log={marketLog}
        loading={marketLoading}
        stocks={stocks}
        onFetch={() => fetchMarketData({
          stocks,
          fundamentals,
          baseDate: stocks.find(s => s.base)?.base,
          existingMarketData: marketData,
        })}
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

      {/* Batch indicator */}
      {stocks.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, fontSize:'var(--fs-xs)', color:'var(--text-3)' }}>
          {loadedBatchDate ? (
            <>
              <span style={{ fontSize:11 }}>📂</span>
              <span>Batch loaded: <strong style={{ color:'var(--text-2)' }}>{loadedBatchDate}</strong></span>
              <span>·</span>
              <span>{stocks.length} stock{stocks.length > 1 ? 's' : ''}</span>
              <span>·</span>
              <span style={{ color:'var(--accent)', fontWeight:600 }}>{batchCurrency} {stocks.find(s => s.cu)?.cu ?? 'USD'}</span>
            </>
          ) : (
            <>
              <span style={{ fontSize:11 }}>📄</span>
              <span>CSV imported · {stocks.length} stock{stocks.length > 1 ? 's' : ''}</span>
              <span>·</span>
              <span style={{ color:'var(--accent)', fontWeight:600 }}>{batchCurrency} {stocks.find(s => s.cu)?.cu ?? 'USD'}</span>
            </>
          )}
        </div>
      )}

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
        notes={notes}
        onNoteChange={handleNoteChange}
        marketData={marketData}
        batchCurrency={batchCurrency}
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
            </>
          )}

          {/* ── ACCURACY STATS ── */}
          {activePage === 'accuracy' && (
            <AccuracyChart
              stats={stats}
              history={history}
              loading={histLoading}
              saving={histSaving}
              log={histLog}
              configured={histConfigured}
              onLoad={loadHistory}
              onSave={() => saveBatch({ stocks, autoPrices, histPrices, overrides, horizonExpired, horizon, notes, marketData, fundamentals })}
              onLoadBatch={handleLoadBatch}
              onDeleteBatch={deleteBatch}
            />
          )}

          {/* ── SETTINGS ── */}
          {activePage === 'settings' && (
            <div>
              <div style={{ background:'var(--tw-card)', border:'1px solid var(--tw-border)', borderRadius:10, padding:'24px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize:15, fontWeight:600, color:'var(--tw-fg)', marginBottom:8 }}>Application Settings</div>
                <div style={{ fontSize:13, color:'var(--tw-muted-fg)' }}>
                  Settings panel coming soon. Configure API keys, notification preferences, and more.
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
