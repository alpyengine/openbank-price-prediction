/**
 * HelpPage
 *
 * Help & About page — accessible from the sidebar.
 *
 * Sections:
 *   1. What is this app — brief intro
 *   2. How to use — step by step workflow with screenshot
 *   3. Verdict system — explanation of hit/exceeded/close/miss/wrong_way
 *   4. Snapshot thresholds — the fixed params used for Supabase storage
 *   5. All Stocks — picks, filters, entry metrics, duplicate rows & detail card
 *   6. Verify your data — SQL queries to check Supabase is storing correctly
 */
import { SNAPSHOT_PARAMS } from '@/utils/stocks.js'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <Card className="mb-5">
      <CardHeader className="py-3 px-5 border-b border-border">
        <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
      </CardHeader>
      <CardContent className="py-4 px-5">
        {children}
      </CardContent>
    </Card>
  )
}

// ── Step in the workflow ──────────────────────────────────────────────────────
function Step({ number, emoji, title, children }) {
  return (
    <div className="flex gap-4 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[13px] font-bold shrink-0">
        {number}
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-semibold text-foreground mb-1">
          {emoji} {title}
        </div>
        <div className="text-[12px] text-muted-foreground leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Verdict badge ─────────────────────────────────────────────────────────────
function VerdictBadge({ verdict }) {
  const config = {
    exceeded:  { label: '🔵 Exceeded',  bg: 'bg-blue-50',   text: 'text-blue-700'   },
    hit:       { label: '🟢 Hit',       bg: 'bg-green-50',  text: 'text-green-700'  },
    close:     { label: '🟡 Close',     bg: 'bg-amber-50',  text: 'text-amber-700'  },
    miss:      { label: '🔴 Miss',      bg: 'bg-red-50',    text: 'text-red-700'    },
    wrong_way: { label: '🟣 Wrong way', bg: 'bg-purple-50', text: 'text-purple-700' },
  }
  const c = config[verdict]
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

// ── SQL block ─────────────────────────────────────────────────────────────────
function SQL({ children }) {
  return (
    <pre className="bg-muted rounded-lg p-3 text-[11px] font-mono text-foreground overflow-x-auto mt-2 mb-1 leading-relaxed">
      {children}
    </pre>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HelpPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-foreground">Help & About</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          How to use the app, how predictions are evaluated, and how to verify your data.
        </p>
      </div>

      {/* ── 1. What is this app ──────────────────────────────────────── */}
      <Section title="What is this app?">
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Openbank Price Prediction</strong> tracks
          the accuracy of Openbank AI price forecasts for stocks over 1M, 3M, 6M and 12M horizons.
        </p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">
          You import targets from the Openbank app, fetch real market prices,
          and the app evaluates whether each forecast was a Hit, Exceeded, Close, Miss or Wrong way —
          building a growing track record of AI prediction accuracy over time.
        </p>
      </Section>

      {/* ── 2. How to use ────────────────────────────────────────────── */}
      <Section title="How to use — step by step">

        <Step number="1" emoji="📱" title="Take a screenshot in the Openbank app">
          Open the Openbank app → search for a stock → go to <em>Previsiones de precio</em>.
          Take a screenshot showing the price targets for 1M, 3M, 6M and 12M horizons.
        </Step>

        {/* Screenshot placeholder — replace openbank-screenshot.jpg in /public/ */}
        <div className="my-4 rounded-lg border border-dashed border-border overflow-hidden bg-muted/30">
          <img
            src="/openbank-screenshot.jpg"
            alt="Openbank forecast screen example"
            className="w-full max-w-sm mx-auto block"
            onError={e => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextSibling.style.display = 'flex'
            }}
          />
          <div
            className="hidden items-center justify-center p-8 text-center text-muted-foreground text-[12px]"
            style={{ display: 'none' }}
          >
            <div>
              <div className="text-2xl mb-2">📱</div>
              <div className="font-semibold mb-1">Screenshot placeholder</div>
              <div>Add <code className="bg-muted px-1 rounded">openbank-screenshot.jpg</code> to the <code className="bg-muted px-1 rounded">/public/</code> folder</div>
            </div>
          </div>
        </div>

        <Step number="2" emoji="💬" title="Process the screenshot with Claude">
          Open a new Claude chat. Attach the screenshot and write:
          <div className="mt-1.5 bg-muted rounded px-3 py-2 font-mono text-[11px]">
            "procesa este screenshot con el skill openbank-tradingview"
          </div>
          Claude will extract the price targets and generate a CSV file for you to download.
        </Step>

        <Step number="3" emoji="📥" title="Import the CSV">
          In this app → <strong>Import CSV</strong> in the sidebar.
          Select the CSV file generated by Claude.
          The batch will load with all tickers and their price targets.
        </Step>

        <Step number="4" emoji="🔄" title="Fetch market data">
          With the batch loaded, click the buttons in the top bar:
          <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
            <li><strong>↓ Fetch prices</strong> — current market price for each stock</li>
            <li><strong>↓ Fundamentals</strong> — PEG ratio, net margin, sector (from Finnhub)</li>
            <li><strong>↓ Market data</strong> — SPY, sector ETFs for relative performance</li>
          </ul>
        </Step>

        <Step number="5" emoji="📊" title="Analyse your batch">
          <ul className="mt-1 space-y-0.5 list-disc list-inside">
            <li><strong>Batch Overview</strong> — quick table with verdict badges per horizon</li>
            <li><strong>Batch Overview Detail</strong> — full analysis with colour bars, fundamentals, market comparison</li>
            <li><strong>All Stocks</strong> — ranking by Score and Upside across all batches</li>
          </ul>
        </Step>

        <Step number="6" emoji="💾" title="Save to Supabase">
          Click <strong>💾 Save batch</strong>. The app evaluates each prediction using
          fixed snapshot thresholds (see below) and stores the results permanently in Supabase.
          Your batch will appear in <strong>Accuracy Stats</strong> and contribute to the
          cumulative track record.
        </Step>
      </Section>

      {/* ── 3. Verdict system ────────────────────────────────────────── */}
      <Section title="How predictions are evaluated">
        <p className="text-[12px] text-muted-foreground mb-3">
          Each prediction is <strong>direction-aware</strong>. The direction is determined by
          comparing the target price to the base price at batch creation:
        </p>

        <div className="flex gap-4 mb-4 text-[12px]">
          <div className="flex-1 bg-green-50 rounded-lg p-3 border border-green-100">
            <div className="font-semibold text-green-700 mb-1">📈 Bullish</div>
            <div className="text-green-700">target &gt; base price<br/>Openbank expects the stock to rise</div>
          </div>
          <div className="flex-1 bg-red-50 rounded-lg p-3 border border-red-100">
            <div className="font-semibold text-red-700 mb-1">📉 Bearish</div>
            <div className="text-red-700">target &lt; base price<br/>Openbank expects the stock to fall</div>
          </div>
        </div>

        {/* Verdict table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-muted">
                {['Verdict', 'Condition (bullish example)', 'Counts as', 'Color'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  v: 'exceeded',
                  condition: 'Price surpassed target by more than H% (e.g. target $100, price $108 with H=5%)',
                  counts: 'Success — Hit Rate extended',
                },
                {
                  v: 'hit',
                  condition: 'Price is within ±H% of target (e.g. target $100, price $97–$105 with H=5%)',
                  counts: 'Success — both Hit Rates',
                },
                {
                  v: 'close',
                  condition: 'Price missed but within close zone: −H% to −(H×R)% of target',
                  counts: 'Not a success',
                },
                {
                  v: 'miss',
                  condition: 'Price more than −(H×R)% below target — clearly didn\'t reach forecast',
                  counts: 'Not a success',
                },
                {
                  v: 'wrong_way',
                  condition: 'Price moved in opposite direction: bullish but fell below base price',
                  counts: 'Not a success',
                },
              ].map(row => (
                <tr key={row.v} className="border-t border-border">
                  <td className="px-3 py-2"><VerdictBadge verdict={row.v} /></td>
                  <td className="px-3 py-2 text-muted-foreground">{row.condition}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.counts}</td>
                  <td className="px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">
                      {row.v === 'exceeded' ? '🔵 Blue' : row.v === 'hit' ? '🟢 Green' : row.v === 'close' ? '🟡 Amber' : row.v === 'miss' ? '🔴 Red' : '🟣 Purple'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-muted-foreground mt-3">
          <strong>Hit Rate pure</strong> = hits ÷ evaluated ·
          <strong> Hit Rate extended</strong> = (hits + exceeded) ÷ evaluated
        </p>
      </Section>

      {/* ── 4. Snapshot thresholds ───────────────────────────────────── */}
      <Section title="Fixed snapshot thresholds (used when saving)">
        <p className="text-[12px] text-muted-foreground mb-3">
          When you click <strong>Save batch</strong>, predictions are evaluated using these
          fixed thresholds — regardless of the slider in Batch Details.
          This ensures all batches in Accuracy Stats are comparable.
        </p>

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-muted">
                {['Horizon', 'H (hit margin)', 'R (close ratio)', '🔵 Exceeded', '🟢 Hit', '🟡 Close', '🔴 Miss'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(SNAPSHOT_PARAMS).map(([h, p]) => {
                const ct = +(p.H * p.R).toFixed(1)
                return (
                  <tr key={h} className="border-t border-border">
                    <td className="px-3 py-2 font-bold">{h}</td>
                    <td className="px-3 py-2 font-semibold text-primary">±{p.H}%</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.R}×</td>
                    <td className="px-3 py-2 text-blue-600 font-semibold">&gt;+{p.H}%</td>
                    <td className="px-3 py-2 text-green-600 font-semibold">±{p.H}%</td>
                    <td className="px-3 py-2 text-amber-600 font-semibold">−{p.H}% to −{ct}%</td>
                    <td className="px-3 py-2 text-red-600 font-semibold">&lt;−{ct}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-muted-foreground mt-2">
          Example with 3M horizon (H=5%, R=2.0, target=$100):
          Exceeded ≥$105 · Hit $95–$105 · Close $90–$95 · Miss &lt;$90
        </p>
      </Section>

      {/* ── 5. All Stocks — Top picks & filters ───────────────────────── */}
      <Section title="All Stocks — picks, filters &amp; detail card">
        <p className="text-sm text-muted-foreground mb-4">
          The <strong>All Stocks</strong> page consolidates every ticker across all your batches into a single ranked view.
          When the same ticker appears in several batches it now shows <strong>one row per batch</strong>, grouped together
          newest&nbsp;→&nbsp;oldest: the most recent row carries the avatar and a <strong>latest</strong> pill, while older rows are
          indented with a <strong>↳</strong> marker and muted. Each row links to <em>its own</em> batch. Applying <em>Best only</em>
          or the search box collapses each ticker back to its most recent row.
        </p>

        <div className="text-[13px] font-semibold mb-2">Top 5 picks</div>
        <p className="text-sm text-muted-foreground mb-3">
          The five cards at the top always show the best candidates from your entire stock universe —
          independent of any active filters. Two ranking criteria are available via the toggle:
        </p>
        <ul className="text-sm text-muted-foreground space-y-1.5 mb-4 list-none pl-0">
          <li className="flex gap-2">
            <span className="font-semibold text-foreground min-w-[56px]">Upside</span>
            <span>
              Default. Ranks by expected % gain from batch base price to Openbank target for the selected horizon (1M/3M/6M).
              Works for all tickers — no fundamentals required. Only tickers with upside &gt; 0 qualify.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground min-w-[56px]">Score</span>
            <span>
              Ranks by Investment Score (0–100). Only tickers with fundamentals loaded via <em>Refresh Fundamentals</em> appear.
              Use this when you want to weight valuation quality alongside upside.
            </span>
          </li>
        </ul>
        <p className="text-sm text-muted-foreground mb-4">
          Clicking a pick card navigates directly to that ticker's batch in Batch Overview.
          The Investment Score badge is shown on each card when available — even when sorting by upside.
          A <strong>sector selector</strong> next to the toggle narrows the picks to a single sector (e.g. Technology);
          the picks header always stays visible and shows an empty state when no ticker matches.
        </p>

        <div className="text-[13px] font-semibold mb-2">Investment Score (0–100)</div>
        <p className="text-sm text-muted-foreground mb-2">
          Combines three factors into a single number to help prioritise tickers:
        </p>
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="px-3 py-2 text-left font-semibold border border-border">Factor</th>
                <th className="px-3 py-2 text-left font-semibold border border-border">Weight</th>
                <th className="px-3 py-2 text-left font-semibold border border-border">What it measures</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 border border-border font-medium">Upside</td>
                <td className="px-3 py-2 border border-border">40%</td>
                <td className="px-3 py-2 border border-border">% gain from base price to Openbank target (u12 → u6 → u3 fallback)</td>
              </tr>
              <tr className="bg-muted/30">
                <td className="px-3 py-2 border border-border font-medium">PEG ratio</td>
                <td className="px-3 py-2 border border-border">45%</td>
                <td className="px-3 py-2 border border-border">Price/earnings-to-growth — lower means better value. Requires Finnhub data.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border border-border font-medium">Net Margin</td>
                <td className="px-3 py-2 border border-border">15%</td>
                <td className="px-3 py-2 border border-border">Profitability quality factor. Requires Finnhub data.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mb-1">
          A <span className="font-semibold">−20 penalty</span> is applied if EPS growth is negative (value trap signal).
          Upside uses 12M as primary horizon with automatic fallback to 6M then 3M — so batches without 12M are scored correctly.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Score badges: <span className="font-bold text-violet-600">80+</span> purple ·{' '}
          <span className="font-bold text-blue-600">60+</span> blue ·{' '}
          <span className="font-bold text-amber-600">40+</span> amber ·{' '}
          below 40 grey. A <span className="font-semibold">null score (—)</span> means fundamentals
          have not been loaded for that ticker — run <em>Refresh Fundamentals</em> in Batch Overview.
        </p>

        <div className="text-[13px] font-semibold mb-2">Best only filter</div>
        <p className="text-sm text-muted-foreground mb-2">
          The <strong>⚡ Best only</strong> button in the filter bar applies two conditions at once to cut through the noise:
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 mb-3 pl-4 list-disc">
          <li><strong>Upside &gt; 0</strong> for the selected horizon — always applied. Hides tickers where the forecast is negative.</li>
          <li><strong>Score ≥ 60</strong> — applied only when the ticker has fundamentals loaded. Tickers without a score are kept so high-upside stocks without fundamentals are never hidden.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Best only can be combined with the market, sector and PEG filters for more targeted views.
          Toggle it off to return to the full list.
        </p>

        <div className="text-[13px] font-semibold mb-2 mt-5">Find a ticker</div>
        <p className="text-sm text-muted-foreground mb-4">
          The search box filters the table live by <strong>ticker or company name</strong> and offers a suggestions dropdown.
          Picking a suggestion scrolls to that row and briefly highlights it. While a search is active each ticker collapses
          to its most recent row.
        </p>

        <div className="text-[13px] font-semibold mb-2">Horizon selector &amp; sortable columns</div>
        <p className="text-sm text-muted-foreground mb-4">
          The <strong>1M / 3M / 6M / 12M</strong> pill in the filter bar chooses which horizon the Upside and
          Left-to-target columns refer to. <strong>Every column is sortable</strong> — click a header to sort ascending,
          click again to reverse (empty values always sort last). When a ticker has several batch rows, sorting reorders the
          whole group while keeping its rows together, newest first within the group.
        </p>

        <div className="text-[13px] font-semibold mb-2">Entry Quality &amp; Entry Momentum</div>
        <p className="text-sm text-muted-foreground mb-2">
          Two columns help judge whether a stock is a good entry right now (they replace the old sparkline):
        </p>
        <ul className="text-sm text-muted-foreground space-y-1.5 mb-4 list-none pl-0">
          <li className="flex gap-2">
            <span className="font-semibold text-foreground min-w-[120px]">Entry Quality</span>
            <span>
              A 0–100 badge blending remaining upside, Investment Score and PEG. Colour-coded like Score
              (<span className="font-bold text-violet-600">80+</span> purple ·
              <span className="font-bold text-blue-600"> 60+</span> blue ·
              <span className="font-bold text-amber-600"> 40+</span> amber · below 40 grey). When fundamentals are missing it is
              computed from upside and PEG only and marked with a <strong>~</strong>.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground min-w-[120px]">Entry Momentum</span>
            <span>
              A pill with a trend arrow — <strong>Strong</strong>, <strong>Building</strong>, <strong>Late</strong> or
              <strong> Missed</strong> — derived from how much upside remains plus the recent weekly trend, to flag whether the
              move is still ahead or largely played out.
            </span>
          </li>
        </ul>

        <div className="text-[13px] font-semibold mb-2">Expandable detail card</div>
        <p className="text-sm text-muted-foreground mb-2">
          Clicking a row (anywhere except the ticker or the TradingView button) expands a read-only detail card inline,
          marked by a <strong>▸ / ▾</strong> chevron. It mirrors the Batch Overview card and contains:
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 mb-3 pl-4 list-disc">
          <li>The four <strong>horizon boxes</strong> (1M/3M/6M/12M) with target, date and verdict. Expired horizons show the
            real close and a hit/miss verdict; horizons still open show the live comparison to today's price.</li>
          <li>A <strong>Fundamentals</strong> panel (sector, industry, market cap, PEG, margins, …).</li>
          <li>A <strong>price chart</strong> button.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Clicking the <strong>ticker</strong> itself instead navigates to that ticker inside its batch in Batch Overview
          (with auto-scroll and highlight). The card is read-only — price overrides and notes stay in Batch Overview.
        </p>
      </Section>

      {/* ── 6. Verify your data in Supabase ──────────────────────────── */}
      <Section title="Verify your data in Supabase">
        <p className="text-[12px] text-muted-foreground mb-3">
          Run these SQL queries in the <strong>Supabase Dashboard → SQL Editor</strong>
          to verify your data is being stored and calculated correctly.
        </p>

        <div className="space-y-4">

          {/* 1 — list batches */}
          <div>
            <p className="text-[12px] font-semibold text-foreground">
              1. Check all saved batches and their hit rates
            </p>
            <p className="text-[11px] text-muted-foreground">
              Verify both <code className="bg-muted px-1 rounded">hit_rate</code> (pure)
              and <code className="bg-muted px-1 rounded">hit_rate_ext</code> (extended) are being saved.
              Batches saved before v7.3.4 will show <code className="bg-muted px-1 rounded">null</code> for hit_rate_ext — resave them to update.
            </p>
            <SQL>{`select
  id,
  date,
  stocks,
  hit_rate,
  hit_rate_ext,
  updated_at
from batches
order by saved_at desc;`}</SQL>
          </div>

          {/* 2 — verdict counts */}
          <div>
            <p className="text-[12px] font-semibold text-foreground">
              2. Count verdicts per batch to verify snapshot thresholds
            </p>
            <p className="text-[11px] text-muted-foreground">
              The verdicts stored in <code className="bg-muted px-1 rounded">results</code> are calculated
              using SNAPSHOT_PARAMS at save time. Check the counts match what you see in the app.
            </p>
            <SQL>{`select
  id,
  date,
  count(*) filter (where r->>'verdict' = 'hit')       as hits,
  count(*) filter (where r->>'verdict' = 'exceeded')  as exceeded,
  count(*) filter (where r->>'verdict' = 'close')     as close,
  count(*) filter (where r->>'verdict' = 'miss')      as miss,
  count(*) filter (where r->>'verdict' = 'wrong_way') as wrong_way,
  count(*) filter (where r->>'verdict' = 'awaiting')  as awaiting,
  count(*)                                             as total
from batches,
  jsonb_array_elements(results) as r
group by id, date
order by date desc;`}</SQL>
          </div>

          {/* 3 — verify snapshot thresholds */}
          <div>
            <p className="text-[12px] font-semibold text-foreground">
              3. Verify hit rate calculation for a specific batch
            </p>
            <p className="text-[11px] text-muted-foreground">
              Replace <code className="bg-muted px-1 rounded">'2026-03-17'</code> with your batch date.
              The hit_rate should equal hits ÷ (total − awaiting) × 100.
            </p>
            <SQL>{`with verdicts as (
  select
    r->>'horizon'     as horizon,
    r->>'verdict'     as verdict,
    r->>'ticker'      as ticker,
    r->>'targetPrice' as target,
    r->>'priceOnDate' as price_on_date
  from batches,
    jsonb_array_elements(results) as r
  where id = '2026-03-17'
)
select
  horizon,
  verdict,
  count(*) as count
from verdicts
group by horizon, verdict
order by horizon, verdict;`}</SQL>
          </div>

          {/* 4 — check fundamentals_cache */}
          <div>
            <p className="text-[12px] font-semibold text-foreground">
              4. Check fundamentals cache
            </p>
            <p className="text-[11px] text-muted-foreground">
              Verify PEG, margin and sector are populated for your tickers.
              Rows older than 7 days will be re-fetched on next Refresh Fundamentals.
            </p>
            <SQL>{`select
  ticker,
  data->>'sector'         as sector,
  data->>'pegTTM'         as peg,
  data->>'netMarginTTM'   as net_margin,
  fetched_at
from fundamentals_cache
order by ticker;`}</SQL>
          </div>

          {/* 5 — verify hit rate formula */}
          <div>
            <p className="text-[12px] font-semibold text-foreground">
              5. Manually verify hit_rate_ext matches the formula
            </p>
            <p className="text-[11px] text-muted-foreground">
              This query recalculates hit_rate_ext from scratch and compares it to the stored value.
              They should match exactly for batches saved with v7.3.4+.
            </p>
            <SQL>{`with counts as (
  select
    b.id,
    b.date,
    b.hit_rate,
    b.hit_rate_ext,
    count(*) filter (where r->>'verdict' = 'hit')      as hits,
    count(*) filter (where r->>'verdict' = 'exceeded') as exceeded,
    count(*) filter (where r->>'verdict' != 'awaiting') as evaluated
  from batches b,
    jsonb_array_elements(results) as r
  group by b.id, b.date, b.hit_rate, b.hit_rate_ext
)
select
  id,
  date,
  hit_rate                                           as stored_hit_rate,
  round(hits::numeric / nullif(evaluated,0) * 100)   as calc_hit_rate,
  hit_rate_ext                                       as stored_hit_rate_ext,
  round((hits+exceeded)::numeric / nullif(evaluated,0) * 100) as calc_hit_rate_ext,
  case when hit_rate_ext =
    round((hits+exceeded)::numeric / nullif(evaluated,0) * 100)
    then '✓ Match' else '✗ Mismatch' end            as check
from counts
order by date desc;`}</SQL>
          </div>

        </div>

        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-3 text-[12px] text-blue-700">
          <strong>Tip:</strong> If hit_rate_ext is null for old batches, load each batch from
          Accuracy Stats → click <strong>💾 Save batch</strong> again. The app will recalculate
          and update both hit rates using the snapshot thresholds.
        </div>
      </Section>
    </div>
  )
}
