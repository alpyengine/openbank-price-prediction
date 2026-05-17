# Openbank Price Prediction — v4.1.3

Web app for monitoring Openbank stock price forecasts against real market prices.
Built with React + Vite. No backend required.

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

## Changelog

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
