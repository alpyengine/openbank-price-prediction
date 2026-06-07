-- =============================================================================
-- OPENBANK PRICE PREDICTION — SUPABASE COMPLETE SETUP
-- =============================================================================
-- Project : Openbank Price Prediction
-- Supabase : yyenwzljojxbqtzcbchk
-- Version  : v7.4.10
-- Updated  : June 2026
--
-- PURPOSE:
--   Run this file once in the Supabase SQL Editor to create the entire
--   project from scratch: tables, indexes, RLS policies, functions, and
--   cron jobs. Safe to re-run — all statements use CREATE IF NOT EXISTS
--   or CREATE OR REPLACE.
--
-- PREREQUISITES:
--   1. Enable pg_cron extension in Supabase Dashboard → Database → Extensions
--   2. Enable http extension in Supabase Dashboard → Database → Extensions
--   3. Enable pg_net extension (for http_get)
--   4. Add secrets to Vault (Dashboard → Vault):
--        - twelve_data_key  : your Twelve Data API key
--        - github_pat       : your GitHub Personal Access Token
--   5. Create the Edge Function 'invite-user' separately (see docs/AUTH.md)
--
-- EXECUTION ORDER:
--   1. Extensions (manual — see prerequisites)
--   2. Tables
--   3. Indexes
--   4. Row Level Security
--   5. Functions
--   6. Cron jobs
-- =============================================================================


-- =============================================================================
-- SECTION 1 — TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- batches
-- Stores saved prediction batches. Each batch = one Openbank AI CSV import.
-- -----------------------------------------------------------------------------
create table if not exists public.batches (
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

-- results jsonb structure (one object per ticker × horizon):
-- {
--   "ticker":      "MU",
--   "company":     "Micron Technology",
--   "currency":    "USD",            ← added v7.4.7 (EUR for .DE tickers)
--   "horizon":     "1M",
--   "verdict":     "awaiting",       ← awaiting | hit | exceeded | close | miss | wrong_way
--   "basePrice":   82.50,
--   "targetPrice": 90.00,
--   "targetDate":  "19 Apr 2026",    ← "DD Mon YYYY" format
--   "priceOnDate": null,             ← filled by fetch_expired_horizons()
--   "note":        ""                ← only on 1M rows
-- }


-- -----------------------------------------------------------------------------
-- price_cache
-- Historical EOD prices cached after horizon evaluation.
-- Populated by fetch_expired_horizons() to avoid re-fetching.
-- -----------------------------------------------------------------------------
create table if not exists public.price_cache (
  ticker       text        not null,
  target_date  date        not null,
  close_price  numeric     not null,
  fetched_at   timestamptz default now(),
  source       text        default 'twelve_data',  -- 'twelve_data' | 'yahoo'
  primary key (ticker, target_date)
);


-- -----------------------------------------------------------------------------
-- weekly_prices
-- Weekly closing prices for sparkline charts in WatchlistPage.
-- Populated by fetch_weekly_prices() every Saturday.
-- -----------------------------------------------------------------------------
create table if not exists public.weekly_prices (
  ticker       text    not null,
  batch_id     text    not null references public.batches(id) on delete cascade,
  week         integer not null,   -- week number from base date (1 = first full week)
  week_date    date,               -- Friday date of the week
  close_price  numeric not null,
  primary key (ticker, batch_id, week)
);

create index if not exists idx_weekly_prices_lookup
  on public.weekly_prices(ticker, batch_id);


-- -----------------------------------------------------------------------------
-- profiles
-- User profile metadata: role (admin | readonly).
-- Created automatically on user sign-up via trigger.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  email      text,
  role       text not null default 'readonly',   -- 'admin' | 'readonly'
  created_at timestamptz default now()
);


