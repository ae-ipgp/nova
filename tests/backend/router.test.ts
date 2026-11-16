import { describe, expect, it } from 'vitest'
import { BusyError, withLock, type LockLike } from '../../backend/src/lock'
import { pingSupabase } from '../../backend/src/keep-alive'
import { handleRequest, MAX_BODY_BYTES, type RequestContext } from '../../backend/src/router'

const ctx: RequestContext = {
  now: () => new Date('2026-11-16T00:00:00Z'),
  schemaVersion: () => 1,
  configured: () => true,
}

describe('gateway router', () => {
  it('answers system.health without a token', () => {
    expect(handleRequest(JSON.stringify({ action: 'system.health', payload: {} }), ctx)).toEqual({
      ok: true,
      data: { status: 'ok', schemaVersion: 1, configured: true, time: '2026-11-16T00:00:00.000Z' },
    })
  })

  it.each([
    ['not json', 'BAD_REQUEST'],
    ['null', 'BAD_REQUEST'],
    ['{}', 'NOT_FOUND'],
    ['{"action":"constructor"}', 'NOT_FOUND'],
    ['{"action":"__proto__"}', 'NOT_FOUND'],
    ['{"action":"reference.approve"}', 'NOT_FOUND'],
  ])('rejects %s with %s', (raw, code) => {
    const res = handleRequest(raw, ctx)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe(code)
  })

  it('rejects oversized bodies before parsing', () => {
    const res = handleRequest('x'.repeat(MAX_BODY_BYTES + 1), ctx)
    expect(res).toMatchObject({ ok: false, error: { code: 'BAD_REQUEST' } })
  })

  it('hides internal errors from the client', () => {
    const boom: RequestContext = { ...ctx, schemaVersion: () => { throw new Error('secret detail') } }
    const original = console.error
    console.error = () => {}
    const res = handleRequest(JSON.stringify({ action: 'system.health' }), boom)
    console.error = original
    expect(res).toEqual({ ok: false, error: { code: 'INTERNAL', message: 'Ralat dalaman. Sila cuba lagi.' } })
  })
})

describe('withLock', () => {
  function fakeLock(available: boolean) {
    const calls: string[] = []
    const lock: LockLike = {
      tryLock: () => (calls.push('lock'), available),
      releaseLock: () => void calls.push('release'),
    }
    return { lock, calls }
  }

  it('releases the lock even when the body throws', () => {
    const { lock, calls } = fakeLock(true)
    expect(() => withLock(lock, () => { throw new Error('x') })).toThrow('x')
    expect(calls).toEqual(['lock', 'release'])
  })

  it('throws BusyError without running the body when the lock is held', () => {
    const { lock } = fakeLock(false)
    let ran = false
    expect(() => withLock(lock, () => (ran = true))).toThrow(BusyError)
    expect(ran).toBe(false)
  })
})

describe('pingSupabase', () => {
  it('calls the auth health endpoint with the anon key', () => {
    let seen: { url: string; key: string } | undefined
    const code = pingSupabase((url, o) => ((seen = { url, key: o.headers.apikey }), { getResponseCode: () => 200 }), 'https://abc.supabase.co/', 'anon')
    expect(code).toBe(200)
    expect(seen).toEqual({ url: 'https://abc.supabase.co/auth/v1/health', key: 'anon' })
  })
})
