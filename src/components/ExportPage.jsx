/**
 * ExportPage
 *
 * Allows the user to export a batch report as HTML or PDF.
 *
 * Steps:
 *   1. Select batch (dropdown — defaults to currently loaded batch)
 *   2. Select content (checkboxes — summary, table, market, fundamentals, notes)
 *   3. Export as HTML (download) or PDF (jsPDF + html2canvas)
 *
 * @param {Object[]} batches         — all saved batches from history
 * @param {string}   loadedBatchId   — currently loaded batch id (pre-selects dropdown)
 * @param {Object}   fundamentals    — { [ticker]: FundamentalsData }
 * @param {Object}   autoPrices      — { [ticker]: number } current prices
 */
import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FileCode, FileType, Download } from 'lucide-react'
import { formatDate } from '@/utils/dates.js'

// ── Content items ─────────────────────────────────────────────────────────────

const CONTENT_ITEMS = [
  { id: 'summary',      label: 'Summary cards',      sub: 'Hit rate, stocks count, direction badge'  },
  { id: 'table',        label: 'Predictions table',  sub: 'All tickers with targets and verdicts'    },
  { id: 'market',       label: 'Market performance', sub: 'SPY and ETF benchmarks vs batch period'   },
  { id: 'fundamentals', label: 'Fundamentals',       sub: 'Sector, PEG, beta, net margin per ticker' },
  { id: 'notes',        label: 'Notes',              sub: 'Per-ticker notes saved with the batch'    },
]

// ── Currency helper ───────────────────────────────────────────────────────────

function getCurrencySymbol(batch) {
  if (!batch?.results?.length) return '$'
  const cu = batch.results.find(r => r.currency)?.currency ?? 'USD'
  if (cu === 'EUR') return '€'
  if (cu === 'GBP') return '£'
  return '$'
}

// ── HTML report builder ───────────────────────────────────────────────────────

const VERDICT_STYLES = {
  exceeded:  { bg: '#dcfce7', color: '#166534', label: 'Exceeded'   },
  hit:       { bg: '#dcfce7', color: '#166534', label: 'Hit'        },
  close:     { bg: '#fef9c3', color: '#854d0e', label: 'Close'      },
  miss:      { bg: '#fee2e2', color: '#991b1b', label: 'Miss'       },
  wrong_way: { bg: '#f3e8ff', color: '#6b21a8', label: 'Wrong way'  },
  awaiting:  { bg: '#f4f4f5', color: '#71717a', label: 'Awaiting'   },
}

