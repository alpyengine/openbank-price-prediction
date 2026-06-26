/**
 * WaveScriptPage — Master Elliott Wave Pine Script generator.
 *
 * Compiles every saved batch projection into a single downloadable
 * TradingView Pine Script v6 indicator (indicador_master_ondas.txt).
 *
 * Each batch (with its own base date) is rendered as one independent
 * "wave": a polyline connecting Base → 1M → 3M → 6M → 12M targets.
 * The same ticker across several batches (different dates) becomes
 * several historical waves on the same chart.
 *
 * Data shape (from useHistory / Supabase `batches` table):
 *   Each batch  = { id, date: "DD/MM/YYYY", results: [...] }
 *   Each result = { ticker, company, horizon: "1M"|"3M"|"6M"|"12M",
 *                   basePrice, targetPrice }
 *   The 4 horizon rows per ticker are grouped into one wave.
 *
 * Horizon dates use CALENDAR-MONTH arithmetic from the batch base date
 * (1M = +1 month, 3M = +3, 6M = +6, 12M = +12) — same day-of-month.
 *
 * NULL HANDLING (critical): if a ticker has no 12M target, the wave is
 * drawn Base→1M→3M→6M only. The final 6M→12M segment is left UNDRAWN.
 * In Pine we push `na` (not a magic -1) for the missing 12M price and
 * test it with `na(p4)` — clean, collision-free, idiomatic v6.
 *
 * @param {Array} batches — all saved batches from useHistory (props).
 *                          If empty, falls back to a direct Supabase read.
 */
import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Waves, Download, FileCode, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * parseDDMMYYYY — batch.date is the "DD/MM/YYYY" string used across the app.
 * Returns a Date at local midnight, or null if unparseable.
 */
function parseDDMMYYYY(s) {
  if (!s || typeof s !== 'string') return null
  const [d, m, y] = s.split('/').map(Number)
  if (!d || !m || !y) return null
  return new Date(y, m - 1, d)
}

/**
 * addMonths — calendar-month arithmetic preserving the day number.
 * Mirrors the Openbank horizon rule (1M = +1 month, same day).
 * JS Date rolls overflowing days forward (e.g. 31 Jan +1M → 2/3 Mar);
 * acceptable for a visual indicator and consistent with the app's targets.
 */
function addMonths(date, months) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

/** epochMs — TradingView xloc.bar_time expects UNIX time in milliseconds. */
function epochMs(date) {
  return date.getTime()
}

/**
 * stripMarket — normalise a ticker to match TradingView's `syminfo.ticker`.
 *
 * TradingView reports the symbol WITHOUT a market suffix (MRNA, AMD, NEM),
 * while our internal tickers may carry one (TER.US, NEM.DE, ASML.AS…).
 * We strip the known market suffixes so the Pine guard
 * `array.get(tkr_arr, i) == syminfo.ticker` matches on the open chart.
 * NEM.DE → NEM | TER.US → TER | MU → MU
 */
function stripMarket(rawTicker) {
  return String(rawTicker || '').replace(/\.(US|DE|AS|PA|L|MC)$/i, '').toUpperCase()
}

// ── Wave extraction ───────────────────────────────────────────────────────────

/**
 * extractWaves — turn batches into ordered wave objects for Pine generation.
 *
 * Steps:
 *   1. For each batch, group its results[] rows by ticker (4 horizon rows → 1).
 *   2. Build a wave with t0..t4 (epoch ms) and p0..p4 (prices); p4 may be null.
 *   3. De-duplicate identical waves (same date + same prices) — discard repeats.
 *   4. Sort all surviving waves chronologically (oldest → newest) so colour
 *      assignment follows chart appearance order.
 *
 * @param {Array} batches
 * @returns {Array} waves — [{ ticker, company, baseDate, t0..t4, p0..p4, key }]
 */
