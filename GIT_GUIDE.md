# Git Repository Setup Guide
# Openbank Price Prediction — Full History v0.2.0 to v3.1.2
# ===========================================================================
#
# STRATEGY: Replay history
# One repo, one branch (main), one commit + tag per version.
# Copy files -> commit -> tag -> push -> repeat for each version.
#
# REPOSITORY:
#   GitHub: https://github.com/alpyengine/openbank-price-prediction.git
#   Local:  /Users/alex/Coding/TradingProjects/OpenBack/openbank-price-prediction
#   Description: Investment monitoring web app evolved from vanilla HTML+Python
#                to React. Tracks Openbank forecast accuracy across time horizons
#                with direction-aware hit/miss logic.
#
# PREREQUISITES:
#   - Git installed:      git --version
#   - GitHub repo created EMPTY (no README, no .gitignore)
#   - Git configured with your name/email
#
# ===========================================================================
# HOW TO ROLLBACK A VERSION (if something went wrong after push)
# ===========================================================================
#
# Use this if you pushed a broken version and need to redo it.
# Replace vX.X.X and the commit message with the version you want to undo.
#
# 1. Borrar tag local
# git tag -d vX.X.X
#
# 2. Borrar tag remoto
# git push origin --delete vX.X.X
#
# 3. Deshacer el commit LOCAL (mantiene ficheros en disco)
# git reset --soft HEAD~1
#
# 4. Borrar ficheros y copiar version corregida
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_vX.X.X/. .
#
# 5. Nuevo commit
# git add .
# git commit -m "type: description (vX.X.X)"
#
# 6. Sobreescribir el remoto con el nuevo commit
# git push origin main --force
#
# 7. Nuevo tag
# git tag -a vX.X.X -m "vX.X.X: description"
# git push origin vX.X.X
#
# NOTE: --force rewrites remote history. Safe for personal repos.
#       Never use --force on shared repos without team agreement.
#
# ===========================================================================
#
# YOUR VERSION FOLDERS ON DISK:
#   /Users/alex/Downloads/openbank_price_check_1/                   -> v0.2.0
#   /Users/alex/Downloads/openbank_price_check_2/                   -> v0.3.0
#   /Users/alex/Downloads/openbank_price_check_3/                   -> v0.4.0
#   /Users/alex/Downloads/openbank_price_check_4/                   -> v0.5.0
#   /Users/alex/Downloads/openbank_price_check_5/                   -> v0.6.0
#   /Users/alex/Downloads/openbank-price-prediction_v1.0.0_vanilla/ -> v1.0.0-vanilla
#   /Users/alex/Downloads/openbank-price-prediction_v1.0.0/         -> v1.0.0
#   /Users/alex/Downloads/openbank-price-prediction_v2.0.0/         -> v2.0.0
#   /Users/alex/Downloads/openbank-price-prediction_v2.0.1/         -> v2.0.1
#   /Users/alex/Downloads/openbank-price-prediction_v2.0.2/         -> v2.0.2
#   /Users/alex/Downloads/openbank-price-prediction_v3.0.0/         -> v3.0.0
#   /Users/alex/Downloads/openbank-price-prediction_v3.0.1/         -> v3.0.1
#   /Users/alex/Downloads/openbank-price-prediction_v3.1.0/         -> v3.1.0
#   /Users/alex/Downloads/openbank-price-prediction_v3.1.1/         -> v3.1.1
#   /Users/alex/Downloads/openbank-price-prediction_v3.1.2/         -> v3.1.2
# ===========================================================================


# ===========================================================================
# STEP 0 — One-time git configuration (skip if already done)
# ===========================================================================

git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# Verify:
git config --global --list


# ===========================================================================
# STEP 1 — Create the local repository
# ===========================================================================

mkdir /Users/alex/Coding/TradingProjects/OpenBack/openbank-price-prediction
cd /Users/alex/Coding/TradingProjects/OpenBack/openbank-price-prediction

git init
git branch -M main
git remote add origin https://github.com/alpyengine/openbank-price-prediction.git

# Verify remote:
git remote -v


# ===========================================================================
# STEP 2 — Initial .gitignore commit
# ===========================================================================

cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.DS_Store
*.local
__pycache__/
*.pyc
EOF

git add .gitignore
git commit -m "chore: initial repo setup with .gitignore"
git push -u origin main

# NOTE: From this point on, each version step uses:
#   find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
# instead of 'git rm -rf .'
# This deletes all files EXCEPT .gitignore and the .git/ folder,
# so .gitignore is preserved across all version commits automatically.


# ===========================================================================
# STEP 3 — v0.2.0  First functional HTML + Python version
# ===========================================================================

# Copy files:
cp -r /Users/alex/Downloads/openbank_price_check_1/. .

git status
git add .

git commit -m "feat: first functional HTML + Python version (v0.2.0)

- Single HTML file, light theme
- JSON import (not yet CSV)
- Table: Ticker / Target / Auto Price / Override / Distance / Status
- updateOverride() updates only changed row (no full redraw)
- run.py: SimpleHTTPRequestHandler, yfinance only
- /prices?tickers=TER,HWM endpoint
- /health endpoint
- Auto-opens browser on start"

git tag -a v0.2.0 -m "v0.2.0: first functional HTML + Python version"
git push origin main
git push origin v0.2.0


# ===========================================================================
# STEP 4 — v0.3.0  Dark mode + improved UX
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank_price_check_2/. .

git status
git add .

git commit -m "feat: dark mode UI, summary cards, horizon tabs (v0.3.0)

- Full dark mode (GitHub-style palette)
- Summary cards: Total / Hit / Close / Awaiting
- Horizon tabs: Best / 1M / 3M / 6M / 12M
- Distance bar visualization
- Email report generator with Copy button
- Server warning banner when run.py not running
- checkServer() with retries
- Fetch timeout via AbortController
- Error classification: timeout / no server / CORS"

git tag -a v0.3.0 -m "v0.3.0: dark mode, summary cards, horizon tabs"
git push origin main
git push origin v0.3.0


# ===========================================================================
# STEP 5 — v0.4.0  Python 2/3 compatible server
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank_price_check_3/. .

git status
git add .

git commit -m "fix: Python 2/3 compatibility, MIME types, ASCII-only source (v0.4.0)

- PY2 flag with conditional imports (urlparse / BaseHTTPServer)
- YF_OK flag: graceful handling when yfinance not installed
- Full MIME type map (.html .js .css .json .png .ico .svg)
- do_OPTIONS for CORS preflight
- Path traversal security check (os.path.normpath)
- Port-in-use error with clear message
- fetch_all() wrapper with per-ticker stdout logging
- Fixed: SyntaxError on Python 2 caused by Unicode box-drawing chars"

git tag -a v0.4.0 -m "v0.4.0: Python 2/3 compat, MIME types, ASCII fix"
git push origin main
git push origin v0.4.0


# ===========================================================================
# STEP 6 — v0.5.0  Multi-source server + CSV with date field
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank_price_check_4/. .

git status
git add .

git commit -m "feat: multi-source price cascade, CSV date field (v0.5.0)

Backend (run.py):
- Three price sources: yfinance -> stooq -> Alpha Vantage
- currencies param: /prices?tickers=TER&currencies=USD
- stooq suffix map by currency (USD->.us EUR->.de GBP->.uk)
- Alpha Vantage via AV_KEY env var
- time.sleep(0.3) between tickers (rate limit protection)
- requests library required alongside yfinance

Frontend (HTML):
- Screenshot date added to CSV as 9th field (DD/MM/YYYY)
- Each stock can have different base date
- Target dates calculated per stock from base date
- Horizon date bar shows target dates with countdown"

git tag -a v0.5.0 -m "v0.5.0: yfinance->stooq->AV cascade, CSV date field"
git push origin main
git push origin v0.5.0


# ===========================================================================
# STEP 7 — v0.6.0  allorigins proxy attempt (failed)
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank_price_check_5/. .

git status
git add .

git commit -m "experiment: allorigins.win CORS proxy attempt (v0.6.0)

- Attempted to replace Python server with allorigins.win proxy
- fetch via https://api.allorigins.win/get?url=... to Yahoo Finance
- Failed: file:// origin blocks all external fetch regardless of CORS
- Lesson: any external fetch from file:// is blocked by the browser
- run.py unchanged from v0.5.0
- Documented in README as learning milestone"

git tag -a v0.6.0 -m "v0.6.0: allorigins proxy experiment (failed, lesson learned)"
git push origin main
git push origin v0.6.0


# ===========================================================================
# STEP 8 — v1.0.0-vanilla  Final stable HTML + Python version
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v1.0.0_vanilla/. .

git status
git add .

git commit -m "feat: stable final HTML + Python version (v1.0.0-vanilla)

