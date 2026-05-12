const s = {
  bar:      { display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', padding: '10px 14px', border: '1px solid #30363d', borderRadius: 8, background: '#161b22' },
  label:    { fontSize: 12, fontWeight: 600, color: '#e6edf3', flexShrink: 0 },
  log:      { fontSize: 11, color: '#8b949e', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  spinner:  { width: 12, height: 12, flexShrink: 0, border: '1.5px solid #30363d', borderTopColor: '#3fb950', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  source:   { fontSize: 10, color: '#484f58', flexShrink: 0 },
  badge:    { fontSize: 10, padding: '2px 8px', borderRadius: 10, flexShrink: 0 },
}

export default function FetchBar({ log, fetching, horizonExpired, horizon, onFetch }) {
  const isHistorical = horizonExpired && horizon !== 'best'

  return (
    <div style={s.bar}>
      <span style={s.label}>
        {isHistorical ? 'Historical price' : 'Auto price'}
      </span>
      <span style={s.log}>{log}</span>
      {fetching && <div style={s.spinner} />}
      {isHistorical
        ? <span style={{ ...s.badge, background: '#0d2136', color: '#58a6ff', border: '1px solid #1f6feb' }}>
            historical · {horizon}
          </span>
        : <span style={s.source}>Twelve Data</span>
      }
      {!isHistorical && (
        <button
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', border: '1px solid #238636', background: '#1a4a2e', color: '#3fb950', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0, opacity: fetching ? 0.4 : 1 }}
          disabled={fetching}
          onClick={onFetch}
        >
          ↓ Fetch prices
        </button>
      )}
      {isHistorical && (
        <span style={{ fontSize: 11, color: '#58a6ff', flexShrink: 0 }}>
          auto-loaded on tab switch
        </span>
      )}
    </div>
  )
}
