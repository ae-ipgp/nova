import { describe, expect, it } from 'vitest'
import { bootstrap } from '../../backend/src/bootstrap'
import { TableStore } from '../../backend/src/store'
import { Gateway, SUAK } from './harness'

const profileId = (gw: Gateway, email: string) => gw.rows('profiles').find((p) => p.email === email)!.id

describe('bootstrap', () => {
  it('seeds roles, an invited SUAK and a DEMO session, and is idempotent', () => {
    const gw = new Gateway()
    const store = () => new TableStore(gw.io)
    const input = { suakEmail: SUAK.email, suakName: 'S', now: gw.deps.now(), uuid: gw.deps.uuid }
    expect(bootstrap(store(), input)).toEqual({ rolesSeeded: 4, suak: 'created', session: 'created' })
    expect(bootstrap(store(), input)).toEqual({ rolesSeeded: 0, suak: 'exists', session: 'exists' })
    expect(gw.rows('profiles')).toHaveLength(1)
    expect(gw.rows('jpp_sessions')[0].name).toContain('DEMO')
  })

  it('refuses a non-DELIMa SUAK email', () => {
    const gw = new Gateway()
    expect(() => bootstrap(new TableStore(gw.io), { suakEmail: 'a@gmail.com', suakName: '', now: new Date(), uuid: () => 'x' })).toThrow()
  })
})

describe('admin.users.register', () => {
  it('registers an invited profile with roles and membership in the active session, with audit', () => {
    const gw = Gateway.withSuak()
    const user = gw.ok('admin.users.register', { email: ' Siti@moe-dl.edu.my ', fullName: '  Siti   Aminah ', roles: ['member', 'secretariat', 'member'], position: 'Setiausaha Kehormat', bureau: 'Sekretariat' }, SUAK.id)
    expect(user).toMatchObject({ email: 'siti@moe-dl.edu.my', fullName: 'Siti Aminah', accountStatus: 'invited', linked: false, roles: ['member', 'secretariat'], position: 'Setiausaha Kehormat', bureau: 'Sekretariat' })
    expect(gw.rows('jpp_members')).toHaveLength(1)
    const audit = gw.rows('audit_logs').find((a) => a.action === 'profile.register')!
    expect(audit).toMatchObject({ entity_id: user.profileId, actor_id: profileId(gw, SUAK.email) })
  })

  it.each([
    [{ email: 'a@gmail.com', fullName: 'A', roles: ['member'] }, 'BAD_REQUEST'],
    [{ email: 'a@moe-dl.edu.my', fullName: '', roles: ['member'] }, 'BAD_REQUEST'],
    [{ email: 'a@moe-dl.edu.my', fullName: 'A', roles: [] }, 'BAD_REQUEST'],
    [{ email: 'a@moe-dl.edu.my', fullName: 'A', roles: ['public'] }, 'BAD_REQUEST'],
    [{ email: 'a@moe-dl.edu.my', fullName: 'A', roles: ['god'] }, 'BAD_REQUEST'],
    [{ email: 'a@moe-dl.edu.my', fullName: 'x'.repeat(121), roles: ['member'] }, 'BAD_REQUEST'],
    [{ email: 'SUAK@moe-dl.edu.my', fullName: 'Dup', roles: ['member'] }, 'CONFLICT'],
  ])('rejects %j with %s', (payload, code) => {
    expect(Gateway.withSuak().errorCode('admin.users.register', payload, SUAK.id)).toBe(code)
  })
})

