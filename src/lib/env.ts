/**
 * Browser-safe configuration. Only VITE_-prefixed values reach the bundle, so
 * nothing secret may ever be read here. Data secrets (Sheets/Drive access,
 * Supabase service key) live in Apps Script Script Properties (ADR-0001).
 */
export interface PublicEnv {
  /** Supabase — used for authentication only. */
  supabaseUrl: string | undefined
  supabaseAnonKey: string | undefined
  /** Apps Script web app URL — the only path to Sheets and Drive. */
  apiUrl: string | undefined
  appBaseUrl: string | undefined
}

export const env: PublicEnv = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || undefined,
  apiUrl: import.meta.env.VITE_API_URL || undefined,
  appBaseUrl: import.meta.env.VITE_APP_BASE_URL || undefined,
}

export const isAuthConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)
export const isApiConfigured = Boolean(env.apiUrl)
