# Openbank Price Prediction

React 18 + Vite app for tracking and evaluating Openbank stock price forecasts.
Import a CSV of predictions, fetch live prices, and monitor accuracy over time.

**Stack:** React 18 · Vite · Tailwind CSS · shadcn/ui · Supabase

---

## Quick start

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in your API keys.

---

## Development workflow (v7.7.0+)

Changes are developed on **feature branches** and validated locally and on a Vercel
**preview** deploy before merging to `main` (production).

📄 **[docs/GIT_WORKFLOW.md](./docs/GIT_WORKFLOW.md)** — branch + Vercel preview workflow:
- Branch naming, step-by-step create → test → merge → tag
- Local `.env` vs Vercel environment variables
- Preview caveats for this app (Google OAuth, shared Supabase DB, Preview env vars)
- Rollback (git revert · Vercel Instant Rollback)

`GIT_GUIDE.md` remains the canonical per-release change log (one STEP per version).

---

## Wave Script — Pine Script generator (v7.15.0+)

Admin-only page that compiles every saved batch projection into a single
downloadable TradingView **Pine Script v6** indicator (`indicador_master_ondas.txt`).
Each batch is drawn as one independent "wave" (Base → 1M → 3M → 6M → 12M),
**only on its own ticker's chart** (filtered by `syminfo.ticker`), coloured by
chronological order within each ticker; a missing 12M target leaves the final
segment unpainted. Wave data ships as a single `WAVE_DATA` string parsed in a
loop (fixed Pine local-variable cost, scales to many waves without hitting
CE10209).

📄 **[docs/WAVE_SCRIPT.md](./docs/WAVE_SCRIPT.md)** — full reference including:
- Data model (horizon-per-row `results[]`), props-first / Supabase-fallback read
- Calendar-month time axis, de-duplication and colour rules
- Null-handling rationale (`na` vs `-1`) and `max_lines_count`
- The generated Pine Script v6 with line-by-line notes

---

## Supabase architecture (v5.0.0+)

All persistence, automation and price fetching runs on Supabase.

📄 **[SUPABASE.md](./docs/SUPABASE.md)** — complete reference including:
- Tables, functions, cron jobs, vault secrets
- RLS policies, known issues, EU market support
- GitHub backup system (section 7)

📊 **[openbank-forecast-uml.md](./docs/openbank-forecast-uml.md)** — Mermaid UML diagrams (v7.5.0+, price flow on Edge Functions since v7.9.0):
- Entity relationship diagram (all 8 tables)
- System architecture and data flow
- Cron job schedule, sequence diagrams for all functions
- RLS access matrix and verdict evaluation flowchart

⚡ **Edge Functions (v7.9.0)** — price fetching runs as two Supabase Edge Functions in `supabase/functions/` (`fetch-weekly-prices`, `fetch-expired-horizons`), driven by per-minute crons; SQL helpers in `supabase/sql/`. Visual references *(HTML — open locally or via htmlpreview.github.io)*:
- **[docs/Openbank_Mapa_Sistema_Datos.html](./docs/Openbank_Mapa_Sistema_Datos.html)** — system map: crons, functions, APIs, tables
- **[docs/Diseno_EdgeFunction_Precios_v7.9.0.html](./docs/Diseno_EdgeFunction_Precios_v7.9.0.html)** — design & rationale of the Edge Function migration

📄 **[SPEC_FUNDAMENTALS.md](./docs/SPEC_FUNDAMENTALS.md)** — Investment Score & fundamentals specification:
- Metrics catalogue (valuation, growth, quality, sentiment)
- PEG ratio — Peter Lynch interpretation and scoring
- Investment Score formula and weights
- Implementation plan v7.1.0 → v7.1.4 (completed)

📄 **[TESTING.md](./docs/TESTING.md)** — Testing guide (v7.2.0+):
- Unit tests (Vitest) — pure JS logic, dates, stocks, hooks
- Component tests (React Testing Library) — UI behaviour
- What each test covers and why
- How to add new tests · lessons learned from v7.1.x bugs
- All tables (`batches`, `price_cache`, `weekly_prices`, `profiles`)
- All functions (`fetch_expired_horizons`, `fetch_weekly_prices`, `backfill_weekly_prices`)
- All cron jobs (weekday horizon evaluation, Saturday weekly prices, backfill)
- Vault secrets management
- Row Level Security policies
- Known issues and SQL fixes

### Critical — date formatting

**Never use `toLocaleDateString()` for dates stored in Supabase.**
On macOS, it generates `Sept` instead of `Sep` for September.
PostgreSQL's `to_date()` only accepts 3-letter month names and throws
`ERROR 22007` for `Sept` — silently breaking `fetch_expired_horizons()`.

`formatDate()` in `src/utils/dates.js` uses a fixed `MONTHS` array
to guarantee correct 3-letter abbreviations. Fixed in v7.0.4.

---

## Alerts & monitoring (v7.6.0+)

The backend emails a **health alert** when price-fetching or its crons misbehave.
All alert emails go out through one function — `notify_fetch_failure()` → EmailJS →
`alpyengine@gmail.com`. A watchdog, `check_cron_health()` (job 9, Mon & Thu 07:00
UTC), runs three checks: stuck evaluations (a horizon `awaiting` > 3 days), weekly
cron liveness (> 8 days silent) and expired cron liveness (> 4 days silent). Checks
2 & 3 read pg-cron's own run log (`cron.job_run_details`) by job name, so they stay
correct even in weeks with no expirations.

