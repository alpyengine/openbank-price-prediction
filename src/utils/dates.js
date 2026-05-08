// ── Date helpers ──────────────────────────────────────────────────────────────

export function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function formatDate(d) {
  if (!d) return '--'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** Parse DD/MM/YYYY → Date */
export function parseDate(s) {
  if (!s) return null
  const p = s.trim().split('/')
  if (p.length !== 3) return null
  const d = new Date(+p[2], +p[1] - 1, +p[0])
  return isNaN(d.getTime()) ? null : d
}

/** Compute 1M/3M/6M/12M target dates from a base date */
export function targetDates(base) {
  return {
    d1:  addDays(base, 30),
    d3:  addDays(base, 91),
    d6:  addDays(base, 182),
    d12: addDays(base, 365),
  }
}

export function daysLeft(d) {
  return Math.round((d - today()) / 864e5)
}

/** 'past' | 'now' | 'soon' | null */
export function dateStatus(d) {
  const dl = daysLeft(d)
  if (dl < -7)  return 'past'
  if (dl <= 0)  return 'now'
  if (dl <= 14) return 'soon'
  return null
}
