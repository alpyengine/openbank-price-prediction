/**
 * storage.js — Persistence abstraction layer
 *
 * v4.x backend: GitHub API (private repo)
 * v5.x backend: Supabase (PostgreSQL)
 *
 * Public API (unchanged between versions):
 *   loadHistory()           → { batches: [...] } | null
 *   saveHistory(history, batchMeta) → true | false
 *   buildBatchId(date, market, direction) → "YYYY-MM-DD[_MKT_dir]"
 *   marketOf(ticker)        → market code e.g. "US", "MC"
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
      headers: { ...authHeaders(), 'Prefer': 'return=representation' },
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
      hitRateExt:    row.hit_rate_ext ?? null,
      direction:     row.direction ?? 'bullish',   // default bullish for old batches
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
      hit_rate:       batch.hitRate    ?? null,
      hit_rate_ext:   batch.hitRateExt ?? null,
      direction:      batch.direction  ?? 'bullish',
      market_data:    batch.marketData ?? null,
      fundamentals:   (batch.fundamentals && Object.keys(batch.fundamentals).length > 0)
                        ? batch.fundamentals : null,
      updated_at:     new Date().toISOString(),
    }

    // Upsert — insert if new, update if same id
    const res = await fetch(endpoint(), {
      method:  'POST',
      headers: { ...authHeaders(), 'Prefer': 'resolution=merge-duplicates,return=representation' },
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
      headers: { ...authHeaders(), 'Prefer': 'return=representation' },
    })
    if (!res.ok) throw new Error('Supabase DELETE failed: ' + res.status)
    return true
  } catch (err) {
    console.error('[storage] deleteHistoryBatch error:', err)
    return false
  }
}

// ── Public: delete a single ticker from a batch (PATCH the JSON doc) ─────────

/**
 * deleteStockFromBatch(batchId, ticker)
 *
 * Removes one ticker from a batch document stored in Supabase.
 * Because each batch is a single JSON row (not normalised rows), this:
 *   1. Fetches the current batch row
 *   2. Filters results[] to remove all entries for the ticker
 *   3. Recalculates stocks count, hitRate, hitRateExt
 *   4. PATCHes the updated row back via authHeaders (JWT required by RLS)
 *   5. Deletes orphaned weekly_prices rows for (ticker, batchId)
 *
 * Returns true on success, false on any error.
 *
 * @param {string} batchId — YYYY-MM-DD batch id (row PK)
 * @param {string} ticker  — ticker to remove e.g. "MU", "TER.US"
 */
