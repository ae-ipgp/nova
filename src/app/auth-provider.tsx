import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { MeResult } from '@shared/api-contract'
import type { RoleKey } from '@shared/domain'
import { ALLOWED_EMAIL_DOMAIN } from '@shared/identity'
import { SITE } from '@/config/site'
import { ApiError, callApi } from '@/lib/api'
import { isApiConfigured, isAuthConfigured } from '@/lib/env'
import { rememberNextPath } from '@/lib/next-path'
import { getSupabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthContext, resolveMode, type AuthState, type AuthValue } from './auth-context'
import { t } from '@/i18n'

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode = resolveMode(isAuthConfigured && isApiConfigured, import.meta.env.DEV)
  if (mode === 'live') return <LiveAuthProvider>{children}</LiveAuthProvider>
  if (mode === 'preview') return <PreviewAuthProvider>{children}</PreviewAuthProvider>
  return <StaticAuthProvider value={unconfiguredValue}>{children}</StaticAuthProvider>
}

/** Fixed value — used for the unconfigured state and in tests. */
export function StaticAuthProvider({ value, children }: { value: AuthValue; children: ReactNode }) {
  return <AuthContext value={value}>{children}</AuthContext>
}

const noop = async () => {}

const unconfiguredValue: AuthValue = {
  mode: 'unconfigured',
  state: { status: 'signed_out' },
  roles: [],
  signIn: noop,
  signOut: noop,
  getToken: async () => undefined,
  refresh: noop,
}

// ---------------------------------------------------------------------------
// Live: Supabase session → gateway auth.me
// ---------------------------------------------------------------------------

function LiveAuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null)
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null | undefined>(undefined)
  const [result, setResult] = useState<{ userKey: string; state: AuthState } | null>(null)
  const [reload, setReload] = useState(0)
  const tokenRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    void getSupabase().then((c) => !cancelled && setClient(c))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!client) return
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      tokenRef.current = session?.access_token ?? null
      setToken(tokenRef.current)
    })
    return () => data.subscription.unsubscribe()
  }, [client])

  const signOut = useCallback(async () => {
    await client?.auth.signOut()
    queryClient.clear()
  }, [client, queryClient])

  // Identity changes (sign-in, sign-out, user switch) re-read profile and roles.
  // Token refreshes for the same user do not.
  const userKey = useMemo(() => (token ? decodeSub(token) : token), [token])

  useEffect(() => {
    if (!userKey) return
    let cancelled = false
    // Reads the latest token from a ref: refreshes of the same user's token must not refetch.
    callApi('auth.me', {}, { token: tokenRef.current ?? undefined })
      .then((me) => !cancelled && setResult({ userKey, state: { status: 'signed_in', me } }))
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof ApiError || err instanceof Error ? err.message : 'Ralat tidak diketahui.'
        setResult({ userKey, state: { status: 'error', message } })
      })
    return () => {
      cancelled = true
    }
  }, [userKey, reload])

  // Derived: a refresh keeps showing the previous result for the same user until the new one arrives.
  const state = useMemo<AuthState>(() => {
    if (userKey === undefined) return { status: 'loading' }
    if (userKey === null) return { status: 'signed_out' }
    return result?.userKey === userKey ? result.state : { status: 'loading' }
  }, [userKey, result])

  const value = useMemo<AuthValue>(
    () => ({
      mode: 'live',
      state,
      roles: state.status === 'signed_in' && state.me.status === 'active' ? state.me.roles : [],
      signIn: async (nextPath) => {
        if (nextPath) rememberNextPath(nextPath)
        const c = client ?? (await getSupabase())
        if (!c) throw new Error(t('Log masuk belum dikonfigurasi.'))
        const { error } = await c.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: { hd: ALLOWED_EMAIL_DOMAIN, prompt: 'select_account' },
          },
        })
        if (error) throw error
      },
      signOut,
      getToken: async () => (await client?.auth.getSession())?.data.session?.access_token,
      refresh: async () => setReload((n) => n + 1),
    }),
    [client, state, signOut],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

function decodeSub(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: string }
    return payload.sub ?? token
  } catch {
    return token
  }
}

// ---------------------------------------------------------------------------
// Preview (development without configuration)
// ---------------------------------------------------------------------------

function previewMe(role: RoleKey): MeResult {
  return {
    email: `pratonton@${ALLOWED_EMAIL_DOMAIN}`,
    status: 'active',
    profile: { id: 'preview', fullName: 'Pengguna Pratonton', accountStatus: 'active' },
    roles: [role],
    activeSession: { id: 'preview', name: SITE.demoSessionLabel, startDate: '', endDate: '' },
    membership: null,
    areas: [],
    notifyOff: [],
  }
}

function PreviewAuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<RoleKey>('suak')
  const value = useMemo<AuthValue>(
    () => ({
      mode: 'preview',
      state: { status: 'signed_in', me: previewMe(role) },
      roles: [role],
      signIn: noop,
      signOut: noop,
      getToken: async () => undefined,
      refresh: noop,
      setPreviewRole: setRole,
    }),
    [role],
  )
  return <AuthContext value={value}>{children}</AuthContext>
}
