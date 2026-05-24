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
    const res  = await fetch(endpoint('?order=date.desc'), {
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
