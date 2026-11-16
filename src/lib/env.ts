/**
 * Browser-safe configuration. Only VITE_-prefixed values reach the bundle,
 * so this module must never read service-role keys or email provider keys
 * (Blueprint §09 security warning). Those live in server functions only.
 */
export interface PublicEnv {
  supabaseUrl: string | undefined
  supabaseAnonKey: string | undefined
  appBaseUrl: string | undefined
}

export const env: PublicEnv = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || undefined,
  appBaseUrl: import.meta.env.VITE_APP_BASE_URL || undefined,
}

/** True once the backend is configured. Phase 0 runs without it. */
export const isBackendConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)
