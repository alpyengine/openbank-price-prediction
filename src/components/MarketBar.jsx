import { EU_MARKET_INDEX } from '../hooks/useMarketData.js'

const bar = {
  display:'flex', alignItems:'center', gap:10, marginBottom:'0.75rem',
  padding:'10px 14px', border:'1px solid var(--border)',
  borderRadius:'var(--radius-lg)', background:'var(--surface)', boxShadow:'var(--shadow)',
}

function detectSuffix(stocks) {
  if (!stocks.length) return 'US'
  const s = stocks[0].t.split('.').pop().toUpperCase()
  return s
}

export default function MarketBar({ log, loading, stocks, onFetch }) {
  if (!stocks.length) return null

  const suffix  = detectSuffix(stocks)
  const isUS    = suffix === 'US' || !stocks[0].t.includes('.')
  const isEU    = ['DE','AS','PA','L','MC'].includes(suffix)
  const euIndex = isEU ? EU_MARKET_INDEX[suffix] : null

  if (!isUS && !isEU) return null

  const label = isUS
    ? 'SPY + sector ETFs'
    : euIndex?.label ?? `Index (.${suffix})`

  return (
    <div style={bar}>
      <span style={{ fontSize:'var(--fs-sm)', fontWeight:700, color:'var(--text)', flexShrink:0 }}>
        Market data
      </span>
      <span style={{ fontSize:'var(--fs-xs)', color:'var(--text-3)', fontFamily:'monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {log || `${label} vs base date${isUS ? ' — requires fundamentals for sector ETF' : ''}`}
      </span>
      {loading && (
        <div style={{ width:12, height:12, flexShrink:0, border:'1.5px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      )}
      <span style={{ fontSize:'var(--fs-xxs)', color:'var(--text-3)', flexShrink:0 }}>
        {isUS ? 'Twelve Data' : 'Twelve Data'}
      </span>
      <button
        style={{ fontSize:'var(--fs-sm)', padding:'6px 14px', borderRadius:'var(--radius)', cursor:'pointer', fontFamily:'inherit', fontWeight:500, border:'1.5px solid var(--border-blue)', background:'var(--surface)', color:'var(--accent)', flexShrink:0, opacity: loading ? 0.4 : 1 }}
        disabled={loading}
        onClick={onFetch}
      >
        ↓ Fetch market data
      </button>
    </div>
  )
}
