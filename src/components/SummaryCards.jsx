import { getTarget, getEffectivePrice, evaluatePrediction } from '../utils/stocks.js'

function Card({ label, value, color, sub }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'13px 14px', boxShadow:'var(--shadow)' }}>
      <div style={{ fontSize:'var(--fs-xxs)', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color, lineHeight:1.1 }}>{value}</div>
      {sub && <div style={{ fontSize:'var(--fs-xs)', marginTop:4, fontWeight:600, color:'var(--text-3)' }}>{sub}</div>}
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
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:'1.25rem' }}>
      <Card label="Total"       value={stocks.length} color="var(--text)"   />
      <Card label="Hit target"  value={hits}          color="var(--green)"  sub={hits  ? priceLabel : null} />
      <Card label="Close (±5%)" value={close}         color="var(--amber)"  sub={close ? priceLabel : null} />
      <Card label="Awaiting"    value={awaiting}      color="var(--text-3)" />
    </div>
  )
}
