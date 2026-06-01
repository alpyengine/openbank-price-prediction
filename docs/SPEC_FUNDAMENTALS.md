# Specification: Fundamentals, Investment Score & Charts
**Feature:** v7.1.0 → v7.1.3
**Status:** Ready for implementation
**Goal:** Add fundamental analysis metrics, Investment Score, sparklines,
and TradingView chart integration so the user can evaluate whether a price
prediction is supported by company fundamentals and make informed investment
decisions across all batches.

---

## 1. Context & motivation

The app currently tracks Openbank price predictions and measures accuracy
(hit/miss). The next step is to answer a more important question:

> "Even if the prediction is technically accurate, should I invest?"

A stock with a 30% upside target might be attractive — or it might be
wildly overvalued with a P/E of 80 and negative EPS growth. Fundamental
metrics, especially the PEG ratio popularized by Peter Lynch, help
distinguish between the two cases.

---

## 2. Metrics catalogue

### 2.1 Valuation metrics

| Metric | Source | API field | Why it matters |
|---|---|---|---|
| **PEG ratio (forward)** | Twelve Data | `valuations_metrics.peg_ratio` | Lynch's primary signal — price vs growth |
| **PEG histórico** | FMP | `priceToEarningsGrowthRatioTTM` | Secondary reference |
| **Forward P/E** | Twelve Data | `valuations_metrics.forward_pe` | Expected valuation next 12M |
| **Trailing P/E** | Twelve Data | `valuations_metrics.trailing_pe` | Current valuation |
| **P/FCF** | FMP | `priceToFreeCashFlowRatioTTM` | Better than P/E — cash is real |

### 2.2 Growth metrics

| Metric | Source | API field | Why it matters |
|---|---|---|---|
| **EPS growth YoY** | Twelve Data | `income_statement.quarterly_earnings_growth_yoy` | Lynch wanted growing earnings |
| **Revenue growth YoY** | Twelve Data | `income_statement.quarterly_revenue_growth` | Revenue growing but profits falling = trap |

### 2.3 Quality metrics

| Metric | Source | API field | Why it matters |
|---|---|---|---|
| **Net margin** | FMP | `netProfitMarginTTM` | Is the company profitable? |
| **ROE** | FMP | `returnOnEquityTTM` | How efficiently is equity used? |
| **Debt/Equity** | FMP | `debtToEquityRatioTTM` | Financial leverage risk |
| **P/FCF** | FMP | `priceToFreeCashFlowRatioTTM` | < 15 cheap, > 30 expensive |

### 2.4 Sentiment & risk metrics

| Metric | Source | API field | Why it matters |
|---|---|---|---|
| **Insider ownership %** | Twelve Data | `stock_statistics.percent_held_by_insiders` | > 10% = management has skin in the game |
| **Short interest %** | Twelve Data | `stock_statistics.short_percent_of_shares_outstanding` | > 20% = market betting against it |
| **Beta** | Twelve Data | `stock_price_summary.beta` | Volatility vs market |
| **Dividend yield** | FMP | `dividendYieldTTM` | Income component |

### 2.5 Already fetched (v7.0.0+)

| Metric | Source | Status |
|---|---|---|
| Sector | FMP | ✅ Already in app |
| Market cap | FMP | ✅ Already in app |

---

## 3. PEG ratio — Peter Lynch interpretation

**Formula:** `PEG = Forward P/E ÷ EPS Growth Estimate (%)`

**Source:** Twelve Data `peg_ratio` (uses analyst forward estimates)
**Secondary:** FMP `priceToEarningsGrowthRatioTTM` labeled "PEG histórico"

| PEG | Signal | Color | Lynch verdict |
|---|---|---|---|
| ≤ 0.5 | Very undervalued | 🟢 Green | Strong buy candidate |
| 0.5 – 1.0 | Undervalued | 🟢 Green | Attractive |
| 1.0 – 1.5 | Fairly valued | 🟡 Amber | Reasonable |
| 1.5 – 2.0 | Slightly overvalued | 🟠 Orange | Caution |
| > 2.0 | Overvalued | 🔴 Red | Lynch would not invest |
| Negative growth | Value trap | 🔴 Red `⚠ Neg` | See section 3.1 |
| No data | Not available | ⚪ Grey `—` | — |

### 3.1 Negative EPS growth — Value Trap ✅ DECIDED

When EPS growth is negative:
- PEG displayed as `⚠ Neg` in red
- Tooltip: *"Declining earnings — Lynch would not invest. Risk of value trap."*
- Investment Score receives **-20 point penalty**
- PEG excluded from score calculation (upside + margin only)

