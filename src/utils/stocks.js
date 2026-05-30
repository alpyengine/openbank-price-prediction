/**
 * stocks.js — Stock prediction utility functions
 *
 * Core logic for evaluating Openbank price predictions.
 * All verdict-related decisions in the app flow through these functions —
 * bars, boxes, badges, and batch save all use the same evaluation logic.
 *
 * Key concept — Unified verdict system (v6.5.6+):
 *   evaluatePrediction() is the single source of truth for all verdicts.
 *   No component should implement its own hit/miss logic.
 */
import { targetDates } from './dates.js'

// ── Target price accessors ────────────────────────────────────────────────────

/**
 * Returns the target price for a given horizon.
 * For 'best', returns the highest target across all horizons.
 *
 * @param {Object} stock   — stock object { t1, t3, t6, t12 }
 * @param {string} horizon — '1M' | '3M' | '6M' | '12M' | 'best'
 * @returns {number|null}
 */
export function getTarget(stock, horizon) {
  if (horizon === '1M')  return stock.t1
  if (horizon === '3M')  return stock.t3
  if (horizon === '6M')  return stock.t6
  if (horizon === '12M') return stock.t12
  return Math.max(stock.t1, stock.t3, stock.t6, stock.t12)
}

/**
 * Returns the target date for a given horizon.
 * For 'best', returns the date of the highest target horizon.
 * Returns null if the stock has no base date.
 *
 * @param {Object} stock   — stock object with .base Date
 * @param {string} horizon — '1M' | '3M' | '6M' | '12M' | 'best'
 * @returns {Date|null}
 */
export function getTargetDate(stock, horizon) {
  if (!stock.base) return null
  const tg = targetDates(stock.base)
  if (horizon === '1M')  return tg.d1
  if (horizon === '3M')  return tg.d3
  if (horizon === '6M')  return tg.d6
  if (horizon === '12M') return tg.d12
  const best = Math.max(stock.t1, stock.t3, stock.t6, stock.t12)
  if (best === stock.t12) return tg.d12
  if (best === stock.t6)  return tg.d6
  if (best === stock.t3)  return tg.d3
  return tg.d1
}

// ── Price resolution ──────────────────────────────────────────────────────────

/**
 * Builds the key used to look up historical prices in the histPrices map.
 * Format: "TICKER_HORIZON" e.g. "TER_1M", "SLB.US_12M"
 *
 * @param {string} ticker  — stock ticker
 * @param {string} horizon — horizon key
 * @returns {string}
 */
export function histKey(ticker, horizon) {
  return `${ticker}_${horizon}`
}

/**
 * getEffectivePrice — resolves which price to display for a stock/horizon.
 *
 * Price resolution priority:
 *   1. Manual override (user-entered price) — always takes precedence
 *   2. Historical close price (for expired horizons) — from histPrices
 *   3. Current auto-fetched price (from Twelve Data API)
 *   4. null — no price available
 *
 * @param {string}  ticker          — stock ticker
 * @param {string}  horizon         — horizon key
 * @param {Object}  autoPrices      — { [ticker]: number } current prices
 * @param {Object}  histPrices      — { [ticker_horizon]: { price, date } }
 * @param {Object}  overrides       — { [ticker]: number } manual overrides
 * @param {boolean} horizonExpired  — true if target date has passed
 * @returns {{ price: number|null, isHistorical: boolean, historicalDate: string|null }}
 */
export function getEffectivePrice(ticker, horizon, autoPrices, histPrices, overrides, horizonExpired) {
  // 1. Manual override takes priority
  const ov = overrides[ticker]
  if (ov && ov > 0) return { price: ov, isHistorical: false, historicalDate: null }

  // 2. Historical close price (only for expired non-best horizons)
  if (horizonExpired && horizon !== 'best') {
    const key  = histKey(ticker, horizon)
    const hist = histPrices[key]
    if (hist && hist.price) {
      return { price: hist.price, isHistorical: true, historicalDate: hist.date }
    }
  }

  // 3. Current auto-fetched price
  const au = autoPrices[ticker]
  if (au && au > 0) return { price: au, isHistorical: false, historicalDate: null }

  return { price: null, isHistorical: false, historicalDate: null }
}

/**
 * effectivePrice — simplified version for use outside React components.
 * Returns just the price number (override > auto > null).
 *
 * @param {string} ticker    — stock ticker
 * @param {Object} autoPrices — { [ticker]: number }
 * @param {Object} overrides  — { [ticker]: number }
 * @returns {number|null}
 */
