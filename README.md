# Openbank Price Prediction — v4.5.5

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

## Changelog

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
