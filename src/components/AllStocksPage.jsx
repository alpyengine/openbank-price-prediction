/**
 * AllStocksPage — Consolidated view of all unique tickers across all batches.
 *
 * Deduplication: one row per ticker — most recent batch wins.
 * If a ticker appears in multiple batches, shows "· Nx" in the Batch column.
 *
 * Features:
 *   - Horizon dropdown (1M / 3M / 6M / 12M) — changes upside column
 *   - Sort by Upside or Score (asc / desc)
 *   - Filters: sector, PEG range, Score minimum slider
 *   - Collapsible legend for Score and PEG color codes
 *   - Sparkline from weekly_prices (green/red)
 *   - CSV export
 *   - Investment Score badge (purple / blue / amber / grey)
 *   - PEG color (green < 1 / amber 1–2 / red > 2 / ⚠ Neg)
 *
 * @param {Array}  batches      — all saved batches from useHistory (each has .fundamentals field)
 * @param {Object} fundamentals — active-batch fundamentals from useFundamentals (merged as override)
 * @param {Object} weeklyPrices — { [ticker_batchId]: [{ week, close_price }] }
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { TrendingUp, TrendingDown, Download, ChevronDown, ChevronUp, Info, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { loadAllWeeklyPrices, loadFundamentalsCache } from '@/services/storage'
import TradingViewModal from './TradingViewModal.jsx'

// ── Market helpers ────────────────────────────────────────────────────────────

/**
 * getMarket — extracts the market suffix from a raw ticker string.
 * Returns 'DE', 'AS', 'PA', 'L', 'MC' for EU markets, 'US' for everything else.
 */
function getMarket(rawTicker) {
  const m = rawTicker.match(/\.([A-Z]+)$/i)
  if (!m) return 'US'
  const suffix = m[1].toUpperCase()
  return ['DE', 'AS', 'PA', 'L', 'MC'].includes(suffix) ? suffix : 'US'
}

/**
 * displayTicker — strips market suffix for on-screen display only.
 * NEM.DE → NEM  |  TER.US → TER  |  MU → MU
 * The full ticker (with suffix) is always retained internally for API calls.
 */
function displayTicker(rawTicker) {
  return rawTicker.replace(/\.(DE|AS|PA|L|MC|US)$/i, '')
}

// ── Investment Score calculation ──────────────────────────────────────────────

const WEIGHTS = { upside: 0.40, peg: 0.45, margin: 0.15 }

function upsideScore(upside) {
  if (upside < 0)   return 0
  if (upside < 10)  return 20
  if (upside < 20)  return 40
  if (upside < 30)  return 65
  if (upside < 50)  return 85
  return 100
}

function pegScore(peg) {
  if (peg == null || peg < 0) return 0
  if (peg <= 0.5)  return 100
  if (peg <= 1.0)  return 85
  if (peg <= 1.5)  return 60
  if (peg <= 2.0)  return 30
  return 0
}

function marginScore(margin) {
  if (margin == null || margin < 0) return 0
  if (margin < 5)   return 20
  if (margin < 15)  return 50
  if (margin < 25)  return 75
  return 100
}

function calcScore(upside12, fundamental) {
  if (!fundamental) return null
  const peg     = fundamental.pegTTM
  const margin  = fundamental.netMarginTTM
  const negEPS  = fundamental.epsGrowthTTM != null && fundamental.epsGrowthTTM < 0

  const raw = (
    WEIGHTS.upside * upsideScore(upside12) +
    WEIGHTS.peg    * pegScore(peg) +
    WEIGHTS.margin * marginScore(margin)
  ) - (negEPS ? 20 : 0)

  return Math.max(0, Math.round(raw))
}

// ── Deduplication — most recent batch wins ────────────────────────────────────

/**
 * deduplicateStocks — builds a single list of unique tickers across all batches.
 *
 * Why deduplication is needed:
 *   The same ticker (e.g. MU) can appear in multiple batches.
 *   All Stocks shows one row per ticker — the most recent batch wins.
 *
 * Why we group by ticker first:
 *   Supabase stores each horizon (1M/3M/6M/12M) as a separate row in results[].
 *   So MU in one batch = 4 rows: { ticker:"MU", horizon:"1M", targetPrice:674 },
 *   { ticker:"MU", horizon:"3M", targetPrice:844 }, etc.
 *   We must group these 4 rows to get t1/t3/t6/t12 for a single stock object.
 *
 * @param {Array} batches — all batches from useHistory (already loaded from Supabase)
 * @returns {Array} — one stock object per unique ticker, with u1/u3/u6/u12 upside %
 */
