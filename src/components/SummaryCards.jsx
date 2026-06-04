/**
 * SummaryCards
 *
 * Displays KPI boxes at the top of Batch Overview Detail page.
 *
 * Layout (v7.3.1+):
 *   Row 1 — 6 boxes: Stocks | Hit | Exceeded | Close | Miss | Awaiting
 *   Row 2 — 2 accuracy boxes: Hit Rate pure % | Hit Rate extended %
 *
 * Verdict system (v7.3.0+):
 *   exceeded  — surpassed target in correct direction (blue)
 *   hit       — within ±H% of target (green)
 *   close     — between −H% and −(H×closeRatio)% of target (amber)
 *   miss      — more than −(H×closeRatio)% below target (red)
 *   wrong_way — moved in opposite direction to forecast (purple)
 *
 * Two evaluation modes:
 *   SummaryCards always uses LIVE mode (hitMargin + closeRatio from slider)
 *   Supabase snapshot uses SNAPSHOT_PARAMS (fixed per horizon, in useHistory)
 *
 * @param {Object[]} stocks         — array of stock objects from CSV
 * @param {string}   horizon        — '1M'|'3M'|'6M'|'12M'|'all'|'best'
 * @param {Object}   autoPrices     — current prices { [ticker]: price }
 * @param {Object}   histPrices     — historical prices { [ticker_horizon]: { price } }
 * @param {Object}   overrides      — manual price overrides { [ticker]: price }
 * @param {boolean}  horizonExpired — whether selected horizon's target date has passed
 * @param {number}   hitMargin      — hit tolerance % (default 5, from slider)
 * @param {number}   closeRatio     — close zone multiplier (default 2.4, from field)
 */
import { getTarget, getEffectivePrice, evaluatePrediction, CLOSE_RATIO_DEFAULT } from '@/utils/stocks.js'
import { targetDates, dateStatus } from '@/utils/dates.js'
import { LayoutGrid, Target, TrendingUp, CheckCircle, XCircle, Clock, Percent } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_HORIZONS = ['1M', '3M', '6M', '12M']

/** Maps horizon label to targetDates() key */
const HKEYS = { '1M': 'd1', '3M': 'd3', '6M': 'd6', '12M': 'd12' }

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true if the given horizon's target date has already passed.
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
 */
