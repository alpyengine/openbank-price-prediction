-- =============================================================================
-- OPENBANK PRICE PREDICTION — SUPABASE COMPLETE SETUP
-- =============================================================================
-- Project : Openbank Price Prediction
-- Supabase : yyenwzljojxbqtzcbchk
-- Version  : v7.5.9
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
--   5. Invite users via Supabase Dashboard → Authentication → Users → Invite user
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
-- -----------------------------------------------------------------------------
create table if not exists public.batches (
  id             text        primary key,
  date           text        not null,
  saved_at       timestamptz not null default now(),
  updated_at     timestamptz,
  results        jsonb       not null,
  stocks         integer,
  hit_rate       integer,
  hit_rate_ext   integer,
  direction      text        not null default 'bullish',
  market_data    jsonb,
  fundamentals   jsonb,
  horizon_status jsonb
);

-- -----------------------------------------------------------------------------
-- price_cache
-- -----------------------------------------------------------------------------
create table if not exists public.price_cache (
  ticker       text        not null,
  target_date  date        not null,
  close_price  numeric     not null,
  fetched_at   timestamptz default now(),
  source       text        default 'twelve_data',
  primary key (ticker, target_date)
);

-- -----------------------------------------------------------------------------
-- weekly_prices
-- -----------------------------------------------------------------------------
create table if not exists public.weekly_prices (
  ticker       text    not null,
  batch_id     text    not null references public.batches(id) on delete cascade,
  week         integer not null,
  week_date    date,
  close_price  numeric not null,
  primary key (ticker, batch_id, week)
);

create index if not exists idx_weekly_prices_lookup
  on public.weekly_prices(ticker, batch_id);

-- -----------------------------------------------------------------------------
-- profiles
-- User profile metadata. Created automatically on sign-up via trigger.
-- Columns match real Supabase structure as of v7.5.2.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  email      text,                                    -- from auth.users on signup
  role       text        not null default 'readonly', -- 'admin' | 'readonly'
  full_name  text,                                    -- display name
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- fundamentals_cache
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
-- -----------------------------------------------------------------------------
create table if not exists public.watchlist (
  user_id   uuid references auth.users on delete cascade,
  ticker    text        not null,
  added_at  timestamptz default now(),
  primary key (user_id, ticker)
);

-- -----------------------------------------------------------------------------
-- alert_config
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
  stop_pct    numeric not null default 10,
  cooldown_h  integer not null default 24,
  updated_at  timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- alert_log
-- -----------------------------------------------------------------------------
create table if not exists public.alert_log (
  id         bigserial primary key,
  user_id    uuid references auth.users on delete cascade,
  ticker     text        not null,
  batch_id   text        not null,
  horizon    text        not null,
  verdict    text        not null,
  price      numeric,
  target     numeric,
  sent_at    timestamptz default now()
);


-- -----------------------------------------------------------------------------
-- fetch_log
-- Persistent log of individual ticker fetch attempts.
-- Written by fetch_weekly_prices() and fetch_weekly_prices_recovery().
-- Not included in GitHub backup (operational data, not business data).
-- -----------------------------------------------------------------------------
create table if not exists public.fetch_log (
  id         bigserial   primary key,
  run_date   date        not null,
  function   text        not null,  -- 'fetch_weekly_prices' | 'fetch_weekly_prices_recovery'
  ticker     text        not null,
  status     text        not null,  -- 'inserted' | 'skipped' | 'failed'
  detail     text,                  -- price inserted, error message, or skip reason
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- fetch_log_summary
-- One row per function execution — inserted/skipped/failed counts + duration.
-- Written at the end of each fetch_weekly_prices* run.
-- -----------------------------------------------------------------------------
create table if not exists public.fetch_log_summary (
  id         bigserial   primary key,
  run_date   date        not null,
  function   text        not null,
  inserted   integer     not null default 0,
  skipped    integer     not null default 0,
  failed     integer     not null default 0,
  duration_s numeric,               -- execution time in seconds
  created_at timestamptz not null default now()
);


-- =============================================================================
-- SECTION 2 — ROW LEVEL SECURITY
-- =============================================================================

alter table public.batches            enable row level security;
alter table public.price_cache        enable row level security;
alter table public.weekly_prices      enable row level security;
alter table public.profiles           enable row level security;
alter table public.fundamentals_cache enable row level security;
alter table public.watchlist          enable row level security;
alter table public.alert_config       enable row level security;
alter table public.alert_log          enable row level security;

-- batches
drop policy if exists "batches_read"  on public.batches;
drop policy if exists "batches_write" on public.batches;
create policy "batches_read"  on public.batches for select using (auth.role() = 'authenticated');
create policy "batches_write" on public.batches for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- price_cache
drop policy if exists "price_cache_read" on public.price_cache;
create policy "price_cache_read" on public.price_cache for select using (auth.role() = 'authenticated');

-- weekly_prices
drop policy if exists "weekly_prices_read" on public.weekly_prices;
create policy "weekly_prices_read" on public.weekly_prices for select using (auth.role() = 'authenticated');

-- profiles — each user reads/updates only their own row
drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id)
  with check (auth.uid() = id);

