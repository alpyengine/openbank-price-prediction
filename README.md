# Openbank Price Prediction — v3.1.1

Web app for monitoring Openbank stock price forecasts against real market prices.
Built with React + Vite. No backend required.

---

## Quick start

```bash
# Install dependencies (once)
cd openbank-price-prediction
npm install

# Add your Twelve Data API key
cp .env.example .env
# Edit .env: VITE_TWELVE_DATA_KEY=your_key_here

# Run
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
- Twelve Data has CORS fully open — works from localhost.
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

Each row can have a different base date (different screenshot sessions).

**Example:**
```
AXP,American Express,USD,314.46,327.23,293.83,296.32,521.60,08/05/2026
AMD,Advanced Micro Devices,USD,441.10,438.97,484.35,513.88,720.69,08/05/2026
URI,United Rentals,USD,933.75,1004.26,1010.78,1024.09,1615.39,08/05/2026
MCD,McDonalds Corp,USD,277.60,288.47,306.68,328.16,344.01,08/05/2026
```

---

## Prediction logic (v3.1.0)

Each forecast has a **direction** based on `target` vs `basePrice`:

| Direction | Condition       | HIT when              |
|-----------|----------------|-----------------------|
| Bullish   | target > base  | price >= target       |
| Bearish   | target < base  | price <= target       |
| Neutral   | target = base  | abs(distance) <= 5%   |

**Verdict labels:**
- `HIT ✓ Reached` — bullish prediction fulfilled
- `HIT ✓ Dropped` — bearish prediction fulfilled
- `CLOSE Near target` — price within ±5% of target
- `MISS ✗ Not reached` — bullish prediction failed
- `MISS ✗ Didn't drop` — bearish prediction failed

---

## Folder structure

```
openbank-price-prediction/
  src/
    components/
      Header.jsx          — title, subtitle, action buttons
      FetchBar.jsx        — fetch status, mode indicator (current/historical)
      SummaryCards.jsx    — 4 metric cards (total/hit/close/awaiting)
      HorizonTabs.jsx     — 1M/3M/6M/12M/best + expired/soon/now banners
      StockTable.jsx      — table shell + column headers
      StockRow.jsx        — single row, memo-wrapped, direction-aware logic
      ImportBox.jsx       — CSV paste + import
      EmailPreview.jsx    — formatted email report
    hooks/
      usePriceFetch.js    — Twelve Data API, current + historical fetch
    utils/
      dates.js            — date math
      stocks.js           — prediction logic, evaluatePrediction()
    styles/
      global.css          — CSS tokens, reset
    App.jsx               — root, all shared state
    main.jsx
  .env                    — API key (never committed)
  .env.example
  .gitignore
  index.html
  vite.config.js
  package.json
```

---

## Data source: Twelve Data

- Free tier: 800 API calls/day, 8/minute
- Current price: `GET /price?symbol=AXP,AMD,...`
- Historical price: `GET /time_series?symbol=TER&interval=1day&start_date=...&end_date=...`
- CORS open — no proxy needed
- Sign up: https://twelvedata.com

---

## Pipeline context

```
Openbank app screenshots
  → Claude extracts forecast data
  → CSV (Ticker, Company, CCY, BasePrice, 1M, 3M, 6M, 12M, Date)
  → Import into this app
  → Fetch real prices (Twelve Data)
  → Direction-aware Hit/Miss evaluation
  → Email report
```

---

## Changelog

### v3.1.1 — Documentation update
**Date:** May 2026

**Changed:**
- `README.md` — full changelog added covering all versions from v1.0.0-vanilla to v3.1.0
- `GIT_GUIDE.md` — new file: step-by-step git commands for building the full repo
  history (one commit + tag per version, from vanilla HTML to React v3)

**Files changed:**
- `README.md` — complete rewrite with changelog, architecture, prediction logic docs
- `GIT_GUIDE.md` — new file

---

### v3.1.0 — Direction-aware prediction logic
**Date:** May 2026

