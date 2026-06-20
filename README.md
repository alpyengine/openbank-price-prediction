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

170 tests across 10 files — utils, hooks, services, components.

---
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
