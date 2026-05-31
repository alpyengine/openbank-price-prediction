# Openbank Price Prediction

React 18 + Vite app for tracking and evaluating Openbank stock price forecasts.
Import a CSV of predictions, fetch live prices, and monitor accuracy over time.

**Stack:** React 18 · Vite · Tailwind CSS · shadcn/ui · Supabase

---

## Quick start

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in your API keys.

---

## Authentication (v7.0.2+)

Supabase Auth with email/password and Google OAuth.
Access is **invitation-only** — users cannot self-register.
Two roles: **admin** (full access) and **read-only** (view only).

📄 **[AUTH.md](./docs/AUTH.md)** — complete guide including:
- Password security (bcrypt)
- Google OAuth setup step by step
- Role permissions matrix
- Database schema and RLS policies
- React architecture
- **Known issues & troubleshooting log** (8 issues documented)

### Key architecture decisions

**Zero spinner on reload:** user, role and display name are all read from
`localStorage` synchronously before React renders — no waiting for network calls.

**JWT safety:** `sanitizeName()` in ProfileModal strips emoji and non-Latin
Unicode before saving. Non-standard characters in `user_metadata` corrupt
the JWT token → infinite spinner on next reload.

**onAuthStateChange only:** no `getSession()` — avoids race condition with
Supabase's internal auth lock that caused 5-second delays.

**StrictMode removed:** incompatible with Supabase auth locks.

### Node 18 compatibility (v7.0.3)

`supabase-js 2.106` requires Node >= 20. On Node 18, several Auth API calls
block indefinitely. See [AUTH.md → Node 18 compatibility](./docs/AUTH.md#13-node-18-compatibility-notes).

| Issue | Fix |
|---|---|
| Sign out freezes | Clear localStorage manually instead of `supabase.auth.signOut()` |
| Profile save freezes | `fetch()` PATCH directly to REST API, token from localStorage |
| refreshRole() blocks with Google | Use `user` state instead of `supabase.auth.getUser()` |

**When upgrading to Node 20:** search for `v7.0.3 fix` in the code to revert workarounds.

---

## Environment variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_TWELVE_DATA_KEY=your_key
VITE_FMP_KEY=your_key
VITE_EMAILJS_SERVICE_ID=your_id
VITE_EMAILJS_TEMPLATE_ID=your_id
VITE_EMAILJS_PUBLIC_KEY=your_key
```

---

## Migration to shadcn/ui + Tailwind

Complete migration from inline `style={{}}` to Tailwind + shadcn/ui.

📄 **[MIGRATION_SHADCN.md](./docs/MIGRATION_SHADCN.md)**

| Phase | Version | Status |
|---|---|---|
| 0 — Preparation | v6.9.0 | ✅ |
| 1 — Base components | v6.9.1 | ✅ |
| 2 — Simple components | v6.9.2 | ✅ |
| 3 — Medium components | v6.9.3 | ✅ |
| 4 — Complex components | v6.9.4 | ✅ |
| 5 — Documentation | v6.9.5 | ✅ |

---

## Tests

```bash
npm run test:run   # single run
npm run test       # watch mode
```

107 tests across 6 files — utils, hooks, services.

---

## Changelog

| Version | What |
|---|---|
| v7.0.3 | Node 18 compatibility — bypass blocking Auth API calls |
| v7.0.2 | Authentication + role-based access |
| v6.9.5 | Documentation — JSDoc across all hooks and utils |
| v6.9.4 | Phase 4 — complex components + legacy CSS vars removed |
| v6.9.3 | Phase 3 — medium components migrated |
| v6.9.2 | Phase 2 — simple components migrated |
| v6.9.1 | Phase 1 — base shadcn/ui components added |
| v6.9.0 | Phase 0 — Tailwind + shadcn/ui setup |