function deduplicateStocks(batches) {
  if (!batches?.length) return []

  // Step 1 — sort batches oldest→newest so newest overwrites on duplicate tickers
  const sorted = [...batches].sort((a, b) => {
    const [da, ma, ya] = (a.date || '').split('/').map(Number)
    const [db, mb, yb] = (b.date || '').split('/').map(Number)
    return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db)
  })

  // map: normTicker → stock data (newest batch wins)
  // counts: normTicker → how many batches contain this ticker
  const map    = new Map()
  const counts = new Map()

  for (const batch of sorted) {
    if (!batch.results) continue

    // Step 2 — group the 4 horizon rows per ticker within this batch
    // e.g. { "MU": { raw:"MU", rows:[{horizon:"1M",...},{horizon:"3M",...},...] } }
    const byTicker = new Map()
    for (const r of batch.results) {
      const rawTicker  = r.ticker || r.t || ''
      // Normalise: strip .US suffix (TER.US → TER), keep European suffixes (NEM.DE)
      const normTicker = rawTicker.replace(/\.US$/i, '')
      if (!normTicker) continue
      if (!byTicker.has(normTicker)) {
        byTicker.set(normTicker, { raw: rawTicker, rows: [] })
      }
      byTicker.get(normTicker).rows.push(r)
    }

    // Step 3 — build one stock object per ticker from the grouped rows
    for (const [normTicker, { raw, rows }] of byTicker) {
      // Track how many batches contain this ticker
      counts.set(normTicker, (counts.get(normTicker) || 0) + 1)

      // Most recent batch wins — overwrite any previous entry
      // (sorted oldest first so last write = newest)

      // Helper: find targetPrice for a given horizon label (1M / 3M / 6M / 12M)
      const getTarget = h => {
        const row = rows.find(r => (r.horizon || '').toUpperCase() === h)
        return row?.targetPrice || 0
      }

      const r0   = rows[0]
      const base = r0?.basePrice || r0?.b || 0

      map.set(normTicker, {
        t:         raw,              // original ticker as stored (e.g. "NEM.DE")
        tNorm:     normTicker,       // normalised ticker for lookups (e.g. "NEM.DE")
        tDisplay:  displayTicker(raw), // display ticker without suffix (e.g. "NEM")
        market:    getMarket(raw),   // market identifier: 'US' | 'DE' | 'AS' | 'PA' | 'L' | 'MC'
        co:        r0?.company || r0?.co || normTicker,
        b:         base,
        t1:        getTarget('1M'),
        t3:        getTarget('3M'),
        t6:        getTarget('6M'),
        t12:       getTarget('12M'),
        base:      r0?.base || null,
        batchId:   batch.id,
        batchDate: batch.date,
      })
    }
  }

  // Step 4 — compute upside % for each horizon and attach batchCount
  return Array.from(map.values()).map(s => ({
    ...s,
    batchCount: counts.get(s.tNorm) || 1,
    // Upside % = (target - base) / base × 100
    // null if either value is missing or zero
    u1:  s.b > 0 && s.t1  > 0 ? ((s.t1  - s.b) / s.b * 100) : null,
    u3:  s.b > 0 && s.t3  > 0 ? ((s.t3  - s.b) / s.b * 100) : null,
    u6:  s.b > 0 && s.t6  > 0 ? ((s.t6  - s.b) / s.b * 100) : null,
    u12: s.b > 0 && s.t12 > 0 ? ((s.t12 - s.b) / s.b * 100) : null,
  }))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtDate(ddmmyyyy) {
  if (!ddmmyyyy) return '—'
  const [d, m, y] = ddmmyyyy.split('/').map(Number)
  return `${d} ${MONTHS[(m||1)-1]}`
}

function fmtPct(v) {
  if (v == null) return '—'
  return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'
}

function uColor(v) {
  if (v == null) return 'text-muted-foreground'
  return v >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'
}

/**
 * SparkLine — mini line chart showing weekly price evolution.
 *
 * Colour logic (Option A from spec):
 *   green  — current price (last point) > base price (first point)
 *   red    — current price (last point) < base price (first point)
 *   grey   — no data or flat
 *
 * @param {number[]} points — array of weekly close prices (oldest → newest)
 * @param {number}   base   — base price of the batch (first buy price)
 */
