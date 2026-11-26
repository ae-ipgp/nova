import type { ActionView, AgendaItem, InviteeView, MeetingDetail, MeetingView, MemberOption, MinutesView } from '@shared/api-contract'
import { summariseAttendance } from '@shared/attendance'
import { ATTENDANCE_STATUSES, MEETING_TYPES, type AttendanceStatus } from '@shared/domain'
import { badRequest, conflict, forbidden, notFound } from '../errors'
import { hasArea, type HandlerContext } from '../context'
import { envOf, notify } from '../notify'
import { getBool } from '../settings'
import type { Row, TableStore } from '../store'
import { asPayload, isoDate, oneOf, str } from '../validate'
import { isoDateTime, isStaff, mustGet, nameOf, requireActor, requireReason, todayIso } from './common'
import { findActiveSession } from './sessions'
import type { Handler } from './types'

const ANY_ROLE = { kind: 'roles', roles: ['member', 'secretariat', 'suak'] } as const
const STAFF = { kind: 'roles', roles: ['secretariat', 'suak'] } as const
const SUAK_ONLY = { kind: 'roles', roles: ['suak'] } as const

const STATUSES_SETTABLE: readonly AttendanceStatus[] = ['present', 'late', 'excused', 'absent_without_reason', 'pending']

export function toMeetingView(store: TableStore, m: Row): MeetingView {
  const invitees = store.all('meeting_invitees').filter((i) => i.meeting_id === m.id)
  const records = store.all('attendance_records').filter((r) => r.meeting_id === m.id)
  return {
    id: m.id,
    title: m.title,
    meetingType: m.meeting_type,
    startsAt: m.starts_at,
    endsAt: m.ends_at,
    location: m.location,
    link: m.link,
    status: (m.status === 'cancelled' || m.status === 'completed' ? m.status : 'scheduled') as MeetingView['status'],
    cancelReason: m.cancel_reason,
    published: Boolean(m.published_at),
    inviteeCount: invitees.length,
    verifiedCount: records.filter((r) => r.verified_at).length,
  }
}

export function toActionView(store: TableStore, a: Row, now: Date): ActionView {
  const meeting = store.get('meetings', a.meeting_id)
  return {
    id: a.id,
    meetingId: a.meeting_id,
    meetingTitle: meeting?.title ?? '',
    description: a.description,
    ownerId: a.owner_id,
    ownerName: nameOf(store, a.owner_id),
    dueDate: a.due_date,
    status: a.status === 'done' ? 'done' : 'open',
    overdue: a.status !== 'done' && Boolean(a.due_date) && a.due_date < todayIso(now),
  }
}

/** The member row (this session) that belongs to the signed-in profile, if any. */
export function myMemberRow(store: TableStore, profileId: string, sessionId: string): Row | undefined {
  return store.find('jpp_members', (m) => m.session_id === sessionId && m.profile_id === profileId && m.membership_status !== 'inactive')
}

interface Snapshot {
  name: string
  position: string
  bureau: string
}
const snap = (json: string): Snapshot => {
  try {
    const v = JSON.parse(json) as Partial<Snapshot>
    return { name: v.name ?? '', position: v.position ?? '', bureau: v.bureau ?? '' }
  } catch {
    return { name: '', position: '', bureau: '' }
  }
}

function latestMinutes(store: TableStore, meetingId: string, approvedOnly = false): Row | undefined {
  return store
    .all('meeting_minutes')
    .filter((m) => m.meeting_id === meetingId && (!approvedOnly || m.approval_status === 'approved'))
    .sort((a, b) => Number(b.version) - Number(a.version))[0]
}

