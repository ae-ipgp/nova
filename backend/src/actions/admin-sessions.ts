import { badRequest, conflict, notFound } from '../errors'
import { asPayload, isoDate, str } from '../validate'
import { toSessionInfo } from './sessions'
import type { Handler } from './types'

export const adminSessionHandlers: {
  'admin.sessions.list': Handler<'admin.sessions.list'>
  'admin.sessions.create': Handler<'admin.sessions.create'>
  'admin.sessions.activate': Handler<'admin.sessions.activate'>
} = {
  'admin.sessions.list': {
    access: { kind: 'roles', roles: ['suak', 'system_admin'] },
    write: false,
    run: (_p, { store }) =>
      store
        .all('jpp_sessions')
        .map(toSessionInfo)
        .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')),
  },

  'admin.sessions.create': {
    access: { kind: 'roles', roles: ['suak'] },
    write: true,
    run: (raw, ctx) => {
      const p = asPayload(raw)
      const name = str(p, 'name', { max: 120, label: 'Nama sesi' })
      const startDate = isoDate(p, 'startDate', 'Tarikh mula')
      const endDate = isoDate(p, 'endDate', 'Tarikh tamat')
      if (endDate < startDate) throw badRequest('Tarikh tamat mesti selepas tarikh mula.')
      if (ctx.store.find('jpp_sessions', (s) => s.name.toLowerCase() === name.toLowerCase())) throw conflict('Nama sesi telah wujud.')

      const now = ctx.now.toISOString()
      const row = ctx.store.insert('jpp_sessions', {
        id: ctx.uuid(),
        name,
        start_date: startDate,
        end_date: endDate,
        status: 'planned',
        created_at: now,
        updated_at: now,
        created_by: ctx.actor!.profile.id,
      })
      ctx.audit('session.create', 'jpp_session', row.id, null, { name, startDate, endDate })
      return toSessionInfo(row)
    },
  },

  'admin.sessions.activate': {
    access: { kind: 'roles', roles: ['suak'] },
    write: true,
    run: (raw, ctx) => {
      const p = asPayload(raw)
      const sessionId = str(p, 'sessionId', { max: 64 })
      const target = ctx.store.get('jpp_sessions', sessionId)
      if (!target) throw notFound('Sesi tidak ditemui.')
      if (target.status === 'archived') throw conflict('Sesi yang telah diarkibkan tidak boleh diaktifkan semula.')

      if (target.status !== 'active') {
        const now = ctx.now.toISOString()
        const previous = ctx.store.all('jpp_sessions').filter((s) => s.status === 'active')
        for (const s of previous) ctx.store.update('jpp_sessions', s.id, { status: 'archived', updated_at: now })
        ctx.store.update('jpp_sessions', sessionId, { status: 'active', updated_at: now })
        ctx.audit('session.activate', 'jpp_session', sessionId, { previousActive: previous.map((s) => s.id) }, { active: sessionId })
      }
      return ctx.store.all('jpp_sessions').map(toSessionInfo)
    },
  },
}