**New:**
- `evaluatePrediction(price, target, basePrice)` in `stocks.js` — determines
  direction (bullish/bearish/neutral) from target vs base price, then evaluates
  HIT/CLOSE/MISS accordingly
- Bearish predictions now correctly require `price <= target` to be a HIT
- Direction arrows on each target column (↑ bullish, ↓ bearish, → neutral)
- CLOSE badge (amber) — previously missing, now shown for ±5% proximity
- Result labels differentiate bullish/bearish: "✓ Reached" vs "✓ Dropped",
  "✗ Not reached" vs "✗ Didn't drop"

**Fixed:**
- NEM-type bug: bearish predictions showing "Reached" when price was above
  target — now correctly evaluated as MISS
- Distance bar layout: bar on top, percentage below — no overlap with Result column

**Files changed:**
- `src/utils/stocks.js` — added `evaluatePrediction()`, updated `priceStatus()`
- `src/components/StockRow.jsx` — uses `evaluatePrediction`, new `DistBar` layout,
  new `ResultCell`, direction arrows on targets
- `src/components/SummaryCards.jsx` — uses `evaluatePrediction`

---

### v3.0.1 — UI fixes
**Date:** May 2026

**Fixed:**
- Status and Distance columns overlapping — Status column widened to 120px,
  renamed to "Result", text shortened to fit
- Table `minWidth` increased to 1060px to prevent column compression
- Best target tab now shows which horizon is being used per stock (`vs 12M · today`)
- Auto price column shows "close on YYYY-MM-DD" for historical prices
- HorizonTabs expired banner updated: removed "coming in next version" text

**Files changed:**
- `src/components/StockTable.jsx` — column widths, minWidth, column renamed
- `src/components/StockRow.jsx` — Result cell refactored, Best target label
- `src/components/HorizonTabs.jsx` — banner text updated

---

### v3.0.0 — Historical price fetch
**Date:** May 2026

**New:**
- Historical price fetch via Twelve Data `/time_series` endpoint
- When a horizon tab is expired (past target date), the app automatically fetches
  the closing price on that exact target date instead of today's price
- 7-day lookback window handles weekends and US market holidays
- `usePriceFetch.js` split into `fetchCurrentBatch()` + `fetchHistoricalForHorizon()`
- `histPrices` state: keyed by `TICKER_HORIZON` (e.g. `TER_1M`)
- `getEffectivePrice()` in `stocks.js`: override > historical > current
- Historical prices auto-load when switching to an expired horizon tab
- FetchBar shows "Historical price · 1M" badge when in historical mode
- "fetching…" loading state per row while historical data loads
- Price cell shows historical date: "close on 2026-04-16"
- Result shows "on target date" subtitle for historical results

**Files changed:**
- `src/hooks/usePriceFetch.js` — complete rewrite, two fetch modes
- `src/utils/stocks.js` — added `histKey()`, `getEffectivePrice()`
- `src/App.jsx` — `useEffect` triggers historical fetch on expired tab switch
- `src/components/FetchBar.jsx` — mode-aware display
- `src/components/StockRow.jsx` — historical price display, loading state
- `src/components/StockTable.jsx` — passes `histPrices`, `horizonExpired`
- `src/components/SummaryCards.jsx` — uses `getEffectivePrice`
- `src/components/EmailPreview.jsx` — includes historical date in report

---

### v2.0.2 — Bugfix: React style conflict
**Date:** May 2026

**Fixed:**
- React warning and fetch failure caused by mixing `border` shorthand with
  `borderColor` longhand in `HorizonTabs.jsx` tab styles
- All tab style variants now use full `border` shorthand exclusively

**Files changed:**
- `src/components/HorizonTabs.jsx` — all border styles use shorthand

---

### v2.0.1 — Visual improvements: horizon status indicators
**Date:** May 2026

