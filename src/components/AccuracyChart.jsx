/**
 * AccuracyChart
 *
 * Accuracy Stats page — shows historical prediction performance.
 *
 * Sections:
 *   1. Action bar — Refresh button + log (slider removed in v7.3.3)
 *   2. KPI cards  — overall hit rate (pure + extended), total hits, awaiting
 *   3. Horizon cards — 3-tier hit-rate ladder per horizon (hit/+close/+exceeded), v7.19.1
 *   4. Multi-line chart — accuracy per horizon over time (1M/3M/6M/12M + Global)
 *   5. Batch table — all saved batches with Load / Download / Delete actions
 *
 * Note: Accuracy Stats always uses SNAPSHOT_PARAMS fixed thresholds (v7.3.3+).
 * The hit margin slider was removed — it only applies in Batch Details (live mode).
 * This ensures all batches are evaluated consistently for historical comparison.
 *
 * @param {Object}   stats          — computed accuracy stats from useHistory
 * @param {Object[]} history        — raw batch history (history.batches)
 * @param {boolean}  loading        — true while loading history
 * @param {string}   log            — status log message
 * @param {boolean}  configured     — true if Supabase is configured
 * @param {Function} onLoad         — trigger history refresh
 * @param {Function} onLoadBatch    — load a batch into the main view
 * @param {Function} onDeleteBatch  — delete a batch from Supabase
 */
