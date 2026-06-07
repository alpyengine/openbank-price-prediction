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

git tag -a v7.1.2 -m "v7.1.2: sparklines + column tooltips"
git push origin main && git push origin v7.1.2


# ===========================================================================
# STEP 120 — v7.1.3  fundamentals_cache table in Supabase
# ===========================================================================
#
# WHAT'S NEW:
#
#   New Supabase table: fundamentals_cache
#     Stores fundamentals per ticker — independent of batches.
#     Primary key: ticker (e.g. "MU", "NEM.DE")
#     Columns: ticker, data (jsonb), fetched_at, updated_at
#     TTL: managed in app — data older than 7 days is re-fetched.
#
#   storage.js — two new functions:
#     saveFundamentalsCache(fundamentals):
#       Upserts all tickers from a fundamentals object into the cache.
#       Called automatically on Save — fire and forget (non-blocking).
#     loadFundamentalsCache():
#       Loads all rows from cache → { ticker: { ...data } }.
#       Used by AllStocksPage as primary fundamentals source.
#
#   useHistory.js — saveBatch calls saveFundamentalsCache after save:
#     Every time you Fetch Fundamentals + Save, the cache is updated.
#     Non-blocking — doesn't delay the Save operation.
#
#   AllStocksPage.jsx — three-layer fundamentals merge:
#     Layer 1: fundamentals_cache (primary — loaded on mount)
#     Layer 2: batch.fundamentals (fallback for tickers not in cache)
#     Layer 3: active-batch memory fundamentals (most recent override)
#
# SUPABASE MIGRATION REQUIRED — run this SQL:
#
#   create table if not exists fundamentals_cache (
#     ticker       text        primary key,
#     data         jsonb       not null,
#     fetched_at   timestamptz not null default now(),
#     updated_at   timestamptz not null default now()
#   );
#
#   alter table fundamentals_cache enable row level security;
#
#   create policy "allow read fundamentals_cache"
#     on fundamentals_cache for select using (true);
#
#   create policy "allow upsert fundamentals_cache"
#     on fundamentals_cache for insert with check (true);
#
#   create policy "allow update fundamentals_cache"
#     on fundamentals_cache for update using (true);
#
# POPULATE CACHE after migration:
#   Load each batch → Fetch Fundamentals → Save
#   This fills fundamentals_cache for all tickers.
#   Future saves will keep it in sync automatically.
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.1.3/. .

git add .
git commit -m "feat: fundamentals_cache table in Supabase (v7.1.3)

New Supabase table fundamentals_cache:
  Stores fundamentals per ticker, independent of batches.
  TTL managed in app — data older than 7 days is re-fetched.

storage.js:
  saveFundamentalsCache() — upserts all tickers on save.
  loadFundamentalsCache() — loads all rows on mount.

useHistory.js:
  saveBatch() calls saveFundamentalsCache() after every save.
  Non-blocking — fire and forget.

AllStocksPage.jsx — three-layer fundamentals merge:
  1. fundamentals_cache (primary)
  2. batch.fundamentals (fallback)
  3. active-batch memory (override)

See GIT_GUIDE STEP 120 for SQL migration instructions.

Tests: 107/107 passing"

git tag -a v7.1.3 -m "v7.1.3: fundamentals_cache"
git push origin main && git push origin v7.1.3


# ===========================================================================
# STEP 121 — v7.1.4  TradingView chart modal
# ===========================================================================
#
# WHAT'S NEW:
#
#   TradingViewModal.jsx — new reusable component:
#     Full-screen modal with embedded TradingView standard widget (free tier).
#     Dark theme, daily interval, toolbar visible, allow symbol change.
#     Exchange mapping: bare US tickers auto-resolved by TradingView.
#     European suffixes mapped: .DE→XETR, .AS→AMS, .PA→EPA, .L→LSE, .MC→BME.
#     Close: click outside, ✕ button, or Escape key.
#
#   StockRow.jsx — TV icon button in last column:
#     Small chart icon (polyline svg) — opens TradingViewModal on click.
#     Click on icon does NOT expand/collapse the row (stopPropagation).
#
#   StockTable.jsx — empty column header added for TV button column.
#
#   AllStocksPage.jsx — TV icon button in last column:
#     Same icon pattern as StockRow.
#     tvTicker state manages which ticker's modal is open.
#
# No npm install needed.
# No Supabase changes needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.1.4/. .

git add .
git commit -m "feat: TradingView chart modal + fixes (v7.1.4)

TradingViewModal.jsx — new reusable component:
  Embedded TradingView standard widget (free, no API key).
  Dark theme, daily interval, full toolbar.
  Exchange mapping: .DE→XETR, .AS→AMS, .PA→EPA, .L→LSE, .MC→BME.
  Close: click outside, ✕ button, or Escape key.

StockRow.jsx — TV icon button in Batch Overview:
  Chart icon in last column — opens modal on click.
  stopPropagation prevents row expand/collapse on icon click.
  cn import restored (was accidentally removed).

StockTable.jsx — adaptive colSpan:
  TOTAL_COLS = 17 defined once with column inventory comment.
  Passed as totalCols prop to StockRow — no more hardcoded 16/17.

AllStocksPage.jsx — TV icon button in All Stocks:
  tvTicker state controls modal visibility.
  SparkLine NaN guard: shows — for < 2 data points.

README.md — changelog updated, duplicate v7.1.1 entry removed.
SPEC_FUNDAMENTALS.md — implementation plan updated to actual delivery.

Tests: 107/107 passing"

git tag -a v7.1.4 -m "v7.1.4: TradingView chart modal"
git push origin main && git push origin v7.1.4


# ===========================================================================
# STEP 122 — v7.2.0  React Testing Library — component tests
# ===========================================================================
#
# WHAT'S NEW:
#
#   New test files (src/components/__tests__/):
#     TradingViewModal.test.jsx  — 8 tests
#       Modal renders ticker/company, iframe src, exchange mapping,
#       close via ✕ button, Escape key, overlay click, not via content click.
#     ImportBox.test.jsx         — 13 tests
#       normalizeTicker: strips .US, preserves .DE/.AS/.PA/.L/.MC,
#       bare tickers unchanged, uppercase, trim whitespace.
#     AllStocksPage.test.jsx     — 22 tests
#       calcScore: strong ticker, EPS penalty, clamp to 0, null handling.
#       horizon key mapping: 1M→u1, 3M→u3, 6M→u6, 12M→u12 (regression).
#       upsideScore/pegScore thresholds.
#
#   New infrastructure:
#     src/test-setup.js — imports @testing-library/jest-dom for DOM matchers
#     vite.config.js — environmentMatchGlobs: __tests__/ → jsdom
#     vite.config.js — setupFiles: test-setup.js
#     vite.config.js — include: *.test.jsx added
#
#   New npm scripts:
#     npm run test:watch    — watch mode
#     npm run test:coverage — with coverage report
#
#   New documentation:
#     docs/TESTING.md — complete testing guide:
#       What RTL is and why it matters
#       All component tests documented with what each verifies
#       Lessons learned from v7.1.x bugs
#       Template for adding new tests
#       Coverage targets
#     README.md — TESTING.md link added in docs section
#
#   New dependencies (devDependencies):
#     @testing-library/react
#     @testing-library/user-event
#     @testing-library/jest-dom
#     @testing-library/dom
#     @testing-library/dom
#     jsdom@22               ← pinned for Vitest 0.34.6 compatibility
#     @vitest/coverage-v8@0.34.6  ← pinned to match Vitest version
#               (latest versions require Vitest 4.x)
#
# npm install IS needed for this version (new dev dependencies).
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.2.0/. .
npm install

git add .
git commit -m "feat: React Testing Library component tests (v7.2.0)

43 new component tests across 3 test files.

TradingViewModal.test.jsx (8 tests):
  Render, iframe src, exchange mapping (.DE→XETR),
  close via button/Escape/overlay, not via content click.

ImportBox.test.jsx (13 tests):
  normalizeTicker: strips .US, preserves EU suffixes (.DE .AS .PA .L .MC),
  bare tickers unchanged, uppercase, trim whitespace.

AllStocksPage.test.jsx (22 tests):
  calcScore: strong ticker=94, EPS penalty=-20, clamp to 0, null handling.
  Horizon key regression: 12M→u12 not u12m (was the v7.1.1 bug).
  upsideScore/pegScore Peter Lynch thresholds.

Infrastructure:
  src/test-setup.js — @testing-library/jest-dom setup
  vite.config.js — jsdom env for __tests__/, setupFiles, *.test.jsx
  package.json — test:watch and test:coverage scripts

docs/TESTING.md — complete testing guide with lessons from v7.1.x bugs.
README.md — TESTING.md link added.

