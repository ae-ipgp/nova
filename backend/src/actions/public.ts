import type { PublicAnnouncement, PublicAttendance, PublicDocument, PublicLeader, PublicTemplate } from '@shared/api-contract'
import { ATTENDANCE_STATUSES, type AttendanceStatus } from '@shared/domain'
import { getSheetDef } from '@shared/schema'
import { notFound } from '../errors'
import { allSettings, getSetting } from '../settings'
import { asPayload, str } from '../validate'
import { pick } from './common'
import { isLive } from './announcements'
import { findActiveSession, toPublicSession } from './sessions'
import type { Handler } from './types'

/**
 * Everything here runs WITHOUT sign-in, so each handler projects rows onto the sheet's
 * `publicColumns` and only ever reads rows that SUAK has published. Nothing private
 * (reasons, emails, drafts, internal files) can leak through these endpoints.
 */
const PUBLIC = { kind: 'public' } as const
const cols = (sheet: Parameters<typeof getSheetDef>[0]): readonly string[] => getSheetDef(sheet).publicColumns ?? []

export const publicHandlers: {
  'site.config': Handler<'site.config'>
  'public.announcements': Handler<'public.announcements'>
  'public.attendance': Handler<'public.attendance'>
  'public.templates': Handler<'public.templates'>
  'public.templates.download': Handler<'public.templates.download'>
  'public.archive': Handler<'public.archive'>
  'public.archive.download': Handler<'public.archive.download'>
  'public.leaders': Handler<'public.leaders'>
  'public.verify': Handler<'public.verify'>
} = {
  'site.config': {
    access: PUBLIC,
    write: false,
    run: (_p, { store }) => {
      const s = findActiveSession(store)
      return { settings: allSettings(store, true), activeSession: s ? toPublicSession(s) : null }
    },
  },

  'public.announcements': {
    access: PUBLIC,
    write: false,
    run: (_p, ctx): PublicAnnouncement[] =>
      ctx.store
        .all('announcements')
        .filter((a) => a.visibility === 'public' && isLive(a, ctx.now))
        .map((a) => pick({ ...a, publish_at: a.publish_at || a.created_at }, cols('announcements')))
        .map((a) => ({ id: a.id, title: a.title, body: a.body, publishAt: a.publish_at, category: a.category || 'Umum', pinned: a.pinned === 'true' }))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishAt.localeCompare(a.publishAt))
        .slice(0, 100),
  },

  'public.attendance': {
    access: PUBLIC,
    write: false,
    run: (_p, { store }): PublicAttendance => {
      const mode = getSetting(store, 'public_attendance_mode') === 'named' ? 'named' : 'aggregate'
      const meetings = store
        .all('meetings')
        .filter((m) => m.published_at && m.status !== 'cancelled')
        .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
        .slice(0, 100)
        .map((m) => {
          // Only verified rows count; the private reason column is never read here.
          const rows = store.all('attendance_records').filter((r) => r.meeting_id === m.id && r.verified_at)
          const n = (s: AttendanceStatus) => rows.filter((r) => r.status === s).length
          const base = {
            id: m.id,
            title: m.title,
            meetingType: m.meeting_type,
            startsAt: m.starts_at,
            counts: { present: n('present'), late: n('late'), excused: n('excused'), absent: n('absent_without_reason') },
          }
          if (mode === 'aggregate') return base
          const named = rows
            .filter((r) => (ATTENDANCE_STATUSES as readonly string[]).includes(r.status) && r.status !== 'exempted')
            .map((r) => {
              const inv = store.find('meeting_invitees', (i) => i.meeting_id === m.id && i.member_id === r.member_id)
              let s = { name: '', position: '', bureau: '' }
              try {
                s = { ...s, ...(JSON.parse(inv?.eligibility_snapshot || '{}') as object) }
              } catch {
                /* empty snapshot */
              }
              return { name: s.name, position: s.position, bureau: s.bureau, status: r.status as AttendanceStatus }
            })
            .sort((a, b) => a.name.localeCompare(b.name, 'ms'))
          return { ...base, rows: named }
        })
      return { mode, meetings }
    },
  },

  'public.templates': {
    access: PUBLIC,
    write: false,
    run: (_p, { store }): PublicTemplate[] =>
      store
        .all('templates')
        .filter((t) => t.access_level === 'public' && t.status !== 'archived')
        .map((t): PublicTemplate => {
          const r = pick(t, cols('templates'))
          return { id: r.id, category: r.category, title: r.title, description: r.description, version: r.version, updatedAt: r.updated_at, fileName: r.file_name }
        })
        .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title, 'ms')),
  },

  'public.templates.download': {
    access: PUBLIC,
    write: false,
    run: (raw, ctx) => {
      const t = ctx.store.get('templates', str(asPayload(raw), 'id', { max: 64 }))
      if (!t || t.access_level !== 'public' || t.status === 'archived') throw notFound('Templat tidak ditemui.')
      const f = ctx.services.files.read(t.drive_file_id)
      if (!f) throw notFound('Fail tidak ditemui.')
      return { name: t.file_name || f.name, mimeType: f.mimeType, base64: f.base64 }
    },
  },

  'public.archive': {
    access: PUBLIC,
    write: false,
    run: (_p, { store }): PublicDocument[] =>
      store
        .all('archive_documents')
        .filter((d) => d.visibility === 'public' && (d.status || 'active') === 'active' && d.public_file_id)
        .map((d): PublicDocument => {
          const r = pick(d, cols('archive_documents'))
          return { id: r.id, title: r.title, category: r.category, referenceNumber: r.reference_number, publishedAt: r.published_at, fileName: r.file_name }
        })
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, 200),
  },

  'public.archive.download': {
    access: PUBLIC,
    write: false,
    run: (raw, ctx) => {
      const d = ctx.store.get('archive_documents', str(asPayload(raw), 'id', { max: 64 }))
      // Served from the separate public copy only — never from the private original.
      if (!d || d.visibility !== 'public' || (d.status || 'active') !== 'active' || !d.public_file_id) throw notFound('Dokumen tidak ditemui.')
      const f = ctx.services.files.read(d.public_file_id)
      if (!f) throw notFound('Fail tidak ditemui.')
      return { name: d.file_name || f.name, mimeType: f.mimeType, base64: f.base64 }
    },
  },

  'public.leaders': {
    access: PUBLIC,
    write: false,
    run: (_p, { store }) => {
      const session = findActiveSession(store)
      if (!session) return { session: null, leaders: [] }
      const leaders: PublicLeader[] = store
        .all('jpp_members')
        .filter((m) => m.session_id === session.id && m.membership_status !== 'inactive' && m.public_listing === 'true')
        .map((m) => ({ name: store.get('profiles', m.profile_id)?.full_name ?? '', position: m.position, bureau: m.bureau }))
        .filter((l) => l.name)
        .sort((a, b) => a.bureau.localeCompare(b.bureau, 'ms') || a.name.localeCompare(b.name, 'ms'))
      return { session: toPublicSession(session), leaders }
    },
  },

  'public.verify': {
    access: PUBLIC,
    write: false,
    run: (raw, { store }) => {
      const ref = str(asPayload(raw), 'reference', { max: 120, label: 'Nombor rujukan' }).toLowerCase()
      const reg = store.find('reference_register', (r) => r.reference_number.toLowerCase() === ref)
      // Confirms existence only; never reveals the subject, recipient or applicant.
      if (!reg) return { found: false }
      const req = store.get('reference_requests', reg.request_id)
      const type = req?.document_type_id ? store.get('document_types', req.document_type_id) : undefined
      return { found: true, status: reg.voided_at ? 'voided' : 'issued', issuedAt: reg.issued_at.slice(0, 10), typeName: type?.name || req?.letter_type || '' }
    },
  },
}
