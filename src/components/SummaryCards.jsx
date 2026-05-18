import { getTarget, getEffectivePrice, evaluatePrediction } from '../utils/stocks.js'

function Card({ label, value, color, sub }) {
  return (
    <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:8, padding:'12px 14px' }}>
      <div style={{ fontSize:11, color:'var(--text-2)', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:600, color }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>{sub}</div>}
    </div>
  )
}

export default function SummaryCards({ stocks, horizon, autoPrices, histPrices, overrides, horizonExpired }) {
  let hits = 0, close = 0, awaiting = 0

  for (const stock of stocks) {
    const { price: p } = getEffectivePrice(stock.t, horizon, autoPrices, histPrices, overrides, horizonExpired)
    if (!p) { awaiting++; continue }
    const { verdict } = evaluatePrediction(p, getTarget(stock, horizon), stock.b)
    if (verdict === 'hit')        hits++
    else if (verdict === 'close') close++
  }

  const priceLabel = horizonExpired && horizon !== 'best' ? 'historical' : 'current'

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:'1.5rem' }}>
      <Card label="Total"        value={stocks.length} color="var(--text)"  />
      <Card label="Hit target"   value={hits}          color="var(--green)" sub={hits  ? priceLabel : null} />
      <Card label="Close (±5%)"  value={close}         color="var(--amber)" sub={close ? priceLabel : null} />
      <Card label="Awaiting"     value={awaiting}       color="var(--text-2)" />
    </div>
  )
}