-- -----------------------------------------------------------------------------
-- fundamentals_cache
-- Per-ticker fundamentals data from Finnhub + FMP APIs.
-- Cached to avoid repeated API calls.
-- -----------------------------------------------------------------------------
create table if not exists public.fundamentals_cache (
  ticker         text        primary key,
  sector         text,
  industry       text,
  market_cap     numeric,
  beta           numeric,
  peg_ttm        numeric,
  net_margin_ttm numeric,
  forward_pe     numeric,
  fetched_at     timestamptz default now()
);


-- -----------------------------------------------------------------------------
-- watchlist
-- Per-user starred tickers. One row per user × ticker.
-- -----------------------------------------------------------------------------
create table if not exists public.watchlist (
  user_id   uuid references auth.users on delete cascade,
  ticker    text        not null,
  added_at  timestamptz default now(),
  primary key (user_id, ticker)
);


-- -----------------------------------------------------------------------------
-- alert_config
-- Per-user price alert preferences.
-- -----------------------------------------------------------------------------
create table if not exists public.alert_config (
  user_id     uuid references auth.users on delete cascade primary key,
  enabled     boolean not null default true,
  email       text,
  browser     boolean not null default true,
  on_exceeded boolean not null default true,
  on_hit      boolean not null default true,
  on_close    boolean not null default false,
  on_stop     boolean not null default true,
  stop_pct    numeric not null default 10,     -- % drop below base to trigger stop loss
  cooldown_h  integer not null default 24,     -- hours between repeat alerts
  updated_at  timestamptz default now()
);


-- -----------------------------------------------------------------------------
-- alert_log
-- Log of sent price alerts — used to enforce cooldown between repeat alerts.
-- -----------------------------------------------------------------------------
create table if not exists public.alert_log (
  id         bigserial primary key,
  user_id    uuid references auth.users on delete cascade,
  ticker     text        not null,
  batch_id   text        not null,
  horizon    text        not null,
  verdict    text        not null,             -- alertType: exceeded | hit | close | stop_loss
  price      numeric,
  target     numeric,
  sent_at    timestamptz default now()
);


-- =============================================================================
-- SECTION 2 — ROW LEVEL SECURITY
-- =============================================================================

alter table public.batches           enable row level security;
alter table public.price_cache       enable row level security;
alter table public.weekly_prices     enable row level security;
alter table public.profiles          enable row level security;
alter table public.fundamentals_cache enable row level security;
alter table public.watchlist         enable row level security;
alter table public.alert_config      enable row level security;
alter table public.alert_log         enable row level security;

-- batches — all authenticated users can read; write via security definer functions
drop policy if exists "batches_read" on public.batches;
create policy "batches_read" on public.batches
  for select using (auth.role() = 'authenticated');

drop policy if exists "batches_write" on public.batches;
create policy "batches_write" on public.batches
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- price_cache — read by authenticated users; write via security definer functions
drop policy if exists "price_cache_read" on public.price_cache;
create policy "price_cache_read" on public.price_cache
  for select using (auth.role() = 'authenticated');

-- weekly_prices — read by authenticated users; write via security definer functions
drop policy if exists "weekly_prices_read" on public.weekly_prices;
create policy "weekly_prices_read" on public.weekly_prices
  for select using (auth.role() = 'authenticated');

-- profiles — each user can only see and edit their own profile
drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id)
  with check (auth.uid() = id);

-- fundamentals_cache — read by all authenticated users
drop policy if exists "fundamentals_read" on public.fundamentals_cache;
create policy "fundamentals_read" on public.fundamentals_cache
  for select using (auth.role() = 'authenticated');

drop policy if exists "fundamentals_write" on public.fundamentals_cache;
create policy "fundamentals_write" on public.fundamentals_cache
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- watchlist — each user can only see and modify their own entries
drop policy if exists "watchlist_select" on public.watchlist;
create policy "watchlist_select" on public.watchlist
  for select using (auth.uid() = user_id);

drop policy if exists "watchlist_insert" on public.watchlist;
create policy "watchlist_insert" on public.watchlist
  for insert with check (auth.uid() = user_id);

