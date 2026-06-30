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



# ===========================================================================
# STEP 146 — v7.5.2  Bug fixes: WatchlistPage JSX + AuthContext + ManageUsers
# ===========================================================================
#
# NO SUPABASE CHANGES.
# NO npm install needed.
#
# BUGS FIXED:
#
#   Bug A — WatchlistPage.jsx: JSX parse error (v7.5.0)
#     Extra </div> in header after market badges section.
#     Fix: removed orphan closing tag.
#
#   Bug B — WatchlistPage.jsx: Sparkline 'row' not defined (v7.5.0)
#     Sparkline component referenced row?.currSym out of scope.
#     Fix: currSym passed as explicit prop — <Sparkline currSym={row.currSym} />
#
#   Bug C — AuthContext.jsx: full_name removed incorrectly (v7.5.0/v7.5.1)
#     profiles table has full_name column. Was changed to select('role') only.
#     Fix: restored select('role, full_name') in fetchRole.
#
#   Bug D — ManageUsers.jsx: column profiles.email does not exist (400 error)
#     ManageUsers queried select('id, email, role, created_at') but profiles
#     has full_name not email.
#     Fix: select('id, full_name, role, created_at') + updated render.
#
# BEFORE INSTALLING — clear localStorage role cache in browser console:
#   localStorage.removeItem('app-user-role')
#   localStorage.removeItem('app-profile-name')
#   location.reload()
#
# IMPORTANT — macOS will create the folder automatically when you double-click the ZIP.
# The ZIP extracts directly to ~/Downloads/openbank-price-prediction_v7.5.2/
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.2/. .

git add .
git commit -m "fix: WatchlistPage JSX + AuthContext + ManageUsers (v7.5.1)

WatchlistPage.jsx:
  Removed extra </div> in header market badges section (JSX parse error).
  Sparkline: currSym passed as explicit prop (was referencing out-of-scope row).

AuthContext.jsx:
  Restored select('role, full_name') — profiles.full_name exists and is needed.

ManageUsers.jsx:
  select('id, full_name, role, created_at') — profiles has full_name not email.
  All u.email references updated to u.full_name in render.

Tests: 164/164 passing"

git tag -a v7.5.2 -m "v7.5.2: WatchlistPage JSX + AuthContext + ManageUsers fixes"
git push origin main && git push origin v7.5.2


# ===========================================================================
# STEP 145 — v7.5.3  Update supabase_setup.sql
# ===========================================================================
#

git add docs/supabase_setup.sql
git commit -m "chore: update supabase_setup.sql to v7.5.3

profiles table: added email, full_name, updated_at columns.
get_all_profiles(): new security definer function for ManageUsers.
Version bumped to v7.5.3."

git tag -a v7.5.3 -m "v7.5.3: supabase_setup.sql updated"
git push origin main && git push origin v7.5.3

# ===============================================================================
# STEP 145 — v7.5.4  Umarket badge alignment + dark mode email + favicon (v7.5.4)
# ===============================================================================
#
## What changed per fix

| # | File | Change |
|---|------|--------|
| 1 | AllStocksPage.jsx | Badge: added `inline-flex items-center leading-none` to align DE/US badge vertically with company text |
| 2 | SettingsPage.jsx | Alert email input: replaced `style={{ width, fontSize }}` with Tailwind `text-foreground bg-background` classes — readable in dark mode |
| 3 | index.html | Added `<link rel="icon" href="data:," />` to `<head>` — suppresses browser 404 for favicon |
| 3 | SettingsPage.jsx | Version string bumped to `v7.5.4` |
| 3 | package.json | `"version"` bumped to `"7.5.4"` |
| 4 | Supabase | `drop policy if exists "allow_all" on public.batches` — manual SQL step |



# 1. Decompress ZIP into project root (macOS double-click or):
unzip -o openbank-v754.zip -d /path/to/openbank-price-prediction

# 2. Stage changed files
git add src/components/AllStocksPage.jsx \
        src/components/SettingsPage.jsx \
        src/index.html \
        package.json

# 3. Commit
git commit -m "fix: market badge alignment + dark mode email + favicon (v7.5.4)

AllStocksPage.jsx: market badge alignment in ticker column.
SettingsPage.jsx: email text visible in dark mode.
index.html: favicon link to suppress 404 error.
Supabase: removed redundant allow_all policy on batches (manual step).
Tests: 164/164 passing"

# 4. Tag
git tag v7.5.4

# 5. Push
git push origin main --tags

# ===========================================================================
# STEP 149 — v7.5.6  All Stocks — Top 5 picks + Best only filter
# ===========================================================================
#
# NO SUPABASE CHANGES.
# NO npm install needed.
#
# WHAT'S NEW:
#
#   src/components/AllStocksPage.jsx:
#     topPicksCriteria state — 'upside' (default) | 'score'
#       'upside': ranks Top 5 by upside of selected horizon — works without
#                 fundamentals. Only tickers with upside > 0 qualify.
#       'score':  ranks Top 5 by Investment Score — requires Refresh Fundamentals.
#       Toggle control rendered in the Top picks header row.
#
#     topPicks useMemo — computes Top 5 from ALL stocks (ignores active filters)
#       so the ranking is always the full universe, not the filtered subset.
#
#     TopPicks section — 5 cards between KPIs and filter bar:
#       #1 card has violet border accent.
#       Each card: rank, ticker (display), company, upside %, sector, Score badge.
#       Clicking a card navigates to that ticker's batch in Batch Overview.
#       Grid is responsive: always fills 5 equal columns.
#
#     bestOnly state + filteredFinal useMemo:
#       When bestOnly=true, applies upside > 0 (mandatory) and score >= 60
#       only when score is available — never hides tickers without fundamentals.
#       filteredFinal replaces filtered as the input to sorted useMemo.
#
#     Best only button — in filter bar, before stock count:
#       Zap icon (lucide-react). Green when active.
#       Inline hint text: "upside > 0 · score ≥ 60 if available"
#       Can be combined with all existing filters (market/sector/PEG/score min).
#
#     Zap imported from lucide-react.
#
#   src/components/HelpPage.jsx:
#     New section 5: "All Stocks — Top picks & Best only filter"
#       Explains Top 5: upside vs score criteria, how cards work, click behaviour.
#       Investment Score table: Upside 40% / PEG 45% / Net Margin 15%.
#       Documents u12 → u6 → u3 fallback for batches without 12M.
#       Score badge colour guide (purple/blue/amber/grey).
#       Best only: exact filter conditions documented.
#     Previous section 5 (Verify your data) renumbered to 6.
#     JSDoc updated: 6 sections listed.
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.6/. .

git add src/components/AllStocksPage.jsx src/components/HelpPage.jsx
git commit -m "feat: All Stocks Top 5 picks + Best only filter (v7.5.6)

AllStocksPage.jsx:
  topPicksCriteria state: 'upside' (default) | 'score' toggle.
  topPicks useMemo: Top 5 from full stock universe, independent of filters.
  TopPicks section: 5 cards between KPIs and filter bar.
    Rank, ticker, company, upside %, sector, Score badge per card.
    #1 card highlighted with violet border.
    Click navigates to ticker batch in Batch Overview.
  bestOnly state + filteredFinal useMemo:
    upside > 0 mandatory. score >= 60 only when fundamentals loaded.
    Never hides tickers without fundamentals (high upside but no score).
  Best only button: Zap icon, green when active, in filter bar.
  Zap added to lucide-react import.

HelpPage.jsx:
  New section 5: All Stocks — Top picks & Best only filter.
  Investment Score table (Upside 40% / PEG 45% / Margin 15%).
  u12 → u6 → u3 fallback documented.
  Best only filter conditions documented.
  Verify section renumbered to 6.

Tests: 164/164 passing"

git tag v7.5.6
git push origin main --tags


# ===========================================================================
# STEP 150 — v7.5.7  All Stocks — real upside from today's price
# ===========================================================================
#
# NO SUPABASE CHANGES.
# NO npm install needed.
#
# WHAT'S NEW:
#
#   src/components/AllStocksPage.jsx:
#
#   getRefPrice(s) useCallback:
#     Returns the best available reference price for a stock.
#     Cascade: latest weekly close (Supabase, updated every Saturday)
#              → autoPrices (live Twelve Data / Alpha Vantage fetch)
#              → basePrice (batch snapshot — fallback only)
#
#   getUpsideHoy(s, tKey) useCallback:
#     upsideHoy = (target − refPrice) / refPrice × 100
#     Positive = target still reachable from today's price.
#     Negative = price already exceeded target.
#
#   topPicks useMemo updated:
#     Now ranks by upsideHoy instead of upsideBase.
#     Stale batch prices no longer inflate the ranking for old batches.
#     Cards show real upside from today.
#
#   filteredFinal useMemo updated:
#     bestOnly filter now uses upsideHoy > 0 instead of upsideBase > 0.
#     Hides stocks that have already reached or exceeded their target.
#
#   "vs Target" column renamed to "Left to target":
#     Formula inverted: was (price − target) / target
#                       now (target − price) / price  [= upsideHoy]
#     Color: green if positive (recorrido pendiente), red if negative
#            (precio ya superó el target).
#     Was blue/red — now green/red to match upside color convention.
#     Tooltip updated to explain refPrice cascade and new formula.
#     Footer sort label updated: "vs Target" → "Left to target".
#
#   useCallback added to React import.
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.7/. .

git add src/components/AllStocksPage.jsx
git commit -m "feat: Left to target column + real upside from today's price (v7.5.7)

AllStocksPage.jsx:
  getRefPrice(s): weekly close → autoPrices → basePrice cascade.
  getUpsideHoy(s, tKey): (target - refPrice) / refPrice × 100.

  topPicks: ranks by upsideHoy — no longer inflated by stale batch prices.
  filteredFinal/bestOnly: uses upsideHoy > 0 to filter.

  'vs Target' renamed to 'Left to target':
    Formula inverted to (target - refPrice) / refPrice.
    Green if positive (recorrido pendiente), red if exceeded.
    Tooltip updated with refPrice cascade explanation.

  useCallback added to React import.

Tests: 164/164 passing"

git tag v7.5.7
git push origin main --tags


# ===========================================================================
# STEP 151 — v7.5.8  Fix: getRefPrice/getUpsideHoy declaration order
# ===========================================================================
#
# NO SUPABASE CHANGES.
# NO npm install needed.
#
# BUG FIXED:
#   ReferenceError: Cannot access 'ge' before initialization
#   Root cause: getRefPrice and getUpsideHoy were declared (useCallback)
#   AFTER filteredFinal and topPicks (useMemo) that consume them.
#   Unlike regular function declarations, useCallback expressions are NOT
#   hoisted — they must appear before any useMemo that references them.
#
# FIX:
#   Moved getRefPrice and getUpsideHoy declarations to BEFORE filteredFinal.
#   Correct order in component body:
#     1. getRefPrice    (useCallback)
#     2. getUpsideHoy   (useCallback — depends on getRefPrice)
#     3. filteredFinal  (useMemo    — depends on getUpsideHoy)
#     4. topPicks       (useMemo    — depends on getUpsideHoy)
#     5. sorted         (useMemo    — depends on filteredFinal)
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.8/. .

git add src/components/AllStocksPage.jsx
git commit -m "fix: getRefPrice/getUpsideHoy declaration order (v7.5.8)

ReferenceError: Cannot access before initialization on AllStocksPage load.
useCallback expressions are not hoisted — must be declared before the
useMemo hooks that consume them.

Correct order: getRefPrice → getUpsideHoy → filteredFinal → topPicks → sorted.

Tests: 164/164 passing"

git tag v7.5.8
git push origin main --tags


# ===========================================================================
# STEP 152 — v7.5.9  Supabase price functions overhaul
# ===========================================================================
#
# NO React app changes — documentation and SQL only.
# NO npm install needed.
#
# WHAT'S NEW:
#
#   docs/supabase_setup.sql (v7.5.2 → v7.5.9):
#     New tables: fetch_log, fetch_log_summary (Section 1)
#     fetch_expired_horizons(): 5-day lookback window for US (time_series)
#       and EU (Yahoo Finance period1/period2). Replaces /eod exact date.
#       Picks closest trading day <= targetDate. Fixes weekend/holiday expiry.
#     fetch_weekly_prices(): unique-ticker architecture. ~30 API calls (was ~200).
#       pg_sleep 8s → 2s. Persistent logging to fetch_log + fetch_log_summary.
#       Fixes 2-minute Supabase cron timeout.
#     fetch_weekly_prices_recovery(): new function (Section 6b).
#       Retries missing weekly_prices rows for last Friday. Safety net for
#       rate limit drops and transient failures.
#     Section 8 crons: Job 8 added — recovery-weekly-prices Mon 06:00 UTC.
#
#   docs/SUPABASE.md (v7.4.10 → v7.5.9):
#     Section 1: fetch_log and fetch_log_summary table schemas added.
#     Section 2: fetch_expired_horizons docs updated (lookback window).
#       fetch_weekly_prices docs updated (unique-ticker architecture).
#       fetch_weekly_prices_recovery() new section.
#     Section 3: Job 8 added to cron table.
#     Section 9: Bug #6 (weekend expiry), Bug #7 (timeout), Bug #8 (silent
#       rate limit drops) added to Known issues.
#     Section 10: New verification queries — pending weekly prices, failed
#       tickers, fetch_log_summary, awaiting past targetDate.
#
#   docs/openbank-forecast-uml.md:
#     ERD: fetch_log and fetch_log_summary entities added.
#     Cron gantt: Job 8 (Monday recovery) added.
#     fetch_weekly_prices sequence diagram: updated to unique-ticker
#       architecture with fetch_log fan-out.
#     fetch_weekly_prices_recovery(): new sequence diagram added.
#
#   README.md:
#     Changelog: v7.5.4 through v7.5.9 entries added.
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.9/. .

git add docs/supabase_setup.sql docs/SUPABASE.md docs/openbank-forecast-uml.md README.md
git commit -m "docs: Supabase price functions overhaul (v7.5.9)

supabase_setup.sql:
  New tables: fetch_log, fetch_log_summary.
  fetch_expired_horizons: 5-day lookback window (fixes weekend/holiday expiry).
  fetch_weekly_prices: unique-ticker architecture (fixes 2-min timeout).
    pg_sleep 8s→2s. Persistent logging.
  fetch_weekly_prices_recovery: new function — retries missing rows.
  Job 8: recovery-weekly-prices cron Mon 06:00 UTC.

SUPABASE.md:
  fetch_log + fetch_log_summary schemas.
  fetch_expired_horizons: lookback window documented.
  fetch_weekly_prices: unique-ticker architecture documented.
  fetch_weekly_prices_recovery: new section.
  Job 8 in cron table.
  Bug #6 (weekend expiry), #7 (timeout), #8 (silent rate limit).
  New verification queries.

openbank-forecast-uml.md:
  ERD: fetch_log, fetch_log_summary entities.
  Gantt: Job 8 added.
  fetch_weekly_prices sequence diagram updated.
  fetch_weekly_prices_recovery sequence diagram new.

README.md: changelog v7.5.4 → v7.5.9."

git tag v7.5.9
git push origin main --tags


# ===========================================================================
# STEP 153 — v7.5.10  Watchlist overhaul + smallest batch auto-load + scroll highlight
# ===========================================================================
#
# NO SUPABASE CHANGES.
# NO npm install needed.
#
# WHAT'S NEW:
#
#   src/App.jsx:
#     Auto-load on startup: smallest batch (fewest tickers) instead of most
#       recent. Minimises Twelve Data / Alpha Vantage API calls on first render.
#     handleLoadBatch: accepts optional scrollToTicker param. Sets
#       highlightTicker state for 2.5s then clears it.
#     newStocks sorted A→Z before setStocks on every batch load.
#     highlightTicker prop passed to BatchSimple.
#
#   src/components/WatchlistPage.jsx:
#     ColTooltip — info-icon tooltip on all 8 column headers.
#     evaluateProvisional() — estimated verdict for open horizons using
#       weekly → autoPrices cascade (same as Left to target).
#       Displayed as "~ Label" with opacity-70 to distinguish from real verdict.
#     buildGroupedRows() replaces buildStockRows():
#       One group per ticker. Summary row = latest batch.
#       batchRows[] = all batches for expand panel.
#       avgUpside = mean horizon upside across all batches.
#     horizon state (default '12M') — pill toggle 1M/3M/6M/12M in header.
#       All columns (upside, left to target, verdict) react to selection.
#     legendOpen state — collapsible column guide panel under KPIs.
#     expandedTickers state — Set of tickers with expanded batch history.
#     New columns: {H} Upside · Avg upside · Left to target (was vs Target).
#     Left to target: (target - refPrice) / refPrice. Green if positive
#       (still reachable), red if negative (already exceeded).
#     KPI labels: "Left to target ↑" / "Exceeded target".
#     Expand chevron shown only when batchCount > 1.
#     onLoadBatch called with scrollToTicker when opening from detail panel.
#
#   src/components/BatchSimple.jsx:
#     highlightTicker prop — on change, scrolls to matching row (smooth)
#       and applies violet highlight class for 2.5s via highlightTicker state.
#     Stocks rendered A→Z in table (defensive — App already sorts on load).
#     useEffect + useRef added to React import.
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.10/. .

git add src/App.jsx src/components/WatchlistPage.jsx src/components/BatchSimple.jsx
git commit -m "feat: Watchlist overhaul + smallest batch auto-load + scroll highlight (v7.5.10)

App.jsx:
  Auto-load smallest batch on startup (minimize API calls).
  handleLoadBatch: optional scrollToTicker → highlightTicker 2.5s.
  Stocks sorted A→Z on every batch load.
  highlightTicker prop passed to BatchSimple.

WatchlistPage.jsx:
  Horizon toggle 1M/3M/6M/12M — upside, left to target, verdict react.
  Grouped rows: one per ticker, expand to see all batches + avg upside.
  Left to target: (target - refPrice) / refPrice (green/red).
  Provisional verdict (~) for open horizons via weekly→autoPrices cascade.
  ColTooltip on all column headers.
  Collapsible column guide panel (legendOpen).
  KPI labels updated.

BatchSimple.jsx:
  highlightTicker: scroll-to + violet highlight 2.5s.
  Stocks rendered A→Z.

Tests: 164/164 passing"

git tag v7.5.10
git push origin main --tags


# ===========================================================================
# STEP 154 — v7.5.11  Fix: WatchlistPage rows is not defined
# ===========================================================================
#
# NO SUPABASE CHANGES.
# NO npm install needed.
#
# BUG FIXED:
#   ReferenceError: rows is not defined on WatchlistPage load.
#   Root cause: market filter badge used rows.length (old variable name)
#   after buildStockRows was replaced by buildGroupedRows in v7.5.10.
#   The variable was renamed to filteredGroups but one reference was missed.
#
# FIX:
#   WatchlistPage.jsx line ~578:
#     rows.length → filteredGroups.length in the All (N) badge.
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.11/. .

git add src/components/WatchlistPage.jsx
git commit -m "fix: WatchlistPage rows is not defined (v7.5.11)

rows.length → filteredGroups.length in market filter All badge.
Stray reference from buildStockRows → buildGroupedRows rename in v7.5.10.

Tests: 164/164 passing"

git tag v7.5.11
git push origin main --tags


# ===========================================================================
# STEP 154 — v7.5.11  Fix: rows is not defined in WatchlistPage
# ===========================================================================
#
# NO SUPABASE CHANGES.
# NO npm install needed.
#
# BUG FIXED:
#   ReferenceError: rows is not defined on WatchlistPage load.
#   Root cause: market filter badge used rows.length after buildStockRows()
#   was renamed to buildGroupedRows() in v7.5.10. The variable `rows` no
#   longer exists — replaced by `filteredGroups`.
#
# FIX:
#   WatchlistPage.jsx line ~578:
#     rows.length → filteredGroups.length
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.11/. .

