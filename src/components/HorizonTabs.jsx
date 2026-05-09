import { formatDate, targetDates, daysLeft } from '../utils/dates.js'

const HORIZONS = ['best', '1M', '3M', '6M', '12M']

const s = {
  tabs:   { display: 'flex', gap: 4, marginBottom: '0.4rem', flexWrap: 'wrap' },
  tab:    { fontSize: 11, padding: '4px 12px', borderRadius: 20, border: '1px solid #30363d', cursor: 'pointer', color: '#8b949e', background: 'transparent', fontFamily: 'inherit' },
  active: { background: '#0d2136', borderColor: '#1f6feb', color: '#58a6ff' },
  dates:  { fontSize: 10, color: '#484f58', marginBottom: '0.9rem', fontFamily: 'monospace' },
}

function fmt(d) {
  const dl = daysLeft(d)
  return `${formatDate(d)} (${dl >= 0 ? '+' : ''}${dl}d)`
}

export default function HorizonTabs({ horizon, stocks, onHorizonChange }) {
  const base = stocks.find(s => s.base)?.base
  const tg   = base ? targetDates(base) : null

  return (
    <>
      <div style={s.tabs}>
        {HORIZONS.map(h => (
          <button
            key={h}
            style={{ ...s.tab, ...(horizon === h ? s.active : {}) }}
            onClick={() => onHorizonChange(h)}
          >
            {h === 'best' ? 'Best target' : h}
          </button>
        ))}
      </div>
      {tg && (
        <div style={s.dates}>
          1M → {fmt(tg.d1)}&nbsp;&nbsp;&nbsp;
          3M → {fmt(tg.d3)}&nbsp;&nbsp;&nbsp;
          6M → {fmt(tg.d6)}&nbsp;&nbsp;&nbsp;
          12M → {fmt(tg.d12)}
        </div>
      )}
    </>
  )
}
