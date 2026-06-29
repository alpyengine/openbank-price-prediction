// supabase/functions/get-eu-fundamentals/index.ts
//
// get-eu-fundamentals — browser-callable Yahoo Finance proxy for EU fundamentals.
//
// Phase 2 of "EU data via Yahoo". Finnhub/FMP free tiers are US-only, so EU
// tickers (.DE/.AS/.PA/.L/.MC) had no sector/PE/margins/etc. This proxies
// Yahoo quoteSummary (server-side, no CORS) and returns fundamentals already
// normalized to THIS app's schema and units (Finnhub conventions), so
// useFundamentals can use the object as-is.
//
// Units (to match the US/Finnhub path the app already formats):
//   - Percent-style fields stored as PERCENT numbers (19.5 == 19.5%):
//       netMarginTTM, roeTTM, roaTTM, epsGrowthTTM, revGrowthTTM, divYield
//       → Yahoo gives decimals (0.195) → ×100
//   - debtEquity stored as a RATIO (0.85): Yahoo debtToEquity is percent-style
//       (85.3) → ÷100
//   - peTTM, forwardPE, pegTTM, beta: plain numbers (as-is)
//   - marketCap: absolute USD (as-is, matches the FMP path)
//   Not available on Yahoo → left null (accepted): forwardPEG, pfcfTTM,
//   epsGrowth3Y, epsGrowth5Y.
//
// Deploy: Dashboard → Edge Functions → name "get-eu-fundamentals", paste this,
//         Verify JWT OFF. No secrets / API keys.
//
// Request  (POST):  { "tickers": ["SAN.MC", "BMW.DE"] }
// Response (200):   { "fundamentals": { "SAN.MC": { sector, peTTM, ... }, ... }, "failed": [...] }

const EU_SUFFIXES = ['DE', 'AS', 'PA', 'L', 'MC']
const TIMEOUT = 15000
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const MODULES = 'summaryProfile,summaryDetail,defaultKeyStatistics,financialData,price'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function suffix(t: string): string {
  const p = t.split('.')
  return p.length > 1 ? p[p.length - 1].toUpperCase() : 'US'
}

/** num — Yahoo values come as {raw, fmt} objects or plain numbers. */
function num(x: any): number | null {
  if (x == null) return null
  if (typeof x === 'number') return Number.isNaN(x) ? null : x
  if (typeof x === 'object' && typeof x.raw === 'number') return Number.isNaN(x.raw) ? null : x.raw
  return null
}
/** pct — decimal (0.195) → percent number (19.5), to match Finnhub convention. */
function pct(x: any): number | null {
  const v = num(x)
  return v == null ? null : v * 100
}

async function fetchWithTimeout(url: string, headers: Record<string, string>): Promise<Response> {
  const ctrl = new AbortController()
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT)
  try {
    return await fetch(url, { signal: ctrl.signal, cache: 'no-store', headers })
  } finally { clearTimeout(tid) }
}

/** Best-effort cookie + crumb (Yahoo's v10 quoteSummary sometimes requires it). */
async function getCrumb(): Promise<{ cookie: string; crumb: string } | null> {
  try {
    const r1 = await fetchWithTimeout('https://fc.yahoo.com', { 'User-Agent': UA })
    const cookie = r1.headers.get('set-cookie') ?? ''
    const r2 = await fetchWithTimeout('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      'User-Agent': UA, 'Cookie': cookie,
    })
    const crumb = (await r2.text()).trim()
    if (!crumb || crumb.includes('<') || crumb.length > 64) return null
    return { cookie, crumb }
  } catch {
    return null
  }
}

function mapResult(r: any) {
  const prof  = r.summaryProfile ?? {}
  const det   = r.summaryDetail ?? {}
  const ks    = r.defaultKeyStatistics ?? {}
  const fin   = r.financialData ?? {}
  const price = r.price ?? {}
  const de    = num(fin.debtToEquity)
  return {
    // Identity
    sector:       prof.sector || '--',
    industry:     prof.industry || '--',
    marketCap:    num(price.marketCap) ?? num(det.marketCap) ?? null,   // absolute USD
    website:      prof.website || null,
    description:  prof.longBusinessSummary || null,
    // Valuation
    peTTM:        num(det.trailingPE),
    forwardPE:    num(det.forwardPE) ?? num(ks.forwardPE),
    pegTTM:       num(ks.pegRatio),
    forwardPEG:   null,
    pfcfTTM:      null,
    // Quality
    netMarginTTM: pct(fin.profitMargins),
    roeTTM:       pct(fin.returnOnEquity),
    roaTTM:       pct(fin.returnOnAssets),
    debtEquity:   de != null ? de / 100 : null,    // Yahoo percent-style → ratio
    // Growth
    epsGrowthTTM: pct(fin.earningsGrowth),
    epsGrowth3Y:  null,
    epsGrowth5Y:  null,
    revGrowthTTM: pct(fin.revenueGrowth),
    // Risk & income
    beta:         num(det.beta) ?? num(ks.beta),
    divYield:     pct(det.dividendYield) ?? pct(det.trailingAnnualDividendYield),
  }
}

async function fetchOne(ticker: string, auth: { cookie: string; crumb: string } | null) {
  let url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${MODULES}`
  if (auth?.crumb) url += `&crumb=${encodeURIComponent(auth.crumb)}`
  const headers: Record<string, string> = { 'User-Agent': UA, 'Accept': 'application/json' }
  if (auth?.cookie) headers['Cookie'] = auth.cookie
  const res = await fetchWithTimeout(url, headers)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const data = await res.json()
  const r = data?.quoteSummary?.result?.[0]
  if (!r) throw new Error('no result')
  return mapResult(r)
}

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const tickers: string[] = Array.isArray(body?.tickers) ? body.tickers : []
    if (!tickers.length) return json({ fundamentals: {}, failed: [] })

    // One crumb attempt for the whole batch (best-effort; may be null).
    let auth = await getCrumb()

    const fundamentals: Record<string, any> = {}
    const failed: string[] = []

    for (const t of tickers) {
      if (!EU_SUFFIXES.includes(suffix(t))) { failed.push(t); continue }  // EU only
      try {
        fundamentals[t] = await fetchOne(t, auth)
      } catch (_e) {
        // One retry: refresh the crumb and try again (handles expired/missing crumb)
        try {
          auth = await getCrumb()
          fundamentals[t] = await fetchOne(t, auth)
        } catch (_e2) {
          fundamentals[t] = null
          failed.push(t)
        }
      }
    }

    return json({ fundamentals, failed })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('get-eu-fundamentals error:', msg)
    return json({ error: msg }, 500)
  }
})
