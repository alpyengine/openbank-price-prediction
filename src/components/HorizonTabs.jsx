import { formatDate, targetDates, daysLeft, dateStatus } from '../utils/dates.js'

const HORIZONS = ['best', '1M', '3M', '6M', '12M']
const HORIZON_KEY = { '1M': 'd1', '3M': 'd3', '6M': 'd6', '12M': 'd12' }

export default function HorizonTabs({ horizon, stocks, onHorizonChange }) {
  const base = stocks.find(s => s.base)?.base
  const tg   = base ? targetDates(base) : null

  function tabStatus(h) {
    if (h === 'best' || !tg) return null
    return dateStatus(tg[HORIZON_KEY[h]])
  }

  const activeDate   = horizon !== 'best' && tg ? tg[HORIZON_KEY[horizon]] : null
  const activeDl     = activeDate ? daysLeft(activeDate) : null
  const activeStatus = activeDate ? dateStatus(activeDate) : null

  // Build tab style without mixing border shorthand and borderColor longhand
  function tabStyle(h) {
    const isActive = horizon === h
    const ts       = tabStatus(h)

    // Always use full border shorthand — never borderColor alone
    if (isActive) {
      return {
        ...base_tab,
        background:  '#0d2136',
        border:      '1px solid #1f6feb',
        color:       '#58a6ff',
      }
    }
    if (ts === 'past') {
      return { ...base_tab, border: '1px solid #3d1515', color: '#f85149' }
    }
    if (ts === 'soon') {
      return { ...base_tab, border: '1px solid #3d2d00', color: '#d29922' }
    }
    return base_tab
  }

  return (
    <>
      {/* Tab row */}
      <div style={styles.tabs}>
        {HORIZONS.map(h => {
          const ts = tabStyle(h) // already computed above via tabStyle()
          const tabSt = tabStatus(h)
          return (
            <button key={h} style={tabStyle(h)} onClick={() => onHorizonChange(h)}>
              {h === 'best' ? 'Best target' : h}
              {horizon !== h && tabSt === 'past' && <Dot color="#f85149" />}
              {horizon !== h && tabSt === 'soon' && <Dot color="#d29922" />}
              {horizon !== h && tabSt === 'now'  && <Dot color="#3fb950" />}
            </button>
          )
        })}
      </div>

      {/* Date reference bar */}
      {tg && (
        <div style={styles.dates}>
          {[
            { label: '1M',  d: tg.d1  },
            { label: '3M',  d: tg.d3  },
            { label: '6M',  d: tg.d6  },
            { label: '12M', d: tg.d12 },
          ].map(({ label, d }) => {
            const dl = daysLeft(d)
            const ds = dateStatus(d)
            const color = ds === 'past' ? '#f85149' : ds === 'soon' ? '#d29922' : ds === 'now' ? '#3fb950' : '#484f58'
            return (
              <span key={label} style={{ marginRight: 24, color }}>
                {label} → {formatDate(d)}{' '}
                <span style={{ opacity: 0.7 }}>({dl >= 0 ? '+' : ''}{dl}d)</span>
                {ds === 'past' && <MiniTag bg="#2a1515" color="#f85149">expired</MiniTag>}
                {ds === 'soon' && <MiniTag bg="#2d2208" color="#d29922">soon</MiniTag>}
                {ds === 'now'  && <MiniTag bg="#1a3a1a" color="#3fb950">now</MiniTag>}
              </span>
            )
          })}
        </div>
      )}

      {/* Banner: expired */}
      {activeStatus === 'past' && (
        <div style={{ ...styles.banner, border: '1px solid #3d1515', background: '#1a0a0a', color: '#f85149' }}>
          <span style={styles.bannerIcon}>⚠</span>
          <div>
            <strong>This horizon expired {Math.abs(activeDl)} days ago</strong>
            {' '}({formatDate(activeDate)}).
            {' '}You are seeing the <em>current price</em> vs the target —
            not the price on the target date.
            <span style={{ color: '#58a6ff', marginLeft: 4 }}>Historical price check coming in next version.</span>
          </div>
        </div>
      )}

      {/* Banner: soon */}
      {activeStatus === 'soon' && (
        <div style={{ ...styles.banner, border: '1px solid #3d2d00', background: '#1a1200', color: '#d29922' }}>
          <span style={styles.bannerIcon}>⏰</span>
          <div>
            <strong>Target date approaching</strong> — {formatDate(activeDate)} ({activeDl} days left).
          </div>
        </div>
      )}

      {/* Banner: now */}
      {activeStatus === 'now' && (
        <div style={{ ...styles.banner, border: '1px solid #1a4a2e', background: '#0a1a0a', color: '#3fb950' }}>
          <span style={styles.bannerIcon}>🎯</span>
          <div>
            <strong>Target date is today or this week!</strong> ({formatDate(activeDate)})
            {' '}— check if the price has reached its forecast.
          </div>
        </div>
      )}
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Dot({ color }) {
  return (
    <span style={{
      display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
      background: color, marginLeft: 5, verticalAlign: 'middle', flexShrink: 0,
    }} />
  )
}

function MiniTag({ bg, color, children }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 9, padding: '1px 4px',
      borderRadius: 6, marginLeft: 4, verticalAlign: 'middle',
      background: bg, color, fontWeight: 600,
    }}>
      {children}
    </span>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

// Base tab style — always uses border shorthand, never borderColor
const base_tab = {
  display:     'inline-flex',
  alignItems:  'center',
  fontSize:    11,
  padding:     '4px 12px',
  borderRadius: 20,
  border:      '1px solid #30363d',   // shorthand only
  cursor:      'pointer',
  color:       '#8b949e',
  background:  'transparent',
  fontFamily:  'inherit',
}

const styles = {
  tabs:       { display: 'flex', gap: 4, marginBottom: '0.5rem', flexWrap: 'wrap', alignItems: 'center' },
  dates:      { display: 'flex', flexWrap: 'wrap', fontSize: 10, marginBottom: '0.9rem', fontFamily: 'monospace' },
  banner:     { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, marginBottom: '0.75rem', fontSize: 12, lineHeight: 1.6 },
  bannerIcon: { fontSize: 14, flexShrink: 0, marginTop: 1 },
}
