const s = {
  bar:     { display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', padding: '10px 14px', border: '1px solid #30363d', borderRadius: 8, background: '#161b22' },
  label:   { fontSize: 12, fontWeight: 600, color: '#e6edf3', flexShrink: 0 },
  log:     { fontSize: 11, color: '#8b949e', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  spinner: { width: 12, height: 12, flexShrink: 0, border: '1.5px solid #30363d', borderTopColor: '#58a6ff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  source:  { fontSize: 10, color: '#484f58', flexShrink: 0 },
  btn:     { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', border: '1px solid #1f6feb', background: '#0d2136', color: '#58a6ff', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0 },
}

export default function FundamentalsBar({ log, loading, onFetch }) {
  return (
    <div style={s.bar}>
      <span style={s.label}>Fundamentals</span>
      <span style={s.log}>{log || 'Click Fetch to load sector, market cap and PER forward'}</span>
      {loading && <div style={s.spinner} />}
      <span style={s.source}>Twelve Data</span>
      <button
        style={{ ...s.btn, opacity: loading ? 0.4 : 1 }}
        disabled={loading}
        onClick={onFetch}
      >
        &#8595; Fetch fundamentals
      </button>
    </div>
  )
}
