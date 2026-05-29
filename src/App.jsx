import { useState, useCallback, useEffect, useMemo } from 'react'
import { usePriceFetch }     from './hooks/usePriceFetch.js'
import { useFundamentals }   from './hooks/useFundamentals.js'
import { useHistory }        from './hooks/useHistory.js'
import { DEFAULT_STOCKS }    from './utils/stocks.js'
import { targetDates, dateStatus } from './utils/dates.js'
import Sidebar          from './components/Sidebar.jsx'
import Header           from './components/Header.jsx'
import FetchBar         from './components/FetchBar.jsx'
import SectorControls   from './components/SectorControls.jsx'
import SummaryCards     from './components/SummaryCards.jsx'
import HorizonTabs      from './components/HorizonTabs.jsx'
import StockTable       from './components/StockTable.jsx'
import BatchSimple      from './components/BatchSimple.jsx'
import ImportPage       from './components/ImportPage.jsx'
import EmailPreview     from './components/EmailPreview.jsx'
import AccuracyChart    from './components/AccuracyChart.jsx'
import { useMarketData } from './hooks/useMarketData.js'

export default function App() {
  const [stocks,       setStocks]       = useState(DEFAULT_STOCKS)
  const [horizon,      setHorizon]      = useState('best')
  const [overrides,    setOverrides]    = useState({})
  const [notes,        setNotes]        = useState({})
  const [showEmail,    setShowEmail]    = useState(false)
  const [darkMode,     setDarkMode]     = useState(false)
  const [activePage,   setActivePage]   = useState('batch')
  const [hitMargin,    setHitMargin]    = useState(5)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const [filterSector,   setFilterSector]   = useState('all')
  const [filterIndustry, setFilterIndustry] = useState('all')
  const [groupBySector,  setGroupBySector]  = useState(false)
  const [sortBySector,   setSortBySector]   = useState(false)
  const [loadedBatchDate, setLoadedBatchDate] = useState(null)
  const [loadedBatchId,   setLoadedBatchId]   = useState(null)

  const batchCurrency = useMemo(() => {
    const cu = stocks.find(s => s.cu)?.cu ?? 'USD'
    if (cu === 'EUR') return '€'
    if (cu === 'GBP') return '£'
    return '$'
  }, [stocks])

  const { autoPrices, histPrices, fetching, log, fetchCurrentBatch, fetchHistoricalForHorizon, reset: resetPrices, restoreHistPrices } = usePriceFetch()
  const { history, stats, loading: histLoading, saving: histSaving, log: histLog, configured: histConfigured, load: loadHistory, saveBatch, deleteBatch } = useHistory(hitMargin)
  const { marketData, loading: marketLoading, log: marketLog, fetchMarketData, reset: resetMarketData, restoreMarketData } = useMarketData()
  const { fundamentals, loading: fundLoading, log: fundLog, fetchFundamentals, reset: resetFundamentals, restoreFundamentals } = useFundamentals()

  // Auto-fetch historical prices for expired horizons
  useEffect(() => {
    if (horizon === 'best' || horizon === 'all' || !stocks.length) return
    const firstBase = stocks.find(s => s.base)?.base
    if (!firstBase) return
    const KEYS = { '1M':'d1', '3M':'d3', '6M':'d6', '12M':'d12' }
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

  const sectors = useMemo(() => {
    const set = new Set()
    for (const s of stocks) { const f = fundamentals[s.t]; if (f?.sector) set.add(f.sector) }
    return [...set].sort()
  }, [stocks, fundamentals])

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
    setActivePage('batch')
  }, [resetPrices, resetFundamentals, resetMarketData])

  const handleLoadBatch = useCallback((batch) => {
    const seen = new Set()
    const newStocks = []
    for (const r of batch.results) {
      if (seen.has(r.ticker)) continue
      seen.add(r.ticker)
      const rows = batch.results.filter(x => x.ticker === r.ticker)
      const get  = (h) => rows.find(x => x.horizon === h)?.targetPrice ?? 0
      let base = null
      if (batch.date) {
        const parts = batch.date.split('/')
        if (parts.length === 3) base = new Date(+parts[2], +parts[1] - 1, +parts[0])
      }
      newStocks.push({ t:r.ticker, co:r.company, cu:'USD', b:r.basePrice, t1:get('1M'), t3:get('3M'), t6:get('6M'), t12:get('12M'), base:base||new Date() })
    }
    if (!newStocks.length) return
    setStocks(newStocks)
    setLoadedBatchDate(batch.date)
    setLoadedBatchId(batch.id)
    setOverrides({})
    const restoredNotes = {}
    for (const r of batch.results) { if (r.note && !restoredNotes[r.ticker]) restoredNotes[r.ticker] = r.note }
    setNotes(restoredNotes)
    if (batch.marketData) restoreMarketData(batch.marketData)
    else resetMarketData()
    if (batch.fundamentals && Object.keys(batch.fundamentals).length > 0) restoreFundamentals(batch.fundamentals)
    else resetFundamentals()
    setHorizon('best')
    setFilterSector('all')
    setFilterIndustry('all')
    setGroupBySector(false)
    setSortBySector(false)
    // Restore historical prices from saved results — prevents API calls for expired horizons
    restoreHistPrices(batch.results)
  }, [resetPrices, restoreHistPrices, restoreMarketData, resetMarketData, restoreFundamentals, resetFundamentals])

  const handleOverrideChange = useCallback((ticker, value) => {
    setOverrides(prev => {
      if (value == null) { const next = { ...prev }; delete next[ticker]; return next }
      return { ...prev, [ticker]: value }
    })
  }, [])

  const firstBase = stocks.find(s => s.base)?.base
  const KEYS = { '1M':'d1', '3M':'d3', '6M':'d6', '12M':'d12' }
  const activeTargetDate = firstBase && horizon !== 'best' && horizon !== 'all' ? targetDates(firstBase)[KEYS[horizon]] : null
  const horizonExpired   = activeTargetDate ? dateStatus(activeTargetDate) === 'past' : false

  // Pages that show the fetch bar
  const showFetchBar = ['batch', 'batch-detail'].includes(activePage)

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--tw-bg)' }}>
      <Sidebar active={activePage} onNav={setActivePage} />

      <main style={{ flex:1, overflowY:'auto', minWidth:0 }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px 28px' }}>

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

          {/* Fetch bar — shown on both batch pages */}
          {showFetchBar && (
            <FetchBar
              log={log}
              fetching={fetching}
              onFetch={() => fetchCurrentBatch(stocks)}
              fundLog={fundLog}
              fundLoading={fundLoading}
              onFetchFundamentals={() => fetchFundamentals(stocks)}
              marketLog={marketLog}
              marketLoading={marketLoading}
              stocks={stocks}
              onFetchMarket={() => fetchMarketData({
                stocks, fundamentals,
                baseDate: stocks.find(s => s.base)?.base,
                existingMarketData: marketData,
              })}
              batches={history?.batches ?? []}
              loadedBatchDate={loadedBatchDate}
              onLoadBatch={handleLoadBatch}
              saving={histSaving}
              onSave={() => saveBatch({ stocks, autoPrices, histPrices, overrides, horizonExpired, horizon, notes, marketData, fundamentals })}
            />
          )}

          {/* ── BATCH OVERVIEW (simple) ── */}
          {activePage === 'batch' && (
            <BatchSimple
              stocks={stocks}
              autoPrices={autoPrices}
              histPrices={histPrices}
              overrides={overrides}
              hitMargin={hitMargin}
            />
          )}

          {/* ── BATCH OVERVIEW DETAIL ── */}
          {activePage === 'batch-detail' && (
            <>
              <SummaryCards
                stocks={stocks}
                horizon={horizon}
                autoPrices={autoPrices}
                histPrices={histPrices}
                overrides={overrides}
                horizonExpired={horizonExpired}
                hitMargin={hitMargin}
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

              {stocks.length > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, fontSize:11, color:'var(--tw-muted-fg)' }}>
                  {loadedBatchDate
                    ? <><span>📂</span><span>Batch loaded: <strong>{loadedBatchDate}</strong></span><span>·</span><span>{stocks.length} stocks</span></>
                    : <><span>📄</span><span>CSV imported · {stocks.length} stocks</span></>
                  }
                  <span>·</span>
                  <span style={{ fontWeight:600 }}>{batchCurrency} {stocks.find(s => s.cu)?.cu ?? 'USD'}</span>
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
                hitMargin={hitMargin}
                batchId={loadedBatchId}
              />

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
              history={history?.batches ?? []}
              hitMargin={hitMargin}
              onMarginChange={setHitMargin}
              loading={histLoading}
              saving={histSaving}
              log={histLog}
              configured={histConfigured}
              onLoad={loadHistory}
              onLoadBatch={handleLoadBatch}
              onDeleteBatch={deleteBatch}
            />
          )}

          {/* ── IMPORT CSV ── */}
          {activePage === 'import' && (
            <ImportPage onImport={handleImport} />
          )}

          {/* ── SETTINGS ── */}
          {activePage === 'settings' && (
            <div style={{ background:'var(--tw-card)', border:'1px solid var(--tw-border)', borderRadius:10, padding:'24px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--tw-fg)', marginBottom:8 }}>Application Settings</div>
              <div style={{ fontSize:13, color:'var(--tw-muted-fg)' }}>
                Settings panel coming soon. Configure API keys, notification preferences, and more.
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
