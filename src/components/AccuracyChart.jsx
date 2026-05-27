import { useState } from 'react'
import { BarChart2, Target, CheckCircle, Clock, Download, RefreshCw, Save, Trash2 } from 'lucide-react'

const HORIZONS = ['1M', '3M', '6M', '12M']
const H_COLORS = ['#16a34a', '#3b82f6', '#d97706', '#8b5cf6']

export default function AccuracyChart({ stats, history, loading, saving, log, configured, onLoad, onSave, onLoadBatch, onDeleteBatch }) {
  const [loadingBatch,  setLoadingBatch]  = useState(null)
  const [deletingBatch, setDeletingBatch] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

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

  const handleExportCSV = (batch) => {
    const seen = new Set(), tickers = []
    for (const r of batch.results) { if (!seen.has(r.ticker)) { seen.add(r.ticker); tickers.push(r.ticker) } }
    const rows = ['Ticker,Company,Currency,BasePrice,1M,3M,6M,12M,Date']
    for (const ticker of tickers) {
      const res = batch.results.filter(r => r.ticker === ticker)
      const get = (h) => res.find(r => r.horizon === h)?.targetPrice ?? ''
      const base = res[0]; if (!base) continue
      const suffix = ticker.split('.').pop().toUpperCase()
      const cu = ['DE','AS','PA','MC'].includes(suffix)?'EUR':suffix==='L'?'GBP':'USD'
      rows.push([ticker, base.company, cu, base.basePrice, get('1M'), get('3M'), get('6M'), get('12M'), batch.date].join(','))
    }
    const blob = new Blob([rows.join('\n')], { type:'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Openbank_${batch.date.split('/').reverse().join('')}.csv`; a.click()
    URL.revokeObjectURL(url)
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

  // Page header
  const Header = () => (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'1.5rem', flexWrap:'wrap', gap:12 }}>
      <div>
        <h1 style={{ fontSize:26, fontWeight:700, color:'var(--tw-fg)', letterSpacing:'-0.02em', lineHeight:1.2 }}>Accuracy Stats</h1>
        <p style={{ fontSize:13, color:'var(--tw-muted-fg)', marginTop:4 }}>Historical accuracy as batches mature</p>
      </div>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        {log && <span style={{ fontSize:11, color:'var(--tw-muted-fg)', fontFamily:'monospace' }}>{log}</span>}
        {(loading||saving) && <div style={{ width:14, height:14, border:'2px solid var(--tw-border)', borderTopColor:'var(--tw-primary)', borderRadius:'50%', animation:'spin .7s linear infinite' }} />}
        <button style={btn('neutral')} onClick={onLoad} disabled={loading}>
          <RefreshCw size={13} /> Load history
        </button>
        <button style={btn('green')} onClick={onSave} disabled={saving||loading}>
          <Save size={13} /> Save batch
        </button>
      </div>
    </div>
  )

  if (!configured) return (
    <div>
      <Header />
      <div style={{ ...card, padding:24, textAlign:'center' }}>
        <BarChart2 size={32} color="var(--tw-muted-fg)" style={{ margin:'0 auto 12px' }} />
        <div style={{ fontSize:14, fontWeight:600, color:'var(--tw-fg)', marginBottom:6 }}>Accuracy tracking not configured</div>
        <div style={{ fontSize:13, color:'var(--tw-muted-fg)' }}>Add Supabase credentials to your .env file to enable history tracking.</div>
      </div>
    </div>
  )

  if (!stats && !loading) return (
    <div>
      <Header />
      <div style={{ ...card, padding:32, textAlign:'center' }}>
        <BarChart2 size={32} color="var(--tw-muted-fg)" style={{ margin:'0 auto 12px' }} />
        <div style={{ fontSize:14, fontWeight:600, color:'var(--tw-fg)', marginBottom:6 }}>No history loaded</div>
        <div style={{ fontSize:13, color:'var(--tw-muted-fg)', marginBottom:16 }}>Click "Load history" to fetch accuracy data from Supabase.</div>
        <button style={btn('neutral')} onClick={onLoad}><RefreshCw size={13} /> Load history</button>
      </div>
    </div>
  )

  const overallHits = stats?.byHorizon.reduce((a,h)=>a+h.hit,0) ?? 0
  const overallMiss = stats?.byHorizon.reduce((a,h)=>a+h.miss,0) ?? 0
  const overallAwait = stats?.byHorizon.reduce((a,h)=>a+(h.total-h.hit-h.miss-h.close),0) ?? 0

  return (
    <div>
      <Header />

      {stats && <>
        {/* KPI cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:'1.5rem' }}>
          {[
            { label:'Overall hit rate', value: stats.overallRate!=null ? stats.overallRate+'%' : '--', icon:Target, sub:`${overallHits} predictions reached target`, subColor:'#16a34a' },
            { label:'Total hits',       value: overallHits,   icon:CheckCircle, sub:`${stats.evaluated} total evaluated` },
            { label:'Total misses',     value: overallMiss,   icon:BarChart2,   sub:`${overallMiss} predictions missed` },
            { label:'Awaiting',         value: overallAwait,  icon:Clock,       sub:'Pending maturity' },
          ].map(({ label, value, icon:Icon, sub, subColor }) => (
            <div key={label} style={{ ...card, padding:'20px 20px 18px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:13, color:'var(--tw-muted-fg)', fontWeight:500 }}>{label}</span>
                <div style={{ width:28, height:28, borderRadius:6, background:'var(--tw-muted)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={14} color="var(--tw-muted-fg)" />
                </div>
              </div>
              <div style={{ fontSize:28, fontWeight:700, color:'var(--tw-fg)', lineHeight:1.1 }}>{value}</div>
              {sub && <div style={{ fontSize:12, marginTop:4, fontWeight:500, color: subColor||'var(--tw-muted-fg)' }}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* Horizon hit rate cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:'1.5rem' }}>
          {stats.byHorizon.map((h, i) => {
            const pct = h.hitRate ?? 0
            return (
              <div key={h.horizon} style={{ ...card, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:12, color:'var(--tw-muted-fg)', fontWeight:500 }}>{h.horizon} horizon</span>
                  <span style={{ fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#dcfce7', color:'#15803d' }}>{pct}%</span>
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
            <span style={{ fontSize:12, color:'var(--tw-muted-fg)' }}>{history?.length ?? 0} batches saved</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--tw-muted)', borderBottom:'1px solid var(--tw-border)' }}>
                  {['Date','Stocks','Hit rate','Hits','Misses','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:500, color:'var(--tw-muted-fg)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(!history||history.length===0) && (
                  <tr><td colSpan={6} style={{ padding:'24px', textAlign:'center', color:'var(--tw-muted-fg)', fontSize:13 }}>No batches saved yet</td></tr>
                )}
                {history?.map(batch => {
                  const hits = batch.results?.filter(r=>r.verdict==='hit').length ?? 0
                  const miss = batch.results?.filter(r=>r.verdict==='miss').length ?? 0
                  const total = batch.stocks ?? batch.results?.length ?? 0
                  const rate = batch.hit_rate ?? (total>0 ? Math.round(hits/total*100) : null)
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
                        <div style={{ display:'flex', gap:6 }}>
                          <button
                            style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:'1px solid var(--tw-border)', background:'var(--tw-card)', color:'var(--tw-fg)', cursor:'pointer', fontFamily:'inherit' }}
                            onClick={()=>handleLoadBatch(batch)}
                          >
                            {loadingBatch===batch.id ? '…' : 'Load'}
                          </button>
                          <button
                            style={{ fontSize:11, padding:'4px 8px', borderRadius:6, border:'1px solid var(--tw-border)', background:'var(--tw-card)', color:'var(--tw-muted-fg)', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:3 }}
                            onClick={()=>handleExportCSV(batch)}
                          >
                            <Download size={11} />
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

// ── Area chart (SVG) ──────────────────────────────────────────────────────────
function AreaChart({ chartData, chartLabels }) {
  if (!chartData || !chartLabels || chartLabels.length < 2) {
    return (
      <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--tw-muted-fg)', fontSize:13 }}>
        Not enough data to display chart
      </div>
    )
  }

  const W = 600, H = 140, PAD = { t:10, b:30, l:40, r:10 }
  const iW = W - PAD.l - PAD.r
  const iH = H - PAD.t - PAD.b

  // Use overall (average across all horizons per batch)
  const vals = chartLabels.map((_, i) => {
    const row = chartData.map(series => series[i]).filter(v => v != null)
    return row.length ? row.reduce((a,b)=>a+b,0)/row.length : null
  }).filter(v => v != null)

  if (vals.length < 2) return null

  const minV = Math.max(0, Math.min(...vals) - 10)
  const maxV = Math.min(100, Math.max(...vals) + 10)

  const x = (i) => PAD.l + (i / (vals.length-1)) * iW
  const y = (v) => PAD.t + iH - ((v - minV) / (maxV - minV)) * iH

  const linePts  = vals.map((v,i) => `${x(i)},${y(v)}`).join(' ')
  const areaPts  = `${x(0)},${PAD.t+iH} ${vals.map((v,i)=>`${x(i)},${y(v)}`).join(' ')} ${x(vals.length-1)},${PAD.t+iH}`

  // Y gridlines
  const yTicks = [50, 65, 80, 100].filter(v => v >= minV && v <= maxV)

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Gridlines */}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PAD.l} y1={y(v)} x2={PAD.l+iW} y2={y(v)} stroke="var(--tw-border)" strokeWidth={1} strokeDasharray="4 4" />
          <text x={PAD.l-6} y={y(v)+4} fontSize={9} fill="var(--tw-muted-fg)" textAnchor="end">{v}%</text>
        </g>
      ))}

      {/* Area fill */}
      <polygon points={areaPts} fill="url(#areaGrad)" />

      {/* Line */}
      <polyline points={linePts} fill="none" stroke="#16a34a" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {/* X labels */}
      {chartLabels.filter((_,i) => i % Math.max(1, Math.floor(chartLabels.length/6)) === 0).map((label, _, arr) => {
        const i = chartLabels.indexOf(label)
        return (
          <text key={label} x={x(i)} y={H-8} fontSize={9} fill="var(--tw-muted-fg)" textAnchor="middle">{label}</text>
        )
      })}
    </svg>
  )
}