function SparkLine({ points, base }) {
  // Need at least 2 points to draw a line — show dash otherwise
  if (!points?.length || points.length < 2) {
    return <span className="text-[10px] text-muted-foreground">—</span>
  }

  const last  = points[points.length - 1]
  const color = base == null ? '#6b7280'
              : last > base  ? '#16a34a'   // green — above base
              : last < base  ? '#dc2626'   // red   — below base
              : '#6b7280'                  // grey  — flat

  const mn = Math.min(...points)
  const mx = Math.max(...points)
  const rng = mx - mn || 1

  const w = 55
  const h = 22
  const coords = points
    .map((v, i) => `${(i / (points.length - 1)) * w},${h - ((v - mn) / rng) * (h - 2) - 1}`)
    .join(' ')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={coords} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function ScoreBadge({ score }) {
  if (score == null) return <span className="text-[11px] text-muted-foreground">—</span>
  if (score >= 80) return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">{score}</span>
  if (score >= 60) return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">{score}</span>
  if (score >= 40) return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">{score}</span>
  return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{score}</span>
}

function PegCell({ peg }) {
  if (peg == null) return <span className="text-muted-foreground">—</span>
  if (peg < 0)  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">⚠ Neg</span>
  if (peg < 1)  return <span className="font-bold text-green-600 dark:text-green-400">{peg.toFixed(2)}</span>
  if (peg <= 2) return <span className="font-bold text-amber-600 dark:text-amber-400">{peg.toFixed(2)}</span>
  return <span className="font-bold text-red-500">{peg.toFixed(2)}</span>
}

// ── Horizon dropdown ──────────────────────────────────────────────────────────

const HORIZONS = [
  { key: '1M',  label: '1M',  sub: '~4 weeks'  },
  { key: '3M',  label: '3M',  sub: '~13 weeks' },
  { key: '6M',  label: '6M',  sub: '~26 weeks' },
  { key: '12M', label: '12M', sub: '~52 weeks' },
]

function HorizonDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-2 py-1 rounded-md border border-primary bg-primary/10 text-primary text-[11px] font-bold cursor-pointer"
      >
        {value} <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[140px] overflow-hidden">
          <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide border-b border-border">
            Horizon
          </div>
          {HORIZONS.map(h => (
            <button
              key={h.key}
              onClick={() => { onChange(h.key); setOpen(false) }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-[12px] font-semibold cursor-pointer border-none bg-transparent hover:bg-muted',
                h.key === value ? 'text-primary bg-primary/5' : 'text-foreground'
              )}
              style={{ fontFamily: 'inherit' }}
            >
              <span>{h.label}</span>
              <span className={cn('text-[10px] font-normal', h.key === value ? 'text-primary' : 'text-muted-foreground')}>
                {h.key === value ? '✓' : h.sub}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

/**
 * ColTooltip — ℹ icon with hover tooltip for table column headers.
 * Uses position:fixed to escape the table's overflow:hidden clipping.
 * Tooltip appears below the icon, aligned to its position on screen.
 *
 * @param {string}    text     — tooltip description text
 * @param {ReactNode} children — optional extra content (badges, spark examples)
 */
function ColTooltip({ text, children }) {
  const [open, setOpen]   = useState(false)
  const [pos,  setPos]    = useState({ x: 0, y: 0 })
  const ref               = useRef(null)

  function handleMouseEnter() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      // Position tooltip below the icon, right-aligned to it
      setPos({ x: rect.right, y: rect.bottom + 6 })
    }
    setOpen(true)
  }

  return (
    <div
      className="relative inline-flex items-center"
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Small ℹ icon */}
      <svg
        width="12" height="12" viewBox="0 0 12 12" fill="none"
        className="text-muted-foreground cursor-help ml-0.5 shrink-0"
        aria-label="column info"
      >
        <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1"/>
        <text x="6" y="9" textAnchor="middle" fontSize="7" fill="currentColor" fontWeight="500">i</text>
      </svg>

      {/* Tooltip — fixed position to escape table overflow:hidden */}
      {open && (
        <div
          className="bg-card border border-border rounded-lg shadow-md p-2.5 text-left pointer-events-none"
          style={{
            position:  'fixed',
            top:       pos.y,
            left:      pos.x,
            transform: 'translateX(-100%)',
            zIndex:    9999,
            width:     '220px',
          }}
        >
          <p className="text-[11px] text-muted-foreground leading-relaxed m-0">{text}</p>
          {children && <div className="mt-2">{children}</div>}
        </div>
      )}
    </div>
  )
}

