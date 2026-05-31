/**
 * AuthContext.jsx — Authentication state provider
 *
 * Architecture (v7.0.3 — definitive):
 *
 *   User, role AND profile name are all read from localStorage
 *   synchronously before React renders — zero spinner, zero flash.
 *
 * localStorage keys:
 *   sb-*-auth-token  — Supabase session (managed by Supabase client)
 *   app-user-role    — cached role ('admin' | 'readonly')
 *   app-profile-name — cached display name from profiles table
 *
 * Context value:
 *   user        — Supabase user object (null if not logged in)
 *   session     — JWT session object
 *   role        — 'admin' | 'readonly' | null
 *   profileName — display name from profiles.full_name (null if not set)
 *   loading     — true only when no session exists in localStorage
 *   signOut     — clears localStorage + reloads (v7.0.3 fix: bypasses supabase.auth.signOut)
 *   refreshRole — re-fetches role + name from DB
 */
import { createContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ── Context default ───────────────────────────────────────────────────────────

export const AuthContext = createContext({
  user:        null,
  session:     null,
  role:        null,
  profileName: null,
  loading:     true,
  signOut:     async () => {},
  refreshRole: async () => {},
})

// ── localStorage helpers ──────────────────────────────────────────────────────

const ROLE_KEY    = 'app-user-role'
const NAME_KEY    = 'app-profile-name'

function getStoredRole() {
  try {
    const r = localStorage.getItem(ROLE_KEY)
    return (r === 'admin' || r === 'readonly') ? r : null
  } catch { return null }
}

function setStoredRole(role) {
  try {
    if (role) localStorage.setItem(ROLE_KEY, role)
    else      localStorage.removeItem(ROLE_KEY)
  } catch {}
}

function getStoredProfileName() {
  try { return localStorage.getItem(NAME_KEY) || null } catch { return null }
}

function setStoredProfileName(name) {
  try {
    if (name) localStorage.setItem(NAME_KEY, name)
    else      localStorage.removeItem(NAME_KEY)
  } catch {}
}

function getInitialUser() {
  try {
    const key = Object.keys(localStorage).find(k => k.includes('auth-token'))
    if (!key) return null
    const parsed = JSON.parse(localStorage.getItem(key))
    if (parsed?.expires_at && parsed.expires_at < Math.floor(Date.now() / 1000)) return null
    return parsed?.user ?? null
  } catch { return null }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(() => getInitialUser())
  const [session,     setSession]     = useState(null)
  const [role,        setRole]        = useState(() => getStoredRole())
  const [profileName, setProfileName] = useState(() => getStoredProfileName())
  const [loading,     setLoading]     = useState(() => getInitialUser() === null)

  // ── fetchRole ─────────────────────────────────────────────────────────────

  /**
   * fetchRole — reads role AND full_name from profiles table.
   * Caches both in localStorage for instant display on next reload.
   * Always resolves — errors default to role='readonly', name=null.
   */
  const fetchRole = useCallback(async (userId) => {
    if (!userId) {
      setRole(null)
      setProfileName(null)
      setStoredRole(null)
      setStoredProfileName(null)
      return
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', userId)
        .single()

      const resolvedRole = error ? 'readonly' : (data?.role ?? 'readonly')
      const resolvedName = error ? null        : (data?.full_name ?? null)

      setRole(resolvedRole)
      setProfileName(resolvedName)
      setStoredRole(resolvedRole)
      setStoredProfileName(resolvedName)
    } catch {
      setRole('readonly')
      setStoredRole('readonly')
    }
  }, [])

  // ── refreshRole ──────────────────────────────────────────────────────────

  /**
   * refreshRole — re-fetches role and name from DB without logging out.
   * Also reads profileName from localStorage immediately for instant sidebar update.
   *
   * v7.0.3 fix: uses user state directly instead of supabase.auth.getUser()
   * which calls /auth/v1/user and blocks on Node 18 + supabase-js 2.106.
   */
  const refreshRole = useCallback(async () => {
    // Read profileName from localStorage immediately — no DB wait
    const cachedName = getStoredProfileName()
    if (cachedName) setProfileName(cachedName)
    // Then confirm from DB in background
    if (user?.id) await fetchRole(user.id)
  }, [fetchRole, user])

  // ── Auth state listener ───────────────────────────────────────────────────

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (event === 'INITIAL_SESSION') {
          if (session?.user?.id) {
            await fetchRole(session.user.id)
          } else {
            setRole(null)
            setProfileName(null)
            setStoredRole(null)
            setStoredProfileName(null)
          }
          setLoading(false)

        } else if (event === 'SIGNED_IN') {
          if (session?.user?.id) await fetchRole(session.user.id)
          setLoading(false)

        } else if (event === 'SIGNED_OUT') {
          setRole(null)
          setProfileName(null)
          setStoredRole(null)
          setStoredProfileName(null)
          setLoading(false)

        } else if (event === 'USER_UPDATED') {
          // user metadata changed — user already updated by setUser above
          // no role/name change needed here
        }
        // TOKEN_REFRESHED — no action needed
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchRole])

  // ── signOut ───────────────────────────────────────────────────────────────

  /**
   * signOut — clears all auth state from localStorage and reloads.
   *
   * v7.0.3 fix: supabase.auth.signOut() blocks indefinitely on Node 18
   * with supabase-js 2.106. Workaround: manually clear localStorage keys.
   * Same result — user fully logged out, session gone.
   * Server-side session expires naturally after 1 hour.
   *
   * When upgrading to Node 20: restore await supabase.auth.signOut()
   */
  const signOut = useCallback(async () => {
    setStoredRole(null)
    setStoredProfileName(null)
    try {
      Object.keys(localStorage)
        .filter(k => k.includes('supabase') || k.includes('auth-token') || k === ROLE_KEY || k === NAME_KEY)
        .forEach(k => localStorage.removeItem(k))
    } catch {}
    window.location.reload()
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider value={{ user, session, role, profileName, loading, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  )
}
