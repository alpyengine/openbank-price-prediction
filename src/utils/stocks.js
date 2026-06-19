/**
 * stocks.js — Stock prediction utility functions
 *
 * Core logic for evaluating Openbank AI price predictions.
 * All verdict-related decisions in the app flow through these functions —
 * bars, boxes, badges, and batch save all use the same evaluation logic.
 *
 * Key concept — Unified verdict system:
 *   evaluatePrediction() is the single source of truth for all verdicts.
 *   No component should implement its own hit/miss logic.
 *
 * Verdict system (v7.3.0+):
 *   'exceeded'  — price surpassed target in the correct direction (bullish: above, bearish: below)
 *   'hit'       — price within ±H% of target (the sweet spot)
 *   'close'     — price between −H% and −(H×R)% of target (nearly there)
 *   'miss'      — price more than −(H×R)% away from target (didn't reach)
 *   'wrong_way' — price moved in the opposite direction to the forecast
 *   null        — no price available yet
 *
 * Two evaluation modes:
 *   snapshot — fixed parameters per horizon (stored in Supabase, used for Accuracy Stats)
 *   live     — dynamic parameters from slider (used in Batch Details, not stored)
 */
import { targetDates } from './dates.js'

// ── Snapshot parameters — fixed per horizon for Supabase storage ──────────────
//
// These values are used when saving a batch verdict to Supabase.
// They ensure ALL batches are evaluated with the same consistent criteria,
// making Accuracy Stats and Batch Overview comparable across all batches.
//
// H = hit margin % (symmetric band around target)
// R = close ratio (close threshold = H × R below target)
//
// Statistical rationale:
//   1M  H=3%:  daily vol ~1-2%, ±3% = 1-2 trading days of noise
//   3M  H=5%:  industry standard for 3M analyst targets
//   6M  H=7%:  allows for macro events; ratio 1.8× to avoid too-wide miss band
//   12M H=10%: typical AI model annual tracking error; ratio 1.6× for balance
//
export const SNAPSHOT_PARAMS = {
  '1M':  { H: 3,  R: 2.0 },   // close: −3% to −6%,    miss: < −6%
  '3M':  { H: 5,  R: 2.0 },   // close: −5% to −10%,   miss: < −10%
  '6M':  { H: 7,  R: 1.8 },   // close: −7% to −12.6%, miss: < −12.6%
  '12M': { H: 10, R: 1.6 },   // close: −10% to −16%,  miss: < −16%
}

// Default close ratio for live (slider) mode in Batch Details
// Exported so UI components can use it as the default value
export const CLOSE_RATIO_DEFAULT = 2.4

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
 * Format: "TICKER_HORIZON" e.g. "TER_1M", "MU_12M"
 *
 * @param {string} ticker  — stock ticker
 * @param {string} horizon — horizon key
 * @returns {string}
 */
export function histKey(ticker, horizon) {
  return `${ticker}_${horizon}`
}

/**
 * getEffectivePrice — resolves which price to use for a stock/horizon pair.
 *
 * Price resolution priority (highest to lowest):
 *   1. Manual override (user-entered price) — always takes precedence
 *   2. Historical close price (for expired horizons) — from histPrices cache
 *   3. Current auto-fetched price (from Twelve Data API)
 *   4. null — no price available
 *
 * IMPORTANT: each horizon column must call this with its OWN horizon key,
 * not the globally selected horizon. This ensures closed columns (e.g. 1M)
 * always show their historical price even when the user selects 3M in the dropdown.
 *
 * @param {string}  ticker          — stock ticker
 * @param {string}  horizon         — the SPECIFIC horizon for this column (not global)
 * @param {Object}  autoPrices      — { [ticker]: number } current prices
 * @param {Object}  histPrices      — { [ticker_horizon]: { price, date } }
 * @param {Object}  overrides       — { [ticker]: number } manual overrides
 * @param {boolean} horizonExpired  — true if this specific horizon's target date has passed
 * @param {boolean} [snapshot=false] — true when settling a batch save. In this mode an
 *                  expired horizon must use its real closing price; if none is available
 *                  the current price is NOT used as a fallback — null is returned so the
 *                  verdict stays 'awaiting' (the cron settles it later). Live callers omit
 *                  this and keep the current-price fallback for provisional display.
 * @returns {{ price: number|null, isHistorical: boolean, historicalDate: string|null }}
 */
export function getEffectivePrice(ticker, horizon, autoPrices, histPrices, overrides, horizonExpired, snapshot = false) {
  // 1. Manual override always wins
  const ov = overrides[ticker]
  if (ov && ov > 0) return { price: ov, isHistorical: false, historicalDate: null }

  // 2. Historical close price — only for expired non-best horizons
  if (horizonExpired && horizon !== 'best') {
    const key  = histKey(ticker, horizon)
    const hist = histPrices[key]
    if (hist && hist.price) {
      return { price: hist.price, isHistorical: true, historicalDate: hist.date }
    }
    // Snapshot mode (batch save): an expired horizon must be settled with its
    // real closing price. If the historical close isn't loaded, do NOT fall back
    // to the current price — return null so the verdict stays 'awaiting' and the
    // cron (save_expired_verdict) settles it later with the real close. (v7.9.1)
    if (snapshot) return { price: null, isHistorical: false, historicalDate: null }
  }

  // 3. Current auto-fetched price (live display only — never settles an expired snapshot)
  const au = autoPrices[ticker]
  if (au && au > 0) return { price: au, isHistorical: false, historicalDate: null }

  return { price: null, isHistorical: false, historicalDate: null }
}

