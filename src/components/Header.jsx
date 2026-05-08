import { formatDate, today as getToday } from '../utils/dates.js'

const TODAY = getToday()

export default function Header({ stocks, onClearOverrides, onEmailReport }) {
  const bases = [...new Set(stocks.map(s => s.base ? formatDate(s.base) : '?'))]

  return (
    <div style={styles.bar}>
      <div>
        <div style={styles.title}>Openbank forecast — price check</div>
        <div style={styles.sub}>
          {stocks.length === 0
            ? 'Import stocks to see target dates'
            : <>Today: <strong>{formatDate(TODAY)}</strong>&nbsp;&nbsp;·&nbsp;&nbsp;Screenshot date(s): <strong>{bases.join(', ')}</strong></>
          }
        </div>
      </div>
      <div style={styles.controls}>
        <button style={{...btn, ...btnGhost}} onClick={onClearOverrides}>
          Clear overrides
        </button>
        <button style={{...btn, ...btnPrimary}} onClick={onEmailReport}>
          Email report
        </button>
      </div>
    </div>
  )
}

const btn = {
  fontSize: 12, padding: '6px 14px', borderRadius: 6,
  cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
}
const btnGhost = {
  border: '1px solid #30363d', background: 'transparent', color: '#e6edf3',
}
const btnPrimary = {
  border: '1px solid #1f6feb', background: '#0d2136', color: '#58a6ff',
}
const styles = {
  bar:      { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', gap: 12, flexWrap: 'wrap' },
  title:    { fontSize: 16, fontWeight: 600, color: '#e6edf3' },
  sub:      { fontSize: 11, color: '#8b949e', marginTop: 3, lineHeight: 1.6 },
  controls: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
}
