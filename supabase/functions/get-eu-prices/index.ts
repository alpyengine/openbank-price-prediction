// supabase/functions/get-eu-prices/index.ts
//
// get-eu-prices — browser-callable Yahoo Finance proxy for CURRENT EU prices.
//
// Why this exists:
//   The in-app "Fetch prices" button used Alpha Vantage for EU tickers
//   (.DE/.AS/.PA/.L/.MC) — 25 req/day and poor EU coverage. The cron Edge
//   Functions already fetch EU prices fine via Yahoo, but the browser can't call
//   Yahoo directly (CORS). This function is the same Yahoo path, callable from
//   the app, returning current prices for a list of EU tickers.
//
// Deploy:
//   Supabase Dashboard → Edge Functions → Deploy new function → name "get-eu-prices"
//   → paste this file. IMPORTANT: turn "Verify JWT" OFF (it's a public price
//   proxy with no sensitive data; this also lets the CORS preflight through).
//   No secrets / API keys required (Yahoo needs none).
//
// Request  (POST):  { "tickers": ["SAN.MC", "BMW.DE", "ASML.AS"] }
// Response (200):   { "prices": { "SAN.MC": 4.83, "BMW.DE": 88.1, ... }, "failed": [...] }

const EU_SUFFIXES = ['DE', 'AS', 'PA', 'L', 'MC']
const TIMEOUT = 15000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function suffix(t: string): string {
  const p = t.split('.')
  return p.length > 1 ? p[p.length - 1].toUpperCase() : 'US'
}

async function fetchJSON(url: string): Promise<any> {
  const ctrl = new AbortController()
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json()
  } finally { clearTimeout(tid) }
}

/**
 * Current price from Yahoo chart: prefer meta.regularMarketPrice,
 * fall back to the last non-null daily close.
 */
async function fetchYahooCurrent(ticker: string): Promise<number | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`
            + `?interval=1d&range=5d`
  const data = await fetchJSON(url)
  const r = data?.chart?.result?.[0]
  if (!r) return null
  const mp = r.meta?.regularMarketPrice
  if (typeof mp === 'number' && !Number.isNaN(mp)) return mp
  const cl = r.indicators?.quote?.[0]?.close
  if (Array.isArray(cl)) {
    for (let i = cl.length - 1; i >= 0; i--) {
      if (cl[i] != null && !Number.isNaN(cl[i])) return cl[i]
    }
  }
  return null
}

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const tickers: string[] = Array.isArray(body?.tickers) ? body.tickers : []
    if (!tickers.length) return json({ prices: {}, failed: [] })

    const prices: Record<string, number | null> = {}
    const failed: string[] = []

    for (const t of tickers) {
      // Only EU tickers are handled here; the app keeps US on Twelve Data.
      if (!EU_SUFFIXES.includes(suffix(t))) { prices[t] = null; continue }
      try {
        const p = await fetchYahooCurrent(t)
        prices[t] = p
        if (p == null) failed.push(t)
      } catch (_e) {
        prices[t] = null
        failed.push(t)
      }
    }

    return json({ prices, failed })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('get-eu-prices error:', msg)
    return json({ error: msg }, 500)
  }
})
