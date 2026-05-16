# Git Repository Setup Guide
# Openbank Price Prediction — Full History v0.2.0 to v3.1.2
# ===========================================================================
#
# STRATEGY: Replay history
# One repo, one branch (main), one commit + tag per version.
# Copy files -> commit -> tag -> push -> repeat for each version.
#
# PREREQUISITES:
#   - Git installed:      git --version
#   - GitHub empty repo created (no README, no .gitignore)
#   - Git configured with your name/email
#
# YOUR VERSION FOLDERS ON DISK:
#   openbank_price_check_1/        -> v0.2.0
#   openbank_price_check_2/        -> v0.3.0
#   openbank_price_check_3/        -> v0.4.0
#   openbank_price_check_4/        -> v0.5.0
#   openbank_price_check_5/        -> v0.6.0
#   openbank-price-prediction_v1.0.0_vanilla/ -> v1.0.0-vanilla
#   openbank-price-prediction_v1.0.0/         -> v1.0.0
#   openbank-price-prediction_v2.0.0/         -> v2.0.0
#   openbank-price-prediction_v2.0.1/         -> v2.0.1
#   openbank-price-prediction_v2.0.2/         -> v2.0.2
#   openbank-price-prediction_v3.0.0/         -> v3.0.0
#   openbank-price-prediction_v3.0.1/         -> v3.0.1
#   openbank-price-prediction_v3.1.0/         -> v3.1.0
#   openbank-price-prediction_v3.1.1/         -> v3.1.1
#
# Replace /Users/alex/Downloads/ with your actual path throughout.
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

mkdir openbank-price-prediction
cd openbank-price-prediction

git init
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/openbank-price-prediction.git

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

git rm -rf .
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

git rm -rf .
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

git rm -rf .
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

git rm -rf .
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

git rm -rf .
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

git rm -rf .
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

git rm -rf .
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

git rm -rf .
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

git rm -rf .
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

git rm -rf .
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

git rm -rf .
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

git rm -rf .
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

git rm -rf .
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

git rm -rf .
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
# VERIFICATION
# ===========================================================================

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
# 1. PATHS: Replace /Users/alex/Downloads/ with your actual folder path.
#
# 2. .ENV: The .env file is in .gitignore and will NOT be committed.
#    The .env.example template is committed so others can set up their key.
#
# 3. GITHUB REPO: Create it empty (no README, no .gitignore) to avoid
#    conflicts on first push.
#
# 4. AUTHENTICATION: GitHub requires PAT or SSH (no password auth):
#    PAT: github.com -> Settings -> Developer settings -> Personal access tokens
#    SSH: ssh-keygen -t ed25519 -C "your@email.com"
#         then add public key to github.com -> Settings -> SSH keys
#
# 5. {src FOLDER: If you see a folder literally named {src in any version,
#    delete it before committing:
#    rm -rf '{src'
#
# 6. ORDER: Always push in chronological order for a clean linear history.
#
# 7. NODE_MODULES: Never copy node_modules/ between versions.
#    Run npm install fresh in each React version folder if needed.
