import { formatDate, targetDates, daysLeft, dateStatus } from '../utils/dates.js'

const HORIZONS = ['best', '1M', '3M', '6M', '12M']

// Map horizon label to targetDates key
const HORIZON_KEY = { '1M': 'd1', '3M': 'd3', '6M': 'd6', '12M': 'd12' }

export default function HorizonTabs({ horizon, stocks, onHorizonChange }) {
  const base = stocks.find(s => s.base)?.base
  const tg   = base ? targetDates(base) : null

  // Compute status for each horizon tab
  function tabStatus(h) {
    if (h === 'best' || !tg) return null
    return dateStatus(tg[HORIZON_KEY[h]])
  }

  // Active horizon expiry info for banner
  const activeDate   = horizon !== 'best' && tg ? tg[HORIZON_KEY[horizon]] : null
  const activeDl     = activeDate ? daysLeft(activeDate) : null
  const activeStatus = activeDate ? dateStatus(activeDate) : null

  return (
    <>
      {/* Tab row */}
      <div style={s.tabs}>
        {HORIZONS.map(h => {
          const ts      = tabStatus(h)
          const isActive = horizon === h
          return (
            <button
              key={h}
              style={{
                ...s.tab,
                ...(isActive ? s.active : {}),
                // Expired tab: red border when not active
                ...(!isActive && ts === 'past' ? s.tabExpired : {}),
                // Soon tab: amber border when not active
                ...(!isActive && ts === 'soon' ? s.tabSoon : {}),
              }}
              onClick={() => onHorizonChange(h)}
            >
              {h === 'best' ? 'Best target' : h}
              {/* Small dot indicator for non-active tabs */}
              {!isActive && ts === 'past' && <Dot color="#f85149" />}
              {!isActive && ts === 'soon' && <Dot color="#d29922" />}
              {!isActive && ts === 'now'  && <Dot color="#3fb950" />}
            </button>
          )
        })}
      </div>

      {/* Date reference bar */}
      {tg && (
        <div style={s.dates}>
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
                {ds === 'past' && <span style={s.miniTag('#2a1515', '#f85149')}>expired</span>}
                {ds === 'soon' && <span style={s.miniTag('#2d2208', '#d29922')}>soon</span>}
                {ds === 'now'  && <span style={s.miniTag('#1a3a1a', '#3fb950')}>now</span>}
              </span>
            )
          })}
        </div>
      )}

      {/* Banner: active horizon is expired */}
      {activeStatus === 'past' && (
        <div style={s.bannerExpired}>
          <span style={s.bannerIcon}>⚠</span>
          <div>
            <strong>This horizon expired {Math.abs(activeDl)} days ago</strong>
            {' '}({formatDate(activeDate)}).
            {' '}You are seeing the <em>current price</em> vs the target —
            not the price on the target date.
            <span style={s.bannerHint}> Opción B (historical price) coming soon.</span>
          </div>
        </div>
      )}

      {/* Banner: active horizon is coming soon */}
      {activeStatus === 'soon' && (
        <div style={s.bannerSoon}>
          <span style={s.bannerIcon}>⏰</span>
          <div>
            <strong>Target date approaching</strong> — {formatDate(activeDate)} ({activeDl} days left).
          </div>
        </div>
      )}

      {/* Banner: active horizon is today */}
      {activeStatus === 'now' && (
        <div style={s.bannerNow}>
          <span style={s.bannerIcon}>🎯</span>
          <div>
            <strong>Target date is today or this week!</strong> ({formatDate(activeDate)})
            — check if the price has reached its forecast.
          </div>
        </div>
      )}
    </>
  )
}

function Dot({ color }) {
  return (
    <span style={{
      display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
      background: color, marginLeft: 5, verticalAlign: 'middle', flexShrink: 0,
    }} />
  )
}

const s = {
  tabs: { display: 'flex', gap: 4, marginBottom: '0.5rem', flexWrap: 'wrap', alignItems: 'center' },

  tab: {
    display: 'inline-flex', alignItems: 'center',
    fontSize: 11, padding: '4px 12px', borderRadius: 20,
    border: '1px solid #30363d', cursor: 'pointer',
    color: '#8b949e', background: 'transparent', fontFamily: 'inherit',
  },
  active:      { background: '#0d2136', borderColor: '#1f6feb', color: '#58a6ff' },
  tabExpired:  { borderColor: '#3d1515', color: '#f85149' },
  tabSoon:     { borderColor: '#3d2d00', color: '#d29922' },

  dates: {
    display: 'flex', flexWrap: 'wrap',
    fontSize: 10, marginBottom: '0.9rem', fontFamily: 'monospace',
  },

  miniTag: (bg, color) => ({
    display: 'inline-block', fontSize: 9, padding: '1px 4px',
    borderRadius: 6, marginLeft: 4, verticalAlign: 'middle',
    background: bg, color, fontWeight: 600,
  }),

  // Banners
  bannerBase: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '10px 14px', borderRadius: 8,
    marginBottom: '0.75rem', fontSize: 12, lineHeight: 1.6,
  },
  bannerIcon: { fontSize: 14, flexShrink: 0, marginTop: 1 },
  bannerHint: { color: '#58a6ff', marginLeft: 4 },

  get bannerExpired() {
    return { ...this.bannerBase, border: '1px solid #3d1515', background: '#1a0a0a', color: '#f85149' }
  },
  get bannerSoon() {
    return { ...this.bannerBase, border: '1px solid #3d2d00', background: '#1a1200', color: '#d29922' }
  },
  get bannerNow() {
    return { ...this.bannerBase, border: '1px solid #1a4a2e', background: '#0a1a0a', color: '#3fb950' }
  },
}
