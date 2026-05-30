import { useState, useEffect, useRef, useCallback } from 'react'
import { loadWeeklyPrices } from '../services/storage.js'

const HORIZON_WEEKS = { '1M': 4, '3M': 13, '6M': 26, '12M': 52 }

export default function PriceChart({ stock, batchId }) {
  const [open,    setOpen]    = useState(false)
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded,  setLoaded]  = useState(false)
  const [error,   setError]   = useState(null)
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  const basePrice = stock.b
  const targets = [
    { label: '1M',  week: HORIZON_WEEKS['1M'],  price: stock.t1 },
    { label: '3M',  week: HORIZON_WEEKS['3M'],  price: stock.t3 },
    { label: '6M',  week: HORIZON_WEEKS['6M'],  price: stock.t6 },
    { label: '12M', week: HORIZON_WEEKS['12M'], price: stock.t12 },
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
    } catch {
      setError('Could not load chart data')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = useCallback(() => {
    setOpen(false)
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, handleClose])

  // Build chart when modal opens and data is ready
  useEffect(() => {
    if (!open || !loaded || !canvasRef.current) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }

    const closeData = Array(53).fill(null)
    closeData[0] = basePrice
    data.forEach(row => {
      if (row.week >= 1 && row.week <= 52)
        closeData[row.week] = parseFloat(row.close_price)
    })

    const labels = Array.from({ length: 53 }, (_, i) =>
      i === 0 ? 'Base' : i % 13 === 0 ? `W${i}` : i % 4 === 0 ? `${i}` : ''
    )

    const allPrices = closeData.filter(Boolean).concat(targets.map(t => t.price))
    const yMin = Math.floor(Math.min(...allPrices) * 0.93)
    const yMax = Math.ceil(Math.max(...allPrices) * 1.07)

    const isDark = matchMedia('(prefers-color-scheme: dark)').matches
    const gridColor   = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
    const axisColor   = isDark ? '#666' : '#bbb'
    const tooltipBg   = isDark ? '#1c1c1c' : '#fff'
    const tooltipBord = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'

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
          ctx.fillStyle = '#E24B4A'
          ctx.strokeStyle = isDark ? '#1c1c1c' : '#fff'
          ctx.lineWidth = 1.5
          ctx.fill(); ctx.stroke()
          ctx.fillStyle = '#E24B4A'
          ctx.font = '500 10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(t.label, xp, yp - 10)
          ctx.restore()
        })
      }
    }

    // eslint-disable-next-line no-undef
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      plugins: [targetPlugin],
      data: {
        labels,
        datasets: [{
          label: 'Weekly close',
          data: closeData,
          borderColor: '#6EA8D8',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: (ctx) => (ctx.dataIndex === 0 || (closeData[ctx.dataIndex] !== null && closeData[ctx.dataIndex + 1] === null)) ? 4 : 0,
          pointBackgroundColor: '#6EA8D8',
          pointBorderWidth: 0,
          spanGaps: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBg,
            borderColor: tooltipBord,
            borderWidth: 1,
            titleColor: isDark ? '#eee' : '#111',
            bodyColor: isDark ? '#aaa' : '#666',
            padding: 10,
            callbacks: {
              title: (items) => `Week ${items[0].dataIndex}`,
              label: (item) => item.raw != null ? ` Close: $${item.raw.toFixed(2)}` : null,
              afterLabel: (item) => {
                const t = targets.find(t => t.week === item.dataIndex)
                return t ? ` ${t.label} target: $${t.price.toFixed(2)}` : null
              },
              filter: (item) => item.raw != null,
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor, drawTicks: false },
            ticks: { color: axisColor, font: { size: 11 }, maxRotation: 0, autoSkip: false },
            border: { display: false }
          },
          y: {
            min: yMin, max: yMax,
            grid: { color: gridColor, drawTicks: false },
            ticks: { color: axisColor, font: { size: 11 }, callback: v => `$${v}` },
            border: { display: false }
          }
        }
      }
    })
  }, [open, loaded, data])

  const btn = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
    fontFamily: 'inherit', cursor: 'pointer',
    border: '1px solid var(--tw-border)', background: 'var(--tw-card)',
    color: 'var(--tw-muted-fg)',
  }

  return (
    <>
      {/* Trigger button */}
      <button style={btn} onClick={handleOpen} disabled={loading}>
        📈 Price chart
      </button>

      {/* Modal */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(2px)' }}
          onClick={handleClose}
        >
              <div
                style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 'var(--radius-lg)', maxWidth: 680, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--tw-border)' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tw-fg)' }}>{stock.t.split('.')[0]} — {stock.co}</div>
                    <div style={{ fontSize: 12, color: 'var(--tw-muted-fg)', marginTop: 2 }}>
                      Base ${basePrice.toFixed(2)} · {data.length} week{data.length !== 1 ? 's' : ''} of data · updated every Saturday
                    </div>
                  </div>
                  <button
                    style={{ fontSize: 18, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--tw-muted-fg)', padding: '2px 6px', borderRadius: 6, fontFamily: 'inherit' }}
                    onClick={handleClose}
                  >✕</button>
                </div>

                {/* Body */}
                <div style={{ padding: '16px 18px' }}>
                  {/* Legend + targets */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--tw-muted-fg)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 16, height: 2, background: '#6EA8D8', display: 'inline-block', borderRadius: 1 }} />
                        Weekly close
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E24B4A', display: 'inline-block' }} />
                        Target
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {targets.map(t => (
                        <span key={t.label} style={{ fontSize: 11, borderRadius: 20, padding: '2px 8px', background: 'var(--tw-muted)', color: '#E24B4A', fontWeight: 500 }}>
                          {t.label} ${t.price.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Loading */}
                  {loading && (
                    <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: 'var(--tw-muted-fg)' }}>
                      Loading chart data…
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div style={{ fontSize: 12, color: '#dc2626', padding: '8px 0' }}>⚠ {error}</div>
                  )}

                  {/* Chart canvas */}
                  {loaded && (
                    <>
                      <div style={{ position: 'relative', width: '100%', height: 260 }}>
                        <canvas ref={canvasRef} role="img" aria-label={`${stock.t} weekly price chart`} />
                      </div>
                      {data.length === 0 && (
                        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--tw-muted-fg)', marginTop: 8 }}>
                          No weekly data yet — cron runs every Saturday at 10:00 UTC
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ fontSize: 11, color: 'var(--tw-muted-fg)', marginTop: 10, textAlign: 'center' }}>
                    Press Esc or click outside to close
                  </div>
                </div>
              </div>
        </div>
      )}
    </>
  )
}
