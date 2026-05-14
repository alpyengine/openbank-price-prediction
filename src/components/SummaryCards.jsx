import { getTarget, getEffectivePrice, evaluatePrediction } from '../utils/stocks.js'

const s = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.5rem' },
  card: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '12px 14px' },
  lbl:  { fontSize: 11, color: '#8b949e', marginBottom: 4 },
  val:  { fontSize: 22, fontWeight: 600 },
  sub:  { fontSize: 10, color: '#484f58', marginTop: 2 },
}

function Card({ label, value, color, sub }) {
  return (
    <div style={s.card}>
      <div style={s.lbl}>{label}</div>
      <div style={{ ...s.val, color }}>{value}</div>
      {sub && <div style={s.sub}>{sub}</div>}
    </div>
  )
}

export default function SummaryCards({ stocks, horizon, autoPrices, histPrices, overrides, horizonExpired }) {
  let hits = 0, close = 0, awaiting = 0

  for (const stock of stocks) {
    const { price: p } = getEffectivePrice(
      stock.t, horizon, autoPrices, histPrices, overrides, horizonExpired
    )
    if (!p) { awaiting++; continue }

    const tgt = getTarget(stock, horizon)
    const { verdict } = evaluatePrediction(p, tgt, stock.b)
    if (verdict === 'hit')   hits++
    else if (verdict === 'close') close++
  }

  const priceLabel = horizonExpired && horizon !== 'best' ? 'historical' : 'current'

  return (
    <div style={s.grid}>
      <Card label="Total"        value={stocks.length} color="#e6edf3" />
      <Card label="Hit target"   value={hits}          color="#3fb950" sub={hits  ? priceLabel : null} />
      <Card label="Close (±5%)"  value={close}         color="#d29922" sub={close ? priceLabel : null} />
      <Card label="Awaiting"     value={awaiting}      color="#8b949e" />
    </div>
  )
}
