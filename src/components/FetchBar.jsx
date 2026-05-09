const s = {
  bar:     { display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', padding: '10px 14px', border: '1px solid #30363d', borderRadius: 8, background: '#161b22' },
  label:   { fontSize: 12, fontWeight: 600, color: '#e6edf3', flexShrink: 0 },
  log:     { fontSize: 11, color: '#8b949e', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  spinner: { width: 12, height: 12, flexShrink: 0, border: '1.5px solid #30363d', borderTopColor: '#3fb950', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  btn:     { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', border: '1px solid #238636', background: '#1a4a2e', color: '#3fb950', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0 },
  source:  { fontSize: 10, color: '#484f58', flexShrink: 0 },
}

export default function FetchBar({ log, fetching, onFetch }) {
  return (
    <div style={s.bar}>
      <span style={s.label}>Auto price</span>
      <span style={s.log}>{log}</span>
      {fetching && <div style={s.spinner} />}
      <span style={s.source}>Twelve Data</span>
      <button
        style={{ ...s.btn, opacity: fetching ? 0.4 : 1 }}
        disabled={fetching}
        onClick={onFetch}
      >
        ↓ Fetch prices
      </button>
    </div>
  )
}
