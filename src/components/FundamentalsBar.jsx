export default function FundamentalsBar({ log, loading, onFetch }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10,
      marginBottom:10, padding:'10px 14px',
      border:'1px solid var(--tw-border)',
      borderRadius:8, background:'var(--tw-card)',
      boxShadow:'0 1px 2px rgba(0,0,0,0.04)',
    }}>
      <span style={{ fontSize:13, fontWeight:600, color:'var(--tw-fg)', flexShrink:0 }}>Fundamentals</span>
      <span style={{ fontSize:12, color:'var(--tw-muted-fg)', fontFamily:'monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {log || 'Click Fetch to load sector, market cap and PER forward'}
      </span>
      {loading && (
        <div style={{ width:12, height:12, flexShrink:0, border:'1.5px solid var(--tw-border)', borderTopColor:'var(--tw-primary)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      )}
      <span style={{ fontSize:11, color:'var(--tw-muted-fg)', flexShrink:0 }}>FMP + TD</span>
      <button
        style={{
          fontSize:13, padding:'6px 14px', borderRadius:8, cursor:'pointer',
          fontFamily:'inherit', fontWeight:500, flexShrink:0,
          border:'1px solid var(--tw-border)', background:'var(--tw-card)', color:'var(--tw-fg)',
          opacity: loading ? 0.5 : 1,
        }}
        disabled={loading}
        onClick={onFetch}
      >
        ↓ Fetch fundamentals
      </button>
    </div>
  )
}
