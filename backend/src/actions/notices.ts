import type { DeliveryRow, NoticePreview, NoticeView, RecipientPreview, RecipientSpec } from '@shared/api-contract'
import { ASSIGNABLE_ROLES, NOTICE_TYPES, type NoticeType } from '@shared/domain'
import { composeNotice } from '../email'
import { badRequest, conflict, forbidden, notFound } from '../errors'
import { activeRolesOf, hasArea, makeAudit, type Actor, type HandlerContext } from '../context'
import type { Services } from '../services'
import { getSetting } from '../settings'
import type { Row, TableStore } from '../store'
import { asPayload, oneOf, str } from '../validate'
import { isoDateTime, maskEmail, mustGet, nameOf, newest, requireActor } from './common'
import { safeIds } from './admin-config'
import { findActiveSession } from './sessions'
import type { Handler } from './types'

export const MAX_RECIPIENTS = 150
const STAFF = { kind: 'roles', roles: ['secretariat', 'suak'] } as const

function sanitizeSpec(raw: unknown): RecipientSpec {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const strs = (v: unknown, max = 100): string[] => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean))].slice(0, max) : [])
  return {
    all: o.all === true,
    roles: strs(o.roles).filter((r): r is (typeof ASSIGNABLE_ROLES)[number] => (ASSIGNABLE_ROLES as readonly string[]).includes(r)),
    bureaus: strs(o.bureaus),
    groupIds: strs(o.groupIds),
    profileIds: strs(o.profileIds, 400),
  }
}