drop policy if exists "watchlist_delete" on public.watchlist;
create policy "watchlist_delete" on public.watchlist
  for delete using (auth.uid() = user_id);

-- alert_config — each user owns their own config
drop policy if exists "alert_config_own" on public.alert_config;
create policy "alert_config_own" on public.alert_config
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- alert_log — each user owns their own log
drop policy if exists "alert_log_own" on public.alert_log;
create policy "alert_log_own" on public.alert_log
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- =============================================================================
-- SECTION 3 — TRIGGER: auto-create profile on sign-up
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'readonly')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================================================
-- SECTION 4 — FUNCTION: fetch_expired_horizons()
-- =============================================================================
-- Runs daily (Tue–Sat 02:00 UTC) via pg_cron Job 1.
-- Evaluates all awaiting predictions whose targetDate has passed.
-- Fetches closing price on targetDate:
--   - EU tickers (.DE, .AS, .PA, .L, .MC) → Yahoo Finance
--   - US tickers → Twelve Data
-- Updates verdict and priceOnDate in batches.results.
-- Recalculates hit_rate and hit_rate_ext for all affected batches.
-- =============================================================================

create or replace function public.fetch_expired_horizons()
returns void
language plpgsql
security definer
as $$
declare
  v_api_key      text;
  rec            record;
  v_url          text;
  v_response     varchar;
  v_close_price  numeric;
  v_new_verdict  text;
  v_signed_dist  numeric;
  v_dist_abs     numeric;
  v_h_margin     numeric;
  v_r_ratio      numeric;
  v_close_thresh numeric;
  v_is_eu        boolean;
  v_period1      bigint;
  v_period2      bigint;
