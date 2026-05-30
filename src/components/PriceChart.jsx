/**
 * PriceChart
 *
 * Weekly price chart modal for a single stock.
 * Opens as an overlay when the user clicks "📈 Price chart" in the StockRow panel.
 *
 * Data source: Supabase weekly_prices table (populated by pg_cron every Saturday).
 * Chart library: Chart.js (loaded via CDN in index.html).
 *
 * Chart content:
 *   - Week 0 = base price (from batch)
 *   - Weeks 1..N = weekly closing prices from Supabase
 *   - 4 red dots at weeks 4/13/26/52 = 1M/3M/6M/12M forecast targets
 *   - Blue line connecting weekly closes, smooth tension=0.4
 *
 * Modal behaviour:
 *   - Opens on button click, loads data on first open only (cached)
 *   - Closes on ✕ button, Escape key, or backdrop click
 *
 * @param {Object} stock   — stock object with ticker, base price and targets
 * @param {string} batchId — Supabase batch id (e.g. "2026-03-17")
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { loadWeeklyPrices } from '@/services/storage.js'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

/** Week number for each forecast horizon */
const HORIZON_WEEKS = { '1M': 4, '3M': 13, '6M': 26, '12M': 52 }

// ── Main component ────────────────────────────────────────────────────────────

