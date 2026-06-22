-- ===========================================================================
-- 04_check_cron_health.sql  (v7.10.3)
-- ---------------------------------------------------------------------------
-- Cron watchdog. Runs as job 9 (`cron-health-check`, Mon & Thu 07:00 UTC) and
-- emails (via notify_fetch_failure) if the backend looks stale.
--
-- v7.10.3 FIX: after the v7.9.0 migration, price fetching moved to Edge Functions
-- that log to `fetch_log` under the *_edge names and never write `fetch_log_summary`.
-- The watchdog was still reading `fetch_log_summary` for the OLD SQL names
-- (`fetch_expired_horizons`, `fetch_weekly_prices`), which have been silent since
-- the old crons were paused -> a false "sin ejecucion" email every Mon/Thu.
--
-- Checks 2 & 3 now read pg_cron's own run log (`cron.job_run_details`) by jobname:
-- that is the true "did the cron fire" signal, correct even in a quiet week with
-- no expirations (when the function runs but inserts nothing). Check 1 is unchanged
-- (it inspects the data directly and is the real safety net for stuck evaluations).
-- ===========================================================================

create or replace function public.check_cron_health()
returns void
language plpgsql
as $$
declare
  v_anomalies    text[]      := array[]::text[];
  v_detail       text;
  v_awaiting     integer;
  v_last_weekly  timestamptz;
  v_last_expired timestamptz;
  v_n            integer;
  v_start_ts     timestamptz := clock_timestamp();
begin
  -- Check 1 — 'awaiting' horizons overdue by more than 3 days.
  --   Inspects the data directly: if the expired cron stops settling horizons,
  --   they pile up here. This is the real safety net.
  select count(*) into v_awaiting
  from batches b,
       jsonb_array_elements(b.results) as r(value)
  where r.value->>'verdict' = 'awaiting'
    and (r.value->>'targetDate') is not null
    and to_date(r.value->>'targetDate', 'DD Mon YYYY') <= current_date - 3;
  if v_awaiting > 0 then
    v_anomalies := v_anomalies || format('%s horizontes awaiting vencidos hace >3d', v_awaiting);
  end if;

  -- Check 2 — weekly-prices cron has not fired in the last 8 days.
  --   Reads pg_cron's run log by jobname. Covers the edge job (Saturday) and the
  --   recovery job (Monday). Weekly runs ~1x/week, so up to ~5d gap on a Thursday.
  select max(d.start_time) into v_last_weekly
  from cron.job_run_details d
  join cron.job j on j.jobid = d.jobid
  where j.jobname in ('fetch-weekly-prices-edge', 'recovery-weekly-prices');
  if v_last_weekly is null or v_last_weekly::date < current_date - 8 then
    v_anomalies := v_anomalies ||
      format('fetch-weekly-prices-edge sin ejecucion desde %s',
             coalesce(v_last_weekly::date::text, 'nunca'));
  end if;

  -- Check 3 — expired-horizons cron has not fired in the last 4 days.
  --   Reads pg_cron's run log by jobname. Runs Tue-Sat, so on the Monday check the
  --   last fire is Saturday (2d); the 4d threshold leaves margin.
  select max(d.start_time) into v_last_expired
  from cron.job_run_details d
  join cron.job j on j.jobid = d.jobid
  where j.jobname = 'fetch-expired-horizons-edge';
  if v_last_expired is null or v_last_expired::date < current_date - 4 then
    v_anomalies := v_anomalies ||
      format('fetch-expired-horizons-edge sin ejecucion desde %s',
             coalesce(v_last_expired::date::text, 'nunca'));
  end if;

  -- Notify if anything is wrong; always log.
  v_n := coalesce(array_length(v_anomalies, 1), 0);
  if v_n > 0 then
    v_detail := array_to_string(v_anomalies, ' · ');
    perform notify_fetch_failure('cron_health_check', current_date, 0, 0, v_n, v_detail);
    insert into fetch_log(run_date, function, ticker, status, detail)
    values (current_date, 'check_cron_health', 'WATCHDOG', 'failed', v_detail);
  else
    insert into fetch_log(run_date, function, ticker, status, detail)
    values (current_date, 'check_cron_health', 'WATCHDOG', 'inserted', 'all crons healthy');
  end if;

  insert into fetch_log_summary(run_date, function, inserted, skipped, failed, duration_s)
  values (current_date, 'check_cron_health',
          case when v_n = 0 then 1 else 0 end, 0, v_n,
          round(extract(epoch from clock_timestamp() - v_start_ts)::numeric, 1));
end;
$$;
