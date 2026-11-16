import { describe, expect, it } from 'vitest'
import { ApiError, callApi } from '@/lib/api'

function fakeFetch(body: unknown, capture?: (init: RequestInit) => void): typeof fetch {
  return (async (_url: RequestInfo | URL, init?: RequestInit) => {
    capture?.(init!)
    return new Response(typeof body === 'string' ? body : JSON.stringify(body))
  }) as typeof fetch
}

describe('callApi', () => {
  it('posts the action as a CORS-simple text/plain request and returns data', async () => {
    let init: RequestInit | undefined
    const data = { status: 'ok', schemaVersion: 1, configured: true, time: 't' }
    const result = await callApi('system.health', {}, {
      apiUrl: 'https://script.google.com/macros/s/x/exec',
      token: 'jwt',
      fetchImpl: fakeFetch({ ok: true, data }, (i) => (init = i)),
    })
    expect(result).toEqual(data)
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({ 'Content-Type': 'text/plain;charset=utf-8' })
    expect(JSON.parse(String(init?.body))).toEqual({ action: 'system.health', payload: {}, token: 'jwt' })
  })

  it('surfaces gateway errors with their code', async () => {
    const p = callApi('system.health', {}, { apiUrl: 'u', fetchImpl: fakeFetch({ ok: false, error: { code: 'FORBIDDEN', message: 'no' } }) })
    await expect(p).rejects.toMatchObject({ name: 'ApiError', code: 'FORBIDDEN', message: 'no' })
  })

  it('rejects malformed responses', async () => {
    await expect(callApi('system.health', {}, { apiUrl: 'u', fetchImpl: fakeFetch('<html>login</html>') })).rejects.toBeInstanceOf(ApiError)
    await expect(callApi('system.health', {}, { apiUrl: 'u', fetchImpl: fakeFetch({ ok: false, error: { code: 'EVIL' } }) })).rejects.toMatchObject({ code: 'INTERNAL' })
  })

  it('fails clearly when the API URL is not configured', async () => {
    await expect(callApi('system.health', {}, { apiUrl: undefined })).rejects.toMatchObject({ code: 'NOT_CONFIGURED' })
  })

  it('maps network failures to a friendly error', async () => {
    const failing = (async () => { throw new TypeError('Failed to fetch') }) as typeof fetch
    await expect(callApi('system.health', {}, { apiUrl: 'u', fetchImpl: failing })).rejects.toMatchObject({ code: 'INTERNAL' })
  })
})
