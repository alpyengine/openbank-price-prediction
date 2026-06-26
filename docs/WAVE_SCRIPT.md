# Wave Script — Master Elliott Wave Pine Script generator (v7.15.0+)

The **Wave Script** page compiles every saved batch projection into a single
downloadable TradingView **Pine Script v6** indicator
(`indicador_master_ondas.txt`). Each batch is drawn as one independent
"wave" — a polyline connecting the base price to the 1M / 3M / 6M / 12M
targets — so the whole forecast history of a symbol can be inspected on one
TradingView chart.

The page is **admin-only** (gated in `App.jsx` by `role === 'admin'`, the same
pattern as Import CSV and Manage Users).

---

## 1. What it does

- Reads every batch (`batches` table) already loaded in memory via `useHistory`.
- Groups the four horizon rows per ticker into a single wave.
- Computes each wave's time axis from the **batch base date** using
  **calendar-month arithmetic** (1M = +1 month, 3M = +3, 6M = +6, 12M = +12,
  same day-of-month — the project's standard horizon rule).
- Emits one Pine Script v6 file that draws every wave, coloured by
  chronological order of appearance.
- Downloads the file automatically as `indicador_master_ondas.txt`.

One batch = one wave. The **same ticker across several batches with different
base dates** is drawn as several independent historical waves, so you can see
how the forecast for a symbol evolved over time.

---

## 2. Data model

The page does **not** assume a normalised `p1m/p3m/p6m/p12m` schema. It reads
the project's real shape: each row in `batch.results[]` is one horizon.

```
batch       = { id, date: "DD/MM/YYYY", results: [...] }
batch.result = { ticker, company, horizon: "1M"|"3M"|"6M"|"12M",
                 basePrice, targetPrice, ... }
```

The four horizon rows per ticker are grouped into one wave object:

```
wave = {
  ticker, company, baseDate,
  t0..t4,   // epoch ms — base date + calendar months
  p0..p4,   // prices — p0 = basePrice, p1..p4 = horizon targets
}
```

`p4` (the 12M target) **may be null** — see §5.

---

## 3. Source of truth: props first, Supabase fallback

The component receives `batches` as a prop (already fetched from Supabase by
`useHistory`), so the default path makes **zero extra network calls** — it
generates the script straight from memory, consistent with `AllStocksPage`
and `ExportPage`.

If the prop arrives empty, it falls back to a direct read with
`@supabase/supabase-js`:

```js
const { data, error } = await supabase
  .from('batches')
  .select('id, date, results')
  .order('date', { ascending: true })
```

This read is RLS-guarded by the anon key, same as the rest of the app.

---

## 4. Wave ordering, de-duplication and colour

1. **De-duplication.** Two waves with the *same base date AND the same prices*
   are identical and would draw the same lines twice, so duplicates are
   discarded (keyed on `ticker | date | p0 | p1 | p3 | p6 | p12`). The same
   ticker with a *different* base date is **not** a duplicate — it is a valid
   historical wave and is kept.

2. **Chronological order.** Surviving waves are sorted oldest → newest.

3. **Colour palette** — assigned by chronological order **within each ticker**,
   not globally. Every symbol restarts its own colour sequence, so a ticker's
   oldest wave is always red regardless of how many other tickers exist. The
   per-ticker colour index is precomputed in JS and pushed into `ci_arr`.

   | Wave index (per ticker) | Colour          |
   |-------------------------|-----------------|
   | 1st (oldest)            | `color.red`     |
   | 2nd                     | `color.blue`    |
   | 3rd                     | `color.green`   |
   | 4th onward              | `color.orange` / `color.purple` (alternating) |

---

## 5. Per-ticker filtering (v7.15.1) — waves only on their own chart

Each wave is drawn **only on the chart of its own ticker**. The waves of AMD
appear only when AMD is open; a symbol that is in no batch shows nothing.

How it works:

- Each wave carries its **market-stripped** ticker (`stripMarket`: `NEM.DE` →
  `NEM`, `TER.US` → `TER`, `MU` → `MU`) in a parallel string array `tkr_arr`.
  The strip is required because TradingView's `syminfo.ticker` reports the bare
  symbol with no market suffix.
- The renderer compares `array.get(tkr_arr, i) == syminfo.ticker` and only draws
  the wave when they match.

```pinescript
if barstate.islast and array.size(t0_arr) > 0
    for i = 0 to array.size(t0_arr) - 1
        // Only draw waves for the open symbol.
        if array.get(tkr_arr, i) == syminfo.ticker
            // …read coordinates, pick colour, draw the wave…
```

> **Note on exotic symbols.** `syminfo.ticker` is the plain symbol as TradingView
> names it (e.g. `MRNA`, `AMD`, `NEM`). For most US/EU equities the stripped
> ticker matches directly. If a symbol is listed under a different code on your
> TradingView exchange, that one wave simply won't render — adjust the stored
> ticker to match the TradingView symbol if needed.

---

## 6. Null handling (critical) — `na`, not a magic flag

If a ticker has no 12M target, the wave is drawn **Base → 1M → 3M → 6M only**.
The final 6M → 12M segment is left **unpainted**, so the chart visually shows
that no 12-month forecast exists.

The original design note suggested pushing `-1` into the price array as a
"missing" flag and testing `p4 > 0`. This page uses the **idiomatic Pine v6**
approach instead:

- Push the native **`na`** float into `p4_arr` when the 12M target is absent.
- Guard the final segment with **`if not na(p4)`**.

**Why `na` is better than `-1`:** `-1` is a magic sentinel that pollutes a price
array (which should only ever hold prices) and could in theory collide with a
real low price. `na` is Pine's native "no value", so the array stays
semantically clean and the guard is unambiguous. The generator emits literally
`array.push(p4_arr, na)` for a missing 12M.

A second hardening detail: the `indicator()` call sets
`max_lines_count=500`. Each wave draws up to 4 lines, so with many waves the
default Pine ceiling (50) would be exhausted and older waves would silently
vanish; 500 covers ~125 full waves.

---

## 7. Generated Pine Script v6 — reference

All wave data is emitted as a **single string constant** (`WAVE_DATA`), one wave
per line, fields separated by `;`. Pine splits it once on the last bar and parses
each row in a loop. Times use `xloc.bar_time` (epoch ms), so the lines sit at
absolute calendar dates regardless of the chart's bar spacing.

**Why a string instead of `array.push` blocks?** The earlier approach emitted one
`array.push(...)` per coordinate per wave (12 per wave). Each push declares a
local variable in Pine's `#main` scope, so ~100 waves exceeded the **1200
local-variable limit** (compile error **CE10209**). The string model parses every
wave with a *fixed* handful of locals, independent of wave count — the only
remaining ceiling is the 500-line draw limit.

Row format: `ticker;ci;t0;p0;t1;p1;t2;p2;t3;p3;t4;p4`
The 12M field (`p4`) is **left empty** when no target exists →
`str.tonumber("")` returns `na` → the final segment stays unpainted.

```pinescript
//@version=6
indicator("Sistema Maestro de Ondas Elliott V6", overlay = true, max_lines_count = 500, max_labels_count = 500)

// All wave data in one string constant (one wave per line).
// Row: ticker;ci;t0;p0;t1;p1;t2;p2;t3;p3;t4;p4   (empty p4 → na)
const string WAVE_DATA = "AMD;0;1736464800000;100;1739143200000;110;1744056000000;120;1752012000000;130;1767999600000;150\nAMD;1;1739143200000;105;1741822800000;115;1746478800000;125;1754434800000;135;1770422400000;\nNEM;0;1739143200000;50;1741822800000;55;1746478800000;58;1754434800000;60;1770422400000;65"

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

    // Dot (●) at each forecast point.
    dot(t0, p0, c)
    dot(t1, p1, c)
    dot(t2, p2, c)
    dot(t3, p3, c)

    // End point: 12M if present, else 6M. Dot + wave number there.
    int   tEnd = na(p4) ? t3 : t4
    float pEnd = na(p4) ? p3 : p4
    if not na(p4)
        line.new(t3, p3, t4, p4, xloc = xloc.bar_time, color = c, width = 2)
        dot(t4, p4, c)

    // Wave number (1 = oldest for this ticker), same colour.
    label.new(tEnd, pEnd, str.tostring(ci + 1), xloc = xloc.bar_time, color = color.new(color.white, 100), textcolor = c, style = label.style_label_left, size = size.large)

// Render on the last bar: split the data once, draw only rows for this symbol.
if barstate.islast and str.length(WAVE_DATA) > 0
    array<string> lines = str.split(WAVE_DATA, "\n")
    for i = 0 to array.size(lines) - 1
        array<string> f = str.split(array.get(lines, i), ";")
        // Per-ticker filter: only draw waves for the open symbol.
        if array.get(f, 0) == syminfo.ticker
            drawWave(f)
```

### Line-by-line notes

- `max_lines_count = 500` / `max_labels_count = 500` — raise Pine's default
  drawing budgets (lines and labels) so many waves render without truncation.
  Each wave draws up to 4 lines + up to 6 labels (5 dots + 1 number).
- `const string WAVE_DATA` — every wave in one literal, one row per line,
  fields split by `;`. Fixed local-variable cost regardless of wave count
  (this is the fix for **CE10209**).
- Empty trailing field (`…;135;1770422400000;`) — the missing 12M price;
  `str.tonumber("")` → `na`, so the 6M→12M segment is skipped.
- `drawWave(array<string> f) =>` — a user-defined function declared before use;
  parses the 12 fields and draws the wave. Keeping the per-wave locals inside a
  function (not in `#main`) is what avoids the variable-limit blow-up.
- `str.split(WAVE_DATA, "\n")` then `str.split(row, ";")` — two-level parse:
  rows first, then fields.
- `array.get(f, 0) == syminfo.ticker` — the per-ticker filter: a wave is drawn
  only when its ticker equals the open chart's symbol. Keeps AMD's waves on AMD
  and shows nothing on symbols outside your batches.
- `xloc.bar_time` — interprets the x coordinate as a UNIX timestamp in ms, not a
  bar index, anchoring each point to its real calendar date.
- The colour ternary is on **one line** — Pine v6 has no line-continuation
  operator (a multi-line ternary raises CE10005/CE10156).
- `na(p4)` — true when the 12M target was missing; the final segment is skipped,
  leaving the wave open-ended at 6M.
- `dot(tx, px, c)` — a top-level helper (Pine forbids nested functions) that
  draws a small `●` at a forecast point, coloured to match the wave, with a
  transparent label background so only the dot shows. Called at base/1M/3M/6M,
  and at 12M when present.
- **Wave number** — a `label.new` with `str.tostring(ci + 1)` at the wave's end
  point (12M, or 6M when there is no 12M), in the wave's colour, at `size.large`
  for visibility. `ci` is 0-based so the displayed number is 1-based: 1 = the
  oldest wave for that ticker.

---

## 8. How to use

1. Open the app as an **admin** user.
2. Click **Wave Script** in the left sidebar.
3. Review the summary (waves, unique tickers, waves with no 12M target).
4. Click **Descargar indicador_master_ondas.txt**.
5. In TradingView: *Pine Editor → paste the file → Add to chart*. The waves
   appear at their real calendar dates on any symbol/timeframe (they are
   absolute-time drawings, independent of the chart symbol).

---

## 9. Files

| File | Role |
|------|------|
| `src/components/WaveScriptPage.jsx` | The page: wave extraction, Pine v6 generation, download |
| `src/components/Sidebar.jsx` | Adds the **Wave Script** nav entry (`Waves` icon) |
| `src/App.jsx` | Adds the admin-gated `wave-script` route |
| `docs/WAVE_SCRIPT.md` | This document |
