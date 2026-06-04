# GIT GUIDE — Openbank Price Prediction
# Historial completo de commits — v6.7.0 hasta v7.0.5

# ===========================================================================
# REPOSITORIO
# ===========================================================================
# URL: https://github.com/alpyengine/openbank-price-prediction.git
# Local: /Users/alex/Coding/TradingProjects/OpenBack/openbank-price-prediction

# ===========================================================================
# PATRON DE INSTALACION DE VERSIONES
# ===========================================================================
# Para cada version nueva:
#
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_vX.X.X/. .
# npm install  # solo cuando se añaden dependencias nuevas
# git add .
# git commit -m "mensaje"
# git tag -a vX.X.X -m "vX.X.X: descripcion"
# git push origin main
# git push origin vX.X.X


# ===========================================================================
# STEP 93 — v6.7.0  Weekly price chart per ticker
# ===========================================================================
#
# No npm install needed.
#
# Supabase setup (already done before this step):
#   - weekly_prices table created
#   - fetch_weekly_prices() function created
#   - Cron scheduled Saturdays 10:00 UTC
#   - Historical data populated for all active batches
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
git push origin main && git push origin v6.7.0


# ===========================================================================
# STEP 94 — v6.7.1  PriceChart as modal overlay
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

- Button 'Price chart' in StockRow expanded panel
- Click -> loads data from Supabase weekly_prices -> opens modal
- Modal header: ticker name + base price + weeks of data
- Legend: blue line = weekly close, red dots = targets
- Target pills: 1M/3M/6M/12M with prices
- Chart: 260px height, smooth line, red dots at target weeks
- Close: X button, Esc key, or click backdrop"

git tag -a v6.7.1 -m "v6.7.1: PriceChart modal"
git push origin main && git push origin v6.7.1


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
- Key format TICKER_HORIZON
- fromCache always false, isHistorical always true"

git tag -a v6.8.0 -m "v6.8.0: Supabase tests"
git push origin main && git push origin v6.8.0


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
- What this app does: 6-step flow, Hit/Close/Miss/Awaiting table
- Testing section: Vitest commands, test file table, coverage"

git tag -a v6.8.1 -m "v6.8.1: README About + Testing sections"
git push origin main && git push origin v6.8.1


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
  --tw-bg -> --background, --tw-fg -> --foreground
  --tw-card -> --card, --tw-muted-fg -> --muted-foreground
  (full table in docs/MIGRATION_SHADCN.md)

Legacy --tw-* aliases added in global.css so existing inline
styles continue to work during gradual migration (removed in v6.9.4)

tailwind.config.js: updated color tokens + border radius calc() + JSDoc
vite.config.js: added @/ path alias -> src/
components.json: shadcn/ui CLI configuration (style=default, tsx=false)
docs/MIGRATION_SHADCN.md: complete migration guide (new)

Tests: 107/107 passing — no logic changes"

git tag -a v6.9.0 -m "v6.9.0: Phase 0 shadcn migration prep"
git push origin main && git push origin v6.9.0


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
  button, card, badge, separator, tooltip, tabs,
  select, dialog, table, input, textarea, label

New dependency: @radix-ui/react-label
All components: JSDoc, @/ alias, CSS variables, Radix UI primitives
Tests: 107/107 passing"

git tag -a v6.9.1 -m "v6.9.1: Phase 1 shadcn base components"
git push origin main && git push origin v6.9.1


# ===========================================================================
# STEP 99 — v6.9.2  Phase 2: simple components migrated to shadcn/ui
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.9.2/. .

git add .
git commit -m "feat: Phase 2 — simple components migrated to shadcn/ui (v6.9.2)

Migrated 4 components. Zero var(--tw-*) in any migrated file.

SummaryCards: Card + CardContent, verdict colors via cn()
HorizonTabs: shadcn Button variants, status dots Tailwind
ImportBox: Card + Textarea + Table + Button + Separator
FetchBar: all buttons shadcn Button, BatchSelector Tailwind

Tests: 107/107 passing"

git tag -a v6.9.2 -m "v6.9.2: Phase 2 simple components"
git push origin main && git push origin v6.9.2