Total tests: 150 (107 unit + 43 component) — all passing"

git tag -a v7.2.0 -m "v7.2.0: React Testing Library"
git push origin main && git push origin v7.2.0


# ===========================================================================
# STEP 123 — v7.2.1  invite-user Edge Function
# ===========================================================================
#
# PROBLEM SOLVED:
#   supabase.auth.admin.inviteUserByEmail() requires the Service Role Key.
#   The Service Role Key gives unrestricted database access and must NEVER
#   be exposed in frontend code. With the anon key, invitations fail with
#   "User not allowed".
#
# SOLUTION — Supabase Edge Function:
#   The invite-user function runs on Supabase servers where the Service Role
#   Key is stored securely as an environment secret. The frontend calls the
#   function with the user's JWT — the function verifies admin role and sends
#   the invitation.
#
# WHAT'S NEW:
#
#   supabase/functions/invite-user/index.ts — new Edge Function:
#     1. Validates email format
#     2. Verifies caller JWT is valid (auth.getUser)
#     3. Checks caller has role = 'admin' in profiles table
#     4. Calls auth.admin.inviteUserByEmail() with Service Role Key (secret)
#     5. Returns { success: true } or { error: "message" }
#
#   ManageUsers.jsx — handleInvite updated:
#     Was: supabase.auth.admin.inviteUserByEmail() — fails with anon key
#     Now: fetch POST /functions/v1/invite-user with user's JWT
#     User list and all other features unchanged.
#
#   docs/SUPABASE.md — section 9 added:
#     Full documentation of the Edge Function including deploy steps,
#     secret setup, flow diagram, and security checks.
#
# DEPLOY STEPS (required before this version works):
#
#   1. Install Supabase CLI
#      npm install -g supabase
#
#   2. Login and link project
#      supabase login
#      supabase link --project-ref yyenwzljojxbqtzcbchk
#
#   3. Deploy the function
#      supabase functions deploy invite-user
#
#   4. Set the Service Role Key as a secret
#      supabase secrets set SERVICE_ROLE_KEY=your_key_here
#      (get key from: Supabase Dashboard → Project Settings → API → service_role)
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.2.1/. .

git add .
git commit -m "feat: invite-user Edge Function for secure user invitations (v7.2.1)

supabase/functions/invite-user/index.ts — new Edge Function:
  Sends invitation emails using Service Role Key stored as Supabase secret.
  Security: JWT verification + admin role check before sending invitation.
  The Service Role Key is never exposed in frontend code.

ManageUsers.jsx — handleInvite rewritten:
  Was: supabase.auth.admin (fails with anon key — 'User not allowed')
  Now: POST /functions/v1/invite-user with user JWT
  User list, role change, delete — all unchanged.

docs/SUPABASE.md — section 9 added:
  Deploy instructions, secret setup, flow diagram, security explanation.

Tests: 150/150 passing"

git tag -a v7.2.1 -m "v7.2.1: invite-user Edge Function"
git push origin main && git push origin v7.2.1


# ===========================================================================
# STEP 124 — v7.3.0  New verdict system — exceeded + wrong_way
# ===========================================================================
#
# WHAT'S NEW — stocks.js only (no React components changed yet):
#
#   Two new verdict values:
#     'exceeded'  — price surpassed target in correct direction
#                   bullish: price > target + H%
#                   bearish: price < target − H%
#                   Colour: blue (implemented in v7.3.1)
#     'wrong_way' — price moved opposite to forecast direction
#                   bullish: price fell below base price
#                   bearish: price rose above base price
#                   Colour: purple (implemented in v7.3.1)
#
#   Two evaluation modes:
#     snapshot mode: pass opts.horizon → uses SNAPSHOT_PARAMS fixed values
#                    Used when saving to Supabase (consistent across batches)
#     live mode:     pass hitMargin + opts.closeRatio → dynamic from slider
#                    Used in Batch Details (not saved to Supabase)
#
#   New exports:
#     SNAPSHOT_PARAMS      — fixed H and R per horizon (1M/3M/6M/12M)
#     CLOSE_RATIO_DEFAULT  — default 2.4 for live mode
#
#   Backwards compatible:
#     Existing callers passing only (price, target, base, margin) still work.
#     They use live mode with closeRatio=2.4 (CLOSE_RATIO_DEFAULT).
#
#   Tests: 14 new tests added → total 164 (was 150)
#     SNAPSHOT_PARAMS constants
#     exceeded and wrong_way verdicts for bullish and bearish
#     snapshot mode ignoring hitMargin parameter
#     custom closeRatio in opts
#
# No npm install needed.
# No Supabase changes needed in this version.
# React components updated in v7.3.1.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.3.0/. .

git add .
git commit -m "feat: new verdict system — exceeded + wrong_way (v7.3.0)

stocks.js — extended evaluatePrediction() with two new verdicts:
  exceeded:  price surpassed target in correct direction (blue)
  wrong_way: price moved opposite to forecast (purple)

Two evaluation modes:
  snapshot: fixed params per horizon from SNAPSHOT_PARAMS constant
            used when saving to Supabase — ensures all batches comparable
  live:     dynamic params from slider (hitMargin + closeRatio)
            used in Batch Details for interactive analysis

New exports:
  SNAPSHOT_PARAMS: { 1M:{H:3,R:2.0}, 3M:{H:5,R:2.0}, 6M:{H:7,R:1.8}, 12M:{H:10,R:1.6} }
  CLOSE_RATIO_DEFAULT: 2.4

Backwards compatible — existing callers unaffected.

Tests: 164/164 passing (14 new tests)"

git tag -a v7.3.0 -m "v7.3.0: new verdict system"
git push origin main && git push origin v7.3.0


# ===========================================================================
# STEP 125 — v7.3.1  New SummaryCards layout + Bug 3 fix + new verdict colors
# ===========================================================================
#
# WHAT'S NEW:
#
#   SummaryCards.jsx — complete rewrite:
#     Row 1: 6 boxes — Stocks | Hit | Exceeded | Close | Miss | Awaiting
#     Row 2: 2 accuracy boxes — Hit Rate pure % | Hit Rate extended %
#     Labels are dynamic: show calculated thresholds (e.g. "Close −5% to −12%")
#     All 5 verdicts counted: hit, exceeded, close, miss, wrong_way, awaiting
#     new AccuracyCard component for the two bottom boxes
#     new 'exceeded' (blue) and 'wrong_way' (purple) color schemes
#     closeRatio prop added (default 2.4) — used for zone threshold labels
#
#   StockRow.jsx — Bug 3 fix + new verdict colors:
#     BUG 3 FIX: each horizon column now resolves its OWN price independently
#       using getEffectivePrice(stock.t, hKey, ..., colExpired) per column
#       closed 1M columns now always show historical price regardless of dropdown
#     New verdict colors: exceeded=blue (#3b82f6), wrong_way=purple (#8b5cf6)
#     New zone labels: EXCEED, WRONG (replacing the missing grey -- cases)
#     closeRatio prop added — passed to evaluatePrediction for zone calculation
#     fillWidth logic updated for exceeded (100%) and wrong_way (15%)
#
#   StockTable.jsx:
#     closeRatio prop added — passed through to StockRow
#
#   App.jsx:
#     closeRatio state added (default 2.4)
#     Zone controls bar added above SummaryCards in batch-detail:
#       Hit margin slider (0.5 to 20, step 0.5, default 5%)
#       Close ratio field (small, white bg, dark grey number)
#       Zone pills showing dynamic thresholds
#     closeRatio passed to SummaryCards and StockTable
#
# No npm install needed.
# No Supabase changes needed in this version.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.3.1/. .

git add .
git commit -m "feat: new SummaryCards layout + Bug 3 fix + verdict colors (v7.3.1)

SummaryCards.jsx — complete rewrite:
  Row 1: 6 KPI boxes (Stocks/Hit/Exceeded/Close/Miss/Awaiting)
  Row 2: 2 accuracy boxes (Hit Rate pure % + Hit Rate extended %)
  Dynamic labels showing calculated thresholds per slider values.
  AccuracyCard component for bottom accuracy boxes.
  All 5 verdicts: hit/exceeded/close/miss/wrong_way.

StockRow.jsx — Bug 3 fix:
  Each horizon column resolves its own price independently.
  getEffectivePrice called per column with column-specific hKey and expiry.
  Closed 1M columns now show historical price regardless of dropdown selection.
  New colors: exceeded=blue, wrong_way=purple.
  New labels: EXCEED, WRONG (eliminates grey -- for exceeded predictions).

StockTable.jsx + App.jsx:
  closeRatio prop added and passed through component chain.
  Zone controls bar in batch-detail: slider + closeRatio field + zone pills.