> The new Edge Functions only **log** failures (they don't email), so the alert
> emails you actually receive are essentially from the watchdog. These
> *system-health* alerts are separate from the in-app **price alerts** (v7.4.4).

**See [`docs/ALERTS.md`](docs/ALERTS.md)** for the full list of alerts, what each
one means, and the queries to check the system by hand.

## Authentication (v7.0.2+)

Supabase Auth with email/password and Google OAuth.
Access is **invitation-only** — users cannot self-register.
Two roles: **admin** (full access) and **read-only** (view only).

📄 **[AUTH.md](./docs/AUTH.md)** — complete guide including:
- Password security (bcrypt)
- Google OAuth setup step by step
- Role permissions matrix
- Database schema and RLS policies
- React architecture
- **Known issues & troubleshooting log** (8 issues documented)

📄 **[AUTH_FLOW.md](./docs/AUTH_FLOW.md)** — end-to-end authentication & security flow (v7.5.4+):
- JWT explained — what it is, what it contains, how it expires
- RLS explained — how Row Level Security filters data per user
- Anon key vs session JWT — differences and when each is used
- Role system — how admin/readonly is implemented across frontend and DB
- Full Mermaid sequence diagram — login → profile load → batch fetch → RLS evaluation
- Security layers diagram — Frontend · HTTPS · Supabase Auth · RLS
- The `loadHistory` bug and fix — why `allow_all` was not redundant

### Key architecture decisions

**Zero spinner on reload:** user, role and display name are all read from
`localStorage` synchronously before React renders.

**JWT safety:** `sanitizeName()` in ProfileModal strips emoji and non-Latin
Unicode before saving. Non-standard characters corrupt the JWT token.

**onAuthStateChange only:** no `getSession()` — avoids race condition with
Supabase's internal auth lock.

**StrictMode removed:** incompatible with Supabase auth locks.

### Node 18 compatibility (v7.0.3)

`supabase-js 2.106` requires Node >= 20. On Node 18, several Auth API calls
block indefinitely. See [AUTH.md → Node 18](./docs/AUTH.md#13-node-18-compatibility-notes).

**When upgrading to Node 20:** search for `v7.0.3 fix` in the code to revert workarounds.

---

## Backup system (v7.0.5+)

Automated weekly backup of all Supabase data to a private GitHub repository.

📄 **[SUPABASE.md → Backup system](./docs/SUPABASE.md#7-backup-system--github-automated-backup)** — complete reference including SQL, restore instructions and cron schedule.

**What is backed up:** `batches`, `weekly_prices`, `price_cache`
**When:** Every Sunday at 23:00 UTC — after Saturday weekly prices and weekday verdict evaluations
**Where:** `https://github.com/alpyengine/openbank-price-data` (private)
**Format:** Single `data/history.json` — full git history, every backup recoverable

| Cron job | Schedule | Purpose |
|---|---|---|
| fetch-expired-horizons-daily | Mon–Fri 23:00 UTC | Evaluate expired predictions |
| fetch-weekly-prices-saturday | Sat 10:00 UTC | Save weekly closing prices |
| weekly-github-backup | Sun 23:00 UTC | Full backup to GitHub |

**Manual backup at any time:**
```sql
select backup_to_github();
```

## Financial APIs (v7.0.6+)

### Finnhub — primary fundamentals source

`VITE_FINNHUB_KEY` — used by `useFundamentals.js` for all fundamental metrics:
P/E, forward P/E, PEG ratio, net margin, ROE, EPS growth, revenue growth, beta, dividend yield.

- Free plan: 30 req/sec, no credit card required
- Register at https://finnhub.io
- Works for all US tickers + major European tickers (SAP, ASML, etc.)
- European tickers with missing data show `⚠ Partial data` badge

### FMP — company profile (secondary)

`VITE_FMP_KEY` — used only for sector, industry, description via `/stable/profile`.
Free plan works for most tickers. If missing, these fields show `--`.

### Twelve Data — price data

`VITE_TWELVE_DATA_KEY` — used for weekly price fetching in Supabase cron jobs.
Not used directly by the React app.

---

## Environment variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_FINNHUB_KEY=your_finnhub_key
VITE_FMP_KEY=your_financialmodelingprep_key
VITE_TWELVE_DATA_KEY=your_twelvedata_key
VITE_EMAILJS_SERVICE_ID=your_id
VITE_EMAILJS_TEMPLATE_ID=your_id
VITE_EMAILJS_PUBLIC_KEY=your_key
```

---

## Migration to shadcn/ui + Tailwind

📄 **[MIGRATION_SHADCN.md](./docs/MIGRATION_SHADCN.md)**

| Phase | Version | Status |
|---|---|---|
| 0 — Preparation | v6.9.0 | ✅ |
| 1 — Base components | v6.9.1 | ✅ |
| 2 — Simple components | v6.9.2 | ✅ |
| 3 — Medium components | v6.9.3 | ✅ |
| 4 — Complex components | v6.9.4 | ✅ |
| 5 — Documentation | v6.9.5 | ✅ |

---

## Tests

```bash
npm run test:run   # single run
npm run test       # watch mode
```

195 tests across 11 files — utils, hooks, services, components.

---
| v7.17.2 | **Cleanup: remove dead Alpha Vantage current-price code** (`usePriceFetch.js`) — after v7.17.0 rerouted EU current prices to Yahoo, `fetchCurrentPrices_AV`, its 24h localStorage cache (`avCacheGet`/`avCacheSet`/`AV_CACHE_KEY`/`AV_CACHE_TTL`) and the unreachable `AV_RATE_LIMIT` catch branch were dead code. All removed. `AV_KEY`/`AV_URL`/`fetchHistoricalPrice_AV` kept (still used as last-resort fallback for historical EU prices). Header updated. No behavior change |
| v7.17.1 | **EU fundamentals via Yahoo proxy** (`supabase/functions/get-eu-fundamentals`, `useFundamentals.js`) — Phase 2 of the EU/Yahoo line. Finnhub/FMP free tiers are US-only, so EU tickers had no sector/PE/margins. New Edge Function `get-eu-fundamentals` proxies Yahoo `quoteSummary` (server-side, with cookie+crumb handling) and returns fundamentals **already normalized to the app's schema and units**: percent-style fields ×100 (margin, ROE, ROA, EPS/rev growth, div yield), `debtEquity` ÷100 (Yahoo % → ratio), PE/PEG/beta/marketCap as-is. `useFundamentals` routes EU tickers to it and skips Finnhub/FMP; US unchanged. Finnhub key now only required when the batch has US tickers. Not on Yahoo (left null, accepted): forwardPEG, pfcfTTM, epsGrowth3Y/5Y. No new env vars/keys |
| v7.17.0 | **EU current prices via Yahoo proxy** (`supabase/functions/get-eu-prices`, `usePriceFetch.js`) — opens the "EU data via Yahoo" line. The in-app *Fetch prices* button routed EU tickers (`.DE/.AS/.PA/.L/.MC`) to **Alpha Vantage** (25 req/day cap + poor EU coverage). New browser-callable Supabase Edge Function `get-eu-prices` proxies **Yahoo Finance** (same source the cron already uses, server-side to avoid CORS) and returns current prices for a batch of EU tickers. `usePriceFetch` now sends EU tickers to that function; **US stays on Twelve Data**, unchanged. No new env vars (reuses `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`); no API keys. **Phase 1 = prices only** — EU fundamentals (Finnhub/FMP US-only gap) come in a later phase. Historical EU prices keep coming from the cron-populated cache |
| v7.16.4 | **Fix: gray band on the right of the All Stocks table** (`AllStocksPage.jsx`) — the table wrapper used `overflow-visible`, so when the table was wider than its card (many columns + sidebar open) the right columns spilled out of the white card onto the page background (`--background` #f9f9fb), showing as a vertical gray band with a hard edge at the card's right border. Changed the wrapper to `overflow-x-auto` so the table scrolls horizontally inside the white card instead of spilling — matching the shadcn `Table` pattern. Identical look when the table fits |
| v7.16.3 | **All Stocks Trend filter** (`AllStocksPage.jsx`) — new bullish/bearish filter beside the existing Market filter. `deduplicateStocks`/`expandStockInstances` now carry each row's batch `direction`; a `trendCounts` memo feeds badge buttons (`↗ Bull` green / `↘ Bear` red, neutral when inactive) shown only when both trends are present; `filtered` applies `filterTrend`. Closes the v7.16.x line (batch trend/market) |
| v7.16.2 | **Fix: same-day re-import overwrote instead of merging** (`useHistory.js`) — after the v7.16.0 composite id, re-importing tickers into an existing batch of the same date+market+direction could **replace** the whole batch with just the re-imported tickers. Cause: `saveBatch` looked up the existing batch in the **in-memory** `history`, which can lag behind Supabase (e.g. after a page reload), so it didn't find the batch and the same-id upsert overwrote it. Fix: the lookup now reads the **freshest history from the DB** (`loadHistory()`) right before merging, so a re-import of the same identity always merges; merge also guards against a missing `results` array. Part of the v7.16.x line |
| v7.16.1 | **Accuracy Market/Trend columns** (`useHistory.js`, `AccuracyChart.jsx`) — the *Historical batches* table now distinguishes same-day batches with two dedicated columns: **Market** (neutral pill, raw exchange code `US`/`MC`/`DE`…) and **Trend** (green `↗ Bull` / red `↘ Bear`). Replaces the ambiguous inline 📈/📉 badge that sat next to the date. `computed()` adds `market` (derived via `marketOf` from the first result ticker) to each `batchSummary` row. Part of the v7.16.x line |
| v7.16.0 | **Batch identity** by date + market + direction (`storage.js`, `useHistory.js`, `App.jsx`, `FetchBar.jsx`) — same-day imports with a different market or direction no longer merge into one batch. The batch id (Supabase PK) was the **date only**, so a bullish US list, a bearish US list and a bearish ES list saved on the same day all collapsed into a single batch and the last import overwrote `direction`. `buildBatchId(date, market, direction)` now returns a composite id (`2026-06-28_US_bullish`); called with date only it still returns the legacy `YYYY-MM-DD` id, so **existing batches keep their key** and never collide with new ones. New `marketOf(ticker)` helper (single source of truth for batch market, from the ticker suffix). `useHistory.saveBatch` derives the market from the first ticker and builds the composite id — the date-keyed merge now only merges a re-import of the **same** date+market+direction. `App.handleImport` computes the same composite provisional id (so `weekly_prices` for a previously-saved same-day batch still resolve) and passes `loadedBatchId` to the selector. The **batch selector** (`FetchBar.jsx`) shows a neutral market pill + a green/red direction pill per entry and marks the active batch by **id** (not date), so same-day batches are distinguishable. First version of the v7.16.x line (batch trend/market work). No Supabase schema changes |
| v7.15.7 | **Wave Script** tests + refactor — extracted the pure generation logic (`extractWaves`, `buildPineScript`, and the `parseDDMMYYYY` / `addMonths` / `epochMs` / `stripMarket` helpers) out of `WaveScriptPage.jsx` into a new **`src/utils/waveScript.js`** module (repo convention: pure helpers in `utils/` with a co-located test, like `dates.js` / `stocks.js`). `WaveScriptPage.jsx` now imports them; behaviour is byte-for-byte identical (the component only handles UI + the download flow). New **`src/utils/waveScript.test.js`** with **25 tests** covering: `stripMarket` (EU/US suffix stripping), calendar-month arithmetic, `extractWaves` (field mapping, EU ticker normalisation, null 12M → `p4` null, incomplete-spine skip, exact-duplicate discard, same-ticker-different-date kept, chronological sort, time axis), and `buildPineScript` (v6 header + raised limits, per-ticker `syminfo` embedding, per-ticker colour restart, empty 12M field, `drawWave` + filter, wave count, empty-list safety). Full suite now **195 tests across 11 files** (up from 170), all green. No backend/schema changes |
| v7.15.6 | **All Stocks** UX (`AllStocksPage.jsx`) — the Top Picks ranking toggle (Upside / Score) now has a help **ⓘ tooltip on each button**, reusing the existing `ColTooltip` component (same pattern as the table column headers). Upside explains it ranks by remaining upside from today's price to the Openbank target (no fundamentals needed); Score explains it ranks by the 0–100 investment score (Upside 40% + PEG 45% + Net Margin 15%, −20 if EPS negative; only ranks stocks that have a Score). Presentation-only — no logic/data/backend changes. Built on top of v7.15.5 in the same branch. 170 tests stay green |
| v7.15.5 | **All Stocks** UX (`AllStocksPage.jsx`) — the two sector filters (Top Picks vs the table) were visually indistinguishable, so it was easy to use the wrong one. The two filters stay **independent** (both states unchanged: `topPicksSec`, `filterSec`), but are now clearly labelled: the Top Picks header is reframed as a card reading "Top picks · mostrando mejores de: [sector] · ordenados por [Upside/Score] · [horizon]", and the table's sector `<select>` gets a "Tabla:" label in front of it. Presentation-only change — no logic, no data-model, no backend changes. 170 tests stay green (incl. the 21 AllStocksPage tests) |
| v7.15.4 | **Wave Script** tweak (`WaveScriptPage.jsx`) — the per-wave number is now drawn at `size.large` (was `size.normal`) for better visibility on the chart. One-word change to the `label.new` call; dots and everything else unchanged. `docs/WAVE_SCRIPT.md` reference + note updated. No backend/schema changes; 170 tests stay green (generation logic still pending unit tests — v7.15.5) |
| v7.15.3 | **Wave Script** visual additions (`WaveScriptPage.jsx`) — each forecast point (base/1M/3M/6M, plus 12M when present) now gets a small **dot (●)** in the wave's colour, and each wave shows its **chronological number** (1 = oldest for that ticker, = `ci + 1`) at its end point (12M, or 6M when there is no 12M), in the same colour. Implemented with a top-level `dot()` helper (Pine forbids nested functions) and `label.new` with a transparent background so only the glyph/number shows; `indicator()` gains `max_labels_count = 500` alongside `max_lines_count = 500`. Per-ticker filter, colour and `WAVE_DATA` string model unchanged. `docs/WAVE_SCRIPT.md` reference + notes updated. **Needs TradingView compile validation.** No backend/schema changes; 170 tests stay green (generation logic still pending unit tests — v7.15.4) |
| v7.15.2 | **Wave Script** fix — generated Pine hit **CE10209** ("too many local variables", limit 1200) once a batch set produced ~100+ waves, because the v7.15.1 generator emitted one `array.push(...)` per coordinate per wave (12 pushes × N waves), each a local in Pine's `#main` scope. Rewrote the data model (`WaveScriptPage.jsx`): all wave data now ships as a **single string constant** `WAVE_DATA` (one wave per line, fields split by `;`, row `ticker;ci;t0;p0;…;t4;p4`), parsed on the last bar with `str.split` + a `drawWave()` user-function — a **fixed** local-variable count regardless of wave count, so the only remaining ceiling is the 500-line draw limit. Missing 12M is now an **empty trailing field** (`str.tonumber("")` → `na`) instead of a literal `na` push. Per-ticker filter (`array.get(f,0) == syminfo.ticker`) and per-ticker colour unchanged in behaviour. Removed the now-unused `num()` helper. `docs/WAVE_SCRIPT.md` reference rewritten. **Needs TradingView compile validation** (no local Pine compiler). No backend/schema changes; 170 tests stay green (generation logic still pending unit tests — v7.15.3) |
| v7.15.1 | **Wave Script** fix — waves now draw **only on their own ticker's chart** (`WaveScriptPage.jsx`). The v7.15.0 generator drew every wave on every symbol (AMD's wave showed on MRNA, etc.) because it never compared against the open chart. Fix: each wave carries its **market-stripped** ticker (`stripMarket`: `NEM.DE`→`NEM`, `TER.US`→`TER`) in a parallel Pine string array `tkr_arr`, and the renderer draws a wave only when `array.get(tkr_arr, i) == syminfo.ticker` — so a symbol that is in no batch shows nothing. Colour assignment changed from **global** order to **per-ticker** chronological order (new `ci_arr`: each ticker restarts red→blue→green→orange/purple), so e.g. AMD's five waves are five distinct colours independent of other tickers. Pine arrays migrated to typed `array.new<…>()` form; colour ternary kept on one line (Pine has no line continuation, CE10005/CE10156). `docs/WAVE_SCRIPT.md` updated (new "Per-ticker filtering" section + refreshed Pine reference). No backend/schema changes; 170 tests stay green (generation logic not yet unit-tested — planned for v7.15.2) |
| v7.15.0 | **Wave Script** — new admin-only page that compiles every saved batch projection into one downloadable TradingView **Pine Script v6** indicator (`indicador_master_ondas.txt`). New `WaveScriptPage.jsx`: groups each batch's horizon rows (`results[]` is one row per 1M/3M/6M/12M) into a single "wave" (Base → 1M → 3M → 6M → 12M), computes the time axis from `batch.date` with **calendar-month** arithmetic, de-duplicates identical waves (same base date + same prices), sorts chronologically and assigns colour by appearance order (red → blue → green → orange/purple), then auto-downloads the `.txt`. Reads `batches` from props (already in memory via `useHistory`, zero extra calls) with a `@supabase/supabase-js` fallback (`from('batches').select('id,date,results')`) when props are empty. **Null 12M** is handled with native Pine **`na`** + an `if not na(p4)` guard (cleaner than the original `-1` flag) so the 6M → 12M segment is left unpainted; `indicator()` sets `max_lines_count=500`. `Sidebar.jsx`: new **Wave Script** nav entry (`Waves` icon). `App.jsx`: import + admin-gated `wave-script` route (`role === 'admin'`, same pattern as Import CSV / Manage Users). New **`docs/WAVE_SCRIPT.md`** (feature guide + full Pine v6 with line-by-line notes). No Supabase schema changes; 170 tests stay green (page render not unit-tested) |
| v7.14.1 | **All Stocks** KPI fix — **Total Stocks** box now shows unique tickers as the headline number and `N entries across M batches` as the sub-line, so duplicate-batch rows are counted separately from unique tickers. `totalInstances` memo (sum of all `instancesByTicker` array lengths) added just before the KPI block. `AllStocksPage.jsx` only — no data-model or backend changes, 170 tests stay green |
| v7.14.0 | **Batch Overview** admin delete stock — new admin-only **Actions** column in `BatchSimple` with a `Trash2` delete icon per row (only visible when `role === 'admin'` and a batch is loaded). Double-click confirmation pattern: first click arms the button red (3 s timeout), second click confirms. `storage.js`: new `deleteStockFromBatch(batchId, ticker)` — GET batch, filter `results[]`, recalculate `stocks`/`hitRate`/`hitRateExt`, PATCH with `authHeaders` (JWT, required by RLS), DELETE orphaned `weekly_prices` rows. `useHistory.js`: new `deleteStock(batchId, ticker)` — calls storage then patches local history state immediately (no reload). `App.jsx`: `handleDeleteStock` removes ticker from local `stocks` state + passes `role`/`loadedBatchId`/`onDeleteStock` to `BatchSimple`. No Supabase schema changes; `weekly_prices` requires a `DELETE` policy for authenticated users (see SUPABASE.md). 170 tests stay green |

| v7.13.4 | **Help page** text refresh (`HelpPage.jsx`, docs-only) — brings the All Stocks section up to date with the v7.10–v7.13 work. Fixes the now-false line "the most recent batch wins" (the page shows **one row per batch**, grouped newest→oldest with a *latest* pill and indented *↳* older rows, each linking to its own batch; collapses under search/Best only). Adds documentation for: the **ticker/company search** with scroll+highlight, the **horizon pill + sortable columns**, **Top picks by sector**, the **Entry Quality** and **Entry Momentum** columns (which replaced the sparkline), and the **inline expandable detail card** (four horizon boxes with settled verdicts, Fundamentals panel, price-chart button; ticker click → Batch Overview). Section title and file header comment updated. No code/logic changes |
| v7.13.3 | **All Stocks** expandable card phase 2 — settled verdicts + unified HOY price (`AllStocksPage.jsx`). (1) Expired horizons now show the **real close and verdict** (hit/miss), matching Batch Detail, instead of "vencido / awaiting". The settled close already lives in each saved batch (`results[].priceOnDate` + `targetDate`), so instances are enriched with a per-horizon `hist` map (`buildHist`) which is converted to the `histPrices` shape the cards expect (`histKeyed`) and passed to the card — no API calls. (2) The **HOY price now matches Batch Detail**: the card prefers live `autoPrices` (as Batch Detail does) and only falls back to the latest weekly close when no live price is available, removing the earlier discrepancy ($519.68 vs $537.37). No data-model or backend changes |
| v7.13.2 | **All Stocks** fix: expandable card showed only Fundamentals, the four **HorizonCards** were missing (`AllStocksExpandCard.jsx`). Root cause: the card derives the horizon target dates from `stock.base` (a **Date** object in Batch Detail), but the All Stocks row model has no `base` Date — the base date lives in `stock.batchDate` as a **"DD/MM/YYYY"** string — so `targetDates(stock.base)` got `null` and the 1M/3M/6M/12M boxes never rendered (only Fundamentals, which does not depend on the base date, showed). Fix: parse `batchDate` into a Date (`parseDDMMYYYY`) and feed it as the card's base, so the four horizon boxes render with their targets and dates. Live comparison and the "vencido / awaiting" markers behave as before; settled hit/miss verdicts still deferred (no dated history per instance). No data-model or backend changes |
| v7.13.1 | **All Stocks** inline expandable card (presentational, new `AllStocksExpandCard.jsx` + `AllStocksPage.jsx`) — brings the Batch-Detail expandable card into the All Stocks table **without removing it from Batch Detail** (intentional duplication; `StockRow.jsx` untouched). Clicking a row (anywhere except the ticker or the TradingView button) toggles an inline accordion showing a **read-only** card with three blocks: the four **HorizonCards** (1M/3M/6M/12M target, date and live comparison), a **FundamentalsPanel**, and a **Price-chart** button. A ▸/▾ chevron in the ticker cell signals expandability; the ticker still navigates to Batch Detail (with `stopPropagation`), as does the TradingView button. `HorizonCards` + `FundamentalsPanel` and their helpers are copied **verbatim** from `StockRow.jsx` into the new component. **Limitation:** All Stocks has no dated historical prices per instance (only undated weekly closes), so the card is fed `histPrices={}` and expired horizons show **"awaiting / vencido"** rather than a settled hit/miss verdict (graceful, not misleading — cards request prices in snapshot mode). Excluded vs Batch Detail: price override, notes, MarketComparison. New `expandedRows` Set state + `toggleExpand`; AllStocksPage unit tests unaffected (row model/render not tested). No data-model or backend changes |
| v7.12.2 | **All Stocks** duplicate-batch rows (presentational, `AllStocksPage.jsx`) — Tanda 3 #8, completes Tanda 3. The table now shows **one row per batch** a ticker appears in (instead of only the most recent), grouped as a block per ticker, **newest→oldest**. The latest row keeps the avatar + a **"latest"** pill (when there are duplicates); older rows are indented under it with a "↳" marker, muted, and the block carries a left accent. **Each row links to its own batch** (click → loads that batch's Batch Detail + scroll/flash, reusing #5), so you can open any historical batch, not just the most recent. Sorting keeps each ticker as a **block ordered by its most-recent row**, with rows inside always by date (newest first). **Best only / search collapse** to the most-recent row per ticker; **Top Picks / KPIs / filters** keep operating on the most recent. Removed the now-redundant "· N×" counter. New `expandStockInstances` helper + `instancesByTicker` memo (enriched like `stocks`); `deduplicateStocks` and the filter/sort pipeline unchanged, so the 21 `AllStocksPage` unit tests stay green. No data-model or backend changes |
| v7.12.1 | **All Stocks** replace Sparkline with **Entry Quality + Entry Momentum** (presentational, `AllStocksPage.jsx`) — Tanda 3 #9. Removed the Sparkline column and the `SparkLine` component; added two sortable columns. **Entry Quality** (0–100 badge, same visual language as Score): `0.5·remaining-upside(norm 0–40%) + 0.35·Score/100 + 0.15·valuation(PEG: 0→1, 2→0)`; without fundamentals it reweights to `0.75·upside + 0.25·PEG` and is marked `~`. **Entry Momentum** (pill + trend arrow): 🟢 Strong (upside left & weekly trend turning up), 🔵 Building (upside left, not turning yet), 🟡 Late (<8% upside remains), 🔴 Missed (price already above target); trend derived from the same weekly series that fed the sparkline. Both depend on the selected horizon, both plug into the existing column sort (Entry Momentum sorts by Strong→Building→Late→Missed; missing values last). Empty-state `colSpan` 10→11. No data-model or backend changes |
| v7.11.3 | **All Stocks → Batch Detail** click-through with auto-scroll (presentational, `App.jsx` + `AllStocksPage.jsx` + `StockTable.jsx` + `StockRow.jsx`) — Tanda 2 #5. Clicking a ticker in All Stocks (table row **or** Top Picks card) now loads its batch, navigates to Batch Detail **and scrolls to + flashes that ticker's row** (amber, ~1.6s), instead of leaving the user at the top of the list. Threaded a `scrollToTicker` target through `App` (new state) → `AllStocksPage` (`onScrollToTicker`, called with the raw ticker on click) and → `StockTable` (`scrollToTicker` + `onScrollHandled`); `StockTable` scrolls to the row and clears the target after the flash. Each Batch-Detail row got a stable `id="bdrow-<ticker>"` and a highlight class on `StockRow`. Additive/backward-compatible (new props default to null/false). Completes Tanda 2. No data-model or backend changes |
| v7.11.2 | **All Stocks** Top Picks by sector (presentational, `AllStocksPage.jsx`) — Tanda 2 #7. Added a **sector selector** to the Top Picks header (next to the Upside/Score toggle) so the picks can be narrowed to one sector; the subtitle shows the active sector ("· {horizon} horizon · {sector} · sorted by …"). The Top Picks header now always renders (so the controls never disappear), and when a chosen sector has no positive-upside candidates it shows an inline empty state instead of hiding the whole section. New `topPicksSec` state; sector list reused from the existing filter. No data-model or backend changes |
| v7.11.1 | **All Stocks** ticker/company search (presentational, `AllStocksPage.jsx`) — Tanda 2 #6. New search box in the filters toolbar (before *Score min*, starting the second filter row) that does **both**: filters the table live as you type (matching display ticker, raw ticker or company name) **and** shows a **suggestions dropdown** (up to 6, with matched-substring highlight, ticker badge + market). Picking a suggestion (click / Enter) filters to that ticker and **scrolls to + flashes** its row. Keyboard ↑/↓/Enter/Esc; ✕ clears the text only. The search **composes with the existing filters and sort** (Market/Sector/PEG/Score/Best only all stay applied). New `StockSearch` component + `searchQuery`/`highlight` state; no data-model or backend changes |
| v7.10.3 | Fix cron watchdog after the Edge migration + alerts doc (backend/docs). `check_cron_health()` still monitored the **old SQL function names** in `fetch_log_summary` (`fetch_expired_horizons`, `fetch_weekly_prices`) — paused since v7.9.0 — so it fired a false *"fetch_expired_horizons sin ejecucion desde …"* email every Mon/Thu even though the `_edge` functions were running fine (they log to `fetch_log`, never to `fetch_log_summary`). Rewrote Checks 2 & 3 to read **pg-cron's own run log** (`cron.job_run_details`) by `jobname` (`fetch-weekly-prices-edge`, `recovery-weekly-prices`, `fetch-expired-horizons-edge`) — true cron liveness, correct even in weeks with no expirations; Check 1 (stuck `awaiting` > 3d, data-based) unchanged · new `supabase/sql/04_check_cron_health.sql` · new **`docs/ALERTS.md`** (plain-language guide + table of every alert) + README "Alerts & monitoring" section. No `src/` changes |
| v7.10.2 | **All Stocks** help-text pass (presentational, `AllStocksPage.jsx`): fixed the **Left to target** tooltip incongruence — the sub-line wrongly stated `(lastWeeklyPrice − target) / target × 100` (the real formula is `(target − refPrice) / refPrice`) and the colour key was inverted; now **🟢 positive = upside remains (price still below target)** and **🔴 negative = price already above target**, with the correct formula and price-source cascade. Made the **Upside** tooltip English-consistent (child now "Green = positive · Red = negative") and added its formula. Added a **"Best only" help tooltip** explaining the filter: remaining upside > 0 for the selected horizon AND Score ≥ 60 (Score condition only applies when a Score exists — never hides score-less tickers). Score threshold unchanged. No data-model or backend changes |
| v7.10.1 | **All Stocks** header + sorting (presentational, `AllStocksPage.jsx`): replaced the per-column **Upside** horizon dropdown with a **Watchlist-style horizon pill** (`1M / 3M / 6M / 12M`) in the filters toolbar; the Upside and Left-to-target headers now show the active horizon as a small tag. **All columns are now sortable** asc/desc — added Market, Sector, PEG, Margin and Batch (date) to the comparator alongside the existing Ticker / Upside / Left-to-target / Score, with a single convention (`sortDir 1 = asc, −1 = desc`) and missing values (null/NaN/`—`) always sorted to the bottom in both directions. Removed the now-unused `HorizonDropdown` component + `HORIZONS` const. No data-model or backend changes |
| v7.9.7 | Fix EU price fetch (Yahoo HTTP 429) — Yahoo throttled the "naked" requests coming from the Edge runtime, so the 4 `.DE` tickers (AIXA/EVT/IFX/NEM) failed every weekly run with 429. Added a browser **User-Agent** header to the Yahoo calls in both Edge Functions (`fetch-weekly-prices`, `fetch-expired-horizons`) — the expired function already had one and worked, the weekly didn't and 429'd, which pinpointed the cause. Also `get_pending_expired` now filters **`< current_date`** instead of `<=`, so a horizon expiring *today* isn't evaluated until its close exists — removing the per-minute retry loop that hammered Yahoo (~480 failed calls per window). Recovered the 4 missing `.DE` Friday closes. Backend only — no `src/` changes |
| v7.9.6 | Bearish-forecast clarity (presentational, `StockRow.jsx`): a bearish horizon (target below base) was confusing — e.g. "objetivo €59.22 → hoy €53.30 · ↗ adelantado +10%" looked contradictory (up arrow on a falling price, nothing showing it was a down-call). Each **Horizon Results card** now opens with a **base-reference strip** — `base {price} · {base date} · bajista↓ / alcista↑` — so the forecast direction is always visible. The big-line **separator arrow now follows the real price move** vs the base (price ≥ base → ↑, else ↓), so a falling price never shows an upward arrow. Live-state vocabulary is direction-aware: **✓ sobrepasado · ↑/↓ falta subir/bajar · ⤬ en contra** (replacing adelantado/en camino/retrasado, whose arrows implied price direction). Collapsed-row cells use the same direction-aware state labels. Verdict logic unchanged → 170 tests stay green |
| v7.9.5 | Forecast visibility + direction-aware % (presentational, `StockRow.jsx`): the **predicted (target) price** is now shown for every horizon — it had disappeared from the collapsed row. **Collapsed row**: each horizon cell leads with the **objetivo previsto** price (blue, orange + `⏱ Nd` when < 15d, foreground when settled), then the state and a direction-aware %. **Cards (Horizon Results)**: the big line now shows **two prices the same size side by side** — `objetivo {target} → cerró {close}` (settled) or `objetivo {target} → hoy {price}` (future); the bottom line carries only the state + % + date, no duplicated price. **Direction-aware %**: the gap vs target is multiplied by the forecast direction, so **"+%" always means toward/beyond the target (good)** and **"−%" short or against (bad)**, for both bullish and bearish forecasts — fixing the old contradiction where a bearish WRONG showed a green "+42.4%". For wrong-way / against, an **"esperaba ↑/↓"** cue shows the forecast direction. Verdict logic (`evaluatePrediction`) unchanged → no tested module touched (170 tests stay green) |
| v7.9.4 | Collapsed-row + header polish (presentational): the dense purple horizon **bars** in the collapsed row are replaced by a compact stacked indicator (`StockRow.jsx`) speaking the same language as the cards — **expired** → settled verdict (HIT/EXCEED/CLOSE/MISS/WRONG) + gap%; **future** → arrow + % + mini-state (↗ adelantado / → en camino / ↘ retrasado / ⤬ en contra); **expired-no-close** → ⏳ "sin cierre"; **not imported** → N/D. The horizon label is no longer repeated per cell (it's in the column header). Header legend updated (`StockTable.jsx`) from the obsolete "Hit / Close/Awaiting / Miss" to a compact 4-colour key (bien / cerca / fallo / pendiente) with a **?** that opens the full state legend. Fixed the **vs SPY** and **vs Sector** column help: both pointed to the "Hit? — Prediction result" text by mistake; they now have correct help (relative performance since base date vs SPY / vs the sector ETF, with the EU local-benchmark note and the fetch-state explanations). No changes to tested modules (170 tests stay green) |
| v7.9.3 | **Horizon Results** cards refined for at-a-glance reading (`HorizonCards` in `StockRow.jsx`, presentational): the target price no longer repeats as its own line in every card · **settled** horizon → big number is the real **close** in the default foreground colour, with `cierre · objetivo era {X} · gap%` below · **future** horizon → big number is that horizon's **target**, colour-coded (dark blue normally, **orange + `⏱ Nd` chip when < 15 days to expiry**), with `hoy {price} {gap%}` below · live tracking chip refined: `↗ adelantado` only when today's price has actually reached/exceeded the target, `→ en camino` when near-but-below, `↘ retrasado` when far short, and a new red **`⤬ en contra`** when the price moved against the forecast direction vs the base · **horizon not imported in the batch** (no target) → dedicated **N/D** card (dashed border, `⨯ N/D` pill, big `—`, "Sin previsión a {key} · no incluida en este batch") with no AWAITING / no fake date / no days-left — applies to any missing horizon, not just 12M · no changes to tested modules (170 tests stay green) |
| v7.9.2 | Fix: the expanded **Horizon Results** cards always showed AWAITING even for settled horizons — `HorizonCards` computed verdicts live but its label/colour map only covered `hit`/`close`/`miss`, so `exceeded` and `wrong_way` fell through to the AWAITING fallback (and expired horizons were evaluated against the current price, not the settled close) · rewrote `HorizonCards` (`StockRow.jsx`): an **expired** horizon now shows its **settled verdict** (HIT/EXCEEDED/CLOSE/MISS/WRONG-WAY) computed in snapshot mode from the real close via `getEffectivePrice(…, snapshot:true)` — matching the stored verdict + accuracy stats; a **future** horizon shows AWAITING plus a live tracking hint (↗ adelantado / → en camino / ↘ retrasado); an expired horizon with no close yet stays AWAITING (cron settles it) · added a per-stock roll-up header (`N/M vencidos acertados · hoy ±X% vs obj.`) and a target+gap row · now passes `histPrices`/`override` to `HorizonCards` · shadcn badge styling, two new verdict colours (blue `exceeded`, purple `wrong_way`) · presentational only — no changes to tested modules (170 tests stay green) |
| v7.9.1 | Fix: expired horizons were being **settled with the current price** at batch save — `getEffectivePrice()` fell through to `autoPrices` when a horizon's historical close wasn't loaded, freezing a wrong `verdict` + `priceOnDate` (root cause of 25 mis-graded 1M verdicts across the March batches — accuracy stats corrupted) · added a `snapshot` flag to `getEffectivePrice()`: in snapshot mode an expired horizon returns `null` when no real close is available, so the verdict stays `awaiting` and the cron (`save_expired_verdict`) settles it later with the true close · live/provisional badges unchanged (`snapshot` defaults to `false`) · `useHistory.saveBatch` now passes `snapshot:true` · new `getEffectivePrice.test.js` (6 regression tests) · NOTE: pre-existing corrupt verdicts need a one-time DB reset to `awaiting` (separate Supabase step — not in this build) |
| v7.9.0 | Price fetching moved to Supabase **Edge Functions** — `fetch_expired_horizons()` / `fetch_weekly_prices()` were dying at the 120s `statement_timeout` + Twelve Data 8-req/min ceiling (Bug #9). Replaced by two Edge Functions (`fetch-weekly-prices`, `fetch-expired-horizons`) triggered by **per-minute crons** (jobs 10 & 12) via `net.http_post`; each call handles a chunk of ≤7 and is idempotent/resumable · weekly uses the Twelve Data batch endpoint, expired fetches per target-date · verdict logic kept in SQL (`save_expired_verdict`, ported verbatim) · real 429 detection · **Verify JWT** enabled, crons authenticate with the `service_role_key` Vault secret · old SQL crons (jobs 1 & 2) paused as fallback · new `supabase/functions/` + `supabase/sql/` · SUPABASE.md + UML + system-map & design HTML (`docs/`) updated |
| v7.8.0 | Vercel Web Analytics — `@vercel/analytics` added · `<Analytics />` rendered once at the app root (`@vercel/analytics/react`) · counts visitors/sessions (the SPA navigates by internal state, so sections are not separate pageviews) · enable Web Analytics for the project in the Vercel dashboard |
| v7.7.1 | Fix: Email report button on Batch Overview — the `<EmailPreview>` modal was only rendered inside the `batch-detail` block, so the Header button did nothing on the Batch Overview page · moved the `{showEmail && <EmailPreview/>}` render to a single shared spot after `<Header/>`, gated to batch pages · no change to `EmailPreview.jsx` |
| v7.7.0 | Accuracy Stats chart redesign — `AccuracyChart` `AreaChart` (single averaged line) replaced by `MultiLineChart`: one line per horizon (1M/3M/6M/12M) + a Global aggregate line · clickable legend toggles each line, Y axis rescales to the visible series · multi-series hover tooltip · smoothed monotone-cubic curves (no overshoot below 0%) + subtle fill under Global · segments split at nulls (legacy 12M / immature horizons don't bridge gaps) · diagonal X-axis batch labels (rotate -40°, 11px) · no backend/`useHistory` changes — `chartData` is already per-horizon · adopt branch + Vercel preview workflow (new `docs/GIT_WORKFLOW.md`, linked from README) |
| v7.6.1 | Supabase cron watchdog — `check_cron_health()` (new, Job 9, Mon+Thu 07:00 UTC) detects the gap the v7.6.0 email can't: a cron that never runs / is cancelled by timeout. Checks awaiting horizons overdue >3d, weekly summary stale >8d, expired summary stale >3d · reuses `notify_fetch_failure()` (no new EmailJS template) · logs to `fetch_log` + `fetch_log_summary` · SUPABASE.md + supabase_setup.sql updated |
| v7.6.0 | Supabase failure alerts — `notify_fetch_failure()` emails via EmailJS (`http_post` + `accessToken`) when any fetch ends with `failed > 0` · `fetch_expired_horizons` now writes persistent logging (`fetch_log` + `fetch_log_summary`) and triggers the alert · notify hooks added to `fetch_weekly_prices` + `fetch_weekly_prices_recovery` · `emailjs_private_key` Vault secret (required by EmailJS *Use Private Key*) · SUPABASE.md + supabase_setup.sql updated |
| v7.5.11 | Fix: WatchlistPage `rows is not defined` — stray `rows.length` reference in market filter badge updated to `filteredGroups.length` |
| v7.5.14 | WatchlistPage — fix provisional verdict badge wrapping to two lines (whitespace-nowrap) |
| v7.5.19 | StockTable: overflow-x-clip fixes sticky thead in BatchOverviewDetail |
| v7.5.18 | StockTable sticky thead (fixes BatchOverviewDetail) + WatchlistPage tooltip word-wrap fix |
| v7.5.17 | Sticky column headers in AllStocks + BatchOverviewDetail + Watchlist tooltip text style (text-sm, text-foreground) |
| v7.5.16 | WatchlistPage — fix ColTooltip using position:fixed (getBoundingClientRect) — definitive fix for tooltip clipping |
| v7.5.15 | WatchlistPage — fix ColTooltip tooltip clipped by sticky header (now opens downward) |
| v7.5.14 | WatchlistPage — remove redundant expand chevron (expand via batches badge only) |
| v7.5.13 | WatchlistPage — fix sticky header (overflow-hidden blocking), fix batch expand (Set mutation), star and chevron in separate columns |
| v7.5.12 | WatchlistPage — sticky column header on scroll + expand ticker history by clicking batches badge |
| v7.5.11 | Fix: WatchlistPage crash — rows is not defined in market filter badge (rows.length → filteredGroups.length) |
| v7.5.10 | Watchlist overhaul — horizon toggle (1M/3M/6M/12M), grouped rows with expand + avg upside, Left to target column, provisional verdict (~), ColTooltip headers, collapsible column guide · BatchSimple scroll-to + violet highlight from Watchlist · App auto-loads smallest batch on startup · stocks sorted A→Z on batch load |
| v7.5.9 | Supabase price functions overhaul — fetch_expired_horizons 5-day lookback window (fixes weekend/holiday expiry) · fetch_weekly_prices unique-ticker architecture (fixes 2-min timeout) · fetch_weekly_prices_recovery() new function (Job 8, Mon 06:00 UTC) · fetch_log + fetch_log_summary tables · SUPABASE.md + UML updated |
| v7.5.8 | Fix: getRefPrice/getUpsideHoy declaration order in AllStocksPage (ReferenceError before initialization) |
| v7.5.7 | All Stocks — Left to target column (real upside from today's price) · getRefPrice cascade: weekly close → autoPrices → basePrice · topPicks and bestOnly use upsideHoy |
| v7.5.6 | All Stocks — Top 5 picks cards + Best only filter (⚡) · upside/score toggle · HelpPage new section |
| v7.5.5 | Drop 12M horizon from new batches — ImportBox parseHorizon() skips -- /empty/0 · useHistory/saveBatch skips null targetPrice · calcScore fallback u12→u6→u3 · AccuracyChart 12M legacy badge |
| v7.5.4 | Auth bug fix — storage.js loadHistory/saveHistory/deleteHistoryBatch use authHeaders() (JWT) instead of headers() (anon key) |
| v7.5.1 | ManageUsers bug fix — full_name column does not exist in profiles · use email instead · loading freeze resolved |
| v7.5.0 | Market filter badges (US/DE) in All Stocks + Watchlist · ticker display without suffix · default sort ticker A→Z · AV 24h price cache · UML diagram · README changelog note |

## Changelog

> **Versions before v6.9.0** (v0.2.0 → v6.8.x, 131 tags total) are not documented here.
> To browse the full history: `git log --oneline --tags --simplify-by-decoration`

| Version | What |
|---|---|
| v7.4.10 | Final release — SUPABASE.md complete · supabase_setup.sql · EU market support confirmed · fetch_expired_horizons + fetch_weekly_prices Yahoo Finance · README complete |
| v7.4.9 | Alpha Vantage rate limit detection + clear error message |
| v7.4.8 | Watchlist bug fixes — crash on European tickers + alphabetical sort |
| v7.4.7 | Multi-currency — EUR/GBP/JPY/CHF · currency saved in results · WatchlistPage + ExportPage currency-aware |
| v7.4.6 | Export page — HTML + PDF reports · batch + content selection · jspdf + html2canvas |
| v7.4.5 | Watchlist sticky panel — independent scroll · sidebar label fix |
| v7.4.4 | Price alerts — browser notifications + email via EmailJS · Settings alerts section · Watchlist "Check alerts" button · alert_config + alert_log Supabase tables |
| v7.4.3 | Direction badges in Batch Details header · Watchlist one row per ticker×batch + Direction column + panel badge |
| v7.4.2 | Watchlist UI — page with cards + table + side panel + sparkline · ⭐ toggle in All Stocks + Batch Details · weeklyPrices lifted to App.jsx |
| v7.4.1 | Watchlist table (Supabase) · SUPABASE.md rewritten · Bug #3 documented (v_ prefix fix) · cron schedule corrected (Tue–Sat 02:00 UTC) · backup_to_github v1.1 (fundamentals_cache) · weekly + monthly Google Calendar verification reminders |
| v7.4.0 | Bearish batch support — direction selector in Import · badge in Batch Overview + Accuracy Stats |
| v7.3.9 | Auto-fetch prices on batch load · manual fetch button remains available |
| v7.3.8 | All Stocks — vs Target column (last weekly price vs target) · ticker link → Batch Overview Details |
| v7.3.7 | Settings live thresholds table · All Stocks sort by ticker alphabetically |
| v7.3.6 | Settings page (defaults + profile + data + about) · Help & About page (workflow + verdicts + SQL guide) |
| v7.3.5 | FetchBar log second line · horizon bar labels two lines · Refresh Market forceRefresh fix |
| v7.3.4 | Supabase `hit_rate_ext` column · saveBatch uses snapshot mode |
| v7.3.3 | AccuracyChart — slider removed · fixed SNAPSHOT_PARAMS · hitRateExt in cards + table |
| v7.3.2 | BatchSimple verdict colors — exceeded/close/miss/wrong_way badges |
| v7.3.1 | New SummaryCards layout (6+2 boxes) · exceeded/wrong_way colors · Bug 3 fix |
| v7.3.0 | New verdict system — `exceeded` + `wrong_way` · snapshot params per horizon |
| v7.2.1 | invite-user Edge Function — secure user invitation via Supabase server |
| v7.2.0 | React Testing Library — 43 component tests · `docs/TESTING.md` · adaptive test environments |
| v7.1.4 | TradingView chart modal · icon button in Batch Overview + All Stocks · adaptive colSpan |
| v7.1.3 | `fundamentals_cache` table in Supabase · auto-populated on Save · All Stocks loads from cache first |
| v7.1.2 | Sparklines in All Stocks from `weekly_prices` · ColTooltip on all column headers · NaN guard for <2 points |
| v7.1.1 | Ticker normalisation — `.US` stripped at import · All Stocks fundamentals from all batches · Refresh Market button · upside horizon fix |
| v7.1.0 | All Stocks page — consolidated view of all batches · deduplication · Investment Score · horizon dropdown · filters · CSV export |
| v7.0.6 | Finnhub replaces Twelve Data for fundamentals — `useFundamentals.js` extended with PEG, margins, growth metrics · Refresh Fundamentals button |
| v7.0.5 | PriceChart rebuilt with Chart.js — real dates, target dots, zoom slider · auto-load first batch · GitHub weekly backup · RLS fix for weekly_prices |
| v7.0.4 | `formatDate()` fix — `Sept` → `Sep` to prevent Supabase ERROR 22007 |
| v7.0.3 | Node 18 compatibility — bypass blocking Auth API calls |
| v7.0.2 | Authentication + role-based access |
| v6.9.5 | Documentation — JSDoc across all hooks and utils |
| v6.9.4 | Phase 4 — complex components + legacy CSS vars removed |
| v6.9.3 | Phase 3 — medium components migrated |
| v6.9.2 | Phase 2 — simple components migrated |
| v6.9.1 | Phase 1 — base shadcn/ui components added |
| v6.9.0 | Phase 0 — Tailwind + shadcn/ui setup |
