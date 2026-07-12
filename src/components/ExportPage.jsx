/**
 * ExportPage
 *
 * Allows the user to export a batch report as HTML or PDF.
 *
 * Steps:
 *   1. Select batch (dropdown — defaults to currently loaded batch)
 *   2. Select content (checkboxes — summary, table, market, fundamentals, notes)
 *   3. Export as HTML (download) or PDF (jsPDF + html2canvas)
 *
 * @param {Object[]} batches         — all saved batches from history
 * @param {string}   loadedBatchId   — currently loaded batch id (pre-selects dropdown)
 * @param {Object}   fundamentals    — { [ticker]: FundamentalsData }
 * @param {Object}   autoPrices      — { [ticker]: number } current prices
 */
import { useState, useMemo, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FileCode, FileType, Download, Target, HelpCircle } from 'lucide-react'
import { formatDate } from '@/utils/dates.js'
import { loadFundamentalsCache } from '@/services/storage'

// ═══════════════════════════════════════════════════════════════════════════
// Investment Candidates report (v7.22.0) — scoring & ticker-parsing helpers
// ═══════════════════════════════════════════════════════════════════════════
// NOTE: these 8 functions (getMarket → entryQuality) are intentionally
// DUPLICATED from AllStocksPage.jsx rather than imported — that file defines
// them as local, unexported module-level functions, and this version kept
// the change scoped to ExportPage.jsx only rather than also touching
// AllStocksPage.jsx (a large, already-stable file) to extract them into a
// shared utils module. If this drifts out of sync in the future, consider
// extracting both to e.g. src/utils/scoring.js — flagged for Alex to decide,
// not done unilaterally here.

function getMarket(rawTicker) {
  const m = rawTicker.match(/\.([A-Z]+)$/i)
  if (!m) return 'US'
  const suffix = m[1].toUpperCase()
  return ['DE', 'AS', 'PA', 'L', 'MC'].includes(suffix) ? suffix : 'US'
}
function displayTicker(rawTicker) {
  return rawTicker.replace(/\.(DE|AS|PA|L|MC|US)$/i, '')
}
const WEIGHTS = { upside: 0.40, peg: 0.45, margin: 0.15 }
function upsideScore(upside) {
  if (upside < 0)   return 0
  if (upside < 10)  return 20
  if (upside < 20)  return 40
  if (upside < 30)  return 65
  if (upside < 50)  return 85
  return 100
}
function pegScore(peg) {
  if (peg == null || peg < 0) return 0
  if (peg <= 0.5)  return 100
  if (peg <= 1.0)  return 85
  if (peg <= 1.5)  return 60
  if (peg <= 2.0)  return 30
  return 0
}
function marginScore(margin) {
  if (margin == null || margin < 0) return 0
  if (margin < 5)   return 20
  if (margin < 15)  return 50
  if (margin < 25)  return 75
  return 100
}
function calcScore(upside12, fundamental) {
  if (!fundamental) return null
  const peg    = fundamental.pegTTM
  const margin = fundamental.netMarginTTM
  const negEPS = fundamental.epsGrowthTTM != null && fundamental.epsGrowthTTM < 0
  const raw = (
    WEIGHTS.upside * upsideScore(upside12) +
    WEIGHTS.peg    * pegScore(peg) +
    WEIGHTS.margin * marginScore(margin)
  ) - (negEPS ? 20 : 0)
  return Math.max(0, Math.round(raw))
}
// entryQuality here uses the FORECAST-time upside (upside from the batch's
// base price, i.e. u1/u3/u6/u12) for the selected horizon — NOT "upside from
// today's live price" (getUpsideHoy) like AllStocksPage's own Entry Quality
// column does. That would need weeklyPrices/autoPrices cascade logic this
// page doesn't currently receive. For this report ("what did the forecast
// say") the forecast-time figure is the more natural fit — worth knowing if
// you compare a ticker's Entry Quality here against its All Stocks value,
// they can legitimately differ.
function entryQuality(remPct, score, peg) {
  if (remPct == null) return null
  const upN  = Math.max(0, Math.min(1, remPct / 40))
  const pegN = (peg == null || peg <= 0) ? 0 : Math.max(0, Math.min(1, (2 - peg) / 2))
  if (score == null) return { v: Math.round(100 * (0.75 * upN + 0.25 * pegN)), noScore: true }
  return { v: Math.round(100 * (0.5 * upN + 0.35 * (score / 100) + 0.15 * pegN)), noScore: false }
}

const HORIZON_UKEY = { '1M': 'u1', '3M': 'u3', '6M': 'u6', '12M': 'u12' }

/**
 * buildCandidatePool — flattens every ticker×batch instance across ALL
 * batches into one array, with score/sector/PEG/margin/upside-per-horizon
 * attached. Mirrors AllStocksPage's expandStockInstances/deduplicateStocks
 * grouping logic (group batch.results by ticker, pull basePrice + the 4
 * horizon targetPrices), simplified to just what this report needs.
 */
function buildCandidatePool(batches, fundamentals) {
  const pool = []
  for (const batch of (batches ?? [])) {
    if (!batch.results) continue
    const byTicker = new Map()
    for (const r of batch.results) {
      const rawTicker  = r.ticker || r.t || ''
      const normTicker = rawTicker.replace(/\.US$/i, '')
      if (!normTicker) continue
      if (!byTicker.has(normTicker)) byTicker.set(normTicker, { raw: rawTicker, rows: [] })
      byTicker.get(normTicker).rows.push(r)
    }
    for (const [normTicker, { raw, rows }] of byTicker) {
      const getTarget = h => rows.find(r => (r.horizon || '').toUpperCase() === h)?.targetPrice || 0
      const r0    = rows[0]
      const base  = r0?.basePrice || r0?.b || 0
      const t1    = getTarget('1M'), t3 = getTarget('3M'), t6 = getTarget('6M'), t12 = getTarget('12M')
      const up    = t => (base && t) ? (t - base) / base * 100 : null
      const u1 = up(t1), u3 = up(t3), u6 = up(t6), u12 = up(t12)
      const f     = fundamentals?.[raw] ?? fundamentals?.[normTicker] ?? null
      const score = calcScore(u12, f)
      pool.push({
        t: raw, tNorm: normTicker, tDisplay: displayTicker(raw), market: getMarket(raw),
        co:        r0?.company || r0?.co || normTicker,
        sector:    f?.sector || '—',
        peg:       f?.pegTTM ?? null,
        margin:    f?.netMarginTTM ?? null,
        direction: batch.direction ?? 'bullish',
        batchId:   batch.id,
        batchDate: batch.date,
        u1, u3, u6, u12, score,
      })
    }
  }
  return pool
}

/**
 * filterCandidates — applies the manual criteria (Score min, Entry Quality
 * min, Upside min for the selected horizon, Market, Direction) to the flat
 * instance pool. This decides WHICH tickers make it into the report — the
 * averages themselves (aggregateByTicker) are computed separately from ALL
 * of a matching ticker's historical instances, not just the ones that pass
 * here (confirmed with Alex — avoids survivorship bias in the averages).
 */
/**
 * filterCandidates — applies the manual criteria (Score min, Entry Quality
 * min, Upside min for the selected horizon, Market, Direction) to the flat
 * instance pool.
 *
 * v7.22.2 fix: each numeric check is now only ENFORCED when its threshold
 * is actually raised above 0. Previously `scoreMin === 0` (the loosest
 * possible setting, meant as "score doesn't matter") still required
 * `s.score != null` unconditionally — so any instance without cached
 * fundamentals (score always null, regardless of threshold) got excluded
 * no matter how low the slider was set. Same bug for upside and, via
 * entryQuality's own null-propagation, for Entry Quality too. With 180+
 * historical instances and fundamentals typically NOT cached for every
 * single one, this silently wiped out almost the whole pool even at
 * "everything wide open" settings. Now: threshold at 0 = don't filter on
 * that dimension at all (missing data no longer excludes); threshold > 0 =
 * enforced as before (missing data still excludes, since we can't confirm
 * it clears a real bar).
 */
function filterCandidates(pool, criteria) {
  const uKey = HORIZON_UKEY[criteria.horizon]
  return pool.filter(s => {
    if (criteria.market !== 'All' && s.market !== criteria.market) return false
    if (criteria.direction !== 'All' && s.direction !== criteria.direction) return false

    if (criteria.scoreMin > 0) {
      if (s.score == null || s.score < criteria.scoreMin) return false
    }

    const upsideVal = s[uKey]
    if (criteria.upsideMin > 0) {
      if (upsideVal == null || upsideVal < criteria.upsideMin) return false
    }

    if (criteria.eqMin > 0) {
      const eq = entryQuality(upsideVal, s.score, s.peg)
      if (!eq || eq.v < criteria.eqMin) return false
    }

    return true
  })
}

