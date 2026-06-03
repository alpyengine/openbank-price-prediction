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
 * @param {Array}  batches      — all saved batches from useHistory
 * @param {Object} fundamentals — { [ticker]: { sector, peTTM, pegTTM, ... } }
 * @param {Object} weeklyPrices — { [ticker_batchId]: [{ week, close_price }] }
 */
import { useState, useMemo, useRef, useEffect } from 'react'
import { TrendingUp, TrendingDown, Download, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

function deduplicateStocks(batches) {
  if (!batches?.length) return []

  // Sort batches by date desc (most recent first)
  const sorted = [...batches].sort((a, b) => {
    const [da, ma, ya] = (a.date || '').split('/').map(Number)
    const [db, mb, yb] = (b.date || '').split('/').map(Number)
    return new Date(yb, mb - 1, db) - new Date(ya, ma - 1, da)
  })

  const map = new Map()   // ticker → stock data
  const counts = new Map() // ticker → batch count

  for (const batch of sorted) {
    if (!batch.results) continue
    const seen = new Set()
    for (const r of batch.results) {
      const ticker = r.ticker || r.t
      if (!ticker || seen.has(ticker)) continue
      seen.add(ticker)
      counts.set(ticker, (counts.get(ticker) || 0) + 1)
      if (!map.has(ticker)) {
        map.set(ticker, {
          t:       ticker,
          co:      r.company || r.co || ticker,
          b:       r.basePrice || r.b || 0,
          t1:      r.target1M  || r.t1  || 0,
          t3:      r.target3M  || r.t3  || 0,
          t6:      r.target6M  || r.t6  || 0,
          t12:     r.target12M || r.t12 || 0,
          base:    r.base || null,
          batchId: batch.id,
          batchDate: batch.date,
        })
      }
    }
  }

  return Array.from(map.values()).map(s => ({
    ...s,
    batchCount: counts.get(s.t) || 1,
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

function SparkLine({ points, upside }) {
  if (!points?.length) return <span className="text-[10px] text-muted-foreground">—</span>
  const mn = Math.min(...points), mx = Math.max(...points), rng = mx - mn || 1
  const coords = points.map((v, i) => `${i * (50 / (points.length - 1))},${20 - ((v - mn) / rng) * 18}`).join(' ')
  const color  = upside == null ? '#6b7280' : upside >= 0 ? '#16a34a' : '#dc2626'
  return (
    <svg width="55" height="22" viewBox="0 0 55 22" aria-hidden>
      <polyline points={coords} fill="none" stroke={color} strokeWidth="1.5" />
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
  const hKey = 'u' + horizon.toLowerCase()
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

export default function AllStocksPage({ batches, fundamentals }) {
  const [horizon,     setHorizon]     = useState('12M')
  const [sortCol,     setSortCol]     = useState('upside')
  const [sortDir,     setSortDir]     = useState(-1) // -1 = desc
  const [filterSec,   setFilterSec]   = useState('')
  const [filterPeg,   setFilterPeg]   = useState('')
  const [minScore,    setMinScore]    = useState(0)
  const [legendOpen,  setLegendOpen]  = useState(false)

  // Deduplicate stocks from all batches
  const baseStocks = useMemo(() => deduplicateStocks(batches), [batches])

  // Merge fundamentals + score
  const stocks = useMemo(() => baseStocks.map(s => {
    const f = fundamentals?.[s.t]
    const score  = calcScore(s.u12, f)
    return {
      ...s,
      sector:     f?.sector     || '—',
      peg:        f?.pegTTM     ?? null,
      margin:     f?.netMarginTTM ?? null,
      epsGrowth:  f?.epsGrowthTTM ?? null,
      score,
    }
  }), [baseStocks, fundamentals])

  // Unique sectors for filter
  const sectors = useMemo(() => {
    const s = new Set(stocks.map(x => x.sector).filter(x => x && x !== '—'))
    return Array.from(s).sort()
  }, [stocks])

  const hKey = 'u' + horizon.toLowerCase()

  // Filter
  const filtered = useMemo(() => stocks.filter(s => {
    if (filterSec && s.sector !== filterSec) return false
    if (filterPeg === 'low'  && !(s.peg != null && s.peg > 0 && s.peg < 1))  return false
    if (filterPeg === 'mid'  && !(s.peg != null && s.peg >= 1 && s.peg <= 2)) return false
    if (filterPeg === 'high' && !(s.peg != null && s.peg > 2))                return false
    if (minScore > 0 && (s.score == null || s.score < minScore)) return false
    return true
  }), [stocks, filterSec, filterPeg, minScore])

  // Sort
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const va = sortCol === 'upside' ? (a[hKey] ?? -999) : (a.score ?? -1)
    const vb = sortCol === 'upside' ? (b[hKey] ?? -999) : (b.score ?? -1)
    return sortDir * (vb - va)
  }), [filtered, sortCol, sortDir, hKey])

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

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
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

        <span className="ml-auto text-[11px] text-muted-foreground">
          {sorted.length} stock{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <Legend />

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full border-collapse text-[11.5px]">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-3 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Ticker</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Sector</th>

              {/* Upside column with horizon dropdown */}
              <th className="px-3 py-2.5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => toggleSort('upside')}
                    className={cn('text-[10px] font-bold uppercase tracking-wide cursor-pointer bg-transparent border-none',
                      sortCol === 'upside' ? 'text-primary' : 'text-muted-foreground'
                    )}
                    style={{ fontFamily: 'inherit' }}
                  >
                    Upside {sortIcon('upside')}
                  </button>
                  <HorizonDropdown value={horizon} onChange={setHorizon} />
                </div>
              </th>

              {/* Score column */}
              <th className="px-3 py-2.5 text-right">
                <button
                  onClick={() => toggleSort('score')}
                  className={cn('text-[10px] font-bold uppercase tracking-wide cursor-pointer bg-transparent border-none',
                    sortCol === 'score' ? 'text-primary' : 'text-muted-foreground'
                  )}
                  style={{ fontFamily: 'inherit' }}
                >
                  Score {sortIcon('score')}
                </button>
              </th>

              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wide">PEG</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Margin</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Sparkline</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Batch</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan="8" className="px-3 py-8 text-center text-muted-foreground text-[12px]">
                  No stocks match the current filters
                </td>
              </tr>
            )}
            {sorted.map(s => {
              const u = s[hKey]
              return (
                <tr key={s.t} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  {/* Ticker */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black shrink-0">
                        {s.t.slice(0, 3)}
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{s.t}</div>
                        <div className="text-[10px] text-muted-foreground">{s.co}</div>
                      </div>
                    </div>
                  </td>

                  {/* Sector */}
                  <td className="px-3 py-2.5 text-muted-foreground">{s.sector}</td>

                  {/* Upside */}
                  <td className={cn('px-3 py-2.5 text-right font-bold', uColor(u))}>
                    {fmtPct(u)}
                  </td>

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

                  {/* Sparkline — placeholder, real data needs weekly_prices */}
                  <td className="px-3 py-2.5 text-center">
                    <SparkLine points={null} upside={u} />
                  </td>

                  {/* Batch */}
                  <td className="px-3 py-2.5 text-center text-[10px] text-muted-foreground">
                    {fmtDate(s.batchDate)}
                    {s.batchCount > 1 && (
                      <span className="text-primary font-bold ml-1">· {s.batchCount}×</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] text-muted-foreground text-right">
        Sorted by {sortCol === 'upside' ? `Upside ${horizon}` : 'Score'} {sortDir === -1 ? 'desc' : 'asc'} · Click column headers to re-sort
      </div>
    </div>
  )
}
