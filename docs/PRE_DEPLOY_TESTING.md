# Pre-deploy Testing Guide — Openbank Price Prediction

**Purpose:** Verify the app works correctly with multiple users and all security
controls before deploying to Vercel. Complete this checklist from top to bottom.
Do not skip steps — each section depends on the previous one being clean.

**Estimated time:** 30–45 minutes  
**Requirements:** Two email addresses (admin + test user), Supabase SQL Editor access

---

## Setup

**Users needed:**
| Role | Email |
|---|---|
| Admin | alpyengine@gmail.com (your existing account) |
| Test user | any second email you control (e.g. alexpjava@gmail.com) |

---

## Section 1 — Supabase state before testing

Run these queries in Supabase SQL Editor to confirm the database is clean:

```sql
-- 1.1 All tables exist
select tablename from pg_tables
where schemaname = 'public'
order by tablename;
-- Expected: 8 tables: alert_config, alert_log, batches,
--           fundamentals_cache, price_cache, profiles, watchlist, weekly_prices

-- 1.2 RLS enabled on all tables
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
order by tablename;
-- Expected: rowsecurity = true for ALL 8 tables

-- 1.3 Profiles RLS policies — exactly 4
select policyname, cmd from pg_policies
where tablename = 'profiles'
order by policyname;
-- Expected:
--   profiles_admin_read     SELECT
--   profiles_admin_update   UPDATE
--   profiles_self_read      SELECT
--   profiles_self_update    UPDATE

-- 1.4 Cron jobs active
select jobid, jobname, schedule, active from cron.job order by jobid;
-- Expected: 3 jobs, all active = true

-- 1.5 Both users exist
select id, email from auth.users order by created_at;
-- Expected: alpyengine@gmail.com (admin) + test user (readonly)
```

---

## Section 2 — Admin user tests (login as alpyengine@gmail.com)

### 2.1 Login
- [ ] App loads at http://localhost:5173 (or Vercel URL)
- [ ] Login with admin credentials
- [ ] Redirects to main app — no errors in console

### 2.2 Sidebar — all pages accessible
- [ ] **Batch Overview** loads — shows saved batches
- [ ] **Batch Overview Detail** loads — shows stock table
- [ ] **Accuracy Stats** loads — shows hit rate charts
- [ ] **All Stocks** loads — shows all tickers, sorted A→Z by default
- [ ] **Watchlist** loads — shows watchlisted tickers (or empty state)
- [ ] **Export** loads — shows batch selector + content checkboxes
- [ ] **Import CSV** loads — shows drop zone
- [ ] **Settings** loads — shows all sections including Alerts
- [ ] **Manage Users** loads — shows user list (NOT frozen/loading indefinitely)

### 2.3 All Stocks — market filter
- [ ] If both US and EU batches loaded: market badges appear (🇺🇸 US / 🇩🇪 DE)
- [ ] Click 🇩🇪 DE → only EU tickers visible
- [ ] Click 🇺🇸 US → only US tickers visible
- [ ] Click All → all tickers visible
- [ ] EU tickers display without suffix (NEM not NEM.DE)
- [ ] EU tickers show DE badge below company name

### 2.4 Watchlist — market filter
- [ ] Add a US ticker and a DE ticker to watchlist (⭐ in All Stocks)
- [ ] Open Watchlist — both tickers appear
- [ ] Market badges appear (🇺🇸 US / 🇩🇪 DE)
- [ ] Filter by DE → only EU ticker shown
- [ ] Panel opens correctly when clicking a row (no blank screen)

### 2.5 Manage Users (admin-only)
- [ ] Page loads without freezing
- [ ] Both users visible in the table
- [ ] Test user shows role "Read-only"
- [ ] Can change test user role to Admin → back to Read-only
- [ ] Cannot change own role (button disabled)
- [ ] Cannot delete own account (button disabled)

### 2.6 Price fetch — EU tickers
- [ ] Load the 19/03/2026 batch (EU tickers)
- [ ] Click Fetch prices
- [ ] Either: prices load successfully
- [ ] Or: "Alpha Vantage daily limit reached" message (expected if quota used today)
- [ ] After successful fetch: verify cache in console:
  ```js
  JSON.parse(localStorage.getItem('av_price_cache'))
  // Must show 4 entries with price + ts
  ```

### 2.7 Export page
- [ ] Select a batch from dropdown
- [ ] Check/uncheck content items — preview badges update in real time
- [ ] Click Export HTML → file downloads as openbank_report_YYYY-MM-DD.html
- [ ] Open downloaded HTML in browser — renders correctly with correct currency symbol
- [ ] Click Export PDF → file downloads as openbank_report_YYYY-MM-DD.pdf

