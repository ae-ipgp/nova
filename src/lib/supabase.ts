import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

let clientPromise: Promise<SupabaseClient | null> | null = null

/**
 * Supabase is used for sign-in only (ADR-0001/0002). Never query tables or
 * storage through this client: all data goes through the Apps Script gateway.
 *
 * Loaded on demand so public-portal visitors don't download the auth library.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return Promise.resolve(null)
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  )
  return clientPromise
}
