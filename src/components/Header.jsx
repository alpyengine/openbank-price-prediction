import { formatDate, today as getToday } from '../utils/dates.js'

const TODAY = getToday()

const btn = {
  base:    { fontSize:'var(--fs-sm)', padding:'7px 14px', borderRadius:'var(--radius)', cursor:'pointer', fontFamily:'inherit', fontWeight:500, transition:'background 0.15s' },
  neutral: { border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)' },
  blue:    { border:'1.5px solid var(--border-blue)', background:'var(--surface)', color:'var(--accent)' },
  toggle:  { display:'flex', alignItems:'center', justifyContent:'center', width:38, height:38, border:'2px solid var(--border-blue)', borderRadius:'var(--radius)', background:'var(--surface)', cursor:'pointer', fontSize:18, flexShrink:0, transition:'background 0.15s' },
}

export default function Header({ stocks, darkMode, onToggleDark, onClearOverrides, onToggleEmail }) {
  const bases = [...new Set(stocks.map(s => s.base ? formatDate(s.base) : '?'))]

  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'1.25rem', gap:12, flexWrap:'wrap' }}>
      <div>
        <div style={{ fontSize:17, fontWeight:700, color:'var(--text)' }}>Openbank Price Prediction</div>
        <div style={{ fontSize:'var(--fs-xs)', color:'var(--text-3)', marginTop:3 }}>
          {stocks.length === 0
            ? 'Import stocks to see target dates'
            : <>Today: <strong style={{ color:'var(--text-2)' }}>{formatDate(TODAY)}</strong>&nbsp;&nbsp;·&nbsp;&nbsp;Screenshot date(s): <strong style={{ color:'var(--text-2)' }}>{bases.join(', ')}</strong></>
          }
        </div>
      </div>
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <button
          style={btn.toggle}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={onToggleDark}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
        <button style={{ ...btn.base, ...btn.neutral }} onClick={onClearOverrides}>Clear overrides</button>
        <button style={{ ...btn.base, ...btn.blue }}    onClick={onToggleEmail}>✉ Email report</button>
      </div>
    </div>
  )
}