# ===========================================================================
# STEP 100 — v6.9.3  Phase 3: medium components migrated to shadcn/ui
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.9.3/. .

git add .
git commit -m "feat: Phase 3 — medium components migrated to shadcn/ui (v6.9.3)

Migrated 4 components. Zero var(--tw-*) in any migrated file.

Sidebar: transition-[width], cn() for active/hover, sidebar-* tokens
BatchSimple: Card + Table + Badge with hit/miss colors
PriceChart: shadcn Button trigger + Tailwind overlay
AccuracyChart: ActionBar + KpiCard extracted, shadcn Table

Tests: 107/107 passing"

git tag -a v6.9.3 -m "v6.9.3: Phase 3 medium components"
git push origin main && git push origin v6.9.3


# ===========================================================================
# STEP 101 — v6.9.4  Phase 4: complex components + legacy CSS vars removed
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.9.4/. .

git add .
git commit -m "feat: Phase 4 — complex components + legacy CSS aliases removed (v6.9.4)

Migrated all remaining components. Zero var(--tw-*) in entire codebase.
Legacy --tw-* aliases removed from global.css.

StockTable: ColHelpModal, Th, Table, Legend, Sector group rows — all Tailwind
StockRow: hover:bg-muted, price cells cn(), HorizonCards cn(), FundamentalsPanel
Also migrated: Header, SectorControls, ImportPage

global.css: legacy --tw-* block fully removed. Only shadcn vars remain.

Tests: 107/107 passing"

git tag -a v6.9.4 -m "v6.9.4: Phase 4 complete — zero legacy vars"
git push origin main && git push origin v6.9.4


# ===========================================================================
# STEP 102 — v6.9.5  Phase 5: documentation + JSDoc comments
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v6.9.5/. .

git add .
git commit -m "docs: Phase 5 — JSDoc comments across all hooks and utils (v6.9.5)

Comprehensive JSDoc added to all non-component files:
  dates.js, stocks.js, useFundamentals, usePriceFetch,
  useMarketData, useHistory, App.jsx

evaluatePrediction() marked as single source of truth.
docs/MIGRATION_SHADCN.md: Phase 5 marked complete.

Tests: 107/107 passing"

git tag -a v6.9.5 -m "v6.9.5: Phase 5 documentation complete"
git push origin main && git push origin v6.9.5


# ===========================================================================
# STEP 103 — v7.0.0  Authentication + Role-based access
# ===========================================================================
#
# ⚠️  npm install needed — @supabase/supabase-js was added.
#
# ⚠️  BEFORE running the app:
#     1. Complete Supabase SQL setup (see docs/AUTH.md)
#     2. Sign in once with your email/Google
#     3. Make yourself admin:
#        update public.profiles set role = 'admin'
#        where id = (select id from auth.users where email = 'YOUR_EMAIL' limit 1);
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.0.0/. .
npm install

git add .
git commit -m "feat: authentication + role-based access (v7.0.0)

Supabase Auth with email/password + Google OAuth.
Invitation-only — users cannot self-register.
Two roles: admin (full access) and readonly (view only).

New files:
  src/lib/supabase.js, src/contexts/AuthContext.jsx
  src/hooks/useAuth.js, src/hooks/useRole.js
  src/components/LoginPage.jsx, ProtectedRoute.jsx
  src/components/UserPanel.jsx, ManageUsers.jsx

Supabase setup (separately):
  - profiles table + trigger auto-create on user signup
  - RLS policies on profiles, batches, weekly_prices
  - Signups disabled (invitation-only)
  - Google OAuth configured

docs/AUTH.md: complete authentication documentation

Tests: 107/107 passing"

git tag -a v7.0.0 -m "v7.0.0: authentication + role-based access"
git push origin main && git push origin v7.0.0


# ===========================================================================
# STEP 104 — v7.0.1  Auth bugfixes: signOut + role refresh
# ===========================================================================
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.0.1/. .

git add .
git commit -m "fix: signOut reload + refreshRole in AuthContext (v7.0.1)

