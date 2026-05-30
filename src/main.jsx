/**
 * main.jsx — Application entry point
 *
 * Renders the React app into the DOM.
 * Wraps everything with:
 *   AuthProvider    — provides auth state (user, role, session) to all components
 *   ProtectedRoute  — shows LoginPage if not authenticated, App if authenticated
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* AuthProvider must wrap everything — provides user, role, session */}
    <AuthProvider>
      {/* ProtectedRoute gates the app — shows LoginPage if not logged in */}
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    </AuthProvider>
  </StrictMode>
)
