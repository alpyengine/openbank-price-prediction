import { memo, useState, useCallback } from 'react'
import { formatDate, targetDates, daysLeft, dateStatus } from '../utils/dates.js'
import {
  getTarget, getEffectivePrice, distancePct,
  evaluatePrediction, histKey,
} from '../utils/stocks.js'

const StockRow = memo(function StockRow({
  stock, horizon, autoPrice, histPrices, override, horizonExpired, onOverrideChange
}) {
  const best  = Math.max(stock.t1, stock.t3, stock.t6, stock.t12)
  const tgt   = getTarget(stock, horizon)
  const tg    = stock.base ? targetDates(stock.base) : null

  // Which horizon label is "best" for this stock
  const bestLabel = best === stock.t12 ? '12M' : best === stock.t6 ? '6M' : best === stock.t3 ? '3M' : '1M'

  // Effective price
  const { price: p, isHistorical, historicalDate } = getEffectivePrice(
    stock.t, horizon,
    { [stock.t]: autoPrice },
    histPrices,
    override ? { [stock.t]: override } : {},
    horizonExpired
  )

  // Direction-aware evaluation
  const dist             = distancePct(p, tgt)
  const { verdict, direction } = evaluatePrediction(p, tgt, stock.b)

  // Historical entry
  const hKey      = histKey(stock.t, horizon)
  const histEntry = histPrices?.[hKey]
  const histLoading = horizonExpired && horizon !== 'best' && histEntry === undefined

  // Target columns
  const horizonDates = tg
    ? [{ val: stock.t1, date: tg.d1 }, { val: stock.t3, date: tg.d3 },
       { val: stock.t6, date: tg.d6 }, { val: stock.t12, date: tg.d12 }]
    : [{ val: stock.t1 }, { val: stock.t3 }, { val: stock.t6 }, { val: stock.t12 }]

  // Local input state
  const [val, setVal] = useState(override ? String(override) : '')
  const handleCommit  = useCallback((e) => {
    const v = parseFloat(e.target.value)
    onOverrideChange(stock.t, isNaN(v) || v <= 0 ? null : v)
    if (isNaN(v) || v <= 0) setVal('')
  }, [stock.t, onOverrideChange])
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter')  e.target.blur()
    if (e.key === 'Escape') { setVal(''); onOverrideChange(stock.t, null); e.target.blur() }
  }, [stock.t, onOverrideChange])

  const td = { padding: '7px 10px', verticalAlign: 'middle' }

  return (
    <tr style={{ borderBottom: '1px solid #21262d' }}>

      {/* Static cells */}
      <td style={{ ...td, fontWeight: 600, fontSize: 12, color: '#e6edf3' }}>{stock.t}</td>
      <td style={{ ...td, fontSize: 11, color: '#8b949e' }}>{stock.co}</td>
      <td style={{ ...td, fontSize: 11, color: '#484f58' }}>{stock.cu}</td>
      <td style={{ ...td, fontSize: 11, color: '#484f58' }}>{stock.base ? formatDate(stock.base) : '--'}</td>

      {/* Price cell */}
      <td style={td}>
        {histLoading && <span style={{ color: '#484f58', fontSize: 11 }}>fetching…</span>}

        {!histLoading && isHistorical && histEntry && (
          <div>
            <span style={{ color: '#58a6ff', fontWeight: 600, fontSize: 12 }}>
              {histEntry.price.toFixed(2)}
            </span>
            <span style={{ display: 'block', fontSize: 9, color: '#484f58', marginTop: 1 }}>
              close on {histEntry.date}
            </span>
          </div>
        )}
        {!histLoading && isHistorical && !histEntry && (
          <span style={{ color: '#f85149', fontSize: 11 }}>unavailable</span>
        )}
        {!isHistorical && (
          <div>
            {autoPrice == null
              ? <span style={{ color: '#484f58', fontSize: 11 }}>--</span>
              : <span style={{ color: '#3fb950', fontWeight: 600, fontSize: 12 }}>
                  {autoPrice.toFixed(2)}
                </span>
            }
            {horizon === 'best' && autoPrice != null && (
              <span style={{ display: 'block', fontSize: 9, color: '#484f58', marginTop: 1 }}>
                vs {bestLabel} · today
              </span>
            )}
          </div>
        )}
      </td>

      {/* Override */}
      <td style={td}>
        <input
          type="number"
          style={{
            width: 72, padding: '4px 6px', borderRadius: 6, fontFamily: 'inherit',
            border: `1px solid ${override ? '#d29922' : '#30363d'}`,
            background: '#0d1117', color: override ? '#d29922' : '#e6edf3',
            fontSize: 12, textAlign: 'right', outline: 'none',
          }}
          value={val}
          placeholder={p ? p.toFixed(2) : stock.b.toFixed(2)}
          onChange={e => setVal(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
        />
      </td>

      {/* Target columns */}
      {horizonDates.map(({ val: t, date }, i) => {
        const isBest = t === best
        const ds     = date ? dateStatus(date) : null
        const dl     = date ? daysLeft(date) : null
        // Direction indicator per target
        const tDir   = t > stock.b ? '↑' : t < stock.b ? '↓' : '→'
        const tDirColor = t > stock.b ? '#3fb950' : t < stock.b ? '#f85149' : '#8b949e'
        return (
          <td key={i} style={{
            ...td, fontSize: 12,
            color:      isBest ? '#58a6ff' : '#8b949e',
            fontWeight: isBest ? 600 : 400,
          }}>
            <span style={{ marginRight: 2, fontSize: 10, color: tDirColor }}>{tDir}</span>
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
      <td style={{ ...td, textAlign: 'center' }}>
        {histLoading             && <Badge type="wait">…</Badge>}
        {!histLoading && verdict == null   && <Badge type="wait">--</Badge>}
        {!histLoading && verdict === 'hit' && <Badge type="hit">HIT</Badge>}
        {!histLoading && verdict === 'close' && <Badge type="close">CLOSE</Badge>}
        {!histLoading && verdict === 'miss' && <Badge type="miss">MISS</Badge>}
      </td>

      {/* Distance — bar on top, % below */}
      <td style={td}>
        {histLoading || dist == null
          ? <span style={{ color: '#484f58', fontSize: 11 }}>{histLoading ? '…' : '--'}</span>
          : <DistBar dist={dist} verdict={verdict} direction={direction} />
        }
      </td>

      {/* Result */}
      <td style={td}>
        <ResultCell
          histLoading={histLoading}
          p={p}
          verdict={verdict}
          direction={direction}
          isHistorical={isHistorical}
        />
      </td>
    </tr>
  )
})

export default StockRow

// ── ResultCell ────────────────────────────────────────────────────────────────

function ResultCell({ histLoading, p, verdict, direction, isHistorical }) {
  if (histLoading) return <span style={{ color: '#484f58', fontSize: 11 }}>loading…</span>
  if (p == null)   return <span style={{ color: '#484f58', fontSize: 11 }}>awaiting</span>

  const sub = isHistorical ? 'on target date' : 'today'

  if (verdict === 'hit') {
    const label = direction === 'bearish' ? '✓ Dropped' : '✓ Reached'
    return (
      <div>
        <span style={{ color: '#3fb950', fontSize: 11, fontWeight: 600 }}>{label}</span>
        <span style={{ display: 'block', fontSize: 9, color: '#484f58', marginTop: 1 }}>{sub}</span>
      </div>
    )
  }

  if (verdict === 'close') {
    return (
      <div>
        <span style={{ color: '#d29922', fontSize: 11, fontWeight: 600 }}>Near target</span>
        <span style={{ display: 'block', fontSize: 9, color: '#484f58', marginTop: 1 }}>{sub}</span>
      </div>
    )
  }

  // miss
  const label = direction === 'bearish' ? '✗ Didn\'t drop' : '✗ Not reached'
  return (
    <div>
      <span style={{ color: '#f85149', fontSize: 11, fontWeight: 600 }}>{label}</span>
      <span style={{ display: 'block', fontSize: 9, color: '#484f58', marginTop: 1 }}>{sub}</span>
    </div>
  )
}

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
    hit:   { bg: '#1a4a2e', color: '#3fb950' },
    close: { bg: '#2d2208', color: '#d29922' },
    miss:  { bg: '#3d1515', color: '#f85149' },
    wait:  { bg: '#21262d', color: '#8b949e' },
  }
  const c = cfg[type]
  return (
    <span style={{
      display: 'inline-flex', fontSize: 11, fontWeight: 600,
      padding: '3px 8px', borderRadius: 20,
      background: c.bg, color: c.color,
    }}>
      {children}
    </span>
  )
}

// FIX: bar on top, % below — no horizontal overlap with Result column
function DistBar({ dist, verdict, direction }) {
  const bw    = Math.min(70, Math.abs(dist) * 2.5)
  const barBg = verdict === 'hit'   ? '#1a4a2e'
              : verdict === 'close' ? '#3d2d00'
              : '#3d1515'
  // Positive = price above target
  // For bullish: positive is good (green), negative is bad (red)
  // For bearish: negative is good (price dropped), positive is bad
  const color = verdict === 'hit'   ? '#3fb950'
              : verdict === 'close' ? '#d29922'
              : '#f85149'

  const sign = dist > 0 ? '+' : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ width: bw, height: 4, borderRadius: 3, background: barBg }} />
      <span style={{ fontSize: 11, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
        {sign}{dist.toFixed(2)}%
      </span>
    </div>
  )
}