**New:**
- `expired` / `soon` / `now` date tags on all 4 target columns (previously only on 12M)
- Countdown days shown below each target price
- HorizonTabs: tab border color indicates status (red = expired, amber = soon)
- Dot indicator on non-active tabs showing their status
- Date reference bar: each horizon colored by status
- Three contextual banners below tabs:
  - 🔴 Expired horizon — warns that current price is being used (not historical)
  - 🟡 Approaching — days remaining
  - 🟢 Target date is today/this week

**Files changed:**
- `src/components/StockRow.jsx` — date tags on all target columns
- `src/components/HorizonTabs.jsx` — full rewrite with status indicators

---

### v2.0.0 — React rewrite, no backend
**Date:** May 2026

**Architecture change:** eliminated Python backend entirely.

**New:**
- React 18 + Vite frontend only
- Twelve Data API called directly from browser (CORS open, no proxy needed)
- `usePriceFetch.js` hook — single batch request for all tickers
- `useServerHealth.js` hook — removed (no server to check)
- `React.memo` on `StockRow` — only rerenders rows with changed props
- Override inputs: local state + `onBlur/Enter` commit — no focus loss on typing
- All state in `App.jsx`, passed as props
- `.env` file for API key — never committed to git
- Vite proxy removed (was `src/vite.config.js` → `/api` → `localhost:8765`)
- `VITE_TWELVE_DATA_KEY` env variable

**Removed:**
- `backend/run.py` — Python HTTP server
- `pip install yfinance requests` requirement
- Two-terminal workflow

**Files added:**
- `src/hooks/usePriceFetch.js`
- `src/utils/dates.js`, `src/utils/stocks.js`
- All components rewritten as React JSX

---

### v1.0.0 — React + Python backend
**Date:** May 2026

**Architecture:** React (Vite) frontend + Python HTTP server backend.

**Features:**
- React 18 + Vite
- Python `run.py` serves `/health` and `/prices` endpoints
- Price sources: yfinance → stooq.com (cascade fallback)
- Vite proxy: `/api/*` → `http://localhost:8765`
- All visual features from vanilla version
- `React.memo` on StockRow
- Override input focus fix (onBlur commit)

**Workflow:** two terminals required:
```bash
# Terminal 1
python backend/run.py

# Terminal 2
npm run dev
```

---

### v1.0.0-vanilla — Original HTML version
**Date:** May 2026

**Architecture:** Single HTML file + Python HTTP server.

**Features:**
- Vanilla JS, no framework
- Dark mode UI
- CSV import (8 fields: TICKER, Company, CCY, BasePrice, 1M, 3M, 6M, 12M)
- Manual price override
- Horizon tabs (Best/1M/3M/6M/12M)
- Distance bar + Hit/Miss badges
- Email report generator
- Price fetch via Python server (yfinance + stooq fallback)
- Extension blocking workaround (Adobe Acrobat, Grammarly)

**Known issues resolved in later versions:**
- `oninput` on override caused focus loss on every keystroke
- No date-aware target system (all horizons used today's date)
- No direction-aware prediction logic
- Extension interference with fetch from `file://`

---

## Version summary

| Version        | Date     | Architecture            | Key change                                      |
|----------------|----------|-------------------------|-------------------------------------------------|
| v1.0.0-vanilla | 2026-05  | HTML + Python           | Initial version                                 |
| v1.0.0         | 2026-05  | React + Python          | React rewrite, memo, focus fix                  |
| v2.0.0         | 2026-05  | React only              | Twelve Data API, no backend                     |
| v2.0.1         | 2026-05  | React only              | Horizon status tags on all columns              |
| v2.0.2         | 2026-05  | React only              | Bugfix: border style conflict                   |
| v3.0.0         | 2026-05  | React only              | Historical prices for expired horizons          |
| v3.0.1         | 2026-05  | React only              | UI fixes: column widths, overlap, labels        |
| v3.1.0         | 2026-05  | React only              | Direction-aware Hit/Miss, distance layout fix   |
| v3.1.1         | 2026-05  | React only              | Full README changelog + GIT_GUIDE.md            |