### 2.8 Price Alerts
- [ ] Settings → Alerts section visible
- [ ] Enable alerts toggle works
- [ ] Enter email → saved (verify in Supabase: `select * from alert_config`)
- [ ] Watchlist page → "Check alerts" button visible

---

## Section 3 — Read-only user tests (login as test user)

**Log out of admin first. Open incognito window or different browser.**

### 3.1 Login
- [ ] Login with test user credentials
- [ ] Redirects to main app

### 3.2 Pages visible
- [ ] **Batch Overview** — visible ✅
- [ ] **All Stocks** — visible ✅
- [ ] **Watchlist** — visible ✅
- [ ] **Settings** — visible ✅

### 3.3 Admin-only pages NOT visible
- [ ] **Import CSV** — NOT in sidebar (readonly cannot import)
- [ ] **Manage Users** — NOT in sidebar (admin only)

> If Import or Manage Users appears for a readonly user → security bug. Stop and report.

### 3.4 Data isolation — watchlist
- [ ] Admin's watchlist items do NOT appear for test user
- [ ] Add a ticker to watchlist as test user
- [ ] Verify it is NOT visible when logged in as admin
- [ ] Verify in Supabase:
  ```sql
  select user_id, ticker from watchlist order by added_at;
  -- Each user should only have their own tickers
  ```

### 3.5 Data isolation — alert config
- [ ] Settings → configure alerts as test user (different email)
- [ ] Verify in Supabase:
  ```sql
  select user_id, email, enabled from alert_config;
  -- Should show 2 rows — one per user, each with their own config
  ```

### 3.6 Cannot access admin data (console test)
Run in browser console as test user:
```js
// Attempt to read ALL profiles — RLS should restrict to own profile only
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
// Or use the app's already-loaded supabase instance via DevTools sources
// Expected: data.length = 1 (only own profile)
```

### 3.7 Read-only user cannot see other users' batches
- [ ] Batch Overview shows the same batches as admin (batches are shared — this is correct)
- [ ] But cannot import new batches (Import not in sidebar)

---

## Section 4 — Supabase state after testing

```sql
-- 4.1 Watchlist entries correctly isolated
select user_id, ticker, added_at from watchlist order by user_id, added_at;

-- 4.2 Alert configs correctly isolated
select user_id, email, enabled from alert_config;

-- 4.3 No corrupted data from tests
select id, date, stocks from batches order by saved_at desc limit 5;

-- 4.4 Profiles unchanged
select id, email, role from profiles order by created_at;
-- admin = admin, test user = readonly
```

---

## Section 5 — Build check before deploy

```bash
# In the project folder:
npm run build
# Must complete with 0 errors
# Warnings are OK
```

- [ ] Build completes without errors
- [ ] No `console.error` in browser console during normal use
- [ ] `.env.example` — all required keys have values in your `.env`

---

## Section 6 — Vercel pre-deploy checklist

### 6.1 Environment variables in Vercel
Set these in Vercel → Project → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | https://yyenwzljojxbqtzcbchk.supabase.co |
| `VITE_SUPABASE_ANON_KEY` | your anon key from .env |
| `VITE_TWELVE_DATA_KEY` | from .env |
| `VITE_ALPHA_VANTAGE_KEY` | from .env |
| `VITE_EMAILJS_SERVICE_ID` | from .env |
| `VITE_EMAILJS_TEMPLATE_ID` | from .env |
| `VITE_EMAILJS_PUBLIC_KEY` | from .env |
| `VITE_FMP_KEY` | from .env |
| `VITE_FINNHUB_KEY` | from .env |
| `VITE_GITHUB_TOKEN` | from .env |
| `VITE_GITHUB_REPO` | alpyengine/openbank-price-data |

### 6.2 Supabase Auth URL configuration
Go to Supabase → Authentication → URL Configuration:

- [ ] **Site URL** = `https://your-app.vercel.app`
- [ ] **Redirect URLs** includes `https://your-app.vercel.app/**`

> Without this, login redirects will fail after deploy.

### 6.3 Post-deploy smoke test
After deploying to Vercel:
- [ ] Open Vercel URL in browser
- [ ] Login works
- [ ] Batch Overview loads
- [ ] No CORS errors in console

---

## Quick reference — full policy audit

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
```

**Expected: 15 policies total**

| Table | Count | Policies |
|---|---|---|
| alert_config | 1 | own (all) |
| alert_log | 1 | own (all) |
| batches | 2 | read + write |
| fundamentals_cache | 2 | read + write |
| price_cache | 1 | read |
| profiles | 4 | self read/update + admin read/update |
| watchlist | 3 | select + insert + delete |
| weekly_prices | 1 | read |