import { useState } from 'react'
import { BarChart2, Target, CheckCircle, Clock, Download, RefreshCw, Trash2, TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { SNAPSHOT_PARAMS } from '@/utils/stocks.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const HORIZONS = ['1M', '3M', '6M', '12M']

/** Fixed colors for the 3-tier hit-rate ladder — same on every horizon card
 *  (v7.19.1). Each tier includes the previous one: hit ⊂ +close ⊂ +exceeded. */
const TIER_COLORS = {
  hit:      { bar: '#16a34a', badge: 'bg-green-50 text-green-700',  label: 'text-green-700' },
  hitClose: { bar: '#1d4ed8', badge: 'bg-blue-50 text-blue-700',    label: 'text-blue-700' },
  hitExt:   { bar: '#8b5cf6', badge: 'bg-violet-50 text-violet-700', label: 'text-violet-700' },
}

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * ActionBar — Refresh button + log message.
 * Slider removed in v7.3.3 — AccuracyChart uses fixed SNAPSHOT_PARAMS.
 */
function ActionBar({ log, loading, onLoad }) {
  return (
    <div className="flex justify-end gap-2 mb-6 flex-wrap items-center">
      {/* Status log */}
      {log && (
        <span className="text-[11px] text-muted-foreground font-mono flex-1 truncate">{log}</span>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="w-3.5 h-3.5 border-2 border-border border-t-primary rounded-full animate-spin" />
      )}

      {/* Snapshot params note */}
      <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-3 py-1.5">
        <span className="text-[11px] text-muted-foreground font-medium">Fixed thresholds:</span>
        {['1M', '3M', '6M', '12M'].map(h => (
          <span key={h} className="text-[10px] font-semibold text-muted-foreground">
            {h} ±{SNAPSHOT_PARAMS[h].H}%
          </span>
        ))}
      </div>

      {/* Refresh button */}
      <Button variant="outline" size="sm" onClick={onLoad} disabled={loading}>
        <RefreshCw size={13} /> Refresh
      </Button>
    </div>
  )
}

/**
 * KpiCard — individual stat box.
 * Reuses the same layout as SummaryCards but without verdict colors.
 */
function KpiCard({ label, value, icon: Icon, sub, subColor }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between mb-2">
          <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
          <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
            <Icon size={14} className="text-muted-foreground" />
          </div>
        </div>
        <div className="text-3xl font-bold leading-none">{value}</div>
        {sub && (
          <div className={cn('text-xs font-medium mt-1.5', subColor || 'text-muted-foreground')}>
            {sub}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Multi-line accuracy chart (per horizon) ───────────────────────────────────

/**
 * Series metadata for the accuracy chart.
 * Colours are hardcoded per horizon (1M green, 3M blue, 6M orange, 12M violet).
 * 'global' is the aggregate
 * (average of the available horizon values per batch) and uses --foreground so
 * it stays legible in both light and dark themes.
 */
const SERIES_META = [
  { key: 'global', name: 'Global', color: 'var(--foreground)', width: 2.4, fill: true },
  { key: '1M',  name: '1M',  color: '#16a34a', width: 1.8 },
  { key: '3M',  name: '3M',  color: '#3b82f6', width: 1.8 },
  { key: '6M',  name: '6M',  color: '#d97706', width: 1.8 },
  { key: '12M', name: '12M', color: '#8b5cf6', width: 1.8 },
]

/**
 * smoothPath — monotone cubic interpolation (Fritsch–Carlson).
 * Smooth curve that never overshoots beyond the data points, so a line between
 * two equal values (e.g. two 0% batches) stays flat instead of dipping below
 * the axis. x must be increasing (batches left → right).
 * @param {number[][]} pts — array of [x, y] points (already in SVG space)
 * @returns {string}       — SVG path `d` attribute
 */
function smoothPath(pts) {
  const n = pts.length
  if (n < 2) return ''
  if (n === 2) return `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]}`

  // secant slopes between consecutive points
  const dx = [], slope = []
  for (let i = 0; i < n - 1; i++) {
    const hx = pts[i + 1][0] - pts[i][0]
    dx[i] = hx
    slope[i] = hx !== 0 ? (pts[i + 1][1] - pts[i][1]) / hx : 0
  }

  // tangents — zero at local extrema / flats to prevent overshoot
  const m = new Array(n)
  m[0] = slope[0]
  m[n - 1] = slope[n - 2]
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2
  }
  // Fritsch–Carlson monotonicity limiter
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
    } else {
      const a = m[i] / slope[i]
      const b = m[i + 1] / slope[i]
      const h = Math.hypot(a, b)
      if (h > 3) {
        const t = 3 / h
        m[i] = t * a * slope[i]
        m[i + 1] = t * b * slope[i]
      }
    }
  }

  // cubic Hermite segments → cubic bezier
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i]
    const c1x = pts[i][0] + h / 3
    const c1y = pts[i][1] + (m[i] * h) / 3
    const c2x = pts[i + 1][0] - h / 3
    const c2y = pts[i + 1][1] - (m[i + 1] * h) / 3
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${pts[i + 1][0]} ${pts[i + 1][1]}`
  }
  return d
}

/**
 * toSegments — split a value array into continuous [x,y] runs, breaking at nulls.
 * This keeps a line from jumping across batches where a horizon has no data
 * (e.g. 12M only exists in legacy batches, or horizons not yet matured).
 */
function toSegments(vals, xOf, yOf) {
  const segs = []
  let seg = []
  vals.forEach((v, i) => {
    if (v == null) { if (seg.length) segs.push(seg); seg = [] }
    else seg.push([xOf(i), yOf(v)])
  })
  if (seg.length) segs.push(seg)
  return segs
}

/**
 * MultiLineChart — accuracy per horizon over batches.
 * One line per horizon (1M/3M/6M/12M) plus a Global aggregate line.
 * Legend entries toggle each line; the Y axis rescales to the visible series.
 */
function MultiLineChart({ chartData, chartLabels }) {
  const [hidden, setHidden]     = useState({})    // { '12M': true, ... }
  const [hoverIdx, setHoverIdx] = useState(null)

  if (!chartData || !chartLabels || chartLabels.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
        Not enough data to display chart
      </div>
    )
  }

  const n = chartLabels.length

  // chartData = [s1M, s3M, s6M, s12M] (order = HORIZONS) — see useHistory.computed().
  // Global = average of the available horizon values per batch (matches the
  // single line drawn before v7.7.0).
  const globalVals = chartLabels.map((_, i) => {
    const row = chartData.map(s => s?.[i]).filter(v => v != null)
    return row.length ? Math.round(row.reduce((a, b) => a + b, 0) / row.length) : null
  })
  const valuesByKey = {
    global: globalVals,
    '1M':   chartData[0] ?? [],
    '3M':   chartData[1] ?? [],
    '6M':   chartData[2] ?? [],
    '12M':  chartData[3] ?? [],
  }

  const isVisible = (k) => !hidden[k]
  const toggle    = (k) => setHidden(prev => ({ ...prev, [k]: !prev[k] }))

  // SVG geometry
  const W = 720, H = 300, PAD = { t: 16, b: 64, l: 46, r: 16 }
  const iW = W - PAD.l - PAD.r
  const iH = H - PAD.t - PAD.b

  // Adaptive Y domain from the currently visible series only.
  const visibleVals = []
  SERIES_META.forEach(s => {
    if (isVisible(s.key)) (valuesByKey[s.key] || []).forEach(v => { if (v != null) visibleVals.push(v) })
  })
  const hasData = visibleVals.length >= 2

  let minV = 0, maxV = 100
  if (hasData) {
    minV = Math.max(0, Math.min(...visibleVals) - 6)
    maxV = Math.min(100, Math.max(...visibleVals) + 6)
    if (maxV - minV < 15) { const c = (maxV + minV) / 2; minV = Math.max(0, c - 10); maxV = Math.min(100, c + 10) }
  }

  const xOf = (i) => PAD.l + (n < 2 ? 0 : (i / (n - 1)) * iW)
  const yOf = (v) => PAD.t + iH - ((v - minV) / (maxV - minV)) * iH

  // Y ticks at round values inside the domain
  const step = (maxV - minV) > 40 ? 20 : 10
  const yTicks = []
  for (let v = Math.ceil(minV / step) * step; v <= maxV; v += step) yTicks.push(v)

  // Thin X labels when there are many batches (always keep the last one)
  const labelEvery = Math.max(1, Math.floor(n / 12))

  const handleMouseMove = (e) => {
    const rect   = e.currentTarget.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left) * (W / rect.width)
    const idx    = Math.round((mouseX - PAD.l) / iW * (n - 1))
    setHoverIdx(Math.max(0, Math.min(n - 1, idx)))
  }

  // Tooltip rows for the hovered batch — only visible series with a value
  const tipRows = hoverIdx != null
    ? SERIES_META
        .filter(s => isVisible(s.key) && valuesByKey[s.key][hoverIdx] != null)
        .map(s => ({ ...s, value: valuesByKey[s.key][hoverIdx] }))
    : []

  return (
    <div className="relative">
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        className="overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Y-axis grid lines + labels */}
        {hasData && yTicks.map(v => (
          <g key={v}>
            <line
              x1={PAD.l} y1={yOf(v)} x2={PAD.l + iW} y2={yOf(v)}
              stroke="var(--border)" strokeWidth={1} strokeDasharray="4 4"
            />
            <text x={PAD.l - 8} y={yOf(v) + 3.5} fontSize={11} fill="var(--muted-foreground)" textAnchor="end">
              {v}%
            </text>
          </g>
        ))}

        {/* Series — smoothed lines, optional fill under Global, dots */}
        {hasData && SERIES_META.map(s => {
          if (!isVisible(s.key)) return null
          const segs = toSegments(valuesByKey[s.key], xOf, yOf)
          if (!segs.length) return null

          let fillPath = null
          if (s.fill) {
            const sg   = segs[0]
            const body = smoothPath(sg).replace(/^M\s*[\d.\-]+\s+[\d.\-]+/, '')
            fillPath = `M ${sg[0][0]} ${PAD.t + iH} L ${sg[0][0]} ${sg[0][1]}${body} L ${sg[sg.length - 1][0]} ${PAD.t + iH} Z`
          }

          return (
            <g key={s.key}>
              {fillPath && <path d={fillPath} fill={s.color} fillOpacity={0.05} stroke="none" />}
              {segs.map((sg, si) => (
                <path
                  key={si} d={smoothPath(sg)} fill="none"
                  stroke={s.color} strokeWidth={s.width}
                  strokeLinejoin="round" strokeLinecap="round"
                />
              ))}
              {valuesByKey[s.key].map((v, i) => v != null && (
                <circle
                  key={i} cx={xOf(i)} cy={yOf(v)} r={s.key === 'global' ? 3.2 : 2.6}
                  fill="var(--card)" stroke={s.color} strokeWidth={2}
                />
              ))}
            </g>
          )
        })}

        {/* Empty state when every series is hidden */}
        {!hasData && (
          <text x={W / 2} y={H / 2} fontSize={14} fill="var(--muted-foreground)" textAnchor="middle">
            Select a series to display
          </text>
        )}

        {/* Hover guide line */}
        {hasData && hoverIdx != null && (
          <line
            x1={xOf(hoverIdx)} y1={PAD.t} x2={xOf(hoverIdx)} y2={PAD.t + iH}
            stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" opacity={0.5}
          />
        )}

        {/* X-axis labels — diagonal, smaller font */}
        {chartLabels.map((label, i) => {
          if (i % labelEvery !== 0 && i !== n - 1) return null
          const x = xOf(i), y = PAD.t + iH + 16
          return (
            <text
              key={i} x={x} y={y} fontSize={11} fill="var(--muted-foreground)"
              textAnchor="end" transform={`rotate(-40 ${x} ${y})`}
            >
              {label}
            </text>
          )
        })}
      </svg>

      {/* Hover tooltip — multi-series */}
      {tipRows.length > 0 && (
        <div
          className="absolute top-2 bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg pointer-events-none z-10 min-w-[150px]"
          style={{ left: `${Math.min((xOf(hoverIdx) / W) * 100 + 2, 70)}%` }}
        >
          <div className="font-semibold text-sm mb-1.5">Batch {chartLabels[hoverIdx]}</div>
          {tipRows.map(r => (
            <div key={r.key} className="flex items-center gap-2 my-0.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: r.color }} />
              <span className="text-muted-foreground">{r.name}</span>
              <span className="font-bold ml-auto">{r.value}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Legend — click to show / hide a line */}
      <div className="flex flex-wrap justify-center gap-2 pt-3 mt-2 border-t border-border">
        {SERIES_META.map(s => (
          <button
            key={s.key}
            onClick={() => toggle(s.key)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[13px] font-semibold transition-colors',
              isVisible(s.key)
                ? 'border-border text-foreground bg-card hover:bg-muted'
                : 'border-border text-muted-foreground bg-card opacity-50'
            )}
            aria-pressed={isVisible(s.key)}
          >
            <span
              className={cn('inline-block rounded-sm shrink-0', s.key === 'global' ? 'w-4 h-[3px]' : 'w-3 h-3')}
              style={{ background: s.color }}
            />
            <span className={cn(!isVisible(s.key) && 'line-through')}>{s.name}</span>
          </button>
        ))}
      </div>

      <div className="text-center text-[11px] text-muted-foreground pt-2">
        Click a legend item to show / hide that line · hover for per-horizon values
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AccuracyChart({
  stats, history: batches, loading, log, configured,
  onLoad, onLoadBatch, onDeleteBatch,
}) {
  const [loadingBatch,   setLoadingBatch]   = useState(null)
  const [downloadedBatch, setDownloadedBatch] = useState(null)
  const [deletingBatch,  setDeletingBatch]  = useState(null)
  const [confirmDelete,  setConfirmDelete]  = useState(null)

  // ── Batch actions ───────────────────────────────────────────────────────────

  /**
   * Load a batch into the main view.
   * Finds the full batch (with results[]) from the history array
   * because batchSummary objects don't include results.
   */
  const handleLoadBatch = (batch) => {
    const fullBatch = batches?.find(b => b.id === batch.id) ?? batch
    setLoadingBatch(batch.id)
    onLoadBatch(fullBatch)
    setTimeout(() => setLoadingBatch(null), 600)
  }

  /**
   * Delete a batch from Supabase.
   * Requires two clicks — first click sets confirm state (3s timeout),
   * second click within 3s performs the deletion.
   */
  const handleDeleteBatch = async (batchId) => {
    if (confirmDelete !== batchId) {
      setConfirmDelete(batchId)
      setTimeout(() => setConfirmDelete(null), 3000)
      return
    }
    setConfirmDelete(null)
    setDeletingBatch(batchId)
    await onDeleteBatch(batchId)
    setDeletingBatch(null)
  }

  /**
   * Export a batch as CSV and trigger browser download.
   * Also finds the full batch from history to access results[].
   */
  const handleExportCSV = (batch) => {
    const fullBatch = batches?.find(b => b.id === batch.id) ?? batch
    if (!fullBatch.results?.length) return

    const seen    = new Set()
    const tickers = []
    for (const r of fullBatch.results) {
      if (!seen.has(r.ticker)) { seen.add(r.ticker); tickers.push(r.ticker) }
    }

    const rows = ['Ticker,Company,Currency,BasePrice,1M,3M,6M,12M,Date']
    for (const ticker of tickers) {
      const res    = fullBatch.results.filter(r => r.ticker === ticker)
      const get    = (h) => res.find(r => r.horizon === h)?.targetPrice ?? ''
      const base   = res[0]; if (!base) continue
      const suffix = ticker.split('.').pop().toUpperCase()
      const cu     = ['DE','AS','PA','MC'].includes(suffix) ? 'EUR' : suffix === 'L' ? 'GBP' : 'USD'
      rows.push([ticker, base.company, cu, base.basePrice, get('1M'), get('3M'), get('6M'), get('12M'), fullBatch.date].join(','))
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `Openbank_${fullBatch.date.split('/').reverse().join('')}.csv`
    a.click()
    URL.revokeObjectURL(url)

    // Brief green feedback on the download button
    setDownloadedBatch(batch.id)
    setTimeout(() => setDownloadedBatch(null), 1500)
  }

  // ── Empty states ────────────────────────────────────────────────────────────

  if (!configured) return (
    <div>
      <ActionBar log={log} loading={loading} onLoad={onLoad} />
      <Card className="flex flex-col items-center justify-center p-8 text-center gap-3">
        <BarChart2 size={32} className="text-muted-foreground" />
        <div>
          <div className="text-sm font-semibold mb-1">Accuracy tracking not configured</div>
          <div className="text-sm text-muted-foreground">Add Supabase credentials to your .env file to enable history tracking.</div>
        </div>
      </Card>
    </div>
  )

  if (!stats && !loading) return (
    <div>
      <ActionBar log={log} loading={loading} onLoad={onLoad} />
      <Card className="flex flex-col items-center justify-center p-10 text-center gap-4">
        <BarChart2 size={32} className="text-muted-foreground" />
        <div>
          <div className="text-sm font-semibold mb-1">No history loaded</div>
          <div className="text-sm text-muted-foreground mb-4">Click "Refresh" to fetch accuracy data from Supabase.</div>
        </div>
        <Button variant="outline" size="sm" onClick={onLoad}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </Card>
    </div>
  )

  const overallHits    = stats?.byHorizon.reduce((a, h) => a + h.hit, 0) ?? 0
  const overallClose   = stats?.byHorizon.reduce((a, h) => a + h.close, 0) ?? 0
  const overallExc     = stats?.byHorizon.reduce((a, h) => a + h.exceeded, 0) ?? 0
  const overallAwait   = stats?.totalAwaiting ?? 0

  return (
    <div>
      <ActionBar log={log} loading={loading} onLoad={onLoad} />

      {stats && (
        <>
          {/* ── KPI cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <KpiCard
              label="Hit Rate — pure"
              value={stats.overallRate != null ? `${stats.overallRate}%` : '--'}
              icon={Target}
              sub={`${overallHits} hits within ±H% · ${stats.evaluated} evaluated`}
              subColor="text-success"
            />
            <KpiCard
              label="Hit Rate — extended"
              value={stats.overallRateExt != null ? `${stats.overallRateExt}%` : '--'}
              icon={TrendingUp}
              sub={`${overallHits} hit · ${overallClose} close · ${overallExc} exceeded`}
              subColor="text-purple-600"
            />
            <KpiCard
              label="Total hits"
              value={overallHits + overallClose + overallExc}
              icon={CheckCircle}
              sub={`${overallHits} hit · ${overallClose} close · ${overallExc} exceeded`}
            />
            <KpiCard
              label="Awaiting"
              value={overallAwait}
              icon={Clock}
              sub="Predictions pending maturity"
            />
          </div>

          {/* ── Horizon hit rate cards ────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {stats.byHorizon.map((h) => {
              const pct      = h.hitRate      ?? 0
              const pctClose = h.hitRateClose ?? 0
              const pctExt   = h.hitRateExt   ?? 0
              const isLegacy = h.horizon === '12M'
              const noData   = h.total === 0
              return (
                <Card key={h.horizon} className={cn('p-4', isLegacy && noData && 'opacity-60')}>
                  <div className="mb-2.5">
                    <span className="text-xs text-muted-foreground font-medium">
                      {h.horizon} horizon
                      {isLegacy && (
                        <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          legacy
                        </span>
                      )}
                    </span>
                    <div className="text-[10px] text-muted-foreground">
                      H=±{h.H}% · close&lt;{+(h.H * h.R).toFixed(1)}%
                    </div>
                  </div>

                  {/* 3-tier ladder — always visible together, no selector needed here.
                      Each bar includes the previous one: hit ⊂ +close ⊂ +exceeded. */}
                  <div className="space-y-1.5 mb-1">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-[10.5px] font-bold w-[52px] shrink-0', TIER_COLORS.hit.label)}>Hit</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-[width] duration-400"
                          style={{ width: `${pct}%`, background: TIER_COLORS.hit.bar }}
                        />
                      </div>
                      <span className="text-[11px] font-extrabold w-8 text-right shrink-0">{pct}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-[10.5px] font-bold w-[52px] shrink-0', TIER_COLORS.hitClose.label)}>+Close</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-[width] duration-400"
                          style={{ width: `${pctClose}%`, background: TIER_COLORS.hitClose.bar }}
                        />
                      </div>
                      <span className="text-[11px] font-extrabold w-8 text-right shrink-0">{pctClose}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-[10.5px] font-bold w-[52px] shrink-0', TIER_COLORS.hitExt.label)}>+Exceeded</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-[width] duration-400"
                          style={{ width: `${pctExt}%`, background: TIER_COLORS.hitExt.bar }}
                        />
                      </div>
                      <span className="text-[11px] font-extrabold w-8 text-right shrink-0">{pctExt}%</span>
                    </div>
                  </div>

                  {noData
                    ? <div className="text-[11px] text-muted-foreground italic mt-2 pt-2 border-t border-dashed border-border">
                        {isLegacy ? 'legacy batches only' : 'no data yet'}
                      </div>
                    : <div className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-dashed border-border">
                        {h.hit} hit · {h.close} close · {h.exceeded} exc · {h.miss} miss · {h.total} total
                      </div>
                  }
                </Card>
              )
            })}
          </div>

          {/* ── Accuracy trend chart ──────────────────────────────────── */}
          <Card className="mb-6 overflow-hidden">
            <CardHeader className="py-3.5 px-4 border-b border-border flex-row items-center justify-between space-y-0">
              <div>
                <div className="text-sm font-semibold">Prediction Accuracy Over Time</div>
                <div className="text-xs text-muted-foreground mt-0.5">Historical accuracy as batches mature — per horizon</div>
              </div>
              {stats.overallRate != null && (
                <Badge variant="secondary" className="text-xs font-semibold">
                  {stats.overallRate}% overall
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-4">
              <MultiLineChart chartData={stats.chartData} chartLabels={stats.chartLabels} />
            </CardContent>
          </Card>

          {/* ── Batch history table ───────────────────────────────────── */}
          <Card className="overflow-hidden">
            <CardHeader className="py-3.5 px-4 border-b border-border flex-row items-center justify-between space-y-0">
              <div className="text-sm font-semibold">Historical batches</div>
              <span className="text-xs text-muted-foreground">{batches?.length ?? 0} batches saved</span>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    {['Date', 'Market', 'Trend', 'Stocks', 'Hit Rate', '+Close', '+Close+Exc', 'Hit', 'Close', 'Exc', 'Miss', 'Await', 'Actions'].map(h => (
                      <TableHead key={h} className="text-xs py-2.5 px-3.5 whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Empty state row */}
                  {(!batches || batches.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-6 text-sm text-muted-foreground">
                        No batches saved yet
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Batch rows */}
                  {(stats?.batchSummary ?? batches)?.map(batch => {
                    const hits      = batch.hit         ?? 0
                    const close     = batch.close       ?? 0
                    const exc       = batch.exceeded    ?? 0
                    const miss      = batch.miss        ?? 0
                    const await_    = batch.awaiting    ?? 0
                    const rate      = batch.hitRate
                    const rateClose = batch.hitRateClose
                    const rateExt   = batch.hitRateExt

                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="py-3 px-3.5 font-medium whitespace-nowrap">
                          {batch.date}
                        </TableCell>

                        {/* Market — neutral pill (raw exchange code: US, MC, DE…) */}
                        <TableCell className="py-3 px-3.5">
                          <span className="inline-flex items-center text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">
                            {batch.market ?? 'US'}
                          </span>
                        </TableCell>

                        {/* Trend — green (bullish) / red (bearish) pill */}
                        <TableCell className="py-3 px-3.5">
                          <span className={cn(
                            'inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap',
                            batch.direction === 'bearish'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-green-50 text-green-700 border-green-200'
                          )}>
                            {batch.direction === 'bearish' ? '↘ Bear' : '↗ Bull'}
                          </span>
                        </TableCell>

                        <TableCell className="py-3 px-3.5 text-muted-foreground">{batch.stocks}</TableCell>

                        {/* Hit rate pure — banded by performance (unchanged) */}
                        <TableCell className="py-3 px-3.5">
                          {rate != null && (
                            <Badge className={cn(
                              'text-xs font-semibold rounded-full',
                              rate >= 60 ? 'bg-green-50 text-green-700'
                              : rate >= 40 ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700'
                            )}>
                              {rate}%
                            </Badge>
                          )}
                        </TableCell>

                        {/* +Close — new column (v7.19.2), same blue as the horizon-card ladder */}
                        <TableCell className="py-3 px-3.5">
                          {rateClose != null && (
                            <Badge className={cn('text-xs font-semibold rounded-full', TIER_COLORS.hitClose.badge)}>
                              {rateClose}%
                            </Badge>
                          )}
                        </TableCell>

                        {/* +Close+Exc — was "Ext Rate" (purple); relabelled + recoloured violet
                            to match the horizon-card ladder's +Exceeded tier (v7.19.1/.2) */}
                        <TableCell className="py-3 px-3.5">
                          {rateExt != null && (
                            <Badge className={cn('text-xs font-semibold rounded-full', TIER_COLORS.hitExt.badge)}>
                              {rateExt}%
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="py-3 px-3.5 font-semibold text-success">{hits}</TableCell>
                        {/* Close count — new column (v7.19.2), between Hit and Exc per the approved mockup */}
                        <TableCell className="py-3 px-3.5 font-semibold text-blue-600">{close}</TableCell>
                        {/* Exceeded count — recoloured violet (was blue) so it no longer collides
                            visually with the new Close column; matches its ladder tier colour */}
                        <TableCell className="py-3 px-3.5 font-semibold text-violet-600">{exc}</TableCell>
                        <TableCell className="py-3 px-3.5 font-semibold text-destructive">{miss}</TableCell>

                        {/* Awaiting badge or dash */}
                        <TableCell className="py-3 px-3.5">
                          {await_ > 0
                            ? <Badge variant="secondary" className="text-xs">⏳ {await_}</Badge>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </TableCell>

                        {/* Action buttons */}
                        <TableCell className="py-3 px-3.5">
                          <div className="flex gap-1.5">
                            {/* Load */}
                            <Button
                              size="sm"
                              variant={loadingBatch === batch.id ? 'default' : 'outline'}
                              className="text-xs px-2.5 min-w-[44px]"
                              onClick={() => handleLoadBatch(batch)}
                              disabled={loadingBatch === batch.id}
                            >
                              {loadingBatch === batch.id ? '…' : 'Load'}
                            </Button>

                            {/* Download CSV */}
                            <Button
                              size="sm"
                              variant="outline"
                              title="Download CSV"
                              className={cn(
                                'px-2',
                                downloadedBatch === batch.id && 'border-success bg-green-50 text-success hover:bg-green-50'
                              )}
                              onClick={() => handleExportCSV(batch)}
                            >
                              {downloadedBatch === batch.id ? '✓' : <Download size={11} />}
                            </Button>

                            {/* Delete — double click to confirm */}
                            <Button
                              size="sm"
                              variant="outline"
                              className={cn(
                                'px-2',
                                confirmDelete === batch.id && 'border-destructive bg-red-50 text-destructive hover:bg-red-50'
                              )}
                              onClick={() => handleDeleteBatch(batch.id)}
                            >
                              {deletingBatch === batch.id ? '…' : <Trash2 size={11} />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

