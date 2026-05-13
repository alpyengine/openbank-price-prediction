# Openbank Price Prediction — v3.0.1

## Overview

Web app for monitoring Openbank stock price forecasts against real market prices.
Built with React + Vite. No backend required.

---

## Architecture

```
Browser (React/Vite localhost:5173)
  └── usePriceFetch.js
        └── GET https://api.twelvedata.com/price?symbol=AXP,AMD,...&apikey=KEY
              └── JSON response { AXP: { price: "315.03" }, ... }
```

No proxy. No backend. No Python. Direct API call from the browser.
Twelve Data has CORS fully open — works from any origin including localhost.

---

## Folder structure

```
openbank-price-prediction/
  src/
    components/
      Header.jsx          — title, subtitle, action buttons
      FetchBar.jsx        — fetch status bar + spinner + button
      SummaryCards.jsx    — 4 metric cards (total/hit/close/awaiting)
      HorizonTabs.jsx     — 1M/3M/6M/12M/best selector + date bar
      StockTable.jsx      — table shell + column headers with dates
      StockRow.jsx        — single row, memo-wrapped, local input state
      ImportBox.jsx       — CSV paste + import + sample data
      EmailPreview.jsx    — formatted email report + copy button
    hooks/
      usePriceFetch.js    — Twelve Data API call, error handling, state
    utils/
      dates.js            — date math (addDays, parseDate, targetDates, etc.)
      stocks.js           — price logic (getTarget, distancePct, priceStatus)
    styles/
      global.css          — CSS custom properties, reset, scrollbar, animation
    App.jsx               — root component, all shared state
    main.jsx              — React DOM entry point
  .env                    — API key (never committed to git)
  .env.example            — safe template for git
  .gitignore
  index.html
  vite.config.js
  package.json
  README.md
```

---

## Key design decisions

### No backend (v2 vs v1)
v1 required a Python server (`run.py`) running in parallel to fetch prices from
Yahoo Finance / stooq. v2 eliminates this entirely by calling Twelve Data
directly from the browser — their API supports CORS from any origin.

### React.memo on StockRow
Each row only rerenders when its own props change. Fetching prices for 5 stocks
updates 5 rows, not the whole table.

### Local input state + onBlur commit
Override inputs keep their own local state via useState. Changes are only
propagated to App state on blur or Enter. This prevents the focus-loss bug
where typing in an input would trigger a full table rebuild.

### All state in App.jsx
stocks, horizon, overrides, showEmail — all live at the top level.
Hooks (usePriceFetch) own their own internal state and expose clean APIs.

---

## Data source: Twelve Data

- Free tier: 800 API calls/day, 8/minute
- Endpoint: `GET /price?symbol=AAPL,MSFT&apikey=KEY`
- Returns current (or last close) price
- CORS fully open — no proxy needed
- Sign up: https://twelvedata.com

---

## CSV import format

```
TICKER, Company, CCY, BasePrice, 1M, 3M, 6M, 12M, DD/MM/YYYY
```

Field 9 (DD/MM/YYYY) is the screenshot date — used as the base date
for computing the 4 target horizon dates:
- 1M  = base + 30 days
- 3M  = base + 91 days
- 6M  = base + 182 days
- 12M = base + 365 days

Each row can have a different base date (different screenshot sessions).

Example:
```
AXP,American Express,USD,314.46,327.23,293.83,296.32,521.60,08/05/2026
AMD,Advanced Micro Devices,USD,441.10,438.97,484.35,513.88,720.69,08/05/2026
URI,United Rentals,USD,933.75,1004.26,1010.78,1024.09,1615.39,08/05/2026
MCD,McDonalds Corp,USD,277.60,288.47,306.68,328.16,344.01,08/05/2026
```

---

## Install and run

### Requirements
- Node.js 18+
- Twelve Data API key (free at twelvedata.com)

### Setup (once)
```bash
cd openbank-price-prediction
npm install
cp .env.example .env
# Edit .env and add your Twelve Data API key
```

### Run
```bash
npm run dev
# Open http://localhost:5173
```

### Build for production
```bash
npm run build
# Output in dist/
```

---

## Version history

| Version | Date       | Architecture          | Notes                              |
|---------|------------|-----------------------|------------------------------------|
| v1.0.0  | 2026-05    | React + Python backend| yfinance/stooq, requires run.py    |
| v2.0.0  | 2026-05    | React only            | Twelve Data API, no backend        |
| v2.0.1  | 2026-05    | React only            | Visual improvements: expired/soon/now tags on all target columns, horizon tab indicators, contextual banners |
| v2.0.2  | 2026-05    | React only            | Bugfix: React border/borderColor shorthand conflict in HorizonTabs causing fetch failure and render warning |
| v3.0.0  | 2026-05    | React only            | Historical price fetch: expired horizons show closing price on exact target date via Twelve Data /time_series |
| v3.0.1  | 2026-05    | React only            | UI fixes: Status/Distance overlap resolved, wider columns, Best target shows which horizon, price date label |

---

## Related files

- `openbank-price-prediction_v1.0.0.zip` — React + Python backend version
- `openbank-price-prediction_v1.0.0_vanilla.zip` — original vanilla HTML version

---

## Pipeline context

This app is part of the Openbank IA project:

```
Openbank app screenshots
  → Claude extracts forecast data
  → CSV export (Ticker, Company, CCY, BasePrice, 1M, 3M, 6M, 12M, Date)
  → Import into this app
  → Fetch real prices (Twelve Data)
  → Compare forecast vs reality
  → Email report
  → ProRealTime screener (separate skill)
  → Google Calendar reminders (separate skill)
```
