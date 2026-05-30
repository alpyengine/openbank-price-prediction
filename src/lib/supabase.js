/**
 * supabase.js — Supabase client initialisation
 *
 * Creates and exports a single shared Supabase client instance.
 * Used by all auth hooks and storage functions throughout the app.
 *
 * The anon key is safe to expose in the browser — it only grants
 * access permitted by Row Level Security (RLS) policies.
 * Real data protection happens at the database level via RLS.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

/**
 * supabase — the shared Supabase client.
 * Import this in any file that needs to interact with Supabase Auth or DB.
 *
 * Usage:
 *   import { supabase } from '@/lib/supabase'
 *   const { data, error } = await supabase.from('batches').select('*')
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Persist session in localStorage so users stay logged in on page reload
    persistSession:    true,
    // Automatically refresh the JWT token before it expires (every ~55 min)
    autoRefreshToken:  true,
    // Detect session from URL hash on OAuth callback (Google redirect)
    detectSessionInUrl: true,
  },
})
