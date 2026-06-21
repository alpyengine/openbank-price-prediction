-- ════════════════════════════════════════════════════════════════════════
--  v7.9.0 — Expired horizons vía Edge Function · RPCs de soporte
--
--  Igual que el semanal, pero aquí cada horizonte tiene su propia fecha
--  objetivo, así que NO se usa modo paquete: la Edge Function procesará
--  ≤8 horizontes por minuto, una llamada cada uno.
--
--  La lógica del veredicto se queda en SQL (save_expired_verdict),
--  idéntica a la función original fetch_expired_horizons.
--
--  SUPUESTOS (verificar):
--    · price_cache(ticker, target_date, close_price) con UNIQUE(ticker,target_date)
--    · batches.results es JSONB array con objetos {ticker,horizon,targetDate,
--      targetPrice,basePrice,verdict,priceOnDate}
--    · batches.date 'DD/MM/YYYY' · targetDate 'DD Mon YYYY'
-- ════════════════════════════════════════════════════════════════════════

-- ── 1) Horizontes pendientes de evaluar (awaiting + ya vencidos) ─────────
-- Devuelve hasta p_limit pares únicos (ticker, fecha objetivo), con el
-- precio cacheado si ya existe (para no llamar a la API en vano).
create or replace function get_pending_expired(p_limit int default 7)
returns table(ticker text, target_date date, cached_close numeric)
language sql stable as $$
  select distinct
    r.value->>'ticker'                                  as ticker,
    to_date(r.value->>'targetDate', 'DD Mon YYYY')      as target_date,
    pc.close_price                                      as cached_close
  from batches b,
       jsonb_array_elements(b.results) as r(value)
  left join price_cache pc
    on pc.ticker      = r.value->>'ticker'
   and pc.target_date = to_date(r.value->>'targetDate', 'DD Mon YYYY')
  where r.value->>'verdict' = 'awaiting'
    and (r.value->>'targetDate') is not null
    and to_date(r.value->>'targetDate', 'DD Mon YYYY') < current_date  -- v7.9.7: solo lo ya vencido (su cierre ya existe); evita reintentar lo de hoy
  order by target_date, ticker
  limit p_limit;
$$;

-- ── 2) Aplicar el veredicto a todos los horizontes de ese ticker+fecha ──
-- Cachea el precio y, para cada resultado 'awaiting' que coincida,
-- calcula el veredicto (misma lógica que la función original) y actualiza
-- batches.results. Devuelve cuántos resultados actualizó.
create or replace function save_expired_verdict(p_ticker text, p_target_date date, p_close numeric)
returns int language plpgsql as $$
declare
  rec       record;
  v_updated int := 0;
