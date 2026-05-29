import { useState, useRef, useEffect } from 'react'
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
  // batch selector + save
  batches, loadedBatchDate, onLoadBatch,
  onSave, saving,
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

      {/* Batch selector — far right */}
      {batches && <BatchSelector batches={batches} loadedBatchDate={loadedBatchDate} onLoadBatch={onLoadBatch} />}

      {/* Save batch — rightmost */}
      {onSave && (
        <button
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
            fontFamily: 'inherit', cursor: saving ? 'default' : 'pointer',
            flexShrink: 0, whiteSpace: 'nowrap',
            opacity: saving ? 0.65 : 1,
            border: '1px solid #16a34a', background: '#16a34a', color: '#fff',
            transition: 'opacity .15s',
          }}
          disabled={saving} onClick={onSave}
        >
          {saving ? <Spinner light /> : '💾'}
          {saving ? 'Saving…' : 'Save batch'}
        </button>
      )}
    </div>
  )
}

function parseBatchDate(str) {
  if (!str) return new Date(0)
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1])
  const d = new Date(str); return isNaN(d) ? new Date(0) : d
}

function BatchSelector({ batches, loadedBatchDate, onLoadBatch }) {
  const [open, setOpen] = useState(false)
  const ref  = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sort newest first for the dropdown
  const sorted = batches
    ? [...batches].sort((a, b) => parseBatchDate(b.date) - parseBatchDate(a.date))
    : []
  const hasBatches = sorted.length > 0
  const label = loadedBatchDate || (hasBatches ? sorted[0].date : null) || 'No batches'

  return (
    <div ref={ref} style={{ position:'relative', flexShrink:0 }}>
      <button
        disabled={!hasBatches}
        onClick={() => setOpen(v => !v)}
        style={{
          display:'flex', alignItems:'center', gap:6,
          padding:'7px 12px', borderRadius:8,
          border:'1px solid var(--tw-border)',
          background:'var(--tw-card)',
          color: hasBatches ? 'var(--tw-fg)' : 'var(--tw-muted-fg)',
          fontSize:12, fontWeight:500, fontFamily:'inherit',
          cursor: hasBatches ? 'pointer' : 'default',
          opacity: hasBatches ? 1 : 0.6,
          whiteSpace:'nowrap',
        }}
      >
        {label}
        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" style={{ color:'var(--tw-muted-fg)', flexShrink:0 }}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
        </svg>
      </button>

      {open && hasBatches && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', right:0,
          background:'var(--tw-card)', border:'1px solid var(--tw-border)',
          borderRadius:10, boxShadow:'0 4px 16px rgba(0,0,0,0.1)',
          minWidth:180, zIndex:50, overflow:'hidden',
        }}>
          {sorted.map(batch => {
            const isActive = batch.date === loadedBatchDate
            return (
              <button
                key={batch.id}
                onClick={() => { onLoadBatch(batch); setOpen(false) }}
                style={{
                  width:'100%', display:'flex', alignItems:'center',
                  justifyContent:'space-between',
                  padding:'10px 14px', border:'none',
                  borderBottom:'1px solid var(--tw-border)',
                  background: isActive ? 'var(--tw-muted)' : 'var(--tw-card)',
                  color:'var(--tw-fg)', fontSize:13,
                  fontWeight: isActive ? 600 : 400,
                  cursor:'pointer', fontFamily:'inherit',
                  textAlign:'left',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--tw-muted)' }}
                onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'var(--tw-muted)' : 'var(--tw-card)' }}
              >
                {batch.date}
                {isActive && <span style={{ color:'#16a34a', fontSize:12 }}>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
