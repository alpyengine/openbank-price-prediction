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

## Supabase architecture (v5.0.0+)

All persistence, automation and price fetching runs on Supabase.

📄 **[SUPABASE.md](./docs/SUPABASE.md)** — complete reference including:
- Tables, functions, cron jobs, vault secrets
- RLS policies, known issues, EU market support
- GitHub backup system (section 7)

📊 **[openbank-forecast-uml.md](./docs/openbank-forecast-uml.md)** — Mermaid UML diagrams (v7.5.0+):
- Entity relationship diagram (all 8 tables)
- System architecture and data flow
- Cron job schedule, sequence diagrams for all functions
- RLS access matrix and verdict evaluation flowchart

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

107 tests across 6 files — utils, hooks, services.

---
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
