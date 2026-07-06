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
 *   overallRate       — hit % across all batches and horizons (pure — hit only)
 *   overallRateClose  — hit % including 'close' verdicts (v7.19.0)
 *   overallRateExt    — hit % including 'close' + 'exceeded' verdicts (v7.19.0: now includes close)
 *   byHorizon         — 3-tier hit rate per horizon (1M/3M/6M/12M): hitRate/hitRateClose/hitRateExt
 *   batchSummary      — per-batch hit/close/exceeded/miss/awaiting counts + 3-tier rates
 *   chartData         — alias of chartDataByMetric.hit (back-compat, pure-hit series)
 *   chartDataByMetric — { hit, hitClose, hitExt } — 3 parallel series per horizon over time
 *   chartLabels       — batch dates for X axis
 *   uniqueTickers     — count of unique tickers across all batches
 *   totalAwaiting     — count of predictions still awaiting expiry
 *   evaluated         — count of predictions that have been evaluated
 *   totalBatches      — number of saved batches
 *
 * verdict ladder (v7.19.0) — each metric includes the previous one:
 *   hitRate      = hit / evaluated
 *   hitRateClose = (hit + close) / evaluated
 *   hitRateExt   = (hit + close + exceeded) / evaluated
 *   miss and wrong_way never count toward any rate.
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
import { loadHistory, saveHistory, buildBatchId, marketOf, isStorageConfigured, deleteHistoryBatch, deleteStockFromBatch as deleteStockFromBatchStorage, saveFundamentalsCache } from '../services/storage.js'
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
    direction = 'bullish',
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

        // Skip this horizon entirely if there is no target price.
        // This happens when the CSV had '--' or empty for this column
        // (e.g. new batches without 12M). Skipping avoids junk rows in Supabase.
        if (!tgt || tgt <= 0) continue

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
            stock.t, h, autoPrices, histPrices, overrides, true, /* snapshot */ true
          )
          if (p) {
            // Use snapshot mode — fixed SNAPSHOT_PARAMS per horizon
            // This ensures all batches saved to Supabase use consistent thresholds
            // regardless of what hitMargin was set in the slider at save time
            const { verdict } = evaluatePrediction(p, tgt, stock.b, 5, { horizon: h })
            finalVerdict = verdict ?? 'awaiting'
            priceOnDate  = p
          }
          // If no historical price available yet — stays awaiting
        }

        results.push({
          ticker:      stock.t,
          company:     stock.co,
          currency:    stock.cu ?? 'USD',
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
    // Composite id: date + market + direction.
    // Market is derived from the first ticker's suffix (one market per import).
    // This keeps same-day batches with a different market/direction separate
    // instead of merging them on a date-only key.
    const market  = marketOf(stocks[0]?.t)
    const batchId = buildBatchId(batchDateStr, market, direction)

    // Merge into existing history — if same batch ID exists, MERGE tickers
    // (don't overwrite — user may be adding more tickers to same date batch)
    // Look up the existing same-id batch from the freshest source (the DB),
    // not only from in-memory state. After a page reload — or any time the
    // in-memory history lags behind Supabase — the in-memory list can miss an
    // existing same-day batch, so the save would OVERWRITE it with just the
    // re-imported tickers instead of MERGING. Reloading here guarantees that a
    // re-import of the same date+market+direction always merges.
    let current = history ?? { batches: [] }
    try {
      const fresh = await loadHistory()
      if (fresh?.batches) current = fresh
    } catch { /* fall back to in-memory history */ }
    const existingBatch = current.batches.find(b => b.id === batchId)

    let mergedResults = results
    let mergedStocks  = stocks.length

    if (existingBatch) {
      // Keep existing results for tickers NOT in current batch
      // Replace results for tickers that ARE in current batch (updated prices)
      const currentTickers = new Set(stocks.map(s => s.t))
      const keptResults    = (existingBatch.results ?? []).filter(r => !currentTickers.has(r.ticker))
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

    // Compute hit rates — 3-tier ladder (each includes the previous) for Supabase storage
    // Pure:     hits ÷ evaluated (strict — only within ±H% of target)
    // Close:    (hits + close) ÷ evaluated (adds near-target misses)
    // Extended: (hits + close + exceeded) ÷ evaluated (adds surpassed targets)
    const evaluated    = mergedResults.filter(r => r.verdict !== 'awaiting')
    const hits         = evaluated.filter(r => r.verdict === 'hit').length
    const closes       = evaluated.filter(r => r.verdict === 'close').length
    const exceededs    = evaluated.filter(r => r.verdict === 'exceeded').length
    const hitRate      = evaluated.length ? Math.round(hits / evaluated.length * 100) : null
    const hitRateClose = evaluated.length ? Math.round((hits + closes) / evaluated.length * 100) : null
    const hitRateExt   = evaluated.length ? Math.round((hits + closes + exceededs) / evaluated.length * 100) : null

    // Build complete newBatch in one go — all fields present before passing to saveHistory
    const newBatch = {
      id:            batchId,
      date:          batchDateStr ?? formatDate(getToday()),
      savedAt:       existingBatch?.savedAt ?? new Date().toISOString(),
      stocks:        mergedStocks,
      results:       mergedResults,
      horizonStatus,
      hitRate,
      hitRateClose,
      hitRateExt,
      direction,
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
      hitRateClose,
      hitRateExt,
      direction,
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
  // ── Delete a single ticker from a batch ────────────────────────────────────
  /**
   * deleteStock(batchId, ticker)
   *
   * Removes one ticker from a batch in Supabase (PATCH, not DELETE row).
   * Also updates local history state so the UI reflects the change immediately
   * without requiring a full reload.
   *
   * @param {string} batchId — YYYY-MM-DD batch id
   * @param {string} ticker  — ticker string e.g. "MU", "TER.US"
   * @returns {Promise<boolean>} true on success
   */
  const deleteStock = useCallback(async (batchId, ticker) => {
    if (!configured) { setLog('Storage not configured'); return false }
    setSaving(true)
    setLog(`Removing ${ticker} from batch ${batchId}…`)
    try {
      const ok = await deleteStockFromBatchStorage(batchId, ticker)
      if (ok) {
        // Update local history immediately — remove ticker rows + recalculate stocks count
        setHistory(prev => {
          if (!prev) return prev
          return {
            batches: prev.batches.map(b => {
              if (b.id !== batchId) return b
              const newResults    = b.results.filter(r => r.ticker !== ticker)
              const uniqueTickers = new Set(newResults.map(r => r.ticker))
              const evaluated     = newResults.filter(r => r.verdict !== 'awaiting')
              const hits          = evaluated.filter(r => r.verdict === 'hit').length
              const close         = evaluated.filter(r => r.verdict === 'close').length
              const exceeded      = evaluated.filter(r => r.verdict === 'exceeded').length
              return {
                ...b,
                results:       newResults,
                stocks:        uniqueTickers.size,
                hitRate:       evaluated.length ? Math.round(hits / evaluated.length * 100) : null,
                hitRateClose:  evaluated.length ? Math.round((hits + close) / evaluated.length * 100) : null,
                hitRateExt:    evaluated.length ? Math.round((hits + close + exceeded) / evaluated.length * 100) : null,
                updatedAt:     new Date().toISOString(),
              }
            }),
          }
        })
        setLog(`${ticker} removed from batch ${batchId}`)
      } else {
        setLog(`Failed to remove ${ticker} from batch ${batchId}`)
      }
      return ok
    } catch (err) {
      setLog('Delete stock error: ' + err.message)
      return false
    } finally {
      setSaving(false)
    }
  }, [configured])

  const stats = computed(history)

  return { history, stats, loading, saving, log, configured, load, saveBatch, deleteBatch, deleteStock }
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

    const total        = rows.length                    // evaluated (excludes awaiting)
    // 3-tier ladder — each metric includes the previous one:
    const hitRate      = total ? Math.round(hit / total * 100) : null
    const hitRateClose = total ? Math.round((hit + close) / total * 100) : null
    const hitRateExt   = total ? Math.round((hit + close + exceeded) / total * 100) : null

    return {
      horizon: h,
      H: params.H, R: params.R,                        // snapshot params for reference
      total, hit, exceeded, close, miss, wrongWay, awaiting,
      hitRate, hitRateClose, hitRateExt,
    }
  })

  // Overall counts across all horizons — 3-tier ladder
  const evaluated       = all.filter(r => r.verdict !== 'awaiting')
  const totalHit        = evaluated.filter(r => r.verdict === 'hit').length
  const totalClose      = evaluated.filter(r => r.verdict === 'close').length
  const totalExceeded   = evaluated.filter(r => r.verdict === 'exceeded').length
  const totalAwaiting   = all.filter(r => r.verdict === 'awaiting').length
  const overallRate     = evaluated.length ? Math.round(totalHit / evaluated.length * 100) : null
  const overallRateClose = evaluated.length
    ? Math.round((totalHit + totalClose) / evaluated.length * 100)
    : null
  const overallRateExt  = evaluated.length
    ? Math.round((totalHit + totalClose + totalExceeded) / evaluated.length * 100)
    : null
  const uniqueTickers   = new Set(all.map(r => r.ticker)).size

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
    const hitRate      = evaluated.length ? Math.round(hit / evaluated.length * 100) : null
    const hitRateClose = evaluated.length
      ? Math.round((hit + close) / evaluated.length * 100)
      : null
    const hitRateExt   = evaluated.length
      ? Math.round((hit + close + exceeded) / evaluated.length * 100)
      : null
    return {
      id: b.id, date: b.date,
      savedAt: b.savedAt, updatedAt: b.updatedAt,
      stocks: b.stocks, evaluated: evaluated.length,
      hit, exceeded, close, miss, wrongWay, awaiting,
      hitRate, hitRateClose, hitRateExt,
      direction: b.direction ?? 'bullish',
      market: marketOf(b.results?.[0]?.ticker),
    }
  })

  // Chart data — 3 parallel series per horizon per batch (chronological),
  // one per metric tier, so the trend chart's selector (v7.19.3) can switch series.
  const chartBatches = sortedBatches  // already oldest→newest for chart
  const chartDataByMetric = {
    hit: HORIZONS.map(h =>
      chartBatches.map(b => {
        const rows = b.results.filter(r => r.horizon === h && r.verdict !== 'awaiting')
        const hit  = rows.filter(r => r.verdict === 'hit').length
        return rows.length ? Math.round(hit / rows.length * 100) : null
      })
    ),
    hitClose: HORIZONS.map(h =>
      chartBatches.map(b => {
        const rows  = b.results.filter(r => r.horizon === h && r.verdict !== 'awaiting')
        const hit   = rows.filter(r => r.verdict === 'hit').length
        const close = rows.filter(r => r.verdict === 'close').length
        return rows.length ? Math.round((hit + close) / rows.length * 100) : null
      })
    ),
    hitExt: HORIZONS.map(h =>
      chartBatches.map(b => {
        const rows     = b.results.filter(r => r.horizon === h && r.verdict !== 'awaiting')
        const hit      = rows.filter(r => r.verdict === 'hit').length
        const close    = rows.filter(r => r.verdict === 'close').length
        const exceeded = rows.filter(r => r.verdict === 'exceeded').length
        return rows.length ? Math.round((hit + close + exceeded) / rows.length * 100) : null
      })
    ),
  }
  // Kept as alias of chartDataByMetric.hit — AccuracyChart.jsx is the only consumer
  // today and reads the pure-hit series; the v7.19.1+ UI work will migrate it to
  // read chartDataByMetric directly with the new 3-position selector.
  const chartData = chartDataByMetric.hit
  const chartLabels = chartBatches.map(b => b.date)

  return {
    byHorizon, overallRate, overallRateClose, overallRateExt, bestH, worstH,
    evaluated: evaluated.length,
    totalAwaiting,
    uniqueTickers,
    totalBatches: history.batches.length,
    batchSummary, chartData, chartDataByMetric, chartLabels,
  }
}
