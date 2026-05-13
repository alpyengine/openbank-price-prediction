import { memo, useState, useCallback } from 'react'
import { formatDate, targetDates, daysLeft, dateStatus, today as getToday } from '../utils/dates.js'
import { getTarget, getTargetDate, getEffectivePrice, distancePct, priceStatus, histKey } from '../utils/stocks.js'

const TODAY = getToday()

const StockRow = memo(function StockRow({
  stock, horizon, autoPrice, histPrices, override, horizonExpired, onOverrideChange
}) {
  const best    = Math.max(stock.t1, stock.t3, stock.t6, stock.t12)
  const tgt     = getTarget(stock, horizon)
  const tg      = stock.base ? targetDates(stock.base) : null

  // Which horizon label is "best" for this stock
  const bestHorizonLabel =
    best === stock.t12 ? '12M' :
    best === stock.t6  ? '6M'  :
    best === stock.t3  ? '3M'  : '1M'

  // Effective price — historical if expired, current otherwise
  const { price: p, isHistorical, historicalDate } = getEffectivePrice(
    stock.t, horizon,
    { [stock.t]: autoPrice },
    histPrices,
    override ? { [stock.t]: override } : {},
    horizonExpired
  )

  const dist   = distancePct(p, tgt)
  const status = priceStatus(p, tgt)

  // Historical entry for this horizon
  const hKey       = histKey(stock.t, horizon)
  const histEntry  = histPrices?.[hKey]
  const histLoading = horizonExpired && horizon !== 'best' && histEntry === undefined

  // Per-horizon date info for target columns
  const horizonDates = tg
    ? [
        { val: stock.t1,  date: tg.d1  },
        { val: stock.t3,  date: tg.d3  },
        { val: stock.t6,  date: tg.d6  },
        { val: stock.t12, date: tg.d12 },
      ]
    : [
        { val: stock.t1  }, { val: stock.t3  },
        { val: stock.t6  }, { val: stock.t12 },
      ]

  // Local input state — commits only on blur/Enter
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

      {/* Ticker */}
      <td style={{ ...td, fontWeight: 600, fontSize: 12, color: '#e6edf3' }}>{stock.t}</td>
      <td style={{ ...td, fontSize: 11, color: '#8b949e' }}>{stock.co}</td>
      <td style={{ ...td, fontSize: 11, color: '#484f58' }}>{stock.cu}</td>
      <td style={{ ...td, fontSize: 11, color: '#484f58' }}>{stock.base ? formatDate(stock.base) : '--'}</td>

      {/* Price cell */}
      <td style={td}>
        {histLoading && (
          <span style={{ color: '#484f58', fontSize: 11 }}>fetching...</span>
        )}

        {/* Historical price (expired horizon) */}
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

        {/* Current price (future horizon or best target) */}
        {!isHistorical && (
          <div>
            {autoPrice == null
              ? <span style={{ color: '#484f58', fontSize: 11 }}>--</span>
              : <span style={{ color: '#3fb950', fontWeight: 600, fontSize: 12 }}>
                  {autoPrice.toFixed(2)}
                </span>
            }
            {/* Best target: show which horizon is being used */}
            {horizon === 'best' && autoPrice != null && (
              <span style={{ display: 'block', fontSize: 9, color: '#484f58', marginTop: 1 }}>
                vs {bestHorizonLabel} · today
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

      {/* Target columns — each with date tag */}
      {horizonDates.map(({ val: t, date }, i) => {
        const isBest = t === best
        const ds     = date ? dateStatus(date) : null
        const dl     = date ? daysLeft(date) : null
        return (
          <td key={i} style={{
            ...td, fontSize: 12,
            color:      isBest ? '#58a6ff' : '#8b949e',
            fontWeight: isBest ? 600 : 400,
          }}>
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
        {histLoading                  && <Badge type="wait">…</Badge>}
        {!histLoading && status == null  && <Badge type="wait">--</Badge>}
        {!histLoading && status === 'hit' && <Badge type="hit">HIT</Badge>}
        {!histLoading && (status === 'close' || status === 'below')
          && <Badge type="miss">MISS</Badge>}
      </td>

      {/* Distance bar */}
      <td style={td}>
        {histLoading || dist == null
          ? <span style={{ color: '#484f58', fontSize: 11 }}>{histLoading ? '…' : '--'}</span>
          : <DistBar dist={dist} status={status} />
        }
      </td>

      {/* Result — short labels, no overlap */}
      <td style={td}>
        <ResultCell
          histLoading={histLoading}
          p={p}
          tgt={tgt}
          status={status}
          isHistorical={isHistorical}
          dist={dist}
        />
      </td>
    </tr>
  )
})

export default StockRow

// ── Result cell ───────────────────────────────────────────────────────────────
// Short, clear labels that fit in 120px column without overlap

function ResultCell({ histLoading, p, tgt, status, isHistorical, dist }) {
  if (histLoading) return <span style={{ color: '#484f58', fontSize: 11 }}>loading…</span>
  if (p == null)   return <span style={{ color: '#484f58', fontSize: 11 }}>awaiting</span>

  if (p >= tgt) {
    return (
      <div>
        <span style={{ color: '#3fb950', fontSize: 11, fontWeight: 600 }}>
          {isHistorical ? '✓ Reached' : '✓ Above'}
        </span>
        {isHistorical && (
          <span style={{ display: 'block', fontSize: 9, color: '#484f58', marginTop: 1 }}>
            on target date
          </span>
        )}
      </div>
    )
  }

  if (status === 'close') {
    return (
      <div>
        <span style={{ color: '#d29922', fontSize: 11, fontWeight: 600 }}>Very close</span>
        <span style={{ display: 'block', fontSize: 9, color: '#484f58', marginTop: 1 }}>
          {isHistorical ? 'on target date' : 'today'}
        </span>
      </div>
    )
  }

  // below
  return (
    <div>
      <span style={{ color: '#f85149', fontSize: 11, fontWeight: 600 }}>
        {isHistorical ? '✗ Not reached' : 'Below'}
      </span>
      {isHistorical && (
        <span style={{ display: 'block', fontSize: 9, color: '#484f58', marginTop: 1 }}>
          on target date
        </span>
      )}
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
    hit:  { bg: '#1a4a2e', color: '#3fb950' },
    miss: { bg: '#3d1515', color: '#f85149' },
    wait: { bg: '#21262d', color: '#8b949e' },
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

function DistBar({ dist, status }) {
  const bw    = Math.min(60, Math.abs(dist) * 3)
  const barBg = status === 'hit' ? '#1a4a2e' : status === 'close' ? '#3d2d00' : '#3d1515'
  const color = dist > 0 ? '#3fb950' : status === 'close' ? '#d29922' : '#f85149'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: bw, height: 4, borderRadius: 3, background: barBg, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
        {dist > 0 ? '+' : ''}{dist.toFixed(2)}%
      </span>
    </div>
  )
}
