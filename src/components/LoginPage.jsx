/**
 * LoginPage.jsx — Full-page login screen
 *
 * The entry point of the app for unauthenticated users.
 * Shown when the user is not logged in or their session has expired.
 *
 * Supports two login methods:
 *   1. Email + password (Supabase Auth)
 *   2. Google OAuth (via Google Cloud Console + Supabase provider)
 *
 * Access is invitation-only — users cannot self-register.
 * Only the admin can invite new users via the Manage Users panel.
 *
 * On successful login → AuthContext updates → ProtectedRoute
 * renders the main App automatically (no manual redirect needed).
 */
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ── Google icon (inline SVG — no dependency needed) ───────────────────────────

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [mode,     setMode]     = useState('login') // 'login' | 'reset'
  const [resetSent, setResetSent] = useState(false)

  // ── Email + password login ────────────────────────────────────────────────

  /**
   * handleEmailLogin — authenticates with email and password.
   * Supabase validates credentials and returns a session.
   * AuthContext listens to the state change and updates automatically.
   */
  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      // On success: AuthContext.onAuthStateChange fires → ProtectedRoute renders App
    } catch (err) {
      setError('Unexpected error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Google OAuth login ────────────────────────────────────────────────────

  /**
   * handleGoogleLogin — redirects to Google's OAuth consent screen.
   * After the user approves, Google redirects back to the app with a token.
   * Supabase exchanges the token for a session automatically.
   */
  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Redirect back to the app after Google login
          redirectTo: window.location.origin,
        },
      })
      if (error) setError(error.message)
    } catch (err) {
      setError('Could not connect to Google. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Password reset ────────────────────────────────────────────────────────

  /**
   * handlePasswordReset — sends a password reset email to the user.
   * The user receives a link valid for 1 hour to set a new password.
   * Nobody sees the current or new password.
   */
  const handlePasswordReset = async (e) => {
    e.preventDefault()
    if (!email) { setError('Enter your email address first.'); return }
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) setError(error.message)
      else setResetSent(true)
    } catch (err) {
      setError('Could not send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">

        {/* App logo + name */}
        <div className="flex items-center gap-2 self-center">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp size={16} />
          </div>
          <span className="text-sm font-semibold">Openbank Forecast</span>
        </div>

        {/* Login card */}
        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">
              {mode === 'reset' ? 'Reset password' : 'Welcome back'}
            </CardTitle>
            <CardDescription>
              {mode === 'reset'
                ? 'Enter your email to receive a reset link'
                : 'Sign in with Google or your email'
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">

            {/* ── Google OAuth button ─────────────────────────────────── */}
            {mode === 'login' && (
              <>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </>
            )}

            {/* ── Email + password form ───────────────────────────────── */}
            <form
              onSubmit={mode === 'reset' ? handlePasswordReset : handleEmailLogin}
              className="flex flex-col gap-3"
            >
              {/* Email field */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password field — hidden in reset mode */}
              {mode === 'login' && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline bg-transparent border-none cursor-pointer p-0"
                      onClick={() => { setMode('reset'); setError('') }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              )}

              {/* Error message */}
              {error && (
                <p className="text-xs text-destructive">⚠ {error}</p>
              )}

              {/* Reset sent confirmation */}
              {resetSent && (
                <p className="text-xs text-success font-medium">
                  ✓ Reset link sent — check your email
                </p>
              )}

              {/* Submit button */}
              <Button type="submit" className="w-full mt-1" disabled={loading}>
                {loading
                  ? 'Please wait…'
                  : mode === 'reset' ? 'Send reset link' : 'Sign in'
                }
              </Button>

              {/* Back to login — only in reset mode */}
              {mode === 'reset' && (
                <button
                  type="button"
                  className="text-xs text-center text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer p-0 underline-offset-4 hover:underline"
                  onClick={() => { setMode('login'); setError(''); setResetSent(false) }}
                >
                  ← Back to sign in
                </button>
              )}
            </form>

          </CardContent>
        </Card>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground">
          Access restricted to invited users only
        </p>

      </div>
    </div>
  )
}
