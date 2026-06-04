/**
 * invite-user — Supabase Edge Function
 *
 * Sends an invitation email to a new user using the Service Role Key.
 * This function MUST run server-side because:
 *   - supabase.auth.admin requires the Service Role Key
 *   - The Service Role Key must NEVER be exposed in the frontend
 *
 * Flow:
 *   1. Frontend (ManageUsers.jsx) calls this function with { email }
 *   2. Function verifies the caller is authenticated and has role = 'admin'
 *   3. Function calls supabase.auth.admin.inviteUserByEmail() with Service Role Key
 *   4. Returns { success: true } or { error: "message" }
 *
 * Security:
 *   - JWT verification: rejects unauthenticated calls
 *   - Role check: rejects non-admin callers (reads role from profiles table)
 *   - CORS: configured for Supabase Edge Function standard
 *   - Service Role Key stored as Supabase secret (never in code)
 *
 * Environment variables (set as Supabase secrets):
 *   SUPABASE_URL              — auto-provided by Supabase runtime
 *   SUPABASE_ANON_KEY         — auto-provided by Supabase runtime
 *   SERVICE_ROLE_KEY — must be set manually via Supabase Dashboard
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── CORS headers ──────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {

  // Handle CORS preflight — browsers send OPTIONS before POST
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  // Only POST is allowed
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // ── Step 1: Parse and validate email ─────────────────────────────────────
    const body = await req.json()
    const email = (body?.email ?? '').toString().trim().toLowerCase()

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Valid email address is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Step 2: Verify caller is authenticated ────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const jwt = authHeader.replace('Bearer ', '')

    // Caller client uses the user's JWT — can only access what they are allowed to
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    )

    // Verify the JWT is valid and get the caller's user ID
    const { data: { user: callerUser }, error: authError } = await callerClient.auth.getUser()
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Step 3: Verify caller has admin role ──────────────────────────────────
    const { data: profile, error: profileError } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Could not verify user role' }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    if (profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin role required to invite users' }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Step 4: Send invitation using Service Role Key ────────────────────────
    // Admin client has full auth.admin access via Service Role Key
    // This key is stored as a Supabase Edge Function secret — never in frontend code
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      { data: { role: 'readonly' } }
    )

    if (inviteError) {
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Step 5: Success ───────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({ success: true, email }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[invite-user] Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