export async function deleteStockFromBatch(batchId, ticker) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false
  try {
    // 1. Fetch current batch row
    const getRes = await fetch(
      endpoint(`?id=eq.${encodeURIComponent(batchId)}&select=results,hit_rate,hit_rate_ext,stocks,horizon_status,direction,market_data,fundamentals,date,saved_at`),
      { headers: { ...authHeaders(), 'Prefer': 'return=representation' }, cache: 'no-store' }
    )
    if (!getRes.ok) throw new Error('Supabase GET failed: ' + getRes.status)
    const rows = await getRes.json()
    if (!rows?.length) throw new Error(`Batch ${batchId} not found`)
    const batch = rows[0]

    // 2. Filter out the ticker
    const oldResults = batch.results ?? []
    const newResults = oldResults.filter(r => r.ticker !== ticker)
    if (newResults.length === oldResults.length) {
      // Ticker not found in this batch — nothing to do
      return true
    }

    // 3. Recalculate derived fields
    const uniqueTickers = new Set(newResults.map(r => r.ticker))
    const newStocks     = uniqueTickers.size
    const evaluated     = newResults.filter(r => r.verdict !== 'awaiting')
    const hits          = evaluated.filter(r => r.verdict === 'hit').length
    const exceeded      = evaluated.filter(r => r.verdict === 'exceeded').length
    const newHitRate    = evaluated.length ? Math.round(hits / evaluated.length * 100) : null
    const newHitRateExt = evaluated.length ? Math.round((hits + exceeded) / evaluated.length * 100) : null

    // 4. PATCH the batch row — authHeaders required by RLS
    const patchRes = await fetch(
      endpoint(`?id=eq.${encodeURIComponent(batchId)}`),
      {
        method:  'PATCH',
        headers: { ...authHeaders(), 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          results:      newResults,
          stocks:       newStocks,
          hit_rate:     newHitRate,
          hit_rate_ext: newHitRateExt,
          updated_at:   new Date().toISOString(),
        }),
      }
    )
    if (!patchRes.ok) throw new Error('Supabase PATCH failed: ' + patchRes.status)

    // 5. Delete orphaned weekly_prices rows for (ticker, batchId)
    // Strip exchange suffix for weekly_prices lookup (stored without .US/.DE etc.)
    const bareTicker = ticker.split('.')[0]
    await fetch(
      `${SUPABASE_URL}/rest/v1/weekly_prices?batch_id=eq.${encodeURIComponent(batchId)}&ticker=eq.${encodeURIComponent(bareTicker)}`,
      { method: 'DELETE', headers: authHeaders() }
    )
    // Also try with full ticker in case it was stored with suffix
    if (bareTicker !== ticker) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/weekly_prices?batch_id=eq.${encodeURIComponent(batchId)}&ticker=eq.${encodeURIComponent(ticker)}`,
        { method: 'DELETE', headers: authHeaders() }
      )
    }

    return true
  } catch (err) {
    console.error('[storage] deleteStockFromBatch error:', err)
    return false
  }
}

// ── Public: derive market code from a ticker ──────────────────────────────────

/**
 * marketOf — derive the market code from a ticker's exchange suffix.
 * US tickers have no suffix (e.g. "AAPL") → 'US'.
 * EU tickers carry a suffix (e.g. "SAN.MC", "BMW.DE") → 'MC', 'DE', …
 * Single source of truth for batch-level market, used by buildBatchId,
 * the batch selector and Accuracy.
 *
 * @param {string} ticker — e.g. "AAPL", "SLB.US", "SAN.MC"
 * @returns {string} market code, uppercased (default 'US')
 */
export function marketOf(ticker) {
  if (!ticker || !ticker.includes('.')) return 'US'
  return ticker.split('.').pop().toUpperCase()
}

// ── Public: build batch ID from date + market + direction ─────────────────────

/**
 * buildBatchId — composite batch identity.
 *
 * Historically the id was just the date ("YYYY-MM-DD"), which meant two
 * imports on the same day (e.g. a bullish and a bearish list, or a US and an
 * EU list) collided on the same primary key and got merged into one batch.
 *
 * The id now combines date + market + direction → "YYYY-MM-DD_US_bullish",
 * so same-day batches with a different market or direction stay separate.
 *
 * Backwards-compatible: called with only a date (market & direction omitted)
 * it returns the legacy date-only id, so existing batches keep their key.
 *
 * @param {string} dateStr   — "DD/MM/YYYY"
 * @param {string} [market]  — market code e.g. 'US', 'MC' (from marketOf)
 * @param {string} [direction] — 'bullish' | 'bearish'
 * @returns {string} batch id
 */
export function buildBatchId(dateStr, market, direction) {
  const base = dateStr
    ? (() => { const [d, m, y] = dateStr.split('/'); return `${y}-${m}-${d}` })()
    : new Date().toISOString().split('T')[0]
  // No market/direction → legacy date-only id (old batches stay unchanged)
  if (!market && !direction) return base
  const mk  = (market || 'US').toUpperCase()
  const dir = (direction || 'bullish').toLowerCase()
  return `${base}_${mk}_${dir}`
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

// ── loadAllWeeklyPrices — load all weekly prices for All Stocks sparklines ────

/**
 * loadAllWeeklyPrices()
 * Loads ALL weekly_prices rows in a single query — used by AllStocksPage
 * to render sparklines for every ticker without N individual requests.
 *
 * Returns a nested map:
 *   { [ticker]: { [batchId]: [close_price, ...] } }
 *
 * Example:
 *   { "MU": { "2026-03-17": [357, 366, 420, 455, 496, 542, 746, 724, 751, 971] } }
 *
 * The caller picks the most recent batchId for each ticker to get the
 * sparkline points to display.
 */
export async function loadAllWeeklyPrices() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return {}
  try {
    // Load all rows ordered by ticker + week — single round trip
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/weekly_prices?select=ticker,batch_id,week,close_price&order=ticker.asc,batch_id.asc,week.asc`,
      { headers: authHeaders(), cache: 'no-store' }
    )
    if (!res.ok) return {}
    const rows = await res.json()

    // Group into { ticker: { batchId: [prices...] } }
    const result = {}
    for (const row of rows) {
      const { ticker, batch_id, close_price } = row
      if (!result[ticker])            result[ticker] = {}
      if (!result[ticker][batch_id])  result[ticker][batch_id] = []
      result[ticker][batch_id].push(parseFloat(close_price))
    }
    return result
  } catch (err) {
    console.warn('[storage] loadAllWeeklyPrices error:', err.message)
    return {}
  }
}

