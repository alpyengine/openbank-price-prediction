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
import { Star, X, ExternalLink, Bell } from 'lucide-react'
import {
  LineChart, Line, ResponsiveContainer, Tooltip as RTooltip,
} from 'recharts'

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

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * fmtPct — format a number as a signed percentage string.
 */
function fmtPct(n) {
  if (n == null) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

/**
 * buildStockRows — derives one display row per ticker × batch.
 * If a ticker appears in 3 batches, 3 rows are returned.
 * This allows seeing all forecasts for a ticker across batches,
 * including cases where the same ticker has both bullish and bearish batches.
 */
function buildStockRows(watchlist, batches, weeklyPrices, autoPrices) {
  const rows = []

  for (const ticker of watchlist) {
    // Find all batches containing this ticker, sorted newest first
    const tickerBatches = [...batches]
      .sort((a, b) => (b.id > a.id ? 1 : -1))
      .filter(b => b.results?.some(r => r.ticker === ticker))

    for (const batch of tickerBatches) {
      const results = batch.results.filter(r => r.ticker === ticker)
      const get = h => results.find(r => r.horizon === h)

      const r12 = get('12M')
      const u12 = r12 ? (r12.targetPrice - r12.basePrice) / r12.basePrice * 100 : null

      const prices    = weeklyPrices[ticker]?.[batch.id] ?? []
      const lastPrice = prices.length ? prices[prices.length - 1] : (autoPrices[ticker] ?? null)
      const vt        = (lastPrice && r12) ? (lastPrice - r12.targetPrice) / r12.targetPrice * 100 : null

      const r1      = get('1M')
      const verdict = r1?.verdict ?? 'awaiting'

      rows.push({
        ticker,
        co:        r12?.company ?? ticker,
        batchId:   batch.id,
        batchDate: batch.date,
        direction: batch.direction ?? 'bullish',
        u12, vt, verdict, lastPrice,
        basePrice: r12?.basePrice ?? null,
        horizons: HORIZONS.map(h => {
          const r    = get(h)
          const vt_h = (lastPrice && r) ? (lastPrice - r.targetPrice) / r.targetPrice * 100 : null
          return { h, target: r?.targetPrice ?? null, verdict: r?.verdict ?? 'awaiting', vt: vt_h }
        }),
        prices,
      })
    }

    // If ticker not found in any batch, add a placeholder row
    if (tickerBatches.length === 0) {
      rows.push({ ticker, batchId: null, co: ticker, direction: 'bullish', prices: [] })
    }
  }

  return rows
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
function Sparkline({ prices }) {
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
            formatter={(v) => [`$${v.toFixed(2)}`, 'Price']}
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
              ${row.lastPrice.toFixed(2)}
            </div>
          )}
          {chgPct != null && (
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {fmtPct(chgPct)} from base ${row.basePrice?.toFixed(2)}
            </div>
          )}
          <Sparkline prices={row.prices} />
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
              {row.horizons.map(h => (
                <tr key={h.h} className="border-b border-border last:border-0">
                  <td className="py-1 font-semibold text-foreground">{h.h}</td>
                  <td className="py-1 text-right text-muted-foreground">
                    {h.target ? `$${h.target.toFixed(0)}` : '—'}
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

  // Build display rows from watchlist + batches + prices
  const rows = useMemo(
    () => buildStockRows(watchlist, batches, weeklyPrices, autoPrices),
    [watchlist, batches, weeklyPrices, autoPrices]
  )

  const selectedRow = rows.find(r => `${r.ticker}__${r.batchId ?? 'none'}` === selectedTicker) ?? null

  // Summary counts
  const aboveTarget = rows.filter(r => r.vt != null && r.vt >= 0).length
  const belowTarget = rows.filter(r => r.vt != null && r.vt < 0).length
  const awaiting    = rows.filter(r => r.verdict === 'awaiting').length

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
                One row per batch · vs Target uses last weekly price
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
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-border">
          {[
            { label: 'Tickers',       val: watchlist.size, color: 'text-foreground' },
            { label: 'Above target',  val: aboveTarget,    color: 'text-green-700'  },
            { label: 'Below target',  val: belowTarget,    color: 'text-red-700'    },
            { label: 'Awaiting',      val: awaiting,       color: 'text-muted-foreground' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-muted/50 rounded-lg p-2.5">
              <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
              <div className={`text-[20px] font-semibold ${color}`}>{val}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-muted/50">
                {['Ticker', 'Batch', 'Direction', '12M Upside', 'vs Target', 'Verdict', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const rowKey = `${row.ticker}__${row.batchId ?? 'none'}`
                return (
                <tr
                  key={rowKey}
                  className={cn(
                    'border-b border-border cursor-pointer transition-colors',
                    selectedTicker === rowKey ? 'bg-muted/60' : 'hover:bg-muted/30'
                  )}
                  onClick={() => setSelectedTicker(
                    selectedTicker === rowKey ? null : rowKey
                  )}
                >
                  {/* Ticker + company */}
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-foreground">{row.ticker}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{row.co}</div>
                  </td>

                  {/* Batch date */}
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {row.batchDate ?? '—'}
                  </td>

                  {/* Direction badge */}
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                      row.direction === 'bearish'
                        ? 'bg-red-50 text-red-800'
                        : 'bg-green-50 text-green-800'
                    )}>
                      {row.direction === 'bearish' ? '📉' : '📈'}
                      {row.direction === 'bearish' ? 'Bearish' : 'Bullish'}
                    </span>
                  </td>

                  {/* 12M Upside */}
                  <td className={cn('px-4 py-2.5 font-semibold',
                    row.u12 == null ? 'text-muted-foreground'
                    : row.u12 >= 0 ? 'text-green-700' : 'text-red-700'
                  )}>
                    {fmtPct(row.u12)}
                  </td>

                  {/* vs Target */}
                  <td className={cn('px-4 py-2.5 font-semibold',
                    row.vt == null ? 'text-muted-foreground'
                    : row.vt >= 0 ? 'text-blue-700' : 'text-red-600'
                  )}>
                    {fmtPct(row.vt)}
                  </td>

                  {/* Verdict */}
                  <td className="px-4 py-2.5">
                    <VerdictBadge verdict={row.verdict} />
                  </td>

                  {/* Star toggle */}
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={e => { e.stopPropagation(); onToggle(row.ticker) }}
                      className="text-red-500 hover:opacity-70 transition-opacity"
                      aria-label={`Remove ${row.ticker} from watchlist`}
                    >
                      <Star size={14} fill="currentColor" />
                    </button>
                  </td>
                </tr>
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
              onLoadBatch(batch)
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
