/**
 * StockRow
 *
 * Individual stock row in the batch prediction table.
 * Renders as a collapsed summary row with expandable detail panel.
 *
 * Collapsed row contains:
 *   Ticker | Company | Base price | Current price | 4 horizon bars | vs SPY | vs Sector
 *
 * Expanded panel contains:
 *   - HorizonCards — 4 cards with target price, date, and verdict
 *   - MarketComparison — bar chart comparing stock vs SPY/ETF since base date
 *   - FundamentalsPanel — sector, industry, market cap, beta, website, description
 *   - PriceChart — weekly price chart modal (only when batchId is available)
 *   - Notes — free-text note per stock
 *
 * All verdict colors use evaluatePrediction() as single source of truth.
 *
 * @param {Object}   stock           — stock object { t, co, b, t1, t3, t6, t12, base }
 * @param {string}   horizon         — selected horizon key
 * @param {number}   autoPrice       — current fetched price
 * @param {Object}   histPrices      — historical prices map
 * @param {number}   override        — manual price override
 * @param {boolean}  horizonExpired  — whether selected horizon has passed
 * @param {Object}   fundamental     — fundamentals data (undefined=loading, null=error)
 * @param {Function} onOverrideChange — called when user enters manual price
 * @param {string}   note            — saved note text
 * @param {Function} onNoteChange    — called when note is saved
 * @param {Object}   marketData      — SPY/ETF performance data
 * @param {number}   collapseAll     — counter incremented to trigger collapse
 * @param {boolean}  allExpanded     — true when "Expand all" is active
 * @param {string}   batchCurrency   — currency symbol ('$', '€', etc.)
 * @param {number}   hitMargin       — hit tolerance in % (default 5)
 * @param {string}   batchId         — Supabase batch id for PriceChart
 * @param {number}   totalCols       — total column count for colSpan (default 17)
 * @param {number}   closeRatio      — close zone multiplier (default 2.4)
 * @param {boolean}  isWatched       — true if ticker is in user's watchlist
 * @param {Function} onToggleWatchlist — called with ticker to toggle watchlist
 */
import { memo, useState, useCallback, useEffect } from 'react'
import { formatDate, targetDates, daysLeft, dateStatus } from '@/utils/dates.js'
import { getTarget, getEffectivePrice, distancePct, evaluatePrediction, histKey } from '@/utils/stocks.js'
import { cn } from '@/lib/utils'
import { fmtMarketCap } from '@/hooks/useFundamentals.js'
import { SECTOR_ETF, INDUSTRY_ETF } from '@/hooks/useMarketData.js'
import PriceChart from './PriceChart.jsx'
import TradingViewModal from './TradingViewModal.jsx'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

// ── Main StockRow ─────────────────────────────────────────────────────────────

