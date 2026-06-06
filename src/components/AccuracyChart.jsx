/**
 * AccuracyChart
 *
 * Accuracy Stats page — shows historical prediction performance.
 *
 * Sections:
 *   1. Action bar — Refresh button + log (slider removed in v7.3.3)
 *   2. KPI cards  — overall hit rate (pure + extended), total hits, awaiting
 *   3. Horizon cards — hit rate per horizon with SNAPSHOT_PARAMS thresholds
 *   4. Area chart — accuracy trend over time across batches
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

/** Colors for each horizon's progress bar and badge */
const H_COLORS = {
  bar:   ['#16a34a', '#3b82f6', '#d97706', '#8b5cf6'],
  badge: [
    'bg-green-50 text-green-700',
    'bg-blue-50 text-blue-700',
    'bg-orange-50 text-orange-700',
    'bg-violet-50 text-violet-700',
  ],
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

// ── Area chart with hover tooltip ─────────────────────────────────────────────

/**
 * AreaChart — SVG area chart showing accuracy trend over batches.
 * Uses raw SVG for maximum control — no chart library dependency.
 * Displays a hover tooltip when mouse moves over the chart.
 */
function AreaChart({ chartData, chartLabels }) {
  const [hover, setHover] = useState(null)

  if (!chartData || !chartLabels || chartLabels.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
        Not enough data to display chart
      </div>
    )
  }

  // SVG dimensions and padding
  const W   = 600
  const H   = 160
  const PAD = { t: 10, b: 30, l: 44, r: 10 }
  const iW  = W - PAD.l - PAD.r
  const iH  = H - PAD.t - PAD.b

  // Average across all horizons for each batch
  const vals = chartLabels.map((_, i) => {
    const row = chartData.map(series => series[i]).filter(v => v != null)
    return row.length ? Math.round(row.reduce((a, b) => a + b, 0) / row.length) : null
  })

  const validVals = vals.filter(v => v != null)
  if (validVals.length < 2) return null

  const minV = Math.max(0, Math.min(...validVals) - 10)
  const maxV = Math.min(100, Math.max(...validVals) + 10)

  const xOf = (i) => PAD.l + (i / (vals.length - 1)) * iW
  const yOf = (v) => v == null ? null : PAD.t + iH - ((v - minV) / (maxV - minV)) * iH

  const pts     = vals.map((v, i) => v != null ? `${xOf(i)},${yOf(v)}` : null).filter(Boolean)
  const linePts = pts.join(' ')
  const areaPts = `${xOf(0)},${PAD.t + iH} ${pts.join(' ')} ${xOf(vals.length - 1)},${PAD.t + iH}`
  const yTicks  = [50, 65, 80, 100].filter(v => v >= minV && v <= maxV)

  const handleMouseMove = (e) => {
    const rect   = e.currentTarget.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left) * (W / rect.width)
    const idx    = Math.round((mouseX - PAD.l) / iW * (vals.length - 1))
    const clamped = Math.max(0, Math.min(vals.length - 1, idx))
    if (vals[clamped] != null) {
      setHover({ idx: clamped, x: xOf(clamped), y: yOf(vals[clamped]), label: chartLabels[clamped], value: vals[clamped] })
    }
  }

  return (
    <div className="relative">
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        className="overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#16a34a" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines */}
        {yTicks.map(v => (
          <g key={v}>
            <line
              x1={PAD.l} y1={yOf(v)} x2={PAD.l + iW} y2={yOf(v)}
              stroke="var(--border)" strokeWidth={1} strokeDasharray="4 4"
            />
            <text x={PAD.l - 6} y={yOf(v) + 4} fontSize={9} fill="var(--muted-foreground)" textAnchor="end">
              {v}%
            </text>
          </g>
        ))}

        {/* Area fill */}
        <polygon points={areaPts} fill="url(#areaG)" />

        {/* Line */}
        <polyline
          points={linePts} fill="none"
          stroke="#16a34a" strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round"
        />

        {/* Hover indicator */}
        {hover && (
          <>
            <line
              x1={hover.x} y1={PAD.t} x2={hover.x} y2={PAD.t + iH}
              stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" opacity={0.5}
            />
            <circle cx={hover.x} cy={hover.y} r={5} fill="#16a34a" stroke="#fff" strokeWidth={2} />
          </>
        )}

        {/* X-axis labels */}
        {chartLabels.map((label, i) => {
          if (i % Math.max(1, Math.floor(chartLabels.length / 6)) !== 0) return null
          return (
            <text key={label} x={xOf(i)} y={H - 6} fontSize={9} fill="var(--muted-foreground)" textAnchor="middle">
              {label}
            </text>
          )
        })}
      </svg>

      {/* Hover tooltip */}
      {hover && (
        <div
          className="absolute top-0 bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg pointer-events-none z-10 min-w-[120px]"
          style={{ left: `${Math.min(hover.x / W * 100, 75)}%` }}
        >
          <div className="font-semibold mb-1">{hover.label}</div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-success inline-block shrink-0" />
            <span className="text-muted-foreground">Accuracy</span>
            <span className="font-bold ml-auto">{hover.value}%</span>
          </div>
        </div>
      )}
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
              sub={`${overallHits} hit + ${overallExc} exceeded`}
              subColor="text-purple-600"
            />
            <KpiCard
              label="Total hits"
              value={overallHits + overallExc}
              icon={CheckCircle}
              sub={`${overallHits} hit · ${overallExc} exceeded`}
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
            {stats.byHorizon.map((h, i) => {
              const pct    = h.hitRate    ?? 0
              const pctExt = h.hitRateExt ?? 0
              return (
                <Card key={h.horizon} className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="text-xs text-muted-foreground font-medium">{h.horizon} horizon</span>
                      <div className="text-[10px] text-muted-foreground">
                        H=±{h.H}% · close&lt;{+(h.H * h.R).toFixed(1)}%
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <Badge className={cn('text-[11px] font-bold rounded-full px-2', H_COLORS.badge[i])}>
                        {pct}%
                      </Badge>
                      <Badge className="text-[10px] font-semibold rounded-full px-2 bg-purple-50 text-purple-700">
                        +exc {pctExt}%
                      </Badge>
                    </div>
                  </div>
                  {/* Hit rate pure bar */}
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full transition-[width] duration-400"
                      style={{ width: `${pct}%`, background: H_COLORS.bar[i] }}
                    />
                  </div>
                  {/* Extended bar */}
                  <div className="w-full h-1 rounded-full bg-muted overflow-hidden mb-1.5">
                    <div
                      className="h-full rounded-full transition-[width] duration-400"
                      style={{ width: `${pctExt}%`, background: '#8b5cf6' }}
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {h.hit} hit · {h.exceeded} exc · {h.miss} miss · {h.total} total
                  </div>
                </Card>
              )
            })}
          </div>

          {/* ── Accuracy trend chart ──────────────────────────────────── */}
          <Card className="mb-6 overflow-hidden">
            <CardHeader className="py-3.5 px-4 border-b border-border flex-row items-center justify-between space-y-0">
              <div>
                <div className="text-sm font-semibold">Prediction Accuracy Over Time</div>
                <div className="text-xs text-muted-foreground mt-0.5">Historical accuracy as batches mature</div>
              </div>
              {stats.overallRate != null && (
                <Badge variant="secondary" className="text-xs font-semibold">
                  {stats.overallRate}% overall
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-4">
              <AreaChart chartData={stats.chartData} chartLabels={stats.chartLabels} />
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
                    {['Date', 'Stocks', 'Hit Rate', 'Ext Rate', 'Hit', 'Exc', 'Miss', 'Await', 'Actions'].map(h => (
                      <TableHead key={h} className="text-xs py-2.5 px-3.5 whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Empty state row */}
                  {(!batches || batches.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-6 text-sm text-muted-foreground">
                        No batches saved yet
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Batch rows */}
                  {(stats?.batchSummary ?? batches)?.map(batch => {
                    const hits     = batch.hit      ?? 0
                    const exc      = batch.exceeded ?? 0
                    const miss     = batch.miss     ?? 0
                    const await_   = batch.awaiting ?? 0
                    const rate     = batch.hitRate
                    const rateExt  = batch.hitRateExt

                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="py-3 px-3.5 font-medium">
                          <div className="flex items-center gap-1.5">
                            {batch.date}
                            <span className={cn(
                              'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                              batch.direction === 'bearish'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-green-50 text-green-700'
                            )}>
                              {batch.direction === 'bearish' ? '📉' : '📈'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-3.5 text-muted-foreground">{batch.stocks}</TableCell>

                        {/* Hit rate pure */}
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

                        {/* Hit rate extended */}
                        <TableCell className="py-3 px-3.5">
                          {rateExt != null && (
                            <Badge className="text-xs font-semibold rounded-full bg-purple-50 text-purple-700">
                              {rateExt}%
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="py-3 px-3.5 font-semibold text-success">{hits}</TableCell>
                        <TableCell className="py-3 px-3.5 font-semibold text-blue-600">{exc}</TableCell>
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