function Legend() {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-2 text-[11px] mb-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 font-semibold text-muted-foreground w-full bg-transparent border-none cursor-pointer"
        style={{ fontFamily: 'inherit' }}
      >
        <Info size={12} /> Colour legend
        <span className="ml-auto">{open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</span>
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Score (0–100)</div>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 font-bold">🟣 80–100 Very attractive</span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold">🔵 60–79 Attractive</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold">🟡 40–59 Moderate</span>
              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-bold">⚫ 0–39 Low</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1.5">= Upside×40% + PEG×45% + Margin×15% − 20 if EPS negative</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">PEG Ratio (Lynch)</div>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 font-bold">🟢 &lt;1 Undervalued</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold">🟡 1–2 Fair</span>
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold">🔴 &gt;2 Expensive</span>
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold">⚠ Neg EPS negative</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1.5">Upside: green = positive · red = negative</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCSV(rows, horizon) {
  // Map horizon label to stock field: '1M'→'u1', '3M'→'u3', '6M'→'u6', '12M'→'u12'
  const hKey = { '1M': 'u1', '3M': 'u3', '6M': 'u6', '12M': 'u12' }[horizon] ?? 'u12'
  const header = 'Ticker,Company,Sector,Upside,Score,PEG,NetMargin,EpsGrowth,Batch,Batches'
  const lines  = rows.map(r => [
    r.t, r.co, r.sector || '',
    (r[hKey] ?? '').toFixed ? r[hKey].toFixed(2) : '',
    r.score ?? '',
    r.peg   != null ? r.peg.toFixed(2) : '',
    r.margin != null ? r.margin.toFixed(2) : '',
    r.epsGrowth != null ? r.epsGrowth.toFixed(2) : '',
    r.batchDate || '',
    r.batchCount || 1,
  ].join(','))
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: `all_stocks_${horizon}.csv` })
  a.click(); URL.revokeObjectURL(url)
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AllStocksPage({ batches, fundamentals, autoPrices = {}, weeklyPrices: weeklyPricesProps = {}, onNav, onLoadBatch, watchlist = new Set(), onToggleWatchlist }) {
  const [horizon,      setHorizon]      = useState('12M')
  const [sortCol,      setSortCol]      = useState('ticker')
  const [sortDir,      setSortDir]      = useState(1)  // 1 = asc (default: A→Z by ticker)
  const [filterSec,    setFilterSec]    = useState('')
  const [filterPeg,    setFilterPeg]    = useState('')
  const [filterMkt,    setFilterMkt]    = useState('')  // '' | 'US' | 'DE' | 'AS' | 'PA' | 'L' | 'MC'
  const [minScore,     setMinScore]     = useState(0)
  const [legendOpen,   setLegendOpen]   = useState(false)
  // topPicksCriteria — 'upside' (default) | 'score'
  // 'upside': rank by upside of selected horizon (works without fundamentals)
  // 'score':  rank by Investment Score (requires Refresh Fundamentals)
  const [topPicksCriteria, setTopPicksCriteria] = useState('upside')
  // bestOnly — when true, filters table to upside > 0 (+ score >= 60 if available)
  const [bestOnly, setBestOnly] = useState(false)
  // weeklyPrices passed from App.jsx (loaded once, shared with WatchlistPage)
  const weeklyPrices = weeklyPricesProps
  // tvTicker — ticker currently open in TradingView modal (null = closed)
  const [tvTicker,       setTvTicker]       = useState(null)
  const [cachedFundamentals, setCachedFundamentals] = useState({})

  // Load fundamentals cache on mount — weeklyPrices now comes from App.jsx prop
  useEffect(() => {
    loadFundamentalsCache().then(data => setCachedFundamentals(data))
  }, [])

  // Deduplicate stocks from all batches
  const baseStocks = useMemo(() => deduplicateStocks(batches), [batches])

  // Merge fundamentals from three sources — priority order (last wins):
  //   1. fundamentals_cache table (primary — ticker-level, TTL 7 days)
  //   2. batch.fundamentals from all saved batches (fallback)
  //   3. active-batch fundamentals from memory (most recent override)
  const allFundamentals = useMemo(() => {
    const merged = {}

    // Layer 1 — fundamentals_cache (loaded from Supabase on mount)
    Object.assign(merged, cachedFundamentals)

    // Layer 2 — batch fundamentals (fallback for tickers not in cache yet)
    // Sort oldest first so newest batch overwrites
    const sortedBatches = [...(batches ?? [])].sort((a, b) => {
      const [da, ma, ya] = (a.date || '').split('/').map(Number)
      const [db, mb, yb] = (b.date || '').split('/').map(Number)
      return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db)
    })
    for (const batch of sortedBatches) {
      if (batch.fundamentals && typeof batch.fundamentals === 'object') {
        Object.assign(merged, batch.fundamentals)
      }
    }

    // Layer 3 — active-batch in-memory fundamentals (most recent override)
    if (fundamentals && typeof fundamentals === 'object') {
      Object.assign(merged, fundamentals)
    }

    return merged
  }, [cachedFundamentals, batches, fundamentals])

  // Merge fundamentals + score
  const stocks = useMemo(() => baseStocks.map(s => {
    const f = allFundamentals[s.t] || allFundamentals[s.tNorm]
    const score = calcScore(s.u12, f)
    return {
      ...s,
      sector:    f?.sector        || '—',
      peg:       f?.pegTTM        ?? null,
      margin:    f?.netMarginTTM  ?? null,
      epsGrowth: f?.epsGrowthTTM  ?? null,
      score,
    }
  }), [baseStocks, allFundamentals])

  // Unique sectors for filter dropdown
  const sectors = useMemo(() => {
    const s = new Set(stocks.map(x => x.sector).filter(x => x && x !== '—'))
    return Array.from(s).sort()
  }, [stocks])

  // Unique markets for filter badges — with counts
  const markets = useMemo(() => {
    const counts = {}
    stocks.forEach(s => { counts[s.market] = (counts[s.market] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [stocks])

  // Map horizon label to stock field: '1M'→'u1', '3M'→'u3', '6M'→'u6', '12M'→'u12'
  const hKey = { '1M': 'u1', '3M': 'u3', '6M': 'u6', '12M': 'u12' }[horizon] ?? 'u12'

  // Apply all filters: sector, PEG, market, score
  const filtered = useMemo(() => stocks.filter(s => {
    if (filterSec && s.sector !== filterSec) return false
    if (filterMkt && s.market !== filterMkt) return false
    if (filterPeg === 'low'  && !(s.peg != null && s.peg > 0 && s.peg < 1))  return false
    if (filterPeg === 'mid'  && !(s.peg != null && s.peg >= 1 && s.peg <= 2)) return false
    if (filterPeg === 'high' && !(s.peg != null && s.peg > 2))                return false
    if (minScore > 0 && (s.score == null || s.score < minScore)) return false
    return true
  }), [stocks, filterSec, filterMkt, filterPeg, minScore])

  // Apply bestOnly filter on top of existing filters.
  // Uses upsideHoy (today's price → target) not upsideBase (batch price → target)
  // so the filter reflects actual current opportunity, not stale batch data.
  // Score >= 60 only when fundamentals loaded — never hides tickers without score.
  const filteredFinal = useMemo(() => {
    if (!bestOnly) return filtered
    const tKey = { '1M': 't1', '3M': 't3', '6M': 't6', '12M': 't12' }[horizon] ?? 't6'
    return filtered.filter(s => {
      const uHoy = getUpsideHoy(s, tKey)
      if (uHoy == null || uHoy <= 0) return false
      if (s.score != null && s.score < 60) return false
      return true
    })
  }, [filtered, bestOnly, horizon, getUpsideHoy])

  // Top 5 picks — always computed from ALL stocks (ignores active filters).
  // Uses upsideHoy = (target - refPrice) / refPrice where refPrice is:
  //   latest weekly close → autoPrices → basePrice (cascade).
  // This reflects real opportunity from today's price, not the stale batch price.
  // Criterion: 'upside' sorts by upsideHoy desc.
  //            'score'  sorts by Investment Score desc (needs fundamentals).
  // Ties broken by upsideHoy. Stocks with upsideHoy <= 0 are excluded.
  const topPicks = useMemo(() => {
    const tKey = { '1M': 't1', '3M': 't3', '6M': 't6', '12M': 't12' }[horizon] ?? 't6'
    const candidates = stocks
      .map(s => ({ s, uHoy: getUpsideHoy(s, tKey) }))
      .filter(({ uHoy }) => uHoy != null && uHoy > 0)
    if (topPicksCriteria === 'score') {
      return candidates
        .filter(({ s }) => s.score != null)
        .sort((a, b) => (b.s.score - a.s.score) || (b.uHoy - a.uHoy))
        .slice(0, 5)
        .map(({ s, uHoy }) => ({ ...s, uHoy }))
    }
    // default: upsideHoy
    return candidates
      .sort((a, b) => b.uHoy - a.uHoy)
      .slice(0, 5)
      .map(({ s, uHoy }) => ({ ...s, uHoy }))
  }, [stocks, horizon, topPicksCriteria, getUpsideHoy])

  // getRefPrice — reference price for a stock, using the best available source.
  // Cascade: latest weekly close (Supabase, updated Saturdays)
  //          → autoPrices (live fetch from Twelve Data / AV)
  //          → basePrice (batch snapshot — least accurate for old batches)
  // Used by: topPicks upsideHoy, Left to target column, bestOnly filter.
  const getRefPrice = useCallback((s) => {
    const weekly = weeklyPrices[s.tNorm]?.[s.batchId]
    if (weekly?.length) return weekly[weekly.length - 1]
    if (autoPrices[s.tNorm] != null) return autoPrices[s.tNorm]
    if (autoPrices[s.t]     != null) return autoPrices[s.t]
    return s.b  // fallback to batch base price
  }, [weeklyPrices, autoPrices])

  // upsideHoy — real upside from today's price to target.
  // upsideHoy = (target - refPrice) / refPrice × 100
  // Positive = still has room to reach target.
  // Negative = already above target (or reference price exceeds target).
  const getUpsideHoy = useCallback((s, tKey) => {
    const target = s[tKey]
    if (!target) return null
    const ref = getRefPrice(s)
    if (!ref) return null
    return (target - ref) / ref * 100
  }, [getRefPrice])

  // Sort — supports ticker (alphabetical), upside, score, vsTarget (numeric)
  const sorted = useMemo(() => [...filteredFinal].sort((a, b) => {
    if (sortCol === 'ticker') {
      return sortDir * a.t.localeCompare(b.t)
    }
    if (sortCol === 'vsTarget') {
      const tKey = { '1M': 't1', '3M': 't3', '6M': 't6', '12M': 't12' }[horizon] ?? 't12'
      const va = getUpsideHoy(a, tKey) ?? -999
      const vb = getUpsideHoy(b, tKey) ?? -999
      return sortDir * (vb - va)
    }
    const va = sortCol === 'upside' ? (a[hKey] ?? -999) : (a.score ?? -1)
    const vb = sortCol === 'upside' ? (b[hKey] ?? -999) : (b.score ?? -1)
    return sortDir * (vb - va)
  }), [filtered, sortCol, sortDir, hKey, horizon, weeklyPrices])

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d * -1)
    else { setSortCol(col); setSortDir(-1) }
  }

  function sortIcon(col) {
    if (sortCol !== col) return '↕'
    return sortDir === -1 ? '↓' : '↑'
  }

  // KPIs
  const avgUpside = sorted.length
    ? sorted.reduce((a, s) => a + (s[hKey] ?? 0), 0) / sorted.length
    : null
  const topScore  = sorted.reduce((best, s) => s.score != null && s.score > (best?.score ?? -1) ? s : best, null)

  return (
    <div className="flex flex-col gap-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-base font-bold text-foreground">All Stocks</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {batches?.length ?? 0} batches · {baseStocks.length} unique tickers · most recent batch wins on duplicates
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCSV(sorted, horizon)}>
          <Download size={13} /> Export CSV
        </Button>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Stocks',   value: baseStocks.length, sub: `across ${batches?.length ?? 0} batches`, subClass: '' },
          { label: `Avg Upside ${horizon}`, value: avgUpside != null ? fmtPct(avgUpside) : '—', sub: 'selected horizon', subClass: avgUpside != null ? (avgUpside >= 0 ? 'text-green-600' : 'text-red-500') : '' },
          { label: 'Stocks w/ Score', value: sorted.filter(s => s.score != null).length, sub: 'fundamentals loaded', subClass: '' },
          { label: 'Top Score',      value: topScore?.score ?? '—', sub: topScore?.t ?? '—', subClass: 'text-violet-600' },
        ].map((k, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">{k.label}</div>
            <div className={cn('text-xl font-bold', k.subClass || 'text-foreground')}>{k.value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Top 5 picks ────────────────────────────────────────────────────── */}
      {topPicks.length > 0 && (
        <div>
          {/* Header row: label + criteria toggle */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                Top picks
              </span>
              <span className="text-[10px] text-muted-foreground">
                · {horizon} horizon · sorted by {topPicksCriteria === 'upside' ? 'upside' : 'score'}
              </span>
            </div>
            {/* Criteria toggle — upside (default) vs score */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setTopPicksCriteria('upside')}
                className={cn(
                  'text-[10px] px-2.5 py-1 rounded-md font-medium transition-colors',
                  topPicksCriteria === 'upside'
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Upside
              </button>
              <button
                onClick={() => setTopPicksCriteria('score')}
                className={cn(
                  'text-[10px] px-2.5 py-1 rounded-md font-medium transition-colors',
                  topPicksCriteria === 'score'
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Score
              </button>
            </div>
          </div>
          {/* Pick cards grid */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${topPicks.length}, minmax(0,1fr))` }}>
            {topPicks.map((s, i) => {
              const uHoy = s.uHoy  // pre-computed in topPicks useMemo
              return (
                <div
                  key={s.t}
                  className={cn(
                    'bg-card border rounded-xl p-3 flex flex-col gap-1.5 cursor-pointer hover:bg-muted/30 transition-colors',
                    i === 0 ? 'border-violet-400 dark:border-violet-600' : 'border-border'
                  )}
                  onClick={() => {
                    if (!onLoadBatch || !onNav) return
                    const batch = [...(batches ?? [])]
                      .sort((a, b) => new Date(b.id) - new Date(a.id))
                      .find(b => b.results?.some(r => r.ticker === s.tNorm || r.ticker === s.t))
                    if (batch) { onLoadBatch(batch); onNav('batch-detail') }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-medium">#{i + 1}</span>
                    {s.score != null
                      ? <ScoreBadge score={s.score} />
                      : <span className="text-[10px] text-muted-foreground">—</span>
                    }
                  </div>
                  <div className="text-[15px] font-bold leading-none">{s.tDisplay ?? s.t}</div>
                  <div className="text-[11px] text-muted-foreground truncate leading-tight">{s.co}</div>
                  {/* uHoy = (target - refPrice) / refPrice — real upside from today */}
                  <div className={cn(
                    'text-[12px] font-semibold',
                    uHoy >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                  )}>
                    {uHoy != null ? fmtPct(uHoy) : '—'}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">{s.sector !== '—' ? s.sector : ''}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Market filter — badge buttons, shown only when >1 market detected */}
        {markets.length > 1 && (
          <div className="flex items-center gap-1.5 mr-1">
            <span className="text-[10px] text-muted-foreground font-medium">Market:</span>
            <button
              onClick={() => setFilterMkt('')}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                filterMkt === ''
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted/50'
              )}
            >
              All
              <span className="opacity-60 text-[10px]">({stocks.length})</span>
            </button>
            {markets.map(([mkt, count]) => {
              const FLAG = { US:'🇺🇸', DE:'🇩🇪', AS:'🇳🇱', PA:'🇫🇷', L:'🇬🇧', MC:'🇪🇸' }
              return (
                <button
                  key={mkt}
                  onClick={() => setFilterMkt(f => f === mkt ? '' : mkt)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                    filterMkt === mkt
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted/50'
                  )}
                >
                  {FLAG[mkt] ?? ''} {mkt}
                  <span className="opacity-60 text-[10px]">({count})</span>
                </button>
              )
            })}
            <div className="w-px h-3.5 bg-border mx-1" />
          </div>
        )}

        <select
          value={filterSec}
          onChange={e => setFilterSec(e.target.value)}
          className="px-2 py-1 rounded-md border border-border bg-card text-[11px] text-foreground"
        >
          <option value="">All Sectors</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filterPeg}
          onChange={e => setFilterPeg(e.target.value)}
          className="px-2 py-1 rounded-md border border-border bg-card text-[11px] text-foreground"
        >
          <option value="">All PEG</option>
          <option value="low">PEG &lt; 1 (undervalued)</option>
          <option value="mid">PEG 1–2 (fair)</option>
          <option value="high">PEG &gt; 2 (expensive)</option>
        </select>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          Score min:
          <input
            type="range" min="0" max="100" value={minScore}
            onChange={e => setMinScore(parseInt(e.target.value))}
            className="w-20 cursor-pointer accent-primary"
          />
          <span className="font-bold text-foreground min-w-[20px]">{minScore}</span>
        </div>

        {/* Best only toggle — upside > 0 mandatory, score >= 60 if available */}
        <div className="w-px h-3.5 bg-border" />
        <button
          onClick={() => setBestOnly(b => !b)}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
            bestOnly
              ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-400'
              : 'bg-background text-muted-foreground border-border hover:bg-muted/50'
          )}
        >
          <Zap size={11} />
          Best only
        </button>
        {bestOnly && (
          <span className="text-[10px] text-muted-foreground">
            upside &gt; 0{stocks.some(s => s.score != null) ? ' · score ≥ 60 if available' : ''}
          </span>
        )}

        <span className="ml-auto text-[11px] text-muted-foreground">
          {sorted.length} stock{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <Legend />

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-visible">
        <table className="w-full border-collapse text-[11.5px]">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-3 py-2.5 text-left">
                <button
                  onClick={() => toggleSort('ticker')}
                  className={cn('text-[10px] font-bold uppercase tracking-wide cursor-pointer bg-transparent border-none',
                    sortCol === 'ticker' ? 'text-primary' : 'text-muted-foreground'
                  )}
                  style={{ fontFamily: 'inherit' }}
                >
                  Ticker {sortIcon('ticker')}
                </button>
              </th>
              {markets.length > 1 && (
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Market</th>
              )}
              <th className="px-3 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Sector</th>
              <th className="px-2 py-2.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wide">⭐</th>

              {/* Upside column — sort button above horizon dropdown */}
              <th className="px-3 py-2.5 text-right">
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => toggleSort('upside')}
                      className={cn('text-[10px] font-bold uppercase tracking-wide cursor-pointer bg-transparent border-none',
                        sortCol === 'upside' ? 'text-primary' : 'text-muted-foreground'
                      )}
                      style={{ fontFamily: 'inherit' }}
                    >
                      Upside {sortIcon('upside')}
                    </button>
                    <ColTooltip text="Expected % gain from batch base price to Openbank AI target for the selected horizon.">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-foreground">Verde = positivo · Rojo = negativo</span>
                      </div>
                    </ColTooltip>
                  </div>
                  <HorizonDropdown value={horizon} onChange={setHorizon} />
                </div>
              </th>

              {/* Left to target — how much upside remains from today's price */}
              <th className="px-3 py-2.5 text-right">
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => toggleSort('vsTarget')}
                      className={cn('text-[10px] font-bold uppercase tracking-wide cursor-pointer bg-transparent border-none',
                        sortCol === 'vsTarget' ? 'text-primary' : 'text-muted-foreground'
                      )}
                      style={{ fontFamily: 'inherit' }}
                    >
                      Left to target {sortIcon('vsTarget')}
                    </button>
                    <ColTooltip text="How much upside remains from today's price to the Openbank AI target. Formula: (target − refPrice) / refPrice. refPrice = latest weekly close (Sat cron) → live fetch → batch base price. Green = target still reachable. Red = price already above target.">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-foreground">Formula: (lastWeeklyPrice − target) / target × 100</span>
                        <span className="text-[10px] text-blue-700">🔵 Positive = above target</span>
                        <span className="text-[10px] text-red-600">🔴 Negative = below target</span>
                        <span className="text-[10px] text-muted-foreground">Price source: weekly_prices table (max 7 days old)</span>
                      </div>
                    </ColTooltip>
                  </div>
                  {/* Empty space to align with Upside dropdown */}
                  <div className="h-[22px]" />
                </div>
              </th>

              {/* Score column + info tooltip */}
              <th className="px-3 py-2.5 text-right">
                <div className="flex items-center justify-end gap-0.5">
                  <button
                    onClick={() => toggleSort('score')}
                    className={cn('text-[10px] font-bold uppercase tracking-wide cursor-pointer bg-transparent border-none',
                      sortCol === 'score' ? 'text-primary' : 'text-muted-foreground'
                    )}
                    style={{ fontFamily: 'inherit' }}
                  >
                    Score {sortIcon('score')}
                  </button>
                  <ColTooltip text="Investment score 0–100. Combines Upside (40%), PEG (45%) and Net Margin (15%). −20 penalty if EPS is negative.">
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-bold">🟣 80+ very attractive</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">🔵 60+ attractive</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">🟡 40+ moderate</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold">⚫ &lt;40 low</span>
                    </div>
                  </ColTooltip>
                </div>
              </th>

              {/* PEG column + info tooltip */}
              <th className="px-3 py-2.5 text-right">
                <div className="flex items-center justify-end gap-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">PEG</span>
                  <ColTooltip text="Price/Earnings to Growth ratio (Peter Lynch). Measures if the stock is cheap or expensive relative to its growth rate.">
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-800 font-bold">🟢 &lt;1 undervalued</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">🟡 1–2 fair</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">🔴 &gt;2 expensive</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">⚠ Neg EPS negative</span>
                    </div>
                  </ColTooltip>
                </div>
              </th>

              {/* Margin column + info tooltip */}
              <th className="px-3 py-2.5 text-right">
                <div className="flex items-center justify-end gap-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Margin</span>
                  <ColTooltip text="Net profit margin TTM — % of revenue kept as profit in the last 12 months. Higher is better." />
                </div>
              </th>

              {/* Sparkline column + info tooltip */}
              <th className="px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Sparkline</span>
                  <ColTooltip text="Weekly price evolution since the batch date. Colour shows position vs batch base price — not the direction of the line.">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <svg width="40" height="14" viewBox="0 0 40 14"><polyline points="0,12 7,9 14,7 21,5 28,3 35,4 40,2" fill="none" stroke="#16a34a" strokeWidth="1.5"/></svg>
                        <span className="text-[10px] text-green-700 font-semibold">verde = price &gt; base</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg width="40" height="14" viewBox="0 0 40 14"><polyline points="0,2 7,4 14,6 21,8 28,10 35,11 40,12" fill="none" stroke="#dc2626" strokeWidth="1.5"/></svg>
                        <span className="text-[10px] text-red-600 font-semibold">rojo = price &lt; base</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg width="40" height="14" viewBox="0 0 40 14"><polyline points="0,12 7,9 14,7 21,6 28,5 35,4 40,3" fill="none" stroke="#dc2626" strokeWidth="1.5"/></svg>
                        <span className="text-[10px] text-muted-foreground">rojo + subiendo = recovering, still below base</span>
                      </div>
                    </div>
                  </ColTooltip>
                </div>
              </th>

              {/* Batch column + info tooltip */}
              <th className="px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Batch</span>
                  <ColTooltip text="Date of the most recent batch containing this ticker. · Nx means the ticker appears in N different batches — most recent data wins." />
                </div>
              </th>

              {/* TradingView column — no header text, just icon */}
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto opacity-40">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan="10" className="px-3 py-8 text-center text-muted-foreground text-[12px]">
                  No stocks match the current filters
                </td>
              </tr>
            )}
            {sorted.map(s => {
              const u = s[hKey]
              return (
                <tr key={s.t} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  {/* Ticker — clickable link to Batch Overview Details */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black shrink-0">
                        {s.tDisplay.slice(0, 3)}
                      </div>
                      <div>
                        {/* Click ticker → load batch and navigate to batch-detail */}
                        <button
                          className="font-bold text-foreground hover:text-primary hover:underline underline-offset-2 bg-transparent border-none cursor-pointer p-0 text-left text-[11.5px]"
                          onClick={() => {
                            if (!onLoadBatch || !onNav) return
                            const batch = [...(batches ?? [])]
                              .sort((a, b) => (b.id > a.id ? 1 : -1))
                              .find(b => b.results?.some(r => r.ticker === s.tNorm || r.ticker === s.t))
                            if (batch) {
                              onLoadBatch(batch)
                              onNav('batch-detail')
                            }
                          }}
                          title={`Open ${s.tDisplay} in Batch Overview Details`}
                        >
                          {s.tDisplay}
                        </button>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="text-[10px] text-muted-foreground leading-none">{s.co}</div>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Market badge column */}
                  {markets.length > 1 && (
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        'inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded',
                        s.market === 'US'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-blue-50 text-blue-700'
                      )}>{s.market}</span>
                    </td>
                  )}

                  {/* Sector */}
                  <td className="px-3 py-2.5 text-muted-foreground">{s.sector}</td>

                  {/* Watchlist star toggle */}
                  <td className="px-2 py-2.5 text-center">
                    <button
                      onClick={e => { e.stopPropagation(); onToggleWatchlist?.(s.tNorm) }}
                      className={cn(
                        'transition-colors',
                        watchlist.has(s.tNorm) ? 'text-red-500' : 'text-muted-foreground hover:text-red-400'
                      )}
                      aria-label={watchlist.has(s.tNorm) ? `Remove ${s.tNorm} from watchlist` : `Add ${s.tNorm} to watchlist`}
                    >
                      ★
                    </button>
                  </td>

                  {/* Upside */}
                  <td className={cn('px-3 py-2.5 text-right font-bold', uColor(u))}>
                    {fmtPct(u)}
                  </td>

                  {/* Left to target — (target − refPrice) / refPrice.
                      refPrice cascade: latest weekly close → autoPrices → basePrice.
                      Green = positive (target still reachable from today's price).
                      Red   = negative (price already exceeded target). */}
                  {(() => {
                    const tKey = { '1M': 't1', '3M': 't3', '6M': 't6', '12M': 't12' }[horizon] ?? 't12'
                    const vt   = getUpsideHoy(s, tKey)
                    return (
                      <td className={cn('px-3 py-2.5 text-right font-bold',
                        vt == null ? 'text-muted-foreground'
                        : vt >= 0  ? 'text-green-600 dark:text-green-400'
                        : 'text-red-500'
                      )}>
                        {vt != null ? `${vt >= 0 ? '+' : ''}${vt.toFixed(1)}%` : '—'}
                      </td>
                    )
                  })()}

                  {/* Score */}
                  <td className="px-3 py-2.5 text-right">
                    <ScoreBadge score={s.score} />
                  </td>

                  {/* PEG */}
                  <td className="px-3 py-2.5 text-right">
                    <PegCell peg={s.peg} />
                  </td>

                  {/* Net Margin */}
                  <td className="px-3 py-2.5 text-right text-foreground">
                    {s.margin != null ? s.margin.toFixed(1) + '%' : '—'}
                  </td>

                  {/* Sparkline — weekly price evolution from weekly_prices table.
                      Uses the most recent batchId for this ticker.
                      Colour: green if last price > base, red if below (Option A). */}
                  <td className="px-3 py-2.5 text-center">
                    <SparkLine
                      points={weeklyPrices[s.tNorm]?.[s.batchId] ?? null}
                      base={s.b}
                    />
                  </td>

                  {/* Batch */}
                  <td className="px-3 py-2.5 text-center text-[10px] text-muted-foreground">
                    {fmtDate(s.batchDate)}
                    {s.batchCount > 1 && (
                      <span className="text-primary font-bold ml-1">· {s.batchCount}×</span>
                    )}
                  </td>

                  {/* TradingView icon button */}
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => setTvTicker({ t: s.t, co: s.co })}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                      title={`Open ${s.t} chart in TradingView`}
                      aria-label="Open TradingView chart"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] text-muted-foreground text-right">
        Sorted by {sortCol === 'upside' ? `Upside ${horizon}` : sortCol === 'score' ? 'Score' : sortCol === 'vsTarget' ? `Left to target ${horizon}` : 'Ticker'} {sortDir === -1 ? 'desc' : 'asc'} · Click column headers to re-sort
      </div>

      {/* TradingView modal — opens when TV icon clicked */}
      {tvTicker && (
        <TradingViewModal
          ticker={tvTicker.t}
          company={tvTicker.co}
          onClose={() => setTvTicker(null)}
        />
      )}
    </div>
  )
}
