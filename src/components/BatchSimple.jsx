import { useMemo } from 'react'
import { targetDates, daysLeft, dateStatus, formatDate } from '../utils/dates.js'
import { getEffectivePrice, evaluatePrediction } from '../utils/stocks.js'

const HORIZONS = [
  { key: '1M', label: '1 Month',  tKey: 't1', dKey: 'd1' },
  { key: '3M', label: '3 Months', tKey: 't3', dKey: 'd3' },
  { key: '6M', label: '6 Months', tKey: 't6', dKey: 'd6' },
  { key: '12M', label: '12 Months', tKey: 't12', dKey: 'd12' },
]

function HorizonCell({ stock, horizonKey, tKey, dKey, autoPrices, histPrices, overrides, hitMargin = 5 }) {
  const target = stock[tKey]
  const tg     = stock.base ? targetDates(stock.base) : null
  const date   = tg ? tg[dKey] : null
  const dl     = date ? daysLeft(date) : null
  const ds     = date ? dateStatus(date) : null
  const expired = ds === 'past'

  const { price } = getEffectivePrice(
    stock.t, horizonKey, autoPrices, histPrices, overrides, expired
  )

  // No target set
  if (!target) {
    return <td style={td}><span style={{ color:'var(--tw-muted-fg)', fontSize:12 }}>--</span></td>
  }

  // Not expired — show days remaining
  if (!expired) {
    const daysText = dl != null
      ? dl <= 0  ? 'Today'
      : dl === 1 ? '1 day left'
      : `${dl} days left`
      : '--'

    return (
      <td style={td}>
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          <span style={{
            fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20,
            background:'#f3f4f6', color:'var(--tw-muted-fg)',
            display:'inline-block', width:'fit-content',
          }}>
            ⏳ Pending
          </span>
          <span style={{ fontSize:11, color:'var(--tw-muted-fg)' }}>{daysText}</span>
        </div>
      </td>
    )
  }

  // Expired — show result
  if (!price) {
    return (
      <td style={td}>
        <span style={{
          fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20,
          background:'#f3f4f6', color:'var(--tw-muted-fg)', display:'inline-block',
        }}>⏳ Expired · no price</span>
      </td>
    )
  }

  const { verdict } = evaluatePrediction(price, target, stock.b, hitMargin)
  const distPct = ((price - target) / target * 100)
  const sign    = distPct >= 0 ? '+' : ''
  const pctStr  = `${sign}${distPct.toFixed(1)}%`

  if (verdict === 'hit') {
    return (
      <td style={td}>
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          <span style={{
            fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20,
            background:'#dcfce7', color:'#15803d',
            display:'inline-block', width:'fit-content',
          }}>✅ Hit ({pctStr})</span>
          <span style={{ fontSize:11, color:'var(--tw-muted-fg)' }}>{formatDate(date)}</span>
        </div>
      </td>
    )
  }

  return (
    <td style={td}>
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        <span style={{
          fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20,
          background:'#fee2e2', color:'#b91c1c',
          display:'inline-block', width:'fit-content',
        }}>❌ Miss ({pctStr})</span>
        <span style={{ fontSize:11, color:'var(--tw-muted-fg)' }}>{formatDate(date)}</span>
      </div>
    </td>
  )
}

const td = { padding:'12px 16px', borderBottom:'1px solid var(--tw-border)', verticalAlign:'middle' }

export default function BatchSimple({ stocks, autoPrices, histPrices, overrides, hitMargin = 5 }) {
  if (!stocks.length) {
    return (
      <div style={{ background:'var(--tw-card)', border:'1px solid var(--tw-border)', borderRadius:10, padding:'48px', textAlign:'center', color:'var(--tw-muted-fg)', fontSize:14 }}>
        No stocks loaded — import a CSV to get started
      </div>
    )
  }

  return (
    <div style={{ background:'var(--tw-card)', border:'1px solid var(--tw-border)', borderRadius:10, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--tw-border)' }}>
        <div style={{ fontSize:15, fontWeight:700, color:'var(--tw-fg)' }}>Batch Overview</div>
        <div style={{ fontSize:12, color:'var(--tw-muted-fg)', marginTop:2 }}>
          Prediction status per horizon — {stocks.length} stock{stocks.length > 1 ? 's' : ''}
        </div>
      </div>

      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'var(--tw-muted)', borderBottom:'1px solid var(--tw-border)' }}>
              <th style={{ ...td, fontWeight:500, fontSize:11, color:'var(--tw-muted-fg)', borderBottom:'1px solid var(--tw-border)', width:120 }}>Ticker</th>
              <th style={{ ...td, fontWeight:500, fontSize:11, color:'var(--tw-muted-fg)', borderBottom:'1px solid var(--tw-border)', width:110 }}>Base date</th>
              {HORIZONS.map(h => (
                <th key={h.key} style={{ ...td, fontWeight:500, fontSize:11, color:'var(--tw-muted-fg)', borderBottom:'1px solid var(--tw-border)' }}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stocks.map(stock => (
              <tr key={stock.t}
                style={{ transition:'background .1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--tw-muted)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Ticker */}
                <td style={td}>
                  <div style={{ fontWeight:700, fontSize:14, color:'var(--tw-fg)' }}>
                    {stock.t.split('.')[0]}
                  </div>
                  <div style={{ fontSize:11, color:'var(--tw-muted-fg)', marginTop:1 }}>
                    {stock.co}
                  </div>
                </td>

                {/* Base date */}
                <td style={{ ...td, fontSize:12, color:'var(--tw-muted-fg)' }}>
                  {stock.base ? formatDate(stock.base) : '--'}
                </td>

                {/* Horizon cells */}
                {HORIZONS.map(h => (
                  <HorizonCell
                    key={h.key}
                    stock={stock}
                    horizonKey={h.key}
                    tKey={h.tKey}
                    dKey={h.dKey}
                    autoPrices={autoPrices}
                    histPrices={histPrices}
                    overrides={overrides}
                    hitMargin={hitMargin}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