/** People who may receive mail: registered and not suspended/deactivated. */
export function resolveRecipients(store: TableStore, spec: RecipientSpec): Row[] {
  const session = findActiveSession(store)
  const candidates = store.all('profiles').filter((p) => (p.account_status === 'active' || p.account_status === 'invited') && p.email)
  const ids = new Set<string>()
  if (spec.all) candidates.forEach((p) => ids.add(p.id))
  if (spec.roles?.length) {
    for (const p of candidates) if (activeRolesOf(store, p.id).some((r) => spec.roles!.includes(r as never))) ids.add(p.id)
  }
  if (spec.bureaus?.length && session) {
    for (const m of store.all('jpp_members')) {
      if (m.session_id === session.id && m.membership_status !== 'inactive' && spec.bureaus.includes(m.bureau)) ids.add(m.profile_id)
    }
  }
  for (const gid of spec.groupIds ?? []) {
    const g = store.get('notice_groups', gid)
    if (g && g.active !== 'false') safeIds(g.profile_ids_json).forEach((x) => ids.add(x))
  }
  for (const pid of spec.profileIds ?? []) ids.add(pid)
  const seen = new Set<string>()
  return candidates.filter((p) => {
    const key = p.email.toLowerCase()
    if (!ids.has(p.id) || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const previewOf = (rows: Row[]): RecipientPreview => ({
  count: rows.length,
  people: rows.slice(0, 200).map((p) => ({ profileId: p.id, name: p.full_name, emailMasked: maskEmail(p.email) })),
})

export function toNoticeView(store: TableStore, n: Row): NoticeView {
  let spec: RecipientSpec = {}
  try {
    spec = sanitizeSpec(JSON.parse(n.recipient_spec_json || '{}'))
  } catch {
    /* empty spec */
  }
  return {
    id: n.id,
    type: (NOTICE_TYPES as readonly string[]).includes(n.notice_type) ? (n.notice_type as NoticeType) : 'announcement',
    subject: n.subject,
    body: n.body,
    eventAt: n.event_at,
    location: n.location,
    link: n.link,
    meetingId: n.meeting_id,
    status: n.status as NoticeView['status'],
    scheduledAt: n.scheduled_at,
    sentAt: n.sent_at,
    recipientSpec: spec,
    recipientCount: Number(n.recipient_count) || 0,
    sentCount: Number(n.sent_count) || 0,
    failedCount: Number(n.failed_count) || 0,
    createdAt: n.created_at,
    createdBy: nameOf(store, n.created_by),
  }
}

const canPrepare = (a: Actor | null) => hasArea(a, 'nome.prepare')
const canSend = (a: Actor | null) => hasArea(a, 'nome.send')

function requirePrepare(ctx: HandlerContext): Actor {
  const a = requireActor(ctx)
  if (!canPrepare(a)) throw forbidden('Anda tidak diberi kuasa menyediakan NoMe.')
  return a
}
function requireSend(ctx: HandlerContext): Actor {
  const a = requireActor(ctx)
  if (!canSend(a)) throw forbidden('Anda tidak diberi kuasa menghantar NoMe.')
  return a
}

/**
 * Sends (or retries) one notice. Idempotent per recipient: a row already "sent" is never
 * mailed again, so retries after a partial failure cannot create duplicates (NME-07).
 * Shared by the interactive "send" action and the scheduled trigger.
 */
export function deliverNotice(store: TableStore, services: Services, notice: Row, now: Date, uuid: () => string, auditActor: string): Row {
  const audit = makeAudit(store, now, uuid, () => auditActor)
  const spec = sanitizeSpec(JSON.parse(notice.recipient_spec_json || '{}'))
  const people = resolveRecipients(store, spec)
  const org = getSetting(store, 'org_name')
  const sender = getSetting(store, 'mail_sender_name')
  const replyTo = getSetting(store, 'mail_reply_to') || undefined

  for (const p of people) {
    const key = `${notice.id}:${p.email.toLowerCase()}`
    if (!store.find('notice_recipients', (r) => r.idempotency_key === key)) {
      store.insert('notice_recipients', { id: uuid(), notice_id: notice.id, email: p.email, recipient_name: p.full_name, delivery_status: 'pending', idempotency_key: key })
    }
  }
  const rows = store.all('notice_recipients').filter((r) => r.notice_id === notice.id)
  for (const r of rows) {
    if (r.delivery_status === 'sent') continue
    const mail = composeNotice({ type: notice.notice_type as NoticeType, subject: notice.subject, body: notice.body, eventAt: notice.event_at, location: notice.location, link: notice.link, orgName: org, recipientName: r.recipient_name })
    const result = services.mail.send({ to: r.email, subject: mail.subject, html: mail.html, text: mail.text, replyTo, senderName: sender })
    const at = now.toISOString()
    if (result.ok) {
      store.update('notice_recipients', r.id, { delivery_status: 'sent', sent_at: at, error: '' })
      store.insert('email_logs', { id: uuid(), notice_id: notice.id, recipient_id: r.id, event_type: 'sent', detail: '', occurred_at: at })
    } else {
      store.update('notice_recipients', r.id, { delivery_status: 'failed', error: result.error.slice(0, 300) })
      store.insert('email_logs', { id: uuid(), notice_id: notice.id, recipient_id: r.id, event_type: 'failed', detail: result.error.slice(0, 300), occurred_at: at })
    }
  }
  const final = store.all('notice_recipients').filter((r) => r.notice_id === notice.id)
  const sent = final.filter((r) => r.delivery_status === 'sent').length
  const failed = final.length - sent
  const status = failed === 0 ? 'sent' : sent === 0 ? 'failed' : 'partial'
  const updated = store.update('notices', notice.id, { status, sent_at: now.toISOString(), recipient_count: String(final.length), sent_count: String(sent), failed_count: String(failed), updated_at: now.toISOString() })
  audit('notice.deliver', 'notice', notice.id, null, { status, sent, failed })
  return updated
}

/** Sends every notice whose scheduled time has arrived (called by the time-driven trigger). */
export function processScheduledNotices(store: TableStore, services: Services, now: Date, uuid: () => string): number {
  let n = 0
  for (const notice of store.all('notices').filter((x) => x.status === 'scheduled' && x.scheduled_at && Date.parse(x.scheduled_at) <= now.getTime())) {
    const people = resolveRecipients(store, sanitizeSpec(JSON.parse(notice.recipient_spec_json || '{}')))
    if (!people.length || services.mail.remainingQuota() < people.length) {
      // Not enough quota today: leave it scheduled; the next run (after the daily reset) retries.
      continue
    }
    deliverNotice(store, services, notice, now, uuid, 'system:scheduler')
    n++
  }
  return n
}

export const noticeHandlers: {
  'notice.list': Handler<'notice.list'>
  'notice.get': Handler<'notice.get'>
  'notice.save': Handler<'notice.save'>
  'notice.recipients': Handler<'notice.recipients'>
  'notice.preview': Handler<'notice.preview'>
  'notice.markReady': Handler<'notice.markReady'>
  'notice.send': Handler<'notice.send'>
  'notice.retry': Handler<'notice.retry'>
  'notice.cancel': Handler<'notice.cancel'>
  'notice.deliveries': Handler<'notice.deliveries'>
} = {
  'notice.list': {
    access: STAFF,
    write: false,
    run: (_p, ctx) => {
      const a = requireActor(ctx)
      if (!canPrepare(a) && !canSend(a)) throw forbidden()
      return newest(ctx.store.all('notices')).map((n) => toNoticeView(ctx.store, n))
    },
  },

  'notice.get': {
    access: STAFF,
    write: false,
    run: (raw, ctx) => {
      const a = requireActor(ctx)
      if (!canPrepare(a) && !canSend(a)) throw forbidden()
      return toNoticeView(ctx.store, mustGet(ctx.store, 'notices', str(asPayload(raw), 'id', { max: 64 }), 'Notis tidak ditemui.'))
    },
  },

  'notice.save': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      const actor = requirePrepare(ctx)
      const p = asPayload(raw)
      const session = findActiveSession(ctx.store)
      if (!session) throw badRequest('Tiada sesi JPP aktif.')
      const type = oneOf(p, 'type', NOTICE_TYPES, 'Jenis notis')
      const subject = str(p, 'subject', { max: 150, label: 'Subjek' })
      const body = typeof p.body === 'string' ? p.body.trim() : ''
      if (!body) throw badRequest('Kandungan diperlukan.')
      if (body.length > 5000) throw badRequest('Kandungan terlalu panjang (maksimum 5,000 aksara).')
      const eventAt = str(p, 'eventAt', { max: 40, required: false })
      if (eventAt) isoDateTime(eventAt, 'Tarikh dan masa')
      const location = str(p, 'location', { max: 150, required: false, label: 'Lokasi' })
      const link = str(p, 'link', { max: 300, required: false, label: 'Pautan' })
      if (link && !/^https:\/\/[^\s]+$/.test(link)) throw badRequest('Pautan mesti bermula dengan https://')
      const spec = sanitizeSpec(p.recipientSpec)
      const people = resolveRecipients(ctx.store, spec)
      if (people.length > MAX_RECIPIENTS) throw badRequest(`Terlalu ramai penerima (${people.length}). Maksimum ${MAX_RECIPIENTS} bagi setiap notis.`)
      const scheduledAt = str(p, 'scheduledAt', { max: 40, required: false })
      if (scheduledAt) {
        isoDateTime(scheduledAt, 'Masa penghantaran')
        if (Date.parse(scheduledAt) <= ctx.now.getTime()) throw badRequest('Masa penghantaran mesti pada masa hadapan.')
      }
      const meetingId = str(p, 'meetingId', { max: 64, required: false })
      const now = ctx.now.toISOString()
      const values = {
        notice_type: type,
        subject,
        body,
        event_at: eventAt,
        location,
        link,
        meeting_id: meetingId,
        recipient_spec_json: JSON.stringify(spec),
        recipient_count: String(people.length),
        scheduled_at: scheduledAt,
        status: 'draft',
        updated_at: now,
      }
      const id = typeof p.id === 'string' && p.id ? p.id : ''
      if (id) {
        const n = mustGet(ctx.store, 'notices', id, 'Notis tidak ditemui.')
        if (n.status !== 'draft' && n.status !== 'ready') throw conflict('Notis yang telah dijadualkan atau dihantar tidak boleh disunting.')
        const row = ctx.store.update('notices', id, values)
        ctx.audit('notice.update', 'notice', id, { status: n.status }, { subject })
        return toNoticeView(ctx.store, row)
      }
      const row = ctx.store.insert('notices', { id: ctx.uuid(), session_id: session.id, created_at: now, created_by: actor.profile.id, ...values })
      ctx.audit('notice.create', 'notice', row.id, null, { subject, recipients: people.length })
      return toNoticeView(ctx.store, row)
    },
  },

  'notice.recipients': {
    access: STAFF,
    write: false,
    run: (raw, ctx) => {
      requirePrepare(ctx)
      return previewOf(resolveRecipients(ctx.store, sanitizeSpec(asPayload(raw).spec)))
    },
  },

  'notice.preview': {
    access: STAFF,
    write: false,
    run: (raw, ctx): NoticePreview => {
      const a = requireActor(ctx)
      if (!canPrepare(a) && !canSend(a)) throw forbidden()
      const n = mustGet(ctx.store, 'notices', str(asPayload(raw), 'id', { max: 64 }), 'Notis tidak ditemui.')
      const people = resolveRecipients(ctx.store, sanitizeSpec(JSON.parse(n.recipient_spec_json || '{}')))
      const mail = composeNotice({ type: n.notice_type as NoticeType, subject: n.subject, body: n.body, eventAt: n.event_at, location: n.location, link: n.link, orgName: getSetting(ctx.store, 'org_name'), recipientName: people[0]?.full_name ?? '(Nama penerima)' })
      return { ...mail, recipients: previewOf(people), quotaRemaining: ctx.services.mail.remainingQuota() }
    },
  },

  'notice.markReady': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      requirePrepare(ctx)
      const n = mustGet(ctx.store, 'notices', str(asPayload(raw), 'id', { max: 64 }), 'Notis tidak ditemui.')
      if (n.status !== 'draft') throw conflict('Hanya draf boleh ditandakan sedia untuk kelulusan.')
      if (!Number(n.recipient_count)) throw badRequest('Pilih sekurang-kurangnya seorang penerima.')
      const row = ctx.store.update('notices', n.id, { status: 'ready', updated_at: ctx.now.toISOString() })
      ctx.audit('notice.ready', 'notice', n.id, { status: 'draft' }, { status: 'ready' })
      return toNoticeView(ctx.store, row)
    },
  },

  'notice.send': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      const actor = requireSend(ctx)
      const p = asPayload(raw)
      const n = mustGet(ctx.store, 'notices', str(p, 'id', { max: 64 }), 'Notis tidak ditemui.')
      if (n.status !== 'draft' && n.status !== 'ready') throw conflict('Notis ini telah dihantar atau dijadualkan.')
      const people = resolveRecipients(ctx.store, sanitizeSpec(JSON.parse(n.recipient_spec_json || '{}')))
      if (!people.length) throw badRequest('Tiada penerima.')
      if (people.length > MAX_RECIPIENTS) throw badRequest(`Terlalu ramai penerima (maksimum ${MAX_RECIPIENTS}).`)
      // Explicit confirmation of the audience size guards against sending to the wrong group.
      if (Number(p.confirmCount) !== people.length) throw conflict(`Bilangan penerima telah berubah (kini ${people.length}). Semak semula sebelum menghantar.`)
      const now = ctx.now.toISOString()
      if (n.scheduled_at && Date.parse(n.scheduled_at) > ctx.now.getTime()) {
        const row = ctx.store.update('notices', n.id, { status: 'scheduled', approved_by: actor.profile.id, approved_at: now, recipient_count: String(people.length), updated_at: now })
        ctx.audit('notice.schedule', 'notice', n.id, { status: n.status }, { status: 'scheduled', at: n.scheduled_at, recipients: people.length })
        return toNoticeView(ctx.store, row)
      }
      const quota = ctx.services.mail.remainingQuota()
      if (quota < people.length) throw conflict(`Kuota e-mel harian tidak mencukupi (baki ${quota}, diperlukan ${people.length}). Cuba esok atau kurangkan penerima.`)
      ctx.store.update('notices', n.id, { approved_by: actor.profile.id, approved_at: now })
      const row = deliverNotice(ctx.store, ctx.services, ctx.store.get('notices', n.id)!, ctx.now, ctx.uuid, actor.profile.id)
      ctx.audit('notice.send', 'notice', n.id, { status: n.status }, { status: row.status, sent: row.sent_count, failed: row.failed_count })
      return toNoticeView(ctx.store, row)
    },
  },

  'notice.retry': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      const actor = requireSend(ctx)
      const n = mustGet(ctx.store, 'notices', str(asPayload(raw), 'id', { max: 64 }), 'Notis tidak ditemui.')
      if (n.status !== 'partial' && n.status !== 'failed') throw conflict('Tiada penghantaran gagal untuk dicuba semula.')
      const failed = ctx.store.all('notice_recipients').filter((r) => r.notice_id === n.id && r.delivery_status !== 'sent').length
      const quota = ctx.services.mail.remainingQuota()
      if (quota < failed) throw conflict(`Kuota e-mel harian tidak mencukupi (baki ${quota}, diperlukan ${failed}).`)
      const row = deliverNotice(ctx.store, ctx.services, n, ctx.now, ctx.uuid, actor.profile.id)
      ctx.audit('notice.retry', 'notice', n.id, null, { status: row.status, failed: row.failed_count })
      return toNoticeView(ctx.store, row)
    },
  },

  'notice.cancel': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      const a = requireActor(ctx)
      if (!canPrepare(a) && !canSend(a)) throw forbidden()
      const n = mustGet(ctx.store, 'notices', str(asPayload(raw), 'id', { max: 64 }), 'Notis tidak ditemui.')
      if (!['draft', 'ready', 'scheduled'].includes(n.status)) throw conflict('Notis yang telah dihantar tidak boleh dibatalkan.')
      const row = ctx.store.update('notices', n.id, { status: 'cancelled', updated_at: ctx.now.toISOString() })
      ctx.audit('notice.cancel', 'notice', n.id, { status: n.status }, { status: 'cancelled' })
      return toNoticeView(ctx.store, row)
    },
  },

  'notice.deliveries': {
    access: STAFF,
    write: false,
    run: (raw, ctx): DeliveryRow[] => {
      const a = requireActor(ctx)
      if (!canPrepare(a) && !canSend(a)) throw forbidden()
      const id = str(asPayload(raw), 'id', { max: 64 })
      if (!ctx.store.get('notices', id)) throw notFound('Notis tidak ditemui.')
      return ctx.store
        .all('notice_recipients')
        .filter((r) => r.notice_id === id)
        .map((r) => ({ id: r.id, name: r.recipient_name, emailMasked: maskEmail(r.email), status: r.delivery_status as DeliveryRow['status'], error: r.error, sentAt: r.sent_at }))
    },
  },
}
