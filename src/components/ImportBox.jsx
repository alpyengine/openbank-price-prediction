import { useState, useCallback, useRef } from 'react'
import { parseDate, today as getToday } from '../utils/dates.js'
import { DEFAULT_STOCKS } from '../utils/stocks.js'

function parseCSV(text, onImport, setError, setCsv, setMsg) {
  setError(''); setMsg('')
  const allLines = text.trim().split('\n').filter(l => l.trim())
  if (!allLines.length) { setError('No data found.'); return }
  const firstCell = allLines[0].split(',')[0].trim().toLowerCase()
  const isHeader  = isNaN(firstCell) && /[a-z]{2,}/.test(firstCell) &&
                    ['ticker','symbol','stock','company','name'].some(w => firstCell.includes(w))
  const lines = isHeader ? allLines.slice(1) : allLines
  if (!lines.length) { setError('Only a header row found — no data rows.'); return }
  const TODAY = getToday()
  const stocks = [], bad = []
  lines.forEach((line, i) => {
    const p = line.split(',').map(x => x.trim())
    if (p.length < 8) { bad.push(`Row ${i+1}: needs at least 8 fields`); return }
    const base = p[8] ? parseDate(p[8]) : TODAY
    stocks.push({ t:p[0].toUpperCase(), co:p[1], cu:p[2], b:+p[3]||0, t1:+p[4]||0, t3:+p[5]||0, t6:+p[6]||0, t12:+p[7]||0, base:base||TODAY })
  })
  if (bad.length)     { setError(bad.join(' | ')); return }
  if (!stocks.length) { setError('No valid rows found.'); return }
  onImport(stocks)
  setMsg(`${stocks.length} stock${stocks.length>1?'s':''} imported successfully${isHeader?' (header row skipped)':''}`)
}

export default function ImportBox({ onImport }) {
  const [csv,   setCsv]   = useState('')
  const [error, setError] = useState('')
  const [msg,   setMsg]   = useState('')
  const fileRef           = useRef(null)

  const handleImport = useCallback(() => {
    if (!csv.trim()) { setError('Paste CSV data or load a file first.'); return }
    parseCSV(csv, onImport, setError, setCsv, setMsg)
  }, [csv, onImport])

  const handleClear = useCallback(() => {
    setCsv(''); setError(''); setMsg('')
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setMsg('')
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) { setError('Please select a .csv file.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => { const text = ev.target.result; setCsv(text); parseCSV(text, onImport, setError, setCsv, setMsg) }
    reader.onerror = () => setError('Could not read file.')
    reader.readAsText(file)
  }, [onImport])

  const handleSample = useCallback(() => {
    onImport(DEFAULT_STOCKS.map(s => ({ ...s })))
    setCsv(''); setError(''); setMsg('Sample data loaded')
  }, [onImport])

  const btn = (extra) => ({ fontSize:12, padding:'6px 14px', borderRadius:6, cursor:'pointer', fontFamily:'inherit', ...extra })

  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:8, padding:'1rem', marginBottom:'1.5rem', background:'var(--bg-2)' }}>
      <h3 style={{ fontSize:13, fontWeight:600, marginBottom:8, color:'var(--text)' }}>Import stocks</h3>
      <p style={{ fontSize:11, color:'var(--text-2)', marginBottom:6, lineHeight:1.6 }}>
        Format: <code style={{ fontFamily:'monospace', background:'var(--bg-3)', padding:'2px 6px', borderRadius:4, fontSize:11, color:'var(--blue)' }}>TICKER, Company, CCY, BasePrice, 1M, 3M, 6M, 12M, DD/MM/YYYY</code><br />
        Load a <strong>.csv file</strong> directly or paste below. Header row is skipped automatically.
      </p>
      <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={handleFileChange} />
      <textarea
        style={{ width:'100%', height:90, fontSize:11, fontFamily:'monospace', padding:8, border:'1px solid var(--border)', borderRadius:6, background:'var(--bg)', color:'var(--text)', resize:'vertical', outline:'none' }}
        value={csv}
        onChange={e => { setCsv(e.target.value); setMsg('') }}
        placeholder={'Ticker,Company,CCY,BasePrice,1M,3M,6M,12M,Date\nAXP,American Express,USD,314.46,327.23,293.83,296.32,521.60,08/05/2026'}
        spellCheck={false}
      />
      {error && <div style={{ marginTop:6, fontSize:11, color:'var(--red)' }}>{error}</div>}
      {msg   && <div style={{ marginTop:6, fontSize:11, color:'var(--green)' }}>{msg}</div>}
      <div style={{ display:'flex', gap:8, marginTop:8, alignItems:'center', flexWrap:'wrap' }}>
        <button style={btn({ border:'1px solid var(--green-bdr)', background:'var(--green-bg)', color:'var(--green)' })} onClick={() => fileRef.current?.click()}>📂 Load CSV</button>
        <button style={btn({ border:'1px solid var(--blue-bdr)', background:'var(--blue-bg)', color:'var(--blue)' })} onClick={handleImport}>Import</button>
        <button style={btn({ border:'1px solid var(--red-bg)', background:'transparent', color:'var(--red)' })} onClick={handleClear}>Clear</button>
        <div style={{ width:1, height:20, background:'var(--border)' }} />
        <button style={btn({ border:'1px solid var(--border)', background:'transparent', color:'var(--text)' })} onClick={handleSample}>Sample data</button>
        <span style={{ fontSize:10, color:'var(--text-3)' }}>Load file or paste → Import → Fetch prices</span>
      </div>
    </div>
  )
}
