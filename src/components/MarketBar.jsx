import { EU_MARKET_INDEX } from '../hooks/useMarketData.js'

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
  const label = isUS ? 'SPY + sector ETFs' : euIndex?.label ?? `Index (.${suffix})`

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10,
      marginBottom:'1.5rem', padding:'10px 14px',
      border:'1px solid var(--tw-border)',
      borderRadius:8, background:'var(--tw-card)',
      boxShadow:'0 1px 2px rgba(0,0,0,0.04)',
    }}>
      <span style={{ fontSize:13, fontWeight:600, color:'var(--tw-fg)', flexShrink:0 }}>Market data</span>
      <span style={{ fontSize:12, color:'var(--tw-muted-fg)', fontFamily:'monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {log || `${label} vs base date${isUS ? ' — requires fundamentals for sector ETF' : ''}`}
      </span>
      {loading && (
        <div style={{ width:12, height:12, flexShrink:0, border:'1.5px solid var(--tw-border)', borderTopColor:'var(--tw-primary)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      )}
      <span style={{ fontSize:11, color:'var(--tw-muted-fg)', flexShrink:0 }}>Twelve Data</span>
      <button
        style={{
          fontSize:13, padding:'6px 14px', borderRadius:8, cursor:'pointer',
          fontFamily:'inherit', fontWeight:500, flexShrink:0,
          border:'1px solid var(--tw-border)', background:'var(--tw-card)', color:'var(--tw-fg)',
          opacity: loading ? 0.4 : 1,
        }}
        disabled={loading}
        onClick={onFetch}
      >
        ↓ Fetch market data
      </button>
    </div>
  )
}
