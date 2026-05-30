/**
 * useAuth.js — Authentication hook
 *
 * Convenience hook to access auth state from AuthContext.
 * Must be used inside a component wrapped by AuthProvider.
 *
 * Returns:
 *   user     — Supabase user object (null if not logged in)
 *   session  — JWT session object
 *   role     — 'admin' | 'readonly' | null
 *   loading  — true while restoring session on page load
 *   signOut  — function to sign out
 *
 * Usage:
 *   import { useAuth } from '@/hooks/useAuth'
 *   const { user, role, signOut } = useAuth()
 */
import { useContext } from 'react'
import { AuthContext } from '@/contexts/AuthContext'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return context
}
