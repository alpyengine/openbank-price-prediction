import { targetDates } from './dates.js'

export function getTarget(stock, horizon) {
  if (horizon === '1M')  return stock.t1
  if (horizon === '3M')  return stock.t3
  if (horizon === '6M')  return stock.t6
  if (horizon === '12M') return stock.t12
  return Math.max(stock.t1, stock.t3, stock.t6, stock.t12)
}

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

export function effectivePrice(ticker, autoPrices, overrides) {
  const ov = overrides[ticker]
  if (ov && ov > 0) return ov
  const au = autoPrices[ticker]
  if (au && au > 0) return au
  return null
}

export function distancePct(price, target) {
  if (price == null || !target) return null
  return (price - target) / target * 100
}

export function priceStatus(price, target) {
  if (price == null) return null
  const ad = Math.abs(distancePct(price, target))
  if (ad <= 5)  return 'hit'
  if (ad <= 15) return 'close'
  return 'below'
}

export const DEFAULT_STOCKS = [
  { t: 'TER', co: 'Teradyne',         cu: 'USD', b: 299.40, t1: 353.92, t3: 257.57, t6: 341.91, t12: 790.98, base: new Date(2026, 2, 18) },
  { t: 'HWM', co: 'Howmet Aerospace', cu: 'USD', b: 240.24, t1: 250.45, t3: 260.90, t6: 269.81, t12: 456.70, base: new Date(2026, 2, 18) },
  { t: 'NEM', co: 'Newmont',          cu: 'USD', b: 52.80,  t1: 55.10,  t3: 58.20,  t6: 61.50,  t12: 72.00,  base: new Date(2026, 2, 18) },
  { t: 'APA', co: 'APA Corp',         cu: 'USD', b: 19.50,  t1: 21.00,  t3: 22.50,  t6: 24.00,  t12: 30.00,  base: new Date(2026, 2, 18) },
  { t: 'HAL', co: 'Halliburton',      cu: 'USD', b: 28.90,  t1: 31.50,  t3: 33.20,  t6: 35.80,  t12: 45.00,  base: new Date(2026, 2, 18) },
]
