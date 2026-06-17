// ════════════════════════════════════════════════════════════════════════
//  fetch-expired-horizons  —  Edge Function (v7.9.0)
//
//  Evalúa los horizontes ya vencidos (verdict='awaiting' y targetDate<=hoy).
//  A diferencia del semanal, cada horizonte tiene SU PROPIA fecha objetivo,
//  así que NO se usa modo paquete: cada ejecución procesa ≤7 horizontes,
//  una llamada API cada uno. El cron la dispara una vez por minuto (ventana
//  fija mar–sáb), así la cadencia respeta el límite de 8/min y cada ejecución
//  termina en segundos — sin chocar con ningún timeout.
//
//  Reparte la lógica así:
//    · SQL  : qué evaluar (get_pending_expired), calcular el veredicto y
//             actualizar batches (save_expired_verdict), refrescar hit rates
//             (recalc_hit_rates). La lógica del veredicto NO se porta a TS:
//             se queda en SQL, idéntica a la función original.
//    · Aquí : SOLO traer el precio en la fecha objetivo
//             (Twelve Data time_series p/ US · Yahoo p/ EU).
//
//  Secrets necesarios:
//    · TWELVE_DATA_KEY
//  (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase solo.)
// ════════════════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2'

const supa = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)
const TD_KEY = Deno.env.get('TWELVE_DATA_KEY')!

const EU_SUFFIXES = ['DE', 'AS', 'PA', 'L', 'MC']
const CHUNK   = 7
const TIMEOUT = 15000

function suffix(t: string): string {
  const p = t.split('.')
  return p.length > 1 ? p[p.length - 1].toUpperCase() : 'US'
}
function tdSymbol(t: string): string {
  return suffix(t) === 'US' ? t.replace(/\.US$/i, '') : t
}
function toYMD(d: Date): string { return d.toISOString().slice(0, 10) }
function addDaysStr(ymd: string, n: number): string {
  const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return toYMD(d)
}

async function fetchJSON(url: string): Promise<any> {
  const ctrl = new AbortController()
  const tid  = setTimeout(() => ctrl.abort(), TIMEOUT)
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json()
  } finally { clearTimeout(tid) }
}

// values en orden descendente → [0] es el más cercano (<=) a la fecha objetivo
function pickClose(series: any): number | null {
  const v = series?.values
  if (!Array.isArray(v) || v.length === 0) return null
  const c = parseFloat(v[0].close)
  return Number.isNaN(c) ? null : c
}

async function fetchTwelveDataAt(ticker: string, dateYMD: string): Promise<number | null> {
  const start = addDaysStr(dateYMD, -5)
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSymbol(ticker))}`
            + `&interval=1day&start_date=${start}&end_date=${dateYMD}&outputsize=5&apikey=${TD_KEY}`
  const data = await fetchJSON(url)
  if (data?.status === 'error' || data?.code) {
    throw new Error(`TwelveData ${data.code ?? ''}: ${data.message ?? 'error'}`)
  }
  return pickClose(data)
}

async function fetchYahooAt(ticker: string, dateYMD: string): Promise<number | null> {
  const d  = Math.floor(new Date(dateYMD + 'T00:00:00Z').getTime() / 1000)
  const p1 = d - 5 * 86400, p2 = d + 86400
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`
            + `?interval=1d&period1=${p1}&period2=${p2}`
  const data = await fetchJSON(url)
  const r  = data?.chart?.result?.[0]
  const ts = r?.timestamp, cl = r?.indicators?.quote?.[0]?.close
  if (!ts || !cl) return null
  let bestTs = -1, price: number | null = null
  for (let i = 0; i < ts.length; i++) {
    const ymd = new Date(ts[i] * 1000).toISOString().slice(0, 10)
    if (ymd <= dateYMD && ts[i] > bestTs && cl[i] != null) { bestTs = ts[i]; price = cl[i] }
  }
  return price
}

async function fetchPriceAt(ticker: string, dateYMD: string): Promise<number | null> {
  return EU_SUFFIXES.includes(suffix(ticker))
    ? fetchYahooAt(ticker, dateYMD)
    : fetchTwelveDataAt(ticker, dateYMD)
}

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async () => {
  try {
    const { data: pending, error } = await supa.rpc('get_pending_expired', { p_limit: CHUNK })
    if (error) throw new Error('get_pending_expired: ' + (error.message ?? JSON.stringify(error)))
    if (!pending || pending.length === 0) return json({ done: true, processed: 0 })

    let updated = 0
    const failed: string[] = []

    for (const row of pending as Array<{ ticker: string, target_date: string, cached_close: number | null }>) {
      const { ticker, target_date, cached_close } = row
      try {
        let close = cached_close
        if (close == null) close = await fetchPriceAt(ticker, target_date)
        if (close != null && close > 0) {
          const { data } = await supa.rpc('save_expired_verdict', {
            p_ticker: ticker, p_target_date: target_date, p_close: close,
          })
          updated += (data as number) ?? 0
        } else {
          failed.push(`${ticker}@${target_date}`)
          await supa.rpc('log_expired_failure', { p_ticker: ticker, p_target_date: target_date, p_detail: 'no price' })
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        failed.push(`${ticker}@${target_date}`)
        await supa.rpc('log_expired_failure', { p_ticker: ticker, p_target_date: target_date, p_detail: msg })
      }
    }

    await supa.rpc('recalc_hit_rates')
    return json({ processed: pending.length, updated, failed })
  } catch (e) {
    const msg = e instanceof Error ? e.message
      : (e && typeof e === 'object') ? JSON.stringify(e)
      : String(e)
    console.error('fetch-expired-horizons error:', msg)
    return json({ error: msg }, 500)
  }
})
