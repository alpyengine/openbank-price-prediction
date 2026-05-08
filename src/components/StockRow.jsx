import { memo, useState, useCallback } from 'react'
import { formatDate, targetDates, daysLeft, dateStatus } from '../utils/dates.js'
import { getTarget, getTargetDate, effectivePrice, distancePct, priceStatus } from '../utils/stocks.js'

// memo: only re-renders when props actually change
const StockRow = memo(function StockRow({ stock, horizon, autoPrice, source, override, onOverrideChange }) {
  const best    = Math.max(stock.t1, stock.t3, stock.t6, stock.t12)
  const tgt     = getTarget(stock, horizon)
  const tgtDate = getTargetDate(stock, horizon)
  const p       = effectivePrice(stock.t, { [stock.t]: autoPrice }, { [stock.t]: override })
  const dist    = distancePct(p, tgt)
  const status  = priceStatus(p, tgt)

  // Local input state — avoids controlled-input rerender issues
  const [inputVal, setInputVal] = useState(override ? String(override) : '')

  const handleChange = useCallback((e) => {
    setInputVal(e.target.value)
  }, [])

  // KEY FIX: only propagate on blur / Enter — never on every keystroke
  const handleCommit = useCallback((e) => {
    const v = parseFloat(e.target.value)
    onOverrideChange(stock.t, isNaN(v) || v <= 0 ? null : v)
  }, [stock.t, onOverrideChange])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') e.target.blur()
  }, [])

  // Clear input if override was cleared externally
  const displayVal = override ? (inputVal || String(override)) : inputVal

  const tg12     = stock.base ? targetDates(stock.base).d12 : null
  const ds12     = tg12 ? dateStatus(tg12) : null
  const dl12     = tg12 ? daysLeft(tg12) : null

  return (
    <tr style={styles.tr}>
      <td style={styles.ticker}>{stock.t}</td>
      <td style={styles.company}>{stock.co}</td>
      <td style={styles.muted}>{stock.cu}</td>
      <td style={styles.muted}>{stock.base ? formatDate(stock.base) : '--'}</td>

      {/* Auto price */}
      <td>
        {autoPrice == null && <span style={styles.pend}>--</span>}
        {autoPrice === null && autoPrice !== undefined && <span style={styles.err}>failed</span>}
        {autoPrice > 0 && (
          <span>
            <span style={styles.priceOk}>{autoPrice.toFixed(2)}</span>
            {source && <span style={styles.srcLabel}>{source}</span>}
          </span>
        )}
      </td>

      {/* Override input — uncontrolled value, fires only on blur/enter */}
      <td>
        <input
          type="number"
          style={{ ...styles.input, ...(override ? styles.inputActive : {}) }}
          value={displayVal}
          placeholder={autoPrice > 0 ? autoPrice.toFixed(2) : stock.b.toFixed(2)}
          onChange={handleChange}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
        />
      </td>

      {/* Targets */}
      <td style={best === stock.t1  ? styles.bestTarget : styles.target}>{stock.t1.toFixed(2)}</td>
      <td style={best === stock.t3  ? styles.bestTarget : styles.target}>{stock.t3.toFixed(2)}</td>
      <td style={best === stock.t6  ? styles.bestTarget : styles.target}>{stock.t6.toFixed(2)}</td>
      <td style={best === stock.t12 ? styles.bestTarget : styles.target}>
        {stock.t12.toFixed(2)}
        {ds12 && <DateTag status={ds12} />}
        {dl12 != null && <span style={styles.daysLeft}>{dl12}d</span>}
      </td>

      {/* Hit */}
      <td>
        {status == null && <span style={styles.badgeWait}>--</span>}
        {status === 'hit'   && <span style={styles.badgeHit}>HIT</span>}
        {(status === 'close' || status === 'below') && <span style={styles.badgeMiss}>MISS</span>}
      </td>

      {/* Distance */}
      <td>
        {dist == null
          ? <span style={styles.pend}>--</span>
          : <DistBar dist={dist} status={status} />
        }
      </td>

      {/* Status */}
      <td>
        {p == null && <span style={styles.pend}>awaiting</span>}
        {p != null && p >= tgt && <span style={{ color: '#3fb950', fontSize: 11 }}>Reached</span>}
        {status === 'close' && <span style={{ color: '#d29922', fontSize: 11 }}>Very close</span>}
        {status === 'below' && <span style={{ color: '#f85149', fontSize: 11 }}>Below</span>}
      </td>
    </tr>
  )
})

export default StockRow

function DateTag({ status }) {
  const colors = {
    past: { bg: '#2a1515', color: '#f85149' },
    now:  { bg: '#1a3a1a', color: '#3fb950' },
    soon: { bg: '#2d2208', color: '#d29922' },
  }
  const c = colors[status]
  if (!c) return null
  return (
    <span style={{ ...styles.tag, background: c.bg, color: c.color }}>
      {status}
    </span>
  )
}

function DistBar({ dist, status }) {
  const barW  = Math.min(80, Math.abs(dist) * 3.5)
  const barBg = status === 'hit' ? '#1a4a2e' : status === 'close' ? '#3d2d00' : '#3d1515'
  const valColor = dist > 0 ? '#3fb950' : status === 'close' ? '#d29922' : '#f85149'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: barW, height: 5, borderRadius: 3, background: barBg, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 600, minWidth: 54, textAlign: 'right', color: valColor }}>
        {dist > 0 ? '+' : ''}{dist.toFixed(2)}%
      </span>
    </div>
  )
}

const styles = {
  tr:          { borderBottom: '1px solid #21262d' },
  ticker:      { padding: '8px 10px', fontWeight: 600, fontSize: 12, color: '#e6edf3', verticalAlign: 'middle' },
  company:     { padding: '8px 10px', fontSize: 11, color: '#8b949e', verticalAlign: 'middle' },
  muted:       { padding: '8px 10px', fontSize: 11, color: '#484f58', verticalAlign: 'middle' },
  target:      { padding: '8px 10px', fontSize: 12, color: '#8b949e', verticalAlign: 'middle' },
  bestTarget:  { padding: '8px 10px', fontSize: 12, color: '#58a6ff', fontWeight: 600, verticalAlign: 'middle' },
  priceOk:     { color: '#3fb950', fontWeight: 600, fontSize: 12 },
  srcLabel:    { fontSize: 9, color: '#484f58', marginLeft: 4 },
  pend:        { color: '#484f58', fontSize: 11 },
  err:         { color: '#f85149', fontSize: 11 },
  daysLeft:    { fontSize: 10, color: '#484f58', marginLeft: 3 },
  tag:         { display: 'inline-block', fontSize: 10, padding: '1px 5px', borderRadius: 8, marginLeft: 4, verticalAlign: 'middle' },
  badgeHit:    { display: 'inline-flex', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: '#1a4a2e', color: '#3fb950' },
  badgeMiss:   { display: 'inline-flex', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: '#3d1515', color: '#f85149' },
  badgeWait:   { display: 'inline-flex', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: '#21262d', color: '#8b949e' },
  input: {
    width: 74, padding: '4px 6px', borderRadius: 6,
    border: '1px solid #30363d', background: '#0d1117',
    color: '#e6edf3', fontSize: 12, textAlign: 'right',
    fontFamily: 'inherit', outline: 'none',
  },
  inputActive: { borderColor: '#d29922', color: '#d29922' },
}