AuthContext.jsx:
- signOut() now calls window.location.reload() after signing out
  to clear all cached React state (role, stocks, prices, etc.)
- Added refreshRole() — manually re-fetches role from profiles table
  Useful when role is updated via SQL without logging out

Fixes:
- Sign out button was not transitioning to login page
- Role showing as read-only after SQL update without re-login"

git tag -a v7.0.1 -m "v7.0.1: auth bugfixes"
git push origin main && git push origin v7.0.1


# ===========================================================================
# STEP 112 — v7.0.2  Authentication refactor + zero-spinner reload
# ===========================================================================
#
# ⚠️  npm install needed — @supabase/supabase-js upgraded.
#
# ⚠️  SUPABASE SQL — ejecutar antes de arrancar la app:
#
#     create table public.profiles (
#       id uuid primary key references auth.users(id) on delete cascade,
#       role text not null default 'readonly' check (role in ('admin','readonly')),
#       full_name text,
#       created_at timestamptz not null default now(),
#       updated_at timestamptz not null default now()
#     );
#     create or replace function public.handle_new_user()
#     returns trigger language plpgsql security definer as $$
#     begin
#       insert into public.profiles(id,full_name)
#       values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email));
#       return new;
#     end;$$;
#     create trigger on_auth_user_created
#       after insert on auth.users
#       for each row execute procedure public.handle_new_user();
#
#     create or replace function public.get_my_role()
#     returns text language sql security definer stable as $$
#       select role from public.profiles where id = auth.uid()
#     $$;
#
#     alter table public.profiles enable row level security;
#     create policy "read own profile" on public.profiles for select
#       using (auth.uid() = id);
#     create policy "admin reads all profiles" on public.profiles for select
#       using (auth.uid() = id or public.get_my_role() = 'admin');
#     create policy "users can update own profile" on public.profiles for update
#       using (auth.uid() = id);
#     create policy "admin can update any profile" on public.profiles for update
#       using (public.get_my_role() = 'admin');
#
#     alter table public.batches enable row level security;
#     create policy "authenticated users can read batches"
#       on public.batches for select using (auth.role() = 'authenticated');
#     create policy "admin can insert batches" on public.batches for insert
#       with check (public.get_my_role() = 'admin');
#     create policy "admin can update batches" on public.batches for update
#       using (public.get_my_role() = 'admin');
#     create policy "admin can delete batches" on public.batches for delete
#       using (public.get_my_role() = 'admin');
#
#     alter table public.weekly_prices enable row level security;
#     create policy "anyone can read weekly prices"
#       on public.weekly_prices for select using (true);
#
#     -- Dashboard -> Authentication -> Providers -> Email -> Enable ON
#     -- Dashboard -> Authentication -> Settings -> Enable sign ups -> OFF
#     -- Create user: Dashboard -> Authentication -> Users -> Add user
#     -- Make admin:
#     update public.profiles set role = 'admin'
#     where id = (select id from auth.users where email = 'YOUR_EMAIL' limit 1);
#
# ⚠️  First install: clear localStorage once
#     F12 -> Application -> Local Storage -> Clear All -> Reload
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.0.2/. .
npm install

git add .
git commit -m "feat: authentication + role-based access (v7.0.2)

Supabase Auth with email/password + Google OAuth.
Invitation-only. Roles: admin / read-only.

Architecture:
  - onAuthStateChange ONLY — no getSession, no race conditions
  - StrictMode removed (incompatible with Supabase auth locks)
  - User + role + profileName read from localStorage synchronously
  - No spinner, no flash of read-only on reloads
  - Role cached in localStorage as app-user-role

New files:
  src/lib/supabase.js, src/contexts/AuthContext.jsx
  src/hooks/useAuth.js, src/hooks/useRole.js
  src/components/LoginPage.jsx, ProtectedRoute.jsx
  src/components/UserPanel.jsx, ManageUsers.jsx
  docs/AUTH.md

Tests: 107/107 passing"

git tag -a v7.0.2 -m "v7.0.2: authentication"
git push origin main && git push origin v7.0.2