git add src/components/WatchlistPage.jsx
git commit -m "fix: rows is not defined in WatchlistPage market filter badge (v7.5.11)

rows.length → filteredGroups.length in All badge.
rows was removed in v7.5.10 when buildStockRows() was replaced
by buildGroupedRows() but one reference was missed.

Tests: 164/164 passing"

git tag v7.5.11
git push origin main --tags


# ===========================================================================
# STEP 155 — v7.5.12  WatchlistPage — sticky header + expand by badge click
# ===========================================================================
#
# NO SUPABASE CHANGES.
# NO npm install needed.
#
# WHAT'S NEW:
#
#   src/components/WatchlistPage.jsx:
#     Sticky table header: th elements get position sticky + top-0 + z-10
#       + bg-muted/80 + backdrop-blur-sm. The scroll container (overflow-auto
#       flex-1) was already correct — only the th styles were missing.
#     Expand by badge click: the "N batches" badge now calls toggleExpand()
#       on click (stopPropagation to avoid row selection). Only active when
#       batchCount > 1. Badge gets cursor-pointer + hover:opacity-70.
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.12/. .

git add src/components/WatchlistPage.jsx
git commit -m "fix: WatchlistPage sticky header + expand by batches badge (v7.5.12)

WatchlistPage.jsx:
  th: sticky top-0 z-10 bg-muted/80 backdrop-blur-sm — header stays
    visible while scrolling the ticker list.
  Batches badge: onClick toggleExpand when batchCount > 1.
    cursor-pointer + hover:opacity-70. stopPropagation to avoid
    triggering row selection.

Tests: 164/164 passing"

git tag v7.5.12
git push origin main --tags


# ===========================================================================
# STEP 156 — v7.5.13  WatchlistPage — fix sticky header + fix expand + split columns
# ===========================================================================
#
# NO SUPABASE CHANGES.
# NO npm install needed.
#
# BUGS FIXED:
#
#   1. Sticky header not working:
#      overflow-hidden on the left panel div was creating a new stacking
#      context that blocked position:sticky on th elements. Fixed by removing
#      overflow-hidden and using minHeight:0 instead (flex shrink constraint).
#
#   2. Batch expand not working:
#      toggleExpand was calling setExpandedTickers with a mutated Set.
#      React uses referential equality to detect state changes — mutating
#      and returning the same Set object caused no re-render.
#      Fixed: create new Set(prev), mutate copy, return copy.
#
#   3. Star and chevron now in separate columns:
#      Previously combined in one td with flex. Now two independent td/th
#      elements — cleaner layout, easier to click individually.
#      Expanded rows updated to emit 2 trailing empty cells.
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.13/. .

git add src/components/WatchlistPage.jsx
git commit -m "fix: WatchlistPage sticky header + expand + split star/chevron columns (v7.5.13)

1. Sticky header: remove overflow-hidden from left panel (was blocking
   position:sticky on th). Use minHeight:0 flex constraint instead.
2. Expand by badge/chevron: fix toggleExpand — was mutating same Set
   reference causing no re-render. Now creates new Set copy.
3. Star and chevron in separate columns (was one combined td).
   Expanded rows updated to 2 trailing empty cells.

Tests: 164/164 passing"

git tag v7.5.13
git push origin main --tags


# ===========================================================================
# STEP 157 — v7.5.14  WatchlistPage — fix provisional verdict line break
# ===========================================================================
#
# NO SUPABASE CHANGES.
# NO npm install needed.
#
# BUG FIXED:
#   Provisional verdict badge (~Exceeded, ~Miss etc.) was wrapping to two
#   lines making rows taller and the star/chevron columns appear misaligned.
#   Fixed: whitespace-nowrap on provisional span and verdict td.
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.14/. .

git add src/components/WatchlistPage.jsx
git commit -m "fix: provisional verdict badge whitespace-nowrap (v7.5.14)

~ Exceeded / ~ Miss badges were wrapping to two lines causing
row height inflation and misaligned star/chevron columns.
Added whitespace-nowrap to provisional span and verdict td.

Tests: 164/164 passing"

git tag v7.5.14
git push origin main --tags


# ===========================================================================
# STEP 157 — v7.5.14  WatchlistPage — remove redundant expand chevron
# ===========================================================================
#
# NO SUPABASE CHANGES.
# NO npm install needed.
#
# WHAT CHANGED:
#   Expand chevron column removed entirely from WatchlistPage table.
#   The expand behaviour is already available by clicking the "N batches"
#   badge — the chevron was redundant and caused visual clutter next to
#   the star button.
#   Batches column tooltip updated to reflect badge-click behaviour.
#   Expanded rows trailing empty cell count corrected (2 → 1).
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.14/. .

git add src/components/WatchlistPage.jsx
git commit -m "fix: remove redundant expand chevron from WatchlistPage (v7.5.14)

Chevron column removed — expand already works via batches badge click.
Batches tooltip updated: 'Click this badge to expand'.
Expanded rows trailing cell count corrected.

Tests: 164/164 passing"

git tag v7.5.14
git push origin main --tags


# ===========================================================================
# STEP 158 — v7.5.15  WatchlistPage — fix ColTooltip clipped by sticky header
# ===========================================================================
#
# NO SUPABASE CHANGES. NO npm install needed.
#
# BUG FIXED:
#   ColTooltip was positioned bottom (above the th) — clipped by the
#   overflow-auto scroll container. Fixed by positioning top (below the th)
#   into the table content area where no clipping occurs.
#   z-index raised to z-[100] to stay above sticky th (z-10) and any
#   other positioned elements.
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.15/. .

git add src/components/WatchlistPage.jsx
git commit -m "fix: ColTooltip clipped by sticky header — show below th (v7.5.15)

Tooltip repositioned from bottom to top-[calc(100%+4px)] so it opens
downward into the table content area, avoiding overflow-auto clipping.
z-index raised to z-[100].

Tests: 164/164 passing"

git tag v7.5.15
git push origin main --tags


# ===========================================================================
# STEP 159 — v7.5.16  WatchlistPage — fix ColTooltip using fixed positioning
# ===========================================================================
#
# NO SUPABASE CHANGES. NO npm install needed.
#
# BUG FIXED:
#   ColTooltip tooltip was clipped by the table scroll container because
#   it used position:absolute inside a sticky th inside overflow:auto.
#   Fix: copied the ColTooltip pattern from AllStocksPage which uses
#   position:fixed with getBoundingClientRect() to calculate screen coords.
#   Tooltip now renders at viewport level — impossible to clip.
#   useRef added to React import.
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.16/. .

git add src/components/WatchlistPage.jsx
git commit -m "fix: ColTooltip fixed positioning in WatchlistPage (v7.5.16)

Replace position:absolute tooltip with position:fixed pattern from
AllStocksPage. Uses getBoundingClientRect() on mouseenter to position
tooltip at viewport coords — escapes all overflow/sticky clipping.
useRef added to React import.

Tests: 164/164 passing"

git tag v7.5.16
git push origin main --tags


# ===========================================================================
# STEP 160 — v7.5.17  Sticky headers AllStocks + BatchOverviewDetail + Watchlist tooltip style
# ===========================================================================
#
# NO SUPABASE CHANGES. NO npm install needed.
#
# WHAT'S NEW:
#
#   src/components/WatchlistPage.jsx:
#     ColTooltip text: text-[11px] text-muted-foreground → text-sm text-foreground.
#       Matches AllStocksPage tooltip visual style (larger, darker text).
#     th: removed uppercase + tracking-wide, font-semibold → font-bold.
#       bg-muted/80 backdrop-blur-sm → bg-card. Matches AllStocksPage style.
#
#   src/components/AllStocksPage.jsx:
#     All th elements: added sticky top-0 z-10 bg-card.
#     Container is overflow-visible so page scroll is used — sticky works.
#
#   src/components/StockTable.jsx:
#     Th component: added sticky top-0 z-10 bg-card to th className.
#     Container is overflow-x-auto only — vertical scroll is page scroll.
#     Sticky works without any container changes.
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.17/. .

git add src/components/WatchlistPage.jsx src/components/AllStocksPage.jsx src/components/StockTable.jsx
git commit -m "feat: sticky column headers AllStocks + BatchOverview + Watchlist tooltip style (v7.5.17)

WatchlistPage.jsx:
  ColTooltip: text-sm text-foreground (matches AllStocksPage style).
  th: removed uppercase/tracking-wide, font-bold, bg-card.

AllStocksPage.jsx:
  All th: sticky top-0 z-10 bg-card.

StockTable.jsx:
  Th component: sticky top-0 z-10 bg-card.

Tests: 164/164 passing"

git tag v7.5.17
git push origin main --tags


# ===========================================================================
# STEP 161 — v7.5.18  StockTable sticky thead + WatchlistPage tooltip word-wrap
# ===========================================================================
#
# NO SUPABASE CHANGES. NO npm install needed.
#
# WHAT'S NEW:
#
#   src/components/StockTable.jsx:
#     thead: className="sticky top-0 z-10" — sticky on the whole thead
#       instead of individual th elements. This works correctly with the
#       overflow-x-auto container because sticky on thead is relative to
#       the table, while the vertical scroll comes from main (overflowY:auto).
#     tr: bg-muted → bg-card so the sticky header has solid background.
#
#   src/components/WatchlistPage.jsx:
#     ColTooltip tooltip div: added whiteSpace:'normal' + wordWrap:'break-word'
#       to prevent the tooltip text from rendering on a single line.
#       The th parent has whitespace-nowrap which was being inherited.
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.18/. .

git add src/components/StockTable.jsx src/components/WatchlistPage.jsx
git commit -m "fix: StockTable sticky thead + WatchlistPage tooltip word-wrap (v7.5.18)

StockTable.jsx:
  thead className='sticky top-0 z-10' (was on individual th).
  tr bg-muted → bg-card for solid sticky background.

WatchlistPage.jsx:
  ColTooltip: whiteSpace:normal + wordWrap:break-word to prevent
  single-line tooltip inheriting whitespace-nowrap from th parent.

Tests: 164/164 passing"

git tag v7.5.18
git push origin main --tags


# ===========================================================================
# STEP 162 — v7.5.19  StockTable: overflow-x-clip fixes sticky thead
# ===========================================================================
#
# NO SUPABASE CHANGES. NO npm install needed.
#
# BUG FIXED:
#   overflow-x-auto on the table container was creating a new scroll context
#   that blocked position:sticky on thead. overflow-x-clip clips horizontal
#   content the same way but does NOT create a new scroll context, so the
#   vertical sticky works correctly relative to main (overflowY:auto).
#   One word change: overflow-x-auto → overflow-x-clip.
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.5.19/. .

git add src/components/StockTable.jsx
git commit -m "fix: StockTable overflow-x-clip fixes sticky thead (v7.5.19)

overflow-x-auto → overflow-x-clip on table container.
overflow-x-clip clips horizontal content without creating a new
scroll context — thead sticky now works relative to main.

Tests: 164/164 passing"

git tag v7.5.19
git push origin main --tags


# ===========================================================================
# STEP 163 — v7.6.0  Supabase failure email alerts + fetch_expired_horizons logging
# ===========================================================================
#
# SUPABASE CHANGES — must be deployed manually (SQL editor + Vault + EmailJS).
# NO npm install. NO src/ changes — Supabase functions + docs only.
#
# WHAT'S NEW:
#
#   docs/supabase_setup.sql:
#     + notify_fetch_failure(function_name, run_date, inserted, skipped,
#         failed, failed_tickers) — new SECTION 4.5.
#       Reads emailjs_service_id / emailjs_template_id_supabase /
#       emailjs_public_key / emailjs_private_key from Vault, POSTs to
#       https://api.emailjs.com/api/v1.0/email/send via http_post(), and
#       logs the result to fetch_log (function='notify_fetch_failure').
#       Sends accessToken = emailjs_private_key (required by EmailJS
#       "Use Private Key" strict mode).
#     ~ fetch_expired_horizons(): added v_inserted/v_skipped/v_failed/
#       v_start_ts, per-prediction fetch_log inserts (inserted=verdict
#       evaluated, skipped=invalid targetPrice, failed=no close/exception),
#       per-prediction exception handler, fetch_log_summary at the end, and
#       notify_fetch_failure() when v_failed > 0.
#     ~ fetch_weekly_prices() + fetch_weekly_prices_recovery(): added the
#       notify_fetch_failure() call before the fetch_log_summary insert.
#
#   docs/SUPABASE.md:
#     + Section 2: notify_fetch_failure() subsection + logging/alert steps
#       added to the three fetch functions.
#     + Section 4: emailjs_service_id / emailjs_template_id_supabase /
#       emailjs_public_key / emailjs_private_key rows in the Vault table.
#
#   README.md: v7.6.0 changelog row.
#
# DEPLOY (one-off, in order):
#   1. Vault: add the EmailJS private key
#        select vault.create_secret('<private_key>', 'emailjs_private_key');
#      (emailjs_service_id / emailjs_template_id_supabase / emailjs_public_key
#       were already present.)
#   2. EmailJS dashboard (template_ryfy271):
#        - To Email  -> {{to_email}}
#        - Subject   -> "⚠️ Supabase fetch failure: {{function_name}}"
#        - Account → Security: "Allow EmailJS API for non-browser applications"
#          AND "Use Private Key" enabled.
#   3. Supabase SQL editor: run the 4 functions from docs/supabase_setup.sql
#      (notify_fetch_failure, fetch_expired_horizons, fetch_weekly_prices,
#       fetch_weekly_prices_recovery). No cron changes.
#   4. Smoke test:
#        select notify_fetch_failure('manual_test', current_date, 0, 0, 1, 'TEST');
#        select * from fetch_log where function='notify_fetch_failure'
#          order by created_at desc limit 1;   -- expect status='inserted'
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.6.0/. .

git add docs/supabase_setup.sql docs/SUPABASE.md README.md GIT_GUIDE.md
git commit -m "feat: Supabase failure email alerts + fetch_expired_horizons logging (v7.6.0)

notify_fetch_failure() (new):
  Reads EmailJS secrets from Vault, POSTs to EmailJS via http_post()
  with accessToken=emailjs_private_key, logs result to fetch_log.

fetch_expired_horizons():
  Persistent logging (fetch_log + fetch_log_summary), per-prediction
  exception handler, notify_fetch_failure() when failed > 0.

fetch_weekly_prices() + fetch_weekly_prices_recovery():
  notify_fetch_failure() call before the summary insert.

Vault: emailjs_private_key required (EmailJS Use Private Key strict mode).
Docs: SUPABASE.md + README.md updated.
No src/ changes."

git tag -a v7.6.0 -m "v7.6.0: Supabase failure email alerts + fetch_expired_horizons logging"
git push origin main
git push origin v7.6.0


# ===========================================================================
# STEP 164 — v7.6.1  Supabase cron watchdog (check_cron_health)
# ===========================================================================
#
# SUPABASE CHANGES — deploy manually (SQL editor + new cron job).
# NO npm install. NO src/ changes — Supabase function + docs only.
#
# WHAT'S NEW:
#
#   docs/supabase_setup.sql:
#     + check_cron_health() — new SECTION 7.5. Watchdog that covers the gap
#       the v7.6.0 email can't: a cron that never runs or is cancelled by
#       timeout. Reads only our own tables (no cron schema access). Checks:
#         1. awaiting horizons overdue >3 days
#         2. no weekly/recovery fetch_log_summary in >8 days
#         3. no expired fetch_log_summary in >3 days
#       On anomaly -> reuses notify_fetch_failure('cron_health_check', ...)
#       (no new EmailJS template). Logs WATCHDOG row to fetch_log + a
#       fetch_log_summary row every run.
#     + SECTION 8: new cron job 9 'cron-health-check' '0 7 * * 1,4'
#       (Mon + Thu 07:00 UTC).
#
#   docs/SUPABASE.md:
#     + Section 2: check_cron_health() subsection.
#     + Section 3: Job 9 row in the cron table.
#
#   README.md: v7.6.1 changelog row.
#
# DEPLOY (in order):
#   1. Supabase SQL editor: run check_cron_health() from docs/supabase_setup.sql.
#   2. Schedule the cron job:
#        select cron.schedule('cron-health-check', '0 7 * * 1,4',
#                             'select check_cron_health();');
#   3. Smoke test (forces an anomaly only if one exists; safe to run):
#        select check_cron_health();
#        select run_date, function, inserted, skipped, failed, duration_s
#        from fetch_log_summary
#        where function = 'check_cron_health'
#        order by created_at desc limit 1;
#      failed = 0  -> all crons healthy (no email).
#      failed > 0  -> anomaly detected, alert email sent.
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.6.1/. .

git add docs/supabase_setup.sql docs/SUPABASE.md README.md GIT_GUIDE.md
git commit -m "feat: Supabase cron watchdog check_cron_health (v7.6.1)

check_cron_health() (new, Job 9, Mon+Thu 07:00 UTC):
  Detects a cron that never runs / is cancelled by timeout — the gap
  the v7.6.0 email cannot cover. Checks awaiting horizons overdue >3d,
  weekly summary stale >8d, expired summary stale >3d. On anomaly reuses
  notify_fetch_failure('cron_health_check', ...) (no new EmailJS template).
  Logs to fetch_log + fetch_log_summary.

Cron: new job 9 'cron-health-check' '0 7 * * 1,4'.
Docs: SUPABASE.md + README.md updated.
No src/ changes."

git tag -a v7.6.1 -m "v7.6.1: Supabase cron watchdog check_cron_health"
git push origin main
git push origin v7.6.1


# ===========================================================================
# STEP 165 — v7.7.0  Accuracy Stats chart redesign (per-horizon lines) + branch workflow doc
# ===========================================================================
#
# NO SUPABASE CHANGES. NO npm install needed. Frontend only — one component.
#
# WHAT'S NEW:
#
#   src/components/AccuracyChart.jsx:
#     - AreaChart (single averaged line) replaced by MultiLineChart.
#     - One line per horizon (1M / 3M / 6M / 12M) + a Global aggregate line
#       (= the average that was drawn before v7.7.0). Horizon colours match
#       the horizon cards (H_COLORS.bar); Global uses var(--foreground) so it
#       stays legible in light and dark themes.
#     - Clickable legend (hidden state via useState) toggles each line; the
#       Y axis rescales to the visible series only. "Select a series" empty
#       state when all are hidden.
#     - Multi-series hover tooltip — one row per visible horizon at the
#       hovered batch, plus the vertical guide line.
#     - Smoothed lines via monotone cubic interpolation (smoothPath, no
#       overshoot — a flat segment between two equal values stays flat,
#       so the curve never dips below the axis) with a subtle fill under
#       Global. Lines split at nulls (toSegments) so legacy 12M / not-yet-
#       matured horizons don't bridge gaps.
#     - X-axis batch labels rotated -40deg, fontSize 11 (was horizontal, 9).
#
#   DATA: no changes. stats.chartData is already [s1M, s3M, s6M, s12M] from
#   useHistory.computed() (hit% per horizon per batch). useHistory.js and
#   Supabase are untouched — this is a pure presentation change.
#
#   README.md: v7.7.0 changelog row + new "Development workflow" section
#   linking docs/GIT_WORKFLOW.md.
#
#   docs/GIT_WORKFLOW.md (new): branch + Vercel preview workflow — branch
#   naming, create -> test -> merge -> annotated tag, local .env vs Vercel
#   env vars, preview caveats (Google OAuth, shared Supabase DB, Preview env
#   vars), rollback. Adopted from v7.7.0 onward.
#
# TEST NOTE: run `npm run test:run`. If a component test asserted the old
#   AreaChart internals (e.g. the "Accuracy" single-series tooltip text or the
#   areaG gradient), update it to the new MultiLineChart legend/tooltip. No
#   logic in useHistory/stats changed, so the data-layer tests are unaffected.
#
find . -not -path './.git/*' -not -path './public/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.7.0/. .

