import { describe, expect, it } from 'vitest'
import { MAX_BODY_BYTES } from '../../backend/src/router'
import { Gateway, SUAK } from './harness'

describe('request handling', () => {
  const gw = new Gateway()

  it('answers system.health without a token', () => {
    expect(gw.ok('system.health', {})).toEqual({ status: 'ok', schemaVersion: 2, configured: true, time: '2026-11-16T09:00:00.000Z' })
  })

  it.each([
    ['not json', 'BAD_REQUEST'],
    ['null', 'BAD_REQUEST'],
    ['[]', 'BAD_REQUEST'],
    ['{}', 'NOT_FOUND'],
    ['{"action":"constructor"}', 'NOT_FOUND'],
    ['{"action":"__proto__"}', 'NOT_FOUND'],
    ['{"action":"toString"}', 'NOT_FOUND'],
  ])('rejects %s with %s', async (raw, code) => {
    const { handleRequest } = await import('../../backend/src/router')
    const res = handleRequest(raw, gw.deps)
    expect(res.ok ? null : res.error.code).toBe(code)
  })

  it('rejects oversized bodies before parsing', async () => {
    const { handleRequest } = await import('../../backend/src/router')
    expect(handleRequest('x'.repeat(MAX_BODY_BYTES + 1), gw.deps)).toMatchObject({ ok: false, error: { code: 'BAD_REQUEST' } })
  })

  it('hides internal errors from the client', () => {
    const broken = new Gateway()
    broken.deps.openStore = () => {
      throw new Error('secret spreadsheet id abc')
    }
    const original = console.error
    console.error = () => {}
    const res = broken.call('session.active', {})
    console.error = original
    expect(res).toEqual({ ok: false, error: { code: 'INTERNAL', message: 'Ralat dalaman. Sila cuba lagi.' } })
  })
})

describe('authentication (ADR-0002)', () => {
  it('requires a token for non-public actions', () => {
    expect(Gateway.withSuak().errorCode('auth.me', {})).toBe('UNAUTHENTICATED')
  })

  it('rejects invalid or expired tokens', () => {
    expect(Gateway.withSuak().errorCode('auth.me', {}, 'forged')).toBe('UNAUTHENTICATED')
  })

  it('reports NOT_CONFIGURED when Supabase settings are missing', () => {
    const gw = Gateway.withSuak()
    gw.verifierConfigured = false
    expect(gw.errorCode('auth.me', {}, SUAK.id)).toBe('NOT_CONFIGURED')
  })

  it('refuses Google accounts outside the DELIMa domain', () => {
    const gw = Gateway.withSuak()
    const t = gw.identity('u-x', 'someone@gmail.com')
    expect(gw.errorCode('auth.me', {}, t)).toBe('FORBIDDEN')
  })

  it('tells an unregistered DELIMa user they are not registered, and gives no data', () => {
    const gw = Gateway.withSuak()
    const t = gw.identity('u-new', 'new@moe-dl.edu.my')
    expect(gw.ok('auth.me', {}, t)).toMatchObject({ status: 'unregistered', profile: null, roles: [], membership: null })
    expect(gw.errorCode('admin.users.list', {}, t)).toBe('FORBIDDEN')
  })

  it('links the profile on first sign-in, activates it and audits the link', () => {
    const gw = Gateway.withSuak()
    gw.ok('admin.users.register', { email: 'Ali@MOE-DL.edu.my', fullName: 'Ali', roles: ['member'] }, SUAK.id)
    expect(gw.rows('profiles').find((p) => p.email === 'ali@moe-dl.edu.my')).toMatchObject({ account_status: 'invited', user_id: '' })

    const t = gw.identity('u-ali', 'ali@moe-dl.edu.my')
    const lockBefore = gw.lockCalls
    expect(gw.ok('auth.me', {}, t)).toMatchObject({ status: 'active', roles: ['member'] })
    expect(gw.lockCalls).toBe(lockBefore + 1)
    expect(gw.rows('profiles').find((p) => p.email === 'ali@moe-dl.edu.my')).toMatchObject({ account_status: 'active', user_id: 'u-ali' })
    expect(gw.rows('audit_logs').some((a) => a.action === 'profile.link')).toBe(true)

    // Subsequent requests do not need the lock.
    gw.ok('auth.me', {}, t)
    expect(gw.lockCalls).toBe(lockBefore + 1)
  })

  it('never re-links a profile already bound to another identity', () => {
    const gw = Gateway.withSuak()
    const imposter = gw.identity('u-other', SUAK.email)
    expect(gw.ok('auth.me', {}, imposter).status).toBe('unregistered')
  })
})

