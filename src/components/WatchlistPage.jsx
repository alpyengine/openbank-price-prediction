/**
 * WatchlistPage
 *
 * Displays the user's watchlisted tickers in a two-column layout:
 *   Left  — summary cards + table of all watchlisted tickers
 *   Right — slide-in detail panel for the selected ticker
 *
 * Data sources:
 *   batches      — from useHistory (history.batches) — to find latest batch per ticker
 *   weeklyPrices — { [ticker]: { [batchId]: number[] } } — for sparklines
 *   fundamentals — { [ticker]: FundamentalsData } — for panel detail
 *   watchlist    — Set<string> from useWatchlist — which tickers are starred
 *
 * Panel (right side):
 *   - Sparkline chart (last N weekly prices)
 *   - Current price vs base price
 *   - Per-horizon target table with verdicts
 *   - Fundamentals (sector, PEG, beta, margin)
 *   - Actions: Open in Batch Details | Remove from Watchlist
 *
 * @param {Object[]}  batches      — raw batch array from history.batches
 * @param {Object}    weeklyPrices — { [ticker]: { [batchId]: number[] } }
 * @param {Object}    fundamentals — { [ticker]: FundamentalsData }
 * @param {Object}    autoPrices   — { [ticker]: number } current prices
 * @param {Set}       watchlist    — Set<string> of watched tickers
 * @param {Function}  onToggle     — toggle(ticker) to add/remove from watchlist
 * @param {Function}  onNav        — navigate to a page ('batch-detail' etc.)
 * @param {Function}  onLoadBatch  — load a batch into the main view
 * @param {Function}  onCheckAlerts — trigger manual alert check
 */
import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Star, X, ExternalLink, Bell, ChevronDown, Info } from 'lucide-react'
import {
  LineChart, Line, ResponsiveContainer, Tooltip as RTooltip,
} from 'recharts'

// ── Currency helper ───────────────────────────────────────────────────────────

/**
 * getCurrencySymbol — derives the currency symbol from a batch's results.
 * Reads the `currency` field saved in results (added in v7.4.7).
 * Falls back to '$' for older batches that don't have the field.
 */
function getCurrencySymbol(batch) {
  if (!batch?.results?.length) return '$'
  const cu = batch.results.find(r => r.currency)?.currency ?? 'USD'
  if (cu === 'EUR') return '€'
  if (cu === 'GBP') return '£'
  return '$'
}

// ── Constants ─────────────────────────────────────────────────────────────────

const HORIZONS = ['1M', '3M', '6M', '12M']

const VERDICT_CFG = {
  exceeded:  { label: 'Exceeded', cls: 'bg-blue-50 text-blue-700'   },
  hit:       { label: 'Hit',      cls: 'bg-green-50 text-green-700' },
  close:     { label: 'Close',    cls: 'bg-amber-50 text-amber-700' },
  miss:      { label: 'Miss',     cls: 'bg-red-50 text-red-700'     },
  wrong_way: { label: 'Wrong way',cls: 'bg-purple-50 text-purple-700'},
  awaiting:  { label: 'Awaiting', cls: 'bg-muted text-muted-foreground' },
}

// ── Hit margins by horizon (mirrors SNAPSHOT_PARAMS in stocks.js) ───────────
const HIT_MARGINS = { '1M': 3, '3M': 5, '6M': 7, '12M': 10 }
const CLOSE_RATIO = { '1M': 2.0, '3M': 2.0, '6M': 1.8, '12M': 1.6 }

/**
 * ColTooltip — column header with an info icon tooltip.
 * Matches the pattern used in AllStocksPage.
 */
function ColTooltip({ label, text }) {
  return (
    <span className="inline-flex items-center gap-1 group relative cursor-default">
      {label}
      <Info size={11} className="text-muted-foreground/60 shrink-0" />
      <span className={[
        'absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+6px)] z-50',
        'bg-popover text-popover-foreground border border-border',
        'text-[11px] leading-snug rounded-md px-2.5 py-1.5 shadow-md',
        'w-[200px] whitespace-normal pointer-events-none',
        'opacity-0 group-hover:opacity-100 transition-opacity',
      ].join(' ')}>
        {text}
      </span>
    </span>
  )
}

/**
 * evaluateProvisional — returns a verdict string for an open horizon
 * using the current reference price (weekly → autoPrices → basePrice).
 * Returns null if no price or no target.
 */
