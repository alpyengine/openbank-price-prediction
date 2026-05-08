import { useState, useCallback } from 'react'
import { parseDate, today as getToday } from '../utils/dates.js'
import { DEFAULT_STOCKS } from '../utils/stocks.js'

export default function ImportBox({ onImport }) {
  const [csv, setCsv] = useState('')
  const [error, setError] = useState('')

  const handleImport = useCallback(() => {
    setError('')
    const lines = csv.trim().split('\n').filter(l => l.trim())
    if (!lines.length) { setError('Paste at least one CSV row.'); return }

    const TODAY = getToday()
    const stocks = []
    const bad = []

    lines.forEach((line, i) => {
      const p = line.split(',').map(x => x.trim())
      if (p.length < 8) { bad.push(`Line ${i + 1}: needs 8+ fields`); return }
      const baseDate = p[8] ? parseDate(p[8]) : TODAY
      stocks.push({
        t:    p[0].toUpperCase(),
        co:   p[1],
        cu:   p[2],
        b:    +p[3] || 0,
        t1:   +p[4] || 0,
        t3:   +p[5] || 0,
        t6:   +p[6] || 0,
        t12:  +p[7] || 0,
        base: baseDate || TODAY,
      })
    })

    if (bad.length) { setError(bad.join(' | ')); return }
    if (!stocks.length) { setError('No valid rows found.'); return }
    onImport(stocks)
    setError('')
  }, [csv, onImport])

  const handleLoadDefaults = useCallback(() => {
    onImport(DEFAULT_STOCKS.map(s => ({ ...s })))
    setCsv('')
    setError('')
  }, [onImport])

  return (
    <div style={styles.box}>
      <h3 style={styles.h3}>Import stocks</h3>
      <p style={styles.hint}>
        Format (9 fields):&nbsp;
        <code style={styles.code}>TICKER, Company, CCY, BasePrice, 1M, 3M, 6M, 12M, DD/MM/YYYY</code>
        <br />
        The 9th field is the <strong>screenshot date</strong> used as base for the 4 target horizons.
        Each row can have a different date.
      </p>
      <textarea
        style={styles.textarea}
        value={csv}
        onChange={e => setCsv(e.target.value)}
        placeholder={
          'TER,Teradyne,USD,299.40,353.92,257.57,341.91,790.98,18/03/2026\n' +
          'HWM,Howmet Aerospace,USD,240.24,250.45,260.90,269.81,456.70,18/03/2026'
        }
        spellCheck={false}
      />
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.row}>
        <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleImport}>
          Import
        </button>
        <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={handleLoadDefaults}>
          Sample data
        </button>
        <span style={styles.hint2}>After import → click Fetch prices</span>
      </div>
    </div>
  )
}

const styles = {
  box:       { border: '1px solid #30363d', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', background: '#0d1117' },
  h3:        { fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#e6edf3' },
  hint:      { fontSize: 11, color: '#8b949e', marginBottom: 6, lineHeight: 1.6 },
  hint2:     { fontSize: 10, color: '#484f58' },
  code:      { fontFamily: 'monospace', background: '#161b22', padding: '2px 6px', borderRadius: 4, fontSize: 11, color: '#79c0ff' },
  textarea:  { width: '100%', height: 90, fontSize: 11, fontFamily: 'monospace', padding: 8, border: '1px solid #30363d', borderRadius: 6, background: '#161b22', color: '#e6edf3', resize: 'vertical', outline: 'none' },
  error:     { marginTop: 6, fontSize: 11, color: '#f85149' },
  row:       { display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' },
  btn:       { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' },
  btnPrimary:{ border: '1px solid #1f6feb', background: '#0d2136', color: '#58a6ff' },
  btnGhost:  { border: '1px solid #30363d', background: 'transparent', color: '#e6edf3' },
}
