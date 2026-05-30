/**
 * SummaryCards
 *
 * Displays 5 KPI boxes at the top of the Batch Overview Detail page:
 *   Total stocks | Hit target | Close (±N%) | Miss | Awaiting
 *
 * Each box shows the count and average distance to target (±%).
 * Colors follow the unified verdict system used throughout the app:
 *   Hit → green · Close → amber · Miss → red · Awaiting → neutral
 *
 * All evaluations use evaluatePrediction() as single source of truth.
 *
 * @param {Object[]} stocks         — array of stock objects from CSV
 * @param {string}   horizon        — selected horizon: '1M'|'3M'|'6M'|'12M'|'all'|'best'
 * @param {Object}   autoPrices     — current prices { [ticker]: price }
 * @param {Object}   histPrices     — historical prices { [ticker_horizon]: { price } }
 * @param {Object}   overrides      — manual price overrides { [ticker]: price }
 * @param {boolean}  horizonExpired — whether the selected horizon's target date has passed
 * @param {number}   hitMargin      — hit tolerance in % (default 5)
 */
import { getTarget, getEffectivePrice, evaluatePrediction } from '@/utils/stocks.js'
import { targetDates, dateStatus } from '@/utils/dates.js'
import { LayoutGrid, Target, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_HORIZONS = ['1M', '3M', '6M', '12M']

/** Maps horizon label to targetDates() key */
const HKEYS = { '1M': 'd1', '3M': 'd3', '6M': 'd6', '12M': 'd12' }

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true if the given horizon's target date has already passed.
 * Used to determine whether a prediction should be counted as 'awaiting'.
 */
function isHorizonExpired(stock, h) {
  if (!stock.base) return false
  const tg  = targetDates(stock.base)
  const key = HKEYS[h]
  const d   = key ? tg[key] : null
  return d ? dateStatus(d) === 'past' : false
}

/**
 * Formats an average distance value as a signed percentage string.
 * Returns null if avg is null (used to hide the sub-label).
 */
function fmtAvg(avg) {
  if (avg == null) return null
  const sign = avg >= 0 ? '+' : ''
  return `avg ${sign}${avg.toFixed(1)}%`
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

/**
 * SummaryCard — individual KPI box.
 * Uses shadcn Card with conditional color classes via cn().
 *
 * @param {string}    label      — box title
 * @param {number}    value      — the count to display
 * @param {string}    verdict    — 'hit'|'close'|'miss'|'awaiting'|null (drives colors)
 * @param {Component} icon       — lucide icon component
 * @param {string}    sub        — sub-label text below the number
 */
function SummaryCard({ label, value, verdict, icon: Icon, sub }) {
  // Color config per verdict — drives number, icon bg, icon color, and sub-label
  const colors = {
    hit:      { num: 'text-green-700',  iconBg: 'bg-green-50',  iconColor: 'text-green-700',  sub: 'text-green-600' },
    close:    { num: 'text-amber-700',  iconBg: 'bg-amber-50',  iconColor: 'text-amber-700',  sub: 'text-amber-600' },
    miss:     { num: 'text-red-700',    iconBg: 'bg-red-50',    iconColor: 'text-red-700',    sub: 'text-red-600' },
    awaiting: { num: 'text-foreground', iconBg: 'bg-muted',     iconColor: 'text-muted-foreground', sub: 'text-muted-foreground' },
    total:    { num: 'text-foreground', iconBg: 'bg-muted',     iconColor: 'text-muted-foreground', sub: 'text-muted-foreground' },
  }

  // Fall back to 'total' style for boxes with no verdict (e.g. Total stocks)
  const c = colors[verdict] ?? colors.total

  // Only apply verdict colors when the count is non-zero
  const hasValue  = value > 0
  const numColor  = (hasValue && verdict && verdict !== 'awaiting') ? c.num : 'text-foreground'
  const subColor  = (hasValue && verdict) ? c.sub : 'text-muted-foreground'

  return (
    <Card className="flex flex-col gap-1">
      <CardContent className="pt-5 pb-4 px-5">
        {/* Header row: label + icon */}
        <div className="flex items-start justify-between mb-2">
          <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
          {Icon && (
            <div className={cn('w-7 h-7 rounded-md flex items-center justify-center', hasValue ? c.iconBg : 'bg-muted')}>
              <Icon size={14} className={hasValue ? c.iconColor : 'text-muted-foreground'} />
            </div>
          )}
        </div>

        {/* Count */}
        <div className={cn('text-3xl font-bold leading-none', numColor)}>{value}</div>

        {/* Sub-label */}
        {sub && (
          <div className={cn('text-xs font-medium mt-1.5', subColor)}>{sub}</div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SummaryCards({
  stocks, horizon, autoPrices, histPrices, overrides, horizonExpired, hitMargin = 5,
}) {
  // Accumulate counts and distances per verdict
  let hits = 0, close = 0, miss = 0, awaiting = 0
  let hitDist = 0, closeDist = 0, missDist = 0

  const isAll = horizon === 'all'

  if (isAll) {
    // Aggregate across all 4 horizons
    for (const stock of stocks) {
      for (const h of ALL_HORIZONS) {
        const expired = isHorizonExpired(stock, h)
        if (!expired) { awaiting++; continue }
        const { price: p } = getEffectivePrice(stock.t, h, autoPrices, histPrices, overrides, expired)
        if (!p) { awaiting++; continue }
        const tgt = getTarget(stock, h)
        const { verdict } = evaluatePrediction(p, tgt, stock.b, hitMargin)
        const d = tgt ? (p - tgt) / tgt * 100 : 0
        if (verdict === 'hit')        { hits++;  hitDist  += d }
        else if (verdict === 'close') { close++; closeDist += d }
        else                          { miss++;  missDist  += d }
      }
    }
  } else {
    // Single horizon
    for (const stock of stocks) {
      if (!horizonExpired) { awaiting++; continue }
      const { price: p } = getEffectivePrice(stock.t, horizon, autoPrices, histPrices, overrides, horizonExpired)
      if (!p) { awaiting++; continue }
      const tgt = getTarget(stock, horizon)
      const { verdict } = evaluatePrediction(p, tgt, stock.b, hitMargin)
      const d = tgt ? (p - tgt) / tgt * 100 : 0
      if (verdict === 'hit')        { hits++;  hitDist  += d }
      else if (verdict === 'close') { close++; closeDist += d }
      else                          { miss++;  missDist  += d }
    }
  }

  // Averages — null when count is zero
  const avgHit   = hits  ? hitDist  / hits  : null
  const avgClose = close ? closeDist / close : null
  const avgMiss  = miss  ? missDist  / miss  : null

  const totalPreds = isAll ? stocks.length * 4 : stocks.length
  const priceLabel = (!isAll && horizonExpired && horizon !== 'best') ? 'historical price' : "today's price"

  return (
    <div className="grid grid-cols-5 gap-3 mb-6">
      <SummaryCard
        label="Total stocks"
        value={stocks.length}
        icon={LayoutGrid}
        sub={stocks.length
          ? isAll
            ? `${totalPreds} predictions (4×${stocks.length})`
            : `${stocks.length} predictions tracked`
          : 'Import a CSV to start'
        }
      />
      <SummaryCard
        label="Hit target"
        value={hits}
        verdict="hit"
        icon={Target}
        sub={hits ? `${fmtAvg(avgHit)} · ${priceLabel}` : 'None reached target yet'}
      />
      <SummaryCard
        label={`Close (±${hitMargin}%)`}
        value={close}
        verdict="close"
        icon={CheckCircle}
        sub={close ? `${fmtAvg(avgClose)} · ${priceLabel}` : `None within ${hitMargin}%`}
      />
      <SummaryCard
        label="Miss"
        value={miss}
        verdict="miss"
        icon={XCircle}
        sub={miss ? `${fmtAvg(avgMiss)} · ${priceLabel}` : 'No misses yet'}
      />
      <SummaryCard
        label="Awaiting"
        value={awaiting}
        verdict="awaiting"
        icon={Clock}
        sub={awaiting
          ? (isAll ? 'horizons pending maturity' : 'Horizons not yet due')
          : 'All horizons evaluated'
        }
      />
    </div>
  )
}
