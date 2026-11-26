import type { ActionMap, ActionName, ApiErrorCode, ApiResponse } from '@shared/api-contract'
import { API_ERROR_CODES } from '@shared/api-contract'
import { env } from './env'
import { t, translateServer } from '@/i18n'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  constructor(code: ApiErrorCode, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export interface CallOptions {
  /** Supabase access token; omit for public actions. */
  token?: string
  signal?: AbortSignal
  /** Overrides for tests. */
  fetchImpl?: typeof fetch
  apiUrl?: string
}

function isEnvelope(value: unknown): value is ApiResponse<unknown> {
  if (typeof value !== 'object' || value === null || !('ok' in value)) return false
  const v = value as { ok: unknown; error?: { code?: unknown } }
  if (v.ok === true) return 'data' in v
  return v.ok === false && API_ERROR_CODES.includes(v.error?.code as ApiErrorCode)
}

/**
 * Calls one gateway action. The body is sent as text/plain so the browser
 * makes a simple CORS request, which Apps Script web apps can answer.
 */
export async function callApi<A extends ActionName>(
  action: A,
  payload: ActionMap[A]['payload'],
  { token, signal, fetchImpl = fetch, apiUrl = env.apiUrl }: CallOptions = {},
): Promise<ActionMap[A]['result']> {
  if (!apiUrl) throw new ApiError('NOT_CONFIGURED', t('Pelayan data belum dikonfigurasi.'))

  let res: Response
  try {
    res = await fetchImpl(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload, token }),
      redirect: 'follow',
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError('INTERNAL', t('Tidak dapat menghubungi pelayan. Semak sambungan internet anda.'))
  }

  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new ApiError('INTERNAL', t('Respons pelayan tidak sah.'))
  }
  if (!isEnvelope(body)) throw new ApiError('INTERNAL', t('Respons pelayan tidak sah.'))
  if (!body.ok) throw new ApiError(body.error.code, translateServer(body.error.message))
  return body.data as ActionMap[A]['result']
}
