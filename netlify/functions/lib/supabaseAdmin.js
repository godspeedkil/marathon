// Server-side Supabase client using the SERVICE ROLE key.
// This bypasses Row Level Security, so it must only ever be used inside
// Netlify Functions (never shipped to the browser) and every write path
// that uses it must manually verify the creator_secret first.
import { createClient } from '@supabase/supabase-js'

let client

export function supabaseAdmin() {
  if (!client) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables in Netlify.'
      )
    }
    client = createClient(url, key, {
      auth: { persistSession: false },
    })
  }
  return client
}

export function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}
