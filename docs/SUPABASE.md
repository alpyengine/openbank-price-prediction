# Supabase Architecture — Complete Reference

**Project:** Openbank Price Prediction
**Supabase project:** `yyenwzljojxbqtzcbchk`
**Version:** v7.0.4+

This document describes every table, function, cron job, and configuration
created in Supabase for this project. Use it as a reference when debugging,
migrating to a new Supabase project, or onboarding a new developer.

---

## Table of contents

1. [Tables](#1-tables)
2. [Functions](#2-functions)
3. [Cron jobs](#3-cron-jobs)
4. [Vault secrets](#4-vault-secrets)
5. [Row Level Security](#5-row-level-security)
6. [Known issues & fixes](#6-known-issues--fixes)

---

## 1. Tables

### `batches`

Stores saved prediction batches. Each batch represents a set of Openbank
stock forecasts evaluated at a specific base date.

```sql
-- Created automatically by the app via Supabase client
-- Schema inferred from usage:
create table public.batches (
  id          text        primary key,  -- YYYY-MM-DD from base date
  date        text        not null,     -- DD/MM/YYYY display format
  saved_at    timestamptz not null default now(),
  updated_at  timestamptz,
  results     jsonb       not null,     -- array of prediction results
  stocks      integer,                  -- number of tickers
  market_data jsonb,                    -- SPY/ETF benchmark data
  notes       jsonb                     -- per-ticker notes
);
```

**`results` array item shape:**
```json
{
  "ticker":      "TER.US",
  "company":     "Teradyne",
  "horizon":     "1M",
  "verdict":     "awaiting",
  "basePrice":   299.40,
  "targetPrice": 353.92,
  "targetDate":  "17 Apr 2026",
  "priceOnDate": null
}
```

**Important:** `targetDate` must always use 3-letter month abbreviations
(`Sep` not `Sept`). The `formatDate()` function in `dates.js` guarantees
this — never use `toLocaleDateString()` for dates stored in Supabase.

---

### `price_cache`

Caches historical closing prices fetched from Twelve Data for expired
horizon dates. Avoids duplicate API calls when the same ticker+date
is needed multiple times.

```sql
create table public.price_cache (
  id           bigserial   primary key,
  ticker       text        not null,
  target_date  date        not null,
  close_price  numeric     not null,
  fetched_at   timestamptz not null default now(),
  unique(ticker, target_date)
);
```

---

### `weekly_prices`

Stores weekly closing prices (Friday close) for each ticker in each batch.
Used by the `PriceChart` component to draw the price evolution chart.

One row per ticker × batch × week. Week 0 = base price (from batch, not fetched).
Week 1 = first Friday after base date, Week 2 = second Friday, etc.

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

**Week date calculation:**
```
week_friday = date_trunc('week', base_date + (week_num * 7 days))::date + 4
```
This always lands on a Friday regardless of the base date day of week.

---

### `profiles`

User profiles linked to Supabase Auth. Created automatically by trigger
when a new user signs up.

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

### `fetch_expired_horizons()`

**Cron:** Job 1 — weekdays at 23:00 UTC
**Purpose:** Evaluates prediction results for horizons that have expired.

For each `results` row where `verdict = 'awaiting'` and `targetDate <= today`:
1. Checks `price_cache` for existing price
2. If not cached: calls Twelve Data `/eod` API
3. Saves price to `price_cache`
4. Calculates verdict (hit/close/miss) using direction-aware logic
5. Updates `batches.results` with new verdict and `priceOnDate`

**Rate limit:** `pg_sleep(8)` between API calls — safe for Twelve Data free plan.

```sql
create or replace function fetch_expired_horizons()
returns void language plpgsql security definer as $$
-- See current implementation in Supabase SQL Editor
$$;
```

**Verdict logic:**
- Bullish (target > base): HIT if price >= target, CLOSE if within 5%, MISS otherwise
- Bearish (target < base): HIT if price <= target, CLOSE if within 5%, MISS otherwise
- Neutral: HIT if within 5%, MISS otherwise

---

### `fetch_weekly_prices()`

**Cron:** Job 2 — Saturdays at 10:00 UTC
**Purpose:** Fetches the most recent Friday closing price for all active tickers.

For each ticker in each batch:
1. Calculates current week number from base date
2. Checks if week already exists in `weekly_prices`
3. If not: calls Twelve Data `/eod` API for last Friday
4. Saves to `weekly_prices`

**Rate limit:** `pg_sleep(8)` between calls.

**Note:** Runs weekly so it only fetches one week at a time. Historical
weeks are populated by `backfill_weekly_prices()`.

```sql
create or replace function fetch_weekly_prices()
returns void language plpgsql security definer as $$
-- See current implementation in Supabase SQL Editor
$$;
```

---

### `backfill_weekly_prices()`

**Cron:** Job 5 — every 2 minutes (temporary, while backfill is incomplete)
**Purpose:** Populates historical weekly prices for batches that were saved
after the weekly prices system was implemented.

Processes **1 record per execution** — respects Twelve Data rate limit
(8 req/min on free plan). The 2-minute cron interval acts as the pause.

Self-terminating: when all missing weeks are filled, the function returns
immediately and the cron job can be unscheduled.

```sql
-- To check if backfill is complete:
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
      where wp.ticker = r.value->>'ticker'
        and wp.batch_id = b.id
        and wp.week = w.week_num
    )
) x;
-- When this returns 0, unschedule job 5:
-- select cron.unschedule('backfill-weekly-prices');
```

---

### `handle_new_user()`

**Trigger:** fires after INSERT on `auth.users`
**Purpose:** Auto-creates a `profiles` row for every new user.

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

### `get_my_role()`

**Purpose:** Returns the current user's role from `profiles`.
Used by RLS policies to avoid recursive queries.

```sql
create or replace function public.get_my_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;
```

**Why this exists:** The naive RLS approach queries `profiles` inside a
`profiles` policy — a recursive query that returns 0 rows silently,
causing role to always appear as `readonly`. `get_my_role()` with
`security definer` breaks the recursion.

---

## 3. Cron jobs

All cron jobs are managed by `pg_cron` (built into Supabase).

| Job ID | Name | Schedule | Function | Purpose |
|---|---|---|---|---|
| 1 | `fetch-expired-horizons-daily` | `0 23 * * 1-5` | `fetch_expired_horizons()` | Evaluate expired predictions Mon-Fri at 23:00 UTC |
| 2 | `fetch-weekly-prices-saturday` | `0 10 * * 6` | `fetch_weekly_prices()` | Save weekly close prices every Saturday at 10:00 UTC |
| 5 | `backfill-weekly-prices` | `*/2 * * * *` | `backfill_weekly_prices()` | Fill historical weeks (temporary — unschedule when complete) |

**Management commands:**
```sql
-- View all jobs
select jobid, schedule, command, active from cron.job order by jobid;

-- View recent execution history
select jobid, status, return_message, start_time, end_time
from cron.job_run_details
order by start_time desc
limit 20;

-- Unschedule backfill when complete
select cron.unschedule('backfill-weekly-prices');

-- Check if backfill job is still active
select jobid, active from cron.job where jobid = 5;
```

---

## 4. Vault secrets

Sensitive API keys are stored in Supabase Vault (encrypted at rest).

| Secret name | Value | Used by |
|---|---|---|
| `twelve_data_key` | Twelve Data API key | All price-fetching functions |

**To update a vault secret:**
```sql
select vault.update_secret(id, 'new_value')
from vault.secrets
where name = 'secret_name';
```

**To verify current value:**
```sql
select name, decrypted_secret
from vault.decrypted_secrets
where name = 'twelve_data_key';
```

**Known issue:** The vault secret had a spurious `T` prefix (`T5a34f4...`)
which caused API calls to fail silently. Fixed in May 2026 using
`vault.update_secret()`. Always verify the secret value if API calls
stop working unexpectedly.

---

## 5. Row Level Security

All tables have RLS enabled. Access is controlled by user role.

### `profiles` policies

```sql
-- Any authenticated user can read their own profile
create policy "read own profile" on public.profiles for select
  using (auth.uid() = id);

-- Admin can read all profiles (for Manage Users page)
create policy "admin reads all profiles" on public.profiles for select
  using (auth.uid() = id or public.get_my_role() = 'admin');

-- Any user can update their own profile (display name)
create policy "users can update own profile" on public.profiles for update
  using (auth.uid() = id);

-- Admin can update any profile (role changes)
create policy "admin can update any profile" on public.profiles for update
  using (public.get_my_role() = 'admin');
```

### `batches` policies

```sql
-- All authenticated users can read batches
create policy "authenticated users can read batches"
  on public.batches for select using (auth.role() = 'authenticated');

-- Only admin can write batches
create policy "admin can insert batches" on public.batches for insert
  with check (public.get_my_role() = 'admin');
create policy "admin can update batches" on public.batches for update
  using (public.get_my_role() = 'admin');
create policy "admin can delete batches" on public.batches for delete
  using (public.get_my_role() = 'admin');
```

### `weekly_prices` policies

```sql
-- All authenticated users can read (for PriceChart)
create policy "authenticated users can read weekly prices"
  on public.weekly_prices for select using (auth.role() = 'authenticated');

-- Write access via security definer functions only (cron jobs)
```

---

## 6. Known issues & fixes

### Issue 1 — `Sept` vs `Sep` in targetDate (critical)

**Symptom:** `fetch_expired_horizons()` silently fails for September predictions.
`to_date('15 Sept 2026', 'DD Mon YYYY')` throws `ERROR 22007`.

**Cause:** `toLocaleDateString('en-GB', { month: 'short' })` on macOS returns
`Sept` instead of `Sep` for September. This was stored in `batches.results`.

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
a fixed `MONTHS` array instead of `toLocaleDateString()`. Applied in v7.0.4.

---

### Issue 2 — Vault API key with spurious `T` prefix

**Symptom:** `backfill_weekly_prices()` generates URLs like
`apikey=T5a34f4a233824fa69ea731e20caff452` — API calls return no data.

**Cause:** The secret was saved with a `T` character at the start.

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

### Issue 3 — `backfill_weekly_prices` not inserting despite `succeeded`

**Symptom:** Cron shows `succeeded, 1 row` but `weekly_prices` count does not increase.

**Causes identified:**
1. `select into rec` without named fields → `rec.ticker` not defined → silent error
2. API key had `T` prefix → Twelve Data returned no price → `close_price` was null
3. `pg_sleep()` inside loop consumed the full 2-minute cron interval → only 1 real call

**Fix:** Rewrote function using explicit variables (`v_ticker`, `v_batch_id`, etc.)
instead of a record. Processes 1 record per execution — cron interval is the pause.

---

### Issue 4 — `fetch_weekly_prices` timeout on Saturdays

**Symptom:** Saturday cron times out before processing all tickers.

**Cause:** With 40+ tickers × `pg_sleep(8)` = 320+ seconds > 2-minute cron timeout.

**Current behavior:** The function processes as many tickers as it can within
the timeout, then stops. Remaining tickers are picked up next Saturday.
For batches with many tickers, it may take 2-3 Saturdays to complete.

**Mitigation:** `backfill_weekly_prices` fills gaps between Saturdays.