function evaluateProvisional(refPrice, targetPrice, basePrice, horizon) {
  if (!refPrice || !targetPrice || !basePrice) return null
  const margin     = HIT_MARGINS[horizon] ?? 5
  const closeThresh = margin * (CLOSE_RATIO[horizon] ?? 2.0)
  const signedDist = (refPrice - targetPrice) / targetPrice * 100
  const absDist    = Math.abs(signedDist)
  const bullish    = targetPrice >= basePrice

  if (bullish) {
    if (refPrice > targetPrice * (1 + margin / 100)) return 'exceeded'
    if (absDist <= margin)                             return 'hit'
    if (signedDist < 0 && absDist <= closeThresh)      return 'close'
    if (signedDist < 0 && refPrice < basePrice)        return 'wrong_way'
    return 'miss'
  } else {
    if (refPrice < targetPrice * (1 - margin / 100)) return 'exceeded'
    if (absDist <= margin)                             return 'hit'
    if (signedDist > 0 && absDist <= closeThresh)      return 'close'
    if (signedDist > 0 && refPrice > basePrice)        return 'wrong_way'
    return 'miss'
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * fmtPct — format a number as a signed percentage string.
 */
function fmtPct(n) {
  if (n == null) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

/**
 * buildBatchRow — builds a single row for one ticker × batch combination.
 * horizon controls which upside/leftToTarget/verdict columns are active.
 * weeklyPrices cascade: last weekly close → autoPrices → basePrice.
 */
function buildBatchRow(ticker, batch, weeklyPrices, autoPrices, horizon) {
  const results  = batch.results.filter(r => r.ticker === ticker)
  const get      = h => results.find(r => r.horizon === h)
  const rH       = get(horizon)
  const rFirst   = get('1M') ?? get('3M') ?? get('6M') ?? get('12M')

  // Reference price: latest weekly close → autoPrices → null
  const prices    = weeklyPrices[ticker]?.[batch.id] ?? []
  const weeklyLast = prices.length ? prices[prices.length - 1] : null
  const refPrice  = weeklyLast ?? autoPrices[ticker] ?? null

  // Upside for selected horizon: (target - base) / base
  const uH = rH
    ? (rH.targetPrice - rH.basePrice) / rH.basePrice * 100
    : null

  // Left to target for selected horizon: (target - refPrice) / refPrice
  // Positive = still has room. Negative = already exceeded.
  const ltt = (refPrice && rH?.targetPrice)
    ? (rH.targetPrice - refPrice) / refPrice * 100
    : null

  // Verdict for selected horizon:
  //   - If horizon expired: use stored verdict from Supabase
  //   - If horizon open: compute provisional verdict from refPrice (~)
  const storedVerdict = rH?.verdict ?? 'awaiting'
  let verdict = storedVerdict
  let provisional = false
  if (storedVerdict === 'awaiting' && rH?.targetPrice && rH?.basePrice && refPrice) {
    const pv = evaluateProvisional(refPrice, rH.targetPrice, rH.basePrice, horizon)
    if (pv) { verdict = pv; provisional = true }
  }

  return {
    ticker,
    co:        rFirst?.company ?? ticker,
    batchId:   batch.id,
    batchDate: batch.date,
    direction: batch.direction ?? 'bullish',
    market:    ticker.match(/\.(DE|AS|PA|L|MC)$/i)
      ? ticker.match(/\.([A-Z]+)$/i)[1].toUpperCase()
      : 'US',
    currSym:   getCurrencySymbol(batch),
    uH, ltt, verdict, provisional, refPrice,
    basePrice: rH?.basePrice ?? null,
    horizons: HORIZONS.map(h => {
      const r    = get(h)
      const vt_h = (refPrice && r?.targetPrice)
        ? (r.targetPrice - refPrice) / refPrice * 100
        : null
      return { h, target: r?.targetPrice ?? null, verdict: r?.verdict ?? 'awaiting', vt: vt_h }
    }),
    prices,
  }
}

/**
 * buildGroupedRows — derives one GROUP per ticker.
 * Each group has: summary row (latest batch) + all batch rows for expand.
 * horizon controls which upside/leftToTarget/verdict values are shown.
 */
function buildGroupedRows(watchlist, batches, weeklyPrices, autoPrices, horizon) {
  const groups = []

  for (const ticker of watchlist) {
    const tickerBatches = [...batches]
      .sort((a, b) => (b.id > a.id ? 1 : -1))
      .filter(b => b.results?.some(r => r.ticker === ticker))

    if (tickerBatches.length === 0) {
      groups.push({
        ticker, co: ticker, market: 'US', batchCount: 0,
        summary: null, batchRows: [],
      })
      continue
    }

    const batchRows = tickerBatches.map(b =>
      buildBatchRow(ticker, b, weeklyPrices, autoPrices, horizon)
    )

    // Summary row = latest batch data
    const latest = batchRows[0]

    // Average upside across all batches (non-null only)
    const uValues = batchRows.map(r => r.uH).filter(v => v != null)
    const avgUpside = uValues.length ? uValues.reduce((s, v) => s + v, 0) / uValues.length : null

    groups.push({
      ticker,
      co:         latest.co,
      market:     latest.market,
      batchCount: tickerBatches.length,
      summary:    { ...latest, avgUpside },
      batchRows,
    })
  }

  groups.sort((a, b) => a.ticker.localeCompare(b.ticker))
  return groups
}

// ── VerdictBadge ──────────────────────────────────────────────────────────────

function VerdictBadge({ verdict }) {
  const c = VERDICT_CFG[verdict] ?? VERDICT_CFG.awaiting
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.cls}`}>{c.label}</span>
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

/**
 * Sparkline — small line chart using Recharts.
 * Green if last price >= first price, red otherwise.
 */
function Sparkline({ prices, currSym = '$' }) {
  if (!prices?.length) {
    return (
      <div className="flex items-center justify-center h-[70px] text-[11px] text-muted-foreground">
        No weekly prices yet
      </div>
    )
  }

  const isPos    = prices[prices.length - 1] >= prices[0]
  const color    = isPos ? '#639922' : '#E24B4A'
  const data     = prices.map((p, i) => ({ w: i + 1, p }))

  return (
    <div style={{ height: 70, marginTop: 8 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Line
            type="monotone"
            dataKey="p"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <RTooltip
            contentStyle={{ fontSize: 11, padding: '2px 6px' }}
            formatter={(v) => [`${currSym}${v.toFixed(2)}`, 'Price']}
            labelFormatter={(l) => `Week ${l}`}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────

/**
 * DetailPanel — right-side sliding panel for a selected ticker.
 */
function DetailPanel({ row, fundamentals, onClose, onOpenBatch, onRemove }) {
  if (!row) return null

  const fund = fundamentals[row.ticker] ?? {}
  const chgPct = (row.lastPrice && row.basePrice)
    ? (row.lastPrice - row.basePrice) / row.basePrice * 100
    : null

  return (
    <div className="w-64 shrink-0 border-l border-border flex flex-col bg-card overflow-y-auto">

      {/* Panel header — sticky so ticker name stays visible when panel scrolls */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-[15px] font-semibold text-foreground">{row.ticker}</div>
            <span className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold',
              row.direction === 'bearish' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
            )}>
              {row.direction === 'bearish' ? '📉' : '📈'}
              {row.direction === 'bearish' ? 'Bearish' : 'Bullish'}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{row.co}</div>
          {row.batchDate && (
            <div className="text-[10px] text-muted-foreground mt-0.5">Batch {row.batchDate}</div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1 rounded"
          aria-label="Close panel"
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 p-4 flex flex-col gap-4">

        {/* Current price + sparkline */}
        <div className="bg-muted/40 rounded-lg p-3">
          <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">
            Price — last {row.prices.length} weeks
          </div>
          {row.lastPrice && (
            <div className={cn('text-[18px] font-semibold',
              chgPct != null && chgPct >= 0 ? 'text-green-700' : 'text-red-700'
            )}>
              {row.currSym ?? '$'}{row.lastPrice.toFixed(2)}
            </div>
          )}
          {chgPct != null && (
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {fmtPct(chgPct)} from base {row.currSym ?? '$'}{row.basePrice?.toFixed(2)}
            </div>
          )}
          <Sparkline prices={row.prices} currSym={row.currSym ?? '$'} />
        </div>

        {/* Horizon targets */}
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Price targets
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-1 font-medium text-muted-foreground">H</th>
                <th className="text-right pb-1 font-medium text-muted-foreground">Target</th>
                <th className="text-right pb-1 font-medium text-muted-foreground">vs T</th>
                <th className="text-right pb-1 font-medium text-muted-foreground">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {(row.horizons ?? []).map(h => (
                <tr key={h.h} className="border-b border-border last:border-0">
                  <td className="py-1 font-semibold text-foreground">{h.h}</td>
                  <td className="py-1 text-right text-muted-foreground">
                    {h.target ? `${row.currSym ?? '$'}${h.target.toFixed(0)}` : '—'}
                  </td>
                  <td className={cn('py-1 text-right font-semibold',
                    h.vt == null ? 'text-muted-foreground'
                    : h.vt >= 0 ? 'text-green-700' : 'text-red-700'
                  )}>
                    {fmtPct(h.vt)}
                  </td>
                  <td className="py-1 text-right">
                    <VerdictBadge verdict={h.verdict} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fundamentals */}
        {Object.keys(fund).length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Fundamentals
            </div>
            <table className="w-full text-[11px]">
              <tbody>
                {[
                  ['Sector',    fund.sector],
                  ['PEG',       fund.pegTTM?.toFixed(2)],
                  ['Beta',      fund.beta?.toFixed(2)],
                  ['Net margin',fund.netMarginTTM ? `${fund.netMarginTTM.toFixed(1)}%` : null],
                  ['Fwd PE',    fund.forwardPE?.toFixed(1)],
                ].filter(([, v]) => v != null).map(([label, value]) => (
                  <tr key={label} className="border-b border-border last:border-0">
                    <td className="py-1 text-muted-foreground">{label}</td>
                    <td className="py-1 text-right text-foreground font-medium">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start gap-2 text-[12px]"
            onClick={onOpenBatch}
          >
            <ExternalLink size={13} />
            Open in Batch Details
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start gap-2 text-[12px] text-red-600 border-red-200 hover:bg-red-50"
            onClick={onRemove}
          >
            <Star size={13} />
            Remove from Watchlist
          </Button>
        </div>

      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WatchlistPage({
  batches = [], weeklyPrices = {}, fundamentals = {},
  autoPrices = {}, watchlist, onToggle, onNav, onLoadBatch, onCheckAlerts,
}) {
  const [selectedTicker, setSelectedTicker] = useState(null)
  const [filterMkt,      setFilterMkt]      = useState('')
  // horizon — controls upside/leftToTarget/verdict columns
  const [horizon,        setHorizon]        = useState('12M')
  // legendOpen — column guide panel toggle
  const [legendOpen,     setLegendOpen]     = useState(false)
  // expandedTickers — set of ticker strings with expanded batch history
  const [expandedTickers, setExpandedTickers] = useState(new Set())

  // Build grouped rows from watchlist + batches + prices
  const groups = useMemo(
    () => buildGroupedRows(watchlist, batches, weeklyPrices, autoPrices, horizon),
    [watchlist, batches, weeklyPrices, autoPrices, horizon]
  )

  // Unique markets — for filter badges
  const markets = useMemo(() => {
    const counts = {}
    groups.forEach(g => { counts[g.market ?? 'US'] = (counts[g.market ?? 'US'] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [groups])

  // Apply market filter
  const filteredGroups = useMemo(() =>
    filterMkt ? groups.filter(g => (g.market ?? 'US') === filterMkt) : groups
  , [groups, filterMkt])

  // Flatten all summary rows for panel lookup + KPI counts
  const allSummaries = filteredGroups.map(g => g.summary).filter(Boolean)

  const selectedRow = (() => {
    for (const g of groups) {
      if (g.summary && `${g.ticker}__${g.summary.batchId ?? 'none'}` === selectedTicker)
        return g.summary
      for (const r of g.batchRows)
        if (`${r.ticker}__${r.batchId ?? 'none'}` === selectedTicker) return r
    }
    return null
  })()

  // Summary counts based on leftToTarget of latest batch per ticker
  const aboveTarget = allSummaries.filter(r => r.ltt != null && r.ltt <= 0).length
  const belowTarget = allSummaries.filter(r => r.ltt != null && r.ltt > 0).length
  const awaiting    = allSummaries.filter(r => r.verdict === 'awaiting' && !r.provisional).length

  const toggleExpand = (ticker) => setExpandedTickers(prev => {
    const next = new Set(prev)
    next.has(ticker) ? next.delete(ticker) : next.add(ticker)
    return next
  })

  // Empty state
  if (watchlist.size === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-16 text-center gap-3">
        <Star size={32} className="text-muted-foreground" />
        <div>
          <div className="text-[14px] font-semibold mb-1">No tickers in your Watchlist</div>
          <div className="text-[12px] text-muted-foreground">
            Click the ⭐ icon in All Stocks or Batch Overview Detail to add tickers.
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="flex gap-0 border border-border rounded-xl overflow-hidden" style={{ height: 600 }}>

      {/* ── LEFT: main list ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-5 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] font-semibold text-foreground">
                Watchlist
                <span className="text-[12px] font-normal text-muted-foreground ml-2">
                  — {watchlist.size} ticker{watchlist.size !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                One row per ticker · expand to see all batches · prices: weekly → live
              </div>
            </div>
            {/* Horizon toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-muted-foreground">Horizon:</span>
              <div className="flex items-center gap-0.5 bg-muted rounded-full p-0.5 border border-border">
                {['1M','3M','6M','12M'].map(h => (
                  <button
                    key={h}
                    onClick={() => setHorizon(h)}
                    className={cn(
                      'text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors',
                      horizon === h
                        ? 'bg-card text-foreground shadow-sm border border-border'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >{h}</button>
                ))}
              </div>
            </div>
            {onCheckAlerts && (
              <Button
                size="sm"
                variant="outline"
                className="text-[12px] gap-1.5"
                onClick={onCheckAlerts}
              >
                <Bell size={13} />
                Check alerts
              </Button>
            )}
          </div>
          {/* Market filter badges — only shown when >1 market detected */}
          {markets.length > 1 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground font-medium">Market:</span>
              <button
                onClick={() => setFilterMkt('')}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors',
                  filterMkt === ''
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted/50'
                )}
              >
                All <span className="opacity-60">({filteredGroups.length})</span>
              </button>
              {markets.map(([mkt, count]) => {
                const FLAG = { US:'🇺🇸', DE:'🇩🇪', AS:'🇳🇱', PA:'🇫🇷', L:'🇬🇧', MC:'🇪🇸' }
                return (
                  <button
                    key={mkt}
                    onClick={() => setFilterMkt(f => f === mkt ? '' : mkt)}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors',
                      filterMkt === mkt
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted/50'
                    )}
                  >
                    {FLAG[mkt] ?? ''} {mkt} <span className="opacity-60">({count})</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-border">
          {[
            { label: 'Tickers',       val: watchlist.size, color: 'text-foreground' },
            { label: 'Left to target ↑', val: belowTarget,  color: 'text-green-700'  },
            { label: 'Exceeded target',   val: aboveTarget,  color: 'text-blue-700'   },
            { label: 'Awaiting',          val: awaiting,     color: 'text-muted-foreground' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-muted/50 rounded-lg p-2.5">
              <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
              <div className={`text-[20px] font-semibold ${color}`}>{val}</div>
            </div>
          ))}
        </div>

        {/* Column guide — collapsible legend panel */}
        <div className="px-5 pt-2 pb-0">
          <button
            onClick={() => setLegendOpen(v => !v)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Info size={12} />
            Column guide
            <ChevronDown size={11} className={cn('transition-transform', legendOpen && 'rotate-180')} />
          </button>
          {legendOpen && (
            <div className="mt-2 mb-3 p-3 bg-muted/50 rounded-lg border border-border text-[11px] leading-relaxed">
              <div className="grid gap-x-3 gap-y-1.5" style={{ gridTemplateColumns: '110px 1fr' }}>
                <span className="font-medium text-foreground">{horizon} Upside</span>
                <span className="text-muted-foreground">(Target − Base) / Base from Openbank forecast. Does not update with market moves.</span>
                <span className="font-medium text-foreground">Left to target</span>
                <span className="text-muted-foreground">(Target − Last weekly close) / Last weekly close. Real remaining upside from today. Green = still reachable. Red = already exceeded.</span>
                <span className="font-medium text-foreground">Verdict</span>
                <span className="text-muted-foreground">Real result when horizon expired. If still open, shows estimated verdict (~) based on current price vs target using the same hit/miss margins.</span>
                <span className="font-medium text-foreground">Avg upside</span>
                <span className="text-muted-foreground">Mean {horizon} upside across all batches for this ticker. Shows consistency of Openbank forecasts over time.</span>
              </div>
              <div className="flex gap-3 flex-wrap mt-2 pt-2 border-t border-border">
                {[
                  ['Exceeded','bg-blue-50 text-blue-700','price passed target + margin'],
                  ['Hit','bg-green-50 text-green-700','within ±H% of target'],
                  ['Close','bg-amber-50 text-amber-700','within ±2H% of target'],
                  ['Wrong way','bg-purple-50 text-purple-700','moved opposite direction'],
                  ['Miss','bg-red-50 text-red-700','outside all thresholds'],
                ].map(([label, cls, desc]) => (
                  <span key={label} className="flex items-center gap-1">
                    <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{label}</span>
                    <span className="text-muted-foreground">{desc}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-muted/50">
                {[
                  { key: 'ticker',   label: 'Ticker',              tip: 'Stock symbol and company name. One row per ticker — expand to see all batches.' },
                  { key: 'market',   label: 'Market',              tip: 'Exchange: US = NYSE/NASDAQ. DE/AS/PA/L/MC = European markets.' },
                  { key: 'batch',    label: 'Latest batch',        tip: 'Date of the most recent Openbank forecast for this ticker.' },
                  { key: 'batches',  label: 'Batches',             tip: 'Total number of forecast batches containing this ticker. Click the row chevron to expand.' },
                  { key: 'upside',   label: `${horizon} Upside`,   tip: `Expected % gain from batch base price to Openbank ${horizon} target. Calculated at batch import date.` },
                  { key: 'avg',      label: 'Avg upside',          tip: `Mean ${horizon} upside across all batches for this ticker. Reflects historical forecast consistency.` },
                  { key: 'ltt',      label: 'Left to target',      tip: '(Target − last weekly close) / last weekly close. Real remaining upside from today. Green = reachable. Red = already exceeded.' },
                  { key: 'verdict',  label: 'Verdict',             tip: 'Result when horizon expired. If still open, ~ shows an estimated verdict using the current price vs target.' },
                  { key: 'expand',   label: '',                    tip: '' },
                ].map(({ key, label, tip }) => (
                  <th key={key} className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border whitespace-nowrap sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                    {tip ? <ColTooltip label={label} text={tip} /> : label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map(group => {
                const { ticker, summary: row, batchRows, batchCount } = group
                if (!row) return null
                const rowKey  = `${ticker}__${row.batchId ?? 'none'}`
                const isExpanded = expandedTickers.has(ticker)
                const isSelected = selectedTicker === rowKey

                return (
                <>
                {/* ── Summary row (latest batch) ─────────────────────── */}
                <tr
                  key={rowKey}
                  className={cn(
                    'border-b border-border transition-colors',
                    isSelected ? 'bg-muted/60' : 'hover:bg-muted/30'
                  )}
                  onClick={() => setSelectedTicker(isSelected ? null : rowKey)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Ticker + company */}
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-foreground">{ticker.replace(/\.(DE|AS|PA|L|MC|US)$/i, '')}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{row.co}</div>
                  </td>

                  {/* Market badge */}
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      'inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded',
                      row.market === 'US' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                    )}>{row.market}</span>
                  </td>

                  {/* Latest batch date */}
                  <td className="px-4 py-2.5 text-muted-foreground text-[12px]">
                    {row.batchDate ?? '—'}
                  </td>

                  {/* Batch count badge */}
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        'inline-block text-[10px] font-medium px-2 py-0.5 rounded-full transition-opacity',
                        batchCount > 1
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer hover:opacity-70'
                          : 'bg-muted text-muted-foreground'
                      )}
                      onClick={batchCount > 1 ? e => { e.stopPropagation(); toggleExpand(ticker) } : undefined}
                    >
                      {batchCount} batch{batchCount !== 1 ? 'es' : ''}
                    </span>
                  </td>

                  {/* Horizon upside */}
                  <td className={cn('px-4 py-2.5 font-semibold text-[12px]',
                    row.uH == null ? 'text-muted-foreground'
                    : row.uH >= 0  ? 'text-green-700' : 'text-red-700'
                  )}>
                    {fmtPct(row.uH)}
                  </td>

                  {/* Avg upside across all batches */}
                  <td className={cn('px-4 py-2.5 text-[12px]',
                    row.avgUpside == null ? 'text-muted-foreground'
                    : row.avgUpside >= 0  ? 'text-green-600' : 'text-red-600'
                  )}>
                    {fmtPct(row.avgUpside)}
                  </td>

                  {/* Left to target */}
                  <td className={cn('px-4 py-2.5 font-semibold text-[12px]',
                    row.ltt == null ? 'text-muted-foreground'
                    : row.ltt > 0   ? 'text-green-700'
                    : 'text-red-600'
                  )}>
                    {fmtPct(row.ltt)}
                  </td>

                  {/* Verdict — real or provisional (~) */}
                  <td className="px-4 py-2.5">
                    {row.provisional
                      ? <span className={cn(
                          'inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold opacity-70',
                          (VERDICT_CFG[row.verdict] ?? VERDICT_CFG.awaiting).cls
                        )}>~ {(VERDICT_CFG[row.verdict] ?? VERDICT_CFG.awaiting).label}</span>
                      : <VerdictBadge verdict={row.verdict} />
                    }
                  </td>

                  {/* Expand chevron + star */}
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); onToggle(ticker) }}
                        className="text-red-500 hover:opacity-70 transition-opacity"
                        aria-label={`Remove ${ticker} from watchlist`}
                      >
                        <Star size={14} fill="currentColor" />
                      </button>
                      {batchCount > 1 && (
                        <button
                          onClick={e => { e.stopPropagation(); toggleExpand(ticker) }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={isExpanded ? 'Collapse batches' : 'Expand batches'}
                        >
                          <ChevronDown
                            size={14}
                            className={cn('transition-transform duration-200', isExpanded && 'rotate-180')}
                          />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* ── Expanded batch history rows ────────────────────── */}
                {isExpanded && batchRows.slice(1).map(br => {
                  const brKey = `${ticker}__${br.batchId ?? 'none'}`
                  return (
                    <tr
                      key={brKey}
                      className={cn(
                        'border-b border-border/60 bg-muted/20 transition-colors cursor-pointer',
                        selectedTicker === brKey ? 'bg-muted/50' : 'hover:bg-muted/30'
                      )}
                      onClick={() => setSelectedTicker(selectedTicker === brKey ? null : brKey)}
                    >
                      {/* Indent + ticker */}
                      <td className="px-4 py-2 pl-8">
                        <div className="text-[11px] text-muted-foreground font-medium">{ticker.replace(/\.(DE|AS|PA|L|MC|US)$/i, '')}</div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={cn(
                          'inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded opacity-60',
                          br.market === 'US' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                        )}>{br.market}</span>
                      </td>
                      <td className="px-4 py-2 text-[11px] text-muted-foreground">{br.batchDate ?? '—'}</td>
                      <td className="px-4 py-2"></td>
                      {/* Upside */}
                      <td className={cn('px-4 py-2 text-[11px] font-medium',
                        br.uH == null ? 'text-muted-foreground'
                        : br.uH >= 0  ? 'text-green-600' : 'text-red-600'
                      )}>{fmtPct(br.uH)}</td>
                      <td className="px-4 py-2"></td>
                      {/* Left to target */}
                      <td className={cn('px-4 py-2 text-[11px] font-medium',
                        br.ltt == null ? 'text-muted-foreground'
                        : br.ltt > 0   ? 'text-green-600' : 'text-red-600'
                      )}>{fmtPct(br.ltt)}</td>
                      {/* Verdict */}
                      <td className="px-4 py-2">
                        {br.provisional
                          ? <span className={cn(
                              'inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold opacity-60',
                              (VERDICT_CFG[br.verdict] ?? VERDICT_CFG.awaiting).cls
                            )}>~ {(VERDICT_CFG[br.verdict] ?? VERDICT_CFG.awaiting).label}</span>
                          : <VerdictBadge verdict={br.verdict} />
                        }
                      </td>
                      <td className="px-4 py-2"></td>
                    </tr>
                  )
                })}
                </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RIGHT: detail panel ─────────────────────────────────────── */}
      {selectedRow && (
        <DetailPanel
          row={selectedRow}
          fundamentals={fundamentals}
          onClose={() => setSelectedTicker(null)}
          onOpenBatch={() => {
            // Find the batch and load it, then navigate
            const batch = [...batches]
              .sort((a, b) => (b.id > a.id ? 1 : -1))
              .find(b => b.results?.some(r => r.ticker === selectedRow.ticker))
            if (batch && onLoadBatch && onNav) {
              onLoadBatch(batch, selectedRow.ticker)  // pass ticker for scroll highlight
              onNav('batch-detail')
            }
          }}
          onRemove={() => {
            onToggle(selectedRow.ticker)
            setSelectedTicker(null)
          }}
        />
      )}
    </div>
  )
}
