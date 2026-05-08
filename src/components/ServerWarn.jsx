export default function ServerWarn({ status, onRetry }) {
  if (status === 'ok') return null

  return (
    <div style={styles.box}>
      <span>⚠</span>
      <div>
        {status === 'checking'
          ? 'Connecting to local server...'
          : <>
              <strong>Server not running</strong> — price fetch requires the local Python server.<br />
              In a terminal: <code style={styles.code}>cd &lt;folder&gt;</code> then <code style={styles.code}>python run.py</code><br />
              Then open <code style={styles.code}>http://localhost:8765</code>&nbsp;
              <button style={styles.retryBtn} onClick={onRetry}>Retry</button>
            </>
        }
      </div>
    </div>
  )
}

const styles = {
  box: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '10px 14px', border: '1px solid #d29922',
    borderRadius: 8, background: '#1a1200',
    marginBottom: '1rem', fontSize: 12, color: '#d29922', lineHeight: 1.6,
  },
  code: {
    background: '#2d2208', padding: '2px 6px', borderRadius: 4,
    fontFamily: 'monospace', fontSize: 11, color: '#f0c060',
  },
  retryBtn: {
    fontSize: 11, padding: '2px 10px', borderRadius: 4,
    border: '1px solid #d29922', background: 'transparent',
    color: '#d29922', cursor: 'pointer', marginLeft: 8,
  },
}