-- fundamentals_cache
drop policy if exists "fundamentals_read"  on public.fundamentals_cache;
drop policy if exists "fundamentals_write" on public.fundamentals_cache;
create policy "fundamentals_read"  on public.fundamentals_cache for select using (auth.role() = 'authenticated');
create policy "fundamentals_write" on public.fundamentals_cache for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- watchlist
drop policy if exists "watchlist_select" on public.watchlist;
drop policy if exists "watchlist_insert" on public.watchlist;
drop policy if exists "watchlist_delete" on public.watchlist;
create policy "watchlist_select" on public.watchlist for select using (auth.uid() = user_id);
create policy "watchlist_insert" on public.watchlist for insert with check (auth.uid() = user_id);
create policy "watchlist_delete" on public.watchlist for delete using (auth.uid() = user_id);

-- alert_config
drop policy if exists "alert_config_own" on public.alert_config;
create policy "alert_config_own" on public.alert_config
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- alert_log
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
-- SECTION 4 — FUNCTION: get_all_profiles()
-- =============================================================================
-- Reads ALL profiles without RLS restriction (security definer).
-- Used by ManageUsers.jsx to display all users to admin.
-- RLS on profiles only allows reading own profile — this function bypasses
-- that restriction safely by running as the function owner.
-- Only authenticated users can execute it (anon revoked).
-- =============================================================================