function detail(ctx: HandlerContext, m: Row): MeetingDetail {
  const actor = requireActor(ctx)
  const staff = isStaff(actor)
  const store = ctx.store
  const session = findActiveSession(store)
  const mine = session ? myMemberRow(store, actor.profile.id, m.session_id || session.id) : undefined

  const records = store.all('attendance_records').filter((r) => r.meeting_id === m.id)
  const invitees: InviteeView[] = store
    .all('meeting_invitees')
    .filter((i) => i.meeting_id === m.id)
    .filter((i) => staff || i.member_id === mine?.id)
    .map((i) => {
      const s = snap(i.eligibility_snapshot)
      const r = records.find((x) => x.member_id === i.member_id)
      return {
        memberId: i.member_id,
        name: s.name,
        position: s.position,
        bureau: s.bureau,
        status: (ATTENDANCE_STATUSES as readonly string[]).includes(r?.status ?? '') ? (r!.status as AttendanceStatus) : 'pending',
        reason: staff ? (r?.reason_private ?? '') : '',
        verified: Boolean(r?.verified_at),
        verifiedBy: nameOf(store, r?.verified_by ?? ''),
        verifiedAt: r?.verified_at ?? '',
        exemptReason: i.exempt_reason,
        exemptUntil: i.exempt_until,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ms'))

  const agenda: AgendaItem[] = store
    .all('meeting_agendas')
    .filter((a) => a.meeting_id === m.id && a.title)
    .sort((a, b) => Number(a.sequence) - Number(b.sequence))
    .map((a) => ({ sequence: Number(a.sequence), title: a.title, presenter: a.presenter, notes: a.notes }))

  // Staff see the working version; members always see the latest APPROVED one, even while an amendment is drafted.
  const lm = latestMinutes(store, m.id, !staff)
  const minutes: MinutesView | null =
    lm
      ? { version: Number(lm.version), content: lm.content, approvalStatus: (lm.approval_status as MinutesView['approvalStatus']) || 'draft', approvedAt: lm.approved_at }
      : null

  const actions = store
    .all('meeting_actions')
    .filter((a) => a.meeting_id === m.id)
    .map((a) => toActionView(store, a, ctx.now))
    .sort((a, b) => (a.dueDate || '9').localeCompare(b.dueDate || '9'))

  return { meeting: toMeetingView(store, m), invitees, agenda, minutes, actions, canManage: staff, canVerify: hasArea(actor, 'meetings.verify') }
}

export function visibleTo(ctx: HandlerContext, m: Row): boolean {
  const actor = requireActor(ctx)
  if (isStaff(actor)) return true
  const mine = myMemberRow(ctx.store, actor.profile.id, m.session_id)
  return Boolean(mine && ctx.store.find('meeting_invitees', (i) => i.meeting_id === m.id && i.member_id === mine.id))
}

function getMeeting(ctx: HandlerContext, id: string, forWrite = false): Row {
  const m = mustGet(ctx.store, 'meetings', id, 'Mesyuarat tidak ditemui.')
  if (!forWrite && !visibleTo(ctx, m)) throw notFound('Mesyuarat tidak ditemui.')
  return m
}

function activeMembers(store: TableStore, sessionId: string): Row[] {
  return store.all('jpp_members').filter((m) => m.session_id === sessionId && m.membership_status !== 'inactive')
}

function inviteMember(ctx: HandlerContext, meetingId: string, member: Row, now: string) {
  const profile = ctx.store.get('profiles', member.profile_id)
  ctx.store.insert('meeting_invitees', {
    id: ctx.uuid(),
    meeting_id: meetingId,
    member_id: member.id,
    eligibility_snapshot: JSON.stringify({ name: profile?.full_name ?? '', position: member.position, bureau: member.bureau }),
    created_at: now,
  })
  ctx.store.insert('attendance_records', { id: ctx.uuid(), meeting_id: meetingId, member_id: member.id, status: 'pending', created_at: now, updated_at: now, created_by: ctx.actor!.profile.id })
}

export const meetingHandlers: {
  'mtg.members': Handler<'mtg.members'>
  'mtg.list': Handler<'mtg.list'>
  'mtg.get': Handler<'mtg.get'>
  'mtg.save': Handler<'mtg.save'>
  'mtg.cancel': Handler<'mtg.cancel'>
  'mtg.publish': Handler<'mtg.publish'>
  'mtg.exempt': Handler<'mtg.exempt'>
  'mtg.attendance.set': Handler<'mtg.attendance.set'>
  'mtg.attendance.verify': Handler<'mtg.attendance.verify'>
  'mtg.agenda.save': Handler<'mtg.agenda.save'>
  'mtg.minutes.save': Handler<'mtg.minutes.save'>
  'mtg.minutes.approve': Handler<'mtg.minutes.approve'>
  'mtg.action.save': Handler<'mtg.action.save'>
  'mtg.summary': Handler<'mtg.summary'>
} = {
  'mtg.members': {
    access: STAFF,
    write: false,
    run: (_p, { store }): MemberOption[] => {
      const session = findActiveSession(store)
      if (!session) return []
      return activeMembers(store, session.id)
        .map((m) => ({ memberId: m.id, profileId: m.profile_id, name: nameOf(store, m.profile_id), position: m.position, bureau: m.bureau }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ms'))
    },
  },

  'mtg.list': {
    access: ANY_ROLE,
    write: false,
    run: (_p, ctx): MeetingView[] =>
      ctx.store
        .all('meetings')
        .filter((m) => visibleTo(ctx, m))
        .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
        .slice(0, 300)
        .map((m) => toMeetingView(ctx.store, m)),
  },

  'mtg.get': { access: ANY_ROLE, write: false, run: (raw, ctx) => detail(ctx, getMeeting(ctx, str(asPayload(raw), 'id', { max: 64 }))) },

  'mtg.save': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const session = findActiveSession(ctx.store)
      if (!session) throw badRequest('Tiada sesi JPP aktif.')
      const title = str(p, 'title', { max: 150, label: 'Tajuk' })
      const meetingType = oneOf(p, 'meetingType', MEETING_TYPES, 'Jenis mesyuarat')
      const startsAt = isoDateTime(str(p, 'startsAt', { max: 40, label: 'Masa mula' }), 'Masa mula')
      const endsAt = isoDateTime(str(p, 'endsAt', { max: 40, label: 'Masa tamat' }), 'Masa tamat')
      if (Date.parse(endsAt) <= Date.parse(startsAt)) throw badRequest('Masa tamat mesti selepas masa mula.')
      const location = str(p, 'location', { max: 150, required: false, label: 'Lokasi' })
      const link = str(p, 'link', { max: 300, required: false, label: 'Pautan' })
      if (link && !/^https:\/\/[^\s]+$/.test(link)) throw badRequest('Pautan mesti bermula dengan https://')
      if (!location && !link) throw badRequest('Nyatakan lokasi atau pautan mesyuarat.')
      const now = ctx.now.toISOString()
      const members = activeMembers(ctx.store, session.id)
      const wanted = Array.isArray(p.memberIds) ? new Set(p.memberIds.filter((x): x is string => typeof x === 'string')) : null
      const toInvite = members.filter((m) => !wanted || wanted.has(m.id))
      if (wanted && toInvite.length !== wanted.size) throw badRequest('Senarai ahli mengandungi ahli yang tidak sah.')

      const id = typeof p.id === 'string' && p.id ? p.id : ''
      if (id) {
        const m = getMeeting(ctx, id, true)
        if (m.status === 'cancelled') throw conflict('Mesyuarat yang dibatalkan tidak boleh disunting.')
        const row = ctx.store.update('meetings', id, { title, meeting_type: meetingType, starts_at: startsAt, ends_at: endsAt, location, link, updated_at: now })
        const already = new Set(ctx.store.all('meeting_invitees').filter((i) => i.meeting_id === id).map((i) => i.member_id))
        for (const mem of toInvite) if (!already.has(mem.id)) inviteMember(ctx, id, mem, now)
        ctx.audit('meeting.update', 'meeting', id, { title: m.title, startsAt: m.starts_at }, { title, startsAt })
        return detail(ctx, row)
      }
      const row = ctx.store.insert('meetings', {
        id: ctx.uuid(),
        session_id: session.id,
        title,
        meeting_type: meetingType,
        starts_at: startsAt,
        ends_at: endsAt,
        location,
        link,
        organiser_id: actor.profile.id,
        status: 'scheduled',
        created_at: now,
        updated_at: now,
        created_by: actor.profile.id,
      })
      for (const mem of toInvite) inviteMember(ctx, row.id, mem, now)
      ctx.audit('meeting.create', 'meeting', row.id, null, { title, startsAt, invitees: toInvite.length })
      return detail(ctx, row)
    },
  },

  'mtg.cancel': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      const p = asPayload(raw)
      const m = getMeeting(ctx, str(p, 'id', { max: 64 }), true)
      const reason = requireReason(str(p, 'reason', { max: 500, label: 'Sebab' }))
      if (m.status === 'cancelled') throw conflict('Mesyuarat ini telah dibatalkan.')
      const row = ctx.store.update('meetings', m.id, { status: 'cancelled', cancel_reason: reason, published_at: '', published_by: '', updated_at: ctx.now.toISOString() })
      ctx.audit('meeting.cancel', 'meeting', m.id, { status: m.status }, { status: 'cancelled', reason })
      return detail(ctx, row)
    },
  },

  'mtg.publish': {
    access: SUAK_ONLY,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const m = getMeeting(ctx, str(p, 'id', { max: 64 }), true)
      const publish = p.publish === true
      if (publish) {
        if (m.status === 'cancelled') throw conflict('Mesyuarat yang dibatalkan tidak boleh diterbitkan.')
        const records = ctx.store.all('attendance_records').filter((r) => r.meeting_id === m.id)
        if (!records.length) throw conflict('Tiada rekod kehadiran untuk diterbitkan.')
        if (records.some((r) => !r.verified_at)) throw conflict('Semua kehadiran mesti disahkan sebelum diterbitkan kepada awam.')
      }
      const row = ctx.store.update('meetings', m.id, { published_at: publish ? ctx.now.toISOString() : '', published_by: publish ? actor.profile.id : '', updated_at: ctx.now.toISOString() })
      ctx.audit(publish ? 'meeting.publish' : 'meeting.unpublish', 'meeting', m.id, null, { title: m.title })
      return detail(ctx, row)
    },
  },

  'mtg.exempt': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      const p = asPayload(raw)
      const m = getMeeting(ctx, str(p, 'meetingId', { max: 64 }), true)
      const memberId = str(p, 'memberId', { max: 64 })
      const inv = ctx.store.find('meeting_invitees', (i) => i.meeting_id === m.id && i.member_id === memberId)
      const rec = ctx.store.find('attendance_records', (r) => r.meeting_id === m.id && r.member_id === memberId)
      if (!inv || !rec) throw notFound('Ahli tidak dijemput ke mesyuarat ini.')
      if (rec.verified_at) throw conflict('Kehadiran telah disahkan. Pengecualian tidak boleh diubah selepas pengesahan.')
      const now = ctx.now.toISOString()
      if (p.clear === true) {
        ctx.store.update('meeting_invitees', inv.id, { exempt_reason: '', exempt_until: '' })
        ctx.store.update('attendance_records', rec.id, { status: 'pending', updated_at: now })
        ctx.audit('meeting.exempt.clear', 'meeting', m.id, { memberId }, null)
      } else {
        const reason = requireReason(str(p, 'reason', { max: 300, label: 'Sebab pengecualian' }))
        const until = str(p, 'until', { max: 10, required: false })
        if (until) isoDate(p, 'until', 'Tempoh')
        ctx.store.update('meeting_invitees', inv.id, { exempt_reason: reason, exempt_until: until })
        ctx.store.update('attendance_records', rec.id, { status: 'exempted', updated_at: now })
        ctx.audit('meeting.exempt', 'meeting', m.id, null, { memberId, reason, until })
      }
      return detail(ctx, m)
    },
  },

  'mtg.attendance.set': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const m = getMeeting(ctx, str(p, 'meetingId', { max: 64 }), true)
      if (m.status === 'cancelled') throw conflict('Mesyuarat telah dibatalkan.')
      if (!Array.isArray(p.entries) || !p.entries.length || p.entries.length > 400) throw badRequest('Senarai kehadiran tidak sah.')
      const editReason = str(p, 'editReason', { max: 300, required: false, label: 'Sebab pembetulan' })
      const now = ctx.now.toISOString()

      // Validate everything first so a bad row never leaves a half-saved list.
      const planned = p.entries.map((e) => {
        const o = (e ?? {}) as Record<string, unknown>
        const memberId = typeof o.memberId === 'string' ? o.memberId : ''
        const status = o.status as AttendanceStatus
        if (!STATUSES_SETTABLE.includes(status)) throw badRequest('Status kehadiran tidak sah.')
        const reason = typeof o.reason === 'string' ? o.reason.trim().slice(0, 300) : ''
        if (status === 'excused' && !reason) throw badRequest('Sebab diperlukan bagi status Bersebab.')
        const rec = ctx.store.find('attendance_records', (r) => r.meeting_id === m.id && r.member_id === memberId)
        if (!rec) throw badRequest('Ahli tidak dijemput ke mesyuarat ini.')
        if (rec.status === 'exempted') throw conflict('Ahli ini dikecualikan. Batalkan pengecualian dahulu.')
        const changed = rec.status !== status || (rec.reason_private || '') !== reason
        if (rec.verified_at && changed) {
          if (!hasArea(actor, 'meetings.verify')) throw forbidden('Kehadiran telah disahkan. Hanya SUAK atau pemegang kuasa pengesahan boleh membetulkannya.')
          if (editReason.length < 5) throw badRequest('Sebab pembetulan diperlukan bagi kehadiran yang telah disahkan.')
        }
        return { rec, status, reason, changed }
      })
      for (const { rec, status, reason, changed } of planned) {
        if (!changed) continue
        ctx.store.update('attendance_records', rec.id, { status, reason_private: reason, updated_at: now })
        ctx.audit(rec.verified_at ? 'attendance.correct' : 'attendance.set', 'meeting', m.id, { memberId: rec.member_id, status: rec.status }, { status, ...(rec.verified_at ? { editReason } : {}) })
      }
      return detail(ctx, m)
    },
  },

  'mtg.attendance.verify': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      if (!hasArea(actor, 'meetings.verify')) throw forbidden('Hanya SUAK atau pemegang kuasa pengesahan boleh mengesahkan kehadiran.')
      const m = getMeeting(ctx, str(asPayload(raw), 'meetingId', { max: 64 }), true)
      const records = ctx.store.all('attendance_records').filter((r) => r.meeting_id === m.id)
      if (!records.length) throw conflict('Tiada rekod kehadiran.')
      if (records.some((r) => r.status === 'pending')) throw conflict('Masih ada ahli yang belum direkod. Rekod semua kehadiran atau kecualikan dahulu.')
      const now = ctx.now.toISOString()
      let n = 0
      for (const r of records) {
        if (r.verified_at) continue
        ctx.store.update('attendance_records', r.id, { verified_by: actor.profile.id, verified_at: now, updated_at: now })
        n++
      }
      ctx.audit('attendance.verify', 'meeting', m.id, null, { records: n })
      return detail(ctx, m)
    },
  },

  'mtg.agenda.save': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const m = getMeeting(ctx, str(p, 'meetingId', { max: 64 }), true)
      if (!Array.isArray(p.items) || p.items.length > 40) throw badRequest('Agenda tidak sah.')
      const items = p.items.map((x, i) => {
        const o = (x ?? {}) as Record<string, unknown>
        const title = typeof o.title === 'string' ? o.title.trim() : ''
        if (!title || title.length > 200) throw badRequest(`Tajuk agenda ${i + 1} tidak sah.`)
        return { title, presenter: typeof o.presenter === 'string' ? o.presenter.trim().slice(0, 100) : '', notes: typeof o.notes === 'string' ? o.notes.trim().slice(0, 1000) : '' }
      })
      const existing = ctx.store.all('meeting_agendas').filter((a) => a.meeting_id === m.id)
      const now = ctx.now.toISOString()
      items.forEach((it, i) => {
        const row = existing.find((a) => Number(a.sequence) === i + 1)
        const values = { sequence: String(i + 1), title: it.title, presenter: it.presenter, notes: it.notes, updated_at: now }
        if (row) ctx.store.update('meeting_agendas', row.id, values)
        else ctx.store.insert('meeting_agendas', { id: ctx.uuid(), meeting_id: m.id, created_at: now, created_by: actor.profile.id, ...values })
      })
      // Rows are never deleted; surplus ones are blanked and ignored when reading.
      for (const row of existing) if (Number(row.sequence) > items.length && row.title) ctx.store.update('meeting_agendas', row.id, { title: '', updated_at: now })
      ctx.audit('agenda.save', 'meeting', m.id, null, { items: items.length })
      return detail(ctx, m)
    },
  },

  'mtg.minutes.save': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const m = getMeeting(ctx, str(p, 'meetingId', { max: 64 }), true)
      const content = typeof p.content === 'string' ? p.content.trim() : ''
      if (!content) throw badRequest('Kandungan minit diperlukan.')
      if (content.length > 40_000) throw badRequest('Minit terlalu panjang (maksimum 40,000 aksara).')
      const submit = p.submit === true
      const latest = latestMinutes(ctx.store, m.id)
      const now = ctx.now.toISOString()
      if (latest && latest.approval_status !== 'approved') {
        ctx.store.update('meeting_minutes', latest.id, { content, approval_status: submit ? 'submitted' : 'draft', updated_at: now })
      } else {
        ctx.store.insert('meeting_minutes', { id: ctx.uuid(), meeting_id: m.id, version: String((latest ? Number(latest.version) : 0) + 1), content, approval_status: submit ? 'submitted' : 'draft', created_at: now, updated_at: now, created_by: actor.profile.id })
      }
      ctx.audit(submit ? 'minutes.submit' : 'minutes.save', 'meeting', m.id, null, { chars: content.length })
      return detail(ctx, m)
    },
  },

  'mtg.minutes.approve': {
    access: SUAK_ONLY,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const m = getMeeting(ctx, str(asPayload(raw), 'meetingId', { max: 64 }), true)
      const latest = latestMinutes(ctx.store, m.id)
      if (!latest || latest.approval_status !== 'submitted') throw conflict('Tiada minit yang dihantar untuk kelulusan.')
      ctx.store.update('meeting_minutes', latest.id, { approval_status: 'approved', approved_by: actor.profile.id, approved_at: ctx.now.toISOString(), updated_at: ctx.now.toISOString() })
      ctx.audit('minutes.approve', 'meeting', m.id, { version: latest.version }, { approved: true })
      return detail(ctx, m)
    },
  },

  'mtg.action.save': {
    access: ANY_ROLE,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const m = getMeeting(ctx, str(p, 'meetingId', { max: 64 }), true)
      const status = oneOf(p, 'status', ['open', 'done'] as const, 'Status')
      const id = typeof p.id === 'string' && p.id ? p.id : ''
      const now = ctx.now.toISOString()

      if (!isStaff(actor)) {
        // Owners may only tick off their own action.
        const a = id ? ctx.store.get('meeting_actions', id) : undefined
        if (!a || a.owner_id !== actor.profile.id || a.meeting_id !== m.id) throw forbidden()
        ctx.store.update('meeting_actions', a.id, { status, updated_at: now })
        ctx.audit('action.status', 'meeting_action', a.id, { status: a.status }, { status })
        return detail(ctx, m)
      }
      const description = str(p, 'description', { max: 400, label: 'Tindakan' })
      const ownerId = str(p, 'ownerId', { max: 64, label: 'Pemilik' })
      const owner = ctx.store.get('profiles', ownerId)
      if (!owner || owner.account_status === 'deactivated') throw badRequest('Pemilik tindakan tidak sah.')
      const dueDate = isoDate(p, 'dueDate', 'Tarikh akhir')
      const values = { description, owner_id: ownerId, due_date: dueDate, status, updated_at: now }
      if (id) {
        const a = ctx.store.get('meeting_actions', id)
        if (!a || a.meeting_id !== m.id) throw notFound('Tindakan tidak ditemui.')
        ctx.store.update('meeting_actions', id, values)
        ctx.audit('action.update', 'meeting_action', id, { status: a.status, due: a.due_date }, { status, due: dueDate })
      } else {
        const row = ctx.store.insert('meeting_actions', { id: ctx.uuid(), meeting_id: m.id, created_at: now, created_by: actor.profile.id, ...values })
        ctx.audit('action.create', 'meeting_action', row.id, null, { description, ownerId })
        if (ownerId !== actor.profile.id) {
          notify(envOf(ctx), 'action_assigned', owner, { subject: `Tindakan susulan baharu: ${description}`, body: `Anda diberikan tindakan susulan.\n\nTindakan: ${description}\nMesyuarat: ${m.title}\nTarikh akhir: ${dueDate}`, path: `/workspace/e-mesyuarat/${m.id}` })
        }
      }
      return detail(ctx, m)
    },
  },

  'mtg.summary': {
    access: ANY_ROLE,
    write: false,
    run: (_p, ctx) => {
      const actor = requireActor(ctx)
      const store = ctx.store
      const session = findActiveSession(store)
      if (!session) return []
      const lateCounts = getBool(store, 'late_counts_as_present')
      const meetingIds = new Set(store.all('meetings').filter((m) => m.session_id === session.id && m.status !== 'cancelled').map((m) => m.id))
      const records = store.all('attendance_records').filter((r) => meetingIds.has(r.meeting_id))
      const mine = myMemberRow(store, actor.profile.id, session.id)
      return activeMembers(store, session.id)
        .filter((mem) => isStaff(actor) || mem.id === mine?.id)
        .map((mem) => {
          const statuses = records.filter((r) => r.member_id === mem.id).map((r) => r.status as AttendanceStatus)
          const s = summariseAttendance(statuses, lateCounts)
          return { memberId: mem.id, name: nameOf(store, mem.profile_id), position: mem.position, bureau: mem.bureau, ...s, absent: s.absent }
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'ms'))
    },
  },
}

