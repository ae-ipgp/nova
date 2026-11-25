import type { DashboardSummary } from '@shared/api-contract'
import { hasArea } from '../context'
import { boardFor } from './announcements'
import { isStaff, newest, requireActor } from './common'
import { myMemberRow, toActionView, toMeetingView } from './meetings'
import { findActiveSession } from './sessions'
import type { Handler } from './types'

export const dashboardHandlers: { 'dashboard.summary': Handler<'dashboard.summary'> } = {
  'dashboard.summary': {
    access: { kind: 'roles', roles: ['member', 'secretariat', 'suak'] },
    write: false,
    run: (_p, ctx): DashboardSummary => {
      const actor = requireActor(ctx)
      const store = ctx.store
      const staff = isStaff(actor)
      const me = actor.profile.id
      const session = findActiveSession(store)

      const requests = store.all('reference_requests')
      const myReferenceByStatus: DashboardSummary['myReferenceByStatus'] = {}
      for (const r of requests.filter((x) => x.applicant_id === me)) {
        const s = r.status as keyof typeof myReferenceByStatus
        myReferenceByStatus[s] = (myReferenceByStatus[s] ?? 0) + 1
      }

      const mine = session ? myMemberRow(store, me, session.id) : undefined
      const nextMeeting = store
        .all('meetings')
        .filter((m) => m.status === 'scheduled' && Date.parse(m.ends_at || m.starts_at) >= ctx.now.getTime())
        .filter((m) => staff || (mine && store.find('meeting_invitees', (i) => i.meeting_id === m.id && i.member_id === mine.id)))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0]

      const monthPrefix = ctx.now.toISOString().slice(0, 7)
      const activity = staff && actor.roles.includes('suak') ? store.all('audit_logs') : store.all('audit_logs').filter((a) => a.actor_id === me)

      return {
        pendingReferences: staff ? requests.filter((r) => r.status === 'submitted').length : (myReferenceByStatus.submitted ?? 0),
        myReferenceByStatus,
        nextMeeting: nextMeeting ? toMeetingView(store, nextMeeting) : null,
        openActions: store
          .all('meeting_actions')
          .filter((a) => a.owner_id === me && a.status !== 'done')
          .map((a) => toActionView(store, a, ctx.now))
          .sort((a, b) => (a.dueDate || '9').localeCompare(b.dueDate || '9'))
          .slice(0, 8),
        oprInProgress: hasArea(actor, 'opr.approve')
          ? store.all('opr_reports').filter((r) => r.status === 'submitted').length
          : store.all('opr_reports').filter((r) => r.created_by === me && r.status !== 'approved').length,
        correspondenceThisMonth: staff ? store.all('correspondence').filter((c) => c.created_at.startsWith(monthPrefix)).length : 0,
        board: boardFor(ctx).slice(0, 4),
        recentActivity: newest(activity, 'created_at', 8).map((a) => ({ at: a.created_at, actor: a.actor_id, action: a.action, entityType: a.entity_type })),
      }
    },
  },
}