---

## 4. Investment Score (0–100)

A single composite number combining multiple signals into one actionable score.

### 4.1 Formula

```
Score = (upside_weight  × upside_score)  +
        (peg_weight     × peg_score)     +
        (margin_weight  × margin_score)  +
        (history_weight × history_score)
        − 20  (if negative EPS growth)
        − 10  (if short interest > 20%)
        − 5   (if debt/equity > 2.0)
```

### 4.2 Default weights ✅ DECIDED

| Factor | Default | Min | Max | Notes |
|---|---|---|---|---|
| Upside % | **40%** | 0% | 100% | Distance to Openbank target |
| PEG ratio | **45%** | 0% | 100% | Peter Lynch signal |
| Net margin | **15%** | 0% | 100% | Company profitability |
| Hit rate histórico | **0%** | 0% | 50% | Disabled — activate when history exists |

Weights always sum to 100%. User-adjustable via sliders. Reset button restores defaults.

### 4.3 Score per factor

**Upside score:**
| Upside | Score |
|---|---|
| < 0% | 0 |
| 0–10% | 20 |
| 10–20% | 40 |
| 20–30% | 65 |
| 30–50% | 85 |
| > 50% | 100 |

**PEG score:**
| PEG | Score |
|---|---|
| ≤ 0.5 | 100 |
| 0.5–1.0 | 85 |
| 1.0–1.5 | 60 |
| 1.5–2.0 | 30 |
| > 2.0 | 0 |
| Negative / N/A | 0 (+ penalty) |

**Net margin score:**
| Margin | Score |
|---|---|
| < 0% | 0 |
| 0–5% | 20 |
| 5–15% | 50 |
| 15–25% | 75 |
| > 25% | 100 |

**Hit rate score:** direct mapping 0–100% → 0–100 points (disabled by default)

---

## 5. European tickers — partial data ✅ DECIDED

When more than 2 key metrics are missing:
- Orange badge `⚠ Partial data` in the stock row
- Tooltip: *"Limited data available for this exchange. Score may be less reliable."*
- Score calculated with available data
- Affected: `.DE` `.AS` `.PA` `.MC` `.L`

---

## 6. UI layout

### 6.1 Main table columns (always visible)

```
Ticker | Company | Sector | Upside % | Score | PEG | Sparkline | Actions
```

Sortable by any column. Score and PEG color-coded.

### 6.2 Expandable fundamentals panel (click row to expand)

```
┌─────────────────────────────────────────────────────────────┐
│ Valuation          Growth              Quality              │
│ Forward P/E  32.4  EPS growth  +19%   Net margin   27%    │
│ Trailing P/E 37.7  Rev growth  +16%   ROE          142%   │
│ P/FCF        35.5  PEG hist.   1.29   Debt/Equity  0.79   │
│                                                             │
│ Sentiment                                                   │
│ Insider own.  1.6%  Short int.  0.95%  Beta  1.06          │
│ Dividend yield 0.34%                                        │
│                                                             │
│ [⚠ Partial data]  [📈 Full chart →]                        │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Sparkline in table

- Mini line chart showing weekly price evolution
- Data source: `weekly_prices` table (already in Supabase — no API call)
- Width: ~80px, height: ~32px
- Color: green if current > base, red if current < base
- No axes, no labels — pure visual signal
- Built with Recharts `<LineChart>` (already installed)

### 6.4 Full chart — TradingView widget (replaces current PriceChart modal)

**Triggered by:** "📈 Full chart" button in expanded panel

**Why TradingView:**
- Free, no API calls, no rate limits
- Interactive: 1D / 1W / 1M / 3M / 6M / 1Y / 5Y timeframes
- Technical indicators: MA, RSI, MACD, Bollinger Bands
- Volume bars
- Compare with S&P500, NASDAQ
- Zoom and hover

**Implementation:**
```jsx
<iframe
  src={`https://www.tradingview.com/chart/?symbol=${ticker}&interval=W`}
  width="100%"
  height="500"
  frameBorder="0"
/>
```

**Limitations:**
- TradingView logo visible (free plan — cannot be removed)
- Requires internet connection
- Does NOT show Openbank target lines (those stay in the existing PriceChart)

**Coexistence with existing PriceChart:**
- Existing `PriceChart` (Recharts + weekly_prices) → renamed to "Openbank Chart"
  Shows: weekly closes from Supabase + target price lines
- New TradingView modal → "Full chart"
  Shows: full market history + technical indicators
- Both accessible from the expanded fundamentals panel

### 6.5 Score weight sliders

Located in Accuracy Stats page → "Score Settings" collapsible section:

```
Upside %     [========|--] 40%
PEG ratio    [=========|-] 45%
Net margin   [===|-------] 15%
Hit rate     [|----------]  0%  ← activate when history available
                             ──
                           100% ✓
