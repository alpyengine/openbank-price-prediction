/**
 * AuthContext.jsx — Authentication state provider
 *
 * Provides authentication state to the entire app via React context.
 * Wraps the app at the root level in main.jsx.
 *
 * Listens to Supabase auth state changes (login, logout, token refresh)
 * and keeps user, session, and role in sync automatically.
 *
 * Context value:
 *   user     — Supabase user object (null if not logged in)
 *   session  — JWT session object (null if not logged in)
 *   role     — 'admin' | 'readonly' | null (loaded from profiles table)
 *   loading  — true while restoring session on page load
 *   signOut  — function to sign out the current user
 *
 * Usage:
 *   Wrap app: <AuthProvider><App /></AuthProvider>
 *   Read:     const { user, role, loading } = useContext(AuthContext)
 *   Or use:   import { useAuth } from '@/hooks/useAuth'
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ── Context ───────────────────────────────────────────────────────────────────

export const AuthContext = createContext({
  user:    null,
  session: null,
  role:    null,
  loading: true,
  signOut: async () => {},
})

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * AuthProvider — wraps the app and provides auth state to all children.
 * Place at the root level in main.jsx, outside of everything else.
 */
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [session, setSession] = useState(null)
  const [role,    setRole]    = useState(null)
  const [loading, setLoading] = useState(true)

  /**
   * fetchRole — reads the user's role from the profiles table.
   * Called whenever a user logs in or the session is restored.
   * Returns 'admin' | 'readonly' | null.
   */
  const fetchRole = useCallback(async (userId) => {
    if (!userId) { setRole(null); return }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (error) {
        console.warn('[auth] Could not fetch role:', error.message)
        setRole(null)
      } else {
        setRole(data?.role ?? 'readonly')
      }
    } catch (err) {
      console.warn('[auth] fetchRole error:', err.message)
      setRole(null)
    }
  }, [])

  /**
   * Listen to Supabase auth state changes.
   * Fires on: initial load, login, logout, token refresh, OAuth callback.
   */
  useEffect(() => {
    // Get initial session on page load (restored from localStorage)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      fetchRole(session?.user?.id).finally(() => setLoading(false))
    })

    // Subscribe to future auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        await fetchRole(session?.user?.id)
        setLoading(false)
      }
    )

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe()
  }, [fetchRole])

  /**
   * signOut — signs out the current user and clears all auth state.
   * The Supabase client also clears the session from localStorage.
   */
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setRole(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
