const barWrap = { marginBottom:'0.75rem', padding:'10px 14px', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', background:'var(--surface)', boxShadow:'var(--shadow)' }

export default function FetchBar({ log, fetching, chunkProgress, horizonExpired, horizon, onFetch }) {
  const isHistorical = horizonExpired && horizon !== 'best'
  const showProgress = fetching && chunkProgress && chunkProgress.total > 1

  return (
    <div style={barWrap}>
      {/* Top row: label + log + source + button */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:'var(--fs-sm)', fontWeight:700, color:'var(--text)', flexShrink:0 }}>
          {isHistorical ? 'Historical price' : 'Auto price'}
        </span>
        <span style={{ fontSize:'var(--fs-xs)', color:'var(--text-3)', fontFamily:'monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {log}
        </span>
        {fetching && !showProgress && (
          <div style={{ width:12, height:12, flexShrink:0, border:'1.5px solid var(--border)', borderTopColor:'var(--green)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
        )}
        <span style={{ fontSize:'var(--fs-xxs)', color:'var(--text-3)', flexShrink:0 }}>Twelve Data</span>
        {!isHistorical && (
          <button
            style={{ fontSize:'var(--fs-sm)', padding:'6px 14px', borderRadius:'var(--radius)', cursor:'pointer', fontFamily:'inherit', fontWeight:500, border:'1.5px solid var(--border-green)', background:'var(--green-bg)', color:'var(--green)', flexShrink:0, opacity: fetching ? 0.4 : 1 }}
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

      {/* Segmented progress bar — only when multi-chunk fetch */}
      {showProgress && (
        <div style={{ marginTop:10 }}>
          {/* Batch segments */}
          <div style={{ display:'flex', gap:3, marginBottom:6 }}>
            {Array.from({ length: chunkProgress.total }).map((_, i) => {
              const done    = i < chunkProgress.done
              const active  = i === chunkProgress.done && !chunkProgress.waiting
              const waiting = i === chunkProgress.done - 1 && chunkProgress.waiting
              let bg, color, border
              if (done && !waiting) {
                bg = 'var(--green-bg)'; color = 'var(--green)'; border = 'var(--border-green)'
              } else if (active) {
                bg = 'var(--blue-bg)'; color = 'var(--accent)'; border = 'var(--border-blue)'
              } else if (waiting) {
                bg = 'var(--amber-bg)'; color = 'var(--amber)'; border = '1px solid var(--amber)'
              } else {
                bg = 'var(--surface2)'; color = 'var(--text-3)'; border = 'var(--border)'
              }
              return (
                <div key={i} style={{ flex:1, height:22, borderRadius:4, background:bg, border:`0.5px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, color, transition:'all .3s' }}>
                  {done && !waiting ? `B${i+1} ✓` : active ? `B${i+1}…` : waiting ? `B${i+1} ⏳` : `B${i+1}`}
                </div>
              )
            })}
          </div>

          {/* Countdown bar — shown during wait */}
          {chunkProgress.waiting && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:'var(--fs-xxs)', color:'var(--amber)' }}>
                  Rate limit — waiting before batch {chunkProgress.done + 1}…
                </span>
                <span style={{ fontSize:'var(--fs-xxs)', fontWeight:600, color:'var(--amber)' }}>
                  {chunkProgress.waitSecs}s
                </span>
              </div>
              <div style={{ height:4, background:'var(--surface2)', borderRadius:99, overflow:'hidden' }}>
                <div style={{
                  height:'100%',
                  width: `${(chunkProgress.waitSecs / chunkProgress.waitTotal) * 100}%`,
                  background:'var(--amber)',
                  borderRadius:99,
                  transition:'width 1s linear',
                }} />
              </div>
            </>
          )}

          {/* Fetching bar — shown during active fetch */}
          {!chunkProgress.waiting && (
            <div style={{ height:4, background:'var(--surface2)', borderRadius:99, overflow:'hidden' }}>
              <div style={{
                height:'100%',
                width: `${(chunkProgress.done / chunkProgress.total) * 100}%`,
                background:'var(--green)',
                borderRadius:99,
                transition:'width .5s ease',
              }} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
