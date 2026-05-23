import { useEffect, useRef, useState } from 'react'

const HORIZONS = ['1M', '3M', '6M', '12M']
const H_COLORS = {
  light: ['#4f46e5', '#0ea5e9', '#16a34a', '#d97706'],
  dark:  ['#8ba4f8', '#38bdf8', '#34d399', '#fbbf24'],
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AccuracyChart({ stats, history, loading, saving, log, configured, onLoad, onSave, onLoadBatch, onDeleteBatch }) {
  const [activeHorizons, setActiveHorizons] = useState(['1M','3M','6M','12M'])
  const [loadingBatch,   setLoadingBatch]   = useState(null)
  const [deletingBatch,  setDeletingBatch]  = useState(null)
  const [confirmDelete,  setConfirmDelete]  = useState(null)

  const toggleHorizon = (h) => {
    setActiveHorizons(prev => {
      if (prev.includes(h)) {
        if (prev.length === 1) return prev
        return prev.filter(x => x !== h)
      }
      return [...prev, h]
    })
  }

  const handleLoadBatch = (batch) => {
    setLoadingBatch(batch.id)
    onLoadBatch(batch)
    setTimeout(() => setLoadingBatch(null), 1200)
  }

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

  if (!configured) {
    return (
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'24px', marginBottom:16, boxShadow:'var(--shadow)', textAlign:'center' }}>
        <div style={{ fontSize:'var(--fs-sm)', fontWeight:700, color:'var(--text)', marginBottom:8 }}>📊 Accuracy tracking not configured</div>
        <div style={{ fontSize:'var(--fs-xs)', color:'var(--text-3)', lineHeight:1.7 }}>
          Add <code style={{ background:'var(--surface2)', padding:'1px 5px', borderRadius:4, color:'var(--accent)' }}>VITE_GITHUB_TOKEN</code> and{' '}
          <code style={{ background:'var(--surface2)', padding:'1px 5px', borderRadius:4, color:'var(--accent)' }}>VITE_GITHUB_REPO</code> to your <code style={{ background:'var(--surface2)', padding:'1px 5px', borderRadius:4 }}>.env</code> file.
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom:16 }}>

      {/* Header bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>
          📊 Accuracy tracking
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {log && <span style={{ fontSize:'var(--fs-xxs)', color:'var(--text-3)', fontFamily:'monospace' }}>{log}</span>}
          {(loading || saving) && <Spinner />}
          <button
            style={btnStyle('neutral')}
            onClick={onLoad}
            disabled={loading}
          >
            ↓ Load history
          </button>
          <button
            style={btnStyle('green')}
            onClick={onSave}
            disabled={saving || loading}
          >
            ↑ Save batch results
          </button>
        </div>
      </div>

      {/* Not loaded yet */}
      {!stats && !loading && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'20px', textAlign:'center', boxShadow:'var(--shadow)' }}>
          <div style={{ fontSize:'var(--fs-sm)', color:'var(--text-3)' }}>Click "Load history" to fetch accuracy data from GitHub</div>
        </div>
      )}

      {stats && <>

        {/* KPI Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:14 }}>
          <KpiCard label="Total evaluated" value={stats.evaluated}      color="var(--text)"   sub="predictions" />
          <KpiCard label="Overall HIT rate" value={stats.overallRate != null ? stats.overallRate + '%' : '--'} color="var(--green)" sub={`${stats.byHorizon.reduce((a,h)=>a+h.hit,0)} reached`} />
          <KpiCard label="Best horizon"  value={stats.bestH?.horizon  ?? '--'} color="var(--accent)" sub={stats.bestH  ? stats.bestH.hitRate  + '% hit rate' : ''} />
          <KpiCard label="Worst horizon" value={stats.worstH?.horizon ?? '--'} color="var(--red)"    sub={stats.worstH ? stats.worstH.hitRate + '% hit rate' : ''} />
          <KpiCard label="Batches tracked" value={stats.totalBatches}  color="var(--text)"   sub="saved batches" />
        </div>

        {/* Line chart */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden', boxShadow:'var(--shadow)', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--border)', flexWrap:'wrap', gap:8 }}>
            <div>
              <div style={{ fontSize:'var(--fs-sm)', fontWeight:700, color:'var(--text)' }}>HIT rate by horizon over time</div>
              <div style={{ fontSize:'var(--fs-xxs)', color:'var(--text-3)', marginTop:2 }}>% of predictions that reached target price on expiry date</div>
            </div>
            <Legend activeHorizons={activeHorizons} onToggle={toggleHorizon} />
          </div>
          <div style={{ padding:'16px' }}>
            <Chart chartData={stats.chartData} chartLabels={stats.chartLabels} activeHorizons={activeHorizons} />
          </div>
        </div>

        {/* Breakdown by horizon */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden', boxShadow:'var(--shadow)', marginBottom:14 }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontSize:'var(--fs-sm)', fontWeight:700, color:'var(--text)' }}>
            Breakdown by horizon
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'var(--fs-sm)' }}>
              <thead>
                <tr>
                  {['Horizon','Evaluated','HIT','CLOSE','MISS','HIT rate','HIT+CLOSE','Bar'].map(h => (
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:'var(--fs-xs)', fontWeight:700, color:'var(--th-text)', background:'var(--th-bg)', borderBottom:'1.5px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.byHorizon.map((h, i) => (
                  <tr key={h.horizon} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'10px 12px', fontWeight:700, color:H_COLORS.light[i] }}>{h.horizon}</td>
                    <td style={{ padding:'10px 12px', color:'var(--text-2)' }}>{h.total}</td>
                    <td style={{ padding:'10px 12px' }}><VerdictTag type="hit">{h.hit}</VerdictTag></td>
                    <td style={{ padding:'10px 12px' }}><VerdictTag type="close">{h.close}</VerdictTag></td>
                    <td style={{ padding:'10px 12px' }}><VerdictTag type="miss">{h.miss}</VerdictTag></td>
                    <td style={{ padding:'10px 12px', fontWeight:700, color: h.hitRate >= 60 ? 'var(--green)' : h.hitRate >= 40 ? 'var(--amber)' : 'var(--red)' }}>
                      {h.hitRate != null ? h.hitRate + '%' : '--'}
                    </td>
                    <td style={{ padding:'10px 12px', color:'var(--text-2)' }}>
                      {h.hitClose != null ? h.hitClose + '%' : '--'}
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      {h.total > 0 && <AccBar hit={h.hit} close={h.close} miss={h.miss} total={h.total} color={H_COLORS.light[i]} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Batch history */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden', boxShadow:'var(--shadow)' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontSize:'var(--fs-sm)', fontWeight:700, color:'var(--text)' }}>
            Batch history
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'var(--fs-sm)' }}>
              <thead>
                <tr>
                  {['Batch date','Stocks','Evaluated','HIT','CLOSE','MISS','Awaiting','HIT rate','First saved','Last updated','',''].map(h => (
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:'var(--fs-xs)', fontWeight:700, color:'var(--th-text)', background:'var(--th-bg)', borderBottom:'1.5px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.batchSummary.map((b, i) => {
                  const batch    = history.batches.find(x => x.id === b.id)
                  const isLoading = loadingBatch === b.id
                  return (
                    <tr key={b.id} style={{ borderBottom: i < stats.batchSummary.length-1 ? '1px solid var(--border)' : 'none', background: i%2===1?'var(--surface2)':'transparent' }}>
                      <td style={{ padding:'10px 12px', fontWeight:600, color:'var(--text)' }}>{b.date}</td>
                      <td style={{ padding:'10px 12px', color:'var(--text-2)' }}>{b.stocks}</td>
                      <td style={{ padding:'10px 12px', color:'var(--text-2)' }}>{b.evaluated}</td>
                      <td style={{ padding:'10px 12px' }}><VerdictTag type="hit">{b.hit}</VerdictTag></td>
                      <td style={{ padding:'10px 12px' }}><VerdictTag type="close">{b.close}</VerdictTag></td>
                      <td style={{ padding:'10px 12px' }}><VerdictTag type="miss">{b.miss}</VerdictTag></td>
                      <td style={{ padding:'10px 12px' }}><VerdictTag type="await">{b.awaiting}</VerdictTag></td>
                      <td style={{ padding:'10px 12px', fontWeight:700, color: b.hitRate >= 60 ? 'var(--green)' : b.hitRate >= 40 ? 'var(--amber)' : b.hitRate != null ? 'var(--red)' : 'var(--text-3)' }}>
                        {b.hitRate != null ? b.hitRate + '%' : '—'}
                      </td>
                      <td style={{ padding:'10px 12px', fontSize:'var(--fs-xxs)', color:'var(--text-3)' }}>
                        {b.savedAt ? new Date(b.savedAt).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td style={{ padding:'10px 12px', fontSize:'var(--fs-xxs)', color: b.updatedAt && b.updatedAt !== b.savedAt ? 'var(--accent)' : 'var(--text-3)' }}>
                        {b.updatedAt ? new Date(b.updatedAt).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td style={{ padding:'8px 12px' }}>
                        {batch && (
                          <button
                            onClick={() => handleLoadBatch(batch)}
                            disabled={isLoading}
                            style={{ fontSize:'var(--fs-xxs)', padding:'4px 10px', borderRadius:'var(--radius)', cursor:'pointer', fontFamily:'inherit', fontWeight:600, border:'1.5px solid var(--border-blue)', background: isLoading ? 'var(--green-bg)' : 'var(--surface)', color: isLoading ? 'var(--green)' : 'var(--accent)', whiteSpace:'nowrap', transition:'all .2s' }}
                          >
                            {isLoading ? '✓ Loaded' : '↑ Load'}
                          </button>
                        )}
                      </td>
                      <td style={{ padding:'8px 12px' }}>
                        {(() => {
                          const isDeleting = deletingBatch === b.id
                          const isConfirm  = confirmDelete === b.id
                          return (
                            <button
                              onClick={() => handleDeleteBatch(b.id)}
                              disabled={isDeleting}
                              style={{ fontSize:'var(--fs-xxs)', padding:'4px 10px', borderRadius:'var(--radius)', cursor:'pointer', fontFamily:'inherit', fontWeight:600, whiteSpace:'nowrap', transition:'all .2s', border: isConfirm ? '1.5px solid var(--red)' : '1px solid var(--border)', background: isConfirm ? 'var(--red-bg)' : 'transparent', color: isConfirm ? 'var(--red)' : 'var(--text-3)' }}
                            >
                              {isDeleting ? '…' : isConfirm ? '⚠ Confirm' : '🗑 Delete'}
                            </button>
                          )
                        })()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </>}
    </div>
  )
}

// ── Canvas chart ──────────────────────────────────────────────────────────────

function Chart({ chartData, chartLabels, activeHorizons }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !chartData?.length) return
    const ctx = canvas.getContext('2d')
    const W   = canvas.width
    const H   = canvas.height
    const dark = document.getElementById('root')?.dataset?.theme === 'dark'
    const colors    = dark ? H_COLORS.dark : H_COLORS.light
    const textColor = dark ? '#96aece' : '#6b7280'
    const gridColor = dark ? 'rgba(160,195,255,0.12)' : 'rgba(0,0,0,0.07)'
    const dotCenter = dark ? '#2e3f60' : '#ffffff'

    ctx.clearRect(0, 0, W, H)

    const pad = { top:24, right:24, bottom:52, left:48 }
    const cW  = W - pad.left - pad.right
    const cH  = H - pad.top - pad.bottom
    const n   = chartLabels.length
    if (n === 0) return
    const slotW = cW / Math.max(n, 1)

    // Grid + Y labels
    for (let y = 0; y <= 100; y += 25) {
      const yPos = pad.top + cH - (y / 100 * cH)
      ctx.strokeStyle = gridColor
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(pad.left, yPos); ctx.lineTo(W - pad.right, yPos); ctx.stroke()
      ctx.fillStyle = textColor
      ctx.font = '11px system-ui'
      ctx.textAlign = 'right'
      ctx.fillText(y + '%', pad.left - 6, yPos + 4)
    }

    // X labels
    chartLabels.forEach((label, i) => {
      const x = pad.left + i * slotW + slotW / 2
      ctx.fillStyle = textColor
      ctx.font = '11px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(label, x, H - 10)
    })

    // Lines + dots — only for active horizons
    chartData.forEach((points, hi) => {
      const horizonName = HORIZONS[hi]
      const isActive    = activeHorizons.includes(horizonName)
      const color       = colors[hi]

      // Draw inactive as faint dashed line
      ctx.strokeStyle = isActive ? color : (dark ? 'rgba(150,174,206,0.2)' : 'rgba(0,0,0,0.1)')
      ctx.lineWidth   = isActive ? 2.5 : 1
      ctx.setLineDash(isActive ? [] : [4, 4])
      ctx.lineJoin    = 'round'
      ctx.beginPath()
      let started = false
      points.forEach((v, i) => {
        if (v === null) return
        const x = pad.left + i * slotW + slotW / 2
        const y = pad.top + cH - (v / 100 * cH)
        if (!started) { ctx.moveTo(x, y); started = true } else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.setLineDash([])

      // Dots + value labels — only for active
      if (isActive) {
        points.forEach((v, i) => {
          if (v === null) return
          const x = pad.left + i * slotW + slotW / 2
          const y = pad.top + cH - (v / 100 * cH)
          ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.fillStyle = color; ctx.fill()
          ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2); ctx.fillStyle = dotCenter; ctx.fill()
          ctx.fillStyle = color
          ctx.font = 'bold 11px system-ui'
          ctx.textAlign = 'center'
          ctx.fillText(v + '%', x, y - 10)
        })
      }
    })
  }, [chartData, chartLabels, activeHorizons])

  return <canvas ref={canvasRef} width={900} height={300} style={{ width:'100%', height:'auto' }} />
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, color, sub }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'12px 14px', boxShadow:'var(--shadow)' }}>
      <div style={{ fontSize:'var(--fs-xxs)', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:700, color, lineHeight:1.1 }}>{value}</div>
      {sub && <div style={{ fontSize:'var(--fs-xs)', marginTop:3, color:'var(--text-3)' }}>{sub}</div>}
    </div>
  )
}

