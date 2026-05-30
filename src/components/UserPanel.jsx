/**
 * UserPanel.jsx — User profile panel in the Sidebar
 *
 * A dropdown panel that appears when the user clicks their avatar
 * at the bottom of the Sidebar. Provides quick access to:
 *
 *   Profile      — shows name and email (all users)
 *   Manage users — invite / delete / change roles (admin only)
 *   Dark mode    — light/dark toggle (all users)
 *   Sign out     — logs out the current user (all users)
 *
 * The panel closes when clicking outside or pressing Escape.
 * "Manage users" is only rendered for admin role — read-only users
 * never see it (not just disabled — completely absent from the DOM).
 *
 * @param {boolean}  collapsed    — sidebar collapsed state (icon-only mode)
 * @param {boolean}  darkMode     — current dark mode state
 * @param {Function} onToggleDark — toggle dark/light mode
 * @param {Function} onManageUsers — navigate to Manage Users page (admin only)
 */
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRole } from '@/hooks/useRole'
import { LogOut, Users, Sun, Moon, User, ChevronUp } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// ── Avatar initials ───────────────────────────────────────────────────────────

/**
 * getInitials — extracts 1-2 initials from a name or email.
 * Used for the avatar circle when no photo is available.
 * e.g. "Alex García" → "AG", "alex@example.com" → "A"
 */
function getInitials(user) {
  if (!user) return '?'
  const name = user.user_metadata?.full_name || user.email || ''
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name[0]?.toUpperCase() ?? '?'
}

/**
 * getDisplayName — returns the user's display name or email.
 */
function getDisplayName(user) {
  return user?.user_metadata?.full_name || user?.email || 'User'
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UserPanel({ collapsed, darkMode, onToggleDark, onManageUsers }) {
  const { user, signOut } = useAuth()
  const role              = useRole()
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close panel on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const initials    = getInitials(user)
  const displayName = getDisplayName(user)
  const email       = user?.email ?? ''

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
  }

  const handleManageUsers = () => {
    setOpen(false)
    onManageUsers?.()
  }

  return (
    <div ref={ref} className="relative">

      {/* ── Dropdown panel — appears above the trigger button ──────────── */}
      {open && (
        <div className={cn(
          'absolute bottom-full mb-1.5 left-0 right-0',
          'bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50'
        )}>
          {/* User info header */}
          <div className="px-3.5 py-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-foreground truncate">{displayName}</div>
                <div className="text-[11px] text-muted-foreground truncate">{email}</div>
              </div>
            </div>
            {/* Role badge */}
            <div className={cn(
              'inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-semibold',
              role === 'admin'
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
            )}>
              {role === 'admin' ? '⚑ Admin' : '◎ Read-only'}
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1">

            {/* Profile — shows email and name info */}
            <PanelItem icon={User} label="Profile" onClick={() => setOpen(false)} />

            {/* Manage users — admin only, completely hidden for read-only */}
            {role === 'admin' && (
              <PanelItem
                icon={Users}
                label="Manage users"
                onClick={handleManageUsers}
              />
            )}

            {/* Dark mode toggle */}
            <PanelItem
              icon={darkMode ? Sun : Moon}
              label={darkMode ? 'Light mode' : 'Dark mode'}
              onClick={() => { onToggleDark?.(); setOpen(false) }}
            />

            <Separator className="my-1" />

            {/* Sign out */}
            <PanelItem
              icon={LogOut}
              label="Sign out"
              onClick={handleSignOut}
              danger
            />
          </div>
        </div>
      )}

      {/* ── Trigger button ─────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        title={collapsed ? displayName : undefined}
        className={cn(
          'w-full flex items-center gap-2.5 rounded-lg border-none',
          'text-[13px] font-medium cursor-pointer transition-colors duration-150',
          'bg-transparent hover:bg-sidebar-accent',
          collapsed ? 'justify-center px-0 py-2.5' : 'justify-start px-3 py-2'
        )}
        style={{ fontFamily: 'inherit' }}
      >
        {/* Avatar circle with initials */}
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
          {initials}
        </div>

        {/* Name + role — hidden when sidebar is collapsed */}
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[12px] font-medium text-sidebar-foreground truncate">{displayName}</div>
              <div className="text-[10px] text-muted-foreground capitalize">{role ?? '…'}</div>
            </div>
            <ChevronUp
              size={13}
              className={cn(
                'text-muted-foreground shrink-0 transition-transform duration-150',
                open ? 'rotate-180' : ''
              )}
            />
          </>
        )}
      </button>
    </div>
  )
}

// ── PanelItem ─────────────────────────────────────────────────────────────────

/**
 * PanelItem — individual item in the user panel dropdown.
 *
 * @param {Component} icon    — lucide icon
 * @param {string}    label   — item label
 * @param {Function}  onClick — click handler
 * @param {boolean}   danger  — true for destructive items (red color)
 */
function PanelItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md border-none',
        'text-[13px] font-medium text-left cursor-pointer transition-colors duration-150',
        'bg-transparent',
        danger
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-foreground hover:bg-accent'
      )}
      style={{ fontFamily: 'inherit' }}
    >
      <Icon size={14} className="shrink-0" />
      {label}
    </button>
  )
}