# ===========================================================================
# STEP 113 — v7.0.3  Node 18 compatibility + profile name fixes
# ===========================================================================
#
# CONTEXT: supabase-js 2.106 requires Node >= 20.
# On Node 18, these calls block indefinitely:
#   supabase.auth.signOut()    -> sign out hangs
#   supabase.auth.updateUser() -> profile save freezes
#   supabase.auth.getSession() -> blocks inside handleSave
#   supabase.auth.getUser()    -> blocks refreshRole() with Google
#
# WORKAROUNDS (search "v7.0.3 fix" in code to revert with Node 20):
#   signOut: manually delete localStorage keys
#   handleSave: direct fetch() PATCH to /rest/v1/ with localStorage token
#   refreshRole: uses user state directly
#
# SUPABASE SQL:
#     drop policy if exists "admin updates any profile" on public.profiles;
#     create policy "users can update own profile" on public.profiles
#       for update using (auth.uid() = id);
#     create policy "admin can update any profile" on public.profiles
#       for update using (public.get_my_role() = 'admin');
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.0.3/. .

git add .
git commit -m "fix: Node 18 compatibility + profile name in sidebar (v7.0.3)

signOut: deletes localStorage manually (supabase.auth.signOut blocks on Node 18)
handleSave: direct fetch() PATCH (supabase.auth.updateUser blocks on Node 18)
refreshRole: uses user state (supabase.auth.getUser blocks with Google on Node 18)
sanitizeName: regex /[^a-zA-Z\u00C0-\u024F]/g (no \p{L}, fails in Safari)
profileName: fetchRole() reads full_name, cached in localStorage
ProfileModal: initializes with profileName (profiles), not user_metadata (Google JWT)
onSaved: writes to localStorage immediately — sidebar updates without reload

docs/AUTH.md: 8 issues documented with root cause and exact fix

Tests: 107/107 passing"

git tag -a v7.0.3 -m "v7.0.3: Node 18 compatibility"
git push origin main && git push origin v7.0.3


# ===========================================================================
# STEP 114 — v7.0.4  formatDate fix + SUPABASE.md
# ===========================================================================
#
# CRITICAL BUG FIXED:
#   toLocaleDateString() on macOS generates 'Sept' instead of 'Sep'.
#   PostgreSQL to_date() throws ERROR 22007 with 'Sept'.
#   fetch_expired_horizons() silently failed for September predictions.
#
# DB FIX (already applied, documented here for reference):
#   update batches set results = (
#     select jsonb_agg(case when r.value->>'targetDate' like '%Sept%'
#       then r.value || jsonb_build_object('targetDate',
#            replace(r.value->>'targetDate','Sept','Sep'))
#       else r.value end)
#     from jsonb_array_elements(results) as r(value))
#   where results::text like '%Sept%';
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.0.4/. .

git add .
git commit -m "fix: formatDate uses MONTHS array — prevents Sept/Sep Supabase error (v7.0.4)

Problem:
  toLocaleDateString('en-GB', { month: 'short' }) returns 'Sept' on macOS
  for September. PostgreSQL to_date() throws ERROR 22007.
  fetch_expired_horizons() silently skipped all September predictions.

Fix (src/utils/dates.js):
  Fixed MONTHS array guarantees standard 3-letter month abbreviations.

DB fix (applied directly in Supabase):
  Updated 'Sept' values to 'Sep' in batches.results.
  See docs/SUPABASE.md section 6 for the SQL used.

New file:
  docs/SUPABASE.md — complete Supabase reference: tables, functions,
  crons, vault secrets, RLS policies, known issues.

Tests: 107/107 passing"

git tag -a v7.0.4 -m "v7.0.4: formatDate fix + Supabase docs"
git push origin main && git push origin v7.0.4