function VerdictTag({ type, children }) {
  const cfg = {
    hit:   { bg:'var(--green-bg)', color:'var(--green)' },
    close: { bg:'var(--amber-bg)', color:'var(--amber)' },
    miss:  { bg:'var(--red-bg)',   color:'var(--red)'   },
    await: { bg:'var(--surface2)', color:'var(--text-3)' },
  }
  const c = cfg[type] ?? cfg.await
  return <span style={{ display:'inline-block', fontSize:'var(--fs-xxs)', fontWeight:700, padding:'2px 8px', borderRadius:20, background:c.bg, color:c.color }}>{children}</span>
}

function AccBar({ hit, close, miss, total, color }) {
  const hitPct   = Math.round(hit   / total * 100)
  const closePct = Math.round(close / total * 100)
  const missPct  = 100 - hitPct - closePct
  return (
    <div style={{ display:'flex', height:8, borderRadius:4, overflow:'hidden', width:120, background:'var(--surface2)' }}>
      {hitPct   > 0 && <div style={{ width:hitPct   + '%', background:'var(--green)' }} />}
      {closePct > 0 && <div style={{ width:closePct + '%', background:'var(--amber)' }} />}
      {missPct  > 0 && <div style={{ width:missPct  + '%', background:'var(--red)'   }} />}
    </div>
  )
}

