export default function FetchBar({ log, fetching, serverOk, onFetch }) {
  return (
    <div style={styles.bar}>
      <span style={styles.label}>Auto price (prev close)</span>
      <span style={styles.log}>{log}</span>
      {fetching && <div style={styles.spinner} />}
      <button
        style={{ ...styles.btn, opacity: (!serverOk || fetching) ? 0.4 : 1 }}
        disabled={!serverOk || fetching}
        onClick={onFetch}
      >
        ↓ Fetch prices
      </button>
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: '1rem', padding: '10px 14px',
    border: '1px solid #30363d', borderRadius: 8, background: '#161b22',
  },
  label: { fontSize: 12, fontWeight: 600, color: '#e6edf3', flexShrink: 0 },
  log:   { fontSize: 11, color: '#8b949e', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  btn:   {
    fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
    border: '1px solid #238636', background: '#1a4a2e', color: '#3fb950',
    whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0,
  },
  spinner: {
    width: 12, height: 12, flexShrink: 0,
    border: '1.5px solid #30363d', borderTopColor: '#3fb950',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  },
}
