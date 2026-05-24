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
