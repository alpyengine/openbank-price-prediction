const bar = { display:'flex', alignItems:'center', gap:10, marginBottom:'1rem', padding:'10px 14px', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', background:'var(--surface)', boxShadow:'var(--shadow)' }

export default function FundamentalsBar({ log, loading, onFetch }) {
  return (
    <div style={bar}>
      <span style={{ fontSize:'var(--fs-sm)', fontWeight:700, color:'var(--text)', flexShrink:0 }}>Fundamentals</span>
      <span style={{ fontSize:'var(--fs-xs)', color:'var(--text-3)', fontFamily:'monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {log || 'Click Fetch to load sector, market cap and PER forward'}
      </span>
      {loading && <div style={{ width:12, height:12, flexShrink:0, border:'1.5px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />}
      <span style={{ fontSize:'var(--fs-xxs)', color:'var(--text-3)', flexShrink:0 }}>FMP + TD</span>
      <button
        style={{ fontSize:'var(--fs-sm)', padding:'6px 14px', borderRadius:'var(--radius)', cursor:'pointer', fontFamily:'inherit', fontWeight:500, border:'1.5px solid var(--border-blue)', background:'var(--surface)', color:'var(--accent)', flexShrink:0, opacity: loading ? 0.4 : 1 }}
        disabled={loading}
        onClick={onFetch}
      >
        ↓ Fetch fundamentals
      </button>
    </div>
  )
}
