import { useCallback } from 'react'
import { formatDate, today as getToday } from '../utils/dates.js'
import { getTarget, getTargetDate, effectivePrice } from '../utils/stocks.js'

export default function EmailPreview({ stocks, horizon, autoPrices, overrides, onClose }) {
  const TODAY = getToday()

  const buildText = useCallback(() => {
    const lines = [
      `Subject: Openbank Forecast Check -- ${formatDate(TODAY)}`,
      '', 'Hi,', '',
      `Price check as of ${formatDate(TODAY)} -- Horizon: ${horizon === 'best' ? 'Best target' : horizon}`,
      '',
      'Ticker  | Base Date    | Auto Price  | Target     | Target Date   | Distance   | Status',
      '------  | ------------ | ----------- | ---------- | ------------- | ---------- | ------',
    ]

    for (const s of stocks) {
      const p   = effectivePrice(s.t, autoPrices, overrides)
      const t   = getTarget(s, horizon)
      const td  = getTargetDate(s, horizon)
      const au  = autoPrices[s.t]
      const auS = au != null ? au.toFixed(2) : 'N/A'
      const bdS = s.base ? formatDate(s.base) : 'N/A'
      const tdS = td ? formatDate(td) : 'N/A'
      const dS  = p ? ((p - t) / t * 100 >= 0 ? '+' : '') + ((p - t) / t * 100).toFixed(2) + '%' : '--'
      const adV = p ? Math.abs((p - t) / t * 100) : null
      const st  = !p             ? 'Awaiting'
                : p >= t         ? 'TARGET REACHED'
                : adV <= 5       ? 'Close (<5%)'
                : adV <= 15      ? 'Getting closer'
                : 'Below target'
      lines.push(
        `${s.t.padEnd(6)}  | ${bdS.padEnd(12)} | ${auS.padStart(11)} | ${t.toFixed(2).padStart(10)} | ${tdS.padEnd(13)} | ${dS.padStart(10)} | ${st}`
      )
    }

    lines.push('', '---', 'Source: Yahoo Finance via yfinance / stooq. Not financial advice.')
    return lines.join('\n')
  }, [stocks, horizon, autoPrices, overrides])

  const text = buildText()

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  }, [text])

  return (
    <div style={styles.box}>
      <h3 style={styles.h3}>Email report</h3>
      <pre style={styles.pre}>{text}</pre>
      <div style={styles.row}>
        <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleCopy}>
          Copy
        </button>
        <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

const styles = {
  box:        { border: '1px solid #30363d', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', background: '#0d1117' },
  h3:         { fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#e6edf3' },
  pre:        { background: '#161b22', borderRadius: 6, padding: 12, fontSize: 11, fontFamily: 'monospace', color: '#8b949e', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 220, overflowY: 'auto', marginBottom: 10 },
  row:        { display: 'flex', gap: 8 },
  btn:        { fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' },
  btnPrimary: { border: '1px solid #1f6feb', background: '#0d2136', color: '#58a6ff' },
  btnGhost:   { border: '1px solid #30363d', background: 'transparent', color: '#e6edf3' },
}