// ── fundamentals_cache — ticker-level fundamentals cache ──────────────────────

/**
 * saveFundamentalsCache(fundamentals)
 * Upserts fundamentals for each ticker into the fundamentals_cache table.
 * Called automatically when saving a batch — keeps cache in sync.
 *
 * TTL logic: each row stores fetched_at so the app knows when to re-fetch.
 * Rows older than 7 days will be re-fetched on next Refresh Fundamentals.
 *
 * @param {Object} fundamentals — { [ticker]: { sector, pegTTM, ... } }
 */
export async function saveFundamentalsCache(fundamentals) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return
  if (!fundamentals || !Object.keys(fundamentals).length) return

  try {
    // Build one row per ticker
    const rows = Object.entries(fundamentals).map(([ticker, data]) => ({
      ticker,
      data,
      fetched_at: data?.fetchedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    // Upsert all rows in one request — merge on ticker PK
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/fundamentals_cache`,
      {
        method:  'POST',
        headers: {
          ...authHeaders(),
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(rows),
      }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.warn('[storage] saveFundamentalsCache error:', err.message || res.status)
    }
  } catch (err) {
    console.warn('[storage] saveFundamentalsCache error:', err.message)
  }
}

/**
 * loadFundamentalsCache()
 * Loads all rows from fundamentals_cache.
 * Returns { [ticker]: { ...data, fetchedAt } } — same shape as useFundamentals state.
 *
 * Used by AllStocksPage as the primary source of fundamentals data.
 * Falls back to batch.fundamentals if a ticker is missing from cache.
 */
export async function loadFundamentalsCache() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return {}
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/fundamentals_cache?select=ticker,data,fetched_at`,
      { headers: authHeaders(), cache: 'no-store' }
    )
    if (!res.ok) return {}
    const rows = await res.json()

    // Convert array of rows → { ticker: { ...data } }
    return Object.fromEntries(
      rows.map(row => [row.ticker, { ...row.data, fetchedAt: row.fetched_at }])
    )
  } catch (err) {
    console.warn('[storage] loadFundamentalsCache error:', err.message)
    return {}
  }
}

// ── Watchlist — per-user ticker favourites ────────────────────────────────────

/**
 * loadWatchlist — fetch all tickers in the current user's watchlist.
 * Returns an array of ticker strings e.g. ['MU', 'AMD', 'TER'].
 * RLS ensures each user only sees their own rows.
 *
 * @returns {Promise<string[]>}
 */
export async function loadWatchlist() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return []
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/watchlist?select=ticker&order=added_at.asc`,
      { headers: authHeaders(), cache: 'no-store' }
    )
    if (!res.ok) return []
    const rows = await res.json()
    return rows.map(r => r.ticker)
  } catch (err) {
    console.warn('[storage] loadWatchlist error:', err.message)
    return []
  }
}

/**
 * addToWatchlist — add a ticker to the current user's watchlist.
 * Silently ignores duplicates (unique constraint on user_id + ticker).
 *
 * @param {string} ticker — bare ticker e.g. 'MU'
 * @returns {Promise<boolean>} true on success
 */
/**
 * getUserId — extract the current user's UUID from the Supabase session
 * stored in localStorage. Returns null if not authenticated.
 * Used to populate user_id in watchlist inserts (required by RLS).
 */
function getUserId() {
  try {
    const key = Object.keys(localStorage).find(k => k.includes('auth-token'))
    if (!key) return null
    const parsed = JSON.parse(localStorage.getItem(key))
    // JWT payload is base64url encoded — decode to get user id
    const payload = parsed?.access_token?.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded?.sub ?? null
  } catch {
    return null
  }
}

export async function addToWatchlist(ticker) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false
  const userId = getUserId()
  if (!userId) { console.warn('[storage] addToWatchlist: no user_id'); return false }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/watchlist`,
      {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ ticker, user_id: userId }),
      }
    )
    // 201 = created, 409 = conflict (already exists) — both are acceptable
    return res.status === 201 || res.status === 409
  } catch (err) {
    console.warn('[storage] addToWatchlist error:', err.message)
    return false
  }
}

