import type { AccountStatus } from '@shared/domain'
import { isActiveProfile } from '../context'
import type { Handler } from './types'
import { findActiveSession, toPublicSession } from './sessions'

export const authHandlers: { 'auth.me': Handler<'auth.me'> } = {
  'auth.me': {
    access: { kind: 'identity' },
    write: false,
    run: (_p, ctx) => {
      const email = ctx.identity!.email
      const actor = ctx.actor
      const session = findActiveSession(ctx.store)
      if (!actor) {
        return { email, status: 'unregistered', profile: null, roles: [], activeSession: session ? toPublicSession(session) : null, membership: null }
      }
      const active = isActiveProfile(actor.profile)
      const member =
        active && session
          ? ctx.store.find('jpp_members', (m) => m.session_id === session.id && m.profile_id === actor.profile.id && m.membership_status !== 'inactive')
          : undefined
      return {
        email,
        status: active ? 'active' : 'inactive',
        profile: { id: actor.profile.id, fullName: actor.profile.full_name, accountStatus: actor.profile.account_status as AccountStatus },
        roles: active ? actor.roles : [],
        activeSession: session ? toPublicSession(session) : null,
        membership: member ? { position: member.position, bureau: member.bureau } : null,
      }
    },
  },
}
