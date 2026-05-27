export default function FetchBar({ log, fetching, chunkProgress, horizonExpired, horizon, onFetch }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10,
      marginBottom:10, padding:'10px 14px',
      border:'1px solid var(--tw-border)',
      borderRadius:8, background:'var(--tw-card)',
      boxShadow:'0 1px 2px rgba(0,0,0,0.04)',
    }}>
      <span style={{ fontSize:13, fontWeight:600, color:'var(--tw-fg)', flexShrink:0 }}>Auto price</span>
      <span style={{ fontSize:12, color:'var(--tw-muted-fg)', fontFamily:'monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {log || 'Import stocks, then click Fetch'}
      </span>
      {fetching && (
        <div style={{ width:12, height:12, flexShrink:0, border:'1.5px solid var(--tw-border)', borderTopColor:'var(--tw-primary)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      )}
      {chunkProgress && !fetching && (
        <span style={{ fontSize:11, color:'var(--tw-muted-fg)', flexShrink:0 }}>{chunkProgress}</span>
      )}
      <span style={{ fontSize:11, color:'var(--tw-muted-fg)', flexShrink:0 }}>Twelve Data</span>
      <button
        style={{
          fontSize:13, padding:'6px 14px', borderRadius:8, cursor:'pointer',
          fontFamily:'inherit', fontWeight:500, flexShrink:0,
          border:'1px solid #16a34a', background:'#16a34a', color:'#fff',
          opacity: fetching ? 0.5 : 1,
        }}
        disabled={fetching}
        onClick={onFetch}
      >
        ↓ Fetch prices
      </button>
    </div>
  )
}
