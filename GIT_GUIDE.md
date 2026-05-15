# Git Repository Setup Guide
# Openbank Price Prediction — Full History from v1.0.0-vanilla to v3.1.0
# ===========================================================================
#
# STRATEGY: Replay history
# One repo, one branch (main), one commit per version, one tag per version.
# You copy the files for each version, commit, tag, push — then repeat.
#
# PREREQUISITES:
#   - Git installed: git --version
#   - GitHub account + repo created (empty, no README)
#   - Your name/email configured in git
# ===========================================================================


# ===========================================================================
# STEP 0 — One-time global git configuration (skip if already done)
# ===========================================================================

git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# Verify:
git config --global --list


# ===========================================================================
# STEP 1 — Create the local repository
# ===========================================================================

# Create a clean folder for the repo (NOT inside any existing version folder)
mkdir openbank-price-prediction
cd openbank-price-prediction

# Initialize git
git init

# Set default branch to main
git branch -M main

# Connect to your GitHub remote
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/openbank-price-prediction.git

# Verify remote:
git remote -v


# ===========================================================================
# STEP 2 — Create a .gitignore (applies to all versions)
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
git commit -m "chore: add .gitignore"


# ===========================================================================
# STEP 3 — v1.0.0-vanilla  (HTML + Python)
# ===========================================================================

# Copy files from your local folder for this version into the repo folder.
# Your folder structure should contain:
#   openbank_price_check.html
#   run.py
#   README.md  (or create one — see note below)
#
# On Mac/Linux:
cp -r /path/to/your/v1_vanilla_folder/. .
#
# On Windows:
# xcopy /E /I C:\path\to\v1_vanilla_folder\* .

# Review what will be committed:
git status

# Stage all files:
git add .

# Commit:
git commit -m "feat: initial vanilla HTML version

- Single HTML file + Python HTTP server (run.py)
- Vanilla JS, no framework, dark mode UI
- CSV import: TICKER,Company,CCY,BasePrice,1M,3M,6M,12M
- Manual price override with focus fix (onblur)
- Horizon tabs: Best/1M/3M/6M/12M
- Distance bar + Hit/Miss badges
- Email report generator
- Price fetch: yfinance + stooq fallback
- Python server endpoints: /health /prices"

# Tag this version:
git tag -a v1.0.0-vanilla -m "v1.0.0-vanilla: initial HTML + Python version"

# Push commit and tag:
git push -u origin main
git push origin v1.0.0-vanilla


# ===========================================================================
# STEP 4 — v1.0.0  (React + Python backend)
# ===========================================================================

# Remove all previous files (keep .gitignore):
git rm -rf .
# If git rm gives errors for untracked files, also run:
# rm -rf * (Mac/Linux) or del /S /Q * (Windows, be careful)

# Copy v1.0.0 React files:
cp -r /path/to/your/v1_react_folder/. .

# Make sure .gitignore is still there (cp may have overwritten it):
cat .gitignore  # verify content

git status
git add .

git commit -m "feat: React + Python backend (v1.0.0)

