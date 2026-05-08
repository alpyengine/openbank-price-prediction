import { formatDate, targetDates, daysLeft } from '../utils/dates.js'

const HORIZONS = ['best', '1M', '3M', '6M', '12M']

export default function HorizonTabs({ horizon, stocks, onHorizonChange }) {
  const base = stocks.find(s => s.base)?.base
  const tg   = base ? targetDates(base) : null

  return (
    <>
      <div style={styles.tabs}>
        {HORIZONS.map(h => (
          <button
            key={h}
            style={{ ...styles.tab, ...(horizon === h ? styles.active : {}) }}
            onClick={() => onHorizonChange(h)}
          >
            {h === 'best' ? 'Best target' : h}
          </button>
        ))}
      </div>
      {tg && (
        <div style={styles.dates}>
          {`1M -> ${formatDate(tg.d1)} (${fmtDays(daysLeft(tg.d1))})`}&nbsp;&nbsp;&nbsp;
          {`3M -> ${formatDate(tg.d3)} (${fmtDays(daysLeft(tg.d3))})`}&nbsp;&nbsp;&nbsp;
          {`6M -> ${formatDate(tg.d6)} (${fmtDays(daysLeft(tg.d6))})`}&nbsp;&nbsp;&nbsp;
          {`12M -> ${formatDate(tg.d12)} (${fmtDays(daysLeft(tg.d12))})`}
        </div>
      )}
    </>
  )
}

function fmtDays(n) {
  return (n >= 0 ? '+' : '') + n + 'd'
}

const styles = {
  tabs: { display: 'flex', gap: 4, marginBottom: '0.4rem', flexWrap: 'wrap' },
  tab: {
    fontSize: 11, padding: '4px 12px', borderRadius: 20,
    border: '1px solid #30363d', cursor: 'pointer',
    color: '#8b949e', background: 'transparent', fontFamily: 'inherit',
  },
  active: {
    background: '#0d2136', borderColor: '#1f6feb', color: '#58a6ff',
  },
  dates: {
    fontSize: 10, color: '#484f58', marginBottom: '0.9rem',
    fontFamily: 'monospace',
  },
}