begin
  if p_close is null or p_close <= 0 then return 0; end if;

  insert into price_cache(ticker, target_date, close_price)
  values (p_ticker, p_target_date, p_close)
  on conflict (ticker, target_date) do nothing;

  for rec in
    select b.id as batch_id, r.value as result_row
    from batches b, jsonb_array_elements(b.results) as r(value)
    where r.value->>'ticker'  = p_ticker
      and r.value->>'verdict' = 'awaiting'
      and (r.value->>'targetDate') is not null
      and to_date(r.value->>'targetDate', 'DD Mon YYYY') = p_target_date
  loop
    declare
      v_horizon      text    := rec.result_row->>'horizon';
      v_target_price numeric := (rec.result_row->>'targetPrice')::numeric;
      v_base_price   numeric := (rec.result_row->>'basePrice')::numeric;
      v_h_margin     numeric;
      v_r_ratio      numeric;
      v_close_thresh numeric;
      v_signed_dist  numeric;
      v_dist_abs     numeric;
      v_new_verdict  text;
    begin
      if v_target_price is null or v_target_price <= 0 then
        continue;
      end if;

      case v_horizon
        when '1M'  then v_h_margin := 3;  v_r_ratio := 2.0;
        when '3M'  then v_h_margin := 5;  v_r_ratio := 2.0;
        when '6M'  then v_h_margin := 7;  v_r_ratio := 1.8;
        when '12M' then v_h_margin := 10; v_r_ratio := 1.6;
        else            v_h_margin := 5;  v_r_ratio := 2.0;
      end case;
      v_close_thresh := v_h_margin * v_r_ratio;

      v_signed_dist := (p_close - v_target_price) / v_target_price * 100;
      v_dist_abs    := abs(v_signed_dist);

      if v_target_price > v_base_price then
        v_new_verdict := case
          when p_close > v_target_price * (1 + v_h_margin / 100) then 'exceeded'
          when v_dist_abs <= v_h_margin                          then 'hit'
          when v_signed_dist < 0 and v_dist_abs <= v_close_thresh then 'close'
          when v_signed_dist < 0 and p_close < v_base_price       then 'wrong_way'
          else 'miss'
        end;
      elsif v_target_price < v_base_price then
        v_new_verdict := case
          when p_close < v_target_price * (1 - v_h_margin / 100) then 'exceeded'
          when v_dist_abs <= v_h_margin                          then 'hit'
          when v_signed_dist > 0 and v_dist_abs <= v_close_thresh then 'close'
          when v_signed_dist > 0 and p_close > v_base_price       then 'wrong_way'
          else 'miss'
        end;
      else
        v_new_verdict := case when v_dist_abs <= v_h_margin then 'hit' else 'miss' end;
      end if;

      update batches
      set results = (
            select jsonb_agg(
              case
                when elem->>'ticker'     = p_ticker
                 and elem->>'targetDate' = rec.result_row->>'targetDate'
                 and elem->>'horizon'    = v_horizon
                then elem
                  || jsonb_build_object('verdict',     v_new_verdict)
                  || jsonb_build_object('priceOnDate', p_close)
                else elem
              end
            )
            from jsonb_array_elements(batches.results) as elem
          ),
          updated_at = now()
      where id = rec.batch_id;

      insert into fetch_log(run_date, function, ticker, status, detail)
      values (current_date, 'fetch_expired_horizons_edge', p_ticker, 'inserted',
        format('%s %s verdict=%s close=%s target=%s',
          v_horizon, rec.result_row->>'targetDate', v_new_verdict, p_close, v_target_price));

      v_updated := v_updated + 1;
    end;
  end loop;

  return v_updated;
end; $$;

-- ── 3) Registrar un fallo de fetch ──────────────────────────────────────
create or replace function log_expired_failure(p_ticker text, p_target_date date, p_detail text)
returns void language sql as $$
  insert into fetch_log(run_date, function, ticker, status, detail)
  values (current_date, 'fetch_expired_horizons_edge', p_ticker, 'failed',
          format('target=%s — %s', p_target_date, p_detail));
$$;

-- ── 4) Recalcular hit_rate / hit_rate_ext (igual que la original) ────────
-- Se llama de vez en cuando (al final de cada barrido) para refrescar.
create or replace function recalc_hit_rates()
returns void language sql as $$
  update batches b
  set hit_rate = (
        select case
          when count(*) filter (where r->>'verdict' != 'awaiting') = 0 then null
          else round(
            count(*) filter (where r->>'verdict' = 'hit')::numeric /
            count(*) filter (where r->>'verdict' != 'awaiting') * 100)
        end
        from jsonb_array_elements(b.results) as r),
      hit_rate_ext = (
        select case
          when count(*) filter (where r->>'verdict' != 'awaiting') = 0 then null
          else round(
            (count(*) filter (where r->>'verdict' = 'hit') +
             count(*) filter (where r->>'verdict' = 'exceeded'))::numeric /
            count(*) filter (where r->>'verdict' != 'awaiting') * 100)
        end
        from jsonb_array_elements(b.results) as r),
      updated_at = now()
  where exists (
    select 1 from jsonb_array_elements(b.results) as r
    where r->>'verdict' != 'awaiting');
$$;
