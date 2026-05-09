import { memo, useState, useCallback } from 'react'
import { formatDate, targetDates, daysLeft, dateStatus } from '../utils/dates.js'
import { getTarget, getTargetDate, effectivePrice, distancePct, priceStatus } from '../utils/stocks.js'

const StockRow = memo(function StockRow({ stock, horizon, autoPrice, override, onOverrideChange }) {
  const best      = Math.max(stock.t1, stock.t3, stock.t6, stock.t12)
  const tgt       = getTarget(stock, horizon)
  const tgtDate   = getTargetDate(stock, horizon)
  const p         = effectivePrice(stock.t, { [stock.t]: autoPrice }, { [stock.t]: override })
  const dist      = distancePct(p, tgt)
  const status    = priceStatus(p, tgt)
  const tg12      = stock.base ? targetDates(stock.base).d12 : null
  const ds12      = tg12 ? dateStatus(tg12) : null
  const dl12      = tg12 ? daysLeft(tg12) : null

  // Local input state — never tied to React rerender cycle
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

  const tdBase = { padding: '8px 10px', verticalAlign: 'middle' }

  return (
    <tr style={{ borderBottom: '1px solid #21262d' }}>
      <td style={{ ...tdBase, fontWeight: 600, fontSize: 12, color: '#e6edf3' }}>{stock.t}</td>
      <td style={{ ...tdBase, fontSize: 11, color: '#8b949e' }}>{stock.co}</td>
      <td style={{ ...tdBase, fontSize: 11, color: '#484f58' }}>{stock.cu}</td>
      <td style={{ ...tdBase, fontSize: 11, color: '#484f58' }}>{stock.base ? formatDate(stock.base) : '--'}</td>

      {/* Auto price */}
      <td style={tdBase}>
        {autoPrice == null
          ? <span style={{ color: '#484f58', fontSize: 11 }}>--</span>
          : autoPrice === null
            ? <span style={{ color: '#f85149', fontSize: 11 }}>failed</span>
            : <span style={{ color: '#3fb950', fontWeight: 600 }}>{autoPrice.toFixed(2)}</span>
        }
      </td>

      {/* Override — local state, commits on blur/Enter only */}
      <td style={tdBase}>
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

      {/* Targets — best highlighted blue */}
      {[stock.t1, stock.t3, stock.t6].map((t, i) => (
        <td key={i} style={{ ...tdBase, fontSize: 12, color: best === t ? '#58a6ff' : '#8b949e', fontWeight: best === t ? 600 : 400 }}>
          {t.toFixed(2)}
        </td>
      ))}

      {/* 12M with date tag */}
      <td style={{ ...tdBase, fontSize: 12, color: best === stock.t12 ? '#58a6ff' : '#8b949e', fontWeight: best === stock.t12 ? 600 : 400 }}>
        {stock.t12.toFixed(2)}
        {ds12 && <DateTag status={ds12} />}
        {dl12 != null && <span style={{ fontSize: 10, color: '#484f58', marginLeft: 3 }}>{dl12}d</span>}
      </td>

      {/* Hit badge */}
      <td style={tdBase}>
        {status == null  && <Badge type="wait">--</Badge>}
        {status === 'hit' && <Badge type="hit">HIT</Badge>}
        {(status === 'close' || status === 'below') && <Badge type="miss">MISS</Badge>}
      </td>

      {/* Distance bar */}
      <td style={tdBase}>
        {dist == null
          ? <span style={{ color: '#484f58', fontSize: 11 }}>--</span>
          : <DistBar dist={dist} status={status} />
        }
      </td>

      {/* Status text */}
      <td style={tdBase}>
        {p == null      && <span style={{ color: '#484f58', fontSize: 11 }}>awaiting</span>}
        {p >= tgt       && <span style={{ color: '#3fb950', fontSize: 11 }}>Reached</span>}
        {status === 'close' && <span style={{ color: '#d29922', fontSize: 11 }}>Very close</span>}
        {status === 'below' && p < tgt && <span style={{ color: '#f85149', fontSize: 11 }}>Below</span>}
      </td>
    </tr>
  )
})

export default StockRow

function Badge({ type, children }) {
  const colors = {
    hit:  { bg: '#1a4a2e', color: '#3fb950' },
    miss: { bg: '#3d1515', color: '#f85149' },
    wait: { bg: '#21262d', color: '#8b949e' },
  }
  const c = colors[type]
  return (
    <span style={{ display: 'inline-flex', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: c.bg, color: c.color }}>
      {children}
    </span>
  )
}

function DateTag({ status }) {
  const colors = { past: ['#2a1515', '#f85149'], now: ['#1a3a1a', '#3fb950'], soon: ['#2d2208', '#d29922'] }
  const [bg, color] = colors[status] || []
  if (!bg) return null
  return <span style={{ display: 'inline-block', fontSize: 10, padding: '1px 5px', borderRadius: 8, marginLeft: 4, verticalAlign: 'middle', background: bg, color }}>{status}</span>
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
