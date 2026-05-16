import { useState, useCallback, useRef } from 'react'
import { parseDate, today as getToday } from '../utils/dates.js'
import { DEFAULT_STOCKS } from '../utils/stocks.js'

const s = {
  box:       { border: '1px solid #30363d', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', background: '#0d1117' },
  h3:        { fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#e6edf3' },
  hint:      { fontSize: 11, color: '#8b949e', marginBottom: 6, lineHeight: 1.6 },
  code:      { fontFamily: 'monospace', background: '#161b22', padding: '2px 6px', borderRadius: 4, fontSize: 11, color: '#79c0ff' },
  textarea:  { width: '100%', height: 90, fontSize: 11, fontFamily: 'monospace', padding: 8, border: '1px solid #30363d', borderRadius: 6, background: '#161b22', color: '#e6edf3', resize: 'vertical', outline: 'none' },
  error:     { marginTop: 6, fontSize: 11, color: '#f85149' },
  success:   { marginTop: 6, fontSize: 11, color: '#3fb950' },
  row:       { display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' },
  hint2:     { fontSize: 10, color: '#484f58' },
  btnP:      { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #1f6feb', background: '#0d2136', color: '#58a6ff' },
  btnG:      { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #30363d', background: 'transparent', color: '#e6edf3' },
  btnDanger: { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #3d1515', background: 'transparent', color: '#f85149' },
  btnFile:   { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #238636', background: '#1a4a2e', color: '#3fb950' },
  divider:   { width: '1px', height: 20, background: '#30363d', flexShrink: 0 },
  fileInput: { display: 'none' },
}

/** Parse CSV text into stock objects. Skips the first row if it looks like a header. */
function parseCSV(text, onImport, setError, setCsv, setMsg) {
  setError('')
  setMsg('')

  const allLines = text.trim().split('\n').filter(l => l.trim())
  if (!allLines.length) { setError('No data found.'); return }

  // Detect header row — first cell is not a number and not a ticker-like value
  // A header row typically has words like "Ticker", "Company", "Symbol" in col 0
  const firstCell = allLines[0].split(',')[0].trim().toLowerCase()
  const isHeader  = isNaN(firstCell) && /[a-z]{2,}/.test(firstCell) &&
                    ['ticker','symbol','stock','company','name'].some(w => firstCell.includes(w))

  const lines = isHeader ? allLines.slice(1) : allLines

  if (!lines.length) { setError('Only a header row found — no data rows.'); return }

  const TODAY  = getToday()
  const stocks = []
  const bad    = []

  lines.forEach((line, i) => {
    const p = line.split(',').map(x => x.trim())
    if (p.length < 8) { bad.push(`Row ${i + 1}: needs at least 8 fields`); return }
    const base = p[8] ? parseDate(p[8]) : TODAY
    stocks.push({
      t:   p[0].toUpperCase(),
      co:  p[1],
      cu:  p[2],
      b:   +p[3] || 0,
      t1:  +p[4] || 0,
      t3:  +p[5] || 0,
      t6:  +p[6] || 0,
      t12: +p[7] || 0,
      base: base || TODAY,
    })
  })

  if (bad.length)     { setError(bad.join(' | ')); return }
  if (!stocks.length) { setError('No valid rows found.'); return }

  onImport(stocks)
  setMsg(`${stocks.length} stock${stocks.length > 1 ? 's' : ''} imported successfully${isHeader ? ' (header row skipped)' : ''}`)
}

export default function ImportBox({ onImport }) {
  const [csv,   setCsv]   = useState('')
  const [error, setError] = useState('')
  const [msg,   setMsg]   = useState('')
  const fileRef           = useRef(null)

  // ── Import from textarea ────────────────────────────────────────────────────
  const handleImport = useCallback(() => {
    if (!csv.trim()) { setError('Paste CSV data or load a file first.'); return }
    parseCSV(csv, onImport, setError, setCsv, setMsg)
  }, [csv, onImport])

  // ── Clear textarea ──────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setCsv('')
    setError('')
    setMsg('')
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  // ── Load CSV file from disk ─────────────────────────────────────────────────
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setMsg('')

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setError('Please select a .csv file.')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      setCsv(text)
      // Auto-import after loading
      parseCSV(text, onImport, setError, setCsv, setMsg)
    }
    reader.onerror = () => setError('Could not read file.')
    reader.readAsText(file)
  }, [onImport])

  // ── Sample data ─────────────────────────────────────────────────────────────
  const handleSample = useCallback(() => {
    onImport(DEFAULT_STOCKS.map(s => ({ ...s })))
    setCsv('')
    setError('')
    setMsg('Sample data loaded')
  }, [onImport])

  return (
    <div style={s.box}>
      <h3 style={s.h3}>Import stocks</h3>
      <p style={s.hint}>
        Format: <code style={s.code}>TICKER, Company, CCY, BasePrice, 1M, 3M, 6M, 12M, DD/MM/YYYY</code><br />
        The 9th field is the <strong>screenshot date</strong> — base for the 4 target horizons.
        Load a <strong>.csv file</strong> directly or paste the data below.
        The first row is skipped automatically if it contains column headers.
      </p>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt"
        style={s.fileInput}
        onChange={handleFileChange}
      />

      <textarea
        style={s.textarea}
        value={csv}
        onChange={e => { setCsv(e.target.value); setMsg('') }}
        placeholder={
          'Ticker,Company,CCY,BasePrice,1M,3M,6M,12M,Date\n' +
          'AXP,American Express,USD,314.46,327.23,293.83,296.32,521.60,08/05/2026\n' +
          'AMD,Advanced Micro Devices,USD,441.10,438.97,484.35,513.88,720.69,08/05/2026'
        }
        spellCheck={false}
      />

      {error && <div style={s.error}>{error}</div>}
      {msg   && <div style={s.success}>{msg}</div>}

      <div style={s.row}>
        {/* Load file */}
        <button style={s.btnFile} onClick={() => fileRef.current?.click()}>
          &#128194; Load CSV file
        </button>

        <div style={s.divider} />

        {/* Import from textarea */}
        <button style={s.btnP} onClick={handleImport}>Import</button>

        {/* Clear */}
        <button style={s.btnDanger} onClick={handleClear}>Clear</button>

        <div style={s.divider} />

        {/* Sample data */}
        <button style={s.btnG} onClick={handleSample}>Sample data</button>

        <span style={s.hint2}>Load file or paste CSV → Import → Fetch prices</span>
      </div>
    </div>
  )
}