function extractWaves(batches) {
  if (!batches?.length) return []

  const waves = []

  for (const batch of batches) {
    if (!batch?.results?.length) continue
    const baseDate = parseDDMMYYYY(batch.date)
    if (!baseDate) continue

    // Group the (up to 4) horizon rows per ticker within this batch.
    const byTicker = new Map()
    for (const r of batch.results) {
      const ticker = r.ticker || r.t || ''
      if (!ticker) continue
      if (!byTicker.has(ticker)) byTicker.set(ticker, [])
      byTicker.get(ticker).push(r)
    }

    for (const [ticker, rows] of byTicker) {
      const r0      = rows[0]
      const base    = Number(r0?.basePrice ?? r0?.b ?? 0)
      if (!(base > 0)) continue

      const target = h => {
        const row = rows.find(x => (x.horizon || '').toUpperCase() === h)
        const v   = Number(row?.targetPrice ?? row?.target ?? 0)
        return v > 0 ? v : null
      }

      const p1 = target('1M')
      const p3 = target('3M')
      const p6 = target('6M')
      const p12 = target('12M')   // may be null → final segment stays unpainted

      // A wave needs at least the 1M/3M/6M spine to be meaningful.
      if (p1 == null || p3 == null || p6 == null) continue

      const wave = {
        ticker,
        tickerNorm: stripMarket(ticker),   // matches TradingView syminfo.ticker
        company: r0?.company || r0?.co || ticker,
        baseDate,
        t0: epochMs(baseDate),
        t1: epochMs(addMonths(baseDate, 1)),
        t2: epochMs(addMonths(baseDate, 3)),
        t3: epochMs(addMonths(baseDate, 6)),
        t4: epochMs(addMonths(baseDate, 12)),
        p0: base, p1, p2: p3, p3: p6, p4: p12,
      }

      // De-dup key: ticker + base date + all prices. Identical → discarded.
      wave.key = [
        ticker, batch.date,
        base, p1, p3, p6, p12 ?? 'na',
      ].join('|')

      waves.push(wave)
    }
  }

  // Discard exact duplicates (same date AND same prices).
  const seen = new Set()
  const unique = waves.filter(w => {
    if (seen.has(w.key)) return false
    seen.add(w.key)
    return true
  })

  // Chronological order → colour assignment follows appearance order.
  unique.sort((a, b) => a.baseDate - b.baseDate)

  return unique
}

// ── Pine Script v6 generation ─────────────────────────────────────────────────

/** num — format a price for Pine source (or `na` literal for missing 12M). */
function num(v) {
  return v == null ? 'na' : String(v)
}

/**
 * buildPineScript — assemble the full indicador_master_ondas.txt content.
 *
 * Per-ticker filtering: each wave carries its (market-stripped) ticker in a
 * parallel string array; the renderer draws a wave ONLY when that ticker
 * equals `syminfo.ticker` of the open chart. So AMD's waves appear only on
 * AMD, and a symbol not in any batch shows nothing.
 *
 * Colour by chronological order WITHIN each ticker (not globally): a ticker's
 * 1st wave is red, 2nd blue, 3rd green, then orange/purple — so every symbol
 * starts its own colour sequence. The per-ticker colour index is precomputed
 * here in JS and pushed into a parallel int array.
 *
 * Null 12M handled with native `na` + `na(p4)` guard (no magic flag values).
 */