# ===========================================================================
# STEP 115 — v7.0.5  PriceChart + GitHub backup + auto-load batch
# ===========================================================================
#
# WHAT'S NEW:
#
#   PriceChart — rebuilt with Chart.js:
#     - X axis: real dates at 45deg every 4 weeks + target horizon weeks
#     - Price dots always blue — no color confusion with target dots
#     - Target dots as separate dataset (order:1) rendered on top
#     - Zoom slider with real date label (e.g. 'Mar 2027')
#     - Compact target pills in single line with real dates
#     - src/components/ui/chart.jsx added as shadcn ChartContainer
#
#   storage.js — authHeaders():
#     - Reads JWT from localStorage for RLS-authenticated calls
#     - loadWeeklyPrices() uses authHeaders() instead of anon key
#
#   RLS weekly_prices — simplified policy:
#     - "anyone can read weekly prices" using (true)
#     - Previous "authenticated" policy blocked calls with anon key
#
#   App.jsx — auto-load first batch:
#     - Auto-loads most recent batch on mount instead of DEFAULT_STOCKS
#
#   GitHub backup system:
#     - backup_to_github() function in Supabase
#     - Cron job 6: Sundays 23:00 UTC
#     - Vault secret: github_pat
#     - Repo: https://github.com/alpyengine/openbank-price-data
#
# SUPABASE SQL (if not already done):
#
#     -- RLS weekly_prices simplified
#     drop policy if exists "authenticated users can read weekly prices"
#       on public.weekly_prices;
#     create policy "anyone can read weekly prices"
#       on public.weekly_prices for select using (true);
#
#     -- GitHub PAT vault secret
#     select vault.create_secret('YOUR_GITHUB_PAT', 'github_pat');
#
#     -- backup_to_github() function — see docs/SUPABASE.md section 7
#
#     -- Weekly backup cron
#     select cron.schedule('weekly-github-backup','0 23 * * 0','select backup_to_github()');
#
#     -- Unschedule backfill when missing = 0
#     select cron.unschedule('backfill-weekly-prices');
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.0.5/. .

git add .
git commit -m "feat: PriceChart + GitHub backup + auto-load batch (v7.0.5)

PriceChart (src/components/PriceChart.jsx):
  Rebuilt with Chart.js replacing previous Recharts implementation.
  - X axis: real dates at 45deg, every 4 weeks + target horizon weeks
  - Price dots always blue — no color confusion with target dots
  - Target dots as separate dataset (order:1) rendered on top
  - Zoom slider with real date label (e.g. 'Mar 2027')
  - Compact target pills in single line with real dates
  - src/components/ui/chart.jsx added as shadcn ChartContainer

storage.js (src/services/storage.js):
  authHeaders() reads JWT from localStorage for RLS-authenticated calls.
  loadWeeklyPrices() uses authHeaders() instead of anon key.

App.jsx (src/App.jsx):
  Auto-loads most recent batch on mount instead of DEFAULT_STOCKS.

RLS (applied in Supabase):
  weekly_prices policy changed to 'using (true)'.

GitHub backup (Supabase):
  backup_to_github() exports batches + weekly_prices + price_cache
  to GitHub repo as JSON via GitHub Contents API.
  Cron job 6: every Sunday 23:00 UTC.
  See docs/SUPABASE.md section 7 for full SQL and restore guide.

Docs:
  README.md: backup section + v7.0.5 in changelog
  docs/SUPABASE.md: section 7 backup system complete

Tests: 107/107 passing"

git tag -a v7.0.5 -m "v7.0.5: PriceChart + backup + auto-load"
git push origin main && git push origin v7.0.5


# ===========================================================================
# STEP 116 — v7.0.6  Finnhub replaces Twelve Data + FMP for fundamentals
# ===========================================================================
#
# WHAT'S NEW:
#
#   useFundamentals.js — extended with Finnhub as primary data source:
#     - Finnhub /stock/metric?metric=all — single endpoint, free plan
#     - Returns: peTTM, forwardPE, pegTTM, forwardPEG, pfcfTTM,
#                netProfitMarginTTM, roeTTM, roaTTM, totalDebt/totalEquityAnnual,
#                epsGrowthTTMYoy, epsGrowth3Y, epsGrowth5Y, revenueGrowthTTMYoy,
#                beta, currentDividendYieldTTM, marketCapitalization
#     - FMP /stable/profile still used for sector, industry, description
#     - Rate limit reduced from 800ms to 400ms (Finnhub: 30 req/sec)
#     - partialData flag added for European tickers or missing key fields
#
#   Why Finnhub:
#     - Twelve Data /statistics requires paid plan (403 on free plan)
#     - FMP /stable/ratios-ttm only works for major tickers (AAPL/MSFT)
#     - Finnhub free plan works for all US tickers + major European tickers
#     - Verified working: MU, ALB, GEN, TER, ENPH, DHI, HAL, SAP
#
#   .env.example — VITE_FINNHUB_KEY added
#   README.md — Financial APIs section added with Finnhub documentation
#
# .ENV UPDATE REQUIRED:
#   Add to your .env file:
#   VITE_FINNHUB_KEY=your_finnhub_key_here
#
#   Get a free key at: https://finnhub.io (no credit card required)
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.0.6/. .

