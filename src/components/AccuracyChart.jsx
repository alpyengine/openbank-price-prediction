import { useState } from 'react'
import { BarChart2, Target, CheckCircle, Clock, Download, RefreshCw, Trash2 } from 'lucide-react'

const HORIZONS = ['1M', '3M', '6M', '12M']
const H_COLORS = ['#16a34a', '#3b82f6', '#d97706', '#8b5cf6']

export default function AccuracyChart({ stats, history: batches, loading, log, configured, onLoad, onLoadBatch, onDeleteBatch, hitMargin = 5, onMarginChange }) {
  const [loadingBatch,  setLoadingBatch]  = useState(null)
  const [downloadedBatch, setDownloadedBatch] = useState(null)
  const [deletingBatch, setDeletingBatch] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleLoadBatch = (batch) => {
    // batch from batchSummary may not have results — find full batch from history
    const fullBatch = batches?.find(b => b.id === batch.id) ?? batch
    setLoadingBatch(batch.id)
    onLoadBatch(fullBatch)
    setTimeout(() => setLoadingBatch(null), 600)
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

  const handleExportCSV = (batch) => {
    // batch from batchSummary may not have results — find full batch from history
    const fullBatch = batches?.find(b => b.id === batch.id) ?? batch
    if (!fullBatch.results?.length) return
    const seen = new Set(), tickers = []
    for (const r of fullBatch.results) { if (!seen.has(r.ticker)) { seen.add(r.ticker); tickers.push(r.ticker) } }
    const rows = ['Ticker,Company,Currency,BasePrice,1M,3M,6M,12M,Date']
    for (const ticker of tickers) {
      const res = fullBatch.results.filter(r => r.ticker === ticker)
      const get = (h) => res.find(r => r.horizon === h)?.targetPrice ?? ''
      const base = res[0]; if (!base) continue
      const suffix = ticker.split('.').pop().toUpperCase()
      const cu = ['DE','AS','PA','MC'].includes(suffix)?'EUR':suffix==='L'?'GBP':'USD'
      rows.push([ticker, base.company, cu, base.basePrice, get('1M'), get('3M'), get('6M'), get('12M'), fullBatch.date].join(','))
    }
    const blob = new Blob([rows.join('\n')], { type:'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Openbank_${fullBatch.date.split('/').reverse().join('')}.csv`; a.click()
    URL.revokeObjectURL(url)
    // Brief visual feedback
    setDownloadedBatch(batch.id)
    setTimeout(() => setDownloadedBatch(null), 1500)
  }

  const card = { background:'var(--tw-card)', border:'1px solid var(--tw-border)', borderRadius:10, boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }
  const btn = (variant) => ({
    display:'inline-flex', alignItems:'center', gap:5,
    fontSize:12, padding:'6px 12px', borderRadius:8,
    cursor:'pointer', fontFamily:'inherit', fontWeight:500,
    transition:'background .15s',
    ...(variant==='green' ? { border:'1px solid #16a34a', background:'#16a34a', color:'#fff' }
      : { border:'1px solid var(--tw-border)', background:'var(--tw-card)', color:'var(--tw-muted-fg)' })
  })

  // Action bar — Slider + Load + Save buttons
  const ActionBar = () => (
    <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginBottom:'1.5rem', flexWrap:'wrap', alignItems:'center' }}>
      {log && <span style={{ fontSize:11, color:'var(--tw-muted-fg)', fontFamily:'monospace', flex:1 }}>{log}</span>}
      {loading && <div style={{ width:14, height:14, border:'2px solid var(--tw-border)', borderTopColor:'var(--tw-primary)', borderRadius:'50%', animation:'spin .7s linear infinite' }} />}
      {/* Hit margin slider */}
      <div style={{ display:'flex', alignItems:'center', gap:7, background:'var(--tw-card)', border:'1px solid var(--tw-border)', borderRadius:8, padding:'5px 12px' }}>
        <span style={{ fontSize:11, color:'var(--tw-muted-fg)', fontWeight:500, whiteSpace:'nowrap' }}>Hit margin</span>
        <input
          type="range" min="1" max="20" value={hitMargin}
          onChange={e => onMarginChange && onMarginChange(parseInt(e.target.value))}
          style={{ width:80, accentColor:'#16a34a', cursor:'pointer' }}
        />
        <span style={{ fontSize:12, fontWeight:700, color:'var(--tw-fg)', minWidth:32, textAlign:'center' }}>±{hitMargin}%</span>
      </div>
      <button style={btn('neutral')} onClick={onLoad} disabled={loading}>
        <RefreshCw size={13} /> Refresh
      </button>

    </div>
  )

  if (!configured) return (
    <div>
      <ActionBar />
      <div style={{ ...card, padding:24, textAlign:'center' }}>
        <BarChart2 size={32} color="var(--tw-muted-fg)" style={{ margin:'0 auto 12px' }} />
        <div style={{ fontSize:14, fontWeight:600, color:'var(--tw-fg)', marginBottom:6 }}>Accuracy tracking not configured</div>
        <div style={{ fontSize:13, color:'var(--tw-muted-fg)' }}>Add Supabase credentials to your .env file to enable history tracking.</div>
      </div>
    </div>
  )

  if (!stats && !loading) return (
    <div>
      <ActionBar />
      <div style={{ ...card, padding:32, textAlign:'center' }}>
        <BarChart2 size={32} color="var(--tw-muted-fg)" style={{ margin:'0 auto 12px' }} />
        <div style={{ fontSize:14, fontWeight:600, color:'var(--tw-fg)', marginBottom:6 }}>No history loaded</div>
        <div style={{ fontSize:13, color:'var(--tw-muted-fg)', marginBottom:16 }}>Click "Load history" to fetch accuracy data from Supabase.</div>
        <button style={btn('neutral')} onClick={onLoad}><RefreshCw size={13} /> Refresh</button>
      </div>
    </div>
  )

  const overallHits   = stats?.byHorizon.reduce((a,h)=>a+h.hit,0) ?? 0
  const overallMiss   = stats?.byHorizon.reduce((a,h)=>a+h.miss,0) ?? 0
  const overallAwait  = stats?.totalAwaiting ?? 0
  const uniqueTickers = stats?.uniqueTickers ?? 0

  return (
    <div>
      <ActionBar />

      {stats && <>
        {/* KPI cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:'1.5rem' }}>
          {[
            { label:'Overall hit rate', value: stats.overallRate!=null ? stats.overallRate+'%' : '--', icon:Target, sub:`${overallHits} hits · ${stats.evaluated} evaluated`, subColor:'#16a34a', sub2:`${uniqueTickers} tickers · ${stats.totalBatches} batches` },
            { label:'Total hits',       value: overallHits,   icon:CheckCircle, sub:`Out of ${stats.evaluated} evaluated` },
            { label:'Total misses',     value: overallMiss,   icon:BarChart2,   sub:`Out of ${stats.evaluated} evaluated` },
            { label:'Awaiting',         value: overallAwait,  icon:Clock,       sub:'Predictions pending maturity' },
          ].map((item) => { const { label, value, icon:Icon, sub, subColor } = item; return (
            <div key={label} style={{ ...card, padding:'20px 20px 18px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:13, color:'var(--tw-muted-fg)', fontWeight:500 }}>{label}</span>
                <div style={{ width:28, height:28, borderRadius:6, background:'var(--tw-muted)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={14} color="var(--tw-muted-fg)" />
                </div>
              </div>
              <div style={{ fontSize:28, fontWeight:700, color:'var(--tw-fg)', lineHeight:1.1 }}>{value}</div>
              {sub && <div style={{ fontSize:12, marginTop:4, fontWeight:500, color: subColor||'var(--tw-muted-fg)' }}>{sub}</div>}
              {item.sub2 && <div style={{ fontSize:11, marginTop:2, color:'var(--tw-muted-fg)' }}>{item.sub2}</div>}
            </div>
          )})
        }
        </div>

        {/* Horizon hit rate cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:'1.5rem' }}>
          {stats.byHorizon.map((h, i) => {
            const pct = h.hitRate ?? 0
            return (
              <div key={h.horizon} style={{ ...card, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:12, color:'var(--tw-muted-fg)', fontWeight:500 }}>{h.horizon} horizon</span>
                  <span style={{ fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:20, background:['#dcfce7','#dbeafe','#ffedd5','#f3e8ff'][i], color:['#15803d','#1d4ed8','#c2410c','#7c3aed'][i] }}>{pct}%</span>
                </div>
                <div style={{ width:'100%', height:5, borderRadius:3, background:'var(--tw-muted)', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:3, background:H_COLORS[i], width:`${pct}%`, transition:'width .4s' }} />
                </div>
                <div style={{ marginTop:6, fontSize:11, color:'var(--tw-muted-fg)' }}>{h.hit} hit · {h.miss} miss · {h.total} total</div>
              </div>
            )
          })}
        </div>

        {/* Accuracy trend area chart */}
        <div style={{ ...card, marginBottom:'1.5rem', overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--tw-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--tw-fg)' }}>Prediction Accuracy Over Time</div>
              <div style={{ fontSize:12, color:'var(--tw-muted-fg)', marginTop:2 }}>Historical accuracy as batches mature</div>
            </div>
            {stats.overallRate != null && (
              <span style={{ fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:8, background:'var(--tw-muted)', color:'var(--tw-muted-fg)' }}>
                {stats.overallRate >= (stats.chartData?.[0]?.[0] ?? stats.overallRate) ? '+' : ''}{stats.overallRate}% overall
              </span>
            )}
          </div>
          <div style={{ padding:16 }}>
            <AreaChart chartData={stats.chartData} chartLabels={stats.chartLabels} />
          </div>
        </div>

        {/* Batch history table */}
        <div style={{ ...card, overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--tw-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--tw-fg)' }}>Historical batches</div>
            <span style={{ fontSize:12, color:'var(--tw-muted-fg)' }}>{batches?.length ?? 0} batches saved</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--tw-muted)', borderBottom:'1px solid var(--tw-border)' }}>
                  {['Date','Stocks','Hit rate','Hits','Misses','Awaiting','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:500, color:'var(--tw-muted-fg)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(!batches||batches.length===0) && (
                  <tr><td colSpan={7} style={{ padding:'24px', textAlign:'center', color:'var(--tw-muted-fg)', fontSize:13 }}>No batches saved yet</td></tr>
                )}
                {(stats?.batchSummary ?? batches)?.map(batch => {
                  const hits    = batch.hit ?? batch.results?.filter(r=>r.verdict==='hit').length ?? 0
                  const miss    = batch.miss ?? batch.results?.filter(r=>r.verdict==='miss').length ?? 0
                  const await_  = batch.awaiting ?? batch.results?.filter(r=>r.verdict==='awaiting').length ?? 0
                  const total   = batch.stocks ?? batch.results?.length ?? 0
                  const rate    = batch.hitRate ?? (batch.evaluated > 0 ? Math.round(hits/batch.evaluated*100) : null)
                  return (
                    <tr key={batch.id} style={{ borderBottom:'1px solid var(--tw-border)' }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--tw-muted)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'12px 14px', fontWeight:500, color:'var(--tw-fg)' }}>{batch.date}</td>
                      <td style={{ padding:'12px 14px', color:'var(--tw-muted-fg)' }}>{total}</td>
                      <td style={{ padding:'12px 14px' }}>
                        {rate != null && (
                          <span style={{ fontSize:12, fontWeight:600, padding:'2px 8px', borderRadius:20, background: rate>=60?'#dcfce7':rate>=40?'#fef9c3':'#fee2e2', color: rate>=60?'#15803d':rate>=40?'#a16207':'#b91c1c' }}>
                            {rate}%
                          </span>
                        )}
                      </td>
                      <td style={{ padding:'12px 14px', color:'#16a34a', fontWeight:600 }}>{hits}</td>
                      <td style={{ padding:'12px 14px', color:'#dc2626', fontWeight:600 }}>{miss}</td>
                      <td style={{ padding:'12px 14px' }}>
                        {await_ > 0
                          ? <span style={{ fontSize:12, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#f3f4f6', color:'#6b7280' }}>⏳ {await_}</span>
                          : <span style={{ fontSize:12, color:'var(--tw-muted-fg)' }}>—</span>
                        }
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ display:'flex', gap:6 }}>
                          <button
                            style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:`1px solid ${loadingBatch===batch.id?'var(--tw-primary)':'var(--tw-border)'}`, background:'var(--tw-card)', color: loadingBatch===batch.id ? 'var(--tw-primary)' : 'var(--tw-fg)', cursor:'pointer', fontFamily:'inherit', minWidth:44 }}
                            onClick={()=>handleLoadBatch(batch)}
                            disabled={loadingBatch===batch.id}
                          >
                            {loadingBatch===batch.id ? '…' : 'Load'}
                          </button>
                          <button
                            title="Download CSV"
                            style={{ fontSize:11, padding:'4px 8px', borderRadius:6, border:`1px solid ${downloadedBatch===batch.id?'#16a34a':'var(--tw-border)'}`, background: downloadedBatch===batch.id?'#dcfce7':'var(--tw-card)', color: downloadedBatch===batch.id?'#15803d':'var(--tw-muted-fg)', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:3 }}
                            onClick={()=>handleExportCSV(batch)}
                          >
                            {downloadedBatch===batch.id ? '✓' : <Download size={11} />}
                          </button>
                          <button
                            style={{ fontSize:11, padding:'4px 8px', borderRadius:6, border:`1px solid ${confirmDelete===batch.id?'#dc2626':'var(--tw-border)'}`, background: confirmDelete===batch.id?'#fee2e2':'var(--tw-card)', color: confirmDelete===batch.id?'#dc2626':'var(--tw-muted-fg)', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:3 }}
                            onClick={()=>handleDeleteBatch(batch.id)}
                          >
                            {deletingBatch===batch.id ? '…' : <Trash2 size={11} />}
                          </button>
                        </div>
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

// ── Area chart with hover tooltip ────────────────────────────────────────────
function AreaChart({ chartData, chartLabels }) {
  const [hover, setHover] = useState(null) // { x, y, label, value, screenX }

  if (!chartData || !chartLabels || chartLabels.length < 2) {
    return (
      <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--tw-muted-fg)', fontSize:13 }}>
        Not enough data to display chart
      </div>
    )
  }

  const W = 600, H = 160, PAD = { t:10, b:30, l:44, r:10 }
  const iW = W - PAD.l - PAD.r
  const iH = H - PAD.t - PAD.b

  const vals = chartLabels.map((_, i) => {
    const row = chartData.map(series => series[i]).filter(v => v != null)
    return row.length ? Math.round(row.reduce((a,b)=>a+b,0)/row.length) : null
  })

  const validVals = vals.filter(v => v != null)
  if (validVals.length < 2) return null

  const minV = Math.max(0, Math.min(...validVals) - 10)
  const maxV = Math.min(100, Math.max(...validVals) + 10)

  const xOf = (i) => PAD.l + (i / (vals.length-1)) * iW
  const yOf = (v) => v == null ? null : PAD.t + iH - ((v - minV) / (maxV - minV)) * iH

  const pts = vals.map((v,i) => v != null ? `${xOf(i)},${yOf(v)}` : null).filter(Boolean)
  const linePts  = pts.join(' ')
  const areaPts  = `${xOf(0)},${PAD.t+iH} ${pts.join(' ')} ${xOf(vals.length-1)},${PAD.t+iH}`
  const yTicks   = [50, 65, 80, 100].filter(v => v >= minV && v <= maxV)

  const handleMouseMove = (e) => {
    const svgEl = e.currentTarget
    const rect  = svgEl.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left) * (W / rect.width)
    const idx = Math.round((mouseX - PAD.l) / iW * (vals.length - 1))
    const clamped = Math.max(0, Math.min(vals.length - 1, idx))
    if (vals[clamped] != null) {
      setHover({ idx: clamped, x: xOf(clamped), y: yOf(vals[clamped]), label: chartLabels[clamped], value: vals[clamped] })
    }
  }

  return (
    <div style={{ position:'relative' }}>
      <svg
        width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ overflow:'visible', cursor:'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {yTicks.map(v => (
          <g key={v}>
            <line x1={PAD.l} y1={yOf(v)} x2={PAD.l+iW} y2={yOf(v)} stroke="var(--tw-border)" strokeWidth={1} strokeDasharray="4 4" />
            <text x={PAD.l-6} y={yOf(v)+4} fontSize={9} fill="var(--tw-muted-fg)" textAnchor="end">{v}%</text>
          </g>
        ))}

        <polygon points={areaPts} fill="url(#areaG)" />
        <polyline points={linePts} fill="none" stroke="#16a34a" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {hover && <>
          <line x1={hover.x} y1={PAD.t} x2={hover.x} y2={PAD.t+iH} stroke="var(--tw-muted-fg)" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
          <circle cx={hover.x} cy={hover.y} r={5} fill="#16a34a" stroke="#fff" strokeWidth={2} />
        </>}

        {chartLabels.map((label, i) => {
          if (i % Math.max(1, Math.floor(chartLabels.length / 6)) !== 0) return null
          return <text key={label} x={xOf(i)} y={H-6} fontSize={9} fill="var(--tw-muted-fg)" textAnchor="middle">{label}</text>
        })}
      </svg>

      {hover && (
        <div style={{
          position:'absolute',
          left: Math.min(hover.x / W * 100, 75) + '%',
          top: 0,
          background:'var(--tw-card)',
          border:'1px solid var(--tw-border)',
          borderRadius:8,
          padding:'8px 12px',
          fontSize:12,
          boxShadow:'0 4px 12px rgba(0,0,0,0.1)',
          pointerEvents:'none',
          zIndex:10,
          minWidth:120,
        }}>
          <div style={{ fontWeight:600, color:'var(--tw-fg)', marginBottom:4 }}>{hover.label}</div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ width:8, height:8, borderRadius:2, background:'#16a34a', display:'inline-block', flexShrink:0 }} />
            <span style={{ color:'var(--tw-muted-fg)' }}>Accuracy</span>
            <span style={{ fontWeight:700, color:'var(--tw-fg)', marginLeft:'auto' }}>{hover.value}</span>
          </div>
        </div>
      )}
    </div>
  )
}