- Full dark mode UI, production quality
- CSV import with screenshot date (9 fields)
- Date-aware target horizon calculation per stock
- Override input: onBlur commit, no focus loss on typing
- Horizon tabs with expired/soon/now visual tags
- Distance bar + directional Hit/Miss badges
- Email report generator
- Python server: yfinance -> stooq -> Alpha Vantage cascade
- checkServer() with retries and timeout
- Extension interference workaround documented
- Served via localhost (no file:// CORS issues)"

git tag -a v1.0.0-vanilla -m "v1.0.0-vanilla: final stable HTML + Python version"
git push origin main
git push origin v1.0.0-vanilla


# ===========================================================================
# STEP 9 — v1.0.0  React + Python backend
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v1.0.0/. .

# Verify .gitignore is still present (node_modules must be excluded):
cat .gitignore

git status
git add .

git commit -m "feat: React 18 + Vite frontend with Python backend (v1.0.0)

ARCHITECTURE: React frontend + Python HTTP server

- React 18 + Vite
- Python run.py: /health /prices endpoints
- Price sources: yfinance -> stooq cascade
- Vite proxy: /api/* -> http://localhost:8765
- React.memo on StockRow (no unnecessary rerenders)
- Override input: onBlur commit, no focus loss
- All state in App.jsx, hooks for fetch and server health
- Two terminals required: python run.py + npm run dev"

git tag -a v1.0.0 -m "v1.0.0: React + Python backend"
git push origin main
git push origin v1.0.0


# ===========================================================================
# STEP 10 — v2.0.0  React only, Twelve Data API
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v2.0.0/. .

git status
git add .

git commit -m "feat: eliminate Python backend, Twelve Data API (v2.0.0)

BREAKING CHANGE: Python backend removed entirely

- Twelve Data API called directly from browser (CORS fully open)
- usePriceFetch.js: single batch request for all tickers
- .env file: VITE_TWELVE_DATA_KEY
- Single terminal workflow: npm run dev only
- React.memo + onBlur pattern carried forward
- Removed: backend/run.py, pip deps, Vite proxy"

git tag -a v2.0.0 -m "v2.0.0: React only, Twelve Data API, no Python backend"
git push origin main
git push origin v2.0.0


# ===========================================================================
# STEP 11 — v2.0.1  Horizon status indicators
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v2.0.1/. .

git status
git add .

git commit -m "feat: expired/soon/now tags on all target columns (v2.0.1)

- expired/soon/now date tags on all 4 target columns (was only 12M)
- Countdown days shown below each target price
- HorizonTabs: tab border colored by status (red/amber)
- Dot indicator on non-active expired/soon tabs
- Date reference bar colored by horizon status
- Three contextual banners:
  - Expired: warning that current price is used (not historical)
  - Soon: days remaining countdown
  - Now: target date is today/this week alert"

git tag -a v2.0.1 -m "v2.0.1: horizon status tags and contextual banners"
git push origin main
git push origin v2.0.1


# ===========================================================================
# STEP 12 — v2.0.2  Bugfix: border style conflict
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v2.0.2/. .

git status
git add .

git commit -m "fix: React border/borderColor shorthand conflict (v2.0.2)

- HorizonTabs mixed border shorthand with borderColor longhand
- React rejected during rerender: fetch failure + console warning
  'Removing a style property during rerender (borderColor) when a
  conflicting property is set (border)'
- All tab style variants now use full border shorthand exclusively"

git tag -a v2.0.2 -m "v2.0.2: fix React border shorthand conflict in HorizonTabs"
git push origin main
git push origin v2.0.2


# ===========================================================================
# STEP 13 — v3.0.0  Historical price fetch
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v3.0.0/. .

git status
git add .

git commit -m "feat: historical price fetch for expired horizons (v3.0.0)

MAJOR FEATURE: prices frozen at target date for expired horizons

- Expired horizon tabs auto-fetch closing price on exact target date
- Twelve Data /time_series endpoint with 7-day lookback window
  (handles weekends and US market holidays)
- usePriceFetch.js split:
  fetchCurrentBatch() -- current prices for all tickers
  fetchHistoricalForHorizon() -- closing price per ticker on target date
- histPrices state keyed by TICKER_HORIZON (e.g. TER_1M)
- getEffectivePrice(): override > historical > current
- App.jsx useEffect triggers historical fetch on expired tab switch
- FetchBar: mode badge (current / historical . 1M)
- StockRow: loading state per row, historical date label
- Price column shows 'close on YYYY-MM-DD' for historical"

git tag -a v3.0.0 -m "v3.0.0: historical price fetch for expired horizons"
git push origin main
git push origin v3.0.0


# ===========================================================================
# STEP 14 — v3.0.1  UI fixes
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v3.0.1/. .

git status
git add .

git commit -m "fix: Status/Distance overlap, column widths, Best target label (v3.0.1)

- StockTable minWidth increased to 1060px
- Status column renamed to Result, widened to 120px
- Result text shortened to prevent overflow into adjacent column
- DistBar max-width reduced so it no longer overlaps Result column
- Best target tab: shows which horizon per stock (vs 12M . today)
- HorizonTabs expired banner: removed stale 'coming in next version' text"

git tag -a v3.0.1 -m "v3.0.1: UI overlap fixes, column widths, Best target label"
git push origin main
git push origin v3.0.1


# ===========================================================================
# STEP 15 — v3.1.0  Direction-aware prediction logic
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v3.1.0/. .

git status
git add .

git commit -m "feat: direction-aware prediction evaluation (v3.1.0)

- evaluatePrediction(price, target, basePrice) in stocks.js
  bullish (target > base): HIT when price >= target
  bearish (target < base): HIT when price <= target
  neutral: HIT when abs(distance) <= 5%
- Fixes bug: bearish predictions showing Reached when price above
  downward target (e.g. NEM 113.41 vs bearish target 55.10)
- Direction arrows on target columns: up green / down red / right gray
- CLOSE badge (amber) added for +/-5% proximity
- Result labels differentiate direction:
  bullish HIT: Reached  bearish HIT: Dropped
  bullish MISS: Not reached  bearish MISS: Didn't drop
- DistBar: bar on top, percentage below (no horizontal overlap)
- SummaryCards: uses evaluatePrediction for accurate counts"

git tag -a v3.1.0 -m "v3.1.0: direction-aware Hit/Miss, distance layout fix"
git push origin main
git push origin v3.1.0


# ===========================================================================
# STEP 16 — v3.1.1  Documentation
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v3.1.1/. .

git status
git add .

git commit -m "docs: full changelog README and complete GIT_GUIDE (v3.1.1)

- README.md: complete changelog from v0.2.0 to v3.1.1 with file lists,
  known issues, lessons learned, and version summary table
- GIT_GUIDE.md: step-by-step git commands for all 14 versions
  including pre-React HTML versions, exact cp paths, commit messages,
  tags, and push commands"

git tag -a v3.1.1 -m "v3.1.1: full README changelog and GIT_GUIDE"
git push origin main
git push origin v3.1.1


# ===========================================================================
# STEP 17 — v3.1.2  Documentation: complete pre-React history
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v3.1.2/. .

git status
git add .

git commit -m "docs: complete pre-React version history in README and GIT_GUIDE (v3.1.2)

- README.md: changelog extended from v0.2.0 covering all HTML versions
  with features, known issues and lessons learned per version
- GIT_GUIDE.md: expanded to 17 steps covering v0.2.0 through v3.1.2
  with exact Mac paths (/Users/alex/Downloads/...) for all folders
- Added notes: {src spurious folder bug, node_modules handling"

git tag -a v3.1.2 -m "v3.1.2: complete pre-React history docs"
git push origin main
git push origin v3.1.2


# ===========================================================================
# STEP 18 — v4.0.0  CSV file upload + Clear button
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.0.0/. .

git status
git add .

git commit -m "feat: CSV file upload and Clear button in ImportBox (v4.0.0)

- Load CSV file button: opens file picker, reads .csv from disk,
  auto-imports on load without clicking Import
- Header row detection: first row skipped automatically when it
  contains column names (Ticker, Company, Symbol, etc.)
- Clear button: resets textarea, file input, error and success messages
- Success message shows count of imported stocks and header skip info
- Textarea placeholder now shows header row format for clarity
- Visual dividers between button groups"

git tag -a v4.0.0 -m "v4.0.0: CSV file upload and Clear button"
git push origin main
git push origin v4.0.0


# ===========================================================================
# STEP 19 — v4.1.0  Sector, market cap, PER forward + sector grouping
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.1.0/. .

git status
git add .

git commit -m "feat: sector, market cap, PER forward and sector grouping (v4.1.0)

- useFundamentals.js: fetches sector/industry via /profile and
  marketCap/forwardPE/beta via /statistics (Twelve Data free tier)
- FundamentalsBar: dedicated fetch bar with status log
- SectorControls: filter dropdown + group toggle + sort toggle
- StockRow: expandable panel on click showing all fundamental data
- StockTable: sector grouping (collapsible), sort and filter logic
- Sector column added to main table
- fmtMarketCap(): formats to 4.4T / 180B / 2.3M
- 800ms rate limit delay between tickers (2 parallel calls each)"

git tag -a v4.1.0 -m "v4.1.0: sector, market cap, PER forward and grouping"
git push origin main
git push origin v4.1.0


# ===========================================================================
# STEP 20 — v4.1.1  Bugfix: sector display + button Unicode icons
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.1.1/. .

git status
git add .

git commit -m "fix: sector display and button HTML entities (v4.1.1)

- Sector column showed -- despite fundamentals 5/5 loaded
  Root cause: setFundamentals called once at end of fetch loop
  Fix: setFundamentals({ ...newData }) called after each ticker
  so React detects change and rerenders rows as data arrives
- Group/Sort buttons showed raw HTML entities (&#9660; &#9658; &#8597;)
  JSX does not interpret HTML entities in string literals
  Fix: replaced with Unicode chars directly (▼ ▶ ↕)"

git tag -a v4.1.1 -m "v4.1.1: fix sector display and button Unicode icons"
git push origin main
git push origin v4.1.1


# ===========================================================================
# STEP 21 — v4.1.2  Switch sector source to Financial Modeling Prep
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.1.2/. .

# IMPORTANT: after copying, add your FMP key to .env (not committed to git)
# echo "VITE_FMP_KEY=your_fmp_key_here" >> .env

git status
git add .

git commit -m "fix: switch sector source from Twelve Data to FMP (v4.1.2)

- Twelve Data /profile requires paid plan (403 on free tier)
- Switched to Financial Modeling Prep /stable/profile endpoint
  FMP free plan: 250 req/day, no credit card required
  Returns: sector, industry, marketCap, beta
- Twelve Data /statistics retained for forward P/E only
- Promise.allSettled: FMP and TD called in parallel, each independent
- .env.example updated with VITE_FMP_KEY variable"

git tag -a v4.1.2 -m "v4.1.2: switch sector source to FMP"
git push origin main
git push origin v4.1.2


# ===========================================================================
# STEP 22 — v4.1.3  Bugfix: Clear overrides not resetting input values
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.1.3/. .

git status
git add .

git commit -m "fix: Clear overrides not resetting StockRow input fields (v4.1.3)

- Clicking Clear overrides emptied App state but inputs still showed
  old manually entered values
- Root cause: useState initial value only runs on mount, not on prop change
- Fix: useEffect in StockRow watches override prop and syncs local val state
  When override becomes null (cleared externally), input resets to empty"

git tag -a v4.1.3 -m "v4.1.3: fix Clear overrides input sync"
git push origin main
git push origin v4.1.3


# ===========================================================================
# STEP 23 — v4.1.4  Email sending via EmailJS
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.1.4/. .

# IMPORTANT: add EmailJS keys to .env (not committed to git):
# echo "VITE_EMAILJS_SERVICE_ID=service_xugjmjv" >> .env
# echo "VITE_EMAILJS_TEMPLATE_ID=template_964hakr" >> .env
# echo "VITE_EMAILJS_PUBLIC_KEY=JfqMD2pTRueO8N82w" >> .env

git status
git add .

git commit -m "feat: send email report via EmailJS (v4.1.4)

- Recipient email input in Email report panel
- Send button calls EmailJS API directly from browser
- EmailJS SDK loaded dynamically at runtime (no npm install)
- Success/error feedback after send
- Enter key triggers send
- Requires VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID,
  VITE_EMAILJS_PUBLIC_KEY in .env
- .env.example updated with EmailJS variables
- Uses dedicated Gmail account via EmailJS service"

git tag -a v4.1.4 -m "v4.1.4: email sending via EmailJS"
git push origin main
git push origin v4.1.4


# ===========================================================================
# STEP 24 — v4.1.5  HTML email report
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.1.5/. .

git status
git add .

git commit -m "feat: HTML email report with styling and fundamentals (v4.1.5)

- Email now sends fully styled HTML (dark theme, GitHub palette)
- Summary cards: Total / Hit / Near / Miss / Awaiting
- Color-coded result badges per stock (green/amber/red)
- Sector shown below ticker, fundamentals column (cap/PE/beta)
- Historical price date shown for expired horizons
- EmailJS template uses triple-brace {{{report_body}}} for HTML
- App passes fundamentals prop to EmailPreview"

git tag -a v4.1.5 -m "v4.1.5: HTML email report"
git push origin main
git push origin v4.1.5


# ===========================================================================
# STEP 25 — v4.1.6  Light theme email + Base price column
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.1.6/. .

git status
git add .

git commit -m "feat: light theme email and base price column (v4.1.6)

- Email redesigned: white background, dark header band, soft color cards
- Base price column added to app table (stock price at screenshot date)
- Base price column added to email report table
- Email table: Ticker+Sector / Company / Base date / Base price /
  Price / Target / Distance / Result / Fundamentals
- StockTable minWidth increased to 1180px for new column
- colSpan updated to 15 throughout"

git tag -a v4.1.6 -m "v4.1.6: light theme email and base price column"
git push origin main
git push origin v4.1.6


# ===========================================================================
# STEP 26 — v4.1.7  Responsive email + days remaining
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.1.7/. .

git status
git add .

git commit -m "feat: responsive email and days remaining column (v4.1.7)

- Email responsive: table on desktop, cards on mobile (@media max-width:620px)
- Days remaining column in email (green >14d, amber <=14d, red expired)
- Days remaining shown below Hit/Miss badge in app table (active horizon)
- Expandable panel: all 4 horizon dates with days remaining + color coding
- Divider between horizon dates and fundamentals in expanded panel"

git tag -a v4.1.7 -m "v4.1.7: responsive email and days remaining"
git push origin main
git push origin v4.1.7


# ===========================================================================
# STEP 27 — v4.1.8  Email table horizontal scroll (Gmail fix)
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.1.8/. .

git status
git add .

git commit -m "fix: email table horizontal scroll for Gmail web (v4.1.8)

- Gmail ignores CSS @media queries — responsive breakpoints had no effect
- Wrapped desktop table in overflow-x:auto div with min-width:700px
- Gmail respects inline overflow-x style
- Table now scrolls horizontally when window is too narrow to show all columns"

git tag -a v4.1.8 -m "v4.1.8: email horizontal scroll Gmail fix"
git push origin main
git push origin v4.1.8


# ===========================================================================
# STEP 28 — v4.1.9  Default recipient email
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.1.9/. .

git status
git add .

git commit -m "feat: default recipient email pre-filled (v4.1.9)

- Email report To field pre-filled with alpyengine@gmail.com
- Field remains fully editable for any other recipient"

git tag -a v4.1.9 -m "v4.1.9: default recipient email"
git push origin main
git push origin v4.1.9


# ===========================================================================
# STEP 29 — v4.2.0  Dark/light mode toggle + Email modal
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.2.0/. .

git status
git add .

git commit -m "feat: dark/light mode toggle and email modal overlay (v4.2.0)

- Dark/light toggle button in header (sun/moon emoji)
  Uses data-theme attribute on html element + CSS custom properties
  All components update automatically via var(--bg), var(--text) etc.
  Light theme: GitHub-style light palette
- Email report opens as modal overlay (fixed, centered, above content)
  Close with X button, Escape key, or click outside
  autoFocus on To: field, adapts to current theme via CSS variables"

git tag -a v4.2.0 -m "v4.2.0: dark/light mode and email modal"
git push origin main
git push origin v4.2.0


# ===========================================================================
# STEP 30 — v4.2.1  Full light theme + mobile email
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.2.1/. .

git status
git add .

git commit -m "feat: full light theme and 7-column mobile email (v4.2.1)

- All components converted to CSS variables (var(--bg) var(--text) etc.)
  Light/dark toggle now works correctly across the entire app
  FetchBar FundamentalsBar SummaryCards HorizonTabs StockTable StockRow
  ImportBox SectorControls all updated
- Email table: 7 columns (was 9), max-width 600px
  Fits iPhone screen without horizontal scroll
  Uses nested HTML tables for Gmail compatibility (no flexbox/grid)
  Columns: Ticker+Sector / Company / Price / Target / Days / Distance / Result"

git tag -a v4.2.1 -m "v4.2.1: full light theme and 7-column mobile email"
git push origin main
git push origin v4.2.1


# ===========================================================================
# STEP 31 — v4.3.0  Design system v5
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.3.0/. .

git status
git add .

git commit -m "feat: design system v5 — azul marino dark mode and button roles (v4.3.0)

- Dark mode: azul marino #273550 (not black), surfaces #2e3f60/#364970
  Text #eef2fa near white, muted #96aece visible, th headers #d8e4f8
- Light mode: #f0f2f5 bg, white surfaces, text #1a1f2e, base font 15px
- Button roles: toggle (blue border square), neutral (grey), blue outline,
  green fill (fetch/csv), clear (red text transparent bg)
- Default mode changed to light
- CSS vars: --surface/--surface2/--text-2/--text-3/--border-blue etc.
- Cards: border-radius 12px + box-shadow
- All components updated: Header FetchBar FundamentalsBar SummaryCards
  HorizonTabs SectorControls ImportBox StockTable StockRow global.css"

git tag -a v4.3.0 -m "v4.3.0: design system v5"
git push origin main
git push origin v4.3.0


# ===========================================================================
# STEP 32 — v4.4.0  Industry column + expanded fundamentals panel
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.4.0/. .

git status
git add .

git commit -m "feat: industry column and expanded fundamentals panel (v4.4.0)

- Industry column added to main table (between Sector and Cur.)
- Industry filter dropdown in SectorControls, resets when Sector changes
- Expanded panel 5 new fields: Beta, Last Dividend, CIK (SEC),
  Website (clickable link), Description (dedicated modal overlay)
- Description modal: closes on X, Escape, or click outside
- FMP fetch updated: website, lastDividend, cik, description
- StockTable: colSpan 16, minWidth 1280px"

git tag -a v4.4.0 -m "v4.4.0: industry column and expanded fundamentals"
git push origin main
git push origin v4.4.0


# ===========================================================================
# STEP 33 — v4.5.0  Accuracy chart + GitHub persistence
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.5.0/. .

# IMPORTANT: add GitHub vars to .env (not committed to git):
# echo "VITE_GITHUB_TOKEN=your_pat_here" >> .env
# echo "VITE_GITHUB_REPO=alpyengine/openbank-price-data" >> .env

git status
git add .

git commit -m "feat: accuracy chart and GitHub persistence (v4.5.0)

- Accuracy line chart: HIT rate % per horizon (1M/3M/6M/12M) over time
- 5 KPI cards: total evaluated, overall hit rate, best/worst horizon, batches
- Breakdown table: HIT/CLOSE/MISS per horizon with color-coded bars
- Batch history table with save timestamps
- GitHub persistence via PUT /repos/:owner/:repo/contents/data/history.json
  Load history button: fetches from private openbank-price-data repo
  Save batch button: evaluates stocks and commits results to data repo
- Storage abstraction layer: src/services/storage.js
  Future migration to Supabase only requires changing this file
- useHistory hook: manages load/save/stats lifecycle
- Graceful degradation if GitHub not configured
- New env vars: VITE_GITHUB_TOKEN, VITE_GITHUB_REPO"

git tag -a v4.5.0 -m "v4.5.0: accuracy chart and GitHub persistence"
git push origin main
git push origin v4.5.0


# ===========================================================================
# STEP 34 — v4.5.1  Docs: accuracy tracking setup guide in README
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.5.1/. .

git status
git add .

git commit -m "docs: accuracy tracking setup guide in README (v4.5.1)

- Added Accuracy tracking section with architecture diagram
- Step-by-step setup: private repo, PAT, .env variables
- Usage flow: Load history, Save batch results, chart updates
- Note on future Supabase migration path"

git tag -a v4.5.1 -m "v4.5.1: docs accuracy tracking setup"
git push origin main
git push origin v4.5.1


# ===========================================================================
# STEP 35 — v4.5.2  Auto-load history + descriptive commit messages
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.5.2/. .

git status
git add .

git commit -m "feat: auto-load history and descriptive commit messages (v4.5.2)

- History auto-loads from GitHub on app startup (no manual Load needed)
- Commit message format:
  data: batch DD/MM/YYYY · updated DD/MM/YYYY · 1M✓ 3M⏳ 6M⏳ 12M⏳ · N stocks · HIT N%
  Checkmark = horizon evaluated with real historical price
  Hourglass = horizon still open, provisional price used
  HIT rate omitted if no horizons evaluated yet"

git tag -a v4.5.2 -m "v4.5.2: auto-load and descriptive commit messages"
git push origin main
git push origin v4.5.2


# ===========================================================================
# STEP 36 — v4.5.3  Bugfix: duplicate HORIZONS declaration in useHistory
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.5.3/. .

git status
git add .

git commit -m "fix: duplicate HORIZONS declaration in useHistory (v4.5.3)

- const HORIZONS declared twice inside saveBatch function
  esbuild error: The symbol HORIZONS has already been declared
- Fix: moved HORIZONS to module scope outside all functions"

git tag -a v4.5.3 -m "v4.5.3: fix duplicate HORIZONS declaration"
git push origin main
git push origin v4.5.3


# ===========================================================================
# STEP 37 — v4.5.4  Bugfix: Twelve Data rate limit with 16+ tickers
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.5.4/. .

git status
git add .

git commit -m "fix: Twelve Data rate limit exceeded with 16+ tickers (v4.5.4)

- 429 error when fetching 16 tickers: exceeded 8 req/min free tier limit
- fetchCurrentPrices now splits tickers into chunks of 8
- 62s pause between chunks to respect rate limit
- Log shows chunk progress for batches over 8 tickers
- Batches of 8 or fewer: single request, no change in behaviour"

git tag -a v4.5.4 -m "v4.5.4: fix rate limit for large batches"
git push origin main
git push origin v4.5.4


# ===========================================================================
# STEP 38 — v4.5.5  Segmented progress bar for multi-chunk fetch
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.5.5/openbank_v41/. .

git status
git add .

git commit -m "feat: segmented progress bar for multi-chunk fetch (v4.5.5)

- FetchBar shows segmented batch progress for batches over 8 tickers
- Segments: blue (fetching) green (done) amber (rate limit wait) grey (pending)
- Green bar advances as each batch completes
- Amber countdown bar with seconds remaining during 62s rate limit pause
- chunkProgress state added to usePriceFetch, emitted per-second during wait
- Hidden for single-chunk batches (8 or fewer tickers)"

git tag -a v4.5.5 -m "v4.5.5: segmented progress bar for multi-chunk fetch"
git push origin main
git push origin v4.5.5


# ===========================================================================
# STEP 39 — v4.5.6  Bugfix: horizon status in commit + ZIP structure
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.5.6/. .

git status
git add .

git commit -m "fix: horizon status in commit message and ZIP structure (v4.5.6)

- horizonStatus now uses dateStatus === past instead of verdict !== awaiting
  Only marks a horizon as closed when its target date has actually passed
  Result: 1M✓ 3M⏳ 6M⏳ 12M⏳ for March batch saved in May 2026
- ZIP packaging fixed: files at root level, no openbank_v41 subfolder
  cp -r Downloads/openbank-price-prediction_vX.X.X/. . works as always"

git tag -a v4.5.6 -m "v4.5.6: fix horizon status and ZIP structure"
git push origin main
git push origin v4.5.6


# ===========================================================================
# STEP 40 — v4.5.7  Interactive horizon toggle in accuracy chart
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v4.5.7/. .

git status
git add .

git commit -m "feat: interactive horizon toggle in accuracy chart (v4.5.7)

- Legend buttons toggle horizon lines on/off
- Active: colored border and line — Inactive: grey, faded, dashed line
- At least one horizon stays active at all times
- Chart redraws instantly, works in dark and light mode"

git tag -a v4.5.7 -m "v4.5.7: interactive horizon toggle in accuracy chart"
git push origin main
git push origin v4.5.7


# ===========================================================================
# STEP 41 — v5.0.0  Supabase persistence (PostgreSQL)
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.0.0/. .

# IMPORTANT: add Supabase vars to .env:
# echo "VITE_SUPABASE_URL=https://yyenwzljojxbqtzcbchk.supabase.co" >> .env
# echo "VITE_SUPABASE_ANON_KEY=eyJ..." >> .env

git status
git add .

git commit -m "feat: migrate persistence to Supabase PostgreSQL (v5.0.0)

- storage.js rewritten for Supabase REST API
- Data stored in batches table (id, date, saved_at, stocks, results JSONB,
  horizon_status JSONB, hit_rate)
- Upsert via Prefer: resolution=merge-duplicates (same id = update)
- loadHistory: GET /rest/v1/batches?order=date.desc → { batches }
- saveHistory: POST with merge-duplicates → upsert single batch
- Works from any device — no GitHub token needed for persistence
- New env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- Public API unchanged: loadHistory saveHistory buildBatchId isStorageConfigured"

git tag -a v5.0.0 -m "v5.0.0: Supabase PostgreSQL persistence"
git push origin main
git push origin v5.0.0


# ===========================================================================
# STEP 42 — v5.0.1  Bugfix: batch ID malformed in Supabase
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.0.1/. .

# Before testing — delete malformed rows from Supabase:
# curl -X DELETE "https://yyenwzljojxbqtzcbchk.supabase.co/rest/v1/batches?id=like.undefined*" \
#   -H "apikey: YOUR_ANON_KEY" -H "Authorization: Bearer YOUR_ANON_KEY"

git status
git add .

git commit -m "fix: batch ID malformed undefined-undefined in Supabase (v5.0.1)

- buildBatchId received formatDate output (17 Mar 2026) instead of DD/MM/YYYY
- Fix: build batchDateStr directly from Date object getDate/getMonth/getFullYear
- date field also corrected to DD/MM/YYYY format"

git tag -a v5.0.1 -m "v5.0.1: fix batch ID malformed in Supabase"
git push origin main
git push origin v5.0.1


# ===========================================================================
# STEP 43 — v5.0.2  updated_at column + batch history improvements
# ===========================================================================

# IMPORTANT: run this in Supabase SQL Editor before testing:
# ALTER TABLE batches ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.0.2/. .

git status
git add .

git commit -m "feat: updated_at column and batch history improvements (v5.0.2)

- updated_at sent on every upsert to track last re-save
- saved_at = first save (Supabase auto), updated_at = last update (app)
- Batch history table: First saved + Last updated columns
- Last updated highlighted in blue when different from first saved
- README: upsert logic clarification and Supabase migration SQL"

git tag -a v5.0.2 -m "v5.0.2: updated_at and batch history"
git push origin main
git push origin v5.0.2


# ===========================================================================
# STEP 44 — v5.0.3  Column help modals in stock table
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.0.3/. .

git status
git add .

git commit -m "feat: column help modals in stock table (v5.0.3)

- ? button on every column header opens a help modal
- Modal: title, subtitle, plain-language description, real example
- 9 definitions: Ticker, Sector, Base date, Base price, Price,
  Override, Horizon targets, Hit?, Distance, Result
- ColHelpModal and HelpBtn as self-contained components
- COL_HELP dictionary — all descriptions in one place"

git tag -a v5.0.3 -m "v5.0.3: column help modals"
git push origin main
git push origin v5.0.3


# ===========================================================================
# STEP 45 — v5.0.4  Load batch directly from history into stock table
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.0.4/. .

git status
git add .

git commit -m "feat: load batch directly from history into stock table (v5.0.4)

- Load button on each batch history row
- Reconstructs stocks from Supabase results — no CSV needed
- Resets prices, horizon, filters on load
- Page scrolls to top automatically
- Button shows Loaded confirmation for 1.2s
- Batch history acts as session history — resume any batch with one click"

git tag -a v5.0.4 -m "v5.0.4: load batch from history"
git push origin main
git push origin v5.0.4


# ===========================================================================
# STEP 46 — v5.0.5  Alpha Vantage for EU markets
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.0.5/. .

# IMPORTANT: add Alpha Vantage key to .env:
# echo "VITE_ALPHA_VANTAGE_KEY=Y2PVUMC7ZSZHB9NC" >> .env

git status
git add .

git commit -m "feat: Alpha Vantage integration for European markets (v5.0.5)

- Auto-detection by ticker suffix: .US → Twelve Data, .DE/.AS/.PA/.L → Alpha Vantage
- fetchCurrentPrices_AV: GLOBAL_QUOTE, 1.2s pause between tickers
- fetchHistoricalPrice_AV: TIME_SERIES_DAILY, closest day on or before target
- tdSymbol: strips .US suffix for Twelve Data compatibility
- Log shows which provider was used
- CSV tickers now always include market suffix (AIXA.DE, TER.US)
- New env var: VITE_ALPHA_VANTAGE_KEY"

git tag -a v5.0.5 -m "v5.0.5: Alpha Vantage for EU markets"
git push origin main
git push origin v5.0.5


# ===========================================================================
# STEP 47 — v5.0.6  Ticker display without suffix + column overlap fix
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.0.6/. .

git status
git add .

git commit -m "fix: ticker display without suffix and column overlap (v5.0.6)

- Ticker shows TER instead of TER.US, AIXA instead of AIXA.DE
- Market suffix shown as small grey label below ticker (US, DE, etc.)
- Suffix preserved internally for API routing
- Ticker column 68px, Company 120px to prevent overlap"

git tag -a v5.0.6 -m "v5.0.6: ticker display and column overlap fix"
git push origin main
git push origin v5.0.6


# ===========================================================================
# STEP 48 — v5.0.7  Bugfix: FMP and TD fundamentals failing for .US tickers
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.0.7/. .

git status
git add .

git commit -m "fix: FMP and TD fundamentals failing for .US tickers (v5.0.7)

- FMP called with NEM.US instead of NEM → empty response
- TD statistics called with NEM.US instead of NEM → error
- fmpSymbol(): strips .US only, keeps EU suffixes (FMP supports IFX.DE)
- tdSymbol() in useFundamentals: strips all suffixes (TD uses bare tickers)"

git tag -a v5.0.7 -m "v5.0.7: fix FMP and TD fundamentals for .US tickers"
git push origin main
git push origin v5.0.7


# ===========================================================================
# STEP 49 — v5.0.8  Batch merge + delete button in history
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.0.8/. .

git status
git add .

git commit -m "feat: batch merge and delete button in history (v5.0.8)

- Same base date CSVs now MERGE tickers instead of overwriting
  Existing tickers preserved, new tickers added, duplicates replaced
  Log: Merging 3 new tickers with 3 existing — total 6 tickers
- Delete button in batch history: two-click confirmation (3s timeout)
  First click: Confirm warning — second click: deletes from Supabase
- deleteHistoryBatch in storage.js: DELETE /rest/v1/batches?id=eq.X"

git tag -a v5.0.8 -m "v5.0.8: batch merge and delete"
git push origin main
git push origin v5.0.8


# ===========================================================================
# STEP 50 — v5.1.0  Notes per stock
# ===========================================================================

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.1.0/. .

git status
git add .

git commit -m "feat: notes per stock in expanded panel (v5.1.0)

- Free-text notes field in expanded panel for each stock
- Auto-saves on blur, persisted in Supabase results JSONB
- Notes stored on 1M result row, restored when loading batch from history
- Notes reset on new CSV import
- No new Supabase table needed"

git tag -a v5.1.0 -m "v5.1.0: notes per stock"
git push origin main
git push origin v5.1.0


# ===========================================================================
# STEP 51 — v5.2.0  Market comparison SP500 + sector ETF (US batches)
# ===========================================================================
#
# ROLLBACK (if needed — run before the steps below):
#
# 1. Borrar tag local
# git tag -d v5.2.0
#
# 2. Borrar tag remoto
# git push origin --delete v5.2.0
#
# 3. Deshacer el commit LOCAL (mantiene ficheros en disco)
# git reset --soft HEAD~1
#
# 4. Borrar ficheros y copiar version corregida
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.0/. .
#
# 5. Nuevo commit
# git add .
# git commit -m "feat: market comparison SP500 and sector ETF for US batches (v5.2.0)"
#
# 6. Sobreescribir el remoto con el nuevo commit
# git push origin main --force
#
# 7. Nuevo tag
# git tag -a v5.2.0 -m "v5.2.0: market comparison SP500 and sector ETF"
# git push origin v5.2.0

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.0/. .

git status
git add .

git commit -m "feat: market comparison SP500 and sector ETF for US batches (v5.2.0)

- Fetch market data button shown only for .US batches
- SPY (S&P 500) and SPDR sector ETFs fetched via Twelve Data
- All % changes from batch base date to today — same period for all
- Visualization: Option D — horizontal ranking bars sorted by % change
    Stock highlighted in blue, ranked among indices by performance
    Badges below: Beat/Lagged S&P 500 and sector ETF with exact diff
- 8s pause between symbols (2 TD credits each: price + time_series)
- Log shows estimated total time (~16s for SPY + 1 ETF)
- 10 sector ETF mappings (XLK XLE XLF XLV XLI XLB XLY XLP XLU XLRE XLC)
- useMarketData hook + MarketBar component
- Fixed: AccuracyChart import, duplicate table keys, stockChangePct null"

git tag -a v5.2.0 -m "v5.2.0: market comparison SP500 and sector ETF"
git push origin main
git push origin v5.2.0


# ===========================================================================
# STEP 52 — v5.2.1  UI fixes and fundamentals improvements
# ===========================================================================
#
# ROLLBACK (if needed — run before the steps below):
#
# 1. Borrar tag local
# git tag -d v5.2.1
#
# 2. Borrar tag remoto
# git push origin --delete v5.2.1
#
# 3. Deshacer el commit LOCAL (mantiene ficheros en disco)
# git reset --soft HEAD~1
#
# 4. Borrar ficheros y copiar version corregida
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.1/. .
#
# 5. Nuevo commit
# git add .
# git commit -m "fix: UI fixes and fundamentals improvements (v5.2.1)"
#
# 6. Sobreescribir el remoto con el nuevo commit
# git push origin main --force
#
# 7. Nuevo tag
# git tag -a v5.2.1 -m "v5.2.1: UI fixes"
# git push origin v5.2.1

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.1/. .

git status
git add .

git commit -m "fix: UI fixes and fundamentals improvements (v5.2.1)

- Forward P/E removed — not available on free tier APIs
- CIK (SEC) now a clickable link to SEC EDGAR 10-K filings
- Zero-line chart for market comparison with negative values:
    all positive: bars from left, % in green outside
    any negative: center zero line, bars left/right, % in green/red
- Collapse all button above stock table
- Financial Services and Insurance variants mapped to XLF"

git tag -a v5.2.1 -m "v5.2.1: UI fixes and fundamentals improvements"
git push origin main
git push origin v5.2.1


# ===========================================================================
# STEP 53 — v5.2.2  Market comparison bar fixes and rate limit
# ===========================================================================
#
# ROLLBACK (if needed — run before the steps below):
#
# 1. Borrar tag local
# git tag -d v5.2.2
#
# 2. Borrar tag remoto
# git push origin --delete v5.2.2
#
# 3. Deshacer el commit LOCAL (mantiene ficheros en disco)
# git reset --soft HEAD~1
#
# 4. Borrar ficheros y copiar version corregida
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.2/. .
#
# 5. Nuevo commit
# git add .
# git commit -m "fix: market comparison bar fixes and rate limit (v5.2.2)"
#
# 6. Sobreescribir el remoto con el nuevo commit
# git push origin main --force
#
# 7. Nuevo tag
# git tag -a v5.2.2 -m "v5.2.2: bar fixes and rate limit"
# git push origin v5.2.2

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.2/. .

git status
git add .

git commit -m "fix: market comparison bar fixes and rate limit (v5.2.2)

- Rate limit: pause between market data symbols increased to 20s
  (2 TD credits per symbol + 2s internal gap = safe within 8 req/min)
- Bar colors: positive=green, negative=red for both stock and indices
  Stock bar solid green/red, index bars use transparent tint
- Stock bar blue outline (1.5px) to distinguish from index rows
- Bar height reduced 14px → 10px, gap 5px → 4px
- Zero-line mode: negative % label now left of bar, positive right
- Toggle button: Expand all / Collapse all alternates correctly"

git tag -a v5.2.2 -m "v5.2.2: market comparison bar fixes and rate limit"
git push origin main
git push origin v5.2.2


# ===========================================================================
# STEP 54 — v5.2.3  Bar outline and label position fixes
# ===========================================================================
#
# ROLLBACK (if needed — run before the steps below):
#
# 1. Borrar tag local
# git tag -d v5.2.3
#
# 2. Borrar tag remoto
# git push origin --delete v5.2.3
#
# 3. Deshacer el commit LOCAL (mantiene ficheros en disco)
# git reset --soft HEAD~1
#
# 4. Borrar ficheros y copiar version corregida
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.3/. .
#
# 5. Nuevo commit
# git add .
# git commit -m "fix: bar outline on bar not track, negative label left (v5.2.3)"
#
# 6. Sobreescribir el remoto con el nuevo commit
# git push origin main --force
#
# 7. Nuevo tag
# git tag -a v5.2.3 -m "v5.2.3: bar outline and label fixes"
# git push origin v5.2.3

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.3/. .

git status
git add .

git commit -m "fix: bar outline on bar not track, negative label left (v5.2.3)

- Blue outline now on bar element (sized to % value), not the full track
- Negative % label positioned left of bar using right: (100 - barLeft)%
- Positive % label remains right of bar end"

git tag -a v5.2.3 -m "v5.2.3: bar outline and label position fixes"
git push origin main
git push origin v5.2.3


# ===========================================================================
# STEP 55 — v5.2.4  Industry ETF, EU markets, market data in Supabase
# ===========================================================================
#
# IMPORTANT: run this in Supabase SQL Editor before testing:
# ALTER TABLE batches ADD COLUMN market_data JSONB DEFAULT NULL;
#
# ROLLBACK (if needed — run before the steps below):
#
# 1. Borrar tag local
# git tag -d v5.2.4
#
# 2. Borrar tag remoto
# git push origin --delete v5.2.4
#
# 3. Deshacer el commit LOCAL (mantiene ficheros en disco)
# git reset --soft HEAD~1
#
# 4. Borrar ficheros y copiar version corregida
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.4/. .
#
# 5. Nuevo commit
# git add .
# git commit -m "feat: industry ETF, EU markets, market data in Supabase (v5.2.4)"
#
# 6. Sobreescribir el remoto con el nuevo commit
# git push origin main --force
#
# 7. Nuevo tag
# git tag -a v5.2.4 -m "v5.2.4: industry ETF and EU markets"
# git push origin v5.2.4

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.4/. .

git status
git add .

git commit -m "feat: industry ETF, EU markets, market data in Supabase (v5.2.4)

- INDUSTRY_ETF mapping: 30+ industry → ETF (SOXX, XBI, KBE, IGV, XOP, GDX...)
- 4th bar and badge for industry ETF in MarketComparison panel
- EU_MARKET_INDEX: .DE→DAX, .AS→AEX, .PA→CAC40, .L→FTSE100, .MC→IBEX35
- Fetch market data button now shown for EU batches
- MarketData saved to Supabase market_data JSONB column
- MarketData restored from history on loadBatch — no re-fetch needed
- Skip fetch if marketData already loaded for same base date
- Supabase migration: ALTER TABLE batches ADD COLUMN market_data JSONB"

git tag -a v5.2.4 -m "v5.2.4: industry ETF, EU markets, market data persistence"
git push origin main
git push origin v5.2.4


# ===========================================================================
# STEP 56 — v5.2.5  Fix market data not saved + industry ETF cleanup
# ===========================================================================
#
# ROLLBACK (if needed — run before the steps below):
#
# 1. Borrar tag local
# git tag -d v5.2.5
#
# 2. Borrar tag remoto
# git push origin --delete v5.2.5
#
# 3. Deshacer el commit LOCAL (mantiene ficheros en disco)
# git reset --soft HEAD~1
#
# 4. Borrar ficheros y copiar version corregida
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.5/. .
#
# 5. Nuevo commit
# git add .
# git commit -m "fix: market data not saved in Supabase + industry ETF cleanup (v5.2.5)"
#
# 6. Sobreescribir el remoto con el nuevo commit
# git push origin main --force
#
# 7. Nuevo tag
# git tag -a v5.2.5 -m "v5.2.5: fix market data save"
# git push origin v5.2.5

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.5/. .

git status
git add .

git commit -m "fix: market data not saved in Supabase + industry ETF cleanup (v5.2.5)

- newBatch built atomically — all fields (horizonStatus, hitRate, marketData)
  set in one object literal before passing to saveHistory
- Previously marketData was null in Supabase because newBatch was mutated
  after updated.batches[0] reference was already captured
- INDUSTRY_ETF cleaned: removed 15 ETFs not on Twelve Data free tier
  Kept: SOXX, IGV, XBI, XPH, XOP, OIH, GDX, ITA, JETS, XRT, ITB, KBE"

git tag -a v5.2.5 -m "v5.2.5: fix market data save and ETF cleanup"
git push origin main
git push origin v5.2.5


# ===========================================================================
# STEP 57 — v5.2.6  Cache basePrice — skip historical fetch on re-use
# ===========================================================================
#
# ROLLBACK (if needed — run before the steps below):
#
# 1. Borrar tag local
# git tag -d v5.2.6
#
# 2. Borrar tag remoto
# git push origin --delete v5.2.6
#
# 3. Deshacer el commit LOCAL (mantiene ficheros en disco)
# git reset --soft HEAD~1
#
# 4. Borrar ficheros y copiar version corregida
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.6/. .
#
# 5. Nuevo commit
# git add .
# git commit -m "feat: cache basePrice to skip historical fetch on re-use (v5.2.6)"
#
# 6. Sobreescribir el remoto con el nuevo commit
# git push origin main --force
#
# 7. Nuevo tag
# git tag -a v5.2.6 -m "v5.2.6: cache basePrice"
# git push origin v5.2.6

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.6/. .

git status
git add .

git commit -m "feat: cache basePrice to skip historical fetch on re-use (v5.2.6)

- fetchSymbolData accepts existingEntry with saved basePrice
- If basePrice cached: skip fetchPriceOnDate (saves 1 TD credit/symbol)
- Only fetchCurrentPrice called on re-fetch → changePct recalculated
- Pause reduced 20s → 8s when base cached (1 request vs 2 per symbol)
- Log shows (base cached) label and updated estimated time
- Works for both US (TD) and EU (AV) market data"

git tag -a v5.2.6 -m "v5.2.6: cache basePrice for market data"
git push origin main
git push origin v5.2.6


# ===========================================================================
# STEP 58 — v5.2.7  ETF mapping verified against Twelve Data free tier
# ===========================================================================
#
# ROLLBACK (if needed — run before the steps below):
#
# 1. Borrar tag local
# git tag -d v5.2.7
#
# 2. Borrar tag remoto
# git push origin --delete v5.2.7
#
# 3. Deshacer el commit LOCAL (mantiene ficheros en disco)
# git reset --soft HEAD~1
#
# 4. Borrar ficheros y copiar version corregida
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.7/. .
#
# 5. Nuevo commit
# git add .
# git commit -m "chore: ETF mapping verified against Twelve Data free tier (v5.2.7)"
#
# 6. Sobreescribir el remoto con el nuevo commit
# git push origin main --force
#
# 7. Nuevo tag
# git tag -a v5.2.7 -m "v5.2.7: ETF mapping verified"
# git push origin v5.2.7

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.7/. .

git status
git add .

git commit -m "chore: ETF mapping verified against Twelve Data free tier (v5.2.7)

- All 12 sector ETFs confirmed: XLK XLE XLF XLV XLI XLB XLY XLP XLU XLRE XLC
- All 13 industry ETFs confirmed: SOXX IGV XBI XPH XOP OIH GDX ITA JETS XRT ITB KBE VNQ
- EU indices: replaced DAX/AEX/CAC40/UKX/IBEX35 (not on free tier)
  with iShares MSCI ETFs: EWG EWN EWQ EWU EWP (all NYSE, confirmed free)
- Added: Internet Content → XLC, Drug Manufacturers → XPH, REIT → VNQ"

git tag -a v5.2.7 -m "v5.2.7: ETF mapping verified against free tier"
git push origin main
git push origin v5.2.7


# ===========================================================================
# STEP 59 — v5.2.8  Bar layout fix, RSP and QQQ benchmarks
# ===========================================================================
#
# ROLLBACK (if needed — run before the steps below):
#
# 1. Borrar tag local
# git tag -d v5.2.8
#
# 2. Borrar tag remoto
# git push origin --delete v5.2.8
#
# 3. Deshacer el commit LOCAL (mantiene ficheros en disco)
# git reset --soft HEAD~1
#
# 4. Borrar ficheros y copiar version corregida
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.8/. .
#
# 5. Nuevo commit
# git add .
# git commit -m "feat: bar layout fix, RSP and QQQ benchmarks (v5.2.8)"
#
# 6. Sobreescribir el remoto con el nuevo commit
# git push origin main --force
#
# 7. Nuevo tag
# git tag -a v5.2.8 -m "v5.2.8: bar layout and RSP QQQ"
# git push origin v5.2.8

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.8/. .

git add .
git commit -m "feat: bar layout fix, RSP and QQQ benchmarks (v5.2.8)

- 3-column layout: name 140px | bar flex | % 58px — no overlap ever
- Long names truncated with ellipsis at 22 chars
- RSP (S&P 500 Equal Weight) always fetched for .US batches
- QQQ (NASDAQ 100) fetched when batch contains NASDAQ stocks
- RSP and QQQ stored in etfs map, shown as ranking bars
- Badges: Beat/Lagged RSP and QQQ with % diff"

git tag -a v5.2.8 -m "v5.2.8: bar layout fix and RSP QQQ benchmarks"
git push origin main
git push origin v5.2.8


# ===========================================================================
# STEP 60 — v5.2.9  Fundamentals saved and restored from Supabase
# ===========================================================================
#
# IMPORTANT: run this in Supabase SQL Editor before installing:
# ALTER TABLE batches ADD COLUMN fundamentals JSONB DEFAULT NULL;
#
# ROLLBACK (if needed — run before the steps below):
#
# 1. Borrar tag local
# git tag -d v5.2.9
#
# 2. Borrar tag remoto
# git push origin --delete v5.2.9
#
# 3. Deshacer el commit LOCAL (mantiene ficheros en disco)
# git reset --soft HEAD~1
#
# 4. Borrar ficheros y copiar version corregida
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.9/. .
#
# 5. Nuevo commit
# git add .
# git commit -m "feat: fundamentals saved and restored from Supabase (v5.2.9)"
#
# 6. Sobreescribir el remoto con el nuevo commit
# git push origin main --force
#
# 7. Nuevo tag
# git tag -a v5.2.9 -m "v5.2.9: fundamentals persistence"
# git push origin v5.2.9

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.2.9/. .

git add .
git commit -m "feat: fundamentals saved and restored from Supabase (v5.2.9)

- Fundamentals (sector, industry, exchange, market cap, beta...)
  saved to Supabase fundamentals JSONB column on Save batch
- Restored on load from history — no re-fetch needed
- restoreFundamentals() in useFundamentals hook
- Exchange field restored → QQQ detection works after load from history
- Full offline session: prices + fundamentals + marketData + notes all saved"

git tag -a v5.2.9 -m "v5.2.9: fundamentals saved and restored from Supabase"
git push origin main
git push origin v5.2.9


# ===========================================================================
# STEP 61 — v5.3.0  UX: batch indicator, currency symbols, CSV export
# ===========================================================================
#
# ROLLBACK (if needed — run before the steps below):
#
# 1. Borrar tag local
# git tag -d v5.3.0
#
# 2. Borrar tag remoto
# git push origin --delete v5.3.0
#
# 3. Deshacer el commit LOCAL (mantiene ficheros en disco)
# git reset --soft HEAD~1
#
# 4. Borrar ficheros y copiar version corregida
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_v5.3.0/. .
#
# 5. Nuevo commit
# git add .
# git commit -m "feat: batch indicator, currency symbols, CSV export (v5.3.0)"
#
# 6. Sobreescribir el remoto con el nuevo commit
# git push origin main --force
#
# 7. Nuevo tag
# git tag -a v5.3.0 -m "v5.3.0: UX improvements"
# git push origin v5.3.0

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.3.0/. .

git add .
git commit -m "feat: batch indicator, currency symbols, CSV export from history (v5.3.0)

- Batch indicator above table: date, stock count, currency symbol
  Shows 'Batch loaded: DD/MM/YYYY' when from history, 'CSV imported' otherwise
- Currency symbol on price columns: dollar/euro/pound prefix
  Detected from stock currency field, applied to base price + current price
- CSV export button in batch history: downloads Openbank_YYYYMMDD.csv
  Reconstructs CSV from Supabase results — same format as pipeline output
  Works without loading batch into stock table first"

git tag -a v5.3.0 -m "v5.3.0: UX improvements pre-deploy"
git push origin main
git push origin v5.3.0


# ===========================================================================
# STEP 62 — v5.4.0  Technical preparation for v6.0.0 redesign
# ===========================================================================
#
# No Supabase migration needed for this version.
#
# After installing, run: npm install
# (new dependencies: tailwindcss, postcss, autoprefixer, radix-ui, lucide-react,
#  clsx, tailwind-merge, class-variance-authority, recharts)
#
# ROLLBACK (if needed — run before the steps below):
#
# 1. Borrar tag local
# git tag -d v5.4.0
#
# 2. Borrar tag remoto
# git push origin --delete v5.4.0
#
# 3. Deshacer el commit LOCAL (mantiene ficheros en disco)
# git reset --soft HEAD~1
#
# 4. Borrar ficheros y copiar version corregida
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_v5.4.0/. .
#
# 5. Nuevo commit
# git add .
# git commit -m "chore: technical preparation for v6.0.0 redesign (v5.4.0)"
#
# 6. Sobreescribir el remoto con el nuevo commit
# git push origin main --force
#
# 7. Nuevo tag
# git tag -a v5.4.0 -m "v5.4.0: technical prep for redesign"
# git push origin v5.4.0

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v5.4.0/. .

git add .
git commit -m "chore: technical preparation for v6.0.0 redesign (v5.4.0)

- Light mode as default (was dark mode)
- Added tailwindcss ^3.4.17 + postcss + autoprefixer
- Added @radix-ui/* primitives (dialog, dropdown, select, tabs, tooltip...)
- Added clsx, tailwind-merge, class-variance-authority, lucide-react, recharts
- Created tailwind.config.js with shadcn color token mapping
- Created postcss.config.js
- Created src/lib/utils.js with cn() helper (clsx + tailwind-merge)
- Appended shadcn HSL CSS variables to global.css (coexist with Design v5)
  Variables: --background, --foreground, --card, --primary, --sidebar etc.
  Both light and dark variants defined

After npm install the project compiles as before — no visual changes.
All new dependencies are used in v6.0.0 redesign."

git tag -a v5.4.0 -m "v5.4.0: technical preparation for v6.0.0 redesign"
git push origin main
git push origin v5.4.0


# ===========================================================================
# STEP 63 — v6.0.0  Full UI redesign: sidebar + horizon proximity bars
# ===========================================================================
#
# No Supabase migration needed.
# Run npm install after copying files (same deps as v5.4.0).
#
# ROLLBACK (if needed — run before the steps below):
#
# 1. Borrar tag local
# git tag -d v6.0.0
#
# 2. Borrar tag remoto
# git push origin --delete v6.0.0
#
# 3. Deshacer el commit LOCAL
# git reset --soft HEAD~1
#
# 4. Borrar ficheros y copiar version corregida
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_v6.0.0/. .
#
# 5. Nuevo commit
# git add .
# git commit -m "feat: full UI redesign sidebar and horizon bars (v6.0.0)"
#
# 6. Force push
# git push origin main --force
#
# 7. Nuevo tag
# git tag -a v6.0.0 -m "v6.0.0: full UI redesign"
# git push origin v6.0.0

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.0.0/. .

git add .
git commit -m "feat: full UI redesign — sidebar, horizon bars, accuracy page (v6.0.0)

- Collapsible sidebar navigation (220px ↔ 56px)
- 3 pages: Batch Overview, Accuracy Stats, Settings
- Horizon proximity bars: color + % + fill bar per 1M/3M/6M/12M
  HIT shows +% above target, MISS shows −% below at expiry
- vs SPY and vs Sector ETF columns in main table
- Accuracy Stats as dedicated page with KPI cards + chart + table
- html/body height set for full-height sidebar layout"

git tag -a v6.0.0 -m "v6.0.0: full UI redesign"
git push origin main
git push origin v6.0.0


# ===========================================================================
# STEP 64 — v6.0.1  Fix sidebar invisible + old columns in table
# ===========================================================================
#
# ROLLBACK (if needed — run before the steps below):
#
# 1. Borrar tag local
# git tag -d v6.0.1
#
# 2. Borrar tag remoto
# git push origin --delete v6.0.1
#
# 3. Deshacer el commit LOCAL
# git reset --soft HEAD~1
#
# 4. Borrar ficheros y copiar version corregida
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_v6.0.1/. .
#
# 5. Nuevo commit
# git add .
# git commit -m "fix: sidebar invisible and old columns in table (v6.0.1)"
#
# 6. Force push
# git push origin main --force
#
# 7. Nuevo tag
# git tag -a v6.0.1 -m "v6.0.1: sidebar and table fixes"
# git push origin v6.0.1

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.0.1/. .

git add .
git commit -m "fix: sidebar invisible and old columns in table (v6.0.1)

- Sidebar rewritten with inline styles (was using Tailwind classes
  which are not processed by Vite yet — caused sidebar to not render)
- Removed old columns from StockRow: Sector, Industry, Currency,
  Base date, Base price, Override — these were not removed in v6.0.0
- Table now: Ticker | Company | Price | 1M | 3M | 6M | 12M | vs SPY | vs Sector"

git tag -a v6.0.1 -m "v6.0.1: fix sidebar and table columns"
git push origin main
git push origin v6.0.1


# ===========================================================================
# STEP 65 — v6.0.2  Tailwind 4 + v0 theme — sidebar works correctly
# ===========================================================================
#
# IMPORTANT: run npm install after copying files — new deps installed:
#   @tailwindcss/vite ^4.1.0
#   tailwindcss ^4.1.0 (replaces ^3.4.17)
#   tw-animate-css ^1.3.3
#   removed: autoprefixer, postcss (not needed in Tailwind 4)
#
# ROLLBACK (if needed):
# git tag -d v6.0.2
# git push origin --delete v6.0.2
# git reset --soft HEAD~1
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_v6.0.2/. .
# git add .
# git commit -m "fix: Tailwind 4 and v0 theme (v6.0.2)"
# git push origin main --force
# git tag -a v6.0.2 -m "v6.0.2: Tailwind 4"
# git push origin v6.0.2

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.0.2/. .

npm install

git add .
git commit -m "fix: Tailwind 4 + v0 premium theme, sidebar works (v6.0.2)

- Switched from Tailwind 3 to Tailwind 4 + @tailwindcss/vite plugin
- Removed tailwind.config.js and postcss.config.js (not needed in v4)
- global.css replaced with v0 premium oklch theme (light + dark)
- Sidebar rewritten with Tailwind 4 classes matching v0 exactly
- Dark mode uses .dark class on html element (Tailwind 4 convention)
- App layout uses className flex h-screen overflow-hidden"

git tag -a v6.0.2 -m "v6.0.2: Tailwind 4 + v0 theme"
git push origin main
git push origin v6.0.2


# ===========================================================================
# STEP 66 — v6.0.3  Tailwind 3 + inline styles — Node 18 compatible
# ===========================================================================
#
# Run npm install after copying files.
# No Supabase migration needed.
#
# ROLLBACK (if needed):
# git tag -d v6.0.3
# git push origin --delete v6.0.3
# git reset --soft HEAD~1
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_v6.0.3/. .
# git add .
# git commit -m "fix: Tailwind 3 and inline styles (v6.0.3)"
# git push origin main --force
# git tag -a v6.0.3 -m "v6.0.3"
# git push origin v6.0.3

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.0.3/. .

npm install

git add .
git commit -m "fix: Tailwind 3 + inline styles, Node 18 compatible (v6.0.3)

- Reverted from Tailwind 4 to Tailwind 3 (Node 18 incompatible with v4)
- Sidebar and App layout use pure inline styles — no className in JSX
- global.css uses Tailwind 3 syntax with v0 color palette via CSS vars
- postcss.config.js and tailwind.config.js restored for Tailwind 3"

git tag -a v6.0.3 -m "v6.0.3: Tailwind 3 + inline styles"
git push origin main
git push origin v6.0.3


# ===========================================================================
# STEP 67 — v6.0.4  v0 visual style applied to main components
# ===========================================================================
#
# No npm install needed — same deps as v6.0.3
#
# ROLLBACK:
# git tag -d v6.0.4 && git push origin --delete v6.0.4
# git reset --soft HEAD~1
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_v6.0.4/. .
# git add . && git commit -m "..." && git push origin main --force
# git tag -a v6.0.4 -m "v6.0.4" && git push origin v6.0.4

find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.0.4/. .

git add .
git commit -m "feat: v0 visual style applied to main components (v6.0.4)

- Header: Batch Overview h1, lucide icons, clean layout
- SummaryCards: v0 KPI cards with icon + large number
- FetchBar/FundamentalsBar/MarketBar: clean card style
- StockTable: Batch Predictions title, legend, white card, hover rows
- StockRow: larger padding, muted company text, clean ticker"

git tag -a v6.0.4 -m "v6.0.4: v0 visual style"
git push origin main
git push origin v6.0.4


# ===========================================================================
# STEP 68 — v6.0.5  Fix syntax error in StockTable.jsx
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.0.5/. .

git add .
git commit -m "fix: remove orphaned Th fragment in StockTable.jsx (v6.0.5)

Leftover lines 92-99 from old Th component caused esbuild parse error:
Expected identifier but found slash in </th>"

git tag -a v6.0.5 -m "v6.0.5: fix StockTable syntax error"
git push origin main
git push origin v6.0.5


# ===========================================================================
# STEP 69 — v6.1.0  Complete visual redesign — all components v0 style
# ===========================================================================
#
# No npm install needed — same deps as v6.0.5
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.1.0/. .

git add .
git commit -m "feat: complete visual redesign, all components v0 style (v6.1.0)

- HorizonTabs: clean pill tabs, status banners
- SectorControls: lucide icons, toggle buttons
- ImportBox: card layout, lucide buttons, hint box
- Expanded row: v0 muted background, clean notes
- AccuracyChart full rewrite: v0 Option A design
  - Accuracy Stats h1 header
  - 4 KPI cards + 4 horizon hit rate cards
  - SVG area chart (accuracy over time)
  - Historical batches table
- global.css: spin keyframe animation"

git tag -a v6.1.0 -m "v6.1.0: complete v0 visual redesign"
git push origin main
git push origin v6.1.0


# ===========================================================================
# STEP 70 — v6.1.1  Bug fixes + expanded panel v0 + Base Price column
# ===========================================================================
#
# No npm install needed — same deps as v6.1.0
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.1.1/. .

git add .
git commit -m "fix: bugs + expanded panel v0 redesign + base price column (v6.1.1)

Bug fixes:
- Accuracy Stats nav: Header receives activePage, correct title per page
- Upload CSV sidebar: triggers hidden file input in App
- Clear overrides: confirmed working, only shown on Batch page

Expanded panel v0 redesign:
- 4 Horizon cards with status badges + % from current
- Market Performance: centered-axis bars (Option B)
- Fundamentals strip: horizontal v0 layout
- Add Note button replaces always-visible textarea

Other:
- Base Price column added after Company
- Settings page v0 card style
- AccuracyChart interactive hover tooltip"

git tag -a v6.1.1 -m "v6.1.1: bug fixes + expanded panel v0"
git push origin main
git push origin v6.1.1


# ===========================================================================
# STEP 71 — v6.1.2  Fix fetch broken + duplicate title + log message
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.1.2/. .

git add .
git commit -m "fix: fetch buttons broken, duplicate title, wrong log message (v6.1.2)

- App.jsx: removed dynamic import() from sidebar CSV handler (caused
  module parse error that broke all fetch buttons). Now uses top-level
  imported parseDate and today functions.
- AccuracyChart: removed internal Header component (caused duplicate
  title). Replaced with ActionBar (Load + Save buttons only).
- useHistory.js: fixed log messages from GitHub to Supabase."

git tag -a v6.1.2 -m "v6.1.2: fix fetch buttons and duplicate title"
git push origin main
git push origin v6.1.2


# ===========================================================================
# STEP 72 — v6.1.3  Fix Accuracy Stats crash
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.1.3/. .

git add .
git commit -m "fix: Accuracy Stats crash — history prop conflicted with window.history (v6.1.3)

AccuracyChart received a prop named 'history' which shadowed window.history.
Calling history?.map() called .map() on window.history (not an array).
Fixed by destructuring as: history: batches"

git tag -a v6.1.3 -m "v6.1.3: fix Accuracy Stats crash"
git push origin main
git push origin v6.1.3


# ===========================================================================
# STEP 73 — v6.1.4  Fix AccuracyChart — history.batches not history
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.1.4/. .

git add .
git commit -m "fix: pass history.batches to AccuracyChart, not history object (v6.1.4)"

git tag -a v6.1.4 -m "v6.1.4: fix AccuracyChart history.batches"
git push origin main
git push origin v6.1.4


# ===========================================================================
# VERIFICATION
# ===========================================================================
#
# NOTE FOR ALL FUTURE STEPS:
# Each new STEP includes a ROLLBACK block at the top (commented out).
# Use it if the pushed version has errors — it undoes local + remote commit
# and lets you push a corrected version in its place.
# See the HOW TO ROLLBACK section at the top of this file for details.

# Full commit history:
git log --oneline

# All tags:
git tag -l

# Confirm tags exist on GitHub:
git ls-remote --tags origin

# Diff between two versions:
git diff v1.0.0-vanilla v1.0.0 --stat
git diff v2.0.0 v3.0.0 --stat


# ===========================================================================
# USEFUL COMMANDS
# ===========================================================================

# Fix commit message before push:
git commit --amend -m "corrected message"

# Undo last commit (keeps files):
git reset --soft HEAD~1

# Fix a wrong tag:
git tag -d v3.1.1
git push origin --delete v3.1.1
git tag -a v3.1.1 -m "correct message"
git push origin v3.1.1

# Check status at any point:
git status
git log --oneline --graph


# ===========================================================================
# NOTES
# ===========================================================================
#
# 1. REPO:
#    Remote: https://github.com/alpyengine/openbank-price-prediction.git
#    Local:  /Users/alex/Coding/TradingProjects/OpenBack/openbank-price-prediction
#
# 2. VERSION FOLDERS (source files on disk):
#    /Users/alex/Downloads/openbank_price_check_1/   -> v0.2.0
#    /Users/alex/Downloads/openbank_price_check_2/   -> v0.3.0
#    /Users/alex/Downloads/openbank_price_check_3/   -> v0.4.0
#    /Users/alex/Downloads/openbank_price_check_4/   -> v0.5.0
#    /Users/alex/Downloads/openbank_price_check_5/   -> v0.6.0
#    /Users/alex/Downloads/openbank-price-prediction_v1.0.0_vanilla/ -> v1.0.0-vanilla
#    /Users/alex/Downloads/openbank-price-prediction_v1.0.0/         -> v1.0.0
#    /Users/alex/Downloads/openbank-price-prediction_v2.0.0/         -> v2.0.0
#    /Users/alex/Downloads/openbank-price-prediction_v2.0.1/         -> v2.0.1
#    /Users/alex/Downloads/openbank-price-prediction_v2.0.2/         -> v2.0.2
#    /Users/alex/Downloads/openbank-price-prediction_v3.0.0/         -> v3.0.0
#    /Users/alex/Downloads/openbank-price-prediction_v3.0.1/         -> v3.0.1
#    /Users/alex/Downloads/openbank-price-prediction_v3.1.0/         -> v3.1.0
#    /Users/alex/Downloads/openbank-price-prediction_v3.1.1/         -> v3.1.1
#    /Users/alex/Downloads/openbank-price-prediction_v3.1.2/         -> v3.1.2
#    /Users/alex/Downloads/openbank-price-prediction_v4.0.0/         -> v4.0.0
#    /Users/alex/Downloads/openbank-price-prediction_v4.1.0/         -> v4.1.0
#    /Users/alex/Downloads/openbank-price-prediction_v4.1.1/         -> v4.1.1
#    /Users/alex/Downloads/openbank-price-prediction_v4.1.2/         -> v4.1.2
#    /Users/alex/Downloads/openbank-price-prediction_v4.1.3/         -> v4.1.3
#    /Users/alex/Downloads/openbank-price-prediction_v4.1.4/         -> v4.1.4
#    /Users/alex/Downloads/openbank-price-prediction_v4.1.5/         -> v4.1.5
#    /Users/alex/Downloads/openbank-price-prediction_v4.1.6/         -> v4.1.6
#    /Users/alex/Downloads/openbank-price-prediction_v4.1.7/         -> v4.1.7
#    /Users/alex/Downloads/openbank-price-prediction_v4.1.8/         -> v4.1.8
#    /Users/alex/Downloads/openbank-price-prediction_v4.1.9/         -> v4.1.9
#    /Users/alex/Downloads/openbank-price-prediction_v4.2.0/         -> v4.2.0
#    /Users/alex/Downloads/openbank-price-prediction_v4.2.1/         -> v4.2.1
#    /Users/alex/Downloads/openbank-price-prediction_v4.3.0/         -> v4.3.0
#    /Users/alex/Downloads/openbank-price-prediction_v4.4.0/         -> v4.4.0
#    /Users/alex/Downloads/openbank-price-prediction_v4.5.0/         -> v4.5.0
#    /Users/alex/Downloads/openbank-price-prediction_v4.5.1/         -> v4.5.1
#    /Users/alex/Downloads/openbank-price-prediction_v4.5.2/         -> v4.5.2
#    /Users/alex/Downloads/openbank-price-prediction_v4.5.3/         -> v4.5.3
#    /Users/alex/Downloads/openbank-price-prediction_v4.5.4/         -> v4.5.4
#    /Users/alex/Downloads/openbank-price-prediction_v4.5.5/         -> v4.5.5
#    /Users/alex/Downloads/openbank-price-prediction_v4.5.6/         -> v4.5.6
#    /Users/alex/Downloads/openbank-price-prediction_v4.5.7/         -> v4.5.7
#    /Users/alex/Downloads/openbank-price-prediction_v5.0.0/         -> v5.0.0
#    /Users/alex/Downloads/openbank-price-prediction_v5.0.1/         -> v5.0.1
#    /Users/alex/Downloads/openbank-price-prediction_v5.0.2/         -> v5.0.2
#    /Users/alex/Downloads/openbank-price-prediction_v5.0.3/         -> v5.0.3
#    /Users/alex/Downloads/openbank-price-prediction_v5.0.4/         -> v5.0.4
#    /Users/alex/Downloads/openbank-price-prediction_v5.0.5/         -> v5.0.5
#    /Users/alex/Downloads/openbank-price-prediction_v5.0.6/         -> v5.0.6
#    /Users/alex/Downloads/openbank-price-prediction_v5.0.7/         -> v5.0.7
#    /Users/alex/Downloads/openbank-price-prediction_v5.0.8/         -> v5.0.8
#    /Users/alex/Downloads/openbank-price-prediction_v5.1.0/         -> v5.1.0
#    /Users/alex/Downloads/openbank-price-prediction_v5.2.0/         -> v5.2.0
#    /Users/alex/Downloads/openbank-price-prediction_v5.2.1/         -> v5.2.1
#    /Users/alex/Downloads/openbank-price-prediction_v5.2.2/         -> v5.2.2
#    /Users/alex/Downloads/openbank-price-prediction_v5.2.3/         -> v5.2.3
#    /Users/alex/Downloads/openbank-price-prediction_v5.2.4/         -> v5.2.4
#    /Users/alex/Downloads/openbank-price-prediction_v5.2.5/         -> v5.2.5
#    /Users/alex/Downloads/openbank-price-prediction_v5.2.6/         -> v5.2.6
#    /Users/alex/Downloads/openbank-price-prediction_v5.2.7/         -> v5.2.7
#    /Users/alex/Downloads/openbank-price-prediction_v5.2.8/         -> v5.2.8
#    /Users/alex/Downloads/openbank-price-prediction_v5.2.9/         -> v5.2.9
#    /Users/alex/Downloads/openbank-price-prediction_v5.3.0/         -> v5.3.0
#    /Users/alex/Downloads/openbank-price-prediction_v5.4.0/         -> v5.4.0
#    /Users/alex/Downloads/openbank-price-prediction_v6.0.0/         -> v6.0.0
#    /Users/alex/Downloads/openbank-price-prediction_v6.0.1/         -> v6.0.1
#    /Users/alex/Downloads/openbank-price-prediction_v6.0.2/         -> v6.0.2
#    /Users/alex/Downloads/openbank-price-prediction_v6.0.3/         -> v6.0.3
#    /Users/alex/Downloads/openbank-price-prediction_v6.0.4/         -> v6.0.4
#    /Users/alex/Downloads/openbank-price-prediction_v6.0.5/         -> v6.0.5
#    /Users/alex/Downloads/openbank-price-prediction_v6.1.0/         -> v6.1.0
#    /Users/alex/Downloads/openbank-price-prediction_v6.1.1/         -> v6.1.1
#    /Users/alex/Downloads/openbank-price-prediction_v6.1.2/         -> v6.1.2
#
# 3. .ENV: The .env file is in .gitignore and will NOT be committed.
#    The .env.example template is committed so others can set up their key.
#
# 4. GITHUB REPO: Create it empty (no README, no .gitignore) to avoid
#    conflicts on first push.
#
# 5. AUTHENTICATION: GitHub requires PAT or SSH (no password auth):
#    PAT: github.com -> Settings -> Developer settings -> Personal access tokens
#    SSH: ssh-keygen -t ed25519 -C "your@email.com"
#         then add public key to github.com -> Settings -> SSH keys
#
# 6. {src FOLDER: If you see a folder literally named {src in any version,
#    delete it before committing:
#    rm -rf '{src'
#
# 7. ORDER: Always push in chronological order for a clean linear history.
#
# 8. NODE_MODULES: Never copy node_modules/ between versions.
#    Run npm install fresh in each React version folder if needed.

# ===========================================================================
# STEP 72 — v6.1.4  Full code review + critical bug fixes
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.1.5/. .

git add .
git commit -m "fix: full code review — historical fetch signature + amber-bg var (v6.1.5)

Critical fix: fetchHistoricalForHorizon(stock, date, key) → (stocks[], horizon, dateMap)
The App.jsx useEffect was passing an array of stocks but the hook only
accepted a single stock. Historical prices for expired horizons now work.

Also fixed: --amber-bg CSS variable was undefined, causing visual glitches
in HorizonTabs and StockRow expired horizon styling."

git tag -a v6.1.5 -m "v6.1.5: full code review and critical fixes"
git push origin main
git push origin v6.1.5


# ===========================================================================
# STEP 73 — v6.1.5  UI: fetch bar unified + table scroll + market bars
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.1.5/. .

git add .
git commit -m "feat: unified fetch bar, table scroll, market bars Option B (v6.1.5)

- FetchBar: 3 fetch buttons in one horizontal bar with per-button spinners
- StockTable: overflowX auto for horizontal scroll on narrow screens
- MarketComparison: Option B bars — centered axis, solid green/red, 10px height"

git tag -a v6.1.5 -m "v6.1.5: fetch bar + scroll + market bars"
git push origin main
git push origin v6.1.5


# ===========================================================================
# STEP 74 — v6.2.0  New nav structure + BatchSimple + Import CSV page
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.2.0/. .

git add .
git commit -m "feat: new nav structure, BatchSimple, Import CSV page (v6.2.0)

Sidebar now has 5 pages:
- Batch Overview: new simple table — Ticker, Base date, 1M/3M/6M/12M status
  (Acertado/Fallado/Pendiente with % and days remaining)
- Batch Overview Detail: previous full table with proximity bars
- Accuracy Stats: unchanged
- Import CSV: ImportBox moved here as dedicated page with instructions
- Settings: unchanged

Removed ImportBox from Batch Overview page.
Removed sidebar Upload CSV button (replaced by Import CSV nav item).
FetchBar shown on both batch pages."

git tag -a v6.2.0 -m "v6.2.0: new nav structure"
git push origin main
git push origin v6.2.0


# ===========================================================================
# STEP 75 — v6.3.0  Batch selector + Awaiting fix + margin slider
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.3.0/. .

git add .
git commit -m "feat: batch selector, margin slider, accuracy fixes (v6.3.0)

- FetchBar: batch selector dropdown shows saved batches by date
- Accuracy Stats: hit margin slider (±1-20%, default 5%)
  - Margin is global — affects all components in real time
  - evaluatePrediction() now accepts margin parameter
- Accuracy fixes:
  - Awaiting box: now correctly counts pending predictions
  - Overall hit rate box: shows unique tickers + total batches
  - Horizon cards: different colors per horizon (green/blue/orange/purple)
- All components pass hitMargin: SummaryCards, BatchSimple, StockRow, StockTable"

git tag -a v6.3.0 -m "v6.3.0: batch selector, margin slider, accuracy fixes"
git push origin main
git push origin v6.3.0


# ===========================================================================
# STEP 76 — v6.3.1  Hit rate bug fix + All horizons button
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.3.1/. .

git add .
git commit -m "fix: hit rate 200%/280% bug + All horizons button (v6.3.1)

- AccuracyChart: batch table now uses batchSummary.hitRate (correct)
  instead of raw batch.hit_rate (wrong field) or hits/stocks (wrong divisor)
- HorizonTabs: added 'All' button — aggregates all 4 horizons
- SummaryCards: handles horizon='all' — counts hits/close/awaiting
  across 1M+3M+6M+12M simultaneously using current price
- App.jsx: horizon='all' skips historical price fetch and horizonExpired"

git tag -a v6.3.1 -m "v6.3.1: hit rate fix + All button"
git push origin main
git push origin v6.3.1


# ===========================================================================
# STEP 77 — v6.3.2  Add Awaiting column to Historical batches table
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.3.2/. .

git add .
git commit -m "feat: add Awaiting column to Historical batches table (v6.3.2)

- Historical batches table now shows 7 columns: Date, Stocks, Hit rate,
  Hits, Misses, Awaiting, Actions
- Awaiting shows ⏳ N when > 0, — when all predictions are closed
- Data comes from batchSummary.awaiting (already computed correctly)"

git tag -a v6.3.2 -m "v6.3.2: Awaiting column in batches table"
git push origin main
git push origin v6.3.2


# ===========================================================================
# STEP 78 — v6.3.3  Fix awaiting always 0 — correct horizon evaluation
# ===========================================================================
#
# No npm install needed.
#
# IMPORTANT: Re-save existing batches after installing — old saved batches
# have incorrect verdicts (future horizons marked as miss instead of awaiting).
# Load each batch and click Save batch to recalculate correctly.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.3.3/. .

git add .
git commit -m "fix: awaiting always 0 — correct horizon evaluation in saveBatch (v6.3.3)

Root cause: saveBatch evaluated ALL horizons using current price, marking
future horizons as hit/miss instead of awaiting. A horizon should only
be evaluated if its target date has ALREADY passed.

Fix: each horizon checks its own expiry date independently.
- Expired horizon + historical price → hit/miss/close
- Expired horizon + no price → awaiting
- Future horizon → always awaiting (regardless of current price)

NOTE: Re-save existing batches to recalculate verdicts correctly."

git tag -a v6.3.3 -m "v6.3.3: fix awaiting evaluation in saveBatch"
git push origin main
git push origin v6.3.3


# ===========================================================================
# STEP 79 — v6.3.4  Fix duplicate HKEYS declaration in useHistory.js
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.3.4/. .

git add .
git commit -m "fix: remove duplicate HKEYS declaration in useHistory.js (v6.3.4)

HKEYS was declared twice in the same scope (lines 79 and 151),
causing esbuild parse error. Removed unused duplicate on line 79."

git tag -a v6.3.4 -m "v6.3.4: fix duplicate HKEYS"
git push origin main
git push origin v6.3.4


# ===========================================================================
# STEP 80 — v6.3.5  Move batch selector + Save batch to FetchBar right side
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.3.5/. .

git add .
git commit -m "feat: move Save batch to FetchBar, batch selector far right (v6.3.5)

FetchBar order (left to right):
  log | Fetch prices | Fundamentals | Market data | [date dropdown] | Save batch

- Removed Save batch from AccuracyChart ActionBar
- Save batch now in FetchBar on both Batch Overview pages
- Batch selector moved to the right of Market data
- FetchBar receives onSave + saving props from App"

git tag -a v6.3.5 -m "v6.3.5: Save batch in FetchBar"
git push origin main
git push origin v6.3.5


# ===========================================================================
# STEP 81 — v6.4.0  Vitest + rename Load history → Refresh
# ===========================================================================
#
# ⚠️  THIS VERSION REQUIRES npm install — new devDependency: vitest
#
cd /Users/alex/Downloads/openbank-price-prediction_v6.4.0
npm install
npm run test:run    # verify all 77 tests pass before committing
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.4.0/. .

git add .
git commit -m "feat: Vitest testing suite + rename Refresh button (v6.4.0)

Testing suite — 77 tests across 4 files:
- src/utils/stocks.test.js   (37 tests) evaluatePrediction, getTarget,
  distancePct, getEffectivePrice, priceStatus
- src/utils/dates.test.js    (20 tests) parseDate, targetDates,
  daysLeft, dateStatus, formatDate
- src/hooks/computed.test.js (10 tests) hit rate, awaiting, uniqueTickers,
  batchSummary — includes regression test for 200%/280% bug
- src/hooks/saveBatch.test.js (10 tests) future horizons always awaiting,
  expired horizon evaluation, verdict never undefined

Run tests: npm run test (watch) or npm run test:run (single run)

UI: renamed 'Load history' to 'Refresh' in AccuracyChart ActionBar
README: added full Vitest documentation section"

git tag -a v6.4.0 -m "v6.4.0: Vitest testing suite"
git push origin main
git push origin v6.4.0


# ===========================================================================
# STEP 82 — v6.4.1  Fix Vitest compatibility with Node 18
# ===========================================================================
#
# ⚠️  THIS VERSION REQUIRES npm install — Vitest devDependency
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.4.1/. .

npm install
npm run test:run    # verify all 77 tests pass
npm run dev         # verify app starts

git add .
git commit -m "fix: downgrade Vitest to 0.34.6 for Node 18 compatibility (v6.4.1)

Vitest 1.6.x requires Node 20+. Downgraded to 0.34.6 which is
the last version fully compatible with Node 18.
All 77 tests pass on Node 18.20.8."

git tag -a v6.4.1 -m "v6.4.1: Vitest Node 18 compatibility"
git push origin main
git push origin v6.4.1


# ===========================================================================
# STEP 83 — v6.5.0  Supabase price_cache automation
# ===========================================================================
#
# No npm install needed — no new npm dependencies.
#
# ⚠️  BEFORE installing this version, complete the Supabase setup:
#     See README.md → "Supabase — Architecture & Automation"
#     Steps 1-5 must be run in Supabase SQL Editor first.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.5.0/. .

git add .
git commit -m "feat: Supabase price_cache automation (v6.5.0)

Backend (Supabase SQL — run manually in dashboard):
- price_cache table: stores closing prices fetched by pg_cron
- fetch_expired_horizons() function: detects awaiting horizons,
  calls Twelve Data API, updates verdicts automatically
- pg_cron job: runs every weekday at 23:00 UTC

Frontend (React):
- storage.js: loadCachedPrice() reads from price_cache before API
- usePriceFetch.js: cache-first strategy for historical prices
  (Supabase cache → Twelve Data API fallback)
- StockRow: shows 💾 cached / exp. indicator on historical prices

README: full Supabase documentation section added"

git tag -a v6.5.0 -m "v6.5.0: Supabase price_cache automation"
git push origin main
git push origin v6.5.0


# ===========================================================================
# STEP 84 — v6.5.1  Fix hitMargin not defined in HorizonCards
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.5.1/. .

git add .
git commit -m "fix: hitMargin not defined in HorizonCards subcomponent (v6.5.1)

HorizonCards was using hitMargin from outer scope instead of
receiving it as a prop. Fix:
- Added hitMargin = 5 to HorizonCards props signature
- Passed hitMargin prop at the HorizonCards call site in StockRow"

git tag -a v6.5.1 -m "v6.5.1: fix HorizonCards hitMargin"
git push origin main
git push origin v6.5.1


# ===========================================================================
# STEP 85 — v6.5.2  Remove Forward P/E + CSV preview table in ImportBox
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.5.2/. .

git add .
git commit -m "feat: CSV preview table in ImportBox + remove Forward P/E (v6.5.2)

- ImportBox: shows parsed data as a table immediately after loading
  a CSV file or clicking Import — Ticker, Company, CCY, Base, 
  1M/3M/6M/12M targets and Date all visible before going to batch view
- Removed Forward P/E field — /statistics endpoint is not available
  on Twelve Data free plan (403 Forbidden). Eliminates console errors
  on every Fundamentals fetch.
- useFundamentals: now fetches FMP only (no parallel TD call)
- StockRow: Forward P/E row removed from fundamentals panel"

git tag -a v6.5.2 -m "v6.5.2: CSV preview + remove Forward P/E"
git push origin main
git push origin v6.5.2


# ===========================================================================
# STEP 85 — v6.5.2  CSV preview + Forward P/E from FMP + remove TD /statistics
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.5.2/. .

git add .
git commit -m "feat: CSV preview table + Forward P/E via FMP free plan (v6.5.2)

ImportBox:
- Shows parsed CSV as a preview table immediately after load/import
- Columns: Ticker, Company, CCY, Base, 1M, 3M, 6M, 12M, Date
- Table clears when user clicks Clear

Fundamentals:
- Removed Twelve Data /statistics call (403 on free plan — no more console errors)
- Added fetchFMPForwardPE() using FMP /key-metrics endpoint (free plan)
- Profile + ForwardPE fetched in parallel via Promise.allSettled
- Falls back to peRatio (TTM) if forwardPe field absent in FMP response
- Forward P/E restored in StockRow fundamentals panel"

git tag -a v6.5.2 -m "v6.5.2: CSV preview + Forward P/E via FMP"
git push origin main
git push origin v6.5.2


# ===========================================================================
# STEP 86 — v6.5.3  Remove P/E — not available on FMP free plan
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.5.3/. .

git add .
git commit -m "fix: remove P/E ratio — not available on FMP free plan (v6.5.3)

curl test confirmed p.pe is absent from FMP /stable/profile free plan.
/key-metrics returns 200 but field empty on free tier.
- Removed peRatio from fetchFMPProfile return object
- Removed forwardPE from fundamentals data object
- Removed P/E (TTM) field from StockRow display
- Removed unused tdSymbol function
Zero API calls that can fail."

git tag -a v6.5.3 -m "v6.5.3: remove P/E — not on free plan"
git push origin main
git push origin v6.5.3


# ===========================================================================
# STEP 87 — v6.5.4  StockRow UI fixes: notes, website, description, vs Sector
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.5.4/. .

git add .
git commit -m "fix: StockRow UI — notes alignment, website blue, description, vs Sector (v6.5.4)

1. Notes button aligned left (was flex-end, now flex-start) — 
   sits inline with fundamentals section
2. Website link color fixed to #2563eb blue (was var(--tw-primary) green)
3. Description restored — 'Read description ›' button inside 
   FundamentalsPanel triggers the existing description modal
4. vs Sector column improved — shows specific hints per state:
   - No fundamentals fetched → 'fetch funds'
   - Sector not mapped in SECTOR_ETF → '--'
   - Fundamentals loaded but Market Data not fetched → 'XLK fetch mkt'
   - No current price → 'XLK no price'
   - All data available → ✅/❌ diff%"

git tag -a v6.5.4 -m "v6.5.4: StockRow UI fixes"
git push origin main
git push origin v6.5.4


# ===========================================================================
# STEP 88 — v6.5.5  Chronological batch ordering everywhere
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.5.5/. .

git add .
git commit -m "feat: chronological batch ordering in chart, table and dropdown (v6.5.5)

Root cause: date field is DD/MM/YYYY string — sorting alphabetically
gives wrong order. Fix: parseBatchDate() converts to Date for comparison.

- storage.js: Supabase query now orders by saved_at desc (timestamp)
  instead of date string — reliable chronological ordering from DB
- useHistory.js: added parseBatchDate() helper, sortedBatches array
  (oldest→newest) used for chart axis; batchSummary reversed
  (newest→oldest) for table display
- FetchBar.jsx: BatchSelector dropdown sorts newest→oldest using
  parseBatchDate() — most recent batch shown first"

git tag -a v6.5.5 -m "v6.5.5: chronological batch ordering"
git push origin main
git push origin v6.5.5


# ===========================================================================
# STEP 89 — v6.5.6  Fix Awaiting + unified verdict system + 5 summary boxes
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.5.6/. .

git add .
git commit -m "feat: unified verdict + 5 summary boxes + fix Awaiting (v6.5.6)

SummaryCards:
- Fixed Awaiting count: now counts horizons not yet due (not no-price)
  Added isHorizonExpired() helper using dateStatus() + targetDates()
- 5 boxes: Total | Hit | Close (±N%) | Miss | Awaiting
- Box numbers in verdict color (green/amber/red/neutral)
- Icon backgrounds in pastel verdict color
- Sub-label colored per verdict ('today\'s price' / 'historical price')
- Miss box added with XCircle icon in red

StockRow bars:
- Removed 6-zone gradient system (exceeded/near/close/far/vfar/miss)
- Now uses evaluatePrediction(): hit/close/miss/awaiting
- Fill widths: hit=100% green | close=66% amber | miss=33% red | awaiting=0%
- Labels: HIT +X% | CLOSE +X% | MISS X% | --

HorizonCards:
- Removed EXCEEDED/NEAR custom logic
- Now uses evaluatePrediction: HIT/CLOSE/MISS/AWAITING badges
- All colors aligned with same palette"

git tag -a v6.5.6 -m "v6.5.6: unified verdict + fix Awaiting"
git push origin main
git push origin v6.5.6


# ===========================================================================
# STEP 90 — v6.5.7  Proportional bars + avg % in summary boxes
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.5.7/. .

git add .
git commit -m "feat: proportional bars + avg % in summary boxes (v6.5.7)

StockRow bars:
- Bar width now proportional to distance from target (not fixed)
- HIT: always 100% full green bar (hit is a hit at +128% or +5%)
- CLOSE: 88-96% amber bar proportional within ±margin% band
- MISS: 0-75% red bar — farther from target = shorter bar
- Labels: HIT +128% / CLOSE -3% / MISS -22%

SummaryCards:
- Hit/Close/Miss sub-labels now show average distance to target
- Format: 'avg +38% · today\\'s price'
- Computed as mean of (price - target) / target * 100 per group
- Awaiting sub-label unchanged"

git tag -a v6.5.7 -m "v6.5.7: proportional bars + avg %"
git push origin main
git push origin v6.5.7


# ===========================================================================
# STEP 91 — v6.5.8  Restore histPrices from batch + CSV shows in textarea
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.5.8/. .

git add .
git commit -m "fix: restore histPrices from batch + CSV textarea (v6.5.8)

Fix 1 — histPrices restored from saved batch results:
- usePriceFetch: added restoreHistPrices(results) function
  Reconstructs histPrices from batch.results[].priceOnDate
  Format: { 'TER_1M': { price, date, fromCache, isHistorical } }
- App.jsx: handleLoadBatch now calls restoreHistPrices(batch.results)
  instead of resetPrices() — no more API calls for expired horizons
  that already have a saved price. Eliminates 429 errors on load.

Fix 2 — CSV file shows in textarea before importing:
- ImportBox: handleFileChange now only loads text into textarea
  and shows 'click Import to continue' message
- User can review the CSV content before clicking Import
- Import button sends data to the batch tables as before"

git tag -a v6.5.8 -m "v6.5.8: restore histPrices + CSV textarea"
git push origin main
git push origin v6.5.8


# ===========================================================================
# STEP 92 — v6.5.9  Fix action buttons in Accuracy Stats batch table
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.5.9/. .

git add .
git commit -m "fix: action buttons in Accuracy Stats batch table (v6.5.9)

Load button:
- Reduced timeout from 1200ms to 600ms (load is synchronous)
- Shows '...' during load, returns to 'Load' after
- Button disabled while loading to prevent double-click
- Border/text color changes to primary while loading

Download button (middle icon):
- Was: silent download with no feedback
- Now: button turns green with '✓' for 1.5s after click
- Added title='Download CSV' tooltip on hover
- Downloads batch as Openbank_YYYYMMDD.csv

Delete button unchanged (double-click confirmation)"

git tag -a v6.5.9 -m "v6.5.9: fix action buttons"
git push origin main
git push origin v6.5.9


# ===========================================================================
# STEP 92 — v6.5.9  Fix action buttons + batch.results not iterable
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.5.9/. .

git add .
git commit -m "fix: batch.results not iterable + action buttons (v6.5.9)

Root cause: AccuracyChart table renders stats.batchSummary (summary
objects without results[]) but Load/Download needed full batch with
results[]. Fixed by looking up full batch from history.batches by id.

AccuracyChart:
- handleLoadBatch: finds full batch via batches.find(b=>b.id===batch.id)
- handleExportCSV: same lookup + guard if results missing
- Load button: 600ms timeout, disabled during load, colored border
- Download button: green checkmark feedback 1.5s + tooltip 'Download CSV'"

git tag -a v6.5.9 -m "v6.5.9: fix batch.results + action buttons"
git push origin main
git push origin v6.5.9


# ===========================================================================
# STEP 93 — v6.7.0  Weekly price chart per ticker
# ===========================================================================
#
# No npm install needed.
#
# ⚠️  BEFORE installing: complete Supabase setup (already done):
#     - weekly_prices table created ✅
#     - fetch_weekly_prices() function created ✅
#     - Cron scheduled Saturdays 10:00 UTC ✅
#     - Historical data populated for all active batches ✅
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.7.0/. .

git add .
git commit -m "feat: weekly price chart per ticker (v6.7.0)

Supabase backend (already configured):
- Table: weekly_prices (ticker, batch_id, week, week_date, close_price)
- Function: fetch_weekly_prices() — fetches EOD prices from Twelve Data
- Cron: every Saturday 10:00 UTC (job id 2)
- Historical data populated for all active batches

React frontend:
- storage.js: loadWeeklyPrices(ticker, batchId) reads from weekly_prices
- PriceChart.jsx: new component with Chart.js
  - Button 'Price chart' in StockRow expanded panel
  - Loads on demand (click) — no API call, reads from Supabase
  - Week 0 = base price, weeks 1..N = weekly closes from Supabase
  - 4 red target dots at weeks 4/13/26/52 with labels 1M/3M/6M/12M
  - Blue line, smooth tension=0.4, dark mode compatible
- index.html: Chart.js 4.4.1 loaded from CDN
- App.jsx: loadedBatchId state tracked alongside loadedBatchDate
- StockTable + StockRow: batchId prop passed down the chain"

git tag -a v6.7.0 -m "v6.7.0: weekly price chart"
git push origin main
git push origin v6.7.0


# ===========================================================================
# STEP 94 — v6.7.1  PriceChart as modal (like description modal)
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.7.1/. .

git add .
git commit -m "feat: PriceChart as modal overlay (v6.7.1)

PriceChart now opens as a modal overlay identical to the description
modal — position:fixed, backdrop blur, click outside or Esc to close.

- Button '📈 Price chart' in StockRow expanded panel
- Click → loads data from Supabase weekly_prices → opens modal
- Modal header: ticker name + base price + weeks of data
- Legend: blue line = weekly close, red dots = targets
- Target pills: 1M/3M/6M/12M with prices
- Chart: 260px height, smooth line, red dots at target weeks
- Close: ✕ button, Esc key, or click backdrop"

git tag -a v6.7.1 -m "v6.7.1: PriceChart modal"
git push origin main
git push origin v6.7.1


# ===========================================================================
# STEP 95 — v6.8.0  Supabase tests (storage + restoreHistPrices)
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.8.0/. .

git add .
git commit -m "test: Supabase storage + restoreHistPrices tests (v6.8.0)

2 new test files — 107 tests total (was 77):

src/services/storage.test.js (18 tests):
- loadWeeklyPrices URL construction (ticker encoding, batchId, ordering)
- loadWeeklyPrices response parsing (rows, empty, non-array)
- loadCachedPrice URL construction (.US/.DE suffix stripping, date format)
- loadCachedPrice response parsing (price as float, cache miss, multi-row)

src/hooks/restoreHistPrices.test.js (12 tests):
- Null/empty input handling
- Single result with priceOnDate
- Multiple horizons per ticker
- Multiple tickers
- Skips results without priceOnDate/ticker/horizon
- Awaiting results skipped gracefully
- Key format TICKER_HORIZON
- fromCache always false
- isHistorical always true"

git tag -a v6.8.0 -m "v6.8.0: Supabase tests"
git push origin main
git push origin v6.8.0


# ===========================================================================
# STEP 96 — v6.8.1  README: About + Testing sections
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.8.1/. .

git add .
git commit -m "docs: About + Testing sections in README (v6.8.1)

README additions:

## What this app does (new — top of file)
- Problem it solves: manual forecast tracking is tedious
- How it solves it: 6-step flow (import → fetch → evaluate → save → automate → visualise)
- Hit/Close/Miss/Awaiting table with conditions and colors
- References evaluatePrediction() as single source of truth

## Testing (new — before Changelog)
- What Vitest is and why we use it
- How to run tests: npm run test:run / npm run test
- Table of all 6 test files with test count and coverage
- Key functions tested with explanation
- Pattern for adding new tests"

git tag -a v6.8.1 -m "v6.8.1: README About + Testing sections"
git push origin main
git push origin v6.8.1


# ===========================================================================
# STEP 97 — v6.9.0  Phase 0: shadcn/ui migration preparation
# ===========================================================================
#
# No npm install needed — all dependencies already present.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.9.0/. .

git add .
git commit -m "chore: Phase 0 — shadcn/ui migration preparation (v6.9.0)

CSS variables renamed to shadcn/ui standard convention:
  --tw-bg → --background, --tw-fg → --foreground
  --tw-card → --card, --tw-muted-fg → --muted-foreground
  (full table in docs/MIGRATION_SHADCN.md)

Legacy --tw-* aliases added in global.css so existing inline
styles continue to work during gradual migration (removed in v6.9.4)

tailwind.config.js: updated color tokens to use new variable names
  + added border radius calc() expressions (shadcn standard)
  + added popover and destructive color tokens
  + comprehensive JSDoc comments

vite.config.js: added @/ path alias → src/
  Enables: import { Button } from '@/components/ui/button'

components.json: shadcn/ui CLI configuration file
  style=default, tsx=false (JSX project), cssVariables=true

docs/MIGRATION_SHADCN.md: complete migration guide (new)
  - Why migrating, pre-migration audit, phase plan
  - CSS variable rename table
  - Code patterns before/after
  - Import conventions, rollback strategy

README.md: link to MIGRATION_SHADCN.md

Tests: 107/107 passing — no logic changes"

git tag -a v6.9.0 -m "v6.9.0: Phase 0 shadcn migration prep"
git push origin main
git push origin v6.9.0


# ===========================================================================
# STEP 98 — v6.9.1  Phase 1: shadcn/ui base components installed
# ===========================================================================
#
# ⚠️  npm install needed — @radix-ui/react-label was added.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.9.1/. .
npm install

git add .
git commit -m "feat: Phase 1 — shadcn/ui base components (v6.9.1)

Created src/components/ui/ with 12 base components:
  button.jsx    — variants: default|destructive|outline|secondary|ghost|link
  card.jsx      — Card + CardHeader + CardTitle + CardDescription + CardContent + CardFooter
  badge.jsx     — variants: default|secondary|destructive|outline
  separator.jsx — horizontal/vertical divider (Radix UI)
  tooltip.jsx   — floating label (Radix UI, accessible)
  tabs.jsx      — tab interface (Radix UI, keyboard navigation)
  select.jsx    — dropdown select (Radix UI, with scroll buttons)
  dialog.jsx    — modal overlay (Radix UI, focus trap + Esc key)
  table.jsx     — Table + Header + Body + Footer + Row + Head + Cell + Caption
  input.jsx     — single-line text input
  textarea.jsx  — multi-line text input
  label.jsx     — accessible form label (Radix UI)

New dependency: @radix-ui/react-label

All components:
  - Fully documented with JSDoc and usage examples
  - Use @/ path alias for imports
  - Reference CSS variables (--background, --border, etc.)
  - Accessible by default via Radix UI primitives
  - Owned by the project (copy-paste pattern, no black box)

Tests: 107/107 passing"

git tag -a v6.9.1 -m "v6.9.1: Phase 1 shadcn base components"
git push origin main
git push origin v6.9.1
