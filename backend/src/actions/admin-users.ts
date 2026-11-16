import type { UserSummary } from '@shared/api-contract'
import { ASSIGNABLE_ROLES, type AccountStatus, type AssignableRole } from '@shared/domain'
import { isAllowedEmail, normaliseEmail } from '@shared/identity'
import { activeRolesOf, type HandlerContext } from '../context'
import { badRequest, conflict, notFound } from '../errors'
import type { Row, TableStore } from '../store'
import { asPayload, listOf, oneOf, str } from '../validate'
import { findActiveSession } from './sessions'
import type { Handler } from './types'

const SUAK_ONLY = { kind: 'roles', roles: ['suak'] } as const

function summarise(store: TableStore, profile: Row): UserSummary {
  const session = findActiveSession(store)
  const member = session ? store.find('jpp_members', (m) => m.session_id === session.id && m.profile_id === profile.id) : undefined
  return {
    profileId: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    accountStatus: profile.account_status as AccountStatus,
    linked: Boolean(profile.user_id),
    roles: activeRolesOf(store, profile.id).filter((r): r is AssignableRole => r !== 'public'),
    position: member?.position ?? '',
    bureau: member?.bureau ?? '',
  }
}

function requireProfile(store: TableStore, profileId: string): Row {
  const profile = store.get('profiles', profileId)
  if (!profile) throw notFound('Pengguna tidak ditemui.')
  return profile
}

/** Profiles that are active AND hold an unrevoked SUAK role. */
function activeSuakIds(store: TableStore): string[] {
  return store
    .all('profiles')
    .filter((p) => p.account_status === 'active' && activeRolesOf(store, p.id).includes('suak'))
    .map((p) => p.id)
}

function assertNotLastSuak(store: TableStore, profileId: string) {
  const ids = activeSuakIds(store)
  if (ids.length === 1 && ids[0] === profileId) {
    throw conflict('Tindakan ini akan menyebabkan tiada SUAK aktif. Berikan peranan SUAK kepada pengguna lain dahulu.')
  }
}

function grantRole(ctx: HandlerContext, profileId: string, role: AssignableRole) {
  ctx.store.insert('user_roles', {
    id: ctx.uuid(),
    profile_id: profileId,
    role_key: role,
    granted_by: ctx.actor!.profile.id,
    granted_at: ctx.now.toISOString(),
  })
}

export const adminUserHandlers: {
  'admin.users.list': Handler<'admin.users.list'>
  'admin.users.register': Handler<'admin.users.register'>
  'admin.users.setStatus': Handler<'admin.users.setStatus'>
  'admin.roles.grant': Handler<'admin.roles.grant'>
  'admin.roles.revoke': Handler<'admin.roles.revoke'>
} = {
  'admin.users.list': {
    access: SUAK_ONLY,
    write: false,
    run: (_p, { store }) =>
      store
        .all('profiles')
        .map((p) => summarise(store, p))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ms')),
  },

  'admin.users.register': {
    access: SUAK_ONLY,
    write: true,
    run: (raw, ctx) => {
      const p = asPayload(raw)
      const email = str(p, 'email', { max: 254, label: 'E-mel' })
      if (!isAllowedEmail(email)) throw badRequest('E-mel mesti akaun DELIMa (@moe-dl.edu.my).')
      const fullName = str(p, 'fullName', { max: 120, label: 'Nama penuh' })
      const roles = listOf(p, 'roles', ASSIGNABLE_ROLES, 'Peranan')
      if (!roles.length) throw badRequest('Pilih sekurang-kurangnya satu peranan.')
      const position = str(p, 'position', { max: 80, required: false, label: 'Jawatan' })
      const bureau = str(p, 'bureau', { max: 80, required: false, label: 'Biro' })

      const normalised = normaliseEmail(email)
      if (ctx.store.find('profiles', (r) => normaliseEmail(r.email) === normalised)) {
        throw conflict('Akaun DELIMa ini telah didaftarkan.')
      }
      const session = findActiveSession(ctx.store)
      if ((position || bureau) && !session) throw badRequest('Tiada sesi JPP aktif untuk merekod jawatan atau biro.')

      const now = ctx.now.toISOString()
      const profile = ctx.store.insert('profiles', {
        id: ctx.uuid(),
        email: normalised,
        full_name: fullName,
        account_status: 'invited',
        created_at: now,
        updated_at: now,
      })
      for (const role of roles) grantRole(ctx, profile.id, role)
      if (session && (position || bureau)) {
        ctx.store.insert('jpp_members', {
          id: ctx.uuid(),
          session_id: session.id,
          profile_id: profile.id,
          position,
          bureau,
          membership_status: 'active',
          created_at: now,
          updated_at: now,
          created_by: ctx.actor!.profile.id,
        })
      }
      ctx.audit('profile.register', 'profile', profile.id, null, { email: normalised, fullName, roles, position, bureau })
      return summarise(ctx.store, profile)
    },
  },

  'admin.users.setStatus': {
    access: SUAK_ONLY,
    write: true,
    run: (raw, ctx) => {
      const p = asPayload(raw)
      const profileId = str(p, 'profileId', { max: 64 })
      const status = oneOf(p, 'status', ['active', 'suspended', 'deactivated'] as const, 'Status')
      const before = requireProfile(ctx.store, profileId)
      if (before.account_status === status) return summarise(ctx.store, before)
      if (status !== 'active') assertNotLastSuak(ctx.store, profileId)

      const after = ctx.store.update('profiles', profileId, { account_status: status, updated_at: ctx.now.toISOString() })
      ctx.audit('profile.status', 'profile', profileId, { account_status: before.account_status }, { account_status: status })
      return summarise(ctx.store, after)
    },
  },

  'admin.roles.grant': {
    access: SUAK_ONLY,
    write: true,
    run: (raw, ctx) => {
      const p = asPayload(raw)
      const profileId = str(p, 'profileId', { max: 64 })
      const role = oneOf(p, 'role', ASSIGNABLE_ROLES, 'Peranan')
      const profile = requireProfile(ctx.store, profileId)
      if (activeRolesOf(ctx.store, profileId).includes(role)) throw conflict('Peranan ini telah diberikan.')
      grantRole(ctx, profileId, role)
      ctx.audit('role.grant', 'profile', profileId, null, { role })
      return summarise(ctx.store, profile)
    },
  },

  'admin.roles.revoke': {
    access: SUAK_ONLY,
    write: true,
    run: (raw, ctx) => {
      const p = asPayload(raw)
      const profileId = str(p, 'profileId', { max: 64 })
      const role = oneOf(p, 'role', ASSIGNABLE_ROLES, 'Peranan')
      const profile = requireProfile(ctx.store, profileId)
      const grants = ctx.store.all('user_roles').filter((r) => r.profile_id === profileId && r.role_key === role && !r.revoked_at)
      if (!grants.length) throw notFound('Peranan ini tidak dimiliki oleh pengguna.')
      if (role === 'suak') assertNotLastSuak(ctx.store, profileId)
      for (const g of grants) {
        ctx.store.update('user_roles', g.id, { revoked_by: ctx.actor!.profile.id, revoked_at: ctx.now.toISOString() })
      }
      ctx.audit('role.revoke', 'profile', profileId, { role }, null)
      return summarise(ctx.store, profile)
    },
  },
}
