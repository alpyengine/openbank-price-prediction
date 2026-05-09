import { formatDate, today as getToday } from '../utils/dates.js'

const TODAY = getToday()

const s = {
  bar:      { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', gap: 12, flexWrap: 'wrap' },
  title:    { fontSize: 16, fontWeight: 600, color: '#e6edf3' },
  sub:      { fontSize: 11, color: '#8b949e', marginTop: 3, lineHeight: 1.6 },
  controls: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  btnBase:  { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' },
}

export default function Header({ stocks, onClearOverrides, onToggleEmail }) {
  const bases = [...new Set(stocks.map(s => s.base ? formatDate(s.base) : '?'))]

  return (
    <div style={s.bar}>
      <div>
        <div style={s.title}>Openbank Price Prediction</div>
        <div style={s.sub}>
          {stocks.length === 0
            ? 'Import stocks to see target dates'
            : <>Today: <strong>{formatDate(TODAY)}</strong>&nbsp;&nbsp;·&nbsp;&nbsp;Screenshot date(s): <strong>{bases.join(', ')}</strong></>
          }
        </div>
      </div>
      <div style={s.controls}>
        <button
          style={{ ...s.btnBase, border: '1px solid #30363d', background: 'transparent', color: '#e6edf3' }}
          onClick={onClearOverrides}
        >
          Clear overrides
        </button>
        <button
          style={{ ...s.btnBase, border: '1px solid #1f6feb', background: '#0d2136', color: '#58a6ff' }}
          onClick={onToggleEmail}
        >
          Email report
        </button>
      </div>
    </div>
  )
}
