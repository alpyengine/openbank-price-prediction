import { useCallback, useState } from 'react'
import { formatDate, today as getToday } from '../utils/dates.js'
import { getTarget, getTargetDate, getEffectivePrice, evaluatePrediction } from '../utils/stocks.js'
import { fmtMarketCap } from '../hooks/useFundamentals.js'

const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

// ── HTML email builder ────────────────────────────────────────────────────────

function buildHtmlReport(stocks, horizon, autoPrices, histPrices, overrides, horizonExpired, fundamentals) {
  const TODAY     = getToday()
  const priceType = horizonExpired && horizon !== 'best' ? 'Historical (on target date)' : 'Current market'
  const horizonLabel = horizon === 'best' ? 'Best target' : horizon

  // Compute results for each stock
  const rows = stocks.map(s => {
    const { price: p, isHistorical, historicalDate } = getEffectivePrice(
      s.t, horizon, autoPrices, histPrices, overrides, horizonExpired
    )
    const tgt  = getTarget(s, horizon)
    const tgtDate = getTargetDate(s, horizon)
    const { verdict, direction } = evaluatePrediction(p, tgt, s.b)
    const dist = p ? ((p - tgt) / tgt * 100) : null
    const f    = fundamentals?.[s.t]
    return { s, p, tgt, tgtDate, verdict, direction, dist, isHistorical, historicalDate, f }
  })

  // Summary counts
  const hits     = rows.filter(r => r.verdict === 'hit').length
  const close    = rows.filter(r => r.verdict === 'close').length
  const miss     = rows.filter(r => r.verdict === 'miss').length
  const awaiting = rows.filter(r => r.verdict == null).length

  // Colors
  const C = {
    bg:       '#0d1117',
    card:     '#161b22',
    border:   '#30363d',
    text:     '#e6edf3',
    muted:    '#8b949e',
    green:    '#3fb950',
    greenBg:  '#1a4a2e',
    red:      '#f85149',
    redBg:    '#3d1515',
    amber:    '#d29922',
    amberBg:  '#2d2208',
    blue:     '#58a6ff',
    blueBg:   '#0d2136',
  }

  const verdictStyle = (verdict) => {
    if (verdict === 'hit')   return `background:${C.greenBg};color:${C.green};`
    if (verdict === 'close') return `background:${C.amberBg};color:${C.amber};`
    if (verdict === 'miss')  return `background:${C.redBg};color:${C.red};`
    return `background:#21262d;color:${C.muted};`
  }

  const verdictLabel = (verdict, direction) => {
    if (verdict === 'hit')   return direction === 'bearish' ? '✓ Dropped' : '✓ Reached'
    if (verdict === 'close') return '~ Near target'
    if (verdict === 'miss')  return direction === 'bearish' ? '✗ Didn\'t drop' : '✗ Not reached'
    return '— Awaiting'
  }

  const distLabel = (dist) => {
    if (dist == null) return '--'
    return (dist > 0 ? '+' : '') + dist.toFixed(2) + '%'
  }

  const distColor = (verdict) => {
    if (verdict === 'hit')   return C.green
    if (verdict === 'close') return C.amber
    if (verdict === 'miss')  return C.red
    return C.muted
  }

  // Build stock rows HTML
  const stockRowsHtml = rows.map(({ s, p, tgt, tgtDate, verdict, direction, dist, isHistorical, historicalDate, f }) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-weight:600;color:${C.text};">
        ${s.t}
        ${f?.sector ? `<div style="font-size:10px;color:${C.muted};margin-top:2px;">${f.sector}</div>` : ''}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border};color:${C.muted};font-size:12px;">${s.co}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border};color:${C.muted};font-size:12px;">${s.base ? formatDate(s.base) : '--'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-size:12px;">
        ${p != null
          ? `<span style="color:${isHistorical ? C.blue : C.green};font-weight:600;">${p.toFixed(2)}</span>
             <div style="font-size:10px;color:${C.muted};margin-top:2px;">${isHistorical ? `on ${historicalDate}` : 'today'}</div>`
          : `<span style="color:${C.muted};">--</span>`
        }
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border};color:${C.blue};font-weight:600;font-size:12px;">
        ${tgt.toFixed(2)}
        ${tgtDate ? `<div style="font-size:10px;color:${C.muted};margin-top:2px;">${formatDate(tgtDate)}</div>` : ''}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-size:13px;font-weight:600;color:${distColor(verdict)};">${distLabel(dist)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border};text-align:center;">
        <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;${verdictStyle(verdict)}">
          ${verdictLabel(verdict, direction)}
        </span>
      </td>
      ${f ? `<td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-size:11px;color:${C.muted};">
        ${f.marketCap ? `<div>Cap: <strong style="color:${C.text};">${fmtMarketCap(f.marketCap)}</strong></div>` : ''}
        ${f.forwardPE ? `<div>P/E fwd: <strong style="color:${C.text};">${f.forwardPE.toFixed(1)}</strong></div>` : ''}
        ${f.beta      ? `<div>Beta: <strong style="color:${C.text};">${f.beta.toFixed(2)}</strong></div>` : ''}
      </td>` : `<td style="padding:10px 12px;border-bottom:1px solid ${C.border};color:${C.muted};font-size:11px;">--</td>`}
    </tr>
  `).join('')

  const hasFundamentals = rows.some(r => r.f)

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:system-ui,-apple-system,sans-serif;color:${C.text};">
<div style="max-width:800px;margin:0 auto;padding:24px;">

  <!-- Header -->
  <div style="margin-bottom:24px;">
    <h1 style="font-size:20px;font-weight:600;color:${C.text};margin:0 0 4px 0;">Openbank Price Prediction</h1>
    <div style="font-size:12px;color:${C.muted};">
      Report date: <strong style="color:${C.text};">${formatDate(TODAY)}</strong>
      &nbsp;·&nbsp;
      Horizon: <strong style="color:${C.text};">${horizonLabel}</strong>
      &nbsp;·&nbsp;
      Price type: <strong style="color:${C.text};">${priceType}</strong>
    </div>
  </div>

  <!-- Summary cards -->
  <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
    <div style="flex:1;min-width:100px;background:${C.card};border:1px solid ${C.border};border-radius:8px;padding:12px 16px;">
      <div style="font-size:11px;color:${C.muted};margin-bottom:4px;">Total</div>
      <div style="font-size:24px;font-weight:600;color:${C.text};">${stocks.length}</div>
    </div>
    <div style="flex:1;min-width:100px;background:${C.card};border:1px solid ${C.border};border-radius:8px;padding:12px 16px;">
      <div style="font-size:11px;color:${C.muted};margin-bottom:4px;">Hit target</div>
      <div style="font-size:24px;font-weight:600;color:${C.green};">${hits}</div>
    </div>
    <div style="flex:1;min-width:100px;background:${C.card};border:1px solid ${C.border};border-radius:8px;padding:12px 16px;">
      <div style="font-size:11px;color:${C.muted};margin-bottom:4px;">Near target</div>
      <div style="font-size:24px;font-weight:600;color:${C.amber};">${close}</div>
    </div>
    <div style="flex:1;min-width:100px;background:${C.card};border:1px solid ${C.border};border-radius:8px;padding:12px 16px;">
      <div style="font-size:11px;color:${C.muted};margin-bottom:4px;">Miss</div>
      <div style="font-size:24px;font-weight:600;color:${C.red};">${miss}</div>
    </div>
    <div style="flex:1;min-width:100px;background:${C.card};border:1px solid ${C.border};border-radius:8px;padding:12px 16px;">
      <div style="font-size:11px;color:${C.muted};margin-bottom:4px;">Awaiting</div>
      <div style="font-size:24px;font-weight:600;color:${C.muted};">${awaiting}</div>
    </div>
  </div>

  <!-- Stocks table -->
  <div style="border:1px solid ${C.border};border-radius:8px;overflow:hidden;margin-bottom:24px;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:${C.card};">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:500;color:${C.muted};border-bottom:1px solid ${C.border};">Ticker</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:500;color:${C.muted};border-bottom:1px solid ${C.border};">Company</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:500;color:${C.muted};border-bottom:1px solid ${C.border};">Base date</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:500;color:${C.muted};border-bottom:1px solid ${C.border};">Price</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:500;color:${C.muted};border-bottom:1px solid ${C.border};">Target</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:500;color:${C.muted};border-bottom:1px solid ${C.border};">Distance</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:500;color:${C.muted};border-bottom:1px solid ${C.border};">Result</th>
          ${hasFundamentals ? `<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:500;color:${C.muted};border-bottom:1px solid ${C.border};">Fundamentals</th>` : ''}
        </tr>
      </thead>
      <tbody style="background:${C.bg};">
        ${stockRowsHtml}
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div style="font-size:11px;color:${C.muted};border-top:1px solid ${C.border};padding-top:16px;">
    Source: Twelve Data (prices) · Financial Modeling Prep (fundamentals) · Not financial advice.
    <br>Sent from Openbank Price Prediction app · ${formatDate(TODAY)}
  </div>

</div>
</body>
</html>`
}

// ── Component ─────────────────────────────────────────────────────────────────

const s = {
  box:      { border: '1px solid #30363d', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', background: '#0d1117' },
  h3:       { fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#e6edf3' },
  pre:      { background: '#161b22', borderRadius: 6, padding: 12, fontSize: 11, fontFamily: 'monospace', color: '#8b949e', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 180, overflowY: 'auto', marginBottom: 10 },
  row:      { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  emailRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
  label:    { fontSize: 11, color: '#8b949e', flexShrink: 0 },
  input:    { flex: 1, minWidth: 200, padding: '6px 10px', borderRadius: 6, border: '1px solid #30363d', background: '#161b22', color: '#e6edf3', fontSize: 12, outline: 'none', fontFamily: 'inherit' },
  btnP:     { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #1f6feb', background: '#0d2136', color: '#58a6ff', flexShrink: 0 },
  btnG:     { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #30363d', background: 'transparent', color: '#e6edf3', flexShrink: 0 },
  btnSend:  { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #238636', background: '#1a4a2e', color: '#3fb950', flexShrink: 0 },
  spinner:  { width: 12, height: 12, border: '1.5px solid #30363d', borderTopColor: '#3fb950', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 },
  hint:     { fontSize: 10, color: '#484f58', marginTop: 6 },
}

export default function EmailPreview({ stocks, horizon, autoPrices, histPrices, overrides, horizonExpired, fundamentals, onClose }) {
  const [toEmail, setToEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState('')
  const [sendOk,  setSendOk]  = useState(null)

  const TODAY       = getToday()
  const htmlReport  = buildHtmlReport(stocks, horizon, autoPrices, histPrices, overrides, horizonExpired, fundamentals)
  const horizonLabel = horizon === 'best' ? 'Best target' : horizon

  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(htmlReport) } catch { /* ignore */ }
  }, [htmlReport])

  const handleSend = useCallback(async () => {
    if (!toEmail.trim()) { setSendMsg('Please enter a recipient email.'); setSendOk(false); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail.trim())) { setSendMsg('Invalid email address.'); setSendOk(false); return }
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) { setSendMsg('EmailJS not configured — check your .env file.'); setSendOk(false); return }

    setSending(true); setSendMsg('Sending...'); setSendOk(null)

    try {
      if (!window.emailjs) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js'
          script.onload = resolve; script.onerror = reject
          document.head.appendChild(script)
        })
        window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY })
      }

      await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email:    toEmail.trim(),
        report_date: formatDate(TODAY),
        report_body: htmlReport,
      })

      setSendOk(true)
      setSendMsg(`Report sent to ${toEmail.trim()} ✓`)
    } catch (err) {
      setSendOk(false)
      setSendMsg('Send failed: ' + (err?.text || err?.message || String(err)))
    } finally {
      setSending(false)
    }
  }, [toEmail, htmlReport])

  return (
    <div style={s.box}>
      <h3 style={s.h3}>Email report — {horizonLabel} · {formatDate(TODAY)}</h3>

      {/* Recipient */}
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
          style={{ ...s.btnSend, opacity: sending ? 0.4 : 1, cursor: sending ? 'not-allowed' : 'pointer' }}
          disabled={sending}
          onClick={handleSend}
        >
          {sending ? '...' : '✉ Send'}
        </button>
        {sending && <div style={s.spinner} />}
      </div>

      {sendMsg && (
        <div style={{ fontSize: 11, marginBottom: 8, color: sendOk === true ? '#3fb950' : sendOk === false ? '#f85149' : '#8b949e' }}>
          {sendMsg}
        </div>
      )}

      {/* HTML preview (raw) */}
      <pre style={s.pre}>{htmlReport.slice(0, 800)}…</pre>
      <div style={s.hint}>Preview shows raw HTML — the recipient sees a formatted email.</div>

      <div style={{ ...s.row, marginTop: 10 }}>
        <button style={s.btnP} onClick={handleCopy}>Copy HTML</button>
        <button style={s.btnG} onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
