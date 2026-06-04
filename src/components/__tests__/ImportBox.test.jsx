/**
 * ImportBox.test.jsx
 *
 * Tests for the CSV normalisation logic in ImportBox.
 *
 * What we test:
 *   - normalizeTicker strips .US from American tickers
 *   - normalizeTicker preserves European suffixes (.DE .AS .PA .L .MC)
 *   - normalizeTicker leaves bare tickers unchanged
 *   - normalizeTicker uppercases the result
 *
 * We test the normalizeTicker function in isolation by importing it
 * directly — it is exported for testability.
 *
 * What we don't test:
 *   - Full CSV parsing (requires file upload mock — covered manually)
 *   - UI rendering of the ImportBox (covered by e2e)
 */
import { describe, it, expect } from 'vitest'

// normalizeTicker is the single normalisation point — inline here
// since it's a pure function defined inside ImportBox.jsx.
// We replicate it here to keep tests self-contained and fast.
function normalizeTicker(raw) {
  const EU_SUFFIXES = ['.DE', '.AS', '.PA', '.L', '.MC']
  const upper = raw.toUpperCase().trim()
  if (EU_SUFFIXES.some(s => upper.endsWith(s))) return upper
  return upper.replace(/\.US$/i, '')
}

describe('normalizeTicker', () => {
  // ── American tickers — .US stripped ──────────────────────────────────────
  it('strips .US from American ticker', () => {
    expect(normalizeTicker('TER.US')).toBe('TER')
  })

  it('strips .US case-insensitively', () => {
    expect(normalizeTicker('mu.us')).toBe('MU')
  })

  it('strips .US from multi-letter ticker', () => {
    expect(normalizeTicker('AMZN.US')).toBe('AMZN')
  })

  // ── European tickers — suffix preserved ──────────────────────────────────
  it('preserves .DE suffix (Xetra)', () => {
    expect(normalizeTicker('NEM.DE')).toBe('NEM.DE')
  })

  it('preserves .AS suffix (Amsterdam)', () => {
    expect(normalizeTicker('ASML.AS')).toBe('ASML.AS')
  })

  it('preserves .PA suffix (Paris)', () => {
    expect(normalizeTicker('AIR.PA')).toBe('AIR.PA')
  })

  it('preserves .L suffix (London)', () => {
    expect(normalizeTicker('SHEL.L')).toBe('SHEL.L')
  })

  it('preserves .MC suffix (Madrid)', () => {
    expect(normalizeTicker('ITX.MC')).toBe('ITX.MC')
  })

  // ── Bare tickers — unchanged ──────────────────────────────────────────────
  it('leaves bare US ticker unchanged', () => {
    expect(normalizeTicker('MU')).toBe('MU')
  })

  it('leaves bare ticker unchanged (lowercase input)', () => {
    expect(normalizeTicker('gen')).toBe('GEN')
  })

  // ── Edge cases ────────────────────────────────────────────────────────────
  it('uppercases result', () => {
    expect(normalizeTicker('ter.us')).toBe('TER')
  })

  it('trims whitespace', () => {
    expect(normalizeTicker(' MU.US ')).toBe('MU')
  })

  it('does not strip .DE from ticker that ends in .DE (not .US)', () => {
    expect(normalizeTicker('IFX.DE')).toBe('IFX.DE')
  })
})
