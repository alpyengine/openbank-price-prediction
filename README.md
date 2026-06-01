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

## Environment variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_TWELVE_DATA_KEY=your_key
VITE_FMP_KEY=your_key
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

## Changelog

| Version | What |
|---|---|
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