Tests: 164/164 passing"

git tag -a v7.3.1 -m "v7.3.1: SummaryCards + Bug 3 fix"
git push origin main && git push origin v7.3.1


# ===========================================================================
# STEP 126 — v7.3.2  BatchSimple verdict colors
# ===========================================================================
#
# WHAT'S NEW:
#
#   BatchSimple.jsx — HorizonCell rewritten:
#     Was: only 2 verdicts — hit (green) or miss (red) for everything else
#     Now: all 5 verdicts with correct colors:
#       exceeded  — 🔵 blue  bg-blue-50/text-blue-700
#       hit       — ✅ green bg-green-50/text-green-700
#       close     — 🟡 amber bg-amber-50/text-amber-700
#       miss      — ❌ red   bg-red-50/text-red-700
#       wrong_way — 🟣 purple bg-purple-50/text-purple-700
#     BADGE_CONFIG lookup table replaces if/else chains
#     closeRatio prop added — passed to evaluatePrediction
#
#   App.jsx:
#     closeRatio passed to BatchSimple
#
# No npm install needed.
# No Supabase changes needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.3.2/. .

git add .
git commit -m "feat: BatchSimple verdict colors — exceeded/close/wrong_way (v7.3.2)

BatchSimple.jsx — HorizonCell rewritten:
  5 verdicts with full color support:
    exceeded=blue, hit=green, close=amber, miss=red, wrong_way=purple
  BADGE_CONFIG lookup table replaces if/else chain.
  closeRatio prop added to HorizonCell and BatchSimple.

App.jsx: closeRatio passed to BatchSimple.

Tests: 164/164 passing"

git tag -a v7.3.2 -m "v7.3.2: BatchSimple verdict colors"
git push origin main && git push origin v7.3.2


# ===========================================================================
# STEP 127 — v7.3.3  AccuracyChart — slider removed + SNAPSHOT_PARAMS
# ===========================================================================
#
# WHAT'S NEW:
#
#   useHistory.js — computed() rewritten:
#     No longer accepts margin parameter — uses SNAPSHOT_PARAMS per horizon.
#     Adds exceeded and wrongWay counters to byHorizon and batchSummary.
#     Adds hitRateExt = (hit+exceeded)/evaluated to byHorizon and batchSummary.
#     Adds overallRateExt to top-level stats object.
#     SNAPSHOT_PARAMS imported from stocks.js.
#
#   AccuracyChart.jsx:
#     ActionBar: slider removed — replaced with fixed threshold display
#       (shows H per horizon: 1M ±3%, 3M ±5%, 6M ±7%, 12M ±10%)
#     KPI cards: 4 cards — Hit Rate pure, Hit Rate extended, Total hits, Awaiting
#     Horizon cards: show both hitRate (green) and hitRateExt (purple) badges
#       + two progress bars (pure and extended) + snapshot params label
#     Batch table: new Ext Rate column + Exc column for exceeded count
#       table now has 9 columns (was 7)
#     hitMargin and onMarginChange props removed.
#
#   App.jsx:
#     hitMargin and onMarginChange removed from AccuracyChart props.
#
# No npm install needed.
# No Supabase changes needed in this version.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.3.3/. .

git add .
git commit -m "feat: AccuracyChart fixed thresholds + hitRateExt (v7.3.3)

useHistory.js — computed() rewritten:
  Uses SNAPSHOT_PARAMS per horizon (no more global margin param).
  Adds exceeded, wrongWay counters and hitRateExt to all stats objects.
  overallRateExt added to top-level stats.

AccuracyChart.jsx:
  Slider removed — fixed SNAPSHOT_PARAMS thresholds displayed instead.
  KPI cards: Hit Rate pure + extended + totals.
  Horizon cards: dual badge (pure + extended) + dual progress bars.
  Batch table: Ext Rate and Exc columns added (9 cols total).
  hitMargin and onMarginChange props removed.

App.jsx: hitMargin/onMarginChange removed from AccuracyChart.

Tests: 164/164 passing"

git tag -a v7.3.3 -m "v7.3.3: AccuracyChart fixed thresholds"
git push origin main && git push origin v7.3.3


# ===========================================================================
# STEP 128 — v7.3.4  Supabase hit_rate_ext + snapshot mode in saveBatch
# ===========================================================================
#
# SUPABASE MIGRATION REQUIRED — run this SQL before deploying:
#
#   alter table batches
#     add column if not exists hit_rate_ext integer;
#
# WHAT'S NEW:
#
#   useHistory.js — saveBatch():
#     evaluatePrediction now uses SNAPSHOT_PARAMS per horizon (snapshot mode)
#       evaluatePrediction(p, tgt, stock.b, 5, { horizon: h })
#       This replaces the old evaluatePrediction(p, tgt, stock.b, margin)
#       All batches saved from v7.3.4 use consistent fixed thresholds.
#     hitRateExt added: (hits + exceeded) / evaluated × 100
#     hitRateExt added to newBatch and batchMeta objects.
#
#   storage.js — saveHistory():
#     hit_rate_ext column added to upsert row.
#
#   storage.js — loadHistory():
#     hitRateExt: row.hit_rate_ext ?? null added to batch mapping.
#     null for batches saved before v7.3.4 — backwards compatible.
#
# BACKWARDS COMPATIBILITY:
#   Old batches (saved before v7.3.4) load with hitRateExt = null.
#   AccuracyChart handles null gracefully (shows '--' or empty badge).
#   To update old batches: load each batch → Save again.
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.3.4/. .

git add .
git commit -m "feat: Supabase hit_rate_ext + snapshot mode in saveBatch (v7.3.4)

useHistory.js — saveBatch():
  evaluatePrediction uses snapshot mode per horizon.
    Before: evaluatePrediction(p, tgt, base, margin) — global slider
    After:  evaluatePrediction(p, tgt, base, 5, { horizon: h }) — fixed
  hitRateExt = (hits + exceeded) / evaluated added to batch.
  hitRateExt added to newBatch and batchMeta.

storage.js:
  saveHistory: hit_rate_ext column added to Supabase upsert row.
  loadHistory: hitRateExt mapped from hit_rate_ext (null for old batches).

Supabase migration required:
  alter table batches add column if not exists hit_rate_ext integer;

Tests: 164/164 passing"

git tag -a v7.3.4 -m "v7.3.4: hit_rate_ext + snapshot mode"
git push origin main && git push origin v7.3.4


# ===========================================================================
# STEP 129 — v7.3.5  FetchBar log + horizon bar labels
# ===========================================================================
#
# WHAT'S NEW:
#
#   FetchBar.jsx — log moved to second line:
#     Layout changed from single flex row to flex-col with 2 rows.
#     Row 1: all buttons (unchanged)
#     Row 2: status log — full width, always visible, no truncation by buttons
#     Log now shows complete messages (e.g. "Waiting 8s before next symbol (3/6)…")
#
#   StockRow.jsx — horizon bar labels on two lines:
#     Was: "1M" and "EXCEED +14.2%" on same line (overflow into next column)
#     Now: two separate lines stacked above the bar:
#       Line 1: horizon key "1M" (grey, 9px)
#       Line 2: verdict + % "EXCEED +14.2%" (color, 9px, break-all)
#     min-w reduced from 80px to 72px (labels no longer need to be wide)
#
# No npm install needed.
# No Supabase changes needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.3.5/. .

git add .
git commit -m "fix: FetchBar log second line + horizon bar two-line labels (v7.3.5)

FetchBar.jsx:
  Log moved to second row below buttons — full width, always readable.
  Layout: flex-col with buttons row + log row.

StockRow.jsx:
  Horizon bar labels split to two lines:
    Line 1: hKey (1M/3M/6M/12M) in grey
    Line 2: verdict+% (EXCEED +14.2%) in verdict color
  No more overflow into adjacent columns.
  min-w reduced from 80px to 72px.

Tests: 164/164 passing"

git tag -a v7.3.5 -m "v7.3.5: FetchBar log + bar labels + Refresh Market fix"
git push origin main && git push origin v7.3.5


