const bar = { display:'flex', alignItems:'center', gap:10, marginBottom:'0.75rem', padding:'10px 14px', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', background:'var(--surface)', boxShadow:'var(--shadow)' }

export default function FetchBar({ log, fetching, horizonExpired, horizon, onFetch }) {
  const isHistorical = horizonExpired && horizon !== 'best'
  return (
    <div style={bar}>
      <span style={{ fontSize:'var(--fs-sm)', fontWeight:700, color:'var(--text)', flexShrink:0 }}>
        {isHistorical ? 'Historical price' : 'Auto price'}
      </span>
      <span style={{ fontSize:'var(--fs-xs)', color:'var(--text-3)', fontFamily:'monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log}</span>
      {fetching && <div style={{ width:12, height:12, flexShrink:0, border:'1.5px solid var(--border)', borderTopColor:'var(--green)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />}
      <span style={{ fontSize:'var(--fs-xxs)', color:'var(--text-3)', flexShrink:0 }}>Twelve Data</span>
      {!isHistorical && (
        <button
          style={{ fontSize:'var(--fs-sm)', padding:'6px 14px', borderRadius:'var(--radius)', cursor:'pointer', fontFamily:'inherit', fontWeight:500, border:'1.5px solid var(--border-green)', background:'var(--green-bg)', color:'var(--green)', flexShrink:0, opacity: fetching ? 0.4 : 1, transition:'filter 0.15s' }}
          disabled={fetching}
          onClick={onFetch}
        >
          ↓ Fetch prices
        </button>
      )}
      {isHistorical && (
        <span style={{ fontSize:'var(--fs-xs)', color:'var(--accent)', flexShrink:0 }}>auto-loaded on tab switch</span>
      )}
    </div>
  )
}
