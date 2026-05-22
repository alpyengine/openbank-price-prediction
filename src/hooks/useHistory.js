import { useState, useCallback, useEffect } from 'react'
import { loadHistory, saveHistory, buildBatchId, isStorageConfigured } from '../services/storage.js'
import { formatDate, today as getToday } from '../utils/dates.js'
import { getTarget, getTargetDate, getEffectivePrice, evaluatePrediction } from '../utils/stocks.js'

const HORIZONS = ['1M', '3M', '6M', '12M']

/**
 * useHistory — manages the accuracy history
 *
 * history shape:
 * {
 *   batches: [
 *     {
 *       id:        "2026-03-18",
 *       date:      "18/03/2026",
 *       savedAt:   "2026-05-21T10:00:00Z",
 *       stocks:    5,
 *       results: [
 *         {
 *           ticker:       "TER",
 *           company:      "Teradyne",
 *           horizon:      "1M",
 *           verdict:      "miss",    // "hit" | "close" | "miss" | "awaiting"
 *           basePrice:    299.40,
 *           targetPrice:  353.92,
 *           priceOnDate:  337.87,
 *           targetDate:   "17/04/2026",
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

export function useHistory() {
  const [history,  setHistory]  = useState(null)   // null = not loaded yet
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [log,      setLog]      = useState('')
  const configured = isStorageConfigured()

  // ── Auto-load on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    if (configured) load(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load from GitHub ────────────────────────────────────────────────────────
  const load = useCallback(async (auto = false) => {
    if (!configured) { setLog('GitHub not configured — add VITE_GITHUB_TOKEN and VITE_GITHUB_REPO to .env'); return }
    setLoading(true)
    setLog(auto ? 'Auto-loading history...' : 'Loading history from GitHub...')
    const data = await loadHistory()
    if (data) {
      setHistory(data)
      const n = data.batches?.length ?? 0
      setLog(`History loaded — ${n} batch${n !== 1 ? 'es' : ''} found`)
    } else {
      setLog('Could not load history — check GitHub credentials')
    }
    setLoading(false)
  }, [configured])

  // ── Evaluate current stocks and save batch ─────────────────────────────────
  const saveBatch = useCallback(async ({
    stocks, autoPrices, histPrices, overrides,
    horizonExpired, horizon,
  }) => {
    if (!configured) { setLog('GitHub not configured'); return false }
    if (!stocks.length) { setLog('No stocks to save'); return false }

    setSaving(true)
    setLog('Evaluating and saving batch...')

    const KEYS = { '1M':'d1', '3M':'d3', '6M':'d6', '12M':'d12' }

    // Collect all results across all horizons
    const results = []
    for (const stock of stocks) {
      for (const h of HORIZONS) {
        const hExpired = horizonExpired  // simplified — use per-stock logic if needed
        const { price: p } = getEffectivePrice(
          stock.t, h, autoPrices, histPrices, overrides, hExpired
        )
        const tgt     = getTarget(stock, h)
        const tgtDate = getTargetDate(stock, h)
        const { verdict } = evaluatePrediction(p, tgt, stock.b)

        results.push({
          ticker:      stock.t,
          company:     stock.co,
          horizon:     h,
          verdict:     verdict ?? 'awaiting',
          basePrice:   stock.b,
          targetPrice: tgt,
          priceOnDate: p ?? null,
          targetDate:  tgtDate ? formatDate(tgtDate) : null,
        })
      }
    }

    // Build batch ID from first stock's base date
    const firstBase = stocks.find(s => s.base)?.base
    const batchId   = firstBase
      ? buildBatchId(formatDate(firstBase))
      : buildBatchId(null)

    const newBatch = {
      id:      batchId,
      date:    firstBase ? formatDate(firstBase) : formatDate(getToday()),
      savedAt: new Date().toISOString(),
      stocks:  stocks.length,
      results,
    }

    // Merge into existing history (replace if same batch ID)
    const current  = history ?? { batches: [] }
    const existing = current.batches.filter(b => b.id !== batchId)
    const updated  = { batches: [newBatch, ...existing] }

    // Build horizon status — true if ALL stocks in that horizon have a real price (not awaiting)
    const horizonStatus = {}
    for (const h of HORIZONS) {
      const hResults = results.filter(r => r.horizon === h)
      horizonStatus[h] = hResults.length > 0 && hResults.every(r => r.verdict !== 'awaiting')
    }

    // Compute HIT rate for evaluated horizons only
    const evaluated = results.filter(r => r.verdict !== 'awaiting')
    const hits      = evaluated.filter(r => r.verdict === 'hit').length
    const hitRate   = evaluated.length ? Math.round(hits / evaluated.length * 100) : null

    const batchMeta = {
      batchDate: firstBase ? formatDate(firstBase) : formatDate(getToday()),
      stocks:    stocks.length,
      horizonStatus,
      hitRate,
    }

    const ok = await saveHistory(updated, batchMeta)
    if (ok) {
      setHistory(updated)
      setLog(`Batch ${batchId} saved — ${results.length} predictions`)
    } else {
      setLog('Save failed — check GitHub credentials and token permissions')
    }
    setSaving(false)
    return ok
  }, [history, configured])

  // ── Computed accuracy stats ─────────────────────────────────────────────────
  const stats = computed(history)

  return { history, stats, loading, saving, log, configured, load, saveBatch }
}

// ── Compute accuracy stats from history ───────────────────────────────────────

function computed(history) {
  if (!history?.batches?.length) return null

  const HORIZONS = ['1M', '3M', '6M', '12M']
  const all = history.batches.flatMap(b => b.results)

  // Per-horizon breakdown
  const byHorizon = HORIZONS.map(h => {
    const rows     = all.filter(r => r.horizon === h && r.verdict !== 'awaiting')
    const hit      = rows.filter(r => r.verdict === 'hit').length
    const close    = rows.filter(r => r.verdict === 'close').length
    const miss     = rows.filter(r => r.verdict === 'miss').length
    const total    = rows.length
    const hitRate  = total ? Math.round(hit / total * 100) : null
    const hitClose = total ? Math.round((hit + close) / total * 100) : null
    return { horizon: h, total, hit, close, miss, hitRate, hitClose }
  })

  // Overall
  const evaluated = all.filter(r => r.verdict !== 'awaiting')
  const totalHit  = evaluated.filter(r => r.verdict === 'hit').length
  const overallRate = evaluated.length ? Math.round(totalHit / evaluated.length * 100) : null

  // Best and worst horizon
  const ranked    = byHorizon.filter(h => h.hitRate !== null).sort((a, b) => b.hitRate - a.hitRate)
  const bestH     = ranked[0]  ?? null
  const worstH    = ranked[ranked.length - 1] ?? null

  // Per-batch summary for the table
  const batchSummary = history.batches.map(b => {
    const res      = b.results
    const evaluated = res.filter(r => r.verdict !== 'awaiting')
    const hit      = evaluated.filter(r => r.verdict === 'hit').length
    const close    = evaluated.filter(r => r.verdict === 'close').length
    const miss     = evaluated.filter(r => r.verdict === 'miss').length
    const awaiting = res.filter(r => r.verdict === 'awaiting').length
    const hitRate  = evaluated.length ? Math.round(hit / evaluated.length * 100) : null
    return { id: b.id, date: b.date, savedAt: b.savedAt, stocks: b.stocks, evaluated: evaluated.length, hit, close, miss, awaiting, hitRate }
  })

  // Chart data — hit% per horizon per batch (chronological)
  const chartBatches = [...history.batches].reverse()
  const chartData = HORIZONS.map(h =>
    chartBatches.map(b => {
      const rows  = b.results.filter(r => r.horizon === h && r.verdict !== 'awaiting')
      const hit   = rows.filter(r => r.verdict === 'hit').length
      return rows.length ? Math.round(hit / rows.length * 100) : null
    })
  )
  const chartLabels = chartBatches.map(b => b.date)

  return {
    byHorizon, overallRate, bestH, worstH,
    evaluated: evaluated.length,
    totalBatches: history.batches.length,
    batchSummary, chartData, chartLabels,
  }
}
