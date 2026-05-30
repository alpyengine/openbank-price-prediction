# Authentication & Authorization — Complete Guide

**Project:** Openbank Price Prediction  
**Version:** v7.0.0+  
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

---

## 1. How passwords are stored (security)

### bcrypt hashing

Supabase Auth uses **bcrypt** with an automatic random salt to store passwords. This is the industry standard recommended by OWASP.

What happens when a user sets the password `mySecret123`:

```
Input:   mySecret123
Salt:    $2a$10$N9qo8uLOickgx2ZMRZoMye   ← random, generated automatically
Hash:    $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh9i
Stored:  only the hash above ← the original password is NEVER stored
```

**Key properties of bcrypt:**

| Property | What it means |
|---|---|
| One-way | The hash cannot be reversed to get the original password |
| Salted | Every hash is unique even for the same password |
| Slow by design | Takes ~100ms to compute, making brute force attacks impractical |
| Adaptive cost | The work factor can be increased as hardware gets faster |

### What nobody can see

| Person | Can they see your password? |
|---|---|
| Admin of this app | ❌ Never |
| Supabase employees | ❌ Never |
| Anyone with database access | ❌ Never (only the hash) |
| You (the user) | ❌ Never — only you knew it when you set it |

### Password reset flow

If a user forgets their password:

```
User clicks "Forgot password"
  → Supabase sends a reset link to their email
  → User clicks the link (valid for 1 hour)
  → User sets a NEW password
  → Old password is permanently replaced
  → Nobody ever saw the old password
```

The admin can trigger a password reset for any user, but this only sends them a reset email — the admin never sees or sets the password directly.

---

## 2. Architecture overview

```
Browser
  │
  ├── /login  ← LoginPage (public — no auth required)
  │     └── Supabase Auth SDK
  │           ├── Email + password
  │           └── Google OAuth (via Google Cloud Console)
  │
  └── /app    ← App (protected — requires auth)
        │
        ├── AuthProvider (React context)
        │     └── supabase.auth.onAuthStateChange()
        │           → user object + session token
        │
        ├── useRole() hook
        │     └── reads profiles table → 'admin' | 'readonly'
        │
        └── Components
              ├── Admin only:   Import, Save, Delete, Fetch, Manage users
              └── Both roles:   View batches, Charts, Accuracy stats
```

### Session management

Supabase uses **JWT tokens** stored in `localStorage`:
- Token valid for 1 hour by default
- Automatically refreshed in the background (no re-login needed)
- On page reload, session is restored from localStorage
- On sign out, token is invalidated server-side

---

## 3. Roles and permissions

The app has two roles:

### Admin
Full access to everything. There should be only **one admin** (you).

### Read-only
Can view all data but cannot modify anything. Suitable for colleagues or clients who need to monitor forecast performance without making changes.

### Permission matrix

| Feature | Admin | Read-only |
|---|---|---|
| View batches (all pages) | ✅ | ✅ |
| View accuracy stats | ✅ | ✅ |
| View price charts | ✅ | ✅ |
| View fundamentals | ✅ | ✅ |
| Fetch prices | ✅ | ❌ hidden |
| Fetch fundamentals | ✅ | ❌ hidden |
| Fetch market data | ✅ | ❌ hidden |
| Import CSV | ✅ | ❌ hidden |
| Save batch | ✅ | ❌ hidden |
| Delete batch | ✅ | ❌ hidden |
| Override prices | ✅ | ❌ hidden |
| Add notes | ✅ | ❌ hidden |
| Manage users | ✅ | ❌ hidden |
| Settings (hit margin etc.) | ✅ | ✅ view only |

Read-only users do not see disabled buttons — the buttons are simply **not rendered**. This prevents confusion and is more secure (no client-side bypassing).

---

## 4. Database schema

### profiles table

Created in Supabase alongside `auth.users`. The `id` column references the Supabase Auth user id.

