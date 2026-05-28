import { EU_MARKET_INDEX } from '../hooks/useMarketData.js'

function Spinner({ light }) {
  return (
    <div style={{
      width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
      border: light ? '2px solid rgba(255,255,255,0.35)' : '2px solid var(--tw-border)',
      borderTopColor: light ? '#fff' : 'var(--tw-fg)',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

function detectSuffix(stocks) {
  if (!stocks.length) return 'US'
  return stocks[0].t.split('.').pop().toUpperCase()
}

export default function FetchBar({
  // price fetch
  log, fetching, onFetch,
  // fundamentals
  fundLog, fundLoading, onFetchFundamentals,
  // market data
  marketLog, marketLoading, stocks, onFetchMarket,
}) {
  const suffix = detectSuffix(stocks ?? [])
  const isUS   = suffix === 'US' || !(stocks?.[0]?.t?.includes('.'))
  const isEU   = ['DE','AS','PA','L','MC'].includes(suffix)
  const showMarket = (stocks?.length > 0) && (isUS || isEU)

  const anyLoading = fetching || fundLoading || marketLoading

  const combinedLog = fetching     ? log
    : fundLoading  ? fundLog
    : marketLoading ? marketLog
    : log || fundLog || marketLog || 'Import stocks, then click Fetch'

  const btn = (active, loading) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8,
    fontSize: 12, fontWeight: 500,
    fontFamily: 'inherit', cursor: loading ? 'default' : 'pointer',
    flexShrink: 0, whiteSpace: 'nowrap',
    transition: 'opacity .15s',
    opacity: loading ? 0.65 : 1,
    ...(active
      ? { border: '1px solid #16a34a', background: '#16a34a', color: '#fff' }
      : { border: '1px solid var(--tw-border)', background: 'var(--tw-card)', color: 'var(--tw-fg)' }
    ),
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      marginBottom: '1.5rem', padding: '10px 14px',
      border: '1px solid var(--tw-border)',
      borderRadius: 8, background: 'var(--tw-card)',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    }}>
      {/* Combined log message */}
      <span style={{
        fontSize: 11, color: 'var(--tw-muted-fg)',
        fontFamily: 'monospace', flex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {combinedLog}
      </span>

      {/* Fetch prices */}
      <button style={btn(true, fetching)} disabled={anyLoading} onClick={onFetch}>
        {fetching ? <Spinner light /> : '↓'}
        {fetching ? 'Fetching…' : 'Fetch prices'}
      </button>

      {/* Fetch fundamentals */}
      <button style={btn(false, fundLoading)} disabled={anyLoading} onClick={onFetchFundamentals}>
        {fundLoading ? <Spinner /> : '↓'}
        {fundLoading ? 'Loading…' : 'Fundamentals'}
      </button>

      {/* Fetch market data */}
      {showMarket && (
        <button style={btn(false, marketLoading)} disabled={anyLoading} onClick={onFetchMarket}>
          {marketLoading ? <Spinner /> : '↓'}
          {marketLoading ? 'Loading…' : 'Market data'}
        </button>
      )}
    </div>
  )
}
