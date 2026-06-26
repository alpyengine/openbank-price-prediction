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

This is the structure the generator produces. Coordinate arrays are loaded once
on the first bar (`barstate.isfirst`) and every wave is rendered on the last bar
(`barstate.islast`). Times use `xloc.bar_time` (epoch ms), so the lines sit at
absolute calendar dates regardless of the chart's bar spacing.

```pinescript
//@version=6
indicator("Sistema Maestro de Ondas Elliott V6", overlay = true, max_lines_count = 500)

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

if barstate.isfirst
    // [0] AMD  (AMD)  base 10/01/2026
    array.push(tkr_arr, "AMD"), array.push(ci_arr, 0)
    array.push(t0_arr, 1736464800000), array.push(p0_arr, 100.0)
    array.push(t1_arr, 1739143200000), array.push(p1_arr, 110.0)
    array.push(t2_arr, 1744056000000), array.push(p2_arr, 120.0)
    array.push(t3_arr, 1752012000000), array.push(p3_arr, 130.0)
    array.push(t4_arr, 1767999600000), array.push(p4_arr, 150.0)

    // [1] AMD  (AMD)  base 10/02/2026  — no 12M target
    array.push(tkr_arr, "AMD"), array.push(ci_arr, 1)
    array.push(t0_arr, 1739143200000), array.push(p0_arr, 105.0)
    array.push(t1_arr, 1741822800000), array.push(p1_arr, 115.0)
    array.push(t2_arr, 1746478800000), array.push(p2_arr, 125.0)
    array.push(t3_arr, 1754434800000), array.push(p3_arr, 135.0)
    array.push(t4_arr, 1770422400000), array.push(p4_arr, na)

    // [2] NEM  (Newmont)  base 10/02/2026  — own colour sequence restarts at 0
    array.push(tkr_arr, "NEM"), array.push(ci_arr, 0)
    array.push(t0_arr, 1739143200000), array.push(p0_arr, 50.0)
    array.push(t1_arr, 1741822800000), array.push(p1_arr, 55.0)
    array.push(t2_arr, 1746478800000), array.push(p2_arr, 58.0)
    array.push(t3_arr, 1754434800000), array.push(p3_arr, 60.0)
    array.push(t4_arr, 1770422400000), array.push(p4_arr, 65.0)

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
```

### Line-by-line notes

- `max_lines_count = 500` — raises Pine's default 50-line drawing budget.
- `tkr_arr` / `ci_arr` — parallel arrays holding each wave's market-stripped
  ticker and its per-ticker colour index, precomputed in JS.
- `var array.new<…>()` — `var` keeps the arrays alive across bars; they are
  populated once on the first bar and read once on the last.
- `barstate.isfirst` — the data block runs on the very first historical bar.
  Times are absolute epoch ms, so where exactly it loads doesn't matter.
- `array.get(tkr_arr, i) == syminfo.ticker` — the per-ticker filter: a wave is
  drawn only when its ticker equals the open chart's symbol. This is what keeps
  AMD's waves on AMD and shows nothing on symbols outside your batches.
- `xloc.bar_time` — interprets the x coordinate as a UNIX timestamp in ms, not a
  bar index, anchoring each point to its real calendar date.
- The colour ternary is on **one line** — Pine v6 has no line-continuation
  operator (a multi-line ternary raises CE10005/CE10156).
- `na(p4)` — true when the 12M target was missing; the final segment is skipped,
  leaving the wave open-ended at 6M.

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