function buildPineScript(waves) {
  // Per-ticker colour index: waves are already chronologically sorted, so the
  // Nth wave of a given ticker gets colour index N (0,1,2,…).
  const seenPerTicker = new Map()
  const colourIdx = waves.map(w => {
    const n = seenPerTicker.get(w.tickerNorm) || 0
    seenPerTicker.set(w.tickerNorm, n + 1)
    return n
  })

  const header = `//@version=6
indicator("Sistema Maestro de Ondas Elliott V6", overlay = true, max_lines_count = 500)

// ─────────────────────────────────────────────────────────────────────────────
// Auto-generated by Openbank Price Prediction — Wave Script page.
// One wave per batch projection, drawn ONLY on its own ticker's chart.
// Colour follows chronological order within each ticker.
// Missing 12M target → final segment is left unpainted (p4 = na).
// Waves: ${waves.length}
// ─────────────────────────────────────────────────────────────────────────────

// Coordinate arrays — index i = wave i (already chronologically ordered).
var tkr_arr = array.new<string>()   // market-stripped ticker, matched vs syminfo.ticker
var ci_arr  = array.new<int>()      // per-ticker colour index (0,1,2,…)
var t0_arr  = array.new<int>()
var p0_arr  = array.new<float>()
var t1_arr  = array.new<int>()
var p1_arr  = array.new<float>()
var t2_arr  = array.new<int>()
var p2_arr  = array.new<float>()
var t3_arr  = array.new<int>()
var p3_arr  = array.new<float>()
var t4_arr  = array.new<int>()
var p4_arr  = array.new<float>()    // na when no 12M target exists
`

  // One push block per wave, loaded once on the first bar.
  const pushes = waves.map((w, i) => {
    const label = `${w.tickerNorm}  (${w.company})  base ${new Date(w.baseDate).toLocaleDateString('es-ES')}`
    return `    // [${i}] ${label}
    array.push(tkr_arr, "${w.tickerNorm}"), array.push(ci_arr, ${colourIdx[i]})
    array.push(t0_arr, ${w.t0}), array.push(p0_arr, ${num(w.p0)})
    array.push(t1_arr, ${w.t1}), array.push(p1_arr, ${num(w.p1)})
    array.push(t2_arr, ${w.t2}), array.push(p2_arr, ${num(w.p2)})
    array.push(t3_arr, ${w.t3}), array.push(p3_arr, ${num(w.p3)})
    array.push(t4_arr, ${w.t4}), array.push(p4_arr, ${num(w.p4)})`
  }).join('\n\n')

  const loader = `
if barstate.isfirst
${pushes || '    // (no waves)'}
`

  const renderer = `
// Render waves on the last bar — but only those whose ticker matches this chart.
if barstate.islast and array.size(t0_arr) > 0
    for i = 0 to array.size(t0_arr) - 1
        // Per-ticker filter: only draw waves for the open symbol.
        if array.get(tkr_arr, i) == syminfo.ticker
            int   t0 = array.get(t0_arr, i)
            float p0 = array.get(p0_arr, i)
            int   t1 = array.get(t1_arr, i)
            float p1 = array.get(p1_arr, i)
            int   t2 = array.get(t2_arr, i)
            float p2 = array.get(p2_arr, i)
            int   t3 = array.get(t3_arr, i)
            float p3 = array.get(p3_arr, i)
            int   t4 = array.get(t4_arr, i)
            float p4 = array.get(p4_arr, i)

            // Colour by chronological order within this ticker.
            int   ci = array.get(ci_arr, i)
            color c = ci == 0 ? color.red : ci == 1 ? color.blue : ci == 2 ? color.green : ci % 2 == 0 ? color.orange : color.purple

            // Mandatory spine: Base → 1M → 3M → 6M.
            line.new(t0, p0, t1, p1, xloc = xloc.bar_time, color = c, width = 2)
            line.new(t1, p1, t2, p2, xloc = xloc.bar_time, color = c, width = 2)
            line.new(t2, p2, t3, p3, xloc = xloc.bar_time, color = c, width = 2)

            // 12M segment only when a target exists. na(p4) → leave unpainted.
            if not na(p4)
                line.new(t3, p3, t4, p4, xloc = xloc.bar_time, color = c, width = 2)
`

  return `${header}${loader}${renderer}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WaveScriptPage({ batches = [] }) {
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)

  // Derive waves from props (already loaded from Supabase via useHistory).
  const waves = useMemo(() => extractWaves(batches), [batches])

  // Quick stats for the summary card.
  const stats = useMemo(() => {
    const tickers = new Set(waves.map(w => w.tickerNorm))
    const no12m   = waves.filter(w => w.p4 == null).length
    return { waves: waves.length, tickers: tickers.size, no12m }
  }, [waves])

  /**
   * Fallback path: if no batches arrived via props, read them straight
   * from Supabase with @supabase/supabase-js (RLS-guarded), then generate.
   */
  const loadFromSupabase = useCallback(async () => {
    const { data, error } = await supabase
      .from('batches')
      .select('id, date, results')
      .order('date', { ascending: true })
    if (error) throw error
    return data || []
  }, [])

  const handleDownload = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      let source = batches
      if (!source?.length) source = await loadFromSupabase()

      const computed = extractWaves(source)
      if (!computed.length) {
        setError('No hay proyecciones válidas para generar el indicador.')
        return
      }

      const pine = buildPineScript(computed)
      const blob = new Blob([pine], { type: 'text/plain;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = 'indicador_master_ondas.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e?.message || 'Error generando el indicador.')
    } finally {
      setBusy(false)
    }
  }, [batches, loadFromSupabase])

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Waves className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground">Wave Script</h1>
          <p className="text-xs text-muted-foreground">
            Genera el indicador Pine Script v6 con todas las ondas de proyección
          </p>
        </div>
      </div>

      {/* Summary */}
      <Card className="p-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-foreground">{stats.waves}</div>
            <div className="text-xs text-muted-foreground">Ondas</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{stats.tickers}</div>
            <div className="text-xs text-muted-foreground">Tickers únicos</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{stats.no12m}</div>
            <div className="text-xs text-muted-foreground">Sin 12M</div>
          </div>
        </div>
      </Card>

      {/* Info about generation rules */}
      <Card className="p-5 space-y-3">
        <div className="flex items-start gap-2 text-sm text-foreground">
          <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
          <span>
            Una onda por cada batch. El mismo ticker en fechas distintas se
            dibuja como onda histórica independiente.
          </span>
        </div>
        <div className="flex items-start gap-2 text-sm text-foreground">
          <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
          <span>
            Colores por orden cronológico: 1ª roja · 2ª azul · 3ª verde ·
            siguientes naranja/púrpura.
          </span>
        </div>
        <div className="flex items-start gap-2 text-sm text-foreground">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
          <span>
            Si falta el objetivo a 12M, el último tramo (6M → 12M) se deja
            sin pintar (<code className="text-xs">p4 = na</code> en Pine).
          </span>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Download */}
      <Button
        onClick={handleDownload}
        disabled={busy || stats.waves === 0}
        className="w-full gap-2"
      >
        {busy ? (
          <>Generando…</>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Descargar indicador_master_ondas.txt
          </>
        )}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <FileCode className="h-3.5 w-3.5" />
        Pine Script v6 · TradingView · overlay
      </p>
    </div>
  )
}
