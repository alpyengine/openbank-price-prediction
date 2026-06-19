/**
 * getEffectivePrice.test.js — regression tests for snapshot-mode price resolution
 *
 * Guards the v7.9.1 bug fix: when settling a batch save (snapshot=true), an
 * EXPIRED horizon must only be evaluated against its real closing price. If the
 * historical close isn't available, getEffectivePrice must return null (so the
 * verdict stays 'awaiting' and the cron settles it later) — it must NEVER fall
 * back to the current auto-fetched price, which would freeze a wrong verdict.
 *
 * Live mode (snapshot=false / omitted) keeps the current-price fallback so the
 * provisional badges in Batch Details are unaffected.
 */
import { describe, it, expect } from 'vitest'
import { getEffectivePrice } from './stocks.js'

describe('getEffectivePrice — snapshot mode (expired-horizon settlement)', () => {
  const ticker     = 'TER'
  const horizon    = '1M'
  const autoPrices = { TER: 500 }   // current price — must NOT be used to settle an expired horizon
  const noOverride = {}

  it('snapshot + expired + no historical close → null (stays awaiting, current price ignored)', () => {
    const histPrices = {}            // historical close not loaded
    const { price } = getEffectivePrice(ticker, horizon, autoPrices, histPrices, noOverride, true, true)
    expect(price).toBeNull()
  })

  it('snapshot + expired + historical close present → uses the settled close', () => {
    const histPrices = { TER_1M: { price: 350, date: '17 Apr 2026' } }
    const { price, isHistorical } = getEffectivePrice(ticker, horizon, autoPrices, histPrices, noOverride, true, true)
    expect(price).toBe(350)
    expect(isHistorical).toBe(true)
  })

  it('snapshot does not override the manual-override precedence', () => {
    const histPrices = {}
    const { price } = getEffectivePrice(ticker, horizon, autoPrices, histPrices, { TER: 333 }, true, true)
    expect(price).toBe(333)
  })

  it('live mode (snapshot=false) keeps the current-price fallback for an expired horizon', () => {
    const histPrices = {}
    const { price } = getEffectivePrice(ticker, horizon, autoPrices, histPrices, noOverride, true, false)
    expect(price).toBe(500)          // unchanged live/provisional behaviour
  })

  it('default call (no snapshot arg) behaves like live mode — current-price fallback', () => {
    const histPrices = {}
    const { price } = getEffectivePrice(ticker, horizon, autoPrices, histPrices, noOverride, true)
    expect(price).toBe(500)
  })

  it('snapshot flag only gates the expired branch — a non-expired horizon is unaffected', () => {
    const histPrices = {}
    const { price } = getEffectivePrice(ticker, horizon, autoPrices, histPrices, noOverride, false, true)
    expect(price).toBe(500)          // saveBatch marks future horizons awaiting separately
  })
})
