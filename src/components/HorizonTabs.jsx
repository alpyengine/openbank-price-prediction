import { formatDate, targetDates, daysLeft, dateStatus } from '../utils/dates.js'

const HORIZONS   = ['best', '1M', '3M', '6M', '12M']
const HORIZON_KEY = { '1M': 'd1', '3M': 'd3', '6M': 'd6', '12M': 'd12' }

export default function HorizonTabs({ horizon, stocks, onHorizonChange }) {
  const base = stocks.find(s => s.base)?.base
  const tg   = base ? targetDates(base) : null

  function tabStatus(h) {
    if (h === 'best' || !tg) return null
    return dateStatus(tg[HORIZON_KEY[h]])
  }

  function tabStyle(h) {
    const isActive = horizon === h
    const ts       = tabStatus(h)
    const base_ = {
      display:'inline-flex', alignItems:'center', fontSize:11, padding:'4px 12px',
      borderRadius:20, cursor:'pointer', fontFamily:'inherit',
    }
    if (isActive) return { ...base_, background:'var(--blue-bg)', border:'1px solid var(--blue-bdr)', color:'var(--blue)' }
    if (ts === 'past')  return { ...base_, background:'transparent', border:'1px solid var(--red-bg)', color:'var(--red)' }
    if (ts === 'soon')  return { ...base_, background:'transparent', border:'1px solid var(--amber-bg)', color:'var(--amber)' }
    return { ...base_, background:'transparent', border:'1px solid var(--border)', color:'var(--text-2)' }
  }

  const activeDate   = horizon !== 'best' && tg ? tg[HORIZON_KEY[horizon]] : null
  const activeDl     = activeDate ? daysLeft(activeDate) : null
  const activeStatus = activeDate ? dateStatus(activeDate) : null

  return (
    <>
      <div style={{ display:'flex', gap:4, marginBottom:'0.5rem', flexWrap:'wrap', alignItems:'center' }}>
        {HORIZONS.map(h => {
          const ts = tabStatus(h)
          return (
            <button key={h} style={tabStyle(h)} onClick={() => onHorizonChange(h)}>
              {h === 'best' ? 'Best target' : h}
              {horizon !== h && ts === 'past' && <Dot color="var(--red)" />}
              {horizon !== h && ts === 'soon' && <Dot color="var(--amber)" />}
              {horizon !== h && ts === 'now'  && <Dot color="var(--green)" />}
            </button>
          )
        })}
      </div>

      {tg && (
        <div style={{ display:'flex', flexWrap:'wrap', fontSize:10, marginBottom:'0.9rem', fontFamily:'monospace' }}>
          {[['1M',tg.d1],['3M',tg.d3],['6M',tg.d6],['12M',tg.d12]].map(([label,d]) => {
            const dl = daysLeft(d)
            const ds = dateStatus(d)
            const color = ds==='past' ? 'var(--red)' : ds==='soon' ? 'var(--amber)' : ds==='now' ? 'var(--green)' : 'var(--text-3)'
            return (
              <span key={label} style={{ marginRight:24, color }}>
                {label} → {formatDate(d)} <span style={{ opacity:0.7 }}>({dl>=0?'+':''}{dl}d)</span>
                {ds==='past' && <MiniTag bg="var(--red-bg)"   color="var(--red)">expired</MiniTag>}
                {ds==='soon' && <MiniTag bg="var(--amber-bg)" color="var(--amber)">soon</MiniTag>}
                {ds==='now'  && <MiniTag bg="var(--green-bg)" color="var(--green)">now</MiniTag>}
              </span>
            )
          })}
        </div>
      )}

      {activeStatus === 'past' && (
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', borderRadius:8, marginBottom:'0.75rem', fontSize:12, lineHeight:1.6, border:'1px solid var(--red-bg)', background:'var(--red-bg)', color:'var(--red)' }}>
          <span style={{ fontSize:14, flexShrink:0 }}>⚠</span>
          <div>
            <strong>This horizon expired {Math.abs(activeDl)} days ago</strong> ({formatDate(activeDate)}).
            {' '}Prices shown are the <em>closing price on the target date</em> — not today's price.
          </div>
        </div>
      )}
      {activeStatus === 'soon' && (
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', borderRadius:8, marginBottom:'0.75rem', fontSize:12, lineHeight:1.6, border:'1px solid var(--amber-bg)', background:'var(--amber-bg)', color:'var(--amber)' }}>
          <span style={{ fontSize:14, flexShrink:0 }}>⏰</span>
          <div><strong>Target date approaching</strong> — {formatDate(activeDate)} ({activeDl} days left).</div>
        </div>
      )}
      {activeStatus === 'now' && (
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', borderRadius:8, marginBottom:'0.75rem', fontSize:12, lineHeight:1.6, border:'1px solid var(--green-bg)', background:'var(--green-bg)', color:'var(--green)' }}>
          <span style={{ fontSize:14, flexShrink:0 }}>🎯</span>
          <div><strong>Target date is today or this week!</strong> ({formatDate(activeDate)})</div>
        </div>
      )}
    </>
  )
}

function Dot({ color }) {
  return <span style={{ display:'inline-block', width:5, height:5, borderRadius:'50%', background:color, marginLeft:5, verticalAlign:'middle', flexShrink:0 }} />
}

function MiniTag({ bg, color, children }) {
  return <span style={{ display:'inline-block', fontSize:9, padding:'1px 4px', borderRadius:6, marginLeft:4, verticalAlign:'middle', background:bg, color, fontWeight:600 }}>{children}</span>
}
