/**
 * ImportBox
 *
 * CSV import panel on the Import Stocks page.
 * Allows loading a .csv file or pasting CSV text directly.
 *
 * Flow:
 *   1. User loads file or pastes CSV → text appears in textarea
 *   2. User clicks Import → CSV is parsed and stocks sent to parent
 *   3. Preview table shows parsed rows before they go to batch tables
 *
 * CSV format: TICKER, Company, CCY, BasePrice, 1M, 3M, 6M, 12M, DD/MM/YYYY
 * Header row is detected and skipped automatically.
 *
 * @param {Function} onImport — called with parsed stock array on import
 */
import { useState, useCallback, useRef } from 'react'
import { parseDate, today as getToday } from '@/utils/dates.js'
import { DEFAULT_STOCKS } from '@/utils/stocks.js'
import { Upload, FileText, Trash2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { cn } from '@/lib/utils'

// ── CSV parser ────────────────────────────────────────────────────────────────

/**
 * Parses raw CSV text into an array of stock objects.
 * Detects and skips header rows automatically.
 * Sets preview state and calls onImport on success.
 */
/**
 * normalizeTicker — strips .US suffix from American tickers.
 * European suffixes (.DE, .AS, .PA, .L, .MC) are preserved
 * because they identify the exchange (e.g. NEM.DE ≠ NEM).
 * American .US suffix is redundant — TER.US and TER are the same stock.
 * This is the SINGLE point of normalization for the entire app.
 */
const EU_SUFFIXES = ['.DE', '.AS', '.PA', '.L', '.MC']

function normalizeTicker(raw) {
  const upper = raw.toUpperCase().trim()
  if (EU_SUFFIXES.some(s => upper.endsWith(s))) return upper
  return upper.replace(/\.US$/i, '')
}

function parseCSV(text, onImport, setError, setCsv, setMsg, setPreview) {
  setError(''); setMsg('')

  const allLines = text.trim().split('\n').filter(l => l.trim())
  if (!allLines.length) { setError('No data found.'); return }

  // Detect header row by checking if first cell is non-numeric text
  const firstCell = allLines[0].split(',')[0].trim().toLowerCase()
  const isHeader  = isNaN(firstCell) && /[a-z]{2,}/.test(firstCell) &&
    ['ticker', 'symbol', 'stock', 'company', 'name'].some(w => firstCell.includes(w))

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
      t:   normalizeTicker(p[0]),  // .US stripped, .DE/.AS etc. preserved
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

  setPreview(stocks)
  onImport(stocks)
  setMsg(`✓ ${stocks.length} stock${stocks.length > 1 ? 's' : ''} imported${isHeader ? ' (header skipped)' : ''}`)
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ImportBox({ onImport }) {
  const [csv,     setCsv]     = useState('')
  const [error,   setError]   = useState('')
  const [msg,     setMsg]     = useState('')
  const [preview, setPreview] = useState([])
  const fileRef = useRef(null)

  /** Parse and import the current textarea content */
  const handleImport = useCallback(() => {
    if (!csv.trim()) { setError('Paste CSV data or load a file first.'); return }
    parseCSV(csv, onImport, setError, setCsv, setMsg, setPreview)
  }, [csv, onImport])

  /** Clear all state */
  const handleClear = useCallback(() => {
    setCsv(''); setError(''); setMsg(''); setPreview([])
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  /**
   * Load file into textarea without auto-importing.
   * User reviews the content then clicks Import.
   */
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setMsg(''); setPreview([])
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setError('Please select a .csv file.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCsv(ev.target.result)
      setMsg(`✓ ${file.name} loaded — click Import to continue`)
    }
    reader.onerror = () => setError('Could not read file.')
    reader.readAsText(file)
  }, [])

  /** Load built-in sample data for testing */
  const handleSample = useCallback(() => {
    onImport(DEFAULT_STOCKS.map(s => ({ ...s })))
    setCsv(''); setError(''); setMsg('✓ Sample data loaded')
  }, [onImport])

  return (
    <Card className="mb-6 overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <CardHeader className="flex-row items-center gap-2 py-3 px-4 border-b border-border space-y-0">
        <FileText size={15} className="text-muted-foreground" />
        <span className="text-sm font-semibold">Import stocks</span>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* ── Format hint ────────────────────────────────────────────── */}
        <div className="flex gap-2 items-start p-2.5 rounded-lg bg-muted">
          <Info size={13} className="text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Format:{' '}
            <code className="font-mono text-[11px]">
              TICKER, Company, CCY, BasePrice, 1M, 3M, 6M, 12M, DD/MM/YYYY
            </code>
            <br />
            Load a <strong>.csv file</strong> or paste below. Header row is skipped automatically.
          </p>
        </div>

        {/* ── Hidden file input ───────────────────────────────────────── */}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* ── CSV textarea ────────────────────────────────────────────── */}
        <Textarea
          className="h-20 font-mono text-xs resize-y bg-muted"
          value={csv}
          onChange={e => { setCsv(e.target.value); setMsg('') }}
          placeholder={
            'Ticker,Company,CCY,BasePrice,1M,3M,6M,12M,Date\n' +
            'AXP,American Express,USD,314.46,327.23,293.83,296.32,521.60,08/05/2026'
          }
          spellCheck={false}
        />

        {/* ── Status messages ─────────────────────────────────────────── */}
        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">⚠ {error}</p>
        )}
        {msg && !error && (
          <p className="text-xs text-success font-semibold">{msg}</p>
        )}

        {/* ── Preview table ───────────────────────────────────────────── */}
        {preview.length > 0 && (
          <div className="overflow-x-auto">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Preview — {preview.length} stock{preview.length > 1 ? 's' : ''}
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  {['Ticker', 'Company', 'CCY', 'Base', '1M', '3M', '6M', '12M', 'Date'].map(h => (
                    <TableHead key={h} className="text-xs py-1.5 px-2 whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="py-1.5 px-2 font-mono font-semibold">{s.t}</TableCell>
                    <TableCell className="py-1.5 px-2 max-w-[140px] truncate">{s.co}</TableCell>
                    <TableCell className="py-1.5 px-2 text-muted-foreground">{s.cu}</TableCell>
                    <TableCell className="py-1.5 px-2">{s.b.toFixed(2)}</TableCell>
                    <TableCell className="py-1.5 px-2 text-success">{s.t1.toFixed(2)}</TableCell>
                    <TableCell className="py-1.5 px-2 text-success">{s.t3.toFixed(2)}</TableCell>
                    <TableCell className="py-1.5 px-2 text-success">{s.t6.toFixed(2)}</TableCell>
                    <TableCell className="py-1.5 px-2 text-success">{s.t12.toFixed(2)}</TableCell>
                    <TableCell className="py-1.5 px-2 text-muted-foreground font-mono text-[11px]">
                      {s.base
                        ? `${String(s.base.getDate()).padStart(2, '0')}/${String(s.base.getMonth() + 1).padStart(2, '0')}/${s.base.getFullYear()}`
                        : '--'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ── Action buttons ──────────────────────────────────────────── */}
        <div className="flex gap-2 items-center flex-wrap pt-1">
          <Button size="sm" className="bg-success hover:bg-success/90 text-white border-success" onClick={() => fileRef.current?.click()}>
            <Upload size={13} /> Load CSV
          </Button>
          <Button size="sm" variant="outline" onClick={handleImport}>Import</Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleClear}>
            <Trash2 size={13} /> Clear
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <Button size="sm" variant="outline" onClick={handleSample}>Sample data</Button>
          <span className="text-[11px] text-muted-foreground">Load file or paste → Import → Fetch</span>
        </div>
      </CardContent>
    </Card>
  )
}
