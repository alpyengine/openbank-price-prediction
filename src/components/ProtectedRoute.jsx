/**
 * ProtectedRoute.jsx — Authentication gate for the main app
 *
 * Wraps the entire App component to ensure only authenticated users
 * can access it. Handles three states:
 *
 *   loading  → shows a centered spinner (restoring session from localStorage)
 *   no user  → renders LoginPage
 *   user     → renders children (the main App)
 *
 * No manual redirects needed — the component switches automatically
 * when AuthContext updates on login or logout.
 *
 * Usage:
 *   <ProtectedRoute>
 *     <App />
 *   </ProtectedRoute>
 */
import { useAuth } from '@/hooks/useAuth'
import LoginPage from '@/components/LoginPage'
import { TrendingUp } from 'lucide-react'

// ── Loading spinner ───────────────────────────────────────────────────────────

/**
 * LoadingScreen — shown while the session is being restored on page load.
 * Typically visible for less than 500ms.
 */
function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        {/* App icon */}
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <TrendingUp size={20} />
        </div>
        {/* Spinner */}
        <div className="w-5 h-5 rounded-full border-2 border-border border-t-foreground animate-spin" />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // Session is being restored from localStorage — show spinner
  if (loading) return <LoadingScreen />

  // No authenticated user — show login page
  if (!user) return <LoginPage />

  // Authenticated — render the app
  return children
}