function fmtAvg(avg) {
  if (avg == null) return null
  const sign = avg >= 0 ? '+' : ''
  return `avg ${sign}${avg.toFixed(1)}%`
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

/**
 * SummaryCard — individual KPI box.
 * Uses shadcn Card with conditional color classes via cn().
 *
 * @param {string}    label   — box title
 * @param {number}    value   — count to display
 * @param {string}    verdict — drives color scheme
 * @param {Component} icon    — lucide icon
 * @param {string}    sub     — sub-label below the number
 */
function SummaryCard({ label, value, verdict, icon: Icon, sub }) {
  // Color palette per verdict
  const colors = {
    hit:       { num: 'text-green-700',  iconBg: 'bg-green-50',   iconColor: 'text-green-700',         sub: 'text-green-600'  },
    exceeded:  { num: 'text-blue-700',   iconBg: 'bg-blue-50',    iconColor: 'text-blue-700',          sub: 'text-blue-600'   },
    close:     { num: 'text-amber-700',  iconBg: 'bg-amber-50',   iconColor: 'text-amber-700',         sub: 'text-amber-600'  },
    miss:      { num: 'text-red-700',    iconBg: 'bg-red-50',     iconColor: 'text-red-700',           sub: 'text-red-600'    },
    wrong_way: { num: 'text-purple-700', iconBg: 'bg-purple-50',  iconColor: 'text-purple-700',        sub: 'text-purple-600' },
    awaiting:  { num: 'text-foreground', iconBg: 'bg-muted',      iconColor: 'text-muted-foreground',  sub: 'text-muted-foreground' },
    total:     { num: 'text-foreground', iconBg: 'bg-muted',      iconColor: 'text-muted-foreground',  sub: 'text-muted-foreground' },
  }

  const c        = colors[verdict] ?? colors.total
  const hasValue = value > 0
  const numColor = (hasValue && verdict && verdict !== 'awaiting') ? c.num : 'text-foreground'
  const subColor = (hasValue && verdict) ? c.sub : 'text-muted-foreground'

  return (
    <Card className="flex flex-col gap-1">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-[12px] font-medium text-muted-foreground leading-tight">{label}</span>
          {Icon && (
            <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', hasValue ? c.iconBg : 'bg-muted')}>
              <Icon size={13} className={hasValue ? c.iconColor : 'text-muted-foreground'} />
            </div>
          )}
        </div>
        <div className={cn('text-3xl font-bold leading-none', numColor)}>{value}</div>
        {sub && (
          <div className={cn('text-[11px] font-medium mt-1.5 leading-tight', subColor)}>{sub}</div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Accuracy Card ─────────────────────────────────────────────────────────────

/**
 * AccuracyCard — larger box showing hit rate as a percentage.
 * Used for the two accuracy boxes in Row 2.
 *
 * @param {string} label    — title
 * @param {number} count    — number of successes
 * @param {number} total    — number evaluated
 * @param {string} sublabel — description below count
 * @param {string} variant  — 'pure' (green) | 'extended' (purple)
 */
function AccuracyCard({ label, count, total, sublabel, variant }) {
  const pct = total > 0 ? Math.round(count / total * 100) : 0

  const styles = {
    pure:     { pct: 'text-green-700',  countColor: 'text-green-700',  iconBg: 'bg-green-50',  iconColor: 'text-green-700'  },
    extended: { pct: 'text-purple-700', countColor: 'text-purple-700', iconBg: 'bg-purple-50', iconColor: 'text-purple-700' },
  }
  const s = styles[variant] ?? styles.pure

  return (
    <Card>
      <CardContent className="py-3 px-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className={cn('w-5 h-5 rounded flex items-center justify-center', s.iconBg)}>
              <Percent size={11} className={s.iconColor} />
            </div>
            <span className="text-[12px] font-semibold text-muted-foreground">{label}</span>
          </div>
          <div className={cn('text-xl font-bold leading-none', s.countColor)}>{count} successes</div>
          <div className="text-[11px] text-muted-foreground mt-1">{sublabel}</div>
        </div>
        <div className="text-right">
          <div className={cn('text-4xl font-bold leading-none', s.pct)}>{pct}%</div>
          <div className="text-[11px] text-muted-foreground mt-1">{count} of {total} evaluated</div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SummaryCards({
  stocks, horizon, autoPrices, histPrices, overrides,
  horizonExpired, hitMargin = 5, closeRatio = CLOSE_RATIO_DEFAULT,
}) {
  // Accumulate verdict counts and distance sums for averages
  let hits = 0, exceeded = 0, close = 0, miss = 0, wrongWay = 0, awaiting = 0
  let hitDist = 0, excDist = 0, closeDist = 0, missDist = 0

  const isAll = horizon === 'all'

  // Evaluation options for live mode (uses slider values, not snapshot)
  const evalOpts = { closeRatio }

  if (isAll) {
    // Aggregate across all 4 horizons — each with its own expiry check
    for (const stock of stocks) {
      for (const h of ALL_HORIZONS) {
        const expired = isHorizonExpired(stock, h)
        if (!expired) { awaiting++; continue }

        const { price: p } = getEffectivePrice(stock.t, h, autoPrices, histPrices, overrides, expired)
        if (!p) { awaiting++; continue }

        const tgt = getTarget(stock, h)
        const { verdict } = evaluatePrediction(p, tgt, stock.b, hitMargin, evalOpts)
        const d = tgt ? (p - tgt) / tgt * 100 : 0

        if      (verdict === 'hit')       { hits++;     hitDist   += d }
        else if (verdict === 'exceeded')  { exceeded++; excDist   += d }
        else if (verdict === 'close')     { close++;    closeDist += d }
        else if (verdict === 'wrong_way') { wrongWay++ }
        else if (verdict === 'miss')      { miss++;     missDist  += d }
        else                              { awaiting++ }
      }
    }
  } else {
    // Single horizon — use horizonExpired for all stocks
    for (const stock of stocks) {
      if (!horizonExpired) { awaiting++; continue }

      const { price: p } = getEffectivePrice(stock.t, horizon, autoPrices, histPrices, overrides, horizonExpired)
      if (!p) { awaiting++; continue }

      const tgt = getTarget(stock, horizon)
      const { verdict } = evaluatePrediction(p, tgt, stock.b, hitMargin, evalOpts)
      const d = tgt ? (p - tgt) / tgt * 100 : 0

      if      (verdict === 'hit')       { hits++;     hitDist   += d }
      else if (verdict === 'exceeded')  { exceeded++; excDist   += d }
      else if (verdict === 'close')     { close++;    closeDist += d }
      else if (verdict === 'wrong_way') { wrongWay++ }
      else if (verdict === 'miss')      { miss++;     missDist  += d }
      else                              { awaiting++ }
    }
  }

  // Averages — null when count is zero
  const avgHit  = hits     ? hitDist   / hits     : null
  const avgExc  = exceeded ? excDist   / exceeded : null
  const avgClose = close   ? closeDist / close    : null
  const avgMiss  = miss    ? missDist  / miss     : null

  // Total evaluated (excludes awaiting and wrong_way from accuracy calculation)
  const evaluated = hits + exceeded + close + miss + wrongWay

  // Price label for sub-text
  const priceLabel = (!isAll && horizonExpired && horizon !== 'best') ? 'historical price' : "today's price"

  // Dynamic zone label showing calculated thresholds
  const closeThreshold = +(hitMargin * closeRatio).toFixed(1)
  const closeLabel = `−${hitMargin}% to −${closeThreshold}%`
  const missLabel  = `below −${closeThreshold}%`

  return (
    <div className="flex flex-col gap-3 mb-6">

      {/* ── Row 1 — 6 KPI boxes ─────────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-3">

        {/* Total stocks */}
        <SummaryCard
          label="Total stocks"
          value={stocks.length}
          icon={LayoutGrid}
          sub={stocks.length
            ? isAll
              ? `${stocks.length * 4} predictions (4×${stocks.length})`
              : `${stocks.length} predictions tracked`
            : 'Import a CSV to start'
          }
        />

        {/* Hit — within ±H% of target */}
        <SummaryCard
          label={`Hit  ±${hitMargin}%`}
          value={hits}
          verdict="hit"
          icon={Target}
          sub={hits ? `${fmtAvg(avgHit)} · ${priceLabel}` : 'None in hit zone yet'}
        />

        {/* Exceeded — surpassed target in correct direction */}
        <SummaryCard
          label={`Exceeded  >+${hitMargin}%`}
          value={exceeded}
          verdict="exceeded"
          icon={TrendingUp}
          sub={exceeded ? `${fmtAvg(avgExc)} · above target` : 'None exceeded yet'}
        />

        {/* Close — nearly reached target */}
        <SummaryCard
          label={`Close  ${closeLabel}`}
          value={close}
          verdict="close"
          icon={CheckCircle}
          sub={close ? `${fmtAvg(avgClose)} · ${priceLabel}` : `None in close zone`}
        />

        {/* Miss — didn't reach target */}
        <SummaryCard
          label={`Miss  ${missLabel}`}
          value={miss}
          verdict="miss"
          icon={XCircle}
          sub={miss ? `${fmtAvg(avgMiss)} · ${priceLabel}` : 'No misses yet'}
        />

        {/* Awaiting — horizon not yet due */}
        <SummaryCard
          label="Awaiting"
          value={awaiting}
          verdict="awaiting"
          icon={Clock}
          sub={awaiting
            ? (isAll ? 'horizons pending maturity' : 'Horizon not yet due')
            : 'All horizons evaluated'
          }
        />
      </div>

      {/* ── Row 2 — 2 accuracy boxes ────────────────────────────────── */}
      {evaluated > 0 && (
        <div className="grid grid-cols-2 gap-3">

          {/* Hit Rate pure — only strict hits within ±H% */}
          <AccuracyCard
            label="Hit Rate — pure"
            count={hits}
            total={evaluated}
            sublabel={`Within ±${hitMargin}% · strict accuracy`}
            variant="pure"
          />

          {/* Hit Rate extended — hits + exceeded (surpassed target) */}
          <AccuracyCard
            label="Hit Rate — extended"
            count={hits + exceeded}
            total={evaluated}
            sublabel={`${hits} hit + ${exceeded} exceeded · full accuracy`}
            variant="extended"
          />
        </div>
      )}
    </div>
  )
}
