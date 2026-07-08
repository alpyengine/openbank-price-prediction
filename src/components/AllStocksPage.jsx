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
import { parseDate, targetDates } from '@/utils/dates.js'
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
  // v7.20.0: delegates to the shared parseBatchDate() instead of its own inline copy
  const sorted = [...batches].sort((a, b) =>
    (parseBatchDate(a.date) ?? 0) - (parseBatchDate(b.date) ?? 0)
  )

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
        direction: batch.direction ?? 'bullish',  // batch trend for the Trend filter
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
  // v7.20.0: delegates to the shared parseBatchDate() instead of its own inline copy
  const sorted = [...batches].sort((a, b) =>
    (parseBatchDate(a.date) ?? 0) - (parseBatchDate(b.date) ?? 0)
  )
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
        direction: batch.direction ?? 'bullish',  // batch trend for the Trend filter
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

/**
 * Sector Predominance date helpers (v7.21.0).
 *
 * monthYearStart/End — convert a (month 0-11, year) pair into the first/last
 * millisecond of that month, for inclusive from/to range filtering.
 *
 * Forecast/target dates themselves are computed with the real targetDates()
 * from utils/dates.js (parseDate + targetDates), NOT a locally-reimplemented
 * rule — see HORIZON_DKEY below. (v7.21.0 initially shipped with a
 * locally-implemented "calendar month arithmetic" helper here, based on the
 * pipeline's CSV/calendar-event convention — turned out the deployed app's
 * own targetDates() uses fixed day offsets instead: 1M=+30d, 3M=+91d,
 * 6M=+182d, 12M=+365d, not "+1/3/6/12 calendar months". Fixed before this
 * version shipped, once utils/dates.js was available to confirm.)
 */
function monthYearStart(month, year) {
  return new Date(year, month, 1).getTime()
}
function monthYearEnd(month, year) {
  return new Date(year, month + 1, 0, 23, 59, 59, 999).getTime()
}
const HORIZON_DKEY = { '1M': 'd1', '3M': 'd3', '6M': 'd6', '12M': 'd12' }

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

/**
 * parseBatchDate — single source of truth for parsing batch.date ('DD/MM/YYYY')
 * into a real timestamp for chronological sorting/comparison. v7.20.0: introduced
 * to replace 6 separate ad-hoc date-parsing sites in this file (deduplicateStocks,
 * expandStockInstances, the fundamentals-merge sort, and the `sorted` useMemo's
 * local batchTime — all previously correct copies of the same logic — plus 2
 * genuinely broken ones in the Top Picks / Trading Picks card click handlers,
 * which called `new Date(batch.id)` on a composite, non-date id — always
 * Invalid Date/NaN, so those two sorts never actually reordered anything.
 * Returns null (never NaN) on anything unparseable, so callers can safely fall
 * back with `?? 0` without producing NaN comparisons.
 */
function parseBatchDate(ddmmyyyy) {
  if (!ddmmyyyy) return null
  const [dd, mm, yy] = ddmmyyyy.split('/').map(Number)
  if (!dd || !mm || !yy) return null
  const t = new Date(yy, mm - 1, dd).getTime()
  return Number.isNaN(t) ? null : t
}

/**
 * compareStocks — single shared row comparator (v7.20.2). Previously this
 * switch/case lived only inside the `sorted` useMemo; extracted here so both
 * `sorted` (deduplicated, one row per ticker — feeds KPIs/Top Picks/Trading
 * Picks) and `flatRows` (every ticker×batch instance as its own row — feeds
 * the main table, replacing the old LATEST + indented-history tree) sort
 * identically without duplicating the switch a second time.
 * Missing values (null/NaN/'—') always sort to the bottom, in both directions.
 */
