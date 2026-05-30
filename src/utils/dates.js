/**
 * dates.js — Date utility functions
 *
 * All date arithmetic used throughout the app for calculating
 * horizon target dates, days remaining, and expiry status.
 *
 * Key concepts:
 *   - Base date: the date of the Openbank screenshot (when forecast was published)
 *   - Target date: base date + horizon duration (1M=30d, 3M=91d, 6M=182d, 12M=365d)
 *   - Expiry: a horizon is "expired" when its target date is more than 7 days in the past
 */

/**
 * Returns today's date with time set to midnight (00:00:00).
 * Used as a consistent reference point throughout the app.
 */
export function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Formats a Date object to a human-readable string.
 * Uses British locale for day-month-year ordering.
 * Returns '--' for null/undefined input.
 *
 * @param {Date} d — date to format
 * @returns {string} e.g. "17 Apr 2026" or "--"
 */
export function formatDate(d) {
  if (!d) return '--'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Adds n days to a date, returning a new Date object.
 * Does not mutate the input date.
 *
 * @param {Date}   d — base date
 * @param {number} n — number of days to add (can be negative)
 * @returns {Date}
 */
export function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/**
 * Parses a DD/MM/YYYY date string into a Date object.
 * Returns null for invalid or missing input.
 *
 * @param {string} s — date string in DD/MM/YYYY format
 * @returns {Date|null}
 */
export function parseDate(s) {
  if (!s) return null
  const p = s.trim().split('/')
  if (p.length !== 3) return null
  const d = new Date(+p[2], +p[1] - 1, +p[0])
  return isNaN(d.getTime()) ? null : d
}

/**
 * Calculates all 4 horizon target dates from a base date.
 * Uses fixed day offsets as an approximation of calendar months:
 *   1M  = +30 days
 *   3M  = +91 days  (~3 months)
 *   6M  = +182 days (~6 months)
 *   12M = +365 days (~1 year)
 *
 * @param {Date} base — the base date (Openbank screenshot date)
 * @returns {{ d1: Date, d3: Date, d6: Date, d12: Date }}
 */
export function targetDates(base) {
  return {
    d1:  addDays(base, 30),
    d3:  addDays(base, 91),
    d6:  addDays(base, 182),
    d12: addDays(base, 365),
  }
}

/**
 * Returns the number of days between today and a target date.
 * Positive = future (days remaining), negative = past (days elapsed).
 *
 * @param {Date} d — target date
 * @returns {number}
 */
export function daysLeft(d) {
  return Math.round((d - today()) / 864e5)
}

/**
 * Returns the expiry status of a date relative to today.
 * Used to determine tab dot colors and banner messages in HorizonTabs.
 *
 * Status values:
 *   'past'  — more than 7 days ago (horizon expired — historical price used)
 *   'now'   — within the last 7 days or today (horizon recently expired)
 *   'soon'  — within the next 14 days (approaching expiry)
 *   null    — more than 14 days in the future (no special status)
 *
 * @param {Date} d — target date
 * @returns {'past'|'now'|'soon'|null}
 */
export function dateStatus(d) {
  const dl = daysLeft(d)
  if (dl < -7)  return 'past'
  if (dl <= 0)  return 'now'
  if (dl <= 14) return 'soon'
  return null
}
