/**
 * storage.js — Persistence abstraction layer
 *
 * v4.x backend: GitHub API (private repo)
 * v5.x backend: Supabase (PostgreSQL)
 *
 * Public API (unchanged between versions):
 *   loadHistory()           → { batches: [...] } | null
 *   saveHistory(history, batchMeta) → true | false
 *   buildBatchId(dateStr)   → string "YYYY-MM-DD"
 *   isStorageConfigured()   → boolean
 */

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const TABLE             = 'batches'

// ── Helpers ───────────────────────────────────────────────────────────────────

function headers() {
  return {
    'Content-Type':  'application/json',
    'apikey':        SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Prefer':        'return=representation',
  }
}

/**
 * authHeaders — headers with the user's JWT session token.
 * Required for RLS policies that check auth.role() = 'authenticated'.
 * Falls back to anon key if no session exists.
 */
function authHeaders() {
  let token = SUPABASE_ANON_KEY
  try {
    const key = Object.keys(localStorage).find(k => k.includes('auth-token'))
    if (key) {
      const parsed = JSON.parse(localStorage.getItem(key))
      if (parsed?.access_token) token = parsed.access_token
    }
  } catch { /* fall back to anon key */ }
  return {
    'Content-Type':  'application/json',
    'apikey':        SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token}`,
  }
}

function endpoint(query = '') {
  return `${SUPABASE_URL}/rest/v1/${TABLE}${query}`
}

// ── Public: load history ──────────────────────────────────────────────────────

export async function loadHistory() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[storage] Supabase credentials not configured')
    return null
  }
  try {
    const res  = await fetch(endpoint('?order=saved_at.desc'), {
      headers: { ...headers(), 'Prefer': 'return=representation' },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('Supabase GET failed: ' + res.status)
    const rows = await res.json()

    // Convert flat rows → { batches: [...] } shape used by the app
    const batches = rows.map(row => ({
      id:            row.id,
      date:          row.date,
      savedAt:       row.saved_at,
      updatedAt:     row.updated_at,
      stocks:        row.stocks,
      results:       row.results ?? [],
      horizonStatus: row.horizon_status ?? {},
      hitRate:       row.hit_rate,
      marketData:    row.market_data ?? null,
      fundamentals:  row.fundamentals ?? null,
    }))

    return { batches }
  } catch (err) {
    console.error('[storage] loadHistory error:', err)
    return null
  }
}

// ── Public: save history ──────────────────────────────────────────────────────
// Saves a single batch via upsert (insert or update if same id)

export async function saveHistory(history, batchMeta) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[storage] Supabase credentials not configured')
    return false
  }
  try {
    // Find the batch that was just saved (first in array = most recent)
    const batch = history.batches[0]
    if (!batch) return false

    const row = {
      id:             batch.id,
      date:           batch.date,
      stocks:         batch.stocks,
      results:        batch.results,
      horizon_status: batch.horizonStatus ?? {},
      hit_rate:       batch.hitRate ?? null,
      market_data:    batch.marketData ?? null,
      fundamentals:   (batch.fundamentals && Object.keys(batch.fundamentals).length > 0)
                        ? batch.fundamentals : null,
      updated_at:     new Date().toISOString(),
    }

    // Upsert — insert if new, update if same id
    const res = await fetch(endpoint(), {
      method:  'POST',
      headers: { ...headers(), 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body:    JSON.stringify(row),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Supabase POST failed: ' + res.status)
    }
    return true
  } catch (err) {
    console.error('[storage] saveHistory error:', err)
    return false
  }
}

// ── Public: delete a single batch by id ──────────────────────────────────────

export async function deleteHistoryBatch(batchId) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false
  try {
    const res = await fetch(endpoint(`?id=eq.${encodeURIComponent(batchId)}`), {
      method:  'DELETE',
      headers: { ...headers(), 'Prefer': 'return=representation' },
    })
    if (!res.ok) throw new Error('Supabase DELETE failed: ' + res.status)
    return true
  } catch (err) {
    console.error('[storage] deleteHistoryBatch error:', err)
    return false
  }
}

// ── Public: build batch ID from date string ───────────────────────────────────

export function buildBatchId(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  const [d, m, y] = dateStr.split('/')
  return `${y}-${m}-${d}`
}

// ── Public: check if configured ───────────────────────────────────────────────

export function isStorageConfigured() {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY)
}

// ── Price cache — read closing prices fetched by pg_cron ─────────────────────

/**
 * loadCachedPrice(ticker, targetDate)
 * Reads a closing price from price_cache table (populated by pg_cron automation).
 * Returns { price, fetchedAt } or null if not cached yet.
 *
 * @param {string} ticker      - e.g. "TER", "SLB"
 * @param {Date}   targetDate  - the horizon target date
 */
export async function loadCachedPrice(ticker, targetDate) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  try {
    // Format date as YYYY-MM-DD for Supabase query
    const dateStr = targetDate.toISOString().split('T')[0]
    // Strip .US suffix for the API lookup (Twelve Data uses bare tickers)
    const cleanTicker = ticker.split('.')[0]

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/price_cache?ticker=eq.${cleanTicker}&target_date=eq.${dateStr}&select=close_price,fetched_at`,
      { headers: authHeaders(), cache: 'no-store' }
    )
    if (!res.ok) return null
    const rows = await res.json()
    if (!rows?.length) return null
    return { price: parseFloat(rows[0].close_price), fetchedAt: rows[0].fetched_at }
  } catch (err) {
    console.warn('[storage] loadCachedPrice error:', err.message)
    return null
  }
}

/**
 * isPriceCacheConfigured()
 * Returns true if the price_cache table exists and is reachable.
 * Used to show/hide the cache indicator in the UI.
 */
export async function isPriceCacheConfigured() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/price_cache?limit=0`,
      { headers: headers() }
    )
    return res.ok
  } catch {
    return false
  }
}

// ── Weekly prices — read chart data for ticker price evolution ────────────────

/**
 * loadWeeklyPrices(ticker, batchId)
 * Reads all weekly closing prices for a ticker from a specific batch.
 * Returns array of { week, week_date, close_price } sorted by week asc.
 *
 * @param {string} ticker   - e.g. "TER", "TER.US"
 * @param {string} batchId  - e.g. "2026-03-17"
 */
export async function loadWeeklyPrices(ticker, batchId) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return []
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/weekly_prices?ticker=eq.${encodeURIComponent(ticker)}&batch_id=eq.${encodeURIComponent(batchId)}&select=week,week_date,close_price&order=week.asc`,
      { headers: headers(), cache: 'no-store' }
    )
    if (!res.ok) return []
    return await res.json()
  } catch (err) {
    console.warn('[storage] loadWeeklyPrices error:', err.message)
    return []
  }
}