describe('last-SUAK protection', () => {
  it('blocks suspending or revoking the only active SUAK', () => {
    const gw = Gateway.withSuak()
    const id = profileId(gw, SUAK.email)
    expect(gw.errorCode('admin.users.setStatus', { profileId: id, status: 'suspended' }, SUAK.id)).toBe('CONFLICT')
    expect(gw.errorCode('admin.roles.revoke', { profileId: id, role: 'suak' }, SUAK.id)).toBe('CONFLICT')
  })

  it('allows handover once another SUAK is active', () => {
    const gw = Gateway.withSuak()
    const next = gw.member('baru', ['suak'])
    gw.ok('auth.me', {}, next) // first sign-in activates
    const oldId = profileId(gw, SUAK.email)
    expect(gw.ok('admin.roles.revoke', { profileId: oldId, role: 'suak' }, next).roles).toEqual([])
    expect(gw.errorCode('admin.users.list', {}, SUAK.id)).toBe('FORBIDDEN')
  })

  it('does not count an invited (never signed in) SUAK as active', () => {
    const gw = Gateway.withSuak()
    gw.member('belum', ['suak'])
    expect(gw.errorCode('admin.roles.revoke', { profileId: profileId(gw, SUAK.email), role: 'suak' }, SUAK.id)).toBe('CONFLICT')
  })
})

describe('roles', () => {
  it('rejects granting a role twice and revoking a role not held', () => {
    const gw = Gateway.withSuak()
    gw.member('a', ['member'])
    const id = profileId(gw, 'a@moe-dl.edu.my')
    expect(gw.errorCode('admin.roles.grant', { profileId: id, role: 'member' }, SUAK.id)).toBe('CONFLICT')
    expect(gw.errorCode('admin.roles.revoke', { profileId: id, role: 'secretariat' }, SUAK.id)).toBe('NOT_FOUND')
    expect(gw.errorCode('admin.roles.grant', { profileId: 'nope', role: 'member' }, SUAK.id)).toBe('NOT_FOUND')
  })

  it('keeps revoked grants as history instead of deleting them', () => {
    const gw = Gateway.withSuak()
    gw.member('a', ['member', 'secretariat'])
    const id = profileId(gw, 'a@moe-dl.edu.my')
    gw.ok('admin.roles.revoke', { profileId: id, role: 'secretariat' }, SUAK.id)
    const grants = gw.rows('user_roles').filter((r) => r.profile_id === id)
    expect(grants).toHaveLength(2)
    expect(grants.find((g) => g.role_key === 'secretariat')).toMatchObject({ revoked_at: '2026-11-16T09:00:00.000Z' })
  })
})

describe('sessions', () => {
  it('exposes only public fields of the active session to anonymous visitors', () => {
    const gw = Gateway.withSuak()
    const s = gw.ok('session.active', {})
    expect(Object.keys(s!).sort()).toEqual(['endDate', 'id', 'name', 'startDate'])
  })

  it('creates planned sessions and activates one, archiving the previous', () => {
    const gw = Gateway.withSuak()
    const created = gw.ok('admin.sessions.create', { name: 'Legasi Ke-73', startDate: '2027-03-01', endDate: '2028-02-28' }, SUAK.id)
    expect(created.status).toBe('planned')
    const all = gw.ok('admin.sessions.activate', { sessionId: created.id }, SUAK.id)
    expect(all.filter((x) => x.status === 'active').map((x) => x.id)).toEqual([created.id])
    expect(all.find((x) => x.name.includes('DEMO'))!.status).toBe('archived')
    expect(gw.ok('session.active', {})!.name).toBe('Legasi Ke-73')
    expect(gw.errorCode('admin.sessions.activate', { sessionId: all.find((x) => x.status === 'archived')!.id }, SUAK.id)).toBe('CONFLICT')
  })

  it.each([
    [{ name: 'A', startDate: '2027-02-30', endDate: '2027-12-31' }],
    [{ name: 'A', startDate: '2027-12-31', endDate: '2027-01-01' }],
    [{ name: 'A', startDate: '01/01/2027', endDate: '2027-12-31' }],
    [{ name: '', startDate: '2027-01-01', endDate: '2027-12-31' }],
  ])('validates %j', (payload) => {
    expect(Gateway.withSuak().errorCode('admin.sessions.create', payload, SUAK.id)).toBe('BAD_REQUEST')
  })
})
