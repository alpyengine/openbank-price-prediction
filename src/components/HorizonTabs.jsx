import { formatDate, targetDates, daysLeft, dateStatus } from '../utils/dates.js'

const HORIZONS    = ['all', 'best', '1M', '3M', '6M', '12M']
const HORIZON_KEY = { '1M':'d1', '3M':'d3', '6M':'d6', '12M':'d12' }

export default function HorizonTabs({ horizon, stocks, onHorizonChange }) {
  const base = stocks.find(s => s.base)?.base
  const tg   = base ? targetDates(base) : null

  function tabStatus(h) {
    if (h === 'best' || h === 'all' || !tg) return null
    return dateStatus(tg[HORIZON_KEY[h]])
  }

  const activeDate   = horizon !== 'best' && horizon !== 'all' && tg ? tg[HORIZON_KEY[horizon]] : null
  const activeDl     = activeDate ? daysLeft(activeDate) : null
  const activeStatus = activeDate ? dateStatus(activeDate) : null

  const LABELS = { all: 'All', best: 'Best target' }

  return (
    <div style={{ marginBottom:'1.25rem' }}>
      {/* Tab buttons */}
      <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap', alignItems:'center' }}>
        {HORIZONS.map(h => {
          const isActive = horizon === h
          const ts = tabStatus(h)
          const dotColor = ts === 'past' ? '#dc2626' : ts === 'soon' ? '#d97706' : ts === 'now' ? '#16a34a' : null
          const isAll = h === 'all'

          return (
            <button
              key={h}
              onClick={() => onHorizonChange(h)}
              style={{
                display:'inline-flex', alignItems:'center', gap:5,
                fontSize:13, padding:'5px 14px', borderRadius:20,
                cursor:'pointer', fontFamily:'inherit', fontWeight:600,
                border: isActive
                  ? `1.5px solid ${isAll ? 'var(--tw-primary)' : 'var(--tw-primary)'}`
                  : '1.5px solid var(--tw-border)',
                background: isActive
                  ? (isAll ? 'var(--tw-primary)' : 'var(--tw-card)')
                  : 'transparent',
                color: isActive
                  ? (isAll ? 'var(--tw-card)' : 'var(--tw-fg)')
                  : 'var(--tw-muted-fg)',
                transition:'all .15s',
              }}
            >
              {LABELS[h] ?? h}
              {!isActive && dotColor && (
                <span style={{ width:5, height:5, borderRadius:'50%', background:dotColor, display:'inline-block', flexShrink:0 }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Horizon dates row */}
      {tg && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:16, fontSize:11, marginBottom:6, color:'var(--tw-muted-fg)', fontFamily:'monospace' }}>
          {[['1M',tg.d1],['3M',tg.d3],['6M',tg.d6],['12M',tg.d12]].map(([label,d]) => {
            const dl = daysLeft(d), ds = dateStatus(d)
            const color = ds==='past' ? '#dc2626' : ds==='soon' ? '#d97706' : ds==='now' ? '#16a34a' : 'var(--tw-muted-fg)'
            return (
              <span key={label} style={{ color }}>
                {label} → {formatDate(d)} ({dl>=0?'+':''}{dl}d)
                {ds==='past' && <Tag color="#dc2626" bg="#fee2e2">expired</Tag>}
                {ds==='soon' && <Tag color="#d97706" bg="#fef9c3">soon</Tag>}
                {ds==='now'  && <Tag color="#16a34a" bg="#dcfce7">now</Tag>}
              </span>
            )
          })}
        </div>
      )}

      {/* Status banners */}
      {activeStatus === 'past' && (
        <Banner color="#b91c1c" bg="#fee2e2" border="#fca5a5">
          <strong>Horizon expired {Math.abs(activeDl)} days ago</strong> ({formatDate(activeDate)}) — prices shown are closing price on target date.
        </Banner>
      )}
      {activeStatus === 'soon' && (
        <Banner color="#92400e" bg="#fef9c3" border="#fcd34d">
          <strong>Target date approaching</strong> — {formatDate(activeDate)} ({activeDl} days left).
        </Banner>
      )}
      {activeStatus === 'now' && (
        <Banner color="#14532d" bg="#dcfce7" border="#86efac">
          <strong>Target date is today or this week!</strong> ({formatDate(activeDate)})
        </Banner>
      )}
    </div>
  )
}

function Tag({ color, bg, children }) {
  return (
    <span style={{ display:'inline-block', fontSize:9, padding:'1px 5px', borderRadius:4, marginLeft:4, background:bg, color, fontWeight:700, verticalAlign:'middle' }}>
      {children}
    </span>
  )
}

function Banner({ color, bg, border, children }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'10px 14px', borderRadius:8, marginBottom:10, fontSize:13, lineHeight:1.5, border:`1px solid ${border}`, background:bg, color }}>
      {children}
    </div>
  )
}