/**
 * filterDiagnostics — independent per-criterion breakdown over the FULL
 * pool (v7.22.2), so when the match count looks wrong the UI can show
 * exactly why instead of a blind "0 candidates". Each count is computed
 * against the full pool, not chained, so they can overlap (e.g. an
 * instance can be both "no score" and "wrong market").
 */
function filterDiagnostics(pool, criteria) {
  const uKey = HORIZON_UKEY[criteria.horizon]
  let noScore = 0, noUpside = 0, noFundamentals = 0
  for (const s of pool) {
    if (s.score == null) noScore++
    if (s[uKey] == null) noUpside++
    if (s.sector === '—' && s.peg == null && s.margin == null) noFundamentals++
  }
  return { total: pool.length, noScore, noUpside, noFundamentals }
}

/**
 * aggregateByTicker — one row per unique ticker among the tickers that have
 * at least one matching instance, with Score/Upside(×4 horizons) averaged
 * across ALL of that ticker's historical instances (not just the matching
 * ones) — the deliberate choice from scoping: the filter decides who's IN,
 * the average tells you what to expect from them, using their full history.
 */
// Same 'DD/MM/YYYY' parser used elsewhere (AllStocksPage's parseBatchDate) —
// duplicated here for the same reason as the scoring helpers above.
function parseBatchDate(ddmmyyyy) {
  if (!ddmmyyyy) return null
  const [dd, mm, yy] = ddmmyyyy.split('/').map(Number)
  if (!dd || !mm || !yy) return null
  const t = new Date(yy, mm - 1, dd).getTime()
  return Number.isNaN(t) ? null : t
}

function aggregateByTicker(fullPool, matchingInstances) {
  const wantedTickers = new Set(matchingInstances.map(s => s.tNorm))
  const byTicker = new Map()
  for (const s of fullPool) {
    if (!wantedTickers.has(s.tNorm)) continue
    if (!byTicker.has(s.tNorm)) byTicker.set(s.tNorm, [])
    byTicker.get(s.tNorm).push(s)
  }
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
  const rows = [...byTicker.entries()].map(([tNorm, instances]) => {
    // most recent instance (real date compare, not string sort) for display fields
    const latest = [...instances].sort((a, b) => (parseBatchDate(b.batchDate) ?? 0) - (parseBatchDate(a.batchDate) ?? 0))[0]
    const nums = key => instances.map(i => i[key]).filter(v => v != null)
    return {
      tNorm, tDisplay: latest.tDisplay, co: latest.co, sector: latest.sector, market: latest.market,
      instanceCount: instances.length,
      avgScore: avg(nums('score')),
      avgU1: avg(nums('u1')), avgU3: avg(nums('u3')), avgU6: avg(nums('u6')), avgU12: avg(nums('u12')),
    }
  })
  return rows.sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1))
}

// ── Content items ─────────────────────────────────────────────────────────────

// ── Criteria help (v7.22.3) — plain-language explanation of how Score,
// Entry Quality, and Upside are actually calculated, shown via a (?) icon
// next to each slider. Kept in sync manually with calcScore/entryQuality
// above — if those formulas change, update this text too.
const CRITERIA_HELP = {
  score: {
    title: 'Score (0–100)',
    text: 'Combina 3 datos del ticker en una sola puntuación: cuánto sube el precio objetivo a 12 meses (40% del peso), el ratio PEG — precio/beneficio ajustado por crecimiento — (45%), y el margen neto (15%). Resta 20 puntos si el crecimiento de beneficios (EPS) es negativo.',
    detail: [
      'Upside a 12M → <0%: 0 pts · 0-10%: 20 · 10-20%: 40 · 20-30%: 65 · 30-50%: 85 · ≥50%: 100',
      'PEG → ≤0.5: 100 pts · ≤1.0: 85 · ≤1.5: 60 · ≤2.0: 30 · más o sin dato: 0',
      'Margen neto → <5%: 20 pts · 5-15%: 50 · 15-25%: 75 · ≥25%: 100',
      'Score = 40%×Upside + 45%×PEG + 15%×Margen (−20 si EPS growth es negativo)',
    ],
    note: 'Necesita fundamentals cargados (sector/PEG/margen) para ese ticker. Si no los hay, el Score sale vacío — no es un "0", es que no se pudo calcular.',
  },
  eq: {
    title: 'Entry Quality (0–100)',
    text: 'Responde a "qué buen momento es este para entrar" — combina cuánto recorrido le queda al precio hasta el objetivo (el factor con más peso), el Score, y el PEG.',
    detail: [
      'Con Score disponible → 50%×Upside (normalizado 0-40%) + 35%×(Score/100) + 15%×PEG (normalizado)',
      'Sin Score disponible → 75%×Upside + 25%×PEG (se apoya más en estos dos al faltar el Score)',
    ],
    note: 'Si el ticker no tiene previsión de upside para el horizonte elegido, Entry Quality tampoco se puede calcular.',
  },
  upside: {
    title: 'Upside mínimo',
    text: 'El % de subida que la previsión original de Openbank apunta desde el precio base hasta el precio objetivo, para el horizonte que elijas (1M/3M/6M/12M).',
    detail: [
      'Upside = (precio objetivo − precio base) / precio base × 100',
      'Ejemplo: +15% en 3M significa que la previsión apuntaba a un +15% de subida en esos 3 meses desde el precio base del batch.',
    ],
    note: null,
  },
}

