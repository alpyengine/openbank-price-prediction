-- =============================================================================
-- OPENBANK PRICE PREDICTION — SUPABASE COMPLETE SETUP
-- =============================================================================
-- Project : Openbank Price Prediction
-- Supabase : yyenwzljojxbqtzcbchk
-- Version  : v7.5.2
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
-- SECTION 5 — FUNCTION: fetch_expired_horizons()
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
      case v_horizon
        when '1M'  then v_h_margin := 3;  v_r_ratio := 2.0;
        when '3M'  then v_h_margin := 5;  v_r_ratio := 2.0;
        when '6M'  then v_h_margin := 7;  v_r_ratio := 1.8;
        when '12M' then v_h_margin := 10; v_r_ratio := 1.6;
        else             v_h_margin := 5;  v_r_ratio := 2.0;
      end case;
      v_close_thresh := v_h_margin * v_r_ratio;

      select pc.close_price into v_cached_price
      from price_cache pc
      where pc.ticker      = v_ticker
        and pc.target_date = v_target_date;

      if v_cached_price is null then
        v_is_eu := v_ticker ~* '\.(DE|AS|PA|L|MC)$';
        if v_is_eu then
          v_period1 := extract(epoch from v_target_date - interval '3 days')::bigint;
          v_period2 := extract(epoch from v_target_date + interval '1 day')::bigint;
          v_url := format(
            'https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1d&period1=%s&period2=%s',
            v_ticker, v_period1, v_period2
          );
          select content into v_response from http_get(v_url);
          v_close_price := (
            (v_response::jsonb)->'chart'->'result'->0->'indicators'->'quote'->0->'close'->-1
          )::numeric;
        else
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
      end if;
    end;
    perform pg_sleep(8);
  end loop;

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
-- SECTION 6 — FUNCTION: fetch_weekly_prices()
-- =============================================================================

create or replace function public.fetch_weekly_prices()
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
  v_week_num     integer;
  v_friday       date;
  v_base_date    date;
  v_clean_ticker text;
  v_is_eu        boolean;
begin
  select decrypted_secret into v_api_key
  from vault.decrypted_secrets
  where name = 'twelve_data_key';
  if v_api_key is null then return; end if;

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

      if exists (
        select 1 from weekly_prices wp
        where wp.ticker   = rec.ticker
          and wp.batch_id = rec.batch_id
          and wp.week     = v_week_num
      ) then continue; end if;

      v_is_eu := rec.ticker ~* '\.(DE|AS|PA|L|MC)$';

      if v_is_eu then
        v_url := format(
          'https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1wk&range=1wk',
          rec.ticker
        );
        select content into v_response from http_get(v_url);
        v_close_price := (
          (v_response::jsonb)->'chart'->'result'->0->'indicators'->'quote'->0->'close'->-1
        )::numeric;
      else
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
      null;
    end;
  end loop;
end;
$$;


-- =============================================================================
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
-- SECTION 8 — CRON JOBS
-- =============================================================================

select cron.schedule('fetch-expired-horizons-daily',  '0 2 * * 2-6', 'select fetch_expired_horizons();');
select cron.schedule('fetch-weekly-prices-saturday',  '0 10 * * 6',  'select fetch_weekly_prices();');
select cron.schedule('weekly-github-backup',           '0 23 * * 0',  'select backup_to_github();');


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