export function effectivePrice(ticker, autoPrices, overrides) {
  const ov = overrides[ticker]
  if (ov && ov > 0) return ov
  const au = autoPrices[ticker]
  if (au && au > 0) return au
  return null
}

// ── Verdict evaluation ────────────────────────────────────────────────────────

/**
 * distancePct — percentage distance from price to target.
 * Always computed as (price - target) / target × 100.
 * Positive = price above target. Negative = price below target.
 *
 * @param {number|null} price  — current or historical price
 * @param {number|null} target — forecast target price
 * @returns {number|null} percentage or null if either input is missing
 */
export function distancePct(price, target) {
  if (price == null || !target) return null
  return (price - target) / target * 100
}

/**
 * evaluatePrediction — direction-aware prediction evaluation.
 *
 * THE single source of truth for all verdict decisions in the app (v6.5.6+).
 * Used by SummaryCards, StockRow bars, HorizonCards, BatchSimple, and saveBatch.
 *
 * A prediction has a DIRECTION based on target vs base price:
 *   bullish  → target > base  (Openbank expects price to rise)
 *   bearish  → target < base  (Openbank expects price to fall)
 *   neutral  → target = base
 *
 * HIT criteria:
 *   bullish: price >= target   (price reached or exceeded the forecast)
 *   bearish: price <= target   (price dropped to the target or below)
 *   neutral: price within ±margin% of target
 *
 * CLOSE: price within ±margin% of target but hasn't technically hit it.
 * MISS:  price is more than ±margin% away from target.
 *
 * @param {number|null} price     — current or historical price
 * @param {number|null} target    — forecast target price
 * @param {number}      basePrice — price on the day the forecast was published
 * @param {number}      margin    — hit tolerance in % (default 5)
 * @returns {{ verdict: 'hit'|'close'|'miss'|null, direction: 'bullish'|'bearish'|'neutral', distAbs: number }}
 */
export function evaluatePrediction(price, target, basePrice, margin = 5) {
  if (price == null || target == null) return { verdict: null, direction: 'neutral' }

  const direction = target > basePrice ? 'bullish'
                  : target < basePrice ? 'bearish'
                  : 'neutral'

  // Unsigned distance for proximity check (hit margin)
  const distAbs = Math.abs((price - target) / target * 100)
  const isClose = distAbs <= margin

  let verdict
  if (direction === 'bullish') {
    if (price >= target) verdict = 'hit'
    else if (isClose)    verdict = 'close'
    else                 verdict = 'miss'
  } else if (direction === 'bearish') {
    if (price <= target) verdict = 'hit'
    else if (isClose)    verdict = 'close'
    else                 verdict = 'miss'
  } else {
    verdict = isClose ? 'hit' : 'miss'
  }

  return { verdict, direction, distAbs }
}

/**
 * priceStatus — legacy proximity helper (pre-v3.1.0).
 * Kept for backwards compatibility with older test code.
 * Use evaluatePrediction() for all new code.
 *
 * @deprecated Use evaluatePrediction() instead
 */
export function priceStatus(price, target, margin = 5) {
  if (price == null) return null
  const ad = Math.abs(distancePct(price, target))
  if (ad <= margin)      return 'hit'
  if (ad <= margin * 3)  return 'close'
  return 'below'
}

// ── Sample data ───────────────────────────────────────────────────────────────

/**
 * DEFAULT_STOCKS — built-in sample batch for testing and onboarding.
 * Loaded when user clicks "Sample data" in ImportBox.
 * Based on real Openbank forecasts from March 2026.
 */
export const DEFAULT_STOCKS = [
  { t: 'TER', co: 'Teradyne',         cu: 'USD', b: 299.40, t1: 353.92, t3: 257.57, t6: 341.91, t12: 790.98, base: new Date(2026, 2, 18) },
  { t: 'HWM', co: 'Howmet Aerospace', cu: 'USD', b: 240.24, t1: 250.45, t3: 260.90, t6: 269.81, t12: 456.70, base: new Date(2026, 2, 18) },
  { t: 'NEM', co: 'Newmont',          cu: 'USD', b: 52.80,  t1: 55.10,  t3: 58.20,  t6: 61.50,  t12: 72.00,  base: new Date(2026, 2, 18) },
  { t: 'APA', co: 'APA Corp',         cu: 'USD', b: 19.50,  t1: 21.00,  t3: 22.50,  t6: 24.00,  t12: 30.00,  base: new Date(2026, 2, 18) },
  { t: 'HAL', co: 'Halliburton',      cu: 'USD', b: 28.90,  t1: 31.50,  t3: 33.20,  t6: 35.80,  t12: 45.00,  base: new Date(2026, 2, 18) },
]