begin
  select decrypted_secret into v_api_key
  from vault.decrypted_secrets
  where name = 'twelve_data_key';
  if v_api_key is null then return; end if;

  for rec in
    select
      b.id      as batch_id,
      r.value   as result_row
    from batches b,
         jsonb_array_elements(b.results) as r(value)
    where r.value->>'verdict' = 'awaiting'
      and (r.value->>'targetDate') is not null
      and to_date(r.value->>'targetDate', 'DD Mon YYYY') <= current_date
  loop
    declare
      v_ticker       text    := rec.result_row->>'ticker';
      v_target_date  date    := to_date(rec.result_row->>'targetDate', 'DD Mon YYYY');
      v_target_price numeric := (rec.result_row->>'targetPrice')::numeric;
      v_base_price   numeric := (rec.result_row->>'basePrice')::numeric;
      v_horizon      text    := rec.result_row->>'horizon';
      v_cached_price numeric;
    begin
      -- Hit margin and close ratio per horizon
      case v_horizon
        when '1M'  then v_h_margin := 3;  v_r_ratio := 2.0;
        when '3M'  then v_h_margin := 5;  v_r_ratio := 2.0;
        when '6M'  then v_h_margin := 7;  v_r_ratio := 1.8;
        when '12M' then v_h_margin := 10; v_r_ratio := 1.6;
        else             v_h_margin := 5;  v_r_ratio := 2.0;
      end case;
      v_close_thresh := v_h_margin * v_r_ratio;

      -- Check price_cache first (avoids redundant API calls)
      select pc.close_price into v_cached_price
      from price_cache pc
      where pc.ticker      = v_ticker
        and pc.target_date = v_target_date;

      if v_cached_price is null then

        -- Detect EU ticker by suffix
        v_is_eu := v_ticker ~* '\.(DE|AS|PA|L|MC)$';

        if v_is_eu then
          -- Yahoo Finance for EU tickers — search ±3 day window to find nearest trading day
          v_period1 := extract(epoch from v_target_date - interval '3 days')::bigint;
          v_period2 := extract(epoch from v_target_date + interval '1 day')::bigint;
          v_url := format(
            'https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1d&period1=%s&period2=%s',
            v_ticker, v_period1, v_period2
          );
          select content into v_response from http_get(v_url);
          v_close_price := (
            (v_response::jsonb)
            ->'chart'->'result'->0
            ->'indicators'->'quote'->0
            ->'close'->-1
          )::numeric;
        else
          -- Twelve Data for US tickers
          v_url := format(
            'https://api.twelvedata.com/eod?symbol=%s&date=%s&apikey=%s',
            v_ticker, v_target_date::text, v_api_key
          );
          select content into v_response from http_get(v_url);
          v_close_price := (v_response::jsonb->>'close')::numeric;
        end if;

        if v_close_price is not null and v_close_price > 0 then
          insert into price_cache(ticker, target_date, close_price)
          values (v_ticker, v_target_date, v_close_price)
          on conflict (ticker, target_date) do nothing;
        end if;

      else
        v_close_price := v_cached_price;
      end if;

      -- Evaluate verdict
      if v_close_price is not null and v_close_price > 0 and v_target_price > 0 then
        v_signed_dist := (v_close_price - v_target_price) / v_target_price * 100;
        v_dist_abs    := abs(v_signed_dist);

        if v_target_price > v_base_price then
          -- Bullish target
          v_new_verdict := case
            when v_close_price > v_target_price * (1 + v_h_margin / 100) then 'exceeded'
            when v_dist_abs <= v_h_margin                                  then 'hit'
            when v_signed_dist < 0 and v_dist_abs <= v_close_thresh        then 'close'
            when v_signed_dist < 0 and v_close_price < v_base_price        then 'wrong_way'
            else 'miss'
          end;
        elsif v_target_price < v_base_price then
          -- Bearish target
          v_new_verdict := case
            when v_close_price < v_target_price * (1 - v_h_margin / 100) then 'exceeded'
            when v_dist_abs <= v_h_margin                                  then 'hit'
            when v_signed_dist > 0 and v_dist_abs <= v_close_thresh        then 'close'
            when v_signed_dist > 0 and v_close_price > v_base_price        then 'wrong_way'
            else 'miss'
          end;
        else
          v_new_verdict := case when v_dist_abs <= v_h_margin then 'hit' else 'miss' end;
        end if;

        -- Update verdict and priceOnDate in batches.results
        update batches
        set
          results = (
            select jsonb_agg(
              case
                when elem->>'ticker'     = v_ticker
                 and elem->>'targetDate' = rec.result_row->>'targetDate'
                 and elem->>'horizon'    = v_horizon
                then elem
                  || jsonb_build_object('verdict',     v_new_verdict)
                  || jsonb_build_object('priceOnDate', v_close_price)
                else elem
              end
            )
            from jsonb_array_elements(batches.results) as elem
          ),
          updated_at = now()
        where id = rec.batch_id;
      end if;
    end;
    perform pg_sleep(8);
  end loop;

  -- Recalculate hit_rate and hit_rate_ext for all batches with evaluated predictions
  update batches b
  set
    hit_rate = (
      select case
        when count(*) filter (where r->>'verdict' != 'awaiting') = 0 then null
        else round(
          count(*) filter (where r->>'verdict' = 'hit')::numeric /
          count(*) filter (where r->>'verdict' != 'awaiting') * 100
        )
      end
      from jsonb_array_elements(b.results) as r
    ),
    hit_rate_ext = (
      select case
        when count(*) filter (where r->>'verdict' != 'awaiting') = 0 then null
        else round(
          (count(*) filter (where r->>'verdict' = 'hit') +
           count(*) filter (where r->>'verdict' = 'exceeded'))::numeric /
          count(*) filter (where r->>'verdict' != 'awaiting') * 100
        )
      end
      from jsonb_array_elements(b.results) as r
    ),
    updated_at = now()
  where exists (
    select 1 from jsonb_array_elements(b.results) as r
    where r->>'verdict' != 'awaiting'
  );