/**
 * removeFromWatchlist — remove a ticker from the current user's watchlist.
 *
 * @param {string} ticker — bare ticker e.g. 'MU'
 * @returns {Promise<boolean>} true on success
 */
export async function removeFromWatchlist(ticker) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/watchlist?ticker=eq.${encodeURIComponent(ticker)}`,
      { method: 'DELETE', headers: authHeaders() }
    )
    return res.ok
  } catch (err) {
    console.warn('[storage] removeFromWatchlist error:', err.message)
    return false
  }
}

// ── Alert config — per-user alert preferences ─────────────────────────────────

/**
 * loadAlertConfig — fetch the current user's alert configuration.
 * Returns the config object or null if not yet configured.
 */
export async function loadAlertConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/alert_config?select=*&limit=1`,
      { headers: authHeaders(), cache: 'no-store' }
    )
    if (!res.ok) return null
    const rows = await res.json()
    if (!rows?.length) return null
    const r = rows[0]
    return {
      enabled:     r.enabled,
      email:       r.email ?? '',
      browser:     r.browser,
      on_exceeded: r.on_exceeded,
      on_hit:      r.on_hit,
      on_close:    r.on_close,
      on_stop:     r.on_stop,
      stop_pct:    r.stop_pct,
      cooldown_h:  r.cooldown_h,
    }
  } catch (err) {
    console.warn('[storage] loadAlertConfig error:', err.message)
    return null
  }
}

/**
 * saveAlertConfig — upsert the current user's alert configuration.
 * Includes user_id in the body (required by RLS insert policy).
 */
export async function saveAlertConfig(cfg) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false
  const userId = getUserId()
  if (!userId) return false
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/alert_config`,
      {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({ ...cfg, user_id: userId, updated_at: new Date().toISOString() }),
      }
    )
    return res.ok || res.status === 409
  } catch (err) {
    console.warn('[storage] saveAlertConfig error:', err.message)
    return false
  }
}

// ── Alert log — cooldown tracking ─────────────────────────────────────────────

/**
 * loadAlertLog — fetch alert log entries within the cooldown window.
 * Returns array of { ticker, batch_id, horizon } to check for duplicates.
 *
 * @param {number} cooldownH — hours to look back (default 24)
 */
export async function loadAlertLog(cooldownH = 24) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return []
  try {
    const since = new Date(Date.now() - cooldownH * 3600 * 1000).toISOString()
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/alert_log?select=ticker,batch_id,horizon&sent_at=gte.${since}`,
      { headers: authHeaders(), cache: 'no-store' }
    )
    if (!res.ok) return []
    return await res.json()
  } catch (err) {
    console.warn('[storage] loadAlertLog error:', err.message)
    return []
  }
}

/**
 * appendAlertLog — insert alert log entries for cooldown tracking.
 * Includes user_id (required by RLS insert policy).
 *
 * @param {Object[]} alerts — triggered alerts from useAlerts.checkAlerts()
 */
export async function appendAlertLog(alerts) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !alerts.length) return
  const userId = getUserId()
  if (!userId) return
  try {
    const rows = alerts.map(a => ({
      user_id:  userId,
      ticker:   a.ticker,
      batch_id: a.batchId,
      horizon:  a.horizon,
      verdict:  a.alertType,
      price:    a.price,
      target:   a.target,
    }))
    await fetch(
      `${SUPABASE_URL}/rest/v1/alert_log`,
      {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(rows),
      }
    )
  } catch (err) {
    console.warn('[storage] appendAlertLog error:', err.message)
  }
}
