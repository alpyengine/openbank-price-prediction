import { useState, useCallback, useRef } from 'react'
import { parseDate, today as getToday } from '../utils/dates.js'
import { DEFAULT_STOCKS } from '../utils/stocks.js'
import { Upload, FileText, Trash2, Info } from 'lucide-react'

function parseCSV(text, onImport, setError, setCsv, setMsg, setPreview) {
  setError(''); setMsg('')
  const allLines = text.trim().split('\n').filter(l => l.trim())
  if (!allLines.length) { setError('No data found.'); return }
  const firstCell = allLines[0].split(',')[0].trim().toLowerCase()
  const isHeader = isNaN(firstCell) && /[a-z]{2,}/.test(firstCell) &&
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
  setPreview(stocks)
  onImport(stocks)
  setMsg(`✓ ${stocks.length} stock${stocks.length>1?'s':''} imported${isHeader?' (header skipped)':''}`)
}

export default function ImportBox({ onImport }) {
  const [csv,     setCsv]     = useState('')
  const [error,   setError]   = useState('')
  const [msg,     setMsg]     = useState('')
  const [preview, setPreview] = useState([])
  const fileRef = useRef(null)

  const handleImport = useCallback(() => {
    if (!csv.trim()) { setError('Paste CSV data or load a file first.'); return }
    parseCSV(csv, onImport, setError, setCsv, setMsg, setPreview)
  }, [csv, onImport])

  const handleClear = useCallback(() => {
    setCsv(''); setError(''); setMsg(''); setPreview([])
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setMsg('')
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) { setError('Please select a .csv file.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => { const text = ev.target.result; setCsv(text); parseCSV(text, onImport, setError, setCsv, setMsg, setPreview) }
    reader.onerror = () => setError('Could not read file.')
    reader.readAsText(file)
  }, [onImport])

  const handleSample = useCallback(() => {
    onImport(DEFAULT_STOCKS.map(s => ({ ...s })))
    setCsv(''); setError(''); setMsg('✓ Sample data loaded')
  }, [onImport])

  const btn = (variant) => ({
    display:'inline-flex', alignItems:'center', gap:6,
    fontSize:13, padding:'7px 14px', borderRadius:8,
    cursor:'pointer', fontFamily:'inherit', fontWeight:500,
    transition:'background .15s',
    ...(variant === 'primary' ? {
      border:'1px solid #16a34a', background:'#16a34a', color:'#fff',
    } : variant === 'secondary' ? {
      border:'1px solid var(--tw-border)', background:'var(--tw-card)', color:'var(--tw-fg)',
    } : {
      border:'1px solid transparent', background:'transparent', color:'#dc2626',
    })
  })

  return (
    <div style={{ background:'var(--tw-card)', border:'1px solid var(--tw-border)', borderRadius:10, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', marginBottom:'1.5rem' }}>
      {/* Header */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--tw-border)', display:'flex', alignItems:'center', gap:8 }}>
        <FileText size={15} color="var(--tw-muted-fg)" />
        <span style={{ fontSize:14, fontWeight:600, color:'var(--tw-fg)' }}>Import stocks</span>
      </div>

      <div style={{ padding:'14px 16px' }}>
        {/* Format hint */}
        <div style={{ display:'flex', gap:6, alignItems:'flex-start', padding:'8px 10px', borderRadius:8, background:'var(--tw-muted)', marginBottom:10 }}>
          <Info size={13} color="var(--tw-muted-fg)" style={{ marginTop:1, flexShrink:0 }} />
          <p style={{ fontSize:12, color:'var(--tw-muted-fg)', lineHeight:1.5, margin:0 }}>
            Format: <code style={{ fontFamily:'monospace', fontSize:11 }}>TICKER, Company, CCY, BasePrice, 1M, 3M, 6M, 12M, DD/MM/YYYY</code>
            <br />Load a <strong>.csv file</strong> or paste below. Header row is skipped automatically.
          </p>
        </div>

        <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={handleFileChange} />

        <textarea
          style={{
            width:'100%', height:80, fontSize:12, fontFamily:'monospace',
            padding:'8px 10px', border:'1px solid var(--tw-border)', borderRadius:8,
            background:'var(--tw-muted)', color:'var(--tw-fg)',
            resize:'vertical', outline:'none', lineHeight:1.5,
          }}
          value={csv}
          onChange={e => { setCsv(e.target.value); setMsg('') }}
          placeholder={'Ticker,Company,CCY,BasePrice,1M,3M,6M,12M,Date\nAXP,American Express,USD,314.46,327.23,293.83,296.32,521.60,08/05/2026'}
          spellCheck={false}
        />

        {error && <div style={{ marginTop:6, fontSize:12, color:'#dc2626', display:'flex', alignItems:'center', gap:4 }}>⚠ {error}</div>}
        {msg   && <div style={{ marginTop:6, fontSize:12, color:'#16a34a', fontWeight:600 }}>{msg}</div>}

        {preview.length > 0 && (
          <div style={{ marginTop:12, overflowX:'auto' }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--tw-muted-fg)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Preview — {preview.length} stock{preview.length > 1 ? 's' : ''}
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'var(--tw-muted)' }}>
                  {['Ticker','Company','CCY','Base','1M','3M','6M','12M','Date'].map(h => (
                    <th key={h} style={{ padding:'5px 8px', textAlign:'left', fontWeight:600, color:'var(--tw-muted-fg)', borderBottom:'1px solid var(--tw-border)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((s, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid var(--tw-border)', background: i % 2 === 0 ? 'transparent' : 'var(--tw-muted)' }}>
                    <td style={{ padding:'5px 8px', fontWeight:600, color:'var(--tw-fg)', fontFamily:'monospace' }}>{s.t}</td>
                    <td style={{ padding:'5px 8px', color:'var(--tw-fg)', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.co}</td>
                    <td style={{ padding:'5px 8px', color:'var(--tw-muted-fg)' }}>{s.cu}</td>
                    <td style={{ padding:'5px 8px', color:'var(--tw-fg)' }}>{s.b.toFixed(2)}</td>
                    <td style={{ padding:'5px 8px', color:'#16a34a' }}>{s.t1.toFixed(2)}</td>
                    <td style={{ padding:'5px 8px', color:'#16a34a' }}>{s.t3.toFixed(2)}</td>
                    <td style={{ padding:'5px 8px', color:'#16a34a' }}>{s.t6.toFixed(2)}</td>
                    <td style={{ padding:'5px 8px', color:'#16a34a' }}>{s.t12.toFixed(2)}</td>
                    <td style={{ padding:'5px 8px', color:'var(--tw-muted-fg)', fontFamily:'monospace', fontSize:11 }}>
                      {s.base ? `${String(s.base.getDate()).padStart(2,'0')}/${String(s.base.getMonth()+1).padStart(2,'0')}/${s.base.getFullYear()}` : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display:'flex', gap:8, marginTop:10, alignItems:'center', flexWrap:'wrap' }}>
          <button style={btn('primary')} onClick={() => fileRef.current?.click()}>
            <Upload size={13} /> Load CSV
          </button>
          <button style={btn('secondary')} onClick={handleImport}>Import</button>
          <button style={btn('ghost')} onClick={handleClear}>
            <Trash2 size={13} /> Clear
          </button>
          <div style={{ width:1, height:18, background:'var(--tw-border)' }} />
          <button style={btn('secondary')} onClick={handleSample}>Sample data</button>
          <span style={{ fontSize:11, color:'var(--tw-muted-fg)' }}>Load file or paste → Import → Fetch</span>
        </div>
      </div>
    </div>
  )
}
