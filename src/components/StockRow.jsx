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

// ── Horizon state vocabulary + direction-aware helpers (v7.9.5) ───────────────
// Shared by the collapsed-row cells and the HorizonCards.
// SETTLED — verdict for an expired horizon (real close available).
const SETTLED = {
  hit:       { pill: '🎯 HIT',     txt: 'text-green-700',  badge: 'bg-green-50 text-green-700 border-green-200',    card: 'border-green-200' },
  exceeded:  { pill: '▲ EXCEED',   txt: 'text-blue-700',   badge: 'bg-blue-50 text-blue-700 border-blue-200',       card: 'border-blue-200'  },
  close:     { pill: '◑ CLOSE',    txt: 'text-amber-700',  badge: 'bg-amber-50 text-amber-700 border-amber-200',    card: 'border-amber-200' },
  miss:      { pill: '▼ MISS',     txt: 'text-red-700',    badge: 'bg-red-50 text-red-700 border-red-200',          card: 'border-red-200'   },
  wrong_way: { pill: '⤬ WRONG',    txt: 'text-purple-700', badge: 'bg-purple-50 text-purple-700 border-purple-200', card: 'border-purple-200'},
}
// LIVE — tracking state for a future horizon, direction-aware (v7.9.6).
// Arrows here reflect the FORECAST direction (needed move), never a contradictory
// price arrow: ✓ sobrepasado (reached/overshot) · ↑/↓ falta subir/bajar · ⤬ en contra.
const liveDisplay = (state, dir) => {
  if (state === 'against') return { pill: '⤬ en contra',  txt: 'text-red-700'   }
  if (state === 'ahead')   return { pill: '✓ sobrepasado', txt: 'text-green-700' }
  return { pill: dir === 1 ? '↑ falta subir' : '↓ falta bajar', txt: 'text-amber-700' }
}
// Forecast direction of a horizon: +1 bullish (target above base), −1 bearish.
const fdir = (target, base) => (target >= base ? 1 : -1)
// Direction-aware gap vs target: +% = toward/beyond target (good); −% = short/against (bad).
const signedPct = (price, target, base) => ((price - target) / target) * 100 * fdir(target, base)
// Live state from today's price vs target, relative to the forecast direction.
const liveState = (price, target, base) => {
  const dir      = fdir(target, base)
  const wrongWay = dir === 1 ? price < base : price > base
  const reached  = dir === 1 ? price >= target : price <= target
  const d        = ((price - target) / target) * 100
  return wrongWay ? 'against' : reached ? 'ahead' : Math.abs(d) <= 12 ? 'ontrack' : 'behind'
}
// "esperaba ↑/↓" cue — only meaningful for wrong/against (price went the other way).
const expArrow = (target, base) => (fdir(target, base) === 1 ? '↑' : '↓')

// ── Main StockRow ─────────────────────────────────────────────────────────────

