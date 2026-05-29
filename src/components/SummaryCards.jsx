import { getTarget, getEffectivePrice, evaluatePrediction } from '../utils/stocks.js'
import { targetDates, dateStatus } from '../utils/dates.js'
import { LayoutGrid, Target, CheckCircle, XCircle, Clock } from 'lucide-react'

const ALL_HORIZONS = ['1M', '3M', '6M', '12M']
const HKEYS = { '1M':'d1', '3M':'d3', '6M':'d6', '12M':'d12' }

function isHorizonExpired(stock, h) {
  if (!stock.base) return false
  const tg  = targetDates(stock.base)
  const key = HKEYS[h]
  const d   = key ? tg[key] : null
  return d ? dateStatus(d) === 'past' : false
}

function Card({ label, value, valueColor, sub, subColor, iconBg, icon: Icon, iconColor }) {
  return (
    <div style={{
      background:'var(--tw-card)',
      border:'1px solid var(--tw-border)',
      borderRadius:10,
      padding:'20px 20px 18px',
      boxShadow:'0 1px 3px rgba(0,0,0,0.05)',
      display:'flex', flexDirection:'column', gap:4,
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontSize:13, color:'var(--tw-muted-fg)', fontWeight:500 }}>{label}</span>
        {Icon && (
          <div style={{ width:28, height:28, borderRadius:6, background: iconBg || 'var(--tw-muted)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon size={14} color={iconColor || 'var(--tw-muted-fg)'} />
          </div>
        )}
      </div>
      <div style={{ fontSize:28, fontWeight:700, color: valueColor || 'var(--tw-fg)', lineHeight:1.1 }}>{value}</div>
      {sub && (
        <div style={{ fontSize:12, marginTop:4, fontWeight:500, color: subColor || 'var(--tw-muted-fg)' }}>{sub}</div>
      )}
    </div>
  )
}

export default function SummaryCards({ stocks, horizon, autoPrices, histPrices, overrides, horizonExpired, hitMargin = 5 }) {
  let hits = 0, close = 0, miss = 0, awaiting = 0

  // distPct accumulators for avg % in sub-labels
  let hitDist = 0, closeDist = 0, missDist = 0

  if (horizon === 'all') {
    for (const stock of stocks) {
      for (const h of ALL_HORIZONS) {
        const expired = isHorizonExpired(stock, h)
        if (!expired) { awaiting++; continue }
        const { price: p } = getEffectivePrice(stock.t, h, autoPrices, histPrices, overrides, expired)
        if (!p) { awaiting++; continue }
        const tgt = getTarget(stock, h)
        const { verdict } = evaluatePrediction(p, tgt, stock.b, hitMargin)
        const d = tgt ? (p - tgt) / tgt * 100 : 0
        if (verdict === 'hit')        { hits++;  hitDist  += d }
        else if (verdict === 'close') { close++; closeDist += d }
        else                          { miss++;  missDist  += d }
      }
    }
  } else {
    for (const stock of stocks) {
      if (!horizonExpired) { awaiting++; continue }
      const { price: p } = getEffectivePrice(stock.t, horizon, autoPrices, histPrices, overrides, horizonExpired)
      if (!p) { awaiting++; continue }
      const tgt = getTarget(stock, horizon)
      const { verdict } = evaluatePrediction(p, tgt, stock.b, hitMargin)
      const d = tgt ? (p - tgt) / tgt * 100 : 0
      if (verdict === 'hit')        { hits++;  hitDist  += d }
      else if (verdict === 'close') { close++; closeDist += d }
      else                          { miss++;  missDist  += d }
    }
  }

  // Average distances
  const avgHit   = hits  ? hitDist  / hits  : null
  const avgClose = close ? closeDist / close : null
  const avgMiss  = miss  ? missDist  / miss  : null

  function fmtAvg(avg) {
    if (avg == null) return null
    const sign = avg >= 0 ? '+' : ''
    return `avg ${sign}${avg.toFixed(1)}%`
  }

  const isAll       = horizon === 'all'
  const totalPreds  = isAll ? stocks.length * 4 : stocks.length
  const priceLabel  = (!isAll && horizonExpired && horizon !== 'best') ? 'historical price' : "today's price"

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:'1.5rem' }}>
      <Card
        label="Total stocks"
        value={stocks.length}
        icon={LayoutGrid}
        sub={stocks.length
          ? isAll ? `${totalPreds} predictions (4×${stocks.length})` : `${stocks.length} predictions tracked`
          : 'Import a CSV to start'}
      />
      <Card
        label="Hit target"
        value={hits}
        valueColor={hits ? '#15803d' : undefined}
        icon={Target}
        iconBg={hits ? '#dcfce7' : undefined}
        iconColor={hits ? '#15803d' : undefined}
        sub={hits ? `${fmtAvg(avgHit)} · ${priceLabel}` : 'None reached target yet'}
        subColor={hits ? '#16a34a' : undefined}
      />
      <Card
        label={`Close (±${hitMargin}%)`}
        value={close}
        valueColor={close ? '#a16207' : undefined}
        icon={CheckCircle}
        iconBg={close ? '#fef9c3' : undefined}
        iconColor={close ? '#a16207' : undefined}
        sub={close ? `${fmtAvg(avgClose)} · ${priceLabel}` : `None within ${hitMargin}%`}
        subColor={close ? '#ca8a04' : undefined}
      />
      <Card
        label="Miss"
        value={miss}
        valueColor={miss ? '#b91c1c' : undefined}
        icon={XCircle}
        iconBg={miss ? '#fee2e2' : undefined}
        iconColor={miss ? '#b91c1c' : undefined}
        sub={miss ? `${fmtAvg(avgMiss)} · ${priceLabel}` : 'No misses yet'}
        subColor={miss ? '#dc2626' : undefined}
      />
      <Card
        label="Awaiting"
        value={awaiting}
        icon={Clock}
        sub={awaiting
          ? (isAll ? 'horizons pending maturity' : 'Horizons not yet due')
          : 'All horizons evaluated'}
      />
    </div>
  )
}
