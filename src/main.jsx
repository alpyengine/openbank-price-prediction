/**
 * main.jsx — Application entry point
 *
 * Renders the React app into the DOM.
 *
 * Note — StrictMode removed (v7.0.3):
 *   React StrictMode mounts every component twice in development.
 *   This is incompatible with Supabase Auth's internal lock mechanism —
 *   the second mount calls onAuthStateChange() while the first still holds
 *   the lock, causing a 5-second delay and an infinite loading spinner.
 *
 *   StrictMode can be re-enabled temporarily for side-effect audits,
 *   but must be removed before testing authentication flows.
 *
 * Wraps everything with:
 *   AuthProvider   — provides auth state (user, role, session) to all components
 *   ProtectedRoute — shows LoginPage if not authenticated, App if authenticated
 */
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  // AuthProvider must wrap everything — provides user, role, session
  <AuthProvider>
    {/* ProtectedRoute gates the app — shows LoginPage if not logged in */}
    <ProtectedRoute>
      <App />
    </ProtectedRoute>
  </AuthProvider>
)
