import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseDate, targetDates, daysLeft, dateStatus, formatDate } from './dates.js'

// ── parseDate ─────────────────────────────────────────────────────────────────

describe('parseDate', () => {
  it('parses valid DD/MM/YYYY date', () => {
    const d = parseDate('18/03/2026')
    expect(d).toBeInstanceOf(Date)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(2)   // 0-indexed → March
    expect(d.getDate()).toBe(18)
  })

  it('returns null for invalid format', () => {
    expect(parseDate('2026-03-18')).toBeNull()
  })

  it('returns null for null input', () => {
    expect(parseDate(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseDate('')).toBeNull()
  })

  it('returns null for partial date', () => {
    expect(parseDate('18/03')).toBeNull()
  })

  it('handles end of month correctly', () => {
    const d = parseDate('31/12/2025')
    expect(d.getDate()).toBe(31)
    expect(d.getMonth()).toBe(11) // December
  })
})

// ── targetDates ───────────────────────────────────────────────────────────────

describe('targetDates', () => {
  const base = new Date(2026, 2, 18) // 18 Mar 2026

  it('d1 is base + 30 days', () => {
    const tg = targetDates(base)
    const diff = Math.round((tg.d1 - base) / 864e5)
    expect(diff).toBe(30)
  })

  it('d3 is base + 91 days', () => {
    const tg = targetDates(base)
    const diff = Math.round((tg.d3 - base) / 864e5)
    expect(diff).toBe(91)
  })

  it('d6 is base + 182 days', () => {
    const tg = targetDates(base)
    const diff = Math.round((tg.d6 - base) / 864e5)
    expect(diff).toBe(182)
  })

  it('d12 is base + 365 days', () => {
    const tg = targetDates(base)
    const diff = Math.round((tg.d12 - base) / 864e5)
    expect(diff).toBe(365)
  })

  it('returns all 4 date keys', () => {
    const tg = targetDates(base)
    expect(tg).toHaveProperty('d1')
    expect(tg).toHaveProperty('d3')
    expect(tg).toHaveProperty('d6')
    expect(tg).toHaveProperty('d12')
  })

  it('all dates are Date instances', () => {
    const tg = targetDates(base)
    expect(tg.d1).toBeInstanceOf(Date)
    expect(tg.d12).toBeInstanceOf(Date)
  })
})

// ── daysLeft ──────────────────────────────────────────────────────────────────

describe('daysLeft', () => {
  it('returns positive number for future date', () => {
    const future = new Date()
    future.setDate(future.getDate() + 10)
    expect(daysLeft(future)).toBeGreaterThan(0)
  })

  it('returns negative number for past date', () => {
    const past = new Date()
    past.setDate(past.getDate() - 10)
    expect(daysLeft(past)).toBeLessThan(0)
  })

  it('returns approximately 0 for today', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expect(Math.abs(daysLeft(today))).toBeLessThanOrEqual(1)
  })
})

// ── dateStatus ────────────────────────────────────────────────────────────────

describe('dateStatus', () => {
  it('returns past for date more than 7 days ago', () => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    expect(dateStatus(d)).toBe('past')
  })

  it('returns now for date within last 7 days', () => {
    const d = new Date()
    d.setDate(d.getDate() - 3)
    expect(dateStatus(d)).toBe('now')
  })

  it('returns soon for date within next 14 days', () => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    expect(dateStatus(d)).toBe('soon')
  })

  it('returns null for date more than 14 days in the future', () => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    expect(dateStatus(d)).toBeNull()
  })
})

// ── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('returns -- for null', () => {
    expect(formatDate(null)).toBe('--')
  })

  it('returns formatted string for valid date', () => {
    const d = new Date(2026, 2, 18) // 18 Mar 2026
    const result = formatDate(d)
    expect(result).toContain('2026')
    expect(result).toContain('Mar')
  })
})
