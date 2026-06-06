/**
 * App.jsx — Root application component
 *
 * The single top-level component that owns all application state and
 * coordinates between the sidebar navigation, data fetching hooks,
 * and page-level components.
 *
 * Architecture:
 *   App owns state → passes props down → components call callbacks up
 *   No global state library (Redux/Zustand) — props and callbacks only.
 *
 * State managed here:
 *   stocks          — current batch of stock objects from CSV
 *   horizon         — selected horizon tab ('1M'|'3M'|'6M'|'12M'|'all'|'best')
 *   overrides       — manual price overrides { [ticker]: number }
 *   notes           — notes per ticker { [ticker]: string }
 *   activePage      — current sidebar page id
 *   darkMode        — dark/light mode toggle
 *   showEmail       — whether email report modal is visible
 *   hitMargin       — hit tolerance % (default 5, configurable in Settings)
 *   loadedBatchDate — DD/MM/YYYY of the batch loaded from history
 *   loadedBatchId   — YYYY-MM-DD id of the loaded batch (for PriceChart)
 *   batchCurrency   — currency symbol derived from batch stocks
 *   groupBySector   — whether to group table rows by sector
 *   filterSector    — sector filter value ('all' or sector name)
 *   filterIndustry  — industry filter value
 *   sortBySector    — whether to sort rows alphabetically by sector
 *
 * Hooks used:
 *   usePriceFetch()    — current + historical price fetching
 *   useFundamentals()  — FMP fundamentals fetching
 *   useMarketData()    — SPY/ETF benchmark fetching
 *   useHistory()       — Supabase batch history (save/load/delete)
 *
 * Pages (sidebar nav):
 *   batch        — BatchSimple: quick overview table
 *   batch-detail — StockTable: full analysis with bars and market comparison
 *   accuracy     — AccuracyChart: historical accuracy stats
 *   import       — ImportPage: CSV import
 *   settings     — Settings: hit margin, dark mode
 */
import { useState, useCallback, useEffect, useMemo } from 'react'
import { usePriceFetch }     from './hooks/usePriceFetch.js'
import { useFundamentals }   from './hooks/useFundamentals.js'
import { useHistory }        from './hooks/useHistory.js'
import { loadAllWeeklyPrices } from './services/storage.js'
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
import { useRole }        from './hooks/useRole.js'
import ManageUsers       from './components/ManageUsers.jsx'
import AllStocksPage     from './components/AllStocksPage.jsx'
import SettingsPage      from './components/SettingsPage.jsx'
import HelpPage          from './components/HelpPage.jsx'
import WatchlistPage     from './components/WatchlistPage.jsx'
import ExportPage        from './components/ExportPage.jsx'
import { useWatchlist }  from './hooks/useWatchlist.js'
import { useAlerts }     from './hooks/useAlerts.js'

/**
 * App — the root component. See module header for full documentation.
 */
