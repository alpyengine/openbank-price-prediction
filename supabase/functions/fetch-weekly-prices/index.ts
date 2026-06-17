// ════════════════════════════════════════════════════════════════════════
//  fetch-weekly-prices  —  Edge Function (v7.9.0)
//
//  Una ejecución = UN paquete de hasta 7 tickers que aún no tienen el
//  precio de esta semana. El cron la dispara una vez por minuto (ventana
//  fija los sábados), así la cadencia del cron es el throttle (≤8/min) y
//  cada ejecución termina en segundos — sin chocar con ningún timeout.
//
//  Reparte la lógica así:
//    · SQL  : qué tickers faltan (get_pending_weekly_tickers)
//             y repartir el precio a todos los batches (save_weekly_price)
//    · Aquí : SOLO traer los precios (Twelve Data batch p/ US · Yahoo p/ EU)
//             con detección de error de verdad (429 ≠ "sin precio").
//
//  Secrets necesarios (supabase secrets set):
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
const CHUNK   = 7        // colchón bajo el límite de 8/min de Twelve Data
const TIMEOUT = 15000    // ms por llamada HTTP

// ── Helpers ──────────────────────────────────────────────────────────────

function suffix(t: string): string {
  const p = t.split('.')
  return p.length > 1 ? p[p.length - 1].toUpperCase() : 'US'
}
// Twelve Data no usa sufijo para US (TER.US → TER)
function tdSymbol(t: string): string {
  return suffix(t) === 'US' ? t.replace(/\.US$/i, '') : t
}
function toYMD(d: Date): string { return d.toISOString().slice(0, 10) }

// Viernes de referencia (ISO, lunes-base): este viernes, o el anterior si
// aún no ha llegado. DEBE coincidir con current_weekly_friday() del SQL.
function computeFriday(): string {
  const now = new Date()
  const dow = now.getUTCDay()                 // 0=Dom … 6=Sáb
  const toMon = dow === 0 ? -6 : 1 - dow
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + toMon))
  const friday = new Date(monday); friday.setUTCDate(monday.getUTCDate() + 4)
  if (friday.getTime() > now.getTime()) friday.setUTCDate(friday.getUTCDate() - 7)
  return toYMD(friday)
}
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

// values vienen en orden descendente → [0] es el más cercano al viernes
function pickClose(series: any): number | null {
  const v = series?.values
  if (!Array.isArray(v) || v.length === 0) return null
  const c = parseFloat(v[0].close)
  return Number.isNaN(c) ? null : c
}

// ── Twelve Data: un solo batch para todos los US ─────────────────────────
async function fetchTwelveDataBatch(tickers: string[], friday: string): Promise<Record<string, number | null>> {
  const start   = addDaysStr(friday, -7)
  const symbols = tickers.map(tdSymbol).join(',')
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbols)}`
            + `&interval=1day&start_date=${start}&end_date=${friday}&outputsize=10&apikey=${TD_KEY}`
  const data = await fetchJSON(url)

  // Error de nivel superior (p. ej. 429 por cupo) → que TODOS queden pendientes
  if (data?.status === 'error' || data?.code) {
    throw new Error(`TwelveData ${data.code ?? ''}: ${data.message ?? 'error'}`)
  }

  const out: Record<string, number | null> = {}
  if (tickers.length === 1) {
    out[tickers[0]] = pickClose(data)                       // respuesta sin clave de símbolo
  } else {
    for (const t of tickers) {
      const e = data[tdSymbol(t)]
      out[t] = (!e || e.status === 'error' || e.code) ? null : pickClose(e)
    }
  }
  return out
}

// ── Yahoo Finance: tickers EU (sin límite diario) ────────────────────────
async function fetchYahoo(ticker: string, friday: string): Promise<number | null> {
  const f  = Math.floor(new Date(friday + 'T00:00:00Z').getTime() / 1000)
  const p1 = f - 5 * 86400, p2 = f + 86400
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`
            + `?interval=1d&period1=${p1}&period2=${p2}`
  const data = await fetchJSON(url)
  const r  = data?.chart?.result?.[0]
  const ts = r?.timestamp, cl = r?.indicators?.quote?.[0]?.close
  if (!ts || !cl) return null
  let bestTs = -1, price: number | null = null
  for (let i = 0; i < ts.length; i++) {
    const ymd = new Date(ts[i] * 1000).toISOString().slice(0, 10)
    if (ymd <= friday && ts[i] > bestTs && cl[i] != null) { bestTs = ts[i]; price = cl[i] }
  }
  return price
}

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })

async function save(ticker: string, close: number): Promise<number> {
  const { data } = await supa.rpc('save_weekly_price', { p_ticker: ticker, p_close: close })
  return (data as number) ?? 0
}
async function logFail(ticker: string, detail: string): Promise<void> {
  await supa.rpc('log_weekly_failure', { p_ticker: ticker, p_detail: detail })
}

// ── Handler ──────────────────────────────────────────────────────────────
Deno.serve(async () => {
  try {
    // 1) ¿Qué tickers faltan? (hasta CHUNK)
    const { data: pending, error } = await supa.rpc('get_pending_weekly_tickers', { p_limit: CHUNK })
    if (error) throw new Error('get_pending_weekly_tickers: ' + (error.message ?? JSON.stringify(error)))
    if (!pending || pending.length === 0) return json({ done: true, processed: 0 })

    const tickers: string[] = (pending as Array<{ ticker: string }>).map(r => r.ticker)
    const friday = computeFriday()
    const us = tickers.filter(t => !EU_SUFFIXES.includes(suffix(t)))
    const eu = tickers.filter(t =>  EU_SUFFIXES.includes(suffix(t)))

    let inserted = 0
    const failed: string[] = []

    // 2) US — un único batch a Twelve Data
    if (us.length) {
      try {
        const prices = await fetchTwelveDataBatch(us, friday)
        for (const t of us) {
          if (prices[t] != null) inserted += await save(t, prices[t]!)
          else { failed.push(t); await logFail(t, `no price obtained — friday=${friday}`) }
        }
      } catch (e) {
        // fallo de batch (429/cupo/red) → todos quedan pendientes para el minuto siguiente
        const msg = e instanceof Error ? e.message : String(e)
        for (const t of us) { failed.push(t); await logFail(t, `batch error: ${msg}`) }
      }
    }

    // 3) EU — Yahoo, uno a uno (N pequeño)
    for (const t of eu) {
      try {
        const c = await fetchYahoo(t, friday)
        if (c != null) inserted += await save(t, c)
        else { failed.push(t); await logFail(t, `yahoo no price — friday=${friday}`) }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        failed.push(t); await logFail(t, `yahoo error: ${msg}`)
      }
    }

    return json({ processed: tickers.length, inserted, failed, friday })
  } catch (e) {
    const msg = e instanceof Error ? e.message
      : (e && typeof e === 'object') ? JSON.stringify(e)
      : String(e)
    console.error('fetch-weekly-prices error:', msg)
    return json({ error: msg }, 500)
  }
})
