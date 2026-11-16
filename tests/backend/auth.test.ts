import { describe, expect, it } from 'vitest'
import { createSupabaseVerifier, MAX_CACHE_SECONDS, type VerifierDeps } from '../../backend/src/auth'

const NOW = 1_800_000_000_000
const b64url = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64url = (s: string) => atob(s.replace(/-/g, '+').replace(/_/g, '/'))
const token = (exp: number) => `${b64url('{"alg":"ES256"}')}.${b64url(JSON.stringify({ exp, sub: 'u1' }))}.sig`

function setup(response: { code: number; body: unknown }) {
  const calls: { url: string; headers: Record<string, string> }[] = []
  const store = new Map<string, { value: string; ttl: number }>()
  const deps: VerifierDeps = {
    supabaseUrl: 'https://abc.supabase.co/',
    anonKey: 'anon',
    httpGet: (url, headers) => {
      calls.push({ url, headers })
      return { code: response.code, body: typeof response.body === 'string' ? response.body : JSON.stringify(response.body) }
    },
    cache: {
      get: (k) => store.get(k)?.value ?? null,
      put: (k, value, ttl) => void store.set(k, { value, ttl }),
    },
    nowMs: () => NOW,
    decodeBase64Url: fromB64url,
    hash: (s) => `h(${s.length})`,
  }
  return { verifier: createSupabaseVerifier(deps), calls, store }
}

const googleUser = { id: 'u1', email: 'a@moe-dl.edu.my', app_metadata: { provider: 'google', providers: ['google'] } }

describe('Supabase token verifier', () => {
  it('asks Supabase for the user with the bearer token and anon key', () => {
    const { verifier, calls } = setup({ code: 200, body: googleUser })
    expect(verifier.verify(token(NOW / 1000 + 3600))).toEqual({ id: 'u1', email: 'a@moe-dl.edu.my' })
    expect(calls[0].url).toBe('https://abc.supabase.co/auth/v1/user')
    expect(calls[0].headers).toMatchObject({ apikey: 'anon', Authorization: expect.stringMatching(/^Bearer /) })
  })

  it('caches for at most five minutes and serves repeats from cache', () => {
    const { verifier, calls, store } = setup({ code: 200, body: googleUser })
    const t = token(NOW / 1000 + 3600)
    verifier.verify(t)
    verifier.verify(t)
    expect(calls).toHaveLength(1)
    expect([...store.values()][0].ttl).toBe(MAX_CACHE_SECONDS)
  })

  it('never caches beyond the token expiry', () => {
    const { verifier, store } = setup({ code: 200, body: googleUser })
    verifier.verify(token(NOW / 1000 + 60))
    expect([...store.values()][0].ttl).toBe(55)
  })

  it.each([
    ['expired', token(NOW / 1000 - 1)],
    ['malformed', 'not-a-jwt'],
    ['empty', ''],
    ['payload not JSON', `a.${b64url('nope')}.c`],
  ])('rejects %s tokens without calling Supabase', (_label, t) => {
    const { verifier, calls } = setup({ code: 200, body: googleUser })
    expect(verifier.verify(t)).toBeNull()
    expect(calls).toHaveLength(0)
  })

  it('rejects tokens Supabase does not accept', () => {
    const { verifier, store } = setup({ code: 401, body: { msg: 'invalid' } })
    expect(verifier.verify(token(NOW / 1000 + 3600))).toBeNull()
    expect(store.size).toBe(0)
  })

  it('rejects users who did not sign in with Google', () => {
    const { verifier } = setup({ code: 200, body: { ...googleUser, app_metadata: { provider: 'email', providers: ['email'] } } })
    expect(verifier.verify(token(NOW / 1000 + 3600))).toBeNull()
  })
})