end;
$$;


-- =============================================================================
-- SECTION 5 — FUNCTION: fetch_weekly_prices()
-- =============================================================================
-- Runs every Saturday 10:00 UTC via pg_cron Job 2.
-- Fetches the most recent Friday closing price for all active tickers.
-- EU tickers (.DE, .AS, .PA, .L, .MC) → Yahoo Finance weekly chart
-- US tickers → Twelve Data /eod endpoint
-- =============================================================================

create or replace function public.fetch_weekly_prices()
returns void
language plpgsql
security definer
as $$
declare
  v_api_key    text;
  rec          record;
  v_url        text;
  v_response   varchar;
  v_close_price numeric;
  v_week_num   integer;
  v_friday     date;
  v_base_date  date;
  v_clean_ticker text;
  v_is_eu      boolean;
begin
  select decrypted_secret into v_api_key
  from vault.decrypted_secrets
  where name = 'twelve_data_key';
  if v_api_key is null then return; end if;

  -- Last Friday of the current week
  v_friday := date_trunc('week', current_date)::date + 4;
  if v_friday > current_date then
    v_friday := v_friday - 7;
  end if;

  for rec in
    select distinct
      r.value->>'ticker' as ticker,
      b.id               as batch_id,
      b.date             as batch_date
    from batches b,
         jsonb_array_elements(b.results) as r(value)
    where r.value->>'horizon' = '1M'
  loop
    begin
      v_base_date := make_date(
        split_part(rec.batch_date, '/', 3)::int,
        split_part(rec.batch_date, '/', 2)::int,
        split_part(rec.batch_date, '/', 1)::int
      );
      v_week_num := (v_friday - v_base_date) / 7;
      if v_week_num <= 0 or v_week_num > 52 then continue; end if;

      -- Skip if already exists
      if exists (
        select 1 from weekly_prices wp
        where wp.ticker   = rec.ticker
          and wp.batch_id = rec.batch_id
          and wp.week     = v_week_num
      ) then continue; end if;

      -- Detect EU ticker by suffix
      v_is_eu := rec.ticker ~* '\.(DE|AS|PA|L|MC)$';

      if v_is_eu then
        -- Yahoo Finance for EU tickers (Twelve Data /eod does not support European markets)
        v_url := format(
          'https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1wk&range=1wk',
          rec.ticker
        );
        select content into v_response from http_get(v_url);
        v_close_price := (
          (v_response::jsonb)
          ->'chart'->'result'->0
          ->'indicators'->'quote'->0
          ->'close'->-1
        )::numeric;
      else
        -- Twelve Data for US tickers (strip .US suffix if present)
        v_clean_ticker := regexp_replace(rec.ticker, '\.(US)$', '', 'i');
        v_url := format(
          'https://api.twelvedata.com/eod?symbol=%s&date=%s&apikey=%s',
          v_clean_ticker, v_friday::text, v_api_key
        );
        select content into v_response from http_get(v_url);
        v_close_price := (v_response::jsonb->>'close')::numeric;
      end if;

      if v_close_price is not null and v_close_price > 0 then
        insert into weekly_prices(ticker, batch_id, week, week_date, close_price)
        values (rec.ticker, rec.batch_id, v_week_num, v_friday, v_close_price)
        on conflict (ticker, batch_id, week) do nothing;
      end if;

      perform pg_sleep(8);
    exception when others then
      null; -- continue to next ticker on error
    end;
  end loop;
end;
$$;


-- =============================================================================
-- SECTION 6 — FUNCTION: backup_to_github()
-- =============================================================================
-- Runs every Sunday 23:00 UTC via pg_cron Job 6.
-- Exports batches, weekly_prices, price_cache, fundamentals_cache to GitHub.
-- Requires 'github_pat' secret in Vault and VITE_GITHUB_REPO in .env.
-- =============================================================================

