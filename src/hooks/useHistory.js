import { useState, useCallback, useEffect } from 'react'
import { loadHistory, saveHistory, buildBatchId, isStorageConfigured, deleteHistoryBatch } from '../services/storage.js'
import { formatDate, today as getToday, targetDates, dateStatus } from '../utils/dates.js'
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

  // ── Evaluate current stocks and save batch ─────────────────────────────────
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
        const { price: p } = getEffectivePrice(
          stock.t, h, autoPrices, histPrices, overrides, horizonExpired
        )
        const tgt     = getTarget(stock, h)
        const tgtDate = getTargetDate(stock, h)
        const { verdict } = evaluatePrediction(p, tgt, stock.b, margin)

        results.push({
          ticker:      stock.t,
          company:     stock.co,
          horizon:     h,
          verdict:     verdict ?? 'awaiting',
          basePrice:   stock.b,
          targetPrice: tgt,
          priceOnDate: p ?? null,
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
  const stats = computed(history, margin)

  return { history, stats, loading, saving, log, configured, load, saveBatch, deleteBatch }
}

// ── Compute accuracy stats from history ───────────────────────────────────────

function computed(history, margin = 5) {
  if (!history?.batches?.length) return null

  const HORIZONS = ['1M', '3M', '6M', '12M']
  const all = history.batches.flatMap(b => b.results)

  // Per-horizon breakdown
  const byHorizon = HORIZONS.map(h => {
    const allRows  = all.filter(r => r.horizon === h)
    const rows     = allRows.filter(r => r.verdict !== 'awaiting')
    const hit      = rows.filter(r => r.verdict === 'hit').length
    const close    = rows.filter(r => r.verdict === 'close').length
    const miss     = rows.filter(r => r.verdict === 'miss').length
    const awaiting = allRows.filter(r => r.verdict === 'awaiting').length
    const total    = rows.length  // evaluated only (excludes awaiting)
    const hitRate  = total ? Math.round(hit / total * 100) : null
    const hitClose = total ? Math.round((hit + close) / total * 100) : null
    return { horizon: h, total, hit, close, miss, awaiting, hitRate, hitClose }
  })

  // Overall
  const evaluated    = all.filter(r => r.verdict !== 'awaiting')
  const totalHit     = evaluated.filter(r => r.verdict === 'hit').length
  const totalAwaiting = all.filter(r => r.verdict === 'awaiting').length
  const overallRate  = evaluated.length ? Math.round(totalHit / evaluated.length * 100) : null
  const uniqueTickers = new Set(all.map(r => r.ticker)).size

  // Best and worst horizon
  const ranked    = byHorizon.filter(h => h.hitRate !== null).sort((a, b) => b.hitRate - a.hitRate)
  const bestH     = ranked[0]  ?? null
  const worstH    = ranked[ranked.length - 1] ?? null

  // Per-batch summary for the table
  const batchSummary = history.batches.map(b => {
    const res       = b.results
    const evaluated = res.filter(r => r.verdict !== 'awaiting')
    const hit       = evaluated.filter(r => r.verdict === 'hit').length
    const close     = evaluated.filter(r => r.verdict === 'close').length
    const miss      = evaluated.filter(r => r.verdict === 'miss').length
    const awaiting  = res.filter(r => r.verdict === 'awaiting').length
    const hitRate   = evaluated.length ? Math.round(hit / evaluated.length * 100) : null
    return {
      id: b.id, date: b.date,
      savedAt: b.savedAt, updatedAt: b.updatedAt,
      stocks: b.stocks, evaluated: evaluated.length,
      hit, close, miss, awaiting, hitRate,
    }
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
    totalAwaiting,
    uniqueTickers,
    totalBatches: history.batches.length,
    batchSummary, chartData, chartLabels,
  }
}
