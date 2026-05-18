export default function FundamentalsBar({ log, loading, onFetch }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem', padding:'10px 14px', border:'1px solid var(--border)', borderRadius:8, background:'var(--bg-2)' }}>
      <span style={{ fontSize:12, fontWeight:600, color:'var(--text)', flexShrink:0 }}>Fundamentals</span>
      <span style={{ fontSize:11, color:'var(--text-2)', fontFamily:'monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {log || 'Click Fetch to load sector, market cap and PER forward'}
      </span>
      {loading && <div style={{ width:12, height:12, flexShrink:0, border:'1.5px solid var(--border)', borderTopColor:'var(--blue)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />}
      <span style={{ fontSize:10, color:'var(--text-3)', flexShrink:0 }}>Twelve Data</span>
      <button
        style={{ fontSize:12, padding:'6px 14px', borderRadius:6, cursor:'pointer', border:'1px solid var(--blue-bdr)', background:'var(--blue-bg)', color:'var(--blue)', whiteSpace:'nowrap', fontFamily:'inherit', flexShrink:0, opacity: loading ? 0.4 : 1 }}
        disabled={loading}
        onClick={onFetch}
      >
        ↓ Fetch fundamentals
      </button>
    </div>
  )
}
