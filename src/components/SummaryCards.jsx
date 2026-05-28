import { getTarget, getEffectivePrice, evaluatePrediction } from '../utils/stocks.js'
import { LayoutGrid, Target, CheckCircle, Clock } from 'lucide-react'

const ALL_HORIZONS = ['1M', '3M', '6M', '12M']

function Card({ label, value, sub, subColor, icon: Icon }) {
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
          <div style={{ width:28, height:28, borderRadius:6, background:'var(--tw-muted)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon size={14} color="var(--tw-muted-fg)" />
          </div>
        )}
      </div>
      <div style={{ fontSize:28, fontWeight:700, color:'var(--tw-fg)', lineHeight:1.1 }}>{value}</div>
      {sub && (
        <div style={{ fontSize:12, marginTop:4, fontWeight:500, color: subColor || 'var(--tw-muted-fg)' }}>{sub}</div>
      )}
    </div>
  )
}

export default function SummaryCards({ stocks, horizon, autoPrices, histPrices, overrides, horizonExpired, hitMargin = 5 }) {
  let hits = 0, close = 0, awaiting = 0

  if (horizon === 'all') {
    // Aggregate across all 4 horizons
    for (const stock of stocks) {
      for (const h of ALL_HORIZONS) {
        // For 'all' mode use current price (not historical)
        const { price: p } = getEffectivePrice(stock.t, h, autoPrices, histPrices, overrides, false)
        if (!p) { awaiting++; continue }
        const { verdict } = evaluatePrediction(p, getTarget(stock, h), stock.b, hitMargin)
        if (verdict === 'hit')        hits++
        else if (verdict === 'close') close++
      }
    }
  } else {
    // Single horizon
    for (const stock of stocks) {
      const { price: p } = getEffectivePrice(stock.t, horizon, autoPrices, histPrices, overrides, horizonExpired)
      if (!p) { awaiting++; continue }
      const { verdict } = evaluatePrediction(p, getTarget(stock, horizon), stock.b, hitMargin)
      if (verdict === 'hit')        hits++
      else if (verdict === 'close') close++
    }
  }

  const isAll = horizon === 'all'
  const totalPredictions = isAll ? stocks.length * 4 : stocks.length
  const priceLabel = (!isAll && horizonExpired && horizon !== 'best') ? '+historical price' : '+today\'s price'

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:'1.5rem' }}>
      <Card
        label="Total stocks"
        value={stocks.length}
        icon={ICONS.total}
        sub={stocks.length
          ? isAll ? `${totalPredictions} predictions (4×${stocks.length})` : `${stocks.length} predictions tracked`
          : 'Import a CSV to start'}
      />
      <Card
        label="Hit target"
        value={hits}
        icon={ICONS.hit}
        sub={hits ? (isAll ? 'across all horizons' : priceLabel) : 'None reached target yet'}
        subColor={hits ? '#16a34a' : undefined}
      />
      <Card
        label={`Close (±${hitMargin}%)`}
        value={close}
        icon={ICONS.close}
        sub={close ? (isAll ? 'across all horizons' : priceLabel) : `None within ${hitMargin}%`}
        subColor={close ? '#ca8a04' : undefined}
      />
      <Card
        label="Awaiting"
        value={awaiting}
        icon={ICONS.awaiting}
        sub={awaiting
          ? (isAll ? 'price not yet fetched' : 'Price not yet fetched')
          : 'All prices loaded'}
      />
    </div>
  )
}

const ICONS = {
  total:    LayoutGrid,
  hit:      Target,
  close:    CheckCircle,
  awaiting: Clock,
}