# ===========================================================================
# STEP 130 — v7.3.6  Settings page + Help & About page
# ===========================================================================
#
# WHAT'S NEW:
#
#   SettingsPage.jsx — new component:
#     Section 1 — Analysis defaults:
#       Hit margin slider (persisted in localStorage: openbank_hitMargin)
#       Close ratio field (persisted in localStorage: openbank_closeRatio)
#       SNAPSHOT_PARAMS table showing fixed thresholds per horizon
#     Section 2 — Profile:
#       User email (read only from useAuth)
#       Role badge (admin/readonly)
#     Section 3 — Data:
#       Supabase connection status badge
#       Clear cache button (clears localStorage preferences)
#     Section 4 — About:
#       App version badge
#       GitHub link
#
#   HelpPage.jsx — new component:
#     Section 1 — What is this app
#     Section 2 — Step by step workflow (6 steps with screenshot placeholder)
#       Screenshot: add openbank-screenshot.jpg to /public/ folder
#       Image auto-hides if file not found — shows placeholder text instead
#     Section 3 — Verdict system table (exceeded/hit/close/miss/wrong_way)
#     Section 4 — Snapshot thresholds table (1M/3M/6M/12M with all zones)
#     Section 5 — Verify your data (5 SQL queries for Supabase SQL Editor)
#       Query 1: list batches with hit_rate + hit_rate_ext
#       Query 2: verdict counts per batch
#       Query 3: per-horizon verdict breakdown for a specific batch
#       Query 4: fundamentals_cache check
#       Query 5: verify hit_rate_ext formula matches stored value
#
#   Sidebar.jsx:
#     HelpCircle icon added
#     'help' nav item added below Settings
#
#   App.jsx:
#     SettingsPage and HelpPage imported
#     hitMargin and closeRatio initialised from localStorage
#     Settings route updated to use SettingsPage
#     Help route added
#
# HOW TO ADD THE SCREENSHOT:
#   1. Copy your Openbank screenshot to:
#      /public/openbank-screenshot.jpg
#   2. The image will appear automatically in Help & About → Step 1
#   3. If the file is missing, a placeholder message is shown instead
#
# No npm install needed.
# No Supabase changes needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.3.6/. .

git add .
git commit -m "feat: Settings page + Help & About page (v7.3.6)

SettingsPage.jsx — new:
  Hit margin + close ratio with localStorage persistence.
  SNAPSHOT_PARAMS table. Profile (email+role). Data (Supabase status).
  About (version + GitHub link).

HelpPage.jsx — new:
  6-step workflow with screenshot placeholder (/public/openbank-screenshot.jpg).
  Verdict system table (exceeded/hit/close/miss/wrong_way with conditions).
  Snapshot thresholds table for all 4 horizons.
  5 SQL verification queries for Supabase SQL Editor.

Sidebar.jsx: HelpCircle icon + Help & About nav item.
App.jsx: routes for Settings and Help, localStorage init for hitMargin/closeRatio.

Tests: 164/164 passing"

git tag -a v7.3.6 -m "v7.3.6: Settings + Help pages"
git push origin main && git push origin v7.3.6


# ===========================================================================
# STEP 131 — v7.3.7  Settings live thresholds + All Stocks sort by ticker
# ===========================================================================
#
# WHAT'S NEW:
#
#   SettingsPage.jsx — live thresholds table:
#     Second table added below the fixed snapshot table.
#     Shows the same 4 columns (Hit/Exceeded/Close/Miss) but computed
#     from the current hitMargin and closeRatio values in real time.
#     Updates instantly when the slider or close ratio field changes.
#     Bordered with primary/30 color to visually distinguish from fixed table.
#     Footer note shows: Close threshold = H × R = X%
#
#   AllStocksPage.jsx — sort by ticker:
#     Ticker column header is now a clickable sort button (same pattern as Upside/Score).
#     Sort logic updated: 'ticker' uses localeCompare for alphabetical A→Z / Z→A.
#     Footer sort label updated to include 'Ticker'.
#     Click Ticker header once → A→Z · click again → Z→A
#
# No npm install needed.
# No Supabase changes needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.3.7/. .

git add .
git commit -m "feat: Settings live thresholds + All Stocks sort by ticker (v7.3.7)

SettingsPage.jsx:
  Live thresholds table added below fixed snapshot table.
  Updates in real time with hitMargin slider and closeRatio field.
  All 4 horizons show the same live H/R values.
  Primary-bordered to distinguish from fixed snapshot table.

AllStocksPage.jsx:
  Ticker column header → sortable button (localeCompare A→Z/Z→A).
  Sort logic extended: ticker uses alphabetical sort, not numeric.
  Footer label updated: 'Sorted by Ticker/Upside/Score'.

Tests: 164/164 passing"

git tag -a v7.3.7 -m "v7.3.7: Settings live thresholds + ticker sort"
git push origin main && git push origin v7.3.7


# ===========================================================================
# STEP 132 — v7.3.8  All Stocks — vs Target column + ticker link
# ===========================================================================
#
# WHAT'S NEW:
#
#   AllStocksPage.jsx — new "vs Target" column:
#     Formula: (currentPrice - target) / target × 100
#     currentPrice from autoPrices (new prop from App.jsx)
#     target = stock target for selected horizon (t1/t3/t6/t12)
#     Color: blue if positive (above target), red if negative (below target)
#     Sortable — click header to sort asc/desc
#     Positioned between Upside and Score columns
#     ColTooltip with formula explanation
#
#   AllStocksPage.jsx — Upside column header reorganised:
#     Sort button now stacked ABOVE the HorizonDropdown (flex-col)
#     vs Target column has empty spacer to align with dropdown
#
#   AllStocksPage.jsx — ticker link → Batch Overview Details:
#     Ticker name is now a clickable button
#     Click → finds most recent batch containing that ticker
#     → calls onLoadBatch(batch) + onNav('batch-detail')
#     No effect if onLoadBatch/onNav not provided (safe default)
#
#   AllStocksPage.jsx — new props:
#     autoPrices — { [ticker]: price } current prices from usePriceFetch
#     onNav      — setActivePage function from App.jsx
#     onLoadBatch — handleLoadBatch function from App.jsx
#
#   App.jsx:
#     autoPrices, onNav, onLoadBatch passed to AllStocksPage
#
# No npm install needed.
# No Supabase changes needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.3.8/. .

git add .
git commit -m "feat: All Stocks vs Target column + ticker link (v7.3.8)

AllStocksPage.jsx:
  New 'vs Target' column: (currentPrice - target) / target × 100
  Blue if positive (above target), red if negative.
  Sortable. ColTooltip with formula.
  Ticker is now a clickable link → loads batch + navigates to batch-detail.
  Upside sort button stacked above HorizonDropdown (flex-col).
  New props: autoPrices, onNav, onLoadBatch.

App.jsx: autoPrices, onNav, onLoadBatch passed to AllStocksPage.

Tests: 164/164 passing"

git tag -a v7.3.8 -m "v7.3.8: vs Target column + ticker link"
git push origin main && git push origin v7.3.8


# ===========================================================================
# STEP 133 — v7.3.9  Auto-fetch prices on batch load
# ===========================================================================
#
# WHAT'S NEW:
#
#   App.jsx — handleLoadBatch():
#     After restoring batch data, automatically calls fetchCurrentBatch(newStocks)
#     with a 100ms setTimeout to let React commit the state update first.
#     fetchCurrentBatch added to useCallback dependency array.
#
#   User experience:
#     Before: load batch → prices show "--" → user must click "Fetch prices"
#     After:  load batch → prices auto-fetch immediately in background
#     The manual "↓ Fetch prices" button remains available for forced refresh.
#
#   Why setTimeout(100ms)?
#     React batches state updates. If fetchCurrentBatch ran synchronously,
#     it might see the old stocks list (before setStocks committed).
#     The 100ms delay ensures newStocks is available before fetching.
#
# No npm install needed.
# No Supabase changes needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.3.9/. .

git add .
git commit -m "feat: auto-fetch prices on batch load (v7.3.9)

App.jsx — handleLoadBatch():
  fetchCurrentBatch(newStocks) called automatically after batch loads.
  100ms setTimeout ensures React state is committed before fetch starts.
  fetchCurrentBatch added to useCallback dependency array.
  Manual fetch button remains available for forced refresh.

Tests: 164/164 passing"

git tag -a v7.3.9 -m "v7.3.9: auto-fetch prices on batch load"
git push origin main && git push origin v7.3.9


# ===========================================================================
# STEP 134 — v7.4.0  Bearish batch support
# ===========================================================================
#
# SUPABASE — column already added (run before this version):
#   alter table batches add column if not exists direction text not null default 'bullish';
#   All existing batches automatically get direction = 'bullish'.
#
# WHAT'S NEW:
#
#   ImportPage.jsx — direction selector:
#     Two large buttons: 📈 Bullish / 📉 Bearish
#     Selected direction passed to onImport(stocks, direction)
#     Default: bullish
#
#   App.jsx:
#     batchDirection state added (default 'bullish')
#     handleImport(stocks, direction) — stores direction in state
#     handleLoadBatch — restores direction from batch.direction
#     saveBatch called with direction: batchDirection
#     batchDirection passed to BatchSimple
#
#   useHistory.js — saveBatch():
#     direction param added (default 'bullish')
#     direction stored in newBatch and batchMeta
#
#   storage.js:
#     saveHistory: direction column written to Supabase
#     loadHistory: direction read from row (default 'bullish' for old batches)
#
#   BatchSimple.jsx:
#     direction prop added
#     Header shows 📈 Bullish / 📉 Bearish badge next to "Batch Overview"
#
#   AccuracyChart.jsx:
#     Batch table date cell shows direction emoji badge (📈/📉)
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.4.0/. .

