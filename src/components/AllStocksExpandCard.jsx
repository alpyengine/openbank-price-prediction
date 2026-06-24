/**
 * AllStocksExpandCard.jsx (v7.13.1)
 *
 * Read-only expandable card for the All Stocks table. Reuses HorizonCards and
 * FundamentalsPanel copied VERBATIM from StockRow.jsx (Batch Detail is left
 * untouched — intentional duplication, per "duplicate first, don't delete").
 *
 * Differences vs Batch Detail: no override editing, no notes, no MarketComparison.
 * Settled verdicts (hit/miss with the real close) require dated historical prices
 * which All Stocks does not have per instance, so expired horizons show
 * "awaiting / vencido" rather than a settled verdict (graceful degradation).
 */
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatDate, targetDates, daysLeft, dateStatus } from '@/utils/dates.js'
import { getEffectivePrice, evaluatePrediction } from '@/utils/stocks.js'
import { fmtMarketCap } from '@/hooks/useFundamentals.js'
import PriceChart from './PriceChart.jsx'

// ── Horizon state vocabulary + direction-aware helpers (copied from StockRow) ──
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

// ── Read-only wrapper for All Stocks ──────────────────────────────────────────
export default function AllStocksExpandCard({
  stock, autoPrice, histPrices = {}, fundamental,
  batchCurrency = '$', hitMargin = 5, batchId,
}) {
  const [showDesc, setShowDesc] = useState(false)
  const tg = stock.base ? targetDates(stock.base) : null

  return (
    <div>
      <HorizonCards
        stock={stock} tg={tg}
        autoPrice={autoPrice} histPrices={histPrices} override={null}
        batchCurrency={batchCurrency} hitMargin={hitMargin}
      />

      <FundamentalsPanel
        fundamental={fundamental}
        ticker={stock.t}
        onShowDesc={() => setShowDesc(true)}
      />

      {batchId && (
        <div className="mt-3">
          <PriceChart stock={stock} batchId={batchId} />
        </div>
      )}

      {showDesc && fundamental?.description && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowDesc(false)}
        >
          <div
            className="bg-card border border-border rounded-xl max-w-lg max-h-[70vh] overflow-auto p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2 gap-3">
              <h3 className="font-bold text-foreground text-sm">{stock.tDisplay || stock.t} — About</h3>
              <button
                onClick={() => setShowDesc(false)}
                className="text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer text-lg leading-none"
                aria-label="Close"
              >✕</button>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">{fundamental.description}</p>
          </div>
        </div>
      )}
    </div>
  )
}