function buildReportHtml(batch, selection, fundamentals) {
  if (!batch) return ''

  const now    = new Date().toLocaleDateString('en-GB', { weekday:'short', day:'2-digit', month:'short', year:'numeric' })
  const tickers = [...new Set(batch.results.map(r => r.ticker))]
  const dir     = batch.direction ?? 'bullish'
  const sym     = getCurrencySymbol(batch)
  const dirBadge = dir === 'bearish'
    ? '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600">📉 Bearish</span>'
    : '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600">📈 Bullish</span>'

  // ── Summary section ──────────────────────────────────────────────────────
  let summaryHtml = ''
  if (selection.summary) {
    const evaluated = batch.results.filter(r => r.verdict !== 'awaiting').length
    const hits      = batch.results.filter(r => r.verdict === 'hit' || r.verdict === 'exceeded').length
    const hitRate   = evaluated ? Math.round(hits / evaluated * 100) : null

    summaryHtml = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
        ${[
          ['Stocks',    batch.stocks ?? tickers.length, ''],
          ['Evaluated', evaluated,                       ''],
          ['Hit rate',  hitRate != null ? hitRate + '%' : '—', ''],
          ['Direction', dir === 'bearish' ? '📉 Bearish' : '📈 Bullish', ''],
        ].map(([label, val]) => `
          <div style="background:#f4f4f5;border-radius:8px;padding:12px 14px">
            <div style="font-size:11px;color:#71717a;margin-bottom:4px">${label}</div>
            <div style="font-size:20px;font-weight:600;color:#18181b">${val}</div>
          </div>`).join('')}
      </div>`
  }

  // ── Predictions table ────────────────────────────────────────────────────
  let tableHtml = ''
  if (selection.table) {
    const rows = tickers.map(ticker => {
      const get  = h => batch.results.find(r => r.ticker === ticker && r.horizon === h)
      const r1   = get('1M'); const r3 = get('3M'); const r6 = get('6M'); const r12 = get('12M')
      const base = r1?.basePrice ?? r3?.basePrice ?? 0
      const vs   = (s) => {
        const c = VERDICT_STYLES[s?.verdict] ?? VERDICT_STYLES.awaiting
        const pct = (s?.targetPrice && base) ? ((s.targetPrice - base) / base * 100).toFixed(1) : '—'
        return `<td style="padding:8px 12px;text-align:right">
          <div style="font-size:12px;font-weight:500">${s?.targetPrice ? sym + s.targetPrice.toFixed(2) : '—'}</div>
          <span style="background:${c.bg};color:${c.color};padding:1px 6px;border-radius:20px;font-size:10px;font-weight:600">${c.label}</span>
        </td>`
      }
      return `<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:8px 12px;font-weight:600;font-size:13px">${ticker}</td>
        <td style="padding:8px 12px;font-size:12px;color:#71717a">${r1?.company ?? ''}</td>
        <td style="padding:8px 12px;text-align:right;font-size:13px;font-weight:500">${sym}${base.toFixed(2)}</td>
        ${vs(r1)}${vs(r3)}${vs(r6)}${vs(r12)}
      </tr>`
    }).join('')

    tableHtml = `
      <div style="margin-bottom:24px">
        <div style="font-size:13px;font-weight:600;color:#18181b;margin-bottom:10px">Predictions</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:#f4f4f5;border-bottom:1px solid #e4e4e7">
              <th style="padding:8px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">TICKER</th>
              <th style="padding:8px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">COMPANY</th>
              <th style="padding:8px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">BASE</th>
              <th style="padding:8px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">1M</th>
              <th style="padding:8px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">3M</th>
              <th style="padding:8px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">6M</th>
              <th style="padding:8px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">12M</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
  }

  // ── Market performance ───────────────────────────────────────────────────
  let marketHtml = ''
  if (selection.market && batch.marketData) {
    const spy    = batch.marketData.spy
    const etfs   = batch.marketData.etfs ?? {}
    const iEtfs  = batch.marketData.industryEtfs ?? {}
    const allEtf = { ...etfs, ...iEtfs }
    const spyRow = spy ? `<tr style="border-bottom:1px solid #f0f0f0">
      <td style="padding:6px 12px;font-weight:600">SPY</td>
      <td style="padding:6px 12px;color:#71717a">S&amp;P 500</td>
      <td style="padding:6px 12px;text-align:right;font-weight:600;color:${spy.changePct>=0?'#166534':'#991b1b'}">${spy.changePct>=0?'+':''}${spy.changePct.toFixed(2)}%</td>
    </tr>` : ''
    const etfRows = Object.entries(allEtf).map(([sym, e]) => `
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:6px 12px;font-weight:600">${sym}</td>
        <td style="padding:6px 12px;color:#71717a">ETF</td>
        <td style="padding:6px 12px;text-align:right;font-weight:600;color:${e.changePct>=0?'#166534':'#991b1b'}">${e.changePct>=0?'+':''}${e.changePct.toFixed(2)}%</td>
      </tr>`).join('')

    marketHtml = `
      <div style="margin-bottom:24px">
        <div style="font-size:13px;font-weight:600;color:#18181b;margin-bottom:10px">Market performance</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#f4f4f5;border-bottom:1px solid #e4e4e7">
            <th style="padding:6px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">SYMBOL</th>
            <th style="padding:6px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">NAME</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">CHANGE</th>
          </tr></thead>
          <tbody>${spyRow}${etfRows}</tbody>
        </table>
      </div>`
  }

  // ── Fundamentals ─────────────────────────────────────────────────────────
  let fundHtml = ''
  if (selection.fundamentals && fundamentals) {
    const rows = tickers.map(t => {
      const f = fundamentals[t]
      if (!f) return ''
      return `<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:6px 12px;font-weight:600">${t}</td>
        <td style="padding:6px 12px;color:#71717a">${f.sector ?? '—'}</td>
        <td style="padding:6px 12px;text-align:right">${f.pegTTM?.toFixed(2) ?? '—'}</td>
        <td style="padding:6px 12px;text-align:right">${f.beta?.toFixed(2) ?? '—'}</td>
        <td style="padding:6px 12px;text-align:right">${f.netMarginTTM != null ? f.netMarginTTM.toFixed(1) + '%' : '—'}</td>
        <td style="padding:6px 12px;text-align:right">${f.forwardPE?.toFixed(1) ?? '—'}</td>
      </tr>`
    }).join('')

    fundHtml = `
      <div style="margin-bottom:24px">
        <div style="font-size:13px;font-weight:600;color:#18181b;margin-bottom:10px">Fundamentals</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#f4f4f5;border-bottom:1px solid #e4e4e7">
            <th style="padding:6px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">TICKER</th>
            <th style="padding:6px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">SECTOR</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">PEG</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">BETA</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">MARGIN</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">FWD PE</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
  }

  // ── Notes ────────────────────────────────────────────────────────────────
  let notesHtml = ''
  if (selection.notes) {
    const noteRows = batch.results
      .filter((r, i, arr) => r.note && arr.findIndex(x => x.ticker === r.ticker) === i)
      .map(r => `<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:6px 12px;font-weight:600">${r.ticker}</td>
        <td style="padding:6px 12px;color:#71717a">${r.note}</td>
      </tr>`).join('')

    if (noteRows) {
      notesHtml = `
        <div style="margin-bottom:24px">
          <div style="font-size:13px;font-weight:600;color:#18181b;margin-bottom:10px">Notes</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <tbody>${noteRows}</tbody>
          </table>
        </div>`
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Openbank Report — ${batch.date}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;padding:32px 24px}
    @media print{body{background:#fff;padding:16px}}
  </style>
</head>
<body>
  <div style="max-width:900px;margin:0 auto">

    <!-- Header -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #e4e4e7">
      <div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <div style="width:32px;height:32px;border-radius:8px;background:#18181b;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700">OB</div>
          <span style="font-size:13px;font-weight:600;color:#71717a">Openbank Price Prediction</span>
        </div>
        <div style="font-size:22px;font-weight:600;color:#18181b">Batch ${batch.date}</div>
        <div style="font-size:13px;color:#71717a;margin-top:4px;display:flex;align-items:center;gap:8px">
          ${dirBadge}
          <span>Generated ${now}</span>
        </div>
      </div>
    </div>

    ${summaryHtml}
    ${tableHtml}
    ${marketHtml}
    ${fundHtml}
    ${notesHtml}

    <!-- Footer -->
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e4e4e7;text-align:center;font-size:11px;color:#a1a1aa">
      Openbank Price Prediction · Export generated ${now}
    </div>

  </div>
</body>
</html>`
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ExportPage({ batches = [], loadedBatchId, fundamentals = {} }) {

  // Selected batch — default to currently loaded or most recent
  const [selectedBatchId, setSelectedBatchId] = useState(
    loadedBatchId ?? batches[0]?.id ?? ''
  )

  // Content selection — default: summary + table + market checked
  const [selection, setSelection] = useState({
    summary:      true,
    table:        true,
    market:       true,
    fundamentals: false,
    notes:        false,
  })

  const [exporting, setExporting] = useState(null) // 'html' | 'pdf' | null

  const selectedBatch = useMemo(
    () => batches.find(b => b.id === selectedBatchId) ?? null,
    [batches, selectedBatchId]
  )

  const anySelected = Object.values(selection).some(Boolean)

  // Toggle a content item
  const toggle = (id) => setSelection(prev => ({ ...prev, [id]: !prev[id] }))

  // Export as HTML — generate and download
  const handleExportHtml = () => {
    if (!selectedBatch || !anySelected) return
    setExporting('html')
    try {
      const html     = buildReportHtml(selectedBatch, selection, fundamentals)
      const blob     = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url      = URL.createObjectURL(blob)
      const a        = document.createElement('a')
      a.href         = url
      a.download     = `openbank_report_${selectedBatch.id}.html`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(null)
    }
  }

  // Export as PDF — render HTML in hidden iframe, use jsPDF + html2canvas
  const handleExportPdf = async () => {
    if (!selectedBatch || !anySelected) return
    setExporting('pdf')
    try {
      const html = buildReportHtml(selectedBatch, selection, fundamentals)

      // Render in a hidden iframe to get accurate layout
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:900px;height:auto;border:none'
      document.body.appendChild(iframe)
      iframe.contentDocument.open()
      iframe.contentDocument.write(html)
      iframe.contentDocument.close()

      // Wait for iframe to render
      await new Promise(r => setTimeout(r, 500))

      const { default: html2canvas } = await import('html2canvas')
      const { jsPDF }                = await import('jspdf')

      const canvas = await html2canvas(iframe.contentDocument.body, {
        scale: 2, useCORS: true, logging: false,
        windowWidth: 900,
      })

      const imgData  = canvas.toDataURL('image/png')
      const pdf      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW     = pdf.internal.pageSize.getWidth()
      const pdfH     = (canvas.height * pdfW) / canvas.width

      // Multi-page if content is taller than A4
      const pageH    = pdf.internal.pageSize.getHeight()
      let   yOffset  = 0

      while (yOffset < pdfH) {
        if (yOffset > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfW, pdfH)
        yOffset += pageH
      }

      pdf.save(`openbank_report_${selectedBatch.id}.pdf`)
      document.body.removeChild(iframe)
    } catch (err) {
      console.error('[ExportPage] PDF error:', err)
      alert('PDF export failed. Try HTML export instead.')
    } finally {
      setExporting(null)
    }
  }

  // Empty state
  if (!batches.length) {
    return (
      <Card className="flex flex-col items-center justify-center p-16 text-center gap-3">
        <Download size={32} className="text-muted-foreground" />
        <div>
          <div className="text-[14px] font-semibold mb-1">No batches saved</div>
          <div className="text-[12px] text-muted-foreground">Save a batch first to export it.</div>
        </div>
      </Card>
    )
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {/* v7.20.7: was `max-w-2xl` — capped the whole page at 672px regardless
          of available space, so it never used the extra room freed up by
          collapsing the sidebar or widening the browser window. Other pages
          (e.g. AllStocksPage) have no max-w cap at all and just fill <main>'s
          full width — matched that same pattern here. */}

      {/* ── Step 1: Select batch ──────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground border border-border">1</span>
          <span className="text-[13px] font-medium">Select batch</span>
        </div>
        <select
          value={selectedBatchId}
          onChange={e => setSelectedBatchId(e.target.value)}
          className="w-full text-[13px] px-3 py-2 rounded-lg border border-border bg-background text-foreground cursor-pointer"
        >
          {batches.map(b => (
            <option key={b.id} value={b.id}>
              {b.date} — {b.stocks} stocks · {b.direction === 'bearish' ? '📉 Bearish' : '📈 Bullish'}
              {b.id === loadedBatchId ? ' (current)' : ''}
            </option>
          ))}
        </select>
      </Card>

      {/* ── Step 2: Select content ────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground border border-border">2</span>
          <span className="text-[13px] font-medium">Select content to include</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {CONTENT_ITEMS.map(item => (
            <label
              key={item.id}
              className={cn(
                'flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors',
                selection[item.id]
                  ? 'border-foreground/30 bg-muted/50'
                  : 'border-border hover:bg-muted/30'
              )}
              onClick={() => toggle(item.id)}
            >
              <input
                type="checkbox"
                checked={selection[item.id]}
                onChange={() => toggle(item.id)}
                onClick={e => e.stopPropagation()}
                className="mt-0.5 cursor-pointer accent-foreground"
              />
              <div>
                <div className="text-[12px] font-medium text-foreground leading-tight">{item.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</div>
              </div>
            </label>
          ))}
        </div>

        {/* Preview badges */}
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
          <span className="text-[10px] text-muted-foreground mr-1">Will include:</span>
          {CONTENT_ITEMS.map(item => (
            <span
              key={item.id}
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors',
                selection[item.id]
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-muted text-muted-foreground border-border'
              )}
            >
              {item.label}
            </span>
          ))}
        </div>
      </Card>

      {/* ── Step 3: Export ────────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground border border-border">3</span>
          <span className="text-[13px] font-medium">Export format</span>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2 text-[13px]"
            disabled={!anySelected || !selectedBatch || exporting !== null}
            onClick={handleExportHtml}
          >
            <FileCode size={15} />
            {exporting === 'html' ? 'Generating…' : 'Export HTML'}
          </Button>
          <Button
            className="flex-1 gap-2 text-[13px] bg-foreground text-background hover:bg-foreground/90"
            disabled={!anySelected || !selectedBatch || exporting !== null}
            onClick={handleExportPdf}
          >
            <FileType size={15} />
            {exporting === 'pdf' ? 'Generating…' : 'Export PDF'}
          </Button>
        </div>
        <div className="text-[11px] text-muted-foreground text-center mt-2">
          HTML — opens in browser · PDF — A4 document, multi-page if needed
        </div>
      </Card>

    </div>
  )
}