function CriterionHelp({ id, open, onToggle }) {
  const h = CRITERIA_HELP[id]
  return (
    <>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-muted-foreground hover:text-foreground ml-1 align-text-top"
        title={`¿Cómo se calcula ${h.title}?`}
      >
        <HelpCircle size={12} />
      </button>
      {open && (
        <div className="mt-2 mb-1 p-3 rounded-lg bg-muted/60 border border-border text-[11px] leading-relaxed">
          <div className="font-semibold text-foreground mb-1">{h.title}</div>
          <div className="text-muted-foreground mb-2">{h.text}</div>
          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
            {h.detail.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
          {h.note && <div className="mt-2 text-amber-700 dark:text-amber-400">ℹ️ {h.note}</div>}
        </div>
      )}
    </>
  )
}

const CONTENT_ITEMS = [
  { id: 'summary',      label: 'Summary cards',      sub: 'Hit rate, stocks count, direction badge'  },
  { id: 'table',        label: 'Predictions table',  sub: 'All tickers with targets and verdicts'    },
  { id: 'market',       label: 'Market performance', sub: 'SPY and ETF benchmarks vs batch period'   },
  { id: 'fundamentals', label: 'Fundamentals',       sub: 'Sector, PEG, beta, net margin per ticker' },
  { id: 'notes',        label: 'Notes',              sub: 'Per-ticker notes saved with the batch'    },
]

// ── Currency helper ───────────────────────────────────────────────────────────

function getCurrencySymbol(batch) {
  if (!batch?.results?.length) return '$'
  const cu = batch.results.find(r => r.currency)?.currency ?? 'USD'
  if (cu === 'EUR') return '€'
  if (cu === 'GBP') return '£'
  return '$'
}

// ── HTML report builder ───────────────────────────────────────────────────────

const VERDICT_STYLES = {
  exceeded:  { bg: '#dcfce7', color: '#166534', label: 'Exceeded'   },
  hit:       { bg: '#dcfce7', color: '#166534', label: 'Hit'        },
  close:     { bg: '#fef9c3', color: '#854d0e', label: 'Close'      },
  miss:      { bg: '#fee2e2', color: '#991b1b', label: 'Miss'       },
  wrong_way: { bg: '#f3e8ff', color: '#6b21a8', label: 'Wrong way'  },
  awaiting:  { bg: '#f4f4f5', color: '#71717a', label: 'Awaiting'   },
}

function buildReportHtml(batch, selection, fundamentals) {
  if (!batch) return ''

  const now    = new Date().toLocaleDateString('en-GB', { weekday:'short', day:'2-digit', month:'short', year:'numeric' })
  const tickers = [...new Set(batch.results.map(r => r.ticker))]
  const dir     = batch.direction ?? 'bullish'
  const sym     = getCurrencySymbol(batch)
  const dirBadge = dir === 'bearish'
    ? '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600">📉 Bearish</span>'
    : '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600">📈 Bullish</span>'

  // ── Summary section ──────────────────────────────────────────────────────
  let summaryHtml = ''
  if (selection.summary) {
    const evaluated = batch.results.filter(r => r.verdict !== 'awaiting').length
    const hits      = batch.results.filter(r => r.verdict === 'hit' || r.verdict === 'exceeded').length
    const hitRate   = evaluated ? Math.round(hits / evaluated * 100) : null

    summaryHtml = `
      <div data-pdf-block="1" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
        ${[
          ['Stocks',    batch.stocks ?? tickers.length, ''],
          ['Evaluated', evaluated,                       ''],
          ['Hit rate',  hitRate != null ? hitRate + '%' : '—', ''],
          ['Direction', dir === 'bearish' ? '📉 Bearish' : '📈 Bullish', ''],
        ].map(([label, val]) => `
          <div style="background:#f4f4f5;border-radius:8px;padding:12px 14px">
            <div style="font-size:11px;color:#71717a;margin-bottom:4px">${label}</div>
            <div style="font-size:20px;font-weight:600;color:#18181b">${val}</div>
          </div>`).join('')}
      </div>`
  }

  // ── Predictions table ────────────────────────────────────────────────────
  let tableHtml = ''
  if (selection.table) {
    const rows = tickers.map(ticker => {
      const get  = h => batch.results.find(r => r.ticker === ticker && r.horizon === h)
      const r1   = get('1M'); const r3 = get('3M'); const r6 = get('6M'); const r12 = get('12M')
      const base = r1?.basePrice ?? r3?.basePrice ?? 0
      const vs   = (s) => {
        const c = VERDICT_STYLES[s?.verdict] ?? VERDICT_STYLES.awaiting
        const pct = (s?.targetPrice && base) ? ((s.targetPrice - base) / base * 100).toFixed(1) : '—'
        return `<td style="padding:8px 12px;text-align:right">
          <div style="font-size:12px;font-weight:500">${s?.targetPrice ? sym + s.targetPrice.toFixed(2) : '—'}</div>
          <span style="background:${c.bg};color:${c.color};padding:1px 6px;border-radius:20px;font-size:10px;font-weight:600">${c.label}</span>
        </td>`
      }
      return `<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:8px 12px;font-weight:600;font-size:13px">${ticker}</td>
        <td style="padding:8px 12px;font-size:12px;color:#71717a">${r1?.company ?? ''}</td>
        <td style="padding:8px 12px;text-align:right;font-size:13px;font-weight:500">${sym}${base.toFixed(2)}</td>
        ${vs(r1)}${vs(r3)}${vs(r6)}${vs(r12)}
      </tr>`
    }).join('')

    tableHtml = `
      <div data-pdf-block="1" style="margin-bottom:24px">
        <div style="font-size:13px;font-weight:600;color:#18181b;margin-bottom:10px">Predictions</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:#f4f4f5;border-bottom:1px solid #e4e4e7">
              <th style="padding:8px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">TICKER</th>
              <th style="padding:8px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">COMPANY</th>
              <th style="padding:8px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">BASE</th>
              <th style="padding:8px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">1M</th>
              <th style="padding:8px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">3M</th>
              <th style="padding:8px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">6M</th>
              <th style="padding:8px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">12M</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
  }

  // ── Market performance ───────────────────────────────────────────────────
  let marketHtml = ''
  if (selection.market && batch.marketData) {
    const spy    = batch.marketData.spy
    const etfs   = batch.marketData.etfs ?? {}
    const iEtfs  = batch.marketData.industryEtfs ?? {}
    const allEtf = { ...etfs, ...iEtfs }
    const spyRow = spy ? `<tr style="border-bottom:1px solid #f0f0f0">
      <td style="padding:6px 12px;font-weight:600">SPY</td>
      <td style="padding:6px 12px;color:#71717a">S&amp;P 500</td>
      <td style="padding:6px 12px;text-align:right;font-weight:600;color:${spy.changePct>=0?'#166534':'#991b1b'}">${spy.changePct>=0?'+':''}${spy.changePct.toFixed(2)}%</td>
    </tr>` : ''
    const etfRows = Object.entries(allEtf).map(([sym, e]) => `
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:6px 12px;font-weight:600">${sym}</td>
        <td style="padding:6px 12px;color:#71717a">ETF</td>
        <td style="padding:6px 12px;text-align:right;font-weight:600;color:${e.changePct>=0?'#166534':'#991b1b'}">${e.changePct>=0?'+':''}${e.changePct.toFixed(2)}%</td>
      </tr>`).join('')

    marketHtml = `
      <div data-pdf-block="1" style="margin-bottom:24px">
        <div style="font-size:13px;font-weight:600;color:#18181b;margin-bottom:10px">Market performance</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#f4f4f5;border-bottom:1px solid #e4e4e7">
            <th style="padding:6px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">SYMBOL</th>
            <th style="padding:6px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">NAME</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">CHANGE</th>
          </tr></thead>
          <tbody>${spyRow}${etfRows}</tbody>
        </table>
      </div>`
  }

  // ── Fundamentals ─────────────────────────────────────────────────────────
  let fundHtml = ''
  if (selection.fundamentals && fundamentals) {
    const rows = tickers.map(t => {
      const f = fundamentals[t]
      if (!f) return ''
      return `<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:6px 12px;font-weight:600">${t}</td>
        <td style="padding:6px 12px;color:#71717a">${f.sector ?? '—'}</td>
        <td style="padding:6px 12px;text-align:right">${f.pegTTM?.toFixed(2) ?? '—'}</td>
        <td style="padding:6px 12px;text-align:right">${f.beta?.toFixed(2) ?? '—'}</td>
        <td style="padding:6px 12px;text-align:right">${f.netMarginTTM != null ? f.netMarginTTM.toFixed(1) + '%' : '—'}</td>
        <td style="padding:6px 12px;text-align:right">${f.forwardPE?.toFixed(1) ?? '—'}</td>
      </tr>`
    }).join('')

    fundHtml = `
      <div data-pdf-block="1" style="margin-bottom:24px">
        <div style="font-size:13px;font-weight:600;color:#18181b;margin-bottom:10px">Fundamentals</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#f4f4f5;border-bottom:1px solid #e4e4e7">
            <th style="padding:6px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">TICKER</th>
            <th style="padding:6px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">SECTOR</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">PEG</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">BETA</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">MARGIN</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">FWD PE</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
  }

  // ── Notes ────────────────────────────────────────────────────────────────
  let notesHtml = ''
  if (selection.notes) {
    const noteRows = batch.results
      .filter((r, i, arr) => r.note && arr.findIndex(x => x.ticker === r.ticker) === i)
      .map(r => `<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:6px 12px;font-weight:600">${r.ticker}</td>
        <td style="padding:6px 12px;color:#71717a">${r.note}</td>
      </tr>`).join('')

    if (noteRows) {
      notesHtml = `
        <div data-pdf-block="1" style="margin-bottom:24px">
          <div style="font-size:13px;font-weight:600;color:#18181b;margin-bottom:10px">Notes</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <tbody>${noteRows}</tbody>
          </table>
        </div>`
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Openbank Report — ${batch.date}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;padding:32px 24px}
    @media print{body{background:#fff;padding:16px}}
  </style>
</head>
<body>
  <div style="max-width:900px;margin:0 auto">

    <!-- Header -->
    <div data-pdf-block="1" style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #e4e4e7">
      <div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <div style="width:32px;height:32px;border-radius:8px;background:#18181b;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700">OB</div>
          <span style="font-size:13px;font-weight:600;color:#71717a">Openbank Price Prediction</span>
        </div>
        <div style="font-size:22px;font-weight:600;color:#18181b">Batch ${batch.date}</div>
        <div style="font-size:13px;color:#71717a;margin-top:4px;display:flex;align-items:center;gap:8px">
          ${dirBadge}
          <span>Generated ${now}</span>
        </div>
      </div>
    </div>

    ${summaryHtml}
    ${tableHtml}
    ${marketHtml}
    ${fundHtml}
    ${notesHtml}

    <!-- Footer -->
    <div data-pdf-block="1" style="margin-top:32px;padding-top:16px;border-top:1px solid #e4e4e7;text-align:center;font-size:11px;color:#a1a1aa">
      Openbank Price Prediction · Export generated ${now}
    </div>

  </div>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════
// Investment Candidates report — CSV and HTML builders
// ═══════════════════════════════════════════════════════════════════════════

const CRITERIA_LABEL = (c) =>
  `Score ≥ ${c.scoreMin} · Entry Quality ≥ ${c.eqMin} · Upside ${c.horizon} ≥ ${c.upsideMin}% · ` +
  `Market: ${c.market} · Trend: ${c.direction}`

function csvEscape(v) {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}
function toCsv(headers, rows) {
  const lines = [headers.map(csvEscape).join(',')]
  for (const row of rows) lines.push(row.map(csvEscape).join(','))
  return lines.join('\n')
}

function buildSummaryCsv(aggregated) {
  return toCsv(
    ['ticker', 'company', 'sector', 'market', 'instances', 'avg_score', 'avg_upside_1m', 'avg_upside_3m', 'avg_upside_6m', 'avg_upside_12m'],
    aggregated.map(r => [
      r.tDisplay, r.co, r.sector, r.market, r.instanceCount,
      r.avgScore != null ? r.avgScore.toFixed(1) : '',
      r.avgU1 != null ? r.avgU1.toFixed(1) : '',
      r.avgU3 != null ? r.avgU3.toFixed(1) : '',
      r.avgU6 != null ? r.avgU6.toFixed(1) : '',
      r.avgU12 != null ? r.avgU12.toFixed(1) : '',
    ])
  )
}

function buildInstancesCsv(filtered) {
  return toCsv(
    ['ticker', 'company', 'sector', 'market', 'direction', 'batch_date', 'score', 'peg', 'margin', 'upside_1m', 'upside_3m', 'upside_6m', 'upside_12m'],
    filtered.map(s => [
      s.tDisplay, s.co, s.sector, s.market, s.direction, s.batchDate,
      s.score ?? '', s.peg != null ? s.peg.toFixed(2) : '', s.margin != null ? s.margin.toFixed(1) : '',
      s.u1 != null ? s.u1.toFixed(1) : '', s.u3 != null ? s.u3.toFixed(1) : '',
      s.u6 != null ? s.u6.toFixed(1) : '', s.u12 != null ? s.u12.toFixed(1) : '',
    ])
  )
}

function buildCandidatesReportHtml(filtered, aggregated, criteria, contentSel) {
  const now = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  const pctCell = v => v == null
    ? '<td style="padding:6px 12px;text-align:right;color:#a1a1aa">—</td>'
    : `<td style="padding:6px 12px;text-align:right;font-weight:600;color:${v >= 0 ? '#166534' : '#991b1b'}">${v >= 0 ? '+' : ''}${v.toFixed(1)}%</td>`

  let summaryHtml = ''
  if (contentSel.summary) {
    const rows = aggregated.map(r => `
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:6px 12px;font-weight:600">${r.tDisplay}</td>
        <td style="padding:6px 12px;color:#71717a">${r.sector}</td>
        <td style="padding:6px 12px;text-align:right">${r.instanceCount}</td>
        <td style="padding:6px 12px;text-align:right;font-weight:600">${r.avgScore != null ? r.avgScore.toFixed(0) : '—'}</td>
        ${pctCell(r.avgU1)}${pctCell(r.avgU3)}${pctCell(r.avgU6)}${pctCell(r.avgU12)}
      </tr>`).join('')
    summaryHtml = `
      <div data-pdf-block="1" style="margin-bottom:24px">
        <div style="font-size:13px;font-weight:600;color:#18181b;margin-bottom:10px">Resumen por ticker (medias históricas)</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#f4f4f5;border-bottom:1px solid #e4e4e7">
            <th style="padding:6px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">TICKER</th>
            <th style="padding:6px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">SECTOR</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">INSTANCIAS</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">SCORE MEDIO</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">1M</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">3M</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">6M</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">12M</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="font-size:10.5px;color:#a1a1aa;margin-top:6px">
          Las medias usan TODAS las instancias históricas del ticker, no solo las que cumplen el filtro.
        </div>
      </div>`
  }

  let instancesHtml = ''
  if (contentSel.instances) {
    const rows = filtered.map(s => `
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:6px 12px;font-weight:600">${s.tDisplay}</td>
        <td style="padding:6px 12px;color:#71717a">${s.sector}</td>
        <td style="padding:6px 12px">${s.batchDate}</td>
        <td style="padding:6px 12px;text-align:right;font-weight:600">${s.score ?? '—'}</td>
        ${pctCell(s.u1)}${pctCell(s.u3)}${pctCell(s.u6)}${pctCell(s.u12)}
      </tr>`).join('')
    instancesHtml = `
      <div data-pdf-block="1" style="margin-bottom:24px">
        <div style="font-size:13px;font-weight:600;color:#18181b;margin-bottom:10px">Todas las instancias (${filtered.length})</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#f4f4f5;border-bottom:1px solid #e4e4e7">
            <th style="padding:6px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">TICKER</th>
            <th style="padding:6px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">SECTOR</th>
            <th style="padding:6px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">BATCH</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">SCORE</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">1M</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">3M</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">6M</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;font-size:11px;color:#71717a">12M</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
  }

  // ── Technical appendix (v7.22.5) — glossary + exact formulas + the
  // criteria actually used in THIS export + averaging methodology note.
  // Matches the mockup Alex approved. Kept as its own function (not inlined)
  // since it doesn't depend on filtered/aggregated data, only on criteria.
  let technicalHtml = ''
  if (contentSel.technical) {
    technicalHtml = `
      <div style="height:1px;background:#e4e4e7;margin:28px 0"></div>

      <div data-pdf-block="1">
        <div style="font-size:18px;font-weight:700;color:#18181b;margin-bottom:4px">Anexo técnico — Cómo se seleccionaron estos candidatos</div>
        <div style="font-size:12px;color:#71717a;margin-bottom:20px">Criterios aplicados en esta exportación, y cómo se calcula cada métrica.</div>

        <div style="font-size:13px;font-weight:600;color:#18181b;margin-bottom:10px">Criterios aplicados en este informe</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
          <thead><tr style="background:#f4f4f5;border-bottom:1px solid #e4e4e7">
            <th style="padding:6px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">CRITERIO</th>
            <th style="padding:6px 12px;text-align:left;font-weight:600;font-size:11px;color:#71717a">UMBRAL USADO</th>
          </tr></thead>
          <tbody>
            <tr style="border-bottom:1px solid #f0f0f0"><td style="padding:6px 12px">Score mínimo</td><td style="padding:6px 12px">${criteria.scoreMin}</td></tr>
            <tr style="border-bottom:1px solid #f0f0f0"><td style="padding:6px 12px">Entry Quality mínimo</td><td style="padding:6px 12px">${criteria.eqMin}</td></tr>
            <tr style="border-bottom:1px solid #f0f0f0"><td style="padding:6px 12px">Upside mínimo</td><td style="padding:6px 12px">${criteria.upsideMin}% (horizonte ${criteria.horizon})</td></tr>
            <tr style="border-bottom:1px solid #f0f0f0"><td style="padding:6px 12px">Mercado</td><td style="padding:6px 12px">${criteria.market === 'All' ? 'Todos' : criteria.market}</td></tr>
            <tr style="border-bottom:1px solid #f0f0f0"><td style="padding:6px 12px">Tendencia</td><td style="padding:6px 12px">${criteria.direction === 'All' ? 'Todas' : criteria.direction === 'bullish' ? 'Bullish' : 'Bearish'}</td></tr>
          </tbody>
        </table>
      </div>

      <div data-pdf-block="1">
        <div style="font-size:13px;font-weight:600;color:#18181b;margin-bottom:10px">Glosario de términos</div>
        <div style="margin-bottom:20px;padding:14px 16px;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px">
        <div style="margin-bottom:14px">
          <div style="font-size:12px;font-weight:700;color:#18181b;margin-bottom:6px">PEG <span style="font-weight:400;color:#71717a">(Price/Earnings to Growth)</span></div>
          <div style="font-size:12px;color:#3f3f46;line-height:1.6;margin-bottom:8px">Compara el precio de la acción con sus beneficios y con cuánto se espera que crezcan esos beneficios. Un PEG bajo (ej. por debajo de 1) sugiere que la acción podría estar barata para el crecimiento que se le espera; uno alto sugiere que ese crecimiento futuro ya está "pagado por adelantado" en el precio actual.</div>
          <div style="font-family:monospace;font-size:11px;background:#f4f4f5;padding:8px 10px;border-radius:6px;color:#18181b">PEG = PE (precio ÷ beneficio por acción) ÷ % de crecimiento de beneficios esperado</div>
        </div>
        <div style="margin-bottom:14px">
          <div style="font-size:12px;font-weight:700;color:#18181b;margin-bottom:6px">EPS <span style="font-weight:400;color:#71717a">(Earnings Per Share — beneficio por acción)</span></div>
          <div style="font-size:12px;color:#3f3f46;line-height:1.6">El beneficio neto de la empresa dividido entre el número de acciones en circulación. El "crecimiento de EPS" mide si ese beneficio por acción sube o baja respecto al periodo anterior — negativo significa que la empresa gana menos por acción que antes, una señal de alerta que el Score penaliza directamente.</div>
        </div>
        <div style="margin-bottom:14px">
          <div style="font-size:12px;font-weight:700;color:#18181b;margin-bottom:6px">Margen neto</div>
          <div style="font-size:12px;color:#3f3f46;line-height:1.6;margin-bottom:8px">El % de todo lo que factura la empresa que queda como beneficio real, después de restar todos los gastos e impuestos. Un margen neto alto indica que la empresa es eficiente convirtiendo ventas en beneficio.</div>
          <div style="font-family:monospace;font-size:11px;background:#f4f4f5;padding:8px 10px;border-radius:6px;color:#18181b">Margen neto = beneficio neto ÷ ingresos totales × 100</div>
        </div>
        <div>
          <div style="font-size:12px;font-weight:700;color:#18181b;margin-bottom:6px">Precio base / precio objetivo</div>
          <div style="font-size:12px;color:#3f3f46;line-height:1.6">Precio base: precio de la acción en el momento en que Openbank generó la previsión. Precio objetivo: precio que la previsión apunta para ese horizonte (1M/3M/6M/12M). El "upside" es la diferencia entre ambos, en %.</div>
        </div>
      </div>
      </div>

      <div data-pdf-block="1" style="margin-bottom:20px;padding:14px 16px;background:#fff;border:1px solid #e4e4e7;border-radius:8px">
        <div style="font-size:13px;font-weight:700;color:#18181b;margin-bottom:6px">Score (0–100)</div>
        <div style="font-size:12px;color:#3f3f46;line-height:1.6;margin-bottom:8px">Combina 3 datos del ticker en una sola puntuación: cuánto sube el precio objetivo a 12 meses (40% del peso), el PEG (45%), y el margen neto (15%). Resta 20 puntos si el crecimiento de beneficios (EPS) es negativo.</div>
        <div style="font-family:monospace;font-size:11px;background:#f4f4f5;padding:8px 10px;border-radius:6px;color:#18181b;margin-bottom:8px">Score = 40% × Upside₁₂ₘ + 45% × PEG + 15% × Margen − (20 si EPS growth &lt; 0)</div>
        <ul style="font-size:11px;color:#52525b;padding-left:18px;margin-bottom:8px">
          <li>Upside a 12M → &lt;0%: 0 pts · 0-10%: 20 · 10-20%: 40 · 20-30%: 65 · 30-50%: 85 · ≥50%: 100</li>
          <li>PEG → ≤0.5: 100 pts · ≤1.0: 85 · ≤1.5: 60 · ≤2.0: 30 · más o sin dato: 0</li>
          <li>Margen neto → &lt;5%: 20 pts · 5-15%: 50 · 15-25%: 75 · ≥25%: 100</li>
        </ul>
        <div style="font-size:11px;color:#b45309;background:#fffbeb;padding:6px 10px;border-radius:6px">⚠️ Necesita fundamentals cargados (sector/PEG/margen) para ese ticker. Si no los hay, el Score sale vacío — no es un "0", es que no se pudo calcular.</div>
      </div>

      <div data-pdf-block="1" style="margin-bottom:20px;padding:14px 16px;background:#fff;border:1px solid #e4e4e7;border-radius:8px">
        <div style="font-size:13px;font-weight:700;color:#18181b;margin-bottom:6px">Entry Quality (0–100)</div>
        <div style="font-size:12px;color:#3f3f46;line-height:1.6;margin-bottom:8px">Responde a "qué buen momento es este para entrar" — combina cuánto recorrido le queda al precio hasta el objetivo (el factor con más peso), el Score, y el PEG.</div>
        <div style="font-family:monospace;font-size:11px;background:#f4f4f5;padding:8px 10px;border-radius:6px;color:#18181b;margin-bottom:8px">Con Score → 50% × Upside(norm. 0-40%) + 35% × (Score/100) + 15% × PEG(norm.)<br>Sin Score → 75% × Upside(norm. 0-40%) + 25% × PEG(norm.)</div>
        <div style="font-size:11px;color:#b45309;background:#fffbeb;padding:6px 10px;border-radius:6px">⚠️ Si el ticker no tiene previsión de upside para el horizonte elegido, Entry Quality tampoco se puede calcular.</div>
      </div>

      <div data-pdf-block="1" style="margin-bottom:20px;padding:14px 16px;background:#fff;border:1px solid #e4e4e7;border-radius:8px">
        <div style="font-size:13px;font-weight:700;color:#18181b;margin-bottom:6px">Upside mínimo</div>
        <div style="font-size:12px;color:#3f3f46;line-height:1.6;margin-bottom:8px">El % de subida que la previsión original de Openbank apunta desde el precio base hasta el precio objetivo, para el horizonte elegido.</div>
        <div style="font-family:monospace;font-size:11px;background:#f4f4f5;padding:8px 10px;border-radius:6px;color:#18181b">Upside = (precio objetivo − precio base) / precio base × 100</div>
      </div>

      <div data-pdf-block="1" style="padding:14px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px">
        <div style="font-size:13px;font-weight:700;color:#18181b;margin-bottom:6px">Metodología de las medias (tabla "Resumen por ticker")</div>
        <div style="font-size:12px;color:#3f3f46;line-height:1.6">El Score y el Upside de la tabla de resumen son la media de TODAS las instancias históricas de ese ticker — no solo las que cumplen el filtro de arriba. El filtro decide qué tickers entran en el informe; la media usa el historial completo de cada uno para evitar un sesgo optimista (contar solo sus mejores predicciones pasadas falsearía la media al alza).</div>
      </div>`
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Openbank — Candidatos de Inversión</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;padding:32px 24px}
    @media print{body{background:#fff;padding:16px}}
  </style>
</head>
<body>
  <div style="max-width:900px;margin:0 auto">

    <div data-pdf-block="1" style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #e4e4e7">
      <div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <div style="width:32px;height:32px;border-radius:8px;background:#18181b;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700">OB</div>
          <span style="font-size:13px;font-weight:600;color:#71717a">Openbank Price Prediction</span>
        </div>
        <div style="font-size:22px;font-weight:600;color:#18181b">Candidatos de Inversión</div>
        <div style="font-size:12px;color:#71717a;margin-top:6px">${CRITERIA_LABEL(criteria)}</div>
        <div style="font-size:13px;color:#71717a;margin-top:4px">Generado ${now} · ${aggregated.length} tickers · ${filtered.length} instancias</div>
      </div>
    </div>

    ${summaryHtml}
    ${instancesHtml}
    ${technicalHtml}

    <div data-pdf-block="1" style="margin-top:32px;padding-top:16px;border-top:1px solid #e4e4e7;text-align:center;font-size:11px;color:#a1a1aa">
      Openbank Price Prediction · Export generated ${now}
    </div>

  </div>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared HTML→PDF pipeline (v7.22.0 — extracted from the original inline
// handleExportPdf so the new Investment Candidates PDF export reuses it
// instead of duplicating the iframe/html2canvas/jsPDF dance a second time)
//
// v7.22.6 — rewritten pagination. The original approach rendered the WHOLE
// document as one giant screenshot, then sliced that image at fixed
// pixel/mm intervals (one page-height at a time) with zero awareness of
// where any actual content sat — a table row, a formula box, a paragraph,
// could (and did — see Alex's screenshot) get cut clean through the middle
// wherever the arbitrary page boundary happened to land.
//
// Now: every top-level content section in buildReportHtml/
// buildCandidatesReportHtml is tagged `data-pdf-block="1"` (header, each
// table/section, each glossary/formula box, footer, etc.). This function
// screenshots and places each block INDIVIDUALLY: if a block would overflow
// the remaining space on the current page, a new page starts BEFORE that
// block instead of splitting it. Page breaks now always fall in the gap
// BETWEEN blocks, never through the middle of one — unless a single block
// is itself taller than a full page (rare given how these are sized; falls
// back to slicing just that one oversized block as a safety net).
// ═══════════════════════════════════════════════════════════════════════════
const PDF_BLOCK_GAP_MM = 5 // visual breathing room between blocks (their own
                            // CSS margin-bottom isn't captured by html2canvas
                            // since margin sits outside the element's own box)

async function renderHtmlToPdf(html, filename) {
  // Render in a hidden iframe to get accurate layout
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:900px;height:auto;border:none'
  document.body.appendChild(iframe)
  iframe.contentDocument.open()
  iframe.contentDocument.write(html)
  iframe.contentDocument.close()

  // Wait for iframe to render
  await new Promise(r => setTimeout(r, 500))

  const { default: html2canvas } = await import('html2canvas')
  const { jsPDF }                = await import('jspdf')

  const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW   = pdf.internal.pageSize.getWidth()
  const pageH   = pdf.internal.pageSize.getHeight()

  const blocks = Array.from(iframe.contentDocument.querySelectorAll('[data-pdf-block]'))

  // Fallback for any HTML that isn't block-tagged (shouldn't happen for the
  // two report builders above, but keeps this function safe to reuse
  // elsewhere without silently producing a blank PDF) — old blind-slice
  // behaviour.
  if (blocks.length === 0) {
    const canvas  = await html2canvas(iframe.contentDocument.body, { scale: 2, useCORS: true, logging: false, windowWidth: 900 })
    const imgData = canvas.toDataURL('image/png')
    const fullH   = (canvas.height * pageW) / canvas.width
    let yOffset = 0
    while (yOffset < fullH) {
      if (yOffset > 0) pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, -yOffset, pageW, fullH)
      yOffset += pageH
    }
    pdf.save(filename)
    document.body.removeChild(iframe)
    return
  }

  let cursorY        = 0
  let pageHasContent = false

  for (const block of blocks) {
    const canvas  = await html2canvas(block, { scale: 2, useCORS: true, logging: false, windowWidth: 900 })
    const blockH  = (canvas.height * pageW) / canvas.width
    const imgData = canvas.toDataURL('image/png')

    if (blockH > pageH) {
      // Safety net: a single block taller than a whole page — slice just
      // this one block rather than looping forever or squashing it. Starts
      // on a fresh page if the current one already has content, and always
      // leaves the NEXT block starting fresh too (simpler than tracking
      // leftover space after a multi-page slice; costs a little blank
      // space at worst, never a mid-content cut).
      if (pageHasContent) pdf.addPage()
      let yOffset = 0
      let firstSlice = true
      while (yOffset < blockH) {
        if (!firstSlice) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pageW, blockH)
        yOffset += pageH
        firstSlice = false
      }
      cursorY        = 0
      pageHasContent = false
      continue
    }

    if (pageHasContent && cursorY + blockH > pageH) {
      // Would overflow the current page — start a fresh page for this
      // block instead of cutting it.
      pdf.addPage()
      cursorY = 0
    }

    pdf.addImage(imgData, 'PNG', 0, cursorY, pageW, blockH)
    cursorY += blockH + PDF_BLOCK_GAP_MM
    pageHasContent = true
  }

  pdf.save(filename)
  document.body.removeChild(iframe)
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ExportPage({ batches = [], loadedBatchId, fundamentals = {} }) {

  // Report type — v7.22.0: 'batch' (existing, per-batch report) vs
  // 'candidates' (new, cross-batch Investment Candidates report)
  const [reportType, setReportType] = useState('batch')

  // Selected batch — default to currently loaded or most recent
  const [selectedBatchId, setSelectedBatchId] = useState(
    loadedBatchId ?? batches[0]?.id ?? ''
  )

  // Content selection — default: summary + table + market checked
  const [selection, setSelection] = useState({
    summary:      true,
    table:        true,
    market:       true,
    fundamentals: false,
    notes:        false,
  })

  const [exporting, setExporting] = useState(null) // 'html' | 'pdf' | null

  const selectedBatch = useMemo(
    () => batches.find(b => b.id === selectedBatchId) ?? null,
    [batches, selectedBatchId]
  )

  const anySelected = Object.values(selection).some(Boolean)

  // Toggle a content item
  const toggle = (id) => setSelection(prev => ({ ...prev, [id]: !prev[id] }))

  // Export as HTML — generate and download
  const handleExportHtml = () => {
    if (!selectedBatch || !anySelected) return
    setExporting('html')
    try {
      const html     = buildReportHtml(selectedBatch, selection, fundamentals)
      const blob     = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url      = URL.createObjectURL(blob)
      const a        = document.createElement('a')
      a.href         = url
      a.download     = `openbank_report_${selectedBatch.id}.html`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(null)
    }
  }

  // Export as PDF — render HTML in hidden iframe, use jsPDF + html2canvas
  const handleExportPdf = async () => {
    if (!selectedBatch || !anySelected) return
    setExporting('pdf')
    try {
      const html = buildReportHtml(selectedBatch, selection, fundamentals)
      await renderHtmlToPdf(html, `openbank_report_${selectedBatch.id}.pdf`)
    } catch (err) {
      console.error('[ExportPage] PDF error:', err)
      alert('PDF export failed. Try HTML export instead.')
    } finally {
      setExporting(null)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Investment Candidates report state + logic (v7.22.0)
  // ═══════════════════════════════════════════════════════════════════════

  const [criteria, setCriteria] = useState({
    scoreMin: 60, eqMin: 50, upsideMin: 10, horizon: '1M', market: 'All', direction: 'All',
  })
  const setCriterion = (key, val) => setCriteria(prev => ({ ...prev, [key]: val }))

  // v7.22.3 — which criterion's (?) help box is expanded, if any
  const [openHelp, setOpenHelp] = useState(null)
  const toggleHelp = (id) => setOpenHelp(prev => prev === id ? null : id)

  const [candSelection, setCandSelection] = useState({ summary: true, instances: true, technical: true })
  const toggleCand = (id) => setCandSelection(prev => ({ ...prev, [id]: !prev[id] }))
  const candAnySelected = Object.values(candSelection).some(Boolean)

  const [candExporting, setCandExporting] = useState(null) // 'csv-summary' | 'csv-instances' | 'html' | 'pdf' | null

  // Full flat pool — every ticker×batch instance, unfiltered (needed so the
  // averages can always draw on a ticker's FULL history, regardless of the
  // active filter — see aggregateByTicker's docstring).
  // v7.22.4 — the `fundamentals` prop only ever covers the CURRENTLY loaded
  // batch (it comes from useFundamentals() in App.jsx, swapped out whenever
  // you load a different batch — see restoreFundamentals()). Since this
  // report spans every historical instance across ALL batches, that alone
  // left almost everything with no sector/score. Mirrors AllStocksPage's
  // 3-layer merge: the persistent fundamentals_cache table (any ticker ever
  // fetched, regardless of which batch is open), each historical batch's
  // OWN saved fundamentals snapshot (batch.fundamentals — every batch stores
  // one when saved), and finally the active in-memory fundamentals as the
  // most recent override.
  const [cachedFundamentals, setCachedFundamentals] = useState({})
  useEffect(() => {
    loadFundamentalsCache().then(data => setCachedFundamentals(data))
  }, [])

  const allFundamentals = useMemo(() => {
    const merged = {}
    // Layer 1 — fundamentals_cache (persistent, any ticker ever fetched)
    Object.assign(merged, cachedFundamentals)
    // Layer 2 — each historical batch's own saved fundamentals (oldest→newest
    // so the newest batch's data wins on overlap)
    const sortedBatches = [...(batches ?? [])].sort((a, b) =>
      (parseBatchDate(a.date) ?? 0) - (parseBatchDate(b.date) ?? 0)
    )
    for (const batch of sortedBatches) {
      if (batch.fundamentals && typeof batch.fundamentals === 'object') {
        Object.assign(merged, batch.fundamentals)
      }
    }
    // Layer 3 — active-batch in-memory fundamentals (most recent override)
    if (fundamentals && typeof fundamentals === 'object') {
      Object.assign(merged, fundamentals)
    }
    return merged
  }, [cachedFundamentals, batches, fundamentals])

  const candidatePool = useMemo(() => buildCandidatePool(batches, allFundamentals), [batches, allFundamentals])

  const filteredCandidates = useMemo(
    () => filterCandidates(candidatePool, criteria),
    [candidatePool, criteria]
  )

  const aggregatedCandidates = useMemo(
    () => aggregateByTicker(candidatePool, filteredCandidates),
    [candidatePool, filteredCandidates]
  )

  // v7.22.2 — breakdown of WHY the pool is small/empty, shown in the warning
  // box so a surprising "0 candidates" isn't a black box.
  const diagnostics = useMemo(
    () => filterDiagnostics(candidatePool, criteria),
    [candidatePool, criteria]
  )

  function downloadText(text, filename, mime) {
    const blob = new Blob([text], { type: mime })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCandidatesCsvSummary = () => {
    setCandExporting('csv-summary')
    try {
      downloadText(buildSummaryCsv(aggregatedCandidates), 'openbank_candidates_summary.csv', 'text/csv;charset=utf-8')
    } finally {
      setCandExporting(null)
    }
  }

  const handleExportCandidatesCsvInstances = () => {
    setCandExporting('csv-instances')
    try {
      downloadText(buildInstancesCsv(filteredCandidates), 'openbank_candidates_instances.csv', 'text/csv;charset=utf-8')
    } finally {
      setCandExporting(null)
    }
  }

  const handleExportCandidatesHtml = () => {
    if (!candAnySelected) return
    setCandExporting('html')
    try {
      const html = buildCandidatesReportHtml(filteredCandidates, aggregatedCandidates, criteria, candSelection)
      downloadText(html, 'openbank_candidates_report.html', 'text/html;charset=utf-8')
    } finally {
      setCandExporting(null)
    }
  }

  const handleExportCandidatesPdf = async () => {
    if (!candAnySelected) return
    setCandExporting('pdf')
    try {
      const html = buildCandidatesReportHtml(filteredCandidates, aggregatedCandidates, criteria, candSelection)
      await renderHtmlToPdf(html, 'openbank_candidates_report.pdf')
    } catch (err) {
      console.error('[ExportPage] Candidates PDF error:', err)
      alert('PDF export failed. Try HTML export instead.')
    } finally {
      setCandExporting(null)
    }
  }

  // Empty state
  if (!batches.length) {
    return (
      <Card className="flex flex-col items-center justify-center p-16 text-center gap-3">
        <Download size={32} className="text-muted-foreground" />
        <div>
          <div className="text-[14px] font-semibold mb-1">No batches saved</div>
          <div className="text-[12px] text-muted-foreground">Save a batch first to export it.</div>
        </div>
      </Card>
    )
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {/* v7.20.7: was `max-w-2xl` — capped the whole page at 672px regardless
          of available space, so it never used the extra room freed up by
          collapsing the sidebar or widening the browser window. Other pages
          (e.g. AllStocksPage) have no max-w cap at all and just fill <main>'s
          full width — matched that same pattern here. */}

      {/* ── Report type (v7.22.0) ─────────────────────────────────────── */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setReportType('batch')}
            className={cn(
              'text-left p-3 rounded-lg border cursor-pointer transition-colors',
              reportType === 'batch' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/30'
            )}
          >
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
              <FileCode size={14} /> Informe de batch
            </div>
            <div className="text-[10.5px] text-muted-foreground mt-0.5">Un batch concreto — resumen, tabla de predicciones, mercado, fundamentals</div>
          </button>
          <button
            type="button"
            onClick={() => setReportType('candidates')}
            className={cn(
              'text-left p-3 rounded-lg border cursor-pointer transition-colors',
              reportType === 'candidates' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/30'
            )}
          >
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
              <Target size={14} /> Candidatos de inversión
            </div>
            <div className="text-[10.5px] text-muted-foreground mt-0.5">Todos los tickers, filtrados por tus criterios — para tu proyecto de estrategias</div>
          </button>
        </div>
      </Card>

      {reportType === 'batch' && (
        <>
          {/* ── Step 1: Select batch ──────────────────────────────────────── */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground border border-border">1</span>
              <span className="text-[13px] font-medium">Select batch</span>
            </div>
            <select
              value={selectedBatchId}
              onChange={e => setSelectedBatchId(e.target.value)}
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-border bg-background text-foreground cursor-pointer"
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.date} — {b.stocks} stocks · {b.direction === 'bearish' ? '📉 Bearish' : '📈 Bullish'}
                  {b.id === loadedBatchId ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </Card>

          {/* ── Step 2: Select content ────────────────────────────────────── */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground border border-border">2</span>
              <span className="text-[13px] font-medium">Select content to include</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {CONTENT_ITEMS.map(item => (
                <label
                  key={item.id}
                  className={cn(
                    'flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors',
                    selection[item.id]
                      ? 'border-foreground/30 bg-muted/50'
                      : 'border-border hover:bg-muted/30'
                  )}
                  onClick={() => toggle(item.id)}
                >
                  <input
                    type="checkbox"
                    checked={selection[item.id]}
                    onChange={() => toggle(item.id)}
                    onClick={e => e.stopPropagation()}
                    className="mt-0.5 cursor-pointer accent-foreground"
                  />
                  <div>
                    <div className="text-[12px] font-medium text-foreground leading-tight">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Preview badges */}
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
              <span className="text-[10px] text-muted-foreground mr-1">Will include:</span>
              {CONTENT_ITEMS.map(item => (
                <span
                  key={item.id}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors',
                    selection[item.id]
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-muted text-muted-foreground border-border'
                  )}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </Card>

          {/* ── Step 3: Export ────────────────────────────────────────────── */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground border border-border">3</span>
              <span className="text-[13px] font-medium">Export format</span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2 text-[13px]"
                disabled={!anySelected || !selectedBatch || exporting !== null}
                onClick={handleExportHtml}
              >
                <FileCode size={15} />
                {exporting === 'html' ? 'Generating…' : 'Export HTML'}
              </Button>
              <Button
                className="flex-1 gap-2 text-[13px] bg-foreground text-background hover:bg-foreground/90"
                disabled={!anySelected || !selectedBatch || exporting !== null}
                onClick={handleExportPdf}
              >
                <FileType size={15} />
                {exporting === 'pdf' ? 'Generating…' : 'Export PDF'}
              </Button>
            </div>
            <div className="text-[11px] text-muted-foreground text-center mt-2">
              HTML — opens in browser · PDF — A4 document, multi-page if needed
            </div>
          </Card>
        </>
      )}

      {reportType === 'candidates' && (
        <>
          {/* ── Step 1: Criteria (v7.22.0) ────────────────────────────────── */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground border border-border">1</span>
              <span className="text-[13px] font-medium">Criterios de selección</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Score mínimo<CriterionHelp id="score" open={openHelp === 'score'} onToggle={toggleHelp} />
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min="0" max="100" value={criteria.scoreMin}
                    onChange={e => setCriterion('scoreMin', Number(e.target.value))}
                    className="flex-1 accent-foreground"
                  />
                  <span className="text-[11.5px] font-bold w-8 text-right">{criteria.scoreMin}</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Entry Quality mínimo<CriterionHelp id="eq" open={openHelp === 'eq'} onToggle={toggleHelp} />
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min="0" max="100" value={criteria.eqMin}
                    onChange={e => setCriterion('eqMin', Number(e.target.value))}
                    className="flex-1 accent-foreground"
                  />
                  <span className="text-[11.5px] font-bold w-8 text-right">{criteria.eqMin}</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Upside mínimo<CriterionHelp id="upside" open={openHelp === 'upside'} onToggle={toggleHelp} />
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min="0" max="100" value={criteria.upsideMin}
                    onChange={e => setCriterion('upsideMin', Number(e.target.value))}
                    className="flex-1 accent-foreground"
                  />
                  <span className="text-[11.5px] font-bold w-10 text-right">{criteria.upsideMin}%</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Horizonte para el upside</label>
                <div className="flex gap-1.5">
                  {['1M', '3M', '6M', '12M'].map(h => (
                    <button
                      key={h} type="button" onClick={() => setCriterion('horizon', h)}
                      className={cn(
                        'text-[10.5px] font-bold px-2.5 py-1 rounded-full border transition-colors',
                        criteria.horizon === h ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border'
                      )}
                    >{h}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Mercado</label>
                <div className="flex gap-1.5 flex-wrap">
                  {['All', 'US', 'DE', 'MC'].map(m => (
                    <button
                      key={m} type="button" onClick={() => setCriterion('market', m)}
                      className={cn(
                        'text-[10.5px] font-bold px-2.5 py-1 rounded-full border transition-colors',
                        criteria.market === m ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border'
                      )}
                    >{m === 'All' ? 'Todos' : m}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Tendencia</label>
                <div className="flex gap-1.5 flex-wrap">
                  {[['All', 'Todas'], ['bullish', '📈 Bullish'], ['bearish', '📉 Bearish']].map(([val, lbl]) => (
                    <button
                      key={val} type="button" onClick={() => setCriterion('direction', val)}
                      className={cn(
                        'text-[10.5px] font-bold px-2.5 py-1 rounded-full border transition-colors',
                        criteria.direction === val ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border'
                      )}
                    >{lbl}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* v7.22.1: was a thin gray line, easy to miss — now a prominent
                colored box, with a clear warning state when 0 tickers match
                (this is exactly the situation that produced empty reports
                before the button-disabling fix below).
                v7.22.2: added a per-criterion breakdown when empty, so a
                surprising "0 candidates" isn't a black box — shows how many
                of the pool have no score/no upside data for this horizon,
                which is what usually causes this at low thresholds. */}
            <div className={cn(
              'flex flex-col gap-1.5 mt-4 px-3.5 py-2.5 rounded-lg text-[12px] font-medium',
              aggregatedCandidates.length === 0
                ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                : 'bg-primary/10 text-foreground'
            )}>
              {aggregatedCandidates.length === 0 ? (
                <>
                  <div>⚠️ Ningún ticker cumple estos criterios — baja los umbrales para ver candidatos.</div>
                  <div className="text-[11px] font-normal opacity-90">
                    De {diagnostics.total} instancias totales: <b>{diagnostics.noScore}</b> sin score (fundamentals no cargados),{' '}
                    <b>{diagnostics.noUpside}</b> sin previsión a {criteria.horizon} · sube el Score/Entry Quality/Upside mínimo
                    solo si quieres exigirlos — a 0 no descartan nada por falta de datos.
                  </div>
                </>
              ) : (
                <>
                  ✅ Coinciden <b>{filteredCandidates.length}</b> instancias de{' '}
                  <b>{aggregatedCandidates.length}</b> tickers únicos{' '}
                  <span className="text-muted-foreground font-normal">
                    (de {candidatePool.length} instancias / {new Set(candidatePool.map(s => s.tNorm)).size} totales)
                  </span>
                </>
              )}
            </div>
          </Card>

          {/* ── Step 2: Content ────────────────────────────────────────────── */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground border border-border">2</span>
              <span className="text-[13px] font-medium">Contenido a incluir (HTML/PDF)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={cn('flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors',
                  candSelection.summary ? 'border-foreground/30 bg-muted/50' : 'border-border hover:bg-muted/30')}
                onClick={() => toggleCand('summary')}
              >
                <input type="checkbox" checked={candSelection.summary} onChange={() => toggleCand('summary')} onClick={e => e.stopPropagation()} className="mt-0.5 cursor-pointer accent-foreground" />
                <div>
                  <div className="text-[12px] font-medium text-foreground leading-tight">Resumen por ticker (medias)</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">1 fila por ticker · media histórica de upside por horizonte</div>
                </div>
              </label>
              <label
                className={cn('flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors',
                  candSelection.instances ? 'border-foreground/30 bg-muted/50' : 'border-border hover:bg-muted/30')}
                onClick={() => toggleCand('instances')}
              >
                <input type="checkbox" checked={candSelection.instances} onChange={() => toggleCand('instances')} onClick={e => e.stopPropagation()} className="mt-0.5 cursor-pointer accent-foreground" />
                <div>
                  <div className="text-[12px] font-medium text-foreground leading-tight">Todas las instancias</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">1 fila por ticker×batch que cumple el filtro</div>
                </div>
              </label>
              <label
                className={cn('flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors sm:col-span-2',
                  candSelection.technical ? 'border-foreground/30 bg-muted/50' : 'border-border hover:bg-muted/30')}
                onClick={() => toggleCand('technical')}
              >
                <input type="checkbox" checked={candSelection.technical} onChange={() => toggleCand('technical')} onClick={e => e.stopPropagation()} className="mt-0.5 cursor-pointer accent-foreground" />
                <div>
                  <div className="text-[12px] font-medium text-foreground leading-tight">Explicación técnica de los filtros</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Anexo al final del informe: glosario (PEG, EPS, margen neto...), fórmulas exactas de Score/Entry Quality/Upside, criterios aplicados en esta exportación, y metodología de las medias — para compartir el informe sin depender de la app</div>
                </div>
              </label>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">Nota: los CSV siempre exportan sus propios datos completos, independientemente de estas casillas (que solo afectan a HTML/PDF).</div>
          </Card>

          {/* ── Step 3: Export ────────────────────────────────────────────── */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground border border-border">3</span>
              <span className="text-[13px] font-medium">Exportar</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button variant="outline" className="gap-1.5 text-[12px]" disabled={aggregatedCandidates.length === 0 || candExporting !== null} onClick={handleExportCandidatesCsvSummary}>
                <Download size={14} /> {candExporting === 'csv-summary' ? '…' : 'CSV resumen'}
              </Button>
              <Button variant="outline" className="gap-1.5 text-[12px]" disabled={filteredCandidates.length === 0 || candExporting !== null} onClick={handleExportCandidatesCsvInstances}>
                <Download size={14} /> {candExporting === 'csv-instances' ? '…' : 'CSV instancias'}
              </Button>
              <Button variant="outline" className="gap-1.5 text-[12px]" disabled={!candAnySelected || filteredCandidates.length === 0 || candExporting !== null} onClick={handleExportCandidatesHtml}>
                <FileCode size={14} /> {candExporting === 'html' ? '…' : 'HTML'}
              </Button>
              <Button className="gap-1.5 text-[12px] bg-foreground text-background hover:bg-foreground/90" disabled={!candAnySelected || filteredCandidates.length === 0 || candExporting !== null} onClick={handleExportCandidatesPdf}>
                <FileType size={14} /> {candExporting === 'pdf' ? '…' : 'PDF'}
              </Button>
            </div>
            {aggregatedCandidates.length === 0 && (
              <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-2">
                Los botones están desactivados: ningún ticker cumple los criterios del Paso 1.
              </div>
            )}
          </Card>

          {/* ── Preview ────────────────────────────────────────────────────── */}
          {aggregatedCandidates.length > 0 && (
            <Card className="p-5">
              <div className="text-[13px] font-medium mb-3">Vista previa — resumen por ticker</div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-2.5 py-2 text-left font-semibold text-muted-foreground">Ticker</th>
                      <th className="px-2.5 py-2 text-left font-semibold text-muted-foreground">Sector</th>
                      <th className="px-2.5 py-2 text-right font-semibold text-muted-foreground">Inst.</th>
                      <th className="px-2.5 py-2 text-right font-semibold text-muted-foreground">Score</th>
                      <th className="px-2.5 py-2 text-right font-semibold text-muted-foreground">1M</th>
                      <th className="px-2.5 py-2 text-right font-semibold text-muted-foreground">3M</th>
                      <th className="px-2.5 py-2 text-right font-semibold text-muted-foreground">6M</th>
                      <th className="px-2.5 py-2 text-right font-semibold text-muted-foreground">12M</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedCandidates.slice(0, 15).map(r => (
                      <tr key={r.tNorm} className="border-b border-border">
                        <td className="px-2.5 py-1.5 font-bold">{r.tDisplay}</td>
                        <td className="px-2.5 py-1.5 text-muted-foreground">{r.sector}</td>
                        <td className="px-2.5 py-1.5 text-right">{r.instanceCount}</td>
                        <td className="px-2.5 py-1.5 text-right font-bold">{r.avgScore != null ? r.avgScore.toFixed(0) : '—'}</td>
                        {[r.avgU1, r.avgU3, r.avgU6, r.avgU12].map((v, i) => (
                          <td key={i} className={cn('px-2.5 py-1.5 text-right font-semibold', v == null ? 'text-muted-foreground' : v >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
                            {v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {aggregatedCandidates.length > 15 && (
                  <div className="text-[10.5px] text-muted-foreground text-center mt-2">
                    Mostrando 15 de {aggregatedCandidates.length} — el informe exportado incluye todos
                  </div>
                )}
              </div>
              <div className="text-[10.5px] text-muted-foreground mt-3 pt-3 border-t border-dashed border-border">
                ℹ️ Score y upside son la media de TODAS las instancias históricas del ticker, no solo las que cumplen el filtro.
              </div>
            </Card>
          )}
        </>
      )}

    </div>
  )
}
