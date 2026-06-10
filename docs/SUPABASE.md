# Supabase Architecture — Complete Reference

**Project:** Openbank Price Prediction  
**Supabase project:** `yyenwzljojxbqtzcbchk`  
**Version:** v7.4.10  
**Last updated:** June 2026

This document describes every table, function, cron job, and configuration
in Supabase for this project. Use it as the single source of truth when
debugging, migrating, or onboarding a new developer.

A single SQL file that recreates the entire project is available at:
`docs/supabase_setup.sql`

---

## Table of contents

1. [Tables](#1-tables)
2. [Functions](#2-functions)
3. [Cron jobs](#3-cron-jobs)
4. [Vault secrets](#4-vault-secrets)
5. [Row Level Security](#5-row-level-security)
6. [Backup system](#6-backup-system)
7. [Edge Functions](#7-edge-functions)
8. [EU market support](#8-eu-market-support)
9. [Known issues & fixes](#9-known-issues--fixes)
10. [Verification queries](#10-verification-queries)

---

## 1. Tables

### `batches`

Stores saved prediction batches. Each batch represents a set of Openbank AI
stock forecasts evaluated at a specific base date.

```sql
create table public.batches (
  id             text        primary key,           -- YYYY-MM-DD from base date
  date           text        not null,              -- DD/MM/YYYY display format
  saved_at       timestamptz not null default now(),
  updated_at     timestamptz,
  results        jsonb       not null,              -- array of prediction results
  stocks         integer,                           -- number of tickers
  hit_rate       integer,                           -- pure hit rate % (hits only)
  hit_rate_ext   integer,                           -- extended hit rate % (hits+exceeded)
  direction      text        not null default 'bullish', -- 'bullish' | 'bearish'
  market_data    jsonb,                             -- SPY/ETF benchmark data
  fundamentals   jsonb,                             -- per-ticker fundamentals snapshot
  horizon_status jsonb                              -- { '1M': bool, ... }
);
```

**results jsonb structure** (one object per ticker × horizon):
```json
{
  "ticker":      "MU",
  "company":     "Micron Technology",
  "currency":    "USD",
  "horizon":     "1M",
  "verdict":     "awaiting",
  "basePrice":   82.50,
  "targetPrice": 90.00,
  "targetDate":  "19 Apr 2026",
  "priceOnDate": null,
  "note":        ""
}
```

`currency` field added in v7.4.7. Values: `USD`, `EUR`, `GBP`, `JPY`, `CHF`.
Older batches without this field default to `USD` in the frontend.

---

### `price_cache`

Historical EOD prices cached after horizon evaluation. Avoids repeated API calls.

```sql
create table public.price_cache (
  ticker       text    not null,
  target_date  date    not null,
  close_price  numeric not null,
  fetched_at   timestamptz default now(),
  source       text    default 'twelve_data',  -- 'twelve_data' | 'yahoo'
  primary key (ticker, target_date)
);
```

---

### `weekly_prices`

Weekly closing prices used for sparkline charts in WatchlistPage.
Populated automatically every Saturday by `fetch_weekly_prices()`.

```sql
create table public.weekly_prices (
  ticker       text    not null,
  batch_id     text    not null references public.batches(id) on delete cascade,
  week         integer not null,   -- week number from base date (1 = first full week)
  week_date    date,               -- Friday date of the week
  close_price  numeric not null,
  primary key (ticker, batch_id, week)
);

create index idx_weekly_prices_lookup
  on weekly_prices(ticker, batch_id);
```

---

### `profiles`

User metadata: role (`admin` | `readonly`). Created automatically on sign-up.

```sql
create table public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  email      text,
  role       text not null default 'readonly',
  created_at timestamptz default now()
);
```

---

### `fundamentals_cache`

Per-ticker fundamentals from Finnhub + FMP APIs.

```sql
create table public.fundamentals_cache (
  ticker         text primary key,
  sector         text,
  industry       text,
  market_cap     numeric,
  beta           numeric,
  peg_ttm        numeric,
  net_margin_ttm numeric,
  forward_pe     numeric,
  fetched_at     timestamptz default now()
);
```

---

### `watchlist`

Per-user starred tickers. One row per user × ticker.

```sql
create table public.watchlist (
  user_id   uuid references auth.users on delete cascade,
  ticker    text not null,
  added_at  timestamptz default now(),
  primary key (user_id, ticker)
);
```

---

### `alert_config`

Per-user price alert preferences (added v7.4.4).

```sql
create table public.alert_config (
  user_id     uuid references auth.users on delete cascade primary key,
  enabled     boolean not null default true,
  email       text,
  browser     boolean not null default true,
  on_exceeded boolean not null default true,
  on_hit      boolean not null default true,
  on_close    boolean not null default false,
  on_stop     boolean not null default true,
  stop_pct    numeric not null default 10,
  cooldown_h  integer not null default 24,
  updated_at  timestamptz default now()
);
```

---

### `alert_log`

Log of sent price alerts — enforces cooldown between repeat alerts (added v7.4.4).

```sql
create table public.alert_log (
  id         bigserial primary key,
  user_id    uuid references auth.users on delete cascade,
  ticker     text not null,
  batch_id   text not null,
  horizon    text not null,
  verdict    text not null,
  price      numeric,
  target     numeric,
  sent_at    timestamptz default now()
);
```

---

### `fetch_log`

Persistent log of individual ticker fetch attempts. Written by `fetch_weekly_prices()`
and `fetch_weekly_prices_recovery()`. Not included in the GitHub backup (operational
data, not business data).

```sql
create table public.fetch_log (
  id         bigserial   primary key,
  run_date   date        not null,
  function   text        not null,  -- 'fetch_weekly_prices' | 'fetch_weekly_prices_recovery'
  ticker     text        not null,
  status     text        not null,  -- 'inserted' | 'skipped' | 'failed'
  detail     text,                  -- price inserted, error message, or skip reason
  created_at timestamptz not null default now()
);
```

---

### `fetch_log_summary`

One row per function execution — inserted/skipped/failed counts and duration in seconds.
Written at the end of each `fetch_weekly_prices*` run.

```sql
create table public.fetch_log_summary (
  id         bigserial   primary key,
  run_date   date        not null,
  function   text        not null,
  inserted   integer     not null default 0,
  skipped    integer     not null default 0,
  failed     integer     not null default 0,
  duration_s numeric,               -- execution time in seconds
  created_at timestamptz not null default now()
);
```

---

## 2. Functions

### `handle_new_user()` — trigger

Auto-creates a `profiles` row with `role = 'readonly'` when a new user signs up.

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'readonly')
  on conflict (id) do nothing;
  return new;
end;
$$;
```

---

### `fetch_expired_horizons()` ⚠️ Critical

**Cron:** Job 1 — Tue–Sat 02:00 UTC  
**Purpose:** Evaluates all awaiting predictions whose `targetDate` has passed.

For each expired prediction:
1. Checks `price_cache` for existing price (avoids re-fetch)
2. Detects market: EU suffix → Yahoo Finance; US → Twelve Data
3. Fetches closing price using a **5-day lookback window** (picks nearest trading day ≤ targetDate)
4. Saves to `price_cache`
5. Calculates verdict (exceeded / hit / close / wrong_way / miss)
6. Updates `batches.results` with verdict and `priceOnDate`
7. Recalculates `hit_rate` and `hit_rate_ext` for all affected batches

**Lookback window (updated v7.5.9):**
- US tickers: `time_series?start_date=(targetDate-5)&end_date=targetDate` — picks closest day ≤ targetDate
- EU tickers: Yahoo Finance `period1=(targetDate-5d)&period2=targetDate` — takes last element (most recent)
- Covers: weekend expiries (Sun→Fri, Sat→Fri), bank holidays, and holiday+weekend combinations
- Never uses a date after `targetDate` (no look-ahead bias)

**Previously (v7.5.2 and earlier):**
- US: `/eod?date=targetDate` — failed for weekend/holiday dates (Twelve Data returns no data)
- EU: ±3 day window — insufficient for some holiday combinations

**Hit margins by horizon:**
| Horizon | Hit margin | Close ratio | Close threshold |
|---|---|---|---|
| 1M | ±3% | 2.0 | ±6% |
| 3M | ±5% | 2.0 | ±10% |
| 6M | ±7% | 1.8 | ±12.6% |
| 12M | ±10% | 1.6 | ±16% |

**⚠️ Critical note on variable naming (Bug #3 fix):**
All variables use `v_` prefix (e.g., `v_ticker`, `v_target_date`). This prevents
PostgreSQL column/variable name collision which caused silent failures.

---

### `fetch_weekly_prices()`

**Cron:** Job 2 — Saturdays 10:00 UTC  
**Purpose:** Fetches the most recent Friday closing price for all active tickers.

**Architecture (updated v7.5.9 — unique ticker loop):**
1. Gets list of **unique tickers** across all batches (~30 instead of ~200 combinations)
2. Makes **one API call per ticker**
3. Inserts the price into **all matching batch combinations** in a nested loop
4. Logs every insert/skip/fail to `fetch_log`
5. Writes execution summary to `fetch_log_summary`

**Why the change?** Previous architecture iterated all `ticker × batch_id` combinations
(~200 rows × 8s sleep = ~560s) which exceeded Supabase's 2-minute cron timeout.
New architecture: ~30 unique tickers × 2s = ~60s. ✅

**Lookback window:**
- US tickers: `time_series?start_date=(friday-7)&end_date=friday` — closest day ≤ friday
- EU tickers: Yahoo Finance `period1=(friday-5d)&period2=(friday+1d)` — closest day ≤ friday
- Handles Friday holidays, long weekend combinations

**Rate limit:** `pg_sleep(2)` between unique tickers (reduced from 8s — safe with new architecture).

---

### `fetch_weekly_prices_recovery()`

**Cron:** Job 8 — Mondays 06:00 UTC  
**Purpose:** Safety net — retries any tickers missed by the Saturday `fetch_weekly_prices()` run.

**When does it trigger?**  
Any ticker that should have a `weekly_prices` row for last Friday (batch old enough, week_num > 0)
but doesn't have one. This catches: API timeouts, rate limit silences, transient network errors.

**Flow:**
1. Calculates `friday = last week's Friday` (the one Saturday's run targeted)
2. Finds all unique tickers missing a `week_date = friday` row for any eligible batch
3. Re-fetches using identical API logic to `fetch_weekly_prices()`
4. Inserts recovered rows tagged `RECOVERED` in `fetch_log.detail`
5. Writes summary to `fetch_log_summary`

**Full weekly schedule:**
```
Saturday  10:00 UTC → fetch_weekly_prices()          main run
Sunday    23:00 UTC → backup_to_github()             data backup
Monday    06:00 UTC → fetch_weekly_prices_recovery() retry missed tickers
```

---

### `backup_to_github()`

**Cron:** Job 6 — Sundays 23:00 UTC  
**Purpose:** Full database backup to GitHub repository.

Backs up: `batches`, `weekly_prices`, `price_cache`, `fundamentals_cache`  
GitHub repo: `alpyengine/openbank-price-data`  
Requires: `github_pat` secret in Vault

Each table is exported as JSON and committed to the repo via GitHub API.
Existing files are updated (not duplicated) using the SHA from the GET response.

---

## 3. Cron jobs

All jobs managed by `pg_cron` (built into Supabase).

| Job | Name | Schedule | Function | Purpose |
|---|---|---|---|---|
| 1 | `fetch-expired-horizons-daily` | `0 2 * * 2-6` | `fetch_expired_horizons()` | Evaluate expired predictions Tue–Sat 02:00 UTC |
| 2 | `fetch-weekly-prices-saturday` | `0 10 * * 6` | `fetch_weekly_prices()` | Weekly close prices every Saturday 10:00 UTC |
| 6 | `weekly-github-backup` | `0 23 * * 0` | `backup_to_github()` | Full backup to GitHub every Sunday 23:00 UTC |
| 8 | `recovery-weekly-prices` | `0 6 * * 1` | `fetch_weekly_prices_recovery()` | Retry missed weekly prices every Monday 06:00 UTC |

**Why Tue–Sat for Job 1?**  
The market closes at ~21:00 UTC Mon–Fri. The cron runs at 02:00 UTC —
that's early Tuesday through early Saturday, catching Monday–Friday closes.

**Check job status:**
```sql
select jobid, jobname, schedule, active from cron.job order by jobid;

-- Recent run history:
select jobname, status, start_time, end_time
from cron.job_run_details
order by start_time desc limit 20;
```

**Modify schedule:**
```sql
select cron.alter_job(job_id := 1, schedule := '0 2 * * 2-6');
```

**Unschedule:**
```sql
select cron.unschedule('job-name');
```

---

## 4. Vault secrets

| Secret name | Used by | Notes |
|---|---|---|
| `twelve_data_key` | `fetch_expired_horizons()`, `fetch_weekly_prices()` | Free plan: 8 req/min, 800/day |
| `github_pat` | `backup_to_github()` | Token scope: `repo` |

**Add/view secrets:**
```sql
-- Add (Dashboard → Vault is easier):
insert into vault.secrets (name, secret)
values ('twelve_data_key', 'your_key_here');

-- Verify (shows decrypted value):
select name, decrypted_secret
from vault.decrypted_secrets
where name in ('twelve_data_key', 'github_pat');
```

---

## 5. Row Level Security

All tables have RLS enabled. Summary:

| Table | Policy | Rule |
|---|---|---|
| `batches` | `batches_read` + `batches_write` | All authenticated users |
| `price_cache` | `price_cache_read` | All authenticated users (read only) |
| `weekly_prices` | `weekly_prices_read` | All authenticated users (read only) |
| `profiles` | `profiles_own` | Each user owns their row |
| `fundamentals_cache` | `fundamentals_read` + `fundamentals_write` | All authenticated users |
| `watchlist` | `watchlist_select` + `watchlist_insert` + `watchlist_delete` | Each user owns their rows |
| `alert_config` | `alert_config_own` | Each user owns their row |
| `alert_log` | `alert_log_own` | Each user owns their rows |

**⚠️ INSERT vs SELECT RLS:**  
INSERT policies require `with check` (not `using`). Using `for all using (...)` 
does NOT cover INSERT — this caused 403 errors on watchlist inserts (Bug v7.4.2).
Always create separate policies for SELECT, INSERT, DELETE.

**Verify all policies:**
```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
```

---

## 6. Backup system

Weekly backup runs every Sunday at 23:00 UTC via `backup_to_github()`.

**GitHub repo:** `alpyengine/openbank-price-data`  
**Files backed up:**
- `batches.json`
- `weekly_prices.json`
- `price_cache.json`
- `fundamentals_cache.json`

Each file is a JSON array of all rows in the table. The function uses the
GitHub Contents API with PUT — reads SHA first to update existing files.

**Trigger manual backup:**
```sql
select backup_to_github();
```

**Verify last backup:**
```sql
select jobname, status, start_time
from cron.job_run_details
where jobname = 'weekly-github-backup'
order by start_time desc limit 5;
```

---

## 7. Edge Functions

### `invite-user`

Allows admins to invite new users via the Supabase Admin API.
Located at: `supabase/functions/invite-user/index.ts`

Called from `ManageUsers.jsx` when an admin invites a new user.
Sets initial role to `readonly` in `profiles`.

---

## 8. EU market support

Added in v7.4.7 (weekly prices) and v7.4.10 (expired horizons).

### Supported EU suffixes

| Suffix | Market | API used |
|---|---|---|
| `.DE` | Frankfurt / Xetra | Yahoo Finance |
| `.AS` | Amsterdam (Euronext) | Yahoo Finance |
| `.PA` | Paris (Euronext) | Yahoo Finance |
| `.L` | London Stock Exchange | Yahoo Finance |
| `.MC` | Madrid (BME) | Yahoo Finance |

### Why Yahoo Finance for EU?

Twelve Data's `/eod` endpoint does not return data for European market tickers
(tested with `NEM.DE`, `IFX.DE`, `AIXA.DE`, `EVT.DE` — all returned 404).
Yahoo Finance supports EU tickers natively with `.DE` notation and no API key.

### Yahoo Finance endpoints used

**Weekly prices (fetch_weekly_prices):**
```
GET https://query1.finance.yahoo.com/v8/finance/chart/NEM.DE?interval=1wk&range=1wk
→ .chart.result[0].indicators.quote[0].close[-1]
```

**Historical EOD price (fetch_expired_horizons):**
```
GET https://query1.finance.yahoo.com/v8/finance/chart/NEM.DE?interval=1d&period1=UNIX&period2=UNIX
→ .chart.result[0].indicators.quote[0].close[-1]
period1 = targetDate - 3 days (to find nearest trading day)
period2 = targetDate + 1 day
```

### Frontend EU support (usePriceFetch.js)

```js
const EU_SUFFIXES = ['DE', 'AS', 'PA', 'L', 'MC']
function detectProvider(tickers) {
  const hasEU = tickers.some(t => EU_SUFFIXES.includes(getSuffix(t)))
  return hasEU ? 'alphavantage' : 'twelvedata'
}
```

- Live prices (`fetchCurrentBatch`): EU → Alpha Vantage (25 req/day free tier)
- Historical prices (`fetchHistoricalForHorizon`): EU → Alpha Vantage

**Alpha Vantage rate limit:** 25 requests/day on free tier.
When exceeded, the app shows: `⚠️ Alpha Vantage daily limit reached (25 req/day). Try again tomorrow.`

### Manual backfill for EU batches

If a new EU batch is imported and historical weekly prices need to be populated:

```sql
do $$
declare
  v_batch_id   text := '2026-03-19';  -- change to your batch id
  v_base_date  date := '2026-03-19';  -- change to your batch base date
  v_url        text;
  v_response   text;
  v_closes     jsonb;
  v_timestamps jsonb;
  v_close      numeric;
  v_ts         bigint;
  v_week_date  date;
  v_week_num   integer;
  tickers      text[] := array['NEM.DE','IFX.DE','AIXA.DE','EVT.DE']; -- your tickers
  v_ticker     text;
  i            integer;
begin
  foreach v_ticker in array tickers loop
    v_url := format(
      'https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1wk&range=6mo',
      v_ticker
    );
    select content into v_response from http_get(v_url);
    v_closes     := (v_response::jsonb)->'chart'->'result'->0->'indicators'->'quote'->0->'close';
    v_timestamps := (v_response::jsonb)->'chart'->'result'->0->'timestamp';
    for i in 0..jsonb_array_length(v_timestamps)-1 loop
      v_ts        := (v_timestamps->i)::bigint;
      v_week_date := to_timestamp(v_ts)::date;
      v_close     := (v_closes->i)::numeric;
      if v_close is null then continue; end if;
      v_week_num  := (v_week_date - v_base_date) / 7;
      if v_week_num < 1 or v_week_num > 52 then continue; end if;
      insert into weekly_prices(ticker, batch_id, week, week_date, close_price)
      values (v_ticker, v_batch_id, v_week_num, v_week_date, round(v_close::numeric, 4))
      on conflict (ticker, batch_id, week) do nothing;
    end loop;
    perform pg_sleep(2);
  end loop;
  raise notice 'Backfill complete.';
end;
$$;
```

---

## 9. Known issues & fixes

### Bug #1 — fetch_expired_horizons silent failure (Sept 2025)

**Symptom:** Function ran successfully but no verdicts were updated.  
**Cause:** Twelve Data returned empty response for tickers outside US market.  
**Fix:** Added EU detection — Yahoo Finance for `.DE`/`.AS`/`.PA`/`.L`/`.MC` tickers.

### Bug #2 — price_cache always returns first row (RLS)

**Symptom:** `fetch_expired_horizons()` reused the same cached price for all tickers.  
**Cause:** Missing `WHERE` clause in the SELECT — returned first row regardless of ticker.

```sql
-- Wrong:
select pc.close_price into v_cached_price from price_cache pc;
-- Fixed:
select pc.close_price into v_cached_price
from price_cache pc
where pc.ticker = v_ticker and pc.target_date = v_target_date;
```

### Bug #3 — variable/column name collision (Critical)

**Symptom:** `fetch_expired_horizons()` ran successfully but nothing changed.  
**Root cause:** PostgreSQL treats ambiguous names (same name for column and variable)
as column references — the WHERE clause matched nothing.

**Fix:** All variables use `v_` prefix:
```sql
-- Wrong: ticker, target_date, target_price, etc.
-- Fixed: v_ticker, v_target_date, v_target_price, etc.
```

This applies to all security definer functions.

### Bug #4 — watchlist INSERT 403 (RLS)

**Symptom:** `addToWatchlist()` returned 403 Forbidden.  
**Cause 1:** `for all using (...)` does not cover INSERT — needs `with check`.  
**Cause 2:** INSERT body missing `user_id` field — RLS `with check (auth.uid() = user_id)` 
  requires the field to be present in the row.

**Fix:** 3 separate policies (select/insert/delete) + `getUserId()` in frontend
to include `user_id` in the INSERT body.

### Bug #5 — Alpha Vantage rate limit silent failure

**Symptom:** EU ticker prices showed as Failed with no explanation.  
**Cause:** Alpha Vantage returns `{ "Information": "..." }` when daily limit exceeded.
  The app treated this as a missing price (null) without explanation.  
**Fix (v7.4.9):** `fetchCurrentPrices_AV()` detects the Information/Note fields
  and shows: `⚠️ Alpha Vantage daily limit reached (25 req/day). Try again tomorrow.`

### Bug #6 — fetch_expired_horizons fails on weekend/holiday expiry dates (v7.5.9)

**Symptom:** 8 tickers from batch 08/05/2026 stayed `awaiting` after their 1M horizon
expired on 07 Jun 2026 (Sunday). Twelve Data `/eod` returns no data for non-trading days.

**Affected tickers:** AXP, AMD, URI, MCD, ON, AMZN, CAT, WDC

**Fix:** Replaced `/eod?date=targetDate` with `time_series` + 5-day lookback window.
Picks the nearest trading day ≤ targetDate. Covers weekends, bank holidays, and
holiday+weekend combinations. EU tickers: Yahoo Finance window extended from 3 to 5 days.

### Bug #7 — fetch_weekly_prices timeout (v7.5.9)

**Symptom:** Cron job 06 Jun 2026 failed with:
```
ERROR: canceling statement due to statement timeout
CONTEXT: SQL statement "SELECT pg_sleep(8)"
```

**Cause:** ~200 `ticker × batch_id` combinations × 8s sleep = ~560s → Supabase cancels at 2 min.

**Fix:** New unique-ticker architecture — ~30 unique tickers × 2s = ~60s.
One API call per ticker, price inserted into all matching batches in a nested loop.

### Bug #8 — Silent rate limit drops in fetch_weekly_prices (v7.5.9)

**Symptom:** Some tickers not inserted without any error logged — Twelve Data occasionally
returns empty responses under load without an explicit error code.

**Fix:** Added persistent logging to `fetch_log` and `fetch_log_summary`.
`fetch_weekly_prices_recovery()` (Job 8, Monday 06:00 UTC) acts as safety net —
retries any combination missing a row for last Friday.

---

## 10. Verification queries

```sql
-- All tables created:
select tablename from pg_tables
where schemaname = 'public'
order by tablename;

-- RLS enabled on all tables:
select tablename, rowsecurity
from pg_tables
where schemaname = 'public';

-- All functions present:
select proname from pg_proc
where proname in (
  'fetch_expired_horizons', 'fetch_weekly_prices',
  'backup_to_github', 'handle_new_user'
);

-- EU support confirmed on both functions:
select proname,
       prosrc like '%yahoo%'   as has_yahoo,
       prosrc like '%v_is_eu%' as has_eu_detection
from pg_proc
where proname in ('fetch_expired_horizons', 'fetch_weekly_prices');

-- Cron jobs active:
select jobid, jobname, schedule, active
from cron.job
order by jobid;

-- Weekly prices count per batch:
select batch_id, count(*) as rows, min(week) as first_week, max(week) as last_week
from weekly_prices
group by batch_id
order by batch_id;

-- Recent cron run history:
select jobname, status, start_time, end_time
from cron.job_run_details
order by start_time desc
limit 20;

-- Vault secrets present:
select name from vault.decrypted_secrets
where name in ('twelve_data_key', 'github_pat');

-- Verify pending weekly prices (missing rows for last Friday):
select count(*) as pendientes
from batches b,
     jsonb_array_elements(b.results) as r(value)
where r.value->>'horizon' = '1M'
  and (current_date - make_date(
    split_part(b.date,'/',3)::int,
    split_part(b.date,'/',2)::int,
    split_part(b.date,'/',1)::int
  )) / 7 > 0
  and not exists (
    select 1 from weekly_prices wp
    where wp.ticker   = r.value->>'ticker'
      and wp.batch_id = b.id
      and wp.week_date = date_trunc('week', current_date)::date + 4 - 7
  );

-- Verify awaiting horizons past targetDate (should have been evaluated):
select
  r.value->>'ticker'     as ticker,
  r.value->>'horizon'    as horizon,
  r.value->>'targetDate' as target_date,
  r.value->>'verdict'    as verdict
from batches b,
     jsonb_array_elements(b.results) as r(value)
where r.value->>'verdict' = 'awaiting'
  and to_date(r.value->>'targetDate', 'DD Mon YYYY') <= current_date
order by r.value->>'targetDate';

-- Verify recent fetch execution summaries:
select run_date, function, inserted, skipped, failed, duration_s
from fetch_log_summary
order by created_at desc
limit 10;

-- Verify failed tickers from recent runs:
select run_date, function, ticker, status, detail
from fetch_log
where status = 'failed'
order by created_at desc
limit 20;
```