create or replace function public.backup_to_github()
returns void
language plpgsql
security definer
as $$
declare
  v_github_pat  text;
  v_repo        text := 'alpyengine/openbank-price-data';
  v_url         text;
  v_payload     jsonb;
  v_content     text;
  v_sha         text;
  v_response    text;
  v_existing    jsonb;
  v_filename    text;
  v_data        jsonb;
begin
  select decrypted_secret into v_github_pat
  from vault.decrypted_secrets
  where name = 'github_pat';
  if v_github_pat is null then return; end if;

  -- Backup batches
  v_filename := 'batches.json';
  select jsonb_agg(row_to_json(b)::jsonb) into v_data from batches b;
  v_content := encode(convert_to(v_data::text, 'UTF8'), 'base64');

  v_url := format('https://api.github.com/repos/%s/contents/%s', v_repo, v_filename);
  select content::jsonb into v_existing
  from http((
    'GET', v_url,
    array[('Authorization', 'token ' || v_github_pat)::http_header,
          ('Accept', 'application/vnd.github.v3+json')::http_header],
    null, null
  )::http_request);
  v_sha := v_existing->>'sha';

  v_payload := jsonb_build_object(
    'message', 'backup: ' || to_char(now(), 'YYYY-MM-DD HH24:MI') || ' UTC',
    'content', v_content
  );
  if v_sha is not null then
    v_payload := v_payload || jsonb_build_object('sha', v_sha);
  end if;

  perform http((
    'PUT', v_url,
    array[('Authorization', 'token ' || v_github_pat)::http_header,
          ('Accept', 'application/vnd.github.v3+json')::http_header,
          ('Content-Type', 'application/json')::http_header],
    'application/json', v_payload::text
  )::http_request);

  -- Backup weekly_prices
  v_filename := 'weekly_prices.json';
  select jsonb_agg(row_to_json(w)::jsonb) into v_data from weekly_prices w;
  v_content := encode(convert_to(v_data::text, 'UTF8'), 'base64');
  v_url := format('https://api.github.com/repos/%s/contents/%s', v_repo, v_filename);
  select content::jsonb into v_existing
  from http((
    'GET', v_url,
    array[('Authorization', 'token ' || v_github_pat)::http_header,
          ('Accept', 'application/vnd.github.v3+json')::http_header],
    null, null
  )::http_request);
  v_sha := v_existing->>'sha';
  v_payload := jsonb_build_object(
    'message', 'backup: ' || to_char(now(), 'YYYY-MM-DD HH24:MI') || ' UTC',
    'content', v_content
  );
  if v_sha is not null then v_payload := v_payload || jsonb_build_object('sha', v_sha); end if;
  perform http((
    'PUT', v_url,
    array[('Authorization', 'token ' || v_github_pat)::http_header,
          ('Accept', 'application/vnd.github.v3+json')::http_header,
          ('Content-Type', 'application/json')::http_header],
    'application/json', v_payload::text
  )::http_request);

  -- Backup price_cache
  v_filename := 'price_cache.json';
  select jsonb_agg(row_to_json(p)::jsonb) into v_data from price_cache p;
  v_content := encode(convert_to(v_data::text, 'UTF8'), 'base64');
  v_url := format('https://api.github.com/repos/%s/contents/%s', v_repo, v_filename);
  select content::jsonb into v_existing
  from http((
    'GET', v_url,
    array[('Authorization', 'token ' || v_github_pat)::http_header,
          ('Accept', 'application/vnd.github.v3+json')::http_header],
    null, null
  )::http_request);
  v_sha := v_existing->>'sha';
  v_payload := jsonb_build_object(
    'message', 'backup: ' || to_char(now(), 'YYYY-MM-DD HH24:MI') || ' UTC',
    'content', v_content
  );
  if v_sha is not null then v_payload := v_payload || jsonb_build_object('sha', v_sha); end if;
  perform http((
    'PUT', v_url,
    array[('Authorization', 'token ' || v_github_pat)::http_header,
          ('Accept', 'application/vnd.github.v3+json')::http_header,
          ('Content-Type', 'application/json')::http_header],
    'application/json', v_payload::text
  )::http_request);

  -- Backup fundamentals_cache
  v_filename := 'fundamentals_cache.json';
  select jsonb_agg(row_to_json(f)::jsonb) into v_data from fundamentals_cache f;
  v_content := encode(convert_to(v_data::text, 'UTF8'), 'base64');
  v_url := format('https://api.github.com/repos/%s/contents/%s', v_repo, v_filename);
  select content::jsonb into v_existing
  from http((
    'GET', v_url,
    array[('Authorization', 'token ' || v_github_pat)::http_header,
          ('Accept', 'application/vnd.github.v3+json')::http_header],
    null, null
  )::http_request);
  v_sha := v_existing->>'sha';
  v_payload := jsonb_build_object(
    'message', 'backup: ' || to_char(now(), 'YYYY-MM-DD HH24:MI') || ' UTC',
    'content', v_content
  );
  if v_sha is not null then v_payload := v_payload || jsonb_build_object('sha', v_sha); end if;
  perform http((
    'PUT', v_url,
    array[('Authorization', 'token ' || v_github_pat)::http_header,
          ('Accept', 'application/vnd.github.v3+json')::http_header,
          ('Content-Type', 'application/json')::http_header],
    'application/json', v_payload::text
  )::http_request);