git add .
git commit -m "feat: bearish batch support — direction selector + badges (v7.4.0)

ImportPage.jsx: 📈 Bullish / 📉 Bearish selector before import.
App.jsx: batchDirection state + handleImport/handleLoadBatch updated.
useHistory.js: direction in saveBatch, newBatch, batchMeta.
storage.js: direction read/written in Supabase batches table.
BatchSimple.jsx: direction badge in Batch Overview header.
AccuracyChart.jsx: direction emoji in batch table date column.

Supabase: direction column added with default 'bullish'.
All existing batches automatically classified as bullish.

Tests: 164/164 passing"

git tag -a v7.4.0 -m "v7.4.0: bearish batch support"
git push origin main && git push origin v7.4.0


# ===========================================================================
# STEP 135 — v7.4.1  Watchlist table + SUPABASE.md rewrite + Bug #3 fix
# ===========================================================================
#
# SUPABASE CHANGES — execute before deploying (in order):
#
#   1. Create watchlist table:
#      create table if not exists watchlist (
#        id         uuid primary key default gen_random_uuid(),
#        user_id    uuid references auth.users(id) on delete cascade,
#        ticker     text not null,
#        added_at   timestamptz default now(),
#        unique(user_id, ticker)
#      );
#      alter table watchlist enable row level security;
#      create policy "watchlist_own" on watchlist
#        for all using (auth.uid() = user_id);
#
#   2. fetch_expired_horizons() — CRITICAL BUG FIX (Bug #3):
#      All local variables renamed with v_ prefix to eliminate
#      PostgreSQL column/variable name collision.
#      This bug caused the function to run silently with no effect —
#      verdicts never updated despite cron showing 'succeeded'.
#      See docs/SUPABASE.md Bug #3 for full diagnosis and explanation.
#
#   3. Cron schedule corrected:
#      Job 1 changed from '0 2 * * 1-5' to '0 2 * * 2-6' (Tue-Sat)
#      Reason: 02:00 UTC is the next calendar day after market close.
#
#   4. backup_to_github() updated to v1.1:
#      Added fundamentals_cache to backup.
#
# WHAT'S NEW IN APP CODE:
#
#   useHistory.js — computed() — batchSummary fix:
#     direction field was missing from batchSummary objects.
#     AccuracyChart uses stats.batchSummary for table rows — so batch.direction
#     was always undefined → badge always showed 📈 even for bearish batches.
#     Fix: added direction: b.direction ?? 'bullish' to batchSummary return.
#
#   App.jsx — onSave handler:
#     saveBatch is now awaited and loadHistory() called on success.
#     Ensures AccuracyChart reloads fresh data from Supabase after every save.
#
# DOCS UPDATED:
#   docs/SUPABASE.md — complete rewrite (767 lines).
#   See SUPABASE.md sections 8 and 9 for Bug #3 documentation.
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.4.1/. .

git add .
git commit -m "fix: direction badge in AccuracyChart + Bug #3 v_ prefix + SUPABASE.md (v7.4.1)

BUG FIX — direction badge always showing 📈:
  Root cause: batchSummary in computed() was missing 'direction' field.
  AccuracyChart renders stats.batchSummary rows — batch.direction was
  undefined → always evaluated as bullish → always showed 📈.
  Fix: direction: b.direction ?? 'bullish' added to batchSummary return.

App.jsx onSave: saveBatch awaited + loadHistory() called on success.
  Ensures history reloads from Supabase after every save.

CRITICAL SUPABASE FIX — fetch_expired_horizons() Bug #3:
  All local variables renamed with v_ prefix (v_ticker, v_target_date etc.)
  Eliminates PostgreSQL column/variable name collision that caused
  cron to show 'succeeded' but never update any verdicts.

Supabase infrastructure:
  Watchlist table created with RLS.
  Cron Job 1: '0 2 * * 1-5' → '0 2 * * 2-6' (Tue-Sat).
  backup_to_github() v1.1: fundamentals_cache added.

docs/SUPABASE.md complete rewrite — 767 lines.

Tests: 164/164 passing"

git tag -a v7.4.1 -m "v7.4.1: direction badge fix + Bug #3 + SUPABASE.md"
git push origin main && git push origin v7.4.1


# ===========================================================================
# STEP 136 — v7.4.2  Watchlist UI
# ===========================================================================
#
# SUPABASE — RLS fix required (if not already done):
#
#   The 'watchlist_own' policy created in v7.4.1 used 'for all using' which
#   does NOT cover INSERT (needs 'with check'). Replace with 3 policies:
#
#   drop policy if exists "watchlist_own" on watchlist;
#   create policy "watchlist_select" on watchlist
#     for select using (auth.uid() = user_id);
#   create policy "watchlist_insert" on watchlist
#     for insert with check (auth.uid() = user_id);
#   create policy "watchlist_delete" on watchlist
#     for delete using (auth.uid() = user_id);
#
#   Verify:
#   select policyname, cmd from pg_policies where tablename = 'watchlist';
#
# WHAT'S NEW:
#
#   src/services/storage.js — 4 new functions:
#     getUserId()             — decodes JWT from localStorage → user UUID
#                               required by RLS insert policy (with check)
#     loadWatchlist()         — fetch user's watchlist tickers (string[])
#     addToWatchlist(ticker)  — inserts { ticker, user_id } — user_id required by RLS
#     removeFromWatchlist(ticker) — delete by ticker (user scoped via RLS)
#
#   src/hooks/useWatchlist.js — new hook:
#     watchlist    — Set<string> of watched tickers (O(1) lookup)
#     toggle(t)    — optimistic add/remove with Supabase persist + rollback on fail
#     isWatched(t) — O(1) check
#     reload()     — force refresh from Supabase
#
#   src/components/WatchlistPage.jsx — new page:
#     Left: summary cards (total/above/below target/awaiting) + table
#     Right: detail panel on row click:
#       - Recharts sparkline (green/red, last N weekly prices)
#       - Current price + % from base
#       - Per-horizon targets with verdicts
#       - Fundamentals (sector, PEG, beta, margin)
#       - Open in Batch Details button
#       - Remove from Watchlist button
#     Empty state with instructions when watchlist is empty
#     Scenario B: uses most recent batch per ticker
#     Uses Recharts (already installed) — NOT chart.js/react-chartjs-2
#
#   src/components/Sidebar.jsx:
#     Star icon added to lucide imports
#     'watchlist' nav item added between All Stocks and Import
#
#   src/components/AllStocksPage.jsx:
#     weeklyPrices now received as prop (lifted to App.jsx — shared with Watchlist)
#     ⭐ column added — filled red if watched, grey if not
#     watchlist + onToggleWatchlist props added
#     colSpan updated 9 → 10
#
#   src/components/StockRow.jsx:
#     ⭐ icon added next to ticker name in Batch Details
#     isWatched + onToggleWatchlist props added
#
#   src/components/StockTable.jsx:
#     watchlist + onToggleWatchlist props passed through to StockRow
#
#   src/App.jsx:
#     useWatchlist hook added → watchlist + toggleWatchlist
#     WatchlistPage imported + route added
#     weeklyPrices state lifted: loadAllWeeklyPrices() on mount, shared
#     watchlist + toggleWatchlist passed to AllStocksPage, StockTable, WatchlistPage
#
# BUGS FIXED DURING TESTING:
#
#   Bug A — react-chartjs-2 not installed:
#     WatchlistPage originally imported react-chartjs-2 — not in package.json.
#     Fixed: replaced with Recharts LineChart (already installed).
#
#   Bug B — 403 on watchlist INSERT (RLS):
#     'for all using' does not cover INSERT in PostgreSQL RLS.
#     INSERT requires 'with check'. Fixed: 3 separate policies above.
#
#   Bug C — addToWatchlist missing user_id in body:
#     RLS 'with check (auth.uid() = user_id)' requires user_id in the row.
#     Fixed: getUserId() decodes JWT sub claim from localStorage session.
#     Body now: { ticker, user_id: userId }.
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.4.2/. .

git add .
git commit -m "feat: Watchlist UI — page + sparkline + star toggle (v7.4.2)

