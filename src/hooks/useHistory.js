/**
 * useHistory.js — Batch history management hook (Supabase persistence)
 *
 * Manages saving, loading, and deleting prediction batches from Supabase.
 * Also computes accuracy statistics across all saved batches.
 *
 * A "batch" is a snapshot of stock predictions at a specific base date,
 * evaluated against real prices at each horizon expiry date.
 *
 * Batch shape saved to Supabase:
 * {
 *   id:        "2026-03-18"          — YYYY-MM-DD from base date
 *   date:      "18/03/2026"          — DD/MM/YYYY for display
 *   savedAt:   "2026-05-21T10:00Z"   — ISO timestamp
 *   stocks:    5                      — number of unique tickers
 *   results: [                        — one row per ticker × horizon
 *     {
 *       ticker:      "TER",
 *       company:     "Teradyne",
 *       horizon:     "1M",
 *       verdict:     "hit",           — "hit" | "close" | "miss" | "awaiting"
 *       basePrice:   299.40,
 *       targetPrice: 353.92,
 *       priceOnDate: 337.87,          — null if awaiting
 *       targetDate:  "17/04/2026",
 *     }
 *   ],
 *   marketData:    {...} | null,      — saved market benchmark data
 *   fundamentals:  {...} | null,      — saved fundamentals data
 * }
 *
 * computed() — derives accuracy stats from history:
 *   overallRate     — hit % across all batches and horizons
 *   byHorizon       — hit rate per horizon (1M/3M/6M/12M)
 *   batchSummary    — per-batch hit/miss/awaiting counts
 *   chartData       — accuracy % per horizon over time (for AreaChart)
 *   chartLabels     — batch dates for X axis
 *   uniqueTickers   — count of unique tickers across all batches
 *   totalAwaiting   — count of predictions still awaiting expiry
 *   evaluated       — count of predictions that have been evaluated
 *   totalBatches    — number of saved batches
 *
 * Hook returns:
 *   history           — raw history object { batches: [...] }
 *   stats             — computed accuracy stats (null until loaded)
 *   loading           — true while loading history
 *   saving            — true while saving a batch
 *   log               — status message
 *   configured        — true if Supabase credentials are in .env
 *   load()            — reload history from Supabase
 *   saveBatch(data)   — evaluate and save current batch
 *   deleteBatch(id)   — delete a batch from Supabase
 */
import { useState, useCallback, useEffect } from 'react'
import { loadHistory, saveHistory, buildBatchId, isStorageConfigured, deleteHistoryBatch, saveFundamentalsCache } from '../services/storage.js'
import { formatDate, today as getToday, targetDates, dateStatus } from '../utils/dates.js'
import { getTarget, getTargetDate, getEffectivePrice, evaluatePrediction, SNAPSHOT_PARAMS } from '../utils/stocks.js'

const HORIZONS = ['1M', '3M', '6M', '12M']

/**
 * computed — derives accuracy statistics from the raw history object.
 * Called with useMemo whenever history or margin changes.
 * Returns null if no history is loaded yet.
 *
 * @param {Object} history — raw history { batches: [...] }
 * @param {number} margin  — hit tolerance in % (from Settings)
 * @returns {Object|null}  — accuracy stats object
 */

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