- React 18 + Vite frontend
- Python run.py server: /health /prices endpoints
- Price sources: yfinance -> stooq fallback cascade
- Vite proxy: /api/* -> localhost:8765
- React.memo on StockRow (no unnecessary rerenders)
- Override input: onBlur commit, no focus loss
- Two-terminal workflow required"

git tag -a v1.0.0 -m "v1.0.0: React + Python backend"

git push origin main
git push origin v1.0.0


# ===========================================================================
# STEP 5 — v2.0.0  (React only, Twelve Data API)
# ===========================================================================

git rm -rf .
cp -r /path/to/your/v2_0_0_folder/. .

git status
git add .

git commit -m "feat: eliminate Python backend, use Twelve Data API (v2.0.0)

BREAKING CHANGE: Python backend removed entirely

- Twelve Data API called directly from browser (CORS open)
- usePriceFetch.js: single batch request for all tickers
- React.memo + onBlur commit pattern carried forward
- .env file: VITE_TWELVE_DATA_KEY
- Single terminal: npm run dev
- Removed: run.py, pip dependencies, Vite proxy"

git tag -a v2.0.0 -m "v2.0.0: React only, no backend, Twelve Data API"

git push origin main
git push origin v2.0.0


# ===========================================================================
# STEP 6 — v2.0.1  (Visual improvements)
# ===========================================================================

git rm -rf .
cp -r /path/to/your/v2_0_1_folder/. .

git status
git add .

git commit -m "feat: horizon status indicators on all target columns (v2.0.1)

- expired/soon/now tags on all 4 target columns (was only 12M)
- Countdown days below each target price
- HorizonTabs: tab border color by status (red/amber)
- Dot indicator on non-active expired/soon tabs
- Three contextual banners: expired warning, approaching, target today
- Date reference bar colored by horizon status"

git tag -a v2.0.1 -m "v2.0.1: horizon status tags and banners"

git push origin main
git push origin v2.0.1


# ===========================================================================
# STEP 7 — v2.0.2  (Bugfix)
# ===========================================================================

git rm -rf .
cp -r /path/to/your/v2_0_2_folder/. .

git status
git add .

git commit -m "fix: React border/borderColor shorthand conflict (v2.0.2)

- HorizonTabs tab styles mixed border shorthand with borderColor longhand
- React rejected this during rerender causing fetch failure and console warning
- All tab variants now use full border shorthand exclusively"

git tag -a v2.0.2 -m "v2.0.2: fix React style shorthand conflict"

git push origin main
git push origin v2.0.2


# ===========================================================================
# STEP 8 — v3.0.0  (Historical prices)
# ===========================================================================

git rm -rf .
cp -r /path/to/your/v3_0_0_folder/. .

git status
git add .

git commit -m "feat: historical price fetch for expired horizons (v3.0.0)

MAJOR FEATURE: Option B - historical price on target date

- Expired horizon tabs auto-fetch closing price on exact target date
- Twelve Data /time_series endpoint with 7-day lookback window
  (handles weekends and US market holidays)
- usePriceFetch.js: fetchCurrentBatch() + fetchHistoricalForHorizon()
- histPrices state keyed by TICKER_HORIZON (e.g. TER_1M)
- getEffectivePrice(): override > historical > current
- App.jsx useEffect: triggers historical fetch on expired tab switch
- FetchBar: mode-aware badge (current / historical)
- StockRow: loading state, historical date label, result subtitle
- Price column: shows close date when historical"

git tag -a v3.0.0 -m "v3.0.0: historical price fetch for expired horizons"

git push origin main
git push origin v3.0.0


# ===========================================================================
# STEP 9 — v3.0.1  (UI fixes)
# ===========================================================================

git rm -rf .
cp -r /path/to/your/v3_0_1_folder/. .

git status
git add .

git commit -m "fix: Status/Distance overlap, column widths, Best target label (v3.0.1)

- StockTable minWidth increased to 1060px
- Status column renamed to Result, widened to 120px
- Result text shortened to avoid overflow
- DistBar max-width reduced, no longer overlaps Result
- Best target tab: shows which horizon per stock (vs 12M · today)
- HorizonTabs expired banner: removed stale 'coming in next version' text"

git tag -a v3.0.1 -m "v3.0.1: UI overlap fixes and column improvements"

git push origin main
git push origin v3.0.1


# ===========================================================================
# STEP 10 — v3.1.0  (Direction-aware logic)
# ===========================================================================

git rm -rf .
cp -r /path/to/your/v3_1_0_folder/. .

git status
git add .

git commit -m "feat: direction-aware prediction evaluation (v3.1.0)

- evaluatePrediction(price, target, basePrice) in stocks.js
  determines direction: bullish (target > base) / bearish / neutral
  HIT logic: bullish = price >= target, bearish = price <= target
- Fixes bug: bearish predictions incorrectly showing Reached when
  price was above a downward target (e.g. NEM 113 vs target 55)
- Direction arrows on target columns: up green / down red / right gray
- CLOSE badge (amber) added for +/-5% proximity
- Result labels: Reached/Dropped (bullish/bearish HIT)
  Not reached / Didn't drop (bullish/bearish MISS)
- DistBar: bar on top, percentage below (no horizontal overlap)
- SummaryCards: uses evaluatePrediction for accurate counts"

git tag -a v3.1.0 -m "v3.1.0: direction-aware Hit/Miss, distance layout fix"

git push origin main
git push origin v3.1.0


# ===========================================================================
# VERIFICATION — Check the full history looks correct
# ===========================================================================

# See all commits:
git log --oneline

# See all tags:
git tag -l

# See a specific tag:
git show v3.1.0

# See what changed between two versions:
git diff v2.0.0 v3.0.0 --stat

# See the repo on GitHub:
# https://github.com/YOUR_USERNAME/openbank-price-prediction


# ===========================================================================
# USEFUL COMMANDS FOR THE FUTURE
# ===========================================================================

# If you make a mistake in a commit message (before push):
git commit --amend -m "corrected message"

# If you need to undo the last commit (keeps files):
git reset --soft HEAD~1

# If a tag is wrong, delete and recreate:
git tag -d v3.1.0
git push origin --delete v3.1.0
git tag -a v3.1.0 -m "correct message"
git push origin v3.1.0

# Check current status at any point:
git status
git log --oneline --graph

# See remote tags on GitHub:
git ls-remote --tags origin


# ===========================================================================
# NOTES
# ===========================================================================
#
# 1. PATHS: Replace /path/to/your/vX_folder/ with the actual path
#    to each version folder on your Mac.
#    Example: /Users/alex/Downloads/openbank_price_check_4/
#
# 2. .ENV FILE: The .env file with your Twelve Data API key is in .gitignore
#    and will NOT be committed. This is correct — keys must never go to git.
#    Anyone cloning the repo will use .env.example as a template.
#
# 3. GITHUB REPO: Create it empty (no README, no .gitignore) so there
#    are no conflicts on first push.
#
# 4. AUTHENTICATION: GitHub no longer accepts password authentication.
#    Use a Personal Access Token (PAT) or SSH key:
#    - PAT: github.com -> Settings -> Developer settings -> Personal access tokens
#    - SSH: ssh-keygen -t ed25519 -C "your@email.com"
#           then add the public key to github.com -> Settings -> SSH keys
#
# 5. ORDER MATTERS: Always push in chronological order so GitHub shows
#    a clean linear history.
