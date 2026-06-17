-- ════════════════════════════════════════════════════════════════════════
--  v7.9.0 — Weekly prices vía Edge Function · soporte SQL
--  RPCs que usa la Edge Function + cron que la dispara.
--
--  SUPUESTOS (verificar antes de aplicar):
--    · weekly_prices(ticker, batch_id, week, week_date, close_price)
--      con UNIQUE (ticker, batch_id, week)
--    · batches.date en formato 'DD/MM/YYYY'
--    · fetch_log(run_date, function, ticker, status, detail)
--    · extensiones pg_cron y pg_net habilitadas
-- ════════════════════════════════════════════════════════════════════════

-- ── 1) Viernes de referencia de la semana ───────────────────────────────
-- Este viernes, o el anterior si aún no ha llegado.
-- DEBE coincidir con computeFriday() de la Edge Function.
create or replace function current_weekly_friday()
returns date language sql stable as $$
  select case
    when (date_trunc('week', current_date)::date + 4) > current_date
      then date_trunc('week', current_date)::date + 4 - 7
    else date_trunc('week', current_date)::date + 4
  end;
$$;

-- ── 2) Tickers que aún NO tienen el precio de esta semana (hasta p_limit) ─
create or replace function get_pending_weekly_tickers(p_limit int default 7)
returns table(ticker text) language sql stable as $$
  select distinct r.value->>'ticker'
  from batches b, jsonb_array_elements(b.results) as r(value)
  where r.value->>'horizon' = '1M'
    and (current_weekly_friday() - make_date(
          split_part(b.date,'/',3)::int,
          split_part(b.date,'/',2)::int,
          split_part(b.date,'/',1)::int)) / 7 between 1 and 52
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
$$;

-- ── 3) Guardar el precio de un ticker en TODOS sus batches (fan-out) ─────
-- Idempotente: no duplica, salta los ya presentes.
create or replace function save_weekly_price(p_ticker text, p_close numeric)
returns int language plpgsql as $$
declare
  friday     date := current_weekly_friday();
  rec        record;
  v_week     int;
  base_date  date;
  v_inserted int := 0;
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

    if v_week between 1 and 52
       and not exists (
         select 1 from weekly_prices wp
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
end; $$;

-- ── 4) Registrar un fallo con el motivo correcto ─────────────────────────
create or replace function log_weekly_failure(p_ticker text, p_detail text)
returns void language sql as $$
  insert into fetch_log(run_date, function, ticker, status, detail)
  values (current_date, 'fetch_weekly_prices_edge', p_ticker, 'failed', p_detail);
$$;


-- ════════════════════════════════════════════════════════════════════════
--  CRON  — NO LO APLIQUES HASTA HABER PROBADO LA FUNCIÓN A MANO
-- ════════════════════════════════════════════════════════════════════════
-- Guarda primero la service_role_key en Vault (una sola vez):
--   select vault.create_secret('TU_SERVICE_ROLE_KEY', 'service_role_key');
--
-- Dispara la Edge Function cada minuto, sábados 10:00–11:59 UTC (120 disparos).
-- Cada disparo procesa 1 paquete; cuando no falta nada, es un no-op.
/*
select cron.schedule(
  'fetch-weekly-prices-edge',
  '* 10-11 * * 6',
  $cron$
  select net.http_post(
    url     := 'https://yyenwzljojxbqtzcbchk.supabase.co/functions/v1/fetch-weekly-prices',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' ||
        (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $cron$
);
*/

-- Cuando confirmes que el nuevo va fino, desactiva el cron viejo (job 2):
--   select cron.unschedule('fetch-weekly-prices-saturday');