export function useHistory(margin = 5) {
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
    if (!configured) { setLog('Supabase not configured — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env'); return }
    setLoading(true)
    setLog(auto ? 'Auto-loading history...' : 'Loading history from Supabase...')
    const data = await loadHistory()
    if (data) {
      setHistory(data)
      const n = data.batches?.length ?? 0
      setLog(`History loaded — ${n} batch${n !== 1 ? 'es' : ''} found`)
    } else {
      setLog('Could not load history — check Supabase credentials')
    }
    setLoading(false)
  }, [configured])

  // ── Save batch ────────────────────────────────────────────────────────────────
  /**
   * saveBatch — evaluates all stocks across all horizons and saves to Supabase.
   *
   * For each stock × horizon:
   *   - Expired horizons: records actual price and evaluates verdict
   *   - Future horizons: saves as "awaiting" with null priceOnDate
   *
   * Also saves: notes, marketData, fundamentals alongside results.
   * Merges with existing batch if one already exists for the same date.
   */
  const saveBatch = useCallback(async ({
    stocks, autoPrices, histPrices, overrides,
    horizonExpired, horizon, notes, marketData, fundamentals,
  }) => {
    if (!configured) { setLog('Storage not configured'); return false }
    if (!stocks.length) { setLog('No stocks to save'); return false }

    setSaving(true)
    setLog('Evaluating and saving batch...')

    const KEYS = { '1M':'d1', '3M':'d3', '6M':'d6', '12M':'d12' }

    // Collect all results across all horizons — include note per ticker
    const results = []
    for (const stock of stocks) {
      for (const h of HORIZONS) {
        const tgt     = getTarget(stock, h)
        const tgtDate = getTargetDate(stock, h)

        // A horizon is only evaluable if its target date has passed
        const thisHorizonExpired = tgtDate
          ? dateStatus(tgtDate) === 'past'
          : false

        // Only use historical price for expired horizons
        // Never evaluate a future horizon as hit/miss — mark as awaiting
        let finalVerdict = 'awaiting'
        let priceOnDate  = null

        if (thisHorizonExpired) {
          const { price: p } = getEffectivePrice(
            stock.t, h, autoPrices, histPrices, overrides, true
          )
          if (p) {
            const { verdict } = evaluatePrediction(p, tgt, stock.b, margin)
            finalVerdict = verdict ?? 'awaiting'
            priceOnDate  = p
          }
          // If no historical price available yet — stays awaiting
        }

        results.push({
          ticker:      stock.t,
          company:     stock.co,
          horizon:     h,
          verdict:     finalVerdict,
          basePrice:   stock.b,
          targetPrice: tgt,
          priceOnDate,
          targetDate:  tgtDate ? formatDate(tgtDate) : null,
          note:        h === '1M' ? (notes?.[stock.t] || '') : undefined,
        })
      }
    }

    // Build batch ID from first stock's base date
    const firstBase = stocks.find(s => s.base)?.base

    // buildBatchId expects "DD/MM/YYYY" — convert Date object directly
    const batchDateStr = firstBase
      ? `${String(firstBase.getDate()).padStart(2,'0')}/${String(firstBase.getMonth()+1).padStart(2,'0')}/${firstBase.getFullYear()}`
      : null
    const batchId = buildBatchId(batchDateStr)

    // Merge into existing history — if same batch ID exists, MERGE tickers
    // (don't overwrite — user may be adding more tickers to same date batch)
    const current     = history ?? { batches: [] }
    const existingBatch = current.batches.find(b => b.id === batchId)

    let mergedResults = results
    let mergedStocks  = stocks.length

    if (existingBatch) {
      // Keep existing results for tickers NOT in current batch
      // Replace results for tickers that ARE in current batch (updated prices)
      const currentTickers = new Set(stocks.map(s => s.t))
      const keptResults    = existingBatch.results.filter(r => !currentTickers.has(r.ticker))
      mergedResults        = [...keptResults, ...results]
      // Count unique tickers
      const uniqueTickers  = new Set(mergedResults.map(r => r.ticker))
      mergedStocks         = uniqueTickers.size
      setLog(`Merging ${stocks.length} new tickers with ${existingBatch.stocks} existing — total ${mergedStocks} tickers…`)
    }

    // Build horizon status
    const HKEYS = { '1M':'d1', '3M':'d3', '6M':'d6', '12M':'d12' }
    const firstStock = stocks.find(s => s.base)
    const horizonStatus = {}
    for (const h of HORIZONS) {
      if (firstStock) {
        const tg      = targetDates(firstStock.base)
        const tgtDate = tg[HKEYS[h]]
        horizonStatus[h] = tgtDate ? dateStatus(tgtDate) === 'past' : false
      } else {
        horizonStatus[h] = false
      }
    }

    // Compute HIT rate
    const evaluated = mergedResults.filter(r => r.verdict !== 'awaiting')
    const hits      = evaluated.filter(r => r.verdict === 'hit').length
    const hitRate   = evaluated.length ? Math.round(hits / evaluated.length * 100) : null

    // Build complete newBatch in one go — all fields present before passing to saveHistory
    const newBatch = {
      id:            batchId,
      date:          batchDateStr ?? formatDate(getToday()),
      savedAt:       existingBatch?.savedAt ?? new Date().toISOString(),
      stocks:        mergedStocks,
      results:       mergedResults,
      horizonStatus,
      hitRate,
      marketData:    marketData    ?? existingBatch?.marketData    ?? null,
      fundamentals:  (fundamentals && Object.keys(fundamentals).length > 0)
                       ? fundamentals
                       : (existingBatch?.fundamentals ?? null),
    }

    const otherBatches = current.batches.filter(b => b.id !== batchId)
    const updated      = { batches: [newBatch, ...otherBatches] }

    const batchMeta = {
      batchDate: batchDateStr ?? formatDate(getToday()),
      stocks:    mergedStocks,
      horizonStatus,
      hitRate,
    }

    const ok = await saveHistory(updated, batchMeta)
    if (ok) {
      setHistory(updated)
      setLog(`Batch ${batchId} saved — ${results.length} predictions`)
      // Also update fundamentals_cache — keeps ticker-level cache in sync
      // Fire and forget — don't block UI on cache update
      if (fundamentals && Object.keys(fundamentals).length > 0) {
        saveFundamentalsCache(fundamentals).catch(err =>
          console.warn('[useHistory] fundamentals cache update failed:', err.message)
        )
      }
    } else {
      setLog('Save failed — check Supabase credentials')
    }
    setSaving(false)
    return ok
  }, [history, configured])

  // ── Delete a batch ─────────────────────────────────────────────────────────
  const deleteBatch = useCallback(async (batchId) => {
    if (!configured) { setLog('Storage not configured'); return false }
    setSaving(true)
    setLog(`Deleting batch ${batchId}…`)
    try {
      const ok = await deleteHistoryBatch(batchId)
      if (ok) {
        setHistory(prev => {
          if (!prev) return prev
          return { batches: prev.batches.filter(b => b.id !== batchId) }
        })
        setLog(`Batch ${batchId} deleted`)
      } else {
        setLog(`Failed to delete batch ${batchId}`)
      }
      return ok
    } catch (err) {
      setLog('Delete error: ' + err.message)
      return false
    } finally {
      setSaving(false)
    }
  }, [configured])
  const stats = computed(history)

  return { history, stats, loading, saving, log, configured, load, saveBatch, deleteBatch }
}