git add .
git commit -m "feat: Finnhub replaces Twelve Data for fundamentals (v7.0.6)

useFundamentals.js extended with Finnhub /stock/metric as primary source.

Why Finnhub:
  Twelve Data /statistics requires paid plan — 403 on free tier.
  FMP /stable/ratios-ttm only works for major tickers on free tier.
  Finnhub free plan covers all US tickers + major European tickers.
  Verified: MU, ALB, GEN, TER, ENPH, DHI, HAL, SAP all return data.

New metrics available per ticker:
  Valuation: peTTM, forwardPE, pegTTM, forwardPEG, pfcfTTM
  Quality:   netProfitMarginTTM, roeTTM, roaTTM, debtEquity
  Growth:    epsGrowthTTMYoy, epsGrowth3Y, epsGrowth5Y, revGrowthTTM
  Risk:      beta, divYield

FMP /stable/profile still used for sector, industry, description.
Rate limit: 400ms between calls (Finnhub 30 req/sec, previously 800ms).
partialData flag set for European tickers or when 3+ key fields missing.

New env var: VITE_FINNHUB_KEY (get free key at https://finnhub.io)

README.md: Financial APIs section added
.env.example: VITE_FINNHUB_KEY added

Tests: 107/107 passing"

git tag -a v7.0.6 -m "v7.0.6: Finnhub fundamentals"
git push origin main && git push origin v7.0.6


# ===========================================================================
# STEP 117 — v7.1.0  All Stocks page
# ===========================================================================
#
# WHAT'S NEW:
#
#   AllStocksPage (src/components/AllStocksPage.jsx) — new page:
#     - Consolidated view of all unique tickers across all batches
#     - Deduplication: most recent batch wins — one row per ticker
#       If ticker appears in multiple batches: "· Nx" in Batch column
#     - Investment Score (0–100): Upside×40% + PEG×45% + Margin×15%
#       −20 penalty if EPS growth negative (Lynch value trap)
#     - Horizon dropdown (1M/3M/6M/12M) in column header
#       Changes entire Upside column + KPI + sort recalculates
#     - Sort by Upside or Score (asc/desc) via column header click
#     - Filters: sector dropdown, PEG range, Score minimum slider
#     - Collapsible legend: Score colour codes + PEG Lynch interpretation
#     - CSV export — all visible rows with current horizon
#     - Score badges: 🟣 80+ / 🔵 60+ / 🟡 40+ / ⚫ <40
#     - PEG colours: green <1 / amber 1-2 / red >2 / ⚠ Neg
#     - KPIs: Total stocks, Avg Upside (selected horizon), Stocks w/ Score, Top Score
#
#   Sidebar.jsx — "All Stocks" added as 4th nav item (Globe icon)
#
#   App.jsx — 'all-stocks' route added, passes batches + fundamentals
#
# No npm install needed.
# No Supabase changes needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.1.0/. .

git add .
git commit -m "feat: All Stocks page (v7.1.0)

AllStocksPage — consolidated view of all unique tickers across batches.

Deduplication: most recent batch wins. One row per ticker.
Multiple batches for same ticker shows '· Nx' in Batch column.

Investment Score (0-100):
  Upside×40% + PEG×45% + NetMargin×15% - 20 if EPS negative
  Score badges: purple 80+ / blue 60+ / amber 40+ / grey <40

Horizon selector: 1M/3M/6M/12M dropdown in Upside column header.
Changing horizon updates entire column, KPI and sort order.

Sorting: Upside and Score columns — click header to toggle asc/desc.

Filters: sector, PEG range (undervalued/fair/expensive), score minimum.
Legend: collapsible panel explaining all colour codes (Score + PEG Lynch).
CSV export: all visible rows with selected horizon.

PEG: green <1 / amber 1-2 / red >2 / warning badge if EPS negative.
Sparkline: placeholder (weekly_prices integration in v7.1.2).

Sidebar: 'All Stocks' nav item added (Globe icon, position 4).
App.jsx: all-stocks route wired, passes batches + fundamentals.

Tests: 107/107 passing"

git tag -a v7.1.0 -m "v7.1.0: All Stocks page"
git push origin main && git push origin v7.1.0


# ===========================================================================
# STEP 118 — v7.1.1  Ticker normalisation — .US stripped at import
# ===========================================================================
#
# PROBLEM SOLVED:
#   Batches imported before May 2026 used bare tickers (TER, MU, GEN).
#   Batches imported from May 2026 used .US suffix (TER.US, MU.US).
#   This caused duplicate rows in All Stocks and missing fundamentals/
#   weekly_prices because "TER" ≠ "TER.US" in Supabase lookups.
#
# SOLUTION — single normalisation point in ImportBox.jsx:
#   normalizeTicker() called at CSV parse time (line 73)
#   - American tickers: TER.US → TER (strip .US — redundant)
#   - European tickers: NEM.DE → NEM.DE (keep suffix — identifies exchange)
#   - Already bare:     TER    → TER (no change)
#
# LOGIC:
#   US suffix is redundant — APIs (Twelve Data, Finnhub, FMP) all accept
#   bare tickers for US stocks. European suffixes are NOT redundant —
#   NEM.DE (Nemetschek/Xetra) ≠ NEM (Newmont/NYSE).
#
# DOWNSTREAM — no other files changed:
#   usePriceFetch.js  — getSuffix() returns 'US' for bare tickers → correct
#   useFundamentals.js — already strips all suffixes for API calls → correct
#   storage.js        — already strips for price_cache lookups → correct
#   AllStocksPage.jsx — dedup normalization becomes a no-op → correct
#   StockRow.jsx      — visual strip of .DE/.AS etc. still needed → unchanged
#
# SUPABASE MIGRATION REQUIRED — execute in order:
#
#   -- 1. Delete weekly_prices for May batches (have .US tickers)
#   delete from weekly_prices
#   where batch_id in ('2026-05-06','2026-05-08','2026-05-14','2026-05-21');
#
#   -- 2. Delete price_cache for .US tickers
#   delete from price_cache
#   where ticker like '%.US';
#
#   -- 3. Delete May batches
#   delete from batches
#   where id in ('2026-05-06','2026-05-08','2026-05-14','2026-05-21');
#
#   -- 4. Re-import the 4 May batches from the app (CSV → Import page)
#      The new ImportBox strips .US automatically.
#
#   -- 5. Check missing weekly_prices
#   select count(*) as missing from (
#     select distinct r.value->>'ticker', b.id, w.week_num
#     from batches b,
#          jsonb_array_elements(b.results) as r(value),
#          generate_series(1, 9) as w(week_num)
#     where r.value->>'horizon' = '1M'
#       and (date_trunc('week',
#             (make_date(split_part(b.date,'/',3)::int,
#                        split_part(b.date,'/',2)::int,
#                        split_part(b.date,'/',1)::int)
#              + (w.week_num * 7))::timestamp)::date + 4) < current_date
#       and not exists (
#         select 1 from weekly_prices wp
#         where wp.ticker = r.value->>'ticker'
#           and wp.batch_id = b.id
#           and wp.week = w.week_num
#       )
#   ) x;
#
#   -- 6. If missing > 0 → start backfill cron
#   select cron.schedule('backfill-weekly-prices','*/2 * * * *',
#     'select backfill_weekly_prices()');
#
#   -- 7. When missing = 0 → stop backfill
#   select cron.unschedule('backfill-weekly-prices');
#
#   -- 8. Manual backup
#   select backup_to_github();
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.1.1/. .

git add .
git commit -m "fix: ticker normalisation + All Stocks data fixes (v7.1.1)

Ticker normalisation (ImportBox.jsx):
  normalizeTicker() strips .US at CSV parse time — single point of truth.
  American .US stripped (TER.US → TER) — redundant for US APIs.
  European suffixes preserved (NEM.DE → NEM.DE) — identifies exchange.

All Stocks — fundamentals from all batches (AllStocksPage.jsx):
  Was: only active-batch fundamentals → all other batches showed --.
  Now: merges fundamentals from ALL batches in history.batches.
  Newest batch wins on duplicate tickers. Active-batch memory merged last.

All Stocks — upside % now populated (AllStocksPage.jsx):
  Bug 1: deduplicateStocks looked for r.target1M / r.t1 which don't exist
          in Supabase. Each ticker has 4 separate rows, one per horizon.
          Fixed: groups the 4 horizon rows per ticker first, then extracts
          targetPrice from each row (horizon:'1M', '3M', '6M', '12M').
  Bug 2: hKey = 'u' + horizon.toLowerCase() produced 'u12m' not 'u12'.
          Fixed: explicit map { '1M':'u1', '3M':'u3', '6M':'u6', '12M':'u12' }.

FetchBar.jsx — Refresh Market button added:
  Same pattern as Refresh Fundamentals. Wrapped in Fragment (JSX fix).

Supabase migration (done separately):
  Deleted May 2026 batches + weekly_prices + price_cache .US tickers.
  Re-imported 5 batches with normalised tickers. Backfill completed.

Tests: 107/107 passing"

git tag -a v7.1.1 -m "v7.1.1: ticker normalisation"
git push origin main && git push origin v7.1.1


# ===========================================================================
# STEP 119 — v7.1.2  Sparklines in All Stocks from weekly_prices
# ===========================================================================
#
# WHAT'S NEW:
#
#   storage.js — loadAllWeeklyPrices() added:
#     Single query loads ALL 275 weekly_prices rows at once.
#     Groups into { ticker: { batchId: [prices...] } } in memory.
#     No N+1 queries — one round trip for all sparklines.
#
#   AllStocksPage.jsx — SparkLine now shows real data:
#     useEffect loads weekly prices on mount via loadAllWeeklyPrices().
#     SparkLine receives points[] from the most recent batchId per ticker.
#     Colour logic Option A (from SPEC_FUNDAMENTALS):
#       green  — last weekly price > batch base price
#       red    — last weekly price < batch base price
#       grey   — no data or flat
#     No axes, no labels — pure visual signal.
#
# No npm install needed.
# No Supabase changes needed — weekly_prices table already has the data.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.1.2/. .

git add .
git commit -m "feat: sparklines + column tooltips in All Stocks (v7.1.2)

storage.js — loadAllWeeklyPrices():
  Single query loads all weekly_prices rows.
  Groups into { ticker: { batchId: [prices...] } }.
  No N+1 queries — one round trip for all sparklines.

AllStocksPage.jsx — SparkLine with real data:
  Loads weekly prices on mount via loadAllWeeklyPrices().
  SparkLine uses most recent batchId prices per ticker.
  Colour logic Option A: green if last > base, red if last < base.
  Colour reflects position vs base price, NOT line direction.
  Red + ascending = recovering but still below base price.

AllStocksPage.jsx — ColTooltip on every column header:
  ColTooltip component: hover ℹ icon shows tooltip above column.
  Upside: description + verde/rojo explanation.
  Score: description + colour badge guide (80+/60+/40+/<40).
  PEG: description + Lynch colour guide (green/amber/red/neg).
  Margin: description of net margin TTM.
  Sparkline: description + 3 visual examples (green/red/red+ascending).
  Batch: description of date + Nx notation.

Tests: 107/107 passing"

git tag -a v7.1.2 -m "v7.1.2: sparklines from weekly_prices"
git push origin main && git push origin v7.1.2