```sql
create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  role        text        not null default 'readonly' check (role in ('admin', 'readonly')),
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create profile when a new user is created in auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Row Level Security on profiles

```sql
-- Enable RLS
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Only admin can read all profiles (for user management)
create policy "admin can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Only admin can update roles
create policy "admin can update profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
```

---

## 5. Setting up Google OAuth

Google OAuth allows users to sign in with their Google account instead of a password. This requires creating a project in Google Cloud Console — it is free and takes about 10 minutes.

### Step 1 — Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with your Google account
3. Click **"Select a project"** → **"New project"**
4. Name it `openbank-forecast` → click **"Create"**
5. Make sure the new project is selected in the top dropdown

### Step 2 — Enable the Google Identity API

1. In the left menu → **"APIs & Services"** → **"Library"**
2. Search for `Google Identity`
3. Click **"Google Identity Toolkit API"** → **"Enable"**

### Step 3 — Create OAuth credentials

1. Left menu → **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create credentials"** → **"OAuth client ID"**
3. If prompted, configure the **OAuth consent screen** first:
   - User type: **External** (allows any Google account)
   - App name: `Openbank Forecast`
   - User support email: your email
   - Developer contact: your email
   - Scopes: leave default (email, profile, openid)
   - Test users: add your own Gmail address
   - Click **"Save and continue"** through all steps
4. Back to Create OAuth client ID:
   - Application type: **Web application**
   - Name: `openbank-forecast-web`
   - Authorized JavaScript origins:
     ```
     http://localhost:5173
     https://your-supabase-project.supabase.co
     ```
   - Authorized redirect URIs:
     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     ```
     *(Replace YOUR_PROJECT_REF with your Supabase project ref — found in Supabase Dashboard → Settings → General)*
5. Click **"Create"**
6. Copy the **Client ID** and **Client Secret** — you will need them in the next step

### Step 4 — Configure Supabase to use Google OAuth

1. Go to your Supabase Dashboard
2. Left menu → **"Authentication"** → **"Providers"**
3. Find **Google** → toggle it **ON**
4. Paste the **Client ID** and **Client Secret** from the previous step
5. Click **"Save"**

That is it. Google OAuth is now configured.

---

## 6. Supabase configuration

### Disable public signups (invitation-only)

Since this app is private, users cannot self-register.

1. Supabase Dashboard → **"Authentication"** → **"Providers"** → **"Email"**
2. Toggle **"Enable email confirmations"** → ON
3. Supabase Dashboard → **"Authentication"** → **"Settings"**
4. Set **"Enable sign ups"** → **OFF**

