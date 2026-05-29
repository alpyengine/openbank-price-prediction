import { useState, useEffect, useRef } from 'react'
import { loadWeeklyPrices } from '../services/storage.js'

const HORIZON_WEEKS = { '1M': 4, '3M': 13, '6M': 26, '12M': 52 }

export default function PriceChart({ stock, batchId }) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded,  setLoaded]  = useState(false)
  const [error,   setError]   = useState(null)
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  const basePrice = stock.b
  const targets   = [
    { label: '1M', week: HORIZON_WEEKS['1M'],  price: stock.t1 },
    { label: '3M', week: HORIZON_WEEKS['3M'],  price: stock.t3 },
    { label: '6M', week: HORIZON_WEEKS['6M'],  price: stock.t6 },
    { label: '12M', week: HORIZON_WEEKS['12M'], price: stock.t12 },
  ].filter(t => t.price > 0)

  const handleLoad = async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await loadWeeklyPrices(stock.t, batchId)
      setData(rows)
      setLoaded(true)
    } catch (err) {
      setError('Could not load chart data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!loaded || !canvasRef.current) return

    // Destroy previous chart
    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }

    // Build 53 data points (week 0..52)
    const closeData = Array(53).fill(null)
    // Week 0 = base price
    closeData[0] = basePrice
    // Fill from Supabase data
    data.forEach(row => {
      if (row.week >= 1 && row.week <= 52) {
        closeData[row.week] = parseFloat(row.close_price)
      }
    })

    const targetData = Array(53).fill(null)
    targets.forEach(t => { if (t.week <= 52) targetData[t.week] = t.price })

    const labels = Array.from({ length: 53 }, (_, i) =>
      i === 0 ? 'Base' : i % 13 === 0 ? `W${i}` : i % 4 === 0 ? `${i}` : ''
    )

    const allPrices = closeData.filter(Boolean).concat(targets.map(t => t.price))
    const yMin = Math.floor(Math.min(...allPrices) * 0.93)
    const yMax = Math.ceil(Math.max(...allPrices) * 1.07)

    const isDark = matchMedia('(prefers-color-scheme: dark)').matches
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
    const axisColor = isDark ? '#666' : '#bbb'
    const tooltipBg = isDark ? '#1c1c1c' : '#fff'
    const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'

    // Red dot plugin for targets
    const targetPlugin = {
      id: 'targetDots',
      afterDatasetsDraw(chart) {
        const { ctx, scales: { x, y } } = chart
        targets.forEach(t => {
          if (t.week > 52) return
          const xPos = x.getPixelForValue(t.week)
          const yPos = y.getPixelForValue(t.price)
          ctx.save()
          ctx.beginPath()
          ctx.arc(xPos, yPos, 5, 0, Math.PI * 2)
          ctx.fillStyle = '#E24B4A'
          ctx.strokeStyle = isDark ? '#1c1c1c' : '#fff'
          ctx.lineWidth = 1.5
          ctx.fill()
          ctx.stroke()
          ctx.fillStyle = '#E24B4A'
          ctx.font = '500 10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(t.label, xPos, yPos - 10)
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
          pointRadius: (ctx) => (ctx.dataIndex === 0 || closeData[ctx.dataIndex] !== null && closeData[ctx.dataIndex + 1] === null) ? 4 : 2,
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
            borderColor: tooltipBorder,
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

    return () => {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    }
  }, [loaded, data])

  const btnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
    fontFamily: 'inherit', cursor: loading ? 'default' : 'pointer',
    border: '1px solid var(--tw-border)', background: 'var(--tw-card)',
    color: 'var(--tw-muted-fg)', transition: 'opacity .15s',
    opacity: loading ? 0.65 : 1,
  }

  return (
    <div style={{ marginTop: 16 }}>
      {/* Load button */}
      {!loaded && (
        <button style={btnStyle} onClick={handleLoad} disabled={loading}>
          📈 {loading ? 'Loading chart…' : 'Price chart'}
        </button>
      )}

      {error && (
        <div style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>⚠ {error}</div>
      )}

      {/* Chart */}
      {loaded && (
        <div style={{ marginTop: 12 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
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
            <div style={{ display: 'flex', gap: 6 }}>
              {targets.map(t => (
                <span key={t.label} style={{
                  fontSize: 11, borderRadius: 20, padding: '2px 8px',
                  background: 'var(--tw-muted)', color: '#E24B4A', fontWeight: 500
                }}>
                  {t.label} ${t.price.toFixed(2)}
                </span>
              ))}
            </div>
          </div>

          {/* Data status */}
          <div style={{ fontSize: 11, color: 'var(--tw-muted-fg)', marginBottom: 8 }}>
            Base ${ basePrice.toFixed(2)} · {data.length} week{data.length !== 1 ? 's' : ''} of data · updated every Saturday
          </div>

          {/* Canvas */}
          <div style={{ position: 'relative', width: '100%', height: 220 }}>
            <canvas ref={canvasRef} role="img" aria-label={`${stock.t} weekly price chart`} />
          </div>

          {/* No data message */}
          {data.length === 0 && (
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--tw-muted-fg)', marginTop: 8 }}>
              No weekly data yet — cron runs every Saturday at 10:00 UTC
            </div>
          )}
        </div>
      )}
    </div>
  )
}