export default function App() {
  const [stocks,       setStocks]       = useState(DEFAULT_STOCKS)
  const [horizon,      setHorizon]      = useState('best')
  const [overrides,    setOverrides]    = useState({})
  const [notes,        setNotes]        = useState({})
  const [showEmail,    setShowEmail]    = useState(false)
  const [darkMode,     setDarkMode]     = useState(false)
  const [activePage,   setActivePage]   = useState('batch')
  const role = useRole()
  const [hitMargin,      setHitMargin]      = useState(() => parseFloat(localStorage.getItem('openbank_hitMargin'))  || 5)
  const [closeRatio,     setCloseRatio]     = useState(() => parseFloat(localStorage.getItem('openbank_closeRatio')) || 2.4)
  const [batchDirection, setBatchDirection] = useState('bullish')

  // Watchlist — per-user starred tickers stored in Supabase
  const { watchlist, toggle: toggleWatchlist } = useWatchlist()

  // Alerts — price notifications for watchlisted tickers
  const { alertConfig, saveConfig: saveAlertConfig, checkAlerts } = useAlerts()

  // Weekly prices — loaded once on mount, shared between AllStocks and Watchlist
  const [weeklyPrices, setWeeklyPrices] = useState({})
  useEffect(() => {
    loadAllWeeklyPrices().then(data => setWeeklyPrices(data))
  }, [])

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

  // Auto-load the most recent batch on first mount
  // instead of showing DEFAULT_STOCKS example data
  useEffect(() => {
    if (!history?.batches?.length) return
    // Only auto-load if still showing default stocks (no batch loaded yet)
    if (loadedBatchId) return
    // Load the first batch (sorted by savedAt desc — most recent first)
    const first = history.batches[0]
    if (first) handleLoadBatch(first)
  }, [history])

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

  /**
   * handleImport — called by ImportPage when a CSV is successfully parsed.
   * Resets all batch-dependent state and navigates to the Batch Overview page.
   * Also computes the batchId from the base date for PriceChart data loading.
   * direction: 'bullish' | 'bearish' — selected in ImportPage before import.
   */
  const handleImport = useCallback((newStocks, direction = 'bullish') => {
    setStocks(newStocks)
    setBatchDirection(direction)
    setLoadedBatchDate(null)
    // Compute batchId from base date of first stock — enables PriceChart
    // when batch was previously saved and data exists in weekly_prices
    const firstBase = newStocks[0]?.base
    if (firstBase) {
      const d  = String(firstBase.getDate()).padStart(2, '0')
      const m  = String(firstBase.getMonth() + 1).padStart(2, '0')
      const y  = firstBase.getFullYear()
      setLoadedBatchId(`${y}-${m}-${d}`)
    } else {
      setLoadedBatchId(null)
    }
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

  /**
   * handleLoadBatch — called by AccuracyChart when user clicks "Load" on a batch.
   * Restores all batch state (stocks, prices, fundamentals, market data, notes)
   * from the saved batch object — avoids any API calls.
   */
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
    setBatchDirection(batch.direction ?? 'bullish') // restore direction — default bullish for old batches
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
    // Auto-fetch current prices for the loaded batch — no user action required.
    // Uses a small setTimeout to let React commit the newStocks state first,
    // so fetchCurrentBatch sees the updated tickers list.
    // The manual "Fetch prices" button remains available for forced refresh.
    setTimeout(() => fetchCurrentBatch(newStocks), 100)
  }, [resetPrices, restoreHistPrices, restoreMarketData, resetMarketData, restoreFundamentals, resetFundamentals, fetchCurrentBatch])

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
      <Sidebar
        active={activePage}
        onNav={setActivePage}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(v => !v)}
        onManageUsers={() => setActivePage('manage-users')}
      />

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
              onFetch={async () => {
                await fetchCurrentBatch(stocks)
                // Check alerts after prices are updated
                // Small delay to let autoPrices state settle
                setTimeout(() => checkAlerts(autoPrices, watchlist, history?.batches ?? [], hitMargin), 500)
              }}
              fundLog={fundLog}
              fundLoading={fundLoading}
              onFetchFundamentals={() => fetchFundamentals(stocks)}
              onRefreshFundamentals={() => fetchFundamentals(stocks, true)}
              marketLog={marketLog}
              marketLoading={marketLoading}
              stocks={stocks}
              onFetchMarket={() => fetchMarketData({
                stocks, fundamentals,
                baseDate: stocks.find(s => s.base)?.base,
                existingMarketData: marketData,
              })}
              onRefreshMarket={() => {
                const prevMarketData = marketData
                resetMarketData()
                fetchMarketData({
                  stocks, fundamentals,
                  baseDate: stocks.find(s => s.base)?.base,
                  existingMarketData: prevMarketData,
                  forceRefresh: true,
                })
              }}
              batches={history?.batches ?? []}
              loadedBatchDate={loadedBatchDate}
              onLoadBatch={handleLoadBatch}
              saving={histSaving}
              onSave={async () => {
                const ok = await saveBatch({ stocks, autoPrices, histPrices, overrides, horizonExpired, horizon, notes, marketData, fundamentals, direction: batchDirection })
                // Reload history so AccuracyChart shows correct direction badge immediately
                if (ok) loadHistory()
              }}
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
              closeRatio={closeRatio}
              direction={batchDirection}
            />
          )}

          {/* ── BATCH OVERVIEW DETAIL ── */}
          {activePage === 'batch-detail' && (
            <>
              {/* ── Zone controls bar — hit margin slider + close ratio field ── */}
              {/* These are LIVE mode params — affect display only, not Supabase */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: 'var(--tw-card)', border: '1px solid var(--tw-border)',
                  borderRadius: 8, padding: '6px 14px', marginBottom: 10,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexWrap: 'wrap',
                }}
              >
                {/* Hit margin slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tw-muted-fg)', whiteSpace: 'nowrap' }}>
                    Hit margin
                  </span>
                  <input
                    type="range"
                    min={0.5} max={20} step={0.5}
                    value={hitMargin}
                    onChange={e => setHitMargin(parseFloat(e.target.value))}
                    style={{ width: 96, accentColor: '#4f46e5', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', minWidth: 32 }}>
                    ±{hitMargin}%
                  </span>
                </div>

                {/* Divider */}
                <div style={{ width: 1, height: 18, background: 'var(--tw-border)' }} />

                {/* Close ratio field */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tw-muted-fg)', whiteSpace: 'nowrap' }}>
                    Close ratio
                  </span>
                  <input
                    type="number"
                    min={1} max={5} step={0.1}
                    value={closeRatio}
                    onChange={e => setCloseRatio(parseFloat(e.target.value) || 2.4)}
                    style={{
                      width: 40, padding: '2px 4px',
                      border: '1px solid var(--tw-border)', borderRadius: 5,
                      fontSize: 11, fontWeight: 600,
                      color: '#374151', background: '#f9fafb',
                      textAlign: 'center', outline: 'none',
                    }}
                  />
                </div>

                {/* Divider */}
                <div style={{ width: 1, height: 18, background: 'var(--tw-border)' }} />

                {/* Zone pills — dynamic labels */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { label: `🔵 Exceeded ≥+${hitMargin}%`,                                            bg: '#eff6ff', color: '#1d4ed8' },
                    { label: `🟢 Hit ±${hitMargin}%`,                                                  bg: '#f0fdf4', color: '#15803d' },
                    { label: `🟡 Close −${hitMargin}% → −${+(hitMargin * closeRatio).toFixed(1)}%`,   bg: '#fefce8', color: '#a16207' },
                    { label: `🔴 Miss <−${+(hitMargin * closeRatio).toFixed(1)}%`,                    bg: '#fef2f2', color: '#b91c1c' },
                  ].map(pill => (
                    <span key={pill.label} style={{
                      fontSize: 9.5, fontWeight: 600, padding: '2px 7px',
                      borderRadius: 20, background: pill.bg, color: pill.color,
                      whiteSpace: 'nowrap',
                    }}>
                      {pill.label}
                    </span>
                  ))}
                </div>
              </div>
              <SummaryCards
                stocks={stocks}
                horizon={horizon}
                autoPrices={autoPrices}
                histPrices={histPrices}
                overrides={overrides}
                horizonExpired={horizonExpired}
                hitMargin={hitMargin}
                closeRatio={closeRatio}
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
                closeRatio={closeRatio}
                batchId={loadedBatchId}
                watchlist={watchlist}
                onToggleWatchlist={toggleWatchlist}
                batchDirection={batchDirection}
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
              loading={histLoading}
              saving={histSaving}
              log={histLog}
              configured={histConfigured}
              onLoad={loadHistory}
              onLoadBatch={handleLoadBatch}
              onDeleteBatch={deleteBatch}
            />
          )}

          {/* ── ALL STOCKS ── */}
          {activePage === 'all-stocks' && (
            <AllStocksPage
              batches={history?.batches ?? []}
              fundamentals={fundamentals}
              autoPrices={autoPrices}
              weeklyPrices={weeklyPrices}
              onNav={setActivePage}
              onLoadBatch={handleLoadBatch}
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
            />
          )}

          {/* ── WATCHLIST ── */}
          {activePage === 'watchlist' && (
            <WatchlistPage
              batches={history?.batches ?? []}
              weeklyPrices={weeklyPrices}
              fundamentals={fundamentals}
              autoPrices={autoPrices}
              watchlist={watchlist}
              onToggle={toggleWatchlist}
              onNav={setActivePage}
              onLoadBatch={handleLoadBatch}
              onCheckAlerts={() => checkAlerts(autoPrices, watchlist, history?.batches ?? [], hitMargin)}
            />
          )}

          {/* ── EXPORT ── */}
          {activePage === 'export' && (
            <ExportPage
              batches={history?.batches ?? []}
              loadedBatchId={loadedBatchId}
              fundamentals={fundamentals}
            />
          )}

          {/* ── IMPORT CSV ── */}
          {activePage === 'import' && role === 'admin' && (
            <ImportPage onImport={handleImport} />
          )}

          {/* ── SETTINGS ── */}
          {activePage === 'manage-users' && role === 'admin' && (
            <ManageUsers />
          )}

          {/* ── SETTINGS ── */}
          {activePage === 'settings' && (
            <SettingsPage
              hitMargin={hitMargin}
              closeRatio={closeRatio}
              onHitMarginChange={setHitMargin}
              onCloseRatioChange={setCloseRatio}
              alertConfig={alertConfig}
              onSaveAlertConfig={saveAlertConfig}
            />
          )}

          {/* ── HELP & ABOUT ── */}
          {activePage === 'help' && (
            <HelpPage />
          )}

        </div>
      </main>
    </div>
  )
}