// ── Compute accuracy stats from history ───────────────────────────────────────

// Parse DD/MM/YYYY or "DD Mon YYYY" to a Date for sorting
function parseBatchDate(str) {
  if (!str) return new Date(0)
  // DD/MM/YYYY
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1])
  // fallback — let browser parse
  const d = new Date(str)
  return isNaN(d) ? new Date(0) : d
}

function computed(history) {
  if (!history?.batches?.length) return null

  const HORIZONS = ['1M', '3M', '6M', '12M']

  // Sort batches chronologically (oldest first for chart, newest first for table)
  const sortedBatches = [...history.batches].sort(
    (a, b) => parseBatchDate(a.date) - parseBatchDate(b.date)
  )

  const all = sortedBatches.flatMap(b => b.results)

  // Per-horizon breakdown — uses SNAPSHOT_PARAMS fixed thresholds per horizon
  // This ensures all batches are evaluated with consistent criteria regardless
  // of what hitMargin was set when they were originally saved.
  const byHorizon = HORIZONS.map(h => {
    const params   = SNAPSHOT_PARAMS[h]   // fixed H and R for this horizon
    const allRows  = all.filter(r => r.horizon === h)
    const rows     = allRows.filter(r => r.verdict !== 'awaiting')

    // Count each verdict — note: verdicts were saved with the old margin,
    // so we reclassify using SNAPSHOT_PARAMS for consistency.
    // 'exceeded' and 'wrong_way' are new in v7.3.0 — older batches may not have them.
    // We count them as hit/miss respectively for backwards compatibility.
    const hit      = rows.filter(r => r.verdict === 'hit').length
    const exceeded = rows.filter(r => r.verdict === 'exceeded').length
    const close    = rows.filter(r => r.verdict === 'close').length
    const miss     = rows.filter(r => r.verdict === 'miss').length
    const wrongWay = rows.filter(r => r.verdict === 'wrong_way').length
    const awaiting = allRows.filter(r => r.verdict === 'awaiting').length

    const total       = rows.length                    // evaluated (excludes awaiting)
    const hitRate     = total ? Math.round(hit / total * 100) : null
    const hitRateExt  = total ? Math.round((hit + exceeded) / total * 100) : null

    return {
      horizon: h,
      H: params.H, R: params.R,                        // snapshot params for reference
      total, hit, exceeded, close, miss, wrongWay, awaiting,
      hitRate, hitRateExt,
    }
  })

  // Overall counts across all horizons
  const evaluated     = all.filter(r => r.verdict !== 'awaiting')
  const totalHit      = evaluated.filter(r => r.verdict === 'hit').length
  const totalExceeded = evaluated.filter(r => r.verdict === 'exceeded').length
  const totalAwaiting = all.filter(r => r.verdict === 'awaiting').length
  const overallRate   = evaluated.length ? Math.round(totalHit / evaluated.length * 100) : null
  const overallRateExt = evaluated.length
    ? Math.round((totalHit + totalExceeded) / evaluated.length * 100)
    : null
  const uniqueTickers = new Set(all.map(r => r.ticker)).size

  // Best and worst horizon by hit rate pure
  const ranked = byHorizon.filter(h => h.hitRate !== null).sort((a, b) => b.hitRate - a.hitRate)
  const bestH  = ranked[0]  ?? null
  const worstH = ranked[ranked.length - 1] ?? null

  // Per-batch summary for the Accuracy Stats table
  const batchSummary = [...sortedBatches].reverse().map(b => {
    const res        = b.results
    const evaluated  = res.filter(r => r.verdict !== 'awaiting')
    const hit        = evaluated.filter(r => r.verdict === 'hit').length
    const exceeded   = evaluated.filter(r => r.verdict === 'exceeded').length
    const close      = evaluated.filter(r => r.verdict === 'close').length
    const miss       = evaluated.filter(r => r.verdict === 'miss').length
    const wrongWay   = evaluated.filter(r => r.verdict === 'wrong_way').length
    const awaiting   = res.filter(r => r.verdict === 'awaiting').length
    const hitRate    = evaluated.length ? Math.round(hit / evaluated.length * 100) : null
    const hitRateExt = evaluated.length
      ? Math.round((hit + exceeded) / evaluated.length * 100)
      : null
    return {
      id: b.id, date: b.date,
      savedAt: b.savedAt, updatedAt: b.updatedAt,
      stocks: b.stocks, evaluated: evaluated.length,
      hit, exceeded, close, miss, wrongWay, awaiting,
      hitRate, hitRateExt,
    }
  })

  // Chart data — hit% per horizon per batch (chronological)
  const chartBatches = sortedBatches  // already oldest→newest for chart
  const chartData = HORIZONS.map(h =>
    chartBatches.map(b => {
      const rows  = b.results.filter(r => r.horizon === h && r.verdict !== 'awaiting')
      const hit   = rows.filter(r => r.verdict === 'hit').length
      return rows.length ? Math.round(hit / rows.length * 100) : null
    })
  )
  const chartLabels = chartBatches.map(b => b.date)

  return {
    byHorizon, overallRate, overallRateExt, bestH, worstH,
    evaluated: evaluated.length,
    totalAwaiting,
    uniqueTickers,
    totalBatches: history.batches.length,
    batchSummary, chartData, chartLabels,
  }
}