function Legend({ activeHorizons, onToggle }) {
  const dark = document.getElementById('root')?.dataset?.theme === 'dark'
  const colors = dark ? H_COLORS.dark : H_COLORS.light
  return (
    <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
      {HORIZONS.map((h, i) => {
        const active = activeHorizons.includes(h)
        const color  = colors[i]
        return (
          <button
            key={h}
            onClick={() => onToggle(h)}
            title={active ? `Hide ${h}` : `Show ${h}`}
            style={{
              display:'flex', alignItems:'center', gap:6,
              fontSize:'var(--fs-xxs)', fontWeight:600,
              padding:'4px 10px', borderRadius:20, cursor:'pointer',
              fontFamily:'inherit', transition:'all .15s',
              border: active ? `1.5px solid ${color}` : '1.5px solid var(--border)',
              background: active ? 'transparent' : 'var(--surface2)',
              color: active ? color : 'var(--text-3)',
              opacity: active ? 1 : 0.5,
            }}
          >
            <div style={{ width:16, height:3, borderRadius:2, background: active ? color : 'var(--text-3)', transition:'background .15s' }} />
            {h}
          </button>
        )
      })}
    </div>
  )
}

function Spinner() {
  return <div style={{ width:12, height:12, border:'1.5px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0 }} />
}

function btnStyle(type) {
  const base = { fontSize:'var(--fs-sm)', padding:'6px 13px', borderRadius:'var(--radius)', cursor:'pointer', fontFamily:'inherit', fontWeight:500 }
  if (type === 'green')   return { ...base, border:'1.5px solid var(--border-green)', background:'var(--green-bg)', color:'var(--green)' }
  if (type === 'blue')    return { ...base, border:'1.5px solid var(--border-blue)',  background:'var(--surface)',  color:'var(--accent)' }
  return { ...base, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)' }
}
