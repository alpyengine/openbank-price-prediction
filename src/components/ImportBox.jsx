import { useState, useCallback } from 'react'
import { parseDate, today as getToday } from '../utils/dates.js'
import { DEFAULT_STOCKS } from '../utils/stocks.js'

const s = {
  box:      { border: '1px solid #30363d', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', background: '#0d1117' },
  h3:       { fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#e6edf3' },
  hint:     { fontSize: 11, color: '#8b949e', marginBottom: 6, lineHeight: 1.6 },
  code:     { fontFamily: 'monospace', background: '#161b22', padding: '2px 6px', borderRadius: 4, fontSize: 11, color: '#79c0ff' },
  textarea: { width: '100%', height: 90, fontSize: 11, fontFamily: 'monospace', padding: 8, border: '1px solid #30363d', borderRadius: 6, background: '#161b22', color: '#e6edf3', resize: 'vertical', outline: 'none' },
  error:    { marginTop: 6, fontSize: 11, color: '#f85149' },
  row:      { display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' },
  hint2:    { fontSize: 10, color: '#484f58' },
  btnP:     { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #1f6feb', background: '#0d2136', color: '#58a6ff' },
  btnG:     { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #30363d', background: 'transparent', color: '#e6edf3' },
}

export default function ImportBox({ onImport }) {
  const [csv,   setCsv]   = useState('')
  const [error, setError] = useState('')

  const handleImport = useCallback(() => {
    setError('')
    const lines = csv.trim().split('\n').filter(l => l.trim())
    if (!lines.length) { setError('Paste at least one CSV row.'); return }

    const TODAY  = getToday()
    const stocks = []
    const bad    = []

    lines.forEach((line, i) => {
      const p = line.split(',').map(x => x.trim())
      if (p.length < 8) { bad.push(`Line ${i + 1}: needs at least 8 fields`); return }
      const base = p[8] ? parseDate(p[8]) : TODAY
      stocks.push({
        t: p[0].toUpperCase(), co: p[1], cu: p[2],
        b: +p[3] || 0, t1: +p[4] || 0, t3: +p[5] || 0, t6: +p[6] || 0, t12: +p[7] || 0,
        base: base || TODAY,
      })
    })

    if (bad.length)    { setError(bad.join(' | ')); return }
    if (!stocks.length){ setError('No valid rows found.'); return }
    onImport(stocks)
  }, [csv, onImport])

  const handleSample = useCallback(() => {
    onImport(DEFAULT_STOCKS.map(s => ({ ...s })))
    setCsv('')
    setError('')
  }, [onImport])

  return (
    <div style={s.box}>
      <h3 style={s.h3}>Import stocks</h3>
      <p style={s.hint}>
        Format: <code style={s.code}>TICKER, Company, CCY, BasePrice, 1M, 3M, 6M, 12M, DD/MM/YYYY</code><br />
        The 9th field is the <strong>screenshot date</strong> — used as base for the 4 target horizons.
        Each row can have a different date.
      </p>
      <textarea
        style={s.textarea}
        value={csv}
        onChange={e => setCsv(e.target.value)}
        placeholder={
          'AXP,American Express,USD,314.46,327.23,293.83,296.32,521.60,08/05/2026\n' +
          'AMD,Advanced Micro Devices,USD,441.10,438.97,484.35,513.88,720.69,08/05/2026\n' +
          'URI,United Rentals,USD,933.75,1004.26,1010.78,1024.09,1615.39,08/05/2026\n' +
          'MCD,McDonalds Corp,USD,277.60,288.47,306.68,328.16,344.01,08/05/2026'
        }
        spellCheck={false}
      />
      {error && <div style={s.error}>{error}</div>}
      <div style={s.row}>
        <button style={s.btnP} onClick={handleImport}>Import</button>
        <button style={s.btnG} onClick={handleSample}>Sample data</button>
        <span style={s.hint2}>After import → click Fetch prices</span>
      </div>
    </div>
  )
}