create or replace function public.get_all_profiles()
returns table (
  id         uuid,
  email      text,
  full_name  text,
  role       text,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select id, email, full_name, role, created_at
  from public.profiles
  order by created_at asc;
$$;

revoke execute on function public.get_all_profiles() from public, anon;
grant  execute on function public.get_all_profiles() to authenticated;


-- =============================================================================
-- SECTION 4.5 — FUNCTION: notify_fetch_failure()  (v7.6.0)
-- =============================================================================
-- Sends an email alert via EmailJS when any fetch function ends with failures.
-- Called by fetch_expired_horizons / fetch_weekly_prices /
-- fetch_weekly_prices_recovery whenever v_failed > 0.
--
-- EmailJS REST API (api/v1.0/email/send) requires, with "Use Private Key"
-- enabled in the EmailJS dashboard:
--   • user_id     = emailjs_public_key   (vault)
--   • accessToken = emailjs_private_key  (vault)  <-- mandatory in strict mode
-- The recipient is resolved by the template's To Email field set to {{to_email}}.
--
-- The send result is logged to fetch_log under function = 'notify_fetch_failure'
-- (so it never pollutes the caller's failed_tickers aggregation).
-- =============================================================================

create or replace function public.notify_fetch_failure(
  p_function_name  text,
  p_run_date       date,
  p_inserted       integer,
  p_skipped        integer,
  p_failed         integer,
  p_failed_tickers text
)
returns void
language plpgsql
security definer
as $$
declare
  v_service_id  text;
  v_template_id text;
  v_public_key  text;
  v_private_key text;
  v_payload     jsonb;
  v_status      integer;
  v_resp        text;
begin
  select decrypted_secret into v_service_id  from vault.decrypted_secrets where name = 'emailjs_service_id';
  select decrypted_secret into v_template_id from vault.decrypted_secrets where name = 'emailjs_template_id_supabase';
  select decrypted_secret into v_public_key  from vault.decrypted_secrets where name = 'emailjs_public_key';
  select decrypted_secret into v_private_key from vault.decrypted_secrets where name = 'emailjs_private_key';

  if v_service_id is null or v_template_id is null
     or v_public_key is null or v_private_key is null then
    insert into fetch_log(run_date, function, ticker, status, detail)
    values (current_date, 'notify_fetch_failure', 'SYSTEM', 'failed',
      'missing EmailJS secret(s) in vault — email not sent');
    return;
  end if;

  -- Build EmailJS request body. template_params must match the template
  -- variables: function_name, run_date, inserted, failed, failed_tickers,
  -- to_email. (skipped is an input but is not shown in the template.)
  v_payload := jsonb_build_object(
    'service_id',  v_service_id,
    'template_id', v_template_id,
    'user_id',     v_public_key,
    'accessToken', v_private_key,
    'template_params', jsonb_build_object(
      'function_name',  p_function_name,
      'run_date',       p_run_date::text,
      'inserted',       p_inserted,
      'failed',         p_failed,
      'failed_tickers', coalesce(nullif(p_failed_tickers, ''), '—'),
      'to_email',       'alpyengine@gmail.com'
    )
  );

  begin
    select status, content
      into v_status, v_resp
    from http_post(
      'https://api.emailjs.com/api/v1.0/email/send',
      v_payload::text,
      'application/json'
    );

    if v_status = 200 then
      insert into fetch_log(run_date, function, ticker, status, detail)
      values (current_date, 'notify_fetch_failure', p_function_name, 'inserted',
        format('email sent (failed=%s, tickers=%s)', p_failed, p_failed_tickers));
    else
      insert into fetch_log(run_date, function, ticker, status, detail)
      values (current_date, 'notify_fetch_failure', p_function_name, 'failed',
        format('emailjs http %s: %s', v_status, left(coalesce(v_resp, ''), 300)));
    end if;
  exception when others then
    insert into fetch_log(run_date, function, ticker, status, detail)
    values (current_date, 'notify_fetch_failure', p_function_name, 'failed',
      format('exception: %s', sqlerrm));
  end;
end;
$$;


-- =============================================================================
-- SECTION 5 — FUNCTION: fetch_expired_horizons()
-- =============================================================================
-- Evaluates all awaiting predictions whose targetDate has passed.
-- Runs daily Tue–Sat at 02:00 UTC (Job 1).
--
-- Changes vs v7.5.2:
--   • US tickers: now uses time_series endpoint with a 5-day lookback window
--     instead of /eod with exact date — handles weekends and bank holidays.
--   • EU tickers: lookback window extended from 3 to 5 days for same reason.
--   • Both paths pick the closest trading day <= targetDate (never future dates).
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
  v_start_date   date;
  v_best_date    text;
  v_best_diff    integer;
  v_curr_diff    integer;
  v_elem         jsonb;
  v_inserted     integer     := 0;
  v_skipped      integer     := 0;
  v_failed       integer     := 0;
  v_start_ts     timestamptz := clock_timestamp();
begin
  select decrypted_secret into v_api_key
  from vault.decrypted_secrets
  where name = 'twelve_data_key';
  if v_api_key is null then
    insert into fetch_log(run_date, function, ticker, status, detail)
    values (current_date, 'fetch_expired_horizons', 'SYSTEM', 'failed', 'twelve_data_key not found in vault');
    return;
  end if;

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
        v_is_eu := v_ticker ~* '\.(DE|AS|PA|L|MC)$';

        if v_is_eu then
          -- Yahoo Finance — 5-day lookback window before targetDate.
          -- Returns closest trading day <= targetDate (covers weekends + holidays).
          v_period1 := extract(epoch from v_target_date - interval '5 days')::bigint;
          v_period2 := extract(epoch from v_target_date)::bigint;
          v_url := format(
            'https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1d&period1=%s&period2=%s',
            v_ticker, v_period1, v_period2
          );
          select content into v_response from http_get(v_url);
          -- Last element = most recent close <= targetDate
          v_close_price := (
            (v_response::jsonb)
            ->'chart'->'result'->0
            ->'indicators'->'quote'->0
            ->'close'->-1
          )::numeric;

        else
          -- Twelve Data — time_series with 5-day lookback window.
          -- Picks the trading day with smallest diff to targetDate, never future dates.
          v_start_date := v_target_date - 5;
          v_url := format(
            'https://api.twelvedata.com/time_series?symbol=%s&interval=1day&start_date=%s&end_date=%s&outputsize=5&apikey=%s',
            v_ticker, v_start_date::text, v_target_date::text, v_api_key
          );
          select content into v_response from http_get(v_url);

          v_close_price := null;
          v_best_diff   := 999;
          for v_elem in
            select jsonb_array_elements((v_response::jsonb)->'values')
          loop
            v_curr_diff := abs(v_target_date - (v_elem->>'datetime')::date);
            if (v_elem->>'datetime')::date <= v_target_date
               and v_curr_diff < v_best_diff then
              v_best_diff   := v_curr_diff;
              v_close_price := (v_elem->>'close')::numeric;
            end if;
          end loop;
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
          v_new_verdict := case
            when v_close_price > v_target_price * (1 + v_h_margin / 100) then 'exceeded'
            when v_dist_abs <= v_h_margin                                  then 'hit'
            when v_signed_dist < 0 and v_dist_abs <= v_close_thresh        then 'close'
            when v_signed_dist < 0 and v_close_price < v_base_price        then 'wrong_way'
            else 'miss'
          end;
        elsif v_target_price < v_base_price then
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

        insert into fetch_log(run_date, function, ticker, status, detail)
        values (current_date, 'fetch_expired_horizons', v_ticker, 'inserted',
          format('%s %s verdict=%s close=%s target=%s',
            v_horizon, rec.result_row->>'targetDate', v_new_verdict, v_close_price, v_target_price));
        v_inserted := v_inserted + 1;

      elsif v_target_price is null or v_target_price <= 0 then
        insert into fetch_log(run_date, function, ticker, status, detail)
        values (current_date, 'fetch_expired_horizons', v_ticker, 'skipped',
          format('%s %s — invalid targetPrice (%s)',
            v_horizon, rec.result_row->>'targetDate', v_target_price));
        v_skipped := v_skipped + 1;

      else
        insert into fetch_log(run_date, function, ticker, status, detail)
        values (current_date, 'fetch_expired_horizons', v_ticker, 'failed',
          format('%s %s — no close price for target_date=%s',
            v_horizon, rec.result_row->>'targetDate', v_target_date));
        v_failed := v_failed + 1;
      end if;

    exception when others then
      insert into fetch_log(run_date, function, ticker, status, detail)
      values (current_date, 'fetch_expired_horizons', v_ticker, 'failed',
        format('exception: %s', sqlerrm));
      v_failed := v_failed + 1;
    end;
    perform pg_sleep(8);
  end loop;

  -- Recalculate hit rates for all batches with evaluated predictions
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

  -- Email notification when there are failures
  if v_failed > 0 then
    perform notify_fetch_failure(
      'fetch_expired_horizons', current_date,
      v_inserted, v_skipped, v_failed,
      (select string_agg(distinct ticker, ', ') from fetch_log
       where run_date = current_date
         and function = 'fetch_expired_horizons'
         and status = 'failed')
    );
  end if;

  -- Save execution summary
  insert into fetch_log_summary(run_date, function, inserted, skipped, failed, duration_s)
  values (
    current_date, 'fetch_expired_horizons',
    v_inserted, v_skipped, v_failed,
    round(extract(epoch from clock_timestamp() - v_start_ts)::numeric, 1)
  );
end;
$$;


-- SECTION 6 — FUNCTION: fetch_weekly_prices()
-- =============================================================================
-- Fetches the most recent Friday closing price for all active tickers.
-- Runs every Saturday at 10:00 UTC (Job 2).
--
-- Changes vs v7.5.2:
--   • Iterates UNIQUE tickers (~30) instead of all ticker×batch combinations
--     (~200). One API call per ticker, then inserts into all matching batches.
--     Reduces execution time from ~560s (timeout) to ~60s.
--   • Both US and EU paths use a 7-day lookback window — handles Friday holidays.
--   • Persistent logging to fetch_log (per ticker) and fetch_log_summary (run total).
--   • pg_sleep reduced from 8s to 2s (safe with unique-ticker architecture).
-- =============================================================================

create or replace function public.fetch_weekly_prices()
returns void
language plpgsql
security definer
as $$
declare
  api_key      text;
  rec          record;
  url          text;
  response     varchar;
  close_price  numeric;
  friday       date;
  base_date    date;
  is_eu        boolean;
  v_elem       jsonb;
  v_best_diff  integer;
  v_curr_diff  integer;
  v_week_num   integer;
  v_batch_rec  record;
  v_inserted   integer     := 0;
  v_skipped    integer     := 0;
  v_failed     integer     := 0;
  v_start_ts   timestamptz := clock_timestamp();
begin
  select decrypted_secret into api_key
  from vault.decrypted_secrets
  where name = 'twelve_data_key';
  if api_key is null then
    insert into fetch_log(run_date, function, ticker, status, detail)
    values (current_date, 'fetch_weekly_prices', 'SYSTEM', 'failed', 'twelve_data_key not found in vault');
    return;
  end if;

  -- Calculate last Friday (the week's reference date)
  friday := date_trunc('week', current_date)::date + 4;
  if friday > current_date then
    friday := friday - 7;
  end if;

  -- Iterate UNIQUE tickers only — one API call per ticker regardless of batch count
  for rec in
    select distinct r.value->>'ticker' as ticker
    from batches b,
         jsonb_array_elements(b.results) as r(value)
    where r.value->>'horizon' = '1M'
    order by 1
  loop
    begin
      is_eu := rec.ticker ~* '\.(DE|AS|PA|L|MC)$';
      close_price := null;

      if is_eu then
        -- Yahoo Finance — 7-day lookback, pick closest trading day <= friday
        url := format(
          'https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1d&period1=%s&period2=%s',
          rec.ticker,
          extract(epoch from friday - interval '5 days')::bigint,
          extract(epoch from friday + interval '1 day')::bigint
        );
        select content into response from http_get(url);
        declare
          v_timestamps jsonb;
          v_closes     jsonb;
          v_ts         bigint;
          v_dt         date;
          v_best_ts    bigint := 0;
          v_cl         numeric;
          i            integer;
        begin
          v_timestamps := (response::jsonb)->'chart'->'result'->0->'timestamp';
          v_closes     := (response::jsonb)->'chart'->'result'->0->'indicators'->'quote'->0->'close';
          if v_timestamps is not null then
            for i in 0..jsonb_array_length(v_timestamps)-1 loop
              v_ts := (v_timestamps->i)::bigint;
              v_dt := to_timestamp(v_ts)::date;
              v_cl := (v_closes->i)::numeric;
              if v_dt <= friday and v_ts > v_best_ts and v_cl is not null then
                v_best_ts   := v_ts;
                close_price := v_cl;
              end if;
            end loop;
          end if;
        end;

      else
        -- Twelve Data — time_series 7-day window, pick closest day <= friday
        url := format(
          'https://api.twelvedata.com/time_series?symbol=%s&interval=1day&start_date=%s&end_date=%s&outputsize=10&apikey=%s',
          rec.ticker,
          (friday - 7)::text,
          friday::text,
          api_key
        );
        select content into response from http_get(url);
        v_best_diff := 999;
        for v_elem in
          select jsonb_array_elements((response::jsonb)->'values')
        loop
          v_curr_diff := abs(friday - (v_elem->>'datetime')::date);
          if (v_elem->>'datetime')::date <= friday
             and v_curr_diff < v_best_diff then
            v_best_diff := v_curr_diff;
            close_price := (v_elem->>'close')::numeric;
          end if;
        end loop;
      end if;

      if close_price is not null and close_price > 0 then
        -- Insert price into ALL ticker×batch_id combinations at once
        for v_batch_rec in
          select distinct b.id as batch_id, b.date as batch_date
          from batches b,
               jsonb_array_elements(b.results) as r(value)
          where r.value->>'ticker'  = rec.ticker
            and r.value->>'horizon' = '1M'
        loop
          base_date  := make_date(
            split_part(v_batch_rec.batch_date, '/', 3)::int,
            split_part(v_batch_rec.batch_date, '/', 2)::int,
            split_part(v_batch_rec.batch_date, '/', 1)::int
          );
          v_week_num := (friday - base_date) / 7;

          if v_week_num > 0 and v_week_num <= 52
             and not exists (
               select 1 from weekly_prices wp
               where wp.ticker   = rec.ticker
                 and wp.batch_id = v_batch_rec.batch_id
                 and wp.week     = v_week_num
             )
          then
            insert into weekly_prices(ticker, batch_id, week, week_date, close_price)
            values (rec.ticker, v_batch_rec.batch_id, v_week_num, friday, close_price)
            on conflict (ticker, batch_id, week) do nothing;

            insert into fetch_log(run_date, function, ticker, status, detail)
            values (current_date, 'fetch_weekly_prices', rec.ticker, 'inserted',
              format('batch=%s week=%s price=%s friday=%s',
                v_batch_rec.batch_id, v_week_num, close_price, friday));
            v_inserted := v_inserted + 1;
          else
            v_skipped := v_skipped + 1;
          end if;
        end loop;

      else
        insert into fetch_log(run_date, function, ticker, status, detail)
        values (current_date, 'fetch_weekly_prices', rec.ticker, 'failed',
          format('no price obtained — friday=%s url=%s', friday, url));
        v_failed := v_failed + 1;
      end if;

      perform pg_sleep(2);

    exception when others then
      insert into fetch_log(run_date, function, ticker, status, detail)
      values (current_date, 'fetch_weekly_prices', rec.ticker, 'failed',
        format('exception: %s', sqlerrm));
      v_failed := v_failed + 1;
    end;
  end loop;

  -- Email notification when there are failures
  if v_failed > 0 then
    perform notify_fetch_failure(
      'fetch_weekly_prices', current_date,
      v_inserted, v_skipped, v_failed,
      (select string_agg(ticker, ', ') from fetch_log
       where run_date = current_date
         and function = 'fetch_weekly_prices'
         and status = 'failed')
    );
  end if;

  -- Save execution summary
  insert into fetch_log_summary(run_date, function, inserted, skipped, failed, duration_s)
  values (
    current_date, 'fetch_weekly_prices',
    v_inserted, v_skipped, v_failed,
    round(extract(epoch from clock_timestamp() - v_start_ts)::numeric, 1)
  );
end;
$$;


-- =============================================================================
-- SECTION 6b — FUNCTION: fetch_weekly_prices_recovery()
-- =============================================================================
-- Recovery function — retries any tickers that failed or were missed during
-- the Saturday fetch_weekly_prices() run.
-- Runs every Monday at 06:00 UTC (Job 8) — the day after Sunday's backup.
--
-- Logic:
--   1. Finds all unique tickers that are MISSING a weekly_prices row for
--      last Friday (week_date = friday) but SHOULD have one (batch is old enough).
--   2. Re-fetches price using the same API logic as fetch_weekly_prices().
--   3. Inserts recovered rows tagged with 'RECOVERED' in fetch_log detail.
--   4. Writes summary to fetch_log_summary.
-- =============================================================================

create or replace function public.fetch_weekly_prices_recovery()
returns void
language plpgsql
security definer
as $$
declare
  api_key      text;
  rec          record;
  url          text;
  response     varchar;
  close_price  numeric;
  friday       date;
  base_date    date;
  is_eu        boolean;
  v_elem       jsonb;
  v_best_diff  integer;
  v_curr_diff  integer;
  v_week_num   integer;
  v_batch_rec  record;
  v_inserted   integer     := 0;
  v_skipped    integer     := 0;
  v_failed     integer     := 0;
  v_start_ts   timestamptz := clock_timestamp();
begin
  select decrypted_secret into api_key
  from vault.decrypted_secrets
  where name = 'twelve_data_key';
  if api_key is null then
    insert into fetch_log(run_date, function, ticker, status, detail)
    values (current_date, 'fetch_weekly_prices_recovery', 'SYSTEM', 'failed',
      'twelve_data_key not found in vault');
    return;
  end if;

  -- Target: last Friday (the one fetch_weekly_prices should have covered)
  friday := date_trunc('week', current_date)::date + 4 - 7;

  -- Find tickers that are missing a row for last Friday
  for rec in
    select distinct r.value->>'ticker' as ticker
    from batches b,
         jsonb_array_elements(b.results) as r(value)
    where r.value->>'horizon' = '1M'
      and exists (
        select 1
        from batches b2,
             jsonb_array_elements(b2.results) as r2(value)
        where r2.value->>'ticker'  = r.value->>'ticker'
          and r2.value->>'horizon' = '1M'
          and (friday - make_date(
                split_part(b2.date,'/',3)::int,
                split_part(b2.date,'/',2)::int,
                split_part(b2.date,'/',1)::int
               )) / 7 > 0
          and not exists (
            select 1 from weekly_prices wp
            where wp.ticker   = r2.value->>'ticker'
              and wp.batch_id = b2.id
              and wp.week_date = friday
          )
      )
    order by 1
  loop
    begin
      is_eu := rec.ticker ~* '\.(DE|AS|PA|L|MC)$';
      close_price := null;

      if is_eu then
        url := format(
          'https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1d&period1=%s&period2=%s',
          rec.ticker,
          extract(epoch from friday - interval '5 days')::bigint,
          extract(epoch from friday + interval '1 day')::bigint
        );
        select content into response from http_get(url);
        declare
          v_timestamps jsonb;
          v_closes     jsonb;
          v_ts         bigint;
          v_dt         date;
          v_best_ts    bigint := 0;
          v_cl         numeric;
          i            integer;
        begin
          v_timestamps := (response::jsonb)->'chart'->'result'->0->'timestamp';
          v_closes     := (response::jsonb)->'chart'->'result'->0->'indicators'->'quote'->0->'close';
          if v_timestamps is not null then
            for i in 0..jsonb_array_length(v_timestamps)-1 loop
              v_ts := (v_timestamps->i)::bigint;
              v_dt := to_timestamp(v_ts)::date;
              v_cl := (v_closes->i)::numeric;
              if v_dt <= friday and v_ts > v_best_ts and v_cl is not null then
                v_best_ts   := v_ts;
                close_price := v_cl;
              end if;
            end loop;
          end if;
        end;

      else
        url := format(
          'https://api.twelvedata.com/time_series?symbol=%s&interval=1day&start_date=%s&end_date=%s&outputsize=10&apikey=%s',
          rec.ticker,
          (friday - 7)::text,
          friday::text,
          api_key
        );
        select content into response from http_get(url);
        v_best_diff := 999;
        for v_elem in
          select jsonb_array_elements((response::jsonb)->'values')
        loop
          v_curr_diff := abs(friday - (v_elem->>'datetime')::date);
          if (v_elem->>'datetime')::date <= friday
             and v_curr_diff < v_best_diff then
            v_best_diff := v_curr_diff;
            close_price := (v_elem->>'close')::numeric;
          end if;
        end loop;
      end if;

      if close_price is not null and close_price > 0 then
        for v_batch_rec in
          select distinct b.id as batch_id, b.date as batch_date
          from batches b,
               jsonb_array_elements(b.results) as r(value)
          where r.value->>'ticker'  = rec.ticker
            and r.value->>'horizon' = '1M'
        loop
          base_date  := make_date(
            split_part(v_batch_rec.batch_date, '/', 3)::int,
            split_part(v_batch_rec.batch_date, '/', 2)::int,
            split_part(v_batch_rec.batch_date, '/', 1)::int
          );
          v_week_num := (friday - base_date) / 7;

          if v_week_num > 0 and v_week_num <= 52
             and not exists (
               select 1 from weekly_prices wp
               where wp.ticker   = rec.ticker
                 and wp.batch_id = v_batch_rec.batch_id
                 and wp.week     = v_week_num
             )
          then
            insert into weekly_prices(ticker, batch_id, week, week_date, close_price)
            values (rec.ticker, v_batch_rec.batch_id, v_week_num, friday, close_price)
            on conflict (ticker, batch_id, week) do nothing;

            insert into fetch_log(run_date, function, ticker, status, detail)
            values (current_date, 'fetch_weekly_prices_recovery', rec.ticker, 'inserted',
              format('RECOVERED batch=%s week=%s price=%s friday=%s',
                v_batch_rec.batch_id, v_week_num, close_price, friday));
            v_inserted := v_inserted + 1;
          else
            v_skipped := v_skipped + 1;
          end if;
        end loop;

      else
        insert into fetch_log(run_date, function, ticker, status, detail)
        values (current_date, 'fetch_weekly_prices_recovery', rec.ticker, 'failed',
          format('no price obtained — friday=%s', friday));
        v_failed := v_failed + 1;
      end if;

      perform pg_sleep(2);

    exception when others then
      insert into fetch_log(run_date, function, ticker, status, detail)
      values (current_date, 'fetch_weekly_prices_recovery', rec.ticker, 'failed',
        format('exception: %s', sqlerrm));
      v_failed := v_failed + 1;
    end;
  end loop;

  -- Email notification when there are failures
  if v_failed > 0 then
    perform notify_fetch_failure(
      'fetch_weekly_prices_recovery', current_date,
      v_inserted, v_skipped, v_failed,
      (select string_agg(ticker, ', ') from fetch_log
       where run_date = current_date
         and function = 'fetch_weekly_prices_recovery'
         and status = 'failed')
    );
  end if;

  insert into fetch_log_summary(run_date, function, inserted, skipped, failed, duration_s)
  values (
    current_date, 'fetch_weekly_prices_recovery',
    v_inserted, v_skipped, v_failed,
    round(extract(epoch from clock_timestamp() - v_start_ts)::numeric, 1)
  );
end;
$$;


-- SECTION 7 — FUNCTION: backup_to_github()
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
  v_existing    jsonb;
  v_filename    text;
  v_data        jsonb;
begin
  select decrypted_secret into v_github_pat
  from vault.decrypted_secrets
  where name = 'github_pat';
  if v_github_pat is null then return; end if;

  -- Helper: upload one file to GitHub
  -- Repeated for batches, weekly_prices, price_cache, fundamentals_cache

  -- batches
  v_filename := 'batches.json';
  select jsonb_agg(row_to_json(b)::jsonb) into v_data from batches b;
  v_content := encode(convert_to(v_data::text, 'UTF8'), 'base64');
  v_url := format('https://api.github.com/repos/%s/contents/%s', v_repo, v_filename);
  select content::jsonb into v_existing from http((
    'GET', v_url,
    array[('Authorization','token '||v_github_pat)::http_header,('Accept','application/vnd.github.v3+json')::http_header],
    null, null)::http_request);
  v_sha := v_existing->>'sha';
  v_payload := jsonb_build_object('message','backup: '||to_char(now(),'YYYY-MM-DD HH24:MI')||' UTC','content',v_content);
  if v_sha is not null then v_payload := v_payload || jsonb_build_object('sha',v_sha); end if;
  perform http(('PUT',v_url,array[('Authorization','token '||v_github_pat)::http_header,('Accept','application/vnd.github.v3+json')::http_header,('Content-Type','application/json')::http_header],'application/json',v_payload::text)::http_request);

  -- weekly_prices
  v_filename := 'weekly_prices.json';
  select jsonb_agg(row_to_json(w)::jsonb) into v_data from weekly_prices w;
  v_content := encode(convert_to(v_data::text, 'UTF8'), 'base64');
  v_url := format('https://api.github.com/repos/%s/contents/%s', v_repo, v_filename);
  select content::jsonb into v_existing from http(('GET',v_url,array[('Authorization','token '||v_github_pat)::http_header,('Accept','application/vnd.github.v3+json')::http_header],null,null)::http_request);
  v_sha := v_existing->>'sha';
  v_payload := jsonb_build_object('message','backup: '||to_char(now(),'YYYY-MM-DD HH24:MI')||' UTC','content',v_content);
  if v_sha is not null then v_payload := v_payload || jsonb_build_object('sha',v_sha); end if;
  perform http(('PUT',v_url,array[('Authorization','token '||v_github_pat)::http_header,('Accept','application/vnd.github.v3+json')::http_header,('Content-Type','application/json')::http_header],'application/json',v_payload::text)::http_request);

  -- price_cache
  v_filename := 'price_cache.json';
  select jsonb_agg(row_to_json(p)::jsonb) into v_data from price_cache p;
  v_content := encode(convert_to(v_data::text, 'UTF8'), 'base64');
  v_url := format('https://api.github.com/repos/%s/contents/%s', v_repo, v_filename);
  select content::jsonb into v_existing from http(('GET',v_url,array[('Authorization','token '||v_github_pat)::http_header,('Accept','application/vnd.github.v3+json')::http_header],null,null)::http_request);
  v_sha := v_existing->>'sha';
  v_payload := jsonb_build_object('message','backup: '||to_char(now(),'YYYY-MM-DD HH24:MI')||' UTC','content',v_content);
  if v_sha is not null then v_payload := v_payload || jsonb_build_object('sha',v_sha); end if;
  perform http(('PUT',v_url,array[('Authorization','token '||v_github_pat)::http_header,('Accept','application/vnd.github.v3+json')::http_header,('Content-Type','application/json')::http_header],'application/json',v_payload::text)::http_request);

  -- fundamentals_cache
  v_filename := 'fundamentals_cache.json';
  select jsonb_agg(row_to_json(f)::jsonb) into v_data from fundamentals_cache f;
  v_content := encode(convert_to(v_data::text, 'UTF8'), 'base64');
  v_url := format('https://api.github.com/repos/%s/contents/%s', v_repo, v_filename);
  select content::jsonb into v_existing from http(('GET',v_url,array[('Authorization','token '||v_github_pat)::http_header,('Accept','application/vnd.github.v3+json')::http_header],null,null)::http_request);
  v_sha := v_existing->>'sha';
  v_payload := jsonb_build_object('message','backup: '||to_char(now(),'YYYY-MM-DD HH24:MI')||' UTC','content',v_content);
  if v_sha is not null then v_payload := v_payload || jsonb_build_object('sha',v_sha); end if;
  perform http(('PUT',v_url,array[('Authorization','token '||v_github_pat)::http_header,('Accept','application/vnd.github.v3+json')::http_header,('Content-Type','application/json')::http_header],'application/json',v_payload::text)::http_request);
end;
$$;


-- =============================================================================
-- SECTION 7.5 — FUNCTION: check_cron_health()  (v7.6.1)
-- =============================================================================
-- Watchdog. Covers the one gap the v7.6.0 email cannot: a cron that never
-- runs or is cancelled before reaching its notify_fetch_failure() call
-- (e.g. statement timeout). Reads only our own tables — no cron schema access.
-- If any anomaly is found it reuses notify_fetch_failure() (no new EmailJS
-- template needed). Runs Mon + Thu 07:00 UTC (Job 9).
-- =============================================================================

create or replace function public.check_cron_health()
returns void
language plpgsql
security definer
as $$
declare
  v_anomalies    text[]      := array[]::text[];
  v_detail       text;
  v_awaiting     integer;
  v_last_weekly  date;
  v_last_expired date;
  v_n            integer;
  v_start_ts     timestamptz := clock_timestamp();
begin
  -- Check 1: awaiting horizons overdue by more than 3 days
  -- (symptom of fetch_expired_horizons not evaluating)
  select count(*) into v_awaiting
  from batches b,
       jsonb_array_elements(b.results) as r(value)
  where r.value->>'verdict' = 'awaiting'
    and (r.value->>'targetDate') is not null
    and to_date(r.value->>'targetDate', 'DD Mon YYYY') <= current_date - 3;
  if v_awaiting > 0 then
    v_anomalies := v_anomalies || format('%s horizontes awaiting vencidos hace >3d', v_awaiting);
  end if;

  -- Check 2: no weekly/recovery summary in the last 8 days
  -- (Saturday run + Monday recovery both silently failed)
  select max(run_date) into v_last_weekly
  from fetch_log_summary
  where function in ('fetch_weekly_prices', 'fetch_weekly_prices_recovery');
  if v_last_weekly is null or v_last_weekly < current_date - 8 then
    v_anomalies := v_anomalies ||
      format('weekly_prices sin ejecucion desde %s', coalesce(v_last_weekly::text, 'nunca'));
  end if;

  -- Check 3: no expired-horizons summary in the last 3 days
  -- (3-day threshold absorbs the normal Sat->Mon gap)
  select max(run_date) into v_last_expired
  from fetch_log_summary
  where function = 'fetch_expired_horizons';
  if v_last_expired is null or v_last_expired < current_date - 3 then
    v_anomalies := v_anomalies ||
      format('fetch_expired_horizons sin ejecucion desde %s', coalesce(v_last_expired::text, 'nunca'));
  end if;

  v_n := coalesce(array_length(v_anomalies, 1), 0);

  if v_n > 0 then
    v_detail := array_to_string(v_anomalies, ' · ');
    -- Reuse the v7.6.0 alert path (failed_tickers carries the anomaly detail)
    perform notify_fetch_failure(
      'cron_health_check', current_date,
      0, 0, v_n, v_detail
    );
    insert into fetch_log(run_date, function, ticker, status, detail)
    values (current_date, 'check_cron_health', 'WATCHDOG', 'failed', v_detail);
  else
    insert into fetch_log(run_date, function, ticker, status, detail)
    values (current_date, 'check_cron_health', 'WATCHDOG', 'inserted', 'all crons healthy');
  end if;

  insert into fetch_log_summary(run_date, function, inserted, skipped, failed, duration_s)
  values (
    current_date, 'check_cron_health',
    case when v_n = 0 then 1 else 0 end, 0, v_n,
    round(extract(epoch from clock_timestamp() - v_start_ts)::numeric, 1)
  );
end;
$$;


-- =============================================================================
-- SECTION 8 — CRON JOBS
-- =============================================================================

select cron.schedule('fetch-expired-horizons-daily',  '0 2 * * 2-6', 'select fetch_expired_horizons();');
select cron.schedule('fetch-weekly-prices-saturday',  '0 10 * * 6',  'select fetch_weekly_prices();');
select cron.schedule('weekly-github-backup',           '0 23 * * 0',  'select backup_to_github();');
select cron.schedule('recovery-weekly-prices',         '0 6 * * 1',   'select fetch_weekly_prices_recovery();');
select cron.schedule('cron-health-check',              '0 7 * * 1,4', 'select check_cron_health();');
-- Job schedule summary:
--   Job 1 — fetch_expired_horizons()        Tue–Sat 02:00 UTC
--   Job 2 — fetch_weekly_prices()           Sat    10:00 UTC
--   Job 6 — backup_to_github()             Sun    23:00 UTC
--   Job 8 — fetch_weekly_prices_recovery() Mon    06:00 UTC
--   Job 9 — check_cron_health()            Mon+Thu 07:00 UTC  (v7.6.1 watchdog)


-- =============================================================================
-- SECTION 9 — VAULT SECRETS (manual — cannot be scripted)
-- =============================================================================
-- Supabase Dashboard → Vault → New secret:
--   twelve_data_key  → your Twelve Data API key
--   github_pat       → your GitHub Personal Access Token (repo scope)


-- =============================================================================
-- SECTION 10 — VERIFICATION QUERIES
-- =============================================================================
-- select tablename from pg_tables where schemaname = 'public' order by tablename;
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- select tablename, policyname, cmd from pg_policies where schemaname = 'public' order by tablename;
-- select proname from pg_proc where proname in ('fetch_expired_horizons','fetch_weekly_prices','backup_to_github','handle_new_user','get_all_profiles');
-- select jobid, jobname, schedule, active from cron.job order by jobid;
-- select proname, prosecdef from pg_proc where proname = 'get_all_profiles';