Now only users invited via the Supabase Admin API (or from the app's Manage Users panel) can create accounts.

### Email templates

Supabase sends emails for:
- **Invitation** — when admin invites a new user
- **Password reset** — when user requests a reset
- **Email confirmation** — on first signup

These can be customized in: Dashboard → **"Authentication"** → **"Email Templates"**

The default sender is `noreply@mail.app.supabase.io`. For a production app with a custom domain, you can configure a custom SMTP server in Dashboard → **"Authentication"** → **"SMTP Settings"**.

---

## 7. How invitation-only access works

```
Admin clicks "Invite user" in the app
  → App calls supabase.auth.admin.inviteUserByEmail(email)
  → Supabase sends an invitation email to the user
  → User clicks the link in the email
  → User is redirected to the app's /accept-invite page
  → User sets their password
  → Profile is auto-created with role = 'readonly' (default)
  → Admin can then change role to 'admin' if needed
```

The invitation link is valid for **24 hours** by default (configurable in Supabase settings).

### Why not allow self-registration?

This app contains private financial data. Allowing anyone to register would expose batch data to unauthorized users. With invitation-only:
- Only people you explicitly invite can access the app
- No spam accounts
- You always know who has access

---

## 8. Admin user management

From the **User panel → Manage users** screen in the app, the admin can:

### View all users

Shows a table of all users with their email, role, and creation date.

### Invite a new user

```
Admin enters email → clicks "Send invitation"
  → supabase.auth.admin.inviteUserByEmail(email, { data: { role: 'readonly' } })
  → User receives email with setup link
  → User sets password
  → User can now log in
```

### Change a user's role

```
Admin selects user → changes role dropdown → clicks "Save"
  → UPDATE profiles SET role = 'admin' WHERE id = user_id
  → Change takes effect on next page load for that user
```

### Disable / delete a user

```
Admin clicks "Delete user"
  → supabase.auth.admin.deleteUser(user_id)
  → User's auth.users row is deleted
  → Profile is deleted automatically (CASCADE)
  → User cannot log in anymore
  → Their batch data in the 'batches' table is NOT deleted
```

### Password reset

```
Admin clicks "Reset password" for a user
  → supabase.auth.admin.updateUserById(user_id, { password: ... })
  OR
  → supabase.auth.resetPasswordForEmail(email)
     (sends email to the user — they set their own new password)
```

The admin **cannot see** any user's current password — this is technically impossible with bcrypt hashing.

---

## 9. React implementation

### Key files added in v7.0.0

```
src/
  contexts/
    AuthContext.jsx       ← React context: user, session, role, loading
  hooks/
    useAuth.js            ← useAuth() — access user and session
    useRole.js            ← useRole() — returns 'admin' | 'readonly' | null
  components/
    LoginPage.jsx         ← Full-page login (email + Google OAuth)
    AcceptInvitePage.jsx  ← Password setup for invited users
    ProtectedRoute.jsx    ← Wrapper: redirects to /login if not authenticated
    UserPanel.jsx         ← Dropdown panel at bottom of Sidebar
    ManageUsers.jsx       ← Admin-only user management page
  lib/
    supabase.js           ← Supabase client initialisation
```

### AuthContext

```jsx
/**
 * AuthContext — provides authentication state to the entire app.
 *
 * Wraps the app at the root level (main.jsx).
 * Listens to Supabase auth state changes and updates context automatically.
 *
 * Provides:
 *   user    — Supabase user object (null if not logged in)
 *   session — JWT session object
 *   role    — 'admin' | 'readonly' | null (loaded from profiles table)
 *   loading — true while session is being restored on page load
 */
```

### useRole hook

```jsx
/**
 * useRole — returns the current user's role from the profiles table.
 *
 * Returns:
 *   'admin'    — full access
 *   'readonly' — view only
 *   null       — not logged in or role not loaded yet
 *
 * Usage:
 *   const role = useRole()
 *   if (role === 'admin') { ... }
 */
```

### ProtectedRoute

```jsx
/**
 * ProtectedRoute — wraps pages that require authentication.
 *
 * If the user is not logged in → redirects to /login
 * If loading → shows a spinner
 * If authenticated → renders children
 *
 * Usage:
 *   <ProtectedRoute>
 *     <App />
 *   </ProtectedRoute>
 */
```

### Conditional rendering by role

```jsx
// In FetchBar.jsx — admin-only buttons
const role = useRole()

{role === 'admin' && (
  <Button onClick={onFetch}>Fetch prices</Button>
)}

{role === 'admin' && (
  <Button onClick={onSave}>Save batch</Button>
)}
```

---

## 10. Row Level Security (RLS)

Supabase RLS policies ensure that even if someone bypasses the React app and calls the API directly, they can only access data they are allowed to see.

### batches table

```sql
-- Everyone authenticated can read batches
create policy "authenticated users can read batches"
  on public.batches for select
  using (auth.role() = 'authenticated');

-- Only admin can insert/update/delete batches
create policy "admin can write batches"
  on public.batches for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
```

### weekly_prices table

```sql
-- Everyone authenticated can read weekly prices (for charts)
create policy "authenticated users can read weekly prices"
  on public.weekly_prices for select
  using (auth.role() = 'authenticated');

-- Only service role (cron) can write weekly prices
-- (backfill and fetch_weekly_prices functions use security definer)
```

---

## 11. Environment variables

Add to `.env`:

```env
# Supabase (already configured in v5.0.0+)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# No additional env vars needed for auth —
# Google OAuth credentials are stored in Supabase Dashboard, not in .env
# The anon key is enough for the client to use Supabase Auth
```

The Google OAuth Client ID and Secret are stored **only in Supabase Dashboard** (Authentication → Providers → Google). They are never exposed to the browser or committed to the repo.

---

## Progress tracker

| Step | What | Status |
|---|---|---|
| SQL — profiles table + RLS | Supabase | ✅ |
| SQL — RLS on batches + weekly_prices | Supabase | ✅ |
| Supabase — disable signups | Dashboard | ✅ |
| Google OAuth — Cloud Console setup | Google | ✅ |
| Google OAuth — Supabase provider | Dashboard | ✅ |
| React — supabase.js client | Code | ✅ |
| React — AuthContext + useAuth + useRole | Code | ✅ |
| React — LoginPage | Code | ✅ |
| React — ProtectedRoute | Code | ✅ |
| React — UserPanel in Sidebar | Code | ✅ |
| React — ManageUsers page | Code | ✅ |
| React — role-based conditional rendering | Code | ✅ |

---

## References

- [Supabase Auth documentation](https://supabase.com/docs/guides/auth)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Google Cloud Console](https://console.cloud.google.com)
- [bcrypt algorithm explained](https://auth0.com/blog/hashing-in-action-understanding-bcrypt/)
- [OWASP password storage cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