end;
$$;


-- =============================================================================
-- SECTION 7 — CRON JOBS
-- =============================================================================
-- Requires pg_cron extension enabled in Supabase.
-- Check existing jobs: select jobid, jobname, schedule, active from cron.job;
-- =============================================================================

-- Job 1: fetch_expired_horizons — Tue–Sat 02:00 UTC
select cron.schedule(
  'fetch-expired-horizons-daily',
  '0 2 * * 2-6',
  'select fetch_expired_horizons();'
);

-- Job 2: fetch_weekly_prices — Saturdays 10:00 UTC
select cron.schedule(
  'fetch-weekly-prices-saturday',
  '0 10 * * 6',
  'select fetch_weekly_prices();'
);

-- Job 6: backup_to_github — Sundays 23:00 UTC
select cron.schedule(
  'weekly-github-backup',
  '0 23 * * 0',
  'select backup_to_github();'
);


-- =============================================================================
-- SECTION 8 — VAULT SECRETS (manual setup — cannot be scripted)
-- =============================================================================
-- Add these secrets in Supabase Dashboard → Vault → New secret:
--
--   Name            : twelve_data_key
--   Value           : <your Twelve Data API key>
--   Used by         : fetch_expired_horizons(), fetch_weekly_prices()
--
--   Name            : github_pat
--   Value           : <your GitHub Personal Access Token>
--   Used by         : backup_to_github()
--   Token scopes    : repo (full access to private repo)


-- =============================================================================
-- SECTION 9 — VERIFICATION QUERIES
-- =============================================================================
-- Run these after setup to confirm everything is working:

-- Tables created:
-- select tablename from pg_tables where schemaname = 'public' order by tablename;

-- RLS enabled:
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';

-- Policies created:
-- select tablename, policyname, cmd from pg_policies where schemaname = 'public' order by tablename;

-- Functions created:
-- select proname from pg_proc where proname in (
--   'fetch_expired_horizons', 'fetch_weekly_prices', 'backup_to_github', 'handle_new_user'
-- );

-- Cron jobs scheduled:
-- select jobid, jobname, schedule, active from cron.job order by jobid;

-- EU support confirmed:
-- select proname,
--        prosrc like '%yahoo%'   as has_yahoo,
--        prosrc like '%v_is_eu%' as has_eu_detection
-- from pg_proc
-- where proname in ('fetch_expired_horizons', 'fetch_weekly_prices');
