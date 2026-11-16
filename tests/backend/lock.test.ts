import { describe, expect, it } from 'vitest'
import { pingSupabase } from '../../backend/src/keep-alive'
import { BusyError, withLock, type LockLike } from '../../backend/src/lock'

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