/**
 * effectivePrice — simplified price resolver for use outside React components.
 * Returns just the price number (override > auto > null).
 *
 * @param {string} ticker     — stock ticker
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
 * Computed as (price - target) / target × 100.
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
 * THE single source of truth for all verdict decisions in the app.
 * Used by SummaryCards, StockRow bars, HorizonCards, BatchSimple, and saveBatch.
 *
 * --- DIRECTION ---
 * A prediction's direction is determined by target vs base price:
 *   bullish → target > base  (Openbank expects price to rise)
 *   bearish → target < base  (Openbank expects price to fall)
 *   neutral → target = base
 *
 * --- VERDICTS ---
 * exceeded  — price surpassed the target in the correct direction
 *             bullish: price > target + H%
 *             bearish: price < target - H%
 *             Colour: blue. Counts as success in extended hit rate.
 *
 * hit       — price landed within ±H% of target (the sweet spot)
 *             Colour: green. Counts as success in both hit rates.
 *
 * close     — price is between −H% and −(H×closeRatio)% of target
 *             Got close but didn't reach. Not a success.
 *             Colour: amber.
 *
 * miss      — price is more than −(H×closeRatio)% below target
 *             Clearly didn't reach the forecast.
 *             Colour: red.
 *
 * wrong_way — price moved in the opposite direction to the forecast
 *             bullish prediction but price dropped well below base,
 *             or bearish prediction but price rose well above base.
 *             Colour: purple.
 *
 * --- TWO MODES ---
 * snapshot mode: pass horizon string — uses SNAPSHOT_PARAMS fixed values
 *                Used when saving to Supabase (consistent across all batches)
 *
 * live mode:     pass hitMargin + closeRatio from slider
 *                Used in Batch Details for interactive analysis (not saved)
 *
 * --- BACKWARDS COMPATIBILITY ---
 * Existing callers passing only (price, target, base, margin) still work.
 * They use live mode with closeRatio = CLOSE_RATIO_DEFAULT.
 *
 * @param {number|null} price       — current or historical price
 * @param {number|null} target      — forecast target price
 * @param {number}      basePrice   — price on the day forecast was published
 * @param {number}      hitMargin   — hit tolerance % for live mode (default 5)
 * @param {object}      [opts]      — optional settings
 * @param {string}      [opts.horizon]    — horizon key for snapshot mode ('1M'|'3M'|'6M'|'12M')
 * @param {number}      [opts.closeRatio] — close zone multiplier for live mode (default 2.4)
 * @returns {{
 *   verdict:   'exceeded'|'hit'|'close'|'miss'|'wrong_way'|null,
 *   direction: 'bullish'|'bearish'|'neutral',
 *   distAbs:   number,
 *   H:         number,
 *   closeThreshold: number
 * }}
 */
export function evaluatePrediction(price, target, basePrice, hitMargin = 5, opts = {}) {
  if (price == null || target == null) return { verdict: null, direction: 'neutral', distAbs: 0, H: hitMargin, closeThreshold: hitMargin * CLOSE_RATIO_DEFAULT }

  // Determine direction from target vs base
  const direction = target > basePrice ? 'bullish'
                  : target < basePrice ? 'bearish'
                  : 'neutral'

  // Resolve H and R based on mode:
  //   snapshot mode → use SNAPSHOT_PARAMS for the given horizon
  //   live mode     → use hitMargin + closeRatio from caller
  let H, R
  if (opts.horizon && SNAPSHOT_PARAMS[opts.horizon]) {
    // Snapshot mode — fixed params for this horizon
    H = SNAPSHOT_PARAMS[opts.horizon].H
    R = SNAPSHOT_PARAMS[opts.horizon].R
  } else {
    // Live mode — dynamic params from slider
    H = hitMargin
    R = opts.closeRatio ?? CLOSE_RATIO_DEFAULT
  }

  // closeThreshold = H × R  (e.g. H=5, R=2.0 → 10% below target = miss)
  const closeThreshold = H * R

  // Signed distance: positive = above target, negative = below target
  const signedDist = (price - target) / target * 100
  // Unsigned distance for proximity checks
  const distAbs = Math.abs(signedDist)

  let verdict

  if (direction === 'bullish') {
    // Bullish: target > base, we want price to rise to/above target
    if (price > target * (1 + H / 100)) {
      // Price surpassed target by more than H% → exceeded
      verdict = 'exceeded'
    } else if (distAbs <= H) {
      // Price within ±H% of target → hit
      verdict = 'hit'
    } else if (signedDist < 0 && distAbs <= closeThreshold) {
      // Price below target but within close threshold → close
      verdict = 'close'
    } else if (signedDist < 0 && distAbs > closeThreshold) {
      // Price significantly below target → miss or wrong_way
      // wrong_way: price fell below base (went the opposite direction)
      verdict = price < basePrice ? 'wrong_way' : 'miss'
    } else {
      // Price below target but outside close threshold
      verdict = 'miss'
    }
  } else if (direction === 'bearish') {
    // Bearish: target < base, we want price to fall to/below target
    if (price < target * (1 - H / 100)) {
      // Price dropped more than H% below target → exceeded
      verdict = 'exceeded'
    } else if (distAbs <= H) {
      // Price within ±H% of target → hit
      verdict = 'hit'
    } else if (signedDist > 0 && distAbs <= closeThreshold) {
      // Price above target but within close threshold → close
      verdict = 'close'
    } else if (signedDist > 0 && distAbs > closeThreshold) {
      // Price significantly above target → miss or wrong_way
      // wrong_way: price rose above base (went the opposite direction)
      verdict = price > basePrice ? 'wrong_way' : 'miss'
    } else {
      verdict = 'miss'
    }
  } else {
    // Neutral direction: just check proximity
    verdict = distAbs <= H ? 'hit' : 'miss'
  }

  return { verdict, direction, distAbs, H, closeThreshold }
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
