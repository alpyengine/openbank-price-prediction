import { useCallback, useState, useEffect } from 'react'
import { formatDate, today as getToday, daysLeft } from '../utils/dates.js'
import { getTarget, getTargetDate, getEffectivePrice, evaluatePrediction } from '../utils/stocks.js'
import { fmtMarketCap } from '../hooks/useFundamentals.js'

const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

// ── HTML email — 7-column table, fits mobile without scroll ──────────────────

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
    const dist    = p ? ((p - tgt) / tgt * 100) : null
    const f       = fundamentals?.[s.t]
    const dl      = tgtDate ? daysLeft(tgtDate) : null
    const expired = dl != null && dl < 0
    return { s, p, tgt, tgtDate, verdict, direction, dist, isHistorical, historicalDate, f, dl, expired }
  })

  const hits     = rows.filter(r => r.verdict === 'hit').length
  const close    = rows.filter(r => r.verdict === 'close').length
  const miss     = rows.filter(r => r.verdict === 'miss').length
  const awaiting = rows.filter(r => r.verdict == null).length

  const badgeStyle = v => {
    if (v==='hit')   return 'background:#f0faf3;color:#1e6b35;border:1px solid #b8e6c4;'
    if (v==='close') return 'background:#fffbf0;color:#8a6800;border:1px solid #f0d080;'
    if (v==='miss')  return 'background:#fff0f0;color:#cc2222;border:1px solid #f0b8b8;'
    return 'background:#f7f9fc;color:#8899aa;border:1px solid #e0e6ed;'
  }
  const verdictLabel = (v, dir) => {
    if (v==='hit')   return dir==='bearish' ? '✓ Dropped'     : '✓ Reached'
    if (v==='close') return '~ Near'
    if (v==='miss')  return dir==='bearish' ? "✗ Didn't drop" : '✗ Not reached'
    return '—'
  }
  const distColor = (v,d) => { if(d==null)return'#8899aa'; if(v==='hit')return'#1e7a3a'; if(v==='close')return'#8a6800'; return'#cc3333' }
  const distLabel = d => d==null?'--':(d>0?'+':'')+d.toFixed(2)+'%'
  const daysColor = (dl,exp) => exp?'#cc3333':dl<=14?'#8a6800':'#2255aa'
  const daysLabel = (dl,exp) => dl==null?'--':exp?`${Math.abs(dl)}d ago`:`${dl}d left`

  // 7 columns: Ticker+Sector | Company | Price | Target | Days | Distance | Result
  const tableRows = rows.map(({ s, p, tgt, tgtDate, verdict, direction, dist, isHistorical, historicalDate, f, dl, expired }, i) => `
    <tr style="border-bottom:1px solid #f0f2f5;${i%2===1?'background:#fafbfc;':''}">
      <td style="padding:11px 12px;">
        <div style="font-weight:700;font-size:13px;color:#1a2332;font-family:system-ui,sans-serif;">${s.t}</div>
        ${f?.sector?`<div style="font-size:10px;color:#8899aa;margin-top:2px;font-family:system-ui,sans-serif;">${f.sector}</div>`:''}
      </td>
      <td style="padding:11px 12px;color:#445566;font-size:12px;font-family:system-ui,sans-serif;">${s.co}</td>
      <td style="padding:11px 12px;text-align:right;">
        ${p!=null
          ?`<span style="color:#1a2332;font-weight:700;font-size:13px;font-family:system-ui,sans-serif;">${p.toFixed(2)}</span>
            <div style="font-size:10px;color:#8899aa;margin-top:2px;font-family:system-ui,sans-serif;">${isHistorical?`on ${historicalDate}`:'today'}</div>`
          :`<span style="color:#aabbcc;font-family:system-ui,sans-serif;">--</span>`}
      </td>
      <td style="padding:11px 12px;text-align:right;">
        <span style="color:#2255aa;font-weight:600;font-size:12px;font-family:system-ui,sans-serif;">${tgt.toFixed(2)}</span>
        ${tgtDate?`<div style="font-size:10px;color:#8899aa;margin-top:2px;font-family:system-ui,sans-serif;">${formatDate(tgtDate)}</div>`:''}
      </td>
      <td style="padding:11px 12px;text-align:center;font-weight:700;font-size:12px;color:${daysColor(dl,expired)};font-family:system-ui,sans-serif;">${daysLabel(dl,expired)}</td>
      <td style="padding:11px 12px;text-align:right;font-weight:700;font-size:13px;color:${distColor(verdict,dist)};font-family:system-ui,sans-serif;">${distLabel(dist)}</td>
      <td style="padding:11px 12px;text-align:center;">
        <span style="display:inline-block;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap;font-family:system-ui,sans-serif;${badgeStyle(verdict)}">
          ${verdictLabel(verdict,direction)}
        </span>
      </td>
    </tr>`).join('')

  const summaryCards = [
    { label:'Total',      value:stocks.length, color:'#1a2332', bg:'#fff',    border:'#e0e6ed' },
    { label:'Hit target', value:hits,           color:'#1e6b35', bg:'#f0faf3', border:'#b8e6c4' },
    { label:'Near',       value:close,           color:'#8a6800', bg:'#fffbf0', border:'#f0d080' },
    { label:'Miss',       value:miss,            color:'#9b2222', bg:'#fff5f5', border:'#f0b8b8' },
    { label:'Awaiting',   value:awaiting,        color:'#aabbcc', bg:'#f7f9fc', border:'#e0e6ed' },
  ].map(c=>`
    <td width="20%" style="padding:0 5px;">
      <div style="background:${c.bg};border:1px solid ${c.border};border-radius:8px;padding:10px 12px;">
        <div style="font-size:10px;color:#8899aa;font-family:system-ui,sans-serif;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:4px;">${c.label}</div>
        <div style="font-size:22px;font-weight:700;color:${c.color};font-family:system-ui,sans-serif;">${c.value}</div>
      </div>
    </td>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f2f5;">
<tr><td align="center" style="padding:20px 12px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td style="background:#1a2332;padding:22px 24px;">
    <div style="font-family:Georgia,serif;font-size:19px;font-weight:700;color:#ffffff;">Openbank Price Prediction</div>
    <div style="font-size:11px;color:#8899aa;margin-top:5px;font-family:system-ui,sans-serif;">
      ${formatDate(TODAY)} &nbsp;·&nbsp; Horizon: <span style="color:#c8d8e8;font-weight:600;">${horizonLabel}</span>
      &nbsp;·&nbsp; <span style="color:#c8d8e8;">${priceType}</span>
    </div>
  </td></tr>

  <!-- Summary — 5 cells in one row, uses table width percentages -->
  <tr><td style="padding:16px 20px;background:#f7f9fc;border-bottom:1px solid #e8ecf0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>${summaryCards}</tr>
    </table>
  </td></tr>

  <!-- Stock table — 7 columns, ~560px total, fits iPhone without scroll -->
  <tr><td style="padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:system-ui,sans-serif;font-size:12px;">
      <thead>
        <tr style="background:#f7f9fc;border-bottom:2px solid #e0e6ed;">
          <th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:600;color:#8899aa;text-transform:uppercase;letter-spacing:0.7px;">Ticker</th>
          <th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:600;color:#8899aa;text-transform:uppercase;letter-spacing:0.7px;">Company</th>
          <th style="padding:9px 12px;text-align:right;font-size:10px;font-weight:600;color:#8899aa;text-transform:uppercase;letter-spacing:0.7px;">Price</th>
          <th style="padding:9px 12px;text-align:right;font-size:10px;font-weight:600;color:#8899aa;text-transform:uppercase;letter-spacing:0.7px;">Target</th>
          <th style="padding:9px 12px;text-align:center;font-size:10px;font-weight:600;color:#8899aa;text-transform:uppercase;letter-spacing:0.7px;">Days</th>
          <th style="padding:9px 12px;text-align:right;font-size:10px;font-weight:600;color:#8899aa;text-transform:uppercase;letter-spacing:0.7px;">Distance</th>
          <th style="padding:9px 12px;text-align:center;font-size:10px;font-weight:600;color:#8899aa;text-transform:uppercase;letter-spacing:0.7px;">Result</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:16px 24px;background:#f7f9fc;border-top:1px solid #e0e6ed;">
    <div style="font-size:11px;color:#8899aa;font-family:system-ui,sans-serif;line-height:1.8;">
      Source: <strong style="color:#556677;">Twelve Data</strong> · <strong style="color:#556677;">Financial Modeling Prep</strong> · Not financial advice.<br>
      Sent from <strong style="color:#556677;">Openbank Price Prediction</strong> · ${formatDate(TODAY)}
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

// ── Modal component ───────────────────────────────────────────────────────────

export default function EmailPreview({ stocks, horizon, autoPrices, histPrices, overrides, horizonExpired, fundamentals, onClose }) {
  const [toEmail, setToEmail] = useState('alpyengine@gmail.com')
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState('')
  const [sendOk,  setSendOk]  = useState(null)

  const TODAY        = getToday()
  const htmlReport   = buildHtmlReport(stocks, horizon, autoPrices, histPrices, overrides, horizonExpired, fundamentals)
  const horizonLabel = horizon === 'best' ? 'Best target' : horizon

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(htmlReport) } catch { /* ignore */ }
  }, [htmlReport])

  const handleSend = useCallback(async () => {
    if (!toEmail.trim())                                                     { setSendMsg('Please enter a recipient email.'); setSendOk(false); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail.trim()))                { setSendMsg('Invalid email address.');          setSendOk(false); return }
    if (!EMAILJS_SERVICE_ID||!EMAILJS_TEMPLATE_ID||!EMAILJS_PUBLIC_KEY)     { setSendMsg('EmailJS not configured — check .env file.'); setSendOk(false); return }

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
        to_email: toEmail.trim(), report_date: formatDate(TODAY), report_body: htmlReport,
      })
      setSendOk(true); setSendMsg(`Report sent to ${toEmail.trim()} ✓`)
    } catch (err) {
      setSendOk(false); setSendMsg('Send failed: ' + (err?.text || err?.message || String(err)))
    } finally { setSending(false) }
  }, [toEmail, htmlReport])

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal-box">

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>✉ Email report</div>
            <div style={{ fontSize:11, color:'var(--text-2)', marginTop:2 }}>{horizonLabel} · {formatDate(TODAY)}</div>
          </div>
          <button style={{ fontSize:18, lineHeight:1, padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)', background:'transparent', color:'var(--text-2)', cursor:'pointer', fontFamily:'inherit' }} onClick={onClose} title="Close (Esc)">✕</button>
        </div>

        <div style={{ padding:'20px' }}>
          <pre style={{ background:'var(--bg)', borderRadius:6, padding:12, fontSize:11, fontFamily:'monospace', color:'var(--text-2)', whiteSpace:'pre-wrap', lineHeight:1.6, maxHeight:120, overflowY:'auto', marginBottom:4, border:'1px solid var(--border)' }}>
            {htmlReport.slice(0, 400)}…
          </pre>
          <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:16 }}>
            7-column table — fits iPhone screen without horizontal scroll.
          </div>

          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:12, color:'var(--text-2)', flexShrink:0, fontWeight:500 }}>To:</span>
            <input
              type="email"
              style={{ flex:1, minWidth:180, padding:'7px 10px', borderRadius:6, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text)', fontSize:12, outline:'none', fontFamily:'inherit' }}
              value={toEmail}
              onChange={e => { setToEmail(e.target.value); setSendMsg('') }}
              placeholder="recipient@email.com"
              onKeyDown={e => e.key==='Enter' && handleSend()}
              autoFocus
            />
            <button
              style={{ fontSize:12, padding:'7px 16px', borderRadius:6, cursor: sending?'not-allowed':'pointer', fontFamily:'inherit', border:'1px solid var(--green-bdr)', background:'var(--green-bg)', color:'var(--green)', flexShrink:0, fontWeight:600, opacity: sending?0.4:1 }}
              disabled={sending}
              onClick={handleSend}
            >
              {sending ? 'Sending…' : '✉ Send'}
            </button>
            {sending && <div style={{ width:12, height:12, border:'1.5px solid var(--border)', borderTopColor:'var(--green)', borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0 }} />}
          </div>

          {sendMsg && (
            <div style={{ fontSize:11, color: sendOk===true?'var(--green)':sendOk===false?'var(--red)':'var(--text-2)', marginBottom:8 }}>
              {sendMsg}
            </div>
          )}

          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button style={{ fontSize:12, padding:'6px 14px', borderRadius:6, cursor:'pointer', fontFamily:'inherit', border:'1px solid var(--blue-bdr)', background:'var(--blue-bg)', color:'var(--blue)' }} onClick={handleCopy}>Copy HTML</button>
            <button style={{ fontSize:12, padding:'6px 14px', borderRadius:6, cursor:'pointer', fontFamily:'inherit', border:'1px solid var(--border)', background:'transparent', color:'var(--text)' }} onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
