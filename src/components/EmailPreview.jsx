import { useCallback, useState } from 'react'
import { formatDate, today as getToday } from '../utils/dates.js'
import { getTarget, getTargetDate, getEffectivePrice, evaluatePrediction } from '../utils/stocks.js'
import { fmtMarketCap } from '../hooks/useFundamentals.js'

const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

// ── HTML email builder (light theme) ─────────────────────────────────────────

function buildHtmlReport(stocks, horizon, autoPrices, histPrices, overrides, horizonExpired, fundamentals) {
  const TODAY        = getToday()
  const priceType    = horizonExpired && horizon !== 'best' ? 'Historical (on target date)' : 'Current market'
  const horizonLabel = horizon === 'best' ? 'Best target' : horizon

  const rows = stocks.map(s => {
    const { price: p, isHistorical, historicalDate } = getEffectivePrice(
      s.t, horizon, autoPrices, histPrices, overrides, horizonExpired
    )
    const tgt     = getTarget(s, horizon)
    const tgtDate = getTargetDate(s, horizon)
    const { verdict, direction } = evaluatePrediction(p, tgt, s.b)
    const dist = p ? ((p - tgt) / tgt * 100) : null
    const f    = fundamentals?.[s.t]
    return { s, p, tgt, tgtDate, verdict, direction, dist, isHistorical, historicalDate, f }
  })

  const hits     = rows.filter(r => r.verdict === 'hit').length
  const close    = rows.filter(r => r.verdict === 'close').length
  const miss     = rows.filter(r => r.verdict === 'miss').length
  const awaiting = rows.filter(r => r.verdict == null).length
  const hasFund  = rows.some(r => r.f)

  const badgeStyle = (verdict) => {
    if (verdict === 'hit')   return 'background:#f0faf3;color:#1e6b35;border:1px solid #b8e6c4;'
    if (verdict === 'close') return 'background:#fffbf0;color:#8a6800;border:1px solid #f0d080;'
    if (verdict === 'miss')  return 'background:#fff0f0;color:#cc2222;border:1px solid #f0b8b8;'
    return 'background:#f7f9fc;color:#8899aa;border:1px solid #e0e6ed;'
  }

  const verdictLabel = (verdict, direction) => {
    if (verdict === 'hit')   return direction === 'bearish' ? '✓ Dropped' : '✓ Reached'
    if (verdict === 'close') return '~ Near target'
    if (verdict === 'miss')  return direction === 'bearish' ? "✗ Didn't drop" : '✗ Not reached'
    return '— Awaiting'
  }

  const distColor = (verdict, dist) => {
    if (dist == null) return '#8899aa'
    if (verdict === 'hit')   return '#1e7a3a'
    if (verdict === 'close') return '#8a6800'
    return '#cc3333'
  }

  const distLabel = (dist) => dist == null ? '--' : (dist > 0 ? '+' : '') + dist.toFixed(2) + '%'

  const stockRows = rows.map(({ s, p, tgt, tgtDate, verdict, direction, dist, isHistorical, historicalDate, f }, i) => `
    <tr style="border-bottom:1px solid #f0f2f5;${i % 2 === 1 ? 'background:#fafbfc;' : ''}">
      <td style="padding:13px 16px;">
        <div style="font-weight:700;font-size:13px;color:#1a2332;">${s.t}</div>
        ${f?.sector ? `<div style="font-size:10px;color:#8899aa;margin-top:2px;">${f.sector}</div>` : ''}
      </td>
      <td style="padding:13px 16px;color:#445566;font-size:12px;">${s.co}</td>
      <td style="padding:13px 16px;color:#8899aa;font-size:12px;">${s.base ? formatDate(s.base) : '--'}</td>
      <td style="padding:13px 16px;text-align:right;color:#556677;font-weight:500;font-size:12px;">${s.b.toFixed(2)}</td>
      <td style="padding:13px 16px;text-align:right;">
        ${p != null
          ? `<span style="color:#1a2332;font-weight:700;font-size:13px;">${p.toFixed(2)}</span>
             <div style="font-size:10px;color:#8899aa;margin-top:2px;">${isHistorical ? `on ${historicalDate}` : 'today'}</div>`
          : `<span style="color:#aabbcc;">--</span>`
        }
      </td>
      <td style="padding:13px 16px;text-align:right;">
        <span style="color:#2255aa;font-weight:600;font-size:12px;">${tgt.toFixed(2)}</span>
        ${tgtDate ? `<div style="font-size:10px;color:#8899aa;margin-top:2px;">${formatDate(tgtDate)}</div>` : ''}
      </td>
      <td style="padding:13px 16px;text-align:right;font-weight:700;font-size:13px;color:${distColor(verdict, dist)};">
        ${distLabel(dist)}
      </td>
      <td style="padding:13px 16px;text-align:center;">
        <span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;${badgeStyle(verdict)}">
          ${verdictLabel(verdict, direction)}
        </span>
      </td>
      ${hasFund ? `<td style="padding:13px 16px;font-size:11px;color:#556677;">
        ${f?.marketCap ? `<div>Cap: <strong style="color:#334455;">${fmtMarketCap(f.marketCap)}</strong></div>` : ''}
        ${f?.forwardPE ? `<div>P/E fwd: <strong style="color:#334455;">${f.forwardPE.toFixed(1)}</strong></div>` : ''}
        ${f?.beta      ? `<div>Beta: <strong style="color:#334455;">${f.beta.toFixed(2)}</strong></div>` : ''}
        ${!f           ? '<span style="color:#aabbcc;">--</span>' : ''}
      </td>` : ''}
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Georgia,'Times New Roman',serif;">
<div style="max-width:820px;margin:0 auto;padding:32px 16px;">
<div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:#1a2332;padding:28px 32px;">
    <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Openbank Price Prediction</div>
    <div style="font-size:12px;color:#8899aa;margin-top:6px;font-family:system-ui,sans-serif;">
      Report date: <span style="color:#c8d8e8;font-weight:600;">${formatDate(TODAY)}</span>
      &nbsp;·&nbsp;
      Horizon: <span style="color:#c8d8e8;font-weight:600;">${horizonLabel}</span>
      &nbsp;·&nbsp;
      Price type: <span style="color:#c8d8e8;font-weight:600;">${priceType}</span>
    </div>
  </div>

  <!-- Summary cards -->
  <div style="padding:24px 32px;background:#f7f9fc;border-bottom:1px solid #e8ecf0;">
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      <div style="flex:1;min-width:90px;background:#fff;border:1px solid #e0e6ed;border-radius:8px;padding:14px 16px;">
        <div style="font-size:10px;color:#8899aa;font-family:system-ui,sans-serif;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Total</div>
        <div style="font-size:26px;font-weight:700;color:#1a2332;font-family:system-ui,sans-serif;">${stocks.length}</div>
      </div>
      <div style="flex:1;min-width:90px;background:#f0faf3;border:1px solid #b8e6c4;border-radius:8px;padding:14px 16px;">
        <div style="font-size:10px;color:#2e7d44;font-family:system-ui,sans-serif;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Hit target</div>
        <div style="font-size:26px;font-weight:700;color:#1e6b35;font-family:system-ui,sans-serif;">${hits}</div>
      </div>
      <div style="flex:1;min-width:90px;background:#fffbf0;border:1px solid #f0d080;border-radius:8px;padding:14px 16px;">
        <div style="font-size:10px;color:#8a6800;font-family:system-ui,sans-serif;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Near target</div>
        <div style="font-size:26px;font-weight:700;color:#8a6800;font-family:system-ui,sans-serif;">${close}</div>
      </div>
      <div style="flex:1;min-width:90px;background:#fff5f5;border:1px solid #f0b8b8;border-radius:8px;padding:14px 16px;">
        <div style="font-size:10px;color:#9b2222;font-family:system-ui,sans-serif;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Miss</div>
        <div style="font-size:26px;font-weight:700;color:#9b2222;font-family:system-ui,sans-serif;">${miss}</div>
      </div>
      <div style="flex:1;min-width:90px;background:#f7f9fc;border:1px solid #e0e6ed;border-radius:8px;padding:14px 16px;">
        <div style="font-size:10px;color:#8899aa;font-family:system-ui,sans-serif;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Awaiting</div>
        <div style="font-size:26px;font-weight:700;color:#aabbcc;font-family:system-ui,sans-serif;">${awaiting}</div>
      </div>
    </div>
  </div>

  <!-- Table -->
  <div>
    <table style="width:100%;border-collapse:collapse;font-family:system-ui,sans-serif;font-size:12px;">
      <thead>
        <tr style="background:#f7f9fc;border-bottom:2px solid #e0e6ed;">
          <th style="padding:11px 16px;text-align:left;font-size:10px;font-weight:600;color:#8899aa;text-transform:uppercase;letter-spacing:0.8px;">Ticker</th>
          <th style="padding:11px 16px;text-align:left;font-size:10px;font-weight:600;color:#8899aa;text-transform:uppercase;letter-spacing:0.8px;">Company</th>
          <th style="padding:11px 16px;text-align:left;font-size:10px;font-weight:600;color:#8899aa;text-transform:uppercase;letter-spacing:0.8px;">Base date</th>
          <th style="padding:11px 16px;text-align:right;font-size:10px;font-weight:600;color:#8899aa;text-transform:uppercase;letter-spacing:0.8px;">Base price</th>
          <th style="padding:11px 16px;text-align:right;font-size:10px;font-weight:600;color:#8899aa;text-transform:uppercase;letter-spacing:0.8px;">Price</th>
          <th style="padding:11px 16px;text-align:right;font-size:10px;font-weight:600;color:#8899aa;text-transform:uppercase;letter-spacing:0.8px;">Target</th>
          <th style="padding:11px 16px;text-align:right;font-size:10px;font-weight:600;color:#8899aa;text-transform:uppercase;letter-spacing:0.8px;">Distance</th>
          <th style="padding:11px 16px;text-align:center;font-size:10px;font-weight:600;color:#8899aa;text-transform:uppercase;letter-spacing:0.8px;">Result</th>
          ${hasFund ? `<th style="padding:11px 16px;text-align:left;font-size:10px;font-weight:600;color:#8899aa;text-transform:uppercase;letter-spacing:0.8px;">Fundamentals</th>` : ''}
        </tr>
      </thead>
      <tbody>${stockRows}</tbody>
    </table>
  </div>

  <!-- Footer -->
  <div style="padding:20px 32px;background:#f7f9fc;border-top:1px solid #e0e6ed;">
    <div style="font-size:11px;color:#8899aa;font-family:system-ui,sans-serif;line-height:1.8;">
      Source: <strong style="color:#556677;">Twelve Data</strong> (prices) · <strong style="color:#556677;">Financial Modeling Prep</strong> (fundamentals) · Not financial advice.<br>
      Sent from <strong style="color:#556677;">Openbank Price Prediction</strong> · ${formatDate(TODAY)}
    </div>
  </div>

</div>
</div>
</body>
</html>`
}

// ── Component ─────────────────────────────────────────────────────────────────

const s = {
  box:      { border: '1px solid #30363d', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', background: '#0d1117' },
  h3:       { fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#e6edf3' },
  pre:      { background: '#161b22', borderRadius: 6, padding: 12, fontSize: 11, fontFamily: 'monospace', color: '#8b949e', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 160, overflowY: 'auto', marginBottom: 6 },
  hint:     { fontSize: 10, color: '#484f58', marginBottom: 10 },
  emailRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
  label:    { fontSize: 11, color: '#8b949e', flexShrink: 0 },
  input:    { flex: 1, minWidth: 200, padding: '6px 10px', borderRadius: 6, border: '1px solid #30363d', background: '#161b22', color: '#e6edf3', fontSize: 12, outline: 'none', fontFamily: 'inherit' },
  row:      { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  btnP:     { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #1f6feb', background: '#0d2136', color: '#58a6ff', flexShrink: 0 },
  btnG:     { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #30363d', background: 'transparent', color: '#e6edf3', flexShrink: 0 },
  btnSend:  { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #238636', background: '#1a4a2e', color: '#3fb950', flexShrink: 0 },
  spinner:  { width: 12, height: 12, border: '1.5px solid #30363d', borderTopColor: '#3fb950', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 },
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
    if (!toEmail.trim())                                          { setSendMsg('Please enter a recipient email.'); setSendOk(false); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail.trim()))     { setSendMsg('Invalid email address.');          setSendOk(false); return }
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

      <pre style={s.pre}>{htmlReport.slice(0, 600)}…</pre>
      <div style={s.hint}>Preview shows raw HTML — recipient sees a formatted light-theme email.</div>

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

      <div style={s.row}>
        <button style={s.btnP} onClick={handleCopy}>Copy HTML</button>
        <button style={s.btnG} onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