describe('authorisation matrix', () => {
  const setup = () => {
    const gw = Gateway.withSuak()
    return {
      gw,
      member: gw.member('ahli', ['member']),
      secretariat: gw.member('sekretariat', ['secretariat']),
      sysadmin: gw.member('teknikal', ['system_admin']),
    }
  }

  const register = { email: 'x@moe-dl.edu.my', fullName: 'X', roles: ['member'] }

  it.each(['member', 'secretariat', 'sysadmin'] as const)('%s cannot manage users or roles (AT-02 pattern)', (who) => {
    const s = setup()
    const t = s[who]
    expect(s.gw.errorCode('admin.users.list', {}, t)).toBe('FORBIDDEN')
    expect(s.gw.errorCode('admin.users.register', register, t)).toBe('FORBIDDEN')
    expect(s.gw.errorCode('admin.roles.grant', { profileId: 'id-1', role: 'suak' }, t)).toBe('FORBIDDEN')
    expect(s.gw.errorCode('admin.sessions.create', { name: 'S', startDate: '2027-01-01', endDate: '2027-12-31' }, t)).toBe('FORBIDDEN')
  })

  it('lets the System Administrator view sessions but not change them', () => {
    const s = setup()
    expect(s.gw.errorCode('admin.sessions.list', {}, s.sysadmin)).toBeNull()
    expect(s.gw.errorCode('admin.sessions.activate', { sessionId: 'x' }, s.sysadmin)).toBe('FORBIDDEN')
  })

  it('removes access on the next request after suspension (AT-12)', () => {
    const s = setup()
    const profileId = s.gw.rows('profiles').find((p) => p.email === 'ahli@moe-dl.edu.my')!.id
    expect(s.gw.ok('auth.me', {}, s.member).status).toBe('active')
    s.gw.ok('admin.users.setStatus', { profileId, status: 'suspended' }, SUAK.id)
    expect(s.gw.ok('auth.me', {}, s.member)).toMatchObject({ status: 'inactive', roles: [] })
  })

  it('removes a capability on the next request after role revocation (AT-12)', () => {
    const s = setup()
    const profileId = s.gw.rows('profiles').find((p) => p.email === 'ahli@moe-dl.edu.my')!.id
    s.gw.ok('admin.roles.grant', { profileId, role: 'suak' }, SUAK.id)
    expect(s.gw.errorCode('admin.users.list', {}, s.member)).toBeNull()
    s.gw.ok('admin.roles.revoke', { profileId, role: 'suak' }, SUAK.id)
    expect(s.gw.errorCode('admin.users.list', {}, s.member)).toBe('FORBIDDEN')
  })
})

describe('locking', () => {
  it('runs every write inside the script lock and reports BUSY when it is held', () => {
    const gw = Gateway.withSuak()
    gw.lockAvailable = false
    expect(gw.errorCode('admin.users.register', { email: 'x@moe-dl.edu.my', fullName: 'X', roles: ['member'] }, SUAK.id)).toBe('BUSY')
    expect(gw.rows('profiles')).toHaveLength(1)
  })

  it('does not take the lock for reads', () => {
    const gw = Gateway.withSuak()
    const before = gw.lockCalls
    gw.ok('admin.users.list', {}, SUAK.id)
    gw.ok('session.active', {})
    expect(gw.lockCalls).toBe(before)
  })
})
