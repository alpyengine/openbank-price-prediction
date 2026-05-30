/**
 * HorizonTabs
 *
 * Tab selector for switching between prediction horizons:
 *   All | Best target | 1M | 3M | 6M | 12M
 *
 * Shows the target date for each horizon below the tabs, with
 * color-coded status (expired / soon / now) and day countdown.
 *
 * Also shows status banners when a horizon is expired, approaching,
 * or matches today's date.
 *
 * @param {string}   horizon          — currently selected horizon key
 * @param {Object[]} stocks           — stock array (used to read base date)
 * @param {Function} onHorizonChange  — called when user clicks a tab
 */
import { formatDate, targetDates, daysLeft, dateStatus } from '@/utils/dates.js'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const HORIZONS    = ['all', 'best', '1M', '3M', '6M', '12M']
const HORIZON_KEY = { '1M': 'd1', '3M': 'd3', '6M': 'd6', '12M': 'd12' }
const LABELS      = { all: 'All', best: 'Best target' }

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * Tag — small inline pill label (expired / soon / now).
 * Uses Tailwind classes directly since it's only used here.
 */
function Tag({ variant, children }) {
  const styles = {
    expired: 'bg-red-50 text-red-600',
    soon:    'bg-amber-50 text-amber-600',
    now:     'bg-green-50 text-green-600',
  }
  return (
    <span className={cn(
      'inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ml-1 align-middle',
      styles[variant]
    )}>
      {children}
    </span>
  )
}

/**
 * Banner — full-width status alert below the tab row.
 * Shown when the active horizon is expired, approaching, or today.
 */
function Banner({ variant, children }) {
  const styles = {
    expired: 'border-red-200 bg-red-50 text-red-800',
    soon:    'border-amber-200 bg-amber-50 text-amber-800',
    now:     'border-green-200 bg-green-50 text-green-800',
  }
  return (
    <div className={cn(
      'flex items-start gap-2 px-3.5 py-2.5 rounded-lg mb-2.5 text-sm leading-relaxed border',
      styles[variant]
    )}>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HorizonTabs({ horizon, stocks, onHorizonChange }) {
  // Derive target dates from the first stock that has a base date
  const base = stocks.find(s => s.base)?.base
  const tg   = base ? targetDates(base) : null

  /** Returns the dateStatus for a given horizon tab ('past'|'soon'|'now'|null) */
  function tabStatus(h) {
    if (h === 'best' || h === 'all' || !tg) return null
    return dateStatus(tg[HORIZON_KEY[h]])
  }

  // Active horizon date info for the status banner
  const activeDate   = horizon !== 'best' && horizon !== 'all' && tg ? tg[HORIZON_KEY[horizon]] : null
  const activeDl     = activeDate ? daysLeft(activeDate) : null
  const activeStatus = activeDate ? dateStatus(activeDate) : null

  return (
    <div className="mb-5">
      {/* ── Tab buttons ──────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 mb-2 flex-wrap items-center">
        {HORIZONS.map(h => {
          const isActive = horizon === h
          const ts       = tabStatus(h)

          // Status dot color for inactive tabs (indicates expiry state)
          const dotColor = ts === 'past' ? 'bg-red-500'
            : ts === 'soon'              ? 'bg-amber-500'
            : ts === 'now'               ? 'bg-green-500'
            : null

          return (
            <Button
              key={h}
              variant={isActive ? (h === 'all' ? 'default' : 'outline') : 'ghost'}
              size="sm"
              onClick={() => onHorizonChange(h)}
              className={cn(
                'rounded-full px-3.5 h-7 text-[13px] font-semibold',
                isActive && h !== 'all' && 'border-primary text-foreground',
                !isActive && 'text-muted-foreground'
              )}
            >
              {LABELS[h] ?? h}
              {/* Status dot — only shown on inactive tabs */}
              {!isActive && dotColor && (
                <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 ml-0.5', dotColor)} />
              )}
            </Button>
          )
        })}
      </div>

      {/* ── Horizon date row ─────────────────────────────────────────────── */}
      {tg && (
        <div className="flex flex-wrap gap-4 text-[11px] mb-1.5 text-muted-foreground font-mono">
          {([['1M', tg.d1], ['3M', tg.d3], ['6M', tg.d6], ['12M', tg.d12]]).map(([label, d]) => {
            const dl = daysLeft(d)
            const ds = dateStatus(d)
            const color = ds === 'past' ? 'text-red-600'
              : ds === 'soon'           ? 'text-amber-600'
              : ds === 'now'            ? 'text-green-600'
              : 'text-muted-foreground'
            return (
              <span key={label} className={color}>
                {label} → {formatDate(d)} ({dl >= 0 ? '+' : ''}{dl}d)
                {ds === 'past' && <Tag variant="expired">expired</Tag>}
                {ds === 'soon' && <Tag variant="soon">soon</Tag>}
                {ds === 'now'  && <Tag variant="now">now</Tag>}
              </span>
            )
          })}
        </div>
      )}

      {/* ── Status banners ───────────────────────────────────────────────── */}
      {activeStatus === 'past' && (
        <Banner variant="expired">
          <strong>Horizon expired {Math.abs(activeDl)} days ago</strong>
          {' '}({formatDate(activeDate)}) — prices shown are closing price on target date.
        </Banner>
      )}
      {activeStatus === 'soon' && (
        <Banner variant="soon">
          <strong>Target date approaching</strong> — {formatDate(activeDate)} ({activeDl} days left).
        </Banner>
      )}
      {activeStatus === 'now' && (
        <Banner variant="now">
          <strong>Target date is today or this week!</strong> ({formatDate(activeDate)})
        </Banner>
      )}
    </div>
  )
}