const StockRow = memo(function StockRow({
  stock, horizon, autoPrice, histPrices, override, horizonExpired,
  fundamental, onOverrideChange, note, onNoteChange,
  marketData, collapseAll, allExpanded, batchCurrency, hitMargin = 5, batchId, totalCols = 17, closeRatio = 2.4,
  isWatched = false, onToggleWatchlist,
}) {
  const [expanded,  setExpanded]  = useState(false)
  const [showDesc,  setShowDesc]  = useState(false)
  const [showTV,    setShowTV]    = useState(false) // TradingView modal
  const [showNote,  setShowNote]  = useState(false)
  const [noteVal,   setNoteVal]   = useState(note || '')
  const [val,       setVal]       = useState(override ? String(override) : '')

  // ── Side effects ──────────────────────────────────────────────────────────

  // Sync collapse/expand state when parent triggers collapseAll
  useEffect(() => { if (collapseAll > 0) setExpanded(allExpanded) }, [collapseAll])

  // Sync note from outside (e.g. batch loaded from history)
  useEffect(() => { setNoteVal(note || '') }, [note])

  // Sync override input from outside
  useEffect(() => { if (override == null) setVal(''); else setVal(String(override)) }, [override])

  // Close description modal on Escape
  useEffect(() => {
    if (!showDesc) return
    const handler = (e) => { if (e.key === 'Escape') setShowDesc(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showDesc])

  // ── Price computation ─────────────────────────────────────────────────────

  const best      = Math.max(stock.t1, stock.t3, stock.t6, stock.t12)
  const tgt       = getTarget(stock, horizon)
  const tg        = stock.base ? targetDates(stock.base) : null
  const bestLabel = best === stock.t12 ? '12M' : best === stock.t6 ? '6M' : best === stock.t3 ? '3M' : '1M'

  const { price: p, isHistorical } = getEffectivePrice(
    stock.t, horizon, { [stock.t]: autoPrice }, histPrices,
    override ? { [stock.t]: override } : {}, horizonExpired
  )

  const { verdict, direction } = evaluatePrediction(p, tgt, stock.b, hitMargin)
  const hKey       = histKey(stock.t, horizon)
  const histEntry  = histPrices?.[hKey]
  const histLoading = horizonExpired && horizon !== 'best' && histEntry === undefined

  const horizonDates = tg
    ? [{ val: stock.t1, date: tg.d1 }, { val: stock.t3, date: tg.d3 }, { val: stock.t6, date: tg.d6 }, { val: stock.t12, date: tg.d12 }]
    : [{ val: stock.t1 }, { val: stock.t3 }, { val: stock.t6 }, { val: stock.t12 }]

  // ── Override input handlers ───────────────────────────────────────────────

  const handleCommit = useCallback((e) => {
    const v = parseFloat(e.target.value)
    onOverrideChange(stock.t, isNaN(v) || v <= 0 ? null : v)
    if (isNaN(v) || v <= 0) setVal('')
  }, [stock.t, onOverrideChange])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter')  e.target.blur()
    if (e.key === 'Escape') { setVal(''); onOverrideChange(stock.t, null); e.target.blur() }
  }, [stock.t, onOverrideChange])

  // ── Table cell base class ─────────────────────────────────────────────────

  const tdClass = 'py-3 px-3.5 align-middle border-b border-border'

  return (
    <>
      {/* ── Description modal ──────────────────────────────────────────── */}
      {showDesc && fundamental?.description && (
        <tr style={{ display: 'contents' }}>
          <td style={{ padding: 0 }}>
            <div
              className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-5 backdrop-blur-sm"
              onClick={() => setShowDesc(false)}
            >
              <div
                className="bg-card border border-border rounded-lg max-w-[540px] w-full max-h-[80vh] overflow-y-auto shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4.5 py-3.5 border-b border-border">
                  <div>
                    <div className="text-sm font-bold">{stock.t} — {stock.co}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {fundamental.industry} · {fundamental.sector}
                    </div>
                  </div>
                  <button
                    className="text-lg text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer rounded px-1.5"
                    onClick={() => setShowDesc(false)}
                  >✕</button>
                </div>
                <div className="p-4.5 text-sm text-muted-foreground leading-relaxed">
                  {fundamental.description}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* ── Main row ───────────────────────────────────────────────────── */}
      <tr
        className={cn(
          'cursor-pointer transition-colors hover:bg-muted',
          !expanded && 'border-b border-border'
        )}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Ticker */}
        <td className={tdClass}>
          <div className="flex items-center gap-1.5 font-semibold text-sm whitespace-nowrap">
            <span className="text-[10px] text-muted-foreground">{expanded ? '▾' : '›'}</span>
            {stock.t.split('.')[0]}
            {/* Watchlist star — shown next to ticker */}
            {onToggleWatchlist && (
              <button
                onClick={e => { e.stopPropagation(); onToggleWatchlist(stock.t.split('.')[0]) }}
                className={cn(
                  'text-[11px] leading-none transition-colors ml-0.5',
                  isWatched ? 'text-red-500' : 'text-muted-foreground hover:text-red-400'
                )}
                aria-label={isWatched ? `Remove ${stock.t} from watchlist` : `Add ${stock.t} to watchlist`}
              >
                ★
              </button>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
            {stock.t.includes('.') ? stock.t.split('.').pop() : 'US'}
          </div>
        </td>

        {/* Company */}
        <td className={cn(tdClass, 'text-[13px] text-muted-foreground')}>{stock.co}</td>

        {/* Base price */}
        <td className={cn(tdClass, 'text-[13px] text-muted-foreground font-mono')}>
          {stock.b ? `${batchCurrency ?? '$'}${stock.b.toFixed(2)}` : '--'}
        </td>

        {/* Current price */}
        <td className={tdClass}>
          {histLoading && <span className="text-muted-foreground text-[11px]">…</span>}
          {!histLoading && isHistorical && histEntry && (
            <div>
              <span className="text-blue-600 font-semibold text-xs">
                {batchCurrency ?? ''}{histEntry.price.toFixed(2)}
              </span>
              <span className="block text-[9px] text-muted-foreground mt-0.5">
                {histEntry.fromCache ? '💾 cached' : 'exp.'}
              </span>
            </div>
          )}
          {!histLoading && isHistorical && !histEntry && (
            <span className="text-destructive text-[11px]">n/a</span>
          )}
          {!isHistorical && (
            <div>
              {autoPrice == null
                ? <span className="text-muted-foreground text-[11px]">--</span>
                : <span className="text-success font-semibold text-xs">
                    {batchCurrency ?? ''}{autoPrice.toFixed(2)}
                  </span>
              }
            </div>
          )}
        </td>

        {/* ── Horizon bar columns 1M / 3M / 6M / 12M ──────────────────── */}
        {horizonDates.map(({ val: t, date }, i) => {
          const KEYS = ['1M', '3M', '6M', '12M']
          const hKey = KEYS[i]
          const ds   = date ? dateStatus(date) : null

          // ── Bug 3 fix: each column resolves its OWN price independently ──
          // Previously all columns used `p` (the global horizon's price).
          // Now each column calls getEffectivePrice with its specific hKey,
          // so closed columns (e.g. 1M) always show their historical price
          // even when the user has 3M/6M/12M selected in the dropdown.
          const colExpired  = ds === 'past'
          const { price: colPrice } = getEffectivePrice(
            stock.t, hKey,
            { [stock.t]: autoPrice },
            histPrices,
            override ? { [stock.t]: override } : {},
            colExpired
          )

          // Use resolved column price — fall back to autoPrice if unavailable
          const currentP = colPrice ?? autoPrice

          // Distance % from current price to target (signed: + above, − below)
          let distPct = null
          if (currentP && t) distPct = ((currentP - t) / t) * 100

          // Verdict via evaluatePrediction — live mode with slider values
          const { verdict: barVerdict } = currentP && t
            ? evaluatePrediction(currentP, t, stock.b, hitMargin, { closeRatio })
            : { verdict: null }

          // Map verdict to display zone — now includes exceeded and wrong_way
          let zone = 'awaiting'
          if (currentP && t) {
            if      (barVerdict === 'hit')       zone = 'hit'
            else if (barVerdict === 'exceeded')  zone = 'exceeded'
            else if (barVerdict === 'close')     zone = 'close'
            else if (barVerdict === 'miss')      zone = 'miss'
            else if (barVerdict === 'wrong_way') zone = 'wrong_way'
          }

          /**
           * Proportional bar width per zone:
           *   exceeded  → 100% (full bar — surpassed target)
           *   hit       → 100%
           *   close     → 75-95% proportional (nearly there)
           *   miss      → 0-60% inversely proportional (farther = shorter)
           *   wrong_way → 15% (minimal bar — wrong direction)
           *   awaiting  → 0%
           */
          const fillWidth = (() => {
            if (zone === 'awaiting' || distPct == null) return 0
            if (zone === 'exceeded')  return 100
            if (zone === 'hit')       return 100
            if (zone === 'wrong_way') return 15
            if (zone === 'close') {
              const absDist = Math.abs(distPct)
              return Math.round(Math.max(75, Math.min(95, 95 - absDist * 1.5)))
            }
            // miss — shorter bar the further away
            const absDist = Math.abs(distPct)
            return Math.round(Math.max(0, Math.min(60, 60 - absDist * 0.8)))
          })()

          // Zone label colors
          const zoneColor = zone === 'hit'       ? '#15803d'
            : zone === 'exceeded'                ? '#1d4ed8'
            : zone === 'close'                   ? '#a16207'
            : zone === 'miss'                    ? '#b91c1c'
            : zone === 'wrong_way'               ? '#6d28d9'
            : 'var(--muted-foreground)'

          // Zone bar fill colors
          const zoneFill = zone === 'hit'        ? '#16a34a'
            : zone === 'exceeded'                ? '#3b82f6'
            : zone === 'close'                   ? '#eab308'
            : zone === 'miss'                    ? '#ef4444'
            : zone === 'wrong_way'               ? '#8b5cf6'
            : 'var(--border)'

          const pctStr = distPct != null ? ` ${distPct >= 0 ? '+' : ''}${distPct.toFixed(1)}%` : ''
          const label  = zone === 'hit'          ? `HIT${pctStr}`
            : zone === 'exceeded'                ? `EXCEED${pctStr}`
            : zone === 'close'                   ? `CLOSE${pctStr}`
            : zone === 'miss'                    ? `MISS${pctStr}`
            : zone === 'wrong_way'               ? `WRONG${pctStr}`
            : '--'

          return (
            <td key={i} className={cn(tdClass, 'min-w-[72px]')}>
              <div className="flex flex-col gap-0.5">
                {/* Line 1 — horizon key (e.g. "1M") */}
                <span className="text-[9px] font-semibold text-muted-foreground leading-tight">
                  {hKey}
                </span>
                {/* Line 2 — verdict label + % (e.g. "EXCEED +14.2%") */}
                <span
                  className="text-[9px] font-bold leading-tight break-all"
                  style={{ color: zoneColor }}
                >
                  {label}
                </span>
                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mt-0.5">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      background: zoneFill,
                      width: `${Math.max(0, Math.min(100, fillWidth))}%`,
                    }}
                  />
                </div>
              </div>
            </td>
          )
        })}

        {/* vs SPY */}
        <td className={tdClass}>
          {(() => {
            const spyPct   = marketData?.spy?.changePct ?? null
            const stockChg = (stock.b && (p ?? autoPrice))
              ? (((p ?? autoPrice) - stock.b) / stock.b * 100)
              : null
            if (spyPct == null || stockChg == null) {
              return <span className="text-[11px] text-muted-foreground">--</span>
            }
            const diff = stockChg - spyPct
            const beat = diff >= 0
            return (
              <div className="flex flex-col gap-0.5">
                <span className={cn('text-[11px] font-semibold whitespace-nowrap', beat ? 'text-success' : 'text-destructive')}>
                  {beat ? '✅' : '❌'} {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                </span>
                <span className="text-[9px] text-muted-foreground">SPY</span>
              </div>
            )
          })()}
        </td>

        {/* vs Sector ETF */}
        <td className={tdClass}>
          {(() => {
            const sector   = fundamental?.sector
            const etfSym   = sector ? SECTOR_ETF[sector] : null
            const etfData  = etfSym ? marketData?.etfs?.[etfSym] : null
            const etfPct   = etfData?.changePct ?? null
            const stockChg = (stock.b && (p ?? autoPrice))
              ? (((p ?? autoPrice) - stock.b) / stock.b * 100)
              : null

            if (!sector)         return <span className="text-[10px] text-muted-foreground">fetch<br />funds</span>
            if (!etfSym)         return <span className="text-[10px] text-muted-foreground">--</span>
            if (etfPct == null)  return <span className="text-[10px] text-muted-foreground">{etfSym}<br />fetch mkt</span>
            if (stockChg == null) return <span className="text-[10px] text-muted-foreground">{etfSym}<br />no price</span>

            const diff = stockChg - etfPct
            const beat = diff >= 0
            return (
              <div className="flex flex-col gap-0.5">
                <span className={cn('text-[11px] font-semibold whitespace-nowrap', beat ? 'text-success' : 'text-destructive')}>
                  {beat ? '✅' : '❌'} {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                </span>
                <span className="text-[9px] text-muted-foreground">{etfSym}</span>
              </div>
            )
          })()}
        </td>
        {/* TradingView chart icon button — opens modal */}
        <td className={tdClass} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setShowTV(true)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
            title={`Open ${stock.t} chart in TradingView`}
            aria-label="Open TradingView chart"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </button>
        </td>
      </tr>

      {/* ── TradingView modal ──────────────────────────────────────────── */}
      {showTV && (
        <tr style={{ display: 'contents' }}>
          <td style={{ padding: 0 }}>
            <TradingViewModal
              ticker={stock.t}
              company={stock.co}
              onClose={() => setShowTV(false)}
            />
          </td>
        </tr>
      )}
      {expanded && (
        <tr className="border-b border-border">
          <td colSpan={totalCols} className="py-4 px-5 bg-muted">

            <HorizonCards
              stock={stock} tg={tg}
              autoPrice={autoPrice} histPrices={histPrices} override={override}
              batchCurrency={batchCurrency}
              hitMargin={hitMargin}
            />

            {marketData && (
              <MarketComparison
                stock={stock} fundamental={fundamental}
                marketData={marketData} autoPrice={autoPrice}
              />
            )}

            <FundamentalsPanel
              fundamental={fundamental}
              ticker={stock.t}
              onShowDesc={() => setShowDesc(true)}
            />

            {/* Price chart button — only when batchId is available */}
            {batchId && (
              <div className="mt-3">
                <PriceChart stock={stock} batchId={batchId} />
              </div>
            )}

            {/* Notes */}
            <div className="flex justify-start mt-3">
              {showNote ? (
                <Textarea
                  className="w-full max-w-[600px] h-[72px] text-[13px] font-inherit resize-y"
                  value={noteVal}
                  onChange={e => setNoteVal(e.target.value)}
                  onBlur={() => { onNoteChange && onNoteChange(stock.t, noteVal); setShowNote(false) }}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                  placeholder={`Add notes for ${stock.t.split('.')[0]}…`}
                />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={e => { e.stopPropagation(); setShowNote(true) }}
                >
                  📋 {noteVal ? 'Edit note' : 'Add Note'}
                </Button>
              )}
            </div>

          </td>
        </tr>
      )}
    </>
  )
})

export default StockRow

// ── HorizonCards ──────────────────────────────────────────────────────────────

/**
 * HorizonCards
 *
 * 4 cards showing each horizon's outcome.
 *
 * Two states, clearly separated (single source of truth = the same evaluation
 * the accuracy stats use):
 *   - SETTLED (target date passed + a real closing price is available):
 *       shows the settled verdict (HIT / EXCEEDED / CLOSE / MISS / WRONG-WAY),
 *       evaluated in snapshot mode so it matches the stored verdict and stats.
 *   - OPEN / future (or expired but the close isn't in yet): shows AWAITING.
 *       Future horizons also get a live tracking hint (↗ adelantado / → en camino
 *       / ↘ retrasado) based on today's price — but the badge stays AWAITING,
 *       so live tracking never gets confused with a settled verdict.
 *
 * getEffectivePrice() is called in snapshot mode (last arg true) so an expired
 * horizon is never settled against the current price — if the real close isn't
 * loaded it returns null and the card stays AWAITING (the cron settles it later).
 */
function HorizonCards({ stock, tg, autoPrice, histPrices, override, batchCurrency, hitMargin = 5 }) {
  if (!tg) return null
  const cu = batchCurrency ?? '$'

  const horizons = [
    { key: '1M',  target: stock.t1,  date: tg.d1  },
    { key: '3M',  target: stock.t3,  date: tg.d3  },
    { key: '6M',  target: stock.t6,  date: tg.d6  },
    { key: '12M', target: stock.t12, date: tg.d12 },
  ]

  // Verdict → label / badge / card-border. Now covers exceeded + wrong_way
  // (previously they fell through to the AWAITING fallback — that was the bug).
  const V = {
    hit:       { label: '🎯 HIT',      badge: 'bg-green-50 text-green-700 border-green-200',    card: 'border-green-200' },
    exceeded:  { label: '▲ EXCEEDED',  badge: 'bg-blue-50 text-blue-700 border-blue-200',       card: 'border-blue-200' },
    close:     { label: '◑ CLOSE',     badge: 'bg-amber-50 text-amber-700 border-amber-200',    card: 'border-amber-200' },
    miss:      { label: '▼ MISS',      badge: 'bg-red-50 text-red-700 border-red-200',          card: 'border-red-200' },
    wrong_way: { label: '⤬ WRONG',     badge: 'bg-purple-50 text-purple-700 border-purple-200', card: 'border-purple-200' },
    awaiting:  { label: '⏳ AWAITING', badge: 'bg-muted text-muted-foreground border-border',   card: 'border-border' },
  }
  const liveLabel = { ahead: '↗ adelantado', ontrack: '→ en camino', behind: '↘ retrasado' }
  const liveColor = { ahead: 'text-success', ontrack: 'text-muted-foreground', behind: 'text-amber-600' }

  const cards = horizons.map(({ key, target, date }) => {
    const expired = date ? dateStatus(date) === 'past' : false
    const dleft   = date ? daysLeft(date) : null

    // snapshot=true → expired uses the settled close (or null, never the current
    // price); future falls through to the current price for live tracking.
    const { price: rp } = getEffectivePrice(
      stock.t, key,
      { [stock.t]: autoPrice }, histPrices ?? {},
      override ? { [stock.t]: override } : {},
      expired, /* snapshot */ true,
    )

    const settled = expired && rp != null && !!target
    const dist    = (rp != null && target) ? ((rp - target) / target) * 100 : null

    // Settled horizons use snapshot params → match the stored verdict + stats.
    let verdict = 'awaiting'
    if (settled) {
      verdict = evaluatePrediction(rp, target, stock.b, hitMargin, { horizon: key }).verdict ?? 'awaiting'
    }

    // Live tracking for future horizons (badge stays AWAITING).
    let live = null
    if (!expired && rp != null && target) {
      const lv = evaluatePrediction(rp, target, stock.b, hitMargin).verdict
      live = (lv === 'exceeded' || lv === 'hit') ? 'ahead'
           : (lv === 'close')                    ? 'ontrack'
           : 'behind'
    }

    return { key, target, date, expired, dleft, rp, settled, dist, verdict, live }
  })

  // Roll-up across settled horizons + today's distance to the best target.
  const settledCards = cards.filter(c => c.settled)
  const wins         = settledCards.filter(c => c.verdict === 'hit' || c.verdict === 'exceeded').length
  const best         = Math.max(stock.t1, stock.t3, stock.t6, stock.t12)
  const bestLabel    = best === stock.t12 ? '12M' : best === stock.t6 ? '6M' : best === stock.t3 ? '3M' : '1M'
  const todayVsBest  = (autoPrice && best) ? ((autoPrice - best) / best) * 100 : null

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <span>◎</span> Horizon Results
        </span>
        {(settledCards.length > 0 || todayVsBest != null) && (
          <span className="text-[11px] text-muted-foreground text-right leading-tight">
            {settledCards.length > 0 && (
              <><b className="text-foreground font-semibold">{wins}/{settledCards.length}</b> vencidos acertados</>
            )}
            {settledCards.length > 0 && todayVsBest != null && ' · '}
            {todayVsBest != null && (
              <>hoy <b className={cn('font-semibold', todayVsBest >= 0 ? 'text-success' : 'text-destructive')}>
                {todayVsBest >= 0 ? '+' : ''}{todayVsBest.toFixed(0)}%
              </b> vs obj. {bestLabel}</>
            )}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {cards.map(({ key, target, date, expired, dleft, rp, dist, verdict, live }) => {
          const v = V[verdict] ?? V.awaiting
          const distColor = dist == null ? 'text-muted-foreground' : dist >= 0 ? 'text-success' : 'text-destructive'
          return (
            <div key={key} className={cn('bg-card rounded-lg px-4 py-3.5 border', v.card)}>
              {/* horizon + verdict badge */}
              <div className="flex justify-between items-center mb-2 gap-1">
                <span className="text-[11px] text-muted-foreground font-medium">{key}</span>
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap', v.badge)}>
                  {v.label}
                </span>
              </div>

              {/* price: settled close (expired) or current price (future) */}
              <div className="text-lg font-bold mb-1">
                {rp != null ? `${cu}${rp.toFixed(2)}` : (target ? '—' : '--')}
              </div>

              {/* date + state + live hint */}
              <div className="text-[11px] text-muted-foreground mb-1.5">
                {date ? formatDate(date) : '--'}
                {date && (
                  <span className={cn('ml-1', expired && 'text-destructive font-medium')}>
                    · {expired ? 'vencido' : `+${dleft}d`}
                  </span>
                )}
                {live && (
                  <span className={cn('ml-1 font-semibold', liveColor[live])}>{liveLabel[live]}</span>
                )}
              </div>

              {/* target + gap */}
              <div className="flex items-baseline justify-between text-xs gap-1">
                <span className="text-muted-foreground whitespace-nowrap">
                  {target ? `Obj. ${cu}${target.toFixed(2)}` : 'sin objetivo'}
                </span>
                {dist != null
                  ? <span className={cn('font-semibold', distColor)}>{dist >= 0 ? '+' : ''}{dist.toFixed(1)}%</span>
                  : (expired && <span className="text-muted-foreground">sin cierre</span>)
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── MarketComparison ──────────────────────────────────────────────────────────

/**
 * MarketComparison
 *
 * Horizontal bar chart comparing the stock's performance since the base date
 * against SPY, sector ETF, industry ETF, RSP, and QQQ (where applicable).
 * Bars are centered at 0% — positive bars extend right (green), negative left (red).
 */
function MarketComparison({ stock, fundamental, marketData, autoPrice }) {
  if (!marketData?.spy) return null

  const sector     = fundamental?.sector
  const industry   = fundamental?.industry
  const exchange   = fundamental?.exchange
  const etfSymbol  = sector   ? SECTOR_ETF[sector]       : null
  const indEtfSym  = industry ? INDUSTRY_ETF?.[industry] : null
  const etfData    = etfSymbol ? marketData.etfs?.[etfSymbol]         : null
  const indEtfData = indEtfSym ? marketData.industryEtfs?.[indEtfSym] : null
  const rspData    = marketData.etfs?.['RSP'] ?? null
  const qqqData    = marketData.etfs?.['QQQ'] ?? null

  const stockPct  = (stock.b && autoPrice && autoPrice > 0) ? ((autoPrice - stock.b) / stock.b) * 100 : null
  const spyPct    = marketData.spy.changePct
  const rspPct    = rspData?.changePct    ?? null
  const qqqPct    = qqqData?.changePct    ?? null
  const etfPct    = etfData?.changePct    ?? null
  const indEtfPct = indEtfData?.changePct ?? null

  const benchLabel = marketData.benchmark?.label ?? 'S&P 500 (SPY)'
  const ticker     = stock.t.split('.')[0]
  const baseDate   = stock.base ? formatDate(stock.base) : '?'
  const isNASDAQ   = exchange?.toUpperCase().includes('NASDAQ')

  const fmt = (v) => v == null ? '--' : (v >= 0 ? '+' : '') + v.toFixed(2) + '%'
  const shortLabel = (label, max = 22) =>
    label && label.length > max ? label.slice(0, max - 1) + '…' : label

  // Build and sort rows by performance
  const rows = [
    { key: 'indEtf', label: indEtfSym ? shortLabel(`${industry} (${indEtfSym})`) : null, pct: indEtfPct, isStock: false },
    { key: 'etf',    label: etfSymbol  ? `${sector} (${etfSymbol})`              : null, pct: etfPct,    isStock: false },
    { key: 'stock',  label: ticker,                                                        pct: stockPct,  isStock: true  },
    { key: 'spy',    label: benchLabel,                                                    pct: spyPct,    isStock: false },
    { key: 'rsp',    label: rspPct != null ? 'S&P 500 EW (RSP)' : null,                   pct: rspPct,    isStock: false },
    { key: 'qqq',    label: isNASDAQ && qqqPct != null ? 'NASDAQ 100 (QQQ)' : null,       pct: qqqPct,    isStock: false },
  ].filter(r => r.label && r.pct != null).sort((a, b) => b.pct - a.pct)

  const absMax = Math.max(...rows.map(r => Math.abs(r.pct ?? 0)), 1)

  const renderRow = (row) => {
    const isPos  = row.pct >= 0
    const color  = isPos ? '#16a34a' : '#dc2626'
    const barPct = Math.abs(row.pct) / absMax * 50

    return (
      <div key={row.key} className="flex items-center gap-3.5 mb-2">
        {/* Label */}
        <div
          className={cn(
            'w-[130px] shrink-0 text-[13px] truncate whitespace-nowrap overflow-hidden',
            row.isStock ? 'font-bold text-foreground' : 'font-normal text-muted-foreground'
          )}
        >
          {row.label}
        </div>

        {/* Centered bar track */}
        <div className="flex-1 h-2.5 rounded-full bg-muted relative overflow-hidden">
          {/* Center axis line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border z-10" />
          {/* Bar fill */}
          <div
            className="absolute top-0 h-full"
            style={{
              background:   color,
              left:         isPos ? '50%' : `${50 - barPct}%`,
              width:        `${barPct}%`,
              borderRadius: isPos ? '0 4px 4px 0' : '4px 0 0 4px',
              transition:   'all .4s ease',
            }}
          />
        </div>

        {/* % value */}
        <div
          className="w-[52px] shrink-0 text-[13px] font-semibold text-right whitespace-nowrap"
          style={{ color }}
        >
          {fmt(row.pct)}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        ↑↓ Market Performance
        <span className="text-[11px] font-normal normal-case tracking-normal ml-1">
          since {baseDate}
        </span>
      </div>
      <div className="flex flex-col">{rows.map(renderRow)}</div>
      {!sector && (
        <p className="text-[11px] text-muted-foreground italic mt-2">
          Fetch fundamentals to see sector ETF comparison
        </p>
      )}
      {sector && !etfSymbol && (
        <p className="text-[11px] text-muted-foreground italic mt-2">
          No sector ETF mapped for "{sector}"
        </p>
      )}
    </div>
  )
}

// ── FundamentalsPanel ─────────────────────────────────────────────────────────

/**
 * FundamentalsPanel
 *
 * Displays fundamental data fetched from FMP: sector, industry, market cap,
 * beta, last dividend, website link, and a "Read description" button.
 *
 * States:
 *   undefined = loading (not yet fetched)
 *   null      = error (fetch failed)
 *   object    = data available
 */
function FundamentalsPanel({ fundamental, ticker, onShowDesc }) {
  const lblClass = 'text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5'
  const valClass = 'text-[13px] font-semibold'

  // Format fetchedAt timestamp as "2 Jun 2026 14:32"
  const fetchedLabel = fundamental?.fetchedAt
    ? (() => {
        const d = new Date(fundamental.fetchedAt)
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
      })()
    : null

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-1.5 mb-2.5">
        <span className="text-xs font-semibold text-muted-foreground">▦ Fundamentals</span>
        {fetchedLabel && (
          <span className="text-[10px] text-muted-foreground italic">
            fetched {fetchedLabel}
          </span>
        )}
      </div>

      {fundamental === undefined && (
        <p className="text-xs text-muted-foreground italic">
          Click "Fetch fundamentals" to load data for {ticker}
        </p>
      )}

      {fundamental === null && (
        <p className="text-xs text-destructive">Fundamentals unavailable for {ticker}</p>
      )}

      {fundamental && (
        <div className="flex gap-7 flex-wrap items-start">
          <div><div className={lblClass}>Sector</div><div className={valClass}>{fundamental.sector || '--'}</div></div>
          <div><div className={lblClass}>Industry</div><div className={valClass}>{fundamental.industry || '--'}</div></div>
          <div><div className={lblClass}>Market Cap</div><div className={valClass}>{fmtMarketCap(fundamental.marketCap)}</div></div>
          <div><div className={lblClass}>Beta</div><div className={valClass}>{fundamental.beta ? fundamental.beta.toFixed(2) : '--'}</div></div>
          {fundamental.peTTM != null && (
            <div><div className={lblClass}>P/E TTM</div><div className={valClass}>{fundamental.peTTM.toFixed(1)}</div></div>
          )}
          {fundamental.pegTTM != null && (
            <div><div className={lblClass}>PEG TTM</div><div className={valClass}>{fundamental.pegTTM.toFixed(2)}</div></div>
          )}
          {fundamental.netMarginTTM != null && (
            <div><div className={lblClass}>Net Margin</div><div className={valClass}>{fundamental.netMarginTTM.toFixed(1)}%</div></div>
          )}
          {fundamental.roeTTM != null && (
            <div><div className={lblClass}>ROE</div><div className={valClass}>{(fundamental.roeTTM * 100).toFixed(1)}%</div></div>
          )}
          {fundamental.epsGrowthTTM != null && (
            <div><div className={lblClass}>EPS Growth</div><div className={valClass}>{fundamental.epsGrowthTTM.toFixed(1)}%</div></div>
          )}

          {fundamental.website && (
            <div>
              <div className={lblClass}>Website</div>
              <a
                href={fundamental.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-[13px] text-blue-600 font-medium no-underline hover:underline"
              >
                {fundamental.website.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            </div>
          )}

          {fundamental.description && (
            <div>
              <div className={lblClass}>About</div>
              <button
                onClick={e => { e.stopPropagation(); onShowDesc() }}
                className="text-xs text-blue-600 font-medium bg-transparent border-none p-0 cursor-pointer underline"
                style={{ fontFamily: 'inherit' }}
              >
                Read description ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