[ Reset to defaults ]
```

---

## 7. All Stocks page (v7.1.2)

New sidebar entry: **All Stocks**

Single deduplicated table combining all batches:
- One row per ticker — most recent batch prediction wins
- Same columns as main table + batch date column
- Sortable by any column
- Filters: sector dropdown · PEG range · score range slider
- CSV export button
- Same expandable panel + sparkline + chart buttons

---

## 8. Data sources & caching

### API calls per ticker

| Call | Endpoint | Data | Frequency |
|---|---|---|---|
| Twelve Data statistics | `/statistics?symbol=TICKER` | PEG, P/E, growth, beta, insider, short | Lazy — on panel open |
| FMP ratios | `/stable/ratios-ttm?symbol=TICKER` | Margins, ROE, debt, P/FCF, dividend | Lazy — on panel open |
| Sparkline | Supabase `weekly_prices` | Already available | Instant — no API call |
| Full chart | TradingView iframe | Full market data | On demand — no API call |

### Supabase cache table

```sql
create table public.fundamentals_cache (
  ticker      text        primary key,
  td_data     jsonb,      -- Twelve Data /statistics response
  fmp_data    jsonb,      -- FMP /stable/ratios-ttm response
  fetched_at  timestamptz not null default now()
);
alter table public.fundamentals_cache enable row level security;
create policy "authenticated users can read fundamentals"
  on public.fundamentals_cache for select
  using (auth.role() = 'authenticated');
create policy "authenticated users can insert fundamentals"
  on public.fundamentals_cache for insert
  with check (auth.role() = 'authenticated');
create policy "authenticated users can update fundamentals"
  on public.fundamentals_cache for update
  using (auth.role() = 'authenticated');
```

**TTL:** 7 days — re-fetch if `fetched_at` older than 7 days

---

## 9. Implementation plan

### v7.1.0 — Data layer
- Add `fundamentals_cache` table to Supabase
- Extend `useFundamentals.js`:
  - Fetch Twelve Data `/statistics` (PEG, P/E, growth, beta, insider, short)
  - Fetch FMP `/stable/ratios-ttm` (margins, ROE, debt, P/FCF, dividend)
  - Cache in Supabase with 7-day TTL
  - Calculate PEG score, detect negative growth, apply penalties
  - Calculate Investment Score with configurable weights
- Add weight persistence in `localStorage`

### v7.1.1 — UI metrics + sparkline
- Extend `FundamentalsBar` with all new metrics
- Add sparkline component using Recharts + `weekly_prices`
- Add Score column to `StockTable`
- Score weight sliders in Accuracy Stats page
- PEG tooltip with Lynch scale
- `⚠ Neg` value trap warning
- `⚠ Partial data` badge for European tickers

### v7.1.2 — All Stocks page
- New sidebar entry + page
- Deduplication logic
- Sortable/filterable table
- CSV export

### v7.1.3 — TradingView integration
- TradingView iframe modal
- "Full chart" button in expanded panel
- Rename existing PriceChart to "Openbank Chart"

---

## 10. Decisions log

| # | Question | Decision |
|---|---|---|
| 1 | EPS growth source | Twelve Data (forward, faithful to Lynch) + FMP as "PEG histórico" |
| 2 | Score weights adjustable? | Yes — 4 sliders summing to 100%. Defaults: upside 40%, PEG 45%, margin 15%, history 0% |
| 3 | Negative EPS growth | `⚠ Neg` red badge + Lynch tooltip + -20 score penalty |
| 4 | European tickers with missing data | `⚠ Partial data` orange badge, score with available data |
| 5 | Additional metrics | P/FCF, insider %, short interest %, revenue growth, dividend yield added |
| 6 | Sparkline chart | Recharts + Supabase weekly_prices (no API call, instant) |
| 7 | Full interactive chart | TradingView iframe (free, all timeframes, technical indicators) |
| 8 | Existing PriceChart | Kept and renamed "Openbank Chart" — shows targets + weekly closes |

---

## 11. Non-goals

- No real-time price alerts (v7.2.0)
- No portfolio tracking (out of scope)
- No financial advice — all scores are informational only
- No AI-generated investment recommendations
- No removal of TradingView logo (requires paid plan)
