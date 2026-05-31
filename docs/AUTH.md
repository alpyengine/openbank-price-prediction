# Authentication & Authorization — Complete Guide

**Project:** Openbank Price Prediction
**Version:** v7.0.3+
**Auth provider:** Supabase Auth
**Strategy:** Email/password + Google OAuth, invitation-only, role-based access

---

## Table of contents

1. [How passwords are stored (security)](#1-how-passwords-are-stored-security)
2. [Architecture overview](#2-architecture-overview)
3. [Roles and permissions](#3-roles-and-permissions)
4. [Database schema](#4-database-schema)
5. [Setting up Google OAuth](#5-setting-up-google-oauth)
6. [Supabase configuration](#6-supabase-configuration)
7. [How invitation-only access works](#7-how-invitation-only-access-works)
8. [Admin user management](#8-admin-user-management)
9. [React implementation](#9-react-implementation)
10. [Row Level Security (RLS)](#10-row-level-security-rls)
11. [Environment variables](#11-environment-variables)
12. [Known issues & troubleshooting log](#12-known-issues--troubleshooting-log)
13. [Node 18 compatibility notes](#13-node-18-compatibility-notes)

---

## 1. How passwords are stored (security)

Supabase Auth uses **bcrypt** with automatic random salt. Nobody — not the admin,
not Supabase employees, not anyone with DB access — can ever see a user's password.

If a user forgets their password, they use "Forgot password" to receive a reset link.
The admin can trigger a password reset email but cannot set or see the password directly.

---

## 2. Architecture overview

```
Browser
  │
  ├── /login  ← LoginPage (public)
  │     └── Supabase Auth SDK
  │           ├── Email + password
  │           └── Google OAuth
  │
  └── /app    ← App (protected)
        │
        ├── AuthProvider (React context)
        │     ├── Reads user + role + profileName from localStorage SYNCHRONOUSLY
        │     │   → zero spinner, zero read-only flash on reload
        │     └── onAuthStateChange → confirms session → fetchRole() from DB
        │
        ├── useRole() → 'admin' | 'readonly' | null
        └── Components render based on role
```

### localStorage keys

| Key | Value | Managed by |
|---|---|---|
| `sb-*-auth-token` | Supabase session (user, JWT, expiry) | Supabase client |
| `app-user-role` | `'admin'` or `'readonly'` | This app |
| `app-profile-name` | Display name from `profiles.full_name` | This app |

---

## 3. Roles and permissions

| Feature | Admin | Read-only |
|---|---|---|
| View batches | ✅ | ✅ |
| View accuracy stats | ✅ | ✅ |
| View price charts | ✅ | ✅ |
| Fetch prices / fundamentals | ✅ | ❌ hidden |
| Import CSV | ✅ | ❌ hidden |
| Save / delete batch | ✅ | ❌ hidden |
| Manage users | ✅ | ❌ hidden |

Read-only users do not see disabled buttons — they are completely absent from the DOM.

---

## 4. Database schema

### profiles table

```sql
create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  role        text        not null default 'readonly' check (role in ('admin', 'readonly')),
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### get_my_role() function (required — fixes RLS recursion)

```sql
create or replace function public.get_my_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;
```

### RLS policies

```sql
-- profiles
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select
  using (auth.uid() = id);
create policy "admin reads all profiles" on public.profiles for select
  using (auth.uid() = id or public.get_my_role() = 'admin');
create policy "users can update own profile" on public.profiles for update
  using (auth.uid() = id);
create policy "admin can update any profile" on public.profiles for update
  using (public.get_my_role() = 'admin');

-- batches
alter table public.batches enable row level security;
create policy "authenticated users can read batches"
  on public.batches for select using (auth.role() = 'authenticated');
create policy "admin can insert batches" on public.batches for insert
  with check (public.get_my_role() = 'admin');
create policy "admin can update batches" on public.batches for update
  using (public.get_my_role() = 'admin');
create policy "admin can delete batches" on public.batches for delete
  using (public.get_my_role() = 'admin');

-- weekly_prices
alter table public.weekly_prices enable row level security;
create policy "authenticated users can read weekly prices"
  on public.weekly_prices for select using (auth.role() = 'authenticated');
```

---

## 5. Setting up Google OAuth

### Step 1 — Create a Google Cloud project
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project selector → **New project** → Name: `openbank-forecast` → Create

### Step 2 — Create OAuth credentials
1. Left menu → **APIs & Services** → **Credentials**
2. **+ Create credentials** → **OAuth client ID**
3. Configure OAuth consent screen if prompted (External, add your email as test user)
4. Application type: **Web application**
5. Name: `openbank-forecast-web`
6. Authorized JavaScript origins: `http://localhost:5173`
7. Authorized redirect URIs: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
8. Click **Create** — copy the **Client ID** and **Client Secret**

### Step 3 — Configure Supabase
1. Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Toggle ON → paste Client ID and Client Secret → Save

---

## 6. Supabase configuration

1. Dashboard → **Authentication** → **Providers** → **Email** → Enable ON
2. Dashboard → **Authentication** → **Settings** → **Enable sign ups** → OFF
3. Create your user: Dashboard → **Authentication** → **Users** → **Add user**
4. Make yourself admin:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'YOUR_EMAIL' limit 1);
```

---

## 7. How invitation-only access works

Sign ups are disabled — users cannot self-register. Only the admin can invite users:

```
Admin → Manage users → Invite user (enters email)
  → Supabase sends invitation email
  → User clicks link → sets password
  → Profile auto-created with role = 'readonly'
  → Admin can change role if needed
```

---

## 8. Admin user management

From **User panel → Manage users** the admin can:
- View all users with email, role, creation date
- Invite new users by email (role defaults to read-only)
- Change a user's role (admin ↔ read-only)
- Delete a user (double-click to confirm)

The admin **cannot** see any user's password — technically impossible with bcrypt.

---

## 9. React implementation

### Key files

```
src/lib/supabase.js               — shared Supabase client
src/contexts/AuthContext.jsx      — user, session, role, profileName, loading
src/hooks/useAuth.js              — convenience hook
src/hooks/useRole.js              — role-only hook
src/components/LoginPage.jsx      — email + Google OAuth + forgot password
src/components/ProtectedRoute.jsx — auth gate
src/components/UserPanel.jsx      — sidebar dropdown + Avatar + ProfileModal
src/components/ManageUsers.jsx    — admin user management
```

### AuthContext architecture

```
Mount:
  1. Read user from localStorage (sb-*-auth-token) — synchronous
  2. Read role from localStorage (app-user-role) — synchronous
  3. Read profileName from localStorage (app-profile-name) — synchronous
  → loading = false immediately if session exists
  → zero spinner, zero read-only flash

onAuthStateChange fires:
  INITIAL_SESSION → fetchRole(userId) → confirms role from DB → updates cache
  SIGNED_IN       → fetchRole(userId)
  SIGNED_OUT      → clear role + profileName from state and localStorage
```

### ProfileModal save flow (v7.0.3)

```
User clicks Save
  → sanitizeName() strips invalid chars
  → if chars removed: show preview, ask to confirm
  → if name empty: show error
  → fetch() PATCH to /rest/v1/profiles (bypasses Supabase JS client)
  → token read from localStorage directly (bypasses supabase.auth.getSession)
  → onSaved(savedName) → write to localStorage immediately → sidebar updates
  → refreshRole() confirms from DB in background
```

---

## 10. Row Level Security (RLS)

See Section 4 for all SQL. Key points:
- `get_my_role()` uses `security definer` to avoid recursive RLS queries
- `users can update own profile` allows ProfileModal to work without admin check
- All write operations on `batches` require `get_my_role() = 'admin'`

---

## 11. Environment variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

Google OAuth credentials are stored **only** in Supabase Dashboard — never in `.env`.

---

## 12. Known issues & troubleshooting log

### Issue 1 — Role always showing as read-only
**Symptom:** User logs in correctly but app shows read-only UI.
**Versions:** v7.0.0, v7.0.1
**Cause:** RLS policy on `profiles` queried `profiles` recursively → returned 0 rows → role defaulted to `readonly`.
**Fix:** Created `get_my_role()` as `security definer` function. Applied in v7.0.2.

---

### Issue 2 — Infinite spinner on page reload
**Symptom:** Spinner shows indefinitely after F5 or server restart. Clears only when localStorage is deleted.
**Versions:** v7.0.0 → v7.0.2
**Causes:**
- React StrictMode mounts components twice. Supabase auth has an internal lock — second mount waited 5 seconds.
- `getSession()` + `onAuthStateChange()` in parallel caused race condition.
- Stale `clearTimeout(emergencyTimeout)` reference caused ReferenceError interrupting subscription.
**Fix:** Removed StrictMode. Use `onAuthStateChange` only. Clean cleanup. Applied in v7.0.2.

---

### Issue 3 — Role flash (read-only for 1-2 seconds)
**Symptom:** App briefly shows read-only UI on every reload before switching to admin.
**Versions:** v7.0.1, early v7.0.2
**Cause:** User read from localStorage synchronously but role waited for Supabase DB query.
**Fix:** Role cached in `app-user-role` localStorage key. Read synchronously on mount. Applied in v7.0.2.

---

### Issue 4 — JWT corruption → infinite spinner after profile save
**Symptom:** After saving a name with emoji or π, app shows infinite spinner on next reload.
**Versions:** v7.0.2
**Cause:** Supabase embeds `user_metadata` in JWT. Non-standard Unicode corrupts the JWT encoding → client hangs validating on reload.
**Fix:** `sanitizeName()` strips all non-Latin characters before saving. Applied in v7.0.3.

**Emergency SQL fix (if already corrupted):**
```sql
update auth.users
set raw_user_meta_data = jsonb_build_object(
  'full_name', 'YourName',
  'email', 'your@email.com',
  'email_verified', true
)
where id = 'YOUR_USER_ID';

update public.profiles set full_name = 'YourName'
where id = 'YOUR_USER_ID';
```
Then clear localStorage once (F12 → Application → Local Storage → Clear All).

---

### Issue 5 — Sign out freezes
**Symptom:** Sign out button does nothing.
**Versions:** v7.0.0 → v7.0.2
**Cause:** `supabase.auth.signOut()` calls `/auth/v1/logout` which blocks on Node 18 + supabase-js 2.106.
**Fix:** Manually delete all Supabase localStorage keys + reload. Applied in v7.0.3.

---

### Issue 6 — Profile save freezes at "saving..."
**Symptom:** Clicking Save in Profile modal freezes indefinitely.
**Versions:** v7.0.0 → v7.0.2
**Causes:**
1. `supabase.auth.updateUser()` calls `/auth/v1/user` PUT — blocks on Node 18.
2. RLS `admin updates any profile` blocked users updating their own profile.
3. `sanitizeName()` regex `\p{L}` with `u` flag silently fails in some browsers.
4. `supabase.from('profiles').update()` — Supabase JS client internal lock blocks REST calls in certain auth states.
5. `supabase.auth.getSession()` inside handleSave — calls `/auth/v1/` — blocks on Node 18.
**Fixes:**
- Replaced `supabase.auth.updateUser()` with `fetch()` PATCH directly to REST API.
- Token read from localStorage directly (bypasses all Supabase Auth API calls).
- Added `users can update own profile` RLS policy.
- Replaced `\p{L}` regex with `\u00C0-\u024F` range.
- Added 5-second AbortController timeout as safety net.
Applied in v7.0.3.

---

### Issue 7 — Display name not updating in sidebar after save
**Symptom:** Name saved in `profiles` but sidebar still shows Google name.
**Versions:** v7.0.2, early v7.0.3
**Cause:** `getDisplayName()` read from `user_metadata` (Google JWT) not from `profiles.full_name`.
**Fix:**
- `fetchRole()` reads `full_name` from `profiles` alongside `role`.
- Cached in `app-profile-name` localStorage key.
- `onSaved(savedName)` writes directly to localStorage → sidebar updates immediately.
- `refreshRole()` reads localStorage first, then confirms from DB.
Applied in v7.0.3.

---

### Issue 8 — refreshRole() blocks with Google OAuth
**Symptom:** `refreshRole()` hangs when user is logged in via Google.
**Versions:** early v7.0.3
**Cause:** `refreshRole()` called `supabase.auth.getUser()` which calls `/auth/v1/user` — blocks on Node 18.
**Fix:** `refreshRole()` uses `user` state directly instead of calling `supabase.auth.getUser()`. Applied in v7.0.3.

---

## 13. Node 18 compatibility notes

`supabase-js 2.106` requires Node >= 20. On Node 18, these Auth API endpoints block indefinitely:

| Blocked call | Endpoint | Symptom | Workaround (v7.0.3) |
|---|---|---|---|
| `supabase.auth.signOut()` | `/auth/v1/logout` | Sign out freezes | Clear localStorage manually |
| `supabase.auth.updateUser()` | `/auth/v1/user` PUT | Profile save freezes | Use `fetch()` PATCH to `/rest/v1/profiles` |
| `supabase.auth.getSession()` | `/auth/v1/token` | Blocks inside handleSave | Read token from localStorage directly |
| `supabase.auth.getUser()` | `/auth/v1/user` GET | refreshRole() blocks | Use `user` state directly |

**When upgrading to Node 20:** search for `v7.0.3 fix` comments in the code to find all workarounds to revert.

---

## References

- [Supabase Auth documentation](https://supabase.com/docs/guides/auth)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Google Cloud Console](https://console.cloud.google.com)
- [bcrypt algorithm](https://auth0.com/blog/hashing-in-action-understanding-bcrypt/)
- [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
