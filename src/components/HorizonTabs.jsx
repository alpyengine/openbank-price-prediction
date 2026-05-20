import { formatDate, targetDates, daysLeft, dateStatus } from '../utils/dates.js'

const HORIZONS    = ['best', '1M', '3M', '6M', '12M']
const HORIZON_KEY = { '1M':'d1', '3M':'d3', '6M':'d6', '12M':'d12' }

export default function HorizonTabs({ horizon, stocks, onHorizonChange }) {
  const base = stocks.find(s => s.base)?.base
  const tg   = base ? targetDates(base) : null

  function tabStatus(h) {
    if (h === 'best' || !tg) return null
    return dateStatus(tg[HORIZON_KEY[h]])
  }

  function tabStyle(h) {
    const isActive = horizon === h
    const ts = tabStatus(h)
    const base_ = { display:'inline-flex', alignItems:'center', fontSize:'var(--fs-xs)', padding:'4px 12px', borderRadius:20, cursor:'pointer', fontFamily:'inherit', fontWeight:600, transition:'background 0.15s' }
    if (isActive) return { ...base_, background:'var(--surface)', border:'1.5px solid var(--border-blue)', color:'var(--accent)' }
    if (ts === 'past') return { ...base_, background:'transparent', border:'1.5px solid var(--red-bdr)', color:'var(--red)' }
    if (ts === 'soon') return { ...base_, background:'transparent', border:'1.5px solid var(--amber-bg)', color:'var(--amber)' }
    return { ...base_, background:'var(--surface)', border:'1.5px solid var(--border)', color:'var(--text-2)' }
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
        <div style={{ display:'flex', flexWrap:'wrap', fontSize:'var(--fs-xxs)', marginBottom:'0.9rem', fontFamily:'monospace' }}>
          {[['1M',tg.d1],['3M',tg.d3],['6M',tg.d6],['12M',tg.d12]].map(([label,d]) => {
            const dl = daysLeft(d), ds = dateStatus(d)
            const color = ds==='past'?'var(--red)':ds==='soon'?'var(--amber)':ds==='now'?'var(--green)':'var(--text-3)'
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
        <Banner bg="var(--red-bg)" bdr="var(--red-bdr)" color="var(--red)" icon="⚠">
          <strong>This horizon expired {Math.abs(activeDl)} days ago</strong> ({formatDate(activeDate)}).
          {' '}Prices shown are the <em>closing price on the target date</em>.
        </Banner>
      )}
      {activeStatus === 'soon' && (
        <Banner bg="var(--amber-bg)" bdr="rgba(180,83,9,0.3)" color="var(--amber)" icon="⏰">
          <strong>Target date approaching</strong> — {formatDate(activeDate)} ({activeDl} days left).
        </Banner>
      )}
      {activeStatus === 'now' && (
        <Banner bg="var(--green-bg)" bdr="var(--green-bdr)" color="var(--green)" icon="🎯">
          <strong>Target date is today or this week!</strong> ({formatDate(activeDate)})
        </Banner>
      )}
    </>
  )
}

function Dot({ color }) {
  return <span style={{ display:'inline-block', width:5, height:5, borderRadius:'50%', background:color, marginLeft:5, verticalAlign:'middle', flexShrink:0 }} />
}
function MiniTag({ bg, color, children }) {
  return <span style={{ display:'inline-block', fontSize:9, padding:'1px 4px', borderRadius:6, marginLeft:4, verticalAlign:'middle', background:bg, color, fontWeight:700 }}>{children}</span>
}
function Banner({ bg, bdr, color, icon, children }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', borderRadius:'var(--radius)', marginBottom:'0.75rem', fontSize:'var(--fs-sm)', lineHeight:1.6, border:`1px solid ${bdr}`, background:bg, color }}>
      <span style={{ fontSize:14, flexShrink:0 }}>{icon}</span>
      <div>{children}</div>
    </div>
  )
}
