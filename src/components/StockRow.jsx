import { memo, useState, useCallback } from 'react'
import { formatDate, targetDates, daysLeft, dateStatus } from '../utils/dates.js'
import { getTarget, getTargetDate, effectivePrice, distancePct, priceStatus } from '../utils/stocks.js'

const StockRow = memo(function StockRow({ stock, horizon, autoPrice, override, onOverrideChange }) {
  const best    = Math.max(stock.t1, stock.t3, stock.t6, stock.t12)
  const tgt     = getTarget(stock, horizon)
  const p       = effectivePrice(stock.t, { [stock.t]: autoPrice }, { [stock.t]: override })
  const dist    = distancePct(p, tgt)
  const status  = priceStatus(p, tgt)

  // Compute per-horizon date info
  const tg = stock.base ? targetDates(stock.base) : null
  const horizonDates = tg
    ? [
        { val: stock.t1, date: tg.d1 },
        { val: stock.t3, date: tg.d3 },
        { val: stock.t6, date: tg.d6 },
        { val: stock.t12, date: tg.d12 },
      ]
    : [
        { val: stock.t1 },
        { val: stock.t3 },
        { val: stock.t6 },
        { val: stock.t12 },
      ]

  // Local input state — commits only on blur/Enter, never causes rerender while typing
  const [val, setVal] = useState(override ? String(override) : '')

  const handleCommit = useCallback((e) => {
    const v = parseFloat(e.target.value)
    onOverrideChange(stock.t, isNaN(v) || v <= 0 ? null : v)
    if (isNaN(v) || v <= 0) setVal('')
  }, [stock.t, onOverrideChange])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') e.target.blur()
    if (e.key === 'Escape') { setVal(''); onOverrideChange(stock.t, null); e.target.blur() }
  }, [stock.t, onOverrideChange])

  const td = { padding: '8px 10px', verticalAlign: 'middle' }

  return (
    <tr style={{ borderBottom: '1px solid #21262d' }}>

      {/* Static cells */}
      <td style={{ ...td, fontWeight: 600, fontSize: 12, color: '#e6edf3' }}>{stock.t}</td>
      <td style={{ ...td, fontSize: 11, color: '#8b949e' }}>{stock.co}</td>
      <td style={{ ...td, fontSize: 11, color: '#484f58' }}>{stock.cu}</td>
      <td style={{ ...td, fontSize: 11, color: '#484f58' }}>{stock.base ? formatDate(stock.base) : '--'}</td>

      {/* Auto price */}
      <td style={td}>
        {autoPrice == null
          ? <span style={{ color: '#484f58', fontSize: 11 }}>--</span>
          : autoPrice === null
            ? <span style={{ color: '#f85149', fontSize: 11 }}>failed</span>
            : <span style={{ color: '#3fb950', fontWeight: 600 }}>{autoPrice.toFixed(2)}</span>
        }
      </td>

      {/* Override input */}
      <td style={td}>
        <input
          type="number"
          style={{
            width: 74, padding: '4px 6px', borderRadius: 6, fontFamily: 'inherit',
            border: `1px solid ${override ? '#d29922' : '#30363d'}`,
            background: '#0d1117', color: override ? '#d29922' : '#e6edf3',
            fontSize: 12, textAlign: 'right', outline: 'none',
          }}
          value={val}
          placeholder={autoPrice > 0 ? autoPrice.toFixed(2) : stock.b.toFixed(2)}
          onChange={e => setVal(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
        />
      </td>

      {/* Target columns — each with its own date tag */}
      {horizonDates.map(({ val: t, date }, i) => {
        const isBest  = t === best
        const ds      = date ? dateStatus(date) : null
        const dl      = date ? daysLeft(date) : null
        return (
          <td key={i} style={{ ...td, fontSize: 12, color: isBest ? '#58a6ff' : '#8b949e', fontWeight: isBest ? 600 : 400 }}>
            {t.toFixed(2)}
            {ds && <DateTag status={ds} />}
            {dl != null && ds !== 'past' && (
              <span style={{ display: 'block', fontSize: 9, color: '#484f58', marginTop: 1 }}>
                {dl >= 0 ? '+' : ''}{dl}d
              </span>
            )}
          </td>
        )
      })}

      {/* Hit badge */}
      <td style={td}>
        {status == null   && <Badge type="wait">--</Badge>}
        {status === 'hit' && <Badge type="hit">HIT</Badge>}
        {(status === 'close' || status === 'below') && <Badge type="miss">MISS</Badge>}
      </td>

      {/* Distance bar */}
      <td style={td}>
        {dist == null
          ? <span style={{ color: '#484f58', fontSize: 11 }}>--</span>
          : <DistBar dist={dist} status={status} />
        }
      </td>

      {/* Status text */}
      <td style={td}>
        {p == null           && <span style={{ color: '#484f58', fontSize: 11 }}>awaiting</span>}
        {p != null && p >= tgt  && <span style={{ color: '#3fb950', fontSize: 11 }}>Reached</span>}
        {status === 'close'  && <span style={{ color: '#d29922', fontSize: 11 }}>Very close</span>}
        {status === 'below' && p < tgt && <span style={{ color: '#f85149', fontSize: 11 }}>Below</span>}
      </td>
    </tr>
  )
})

export default StockRow

// ── Sub-components ────────────────────────────────────────────────────────────

function DateTag({ status }) {
  const cfg = {
    past: { bg: '#2a1515', color: '#f85149', label: 'expired' },
    now:  { bg: '#1a3a1a', color: '#3fb950', label: 'now'     },
    soon: { bg: '#2d2208', color: '#d29922', label: 'soon'    },
  }
  const c = cfg[status]
  if (!c) return null
  return (
    <span style={{
      display: 'inline-block', fontSize: 9, padding: '1px 4px',
      borderRadius: 6, marginLeft: 4, verticalAlign: 'middle',
      background: c.bg, color: c.color, fontWeight: 600,
    }}>
      {c.label}
    </span>
  )
}

function Badge({ type, children }) {
  const cfg = {
    hit:  { bg: '#1a4a2e', color: '#3fb950' },
    miss: { bg: '#3d1515', color: '#f85149' },
    wait: { bg: '#21262d', color: '#8b949e' },
  }
  const c = cfg[type]
  return (
    <span style={{
      display: 'inline-flex', fontSize: 11, fontWeight: 600,
      padding: '3px 8px', borderRadius: 20, background: c.bg, color: c.color,
    }}>
      {children}
    </span>
  )
}

function DistBar({ dist, status }) {
  const bw    = Math.min(80, Math.abs(dist) * 3.5)
  const barBg = status === 'hit' ? '#1a4a2e' : status === 'close' ? '#3d2d00' : '#3d1515'
  const color = dist > 0 ? '#3fb950' : status === 'close' ? '#d29922' : '#f85149'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: bw, height: 5, borderRadius: 3, background: barBg, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 600, minWidth: 54, textAlign: 'right', color }}>
        {dist > 0 ? '+' : ''}{dist.toFixed(2)}%
      </span>
    </div>
  )
}
