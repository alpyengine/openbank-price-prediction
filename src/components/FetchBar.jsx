export default function FetchBar({ log, fetching, horizonExpired, horizon, onFetch }) {
  const isHistorical = horizonExpired && horizon !== 'best'

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem', padding:'10px 14px', border:'1px solid var(--border)', borderRadius:8, background:'var(--bg-2)' }}>
      <span style={{ fontSize:12, fontWeight:600, color:'var(--text)', flexShrink:0 }}>
        {isHistorical ? 'Historical price' : 'Auto price'}
      </span>
      <span style={{ fontSize:11, color:'var(--text-2)', fontFamily:'monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log}</span>
      {fetching && <div style={{ width:12, height:12, flexShrink:0, border:'1.5px solid var(--border)', borderTopColor:'var(--green)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />}
      {isHistorical
        ? <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:'var(--blue-bg)', color:'var(--blue)', border:'1px solid var(--blue-bdr)', flexShrink:0 }}>
            historical · {horizon}
          </span>
        : <span style={{ fontSize:10, color:'var(--text-3)', flexShrink:0 }}>Twelve Data</span>
      }
      {!isHistorical && (
        <button
          style={{ fontSize:12, padding:'6px 14px', borderRadius:6, cursor:'pointer', border:'1px solid var(--green-bdr)', background:'var(--green-bg)', color:'var(--green)', whiteSpace:'nowrap', fontFamily:'inherit', flexShrink:0, opacity: fetching ? 0.4 : 1 }}
          disabled={fetching}
          onClick={onFetch}
        >
          ↓ Fetch prices
        </button>
      )}
      {isHistorical && (
        <span style={{ fontSize:11, color:'var(--blue)', flexShrink:0 }}>auto-loaded on tab switch</span>
      )}
    </div>
  )
}