git add src/components/AccuracyChart.jsx docs/GIT_WORKFLOW.md README.md GIT_GUIDE.md
git commit -m "feat: Accuracy Stats chart redesign — per-horizon lines (v7.7.0)

AccuracyChart: AreaChart (single averaged line) -> MultiLineChart.
- One line per horizon (1M/3M/6M/12M) + Global aggregate line.
- Clickable legend toggles each line; Y axis rescales to visible series.
- Multi-series hover tooltip; smoothed monotone-cubic curves (no
  overshoot); subtle fill
  under Global; segments split at nulls (legacy 12M / immature horizons).
- Diagonal X-axis batch labels (rotate -40deg, fontSize 11).

No data/backend changes: stats.chartData is already per-horizon
([s1M,s3M,s6M,s12M]) from useHistory.computed(). useHistory.js and
Supabase untouched.

Docs: new docs/GIT_WORKFLOW.md (branch + Vercel preview workflow),
linked from README. Adopted from v7.7.0 onward."

git tag -a v7.7.0 -m "v7.7.0: Accuracy Stats chart redesign — per-horizon lines"
git push origin main
git push origin v7.7.0


# ===========================================================================
# STEP 166 — v7.7.1  Fix: Email report button on Batch Overview page
# ===========================================================================
#
# NO SUPABASE CHANGES. NO npm install needed. Frontend only — one component.
#
# WHAT'S NEW:
#
#   src/App.jsx:
#     - The Email report button (Header) shows on both batch pages and toggles
#       showEmail, but the <EmailPreview> modal was only rendered inside the
#       activePage === 'batch-detail' block — so on the 'batch' (Batch Overview)
#       page the button did nothing.
#     - Moved the {showEmail && <EmailPreview/>} render out of the batch-detail
#       block to a single shared spot right after <Header/>, gated to batch
#       pages: ['batch','batch-detail'].includes(activePage). Now it works on
#       both Batch Overview and Batch Overview Detail.
#     - No change to EmailPreview.jsx or its styling (it already worked on
#       batch-detail). The Batch Overview email uses the current global horizon.
#
#   README.md: v7.7.1 changelog row.
#
# Apply on a feature branch (see docs/GIT_WORKFLOW.md):
git checkout main && git pull origin main
git checkout -b fix/email-report
unzip -o ~/Downloads/openbank-price-prediction_v7.7.1.zip -d .
npm run test:run
git add src/App.jsx README.md GIT_GUIDE.md
git commit -m "fix: Email report button works on Batch Overview page (v7.7.1)

The Email report button (Header) appears on both batch pages and toggles
showEmail, but <EmailPreview> was only rendered inside the batch-detail
block, so on the Batch Overview page the button did nothing.

Move the {showEmail && <EmailPreview/>} render to a single shared spot
after <Header/>, gated to batch pages. No change to EmailPreview.jsx."
git push origin fix/email-report
# → verify the Vercel preview, then merge:
git checkout main
git merge --no-ff --no-edit fix/email-report
git tag -a v7.7.1 -m "v7.7.1: fix Email report button on Batch Overview"
git push origin main
git push origin v7.7.1
git branch -d fix/email-report
git push origin --delete fix/email-report   # opcional


# ===========================================================================
# STEP 167 — v7.8.0  Vercel Web Analytics
# ===========================================================================
#
# Adds the @vercel/analytics dependency (npm i). NO SUPABASE CHANGES.
#
# WHAT'S NEW:
#
#   src/App.jsx:
#     - import { Analytics } from '@vercel/analytics/react'
#     - <Analytics /> rendered once at the app root (after </main>).
#
#   package.json + package-lock.json: @vercel/analytics added (from `npm i`).
#   README.md: v7.8.0 changelog row.
#
#   NOTE: the SPA navigates by internal state (activePage), not URLs, so
#   Analytics counts visitors/sessions; internal sections are NOT separate
#   pageviews. Make sure Web Analytics is enabled for the project in the
#   Vercel dashboard.
#
# Apply on a feature branch (see docs/GIT_WORKFLOW.md):
git checkout main && git pull origin main
git checkout -b feat/vercel-analytics
npm i @vercel/analytics                 # adds dep → updates package.json + package-lock.json
unzip -o ~/Downloads/openbank-price-prediction_v7.8.0.zip -d .
npm run test:run
git add src/App.jsx package.json package-lock.json README.md GIT_GUIDE.md
git commit -m "feat: Vercel Web Analytics (v7.8.0)

Add @vercel/analytics and render <Analytics /> at the app root
(import from @vercel/analytics/react). The SPA navigates by internal
state, so Analytics counts visitors/sessions (internal sections are
not separate pageviews)."
git push origin feat/vercel-analytics
# → verify the Vercel preview, then merge:
git checkout main
git merge --no-ff --no-edit feat/vercel-analytics
git tag -a v7.8.0 -m "v7.8.0: Vercel Web Analytics"
git push origin main
git push origin v7.8.0
git branch -d feat/vercel-analytics
git push origin --delete feat/vercel-analytics   # opcional


# ===========================================================================
# STEP 168 — v7.9.0  Price fetching → Supabase Edge Functions
# ===========================================================================
#
# BACKEND ONLY. No src/ changes (the React app is untouched). This commit is the
# source-of-truth copy of the Edge Functions + SQL + updated docs. The actual
# deploy was done in the Supabase dashboard (no Supabase CLI in this project):
# functions deployed, TWELVE_DATA_KEY secret set, RPCs + crons run, Verify JWT
# enabled, service_role_key stored in Vault, old crons (jobs 1 & 2) paused.
#
# WHAT'S NEW:
#
#   supabase/functions/fetch-weekly-prices/index.ts      — weekly close Edge Function
#   supabase/functions/fetch-expired-horizons/index.ts   — expired-horizon Edge Function
#   supabase/sql/01_weekly_prices_edge_setup.sql         — weekly RPCs
#   supabase/sql/02_expired_horizons_rpcs.sql            — expired RPCs (+ verdict logic)
#   supabase/sql/03_crons_edge.sql                       — crons (jobs 10 & 12) + pause of 1 & 2 + prereqs
#
#   docs/SUPABASE.md                              — functions/crons/vault/§7 Edge Functions + Bug #9
#   docs/openbank-forecast-uml.md                 — data-flow, cron gantt, sequences → Edge model
#   docs/Openbank_Mapa_Sistema_Datos.html         — system map (updated to final state)
#   docs/Diseno_EdgeFunction_Precios_v7.9.0.html  — design doc (plan → implemented)
#   README.md                                     — v7.9.0 changelog row + Edge Functions in Supabase section
#
#   WHY: the SQL fetch functions hit the 120s statement_timeout and the Twelve
#   Data 8-req/min ceiling (Bug #9). A per-minute cron + net.http_post + ≤7-chunk
#   Edge Function removes both walls. Idempotent/resumable; the verdict logic
#   stays in SQL (save_expired_verdict). Old jobs 1 & 2 paused as fallback.
#
#   NOTE: GitHub does not render the .html docs inline — open them locally or via
#   htmlpreview.github.io.
#
# Apply on a feature branch (see docs/GIT_WORKFLOW.md):
git checkout main && git pull origin main
git checkout -b feat/edge-functions-price-fetch
unzip -o ~/Downloads/openbank-price-prediction_v7.9.0.zip -d .
npm run test:run                         # sanity — no src changes, tests unaffected
git add supabase/functions/fetch-weekly-prices/index.ts \
        supabase/functions/fetch-expired-horizons/index.ts \
        supabase/sql/01_weekly_prices_edge_setup.sql \
        supabase/sql/02_expired_horizons_rpcs.sql \
        supabase/sql/03_crons_edge.sql \
        docs/SUPABASE.md \
        docs/openbank-forecast-uml.md \
        docs/Openbank_Mapa_Sistema_Datos.html \
        docs/Diseno_EdgeFunction_Precios_v7.9.0.html \
        README.md GIT_GUIDE.md
git commit -m "feat: move price fetching to Supabase Edge Functions (v7.9.0)