storage.js: getUserId() + loadWatchlist, addToWatchlist, removeFromWatchlist.
  addToWatchlist sends { ticker, user_id } required by RLS insert policy.
  getUserId() decodes JWT sub claim from localStorage Supabase session.

useWatchlist.js: Set<string> state, optimistic toggle with rollback on fail.

WatchlistPage.jsx:
  Cards (total/above/below/awaiting) + table.
  Detail panel: Recharts sparkline, price vs base, horizon targets,
  fundamentals, open-in-batch + remove actions. Empty state.

AllStocksPage.jsx: star column, watchlist prop, weeklyPrices as prop.
StockRow.jsx: star next to ticker name in Batch Details.
StockTable.jsx: watchlist props passed through.
Sidebar.jsx: Watchlist nav item added.
App.jsx: weeklyPrices lifted to App, watchlist wired to all pages.

Supabase RLS fix: watchlist_own replaced with 3 separate policies.
INSERT requires 'with check' not 'using'.

Tests: 164/164 passing"

git tag -a v7.4.2 -m "v7.4.2: Watchlist UI"
git push origin main && git push origin v7.4.2


# ===========================================================================
# STEP 137 — v7.4.3  Direction badges + Watchlist multi-row
# ===========================================================================
#
# NO SUPABASE CHANGES.
# NO npm install needed.
#
# WHAT'S NEW:
#
#   src/components/StockTable.jsx:
#     batchDirection prop added (default 'bullish')
#     TrendingUp / TrendingDown icons imported from lucide-react
#     Badge 📈 Bullish / 📉 Bearish shown next to "Batch Predictions" title
#
#   src/App.jsx:
#     batchDirection passed to StockTable
#
#   src/components/WatchlistPage.jsx:
#     buildStockRows() rewritten: one row per ticker × batch
#       (was: one row per ticker using most recent batch)
#     Each row now includes direction from batch.direction
#     Row key changed from ticker to ticker__batchId (unique per ticker×batch)
#     selectedTicker state now holds the rowKey (ticker__batchId)
#     selectedRow lookup updated to match new rowKey format
#     Direction column added to table (📈/📉 badge)
#     DetailPanel header now shows direction badge next to ticker
#
# BEHAVIOUR:
#   - If MU appears in 3 batches → 3 rows in Watchlist
#   - If ENPH appears in 1 bullish + 1 bearish batch → 2 rows, each with correct badge
#   - Click ⭐ on any batch removes ticker from all watchlist rows (watchlist is per-ticker)
#   - Panel opens for the specific batch row clicked (not just ticker)
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.4.3/. .

git add .
git commit -m "feat: direction badges + watchlist multi-row per batch (v7.4.3)

StockTable.jsx: batchDirection prop + Bullish/Bearish badge in header.
App.jsx: batchDirection passed to StockTable.

WatchlistPage.jsx:
  buildStockRows() → one row per ticker × batch (was: most recent only).
  Direction column added with 📈/📉 badge.
  DetailPanel header shows direction badge.
  Row key: ticker__batchId (unique). selectedTicker uses rowKey.

Tests: 164/164 passing"

git tag -a v7.4.3 -m "v7.4.3: direction badges + watchlist multi-row"
git push origin main && git push origin v7.4.3


# ===========================================================================
# STEP 138 — v7.4.4  Price alerts
# ===========================================================================
#
# SUPABASE — execute before deploying:
#
#   create table if not exists alert_config (
#     user_id     uuid references auth.users on delete cascade primary key,
#     enabled     boolean not null default true,
#     email       text,
#     browser     boolean not null default true,
#     on_exceeded boolean not null default true,
#     on_hit      boolean not null default true,
#     on_close    boolean not null default false,
#     on_stop     boolean not null default true,
#     stop_pct    numeric not null default 10,
#     cooldown_h  integer not null default 24,
#     updated_at  timestamptz default now()
#   );
#   alter table alert_config enable row level security;
#   create policy "alert_config_own" on alert_config
#     for all using (auth.uid() = user_id)
#     with check (auth.uid() = user_id);
#
#   create table if not exists alert_log (
#     id         bigserial primary key,
#     user_id    uuid references auth.users on delete cascade,
#     ticker     text not null,
#     batch_id   text not null,
#     horizon    text not null,
#     verdict    text not null,
#     price      numeric,
#     target     numeric,
#     sent_at    timestamptz default now()
#   );
#   alter table alert_log enable row level security;
#   create policy "alert_log_own" on alert_log
#     for all using (auth.uid() = user_id)
#     with check (auth.uid() = user_id);
#
#   Verify:
#   select tablename from pg_tables where tablename in ('alert_config','alert_log');
#
# EMAILJS — add template variable:
#   In your EmailJS template, ensure {{{alert_body}}} exists (triple braces for HTML).
#   The existing {{{report_body}}} template also works — alerts reuse the same template.
#
# WHAT'S NEW:
#
#   src/hooks/useAlerts.js — new hook:
#     DEFAULT_ALERT_CONFIG — default values for all settings
#     buildAlertEmailHtml(alerts) — HTML email body matching app design
#     requestNotificationPermission() — requests browser OS notification permission
#     useAlerts() — main hook:
#       alertConfig     — current user's config (loaded from Supabase on mount)
#       loadingConfig   — true while loading
#       saveConfig(cfg) — partial update + persist to Supabase
#       checkAlerts(autoPrices, watchlist, batches, hitMargin):
#         - Evaluates all watchlisted tickers with current prices
#         - Checks: exceeded / hit / close / stop_loss conditions
#         - Enforces cooldown (no repeat alerts within cooldown_h hours)
#         - Fires browser notification per alert
#         - Sends single email with all triggered alerts via EmailJS
#         - Logs alerts to alert_log for cooldown tracking
#
#   src/services/storage.js — 4 new functions:
#     loadAlertConfig()      — fetch user's alert config from Supabase
#     saveAlertConfig(cfg)   — upsert alert config (includes user_id for RLS)
#     loadAlertLog(h)        — fetch recent log entries for cooldown check
#     appendAlertLog(alerts) — insert alert log entries
#
#   src/components/SettingsPage.jsx — new "Alerts" section:
#     Enable/disable toggle
#     Alert email input
#     Browser notification toggle
#     Checkboxes: on_exceeded, on_hit, on_close, on_stop
#     Stop loss % slider (admin only)
#     Cooldown hours slider (admin only)
#     alertConfig + onSaveAlertConfig props added
#
#   src/components/WatchlistPage.jsx:
#     onCheckAlerts prop added
#     "Check alerts" button (Bell icon) in header
#
#   src/App.jsx:
#     useAlerts hook added
#     onFetch → after fetchCurrentBatch → checkAlerts() (500ms delay for state)
#     alertConfig + saveAlertConfig passed to SettingsPage
#     onCheckAlerts passed to WatchlistPage
#
# ALERT CONDITIONS:
#   exceeded  — price > target × (1 + hitMargin%) AND on_exceeded = true
#   hit       — |price - target| / target ≤ hitMargin% AND on_hit = true
#   close     — within close threshold AND on_close = true
#   stop_loss — price < base × (1 - stop_pct/100) AND on_stop = true
#
# COOLDOWN LOGIC:
#   After sending an alert for ticker+batch_id+horizon, no repeat for cooldown_h hours.
#   Cooldown checked against alert_log table in Supabase.
#   Default: 24h. Admin can change in Settings.
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.4.4/. .

git add .
git commit -m "feat: price alerts — browser + email notifications (v7.4.4)

useAlerts.js: new hook — checkAlerts() evaluates watchlist tickers,
  fires browser notifications + EmailJS email, enforces cooldown.
  Conditions: exceeded / hit / close / stop_loss. All configurable.

storage.js: loadAlertConfig, saveAlertConfig, loadAlertLog, appendAlertLog.
  All use getUserId() for RLS insert policies.

SettingsPage.jsx: new Alerts section with all config options.
  Stop loss % and cooldown are admin-only settings.

WatchlistPage.jsx: Check alerts button in header.
App.jsx: checkAlerts called after fetchCurrentBatch (500ms delay).

Supabase: alert_config + alert_log tables with RLS.

Tests: 164/164 passing"

git tag -a v7.4.4 -m "v7.4.4: price alerts"
git push origin main && git push origin v7.4.4


