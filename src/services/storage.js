/**
 * storage.js — Persistence abstraction layer
 *
 * Current backend: GitHub API (private repo)
 * Future backends: Supabase, Node API — only this file changes.
 *
 * Public API:
 *   loadHistory()           → { batches: [...] } | null
 *   saveHistory(history)    → true | false
 *   buildBatchId(date)      → string "YYYY-MM-DD"
 */

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN
const GITHUB_REPO  = import.meta.env.VITE_GITHUB_REPO   // "username/repo"
const FILE_PATH    = 'data/history.json'
const API_BASE     = 'https://api.github.com'

// ── Helpers ───────────────────────────────────────────────────────────────────

function headers() {
  return {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept':        'application/vnd.github+json',
    'Content-Type':  'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function encode(str) {
  return btoa(unescape(encodeURIComponent(str)))
}

function decode(b64) {
  return decodeURIComponent(escape(atob(b64)))
}

// ── Get current file SHA (needed to update an existing file) ─────────────────

async function getFileSha() {
  try {
    const res = await fetch(`${API_BASE}/repos/${GITHUB_REPO}/contents/${FILE_PATH}`, {
      headers: headers(),
      cache: 'no-store',
    })
    if (res.status === 404) return null   // file doesn't exist yet
    if (!res.ok) throw new Error('GitHub GET failed: ' + res.status)
    const data = await res.json()
    return { sha: data.sha, content: decode(data.content.replace(/\n/g, '')) }
  } catch (err) {
    console.error('[storage] getFileSha error:', err)
    return null
  }
}

// ── Public: load history ──────────────────────────────────────────────────────

export async function loadHistory() {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    console.warn('[storage] GitHub credentials not configured')
    return null
  }
  try {
    const file = await getFileSha()
    if (!file) return { batches: [] }
    return JSON.parse(file.content)
  } catch (err) {
    console.error('[storage] loadHistory error:', err)
    return null
  }
}

// ── Public: save history ──────────────────────────────────────────────────────

export async function saveHistory(history, batchMeta) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    console.warn('[storage] GitHub credentials not configured')
    return false
  }
  try {
    const file    = await getFileSha()
    const content = encode(JSON.stringify(history, null, 2))

    // Build descriptive commit message
    const today   = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' }).replace(/\//g, '/')
    let message

    if (batchMeta) {
      const { batchDate, stocks, horizonStatus, hitRate } = batchMeta
      // horizonStatus: { '1M': true/false, '3M': true/false, ... } — true = evaluated with real price
      const hStr = ['1M','3M','6M','12M']
        .map(h => `${h}${horizonStatus[h] ? '✓' : '⏳'}`)
        .join(' ')
      const hitStr = hitRate != null ? ` · HIT ${hitRate}%` : ''
      message = `data: batch ${batchDate} · updated ${today} · ${hStr} · ${stocks} stocks${hitStr}`
    } else {
      const count = history.batches?.length ?? 0
      message = `data: update history.json (${count} batch${count !== 1 ? 'es' : ''})`
    }

    const body = {
      message,
      content,
      ...(file?.sha ? { sha: file.sha } : {}),
    }

    const res = await fetch(`${API_BASE}/repos/${GITHUB_REPO}/contents/${FILE_PATH}`, {
      method:  'PUT',
      headers: headers(),
      body:    JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'GitHub PUT failed: ' + res.status)
    }
    return true
  } catch (err) {
    console.error('[storage] saveHistory error:', err)
    return false
  }
}

// ── Public: build batch ID from date string ───────────────────────────────────

export function buildBatchId(dateStr) {
  // dateStr: "DD/MM/YYYY" → "YYYY-MM-DD"
  if (!dateStr) return new Date().toISOString().split('T')[0]
  const [d, m, y] = dateStr.split('/')
  return `${y}-${m}-${d}`
}

// ── Public: check if configured ───────────────────────────────────────────────

export function isStorageConfigured() {
  return !!(GITHUB_TOKEN && GITHUB_REPO)
}