The SQL fetch functions (fetch_expired_horizons, fetch_weekly_prices) hit
the 120s statement_timeout and the Twelve Data 8-req/min ceiling (Bug #9).
Replaced by two Edge Functions triggered by per-minute crons (jobs 10 & 12)
via net.http_post; each call handles a chunk of <=7 and is idempotent and
resumable. Verdict logic kept in SQL (save_expired_verdict). Verify JWT
enabled; crons authenticate with the service_role_key Vault secret. Old SQL
crons (jobs 1 & 2) paused as fallback. Docs updated (SUPABASE.md, UML,
system-map & design HTML). Backend only — no src changes."
git push origin feat/edge-functions-price-fetch
# → backend only (no Vercel preview needed), then merge:
git checkout main
git merge --no-ff --no-edit feat/edge-functions-price-fetch
git tag -a v7.9.0 -m "v7.9.0: price fetching on Supabase Edge Functions"
git push origin main
git push origin v7.9.0
git branch -d feat/edge-functions-price-fetch
git push origin --delete feat/edge-functions-price-fetch   # opcional


# ===========================================================================
# STEP 169 — v7.9.1  Fix: never settle an expired horizon with the current price
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install needed. Frontend only — two files + one test.
#
# WHAT'S NEW:
#
#   src/utils/stocks.js:
#     - getEffectivePrice() gains a 7th arg `snapshot = false`. In snapshot mode,
#       an EXPIRED horizon with no historical close in histPrices now returns
#       { price: null } instead of falling through to the current price (autoPrices).
#     - Root cause of the corrupted 1M verdicts: at save time histPrices for an
#       expired horizon was often empty, so getEffectivePrice returned today's
#       price; saveBatch then froze a verdict + priceOnDate computed against the
#       wrong price. With null, saveBatch leaves the horizon 'awaiting' and the
#       cron (save_expired_verdict) settles it later with the real close.
#     - Live/provisional callers omit the flag (default false) -> unchanged.
#
#   src/hooks/useHistory.js:
#     - saveBatch() now calls getEffectivePrice(..., true, /* snapshot */ true).
#       Only this caller opts into snapshot mode.
#
#   src/utils/getEffectivePrice.test.js (NEW):
#     - 6 regression tests: snapshot+expired+noHist -> null; snapshot+expired+hist
#       -> settled close; override precedence; live fallback preserved; default
#       behaves as live; snapshot flag only gates the expired branch.
#     - Test count 164 -> 170, files 9 -> 10.
#
#   README.md: v7.9.1 changelog row + test count bump.
#
#   NOTE: this fix STOPS new corruption. The 25 pre-existing mis-graded 1M
#   verdicts (March batches, evaluated against the current price) still need a
#   one-time DB reset to 'awaiting' so the cron re-settles them — that's a
#   separate Supabase SQL step, NOT part of this commit.
#
# Apply on a feature branch (see docs/GIT_WORKFLOW.md):
git checkout main && git pull origin main
git checkout -b fix/expired-snapshot-current-price
unzip -o ~/Downloads/openbank-price-prediction_v7.9.1.zip -d .
npm run test:run
git add src/utils/stocks.js src/hooks/useHistory.js src/utils/getEffectivePrice.test.js README.md GIT_GUIDE.md
git commit -m "fix: never settle an expired horizon with the current price (v7.9.1)

getEffectivePrice fell through to autoPrices (current price) when an expired
horizon had no historical close loaded, so saveBatch froze a wrong verdict and
priceOnDate. This mis-graded the 1M of the March batches and corrupted the
accuracy stats.

Add a snapshot flag to getEffectivePrice: in snapshot mode an expired horizon
with no real close returns null, so the verdict stays awaiting and the cron
(save_expired_verdict) settles it later with the true close. Live/provisional
badges are unchanged (snapshot defaults to false). saveBatch opts in.

New getEffectivePrice.test.js (6 regression tests). Frontend only, no Supabase
changes. Pre-existing corrupt verdicts need a separate one-time DB reset."
git push origin fix/expired-snapshot-current-price
# -> verify the Vercel preview, then merge:
git checkout main
git merge --no-ff --no-edit fix/expired-snapshot-current-price
git tag -a v7.9.1 -m "v7.9.1: never settle an expired horizon with the current price"
git push origin main
git push origin v7.9.1
git branch -d fix/expired-snapshot-current-price
git push origin --delete fix/expired-snapshot-current-price   # opcional


# ===========================================================================
# STEP 170 — v7.9.2  Fix: Horizon Results cards show the real verdict
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install needed. Frontend only — one file.
# Presentational change: no tested module touched (170 tests stay green).
#
# WHAT'S NEW:
#
#   src/components/StockRow.jsx:
#     - Root cause of "todo en AWAITING": HorizonCards computed verdicts live
#       from autoPrice, but its label/colour map only had hit/close/miss — so
#       'exceeded' and 'wrong_way' fell through to the AWAITING fallback, and
#       every settled horizon looked AWAITING. It also evaluated expired
#       horizons against the current price, not the settled close.
#     - Rewrote HorizonCards:
#         * EXPIRED + real close  -> settled verdict (HIT/EXCEEDED/CLOSE/MISS/
#           WRONG-WAY), evaluated in snapshot mode via
#           getEffectivePrice(..., snapshot:true) so it matches the stored
#           verdict and the accuracy stats (single source of truth).
#         * FUTURE -> AWAITING badge + live tracking hint
#           (up adelantado / en camino / down retrasado) from today's price.
#         * EXPIRED but close not loaded yet -> stays AWAITING (cron settles it;
#           never settled against the current price).
#         * Added per-stock roll-up header ("N/M vencidos acertados · hoy +X%
#           vs obj.") and a target+gap row per card.
#     - Now passes histPrices + override to HorizonCards (needed for the close).
#     - Two new verdict colours: exceeded = blue, wrong_way = purple (shadcn
#       bg-x-50 / text-x-700 / border-x-200, matching the app's Badge pattern).
#     - The collapsed-row bars, MarketComparison, FundamentalsPanel and Notes
#       are untouched.
#
#   README.md: v7.9.2 changelog row.
#
#   NOTE: relies on the snapshot flag added to getEffectivePrice in v7.9.1
#   (already on main). Pairs with the DB re-grade of the 25 March 1M verdicts
#   (separate Supabase step) — once those settle, these cards show real verdicts.
#
# Apply on a feature branch (see docs/GIT_WORKFLOW.md):
git checkout main && git pull origin main
git checkout -b fix/horizon-results-real-verdict
unzip -o ~/Downloads/openbank-price-prediction_v7.9.2.zip -d .
npm run test:run
git add src/components/StockRow.jsx README.md GIT_GUIDE.md
git commit -m "fix: Horizon Results cards show the real settled verdict (v7.9.2)

HorizonCards computed verdicts live but its label/colour map only covered
hit/close/miss, so exceeded and wrong_way fell through to the AWAITING
fallback and every settled horizon looked AWAITING. Expired horizons were
also evaluated against the current price instead of the settled close.

Rewrote HorizonCards: an expired horizon shows its settled verdict (HIT/
EXCEEDED/CLOSE/MISS/WRONG-WAY) computed in snapshot mode from the real close
(getEffectivePrice snapshot:true), matching the stored verdict and stats; a
future horizon shows AWAITING plus a live tracking hint; an expired horizon
with no close yet stays AWAITING. Added a per-stock roll-up header and a
target+gap row, two new verdict colours (exceeded blue, wrong_way purple),
and now passes histPrices/override to the component.

Presentational only, no tested module touched. Frontend, no Supabase changes."
git push origin fix/horizon-results-real-verdict
# -> verify the Vercel preview, then merge:
git checkout main
git merge --no-ff --no-edit fix/horizon-results-real-verdict
git tag -a v7.9.2 -m "v7.9.2: Horizon Results cards show the real settled verdict"
git push origin main
git push origin v7.9.2
git branch -d fix/horizon-results-real-verdict
git push origin --delete fix/horizon-results-real-verdict   # opcional


# ===========================================================================
# STEP 171 — v7.9.3  Horizon Results: glanceable cards (target/close/state colours, N/D)
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. Frontend only — one file (StockRow.jsx).
# Presentational: no tested module touched (170 tests stay green).
# Builds on top of v7.9.2 — same branch fix/horizon-results-real-verdict.
#
# WHAT'S NEW (all inside HorizonCards in src/components/StockRow.jsx):
#
#   1. Target no longer repeats as its own line in every card.
#
#   2. SETTLED horizon (expired + real close):
#        - big number = the settled CLOSE, in the default foreground colour
#          (black in light / white in dark).
#        - sub-line: "cierre · objetivo era {cu}{target} · {gap%}".
#
#   3. FUTURE horizon (has target, not expired):
#        - big number = that horizon's TARGET (today's price was identical
#          across all 4 cards, so it's demoted to a sub-line).
#        - colour-coded number: dark blue normally; ORANGE + "⏱ Nd" chip when
#          fewer than SOON_DAYS (15) days remain to expiry.
#        - sub-line: "hoy {cu}{price} · {gap%}".
#        - live tracking chip (badge stays AWAITING):
#            ↗ adelantado  today's price already reached/exceeded the target
#            → en camino    near but still below
#            ↘ retrasado    far short (still moving the forecast way)
#            ⤬ en contra    moved AGAINST the forecast direction vs base (red)
#
#   4. NO-FORECAST horizon (not imported in the CSV → no target):
#        - dedicated card: dashed border, "⨯ N/D" pill, big "—",
#          "Sin previsión a {key} · no incluida en este batch".
#        - NO AWAITING, NO fake date, NO days-left. Applies to ANY missing
#          horizon, not only 12M.
#
#   5. EXPIRED-but-no-close-yet stays a genuine AWAITING card ("sin cierre aún")
#      with the target shown — cron settles it later.
#
#   Roll-up header, collapsed-row bars, MarketComparison, Fundamentals and
#   Notes are untouched. The "best target" calc now ignores missing horizons.
#
#   README.md: v7.9.3 changelog row.
#
# Apply on the SAME branch (continues v7.9.2, before the merge):
git checkout fix/horizon-results-real-verdict
unzip -o ~/Downloads/openbank-price-prediction_v7.9.3.zip -d .
npm run test:run
git add src/components/StockRow.jsx README.md GIT_GUIDE.md
git commit -m "feat: Horizon Results glanceable cards — target/close colours + N/D state (v7.9.3)

Refines HorizonCards (presentational):
- target no longer repeated as its own line in every card
- settled horizon: big number = real close (foreground colour) + 'objetivo era X · gap%'
- future horizon: big number = that horizon's target, colour-coded
  (dark blue, orange + 'Nd' chip when <15 days to expiry), with 'hoy {price} {gap%}'
- live chip refined: adelantado only when target reached/exceeded, en camino,
  retrasado, and a new red 'en contra' when price moved against the forecast vs base
- horizon not imported in the batch (no target): dedicated N/D card
  (dashed, '⨯ N/D' pill, '—', 'Sin previsión a {key} · no incluida en este batch'),
  no AWAITING / no fake date / no days-left — applies to any missing horizon
- expired-but-no-close stays a genuine AWAITING card ('sin cierre aún')

Presentational only, no tested module touched. Frontend, no Supabase changes."
git push origin fix/horizon-results-real-verdict
# -> verify the Vercel preview, then merge BOTH v7.9.2 + v7.9.3 to main:
git checkout main && git pull origin main
git merge --no-ff --no-edit fix/horizon-results-real-verdict
git tag -a v7.9.2 -m "v7.9.2: Horizon Results cards show the real settled verdict"
git tag -a v7.9.3 -m "v7.9.3: Horizon Results glanceable cards — target/close colours + N/D state"
git push origin main
git push origin v7.9.2 v7.9.3
git branch -d fix/horizon-results-real-verdict
git push origin --delete fix/horizon-results-real-verdict   # opcional


# ===========================================================================
# STEP 172 — v7.9.4  Collapsed-row compact indicator + legend + vs SPY/Sector help
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. Frontend only — two files.
# Presentational: no tested module touched (170 tests stay green).
# Builds on v7.9.3 — same branch fix/horizon-results-real-verdict.
#
# WHAT'S NEW:
#
#   src/components/StockRow.jsx — collapsed-row horizon columns (1M/3M/6M/12M):
#     - Replaced the dense purple progress bars with a compact STACKED indicator
#       (no repeated horizon label — the column header already says 1M/3M/…):
#         · expired + real close → settled verdict (HIT/EXCEED/CLOSE/MISS/WRONG)
#           in snapshot mode + gap%  (matches stored verdict + stats)
#         · future → arrow + % + mini-state (↗ adelantado / → en camino /
#           ↘ retrasado / ⤬ en contra), live from today's price
#         · expired but no close yet → ⏳ "sin cierre"
#         · not imported (no target) → "— N/D"
#     - Added module-scope lookup tables RV (settled verdict) and LV (live state).
#
#   src/components/StockTable.jsx:
#     - Header legend: replaced the obsolete "Hit / Close/Awaiting / Miss" 3-dot
#       legend with a compact 4-colour key (bien / cerca / fallo / pendiente)
#       plus a "?" that opens a full state legend modal (new COL_HELP.legend).
#     - Fixed the vs SPY / vs Sector column help: both headers used colKey="hit"
#       so the "?" showed the "Hit? — Prediction result" text. They now use
#       colKey="vsSpy" / "vsSector" with correct help text describing relative
#       performance since the base date (stock return − benchmark return), the
#       EU local-benchmark note (iShares country ETF), and the fetch states.
#
#   README.md: v7.9.4 changelog row.
#
#   NOTE: the collapsed-row indicator relies on the snapshot flag in
#   getEffectivePrice (v7.9.1, already on the branch). Window for vs SPY/Sector
#   help confirmed against useMarketData.js (base-date close → current price).
#
# Apply on the SAME branch (continues v7.9.3, before the merge):
git checkout fix/horizon-results-real-verdict
unzip -o ~/Downloads/openbank-price-prediction_v7.9.4.zip -d .
npm run test:run
git add src/components/StockRow.jsx src/components/StockTable.jsx README.md GIT_GUIDE.md
git commit -m "feat: collapsed-row compact indicator + legend + vs SPY/Sector help (v7.9.4)

StockRow: replace the dense purple horizon bars in the collapsed row with a
compact stacked indicator sharing the cards' vocabulary — expired shows the
settled verdict (HIT/EXCEED/CLOSE/MISS/WRONG) + gap%, future shows arrow + %
+ mini-state (adelantado/en camino/retrasado/en contra), expired-no-close
shows 'sin cierre', not-imported shows N/D. Horizon label no longer repeated
per cell (it's in the column header).

StockTable: replace the obsolete Hit/Close-Awaiting/Miss legend with a compact
4-colour key + '?' opening a full state legend. Fix vs SPY / vs Sector help:
both columns used colKey='hit' (showing the 'Hit? — Prediction result' text);
they now have correct help describing relative performance since the base date
vs SPY / vs the sector ETF, with the EU local-benchmark note.

Presentational only, no tested module touched. Frontend, no Supabase changes."
git push origin fix/horizon-results-real-verdict
# -> verify the Vercel preview, then merge v7.9.2 + v7.9.3 + v7.9.4 to main:
git checkout main && git pull origin main
git merge --no-ff --no-edit fix/horizon-results-real-verdict
git tag -a v7.9.2 -m "v7.9.2: Horizon Results cards show the real settled verdict"
git tag -a v7.9.3 -m "v7.9.3: Horizon Results glanceable cards — target/close colours + N/D state"
git tag -a v7.9.4 -m "v7.9.4: collapsed-row compact indicator + legend + vs SPY/Sector help"
git push origin main
git push origin v7.9.2 v7.9.3 v7.9.4
git branch -d fix/horizon-results-real-verdict
git push origin --delete fix/horizon-results-real-verdict   # opcional


# ===========================================================================
# STEP 173 — v7.9.5  Forecast visibility + direction-aware %
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. Frontend only — one file (StockRow.jsx).
# Presentational: evaluatePrediction untouched → 170 tests stay green.
# Builds on v7.9.4 — same branch fix/horizon-results-real-verdict.
#
# WHAT'S NEW (all inside StockRow.jsx):
#
#   Module-scope helpers (shared by collapsed row + HorizonCards):
#     - SETTLED / LIVE display tables (verdict + live state).
#     - fdir(t,base): forecast direction (+1 bullish / −1 bearish).
#     - signedPct(price,t,base): direction-aware gap vs target — "+%" = toward/
#       beyond target (good), "−%" = short/against (bad), for bull AND bear.
#     - liveState(price,t,base): ahead / ontrack / behind / against.
#     - expArrow(t,base): "↑/↓" expected-direction cue.
#
#   Collapsed-row horizon cells: lead with the OBJETIVO PREVISTO price (it had
#   vanished from the row) — blue, orange + "⏱ Nd" when < 15d, foreground when
#   settled — then the state pill and a direction-aware % (+ "esperaba ↑/↓" for
#   wrong/against). Negative days-left no longer leak into the soon chip.
#
#   HorizonCards (cards): big line shows TWO prices the same size side by side —
#   "objetivo {target} → cerró {close}" (settled) / "objetivo {target} → hoy
#   {price}" (future). Bottom line carries only state + direction-aware % +
#   (esperaba cue) + date — no duplicated price. N/D and expired-no-close states
#   kept. The objetivo turns orange + "⏱ Nd" within 15 days of expiry.
#
#   Fixes the contradiction Alex spotted: a bearish WRONG used to show a green
#   "+42.4%". Now it shows "−42.4%" red + "esperaba ↓", consistent with WRONG.
#
#   README.md: v7.9.5 changelog row.
#
# Apply on the SAME branch (continues v7.9.4, before the merge):
git checkout fix/horizon-results-real-verdict
unzip -o ~/Downloads/openbank-price-prediction_v7.9.5.zip -d .
npm run test:run
git add src/components/StockRow.jsx README.md GIT_GUIDE.md
git commit -m "feat: forecast visibility + direction-aware % (v7.9.5)

The predicted (target) price is shown for every horizon again — it had
disappeared from the collapsed row. Collapsed cells now lead with the
objetivo previsto + state + direction-aware %. Cards show two prices the
same size side by side (objetivo -> cerró / objetivo -> hoy) with a
deduplicated bottom line.

Direction-aware %: signedPct multiplies the gap vs target by the forecast
direction, so '+%' always means toward/beyond target (good) and '-%' short
or against (bad), for bullish and bearish alike — fixing the bearish WRONG
that used to show a green +42.4%. A 'esperaba up/down' cue is shown for
wrong-way / against.

evaluatePrediction untouched. Presentational, frontend, no Supabase changes."
git push origin fix/horizon-results-real-verdict
# -> verify the Vercel preview, then merge v7.9.2..v7.9.5 to main:
git checkout main && git pull origin main
git merge --no-ff --no-edit fix/horizon-results-real-verdict
git tag -a v7.9.2 -m "v7.9.2: Horizon Results cards show the real settled verdict"
git tag -a v7.9.3 -m "v7.9.3: Horizon Results glanceable cards — target/close colours + N/D state"
git tag -a v7.9.4 -m "v7.9.4: collapsed-row compact indicator + legend + vs SPY/Sector help"
git tag -a v7.9.5 -m "v7.9.5: forecast visibility + direction-aware %"
git push origin main
git push origin v7.9.2 v7.9.3 v7.9.4 v7.9.5
git branch -d fix/horizon-results-real-verdict
git push origin --delete fix/horizon-results-real-verdict   # opcional


# ===========================================================================
# STEP 174 — v7.9.6  Bearish-forecast clarity (base strip + price-following arrow)
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. Frontend only — one file (StockRow.jsx).
# Presentational: evaluatePrediction untouched → 170 tests stay green.
# Builds on v7.9.5 — same branch fix/horizon-results-real-verdict.
#
# WHY: a bearish horizon (target below base) read as contradictory —
# "objetivo €59.22 → hoy €53.30 · ↗ adelantado +10%": up arrow on a falling
# price, and nothing told you it was a down-forecast. (That's correct maths:
# bearish target, price fell below it → overshot the bearish target = +10%.)
#
# WHAT'S NEW (all inside StockRow.jsx):
#   - HorizonCards: each card opens with a base-reference strip
#       "base {price} · {base date} · bajista↓ / alcista↑"
#     so the forecast direction of that horizon is always visible.
#   - Big-line separator arrow now follows the REAL price move vs base
#       (price ≥ base → ↑, else ↓) — a falling price never shows ↑.
#   - liveDisplay(state, dir): direction-aware live vocabulary replacing the
#     old LIVE table — ✓ sobrepasado · ↑/↓ falta subir/bajar · ⤬ en contra.
#     (Old ↗/↘ implied price up/down and clashed on bearish horizons.)
#   - Collapsed-row cells use liveDisplay too (same vocabulary).
#   - "esperaba ↑/↓" cue dropped from the cards (the base strip carries the
#     direction); kept in the compact collapsed cell, which has no strip.
#
#   README.md: v7.9.6 changelog row.
#
#   SANITY: this only makes sense when the stock's base price is really above
#   the bearish target. If a base looked wrong, that would be a data issue,
#   not display — worth a glance at the Base price column.
#
# Apply on the SAME branch (continues v7.9.5, before the merge):
git checkout fix/horizon-results-real-verdict
unzip -o ~/Downloads/openbank-price-prediction_v7.9.6.zip -d .
npm run test:run
git add src/components/StockRow.jsx README.md GIT_GUIDE.md
git commit -m "feat: bearish-forecast clarity — base strip + price-following arrow (v7.9.6)

A bearish horizon (target below base) read as contradictory — e.g.
'objetivo 59.22 -> hoy 53.30 . adelantado +10%': an up arrow on a falling
price, with nothing showing it was a down-forecast.

Each Horizon Results card now opens with a base-reference strip
'base {price} . {base date} . bajista/alcista', so the forecast direction is
always visible. The big-line separator arrow follows the real price move vs
base (>= base -> up, else down), so a falling price never shows an up arrow.
Live-state vocabulary is direction-aware (sobrepasado / falta subir-bajar /
en contra), replacing adelantado/en camino/retrasado whose arrows implied
price direction. Collapsed-row cells use the same labels.

evaluatePrediction untouched. Presentational, frontend, no Supabase changes."
git push origin fix/horizon-results-real-verdict
# -> verify the Vercel preview, then merge v7.9.2..v7.9.6 to main:
git checkout main && git pull origin main
git merge --no-ff --no-edit fix/horizon-results-real-verdict
git tag -a v7.9.2 -m "v7.9.2: Horizon Results cards show the real settled verdict"
git tag -a v7.9.3 -m "v7.9.3: Horizon Results glanceable cards — target/close colours + N/D state"
git tag -a v7.9.4 -m "v7.9.4: collapsed-row compact indicator + legend + vs SPY/Sector help"
git tag -a v7.9.5 -m "v7.9.5: forecast visibility + direction-aware %"
git tag -a v7.9.6 -m "v7.9.6: bearish-forecast clarity — base strip + price-following arrow"
git push origin main
git push origin v7.9.2 v7.9.3 v7.9.4 v7.9.5 v7.9.6
git branch -d fix/horizon-results-real-verdict
git push origin --delete fix/horizon-results-real-verdict   # opcional


# ===========================================================================
# STEP 175 — v7.9.7  Fix EU price fetch (Yahoo 429): User-Agent + < current_date
# ===========================================================================
#
# BACKEND ONLY. No src/ changes. Follow-up patch to the v7.9.0 Edge Functions.
# The deploy was done in the Supabase dashboard (no CLI): both functions
# redeployed with the User-Agent, and get_pending_expired re-run with the
# < current_date filter. This commit just captures it in the repo.
#
# WHAT'S NEW:
#
#   supabase/functions/fetch-weekly-prices/index.ts     — Yahoo calls now send a
#   supabase/functions/fetch-expired-horizons/index.ts    browser User-Agent header
#   supabase/sql/02_expired_horizons_rpcs.sql           — get_pending_expired: < current_date
#
#   WHY: Yahoo returned HTTP 429 to the "naked" requests from the Edge runtime,
#   so the 4 .DE tickers failed every weekly run. A browser User-Agent fixes it
#   (the expired function already had one and worked; the weekly didn't and 429'd
#   — which pinpointed the cause). The < current_date filter stops the function
#   re-attempting today's not-yet-settled expiries every minute (the loop that
#   hammered Yahoo ~480x per window). Recovered the 4 missing .DE Friday closes.
#
# Apply on a feature branch:
git checkout main && git pull origin main
git checkout -b fix/edge-yahoo-user-agent
unzip -o ~/Downloads/openbank-price-prediction_v7.9.7.zip -d .
git add supabase/functions/fetch-weekly-prices/index.ts \
        supabase/functions/fetch-expired-horizons/index.ts \
        supabase/sql/02_expired_horizons_rpcs.sql \
        README.md GIT_GUIDE.md
git commit -m "fix: EU price fetch — Yahoo User-Agent + get_pending_expired < current_date (v7.9.7)

Yahoo returned HTTP 429 to the naked requests from the Edge runtime, so the
4 .DE tickers failed every weekly run. Add a browser User-Agent header to the
Yahoo calls in both Edge Functions (the expired one already had it and worked;
the weekly didn't and 429'd). get_pending_expired now filters < current_date so
a horizon expiring today isn't evaluated until its close exists, removing the
per-minute retry loop that hammered Yahoo. Recovered the 4 missing .DE Friday
closes. Backend only — no src changes."
git push origin fix/edge-yahoo-user-agent
git checkout main
git merge --no-ff --no-edit fix/edge-yahoo-user-agent
git tag -a v7.9.7 -m "v7.9.7: EU price fetch fix (Yahoo User-Agent + < current_date)"
git push origin main
git push origin v7.9.7
git branch -d fix/edge-yahoo-user-agent
git push origin --delete fix/edge-yahoo-user-agent   # opcional


# ===========================================================================
# STEP 176 — v7.10.1  All Stocks: Watchlist-style horizon pill + sortable columns
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. Frontend only — one file (AllStocksPage.jsx).
# Presentational (no data-model change): AllStocksPage is not a tested module,
# so the 170 tests stay green. First change of Tanda 1 (All Stocks redesign).
# v7.10.0 was the EU price-fetch line (already on main as v7.9.7); this series
# starts at v7.10.1.
#
# WHAT'S NEW (all inside src/components/AllStocksPage.jsx):
#
#   #1 Horizon selector — replaced the per-column Upside dropdown with a
#      Watchlist-style pill (1M / 3M / 6M / 12M) at the start of the filters
#      toolbar. The Upside and Left-to-target headers show the active horizon
#      as a small tag. Removed the unused HorizonDropdown component + HORIZONS.
#
#   #2 Sortable columns — every column now sorts asc/desc: added Market,
#      Sector, PEG, Margin and Batch (by date) to the comparator, next to the
#      existing Ticker / Upside / Left-to-target / Score. One convention:
#      sortDir 1 = ascending, -1 = descending (first click on a column = desc).
#      Missing values (null / NaN / '—') always sort to the bottom in both
#      directions. Footer sort label + sort buttons added to every header.
#
#   README.md: v7.10.1 changelog row.
#
#   (Tanda 1 still pending in v7.10.2: review all column help texts (#3) and
#    add a "Best only" help tooltip (#4) — kept score >= 60 threshold.)
#
# Branch from main (main already has v7.9.2..v7.9.7):
git checkout main && git pull origin main
git checkout -b feat/allstocks-header-sort
unzip -o ~/Downloads/openbank-price-prediction_v7.10.1.zip -d .
npm run test:run
git add src/components/AllStocksPage.jsx README.md GIT_GUIDE.md
git commit -m "feat: All Stocks — Watchlist-style horizon pill + sortable columns (v7.10.1)

#1 Replace the per-column Upside horizon dropdown with a Watchlist-style pill
(1M/3M/6M/12M) in the filters toolbar; Upside and Left-to-target headers show
the active horizon as a tag. Removed the unused HorizonDropdown + HORIZONS.

#2 All columns sortable asc/desc: added Market, Sector, PEG, Margin and Batch
(by date) to the comparator alongside Ticker/Upside/Left-to-target/Score. One
convention (sortDir 1=asc, -1=desc); missing values always sort last in both
directions. Sort buttons on every header + footer label updated.

Presentational, AllStocksPage is not a tested module (170 tests stay green).
Frontend only, no Supabase changes."
git push origin feat/allstocks-header-sort
# -> verify the Vercel preview, then (after v7.10.2) merge the tanda to main.


# ===========================================================================
# STEP 177 — v7.10.2  All Stocks: column help-text review + Best only help
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. Frontend only — one file (AllStocksPage.jsx).
# Presentational (help text only). 170 tests stay green. Second change of Tanda 1
# — continues on the SAME branch feat/allstocks-header-sort (on top of v7.10.1).
#
# WHAT'S NEW (all inside src/components/AllStocksPage.jsx):
#
#   #3 Help-text review — fixed the "Left to target" tooltip incongruence: the
#      sub-line said (lastWeeklyPrice − target) / target × 100 but the real
#      formula is (target − refPrice) / refPrice, and the colour key was
#      inverted. Now: 🟢 positive = upside remains (price still below target),
#      🔴 negative = price already above target, correct formula + price-source
#      cascade. Upside tooltip made English-consistent (child "Green = positive
#      · Red = negative") and given its formula. Other column texts (Score, PEG,
#      Margin, Sparkline, Batch) reviewed — already accurate, left as-is.
#
#   #4 "Best only" help — added a ColTooltip explaining the filter: remaining
#      upside > 0 for the selected horizon AND Score ≥ 60 (the Score condition
#      only applies when a Score exists, so score-less tickers are never hidden).
#      Score ≥ 60 threshold unchanged.
#
#   README.md: v7.10.2 changelog row.
#
#   Tanda 1 (All Stocks header/help) COMPLETE after this. Next: Tanda 2 (v7.11.x)
#   — #6 ticker/company search, #5 click→batch-detail auto-scroll, #7 Top Picks
#   by sector.
#
# Apply on the SAME branch (continues v7.10.1):
git checkout feat/allstocks-header-sort
unzip -o ~/Downloads/openbank-price-prediction_v7.10.2.zip -d .
npm run test:run
git add src/components/AllStocksPage.jsx README.md GIT_GUIDE.md
git commit -m "feat: All Stocks — column help-text review + Best only help (v7.10.2)

#3 Fix the Left to target tooltip incongruence: the sub-line stated
(lastWeeklyPrice - target) / target x 100 but the real formula is
(target - refPrice) / refPrice, and the colour key was inverted. Now
positive = upside remains (price below target), negative = price already
above target, with the correct formula and price-source cascade. Upside
tooltip made English-consistent + formula added. Other texts reviewed,
already accurate.

#4 Add a Best only help tooltip: remaining upside > 0 for the selected
horizon AND Score >= 60 (Score condition only when a Score exists, so
score-less tickers are never hidden). Threshold unchanged.

Presentational (help text), AllStocksPage not a tested module (170 tests
stay green). Frontend only, no Supabase changes."
git push origin feat/allstocks-header-sort
# -> verify the Vercel preview. Tanda 1 done; then merge to main OR continue
#    with Tanda 2 on a new branch.


# ===========================================================================
# STEP 178 — v7.10.3  Fix cron watchdog (Edge names) + docs/ALERTS.md
# ===========================================================================
#
# BACKEND + DOCS. No src/ changes. (Captures a fix already live in Supabase.)
# The watchdog check_cron_health() still watched the OLD SQL function names in
# fetch_log_summary, so it false-alarmed every Mon/Thu after the v7.9.0 migration
# (the _edge functions log to fetch_log, never to fetch_log_summary).
# The corrected function was already applied in the dashboard SQL editor
# (create or replace function) and tested: `select check_cron_health();`
# -> "all crons healthy", no email. This commit just captures it + the docs.
#
# WHAT'S NEW:
#   supabase/sql/04_check_cron_health.sql  — corrected watchdog (reads cron.job_run_details)
#   docs/ALERTS.md                         — plain-language alerts guide + table
#   README.md                              — new "Alerts & monitoring" section + link
#
# No tests needed (no src/ changes). Apply on a feature branch:
git checkout main && git pull origin main
git checkout -b fix/cron-watchdog-edge-names
unzip -o ~/Downloads/openbank-price-prediction_v7.10.3.zip -d .
git add supabase/sql/04_check_cron_health.sql docs/ALERTS.md README.md GIT_GUIDE.md
git commit -m "fix: cron watchdog watched old SQL names -> false alarms; read cron.job_run_details (v7.10.3)

check_cron_health() still checked fetch_log_summary for the old SQL function
names (fetch_expired_horizons, fetch_weekly_prices), paused since v7.9.0, so it
emailed a false 'sin ejecucion' alert every Mon/Thu while the _edge functions
ran fine (they log to fetch_log, never fetch_log_summary). Rewrote Checks 2 & 3
to read pg_cron's run log (cron.job_run_details) by jobname -> true liveness,
correct even in weeks with no expirations. Check 1 unchanged. Adds
supabase/sql/04_check_cron_health.sql, docs/ALERTS.md and a README section.
Backend/docs only - no src changes."
git push origin fix/cron-watchdog-edge-names
git checkout main
git merge --no-ff --no-edit fix/cron-watchdog-edge-names
git tag -a v7.10.3 -m "v7.10.3: fix cron watchdog (Edge names) + docs/ALERTS.md"
git push origin main
git push origin v7.10.3
git branch -d fix/cron-watchdog-edge-names
git push origin --delete fix/cron-watchdog-edge-names   # opcional


# ===========================================================================
# STEP 179 — v7.11.1  All Stocks: ticker/company search (Tanda 2 #6)
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. Frontend only — one file (AllStocksPage.jsx).
# Presentational (AllStocksPage is not a tested module → 170 tests stay green).
# First change of Tanda 2 (All Stocks navigation/search). New branch from main.
#
# WHAT'S NEW (all inside src/components/AllStocksPage.jsx):
#   #6 Search box in the filters toolbar, placed before "Score min" (start of
#      the second filter row). Dual behaviour:
#        - filters the table live as you type (matches display ticker, raw
#          ticker, or company name)
#        - shows a suggestions dropdown (up to 6, matched-substring highlight,
#          ticker badge + market). Picking one (click / Enter) filters to that
#          ticker and scrolls to + flashes its row (amber, ~1.5s).
#      Keyboard ↑/↓/Enter/Esc; ✕ clears the text only (leaves other filters).
#      Composes with all existing filters + sort (search added to the `filtered`
#      memo, so Market/Sector/PEG/Score/Best only + column sort all still apply).
#      New StockSearch component + searchQuery/highlight state + a scroll/flash
#      effect; rows got id="asrow-<tNorm>".
#
#   README.md: v7.11.1 changelog row.
#
#   Tanda 2 still pending: #7 Top Picks by sector (v7.11.2), #5 click→batch-detail
#   auto-scroll (v7.11.3 — needs the Batch Detail page + nav/router files).
#
# Branch from main (main has v7.9.2..v7.10.3):
git checkout main && git pull origin main
git checkout -b feat/allstocks-search-nav
unzip -o ~/Downloads/openbank-price-prediction_v7.11.1.zip -d .
npm run test:run
git add src/components/AllStocksPage.jsx README.md GIT_GUIDE.md
git commit -m "feat: All Stocks — ticker/company search (v7.11.1)

#6 New search box in the filters toolbar (before Score min). Filters the table
live as you type (display ticker / raw ticker / company name) AND shows a
suggestions dropdown (up to 6, matched-substring highlight, ticker badge +
market). Picking a suggestion filters to that ticker and scrolls to + flashes
its row. Keyboard nav; clear button wipes the text only. Composes with all
existing filters and column sort (search added to the filtered memo).

Presentational, AllStocksPage not a tested module (170 tests stay green).
Frontend only, no Supabase changes."
git push origin feat/allstocks-search-nav
# -> verify the Vercel preview, then continue with v7.11.2 (#7) on the SAME branch.


# ===========================================================================
# STEP 180 — v7.11.2  All Stocks: Top Picks by sector (Tanda 2 #7)
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. Frontend only — one file (AllStocksPage.jsx).
# Presentational (AllStocksPage not a tested module → 170 tests stay green).
# Continues on the SAME branch feat/allstocks-search-nav (on top of v7.11.1).
#
# WHAT'S NEW (all inside src/components/AllStocksPage.jsx):
#   #7 Top Picks sector filter — added a sector <select> in the Top Picks header
#      next to the Upside/Score toggle; picks can now be narrowed to one sector.
#      The subtitle shows the active sector. The Top Picks header now ALWAYS
#      renders (was hidden when there were 0 picks) so the controls never vanish;
#      when a chosen sector has no positive-upside candidates it shows an inline
#      empty state instead of hiding the section. New topPicksSec state; the
#      sector list is reused from the existing main filter. topPicks memo filters
#      candidates by topPicksSec.
#
#   README.md: v7.11.2 changelog row.
#
#   Tanda 2 remaining: #5 click→batch-detail auto-scroll (v7.11.3 — needs the
#   Batch Detail page component + the nav/router file; please upload them).
#
# Apply on the SAME branch (continues v7.11.1):
git checkout feat/allstocks-search-nav
unzip -o ~/Downloads/openbank-price-prediction_v7.11.2.zip -d .
npm run test:run
git add src/components/AllStocksPage.jsx README.md GIT_GUIDE.md
git commit -m "feat: All Stocks — Top Picks by sector (v7.11.2)

#7 Add a sector selector to the Top Picks header (next to the Upside/Score
toggle) so picks can be narrowed to one sector; subtitle shows the active
sector. The Top Picks header now always renders (was hidden at 0 picks) so the
controls never disappear; a chosen sector with no positive-upside candidates
shows an inline empty state instead of hiding the section. topPicks memo
filters candidates by the new topPicksSec state; sector list reused.

Presentational, AllStocksPage not a tested module (170 tests stay green).
Frontend only, no Supabase changes."
git push origin feat/allstocks-search-nav
# -> verify the Vercel preview, then v7.11.3 (#5) once the Batch Detail + nav files are in.


# ===========================================================================
# STEP 181 — v7.11.3  All Stocks → Batch Detail click-through + auto-scroll (Tanda 2 #5)
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. Frontend only — FOUR files:
#   src/App.jsx, src/components/AllStocksPage.jsx,
#   src/components/StockTable.jsx, src/components/StockRow.jsx
# Presentational. Changes are additive/backward-compatible (new props default to
# null/false). NOTE: StockTable/StockRow are touched, so run the tests; row now
# carries id="bdrow-<ticker>" — if any snapshot covers those rows, update with -u.
# Continues on the SAME branch feat/allstocks-search-nav (on top of v7.11.2).
#
# WHAT'S NEW:
#   #5 Clicking a ticker in All Stocks (table row OR Top Picks card) now loads its
#      batch, navigates to Batch Detail AND scrolls to + flashes that ticker's row
#      (amber, ~1.6s) — no more landing at the top of the list.
#        - App.jsx: new scrollToTicker state; passes onScrollToTicker to
#          AllStocksPage and scrollToTicker + onScrollHandled to the batch-detail
#          StockTable.
#        - AllStocksPage.jsx: accepts onScrollToTicker; both ticker-click handlers
#          call onScrollToTicker(s.t) alongside onLoadBatch + onNav.
#        - StockTable.jsx: accepts scrollToTicker + onScrollHandled; renderRow
#          passes rowId="bdrow-<t>" + highlight to StockRow; a useEffect scrolls to
#          the row and clears the target after the flash.
#        - StockRow.jsx: accepts rowId + highlight; puts id={rowId} + an amber flash
#          class on the main collapsed <tr>.
#      (Note: the Batch Detail "page" is StockTable rendered inline in App.jsx when
#       activePage === 'batch-detail' — there is no separate BatchDetail file.)
#
#   README.md: v7.11.3 changelog row. Completes Tanda 2 (#5/#6/#7).
#
# Apply on the SAME branch (continues v7.11.2):
git checkout feat/allstocks-search-nav
unzip -o ~/Downloads/openbank-price-prediction_v7.11.3.zip -d .
npm run test:run            # if a StockTable/StockRow snapshot trips on the new id, re-run with: npm run test:run -- -u
git add src/App.jsx src/components/AllStocksPage.jsx src/components/StockTable.jsx src/components/StockRow.jsx README.md GIT_GUIDE.md
git commit -m "feat: All Stocks -> Batch Detail click-through with auto-scroll (v7.11.3)

#5 Clicking a ticker in All Stocks (table row or Top Picks card) now loads its
batch, navigates to Batch Detail and scrolls to + flashes that ticker's row
(~1.6s) instead of landing at the top. Threaded a scrollToTicker target through
App -> AllStocksPage (onScrollToTicker) and -> StockTable (scrollToTicker +
onScrollHandled); StockTable scrolls to the row and clears the target after the
flash. Batch-detail rows got id='bdrow-<ticker>' + a highlight class on StockRow.
Additive/backward-compatible (new props default to null/false). Completes Tanda 2.

Frontend only, no Supabase changes."
git push origin feat/allstocks-search-nav
# -> verify the Vercel preview. Tanda 2 complete (v7.11.1/2/3); then merge the
#    branch to main with tags v7.11.1, v7.11.2, v7.11.3 (keep the branch).


# ===========================================================================
# STEP 182 — v7.12.1  All Stocks: Sparkline → Entry Quality + Entry Momentum
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. Frontend only — one file (AllStocksPage.jsx).
# Presentational (AllStocksPage not a tested module → 170 tests stay green).
# First change of Tanda 3 (#9). New branch from main (main has v7.11.x merged).
# NOTE: we jumped straight to #9; the duplicate-batch rows (#8) come later as v7.12.2.
#
# WHAT'S NEW (all inside src/components/AllStocksPage.jsx):
#   #9 Replaced the Sparkline column (and removed the SparkLine component) with
#      TWO new sortable columns:
#      - Entry Quality (0–100 badge, same look as Score):
#          0.5·remaining-upside(norm 0–40%) + 0.35·Score/100 + 0.15·PEG-valuation.
#          No fundamentals → reweighted 0.75·upside + 0.25·PEG, marked "~".
#          Colours: violet 80+, blue 60+, amber 40+, gray <40.
#      - Entry Momentum (pill + trend arrow ↗/→/↘):
#          Strong  = upside left (>=8%) & weekly trend up
#          Building= upside left (>=8%) & not turning up yet
#          Late    = 0 < upside < 8%
#          Missed  = upside <= 0 (price already above target)
#          Trend from the same weekly series that fed the sparkline.
#      Both depend on the selected horizon and plug into the existing sort
#      (Entry Momentum ranks Strong>Building>Late>Missed; nulls last). Empty-state
#      colSpan 10 -> 11.
#
#   README.md: v7.12.1 changelog row (and removed an accidental duplicate v7.11.3 row).
#
# Branch from main:
git checkout main && git pull origin main
git checkout -b feat/allstocks-entry-metrics
unzip -o ~/Downloads/openbank-price-prediction_v7.12.1.zip -d .
git status        # expect: AllStocksPage.jsx, README.md, GIT_GUIDE.md
npm run test:run
git add src/components/AllStocksPage.jsx README.md GIT_GUIDE.md
git commit -m "feat: All Stocks — Entry Quality + Entry Momentum columns (v7.12.1)

#9 Replace the Sparkline column with two sortable metric columns. Entry Quality
(0-100 badge, same look as Score): 0.5*remaining-upside + 0.35*Score + 0.15*PEG;
without fundamentals reweighted to 0.75*upside + 0.25*PEG and marked '~'. Entry
Momentum (pill + trend arrow): Strong/Building/Late/Missed from remaining upside
plus the recent weekly trend. Both depend on the selected horizon and sort with
the existing comparator (momentum ranked Strong>Building>Late>Missed, nulls
last). Removed the now-unused SparkLine component; empty-state colSpan 10->11.

Presentational, AllStocksPage not a tested module (170 tests stay green).
Frontend only, no Supabase changes."
git push origin feat/allstocks-entry-metrics
# -> verify the Vercel preview. Tanda 3 remaining: #8 duplicate-batch rows (v7.12.2).


# ===========================================================================
# STEP 183 — v7.12.2  All Stocks: duplicate-batch rows (Tanda 3 #8)
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. Frontend only — one file (AllStocksPage.jsx).
# Presentational. The 21 AllStocksPage unit tests only cover pure functions
# (calcScore/upsideScore/pegScore/marginScore + horizon map) which are UNCHANGED,
# so all 170 tests stay green. Completes Tanda 3. New branch from main.
#
# WHAT'S NEW (all inside src/components/AllStocksPage.jsx):
#   #8 The table shows one row per batch a ticker appears in (was: most recent
#      only), grouped as a block per ticker, newest->oldest:
#        - latest row keeps the avatar + a "latest" pill (when duplicates exist);
#          older rows are indented with "↳", muted, block has a left accent.
#        - each row links to ITS OWN batch (click -> that batch's Batch Detail +
#          scroll/flash, reusing #5) via b.id === s.batchId.
#        - sort keeps each ticker as a block ordered by its most-recent row;
#          inside the block rows stay by date (newest first).
#        - Best only / search COLLAPSE to the most-recent row per ticker.
#        - Top Picks / KPIs / filters keep using the most recent (unchanged).
#        - removed the "· N×" counter (duplicates are now visible rows).
#      New expandStockInstances() helper + instancesByTicker memo (enriched like
#      `stocks`). deduplicateStocks + the filter/sort pipeline are UNCHANGED.
#
#   README.md: v7.12.2 changelog row.
#
#   Tanda 3 COMPLETE (v7.12.1 Entry metrics + v7.12.2 duplicate rows). After
#   verifying, merge feat/allstocks-dup-rows to main with tag v7.12.2.
#
# Branch from main (main has v7.12.1):
git checkout main && git pull origin main
git checkout -b feat/allstocks-dup-rows
unzip -o ~/Downloads/openbank-price-prediction_v7.12.2.zip -d .
git status        # expect: AllStocksPage.jsx, README.md, GIT_GUIDE.md
npm run test:run
git add src/components/AllStocksPage.jsx README.md GIT_GUIDE.md
git commit -m "feat: All Stocks — duplicate-batch rows per ticker (v7.12.2)

#8 Show one row per batch a ticker appears in (was most recent only), grouped
as a block newest->oldest: latest row keeps avatar + 'latest' pill, older rows
indented with a left accent. Each row links to its own batch (click -> that
batch's Batch Detail + scroll/flash). Sort keeps each ticker as a block ordered
by its most-recent row; Best only / search collapse to the latest row per
ticker; Top Picks / KPIs / filters keep using the most recent. Removed the
'N×' counter. New expandStockInstances helper + instancesByTicker memo;
deduplicateStocks and the filter/sort pipeline unchanged. Completes Tanda 3.

Presentational; the 21 AllStocksPage tests cover only unchanged pure functions,
so 170 tests stay green. Frontend only, no Supabase changes."
git push origin feat/allstocks-dup-rows
# -> verify the Vercel preview, then merge Tanda 3 to main (tag v7.12.2).


# STEP 184 — v7.13.1  All Stocks: inline expandable card (read-only)
# Branch from main. New component AllStocksExpandCard.jsx (HorizonCards +
# FundamentalsPanel copied verbatim from StockRow.jsx; Batch Detail untouched) +
# wiring in AllStocksPage.jsx (Fragment, expandedRows Set + toggleExpand, ▸/▾
# chevron, row onClick → toggle, stopPropagation on ticker + TradingView buttons,
# expand <tr> rendering the card with histPrices={}). Read-only: no override,
# no notes, no MarketComparison. Files: 2 (1 new + 1 changed).
git checkout main
git pull origin main
git checkout -b feat/allstocks-expandable-card

unzip -o ~/Downloads/openbank-price-prediction_v7.13.1.zip -d .
# NOTE: if README.md / GIT_GUIDE.md differ from your main, keep ONLY the two
# src files from the zip and paste this STEP block + the README row by hand.

npm run test:run            # 170 tests must stay green (AllStocksPage render not unit-tested)

git add src/components/AllStocksExpandCard.jsx src/components/AllStocksPage.jsx README.md GIT_GUIDE.md
git commit -m "feat(allstocks): inline read-only expandable card (HorizonCards + Fundamentals + chart) — v7.13.1"
git push -u origin feat/allstocks-expandable-card
# → Vercel preview → verify checklist → then:
git checkout main
git merge --no-ff --no-edit feat/allstocks-expandable-card
git tag -a v7.13.1 -m "v7.13.1: All Stocks inline expandable card (read-only)"
git push origin main
git push origin v7.13.1
# keep the branch (historical reference)


# STEP 185 — v7.13.2  All Stocks: fix expandable card (HorizonCards missing)
# Bugfix on top of v7.13.1. The expandable card showed only Fundamentals — the
# four HorizonCards were missing because the All Stocks row has no stock.base
# Date (the base date is stock.batchDate, a "DD/MM/YYYY" string), so
# targetDates(stock.base) was null. Fix: parse batchDate into a Date and feed it
# as the card base. File: 1 changed (src/components/AllStocksExpandCard.jsx).
git checkout main
git pull origin main
git checkout -b fix/allstocks-card-horizons    # or continue on feat/allstocks-expandable-card
unzip -o ~/Downloads/openbank-price-prediction_v7.13.2.zip -d .
# Only src/components/AllStocksExpandCard.jsx changes vs v7.13.1; if README/
# GIT_GUIDE differ from your main, keep just that src file + paste this block.
npm run test:run            # 170 tests stay green
git add src/components/AllStocksExpandCard.jsx README.md GIT_GUIDE.md
git commit -m "fix(allstocks): render HorizonCards in expandable card (parse batchDate as base) — v7.13.2"
git push -u origin fix/allstocks-card-horizons
# → Vercel preview → verify the four boxes render → then:
git checkout main
git merge --no-ff --no-edit fix/allstocks-card-horizons
git tag -a v7.13.2 -m "v7.13.2: All Stocks expandable card — render HorizonCards"
git push origin main && git push origin v7.13.2


# STEP 186 — v7.13.3  All Stocks card phase 2: settled verdicts + unified HOY
# (1) Expired horizons show the real close + verdict (hit/miss) like Batch Detail,
#     using results[].priceOnDate / targetDate already saved in each batch:
#     instances get a per-horizon `hist` map (buildHist); histKeyed() converts it
#     to the histPrices shape the cards expect and feeds the card (no API calls).
# (2) HOY price matches Batch Detail: card prefers live autoPrices, falls back to
#     weekly close only when no live price exists.
# File: 1 changed (src/components/AllStocksPage.jsx). AllStocksExpandCard.jsx unchanged.
git checkout main
git pull origin main
git checkout -b feat/allstocks-card-settled
unzip -o ~/Downloads/openbank-price-prediction_v7.13.3.zip -d .
# Only src/components/AllStocksPage.jsx changes vs v7.13.2; if README/GIT_GUIDE
# differ from your main, keep just that src file + paste this block + the row.
npm run test:run            # 170 tests stay green
git add src/components/AllStocksPage.jsx README.md GIT_GUIDE.md
git commit -m "feat(allstocks): settled verdicts + unified HOY in expandable card — v7.13.3"
git push -u origin feat/allstocks-card-settled
# → Vercel preview → verify expired boxes show close+verdict and HOY matches → then:
git checkout main
git merge --no-ff --no-edit feat/allstocks-card-settled
git tag -a v7.13.3 -m "v7.13.3: All Stocks card settled verdicts + unified HOY"
git push origin main && git push origin v7.13.3


# STEP 187 — v7.13.4  Help page text refresh (docs-only)
# Updates the All Stocks help section to match v7.10–v7.13: fixes the false
# "most recent batch wins" line (now one row per batch), and documents search,
# horizon pill + sortable columns, Top picks by sector, Entry Quality / Entry
# Momentum, and the inline expandable detail card. Text only — no logic changes.
git checkout main
git pull origin main
git checkout -b docs/helppage-allstocks-refresh
unzip -o ~/Downloads/openbank-price-prediction_v7.13.4.zip -d .
git add src/components/HelpPage.jsx README.md GIT_GUIDE.md
git commit -m "docs(help): refresh All Stocks help section (search, sort, entry metrics, detail card) — v7.13.4"
git push -u origin docs/helppage-allstocks-refresh
# → Vercel preview → read the Help page → then:
git checkout main
git merge --no-ff --no-edit docs/helppage-allstocks-refresh
git tag -a v7.13.4 -m "v7.13.4: Help page text refresh for All Stocks"
git push origin main && git push origin v7.13.4

# ===========================================================================
# STEP 188 — v7.14.0  Batch Overview: admin delete stock from batch
# ===========================================================================
#
# NO SUPABASE SCHEMA CHANGES. No npm install. 4 files changed.
# 170 tests stay green (BatchSimple not unit-tested; pure functions unchanged).
#
# WHAT'S NEW:
#   Admin-only "Actions" column in Batch Overview (BatchSimple).
#   Delete icon (Trash2) per row — double-click pattern (first click arms
#   red state with 3s timeout, second click confirms).
#   Only visible when role === 'admin' AND a batch is loaded (loadedBatchId).
#
#   storage.js:    new deleteStockFromBatch(batchId, ticker)
#                  → GET batch, filter results[], recalculate stats,
#                    PATCH with authHeaders, DELETE weekly_prices orphans.
#   useHistory.js: new deleteStock(batchId, ticker) — calls storage,
#                  patches local history state immediately (no reload).
#                  Added to hook return.
#   App.jsx:       handleDeleteStock(ticker) — calls deleteStock, then
#                  removes ticker from local stocks state.
#                  Passes role + loadedBatchId + onDeleteStock to BatchSimple.
#   BatchSimple.jsx: Actions column (admin+loadedBatch only), double-click
#                  confirmation, Trash2 + Button imports, useState for
#                  confirmDelete/deletingStock states.
#
# Branch from main (main has v7.13.4):
git checkout main && git pull origin main
git checkout -b feat/batch-delete-stock

unzip -o ~/Downloads/openbank-price-prediction_v7.14.0.zip -d .
# NOTE: if README.md / GIT_GUIDE.md differ from your main, keep only the
# 4 src files from the zip and paste this STEP block + the README row by hand.

npm run test:run   # 170 tests must stay green

git add src/services/storage.js src/hooks/useHistory.js src/App.jsx src/components/BatchSimple.jsx README.md GIT_GUIDE.md
git commit -m "feat(batch): admin delete stock from batch — double-click confirm, PATCH Supabase, clean weekly_prices (v7.14.0)"
git push -u origin feat/batch-delete-stock
# → Vercel preview → test: load a batch as admin, delete a ticker,
#   verify row disappears + Supabase batch updated + weekly_prices cleaned.
# → then merge to main:
git checkout main
git merge --no-ff --no-edit feat/batch-delete-stock
git tag -a v7.14.0 -m "v7.14.0: Batch Overview — admin delete stock from batch"
git push origin main
git push origin v7.14.0
# keep the branch (historical reference)


# ===========================================================================
# STEP 189 — v7.14.1  All Stocks: Total Stocks KPI shows unique + total entries
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. 1 file changed (AllStocksPage.jsx).
# 170 tests stay green (AllStocksPage render/row model not unit-tested).
#
# WHAT'S NEW:
#   Total Stocks KPI box: headline = unique tickers (unchanged, matches the
#   market filter counter), sub-line = "N entries across M batches" where N
#   is the total of all batch instances (sum of instancesByTicker array lengths).
#   New `totalInstances` useMemo just before the KPI block.
#   Header sub-text unchanged.
#
# Continue on feat/batch-delete-stock (same branch as v7.14.0 — merge both together):
unzip -o ~/Downloads/openbank-price-prediction_v7.14.1.zip -d .
# Only src/components/AllStocksPage.jsx changes vs v7.14.0; if README/GIT_GUIDE
# differ from your local copy, keep just that src file + paste this block + the row.

npm run test:run   # 170 tests must stay green

git add src/components/AllStocksPage.jsx README.md GIT_GUIDE.md
git commit -m "fix(allstocks): Total Stocks KPI — show unique tickers + total entries (v7.14.1)"
git push origin feat/batch-delete-stock
# → Vercel preview → verify: Total Stocks box shows e.g. "56" headline
#   and "72 entries across 12 batches" sub-line.
# → then merge both v7.14.0 + v7.14.1 to main and tag:
git checkout main
git merge --no-ff --no-edit feat/batch-delete-stock
git tag -a v7.14.1 -m "v7.14.1: All Stocks — Total Stocks KPI unique + total entries"
git push origin main
git push origin v7.14.1
# keep the branch (historical reference)

# ===========================================================================
# STEP 190 — v7.15.0  Wave Script: Pine Script v6 master-wave generator (admin)
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install (no new deps).
# 4 files: 1 new component, 1 new doc, Sidebar + App wiring.
# 170 tests stay green (WaveScriptPage render not unit-tested).
#
# WHAT'S NEW:
#   New admin-only page "Wave Script" that compiles every saved batch into a
#   single downloadable TradingView Pine Script v6 indicator
#   (indicador_master_ondas.txt). One batch = one wave (Base→1M→3M→6M→12M);
#   same ticker on different dates = independent historical waves.
#     - WaveScriptPage.jsx (NEW): group results[] horizon rows per ticker,
#       calendar-month time axis from batch.date, de-dup identical waves
#       (same date + same prices), chronological sort, colour by appearance
#       order (red/blue/green/orange|purple), auto-download .txt. Reads
#       batches from props (useHistory) with @supabase/supabase-js fallback.
#     - Null 12M → native Pine `na` + `if not na(p4)` guard (not -1 flag);
#       indicator() sets max_lines_count=500.
#     - Sidebar.jsx: new "Wave Script" nav entry (Waves icon).
#     - App.jsx: import + admin-gated `wave-script` route (role === 'admin').
#     - docs/WAVE_SCRIPT.md (NEW): feature guide + full Pine v6 + line notes.
#
# Branch from main (main has v7.14.1):
git checkout main && git pull origin main
git checkout -b feat/wave-script

unzip -o ~/Downloads/openbank-price-prediction_v7.15.0.zip -d .
# NOTE: if README.md / GIT_GUIDE.md differ from your main, keep only the
# 4 changed files from the zip (src/components/WaveScriptPage.jsx,
# src/components/Sidebar.jsx, src/App.jsx, docs/WAVE_SCRIPT.md) and paste
# this STEP block + the README row by hand.

npm run test:run   # 170 tests must stay green

git add src/components/WaveScriptPage.jsx src/components/Sidebar.jsx src/App.jsx docs/WAVE_SCRIPT.md README.md GIT_GUIDE.md
git commit -m "feat(wave-script): admin Pine Script v6 master-wave generator (v7.15.0)

New admin-only Wave Script page: compiles every saved batch into one
downloadable TradingView Pine Script v6 indicator (indicador_master_ondas.txt).
- WaveScriptPage.jsx: group results[] horizon rows per ticker, calendar-month
  time axis from batch.date, de-dup identical waves, chronological colour order,
  auto-download. Props-first read with @supabase/supabase-js fallback.
- Null 12M handled with native Pine na + if not na(p4); max_lines_count=500.
- Sidebar.jsx: Wave Script nav entry (Waves icon).
- App.jsx: admin-gated wave-script route.
- docs/WAVE_SCRIPT.md: feature guide + full Pine v6 reference."
git push -u origin feat/wave-script
# → Vercel preview → test as admin: open Wave Script, check the summary
#   (waves / unique tickers / no-12M), download the .txt, paste into the
#   TradingView Pine Editor and confirm the waves render at calendar dates
#   and that no-12M waves stop at the 6M point.
# → then merge to main:
git checkout main
git merge --no-ff --no-edit feat/wave-script
git tag -a v7.15.0 -m "v7.15.0: Wave Script — Pine Script v6 master-wave generator (admin)"
git push origin main
git push origin v7.15.0
# keep the branch (historical reference)


# ===========================================================================
# STEP 191 — v7.15.1  Wave Script: draw waves only on their own ticker chart
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. 2 files: WaveScriptPage.jsx + WAVE_SCRIPT.md.
# 170 tests stay green (generation logic not yet unit-tested — v7.15.2 will add it).
#
# BUG (v7.15.0):
#   The generated Pine drew EVERY wave on EVERY chart regardless of symbol
#   (AMD's wave appeared on MRNA, etc.) — it never compared against the open
#   chart's ticker.
#
# FIX:
#   - WaveScriptPage.jsx: each wave now carries its market-stripped ticker
#     (stripMarket: NEM.DE→NEM, TER.US→TER) in a parallel Pine string array
#     `tkr_arr`; renderer draws a wave only when
#     array.get(tkr_arr, i) == syminfo.ticker. Symbol not in any batch → nothing.
#   - Colour changed from global order to PER-TICKER chronological order
#     (new `ci_arr`): each ticker restarts red→blue→green→orange/purple, so a
#     ticker's N waves are N distinct colours independent of other tickers.
#   - Pine arrays migrated to typed array.new<…>() form; colour ternary kept on
#     one line (Pine has no line continuation — CE10005/CE10156).
#   - docs/WAVE_SCRIPT.md: new "Per-ticker filtering" section + refreshed Pine.
#
# Continue on feat/wave-script (same branch as v7.15.0 — merge both together):
unzip -o ~/Downloads/openbank-price-prediction_v7.15.1.zip -d .
# The zip is built from your real README.md / GIT_GUIDE.md and overwrites them;
# it changes WaveScriptPage.jsx + docs/WAVE_SCRIPT.md + README.md + GIT_GUIDE.md.

npm run test:run   # 170 tests must stay green

git add src/components/WaveScriptPage.jsx docs/WAVE_SCRIPT.md README.md GIT_GUIDE.md
git commit -m "fix(wave-script): draw waves only on their own ticker (syminfo.ticker filter) + per-ticker colour (v7.15.1)"
git push origin feat/wave-script
# → Vercel preview → test as admin: download the .txt, add to chart in
#   TradingView. Verify: AMD's waves appear ONLY on AMD (one colour per wave),
#   a symbol not in any batch shows nothing, and waves with no 12M stop at 6M.
# → then merge both v7.15.0 + v7.15.1 to main and tag:
git checkout main
git merge --no-ff --no-edit feat/wave-script
git tag -a v7.15.0 -m "v7.15.0: Wave Script — Pine Script v6 master-wave generator (admin)"
git tag -a v7.15.1 -m "v7.15.1: Wave Script — per-ticker filter (syminfo.ticker) + per-ticker colour"
git push origin main
git push origin v7.15.0
git push origin v7.15.1
# keep the branch (historical reference)


# ===========================================================================
# STEP 192 — v7.15.2  Wave Script: fix CE10209 (string data model, scalable)
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. 2 files: WaveScriptPage.jsx + WAVE_SCRIPT.md.
# 170 tests stay green (generation logic still pending unit tests — v7.15.3).
# NEEDS TRADINGVIEW COMPILE CHECK: no local Pine compiler — validate in the
# Pine Editor before merging.
#
# BUG (v7.15.1):
#   Generated Pine raised CE10209 "Script has too many local variables (1200
#   limit)" once a batch set produced ~100+ waves. The generator emitted one
#   array.push(...) per coordinate per wave (12 pushes × N waves); each push is
#   a local in Pine's #main scope, so the count grew linearly with waves.
#
# FIX:
#   - WaveScriptPage.jsx: all wave data now emitted as ONE string constant
#     WAVE_DATA (one wave per line, fields split by ";",
#     row = ticker;ci;t0;p0;t1;p1;t2;p2;t3;p3;t4;p4). Pine parses it on the last
#     bar with str.split + a drawWave() user-function → fixed local-variable
#     count regardless of wave count. Only ceiling left is the 500-line draw
#     limit (and the per-ticker filter means you only ever draw one symbol's
#     waves at a time anyway).
#   - Missing 12M is now an EMPTY trailing field (str.tonumber("") → na)
#     instead of a literal `na` push.
#   - Removed now-unused num() helper.
#   - docs/WAVE_SCRIPT.md reference rewritten for the string model.
#
# Continue on feat/wave-script (same branch as v7.15.0 + v7.15.1 — merge all 3):
unzip -o ~/Downloads/openbank-price-prediction_v7.15.2.zip -d .
# Overwrites WaveScriptPage.jsx + docs/WAVE_SCRIPT.md + README.md + GIT_GUIDE.md.

npm run test:run   # 170 tests must stay green

git add src/components/WaveScriptPage.jsx docs/WAVE_SCRIPT.md README.md GIT_GUIDE.md
git commit -m "fix(wave-script): single WAVE_DATA string parsed in loop to avoid CE10209 local-var limit (v7.15.2)"
git push origin feat/wave-script
# → Vercel preview → download the .txt, paste into the TradingView Pine Editor,
#   confirm it COMPILES (no CE10209), then add to chart and re-verify:
#   AMD's waves only on AMD, one colour per wave, nothing on symbols outside
#   your batches, no-12M waves stop at 6M.
# → then merge v7.15.0 + v7.15.1 + v7.15.2 to main and tag:
git checkout main
git merge --no-ff --no-edit feat/wave-script
git tag -a v7.15.0 -m "v7.15.0: Wave Script — Pine Script v6 master-wave generator (admin)"
git tag -a v7.15.1 -m "v7.15.1: Wave Script — per-ticker filter (syminfo.ticker) + per-ticker colour"
git tag -a v7.15.2 -m "v7.15.2: Wave Script — string data model, fixes CE10209 local-var limit"
git push origin main
git push origin v7.15.0
git push origin v7.15.1
git push origin v7.15.2
# keep the branch (historical reference)


# ===========================================================================
# STEP 193 — v7.15.3  Wave Script: dots at each point + per-wave number
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. 2 files: WaveScriptPage.jsx + WAVE_SCRIPT.md.
# 170 tests stay green (generation logic still pending unit tests — v7.15.4).
# NEEDS TRADINGVIEW COMPILE CHECK: no local Pine compiler — validate in the
# Pine Editor before merging.
#
# WHAT'S NEW (visual):
#   - A small dot (●) is drawn at each forecast point (base/1M/3M/6M, and 12M
#     when present), coloured to match the wave.
#   - Each wave shows its chronological number (1 = oldest for that ticker,
#     = ci + 1) at its end point (12M, or 6M when no 12M), same colour.
#   - Implemented via a top-level dot() helper (Pine forbids nested functions)
#     and label.new with a transparent background (only the glyph/number shows).
#   - indicator() now also sets max_labels_count = 500.
#   Per-ticker filter, colour, and WAVE_DATA string model are unchanged.
#
# Continue on feat/wave-script (same branch — merge all of v7.15.x together):
unzip -o ~/Downloads/openbank-price-prediction_v7.15.3.zip -d .
# Overwrites WaveScriptPage.jsx + docs/WAVE_SCRIPT.md + README.md + GIT_GUIDE.md.

npm run test:run   # 170 tests must stay green

git add src/components/WaveScriptPage.jsx docs/WAVE_SCRIPT.md README.md GIT_GUIDE.md
git commit -m "feat(wave-script): dot at each forecast point + per-wave number in wave colour (v7.15.3)"
git push origin feat/wave-script
# → Vercel preview → download the .txt, paste into the TradingView Pine Editor,
#   confirm it COMPILES, then add to chart and verify: a coloured ● sits on each
#   forecast point, and each wave shows its number (1,2,3…) at its end in the
#   wave's colour; no-12M waves show the number at the 6M point.
# → then merge all v7.15.x to main and tag (see STEP 192 for the full tag list,
#   adding v7.15.3):
git checkout main
git merge --no-ff --no-edit feat/wave-script
git tag -a v7.15.3 -m "v7.15.3: Wave Script — dots at each point + per-wave number"
git push origin main
git push origin v7.15.3
# (also push v7.15.0/.1/.2 tags if not pushed yet — see STEP 192)
# keep the branch (historical reference)


# ===========================================================================
# STEP 194 — v7.15.4  Wave Script: bigger per-wave number (size.large)
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. 2 files: WaveScriptPage.jsx + WAVE_SCRIPT.md.
# 170 tests stay green. Trivial one-word Pine change (size.normal → size.large).
# NEEDS TRADINGVIEW COMPILE CHECK before merging.
#
# WHAT'S NEW:
#   - The per-wave number label now uses size.large (was size.normal) so it's
#     more visible on the chart. Dots and all other behaviour unchanged.
#
# Continue on feat/wave-script (same branch — merge all of v7.15.x together):
unzip -o ~/Downloads/openbank-price-prediction_v7.15.4.zip -d .
# Overwrites WaveScriptPage.jsx + docs/WAVE_SCRIPT.md + README.md + GIT_GUIDE.md.

npm run test:run   # 170 tests must stay green

git add src/components/WaveScriptPage.jsx docs/WAVE_SCRIPT.md README.md GIT_GUIDE.md
git commit -m "feat(wave-script): bigger per-wave number (size.large) for visibility (v7.15.4)"
git push origin feat/wave-script
# → Vercel preview → download the .txt, paste into the TradingView Pine Editor,
#   confirm it compiles, add to chart, check the wave numbers are now bigger.
#   If still too small/big, say so — size options: tiny < small < normal <
#   large < huge.
# → then merge all v7.15.x to main and tag:
git checkout main
git merge --no-ff --no-edit feat/wave-script
git tag -a v7.15.4 -m "v7.15.4: Wave Script — bigger per-wave number (size.large)"
git push origin main
git push origin v7.15.4
# (also push earlier v7.15.x tags if not pushed yet — see STEP 192/193)
# keep the branch (historical reference)


# ===========================================================================
# STEP 195 — v7.15.5  All Stocks: label the two sector filters (UX)
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install (no new deps). 1 code file + 2 docs:
# AllStocksPage.jsx + README.md + GIT_GUIDE.md.
# 170 tests stay green (21 AllStocksPage tests included).
# NEW BRANCH from main (Wave Script v7.15.0–.4 already merged at 9ec215e).
#
# PROBLEM:
#   Two sector filters on the All Stocks page looked identical — one for Top
#   Picks (topPicksSec, top-right) and one for the table (filterSec, in the
#   dense filter row). Easy to use the wrong one and think Top Picks "didn't
#   reorder". Not a bug — a UX/labelling problem.
#
# FIX (presentation only, both states kept independent):
#   - Top Picks header reframed as a card: "Top picks · mostrando mejores de:
#     [sector] · ordenados por [Upside/Score] · [horizon]". The picks sector
#     <select> now lives inside that sentence so it's obvious what it controls.
#   - The table's sector <select> gets a "Tabla:" label in front of it.
#   No logic / data-model / backend changes; topPicksSec & filterSec untouched.
#
# Branch from main:
git checkout main && git pull origin main
git checkout -b feat/toppicks-sector-ux

unzip -o ~/Downloads/openbank-price-prediction_v7.15.5.zip -d .
# Overwrites AllStocksPage.jsx + README.md + GIT_GUIDE.md.

npm run test:run   # 170 tests must stay green

git add src/components/AllStocksPage.jsx README.md GIT_GUIDE.md
git commit -m "feat(allstocks): label the two sector filters to remove UX confusion (v7.15.5)"
git push -u origin feat/toppicks-sector-ux
# → Vercel preview → on All Stocks, confirm: the Top Picks card reads
#   "mostrando mejores de: [sector]" and reorders its boxes from its own
#   selector; the table row shows "Tabla:" before its sector selector; the two
#   filters work independently (different sectors at once still possible).
# → then merge to main and tag:
git checkout main
git merge --no-ff --no-edit feat/toppicks-sector-ux
git tag -a v7.15.5 -m "v7.15.5: All Stocks — label the two sector filters (UX)"
git push origin main
git push origin v7.15.5
# keep the branch (historical reference)


# ===========================================================================
# STEP 196 — v7.15.6  Top Picks: help ⓘ tooltip on Upside / Score buttons
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. 1 code file + 2 docs:
# AllStocksPage.jsx + README.md + GIT_GUIDE.md.
# 170 tests stay green. CONTINUES on feat/toppicks-sector-ux (same branch as
# v7.15.5 — the two merge together).
#
# WHAT'S NEW:
#   - Each ranking-criteria button (Upside / Score) gets its own help ⓘ tooltip,
#     reusing the existing ColTooltip component (same pattern as the table
#     column headers). Upside → ranks by remaining upside from today's price to
#     the Openbank target (no fundamentals needed). Score → ranks by the 0–100
#     investment score (Upside 40% + PEG 45% + Net Margin 15%, −20 if EPS < 0;
#     only ranks stocks that have a Score).
#   Presentation-only; no logic/data/backend changes.
#
# Continue on feat/toppicks-sector-ux (already has v7.15.5):
unzip -o ~/Downloads/openbank-price-prediction_v7.15.6.zip -d .
# Overwrites AllStocksPage.jsx + README.md + GIT_GUIDE.md (these already include
# the v7.15.5 changes, since v7.15.6 builds on the same branch).

npm run test:run   # 170 tests must stay green

git add src/components/AllStocksPage.jsx README.md GIT_GUIDE.md
git commit -m "feat(allstocks): help tooltip on Upside/Score ranking buttons (v7.15.6)"
git push origin feat/toppicks-sector-ux
# → Vercel preview → on All Stocks, hover the ⓘ next to Upside and next to Score;
#   confirm each shows its explanation and is readable (not clipped/mispositioned).
# → then merge v7.15.5 + v7.15.6 together to main and tag both:
git checkout main
git merge --no-ff --no-edit feat/toppicks-sector-ux
git tag -a v7.15.5 -m "v7.15.5: All Stocks — label the two sector filters (UX)"
git tag -a v7.15.6 -m "v7.15.6: Top Picks — help tooltip on Upside/Score buttons"
git push origin main
git push origin v7.15.5 v7.15.6
# keep the branch (historical reference)


# ===========================================================================
# STEP 197 — v7.15.7  Wave Script: extract pure logic + 25 unit tests
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install (no new deps). 4 files:
#   NEW  src/utils/waveScript.js        (extracted pure logic)
#   NEW  src/utils/waveScript.test.js   (25 tests)
#        src/components/WaveScriptPage.jsx  (now imports from the module)
#        README.md + GIT_GUIDE.md
# Test suite: 170 → 195 tests across 11 files, all green.
# NEW BRANCH from main (v7.15.6 already merged at 274e28c).
#
# WHAT'S NEW:
#   - extractWaves / buildPineScript (+ parseDDMMYYYY, addMonths, epochMs,
#     stripMarket) moved out of WaveScriptPage.jsx into src/utils/waveScript.js,
#     following the utils+test convention (dates.js, stocks.js). Behaviour is
#     byte-for-byte identical; the component just imports them now.
#   - src/utils/waveScript.test.js: 25 tests across stripMarket, addMonths,
#     parseDDMMYYYY, extractWaves (dedup, chronological sort, null 12M, EU
#     ticker norm, calendar-month axis, incomplete-spine skip) and
#     buildPineScript (v6 header + limits, per-ticker syminfo filter, per-ticker
#     colour restart, empty 12M field, drawWave, wave count, empty-list safety).
#
# Branch from main:
git checkout main && git pull origin main
git checkout -b feat/wavescript-tests

unzip -o ~/Downloads/openbank-price-prediction_v7.15.7.zip -d .
# Adds src/utils/waveScript.js + src/utils/waveScript.test.js, updates
# WaveScriptPage.jsx + README.md + GIT_GUIDE.md.

npm run test:run   # expect 195 tests across 11 files, all green

git add src/utils/waveScript.js src/utils/waveScript.test.js src/components/WaveScriptPage.jsx README.md GIT_GUIDE.md
git commit -m "test(wave-script): extract pure logic to utils/waveScript.js + 25 unit tests (v7.15.7)"
git push -u origin feat/wavescript-tests
# → Vercel preview (the Wave Script page must still download an identical .txt —
#   the refactor is behaviour-preserving). No Pine change, so no TradingView
#   re-validation strictly needed, but a quick download check is reassuring.
# → then merge to main and tag:
git checkout main
git merge --no-ff --no-edit feat/wavescript-tests
git tag -a v7.15.7 -m "v7.15.7: Wave Script — extract pure logic + 25 unit tests"
git push origin main
git push origin v7.15.7
# keep the branch (historical reference)


# ===========================================================================
# STEP 198 — v7.16.0  Composite batch id (date + market + direction)
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install (no new deps). 4 src files + 2 docs:
#        src/services/storage.js      (buildBatchId composite + marketOf helper)
#        src/hooks/useHistory.js      (saveBatch derives market + builds composite id)
#        src/App.jsx                  (handleImport composite provisional id; passes loadedBatchId)
#        src/components/FetchBar.jsx  (selector shows market+direction pills, active by id)
#        README.md + GIT_GUIDE.md
# NEW BRANCH from main (v7.15.7 already merged). This branch is SHARED by the
# whole v7.16.x line — v7.16.1 and v7.16.2 land on it too; merge at the end.
#
# WHY:
#   Same-day imports with a different market or direction were merging into one
#   batch, because the batch id (the Supabase primary key) was the DATE ONLY.
#   A bullish US list, a bearish US list and a bearish ES list saved on the same
#   day all collapsed into a single batch, and the last import overwrote the
#   batch `direction` (so the whole thing "became bearish").
#
# WHAT'S NEW:
#   - storage.js: buildBatchId(date, market, direction) now returns a COMPOSITE
#     id "YYYY-MM-DD_MKT_dir" (e.g. 2026-06-28_US_bullish). Called with date only
#     (market & direction omitted) it still returns the legacy "YYYY-MM-DD" id,
#     so existing batches keep their key and never collide with new ones.
#     New marketOf(ticker) — single source of truth for batch market, derived
#     from the ticker's exchange suffix ('AAPL'/'SLB.US' -> 'US', 'SAN.MC' -> 'MC').
#   - useHistory.saveBatch: derives market from the first ticker and builds the
#     composite id. The existing date-keyed merge now only merges a RE-IMPORT of
#     the SAME date+market+direction (adding/refreshing tickers) — never a
#     different list on the same day.
#   - App.handleImport: computes the same composite provisional id so
#     weekly_prices for a previously-saved same-day batch still resolve, and
#     passes loadedBatchId down to FetchBar.
#   - FetchBar batch selector: each entry shows a neutral MARKET pill + a
#     green/red DIRECTION pill, and the active batch is matched by id (not date),
#     so same-day batches are distinguishable and only the loaded one is checked.
#
# Back-compatible: no migration, no schema change. Old date-only ids are left
# untouched; only NEW saves get composite ids.
#
# Branch from main:
git checkout main && git pull origin main
git checkout -b feat/batch-trend-market

unzip -o ~/Downloads/openbank-price-prediction_v7.16.0.zip -d .
# Overlays the 4 src files + README.md + GIT_GUIDE.md straight into the repo
# (no wrapping folder, same as every previous version). Then confirm the docs
# diff is only the v7.16.0 changelog row + this STEP 198 block:
git status
git diff --stat

npm run test:run   # existing suite should stay green (buildBatchId is back-compatible).
                   # If a buildBatchId/merge test asserts the old date-only id,
                   # update it for the composite id and tell me.

git add src/services/storage.js src/hooks/useHistory.js src/App.jsx src/components/FetchBar.jsx README.md GIT_GUIDE.md
git commit -m "feat: composite batch id (date+market+direction) + load selector chips (v7.16.0)"
git tag -a v7.16.0 -m "v7.16.0: batch identity by date+market+direction; differentiate same-day batches in the load selector"
git push -u origin feat/batch-trend-market
git push origin v7.16.0
# → Vercel preview: import two same-day lists with a different direction/market
#   (e.g. US bullish + US bearish + ES bearish on the same date); confirm they
#   appear as SEPARATE batches in the selector, each with its market + direction
#   pill, and only the loaded one is checked.
# DO NOT merge yet — v7.16.1 (Accuracy columns) and v7.16.2 (All Stocks trend
# filter) land on this SAME branch first, then we merge --no-ff and tag all three.


# ===========================================================================
# STEP 199 — v7.16.1  Accuracy: Market + Trend columns (Historical batches)
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. SAME branch as v7.16.0
# (feat/batch-trend-market) — do NOT merge yet. 2 src files + 2 docs:
#        src/hooks/useHistory.js           (computed() adds `market` to batchSummary)
#        src/components/AccuracyChart.jsx   (Market + Trend columns)
#        README.md + GIT_GUIDE.md
#
# WHY:
#   After v7.16.0 separated same-day batches, the Accuracy "Historical batches"
#   table still distinguished them only by a tiny 📈/📉 badge glued to the date,
#   which is ambiguous (no market, easy to misread). Approved design = Option 2:
#   two dedicated, scannable columns.
#
# WHAT'S NEW:
#   - useHistory.computed(): each batchSummary row now carries `market`, derived
#     via marketOf(b.results[0].ticker) — works for old batches too (derived from
#     their tickers, no migration). `direction` was already present.
#   - AccuracyChart Historical batches table:
#       * header is now Date · Market · Trend · Stocks · Hit Rate · Ext Rate ·
#         Hit · Exc · Miss · Await · Actions (empty-state colSpan 9 -> 11).
#       * Date cell is clean (no inline emoji badge).
#       * Market = neutral pill with the raw exchange code (US, MC, DE, AS, PA, L)
#         — same code language as the load selector and All Stocks.
#       * Trend = green "↗ Bull" / red "↘ Bear" pill (same colour language as the
#         import selector and the v7.16.0 selector chips).
#
# Commit on the SHARED branch (already created in STEP 198):
git checkout feat/batch-trend-market

unzip -o ~/Downloads/openbank-price-prediction_v7.16.1.zip -d .
# Overlays src/hooks/useHistory.js + src/components/AccuracyChart.jsx +
# README.md + GIT_GUIDE.md straight into the repo. Confirm the docs diff is only
# the v7.16.1 row + this STEP 199 block:
git status
git diff --stat

npm run test:run   # existing suite should stay green.

git add src/hooks/useHistory.js src/components/AccuracyChart.jsx README.md GIT_GUIDE.md
git commit -m "feat: Accuracy Market + Trend columns for same-day batches (v7.16.1)"
git tag -a v7.16.1 -m "v7.16.1: Accuracy Historical batches — separate Market and Trend columns (Option 2)"
git push origin feat/batch-trend-market
git push origin v7.16.1
# → Vercel preview: Accuracy Stats → Historical batches — confirm the three
#   same-day rows now show distinct Market + Trend columns and the date is clean.
# STILL DO NOT MERGE — v7.16.2 (All Stocks trend filter) lands next, then we
# merge --no-ff all three together.


# ===========================================================================
# STEP 200 — v7.16.2  Fix: same-day re-import overwrote instead of merging
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. SAME branch (feat/batch-trend-market) —
# do NOT merge yet. 1 src file + 2 docs:
#        src/hooks/useHistory.js
#        README.md + GIT_GUIDE.md
#
# BUG (found in v7.16.0/v7.16.1 testing):
#   Re-importing a ticker into an existing batch of the SAME date+market+
#   direction REPLACED the whole batch with just the re-imported ticker(s),
#   instead of MERGING. Reproduces reliably after a page reload.
#
# CAUSE:
#   saveBatch found the existing batch via current.batches.find(b => b.id===id),
#   where `current = history` (in-memory). After a reload — or any time the
#   in-memory history lags Supabase — that list can miss the existing same-day
#   batch. existingBatch is then undefined, so mergedResults = just the new
#   tickers, and saveHistory's merge-duplicates upsert (keyed by id) overwrites
#   the existing DB row with the smaller batch. loadHistory() DOES return full
#   results (storage.js:76), so the data was always there — the lookup just used
#   a stale source.
#
# FIX:
#   saveBatch now reloads the freshest history from the DB (loadHistory()) right
#   before the merge lookup, falling back to in-memory history only if that read
#   fails. So a re-import of the same date+market+direction always finds the
#   existing batch and MERGES. The merge also guards against a missing results
#   array ((existingBatch.results ?? [])). otherBatches is derived from the same
#   fresh list, which also prevents stale in-memory state from dropping batches.
#
# Commit on the SHARED branch:
git checkout feat/batch-trend-market

unzip -o ~/Downloads/openbank-price-prediction_v7.16.2.zip -d .
git status
git diff --stat   # expect: src/hooks/useHistory.js + README.md + GIT_GUIDE.md

npm run test:run

git add src/hooks/useHistory.js README.md GIT_GUIDE.md
git commit -m "fix: same-day re-import merges instead of overwriting (fresh history lookup) (v7.16.2)"
git tag -a v7.16.2 -m "v7.16.2: fix same-day re-import overwriting an existing batch — merge lookup reads fresh history"
git push origin feat/batch-trend-market
git push origin v7.16.2
# → Vercel preview re-test (the case that failed):
#   1) Load exists: a saved batch of N tickers (same date+market+direction).
#   2) RELOAD the page.
#   3) Import 1 ticker of that same date/market/direction → Save.
#   4) Expect the batch to become N (or N+1) tickers — MERGED, not replaced.
# STILL DO NOT MERGE — v7.16.3 (All Stocks trend filter) lands next.


# ===========================================================================
# STEP 201 — v7.16.3  All Stocks: Trend (bullish/bearish) filter
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. LAST version of the v7.16.x line on the
# shared branch (feat/batch-trend-market). 1 src file + 2 docs:
#        src/components/AllStocksPage.jsx
#        README.md + GIT_GUIDE.md
#
# WHAT'S NEW:
#   - deduplicateStocks() and expandStockInstances() now attach `direction`
#     (batch.direction ?? 'bullish') to every row, so each stock knows the trend
#     of its batch. Spreads through to `stocks` via ...s — no other plumbing.
#   - trendCounts memo counts bullish vs bearish across the visible stocks.
#   - New Trend filter row beside the Market filter: All / ↗ Bull (green) /
#     ↘ Bear (red), neutral when inactive, shown ONLY when both trends exist.
#   - filtered memo applies filterTrend ('' | 'bullish' | 'bearish').
#
# Note: the de-duplicated table shows newest-batch-wins per ticker, so a ticker
# present in both a bullish and a bearish batch reflects its newest batch's
# trend — consistent with how the Market filter already behaves.
#
# Commit on the SHARED branch:
git checkout feat/batch-trend-market

unzip -o ~/Downloads/openbank-price-prediction_v7.16.3.zip -d .
git status
git diff --stat   # expect: src/components/AllStocksPage.jsx + README.md + GIT_GUIDE.md

npm run test:run

git add src/components/AllStocksPage.jsx README.md GIT_GUIDE.md
git commit -m "feat: All Stocks bullish/bearish Trend filter (v7.16.3)"
git tag -a v7.16.3 -m "v7.16.3: All Stocks Trend filter (bullish/bearish) beside the Market filter"
git push origin feat/batch-trend-market
git push origin v7.16.3
# → Vercel preview: All Stocks — with same-day bullish + bearish batches loaded,
#   the Trend filter appears; All / ↗ Bull / ↘ Bear filter the table correctly.

# ===========================================================================
# FINAL MERGE — the whole v7.16.x line (v7.16.0 → v7.16.3) into main
# ===========================================================================
# Only after ALL four previews validated. The four annotated tags already point
# at their commits on the branch and stay valid after the merge.
git checkout main && git pull origin main
git merge --no-ff --no-edit feat/batch-trend-market
git push origin main
# Push tags (if not already pushed):
git push origin v7.16.0 v7.16.1 v7.16.2 v7.16.3
# Branch is kept as historical reference — do NOT delete.
# If Vercel doesn't redeploy after the merge:
#   git commit --allow-empty -m "chore: trigger vercel deploy" && git push


# ===========================================================================
# STEP 202 — v7.16.4  Fix: gray band on the right of the All Stocks table
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. NEW standalone branch off main
# (the v7.16.x line is already merged). 1 src file + 2 docs:
#        src/components/AllStocksPage.jsx   (1-line: table wrapper overflow)
#        README.md + GIT_GUIDE.md
#
# BUG:
#   A vertical gray band appeared on the right of the All Stocks table, with a
#   hard vertical edge mid-table that didn't line up with any column.
#
# CAUSE (not a drawn element):
#   The table wrapper used `overflow-visible`. The raw <table> is w-full but its
#   columns have content-based min widths; with many columns (and the sidebar
#   expanded → narrower content area) the table is wider than its card. With
#   overflow-visible the right columns spill OUTSIDE the white card box and sit
#   on the page background (--background #f9f9fb, light gray). The "band" is that
#   page background showing through; the sharp edge is the card's right border.
#   (global.css confirms --card #fff vs --background #f9f9fb; the project's own
#    shadcn Table wraps in `relative w-full overflow-auto` — the correct pattern.)
#
# FIX (1 line, AllStocksPage.jsx ~1204):
#   - <div className="bg-card border border-border rounded-xl overflow-visible">
#   + <div className="bg-card border border-border rounded-xl overflow-x-auto">
#   Now the table scrolls horizontally inside the white card instead of spilling.
#   When the table fits (wide screen) it looks identical to before.
#
# Caveat to check in preview: overflow-x-auto also clips vertical overflow inside
# the card. Header info tooltips (ⓘ) that open UPWARD could be clipped. They
# normally open downward over the rows, so likely fine — verify. If any tooltip
# clips, the fallback is to wrap only the <table> in the scroller and keep the
# header tooltips outside the scroll box (separate small change).
#
# Branch off main:
git checkout main && git pull origin main
git checkout -b fix/allstocks-gray-band

unzip -o ~/Downloads/openbank-price-prediction_v7.16.4.zip -d .
git status
git diff --stat   # expect: src/components/AllStocksPage.jsx + README.md + GIT_GUIDE.md

npm run test:run

git add src/components/AllStocksPage.jsx README.md GIT_GUIDE.md
git commit -m "fix: All Stocks table scrolls in-card instead of spilling onto page bg (gray band) (v7.16.4)"
git tag -a v7.16.4 -m "v7.16.4: fix gray band on the right of the All Stocks table (overflow-x-auto)"
git push -u origin fix/allstocks-gray-band
git push origin v7.16.4
# → Vercel preview: All Stocks with the sidebar EXPANDED (and/or a narrow window)
#   — the right columns stay inside the white card; no gray spill. If it doesn't
#   fit, a horizontal scrollbar appears inside the card. Check header ⓘ tooltips.

# Merge to main (this fix is standalone — merge after the preview validates):
git checkout main && git pull origin main
git merge --no-ff --no-edit fix/allstocks-gray-band
git push origin main
git push origin v7.16.4
# Branch kept as historical reference — do NOT delete.


# ===========================================================================
# STEP 203 — v7.17.0  EU current prices via Yahoo proxy (Edge Function)
# ===========================================================================
#
# Opens the "EU data via Yahoo" line (Phase 1 = prices only). NEW branch off main.
# Touches Supabase (1 new Edge Function) + 1 src file + 2 docs:
#        supabase/functions/get-eu-prices/index.ts   (NEW — deploy via dashboard)
#        src/hooks/usePriceFetch.js                   (route EU → Edge Function)
#        README.md + GIT_GUIDE.md
# NO new env vars (reuses VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). No API keys.
#
# WHY:
#   The in-app "Fetch prices" button sent EU tickers (.DE/.AS/.PA/.L/.MC) to
#   Alpha Vantage — 25 req/day and poor EU coverage, so EU prices failed. The
#   cron Edge Functions already fetch EU fine via Yahoo (server-side, no CORS).
#   This makes that same Yahoo path callable from the browser, on demand.
#
# WHAT'S NEW:
#   - get-eu-prices Edge Function: POST { tickers:[...] } → { prices:{t:close}, failed:[] }.
#     Proxies Yahoo chart (meta.regularMarketPrice, fallback last close). CORS
#     enabled; only EU suffixes are fetched (US ignored).
#   - usePriceFetch: detectProvider now returns 'eu' | 'twelvedata'. Current EU
#     prices go through fetchCurrentPrices_EU (the Edge Function) instead of
#     Alpha Vantage. US current prices unchanged (Twelve Data). Historical EU is
#     unchanged (cron cache, with AV as last-resort fallback).
#
# ── STEP 1 — Deploy the Edge Function FIRST (before testing the app) ──────────
#   Supabase Dashboard → Edge Functions → "Deploy a new function"
#     • Name: get-eu-prices   (EXACT — the app builds /functions/v1/get-eu-prices)
#     • Paste supabase/functions/get-eu-prices/index.ts
#     • IMPORTANT: turn "Verify JWT" OFF (public price proxy; also lets the CORS
#       preflight through). No secrets to set.
#   Quick smoke test (replace <PROJECT> with your project ref):
#     curl -s -X POST 'https://<PROJECT>.functions.supabase.co/get-eu-prices' \
#       -H 'Content-Type: application/json' \
#       -d '{"tickers":["SAN.MC","BMW.DE"]}'
#   → expect {"prices":{"SAN.MC":<num>,"BMW.DE":<num>},"failed":[]}
#
# ── STEP 2 — Ship the app change ─────────────────────────────────────────────
git checkout main && git pull origin main
git checkout -b feat/eu-prices-yahoo

unzip -o ~/Downloads/openbank-price-prediction_v7.17.0.zip -d .
git status
git diff --stat   # expect: supabase/functions/get-eu-prices/index.ts (new),
                  #         src/hooks/usePriceFetch.js, README.md, GIT_GUIDE.md

npm run test:run

git add supabase/functions/get-eu-prices/index.ts src/hooks/usePriceFetch.js README.md GIT_GUIDE.md
git commit -m "feat: EU current prices via get-eu-prices Yahoo proxy (v7.17.0)"
git tag -a v7.17.0 -m "v7.17.0: EU current prices via Yahoo Edge Function proxy (replaces Alpha Vantage for EU)"
git push -u origin feat/eu-prices-yahoo
git push origin v7.17.0
# → Vercel preview: load an EU batch (e.g. .MC/.DE) → Fetch prices. Expect prices
#   loaded "via Yahoo", no Alpha Vantage 25/day message. US batches unchanged.

# Merge to main (after the function is deployed AND the preview validates):
git checkout main && git pull origin main
git merge --no-ff --no-edit feat/eu-prices-yahoo
git push origin main
git push origin v7.17.0
# Branch kept as historical reference — do NOT delete.


# ===========================================================================
# STEP 204 — v7.17.1  EU fundamentals via Yahoo proxy (Edge Function)
# ===========================================================================
#
# Phase 2 of "EU data via Yahoo". NEW branch off main. Supabase (1 new Edge
# Function) + 1 src file + 2 docs:
#        supabase/functions/get-eu-fundamentals/index.ts   (NEW — deploy via dashboard)
#        src/hooks/useFundamentals.js                       (route EU → Edge Function)
#        README.md + GIT_GUIDE.md
# NO new env vars (reuses VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). No API keys.
#
# WHY:
#   Finnhub /stock/metric and FMP /profile free tiers are US-only, so EU tickers
#   (.DE/.AS/.PA/.L/.MC) had empty sector/PE/margins/etc. The "Fetch fundamentals"
#   button returned partial/empty data for EU.
#
# WHAT'S NEW:
#   - get-eu-fundamentals Edge Function: POST { tickers:[...] } →
#     { fundamentals:{ t:{...} }, failed:[] }. Proxies Yahoo quoteSummary
#     (modules summaryProfile, summaryDetail, defaultKeyStatistics, financialData,
#     price), with best-effort cookie+crumb (+1 retry). Returns fields ALREADY
#     normalized to the app schema/units:
#       * percent-style ×100: netMarginTTM, roeTTM, roaTTM, epsGrowthTTM,
#         revGrowthTTM, divYield   (Yahoo gives decimals)
#       * debtEquity ÷100 (Yahoo debtToEquity is percent-style → ratio, like Finnhub)
#       * peTTM, forwardPE, pegTTM, beta, marketCap (absolute USD): as-is
#       * null (accepted): forwardPEG, pfcfTTM, epsGrowth3Y, epsGrowth5Y
#   - useFundamentals: EU tickers go to fetchEUFundamentals (the Edge Function) and
#     skip Finnhub/FMP; US path unchanged. Finnhub key now only required when the
#     batch contains US tickers (EU-only batches no longer blocked).
#
# ── STEP 1 — Deploy the Edge Function FIRST, then smoke-test ──────────────────
#   Dashboard → Edge Functions → Deploy a new function
#     • Name (EXACT): get-eu-fundamentals
#     • Paste supabase/functions/get-eu-fundamentals/index.ts
#     • Verify JWT OFF (browser-called; lets the CORS preflight through). No secrets.
#   Smoke test (no auth header needed once JWT is off):
#     curl -s -X POST 'https://yyenwzljojxbqtzcbchk.functions.supabase.co/get-eu-fundamentals' \
#       -H 'Content-Type: application/json' \
#       -d '{"tickers":["SAN.MC","BMW.DE"]}'
#   → expect {"fundamentals":{"SAN.MC":{"sector":"Financial Services","peTTM":...,
#     "netMarginTTM":<~20-ish, a PERCENT>,"divYield":<percent>,...}, ...},"failed":[]}
#   Sanity-check the SCALES against a US stock you know: margin/ROE should read as
#   percents (e.g. 19.5 not 0.195); debtEquity as a ratio (e.g. 0.85). If any field
#   looks 100× off, tell me which and I'll flip its scale.
#
# ── STEP 2 — Ship the app change ─────────────────────────────────────────────
git checkout main && git pull origin main
git checkout -b feat/eu-fundamentals-yahoo

unzip -o ~/Downloads/openbank-price-prediction_v7.17.1.zip -d .
git status
git diff --stat   # expect: supabase/functions/get-eu-fundamentals/index.ts (new),
                  #         src/hooks/useFundamentals.js, README.md, GIT_GUIDE.md

npm run test:run

git add supabase/functions/get-eu-fundamentals/index.ts src/hooks/useFundamentals.js README.md GIT_GUIDE.md
git commit -m "feat: EU fundamentals via get-eu-fundamentals Yahoo proxy (v7.17.1)"
git tag -a v7.17.1 -m "v7.17.1: EU fundamentals via Yahoo quoteSummary Edge Function proxy"
git push -u origin feat/eu-fundamentals-yahoo
git push origin v7.17.1
# → Vercel preview: load an EU batch → Fetch fundamentals (or Refresh). EU rows
#   should now show sector/PE/PEG/Margin etc. Compare a couple of values against
#   Yahoo Finance to confirm scales. US batches unchanged.

# Merge to main (after the function is deployed AND the preview validates):
git checkout main && git pull origin main
git merge --no-ff --no-edit feat/eu-fundamentals-yahoo
git push origin main
git push origin v7.17.1
# Branch kept as historical reference — do NOT delete.


# ===========================================================================
# STEP 205 — v7.17.2  Cleanup: remove dead Alpha Vantage current-price code
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. NEW standalone branch off main.
# 1 src file + 2 docs. No behavior change.
#        src/hooks/usePriceFetch.js
#        README.md + GIT_GUIDE.md
#
# WHAT WAS REMOVED (dead after v7.17.0):
#   - fetchCurrentPrices_AV (EU current prices via Alpha Vantage)
#   - avCacheGet / avCacheSet / AV_CACHE_KEY / AV_CACHE_TTL (24h localStorage cache)
#   - AV_RATE_LIMIT catch branch in fetchCurrentBatch (unreachable)
#
# WHAT WAS KEPT (still active):
#   - AV_KEY / AV_URL / fetchHistoricalPrice_AV — last-resort fallback for
#     historical EU prices when the cron cache is empty. Not EU current prices.
#
# OTHER:
#   - Module header updated to reflect the Yahoo-proxy EU path.
#
git checkout main && git pull origin main
git checkout -b chore/cleanup-av-current-prices

unzip -o ~/Downloads/openbank-price-prediction_v7.17.2.zip -d .
git status
git diff --stat   # expect: src/hooks/usePriceFetch.js + README.md + GIT_GUIDE.md

npm run test:run

git add src/hooks/usePriceFetch.js README.md GIT_GUIDE.md
git commit -m "chore: remove dead Alpha Vantage current-price code (v7.17.2)"
git tag -a v7.17.2 -m "v7.17.2: cleanup — remove fetchCurrentPrices_AV and its localStorage cache"
git push -u origin chore/cleanup-av-current-prices
git push origin v7.17.2
# → No preview validation needed (no behavior change). Merge immediately:
git checkout main && git pull origin main
git merge --no-ff --no-edit chore/cleanup-av-current-prices
git push origin main
git push origin v7.17.2
# Branch kept as historical reference — do NOT delete.


# ===========================================================================
# STEP 206 — v7.17.3  All Stocks: sticky header + Trend filter Option B
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. NEW standalone branch off main.
# 1 src file + 2 docs:
#        src/components/AllStocksPage.jsx
#        README.md + GIT_GUIDE.md
#
# WHAT'S NEW — two changes in the same file:
#
# 1. STICKY HEADER (table headers stay visible while scrolling down)
#    Root cause: `sticky top-0` on <th> requires the scrolling ancestor to be
#    on the SAME axis. With a single `overflow-x-auto` wrapper, the vertical
#    scroll is on the page/viewport (a different ancestor), so sticky doesn't
#    anchor. Fix: double-scroll pattern:
#      outer div: overflow-x-auto (horizontal — keeps table in white card)
#      inner div: overflow-y-auto max-h-[calc(100vh-280px)] (vertical — sticky
#                 anchors here, headers freeze while list scrolls down)
#    Tooltips (ⓘ) open downward over the rows — not clipped by the scroll box.
#
# 2. TREND FILTER OPTION B (all matching instances, not just newest)
#    Before: filterTrend was in the `filtered` memo which works on the newest
#    instance per ticker — so filtering Bear hid a ticker even if it had older
#    bearish instances.
#    After: filterTrend removed from `filtered` memo; applied per-instance in
#    the row renderer (visibleRows). Only instances matching the active trend
#    are rendered; tickers with zero matching instances are skipped entirely.
#    Collapsed/search mode still shows at most 1 row, filtered by trend.
#
git checkout main && git pull origin main
git checkout -b feat/allstocks-sticky-trend-b

unzip -o ~/Downloads/openbank-price-prediction_v7.17.3.zip -d .
git status
git diff --stat   # expect: src/components/AllStocksPage.jsx + README.md + GIT_GUIDE.md

npm run test:run

git add src/components/AllStocksPage.jsx README.md GIT_GUIDE.md
git commit -m "feat: All Stocks sticky header + Trend filter Option B (v7.17.3)"
git tag -a v7.17.3 -m "v7.17.3: All Stocks sticky header (double-scroll) + Trend filter per-instance (Option B)"
git push -u origin feat/allstocks-sticky-trend-b
git push origin v7.17.3
# → Vercel preview:
#   Sticky: scroll down a long list — headers and ⓘ stay visible.
#   Trend B: with bull+bear batches loaded, filter Bear → older bear instances
#            of a ticker appear even if its newest batch is bull.
#   Horizontal scroll still works (no gray spill on the right).

# Merge to main:
git checkout main && git pull origin main
git merge --no-ff --no-edit feat/allstocks-sticky-trend-b
git push origin main
git push origin v7.17.3
# Branch kept as historical reference — do NOT delete.


# ===========================================================================
# STEP 207 — v7.17.4  Fix: Twelve Data credit burn on batch load
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. NEW standalone branch off main.
# 2 src files + 2 docs:
#        src/hooks/usePriceFetch.js   (outputsize=5 in fetchHistoricalPrice_TD)
#        src/App.jsx                   (600ms debounce on auto-fetch useEffect)
#        README.md + GIT_GUIDE.md
#
# ROOT CAUSE (two compounding issues):
#
# 1. OUTPUTSIZE DEFAULT (usePriceFetch.js)
#    fetchHistoricalPrice_TD called Twelve Data /time_series with no outputsize
#    parameter → TD defaulted to 30 data points → 30 credits per ticker.
#    A 20-ticker batch with expired horizons = 600 credits consumed silently on
#    load, easily hitting the 800/day free-tier limit.
#    Fix: outputsize=5 (the 7-day search window has at most 5 trading days).
#    Cost per ticker: 5 credits instead of 30.
#
# 2. RACE CONDITION ON BATCH LOAD (App.jsx)
#    handleLoadBatch calls restoreHistPrices(results) to populate histPrices
#    from the saved batch (avoiding API calls for already-known prices).
#    But the auto-fetch useEffect also fires in the same render cycle, before
#    the restoreHistPrices state update is visible — it sees histPrices as
#    empty and schedules fetches for ALL tickers, even those already restored.
#    Fix: 600ms setTimeout in the useEffect, with cleanup on unmount/re-render.
#    restoreHistPrices settles first; only genuinely missing prices are fetched.
#
# COMBINED EFFECT:
#    20-ticker batch, 1 expired horizon, prices already in the saved batch:
#    Before: 20 × 30 = 600 credits. After: 0 credits (all restored, none fetched).
#    20-ticker batch, 1 expired horizon, prices NOT in the saved batch:
#    Before: 600 credits. After: 20 × 5 = 100 credits.
#
git checkout main && git pull origin main
git checkout -b fix/td-credit-burn

unzip -o ~/Downloads/openbank-price-prediction_v7.17.4.zip -d .
git status
git diff --stat   # expect: src/hooks/usePriceFetch.js + src/App.jsx + README.md + GIT_GUIDE.md

npm run test:run

git add src/hooks/usePriceFetch.js src/App.jsx README.md GIT_GUIDE.md
git commit -m "fix: Twelve Data credit burn on batch load (outputsize=5 + debounce auto-fetch) (v7.17.4)"
git tag -a v7.17.4 -m "v7.17.4: fix Twelve Data credit burn — outputsize=5 + 600ms debounce on auto-fetch"
git push -u origin fix/td-credit-burn
git push origin v7.17.4
# → Vercel preview: load a batch with an expired horizon — prices should restore
#   from the saved batch without any API call (check FetchBar log: no "Fetching…").
#   If the batch has genuinely missing historical prices, only those are fetched.
#   Monitor Twelve Data dashboard for credit usage.

# Merge to main:
git checkout main && git pull origin main
git merge --no-ff --no-edit fix/td-credit-burn
git push origin main
git push origin v7.17.4
# Branch kept as historical reference — do NOT delete.


# ===========================================================================
# STEP 208 — v7.18.0  All Stocks: "Mejores trades" trading panel
# ===========================================================================
#
# NO SUPABASE CHANGES. No npm install. NEW standalone branch off main.
# 1 src file + 2 docs:
#        src/components/AllStocksPage.jsx
#        README.md + GIT_GUIDE.md
#
# WHAT'S NEW — new collapsible panel below Top Picks, with its own help text:
#
# A standalone trading-focused ranking, separate from Top Picks (which keeps
# its existing Upside/Score toggle untouched). New panel "Mejores trades":
#
# - Own horizon pill (1M/3M/6M/12M, default 1M) and count pill (3/5/10,
#   default 5) — independent of the table's horizon and of Top Picks.
# - Sorted by Entry Quality (not Upside or Score) — the single number that
#   already combines remaining upside (50%), Score (35%) and PEG (15%).
# - Missed excluded automatically (upside <= 0 — no trade left there).
# - Late kept but visually dimmed (opacity-60 + dashed border) — still
#   visible so the user can judge it, not hidden by the data.
# - Collapsible: whole panel toggles via the header (chevron); starts
#   EXPANDED by default.
# - Help button (ⓘ) toggles an inline explanation panel — closed by default
#   — covering (1) how the selection works in plain language (today's price,
#   Missed dropped, sorted by Entry Quality, Late dimmed) and (2) what each
#   card field means (EQ, Recorrido, Score, PEG, Momentum, trend arrow), so
#   anyone opening the app understands the logic without asking.
#
# Card shows: rank, momentum pill (Strong/Building/Late — reuses MOM_META),
# ticker + company, EQ badge (reuses eqClasses), Recorrido/Score/PEG, and the
# trend arrow (reuses TREND_ARROW). Click → loads that ticker's most recent
# batch + navigates to Batch Detail + scroll/flash (same pattern as Top
# Picks cards).
#
# New state: tradingOpen (bool, default true), tradingHelpOpen (bool,
# default false), tradingHorizon (default '1M'), tradingN (default 5).
# New memo: tradingPicks — reuses entryQuality(), entryMomentum(),
# weeklyTrend() and getUpsideHoy() VERBATIM (zero new calculation logic).
#
# Mockup confirmed before implementation: mockup_mejores_trades_v2.html
# (panel position below Top Picks, collapse behavior, help panel content).
#
git checkout main && git pull origin main
git checkout -b feat/allstocks-trading-panel

unzip -o ~/Downloads/openbank-price-prediction_v7.18.0.zip -d .
git status
git diff --stat   # expect: src/components/AllStocksPage.jsx + README.md + GIT_GUIDE.md

npm run test:run

git add src/components/AllStocksPage.jsx README.md GIT_GUIDE.md
git commit -m "feat: All Stocks Mejores trades trading panel (v7.18.0)"
git tag -a v7.18.0 -m "v7.18.0: All Stocks — Mejores trades collapsible panel, sorted by Entry Quality, own horizon/count selectors, inline help"
git push -u origin feat/allstocks-trading-panel
git push origin v7.18.0
# → Vercel preview: All Stocks page → scroll below Top Picks → new "Mejores
#   trades" card. Toggle horizon (1M/3M/6M/12M) and count (3/5/10) — cards
#   re-sort by Entry Quality. Click ⓘ → help text opens/closes. Click the
#   chevron/header → whole panel collapses/expands. A ticker close to its
#   target (<8% left) should render dimmed with a "Late" pill. Click a card
#   → navigates to that ticker's Batch Detail with scroll+flash.

# Merge to main:
git checkout main && git pull origin main
git merge --no-ff --no-edit feat/allstocks-trading-panel
git push origin main
git push origin v7.18.0
# Branch kept as historical reference — do NOT delete.
