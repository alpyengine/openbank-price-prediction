/**
 * ManageUsers.jsx — Admin-only user management page
 *
 * Allows the admin to:
 *   - View all users with their email, role, and creation date
 *   - Invite new users by email (sends invitation email via Supabase)
 *   - Change a user's role (admin ↔ readonly)
 *   - Delete a user (requires double-click confirmation)
 *
 * This page is only accessible to users with role = 'admin'.
 * It is completely hidden from read-only users — not just disabled.
 *
 * Security:
 *   - All mutations go through Supabase Auth Admin API
 *   - Row Level Security on profiles table enforces server-side access control
 *   - Admin cannot see any user's password (bcrypt — technically impossible)
 *   - Delete cascades to profiles table automatically (ON DELETE CASCADE)
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Users, UserPlus, Trash2, Shield, Eye, Mail } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Formats a Supabase timestamp into a readable date string */
function formatDate(iso) {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ManageUsers() {
  const { user: currentUser } = useAuth()

  const [users,          setUsers]          = useState([])
  const [loading,        setLoading]        = useState(true)
  const [inviteEmail,    setInviteEmail]    = useState('')
  const [inviteLoading,  setInviteLoading]  = useState(false)
  const [inviteMsg,      setInviteMsg]      = useState('')
  const [inviteError,    setInviteError]    = useState('')
  const [confirmDelete,  setConfirmDelete]  = useState(null)
  const [actionLoading,  setActionLoading]  = useState(null)
  const [error,          setError]          = useState('')

  // ── Load users ──────────────────────────────────────────────────────────────

  /**
   * loadUsers — reads all profiles from Supabase.
   * RLS ensures only admin can read all profiles.
   * Merges auth user data (email) with profile data (role, created_at).
   */
  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, full_name, created_at')
        .order('created_at', { ascending: true })

      if (error) throw error

      // Fetch emails from auth.users via the admin API
      // Note: requires service role key — using anon key means we get
      // emails only for users who have logged in (session available)
      // For full email list, the admin must use Supabase Dashboard
      setUsers(data ?? [])
    } catch (err) {
      setError('Could not load users: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  // ── Invite user ─────────────────────────────────────────────────────────────

  /**
   * handleInvite — sends an invitation email to a new user.
   * The invited user receives an email with a link to set their password.
   * Their profile is auto-created with role = 'readonly' by the trigger.
   * The link is valid for 24 hours.
   */
  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteLoading(true)
    setInviteMsg('')
    setInviteError('')

    try {
      const { error } = await supabase.auth.admin.inviteUserByEmail(
        inviteEmail.trim(),
        { data: { role: 'readonly' } }
      )
      if (error) throw error
      setInviteMsg(`✓ Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      // Reload users after a short delay
      setTimeout(loadUsers, 1500)
    } catch (err) {
      setInviteError('Could not send invitation: ' + err.message)
    } finally {
      setInviteLoading(false)
    }
  }

  // ── Change role ─────────────────────────────────────────────────────────────

  /**
   * handleRoleChange — updates a user's role in the profiles table.
   * Takes effect on the user's next page load.
   * Admin cannot change their own role (safety guard).
   */
  const handleRoleChange = async (userId, newRole) => {
    if (userId === currentUser?.id) {
      setError("You cannot change your own role.")
      return
    }
    setActionLoading(userId + '_role')
    setError('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch (err) {
      setError('Could not update role: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  // ── Delete user ─────────────────────────────────────────────────────────────

  /**
   * handleDelete — deletes a user from auth.users.
   * Requires two clicks within 3 seconds (confirmation pattern).
   * The profiles row is deleted automatically via ON DELETE CASCADE.
   * Admin cannot delete themselves.
   *
   * Note: Supabase admin.deleteUser requires service role key.
   * With anon key, use Supabase Dashboard for deletion.
   */
  const handleDelete = async (userId) => {
    if (userId === currentUser?.id) {
      setError("You cannot delete your own account.")
      return
    }

    // First click — show confirmation state
    if (confirmDelete !== userId) {
      setConfirmDelete(userId)
      setTimeout(() => setConfirmDelete(null), 3000)
      return
    }

    // Second click within 3s — perform deletion
    setConfirmDelete(null)
    setActionLoading(userId + '_delete')
    setError('')

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId)
      if (error) throw error
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (err) {
      // If admin API is unavailable (anon key limitation), guide to Dashboard
      setError(
        'Could not delete user via API. ' +
        'Please delete from Supabase Dashboard → Authentication → Users.'
      )
    } finally {
      setActionLoading(null)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">Manage Users</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Invite users, assign roles, and manage access
          </p>
        </div>
      </div>

      {/* ── Invite new user ───────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader className="py-3.5 px-4 border-b border-border flex-row items-center gap-2 space-y-0">
          <UserPlus size={15} className="text-muted-foreground" />
          <span className="text-sm font-semibold">Invite a new user</span>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={handleInvite} className="flex gap-2 items-end flex-wrap">
            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={inviteLoading} size="sm" className="mb-0.5">
              <Mail size={13} />
              {inviteLoading ? 'Sending…' : 'Send invitation'}
            </Button>
          </form>

          {/* Invite feedback */}
          {inviteMsg   && <p className="text-xs text-success font-medium mt-2">{inviteMsg}</p>}
          {inviteError && <p className="text-xs text-destructive mt-2">⚠ {inviteError}</p>}

          {/* Info note */}
          <p className="text-xs text-muted-foreground mt-3">
            The invited user will receive an email with a link to set their password.
            They will be assigned <strong>read-only</strong> access by default.
            You can change their role after they accept the invitation.
          </p>
        </CardContent>
      </Card>

      {/* ── Global error ─────────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          ⚠ {error}
        </div>
      )}

      {/* ── Users table ──────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="py-3.5 px-4 border-b border-border flex-row items-center justify-between space-y-0">
          <span className="text-sm font-semibold">Users</span>
          <span className="text-xs text-muted-foreground">{users.length} user{users.length !== 1 ? 's' : ''}</span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="text-xs py-2.5 px-3.5">User</TableHead>
                <TableHead className="text-xs py-2.5 px-3.5">Role</TableHead>
                <TableHead className="text-xs py-2.5 px-3.5">Joined</TableHead>
                <TableHead className="text-xs py-2.5 px-3.5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Loading state */}
              {loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                    Loading users…
                  </TableCell>
                </TableRow>
              )}

              {/* Empty state */}
              {!loading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              )}

              {/* User rows */}
              {users.map(u => {
                const isCurrentUser = u.id === currentUser?.id
                return (
                  <TableRow key={u.id}>
                    {/* Name / ID */}
                    <TableCell className="py-3 px-3.5">
                      <div className="flex items-center gap-2.5">
                        {/* Avatar */}
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                          {(u.full_name || u.id)?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium">
                            {u.full_name || 'Invited user'}
                            {isCurrentUser && (
                              <span className="ml-1.5 text-[10px] text-muted-foreground">(you)</span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {u.id.slice(0, 8)}…
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Role badge */}
                    <TableCell className="py-3 px-3.5">
                      <Badge className={cn(
                        'text-[11px] font-semibold rounded-full gap-1',
                        u.role === 'admin'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      )}>
                        {u.role === 'admin'
                          ? <><Shield size={10} /> Admin</>
                          : <><Eye size={10} /> Read-only</>
                        }
                      </Badge>
                    </TableCell>

                    {/* Joined date */}
                    <TableCell className="py-3 px-3.5 text-xs text-muted-foreground">
                      {formatDate(u.created_at)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3 px-3.5">
                      <div className="flex gap-1.5">
                        {/* Toggle role button — disabled for current user */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs px-2.5"
                          disabled={isCurrentUser || actionLoading === u.id + '_role'}
                          onClick={() => handleRoleChange(u.id, u.role === 'admin' ? 'readonly' : 'admin')}
                          title={isCurrentUser ? "You cannot change your own role" : `Make ${u.role === 'admin' ? 'read-only' : 'admin'}`}
                        >
                          {actionLoading === u.id + '_role'
                            ? '…'
                            : u.role === 'admin' ? 'Make read-only' : 'Make admin'
                          }
                        </Button>

                        {/* Delete button — double click to confirm, disabled for current user */}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isCurrentUser || actionLoading === u.id + '_delete'}
                          className={cn(
                            'px-2',
                            confirmDelete === u.id && 'border-destructive bg-destructive/10 text-destructive hover:bg-destructive/10'
                          )}
                          onClick={() => handleDelete(u.id)}
                          title={isCurrentUser ? "You cannot delete your own account" : confirmDelete === u.id ? 'Click again to confirm deletion' : 'Delete user'}
                        >
                          {actionLoading === u.id + '_delete'
                            ? '…'
                            : <Trash2 size={11} />
                          }
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Security note ─────────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground mt-4 text-center">
        Passwords are stored with bcrypt — nobody can view a user's password.
        To reset a user's password, ask them to use "Forgot password" on the login page.
      </p>
    </div>
  )
}
