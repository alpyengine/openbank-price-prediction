/**
 * useRole.js — Role access hook
 *
 * Convenience hook to read the current user's role.
 * Shortcut for useAuth().role — use when you only need the role.
 *
 * Returns:
 *   'admin'    — full access (import, save, delete, manage users)
 *   'readonly' — view only (no mutations)
 *   null       — not logged in or role not yet loaded
 *
 * Usage:
 *   import { useRole } from '@/hooks/useRole'
 *   const role = useRole()
 *   if (role === 'admin') { ... }
 *   {role === 'admin' && <Button>Save batch</Button>}
 */
import { useAuth } from '@/hooks/useAuth'

export function useRole() {
  const { role } = useAuth()
  return role
}
