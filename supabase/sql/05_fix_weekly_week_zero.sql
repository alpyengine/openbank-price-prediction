-- ===========================================================================
-- 05_fix_weekly_week_zero.sql  (v7.22.8)
-- ---------------------------------------------------------------------------
-- Fix: batches created less than 7 days before the current weekly Friday
-- were silently skipped by the weekly price pipeline.
--
-- ROOT CAUSE: both functions compute
--   v_week := (friday - base_date) / 7      -- integer division
-- and then required `v_week between 1 and 52`. For a batch created 1-6 days
-- before the Friday being processed, (friday - base_date) is 1-6, and integer
-- division by 7 truncates to 0 — so `v_week=0` never satisfied the `>= 1`
-- bound and the ticker/row was skipped, with no error anywhere.
--
-- IMPACT (discovered 2026-07-14, monthly check): batch `2026-07-06_US_bullish`
-- (created 2026-07-07, 3 days before Friday 2026-07-10) — 20 tickers affected:
--   - 15 tickers already tracked in older batches: fetch succeeded (their old
--     batches had valid v_week), but the row for THIS new batch was silently
--     dropped in save_weekly_price's per-batch fan-out loop.
--   - 5 brand-new tickers with no older batch (FFIV, JBHT, ALGN, MOH, POOL):
--     get_pending_weekly_tickers never even considered them pending, so they
--     got zero fetch attempts.
-- Fixed live by re-running both functions and re-triggering the weekly Edge
-- Function (net.http_post) until pending=0; all 20 rows recovered from real
-- fetches (Twelve Data), no manual/guessed backfill needed. This migration
-- captures the fix in the repo.
-- ===========================================================================

-- 1) get_pending_weekly_tickers — admit week 0 as a valid pending week
CREATE OR REPLACE FUNCTION public.get_pending_weekly_tickers(p_limit integer DEFAULT 7)
 RETURNS TABLE(ticker text)
 LANGUAGE sql
 STABLE
AS $function$
  select distinct r.value->>'ticker'
  from batches b, jsonb_array_elements(b.results) as r(value)
  where r.value->>'horizon' = '1M'
    and (current_weekly_friday() - make_date(
          split_part(b.date,'/',3)::int,
          split_part(b.date,'/',2)::int,
          split_part(b.date,'/',1)::int)) / 7 between 0 and 52  -- v7.22.8: was 1..52
    and not exists (
      select 1 from weekly_prices wp
      where wp.ticker   = r.value->>'ticker'
        and wp.batch_id = b.id
        and wp.week     = (current_weekly_friday() - make_date(
              split_part(b.date,'/',3)::int,
              split_part(b.date,'/',2)::int,
              split_part(b.date,'/',1)::int)) / 7)
  order by 1
  limit p_limit;
$function$;

-- 2) save_weekly_price — admit week 0 as a valid fan-out target
CREATE OR REPLACE FUNCTION public.save_weekly_price(p_ticker text, p_close numeric)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
  friday date := current_weekly_friday();
  rec record; v_week int; base_date date; v_inserted int := 0;
begin
  if p_close is null or p_close <= 0 then return 0; end if;
  for rec in
    select distinct b.id as batch_id, b.date as batch_date
    from batches b, jsonb_array_elements(b.results) as r(value)
    where r.value->>'ticker' = p_ticker and r.value->>'horizon' = '1M'
  loop
    base_date := make_date(
      split_part(rec.batch_date,'/',3)::int,
      split_part(rec.batch_date,'/',2)::int,
      split_part(rec.batch_date,'/',1)::int);
    v_week := (friday - base_date) / 7;
    if v_week between 0 and 52  -- v7.22.8: was 1..52 — a batch <7 days old truncated to week 0 and was skipped
       and not exists (select 1 from weekly_prices wp
         where wp.ticker = p_ticker and wp.batch_id = rec.batch_id and wp.week = v_week)
    then
      insert into weekly_prices(ticker, batch_id, week, week_date, close_price)
      values (p_ticker, rec.batch_id, v_week, friday, p_close)
      on conflict (ticker, batch_id, week) do nothing;
      v_inserted := v_inserted + 1;
    end if;
  end loop;
  insert into fetch_log(run_date, function, ticker, status, detail)
  values (current_date, 'fetch_weekly_prices_edge', p_ticker, 'inserted',
    format('rows=%s price=%s friday=%s', v_inserted, p_close, friday));
  return v_inserted;
end; $function$;