const StockRow = memo(function StockRow({
  stock, horizon, autoPrice, histPrices, override, horizonExpired,
  fundamental, onOverrideChange, note, onNoteChange,
  marketData, collapseAll, allExpanded, batchCurrency, hitMargin = 5, batchId, totalCols = 17, closeRatio = 2.4,
  isWatched = false, onToggleWatchlist, rowId, highlight = false,
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
        id={rowId}
        className={cn(
          'cursor-pointer transition-colors hover:bg-muted',
          highlight && 'bg-amber-100 dark:bg-amber-500/20',
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

          // ── Compact horizon indicator (v7.9.5) ─────────────────────────
          // Headline = the forecast (target) price; below it the state and a
          // direction-aware % (+ "esperaba ↑/↓" when the price went the wrong way).
          const noForecast = !t || t <= 0
          const colExpired = ds === 'past'
          const soonDays   = date ? daysLeft(date) : null
          const colSoon    = !colExpired && soonDays != null && soonDays >= 0 && soonDays < 15
          const { price: rp } = getEffectivePrice(
            stock.t, hKey,
            { [stock.t]: autoPrice },
            histPrices,
            override ? { [stock.t]: override } : {},
            colExpired, /* snapshot */ true,
          )
          const settled  = colExpired && rp != null && !noForecast
          const rVerdict = settled ? evaluatePrediction(rp, t, stock.b, hitMargin, { horizon: hKey }).verdict : null
          const lstate   = (!noForecast && !colExpired && autoPrice != null) ? liveState(autoPrice, t, stock.b) : null

          const sv   = rVerdict ? SETTLED[rVerdict] : null
          const lv   = lstate   ? liveDisplay(lstate, fdir(t, stock.b)) : null
          const sPct = settled ? signedPct(rp, t, stock.b)
                     : (lstate ? signedPct(autoPrice, t, stock.b) : null)
          const pctCol = sPct == null ? 'text-muted-foreground'
                       : (rVerdict === 'wrong_way' || lstate === 'against' || rVerdict === 'miss') ? 'text-destructive'
                       : sPct >= 0 ? 'text-success' : 'text-amber-600'
          const showExp = rVerdict === 'wrong_way' || lstate === 'against'
          const fcCol = colSoon ? 'text-orange-600 dark:text-orange-400'
                      : settled  ? 'text-foreground'
                      : 'text-blue-900 dark:text-blue-300'

          return (
            <td key={i} className={cn(tdClass, 'min-w-[64px] text-center align-top')}>
              {noForecast ? (
                <div className="flex flex-col items-center gap-0.5 text-muted-foreground leading-none">
                  <span className="text-[13px]">—</span>
                  <span className="text-[9px] font-semibold">N/D</span>
                </div>
              ) : (colExpired && !settled) ? (
                <div className="flex flex-col items-center gap-0.5 leading-none">
                  <span className="text-[8px] font-semibold text-muted-foreground uppercase">previsto</span>
                  <span className="text-[13px] font-bold text-foreground">{batchCurrency ?? ''}{t.toFixed(2)}</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5">⏳ sin cierre</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-0.5 leading-none">
                  <span className="text-[8px] font-semibold text-muted-foreground uppercase">previsto</span>
                  <span className={cn('text-[13px] font-extrabold', fcCol)}>{batchCurrency ?? ''}{t.toFixed(2)}</span>
                  {(sv || lv) && (
                    <span className={cn('text-[10px] font-bold mt-0.5', (sv ?? lv).txt)}>{(sv ?? lv).pill}</span>
                  )}
                  {sPct != null && (
                    <span className={cn('text-[9px] font-semibold', pctCol)}>
                      {sPct >= 0 ? '+' : ''}{sPct.toFixed(1)}%{showExp ? ` · esperaba ${expArrow(t, stock.b)}` : ''}
                    </span>
                  )}
                </div>
              )}
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
 * HorizonCards (v7.9.6)
 *
 * One card per horizon. Each card opens with a base-reference strip
 * ("base {price} · {base date} · bajista↓ / alcista↑") so the forecast
 * direction is always visible — that's the context that makes a bearish
 * "objetivo > hoy" read as good instead of "fell short".
 *
 * Big line: two prices the same size — "objetivo {target} {↑/↓} cerró/hoy {price}".
 * The separator arrow follows the REAL price move vs the base (price ≥ base → ↑,
 * else ↓), so a falling price never shows an upward arrow.
 *
 * Direction-aware %: signedPct() → "+%" toward/beyond target (good), "−%" short
 * or against (bad), for bull and bear alike. Live state vocabulary is
 * direction-aware too: ✓ sobrepasado · ↑/↓ falta subir/bajar · ⤬ en contra.
 * (The base strip carries the direction, so no extra "esperaba" cue is needed.)
 *
 * Settled verdict (HIT/EXCEED/CLOSE/MISS/WRONG) unchanged · expired-no-close
 * AWAITING "sin cierre aún" · not imported N/D. Objetivo turns orange + "⏱ Nd"
 * within 15 days of expiry.
 */
function HorizonCards({ stock, tg, autoPrice, histPrices, override, batchCurrency, hitMargin = 5 }) {
  if (!tg) return null
  const cu = batchCurrency ?? '$'
  const SOON_DAYS = 15
  const baseDateStr = stock.base ? formatDate(stock.base) : '?'

  const horizons = [
    { key: '1M',  target: stock.t1,  date: tg.d1  },
    { key: '3M',  target: stock.t3,  date: tg.d3  },
    { key: '6M',  target: stock.t6,  date: tg.d6  },
    { key: '12M', target: stock.t12, date: tg.d12 },
  ]

  const cards = horizons.map(({ key, target, date }) => {
    const noForecast = !target || target <= 0
    const expired    = date ? dateStatus(date) === 'past' : false
    const dleft      = date ? daysLeft(date) : null
    const soon       = !expired && dleft != null && dleft >= 0 && dleft < SOON_DAYS
    const { price: rp } = getEffectivePrice(
      stock.t, key, { [stock.t]: autoPrice }, histPrices ?? {},
      override ? { [stock.t]: override } : {}, expired, /* snapshot */ true,
    )
    const settled  = expired && rp != null && !noForecast
    const rVerdict = settled ? evaluatePrediction(rp, target, stock.b, hitMargin, { horizon: key }).verdict : null
    const lstate   = (!noForecast && !expired && autoPrice != null) ? liveState(autoPrice, target, stock.b) : null
    return { key, target, date, noForecast, expired, dleft, soon, rp, settled, rVerdict, lstate }
  })

  const settledCards = cards.filter(c => c.settled)
  const wins         = settledCards.filter(c => c.rVerdict === 'hit' || c.rVerdict === 'exceeded').length
  const targets      = cards.map(c => c.target).filter(t => t && t > 0)
  const best         = targets.length ? Math.max(...targets) : null
  const bestLabel    = best === stock.t12 ? '12M' : best === stock.t6 ? '6M' : best === stock.t3 ? '3M' : '1M'
  const todayVsBest  = (autoPrice && best) ? signedPct(autoPrice, best, stock.b) : null

  // Base-reference strip — shows the batch base price + forecast direction of this horizon.
  const BaseStrip = ({ target }) => {
    const bear = target < stock.b
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-2 pb-1.5 border-b border-dashed border-border">
        <span>base <b className="text-foreground font-semibold text-[11px]">{cu}{(stock.b ?? 0).toFixed(2)}</b></span>
        <span>· {baseDateStr}</span>
        <span className={cn('ml-auto font-bold px-1.5 py-0.5 rounded-full text-[9px] whitespace-nowrap', bear ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700')}>
          {bear ? 'bajista ↓' : 'alcista ↑'}
        </span>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><span>◎</span> Horizon Results</span>
        {(settledCards.length > 0 || todayVsBest != null) && (
          <span className="text-[11px] text-muted-foreground text-right leading-tight">
            {settledCards.length > 0 && (<><b className="text-foreground font-semibold">{wins}/{settledCards.length}</b> vencidos acertados</>)}
            {settledCards.length > 0 && todayVsBest != null && ' · '}
            {todayVsBest != null && (<>hoy <b className={cn('font-semibold', todayVsBest >= 0 ? 'text-success' : 'text-destructive')}>{todayVsBest >= 0 ? '+' : ''}{todayVsBest.toFixed(0)}%</b> vs obj. {bestLabel}</>)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {cards.map(({ key, target, date, noForecast, expired, dleft, soon, rp, settled, rVerdict, lstate }) => {

          /* ── NO FORECAST ─────────────────────────────────────────────── */
          if (noForecast) {
            return (
              <div key={key} className="bg-card/40 rounded-lg px-4 py-3.5 border border-dashed border-border">
                <div className="flex justify-between items-center mb-2 gap-1">
                  <span className="text-[11px] text-muted-foreground font-medium">{key}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border whitespace-nowrap">⨯ N/D</span>
                </div>
                <div className="text-lg font-bold mb-1 text-muted-foreground">—</div>
                <div className="text-[11px] text-muted-foreground leading-snug">
                  <span className="text-foreground font-semibold">Sin previsión a {key}</span><br />no incluida en este batch
                </div>
              </div>
            )
          }

          const priceArrow = (val) => (val != null && stock.b != null && val < stock.b) ? '↓' : '↑'

          /* ── SETTLED ─────────────────────────────────────────────────── */
          if (settled) {
            const v     = SETTLED[rVerdict] ?? SETTLED.miss
            const sp    = signedPct(rp, target, stock.b)
            const spCol = (rVerdict === 'wrong_way' || rVerdict === 'miss') ? 'text-destructive' : sp >= 0 ? 'text-success' : 'text-amber-600'
            return (
              <div key={key} className={cn('bg-card rounded-lg px-4 py-3.5 border', v.card)}>
                <div className="flex justify-between items-center mb-2 gap-1">
                  <span className="text-[11px] text-muted-foreground font-medium">{key}</span>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap', v.badge)}>{v.pill}</span>
                </div>
                <BaseStrip target={target} />
                <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 items-end mb-1.5">
                  <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">objetivo</span>
                  <span></span>
                  <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">cerró</span>
                  <span className="text-lg font-bold text-foreground leading-none">{cu}{target.toFixed(2)}</span>
                  <span className="text-muted-foreground self-center text-sm">{priceArrow(rp)}</span>
                  <span className="text-lg font-bold text-foreground leading-none">{cu}{rp.toFixed(2)}</span>
                </div>
                <div className="text-[11px] flex items-center gap-1.5 flex-wrap">
                  <span className={cn('font-bold', v.txt)}>{v.pill}</span>
                  <span className={cn('font-semibold', spCol)}>{sp >= 0 ? '+' : ''}{sp.toFixed(1)}%</span>
                  <span className="text-muted-foreground">· {date ? formatDate(date) : '--'}</span>
                </div>
              </div>
            )
          }

          /* ── EXPIRED, no close yet ───────────────────────────────────── */
          if (expired) {
            return (
              <div key={key} className="bg-card rounded-lg px-4 py-3.5 border border-border">
                <div className="flex justify-between items-center mb-2 gap-1">
                  <span className="text-[11px] text-muted-foreground font-medium">{key}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border whitespace-nowrap">⏳ AWAITING</span>
                </div>
                <BaseStrip target={target} />
                <div className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">objetivo</div>
                <div className="text-lg font-bold text-foreground leading-none mb-1.5">{cu}{target.toFixed(2)}</div>
                <div className="text-[11px] text-muted-foreground">{date ? formatDate(date) : '--'} · <span className="text-destructive font-medium">vencido</span> · sin cierre aún</div>
              </div>
            )
          }

          /* ── FUTURE ──────────────────────────────────────────────────── */
          const dir     = fdir(target, stock.b)
          const lv      = lstate ? liveDisplay(lstate, dir) : null
          const sp      = autoPrice != null ? signedPct(autoPrice, target, stock.b) : null
          const spCol   = lstate === 'against' ? 'text-destructive' : sp == null ? 'text-muted-foreground' : sp >= 0 ? 'text-success' : 'text-amber-600'
          const hoyCol  = lstate === 'against' ? 'text-destructive' : lstate === 'ahead' ? 'text-success' : 'text-amber-600'
          const objCol  = soon ? 'text-orange-600 dark:text-orange-400' : 'text-blue-900 dark:text-blue-300'
          return (
            <div key={key} className="bg-card rounded-lg px-4 py-3.5 border border-border">
              <div className="flex justify-between items-center mb-2 gap-1">
                <span className="text-[11px] text-muted-foreground font-medium">{key}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border whitespace-nowrap">⏳ AWAITING</span>
              </div>
              <BaseStrip target={target} />
              <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 items-end mb-1.5">
                <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">objetivo</span>
                <span></span>
                <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">hoy</span>
                <span className={cn('text-lg font-bold leading-none', objCol)}>
                  {cu}{target.toFixed(2)}
                  {soon && <span className="ml-1 align-middle text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900">⏱ {dleft}d</span>}
                </span>
                <span className="text-muted-foreground self-center text-sm">{autoPrice != null ? priceArrow(autoPrice) : '→'}</span>
                <span className={cn('text-lg font-bold leading-none', autoPrice != null ? hoyCol : 'text-muted-foreground')}>{autoPrice != null ? `${cu}${autoPrice.toFixed(2)}` : '--'}</span>
              </div>
              {lv && (
                <div className="text-[11px] flex items-center gap-1.5 flex-wrap">
                  <span className={cn('font-bold', lv.txt)}>{lv.pill}</span>
                  {sp != null && <span className={cn('font-semibold', spCol)}>{sp >= 0 ? '+' : ''}{sp.toFixed(1)}%</span>}
                  <span className="text-muted-foreground">· {date ? formatDate(date) : '--'}</span>
                </div>
              )}
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
