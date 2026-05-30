# Openbank Price Prediction — v6.8.1

Web app for tracking and evaluating Openbank stock price forecasts against real market data.
Built with React 18 + Vite + Tailwind 3. No backend required for the UI — Supabase handles persistence and automation.

---

## What this app does

[Openbank](https://www.openbank.es) publishes periodic stock price forecasts — predictions of where a stock's price will be in 1, 3, 6, and 12 months. This app tracks those forecasts over time and tells you whether they came true.

### The problem it solves

Without a tracking tool, evaluating forecast accuracy is tedious:
- You'd need to manually record each forecast at the time it was published
- Then go back months later to check whether the price reached the target
- Then repeat across dozens of stocks and multiple time horizons
- With no easy way to compare performance across batches or time periods

### How this app solves it

1. **Import** — paste or upload a CSV with the forecast data (ticker, base price, targets for 1M/3M/6M/12M)
2. **Fetch** — the app pulls current prices from Twelve Data API automatically
3. **Evaluate** — each prediction is evaluated as Hit ✅ / Close 🟡 / Miss ❌ / Awaiting ⏳ based on whether the current price has reached the target
4. **Save** — confirmed batches are saved to Supabase (PostgreSQL) for long-term tracking
5. **Automate** — a Supabase cron job runs every weekday at 23:00 UTC, fetching historical closing prices for expired horizons and updating verdicts automatically — no manual action needed
6. **Visualise** — accuracy stats, hit rates per horizon, weekly price charts per ticker, market comparison vs sector ETFs

### What "Hit / Close / Miss" means

All evaluations use a single unified function `evaluatePrediction()`:

| Verdict | Condition | Color |
|---|---|---|
| **Hit** | Price reached or exceeded the target (bullish) / reached or went below (bearish) | 🟢 Green |
| **Close** | Price is within ±5% of the target but hasn't reached it yet | 🟡 Amber |
| **Miss** | Price is more than 5% away from the target | 🔴 Red |
| **Awaiting** | Horizon target date hasn't arrived yet | ⚫ Grey |

The ±5% margin is configurable in Settings.

---

## Quick start

```bash
cd openbank-price-prediction
npm install
cp .env.example .env
# Edit .env: VITE_TWELVE_DATA_KEY=your_key_here
npm run dev
# Open http://localhost:5173
```

---

## How it works

```
Browser (React/Vite localhost:5173)
  └── usePriceFetch.js
        ├── Current price:    GET https://api.twelvedata.com/price?symbol=AXP,...
        └── Historical price: GET https://api.twelvedata.com/time_series?symbol=TER&start_date=...
```

- No proxy. No backend. No Python. Direct API call from the browser.
- **Future horizons** → current market price (updates on every Fetch)
- **Expired horizons** → closing price on the exact target date (fixed, historical)

---

## CSV import format

```
TICKER, Company, CCY, BasePrice, 1M, 3M, 6M, 12M, DD/MM/YYYY
```

The 9th field is the **screenshot date** — base date for the 4 target horizons:
- 1M  = base + 30 days
- 3M  = base + 91 days
- 6M  = base + 182 days
- 12M = base + 365 days

**Example:**
```
AXP,American Express,USD,314.46,327.23,293.83,296.32,521.60,08/05/2026
AMD,Advanced Micro Devices,USD,441.10,438.97,484.35,513.88,720.69,08/05/2026
URI,United Rentals,USD,933.75,1004.26,1010.78,1024.09,1615.39,08/05/2026
MCD,McDonalds Corp,USD,277.60,288.47,306.68,328.16,344.01,08/05/2026
```

---

## Prediction logic (v3.1.0+)

Each forecast has a **direction** based on `target` vs `basePrice`:

| Direction | Condition      | HIT when         |
|-----------|----------------|------------------|
| Bullish   | target > base  | price >= target  |
| Bearish   | target < base  | price <= target  |
| Neutral   | target = base  | dist <= 5%       |

**Verdict labels:**
- `HIT ✓ Reached` — bullish fulfilled
- `HIT ✓ Dropped` — bearish fulfilled
- `CLOSE Near target` — within ±5%
- `MISS ✗ Not reached` — bullish failed
- `MISS ✗ Didn't drop` — bearish failed

---

## Data source: Twelve Data

- Free tier: 800 calls/day, 8/minute
- Current: `GET /price?symbol=AXP,AMD,...`
- Historical: `GET /time_series?symbol=TER&interval=1day&start_date=...&end_date=...`
- Sign up: https://twelvedata.com

---

## Folder structure

```
openbank-price-prediction/
  src/
    components/
      Header.jsx
      FetchBar.jsx
      SummaryCards.jsx
      HorizonTabs.jsx
      StockTable.jsx
      StockRow.jsx        -- memo, direction-aware logic
      ImportBox.jsx
      EmailPreview.jsx
    hooks/
      usePriceFetch.js    -- current + historical fetch
    utils/
      dates.js
      stocks.js           -- evaluatePrediction()
    styles/
      global.css
    App.jsx
    main.jsx
  .env                    -- API key (never committed)
  .env.example
  .gitignore
  index.html
  vite.config.js
  package.json
  README.md
  GIT_GUIDE.md
```

---

## Accuracy tracking (v4.5.0+)

The app tracks prediction accuracy over time by saving batch results to a private GitHub repo.

### How it works

```
App → useHistory → storage.js → GitHub API → openbank-price-data (private repo)
                                            → data/history.json
```

Each save commits `data/history.json` with all evaluated predictions.
The accuracy chart shows HIT rate % per horizon (1M/3M/6M/12M) over time.

### Setup (one time)

1. Create a private GitHub repo named `openbank-price-data` (empty, no README)
2. Create a Personal Access Token at `github.com/settings/tokens`
   — Type: Classic · Scope: `repo` (full)
3. Add to your `.env`:
```
VITE_GITHUB_TOKEN=ghp_your_token_here
VITE_GITHUB_REPO=yourusername/openbank-price-data
```

### Usage

1. Import CSV → Fetch prices
2. Click **↓ Load history** — loads previous batches from GitHub
3. Click **↑ Save batch results** — evaluates and commits current batch
4. The accuracy chart and KPI cards update automatically

### Future migration

Persistence is fully abstracted in `src/services/storage.js`.
Migrating to Supabase only requires rewriting that file.

---


---

## Supabase — Architecture & Automation

### What is Supabase?

Supabase is an open-source backend platform built on top of **PostgreSQL**. It provides:

- **Database** — a real PostgreSQL database, not a NoSQL store. Every batch you save is a proper SQL row.
- **Auth** — built-in authentication with email/password and OAuth providers (Google, GitHub, etc.)
- **Storage** — file storage (not used in this app)
- **Edge Functions** — serverless functions (not used)
- **Extensions** — native PostgreSQL extensions including `pg_cron` (scheduled jobs) and `http` (outbound HTTP requests from SQL)

This app uses Supabase for two purposes:
1. **Batch persistence** — saving/loading prediction batches and their results
2. **Automated price fetching** — a scheduled job that detects expired horizons and fetches closing prices automatically

---

### Database schema

#### Table: `batches`

Created during initial setup. Stores each saved batch:

| Column | Type | Description |
|---|---|---|
| `id` | text | Batch ID (base date formatted) |
| `date` | text | Base date DD/MM/YYYY |
| `stocks` | integer | Number of tickers |
| `results` | jsonb | Array of prediction results (one per ticker×horizon) |
| `fundamentals` | jsonb | Sector, industry, market cap per ticker |
| `market_data` | jsonb | SPY, RSP, ETF performance data |
| `hit_rate` | integer | Overall hit rate % at time of save |
| `saved_at` | timestamptz | When the batch was saved |
| `updated_at` | timestamptz | Last update time |

#### Table: `price_cache` (v6.5.0+)

Stores automatically fetched closing prices:

| Column | Type | Description |
|---|---|---|
| `id` | bigserial | Auto-increment primary key |
| `ticker` | text | Stock symbol e.g. `TER`, `SLB.US` |
| `target_date` | date | The horizon target date |
| `close_price` | numeric | Closing price on that date |
| `source` | text | `twelve_data` or `fmp` |
| `fetched_at` | timestamptz | When it was fetched |

Primary key constraint: `(ticker, target_date)` — one price per ticker per date.

---

### Extensions required

Two PostgreSQL extensions must be enabled in **Supabase Dashboard → Database → Extensions**:

| Extension | Purpose |
|---|---|
| `pg_cron` | Schedules SQL functions to run automatically (like a cron job but inside the database) |
| `http` | Allows PostgreSQL functions to make outbound HTTP requests — used to call Twelve Data API |

---

### Supabase Vault (secret management)

Never put API keys directly in SQL code. Supabase provides a built-in **Vault** — an encrypted secrets store inside PostgreSQL. Keys are stored once and retrieved securely by name:

```sql
-- Store a secret (run once in SQL Editor)
select vault.create_secret('YOUR_TWELVE_DATA_KEY', 'twelve_data_key');

-- Retrieve it inside a function
select decrypted_secret into api_key
from vault.decrypted_secrets
where name = 'twelve_data_key';
```

---

### How the automation works

```
Every weekday at 23:00 UTC
         ↓
pg_cron triggers: select fetch_expired_horizons();
         ↓
Function queries batches table:
  Find all results where:
    - verdict = 'awaiting'
    - target_date <= today
         ↓
For each expired horizon:
  Check price_cache first (avoid duplicate API calls)
  If not cached → call Twelve Data API via http extension
  Save close_price to price_cache
  Update verdict in batches (hit/miss/close)
         ↓
Next time user opens app → Load history → verdicts already updated
```

**The user never needs to manually fetch historical prices again.**

---

### Setup — one time only

The following steps are run once in the **Supabase SQL Editor** (`Database → SQL Editor → New query`).

#### Step 1 — Enable extensions

In **Database → Extensions**, enable:
- `pg_cron`
- `http`

#### Step 2 — Store API key in Vault

```sql
-- Replace with your actual Twelve Data API key
select vault.create_secret('YOUR_TWELVE_DATA_API_KEY', 'twelve_data_key');
```

Verify it was saved:
```sql
select name, created_at from vault.secrets where name = 'twelve_data_key';
```

#### Step 3 — Create price_cache table

```sql
create table if not exists price_cache (
  id          bigserial primary key,
  ticker      text        not null,
  target_date date        not null,
  close_price numeric     not null,
  source      text        not null default 'twelve_data',
  fetched_at  timestamptz not null default now(),
  unique(ticker, target_date)
);

-- Index for fast lookups
create index if not exists idx_price_cache_lookup
  on price_cache(ticker, target_date);
```

#### Step 4 — Create the automation function

```sql
create or replace function fetch_expired_horizons()
returns void
language plpgsql
security definer
as $$
declare
  api_key     text;
  rec         record;
  url         text;
  response    jsonb;
  close_price numeric;
  new_verdict text;
  dist_abs    numeric;
begin
  -- Get API key from Vault
  select decrypted_secret into api_key
  from vault.decrypted_secrets
  where name = 'twelve_data_key';

  if api_key is null then
    raise notice 'twelve_data_key not found in vault';
    return;
  end if;

  -- Find all awaiting horizons whose target date has passed
  for rec in
    select distinct
      b.id        as batch_id,
      b.results,
      r.value     as result_row
    from batches b,
         jsonb_array_elements(b.results) as r(value)
    where r.value->>'verdict' = 'awaiting'
      and (r.value->>'targetDate') is not null
      and to_date(r.value->>'targetDate', 'DD Mon YYYY') <= current_date
  loop
    declare
      ticker      text    := rec.result_row->>'ticker';
      target_date date    := to_date(rec.result_row->>'targetDate', 'DD Mon YYYY');
      target_price numeric := (rec.result_row->>'targetPrice')::numeric;
      base_price  numeric := (rec.result_row->>'basePrice')::numeric;
      cached_price numeric;
    begin
      -- Check cache first
      select close_price into cached_price
      from price_cache
      where price_cache.ticker = ticker
        and price_cache.target_date = target_date;

      if cached_price is null then
        -- Fetch from Twelve Data
        url := format(
          'https://api.twelvedata.com/eod?symbol=%s&date=%s&apikey=%s',
          ticker,
          target_date::text,
          api_key
        );

        select content::jsonb into response
        from http_get(url);

        close_price := (response->>'close')::numeric;

        if close_price is not null and close_price > 0 then
          insert into price_cache(ticker, target_date, close_price)
          values (ticker, target_date, close_price)
          on conflict (ticker, target_date) do nothing;
        end if;
      else
        close_price := cached_price;
      end if;

      -- Calculate verdict
      if close_price is not null and close_price > 0 and target_price > 0 then
        dist_abs := abs((close_price - target_price) / target_price * 100);

        if target_price > base_price then
          -- Bullish
          new_verdict := case
            when close_price >= target_price then 'hit'
            when dist_abs <= 5              then 'close'
            else                                 'miss'
          end;
        elsif target_price < base_price then
          -- Bearish
          new_verdict := case
            when close_price <= target_price then 'hit'
            when dist_abs <= 5              then 'close'
            else                                 'miss'
          end;
        else
          -- Neutral
          new_verdict := case when dist_abs <= 5 then 'hit' else 'miss' end;
        end if;

        -- Update the verdict in the batch results array
        update batches
        set
          results    = (
            select jsonb_agg(
              case
                when elem->>'ticker'      = ticker
                 and elem->>'targetDate'  = rec.result_row->>'targetDate'
                 and elem->>'horizon'     = rec.result_row->>'horizon'
                then elem
                  || jsonb_build_object('verdict',     new_verdict)
                  || jsonb_build_object('priceOnDate', close_price)
                else elem
              end
            )
            from jsonb_array_elements(batches.results) as elem
          ),
          updated_at = now()
        where id = rec.batch_id;

      end if;
    end;

    -- Small pause between API calls (rate limiting)
    perform pg_sleep(0.5);
  end loop;

  raise notice 'fetch_expired_horizons completed at %', now();
end;
$$;
```

#### Step 5 — Schedule with pg_cron

```sql
-- Enable pg_cron extension first (done in Step 1)
-- Schedule: every weekday (Mon-Fri) at 23:00 UTC
-- (Markets close at ~21:00 UTC, giving 2h buffer)
select cron.schedule(
  'fetch-expired-horizons-daily',
  '0 23 * * 1-5',
  $$ select fetch_expired_horizons(); $$
);
```

#### Step 6 — Verify the job is scheduled

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'fetch-expired-horizons-daily';
```

---

### Migration to shadcn/ui + Tailwind

The app is being progressively migrated from inline styles to [shadcn/ui](https://ui.shadcn.com) components and Tailwind CSS classes. Full documentation of the process, rationale, and phase-by-phase progress:

📄 **[MIGRATION_SHADCN.md](./docs/MIGRATION_SHADCN.md)**

---

## Testing & monitoring the automation

**Run manually** (test before waiting for the cron):
```sql
select fetch_expired_horizons();
```

**Check execution history:**
```sql
select
  start_time,
  end_time,
  status,
  return_message
from cron.job_run_details
where jobid = (
  select jobid from cron.job
  where jobname = 'fetch-expired-horizons-daily'
)
order by start_time desc
limit 10;
```

**Check price_cache contents:**
```sql
select ticker, target_date, close_price, source, fetched_at
from price_cache
order by fetched_at desc
limit 20;
```

---

### React app changes (v6.5.0)

The app reads from `price_cache` before calling the Twelve Data API:

```
User clicks "Fetch prices"
        ↓
For each expired horizon:
  1. Check price_cache in Supabase
  2. If found → use cached price (no API call)
  3. If not found → call Twelve Data API → cache result
```

This means on most days after the cron has run, **no API calls are needed** for historical prices — they're already in the database.

A small indicator shows whether each price came from cache 💾 or live API 🌐.

---

### Disabling / pausing the automation

```sql
-- Pause (keeps the job but stops it running)
select cron.unschedule('fetch-expired-horizons-daily');

-- Re-enable
select cron.schedule(
  'fetch-expired-horizons-daily',
  '0 23 * * 1-5',
  $$ select fetch_expired_horizons(); $$
);
```

---


---

## Testing

### What is Vitest?

[Vitest](https://vitest.dev) is a fast unit testing framework built on top of Vite — the same build tool the app uses. It runs in Node.js, not in the browser, so tests execute instantly without opening a browser window.

### Running tests

```bash
# Run all tests once and show results
npm run test:run

# Watch mode — re-runs automatically when you change code
npm run test
```

Expected output:
```
Test Files  6 passed (6)
     Tests  107 passed (107)
  Duration  ~2s
```

### Test files

| File | Tests | What it covers |
|---|---|---|
| `src/utils/stocks.test.js` | 37 | `evaluatePrediction`, `getTarget`, `distancePct`, `getEffectivePrice`, `priceStatus` |
| `src/utils/dates.test.js` | 20 | `parseDate`, `targetDates`, `daysLeft`, `dateStatus`, `formatDate` |
| `src/hooks/computed.test.js` | 10 | Hit rate, awaiting count, unique tickers, batch summary |
| `src/hooks/saveBatch.test.js` | 10 | Future horizons saved as awaiting, expired horizons evaluated correctly |
| `src/hooks/restoreHistPrices.test.js` | 12 | Restoring `histPrices` from `batch.results` — skips missing prices, correct key format, fromCache/isHistorical flags |
| `src/services/storage.test.js` | 18 | Supabase URL construction and response parsing for `loadWeeklyPrices` and `loadCachedPrice` |

### Key functions tested

**`evaluatePrediction(price, target, base, margin)`**
The core verdict function. Takes the current price, the predicted target, the base price at forecast time, and the hit margin (default 5%). Returns `{ verdict, direction }` where verdict is `hit/close/miss/awaiting`. Every visual element in the app — bars, boxes, badges — uses this function.

**`restoreHistPrices(results)`**
Reconstructs the `histPrices` map from saved batch results. Used when loading a batch from Supabase to avoid re-fetching historical prices from the API. Key format: `TICKER_HORIZON` (e.g. `TER_1M`).

**`loadWeeklyPrices(ticker, batchId)`** / **`loadCachedPrice(ticker, targetDate)`**
Supabase read functions. Tests verify URL construction (ticker encoding, suffix stripping, date formatting) and response parsing (float conversion, null handling, cache miss detection).

### Adding new tests

Test files live next to the code they test:
- `src/utils/myFunction.js` → `src/utils/myFunction.test.js`
- `src/hooks/myHook.js` → `src/hooks/myHook.test.js`

Pattern:
```js
import { describe, it, expect } from 'vitest'
import { myFunction } from './myFunction.js'

describe('myFunction', () => {
  it('returns expected value for valid input', () => {
    expect(myFunction(input)).toBe(expectedOutput)
  })

  it('handles edge case gracefully', () => {
    expect(myFunction(null)).toBeNull()
  })
})
```

---


## Changelog

### v6.1.3 — Fix Accuracy Stats crash
**Date:** May 2026

**Root cause:** `history` prop conflicted with `window.history`. Fixed by renaming to `batches`.

**Files changed:** `AccuracyChart.jsx`

---

### v6.1.2 — Fix fetch buttons broken + duplicate title + wrong log message
**Date:** May 2026

**Root cause of fetch buttons broken:**
The sidebar CSV upload handler used a dynamic `import('./utils/dates.js')`
inside the `onChange` callback. This caused a module parsing error that
silently broke the entire App module — all fetch buttons stopped working.
Fixed by using the already-imported `parseDate` and `today` functions.

**Duplicate title on Accuracy Stats:**
`AccuracyChart` had its own internal `<Header>` component with h1 "Accuracy
Stats". The App `<Header>` already renders the correct title per page.
Removed internal Header from AccuracyChart — replaced with `<ActionBar>`
(Load history + Save batch buttons only).

**Wrong log message:**
`useHistory.js` said "GitHub not configured — add VITE_GITHUB_TOKEN..."
when the app uses Supabase. Fixed to say "Supabase not configured — add
VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env".

**Files changed:** `App.jsx`, `AccuracyChart.jsx`, `useHistory.js`

---

### v6.1.1 — Bug fixes + expanded panel v0 redesign + Base Price column
**Date:** May 2026

**Bug fixes:**
- **Accuracy Stats not navigating** — Header now receives `activePage` prop
  and shows correct title/subtitle per page. Clear overrides and Email
  buttons only show on Batch Overview page.
- **Upload CSV sidebar button** — now triggers a hidden file input in App.
  Parses CSV and imports stocks directly, then navigates to Batch Overview.
- **Clear overrides** — was already wired correctly, now confirmed working.
  Clears all manual price overrides entered in the table.

**Expanded row panel — full v0 redesign:**
- 4 Horizon cards: target price + date + % from current + status badge
  (HIT/NEAR/CLOSE/MISS/AWAITING) with color-coded border
- Market Performance: Option B centered-axis bars (positive right, negative
  left) — green bars for positive, red for negative
- Fundamentals strip: Sector · Industry · Market Cap · Beta · Forward P/E
  · Last Dividend · Website — horizontal layout matching v0
- Add Note button (replaces always-visible textarea)

**Other changes:**
- **Base Price column** added after Company in main table
- **Settings page** updated to v0 card style
- **AccuracyChart** interactive tooltip on hover (date + value + dot)

**Files changed:** `Header.jsx`, `Sidebar.jsx`, `App.jsx`, `StockRow.jsx`,
`StockTable.jsx`, `AccuracyChart.jsx`

---

### v6.1.0 — Complete visual redesign — all components v0 style
**Date:** May 2026

**All remaining components migrated to v0 design language:**

- **HorizonTabs** — clean pill tabs, monospace date row, status banners
- **SectorControls** — lucide icons, toggle buttons with active state
- **ImportBox** — card with file icon, hint box, lucide buttons
- **Expanded row panel** — v0 muted background, clean notes textarea
- **FundamentalsPanel + MarketComparison** — updated CSS vars
- **AccuracyChart (full rewrite)** — v0 Opción A design:
  - "Accuracy Stats" h1 header
  - 4 KPI cards (Overall hit rate, Total hits, Misses, Awaiting)
  - 4 horizon hit rate cards with progress bars
  - Area chart SVG (accuracy over time)
  - Historical batches table (Load, CSV export, Delete)
- **global.css** — added `@keyframes spin` for loading spinners

**Files changed:** `HorizonTabs.jsx`, `SectorControls.jsx`, `ImportBox.jsx`,
`StockRow.jsx`, `AccuracyChart.jsx`, `global.css`

---

### v6.0.5 — Fix syntax error in StockTable.jsx
**Date:** May 2026

**Fixed:** Orphaned fragment from old `Th` component left in StockTable.jsx
after str_replace in v6.0.4 — lines 92-99 with `<HelpBtn>` and `</th>`
caused esbuild parse error `Expected identifier but found "/"`.

**Files changed:** `src/components/StockTable.jsx`

---

### v6.0.4 — v0 visual style applied to main components
**Date:** May 2026

**Applied v0 design language to all main components:**
- **Header** — "Batch Overview" title h1, subtitle, lucide icons on buttons
- **SummaryCards** — v0 KPI cards with icon, large number, subtle subtext
- **FetchBar / FundamentalsBar / MarketBar** — clean card style with border
- **StockTable** — "Batch Predictions" title + legend, clean white card,
  muted header, hover rows
- **StockRow** — larger padding (12px), muted company text, clean ticker

**Files changed:** `Header.jsx`, `SummaryCards.jsx`, `FetchBar.jsx`,
`FundamentalsBar.jsx`, `MarketBar.jsx`, `StockTable.jsx`, `StockRow.jsx`

---

### v6.0.3 — Tailwind 3 + inline styles — Node 18 compatible
**Date:** May 2026

**Problem with v6.0.2:** Tailwind 4 requires Node ≥ 20. Current Mac has
Node 18.20.8 which cannot be updated.

**Solution:** Back to Tailwind 3 (Node 18 compatible). Sidebar and layout
use pure inline styles — no Tailwind classes in JSX at all. Tailwind 3
is only used for utility classes in future components if needed.

**Changes:**
- `@tailwindcss/vite` removed — back to postcss + tailwindcss ^3
- `tw-animate-css` removed
- `global.css` uses `@tailwind base/components/utilities` (v3 syntax)
- CSS variables mapped to Tailwind 3 color tokens via `var(--tw-*)`
- Sidebar 100% inline styles — no className
- App layout 100% inline styles — no className
- v0 color palette preserved via CSS variables

**After installing:** `npm install` then `npm run dev`

**Files changed:** `package.json`, `vite.config.js`, `tailwind.config.js`,
`postcss.config.js`, `global.css`, `Sidebar.jsx`, `App.jsx`

---

### v6.0.2 — Tailwind 4 + v0 theme — sidebar now works
**Date:** May 2026

**Root cause fix:** v6.0.0/v6.0.1 used Tailwind 3 but v0 uses Tailwind 4.
Without Tailwind 4 processing, all `className` styles were ignored.

**Changes:**
- Tailwind 3 → Tailwind 4 + `@tailwindcss/vite` plugin
- Removed `tailwind.config.js` and `postcss.config.js`
- `global.css` replaced with v0 premium oklch theme
- Sidebar uses Tailwind 4 classes — matches v0 exactly
- Dark mode uses `.dark` on `<html>` (Tailwind 4 convention)
- App layout: `className="flex h-screen overflow-hidden"`

**After installing:** `npm install` then `npm run dev`

**Files changed:** `package.json`, `vite.config.js`, `global.css`,
`Sidebar.jsx`, `App.jsx`

---

### v6.0.1 — Fix sidebar not rendering and old columns in table
**Date:** May 2026

**Fixed:**

**Sidebar invisible (bug):**
Sidebar component used Tailwind CSS classes (`className="flex h-screen..."`)
but Tailwind is not yet processed by Vite in this project. Rewritten entirely
with inline styles — no Tailwind dependency, works immediately.

**Old columns still showing (bug):**
StockRow still rendered old columns (Sector, Industry, Currency, Base date,
Base price, Override) before the new horizon bars. These 6 columns were not
removed when new columns were added in v6.0.0. Now removed — table is:
```
Ticker | Company | Price | 1M | 3M | 6M | 12M | vs SPY | vs Sector
```

**Files changed:**
- `src/components/Sidebar.jsx` — full rewrite with inline styles
- `src/components/StockRow.jsx` — old columns removed

---

### v6.0.0 — Full UI redesign: sidebar navigation + horizon proximity bars
**Date:** May 2026

**Major redesign — breaking visual change:**

**New sidebar navigation:**
- Collapsible left sidebar (220px → 56px) with smooth animation
- 3 sections: 📊 Batch Overview · 🎯 Accuracy Stats · ⚙️ Settings
- Accuracy Stats is now a dedicated page (previously embedded in batch view)
- Full-height layout (`h-screen`) with scrollable main area

**New stock table columns:**
- Removed: Sector, Industry, Currency, Base date, Base price, Override,
  Hit?, Distance, Result (14 → 9 columns)
- Added: Horizon proximity bars for 1M/3M/6M/12M (color + % + bar)
- Added: vs SPY column (beat/lagged with %)
- Added: vs Sector ETF column (beat/lagged with ETF symbol)

**Horizon proximity bars:**
- 6px colored bar per horizon filling left→right by proximity
- Colors: 🟢 HIT/exceeded · 🔵 near <5% · 🟡 close 5-15% · 🟠 far 15-30% · 🔴 very far >30% · ⬜ MISS
- HIT shows exact % above target (e.g. HIT +5.8%)
- MISS shows exact % below target at expiry (e.g. MISS −8.2%)

**Accuracy Stats page (new design):**
- 4 KPI cards: Overall Hit Rate · Hits · Misses · Awaiting
- 4 horizon hit rate cards (1M/3M/6M/12M) with progress bar
- Accuracy trend chart (area chart)
- Historical batches table with Load + CSV buttons

**New files:**
- `src/components/Sidebar.jsx` — collapsible sidebar with nav

**Files changed:**
- `src/App.jsx` — sidebar layout, activePage state, page routing
- `src/components/StockRow.jsx` — horizon bars, SPY/sector columns
- `src/components/StockTable.jsx` — new column headers
- `src/styles/global.css` — html/body height for sidebar layout

---

### v5.4.0 — Technical preparation for v6.0.0 redesign
**Date:** May 2026

**Context:**
v5.4.0 is a pure technical preparation version — no visible UI changes for
the user. It installs the dependencies and configuration needed for the full
UI redesign planned in v6.0.0 (shadcn/ui + Tailwind + sidebar layout).

**Roadmap from here:**
```
v5.4.0  ← this version — technical prep (dependencies + CSS variables)
v6.0.0  ← full UI redesign with shadcn/ui components + sidebar navigation
v6.1.0  ← post-deploy adjustments and UX improvements
```

**Changes:**

**Light mode as default:**
The app now opens in light mode by default. Dark mode is still available
via the toggle button. Previous default was dark mode.

**New dependencies added to package.json:**
- `tailwindcss` ^3.4.17 — utility CSS framework used by shadcn/ui
- `autoprefixer` + `postcss` — required for Tailwind compilation
- `@radix-ui/*` — 8 Radix UI primitives used by shadcn components
  (dialog, dropdown-menu, select, separator, slot, tabs, tooltip, collapsible)
- `class-variance-authority` — variant management for shadcn components
- `clsx` + `tailwind-merge` — class name utilities
- `lucide-react` — icon library (same icons used in v0/shadcn)
- `recharts` — chart library for accuracy trend charts in v6.0.0

**New files created:**
- `tailwind.config.js` — Tailwind config with shadcn color token mapping,
  dark mode via `class`, content paths for src/
- `postcss.config.js` — PostCSS config for Tailwind compilation
- `src/lib/utils.js` — `cn()` helper function (clsx + tailwind-merge),
  required by all shadcn/ui components

**CSS variables extended:**
`src/styles/global.css` now includes a second block of HSL CSS variables
(`--background`, `--foreground`, `--card`, `--primary`, `--sidebar`, etc.)
that map to Tailwind color tokens. These coexist with the existing Design v5
variables and are required by shadcn/ui components in v6.0.0.

**Supabase migration required:** None.

**Files changed:**
- `package.json` — version bump + new dependencies
- `tailwind.config.js` — new file
- `postcss.config.js` — new file
- `src/lib/utils.js` — new file
- `src/styles/global.css` — shadcn HSL variables appended

---

### v5.3.0 — UX: batch indicator, currency symbols, CSV export
**Date:** May 2026

**New:**
- **Batch indicator** above table: `📂 Batch loaded: 17/03/2026 · 16 stocks · $ USD`
- **Currency symbol** on price columns: `$358.25` / `€53.68` / `£142.30`
- **↓ CSV export** button in batch history — downloads `Openbank_YYYYMMDD.csv`

**Files changed:**
- `src/App.jsx` — loadedBatchDate, batchCurrency, batch indicator
- `src/components/StockTable.jsx` — batchCurrency prop
- `src/components/StockRow.jsx` — currency prefix on prices
- `src/components/AccuracyChart.jsx` — CSV export button

---

### v5.2.9 — Fundamentals saved in Supabase
**Date:** May 2026

**New:**
- **Fundamentals persisted in Supabase** — sector, industry, market cap, beta,
  website, description, CIK, last dividend saved on every "Save batch results"
- **Restored on load** — loading a batch from history restores all fundamentals
  automatically — no need to click "Fetch fundamentals" again
- **Exchange field restored** — since `exchange` is part of fundamentals,
  QQQ detection (NASDAQ stocks) now works correctly after loading from history
- **Full offline session flow:**
  ```
  Save batch (prices + fundamentals + marketData + notes)
  → Load from history next session
  → All data restored: sector/industry/exchange/ETF comparisons all available
  → Only re-fetch if you want updated prices
  ```
- **Supabase migration** (run once before installing):
  ```sql
  ALTER TABLE batches ADD COLUMN fundamentals JSONB DEFAULT NULL;
  ```

**Files changed:**
- `src/hooks/useFundamentals.js` — restoreFundamentals()
- `src/services/storage.js` — fundamentals in save row + load mapping
- `src/hooks/useHistory.js` — fundamentals param in saveBatch + newBatch
- `src/App.jsx` — restoreFundamentals on loadBatch, passed to saveBatch

---

### v5.2.8 — Bar layout fix, RSP and QQQ benchmarks
**Date:** May 2026

**Fixed:**
- **3-column layout** — name (140px fixed) | bar (flex) | % (58px fixed).
  % value never overlaps with bar or name. Long names truncated with `…`
- **Zero-line mode** — `overflow:hidden` keeps bars within track bounds

**New:**
- **RSP (S&P 500 Equal Weight)** — always fetched for all `.US` batches.
  Shows if stock beats market without mega-cap bias of SPY.
- **QQQ (NASDAQ 100)** — fetched only when batch contains NASDAQ stocks
  (detected from `exchange` field in FMP fundamentals).
- Badges: `▲ Beat RSP`, `▲ Beat QQQ` added.

**Files changed:**
- `src/components/StockRow.jsx` — 3-column renderRow, shortLabel, RSP/QQQ
- `src/hooks/useMarketData.js` — RSP always, QQQ if NASDAQ, stored in etfs

---

### v5.2.7 — ETF mapping verified against Twelve Data free tier
**Date:** May 2026

**All ETFs verified available on free plan — 12 sector + 13 industry + 5 EU:**

Sector: `XLK XLE XLF XLV XLI XLB XLY XLP XLU XLRE XLC SPY`
Industry: `SOXX IGV XBI XPH XOP OIH GDX ITA JETS XRT ITB KBE VNQ`
EU: `EWG EWN EWQ EWU EWP` (iShares MSCI — AEX/CAC40/UKX/IBEX35 not on free tier)

New sector mappings: `Internet Content → XLC`
New industry mappings: `Drug Manufacturers General/Specialty → XPH, REIT → VNQ, Retail Discretionary → XRT`
EU fix: replaced DAX/AEX/CAC40/UKX/IBEX35 with iShares country ETFs

**Files changed:**
- `src/hooks/useMarketData.js` — mappings verified and expanded

---

### v5.2.6 — Cache basePrice for market data symbols
**Date:** May 2026

**New:**
- **basePrice cached from Supabase** — when re-fetching market data for a
  batch that was previously saved, `basePrice` (historical close on base date)
  is reused from the saved `market_data` JSONB — no API call needed
- Only `currentPrice` is fetched — saves 1 TD credit per symbol per session
- **Pause reduced** when base is cached: 20s → 8s between symbols
  (only 1 request per symbol instead of 2)
- Log shows `(base cached)` label when basePrice is reused
- Estimated time shown in log reflects cache status:
  `~88s` first time vs `~32s` on re-fetch (4 symbols)

**Credit savings per re-fetch session:**
```
4 symbols × 2 credits = 8 credits (before)
4 symbols × 1 credit  = 4 credits (after)
```

**How it works:**
```
existingMarketData (from Supabase or memory)
  → contains basePrice per symbol
  → fetchSymbolData reads existingEntry?.basePrice
  → if found: skip fetchPriceOnDate, only fetchCurrentPrice
  → changePct recalculated with cached base + new current
```

**Files changed:**
- `src/hooks/useMarketData.js` — fetchSymbolData accepts existingEntry,
  skips historical fetch when basePrice cached, pause 8s vs 20s

---

### v5.2.5 — Fix market data not saved in Supabase + industry ETF cleanup
**Date:** May 2026

**Fixed:**
- **Market data not saved in Supabase** — root cause was that `newBatch`
  was passed to `saveHistory` via `updated.batches[0]` before `horizonStatus`
  and `hitRate` were assigned via mutation. Now the entire `newBatch` object
  is built in one step with all fields present before `updated` is created.
- **Industry ETF mapping cleaned up** — removed ETFs not available on
  Twelve Data free tier that caused fetch errors:
  - Removed: OGIG, CLOU, IHI, IHF, IAI, KRE, SIL, COPX, SLX, BITE, CARZ,
    REZ, INDS, RTL, IYT
  - Kept: SOXX, IGV, XBI, XPH, XOP, OIH, GDX, ITA, JETS, XRT, ITB, KBE
  - `Insurance - Life` has no free-tier industry ETF → shows sector XLF only

**Correct save flow:**
```
1. Fetch prices
2. Fetch market data  ← marketData populated in state
3. Save batch results ← marketData now correctly included in Supabase row
```

**Verify in Supabase:**
```bash
curl "https://yyenwzljojxbqtzcbchk.supabase.co/rest/v1/batches?select=id,date,market_data&order=date.desc&limit=1" \
  -H "apikey: YOUR_KEY"
# market_data should now be non-null after saving
```

**Files changed:**
- `src/hooks/useHistory.js` — newBatch built atomically with all fields
- `src/hooks/useMarketData.js` — INDUSTRY_ETF cleaned to free-tier only

---

### v5.2.4 — Market data: industry ETF, EU markets, Supabase persistence
**Date:** May 2026

**New:**

**Industry ETF (4th bar):**
- Added `INDUSTRY_ETF` mapping in `useMarketData.js` — 30+ industry → ETF pairs
- Examples: Semiconductors→SOXX, Biotechnology→XBI, Banks→KBE,
  Software→IGV, Oil & Gas E&P→XOP, Gold→GDX, Aerospace & Defense→ITA
- 4th bar shown in MarketComparison panel when industry ETF available
- 4th badge: `▲ Beat SOXX by +X.XX%` / `▼ Lagged SOXX by -X.XX%`

**European markets (.DE .AS .PA .L .MC):**
- `Fetch market data` button now appears for EU batches too
- EU_MARKET_INDEX mapping: DE→DAX, AS→AEX, PA→CAC40, L→FTSE100, MC→IBEX35
- Fetches local index instead of SPY for EU batches
- No sector/industry ETF for EU (US-only SPDR ETFs not applicable)
- Benchmark label in panel shows correct index name (e.g. "DAX (Germany)")

**MarketData saved in Supabase:**
- `market_data` JSONB column added to `batches` table
- MarketData saved on every "Save batch results"
- Restored automatically when loading a batch from history — no re-fetch needed
- If marketData already loaded for same base date, fetch is skipped

**Supabase migration (run once in SQL Editor):**
```sql
ALTER TABLE batches ADD COLUMN market_data JSONB DEFAULT NULL;
```

**Files changed:**
- `src/hooks/useMarketData.js` — INDUSTRY_ETF + EU_MARKET_INDEX mappings,
  fetchSymbolData with auto provider, restoreMarketData, existingMarketData skip
- `src/components/MarketBar.jsx` — shows for EU batches, EU index label
- `src/components/StockRow.jsx` — industry ETF 4th bar + badge, benchmark label
- `src/services/storage.js` — market_data in save row + load mapping
- `src/hooks/useHistory.js` — marketData param in saveBatch, stored in newBatch
- `src/App.jsx` — restoreMarketData on loadBatch, passed to saveBatch

---

### v5.2.3 — Bar outline and label position fixes
**Date:** May 2026

**Fixed:**
- **Blue outline on bar, not track** — the stock bar outline now wraps only
  the colored bar itself (sized to the % value), not the full track container.
  Previously the outline spanned the entire row width regardless of bar length.
- **Negative % label to the left** — in zero-line mode, negative values now
  correctly show their % label to the left of the bar (outside), calculated
  as `right: (100 - barLeft)%`. Positive values remain to the right.

**Files changed:**
- `src/components/StockRow.jsx` — outline moved from track div to bar div,
  negative label uses `right` positioning instead of `left`

---

### v5.2.2 — Market comparison bar fixes and rate limit
**Date:** May 2026

**Fixed:**
- **Rate limit** — pause between market data symbols increased from 10s to 20s.
  Each symbol uses 2 TD credits (time_series + price); 20s gap keeps well
  within the 8 req/min free tier limit. Log shows countdown to next symbol.
- **Bar colors** — positive bars now green, negative bars red (both for stock
  and indices). Stock bar uses solid green/red; index bars use transparent tint.
- **Stock bar outline** — blue outline (1.5px) distinguishes the stock row
  visually from index rows in all modes.
- **Smaller bars** — height reduced from 14px to 10px, gap from 5px to 4px.
- **Negative label position** — in zero-line mode, negative % now appears to
  the left of the bar (outside), positive % to the right.
- **Toggle button** — "Collapse all / Expand all" now alternates between
  collapsing and expanding all stock rows. State tracked with `allExpanded`.

**Files changed:**
- `src/components/StockRow.jsx` — bar height 10px, green/red colors,
  blue outline for stock, negative label left, collapseAll/allExpanded useEffect
- `src/components/StockTable.jsx` — allExpanded state, toggle button label
- `src/hooks/useMarketData.js` — 20s pause between symbols, updated log

---

### v5.2.1 — UI fixes and fundamentals improvements
**Date:** May 2026

**Changed:**
- **Forward P/E removed** — not available on free tier (TD `/statistics` = Pro, FMP `eps` = null)
- **CIK (SEC) as clickable link** → opens SEC EDGAR 10-K filings page
- **Zero-line chart** for market comparison when any value is negative:
  all positive → bars from left · any negative → center zero line, bars left/right
- **Collapse all button** above stock table — closes all expanded rows at once
- **Financial Services → XLF** added to sector ETF mapping (covers Insurance variants too)

**Files changed:**
- `src/components/StockRow.jsx` — Forward P/E removed, CIK link, zero-line bars, collapseAll
- `src/components/StockTable.jsx` — collapseAll state, Collapse all button
- `src/hooks/useMarketData.js` — expanded SECTOR_ETF for Financial Services

---

### v5.2.0 — Market comparison: SP500 + sector ETF (US batches)
**Date:** May 2026

**New:**
- **↓ Fetch market data** button — appears only for .US batches
- Fetches SPY (S&P 500) and sector ETFs (SPDR) from Twelve Data
- Compares stock performance vs market since the batch base date
- Shows in expanded panel per stock:
  ```
  📈 Performance since 17 Mar 2026
  INDEX              CHANGE    VS STOCK
  S&P 500 (SPY)      +12.3%    ▲ Beat +7.3%
  Technology (XLK)   +15.1%    ▲ Beat +4.5%
  ```
- Beat market = stock % change > index % change → green ▲
- Lagged market = stock % change < index % change → red ▼
- Only fetches unique sector ETFs needed (not one per stock)
- 1.5s pause between symbols to respect Twelve Data rate limit
- If sector not loaded → SP500 only, message to fetch fundamentals
- If sector has no ETF mapping → note shown in panel

**Sector → ETF SPDR mapping:**
```
Technology → XLK    Energy → XLE       Financials → XLF
Healthcare → XLV    Industrials → XLI  Basic Materials → XLB
Consumer Discretionary → XLY           Consumer Staples → XLP
Utilities → XLU     Real Estate → XLRE Communication → XLC
```

**Files added:**
- `src/hooks/useMarketData.js` — fetch SPY + sector ETFs, SECTOR_ETF map
- `src/components/MarketBar.jsx` — fetch button, only shown for .US batches

**Files changed:**
- `src/components/StockRow.jsx` — MarketComparison sub-component in panel,
  SECTOR_ETF import, marketData prop
- `src/components/StockTable.jsx` — marketData prop passed to StockRow
- `src/App.jsx` — useMarketData hook, MarketBar, reset on import

---

### v5.1.0 — Notes per stock
**Date:** May 2026

**New:**
- **📝 Notes field** in the expanded panel of each stock row
- Free-text area for adding manual context per ticker
- Saves automatically when the field loses focus (onBlur)
- Persisted in Supabase — stored in the `results` JSONB field
  alongside the 1M result row (no new table needed)
- Notes restored automatically when loading a batch from history
- Placeholder text: `Add notes for TER… (saved automatically on blur)`
- Notes reset when importing a new CSV

**How notes are stored:**
```json
{ "ticker": "TER.US", "horizon": "1M", "note": "High volatility — wait for correction", ... }
```
Note is stored only on the 1M result row per ticker to avoid duplication.
When loading a batch, notes are extracted from 1M rows across all tickers.

**Files changed:**
- `src/components/StockRow.jsx` — noteVal state, textarea in expanded panel,
  onBlur save, useEffect sync from prop
- `src/components/StockTable.jsx` — notes and onNoteChange props passed to StockRow
- `src/hooks/useHistory.js` — notes param in saveBatch, note field in results
- `src/App.jsx` — notes state, handleNoteChange, reset on import,
  restore on loadBatch, passed to StockTable and saveBatch

---

### v5.0.8 — Batch merge + delete button in history
**Date:** May 2026

**New:**
- **Batch merge** — saving a CSV with the same base date as an existing batch
  now MERGES the tickers instead of overwriting:
  - Existing tickers not in the new CSV are preserved
  - Tickers in the new CSV replace their existing entries (updated prices)
  - Stock count updates to reflect total unique tickers
  - Log shows: `Merging 3 new tickers with 3 existing — total 6 tickers…`
- **🗑 Delete button** in batch history table — two-click confirmation:
  - First click: button turns red showing `⚠ Confirm` (3s timeout)
  - Second click: deletes from Supabase and removes from history table
  - If not confirmed in 3s, reverts to normal state automatically

**Use case that prompted this fix:**
Two CSVs with the same base date (14/05/2026), 3 tickers each.
Previously: second save overwrote the first — 3 tickers lost.
Now: second save merges — all 6 tickers preserved in one batch.

**Files changed:**
- `src/hooks/useHistory.js` — merge logic in saveBatch, deleteBatch function
- `src/services/storage.js` — deleteHistoryBatch (DELETE /rest/v1/batches?id=eq.X)
- `src/components/AccuracyChart.jsx` — Delete button with 2-click confirm
- `src/App.jsx` — deleteBatch wired through to AccuracyChart

---

### v5.0.7 — Bugfix: FMP and TD fundamentals failing for .US tickers
**Date:** May 2026

**Fixed:**
- FMP `/stable/profile` was called with `NEM.US` instead of `NEM`
  returning empty `[]` for all US market tickers
- Twelve Data `/statistics` was also called with `NEM.US` instead of `NEM`
- Root cause: both functions passed the raw ticker without stripping
  the `.US` suffix introduced in v5.0.5
- Fix: added `fmpSymbol()` — strips `.US` only, keeps EU suffixes
  (FMP natively supports `IFX.DE`, `SAP.DE` etc.)
- Fix: added `tdSymbol()` to useFundamentals — strips ALL suffixes
  (TD uses bare tickers for both US and EU markets)

**Symbol routing after fix:**
```
NEM.US  → FMP: NEM    (strip .US)
IFX.DE  → FMP: IFX.DE (keep EU suffix — FMP supports it)
NEM.US  → TD:  NEM    (strip .US)
IFX.DE  → TD:  IFX    (strip .DE — TD uses bare tickers)
```

**Files changed:**
- `src/hooks/useFundamentals.js` — fmpSymbol(), tdSymbol() helpers,
  applied to fetchFMPProfile and fetchTDForwardPE

---

### v5.0.6 — Ticker display without suffix + column overlap fix
**Date:** May 2026

**Fixed:**
- Ticker column showed full ticker with suffix (`TER.US`, `AIXA.DE`) — now
  shows only the clean ticker (`TER`, `AIXA`) with the market suffix shown
  as small grey text below (`US`, `DE`) for reference
- Ticker and Company columns were overlapping — widths increased
- Suffix preserved internally for API routing — only the display changes

**Files changed:**
- `src/components/StockRow.jsx` — split ticker display: name + suffix label
- `src/components/StockTable.jsx` — Ticker 68px, Company 120px

---

### v5.0.5 — Alpha Vantage integration for European markets
**Date:** May 2026

**New:**
- **Alpha Vantage API** integrated as second price provider for EU markets
- **Auto-detection by ticker suffix** — no config needed, fully automatic:
  - `.US` → Twelve Data (NYSE/NASDAQ, 8 req/min, unlimited)
  - `.DE` `.AS` `.PA` `.L` `.MC` → Alpha Vantage (EU markets, 1 req/s, 25/day)
- **Current prices** — `GLOBAL_QUOTE` endpoint, 1.2s pause between tickers
- **Historical prices** — `TIME_SERIES_DAILY` endpoint, finds closest trading
  day on or before the target date (handles weekends and holidays)
- **Log shows provider** — `5/5 prices loaded via Alpha Vantage` or `via Twelve Data`
- **Segmented progress bar** adapts to Alpha Vantage (one dot per ticker,
  no chunk wait — different rate limit pattern)
- **CSV format updated** — tickers now always include market suffix:
  `AIXA.DE`, `TER.US`, `ASML.AS` etc. Skills updated accordingly.
- New env variable: `VITE_ALPHA_VANTAGE_KEY`

**Alpha Vantage free tier limits:**
- 25 requests/day total
- 1 request/second (no burst)
- Covers: Xetra (.DE), Amsterdam (.AS), Paris (.PA), London (.L)
- Does NOT cover: Madrid BME (.MC) — ACS not found in AV

**Ticker suffix → API routing:**
```
TER.US   → tdSymbol("TER") → Twelve Data /price?symbol=TER
AIXA.DE  → Alpha Vantage GLOBAL_QUOTE?symbol=AIXA.DE
ASML.AS  → Alpha Vantage GLOBAL_QUOTE?symbol=ASML.AS
```

**Files changed:**
- `src/hooks/usePriceFetch.js` — full rewrite: detectProvider, getSuffix,
  fetchCurrentPrices_TD, fetchCurrentPrices_AV, fetchHistoricalPrice_TD,
  fetchHistoricalPrice_AV, tdSymbol helper
- `.env.example` — VITE_ALPHA_VANTAGE_KEY added

---

### v5.0.4 — Load batch directly from history into stock table
**Date:** May 2026

**New:**
- **↑ Load button** on each row of the batch history table
- Click loads that batch's stocks directly into the main stock table —
  no CSV download or reimport needed
- Stocks are reconstructed from the saved results in Supabase:
  ticker, company, base price, base date, and all 4 target prices
- After loading: prices reset, horizon resets to "best", filters reset
- Page scrolls automatically to the top so the loaded stocks are visible
- Button shows `✓ Loaded` for 1.2s after click as visual confirmation
- Batch history acts as a **session history** — resume any previous
  batch with one click, then Fetch prices and Save to update

**Flow:**
```
App opens → auto-load history from Supabase
Batch history table → click ↑ Load on any row
→ stocks load into main table (no CSV needed)
→ Fetch prices → evaluate horizons
→ Save batch results → Supabase updated
```

**Files changed:**
- `src/App.jsx` — `handleLoadBatch` reconstructs stocks from batch results,
  passed to AccuracyChart as `onLoadBatch`
- `src/components/AccuracyChart.jsx` — `onLoadBatch` prop, `loadingBatch`
  state, Load button column in batch history table

---

### v5.0.3 — Column help modals in stock table
**Date:** May 2026

**New:**
- Every column header now has a small `?` button that opens a help modal
- Modal explains the column with a plain-language description and a real example
- 9 help definitions covering all columns:
  Ticker, Sector/Industry, Base date, Base price, Price, Override,
  Horizon targets (shared for 1M/3M/6M/12M), Hit?, Distance, Result
- Modal closes on ✕ button, click outside, or Escape key
- `ColHelpModal` component — self-contained, rendered above the table
- `HelpBtn` component — small circular `?` button inline in each header
- `COL_HELP` dictionary — all column descriptions in one place,
  easy to update without touching layout code

**Files changed:**
- `src/components/StockTable.jsx` — COL_HELP dictionary, HelpBtn,
  ColHelpModal, Th updated to accept colKey and onOpen props

---

### v5.0.2 — updated_at column + batch history improvements
**Date:** May 2026

**New:**
- `updated_at` column added to Supabase `batches` table — tracks when a
  batch was last re-saved (e.g. after a horizon expires and real price fetched)
- Distinction between `saved_at` (first save) and `updated_at` (last update):
  - `saved_at` — set once by Supabase when the row is first created
  - `updated_at` — set by the app on every save, so it always reflects
    the most recent update
- **Batch history table** now shows two columns:
  - **First saved** — `saved_at` from Supabase
  - **Last updated** — `updated_at`, highlighted in blue when different
    from `saved_at` (meaning the batch has been updated at least once)

**Supabase migration (run once in SQL Editor):**
```sql
ALTER TABLE batches ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
```

**Logic clarification — upsert behaviour:**
Each batch has one row identified by its date ID (`"2026-03-17"`).
Re-saving the same batch overwrites the row — no intermediate history is kept.
Only the latest state is stored. This is intentional — what matters for
accuracy is the final evaluated result when each horizon expires, not
intermediate provisional states.

**Files changed:**
- `src/services/storage.js` — `updated_at` included in upsert row,
  `updatedAt` mapped in loadHistory
- `src/hooks/useHistory.js` — `updatedAt` included in batchSummary
- `src/components/AccuracyChart.jsx` — First saved + Last updated columns
  in batch history table

---

### v5.0.1 — Bugfix: batch ID malformed in Supabase
**Date:** May 2026

**Fixed:**
- Batch ID saved as `"undefined-undefined-17 Mar 2026"` instead of `"2026-03-17"`
- Root cause: `formatDate()` returns `"17 Mar 2026"` (human readable) but
  `buildBatchId` expects `"DD/MM/YYYY"` — splitting by `/` returned undefined parts
- Fix: build `batchDateStr` directly from the Date object:
  ```js
  // Before (broken):
  buildBatchId(formatDate(firstBase))  // "17 Mar 2026" → "undefined-undefined-..."

  // After (correct):
  const batchDateStr = `${DD}/${MM}/${YYYY}`  // "17/03/2026"
  buildBatchId(batchDateStr)                  // "2026-03-17" ✓
  ```
- Malformed rows deleted from Supabase via:
  `DELETE /rest/v1/batches?id=like.undefined*`

**Supabase table structure explained:**
```sql
CREATE TABLE batches (
  id             TEXT PRIMARY KEY,  -- Unique batch ID: "2026-03-17"
                                    -- PRIMARY KEY = no duplicates
                                    -- Same ID on re-save = update, not insert
  date           TEXT NOT NULL,     -- Human readable date: "17/03/2026"
                                    -- NOT NULL = required field
  saved_at       TIMESTAMPTZ        -- Exact save timestamp, auto-set by Supabase
                 DEFAULT now(),     -- Example: "2026-05-23T10:30:00Z"
  stocks         INTEGER,           -- Number of stocks in batch (e.g. 16)
  results        JSONB              -- Array of all evaluated predictions
                 DEFAULT '[]',      -- JSONB = structured JSON stored in PostgreSQL
                                    -- Contains: ticker, horizon, verdict, prices...
  horizon_status JSONB              -- Per-horizon expiry status
                 DEFAULT '{}',      -- true = date passed (real historical price)
                                    -- false = date still open (provisional price)
                                    -- Example: {"1M":true,"3M":false,...}
  hit_rate       INTEGER            -- % of predictions that hit target
                                    -- Only counts expired horizons
                                    -- Example: 44 means 44%
);

-- Row Level Security — required for browser access with anon key
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- Open policy for development — restricts by user in v6 (auth)
CREATE POLICY "allow_all" ON batches
  FOR ALL          -- applies to SELECT, INSERT, UPDATE, DELETE
  USING (true)     -- anyone can read
  WITH CHECK (true); -- anyone can write
```

**How to view data in Supabase:**
1. Go to your project at `supabase.com/dashboard`
2. Click **Table Editor** in the left menu
3. Click the **batches** table
4. Rows appear in a visual grid — updates in real time after each Save

**Files changed:**
- `src/hooks/useHistory.js` — batchDateStr built from Date object directly

---

### v5.0.0 — Supabase persistence (PostgreSQL)
**Date:** May 2026

**Changed:**
- Persistence backend migrated from GitHub JSON to **Supabase (PostgreSQL)**
- Only `src/services/storage.js` changed — the rest of the app is unaffected
- Data now stored in a `batches` table with proper SQL structure:
  - `id` TEXT PRIMARY KEY — batch date "YYYY-MM-DD"
  - `date` TEXT — "DD/MM/YYYY"
  - `saved_at` TIMESTAMPTZ — auto-set by Supabase
  - `stocks` INTEGER — number of stocks in batch
  - `results` JSONB — array of all predictions
  - `horizon_status` JSONB — `{ "1M": true, "3M": false, ... }`
  - `hit_rate` INTEGER — 0-100
- Upsert via `Prefer: resolution=merge-duplicates` — same batch ID
  updates the existing row instead of creating a duplicate
- Data accessible from any device with the Supabase anon key
- GitHub credentials (VITE_GITHUB_TOKEN, VITE_GITHUB_REPO) no longer needed
  for persistence — kept in .env for backward compatibility only
- Two new env variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Supabase setup (one time):**
```sql
CREATE TABLE batches (
  id              TEXT PRIMARY KEY,
  date            TEXT NOT NULL,
  saved_at        TIMESTAMPTZ DEFAULT now(),
  stocks          INTEGER,
  results         JSONB NOT NULL DEFAULT '[]',
  horizon_status  JSONB NOT NULL DEFAULT '{}',
  hit_rate        INTEGER
);
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON batches FOR ALL USING (true) WITH CHECK (true);
```

**Architecture:**
```
App → useHistory → storage.js → Supabase REST API → PostgreSQL batches table
```

**Files changed:**
- `src/services/storage.js` — full rewrite for Supabase REST API
- `.env.example` — added VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

---

### v4.5.7 — Interactive horizon toggle in accuracy chart
**Date:** May 2026

**New:**
- Legend buttons in the accuracy chart are now interactive — click any
  horizon (1M / 3M / 6M / 12M) to show or hide its line
- Active horizons: colored border + line color, full opacity
- Inactive horizons: grey border, faded, dashed line on chart
- At least one horizon always stays active (cannot deselect all)
- Chart redraws instantly on toggle — no data refetch needed
- Works correctly in both dark and light mode

**Files changed:**
- `src/components/AccuracyChart.jsx` — `activeHorizons` state + `toggleHorizon`,
  Legend converted to interactive pill buttons, Chart filters by activeHorizons
  (inactive = faint dashed line, no dot labels)

---

### v4.5.6 — Bugfix: horizon status in commit message + ZIP structure
**Date:** May 2026

**Fixed:**
- Commit message showed all horizons as `✓` even when target dates had not
  yet passed — e.g. `1M✓ 3M✓ 6M✓ 12M✓` for a March batch saved in May
  Root cause: `horizonStatus` checked `verdict !== 'awaiting'` which is true
  for any stock with a current price, even provisional ones
  Fix: `horizonStatus[h]` is now `true` only if the horizon target date
  has already passed (`dateStatus(tgtDate) === 'past'`), meaning the
  historical close price is definitively available
  Result: `1M✓ 3M⏳ 6M⏳ 12M⏳` for a March 2026 batch saved in May 2026
- ZIP packaging fixed — files now at root level of ZIP (not inside
  `openbank_v41/` subfolder), consistent with all previous versions
  `cp -r /Users/alex/Downloads/openbank-price-prediction_vX.X.X/. .`

**Files changed:**
- `src/hooks/useHistory.js` — horizonStatus uses dateStatus === 'past',
  added targetDates and dateStatus to imports

---

### v4.5.5 — Segmented progress bar for multi-chunk fetch
**Date:** May 2026

**New:**
- Visual progress bar in FetchBar for batches over 8 tickers (multi-chunk)
- **Segmented design** — one segment per batch (B1 B2 B3…):
  - Blue `B1…` — currently fetching
  - Green `B1 ✓` — batch completed
  - Amber `B1 ⏳` — waiting due to rate limit
  - Grey — pending
- **Green bar** — advances as each batch completes
- **Amber countdown bar** — shows seconds remaining during 62s rate limit pause,
  with label `Rate limit — waiting before batch N… · Xs`
- Progress is hidden for batches ≤ 8 tickers (single chunk, no pause)
- `chunkProgress` state added to `usePriceFetch` hook, emitted in real time
  during fetch and countdown loops

**Files changed:**
- `src/hooks/usePriceFetch.js` — chunkProgress state, per-second countdown
  emitted during inter-chunk pause, returned from hook
- `src/components/FetchBar.jsx` — segmented progress bar, countdown bar
- `src/App.jsx` — passes chunkProgress to FetchBar

---

### v4.5.4 — Bugfix: Twelve Data rate limit with large batches
**Date:** May 2026

**Fixed:**
- Fetching 16+ tickers in a single API call exceeded Twelve Data free tier
  limit of 8 requests/minute → 429 error, all prices failed
- Root cause: `fetchCurrentPrices` sent all tickers in one request,
  consuming N credits at once (1 credit per ticker)
- Fix: split tickers into chunks of 8 with a 62-second pause between chunks
- Log now shows chunk progress for batches over 8 tickers:
  `Fetching 16 tickers in 2 batches of 8 (rate limit: 8/min)...`
- For batches ≤ 8 tickers: single request, no pause, same behaviour as before

**Files changed:**
- `src/hooks/usePriceFetch.js` — CHUNK_SIZE=8 constant, chunked fetch loop,
  62s inter-chunk pause, updated log message

---

### v4.5.3 — Bugfix: duplicate HORIZONS declaration in useHistory
**Date:** May 2026

**Fixed:**
- `const HORIZONS` declared twice inside `saveBatch` — once in the original
  block and once in the `batchMeta` block added in v4.5.2
  esbuild threw: `The symbol "HORIZONS" has already been declared`
- Fix: moved `HORIZONS` to module scope (top of file, outside all functions)
  so it is shared across the entire module

**Files changed:**
- `src/hooks/useHistory.js` — HORIZONS moved to module scope

---

### v4.5.2 — Auto-load history + descriptive commit messages
**Date:** May 2026

**New:**
- **Auto-load on startup** — history loads automatically from GitHub when
  the app opens. No need to click "Load history" manually. Shows
  "Auto-loading history..." in the log while fetching.
- **Descriptive commit messages** — each save to GitHub now generates a
  detailed commit message:
  ```
  data: batch 18/03/2026 · updated 21/05/2026 · 1M✓ 3M⏳ 6M⏳ 12M⏳ · 5 stocks · HIT 67%
  ```
  - `batch DD/MM/YYYY` — screenshot date (base date of the CSV)
  - `updated DD/MM/YYYY` — date the save was triggered
  - `1M✓ 3M⏳` — ✓ = horizon evaluated with real price · ⏳ = still open
  - `N stocks` — number of stocks in the batch
  - `HIT N%` — hit rate of evaluated horizons (omitted if none evaluated yet)

**Files changed:**
- `src/hooks/useHistory.js` — useEffect auto-load, batchMeta computation,
  horizonStatus per horizon, hitRate calculation
- `src/services/storage.js` — saveHistory accepts batchMeta, builds
  descriptive commit message from batch date, update date, horizon status,
  stocks count and hit rate

---

### v4.5.1 — Docs: accuracy tracking setup guide in README
**Date:** May 2026

**Changed:**
- Added dedicated "Accuracy tracking" section to README with:
  - Architecture diagram showing data flow to GitHub
  - Step-by-step setup instructions (repo + PAT + .env)
  - Usage flow (Load history → Save batch → chart updates)
  - Note on future Supabase migration path

**Files changed:**
- `README.md` — new Accuracy tracking section

---

### v4.5.0 — Accuracy tracking with GitHub persistence
**Date:** May 2026

**New:**
- **Accuracy chart** — line chart showing HIT rate % per horizon (1M/3M/6M/12M)
  over time, one data point per saved batch
- **5 KPI cards** — Total evaluated, Overall HIT rate, Best horizon, Worst
  horizon, Batches tracked
- **Breakdown table** — HIT/CLOSE/MISS counts and rates per horizon with
  color-coded accuracy bars (green/amber/red segments)
- **Batch history table** — all saved batches with date, counts, HIT rate
  and save timestamp
- **GitHub persistence** — results saved to private repo `openbank-price-data`
  via GitHub API (PUT `/repos/:owner/:repo/contents/:path`)
  - `Load history` button — fetches `data/history.json` from GitHub
  - `Save batch results` button — evaluates current stocks and commits results
  - Each save creates a new commit in the data repo with message
    `data: update history.json (N batches)`
- **Storage abstraction layer** — `src/services/storage.js` isolates all
  GitHub API calls. Future migration to Supabase only requires changing
  this file — the rest of the app is unaffected
- **`useHistory` hook** — manages load/save/compute stats lifecycle
- Graceful degradation — if GitHub not configured, shows setup instructions
- Two new env variables: `VITE_GITHUB_TOKEN`, `VITE_GITHUB_REPO`

**Architecture:**
```
App → useHistory → storage.js → GitHub API → openbank-price-data (private repo)
                                           → data/history.json
```

**Files added:**
- `src/services/storage.js` — GitHub API abstraction layer
- `src/hooks/useHistory.js` — history load/save/stats hook
- `src/components/AccuracyChart.jsx` — chart + tables + KPI cards

**Files changed:**
- `src/App.jsx` — useHistory, AccuracyChart wired in
- `.env.example` — VITE_GITHUB_TOKEN, VITE_GITHUB_REPO

---

### v4.4.0 — Industry column + expanded fundamentals panel
**Date:** May 2026

**New:**
- **Industry column** added to the main table — new column between Sector and Cur.
- **Industry filter dropdown** in SectorControls — same filter/group/sort
  pattern as Sector. Resets to "All industries" when Sector filter changes.
  Only shows industries matching the selected sector.
- **Expanded panel** — 5 new fields from FMP `/stable/profile`:
  - **Beta** — volatility vs S&P500
  - **Last Dividend** — most recent dividend per share (prefixed with $)
  - **CIK (SEC)** — SEC identifier in monospace font
  - **Website** — clickable link opening company site in new tab
  - **Description** — 📄 Read more button opens a dedicated modal overlay
    with full company description. Closes on ✕, Escape, or click outside.
- FMP fetch updated to extract: `website`, `lastDividend`, `cik`, `description`

**Files changed:**
- `src/hooks/useFundamentals.js` — 4 new fields from FMP profile
- `src/App.jsx` — `filterIndustry` state, `industries` computed, reset on import
- `src/components/SectorControls.jsx` — industry dropdown
- `src/components/StockTable.jsx` — Industry column header, colSpan 16, minWidth 1280
- `src/components/StockRow.jsx` — industry cell, description modal, new panel fields

---

### v4.3.0 — Design system v5
**Date:** May 2026

**New:**
- Full adoption of personal design system v5 across all components
- **Dark mode** — azul marino (`#273550`) replacing pure black. Surfaces
  `#2e3f60` / `#364970`, text `#eef2fa` (near white), muted `#96aece`
- **Light mode** — `#f0f2f5` background, white surfaces, text `#1a1f2e`,
  font size base 15px (up from 14px) for better readability
- **Button system** — five distinct roles:
  Toggle (blue border square), Neutral (grey), Blue outline, Green fill, Clear (red text)
- Default mode changed to light
- CSS variables renamed to design-v5 convention
- Cards: `border-radius: 12px` + `box-shadow: var(--shadow)`

**Files changed:**
- `src/styles/global.css` — full design-v5 palette
- All components updated with new tokens and button styles

---

### v4.2.1 — Full light theme + mobile-compatible email
**Date:** May 2026

**New:**
- All components now use CSS variables — light/dark theme works everywhere
  Previously FetchBar, FundamentalsBar, SummaryCards, HorizonTabs,
  StockTable, StockRow, ImportBox, SectorControls had hardcoded dark colors
- Email table reduced from 9 to 7 columns:
  Ticker+Sector | Company | Price | Target+date | Days | Distance | Result
  Max width ~600px — fits iPhone screen without horizontal scroll
  Summary cards use HTML table (width%) instead of CSS flexbox for Gmail compat
  No more overflow-x:auto needed

**Files changed:**
- All components: CSS variables via `var(--bg)`, `var(--text)` etc.
- `src/components/EmailPreview.jsx` — 7-column email, nested HTML tables

---

### v4.2.0 — Dark/light mode toggle + Email modal
**Date:** May 2026

**New:**
- **Dark/light mode toggle** — ☀️/🌙 button in header switches between themes
  instantly. Uses CSS custom properties (`data-theme` attribute on `<html>`)
  so all components update automatically without inline style changes.
  Light theme uses GitHub-style light palette.
- **Email report modal** — clicking "✉ Email report" opens a centered overlay
  above the page. No more scrolling to reach send buttons.
  - Close with ✕ button, Escape key, or clicking outside the modal
  - `autoFocus` on the To: field for immediate keyboard input
  - Modal uses `var(--bg-2)` and `var(--border)` — adapts to current theme

**Files changed:**
- `src/styles/global.css` — light theme variables, `.modal-overlay` and
  `.modal-box` CSS classes
- `src/components/Header.jsx` — dark/light toggle button, CSS variable colors
- `src/components/EmailPreview.jsx` — modal layout, Escape key handler,
  CSS variable colors throughout
- `src/App.jsx` — `darkMode` state, `useEffect` sets `data-theme` on `<html>`

---

### v4.1.9 — Default recipient email
**Date:** May 2026

**Changed:**
- Email report To field pre-filled with `alpyengine@gmail.com`
- Field remains editable — clear and type any other address as needed

**Files changed:**
- `src/components/EmailPreview.jsx` — default email in useState

---

### v4.1.8 — Email table horizontal scroll
**Date:** May 2026

**Fixed:**
- Gmail web clips the email table when the window is narrow
- Gmail ignores CSS @media queries so responsive breakpoints don't work
- Fix: wrapped desktop table in `overflow-x:auto` div with `min-width:700px`
  Gmail respects inline overflow-x — table stays readable with a scrollbar

**Files changed:**
- `src/components/EmailPreview.jsx` — scroll wrapper around desktop table

---

### v4.1.7 — Responsive email + days remaining
**Date:** May 2026

**New:**
- Email is now fully responsive:
  - Desktop (>620px): horizontal table as before
  - Mobile (≤620px): vertical card per stock with all data grouped
  - Uses CSS `@media` query — works in Gmail app and Apple Mail
- Days remaining column added to email table (desktop) and cards (mobile)
  - Green: >14 days left
  - Amber: ≤14 days left
  - Red: expired (shows "Xd ago")
- Days remaining added to app table — shown below Hit/Miss badge
  for the active horizon tab (not shown on "Best target")
- Expandable panel now shows days remaining for all 4 horizons
  with color coding, plus a divider before fundamentals data

**Files changed:**
- `src/components/EmailPreview.jsx` — responsive HTML, days column
- `src/components/StockRow.jsx` — days below badge, panel horizon dates

---

### v4.1.6 — Light theme email + Base price column
**Date:** May 2026

**New:**
- Email report redesigned with light theme — white background, dark header band,
  soft color cards, clean table with subtle alternating rows
- Base price column added to both the app table and the email report
  showing the stock price at the time of the Openbank screenshot
- Email table now has: Ticker+Sector, Company, Base date, Base price,
  Current price, Target+date, Distance, Result badge, Fundamentals

**Files changed:**
- `src/components/EmailPreview.jsx` — light theme HTML, base price column
- `src/components/StockTable.jsx` — base price column header, minWidth 1180px
- `src/components/StockRow.jsx` — base price cell, colSpan updated to 15

---

### v4.1.5 — HTML email report
**Date:** May 2026

**New:**
- Email report now sends fully styled HTML instead of plain text
- Dark theme matching the app (GitHub-style palette)
- Summary cards at top: Total / Hit / Near / Miss / Awaiting
- Stock table with color-coded Result badges (green HIT, amber CLOSE, red MISS)
- Sector shown below ticker in the table
- Fundamentals column: Market Cap, Forward P/E, Beta (when loaded)
- Price column shows date for historical prices (expired horizons)
- Target column shows target date below the price
- Distance colored by verdict (green/amber/red)
- Footer with data sources and report date
- EmailJS template updated to use `{{{report_body}}}` (triple brace = HTML)
- Preview in app shows truncated raw HTML with hint

**Files changed:**
- `src/components/EmailPreview.jsx` — full HTML builder, fundamentals column
- `src/App.jsx` — passes `fundamentals` prop to EmailPreview

---

### v4.1.4 — Email sending via EmailJS
**Date:** May 2026

**New:**
- Email report can now be sent directly from the app to any recipient
- Recipient email input field in the Email report panel
- "Send" button — calls EmailJS API, no backend required
- EmailJS SDK loaded dynamically at runtime (no npm install)
- Success/error feedback message after send attempt
- Enter key on email input triggers send
- Three new env variables required: `VITE_EMAILJS_SERVICE_ID`,
  `VITE_EMAILJS_TEMPLATE_ID`, `VITE_EMAILJS_PUBLIC_KEY`
- `.env.example` updated with EmailJS variables
- Email sent from dedicated Gmail account via EmailJS service

**Setup required:**
1. Create account at emailjs.com
2. Add Gmail service — connect dedicated Gmail account
3. Create template with variables: `{{to_email}}`, `{{report_date}}`, `{{report_body}}`
4. Add 3 keys to `.env`

**Files changed:**
- `src/components/EmailPreview.jsx` — recipient input, Send button, EmailJS integration
- `.env.example` — added EmailJS variables

---

### v4.1.3 — Bugfix: Clear overrides not resetting input values
**Date:** May 2026

**Fixed:**
- Pressing "Clear overrides" removed overrides from App state but the
  input fields in each StockRow still showed the old manually entered values
- Root cause: `useState(override ? String(override) : '')` only runs once
  on mount — it does not react to prop changes after that
- Fix: added `useEffect` in StockRow that watches the `override` prop and
  syncs the local `val` state — when override becomes `null` (cleared),
  the input is reset to empty string

**Files changed:**
- `src/components/StockRow.jsx` — added `useEffect` to sync input with override prop

---

### v4.1.2 — Switch sector source to Financial Modeling Prep
**Date:** May 2026

**Changed:**
- Twelve Data `/profile` endpoint requires paid plan (403 error on free tier)
- Switched sector and company profile data to **Financial Modeling Prep (FMP)**
  free tier — 250 requests/day, no credit card required
- FMP endpoint: `GET /stable/profile?symbol=TER&apikey=KEY`
  Returns: sector, industry, marketCap, beta
- Twelve Data `/statistics` retained for forward P/E only
- Both APIs called in parallel via `Promise.allSettled` — one failing does not
  block the other
- `.env.example` updated with `VITE_FMP_KEY` variable
- FMP historical price endpoints not available on free plan — Twelve Data
  remains the source for current prices and historical closes

**Files changed:**
- `src/hooks/useFundamentals.js` — FMP for profile, TD for forwardPE
- `.env.example` — added `VITE_FMP_KEY`

---

### v4.1.1 — Bugfix: sector display and button icons
**Date:** May 2026

**Fixed:**
- Sector column showing `--` despite fundamentals loading 5/5 — caused by
  `useFundamentals` calling `setFundamentals` only once at the end of the
  fetch loop. React batching prevented intermediate updates from reaching
  `StockRow`. Fix: `setFundamentals({ ...newData })` now called after each
  ticker with a new spread object, forcing React to detect the change and
  rerender immediately as data arrives
- Group and Sort buttons showing raw HTML entities (`&#9660;`, `&#9658;`,
  `&#8597;`) instead of triangle/arrow symbols — JSX does not interpret
  HTML entities in string literals. Fix: replaced with Unicode characters
  directly (`▼`, `▶`, `↕`)

**Files changed:**
- `src/hooks/useFundamentals.js` — `setFundamentals` called after each ticker
- `src/components/SectorControls.jsx` — Unicode chars instead of HTML entities
- `src/components/StockTable.jsx` — added `fundamentalKey` prop for memo safety

---

### v4.1.0 — Sector, market cap, PER forward + sector grouping
**Date:** May 2026

**New:**
- `useFundamentals.js` hook — fetches sector and industry via Twelve Data
  `/profile`, and market cap, forward P/E, beta via `/statistics`
- `FundamentalsBar` — dedicated fetch bar for fundamentals with status log
- `SectorControls` — three controls above the table:
  - Dropdown filter: show only one sector
  - Group toggle: collapses/expands sector groups in the table
  - Sort toggle: sorts all stocks alphabetically by sector
- `StockRow` expandable panel — click any row to expand a detail panel
  showing Sector, Industry, Market Cap, Forward P/E, Beta
- Sector column added to the main table
- Sector groups are collapsible — click the group header to collapse
- `fmtMarketCap()` — formats raw values to human readable (4.4T, 180B, 2.3M)
- Rate limit protection: 800ms delay between tickers (2 parallel calls each)

**Files changed:**
- `src/hooks/useFundamentals.js` — new
- `src/components/FundamentalsBar.jsx` — new
- `src/components/SectorControls.jsx` — new
- `src/components/StockRow.jsx` — sector column, expandable panel
- `src/components/StockTable.jsx` — grouping, sorting, filtering logic
- `src/App.jsx` — wires useFundamentals, SectorControls, FundamentalsBar

---

### v4.0.0 — CSV file upload + Clear button
**Date:** May 2026

**New:**
- **Load CSV file** button — opens file picker, reads `.csv` directly from disk,
  auto-imports on load without needing to click Import
- **Header row detection** — first row skipped automatically if it contains
  column names (Ticker, Company, Symbol, etc.)
- **Clear button** — resets textarea, file input, error and success messages
- Success message shows count of imported stocks and whether header was skipped
- Textarea placeholder now shows the header row format for clarity
- Visual dividers between button groups for better UX

**Files changed:** `src/components/ImportBox.jsx`

---

### v3.1.2 — Documentation: complete pre-React history
**Date:** May 2026

- README.md: changelog extended from v0.2.0 (all pre-React HTML versions
  documented with features, known issues and lessons learned)
- GIT_GUIDE.md: expanded to 16 steps covering all versions including
  v0.2.0 through v1.0.0-vanilla with exact Mac paths, commit messages and tags
- Note added about {src spurious folder and node_modules handling

**Files changed:** `README.md`, `GIT_GUIDE.md`

---

### v3.1.1 — Documentation
**Date:** May 2026

- Full changelog added to README covering all versions from v0.2.0
- GIT_GUIDE.md updated with complete step-by-step git commands
  for all versions including pre-React HTML versions

**Files changed:** `README.md`, `GIT_GUIDE.md`

---

### v3.1.0 — Direction-aware prediction logic
**Date:** May 2026

**New:**
- `evaluatePrediction(price, target, basePrice)` — determines direction
  (bullish/bearish/neutral) and evaluates HIT/CLOSE/MISS accordingly
- Bearish predictions require `price <= target` to be a HIT
- Direction arrows on target columns (↑ green / ↓ red / → gray)
- CLOSE badge (amber) for ±5% proximity
- Result labels: "✓ Reached" / "✓ Dropped" / "✗ Not reached" / "✗ Didn't drop"
- DistBar: bar on top, % below — no overlap with Result column
- SummaryCards uses `evaluatePrediction`

**Fixed:**
- Bearish predictions incorrectly showing "Reached" when price was above
  a downward target (e.g. NEM 113.41 vs bearish target 55.10)

**Files changed:** `stocks.js`, `StockRow.jsx`, `SummaryCards.jsx`

---

### v3.0.1 — UI fixes
**Date:** May 2026

**Fixed:**
- Status/Distance columns overlapping — Result column widened to 120px
- Table minWidth increased to 1060px
- Result text shortened to prevent overflow
- Best target tab shows which horizon per stock (`vs 12M · today`)
- HorizonTabs expired banner: removed stale "coming in next version" text

**Files changed:** `StockTable.jsx`, `StockRow.jsx`, `HorizonTabs.jsx`

---

### v3.0.0 — Historical price fetch
**Date:** May 2026

**New:**
- Expired horizon tabs auto-fetch closing price on exact target date
- Twelve Data `/time_series` with 7-day lookback (handles weekends/holidays)
- `usePriceFetch.js`: `fetchCurrentBatch()` + `fetchHistoricalForHorizon()`
- `histPrices` state keyed by `TICKER_HORIZON` (e.g. `TER_1M`)
- `getEffectivePrice()`: override > historical > current
- `App.jsx` useEffect triggers historical fetch on expired tab switch
- FetchBar shows mode badge (current / historical · 1M)
- Price column shows "close on YYYY-MM-DD" for historical prices
- Loading state per row while fetching

**Files changed:** `usePriceFetch.js`, `stocks.js`, `App.jsx`, `FetchBar.jsx`,
`StockRow.jsx`, `StockTable.jsx`, `SummaryCards.jsx`, `EmailPreview.jsx`

---

### v2.0.2 — Bugfix: React style conflict
**Date:** May 2026

**Fixed:**
- `HorizonTabs` mixed `border` shorthand with `borderColor` longhand
- React rejected this during rerender → fetch failure + console warning
- All tab variants now use full `border` shorthand

**Files changed:** `HorizonTabs.jsx`

---

### v2.0.1 — Horizon status indicators
**Date:** May 2026

**New:**
- `expired` / `soon` / `now` tags on all 4 target columns
- Countdown days below each target price
- Tab border color by status (red = expired, amber = soon)
- Dot indicator on non-active tabs
- Three contextual banners: expired warning, approaching, target today
- Date reference bar colored by horizon status

**Files changed:** `StockRow.jsx`, `HorizonTabs.jsx`

---

### v2.0.0 — React only, no backend
**Date:** May 2026

**Architecture change:** Python backend eliminated.

**New:**
- Twelve Data API called directly from browser (CORS open)
- `usePriceFetch.js` — single batch request for all tickers
- `.env` / `VITE_TWELVE_DATA_KEY`
- Single terminal: `npm run dev`
- `React.memo` on StockRow
- Override: local state + onBlur/Enter commit — no focus loss

**Removed:** `backend/run.py`, `pip` dependencies, Vite proxy

---

### v1.0.0 — React + Python backend
**Date:** May 2026

**New:**
- React 18 + Vite frontend
- Python `run.py`: `/health` + `/prices` endpoints
- Price sources: yfinance → stooq cascade fallback
- Vite proxy: `/api/*` → `http://localhost:8765`
- `React.memo` on StockRow
- Override: onBlur commit, no focus loss on typing
- Two terminals required

---

### v1.0.0-vanilla — Final HTML + Python version
**Date:** May 2026

**Features:**
- Full dark mode UI
- CSV import with screenshot date (9 fields)
- Date-aware target horizon dates per stock
- Manual price override (onBlur, no focus loss)
- Horizon tabs with expired/soon/now tags
- Distance bar + Hit/Miss badges
- Email report generator
- Price fetch via Python server: yfinance → stooq → Alpha Vantage
- Extension-blocking workaround documented

**Known issues resolved in v1.0.0:**
- No React component isolation
- Full table rebuild on any state change

---

### v0.6.0 — HTML with allorigins proxy attempt
**Date:** May 2026

**Changed:**
- Attempted to replace Python server with allorigins.win CORS proxy
- fetch via `https://api.allorigins.win/get?url=...` to Yahoo Finance
- Failed: allorigins also blocked from `file://` origin
- `run.py`: same multi-source version as v0.5.0

**Lesson learned:** Any external fetch from `file://` is blocked by browser
regardless of CORS headers on the target server.

---

### v0.5.0 — Multi-source Python server + currencies
**Date:** May 2026

**New in run.py:**
- Three price sources in cascade: yfinance → stooq → Alpha Vantage
- `currencies` query param: `/prices?tickers=TER&currencies=USD`
- stooq suffix map by currency (USD→.us, EUR→.de, GBP→.uk...)
- Alpha Vantage support via `AV_KEY` env var
- `do_OPTIONS` for CORS preflight
- Port-in-use error detection
- `time.sleep(0.3)` between tickers (rate limit protection)
- `requests` library required alongside `yfinance`

**New in HTML:**
- Screenshot date field added to CSV (9th field, DD/MM/YYYY)
- Each stock can have different base date
- Target dates calculated per stock from base date
- Horizon date bar shows target dates with countdown

---

### v0.4.0 — Python 2/3 compatible server + MIME types
**Date:** May 2026

**New in run.py:**
- Python 2/3 compatibility (`PY2` flag, conditional imports)
- `YF_OK` flag — graceful handling when yfinance not installed
- Full MIME type map (.html, .js, .css, .json, .png, .ico, .svg)
- `do_OPTIONS` added for CORS preflight
- Path traversal security check (`os.path.normpath`)
- Port-in-use error with clear message
- `fetch_all()` wrapper with per-ticker logging
- ASCII-only source (no Unicode box-drawing chars)

**Fixed:**
- `SyntaxError: Non-ASCII character` on Python 2 (box-drawing dashes)

---

### v0.3.0 — Dark mode HTML + improved UX
**Date:** May 2026

**New in HTML:**
- Full dark mode UI (GitHub-style color palette)
- Summary cards (Total / Hit / Close / Awaiting)
- Horizon tabs (Best / 1M / 3M / 6M / 12M)
- Distance bar visualization
- Email report generator with Copy button
- Server warning banner when run.py not running
- `checkServer()` with retries
- fetch timeout via AbortController
- Error classification (timeout / no server / CORS)

**run.py:** same as v0.2.0

---

### v0.2.0 — First functional HTML + Python version
**Date:** May 2026

**Features:**
- Single HTML file, light theme
- JSON import (not CSV)
- Basic table: Ticker / Target / Auto Price / Override / Distance / Status
- `updateOverride()` updates only the changed row (no full redraw)
- `run.py`: SimpleHTTPRequestHandler, yfinance only, f-strings
- `/prices?tickers=TER,HWM` endpoint
- `/health` endpoint
- Auto-opens browser on start

**Known issues:**
- Light theme only
- JSON import instead of CSV
- Only one price source (yfinance)
- No Python 2 compatibility
- No horizon tabs
- No date-aware targets

---

## Version summary

| Version          | Date     | Architecture              | Key change                                      |
|------------------|----------|---------------------------|-------------------------------------------------|
| v0.2.0           | 2026-05  | HTML + Python (yfinance)  | First functional version                        |
| v0.3.0           | 2026-05  | HTML + Python             | Dark mode, summary cards, horizon tabs          |
| v0.4.0           | 2026-05  | HTML + Python (Py2/3)     | Python 2/3 compat, MIME types, ASCII fix        |
| v0.5.0           | 2026-05  | HTML + Python (multi-src) | yfinance→stooq→AV cascade, currencies, CSV date |
| v0.6.0           | 2026-05  | HTML + allorigins proxy   | Proxy attempt (failed), lesson learned           |
| v1.0.0-vanilla   | 2026-05  | HTML + Python (final)     | Stable final HTML version                       |
| v1.0.0           | 2026-05  | React + Python            | React rewrite, memo, focus fix                  |
| v2.0.0           | 2026-05  | React only                | Twelve Data API, no backend                     |
| v2.0.1           | 2026-05  | React only                | Horizon status tags on all columns              |
| v2.0.2           | 2026-05  | React only                | Bugfix: border style conflict                   |
| v3.0.0           | 2026-05  | React only                | Historical prices for expired horizons          |
| v3.0.1           | 2026-05  | React only                | UI fixes: overlap, columns, labels              |
| v3.1.0           | 2026-05  | React only                | Direction-aware Hit/Miss, distance layout       |
| v3.1.1           | 2026-05  | React only                | Full docs: README changelog + GIT_GUIDE         |
| v3.1.2           | 2026-05  | React only                | Docs: complete pre-React history v0.2.0-v1.0.0  |
| v4.0.0           | 2026-05  | React only                | CSV file upload + Clear button                  |
| v4.1.0           | 2026-05  | React only                | Sector, market cap, PER forward + grouping      |
| v4.1.1           | 2026-05  | React only                | Bugfix: sector display + button Unicode icons   |
| v4.1.2           | 2026-05  | React only                | Switch sector source to FMP (TD /profile = 403) |
| v4.1.3           | 2026-05  | React only                | Bugfix: Clear overrides not resetting inputs     |
| v4.1.4           | 2026-05  | React only                | Email sending via EmailJS                        |
| v4.1.5           | 2026-05  | React only                | HTML email report with styling and fundamentals  |
| v4.1.6           | 2026-05  | React only                | Light theme email + Base price column in table   |
| v4.1.7           | 2026-05  | React only                | Responsive email + days remaining column         |
| v4.1.8           | 2026-05  | React only                | Email table horizontal scroll (Gmail fix)        |
| v4.1.9           | 2026-05  | React only                | Default recipient email pre-filled               |
| v4.2.0           | 2026-05  | React only                | Dark/light mode toggle + Email modal overlay     |
| v4.2.1           | 2026-05  | React only                | Full light theme + 7-col mobile email            |
| v4.3.0           | 2026-05  | React only                | Design system v5 — azul marino dark + btn roles  |
| v4.4.0           | 2026-05  | React only                | Industry column + expanded fundamentals panel     |
| v4.5.0           | 2026-05  | React only                | Accuracy chart + GitHub persistence              |
| v4.5.1           | 2026-05  | React only                | Docs: accuracy tracking setup guide in README    |
| v4.5.2           | 2026-05  | React only                | Auto-load history + descriptive commit messages  |
| v4.5.3           | 2026-05  | React only                | Bugfix: duplicate HORIZONS declaration           |
| v4.5.4           | 2026-05  | React only                | Bugfix: Twelve Data rate limit with 16+ tickers  |
| v4.5.5           | 2026-05  | React only                | Segmented progress bar for multi-chunk fetch      |
| v4.5.6           | 2026-05  | React only                | Bugfix: horizon status in commit + ZIP structure  |
| v4.5.7           | 2026-05  | React only                | Interactive horizon toggle in accuracy chart      |
| v5.0.0           | 2026-05  | React + Supabase          | Migrate persistence to Supabase PostgreSQL        |
| v5.0.1           | 2026-05  | React + Supabase          | Bugfix: batch ID malformed in Supabase            |
| v5.0.2           | 2026-05  | React + Supabase          | updated_at column + batch history improvements    |
| v5.0.3           | 2026-05  | React + Supabase          | Column help modals in stock table                 |
| v5.0.4           | 2026-05  | React + Supabase          | Load batch directly from history into stock table |
| v5.0.5           | 2026-05  | React + Supabase          | Alpha Vantage for EU markets (.DE .AS .PA .L)     |
| v5.0.6           | 2026-05  | React + Supabase          | Ticker display without suffix + column overlap fix |
| v5.0.7           | 2026-05  | React + Supabase          | Bugfix: FMP and TD fundamentals failing for .US    |
| v5.0.8           | 2026-05  | React + Supabase          | Batch merge + delete button in history             |
| v5.1.0           | 2026-05  | React + Supabase          | Notes per stock — free text in expanded panel      |
| v5.2.0           | 2026-05  | React + Supabase          | Market comparison SP500 + sector ETF (US batches)  |
| v5.2.1           | 2026-05  | React + Supabase          | UI fixes: zero-line, CIK link, collapse all        |
| v5.2.2           | 2026-05  | React + Supabase          | Bar fixes: colors, outline, size, rate limit 20s   |
| v5.2.3           | 2026-05  | React + Supabase          | Bar outline on bar not track, negative label left  |
| v5.2.4           | 2026-05  | React + Supabase          | Industry ETF, EU markets, market data in Supabase  |
| v5.2.5           | 2026-05  | React + Supabase          | Fix market data not saved + industry ETF cleanup   |
| v5.2.6           | 2026-05  | React + Supabase          | Cache basePrice — skip historical fetch on re-use  |
| v5.2.7           | 2026-05  | React + Supabase          | ETF mapping verified against TD free tier          |
| v5.2.8           | 2026-05  | React + Supabase          | Bar layout fix, RSP + QQQ benchmarks               |
| v5.2.9           | 2026-05  | React + Supabase          | Fundamentals saved and restored from Supabase      |
| v5.3.0           | 2026-05  | React + Supabase          | UX: batch indicator, currency symbols, CSV export  |
| v5.4.0           | 2026-05  | React + Supabase          | Technical prep: Tailwind + shadcn deps for v6.0.0  |
| v6.0.0           | 2026-05  | React + Supabase          | Full UI redesign: sidebar + horizon proximity bars  |
| v6.0.1           | 2026-05  | React + Supabase          | Fix sidebar invisible + old columns in table        |
| v6.0.2           | 2026-05  | React + Supabase          | Tailwind 4 + v0 theme — sidebar works correctly    |
| v6.0.3           | 2026-05  | React + Supabase          | Tailwind 3 + inline styles — Node 18 compatible    |
| v6.0.4           | 2026-05  | React + Supabase          | v0 visual style applied to all main components     |
| v6.0.5           | 2026-05  | React + Supabase          | Fix syntax error in StockTable.jsx (orphaned Th)   |
| v6.1.0           | 2026-05  | React + Supabase          | Complete visual redesign — all components v0 style  |
| v6.1.1           | 2026-05  | React + Supabase          | Bug fixes + expanded panel v0 + Base Price column   |
| v6.1.2           | 2026-05  | React + Supabase          | Fix fetch broken + duplicate title + log message    |
| v6.1.3           | 2026-05  | React + Supabase          | Fix Accuracy Stats crash (history.map conflict)     |