# ===========================================================================
# STEP 139 — v7.4.5  Watchlist sticky panel + sidebar label
# ===========================================================================
#
# NO SUPABASE CHANGES.
# NO npm install needed.
#
# WHAT'S NEW:
#
#   src/components/WatchlistPage.jsx — layout fixes:
#     Outer container: minHeight:520 → height:600 (fixed height enables
#       independent scroll in each column)
#     Left column: added overflow-hidden so header stays fixed and
#       only the table scrolls
#     DetailPanel container: added overflow-y-auto — panel has its own
#       independent scroll context. Now stays fixed while list scrolls.
#     Panel header: position sticky top-0 z-10 — ticker name always visible
#       even when panel body content is long and scrolls
#     Panel body: removed overflow-y-auto (whole panel scrolls now)
#
#   src/components/Sidebar.jsx — label already correct ('Watchlist')
#     No change needed — was already 'Watchlist' in v7.4.2+
#
# LAYOUT TECHNIQUE:
#   Both columns are flex children of a fixed-height container.
#   Each column has overflow-y:auto → they scroll independently.
#   Scrolling the left list does NOT move the right panel.
#   Panel header is sticky:top-0 so ticker name stays visible.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.4.5/. .

git add .
git commit -m "fix: watchlist sticky panel — independent scroll (v7.4.5)

WatchlistPage.jsx:
  Outer container height:600 (fixed, enables independent column scroll).
  Left column: overflow-hidden (header fixed, table scrolls).
  DetailPanel: overflow-y-auto (independent scroll context).
  Panel header: sticky top-0 z-10 (always visible).
  Panel body: removed overflow-y-auto (whole panel scrolls).

Tests: 164/164 passing"

git tag -a v7.4.5 -m "v7.4.5: watchlist sticky panel"
git push origin main && git push origin v7.4.5


# ===========================================================================
# STEP 140 — v7.4.6  Export page — HTML + PDF reports
# ===========================================================================
#
# NO SUPABASE CHANGES.
#
# npm install — required (new dependencies added to package.json):
#   jspdf@^2.5.1       — PDF generation
#   html2canvas@^1.4.1 — captures HTML as canvas for PDF rendering
#   Both are loaded dynamically (import()) when PDF export is clicked.
#
# WHAT'S NEW:
#
#   src/components/ExportPage.jsx — new page:
#     Step 1: Select batch dropdown (defaults to currently loaded batch)
#     Step 2: Content checkboxes with live preview badges:
#       ☑ Summary cards  — hit rate, stocks count, direction
#       ☑ Predictions table — all tickers with targets and verdicts
#       ☑ Market performance — SPY + ETFs vs batch period
#       ☐ Fundamentals   — sector, PEG, beta, margin, fwd PE
#       ☐ Notes          — per-ticker notes saved with batch
#     Step 3: Export buttons:
#       HTML — generates report.html and triggers browser download
#       PDF  — renders HTML in hidden iframe → html2canvas → jsPDF → download
#     buildReportHtml() — generates complete standalone HTML report:
#       - Branded header (OB logo, batch date, direction badge)
#       - All selected sections as clean tables
#       - print-ready CSS (@media print)
#       - Multi-page PDF support
#
#   src/components/Sidebar.jsx:
#     Download icon added to lucide imports
#     'export' nav item added between Watchlist and Import
#
#   src/components/Header.jsx:
#     'export' page title added: "Export · Download batch reports as HTML or PDF"
#
#   src/App.jsx:
#     ExportPage imported + route added
#     Receives: batches, loadedBatchId, fundamentals
#
#   package.json:
#     jspdf and html2canvas added to dependencies
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.4.6/. .

npm install

git add .
git commit -m "feat: Export page — HTML + PDF batch reports (v7.4.6)

ExportPage.jsx: 3-step UI (batch selector, content checkboxes, export).
  HTML: generates standalone report.html and downloads it.
  PDF: hidden iframe → html2canvas → jsPDF → A4 multi-page download.
  buildReportHtml(): branded report with summary, predictions,
  market, fundamentals, notes — all optional via checkboxes.

Sidebar + Header: Export nav item + page title.
App.jsx: ExportPage route wired with batches, loadedBatchId, fundamentals.
package.json: jspdf + html2canvas added to dependencies.

Tests: 164/164 passing"

git tag -a v7.4.6 -m "v7.4.6: Export page HTML + PDF"
git push origin main && git push origin v7.4.6


# ===========================================================================
# STEP 141 — v7.4.7  Multi-currency EUR/GBP/JPY/CHF
# ===========================================================================
#
# NO SUPABASE CHANGES.
# NO npm install needed.
#
# WHAT'S NEW:
#
#   src/hooks/useHistory.js — saveBatch results:
#     currency: stock.cu ?? 'USD' added to every result row.
#     Previously currency was NOT saved to Supabase results — it was lost
#     when reloading a batch from history.
#
#   src/App.jsx:
#     handleLoadBatch: cu now reads from saved results currency field
#       instead of hardcoding 'USD' for all restored batches.
#     batchCurrency: extended with JPY (¥) and CHF symbols.
#
#   src/components/WatchlistPage.jsx:
#     getCurrencySymbol(batch) helper — reads batch.results[].currency
#       and returns the correct symbol. Falls back to '$' for old batches.
#     buildStockRows() — each row includes currSym from its batch.
#     Sparkline tooltip: $  → row.currSym
#     Price display: $ → row.currSym
#     Horizon targets: $ → row.currSym
#
#   src/components/ExportPage.jsx:
#     getCurrencySymbol(batch) helper added (same logic as WatchlistPage).
#     buildReportHtml(): sym variable replaces all hardcoded '$'
#       in base price column and target price cells.
#
# SUPPORTED CURRENCIES:
#   USD → $  (default, all US-listed tickers)
#   EUR → €  (Frankfurt/Xetra .DE tickers)
#   GBP → £  (London .L tickers)
#   JPY → ¥  (Tokyo tickers)
#   CHF → CHF (Swiss tickers)
#
# BACKWARD COMPATIBILITY:
#   Batches saved before v7.4.7 don't have currency in results.
#   getCurrencySymbol() falls back to '$' — no data loss.
#   New batches saved from v7.4.7 onwards store currency per result row.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.4.7/. .

git add .
git commit -m "feat: multi-currency EUR/GBP/JPY/CHF (v7.4.7)

useHistory.js: currency field added to saveBatch results.
App.jsx: handleLoadBatch reads cu from results (not hardcoded USD).
  batchCurrency extended: JPY (¥) and CHF.

WatchlistPage.jsx: getCurrencySymbol(batch) helper.
  buildStockRows: currSym per row. All price displays use currSym.

ExportPage.jsx: getCurrencySymbol(batch) helper.
  buildReportHtml: sym replaces all hardcoded dollar signs.

Tests: 164/164 passing"

git tag -a v7.4.7 -m "v7.4.7: multi-currency"
git push origin main && git push origin v7.4.7


# ===========================================================================
# STEP 142 — v7.4.8  Watchlist crash fix + alphabetical sort
# ===========================================================================
#
# NO SUPABASE CHANGES.
# NO npm install needed.
#
# BUGS FIXED:
#
#   Bug A — Crash: Cannot read properties of undefined (reading 'map')
#     WatchlistPage.jsx line 267 — row.horizons was undefined for tickers
#     whose watchlist entry exists but the batch hasn't been saved yet,
#     OR for European tickers added to watchlist before the batch was saved.
#     The placeholder row (tickerBatches.length === 0) was created without
#     the horizons field — DetailPanel then crashed on row.horizons.map().
#
#     Fix 1: placeholder row now includes full safe-default horizons:
#       horizons: HORIZONS.map(h => ({ h, target: null, verdict: 'awaiting', vt: null }))
#     Fix 2: defensive guard in DetailPanel:
#       (row.horizons ?? []).map(...) — never crashes even if horizons is missing
#
#   Bug B — Watchlist table not sorted
#     buildStockRows() returned rows in Set iteration order (insertion order).
#     Fix: rows.sort((a, b) => a.ticker.localeCompare(b.ticker)) at end of
#     buildStockRows() — always alphabetical ascending by ticker name.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.4.8/. .

git add .
git commit -m "fix: watchlist crash on European tickers + alphabetical sort (v7.4.8)

WatchlistPage.jsx:
  Placeholder row now includes horizons with safe defaults — prevents
  DetailPanel crash when ticker has no matching batch results.
  Defensive guard: (row.horizons ?? []).map() in DetailPanel.
  buildStockRows: rows sorted alphabetically by ticker (localeCompare).

Tests: 164/164 passing"

git tag -a v7.4.8 -m "v7.4.8: watchlist crash fix + sort"
git push origin main && git push origin v7.4.8


