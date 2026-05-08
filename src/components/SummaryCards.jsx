import { effectivePrice, getTarget, priceStatus } from '../utils/stocks.js'

export default function SummaryCards({ stocks, horizon, autoPrices, overrides }) {
  let hits = 0, close = 0, awaiting = 0

  for (const s of stocks) {
    const p = effectivePrice(s.t, autoPrices, overrides)
    if (!p) { awaiting++; continue }
    const status = priceStatus(p, getTarget(s, horizon))
    if (status === 'hit')   hits++
    else if (status === 'close') close++
  }

  return (
    <div style={styles.grid}>
      <Card label="Total"        value={stocks.length} color="#e6edf3" />
      <Card label="Hit target"   value={hits}          color="#3fb950" />
      <Card label="Close (<15%)" value={close}         color="#d29922" />
      <Card label="Awaiting"     value={awaiting}      color="#8b949e" />
    </div>
  )
}

function Card({ label, value, color }) {
  return (
    <div style={styles.card}>
      <div style={styles.label}>{label}</div>
      <div style={{ ...styles.value, color }}>{value}</div>
    </div>
  )
}

const styles = {
  grid:  { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.5rem' },
  card:  { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '12px 14px' },
  label: { fontSize: 11, color: '#8b949e', marginBottom: 4 },
  value: { fontSize: 22, fontWeight: 600 },
}
