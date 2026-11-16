/** Identity established from a Supabase access token. */
export interface AuthUser {
  id: string
  email: string
}

export interface TokenVerifier {
  /** Returns the user for a valid, unexpired Google-provider token, otherwise null. */
  verify(token: string): AuthUser | null
}

export interface CacheLike {
  get(key: string): string | null
  put(key: string, value: string, expirationInSeconds: number): void
}

export type HttpGet = (url: string, headers: Record<string, string>) => { code: number; body: string }

export interface VerifierDeps {
  supabaseUrl: string
  anonKey: string
  httpGet: HttpGet
  cache: CacheLike
  nowMs(): number
  /** base64url → UTF-8 string */
  decodeBase64Url(input: string): string
  /** Stable, non-reversible cache key for a token (e.g. SHA-256, base64). */
  hash(input: string): string
}

/** Upper bound on how long a verified token is trusted without asking Supabase again. */
export const MAX_CACHE_SECONDS = 300

function readExp(token: string, decode: (s: string) => string): number | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(decode(parts[1])) as { exp?: unknown }
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

function isGoogleUser(user: { app_metadata?: { provider?: unknown; providers?: unknown } }): boolean {
  const meta = user.app_metadata ?? {}
  if (meta.provider === 'google') return true
  return Array.isArray(meta.providers) && meta.providers.includes('google')
}

/**
 * Verifies tokens by asking Supabase Auth (`GET /auth/v1/user`). This works
 * whatever signing algorithm the project uses and honours server-side
 * sign-out. Results are cached briefly; the token's own `exp` is read only to
 * bound the cache lifetime, never trusted on its own.
 *
 * Profile status and roles are NOT cached: they are re-read from Sheets on
 * every request, so deactivation takes effect immediately (AT-12).
 */
export function createSupabaseVerifier(deps: VerifierDeps): TokenVerifier {
  const base = deps.supabaseUrl.replace(/\/+$/, '')
  return {
    verify(token) {
      if (!token || token.length > 8192) return null
      const exp = readExp(token, deps.decodeBase64Url)
      if (exp === null) return null
      const remaining = Math.floor(exp - deps.nowMs() / 1000)
      if (remaining <= 0) return null

      const cacheKey = `tok:${deps.hash(token)}`
      const cached = deps.cache.get(cacheKey)
      if (cached) return JSON.parse(cached) as AuthUser

      const res = deps.httpGet(`${base}/auth/v1/user`, { Authorization: `Bearer ${token}`, apikey: deps.anonKey })
      if (res.code !== 200) return null

      let body: { id?: unknown; email?: unknown; app_metadata?: { provider?: unknown; providers?: unknown } }
      try {
        body = JSON.parse(res.body)
      } catch {
        return null
      }
      if (typeof body.id !== 'string' || typeof body.email !== 'string' || !isGoogleUser(body)) return null

      const user: AuthUser = { id: body.id, email: body.email }
      const ttl = Math.min(MAX_CACHE_SECONDS, remaining - 5)
      if (ttl > 0) deps.cache.put(cacheKey, JSON.stringify(user), ttl)
      return user
    },
  }
}
