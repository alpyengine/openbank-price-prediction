-- ════════════════════════════════════════════════════════════════════════
--  v7.9.0 — Crons de las Edge Functions de precios
--
--  Cada cron dispara su Edge Function UNA VEZ POR MINUTO durante una ventana
--  fija (vía net.http_post, asíncrono). La cadencia por minuto ES el throttle
--  que respeta el límite de 8/min de Twelve Data, y cada llamada async escapa
--  del statement_timeout de Postgres (que mataba a las funciones SQL viejas).
--
--  REQUISITOS (una sola vez):
--    1) Extensión pg_net activada:
--         create extension if not exists pg_net;
--    2) Secret service_role_key en Vault (para autenticar las llamadas, ya que
--       las Edge Functions tienen "Verify JWT" activo):
--         select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
--    3) Secret TWELVE_DATA_KEY puesto en cada Edge Function (Dashboard →
--       Edge Functions → Secrets).
-- ════════════════════════════════════════════════════════════════════════

-- ── 1) Precios semanales — sábados 10:00–11:59 UTC, cada minuto ──────────
--     (Edge Function fetch-weekly-prices · RPCs en 01_weekly_prices_edge_setup.sql)
select cron.schedule(
  'fetch-weekly-prices-edge',
  '* 10-11 * * 6',
  $$
  select net.http_post(
    url     := 'https://yyenwzljojxbqtzcbchk.supabase.co/functions/v1/fetch-weekly-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' ||
        (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ── 2) Horizontes vencidos — mar–sáb 02:00–03:59 UTC, cada minuto ───────
--     (Edge Function fetch-expired-horizons · RPCs en 02_expired_horizons_rpcs.sql)
select cron.schedule(
  'fetch-expired-horizons-edge',
  '* 2-3 * * 2-6',
  $$
  select net.http_post(
    url     := 'https://yyenwzljojxbqtzcbchk.supabase.co/functions/v1/fetch-expired-horizons',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' ||
        (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ── 3) Pausar los crons SQL viejos (NO se borran: respaldo) ─────────────
--     job 1 = fetch-expired-horizons-daily · job 2 = fetch-weekly-prices-saturday
--     (Usar alter_job — el UPDATE directo a cron.job da "permission denied".)
select cron.alter_job(job_id := 1, active := false);
select cron.alter_job(job_id := 2, active := false);

-- ── 4) Comprobar el estado ──────────────────────────────────────────────
-- select jobid, schedule, jobname, active from cron.job order by jobid;
--   Esperado: jobs 1 y 2 active=false; los *-edge active=true.
