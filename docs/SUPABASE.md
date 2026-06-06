# Supabase Architecture — Complete Reference

**Project:** Openbank Price Prediction  
**Supabase project:** `yyenwzljojxbqtzcbchk`  
**Version:** v7.4.1+  
**Last updated:** June 2026

This document describes every table, function, cron job, and configuration
in Supabase for this project. Use it as the single source of truth when
debugging, migrating, or onboarding a new developer.

---

## Table of contents

1. [Tables](#1-tables)
2. [Functions](#2-functions)
3. [Cron jobs](#3-cron-jobs)
4. [Vault secrets](#4-vault-secrets)
5. [Row Level Security](#5-row-level-security)
6. [Backup system](#6-backup-system)
7. [Edge Functions](#7-edge-functions)
8. [Known issues & fixes](#8-known-issues--fixes)
9. [Verification queries](#9-verification-queries)

---

## 1. Tables

### `batches`

Stores saved prediction batches. Each batch represents a set of Openbank AI
stock forecasts evaluated at a specific base date.

```sql
create table public.batches (
  id            text        primary key,  -- YYYY-MM-DD from base date
  date          text        not null,     -- DD/MM/YYYY display format
  saved_at      timestamptz not null default now(),
  updated_at    timestamptz,
  results       jsonb       not null,     -- array of prediction results
  stocks        integer,                  -- number of tickers
  hit_rate      integer,                  -- pure hit rate % (hits only)
  hit_rate_ext  integer,                  -- extended hit rate % (hits + exceeded)
  direction     text        not null default 'bullish', -- 'bullish' | 'bearish'
  market_data   jsonb,                    -- SPY/ETF benchmark data
  fundamentals  jsonb,                    -- per-ticker fundamentals snapshot
  horizon_status jsonb                    -- { '1M': bool, '3M': bool, ... }
);
```

**Column history:**
- `hit_rate` — added v7.3.4
- `hit_rate_ext` — added v7.3.4
- `direction` — added v7.4.0 with `default 'bullish'` (all existing batches auto-classified)

**`results` array item shape:**
```json
{
  "ticker":      "TER",
  "company":     "Teradyne",
  "horizon":     "1M",
  "verdict":     "awaiting",
  "basePrice":   299.40,
  "targetPrice": 353.92,
  "targetDate":  "17 Apr 2026",
  "priceOnDate": null,
  "note":        ""
}
```

**Verdict values:** `awaiting` | `hit` | `exceeded` | `close` | `miss` | `wrong_way`

**IMPORTANT — `targetDate` format:**  
Always use 3-letter month abbreviations (`Sep` not `Sept`).  
The `formatDate()` function in `src/utils/dates.js` guarantees this.  
Never use `toLocaleDateString()` for dates stored in Supabase.

---

### `price_cache`

Caches historical closing prices from Twelve Data for expired horizon dates.
Avoids duplicate API calls when the same ticker+date is needed multiple times.

```sql
create table public.price_cache (
  id           bigserial   primary key,
  ticker       text        not null,
  target_date  date        not null,
  close_price  numeric     not null,
  source       text        default 'twelve_data',
  fetched_at   timestamptz not null default now(),
  unique(ticker, target_date)
);
```

---

### `weekly_prices`

Stores weekly closing prices (Friday close) for each ticker in each batch.
Used by `PriceChart` to draw the price evolution chart.

One row per ticker × batch × week.  
Week 1 = first Friday after base date.

```sql
create table public.weekly_prices (
  id          bigserial   primary key,
  ticker      text        not null,
  batch_id    text        not null,
  week        integer     not null,   -- 1..52 from base date
  week_date   date        not null,   -- exact Friday date
  close_price numeric     not null,
  fetched_at  timestamptz not null default now(),
  unique(ticker, batch_id, week)
);

create index idx_weekly_prices_lookup
  on weekly_prices(ticker, batch_id);
```

---

### `fundamentals_cache`

Stores fundamentals per ticker independently of batches.
Allows AllStocksPage to show fundamentals for all tickers.

TTL: managed in app — `useFundamentals.js` re-fetches if `fetched_at` > 7 days ago.

```sql
create table if not exists fundamentals_cache (
  ticker       text        primary key,
  data         jsonb       not null,
  fetched_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table fundamentals_cache enable row level security;

create policy "allow read fundamentals_cache"
  on fundamentals_cache for select using (true);

create policy "allow upsert fundamentals_cache"
  on fundamentals_cache for insert with check (true);

create policy "allow update fundamentals_cache"
  on fundamentals_cache for update using (true);
```

---

### `watchlist`

Stores tickers marked as favourites by each user.
Watchlist is user-scoped — each user has their own list.
Direction B: each ticker points to the most recent batch where it appears.

```sql
create table if not exists watchlist (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  ticker     text not null,
  added_at   timestamptz default now(),
  unique(user_id, ticker)
);

alter table watchlist enable row level security;

create policy "watchlist_own" on watchlist
  for all using (auth.uid() = user_id);
```

---

### `profiles`

User profiles linked to Supabase Auth.
Created automatically by trigger when a new user signs up.

```sql
create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  role        text        not null default 'readonly'
                          check (role in ('admin', 'readonly')),
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

---

## 2. Functions

### `fetch_expired_horizons()` ⚠️ Critical — see Bug #3

**Cron:** Job 1 — Tue–Sat at 02:00 UTC  
**Purpose:** Evaluates prediction results for horizons that have expired.

For each `results` row where `verdict = 'awaiting'` and `targetDate <= today`:
1. Checks `price_cache` for existing price
2. If not cached → calls Twelve Data `/eod` API
3. Saves price to `price_cache`
4. Calculates verdict using direction-aware SNAPSHOT_PARAMS logic
5. Updates `batches.results` with new verdict and `priceOnDate`
6. After all rows processed → recalculates `hit_rate` and `hit_rate_ext`

**SNAPSHOT_PARAMS (mirrors `stocks.js`):**

| Horizon | H (hit margin) | R (close ratio) | Close threshold |
|---|---|---|---|
| 1M | ±3% | 2.0× | −6% |
| 3M | ±5% | 2.0× | −10% |
| 6M | ±7% | 1.8× | −12.6% |
| 12M | ±10% | 1.6× | −16% |

**Verdict logic:**

| Verdict | Bullish condition | Bearish condition |
|---|---|---|
| `exceeded` | price > target × (1 + H%) | price < target × (1 − H%) |
| `hit` | \|dist\| ≤ H% | \|dist\| ≤ H% |
| `close` | below target, within close threshold | above target, within close threshold |
| `wrong_way` | price < base price | price > base price |
| `miss` | everything else | everything else |

**Rate limit:** `pg_sleep(8)` between API calls.

**⚠️ CRITICAL — Variable naming convention:**  
All local variables MUST use `v_` prefix to avoid ambiguity with column names.  
See Bug #3 for full explanation of this critical issue.

```sql
-- Current function uses v_ prefix for ALL variables:
-- v_api_key, v_ticker, v_target_date, v_target_price, v_base_price,
-- v_horizon, v_cached_price, v_close_price, v_new_verdict,
-- v_signed_dist, v_dist_abs, v_h_margin, v_r_ratio, v_close_thresh
```

---

### `fetch_weekly_prices()`

**Cron:** Job 2 — Saturdays at 10:00 UTC  
**Purpose:** Fetches the most recent Friday closing price for all active tickers.

For each ticker in each batch:
1. Calculates current week number from base date
2. Checks if week already exists in `weekly_prices`
3. If not → calls Twelve Data `/eod` API for last Friday
4. Saves to `weekly_prices`

**Rate limit:** `pg_sleep(8)` between calls.

---

### `backfill_weekly_prices()`

**Purpose:** Populates historical weekly prices for batches saved after
the weekly prices system was implemented.

Processes 1 record per execution. Self-terminating when all weeks are filled.

```sql
-- Check if backfill is complete:
select count(*) from (
  select distinct r.value->>'ticker', b.id, w.week_num
  from batches b,
       jsonb_array_elements(b.results) as r(value),
       generate_series(1, 52) as w(week_num)
  where r.value->>'horizon' = '1M'
    and (date_trunc('week',
          (make_date(split_part(b.date,'/',3)::int,
                     split_part(b.date,'/',2)::int,
                     split_part(b.date,'/',1)::int)
           + (w.week_num * 7))::timestamp)::date + 4) < current_date
    and not exists (
      select 1 from weekly_prices wp
      where wp.ticker   = r.value->>'ticker'
        and wp.batch_id = b.id
        and wp.week     = w.week_num
    )
) x;
-- When 0 → unschedule: select cron.unschedule('backfill-weekly-prices');
```

---

### `backup_to_github()`

**Cron:** Job 6 — Sundays at 23:00 UTC  
**Purpose:** Full database backup to GitHub repository.

Backs up: `batches`, `weekly_prices`, `price_cache`, `fundamentals_cache`  
Current version: `1.1` (added `fundamentals_cache` in June 2026)

Uses `row_to_json()` — **automatically includes all columns** including
newly added ones (`hit_rate_ext`, `direction`, etc.). No manual update needed
when new columns are added to tables.

---

### `handle_new_user()`

**Trigger:** fires after INSERT on `auth.users`  
**Purpose:** Auto-creates a `profiles` row for every new user.

```sql
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

### `get_my_role()`

**Purpose:** Returns the current user's role from `profiles`.
Used by RLS policies to avoid recursive queries.

**Why this exists:** The naive RLS approach queries `profiles` inside a
`profiles` policy — a recursive query that always returns 0 rows silently,
causing role to always appear as `readonly`. `get_my_role()` with
`security definer` breaks the recursion.

---

## 3. Cron jobs

All jobs managed by `pg_cron` (built into Supabase).

| Job ID | Name | Schedule | Function | Purpose |
|---|---|---|---|---|
| 1 | `fetch-expired-horizons-daily` | `0 2 * * 2-6` | `fetch_expired_horizons()` | Evaluate expired predictions Tue–Sat 02:00 UTC |
| 2 | `fetch-weekly-prices-saturday` | `0 10 * * 6` | `fetch_weekly_prices()` | Weekly close prices every Saturday 10:00 UTC |
| 6 | `weekly-github-backup` | `0 23 * * 0` | `backup_to_github()` | Full backup to GitHub every Sunday 23:00 UTC |

**⚠️ Schedule rationale — Job 1:**  
The market closes at ~21:00 UTC Mon–Fri. The cron runs at 02:00 UTC —
giving Twelve Data 5 hours to have EOD prices available.  
Since 02:00 UTC is technically the **next calendar day**, the schedule
uses **Tue–Sat (2-6)** to cover Mon–Fri market closes.

| Market close | Day | Cron executes |
|---|---|---|
| Monday close | Mon | Tuesday 02:00 UTC |
| Tuesday close | Tue | Wednesday 02:00 UTC |
| Wednesday close | Wed | Thursday 02:00 UTC |
| Thursday close | Thu | Friday 02:00 UTC |
| Friday close | Fri | Saturday 02:00 UTC |

**Management commands:**
```sql
-- View all jobs
select jobid, jobname, schedule, active from cron.job order by jobid;

-- View recent execution history
select jobid, status, return_message, start_time, end_time
from cron.job_run_details
order by start_time desc limit 20;

-- Change schedule
select cron.alter_job(job_id := 1, schedule := '0 2 * * 2-6');

-- Unschedule a job
select cron.unschedule('job-name');
```

---

## 4. Vault secrets

| Secret name | Used by | Notes |
|---|---|---|
| `twelve_data_key` | All price-fetching functions | Free plan: 8 req/min |
| `github_pat` | `backup_to_github()` | Requires `repo` scope |

```sql
-- Verify secrets exist
select name, length(decrypted_secret) as len
from vault.decrypted_secrets
where name in ('twelve_data_key', 'github_pat');

-- Update a secret
select vault.update_secret(id, 'new_value')
from vault.secrets where name = 'secret_name';
```

---

## 5. Row Level Security

### `profiles`
```sql
-- Read own profile
create policy "read own profile" on public.profiles for select
  using (auth.uid() = id);

-- Admin reads all profiles
create policy "admin reads all profiles" on public.profiles for select
  using (auth.uid() = id or public.get_my_role() = 'admin');

-- Update own profile
create policy "users can update own profile" on public.profiles for update
  using (auth.uid() = id);

-- Admin updates any profile
create policy "admin can update any profile" on public.profiles for update
  using (public.get_my_role() = 'admin');
```

### `batches`
```sql
-- All authenticated users can read
create policy "authenticated users can read batches"
  on public.batches for select using (auth.role() = 'authenticated');

-- Only admin can write
create policy "admin can insert batches" on public.batches for insert
  with check (public.get_my_role() = 'admin');
create policy "admin can update batches" on public.batches for update
  using (public.get_my_role() = 'admin');
create policy "admin can delete batches" on public.batches for delete
  using (public.get_my_role() = 'admin');
```

### `weekly_prices`
```sql
-- All authenticated users can read
create policy "authenticated users can read weekly prices"
  on public.weekly_prices for select using (auth.role() = 'authenticated');
-- Write via security definer functions only (cron jobs)
```

### `watchlist`
```sql
-- Each user only sees and manages their own watchlist
create policy "watchlist_own" on watchlist
  for all using (auth.uid() = user_id);
```

---

## 6. Backup system

### What is backed up

| Table | Backed up | Notes |
|---|---|---|
| `batches` | ✅ | Full rows including all columns via `row_to_json()` |
| `weekly_prices` | ✅ | All weekly close prices |
| `price_cache` | ✅ | All historical EOD prices |
| `fundamentals_cache` | ✅ | Added June 2026 (backup v1.1) |
| `profiles` | ❌ | Managed by Supabase Auth — restore manually |
| `watchlist` | ❌ | User-specific — restore manually if needed |

### Schedule

| Day | Time (UTC) | Job | What happens |
|---|---|---|---|
| Tue–Sat | 02:00 | fetch-expired-horizons-daily | Evaluate expired predictions |
| Saturday | 10:00 | fetch-weekly-prices-saturday | Save weekly prices |
| Sunday | 23:00 | weekly-github-backup | Full backup to GitHub |

This order ensures the Sunday backup always contains the most recent
weekly prices (Saturday) and the latest verdict evaluations.

### Backup file format
```json
{
  "metadata": {
    "backup_date": "2026-06-08T23:00:00Z",
    "supabase_project": "yyenwzljojxbqtzcbchk",
    "version": "1.1",
    "tables": ["batches", "weekly_prices", "price_cache", "fundamentals_cache"]
  },
  "batches": [...],
  "weekly_prices": [...],
  "price_cache": [...],
  "fundamentals_cache": [...]
}
```

### How to restore from backup
```bash
git clone https://github.com/alpyengine/openbank-price-data.git
cat data/history.json  # latest backup
# For a specific date:
git log --oneline
git show COMMIT_SHA:data/history.json > restore.json
```

---

## 7. Edge Functions

### `invite-user`

Allows admin to invite new users without exposing the Service Role Key
in frontend code.

```bash
# Deploy
supabase link --project-ref yyenwzljojxbqtzcbchk
supabase functions deploy invite-user
supabase secrets set SERVICE_ROLE_KEY=your_service_role_key_here
```

**Flow:** Admin click → JWT verify → role check → `auth.admin.inviteUserByEmail()`

---

## 8. Known issues & fixes

### Bug #1 — `Sept` vs `Sep` in targetDate (critical, fixed v7.0.4)

**Symptom:** `fetch_expired_horizons()` silently fails for September predictions.  
`to_date('15 Sept 2026', 'DD Mon YYYY')` throws `ERROR 22007`.

**Cause:** `toLocaleDateString('en-GB', { month: 'short' })` on macOS returns
`Sept` instead of `Sep` for September.

**Fix in DB (one-time):**
```sql
update batches
set results = (
  select jsonb_agg(
    case
      when r.value->>'targetDate' like '%Sept%'
      then r.value || jsonb_build_object(
        'targetDate', replace(r.value->>'targetDate', 'Sept', 'Sep')
      )
      else r.value
    end
  )
  from jsonb_array_elements(results) as r(value)
)
where results::text like '%Sept%';
```

**Fix in code (permanent):** `formatDate()` in `src/utils/dates.js` now uses
a fixed `MONTHS` array. Applied in v7.0.4.

---

### Bug #2 — Vault API key with spurious `T` prefix (fixed May 2026)

**Symptom:** API calls return no data. URLs contain `apikey=T5a34f4...`.

**Fix:**
```sql
select vault.update_secret(id, '5a34f4a233824fa69ea731e20caff452')
from vault.secrets where name = 'twelve_data_key';
```

**Prevention:** Always verify vault secrets after creation:
```sql
select name, decrypted_secret from vault.decrypted_secrets
where name = 'twelve_data_key';
```

---

### Bug #3 — Variable/column name collision in PL/pgSQL (critical, fixed June 2026)

**Symptom:** `fetch_expired_horizons()` runs successfully (cron shows `succeeded`)
but no verdicts are ever updated — all rows remain `awaiting` indefinitely.
Even with prices available in `price_cache`, the function appears to do nothing.

**Root cause:** PostgreSQL PL/pgSQL variable name ambiguity.

When a local variable has the same name as a table column, PostgreSQL resolves
the name in WHERE clauses and CASE expressions as the **column**, not the variable.

In the original function:
```sql
declare
  ticker text := rec.result_row->>'ticker';  -- local variable
  ...
begin
  -- PostgreSQL interprets this as: pc.ticker = pc.ticker → ALWAYS TRUE
  -- Returns the first row in price_cache regardless of ticker
  select pc.close_price into cached_price
  from price_cache pc
  where pc.ticker = ticker        -- ← BUG: ticker resolves to pc.ticker
    and pc.target_date = target_date;  -- ← BUG: same issue

  -- The CASE in UPDATE also fails silently:
  -- elem->>'ticker' = ticker  → compared against column, not variable
```

The result: the cache lookup returns wrong data or nothing, the UPDATE
matches no rows, and the `exception when others then null` silences everything.
The cron shows `succeeded` but nothing changes in the database.

**This is a silent, catastrophic failure with no error messages.**

**Fix:** Rename ALL local variables with `v_` prefix:
```sql
declare
  v_ticker       text    := rec.result_row->>'ticker';
  v_target_date  date    := to_date(rec.result_row->>'targetDate', 'DD Mon YYYY');
  v_target_price numeric := (rec.result_row->>'targetPrice')::numeric;
  v_base_price   numeric := (rec.result_row->>'basePrice')::numeric;
  v_horizon      text    := rec.result_row->>'horizon';
  v_cached_price numeric;

-- Now unambiguous:
select pc.close_price into v_cached_price
from price_cache pc
where pc.ticker      = v_ticker        -- ← v_ticker is clearly the variable
  and pc.target_date = v_target_date;  -- ← no ambiguity
```

**Rule (enforced from v7.4.1):**  
**ALL local variables in PL/pgSQL functions MUST use the `v_` prefix.**  
This applies to: `fetch_expired_horizons()`, `fetch_weekly_prices()`,
`backfill_weekly_prices()`, and any future functions.

**How it was diagnosed:**
1. Manual simulation of the UPDATE query worked correctly
2. Direct SQL UPDATE bypassing the function worked correctly
3. `price_cache` was populated but the function ignored it
4. Removing `exception when others then null` revealed no explicit error
5. Conclusion: silent name collision — the most insidious type of SQL bug

**Timeline of investigation (June 2026):**
- Cron showed `succeeded, 1 row` but duration was only 39ms (should be ~64s)
- Manual `select fetch_expired_horizons()` returned immediately
- `price_cache` empty → manually inserted all 8 ticker prices
- Function still produced no results
- Simulated UPDATE in plain SQL → worked perfectly
- Identified `v_` prefix fix → function now works correctly

---

### Bug #4 — Cron schedule wrong timezone (fixed June 2026)

**Symptom:** `fetch_expired_horizons()` ran at 23:00 UTC but Twelve Data
didn't have EOD prices ready — US market closes at ~21:00 UTC and EOD
data can take 1-2 hours to propagate.

**Original schedule:** `0 23 * * 1-5` (Mon–Fri at 23:00 UTC)  
**Problem:** Only 2 hours after market close — sometimes too early for EOD data.

**Fix:** Move to 02:00 UTC (5 hours after close) and adjust days:
```sql
select cron.alter_job(job_id := 1, schedule := '0 2 * * 2-6');
```

**Why Tue–Sat (2-6) and not Mon–Fri (1-5):**  
02:00 UTC is technically the **next calendar day** after the market close.
Monday's close (21:00 UTC Mon) → cron fires at 02:00 UTC **Tuesday**.
Therefore the schedule must be Tue–Sat to cover Mon–Fri closes.

---

## 9. Verification queries

Run these in Supabase SQL Editor to verify the system is healthy.

### Check all cron jobs are active
```sql
select jobid, jobname, schedule, active
from cron.job
order by jobid;
-- Expected: jobs 1, 2, 6 all active=true
-- Job 1: 0 2 * * 2-6
-- Job 2: 0 10 * * 6
-- Job 6: 0 23 * * 0
```

### Check recent cron execution history
```sql
select jobid, status, return_message,
       start_time, end_time,
       extract(epoch from (end_time - start_time)) as duration_sec
from cron.job_run_details
order by start_time desc
limit 10;
-- Job 1 should take ~64s when processing 8 tickers
-- Job 1 taking <1s means no expired rows were found (normal if all awaiting)
-- Any status != 'succeeded' needs investigation
```

### Check for pending expired horizons (should be 0)
```sql
select
  b.id as batch_id,
  r.value->>'ticker'     as ticker,
  r.value->>'horizon'    as horizon,
  r.value->>'targetDate' as target_date
from batches b,
     jsonb_array_elements(b.results) as r(value)
where r.value->>'verdict' = 'awaiting'
  and to_date(r.value->>'targetDate', 'DD Mon YYYY') <= current_date
order by b.id, r.value->>'ticker';
-- Should return 0 rows if cron ran correctly
```

### Verify hit rates match formula
```sql
with counts as (
  select
    b.id, b.date, b.hit_rate, b.hit_rate_ext,
    count(*) filter (where r->>'verdict' = 'hit')      as hits,
    count(*) filter (where r->>'verdict' = 'exceeded') as exceeded,
    count(*) filter (where r->>'verdict' != 'awaiting') as evaluated
  from batches b,
    jsonb_array_elements(results) as r
  group by b.id, b.date, b.hit_rate, b.hit_rate_ext
)
select
  id, date,
  hit_rate                                                        as stored_pure,
  round(hits::numeric / nullif(evaluated,0) * 100)               as calc_pure,
  hit_rate_ext                                                    as stored_ext,
  round((hits+exceeded)::numeric / nullif(evaluated,0) * 100)    as calc_ext,
  case when hit_rate = round(hits::numeric / nullif(evaluated,0) * 100)
       and hit_rate_ext = round((hits+exceeded)::numeric / nullif(evaluated,0) * 100)
    then '✓ OK' else '✗ MISMATCH' end                           as check
from counts
order by date desc;
```

### Check price_cache for a specific date
```sql
select ticker, target_date, close_price
from price_cache
where target_date = '2026-06-05'  -- replace with target date
order by ticker;
```

### Verify backup function includes fundamentals_cache
```sql
select prosrc like '%fundamentals_cache%' as includes_fundamentals
from pg_proc
where proname = 'backup_to_github';
-- Should return true
```

### Check fetch_expired_horizons uses v_ prefix (Bug #3 prevention)
```sql
select prosrc like '%v_ticker%' as uses_v_prefix
from pg_proc
where proname = 'fetch_expired_horizons';
-- Should return true
-- If false → the function has the variable collision bug
```

### Full batch status overview
```sql
select
  id, date, stocks, direction,
  hit_rate, hit_rate_ext,
  (select count(*) filter (where r->>'verdict' = 'awaiting')
   from jsonb_array_elements(results) r) as awaiting,
  (select count(*) filter (where r->>'verdict' != 'awaiting')
   from jsonb_array_elements(results) r) as evaluated,
  updated_at
from batches
order by date desc;
```

