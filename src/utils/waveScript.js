/**
 * waveScript.js — pure logic for the Wave Script page.
 *
 * Extracted from WaveScriptPage.jsx (v7.15.7) so the generation logic can be
 * unit-tested in isolation, following the repo convention of pure helpers in
 * src/utils/ with a co-located *.test.js (see dates.js, stocks.js).
 *
 * No React, no side effects. Two main exports:
 *   - extractWaves(batches)      → ordered, de-duplicated wave objects
 *   - buildPineScript(waves)     → the indicador_master_ondas.txt content
 * Plus small date/ticker helpers, exported for direct testing.
 *
 * Behaviour is byte-for-byte identical to the inline version it replaced.
 */

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * parseDDMMYYYY — batch.date is the "DD/MM/YYYY" string used across the app.
 * Returns a Date at local midnight, or null if unparseable.
 */
export function parseDDMMYYYY(s) {
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
export function addMonths(date, months) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

/** epochMs — TradingView xloc.bar_time expects UNIX time in milliseconds. */
export function epochMs(date) {
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
export function stripMarket(rawTicker) {
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
export function extractWaves(batches) {
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

/**
 * buildPineScript — assemble the full indicador_master_ondas.txt content.
 *
 * SCALABLE DATA LOADING (avoids CE10209 "too many local variables"):
 * Instead of emitting one `array.push(...)` per coordinate per wave — which
 * declares a local variable per push in #main and blows Pine's 1200-local
 * limit after ~100 waves — all wave data is emitted as a SINGLE string
 * constant (one wave per line, fields separated by ";"). Pine splits it once
 * and parses each row in a loop, using a fixed handful of locals regardless of
 * how many waves there are. The only remaining ceiling is the 500-line draw
 * limit, not the variable count.
 *
 * Row format:  ticker;ci;t0;p0;t1;p1;t2;p2;t3;p3;t4;p4
 *   - ci  = per-ticker colour index (0,1,2,…)
 *   - tN  = epoch ms (integer)
 *   - pN  = price; the 12M field (p4) is LEFT EMPTY when absent →
 *           str.tonumber("") returns na → final segment stays unpainted.
 *
 * Per-ticker filtering: the renderer draws a row ONLY when its ticker equals
 * `syminfo.ticker`, so AMD's waves appear only on AMD and a symbol in no batch
 * shows nothing. Colour is by chronological order WITHIN each ticker.
 */
export function buildPineScript(waves) {
  // Per-ticker colour index: waves are already chronologically sorted, so the
  // Nth wave of a given ticker gets colour index N (0,1,2,…).
  const seenPerTicker = new Map()
  const colourIdx = waves.map(w => {
    const n = seenPerTicker.get(w.tickerNorm) || 0
    seenPerTicker.set(w.tickerNorm, n + 1)
    return n
  })

  // Build the single data string. Empty p4 field → na in Pine.
  // ticker;ci;t0;p0;t1;p1;t2;p2;t3;p3;t4;p4
  const rows = waves.map((w, i) => {
    const p4 = w.p4 == null ? '' : String(w.p4)
    return [
      w.tickerNorm, colourIdx[i],
      w.t0, w.p0, w.t1, w.p1, w.t2, w.p2, w.t3, w.p3, w.t4, p4,
    ].join(';')
  })

  // Escape nothing special needed: tickers are [A-Z.]; numbers are plain.
  // Newlines separate rows inside one Pine string literal.
  const dataLiteral = rows.join('\\n')

  const header = `//@version=6
indicator("Openbank Forecast Ondas v6", overlay = true, max_lines_count = 500, max_labels_count = 500)

// ─────────────────────────────────────────────────────────────────────────────
// Auto-generated by Openbank Price Prediction — Wave Script page.
// One wave per batch projection, drawn ONLY on its own ticker's chart.
// Colour follows chronological order within each ticker.
// Missing 12M target → final segment is left unpainted (empty p4 → na).
// Waves: ${waves.length}
//
// Data model: a single string constant (one wave per line, fields split by ";")
// is parsed in a loop — fixed local-variable count regardless of wave count
// (avoids CE10209). Row: ticker;ci;t0;p0;t1;p1;t2;p2;t3;p3;t4;p4
// ─────────────────────────────────────────────────────────────────────────────

// All wave data in one string constant (one wave per line).
const string WAVE_DATA = "${dataLiteral}"

// ─── Helper: draw one parsed wave ────────────────────────────────────────────
//@function Draws a small dot (●) at a forecast point in the given colour.
dot(int tx, float px, color c) =>
    label.new(tx, px, "●", xloc = xloc.bar_time, color = color.new(color.white, 100), textcolor = c, style = label.style_label_center, size = size.tiny)

//@function Draws a single wave (Base→1M→3M→6M→12M) from a parsed field array.
//@param f (array<string>) the 12 fields of one row
drawWave(array<string> f) =>
    int   ci = int(str.tonumber(array.get(f, 1)))
    int   t0 = int(str.tonumber(array.get(f, 2)))
    float p0 = str.tonumber(array.get(f, 3))
    int   t1 = int(str.tonumber(array.get(f, 4)))
    float p1 = str.tonumber(array.get(f, 5))
    int   t2 = int(str.tonumber(array.get(f, 6)))
    float p2 = str.tonumber(array.get(f, 7))
    int   t3 = int(str.tonumber(array.get(f, 8)))
    float p3 = str.tonumber(array.get(f, 9))
    int   t4 = int(str.tonumber(array.get(f, 10)))
    float p4 = str.tonumber(array.get(f, 11))   // empty field → na

    // Colour by chronological order within this ticker.
    color c = ci == 0 ? color.red : ci == 1 ? color.blue : ci == 2 ? color.green : ci % 2 == 0 ? color.orange : color.purple

    // Mandatory spine: Base → 1M → 3M → 6M.
    line.new(t0, p0, t1, p1, xloc = xloc.bar_time, color = c, width = 2)
    line.new(t1, p1, t2, p2, xloc = xloc.bar_time, color = c, width = 2)
    line.new(t2, p2, t3, p3, xloc = xloc.bar_time, color = c, width = 2)

    // Dot (●) at each forecast point, in the wave's colour.
    dot(t0, p0, c)
    dot(t1, p1, c)
    dot(t2, p2, c)
    dot(t3, p3, c)

    // End point of the wave: 12M if present, else 6M. Dot + wave number there.
    int   tEnd = na(p4) ? t3 : t4
    float pEnd = na(p4) ? p3 : p4
    if not na(p4)
        // 12M segment + its dot only when a target exists.
        line.new(t3, p3, t4, p4, xloc = xloc.bar_time, color = c, width = 2)
        dot(t4, p4, c)

    // Wave number (1 = oldest for this ticker), same colour, just past the end.
    label.new(tEnd, pEnd, str.tostring(ci + 1), xloc = xloc.bar_time, color = color.new(color.white, 100), textcolor = c, style = label.style_label_left, size = size.large)
`

  const renderer = `
// Render on the last bar: split the data once, draw only rows for this symbol.
if barstate.islast and str.length(WAVE_DATA) > 0
    array<string> lines = str.split(WAVE_DATA, "\\n")
    for i = 0 to array.size(lines) - 1
        array<string> f = str.split(array.get(lines, i), ";")
        // Per-ticker filter: only draw waves for the open symbol.
        if array.get(f, 0) == syminfo.ticker
            drawWave(f)
`

  return `${header}${renderer}`
}
