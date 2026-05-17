import { useCallback, useState } from 'react'
import { formatDate, today as getToday } from '../utils/dates.js'
import { getTarget, getTargetDate, getEffectivePrice } from '../utils/stocks.js'

const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

const s = {
  box:      { border: '1px solid #30363d', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', background: '#0d1117' },
  h3:       { fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#e6edf3' },
  pre:      { background: '#161b22', borderRadius: 6, padding: 12, fontSize: 11, fontFamily: 'monospace', color: '#8b949e', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 220, overflowY: 'auto', marginBottom: 10 },
  row:      { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  emailRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
  label:    { fontSize: 11, color: '#8b949e', flexShrink: 0 },
  input:    { flex: 1, minWidth: 200, padding: '6px 10px', borderRadius: 6, border: '1px solid #30363d', background: '#161b22', color: '#e6edf3', fontSize: 12, outline: 'none', fontFamily: 'inherit' },
  btnP:     { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #1f6feb', background: '#0d2136', color: '#58a6ff', flexShrink: 0 },
  btnG:     { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #30363d', background: 'transparent', color: '#e6edf3', flexShrink: 0 },
  btnSend:  { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #238636', background: '#1a4a2e', color: '#3fb950', flexShrink: 0 },
  btnDis:   { opacity: 0.4, cursor: 'not-allowed' },
  msg:      { fontSize: 11, marginTop: 8 },
  spinner:  { width: 12, height: 12, border: '1.5px solid #30363d', borderTopColor: '#3fb950', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 },
}

function buildReportText(stocks, horizon, autoPrices, histPrices, overrides, horizonExpired) {
  const TODAY = getToday()
  const priceType = horizonExpired && horizon !== 'best' ? 'Historical (on target date)' : 'Current market'
  const lines = [
    `Openbank Price Prediction Report`,
    `Date: ${formatDate(TODAY)}`,
    `Horizon: ${horizon === 'best' ? 'Best target' : horizon} | Price type: ${priceType}`,
    '',
    'Ticker  | Base Date    | Price       | Price Date   | Target     | Target Date   | Distance   | Result',
    '------  | ------------ | ----------- | ------------ | ---------- | ------------- | ---------- | ------',
  ]
  for (const s of stocks) {
    const { price: p, isHistorical, historicalDate } = getEffectivePrice(
      s.t, horizon, autoPrices, histPrices, overrides, horizonExpired
    )
    const t   = getTarget(s, horizon)
    const td  = getTargetDate(s, horizon)
    const pS  = p ? p.toFixed(2) : 'N/A'
    const pdS = isHistorical ? (historicalDate || 'hist') : formatDate(TODAY)
    const dS  = p ? ((p - t) / t * 100 >= 0 ? '+' : '') + ((p - t) / t * 100).toFixed(2) + '%' : '--'
    const adV = p ? Math.abs((p - t) / t * 100) : null
    const result = !p             ? 'Awaiting'
                 : p >= t         ? (isHistorical ? 'REACHED on date' : 'TARGET REACHED')
                 : adV <= 5       ? 'Close (<5%)'
                 : adV <= 15      ? 'Getting closer'
                 : (isHistorical  ? 'NOT REACHED' : 'Below target')
    lines.push(
      `${s.t.padEnd(6)}  | ${(s.base ? formatDate(s.base) : 'N/A').padEnd(12)} | ${pS.padStart(11)} | ${pdS.padEnd(12)} | ${t.toFixed(2).padStart(10)} | ${(td ? formatDate(td) : 'N/A').padEnd(13)} | ${dS.padStart(10)} | ${result}`
    )
  }
  lines.push('', '---', 'Source: Twelve Data + Financial Modeling Prep. Not financial advice.')
  return lines.join('\n')
}

export default function EmailPreview({ stocks, horizon, autoPrices, histPrices, overrides, horizonExpired, onClose }) {
  const TODAY = getToday()
  const [toEmail,   setToEmail]   = useState('')
  const [sending,   setSending]   = useState(false)
  const [sendMsg,   setSendMsg]   = useState('')
  const [sendOk,    setSendOk]    = useState(null) // null | true | false

  const reportText = buildReportText(stocks, horizon, autoPrices, histPrices, overrides, horizonExpired)

  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(reportText) } catch { /* ignore */ }
  }, [reportText])

  const handleSend = useCallback(async () => {
    if (!toEmail.trim()) { setSendMsg('Please enter a recipient email.'); setSendOk(false); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail.trim())) {
      setSendMsg('Invalid email address.'); setSendOk(false); return
    }
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      setSendMsg('EmailJS not configured — check your .env file.'); setSendOk(false); return
    }

    setSending(true)
    setSendMsg('Sending...')
    setSendOk(null)

    try {
      // Load EmailJS SDK dynamically — no npm install needed
      if (!window.emailjs) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js'
          script.onload  = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
        window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY })
      }

      await window.emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_email:    toEmail.trim(),
          report_date: formatDate(TODAY),
          report_body: reportText,
        }
      )

      setSendOk(true)
      setSendMsg(`Report sent to ${toEmail.trim()} ✓`)
    } catch (err) {
      setSendOk(false)
      setSendMsg('Send failed: ' + (err?.text || err?.message || String(err)))
    } finally {
      setSending(false)
    }
  }, [toEmail, reportText])

  return (
    <div style={s.box}>
      <h3 style={s.h3}>Email report</h3>

      {/* Recipient input */}
      <div style={s.emailRow}>
        <span style={s.label}>To:</span>
        <input
          type="email"
          style={s.input}
          value={toEmail}
          onChange={e => { setToEmail(e.target.value); setSendMsg('') }}
          placeholder="recipient@email.com"
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button
          style={{ ...s.btnSend, ...(sending ? s.btnDis : {}) }}
          disabled={sending}
          onClick={handleSend}
        >
          {sending ? '...' : '✉ Send'}
        </button>
        {sending && <div style={s.spinner} />}
      </div>

      {/* Send status message */}
      {sendMsg && (
        <div style={{ ...s.msg, color: sendOk === true ? '#3fb950' : sendOk === false ? '#f85149' : '#8b949e' }}>
          {sendMsg}
        </div>
      )}

      {/* Report preview */}
      <pre style={{ ...s.pre, marginTop: sendMsg ? 10 : 0 }}>{reportText}</pre>

      <div style={s.row}>
        <button style={s.btnP} onClick={handleCopy}>Copy</button>
        <button style={s.btnG} onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
