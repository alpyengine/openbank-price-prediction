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
import { useState, useCallback, useMemo, useRef, useEffect, Fragment } from 'react'
import { TrendingUp, TrendingDown, Download, ChevronDown, ChevronUp, Info, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { loadAllWeeklyPrices, loadFundamentalsCache } from '@/services/storage'
import TradingViewModal from './TradingViewModal.jsx'
import AllStocksExpandCard from './AllStocksExpandCard.jsx'

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
        hist:      buildHist(rows),
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

// ── Expand instances (#8) — all batch instances per ticker, newest→oldest ──────
// Same per-ticker/per-batch objects as deduplicateStocks, but instead of keeping
// only the most recent we keep EVERY instance, grouped by normalised ticker.
function expandStockInstances(batches) {
  if (!batches?.length) return {}
  const sorted = [...batches].sort((a, b) => {
    const [da, ma, ya] = (a.date || '').split('/').map(Number)
    const [db, mb, yb] = (b.date || '').split('/').map(Number)
    return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db)
  })
  const out = {}  // normTicker → [instances] (built oldest→newest, reversed at the end)
  for (const batch of sorted) {
    if (!batch.results) continue
    const byTicker = new Map()
    for (const r of batch.results) {
      const rawTicker  = r.ticker || r.t || ''
      const normTicker = rawTicker.replace(/\.US$/i, '')
      if (!normTicker) continue
      if (!byTicker.has(normTicker)) byTicker.set(normTicker, { raw: rawTicker, rows: [] })
      byTicker.get(normTicker).rows.push(r)
    }
    for (const [normTicker, { raw, rows }] of byTicker) {
      const getTarget = h => {
        const row = rows.find(r => (r.horizon || '').toUpperCase() === h)
        return row?.targetPrice || 0
      }
      const r0   = rows[0]
      const base = r0?.basePrice || r0?.b || 0
      const t1 = getTarget('1M'), t3 = getTarget('3M'), t6 = getTarget('6M'), t12 = getTarget('12M')
      const inst = {
        t: raw, tNorm: normTicker, tDisplay: displayTicker(raw), market: getMarket(raw),
        co: r0?.company || r0?.co || normTicker, b: base,
        t1, t3, t6, t12, base: r0?.base || null,
        batchId: batch.id, batchDate: batch.date,
        hist: buildHist(rows),
        u1:  base > 0 && t1  > 0 ? ((t1  - base) / base * 100) : null,
        u3:  base > 0 && t3  > 0 ? ((t3  - base) / base * 100) : null,
        u6:  base > 0 && t6  > 0 ? ((t6  - base) / base * 100) : null,
        u12: base > 0 && t12 > 0 ? ((t12 - base) / base * 100) : null,
      }
      if (!out[normTicker]) out[normTicker] = []
      out[normTicker].push(inst)
    }
  }
  for (const k of Object.keys(out)) out[k].reverse()  // newest → oldest
  return out
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// v7.13.3 — build a per-horizon settled-price map from a batch's result rows.
// { "1M": { price: <priceOnDate>, date: <targetDate> }, ... } — only rows that
// already have a settled close (priceOnDate != null). Awaiting horizons omitted.
function buildHist(rows) {
  const out = {}
  for (const r of rows || []) {
    const h = (r.horizon || '').toUpperCase()
    if (h && r.priceOnDate != null) {
      out[h] = { price: r.priceOnDate, date: r.targetDate ?? null }
    }
  }
  return out
}

// Convert a stock's `hist` map into the histPrices shape the cards expect:
// { "TICKER_HORIZON": { price, date, isHistorical } } keyed by getEffectivePrice's histKey.
function histKeyed(s) {
  if (!s?.hist) return {}
  const out = {}
  for (const [h, v] of Object.entries(s.hist)) {
    if (v?.price != null) out[`${s.t}_${h}`] = { price: v.price, date: v.date, isHistorical: true }
  }
  return out
}

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

// ── Entry metrics (#9) ────────────────────────────────────────────────────────
// Entry Quality 0–100 — how attractive the entry is today: remaining upside (50%)
// + Score (35%) + valuation/PEG (15%). Without a Score it reweights to 75% upside
// + 25% PEG and flags noScore. remPct is the value from getUpsideHoy (already %).
function entryQuality(remPct, score, peg) {
  if (remPct == null) return null
  const upN  = Math.max(0, Math.min(1, remPct / 40))
  const pegN = (peg == null || peg <= 0) ? 0 : Math.max(0, Math.min(1, (2 - peg) / 2))
  if (score == null) return { v: Math.round(100 * (0.75 * upN + 0.25 * pegN)), noScore: true }
  return { v: Math.round(100 * (0.5 * upN + 0.35 * (score / 100) + 0.15 * pegN)), noScore: false }
}
function eqClasses(v) {
  if (v >= 80) return 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
  if (v >= 60) return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
  if (v >= 40) return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}
// Recent weekly trend from the same series that feeds the sparkline (numbers, old→new).
function weeklyTrend(points) {
  if (!points || points.length < 2) return 'flat'
  const last = points[points.length - 1]
  const prev = points[points.length - 2]
  if (last > prev * 1.005) return 'up'
  if (last < prev * 0.995) return 'down'
  return 'flat'
}
// Entry Momentum — timing signal from remaining upside + trend.
function entryMomentum(remPct, trend) {
  if (remPct == null) return null
  if (remPct <= 0) return 'missed'
  if (remPct < 8)  return 'late'
  return trend === 'up' ? 'strong' : 'building'
}
const MOM_META = {
  strong:   { label: 'Strong',   rank: 4, cls: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300', dot: 'bg-green-600 dark:bg-green-400' },
  building: { label: 'Building', rank: 3, cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',     dot: 'bg-blue-600 dark:bg-blue-400' },
  late:     { label: 'Late',     rank: 2, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', dot: 'bg-amber-500' },
  missed:   { label: 'Missed',   rank: 1, cls: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',         dot: 'bg-red-600 dark:bg-red-400' },
}
const TREND_ARROW = { up: '↗', down: '↘', flat: '→' }

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

// ── Ticker / company search (#6) ──────────────────────────────────────────────

/**
 * StockSearch — search box with live filtering + a suggestions dropdown.
 * Matches by display ticker, raw ticker or company name. Picking a suggestion
 * (click / Enter) calls onPick; typing calls onChange (filters the table).
 * Keyboard: ↑/↓ navigate, Enter selects, Esc closes. ✕ clears the text only.
 */
function StockSearch({ stocks, value, onChange, onPick }) {
  const [open, setOpen]     = useState(false)
  const [active, setActive] = useState(-1)
  const ref                 = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const term = value.trim().toLowerCase()
  const suggestions = useMemo(() => {
    if (!term) return []
    return stocks
      .filter(s =>
        s.tDisplay.toLowerCase().includes(term) ||
        s.t.toLowerCase().includes(term) ||
        (s.co || '').toLowerCase().includes(term))
      .slice(0, 6)
  }, [stocks, term])

  // highlight the matched substring (no regex — index-based)
  const hl = (text, t) => {
    if (!t) return text
    const i = text.toLowerCase().indexOf(t)
    if (i < 0) return text
    return (
      <>{text.slice(0, i)}<span className="bg-amber-200 dark:bg-amber-500/40 rounded-sm">{text.slice(i, i + t.length)}</span>{text.slice(i + t.length)}</>
    )
  }

  function choose(s) { if (s) { onPick(s); setOpen(false); setActive(-1) } }

  function onKey(e) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown')      { e.preventDefault(); setActive(a => Math.min(a + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter')     { e.preventDefault(); choose(suggestions[active >= 0 ? active : 0]) }
    else if (e.key === 'Escape')    { setOpen(false) }
  }

  return (
    <div className="relative" ref={ref} style={{ width: '230px' }}>
      <div className="flex items-center gap-1.5 bg-card border border-border rounded-md px-2 py-1 focus-within:border-primary">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted-foreground shrink-0">
          <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); setActive(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search ticker or company…"
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-[11.5px] text-foreground placeholder:text-muted-foreground"
          style={{ fontFamily: 'inherit' }}
          autoComplete="off"
        />
        {value && (
          <button
            onClick={() => { onChange(''); setActive(-1) }}
            className="text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer text-[12px] leading-none p-0 shrink-0"
            aria-label="Clear search"
          >✕</button>
        )}
      </div>

      {open && term && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {suggestions.length === 0 ? (
            <div className="px-3 py-2.5 text-[11px] text-muted-foreground text-center">No matches</div>
          ) : (
            suggestions.map((s, i) => (
              <button
                key={s.t}
                onClick={() => choose(s)}
                onMouseMove={() => setActive(i)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-1.5 text-left bg-transparent border-none cursor-pointer border-b border-border last:border-0',
                  i === active ? 'bg-primary/10' : 'hover:bg-muted/50'
                )}
                style={{ fontFamily: 'inherit' }}
              >
                <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center text-[8px] font-black shrink-0">{s.tDisplay.slice(0, 3)}</span>
                <span className="min-w-0">
                  <span className="block text-[11.5px] font-bold text-foreground leading-tight">{hl(s.tDisplay, term)}</span>
                  <span className="block text-[10px] text-muted-foreground leading-tight truncate">{hl(s.co || '', term)}</span>
                </span>
                <span className={cn('ml-auto text-[9px] font-semibold px-1 py-0.5 rounded shrink-0',
                  s.market === 'US' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700')}>{s.market}</span>
              </button>
            ))
          )}
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

export default function AllStocksPage({ batches, fundamentals, autoPrices = {}, weeklyPrices: weeklyPricesProps = {}, onNav, onLoadBatch, onScrollToTicker, watchlist = new Set(), onToggleWatchlist }) {
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
  // #7 Top Picks sector filter (v7.11.2) — '' = all sectors
  const [topPicksSec, setTopPicksSec] = useState('')
  // bestOnly — when true, filters table to upside > 0 (+ score >= 60 if available)
  const [bestOnly, setBestOnly] = useState(false)
  // #6 ticker/company search (v7.11.1) — filters the table live; respects other filters + sort.
  const [searchQuery, setSearchQuery] = useState('')
  const [highlight,   setHighlight]   = useState(null)  // tNorm to flash after picking a suggestion
  // v7.13.1 — inline expandable card per row (key = instKey)
  const [expandedRows, setExpandedRows] = useState(() => new Set())
  const toggleExpand = useCallback((key) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }, [])
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

  // #8 — all batch instances per ticker (newest→oldest), enriched like `stocks`.
  // Used by the table to expand each ticker into one row per batch.
  const instancesByTicker = useMemo(() => {
    const raw = expandStockInstances(batches)
    const out = {}
    for (const tNorm of Object.keys(raw)) {
      out[tNorm] = raw[tNorm].map((s, i) => {
        const f = allFundamentals[s.t] || allFundamentals[s.tNorm]
        return {
          ...s,
          sector:    f?.sector       || '—',
          peg:       f?.pegTTM       ?? null,
          margin:    f?.netMarginTTM ?? null,
          epsGrowth: f?.epsGrowthTTM ?? null,
          score:     calcScore(s.u12, f),
          instKey:   s.tNorm + '__' + s.batchId,
          isLatest:  i === 0,
        }
      })
    }
    return out
  }, [batches, allFundamentals])

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
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      if (!s.tDisplay.toLowerCase().includes(q) &&
          !s.t.toLowerCase().includes(q) &&
          !(s.co || '').toLowerCase().includes(q)) return false
    }
    return true
  }), [stocks, filterSec, filterMkt, filterPeg, minScore, searchQuery])

  // #6 — scroll to + flash the row when a suggestion is picked, then clear the flash.
  useEffect(() => {
    if (!highlight) return
    const el = typeof document !== 'undefined' ? document.getElementById('asrow-' + highlight) : null
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = setTimeout(() => setHighlight(null), 1500)
    return () => clearTimeout(t)
  }, [highlight])

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
      .filter(s => !topPicksSec || s.sector === topPicksSec)
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
  }, [stocks, horizon, topPicksCriteria, topPicksSec, getUpsideHoy])

  // getRefPrice — reference price for a stock, using the best available source.
  // Cascade: latest weekly close (Supabase, updated Saturdays)
  //          → autoPrices (live fetch from Twelve Data / AV)
  //          → basePrice (batch snapshot — least accurate for old batches)
  // Used by: topPicks upsideHoy, Left to target column, bestOnly filter.
  // Sort — supports ticker (alphabetical), upside, score, vsTarget (numeric)
  // Sort — all columns, asc/desc. sortDir: 1 = ascending, -1 = descending.
  // Missing values (null / NaN / '—') always sort to the bottom, in both directions.
  const sorted = useMemo(() => {
    const numCmp = (x, y) => {
      const ax = x == null || Number.isNaN(x)
      const ay = y == null || Number.isNaN(y)
      if (ax && ay) return 0
      if (ax) return 1
      if (ay) return -1
      return sortDir * (x - y)
    }
    const strCmp = (x, y) => {
      const ax = !x || x === '—'
      const ay = !y || y === '—'
      if (ax && ay) return 0
      if (ax) return 1
      if (ay) return -1
      return sortDir * x.localeCompare(y)
    }
    const batchTime = d => {
      if (!d) return null
      const [dd, mm, yy] = d.split('/').map(Number)
      return new Date(yy, mm - 1, dd).getTime()
    }
    const tKey = { '1M': 't1', '3M': 't3', '6M': 't6', '12M': 't12' }[horizon] ?? 't12'
    return [...filteredFinal].sort((a, b) => {
      switch (sortCol) {
        case 'ticker':   return sortDir * a.t.localeCompare(b.t)
        case 'market':   return strCmp(a.market, b.market)
        case 'sector':   return strCmp(a.sector, b.sector)
        case 'upside':   return numCmp(a[hKey], b[hKey])
        case 'vsTarget': return numCmp(getUpsideHoy(a, tKey), getUpsideHoy(b, tKey))
        case 'score':    return numCmp(a.score, b.score)
        case 'peg':      return numCmp(a.peg, b.peg)
        case 'margin':   return numCmp(a.margin, b.margin)
        case 'batch':    return numCmp(batchTime(a.batchDate), batchTime(b.batchDate))
        case 'equality': {
          const ea = entryQuality(getUpsideHoy(a, tKey), a.score, a.peg)
          const eb = entryQuality(getUpsideHoy(b, tKey), b.score, b.peg)
          return numCmp(ea ? ea.v : null, eb ? eb.v : null)
        }
        case 'entryMom': {
          const ma = entryMomentum(getUpsideHoy(a, tKey), weeklyTrend(weeklyPrices[a.tNorm]?.[a.batchId]))
          const mb = entryMomentum(getUpsideHoy(b, tKey), weeklyTrend(weeklyPrices[b.tNorm]?.[b.batchId]))
          return numCmp(ma ? MOM_META[ma].rank : null, mb ? MOM_META[mb].rank : null)
        }
        default:         return sortDir * a.t.localeCompare(b.t)
      }
    })
  }, [filteredFinal, sortCol, sortDir, hKey, horizon, getUpsideHoy, weeklyPrices])

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
            {batches?.length ?? 0} batches · {baseStocks.length} unique tickers · one row per batch (newest first); collapses to latest on search / Best only
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
      {baseStocks.length > 0 && (
        <div>
          {/* Header row: label + sector filter + criteria toggle */}
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                Top picks
              </span>
              <span className="text-[10px] text-muted-foreground">
                · {horizon} horizon · {topPicksSec || 'all sectors'} · sorted by {topPicksCriteria === 'upside' ? 'upside' : 'score'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* #7 sector filter for Top Picks */}
              <select
                value={topPicksSec}
                onChange={e => setTopPicksSec(e.target.value)}
                className="px-2 py-1 rounded-md border border-border bg-card text-[11px] text-foreground"
              >
                <option value="">All sectors</option>
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
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
          </div>
          {/* Pick cards grid (or empty state when a sector has no positive-upside picks) */}
          {topPicks.length > 0 ? (
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
                    if (batch) { onLoadBatch(batch); onNav('batch-detail'); onScrollToTicker?.(s.t) }
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
          ) : (
            <div className="text-[11px] text-muted-foreground bg-card border border-border rounded-xl px-3 py-4 text-center">
              No top picks with positive upside{topPicksSec ? ` in ${topPicksSec}` : ''} at {horizon}.
            </div>
          )}
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Horizon selector — Watchlist-style pill (replaces the per-column dropdown) */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground">Horizon:</span>
          <div className="flex items-center gap-0.5 bg-muted rounded-full p-0.5 border border-border">
            {['1M', '3M', '6M', '12M'].map(h => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={cn(
                  'text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer bg-transparent',
                  horizon === h
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground border border-transparent'
                )}
                style={{ fontFamily: 'inherit' }}
              >{h}</button>
            ))}
          </div>
        </div>
        <div className="w-px h-3.5 bg-border" />

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

        {/* #6 ticker/company search — live filter + suggestions, before Score min */}
        <StockSearch
          stocks={stocks}
          value={searchQuery}
          onChange={setSearchQuery}
          onPick={s => { setSearchQuery(s.tDisplay); setHighlight(s.tNorm) }}
        />
        <div className="w-px h-3.5 bg-border" />

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
        <ColTooltip text="Filters to today's best opportunities: only stocks with remaining upside > 0 for the selected horizon (from today's price there's still room to the target) AND Score ≥ 60. The Score ≥ 60 condition applies only when the stock has a Score — stocks without fundamentals are never hidden by it." />
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
              <th className="px-3 py-2.5 text-left sticky top-0 z-10 bg-card">
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
                <th className="px-3 py-2.5 text-left sticky top-0 z-10 bg-card">
                  <button
                    onClick={() => toggleSort('market')}
                    className={cn('text-[10px] font-bold uppercase tracking-wide cursor-pointer bg-transparent border-none',
                      sortCol === 'market' ? 'text-primary' : 'text-muted-foreground')}
                    style={{ fontFamily: 'inherit' }}
                  >
                    Market {sortIcon('market')}
                  </button>
                </th>
              )}
              <th className="px-3 py-2.5 text-left sticky top-0 z-10 bg-card">
                <button
                    onClick={() => toggleSort('sector')}
                    className={cn('text-[10px] font-bold uppercase tracking-wide cursor-pointer bg-transparent border-none',
                      sortCol === 'sector' ? 'text-primary' : 'text-muted-foreground')}
                    style={{ fontFamily: 'inherit' }}
                  >
                    Sector {sortIcon('sector')}
                  </button>
              </th>
              <th className="px-2 py-2.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wide sticky top-0 z-10 bg-card">⭐</th>

              {/* Upside column — horizon controlled by the top selector */}
              <th className="px-3 py-2.5 text-right sticky top-0 z-10 bg-card">
                <div className="flex items-center justify-end gap-0.5">
                  <button
                    onClick={() => toggleSort('upside')}
                    className={cn('text-[10px] font-bold uppercase tracking-wide cursor-pointer bg-transparent border-none',
                      sortCol === 'upside' ? 'text-primary' : 'text-muted-foreground'
                    )}
                    style={{ fontFamily: 'inherit' }}
                  >
                    Upside <span className="text-primary">{horizon}</span> {sortIcon('upside')}
                  </button>
                  <ColTooltip text="Expected % gain forecast by Openbank, from the batch base price to the target for the selected horizon. Formula: (target − base) / base × 100.">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-foreground">Green = positive · Red = negative</span>
                    </div>
                  </ColTooltip>
                </div>
              </th>

              {/* Left to target — how much upside remains from today's price */}
              <th className="px-3 py-2.5 text-right sticky top-0 z-10 bg-card">
                <div className="flex items-center justify-end gap-0.5">
                  <button
                    onClick={() => toggleSort('vsTarget')}
                    className={cn('text-[10px] font-bold uppercase tracking-wide cursor-pointer bg-transparent border-none',
                      sortCol === 'vsTarget' ? 'text-primary' : 'text-muted-foreground'
                    )}
                    style={{ fontFamily: 'inherit' }}
                  >
                    Left to target <span className="text-primary">{horizon}</span> {sortIcon('vsTarget')}
                  </button>
                  <ColTooltip text="How much upside remains from today's price to the Openbank AI target. Formula: (target − refPrice) / refPrice. refPrice = latest weekly close (Sat cron) → live fetch → batch base price. Green = target still reachable. Red = price already above target.">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-foreground">Formula: (target − refPrice) / refPrice × 100</span>
                      <span className="text-[10px] text-green-700">🟢 Positive = upside remains (price still below target)</span>
                      <span className="text-[10px] text-red-600">🔴 Negative = price already above target</span>
                      <span className="text-[10px] text-muted-foreground">Price source: weekly_prices (max 7 days) → live fetch → base</span>
                    </div>
                  </ColTooltip>
                </div>
              </th>

              {/* Score column + info tooltip */}
              <th className="px-3 py-2.5 text-right sticky top-0 z-10 bg-card">
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
              <th className="px-3 py-2.5 text-right sticky top-0 z-10 bg-card">
                <div className="flex items-center justify-end gap-0.5">
                  <button
                    onClick={() => toggleSort('peg')}
                    className={cn('text-[10px] font-bold uppercase tracking-wide cursor-pointer bg-transparent border-none',
                      sortCol === 'peg' ? 'text-primary' : 'text-muted-foreground')}
                    style={{ fontFamily: 'inherit' }}
                  >
                    PEG {sortIcon('peg')}
                  </button>
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
              <th className="px-3 py-2.5 text-right sticky top-0 z-10 bg-card">
                <div className="flex items-center justify-end gap-0.5">
                  <button
                    onClick={() => toggleSort('margin')}
                    className={cn('text-[10px] font-bold uppercase tracking-wide cursor-pointer bg-transparent border-none',
                      sortCol === 'margin' ? 'text-primary' : 'text-muted-foreground')}
                    style={{ fontFamily: 'inherit' }}
                  >
                    Margin {sortIcon('margin')}
                  </button>
                  <ColTooltip text="Net profit margin TTM — % of revenue kept as profit in the last 12 months. Higher is better." />
                </div>
              </th>

              {/* Entry Quality column (#9) — replaces Sparkline */}
              <th className="px-3 py-2.5 text-center sticky top-0 z-10 bg-card">
                <div className="flex items-center justify-center gap-0.5">
                  <button
                    onClick={() => toggleSort('equality')}
                    className={cn('text-[10px] font-bold uppercase tracking-wide cursor-pointer bg-transparent border-none',
                      sortCol === 'equality' ? 'text-primary' : 'text-muted-foreground')}
                    style={{ fontFamily: 'inherit' }}
                  >
                    Entry Quality {sortIcon('equality')}
                  </button>
                  <ColTooltip text="Entry Quality 0–100: how attractive the entry is today, blending remaining upside (50%), Score (35%) and valuation/PEG (15%). Without fundamentals (no Score) it reweights to 75% upside + 25% PEG and is marked with ~. Depends on the selected horizon.">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-foreground">🟣 80+ · 🔵 60+ · 🟡 40+ · ⚫ &lt;40</span>
                    </div>
                  </ColTooltip>
                </div>
              </th>

              {/* Entry Momentum column (#9) */}
              <th className="px-3 py-2.5 text-center sticky top-0 z-10 bg-card">
                <div className="flex items-center justify-center gap-0.5">
                  <button
                    onClick={() => toggleSort('entryMom')}
                    className={cn('text-[10px] font-bold uppercase tracking-wide cursor-pointer bg-transparent border-none',
                      sortCol === 'entryMom' ? 'text-primary' : 'text-muted-foreground')}
                    style={{ fontFamily: 'inherit' }}
                  >
                    Entry Momentum {sortIcon('entryMom')}
                  </button>
                  <ColTooltip text="Entry Momentum: a timing signal combining remaining upside with the recent weekly trend. Strong = upside left and turning up; Building = upside left but not turning yet; Late = little upside remains (<8%); Missed = price already above target. ↗/↘ shows the recent weekly trend.">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-foreground">🟢 Strong · 🔵 Building · 🟡 Late · 🔴 Missed</span>
                    </div>
                  </ColTooltip>
                </div>
              </th>

              {/* Batch column + info tooltip */}
              <th className="px-3 py-2.5 text-center sticky top-0 z-10 bg-card">
                <div className="flex items-center justify-center gap-0.5">
                  <button
                    onClick={() => toggleSort('batch')}
                    className={cn('text-[10px] font-bold uppercase tracking-wide cursor-pointer bg-transparent border-none',
                      sortCol === 'batch' ? 'text-primary' : 'text-muted-foreground')}
                    style={{ fontFamily: 'inherit' }}
                  >
                    Batch {sortIcon('batch')}
                  </button>
                  <ColTooltip text="Batch date of this row. Each ticker shows one row per batch it appears in (newest first); older batches are indented under the latest." />
                </div>
              </th>

              {/* TradingView column — no header text, just icon */}
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wide sticky top-0 z-10 bg-card">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto opacity-40">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan="11" className="px-3 py-8 text-center text-muted-foreground text-[12px]">
                  No stocks match the current filters
                </td>
              </tr>
            )}
            {sorted.flatMap(latest => {
              // #8 — expand each ticker into its batch instances (newest→oldest).
              // Collapse to the most recent row when Best only or search is active.
              const insts     = instancesByTicker[latest.tNorm] || [latest]
              const collapsed = bestOnly || searchQuery.trim() !== ''
              const rowList   = collapsed ? insts.slice(0, 1) : insts
              const hasDups   = insts.length > 1
              return rowList.map((s, idx) => {
                const isLatest = idx === 0
                const isOlder  = idx > 0
                const u = s[hKey]
                const expandKey  = s.instKey || (s.tNorm + '-' + idx)
                const isExpanded = expandedRows.has(expandKey)
                return (
                  <Fragment key={expandKey}>
                  <tr
                    id={isLatest ? ('asrow-' + s.tNorm) : ('asrow-' + expandKey)}
                    onClick={() => toggleExpand(expandKey)}
                    className={cn('border-b border-border transition-colors cursor-pointer',
                      isOlder && 'bg-muted/20',
                      !collapsed && hasDups && 'border-l-2 border-l-primary/40',
                      highlight === s.tNorm && isLatest
                        ? 'bg-amber-100 dark:bg-amber-500/20'
                        : 'hover:bg-muted/30')}
                  >
                  {/* Ticker — clickable link to Batch Overview Details */}
                  <td className={cn('px-3 py-2.5', isOlder && 'pl-6')}>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-[10px] w-3 shrink-0 select-none">{isExpanded ? '▾' : '▸'}</span>
                      {isOlder ? (
                        <div className="w-7 h-7 flex items-center justify-center text-muted-foreground text-[13px] shrink-0">↳</div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black shrink-0">
                          {s.tDisplay.slice(0, 3)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          {/* Click ticker → load THIS instance's batch and navigate to batch-detail */}
                          <button
                            className={cn('hover:text-primary hover:underline underline-offset-2 bg-transparent border-none cursor-pointer p-0 text-left text-[11.5px]',
                              isOlder ? 'font-semibold text-muted-foreground' : 'font-bold text-foreground')}
                            onClick={e => {
                              e.stopPropagation()
                              if (!onLoadBatch || !onNav) return
                              const batch = (batches ?? []).find(b => b.id === s.batchId)
                              if (batch) {
                                onLoadBatch(batch)
                                onNav('batch-detail')
                                onScrollToTicker?.(s.t)
                              }
                            }}
                            title={`Open ${s.tDisplay} (${fmtDate(s.batchDate)}) in Batch Overview Details`}
                          >
                            {s.tDisplay}
                          </button>
                          {isLatest && hasDups && !collapsed && (
                            <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary">latest</span>
                          )}
                        </div>
                        {!isOlder && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="text-[10px] text-muted-foreground leading-none">{s.co}</div>
                          </div>
                        )}
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

                  {/* Entry Quality (#9) — replaces Sparkline */}
                  <td className="px-3 py-2.5 text-center">
                    {(() => {
                      const tKey = { '1M': 't1', '3M': 't3', '6M': 't6', '12M': 't12' }[horizon] ?? 't12'
                      const eq = entryQuality(getUpsideHoy(s, tKey), s.score, s.peg)
                      if (!eq) return <span className="text-[10px] text-muted-foreground">—</span>
                      return (
                        <span className={cn('inline-flex items-center justify-center min-w-[34px] px-2 py-0.5 rounded-md text-[11px] font-bold', eqClasses(eq.v))}>
                          {eq.v}{eq.noScore && <span className="text-[8px] ml-0.5 opacity-70">~</span>}
                        </span>
                      )
                    })()}
                  </td>

                  {/* Entry Momentum (#9) */}
                  <td className="px-3 py-2.5 text-center">
                    {(() => {
                      const tKey  = { '1M': 't1', '3M': 't3', '6M': 't6', '12M': 't12' }[horizon] ?? 't12'
                      const trend = weeklyTrend(weeklyPrices[s.tNorm]?.[s.batchId])
                      const mom   = entryMomentum(getUpsideHoy(s, tKey), trend)
                      if (!mom) return <span className="text-[10px] text-muted-foreground">—</span>
                      const m = MOM_META[mom]
                      return (
                        <span className="inline-flex items-center gap-1">
                          <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold', m.cls)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', m.dot)} />
                            {m.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{TREND_ARROW[trend]}</span>
                        </span>
                      )
                    })()}
                  </td>

                  {/* Batch */}
                  <td className="px-3 py-2.5 text-center text-[10px] text-muted-foreground">
                    {fmtDate(s.batchDate)}
                  </td>

                  {/* TradingView icon button */}
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={e => { e.stopPropagation(); setTvTicker({ t: s.t, co: s.co }) }}
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
                {isExpanded && (
                  <tr className="border-b border-border bg-muted/30">
                    <td colSpan={11} className="p-0">
                      <div className="px-5 py-4">
                        <AllStocksExpandCard
                          stock={s}
                          autoPrice={autoPrices?.[s.tNorm] ?? autoPrices?.[s.t] ?? getRefPrice(s)}
                          histPrices={histKeyed(s)}
                          fundamental={allFundamentals[s.t] || allFundamentals[s.tNorm]}
                          batchCurrency={s.market === 'US' ? '$' : s.market === 'L' ? '£' : '€'}
                          batchId={s.batchId}
                        />
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
                )
              })
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] text-muted-foreground text-right">
        Sorted by {({
          upside:   `Upside ${horizon}`,
          vsTarget: `Left to target ${horizon}`,
          score:    'Score',
          peg:      'PEG',
          margin:   'Margin',
          batch:    'Batch',
          equality: `Entry Quality ${horizon}`,
          entryMom: `Entry Momentum ${horizon}`,
          market:   'Market',
          sector:   'Sector',
          ticker:   'Ticker',
        }[sortCol] ?? 'Ticker')} {sortDir === -1 ? 'desc' : 'asc'} · Click column headers to re-sort
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
