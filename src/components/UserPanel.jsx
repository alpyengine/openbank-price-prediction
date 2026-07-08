/**
 * UserPanel.jsx — User profile panel in the Sidebar
 *
 * Dropdown panel at the bottom of the Sidebar.
 * Fixes applied in v7.0.3:
 *
 *   1. sanitizeName() uses simple ASCII+Latin regex — avoids \p{} which
 *      fails silently in some browsers, freezing the save operation.
 *
 *   2. ProfileModal initializes with profileName (from profiles table)
 *      instead of user_metadata.full_name (from Google JWT) — ensures
 *      the field shows the last saved value, not the corrupted Google name.
 *
 *   3. After save, calls refreshRole() to update profileName in AuthContext
 *      so the sidebar reflects the new name without requiring a page reload.
 *
 *   4. sanitizeName() result shown to user in input as they type — no more
 *      silent filtering. If result is empty, shows error immediately.
 *
 *   5. (v7.20.6) Dropdown menu rendered via a React portal into document.body,
 *      positioned with fixed pixel coordinates measured from the trigger
 *      button. Previously it used `absolute ... left-0 right-0`, which tied
 *      its width to its positioned ancestor — fine when the sidebar is
 *      expanded (220px), but when collapsed (64px) the menu was squeezed
 *      into that width AND clipped by both its own `overflow-hidden` and the
 *      Sidebar <aside>'s `overflow-hidden` (used for its collapse-width
 *      animation). The portal sidesteps both: the menu is no longer a
 *      descendant of anything with `overflow-hidden`, and gets a fixed,
 *      always-sufficient width regardless of sidebar state.
 *
 * @param {boolean}  collapsed     — sidebar collapsed (icon-only mode)
 * @param {boolean}  darkMode      — current dark mode state
 * @param {Function} onToggleDark  — toggle dark/light mode
 * @param {Function} onManageUsers — navigate to Manage Users page (admin only)
 */
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRole } from '@/hooks/useRole'
import { supabase } from '@/lib/supabase'
import { LogOut, Users, Sun, Moon, User, ChevronUp } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * sanitizeName — strips characters that would corrupt the Supabase JWT token.
 *
 * Uses a safe ASCII + Latin Extended range instead of \p{L} Unicode property
 * escapes, which silently fail in some browsers causing the save to freeze.
 *
 * Allows: a-z A-Z, Latin Extended (é ñ ü ç etc. \u00C0-\u024F),
 *         spaces, hyphens, apostrophes, dots.
 * Blocks: emoji, π and Greek/Cyrillic/CJK symbols, control characters.
 *
 * @param {string} name — raw input
 * @returns {string} — safe name (may be empty if all chars were invalid)
 */