# ===========================================================================
# STEP 143 — v7.4.9  Alpha Vantage rate limit detection
# ===========================================================================
#
# NO SUPABASE CHANGES.
# NO npm install needed.
#
# PROBLEM:
#   Alpha Vantage free tier: 25 requests/day.
#   When the daily limit is exceeded, AV returns:
#     { "Information": "Thank you for using Alpha Vantage! Our standard API
#       rate limit is 25 requests per day..." }
#   Previously the app silently treated this as a failed price (null) with
#   the generic message "Failed: IFX.DE, AIXA.DE, EVT.DE" — no indication
#   that the daily limit was reached.
#
# FIX:
#   fetchCurrentPrices_AV() now checks for 'Information' and 'Note' fields
#   in the AV response — both indicate rate limit or API issues.
#   When detected: marks remaining tickers as null and throws AV_RATE_LIMIT error.
#   fetchCurrentBatch() catches AV_RATE_LIMIT and shows:
#     "⚠️ Alpha Vantage daily limit reached (25 req/day). Try again tomorrow."
#
# NOTE ON TRIPLE FETCH IN DEV:
#   In development, React StrictMode renders components twice to detect
#   side effects. This can cause fetch to appear to run 3x in the browser
#   network tab. This is normal in dev and does NOT happen in production.
#   The 25 req/day limit should be fine for daily use (4 tickers = 4 req).
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.4.9/. .

git add .
git commit -m "fix: Alpha Vantage rate limit detection + clear error (v7.4.9)

usePriceFetch.js: fetchCurrentPrices_AV detects AV rate limit response
  (Information/Note fields) and throws AV_RATE_LIMIT error.
  fetchCurrentBatch catches it and shows user-friendly message:
  '⚠️ Alpha Vantage daily limit reached (25 req/day). Try again tomorrow.'

Tests: 164/164 passing"

git tag -a v7.4.9 -m "v7.4.9: AV rate limit detection"
git push origin main && git push origin v7.4.9


# ===========================================================================
# STEP 144 — v7.4.10  Final release — EU support + SUPABASE.md + SQL setup
# ===========================================================================
#
# NO npm install needed.
#
# SUPABASE CHANGES — both functions now have EU market support:
#
#   fetch_expired_horizons() — updated:
#     Detects EU ticker suffix (.DE, .AS, .PA, .L, .MC)
#     EU tickers → Yahoo Finance /v8/finance/chart with ±3 day window
#     US tickers → Twelve Data /eod (unchanged)
#     Verified: prosrc like '%yahoo%' = true, prosrc like '%v_is_eu%' = true
#
#   fetch_weekly_prices() — updated (v7.4.7, confirmed in this release):
#     Same EU detection logic
#     EU tickers → Yahoo Finance ?interval=1wk&range=1wk
#     US tickers → Twelve Data /eod (unchanged)
#
# WHAT'S NEW:
#
#   docs/supabase_setup.sql — NEW FILE:
#     Complete SQL to recreate the entire Supabase project from scratch.
#     Single file execution: tables, indexes, RLS policies, trigger,
#     all 3 functions, all 3 cron jobs, verification queries.
#     Safe to re-run (CREATE IF NOT EXISTS / CREATE OR REPLACE).
#
#   docs/SUPABASE.md — completely rewritten:
#     All 8 tables documented with full SQL and field descriptions
#     All 4 functions documented with EU support details
#     All 3 cron jobs with schedules and purposes
#     New section 8: EU market support (Yahoo Finance endpoints, backfill SQL)
#     All 5 known bugs documented with root causes and fixes
#     Complete verification query set
#     Updated version to v7.4.10
#
#   src/components/SettingsPage.jsx — version bumped to v7.4.10
#   package.json — version bumped to 7.4.10
#   README.md — v7.4.10 entry added
#
# EU MARKET SUPPORT SUMMARY (complete picture after this release):
#
#   Supabase fetch_expired_horizons():
#     EU (.DE/.AS/.PA/.L/.MC) → Yahoo Finance ✅
#     US → Twelve Data ✅
#
#   Supabase fetch_weekly_prices():
#     EU → Yahoo Finance ✅
#     US → Twelve Data ✅
#
#   React usePriceFetch.js fetchCurrentBatch (live prices):
#     EU → Alpha Vantage (25 req/day free tier) ✅
#     US → Twelve Data ✅
#
#   React usePriceFetch.js fetchHistoricalForHorizon:
#     EU → Alpha Vantage ✅
#     US → Twelve Data ✅
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.4.10/. .

git add .
git commit -m "feat: final release — EU support complete + SUPABASE.md + SQL setup (v7.4.10)

Supabase:
  fetch_expired_horizons(): EU detection → Yahoo Finance for .DE/.AS/.PA/.L/.MC
  fetch_weekly_prices(): same EU detection (confirmed working)
  Both functions verified: has_yahoo=true, has_eu_detection=true

docs/supabase_setup.sql: new — complete project SQL in single file.
  Tables, indexes, RLS, trigger, 3 functions, 3 cron jobs, verification queries.

docs/SUPABASE.md: completely rewritten v7.4.10.
  All tables, functions, cron jobs, EU support section,
  5 known bugs documented, complete verification queries.

Tests: 164/164 passing"

git tag -a v7.4.10 -m "v7.4.10: final release — EU support + SUPABASE.md"
git push origin main && git push origin v7.4.10


# ===========================================================================
# STEP 145 — v7.5.0  Market filter + display fixes + AV cache + UML
# ===========================================================================
#
# NO SUPABASE CHANGES.
# NO npm install needed.
#
# WHAT'S NEW:
#
#   src/components/AllStocksPage.jsx:
#     getMarket(rawTicker) helper — extracts market suffix: US/DE/AS/PA/L/MC
#     displayTicker(rawTicker) helper — strips suffix for display (NEM.DE → NEM)
#     Stock object: added tDisplay (display ticker) + market fields
#     Default sort: changed from 'upside' desc to 'ticker' asc (A→Z default)
#     filterMkt state — '' | 'US' | 'DE' | 'AS' | 'PA' | 'L' | 'MC'
#     markets useMemo — unique markets with counts from loaded stocks
#     Market filter badges — shown only when >1 market detected
#       Flags: 🇺🇸 US  🇩🇪 DE  🇳🇱 AS  🇫🇷 PA  🇬🇧 L  🇪🇸 MC
#       Toggle: click badge to filter, click again to deselect
#     Ticker column: shows tDisplay (no suffix) + market badge below company name
#       Market badge only shown when >1 market in current stocks
#     Avatar initials: uses tDisplay.slice(0,3) instead of tNorm.slice(0,3)
#
#   src/components/WatchlistPage.jsx:
#     market field added to buildStockRows — extracted from ticker suffix
#     filterMkt state + markets useMemo (same logic as AllStocksPage)
#     filteredRows = rows filtered by market (or all if filterMkt === '')
#     Market filter badges added in header — below "Check alerts" button
#     Table now renders filteredRows instead of rows
#
#   src/hooks/usePriceFetch.js:
#     AV_CACHE_KEY / AV_CACHE_TTL constants (24h = 86400000ms)
#     avCacheGet(ticker) — reads from localStorage, respects TTL
#     avCacheSet(ticker, price) — writes to localStorage with timestamp
#     fetchCurrentPrices_AV(): checks cache before API call
#       Cache hit → skip API call, use cached price
#       Cache miss → fetch from AV, save to cache on success
#     Effect: 4 EU tickers = 4 AV requests on first fetch,
#       then 0 requests for the next 24 hours (reuses cached prices)
#
#   docs/openbank-forecast-uml.md — NEW FILE:
#     Mermaid diagrams: ER diagram, system architecture, cron schedule,
#     fetch_expired_horizons() sequence, fetch_weekly_prices() sequence,
#     RLS access matrix, verdict evaluation flowchart
#     Reference: docs/supabase_setup.sql
#
#   README.md:
#     Link to openbank-forecast-uml.md added in docs section
#     Changelog: note added for versions before v6.9.0 (131 git tags)
#       "git log --oneline --tags --simplify-by-decoration" to browse
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.0/. .

git add .
git commit -m "feat: market filter + display fixes + AV cache + UML (v7.5.0)

AllStocksPage.jsx:
  getMarket() + displayTicker() helpers.
  Stock object: tDisplay (no suffix) + market fields.
  Default sort: ticker ascending (A→Z).
  Market filter badges (🇺🇸 US / 🇩🇪 DE etc.) — shown when >1 market.
  Ticker column: shows tDisplay + market badge below company name.

WatchlistPage.jsx:
  market field in buildStockRows.
  Market filter badges in header.
  Table uses filteredRows (market-filtered subset).

usePriceFetch.js:
  AV 24h localStorage cache (avCacheGet/avCacheSet).
  fetchCurrentPrices_AV: cache-first, API only on miss.

docs/openbank-forecast-uml.md: new — full Mermaid UML diagram set.
README.md: UML link + old versions note in changelog.

Tests: 164/164 passing"

git tag -a v7.5.0 -m "v7.5.0: market filter + AV cache + UML"
git push origin main && git push origin v7.5.0

