/**
 * PriceChart — Weekly price chart modal for a single stock.
 *
 * Uses Chart.js (loaded via CDN in index.html as window.Chart).
 * - X axis shows real dates at 45° — every 4 weeks + target weeks
 * - Target dots (colored) rendered as separate dataset on top of blue line
 * - Real price dots always blue — no color confusion with targets
 * - Zoom slider shows real date in label
 *
 * @param {Object} stock   — { t, co, b, t1, t3, t6, t12, base }
 * @param {string} batchId — Supabase batch id e.g. "2026-03-17"
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { TrendingUp, TrendingDown, Minus, X } from 'lucide-react'
import { loadWeeklyPrices } from '@/services/storage.js'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LINE_COLOR = '#6EA8D8'
const HORIZON_COLORS = { '1M':'#22c55e', '3M':'#f59e0b', '6M':'#8b5cf6', '12M':'#E24B4A' }
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function weekToDate(baseDate, w) {
  const d = new Date(baseDate)
  d.setDate(d.getDate() + w * 7)
  return d
}

function fmt(d) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export default function PriceChart({ stock, batchId }) {
  const [open,    setOpen]    = useState(false)
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded,  setLoaded]  = useState(false)
  const [error,   setError]   = useState(null)
  const [maxWeek, setMaxWeek] = useState(52)
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  const base     = stock.b
  const baseDate = stock.base instanceof Date ? stock.base : new Date()

  const targets = [
    { label:'1M',  week:4,  price:stock.t1,  color:HORIZON_COLORS['1M']  },
    { label:'3M',  week:13, price:stock.t3,  color:HORIZON_COLORS['3M']  },
    { label:'6M',  week:26, price:stock.t6,  color:HORIZON_COLORS['6M']  },
    { label:'12M', week:52, price:stock.t12, color:HORIZON_COLORS['12M'] },
  ].filter(t => t.price > 0)

  const handleOpen = async () => {
    setOpen(true)
    if (loaded) return
    setLoading(true)
    setError(null)
    try {
      const rows = await loadWeeklyPrices(stock.t, batchId)
      setData(rows)
      setLoaded(true)
    } catch { setError('Could not load chart data') }
    finally { setLoading(false) }
  }

  const handleClose = useCallback(() => {
    setOpen(false)
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
  }, [])

  useEffect(() => {
    if (!open) return
    const h = e => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, handleClose])

  useEffect(() => {
    if (!loaded || !canvasRef.current || data.length === 0) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    const Chart = window.Chart
    if (!Chart) return

    const vis    = targets.filter(t => t.week <= maxWeek)
    const tWeeks = new Set(vis.map(t => t.week))

    const labels = [], prices = [], tgtPts = [], tgtColors = [], tgtSizes = []

    for (let w = 0; w <= maxWeek; w++) {
      const d         = weekToDate(baseDate, w)
      const isTarget  = tWeeks.has(w)
      const nearTarget = [-1, 1].some(dd => tWeeks.has(w + dd))

      if (w === 0)            labels.push('Base')
      else if (isTarget)      labels.push(fmt(d))
      else if (w % 4 === 0 && !nearTarget) labels.push(fmt(d))
      else                    labels.push('')

      const row = data.find(r => r.week === w)
      prices.push(w === 0 ? base : (row ? parseFloat(row.close_price) : null))

      const t = vis.find(x => x.week === w)
      tgtPts.push(t ? t.price : null)
      tgtColors.push(t ? t.color : 'transparent')
      tgtSizes.push(t ? 5 : 0)
    }

    const allP = prices.filter(Boolean).concat(vis.map(t => t.price))
    const yMin = Math.floor(Math.min(...allP) * 0.90)
    const yMax = Math.ceil(Math.max(...allP)  * 1.10)
    const lastW = data.length > 0 ? data[data.length - 1].week : 0

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Weekly close',
            data: prices,
            borderColor: LINE_COLOR,
            borderWidth: 2,
            // All real price dots stay BLUE always — no color mixing with targets
            pointBackgroundColor: prices.map(p => p == null ? 'transparent' : LINE_COLOR),
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            pointRadius: prices.map((p, i) => {
              if (p == null) return 0
              if (i === 0 || i === lastW) return 4
              if (tWeeks.has(i)) return 3
              return 2
            }),
            pointHoverRadius: 6,
            tension: 0.3,
            spanGaps: false,
            order: 2,
          },
          {
            label: 'Targets',
            data: tgtPts,
            pointBackgroundColor: tgtColors,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: tgtSizes,
            pointHoverRadius: 8,
            showLine: false,
            borderWidth: 0,
            order: 1,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 150 },
        layout: { padding: { bottom: 10 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: ctx => {
                const i = ctx[0].dataIndex
                if (i === 0) return `Base  ${fmt(baseDate)} ${baseDate.getFullYear()}`
                const d = weekToDate(baseDate, i)
                return `${fmt(d)} ${d.getFullYear()}`
              },
              label: ctx => {
                if (ctx.datasetIndex === 0 && ctx.raw != null)
                  return `Close: $${ctx.raw.toFixed(2)}`
                if (ctx.datasetIndex === 1 && ctx.raw != null) {
                  const t = vis.find(x => x.week === ctx.dataIndex)
                  if (t) {
                    const diff = ((t.price - base) / base * 100)
                    return `${t.label} target: $${t.price.toFixed(2)} (${diff > 0 ? '+' : ''}${diff.toFixed(1)}%)`
                  }
                }
                return null
              },
              filter: item => item.raw != null
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 10 },
              color: ctx => {
                const t = vis.find(x => x.week === ctx.index)
                return t ? t.color : '#888'
              },
              maxRotation: 45,
              minRotation: 45,
              autoSkip: false,
            }
          },
          y: {
            min: yMin,
            max: yMax,
            grid: { color: 'rgba(128,128,128,0.1)' },
            ticks: { font: { size: 11 }, color: '#888', callback: v => `$${v}` }
          }
        }
      }
    })
  }, [loaded, data, base, baseDate, targets, maxWeek])

  useEffect(() => {
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null } }
  }, [])

  const lastPrice  = data.length > 0 ? parseFloat(data[data.length - 1].close_price) : base
  const change     = ((lastPrice - base) / base * 100)
  const TrendIcon  = change > 1 ? TrendingUp : change < -1 ? TrendingDown : Minus
  const trendColor = change > 1 ? 'text-green-600' : change < -1 ? 'text-red-500' : 'text-muted-foreground'

  const sliderDate = weekToDate(baseDate, maxWeek)
  const sliderLabel = `${fmt(sliderDate)} ${sliderDate.getFullYear()}`

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <TrendingUp size={13} /> Chart
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="bg-card border border-border rounded-xl w-full max-w-[720px] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-bold">{stock.t.replace(/\.(US|DE|AS|PA|L|MC)$/i, '')}</span>
                  <span className="text-sm text-muted-foreground">{stock.co}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap text-xs">
                  <span className="text-muted-foreground">
                    Base <span className="font-mono font-medium text-foreground">${base.toFixed(2)}</span>
                  </span>
                  {loaded && data.length > 0 && (
                    <span className={cn('flex items-center gap-1 font-semibold', trendColor)}>
                      <TrendIcon size={11} />{change > 0 ? '+' : ''}{change.toFixed(1)}% since base
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {data.length} week{data.length !== 1 ? 's' : ''} of data
                  </span>
                </div>
              </div>
              <button
                className="text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer p-1 rounded-md"
                onClick={handleClose}
              >
                <X size={16} />
              </button>
            </div>

            {/* Target pills */}
            <div className="flex items-center gap-1.5 px-5 py-2 border-b border-border bg-muted/30 flex-wrap">
              <span className="text-[10px] text-muted-foreground mr-1">Targets:</span>
              {targets.map(t => {
                const d    = weekToDate(baseDate, t.week)
                const diff = ((t.price - base) / base * 100)
                return (
                  <span
                    key={t.label}
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border whitespace-nowrap"
                    style={{ borderColor: t.color, color: t.color }}
                  >
                    {t.label} {fmt(d)} ${t.price.toFixed(0)} ({diff > 0 ? '+' : ''}{diff.toFixed(0)}%)
                  </span>
                )
              })}
            </div>

            {/* Chart */}
            <div className="px-5 pt-4 pb-2">
              {loading && (
                <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground gap-2">
                  <div className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin" />
                  Loading…
                </div>
              )}
              {error && (
                <div className="flex items-center justify-center h-[280px] text-sm text-destructive">
                  ⚠ {error}
                </div>
              )}
              {loaded && data.length === 0 && (
                <div className="flex flex-col items-center justify-center h-[280px] gap-2 text-muted-foreground">
                  <TrendingUp size={28} className="opacity-30" />
                  <p className="text-sm">No weekly data yet</p>
                  <p className="text-xs">Cron runs every Saturday at 10:00 UTC</p>
                </div>
              )}
              {loaded && data.length > 0 && (
                <div>
                  <div style={{ position: 'relative', height: '260px' }}>
                    <canvas ref={canvasRef} role="img" aria-label={`Weekly price chart for ${stock.t}`} />
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-[11px] text-muted-foreground shrink-0">Zoom:</span>
                    <input
                      type="range" min="4" max="52" step="4" defaultValue={52}
                      onChange={e => setMaxWeek(parseInt(e.target.value))}
                      className="flex-1 cursor-pointer"
                      style={{ accentColor: LINE_COLOR }}
                    />
                    <span className="text-[11px] font-mono text-foreground min-w-[72px] text-right">
                      {sliderLabel}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-muted/20">
              <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 h-0.5 rounded" style={{ background: LINE_COLOR }} />
                  Weekly close
                </span>
                {targets.map(t => (
                  <span key={t.label} className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: t.color }} />
                    <span style={{ color: t.color }}>{t.label}</span>
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">Esc to close</span>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