function compareStocks(a, b, { sortCol, sortDir, hKey, tKey, getUpsideHoy, weeklyPrices }) {
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
  switch (sortCol) {
    case 'ticker':   return sortDir * a.t.localeCompare(b.t)
    case 'market':   return strCmp(a.market, b.market)
    case 'sector':   return strCmp(a.sector, b.sector)
    case 'upside':   return numCmp(a[hKey], b[hKey])
    case 'vsTarget': return numCmp(getUpsideHoy(a, tKey), getUpsideHoy(b, tKey))
    case 'score':    return numCmp(a.score, b.score)
    case 'peg':      return numCmp(a.peg, b.peg)
    case 'margin':   return numCmp(a.margin, b.margin)
    case 'batch':    return numCmp(parseBatchDate(a.batchDate), parseBatchDate(b.batchDate))
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
    default: return sortDir * a.t.localeCompare(b.t)
  }
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
  const [filterTrend,  setFilterTrend]  = useState('')  // '' | 'bullish' | 'bearish'
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
  // Mejores trades panel (v7.18.0) — standalone trading-focused ranking, separate
  // from Top picks. Own horizon/count selectors; collapsible; help panel toggle.
  const [tradingOpen,     setTradingOpen]     = useState(true)   // expanded by default
  const [tradingHelpOpen, setTradingHelpOpen] = useState(false)  // help closed by default
  const [tradingHorizon,  setTradingHorizon]  = useState('1M')

  // ── Sector Predominance (v7.21.0) ─────────────────────────────────────────
  // Collapsed by default (same pattern as Mejores trades) — one more line
  // until opened, no extra visual weight on the page.
  const [sectorPanelOpen, setSectorPanelOpen] = useState(false)

  // Default date-range bounds: span of actual batch dates present, so the
  // filter shows something meaningful (everything) the first time it's
  // toggled on, rather than an empty or arbitrarily-narrow default.
  const batchTsList = (batches ?? [])
    .map(b => parseBatchDate(b.date))
    .filter(t => t != null)
  const minBatchDate = batchTsList.length ? new Date(Math.min(...batchTsList)) : new Date()
  const maxBatchDate = batchTsList.length ? new Date(Math.max(...batchTsList)) : new Date()

  const [batchFilterOn, setBatchFilterOn] = useState(false)
  const [batchFromM,    setBatchFromM]    = useState(() => minBatchDate.getMonth())
  const [batchFromY,    setBatchFromY]    = useState(() => minBatchDate.getFullYear())
  const [batchToM,      setBatchToM]      = useState(() => maxBatchDate.getMonth())
  const [batchToY,      setBatchToY]      = useState(() => maxBatchDate.getFullYear())

  const [forecastFilterOn, setForecastFilterOn] = useState(false)
  const [forecastHorizonSel, setForecastHorizonSel] = useState('1M')
  const [forecastFromM, setForecastFromM] = useState(() => minBatchDate.getMonth())
  const [forecastFromY, setForecastFromY] = useState(() => minBatchDate.getFullYear())
  const [forecastToM,   setForecastToM]   = useState(() => maxBatchDate.getMonth())
  const [forecastToY,   setForecastToY]   = useState(() => maxBatchDate.getFullYear())

  // Year options for the 4 dropdowns — derived from actual batch data, with a
  // 1-year pad on each side so a forecast date range slightly beyond the
  // newest batch (e.g. a 12M target) has somewhere to point to.
  const yearOptions = useMemo(() => {
    const minY = minBatchDate.getFullYear() - 1
    const maxY = maxBatchDate.getFullYear() + 2
    const ys = []
    for (let y = minY; y <= maxY; y++) ys.push(y)
    return ys
  }, [minBatchDate, maxBatchDate])
  const [tradingN,        setTradingN]        = useState(5)
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
    // v7.20.0: delegates to the shared parseBatchDate() instead of its own inline copy
    const sortedBatches = [...(batches ?? [])].sort((a, b) =>
      (parseBatchDate(a.date) ?? 0) - (parseBatchDate(b.date) ?? 0)
    )
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

  // Sector Predominance (v7.21.0) — ranked sector counts across ALL instances
  // (every ticker×batch, not deduplicated), independent of the page's own
  // Market/Trend/search/Best-only filters — this panel answers its own
  // question ("what sectors predominate in this date range") using only its
  // own 2 date filters, each optional and independent (batch date / forecast
  // date). Skipped while collapsed to avoid the extra work on every render.
  const sectorPanelData = useMemo(() => {
    if (!sectorPanelOpen) return null
    let pool = Object.values(instancesByTicker).flat()

    if (batchFilterOn) {
      const from = monthYearStart(batchFromM, batchFromY)
      const to   = monthYearEnd(batchToM, batchToY)
      pool = pool.filter(s => {
        const t = parseBatchDate(s.batchDate)
        return t != null && t >= from && t <= to
      })
    }

    if (forecastFilterOn) {
      const dKey = HORIZON_DKEY[forecastHorizonSel]
      const from = monthYearStart(forecastFromM, forecastFromY)
      const to   = monthYearEnd(forecastToM, forecastToY)
      pool = pool.filter(s => {
        // v7.21.0 fix: s.base (from raw result row r0?.base) was always null —
        // that field doesn't exist on Supabase's batches.results rows (which
        // have basePrice/targetPrice/targetDate/verdict, not a "base" date).
        // Every ticker in a batch shares the SAME base date as the batch
        // itself (one screenshot session = one date), so s.batchDate — already
        // reliably populated and used everywhere else in this file — is the
        // correct source, not s.base.
        const baseDate = parseDate(s.batchDate)
        if (!baseDate) return false
        const targetTs = targetDates(baseDate)[dKey].getTime()
        return targetTs >= from && targetTs <= to
      })
    }

    const counts = new Map()
    for (const s of pool) {
      const key = s.sector && s.sector !== '—' ? s.sector : '—'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const total = pool.length
    const ranked = [...counts.entries()]
      .map(([sector, count]) => ({
        sector,
        noSector: sector === '—',
        count,
        pct: total ? Math.round(count / total * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    return {
      ranked,
      total,
      batchesInRange:  new Set(pool.map(s => s.batchId)).size,
      tickersInRange:  new Set(pool.map(s => s.tNorm)).size,
    }
  }, [
    sectorPanelOpen, instancesByTicker,
    batchFilterOn, batchFromM, batchFromY, batchToM, batchToY,
    forecastFilterOn, forecastHorizonSel, forecastFromM, forecastFromY, forecastToM, forecastToY,
  ])

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

  // Trend counts (bullish / bearish) for the Trend filter badges
  const trendCounts = useMemo(() => {
    const counts = { bullish: 0, bearish: 0 }
    stocks.forEach(s => { counts[(s.direction === 'bearish') ? 'bearish' : 'bullish']++ })
    return counts
  }, [stocks])

  // Map horizon label to stock field: '1M'→'u1', '3M'→'u3', '6M'→'u6', '12M'→'u12'
  const hKey = { '1M': 'u1', '3M': 'u3', '6M': 'u6', '12M': 'u12' }[horizon] ?? 'u12'

  // Apply all filters: sector, PEG, market, score, search.
  // filterTrend (Trend B) is NOT applied here — it's applied per-instance in
  // the row renderer so all matching instances of a ticker are shown, not just
  // the most recent one (Option B behaviour approved in mockup).
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

  // ── Mejores trades (v7.18.0) ──────────────────────────────────────────────
  // Standalone trading-focused ranking: sorted by Entry Quality (not Upside/Score
  // like Top picks). Missed excluded (no upside left — no trade). Late kept but
  // flagged (rendered dimmed) so the user decides instead of the data hiding it.
  // Own horizon/count — independent of the table's horizon and of Top picks.
  const tradingPicks = useMemo(() => {
    const tKey = { '1M': 't1', '3M': 't3', '6M': 't6', '12M': 't12' }[tradingHorizon] ?? 't1'
    return stocks
      .map(s => {
        const rem = getUpsideHoy(s, tKey)
        const eq  = entryQuality(rem, s.score, s.peg)
        if (!eq) return null
        const trend = weeklyTrend(weeklyPrices[s.tNorm]?.[s.batchId])
        const mom   = entryMomentum(rem, trend)
        return { ...s, rem, eq, mom, trend }
      })
      .filter(s => s && s.mom !== 'missed')
      .sort((a, b) => b.eq.v - a.eq.v)
      .slice(0, tradingN)
  }, [stocks, tradingHorizon, tradingN, getUpsideHoy, weeklyPrices])

  // getRefPrice — reference price for a stock, using the best available source.
  // Cascade: latest weekly close (Supabase, updated Saturdays)
  //          → autoPrices (live fetch from Twelve Data / AV)
  //          → basePrice (batch snapshot — least accurate for old batches)
  // Used by: topPicks upsideHoy, Left to target column, bestOnly filter.
  // Sort — supports ticker (alphabetical), upside, score, vsTarget (numeric)
  // Sort — all columns, asc/desc. sortDir: 1 = ascending, -1 = descending.
  // Missing values (null / NaN / '—') always sort to the bottom, in both directions.
  const sorted = useMemo(() => {
    const tKey = { '1M': 't1', '3M': 't3', '6M': 't6', '12M': 't12' }[horizon] ?? 't12'
    return [...filteredFinal].sort((a, b) =>
      compareStocks(a, b, { sortCol, sortDir, hKey, tKey, getUpsideHoy, weeklyPrices })
    )
  }, [filteredFinal, sortCol, sortDir, hKey, horizon, getUpsideHoy, weeklyPrices])

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d * -1)
    else { setSortCol(col); setSortDir(-1) }
  }

  function sortIcon(col) {
    if (sortCol !== col) return '↕'
    return sortDir === -1 ? '↓' : '↑'
  }

  // #8/v7.20.2 — flat, fully independent row list for the main table: every
  // ticker × batch instance is its own row, sortable by ANY single column
  // (including 'ticker' and 'batch' independently) — replaces the old
  // LATEST + indented-history tree (each ticker's rows are no longer forced
  // to sit together; sorting by 'ticker' clusters them naturally via
  // alphabetical adjacency, sorting by 'batch' gives a true ungrouped
  // chronological order). Reuses compareStocks — identical sort behaviour
  // to `sorted`, just applied to every instance instead of one per ticker.
  const flatRows = useMemo(() => {
    const collapsed = bestOnly || searchQuery.trim() !== ''
    const tKey = { '1M': 't1', '3M': 't3', '6M': 't6', '12M': 't12' }[horizon] ?? 't12'
    const rows = []
    for (const latest of filteredFinal) {
      const insts   = instancesByTicker[latest.tNorm] || [latest]
      // bestOnly / active search collapse each ticker to just its newest
      // instance — same reduction the old tree applied, just without the
      // visual grouping.
      const rowList = collapsed ? insts.slice(0, 1) : insts
      const visible = filterTrend
        ? rowList.filter(s => (s.direction ?? 'bullish') === filterTrend)
        : rowList
      rows.push(...visible)
    }
    return rows.sort((a, b) =>
      compareStocks(a, b, { sortCol, sortDir, hKey, tKey, getUpsideHoy, weeklyPrices })
    )
  }, [filteredFinal, instancesByTicker, bestOnly, searchQuery, filterTrend, sortCol, sortDir, hKey, horizon, getUpsideHoy, weeklyPrices])

  // KPIs
  const avgUpside = sorted.length
    ? sorted.reduce((a, s) => a + (s[hKey] ?? 0), 0) / sorted.length
    : null
  const topScore  = sorted.reduce((best, s) => s.score != null && s.score > (best?.score ?? -1) ? s : best, null)

  // Total table rows = sum of all batch instances across all tickers (v7.14.1)
  const totalInstances = useMemo(
    () => Object.values(instancesByTicker).reduce((n, arr) => n + arr.length, 0),
    [instancesByTicker]
  )

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
          { label: 'Total Stocks',   value: baseStocks.length, sub: `${totalInstances} entries across ${batches?.length ?? 0} batches`, subClass: '' },
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
          {/* Header row: framed phrase integrating the picks sector filter +
              criteria toggle, so it reads as one statement and is clearly
              distinct from the table's sector filter below. (v7.15.5 UX) */}
          <div className="flex items-center gap-x-2 gap-y-1.5 mb-2 flex-wrap rounded-xl border border-border bg-card px-3 py-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              Top picks
            </span>
            <span className="text-[11px] text-muted-foreground">· mostrando mejores de:</span>
            {/* #7 sector filter for Top Picks */}
            <select
              value={topPicksSec}
              onChange={e => setTopPicksSec(e.target.value)}
              className="px-2 py-1 rounded-md border border-border bg-card text-[11px] text-foreground"
            >
              <option value="">todos los sectores</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-[11px] text-muted-foreground">· ordenados por</span>
            {/* Criteria toggle — upside (default) vs score, each with its own help tooltip */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              <div className="flex items-center">
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
                <ColTooltip text="Ordena por el recorrido que aún le queda al precio de hoy hasta el objetivo de Openbank (mayor % primero). Fórmula: (objetivo − precio hoy) / precio hoy. No necesita fundamentales, así que ordena todos los valores." />
              </div>
              <div className="flex items-center">
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
                <ColTooltip text="Ordena por la puntuación de inversión 0–100 (combina Upside 40%, PEG 45% y Margen Neto 15%; −20 si el BPA es negativo). Solo ordena valores que tengan Score, es decir, con fundamentales cargados." />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground ml-auto">· {horizon} horizon</span>
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
                      .sort((a, b) => (parseBatchDate(b.date) ?? 0) - (parseBatchDate(a.date) ?? 0))
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

      {/* ── Mejores trades (v7.18.0) — standalone trading panel, separate from Top picks ── */}
      {baseStocks.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div
            className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none"
            onClick={() => setTradingOpen(o => !o)}
          >
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[15px]">🎯</span>
                <h2 className="text-sm font-bold text-foreground">Mejores trades</h2>
                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">Nuevo</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Ordenado por Entry Quality · Missed excluidos · Late atenuado en gris
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={e => { e.stopPropagation(); setTradingHelpOpen(o => !o) }}
                className="w-7 h-7 rounded-md border border-border bg-muted hover:bg-muted/70 flex items-center justify-center text-muted-foreground transition-colors"
                title="Cómo funciona esta selección"
                aria-label="Cómo funciona esta selección"
              >
                <Info size={13} />
              </button>
              {tradingOpen ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
            </div>
          </div>

          {tradingOpen && (
            <>
              {tradingHelpOpen && (
                <div className="px-4 py-3.5 border-t border-border bg-muted/30 text-[11px] text-muted-foreground leading-relaxed">
                  <p className="font-semibold text-foreground mb-1.5">Cómo se eligen estos valores</p>
                  <p className="mb-2.5">
                    Responde a una pregunta concreta: de todo lo que tienes cargado, ¿cuáles son los mejores candidatos para entrar hoy,
                    en el plazo que elijas? No mira la previsión original de Openbank tal cual se hizo en su día — mira la situación de hoy:
                    cuánto recorrido le queda al precio actual hasta el objetivo, si la previsión sigue siendo de calidad, y si el momentum
                    reciente acompaña.
                  </p>
                  <ol className="space-y-1 mb-3 list-decimal list-inside">
                    <li>Se calcula el recorrido restante de cada valor hasta su objetivo, con el precio de hoy (no el precio del día de la previsión).</li>
                    <li>Los valores que ya superaron su objetivo (sin recorrido, Missed) se descartan automáticamente — ya no hay trade que hacer ahí.</li>
                    <li>El resto se ordena por Entry Quality, una puntuación 0–100 que combina recorrido restante, calidad de la previsión (Score) y valoración (PEG).</li>
                    <li>Si queda muy poco recorrido (&lt;8%) se marca como Late y se atenúa en gris — sigue visible, pero se distingue de las mejores oportunidades.</li>
                  </ol>
                  <p className="font-semibold text-foreground mb-1.5">Qué significa cada dato de la tarjeta</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                    <div><b className="text-foreground">EQ (Entry Quality):</b> 0–100, qué tan buena es la entrada hoy. Más alto = mejor combinación de recorrido + calidad + precio justo.</div>
                    <div><b className="text-foreground">Recorrido:</b> % que falta hasta el objetivo del horizonte elegido. Verde = aún hay margen. Rojo = ya lo superó.</div>
                    <div><b className="text-foreground">Score:</b> calidad de la previsión original (0–100). No cambia con el precio de hoy.</div>
                    <div><b className="text-foreground">PEG:</b> precio/beneficio ajustado por crecimiento. Por debajo de 1 = barata; por encima de 2 = cara.</div>
                    <div><b className="text-foreground">Momentum:</b> Strong = buen recorrido y tendencia al alza · Building = buen recorrido, tendencia plana · Late = poco recorrido, vigilar de cerca.</div>
                    <div><b className="text-foreground">Flecha de tendencia:</b> cómo se ha movido el precio en las últimas semanas (↗ subiendo · → estable · ↘ bajando).</div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 flex-wrap px-4 py-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Horizonte:</span>
                  <div className="flex items-center gap-0.5 bg-muted rounded-full p-0.5 border border-border">
                    {['1M', '3M', '6M', '12M'].map(h => (
                      <button
                        key={h}
                        onClick={() => setTradingHorizon(h)}
                        className={cn(
                          'text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer bg-transparent',
                          tradingHorizon === h
                            ? 'bg-card text-foreground shadow-sm border border-border'
                            : 'text-muted-foreground hover:text-foreground border border-transparent'
                        )}
                      >{h}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Mostrar:</span>
                  <div className="flex items-center gap-0.5 bg-muted rounded-full p-0.5 border border-border">
                    {[3, 5, 10].map(n => (
                      <button
                        key={n}
                        onClick={() => setTradingN(n)}
                        className={cn(
                          'text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer bg-transparent',
                          tradingN === n
                            ? 'bg-card text-foreground shadow-sm border border-border'
                            : 'text-muted-foreground hover:text-foreground border border-transparent'
                        )}
                      >{n}</button>
                    ))}
                  </div>
                </div>
              </div>

              {tradingPicks.length > 0 ? (
                <div className="grid gap-2.5 px-4 pb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
                  {tradingPicks.map((s, i) => {
                    const m    = MOM_META[s.mom]
                    const late = s.mom === 'late'
                    return (
                      <div
                        key={s.t}
                        className={cn(
                          'bg-card border rounded-xl p-3 flex flex-col gap-1.5 cursor-pointer hover:bg-muted/30 transition-colors',
                          i === 0 ? 'border-violet-400 dark:border-violet-600' : 'border-border',
                          late && 'opacity-60 border-dashed'
                        )}
                        onClick={() => {
                          if (!onLoadBatch || !onNav) return
                          const batch = [...(batches ?? [])]
                            .sort((a, b) => (parseBatchDate(b.date) ?? 0) - (parseBatchDate(a.date) ?? 0))
                            .find(b => b.results?.some(r => r.ticker === s.tNorm || r.ticker === s.t))
                          if (batch) { onLoadBatch(batch); onNav('batch-detail'); onScrollToTicker?.(s.t) }
                        }}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium">#{i + 1}</span>
                          <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold', m.cls)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', m.dot)} />
                            {m.label}
                          </span>
                        </div>
                        <div className="text-[14px] font-bold leading-none">{s.tDisplay ?? s.t}</div>
                        <div className="text-[10px] text-muted-foreground truncate leading-tight">{s.co}</div>
                        <span className={cn('inline-flex items-baseline gap-1 self-start text-[10px] font-bold px-1.5 py-0.5 rounded-md', eqClasses(s.eq.v))}>
                          EQ <span className="text-[13px]">{s.eq.v}</span>{s.eq.noScore && <span className="text-[8px] opacity-70">~</span>}
                        </span>
                        <div className="flex items-center gap-2.5 mt-1 pt-1.5 border-t border-border">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-wide">Recorrido</span>
                            <span className={cn('text-[11px] font-bold', s.rem >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>{fmtPct(s.rem)}</span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-wide">Score</span>
                            <span className="text-[11px] font-bold">{s.score ?? '—'}</span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-wide">PEG</span>
                            <span className="text-[11px] font-bold">{s.peg != null ? s.peg.toFixed(2) : '—'}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground ml-auto self-end">{TREND_ARROW[s.trend]}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground px-4 pb-4 text-center">
                  Ningún valor con recorrido a {tradingHorizon}.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Sector Predominance (v7.21.0) — collapsed by default, same card
             style as Mejores trades. 2 independent optional date filters:
             batch date range, and forecast/target date range (with its own
             horizon selector, separate from the page's main Horizon filter). ── */}
      {baseStocks.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div
            className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none"
            onClick={() => setSectorPanelOpen(o => !o)}
          >
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[15px]">🏭</span>
                <h2 className="text-sm font-bold text-foreground">Predominancia de sectores</h2>
                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">Nuevo</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Todas las acciones cargadas — filtra por fecha de batch y/o de previsión
              </p>
            </div>
            {sectorPanelOpen ? <ChevronUp size={15} className="text-muted-foreground shrink-0" /> : <ChevronDown size={15} className="text-muted-foreground shrink-0" />}
          </div>

          {sectorPanelOpen && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                {/* Filtro 1 — fecha de batch */}
                <div className="bg-muted/40 border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5 text-[12px] font-bold text-foreground">
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      Fecha de batch
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={batchFilterOn}
                        onChange={e => setBatchFilterOn(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-border rounded-full peer peer-checked:bg-primary transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-card rounded-full transition-transform peer-checked:translate-x-4" />
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                    <span className="text-[9.5px] font-bold uppercase text-muted-foreground">Desde</span>
                    <select
                      value={batchFromM}
                      disabled={!batchFilterOn}
                      onChange={e => setBatchFromM(Number(e.target.value))}
                      className="px-1.5 py-1 rounded-md border border-border bg-card text-[11px] text-foreground disabled:opacity-40"
                    >
                      {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select
                      value={batchFromY}
                      disabled={!batchFilterOn}
                      onChange={e => setBatchFromY(Number(e.target.value))}
                      className="px-1.5 py-1 rounded-md border border-border bg-card text-[11px] text-foreground disabled:opacity-40"
                    >
                      {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-[9.5px] font-bold uppercase text-muted-foreground">Hasta</span>
                    <select
                      value={batchToM}
                      disabled={!batchFilterOn}
                      onChange={e => setBatchToM(Number(e.target.value))}
                      className="px-1.5 py-1 rounded-md border border-border bg-card text-[11px] text-foreground disabled:opacity-40"
                    >
                      {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select
                      value={batchToY}
                      disabled={!batchFilterOn}
                      onChange={e => setBatchToY(Number(e.target.value))}
                      className="px-1.5 py-1 rounded-md border border-border bg-card text-[11px] text-foreground disabled:opacity-40"
                    >
                      {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                {/* Filtro 2 — fecha de previsión (con su propio selector de horizonte) */}
                <div className="bg-muted/40 border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5 text-[12px] font-bold text-foreground">
                      <span className="w-2 h-2 rounded-full bg-violet-600 shrink-0" />
                      Fecha de previsión
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={forecastFilterOn}
                        onChange={e => setForecastFilterOn(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-border rounded-full peer peer-checked:bg-primary transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-card rounded-full transition-transform peer-checked:translate-x-4" />
                    </label>
                  </div>
                  <div className="flex gap-1 mb-2">
                    {['1M', '3M', '6M', '12M'].map(h => (
                      <button
                        key={h}
                        type="button"
                        disabled={!forecastFilterOn}
                        onClick={() => setForecastHorizonSel(h)}
                        className={cn(
                          'text-[9.5px] font-bold px-2 py-0.5 rounded-full border transition-colors disabled:opacity-40',
                          forecastHorizonSel === h
                            ? 'bg-violet-100 text-violet-700 border-transparent dark:bg-violet-900/30 dark:text-violet-300'
                            : 'bg-card text-muted-foreground border-border'
                        )}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                    <span className="text-[9.5px] font-bold uppercase text-muted-foreground">Desde</span>
                    <select
                      value={forecastFromM}
                      disabled={!forecastFilterOn}
                      onChange={e => setForecastFromM(Number(e.target.value))}
                      className="px-1.5 py-1 rounded-md border border-border bg-card text-[11px] text-foreground disabled:opacity-40"
                    >
                      {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select
                      value={forecastFromY}
                      disabled={!forecastFilterOn}
                      onChange={e => setForecastFromY(Number(e.target.value))}
                      className="px-1.5 py-1 rounded-md border border-border bg-card text-[11px] text-foreground disabled:opacity-40"
                    >
                      {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-[9.5px] font-bold uppercase text-muted-foreground">Hasta</span>
                    <select
                      value={forecastToM}
                      disabled={!forecastFilterOn}
                      onChange={e => setForecastToM(Number(e.target.value))}
                      className="px-1.5 py-1 rounded-md border border-border bg-card text-[11px] text-foreground disabled:opacity-40"
                    >
                      {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select
                      value={forecastToY}
                      disabled={!forecastFilterOn}
                      onChange={e => setForecastToY(Number(e.target.value))}
                      className="px-1.5 py-1 rounded-md border border-border bg-card text-[11px] text-foreground disabled:opacity-40"
                    >
                      {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {(batchFilterOn || forecastFilterOn) && (
                <button
                  type="button"
                  onClick={() => { setBatchFilterOn(false); setForecastFilterOn(false) }}
                  className="text-[10.5px] text-muted-foreground hover:text-foreground underline underline-offset-2 mt-2"
                >
                  Limpiar filtros
                </button>
              )}

              {sectorPanelData && (
                <>
                  <div className="text-[11px] text-muted-foreground mt-3">
                    Mostrando <b className="text-foreground">{sectorPanelData.total} acciones</b> de{' '}
                    <b className="text-foreground">{sectorPanelData.batchesInRange} batches</b>
                    {' '}· <b className="text-foreground">{sectorPanelData.tickersInRange} tickers únicos</b>
                  </div>

                  <div className="h-px bg-border my-3" />

                  {sectorPanelData.total === 0 ? (
                    <div className="text-[11px] text-muted-foreground text-center py-4">
                      Ninguna acción coincide con este rango de fechas.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {sectorPanelData.ranked.map((row, i) => (
                        <div key={row.sector} className="flex items-center gap-2.5">
                          <div className="text-[9.5px] font-extrabold text-muted-foreground w-4 shrink-0">{i + 1}</div>
                          <div className={cn(
                            'text-[11.5px] font-semibold w-[150px] shrink-0 truncate',
                            row.noSector && 'italic text-muted-foreground font-normal'
                          )}>
                            {row.noSector ? 'Sin sector (fundamentals no cargados)' : row.sector}
                          </div>
                          <div className="flex-1 h-3.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-[width] duration-300', row.noSector ? 'bg-border' : 'bg-primary')}
                              style={{ width: `${row.pct}%` }}
                            />
                          </div>
                          <div className="text-[10.5px] font-bold w-16 text-right shrink-0">{row.count} stocks</div>
                          <div className="text-[10px] text-muted-foreground w-8 text-right shrink-0">{row.pct}%</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
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

        {/* Trend filter — shown only when both bullish and bearish are present */}
        {trendCounts.bullish > 0 && trendCounts.bearish > 0 && (
          <div className="flex items-center gap-1.5 mr-1">
            <span className="text-[10px] text-muted-foreground font-medium">Trend:</span>
            <button
              onClick={() => setFilterTrend('')}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                filterTrend === ''
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted/50'
              )}
            >
              All
              <span className="opacity-60 text-[10px]">({stocks.length})</span>
            </button>
            <button
              onClick={() => setFilterTrend(f => f === 'bullish' ? '' : 'bullish')}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                filterTrend === 'bullish'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted/50'
              )}
            >
              ↗ Bull
              <span className="opacity-60 text-[10px]">({trendCounts.bullish})</span>
            </button>
            <button
              onClick={() => setFilterTrend(f => f === 'bearish' ? '' : 'bearish')}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                filterTrend === 'bearish'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted/50'
              )}
            >
              ↘ Bear
              <span className="opacity-60 text-[10px]">({trendCounts.bearish})</span>
            </button>
            <div className="w-px h-3.5 bg-border mx-1" />
          </div>
        )}

        {/* Table sector filter — labelled "Tabla:" to distinguish it from the
            Top Picks sector filter (topPicksSec) above. (v7.15.5 UX) */}
        <div className="inline-flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground font-medium">Tabla:</span>
          <select
            value={filterSec}
            onChange={e => setFilterSec(e.target.value)}
            className="px-2 py-1 rounded-md border border-border bg-card text-[11px] text-foreground"
          >
            <option value="">All Sectors</option>
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

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
      {/* v7.20.5 — two-stage scroll, as intended:
          1) The page scrolls normally (KPIs, Top Picks, filters, legend scroll
             away) until this wrapper's top edge would go above the viewport.
          2) At that point `sticky top-0` pins the wrapper right there — the
             page's own scroll effectively "stops" moving it any further.
          3) From then on, further scroll input is consumed by THIS element's
             own overflow-y-auto + max-h-screen: a second, independent
             scrollbar for the table rows only, filling the rest of the
             viewport. `sticky top-0` on each <th> keeps the header row
             visible while that second scroll happens.
          v7.20.4 removed this nested-scroll wrapper entirely, assuming a
          single continuous page scroll with just a floating sticky header
          was wanted — turned out to be the wrong shape of fix; this restores
          the two-stage behaviour while keeping the wrapper itself sticky
          (v7.20.4's regression was pinning the header to the wrong ancestor;
          this version fixes THAT root cause while giving the container the
          sticky+overflow combo instead of a fixed always-on max-height). */}
      <div className="bg-card border border-border rounded-xl overflow-x-auto overflow-y-auto sticky top-0 max-h-screen">
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
                  <ColTooltip text="Batch date of this row. Each ticker×batch instance is its own independent row — sort by Ticker to cluster a ticker's instances together, or by Batch for a true chronological order." />
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
            {flatRows.length === 0 && (
              <tr>
                <td colSpan="11" className="px-3 py-8 text-center text-muted-foreground text-[12px]">
                  No stocks match the current filters
                </td>
              </tr>
            )}
            {flatRows.map((s, idx) => {
              const u = s[hKey]
              const expandKey  = s.instKey || (s.tNorm + '-' + idx)
              const isExpanded = expandedRows.has(expandKey)
              // v7.20.2: flat rows — every ticker×batch instance is fully
              // independent now (no more LATEST + indented-history tree).
              // hasDups is only used for the left-accent-bar hint. isNewest
              // gives the scroll-to-ticker anchor a stable id regardless of
              // sort order; falls back to true when a ticker has no
              // instancesByTicker entry (single fallback row — always "newest").
              const siblingInsts = instancesByTicker[s.tNorm]
              const hasDups      = (siblingInsts?.length ?? 1) > 1
              const isNewest     = s.isLatest ?? true
              return (
                <Fragment key={expandKey}>
                <tr
                  id={isNewest ? ('asrow-' + s.tNorm) : ('asrow-' + expandKey)}
                  onClick={() => toggleExpand(expandKey)}
                  className={cn('border-b border-border transition-colors cursor-pointer',
                    hasDups && 'border-l-2 border-l-primary/40',
                    highlight === s.tNorm && isNewest
                      ? 'bg-amber-100 dark:bg-amber-500/20'
                      : 'hover:bg-muted/30')}
                >
                  {/* Ticker — clickable link to Batch Overview Details */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-[10px] w-3 shrink-0 select-none">{isExpanded ? '▾' : '▸'}</span>
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black shrink-0">
                        {s.tDisplay.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          {/* Click ticker → load THIS instance's batch and navigate to batch-detail */}
                          <button
                            className="hover:text-primary hover:underline underline-offset-2 bg-transparent border-none cursor-pointer p-0 text-left text-[11.5px] font-bold text-foreground"
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
                        </div>
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