export default function PriceChart({ stock, batchId }) {
  const [open,    setOpen]    = useState(false)
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded,  setLoaded]  = useState(false)
  const [error,   setError]   = useState(null)
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  const basePrice = stock.b

  // Build target array from stock props — filter out zero/missing targets
  const targets = [
    { label: '1M',  week: HORIZON_WEEKS['1M'],  price: stock.t1  },
    { label: '3M',  week: HORIZON_WEEKS['3M'],  price: stock.t3  },
    { label: '6M',  week: HORIZON_WEEKS['6M'],  price: stock.t6  },
    { label: '12M', week: HORIZON_WEEKS['12M'], price: stock.t12 },
  ].filter(t => t.price > 0)

  // ── Data loading ────────────────────────────────────────────────────────────

  /**
   * Opens the modal and loads weekly price data from Supabase.
   * Data is cached in state — subsequent opens don't re-fetch.
   */
  const handleOpen = async () => {
    setOpen(true)
    if (loaded) return   // Already loaded — skip fetch
    setLoading(true)
    setError(null)
    try {
      const rows = await loadWeeklyPrices(stock.t, batchId)
      setData(rows)
      setLoaded(true)
    } catch {
      setError('Could not load chart data')
    } finally {
      setLoading(false)
    }
  }

  /** Closes the modal and destroys the Chart.js instance */
  const handleClose = useCallback(() => {
    setOpen(false)
    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }
  }, [])

  // ── Keyboard handler ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, handleClose])

  // ── Chart.js rendering ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!open || !loaded || !canvasRef.current) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }

    // Build data arrays — week 0 = base price, weeks 1-52 from Supabase
    const closeData = Array(53).fill(null)
    closeData[0] = basePrice
    data.forEach(row => {
      if (row.week >= 1 && row.week <= 52)
        closeData[row.week] = parseFloat(row.close_price)
    })

    // X-axis labels — show every 4 weeks, label every 13
    const labels = Array.from({ length: 53 }, (_, i) =>
      i === 0 ? 'Base' : i % 13 === 0 ? `W${i}` : i % 4 === 0 ? `${i}` : ''
    )

    // Y-axis range with padding
    const allPrices = closeData.filter(Boolean).concat(targets.map(t => t.price))
    const yMin = Math.floor(Math.min(...allPrices) * 0.93)
    const yMax = Math.ceil(Math.max(...allPrices) * 1.07)

    // Detect dark mode for chart colors
    const isDark    = matchMedia('(prefers-color-scheme: dark)').matches
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
    const axisColor = isDark ? '#666' : '#bbb'
    const tooltipBg = isDark ? '#1c1c1c' : '#fff'
    const tooltipBo = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'

    /**
     * Custom Chart.js plugin — draws red target dots with labels.
     * These are drawn on top of the dataset as canvas 2D elements.
     */
    const targetPlugin = {
      id: 'targetDots',
      afterDatasetsDraw(chart) {
        const { ctx, scales: { x, y } } = chart
        targets.forEach(t => {
          if (t.week > 52) return
          const xp = x.getPixelForValue(t.week)
          const yp = y.getPixelForValue(t.price)
          ctx.save()
          ctx.beginPath()
          ctx.arc(xp, yp, 5, 0, Math.PI * 2)
          ctx.fillStyle   = '#E24B4A'
          ctx.strokeStyle = isDark ? '#1c1c1c' : '#fff'
          ctx.lineWidth   = 1.5
          ctx.fill(); ctx.stroke()
          ctx.fillStyle  = '#E24B4A'
          ctx.font       = '500 10px sans-serif'
          ctx.textAlign  = 'center'
          ctx.fillText(t.label, xp, yp - 10)
          ctx.restore()
        })
      },
    }

    // eslint-disable-next-line no-undef
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      plugins: [targetPlugin],
      data: {
        labels,
        datasets: [{
          label:              'Weekly close',
          data:               closeData,
          borderColor:        '#6EA8D8',
          backgroundColor:    'transparent',
          borderWidth:        2,
          tension:            0.4,           // smooth curve
          // Show dot only at base (index 0) and the most recent data point
          pointRadius:        (ctx) => (ctx.dataIndex === 0 || (closeData[ctx.dataIndex] !== null && closeData[ctx.dataIndex + 1] === null)) ? 4 : 0,
          pointBackgroundColor: '#6EA8D8',
          pointBorderWidth:   0,
          spanGaps:           false,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBg,
            borderColor:     tooltipBo,
            borderWidth:     1,
            titleColor:      isDark ? '#eee' : '#111',
            bodyColor:       isDark ? '#aaa' : '#666',
            padding:         10,
            callbacks: {
              title:       (items) => `Week ${items[0].dataIndex}`,
              label:       (item)  => item.raw != null ? ` Close: $${item.raw.toFixed(2)}` : null,
              afterLabel:  (item)  => {
                const t = targets.find(t => t.week === item.dataIndex)
                return t ? ` ${t.label} target: $${t.price.toFixed(2)}` : null
              },
              filter: (item) => item.raw != null,
            },
          },
        },
        scales: {
          x: {
            grid:   { color: gridColor, drawTicks: false },
            ticks:  { color: axisColor, font: { size: 11 }, maxRotation: 0, autoSkip: false },
            border: { display: false },
          },
          y: {
            min:    yMin,
            max:    yMax,
            grid:   { color: gridColor, drawTicks: false },
            ticks:  { color: axisColor, font: { size: 11 }, callback: v => `$${v}` },
            border: { display: false },
          },
        },
      },
    })
  }, [open, loaded, data])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Trigger button */}
      <Button variant="outline" size="sm" onClick={handleOpen} disabled={loading}>
        📈 Price chart
      </Button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-5 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        >
          {/* Modal panel — stopPropagation prevents backdrop click from firing */}
          <div
            className="bg-card border border-border rounded-lg w-full max-w-[680px] max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4.5 py-3.5 border-b border-border">
              <div>
                <div className="text-[15px] font-bold">
                  {stock.t.split('.')[0]} — {stock.co}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Base ${basePrice.toFixed(2)} · {data.length} week{data.length !== 1 ? 's' : ''} of data · updated every Saturday
                </div>
              </div>
              <button
                className="text-lg text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors bg-transparent border-none cursor-pointer"
                onClick={handleClose}
                aria-label="Close chart"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              {/* Legend + target pills */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-3.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-4 h-0.5 bg-[#6EA8D8] rounded" />
                    Weekly close
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E24B4A]" />
                    Target
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {targets.map(t => (
                    <span
                      key={t.label}
                      className="text-[11px] rounded-full px-2 py-0.5 bg-muted text-[#E24B4A] font-medium"
                    >
                      {t.label} ${t.price.toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Loading state */}
              {loading && (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  Loading chart data…
                </div>
              )}

              {/* Error state */}
              {error && (
                <p className="text-xs text-destructive py-2">⚠ {error}</p>
              )}

              {/* Chart canvas — inline height required by Chart.js */}
              {loaded && (
                <>
                  <div className="relative w-full" style={{ height: 260 }}>
                    <canvas
                      ref={canvasRef}
                      role="img"
                      aria-label={`${stock.t} weekly price chart`}
                    />
                  </div>
                  {data.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      No weekly data yet — cron runs every Saturday at 10:00 UTC
                    </p>
                  )}
                </>
              )}

              <p className="text-[11px] text-muted-foreground text-center mt-2.5">
                Press Esc or click outside to close
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
