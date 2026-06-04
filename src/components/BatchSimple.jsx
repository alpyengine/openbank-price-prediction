/**
 * BatchSimple
 *
 * Batch Overview page — simple table showing prediction status per horizon.
 * One row per stock, one column per horizon (1M / 3M / 6M / 12M).
 *
 * Each cell shows:
 *   - ⏳ Pending (days left) — horizon not yet expired
 *   - ✅ Hit (+X%) — price reached target on expiry date
 *   - ❌ Miss (X%) — price did not reach target
 *   - Expired · no price — horizon expired but no price available
 *
 * @param {Object[]} stocks     — array of stock objects
 * @param {Object}   autoPrices — current prices { [ticker]: price }
 * @param {Object}   histPrices — historical prices { [ticker_horizon]: { price } }
 * @param {Object}   overrides  — manual price overrides
 * @param {number}   hitMargin  — hit tolerance in % (default 5)
 */
import { useMemo } from 'react'
import { targetDates, daysLeft, dateStatus, formatDate } from '@/utils/dates.js'
import { getEffectivePrice, evaluatePrediction } from '@/utils/stocks.js'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const HORIZONS = [
  { key: '1M',  label: '1 Month',   tKey: 't1',  dKey: 'd1' },
  { key: '3M',  label: '3 Months',  tKey: 't3',  dKey: 'd3' },
  { key: '6M',  label: '6 Months',  tKey: 't6',  dKey: 'd6' },
  { key: '12M', label: '12 Months', tKey: 't12', dKey: 'd12' },
]

// ── HorizonCell ───────────────────────────────────────────────────────────────

/**
/**
 * HorizonCell
 *
 * Renders a single verdict cell for one stock × one horizon combination.
 * Determines expiry state, fetches the effective price, and shows the verdict.
 *
 * Verdict colours (v7.3.2+):
 *   exceeded  — blue  🔵
 *   hit       — green ✅
 *   close     — amber 🟡
 *   miss      — red   ❌
 *   wrong_way — purple 🟣
 */
function HorizonCell({ stock, horizonKey, tKey, dKey, autoPrices, histPrices, overrides, hitMargin, closeRatio }) {
  const target  = stock[tKey]
  const tg      = stock.base ? targetDates(stock.base) : null
  const date    = tg ? tg[dKey] : null
  const dl      = date ? daysLeft(date) : null
  const ds      = date ? dateStatus(date) : null
  const expired = ds === 'past'

  const { price } = getEffectivePrice(stock.t, horizonKey, autoPrices, histPrices, overrides, expired)

  // No target defined for this horizon
  if (!target) {
    return <TableCell><span className="text-muted-foreground text-xs">--</span></TableCell>
  }

  // Horizon not yet expired — show days remaining
  if (!expired) {
    const daysText = dl != null
      ? dl <= 0  ? 'Today'
      : dl === 1 ? '1 day left'
      : `${dl} days left`
      : '--'

    return (
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <Badge variant="secondary" className="w-fit text-[11px]">⏳ Pending</Badge>
          <span className="text-[11px] text-muted-foreground">{daysText}</span>
        </div>
      </TableCell>
    )
  }

  // Expired but no price available
  if (!price) {
    return (
      <TableCell>
        <Badge variant="secondary" className="text-[11px]">⏳ Expired · no price</Badge>
      </TableCell>
    )
  }

  // Evaluate verdict — live mode with slider values
  const { verdict } = evaluatePrediction(price, target, stock.b, hitMargin, { closeRatio })
  const distPct = (price - target) / target * 100
  const pctStr  = `${distPct >= 0 ? '+' : ''}${distPct.toFixed(1)}%`

  // Verdict badge config — label, emoji, colors
  const BADGE_CONFIG = {
    exceeded:  { emoji: '🔵', label: 'Exceeded', bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
    hit:       { emoji: '✅', label: 'Hit',       bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  },
    close:     { emoji: '🟡', label: 'Close',     bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
    miss:      { emoji: '❌', label: 'Miss',      bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'    },
    wrong_way: { emoji: '🟣', label: 'Wrong way', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  }

  const cfg = BADGE_CONFIG[verdict] ?? BADGE_CONFIG.miss

  return (
    <TableCell>
      <div className="flex flex-col gap-0.5">
        <Badge
          className={`w-fit text-[11px] ${cfg.bg} ${cfg.text} ${cfg.border} hover:${cfg.bg}`}
        >
          {cfg.emoji} {cfg.label} ({pctStr})
        </Badge>
        <span className="text-[11px] text-muted-foreground">{formatDate(date)}</span>
      </div>
    </TableCell>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BatchSimple({ stocks, autoPrices, histPrices, overrides, hitMargin = 5, closeRatio = 2.4 }) {
  if (!stocks.length) {
    return (
      <Card className="flex items-center justify-center p-12 text-muted-foreground text-sm">
        No stocks loaded — import a CSV to get started
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <CardHeader className="py-3.5 px-4 border-b border-border space-y-0.5">
        <div className="text-[15px] font-bold">Batch Overview</div>
        <div className="text-xs text-muted-foreground">
          Prediction status per horizon — {stocks.length} stock{stocks.length > 1 ? 's' : ''}
        </div>
      </CardHeader>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="w-[120px] text-xs py-2.5 px-4">Ticker</TableHead>
              <TableHead className="w-[110px] text-xs py-2.5 px-4">Base date</TableHead>
              {HORIZONS.map(h => (
                <TableHead key={h.key} className="text-xs py-2.5 px-4">{h.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {stocks.map(stock => (
              <TableRow key={stock.t}>
                {/* Ticker + company name */}
                <TableCell className="py-3 px-4">
                  <div className="font-bold text-sm">{stock.t.split('.')[0]}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{stock.co}</div>
                </TableCell>

                {/* Base date */}
                <TableCell className="py-3 px-4 text-xs text-muted-foreground">
                  {stock.base ? formatDate(stock.base) : '--'}
                </TableCell>

                {/* Horizon verdict cells */}
                {HORIZONS.map(h => (
                  <HorizonCell
                    key={h.key}
                    stock={stock}
                    horizonKey={h.key}
                    tKey={h.tKey}
                    dKey={h.dKey}
                    autoPrices={autoPrices}
                    histPrices={histPrices}
                    overrides={overrides}
                    hitMargin={hitMargin}
                    closeRatio={closeRatio}
                  />
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