function sanitizeName(name) {
  if (!name) return ''
  return name
    .replace(/[^a-zA-Z\u00C0-\u024F\s\-'.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * getInitials — 2-letter initials from a real name.
 * Returns null for emails or single short strings (shows icon instead).
 */
function getInitials(name) {
  if (!name?.trim()) return null
  if (name.includes('@')) return null
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  if (parts[0].length >= 2) return parts[0][0].toUpperCase()
  return null
}

/**
 * getDisplayName — resolves display name with correct priority.
 *
 * Priority:
 *   1. profileName — from profiles.full_name (edited by user, cached in localStorage)
 *   2. user_metadata.full_name — from Supabase JWT (may be corrupted from Google)
 *   3. user_metadata.name — Google OAuth display name
 *   4. email — last resort
 */
function getDisplayName(user, profileName) {
  return profileName
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email
    || 'User'
}

// ── Avatar ────────────────────────────────────────────────────────────────────

/**
 * Avatar — shows Google photo, initials, or User icon.
 * Priority: Google photo > initials from real name > User icon.
 */
function Avatar({ user, size = 'sm' }) {
  const photoUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name
  const initials = getInitials(fullName)
  const dim      = size === 'md' ? 'w-8 h-8' : 'w-6 h-6'
  const iconSize = size === 'md' ? 14 : 11
  const textSize = size === 'md' ? 'text-xs' : 'text-[10px]'

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt="Profile photo"
        className={cn(dim, 'rounded-full object-cover ring-1 ring-border')}
        style={{ flexShrink: 0 }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }

  return (
    <div className={cn(dim, textSize, 'rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0')}>
      {initials ? initials : <User size={iconSize} className="text-primary" />}
    </div>
  )
}

// ── ProfileModal ──────────────────────────────────────────────────────────────

/**
 * ProfileModal — edit display name.
 *
 * Key fixes (v7.0.3):
 *   - Initializes with profileName (profiles table) not user_metadata (Google JWT)
 *   - Validates name before saving — shows error if all chars are invalid
 *   - Calls refreshRole() after save so sidebar updates without page reload
 *   - Does NOT call supabase.auth.updateUser() — blocks on Node 18 (v7.0.3 fix)
 */
function ProfileModal({ user, profileName, onClose, onSaved }) {
  // Initialize with profileName (profiles table) — not user_metadata which may
  // contain the corrupted Google name (e.g. "Alexπ")
  const [name,   setName]   = useState(profileName || '')
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState('')
  const [error,  setError]  = useState('')

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = async e => {
    e.preventDefault()
    setMsg('')
    setError('')

    // Sanitize — strip non-Latin characters (emoji, π, etc.)
    const safeName = sanitizeName(name)

    // Show error immediately if nothing valid remains after sanitizing
    if (!safeName) {
      setError('Name contains invalid characters. Use letters only (a-z, accented letters like é ñ ü).')
      return
    }

    // If sanitize changed the value, show what will be saved
    if (safeName !== name.trim()) {
      setName(safeName)
      setError('Invalid characters removed. Click Save again to confirm.')
      return
    }

    setSaving(true)
    try {
      // Use fetch() directly — bypasses the Supabase JS client internal lock.
      // Also read token from localStorage directly — avoids supabase.auth.getSession()
      // which calls /auth/v1/ and blocks on Node 18 + supabase-js 2.106.
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`
      let token = null
      try {
        const key = Object.keys(localStorage).find(k => k.includes('auth-token'))
        if (key) token = JSON.parse(localStorage.getItem(key))?.access_token
      } catch { /* use null — fetch will fail with 401 */ }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const res = await fetch(url, {
        method: 'PATCH',
        signal: controller.signal,
        headers: {
          'Content-Type':  'application/json',
          'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({ full_name: safeName, updated_at: new Date().toISOString() }),
      })
      clearTimeout(timeout)

      if (!res.ok) throw new Error(`Database error: ${res.status}`)

      setMsg('✓ Name updated successfully')
      // Pass the saved name directly — updates sidebar immediately
      // without waiting for a DB round-trip from refreshRole()
      onSaved?.(safeName)
      setTimeout(onClose, 1000)
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request timed out — please try again')
      } else {
        setError(err.message || 'Could not update name. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg max-w-[380px] w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <div className="text-sm font-semibold">Edit profile</div>
          <button
            className="text-lg text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer rounded px-1"
            onClick={onClose}
          >✕</button>
        </div>

        <form onSubmit={handleSave} className="p-4 flex flex-col gap-4">
          {/* Email — read-only */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <div className="text-sm text-foreground font-medium">{user?.email}</div>
          </div>

          {/* Display name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name">Display name</Label>
            <Input
              id="profile-name"
              type="text"
              placeholder="Alex García"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Letters and accented characters only (é, ñ, ü). No emoji or symbols.
            </p>
          </div>

          {msg   && <p className="text-xs text-success font-medium">{msg}</p>}
          {error && <p className="text-xs text-destructive">⚠ {error}</p>}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── PanelItem ─────────────────────────────────────────────────────────────────

function PanelItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md border-none',
        'text-[13px] font-medium text-left cursor-pointer transition-colors duration-150',
        'bg-transparent',
        danger ? 'text-destructive hover:bg-destructive/10' : 'text-foreground hover:bg-accent'
      )}
      style={{ fontFamily: 'inherit' }}
    >
      <Icon size={14} className="shrink-0" />
      {label}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UserPanel({ collapsed, darkMode, onToggleDark, onManageUsers }) {
  const { user, signOut, profileName, refreshRole } = useAuth()
  const role = useRole()
  const [open, setOpen]           = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [position, setPosition]   = useState(null) // { top, left, width } for the portaled dropdown
  const triggerRef  = useRef(null) // wraps the trigger button — used for click-outside AND position
  const dropdownRef = useRef(null) // the portaled dropdown content — used for click-outside only

  // v7.20.6 — menu width is fixed regardless of sidebar state (collapsed or
  // expanded); previously it stretched via left-0/right-0 to match its
  // positioned ancestor, which broke down when that ancestor was the
  // collapsed 64px-wide sidebar rail.
  const MENU_WIDTH = 240

  // Compute fixed pixel position from the trigger button whenever the menu
  // opens (and keep it in sync if the window resizes while open).
  useEffect(() => {
    if (!open) return
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setPosition({
        // Pin it just above the button (mirrors the old `bottom-full mb-1.5`),
        // measured from the viewport since the menu is now portaled to body.
        bottom: window.innerHeight - rect.top + 6,
        left:   rect.left,
      })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [open])

  // Close panel when clicking outside — checks both the trigger AND the
  // portaled dropdown, since the dropdown is no longer a DOM descendant of
  // the trigger's wrapping div (v7.20.6).
  useEffect(() => {
    const handler = e => {
      const insideTrigger  = triggerRef.current?.contains(e.target)
      const insideDropdown = dropdownRef.current?.contains(e.target)
      if (!insideTrigger && !insideDropdown) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close panel on Escape
  useEffect(() => {
    if (!open) return
    const handler = e => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const displayName = getDisplayName(user, profileName)
  const email       = user?.email ?? ''

  return (
    <>
      {/* Profile modal */}
      {showProfile && user && (
        <ProfileModal
          user={user}
          profileName={profileName}
          onClose={() => setShowProfile(false)}
          onSaved={(savedName) => {
            // Write new name to localStorage immediately so sidebar
            // updates without waiting for a DB round-trip from refreshRole()
            if (savedName) localStorage.setItem('app-profile-name', savedName)
            refreshRole?.()
          }}
        />
      )}

      {/* Dropdown panel — portaled to document.body (v7.20.6) so it can never
          be clipped by the Sidebar <aside>'s overflow-hidden (needed for its
          own collapse-width animation), regardless of collapsed/expanded state. */}
      {open && position && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', bottom: position.bottom, left: position.left, width: MENU_WIDTH }}
          className="bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50"
        >
          {/* Header */}
          <div className="px-3.5 py-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <Avatar user={user} size="md" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-foreground truncate">{displayName}</div>
                <div className="text-[11px] text-muted-foreground truncate">{email}</div>
              </div>
            </div>
            <div className={cn(
              'inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-semibold',
              role === 'admin'
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
            )}>
              {role === 'admin' ? '⚑ Admin' : '◎ Read-only'}
            </div>
          </div>

          {/* Menu */}
          <div className="p-1">
            <PanelItem icon={User} label="Profile" onClick={() => { setOpen(false); setShowProfile(true) }} />
            {role === 'admin' && (
              <PanelItem icon={Users} label="Manage users" onClick={() => { setOpen(false); onManageUsers?.() }} />
            )}
            <PanelItem
              icon={darkMode ? Sun : Moon}
              label={darkMode ? 'Light mode' : 'Dark mode'}
              onClick={() => { onToggleDark?.(); setOpen(false) }}
            />
            <Separator className="my-1" />
            <PanelItem icon={LogOut} label="Sign out" onClick={async () => { setOpen(false); await signOut() }} danger />
          </div>
        </div>,
        document.body
      )}

      <div ref={triggerRef} className="relative">
        {/* Trigger button */}
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
          <Avatar user={user} size="sm" />
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 overflow-hidden text-left">
                <div className="text-[12px] font-medium text-sidebar-foreground truncate leading-tight">{displayName}</div>
                <div className="text-[10px] text-muted-foreground capitalize truncate">{role ?? '…'}</div>
              </div>
              <ChevronUp
                size={13}
                className={cn('text-muted-foreground shrink-0 transition-transform duration-150', open ? 'rotate-180' : '')}
              />
            </>
          )}
        </button>
      </div>
    </>
  )
}
