import type { AnnouncementView } from '@shared/api-contract'
import { ANNOUNCEMENT_CATEGORIES } from '@shared/domain'
import { badRequest, forbidden } from '../errors'
import type { HandlerContext } from '../context'
import type { Row, TableStore } from '../store'
import { asPayload, oneOf, str } from '../validate'
import { isoDateTime, isStaff, mustGet, nameOf, newest, requireActor } from './common'
import type { Handler } from './types'

const ANY = { kind: 'roles', roles: ['member', 'secretariat', 'suak', 'system_admin'] } as const
const STAFF = { kind: 'roles', roles: ['secretariat', 'suak'] } as const
const RECENT_MS = 3 * 24 * 3600_000

const effectiveStart = (a: Row): string => a.publish_at || a.created_at

/** Live on the board: published, started, not expired, not archived. */
export function isLive(a: Row, now: Date): boolean {
  if (a.status !== 'published') return false
  if (Date.parse(effectiveStart(a)) > now.getTime()) return false
  if (a.expires_at && Date.parse(a.expires_at) <= now.getTime()) return false
  return true
}

export function toAnnouncementView(store: TableStore, a: Row, now: Date): AnnouncementView {
  const start = Date.parse(effectiveStart(a))
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    titleEn: a.title_en,
    bodyEn: a.body_en,
    category: a.category || 'Umum',
    visibility: a.visibility === 'public' ? 'public' : a.visibility === 'private' ? 'private' : 'internal',
    status: (['draft', 'published', 'archived'].includes(a.status) ? a.status : 'draft') as AnnouncementView['status'],
    pinned: a.pinned === 'true',
    publishAt: a.publish_at,
    expiresAt: a.expires_at,
    createdAt: a.created_at,
    author: nameOf(store, a.created_by),
    recent: a.status === 'published' && !Number.isNaN(start) && now.getTime() - start <= RECENT_MS,
  }
}

/** Pinned first, then newest. */
export const orderBoard = (rows: AnnouncementView[]): AnnouncementView[] =>
  [...rows].sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.publishAt || b.createdAt).localeCompare(a.publishAt || a.createdAt))

export function boardFor(ctx: HandlerContext): AnnouncementView[] {
  return orderBoard(
    ctx.store
      .all('announcements')
      .filter((a) => isLive(a, ctx.now) && (a.visibility === 'internal' || a.visibility === 'public'))
      .map((a) => toAnnouncementView(ctx.store, a, ctx.now)),
  )
}

export const announcementHandlers: { 'ann.list': Handler<'ann.list'>; 'ann.save': Handler<'ann.save'> } = {
  'ann.list': {
    access: ANY,
    write: false,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const scope = oneOf(asPayload(raw), 'scope', ['board', 'manage'] as const, 'Skop')
      if (scope === 'board') return boardFor(ctx)
      if (!isStaff(actor)) throw forbidden()
      return newest(ctx.store.all('announcements')).map((a) => toAnnouncementView(ctx.store, a, ctx.now))
    },
  },

  'ann.save': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const title = str(p, 'title', { max: 150, label: 'Tajuk' })
      const body = typeof p.body === 'string' ? p.body.trim() : ''
      if (!body) throw badRequest('Kandungan diperlukan.')
      if (body.length > 4000) throw badRequest('Kandungan terlalu panjang (maksimum 4,000 aksara).')
      const titleEn = str(p, 'titleEn', { max: 150, required: false, label: 'Tajuk (English)' })
      const bodyEn = typeof p.bodyEn === 'string' ? p.bodyEn.trim() : ''
      if (bodyEn.length > 4000) throw badRequest('Kandungan English terlalu panjang (maksimum 4,000 aksara).')
      const category = oneOf(p, 'category', ANNOUNCEMENT_CATEGORIES, 'Kategori')
      const visibility = oneOf(p, 'visibility', ['internal', 'public'] as const, 'Keterlihatan')
      // Public announcements are SUAK's call (Blueprint §08E: publication goes through SUAK).
      if (visibility === 'public' && !actor.roles.includes('suak')) throw forbidden('Hanya SUAK boleh menerbitkan pengumuman awam.')
      const status = oneOf(p, 'status', ['draft', 'published', 'archived'] as const, 'Status')
      const publishAt = str(p, 'publishAt', { max: 40, required: false })
      const expiresAt = str(p, 'expiresAt', { max: 40, required: false })
      if (publishAt) isoDateTime(publishAt, 'Tarikh terbit')
      if (expiresAt) isoDateTime(expiresAt, 'Tarikh tamat')
      if (publishAt && expiresAt && Date.parse(expiresAt) <= Date.parse(publishAt)) throw badRequest('Tarikh tamat mesti selepas tarikh terbit.')
      const now = ctx.now.toISOString()
      const values = { title, body, title_en: titleEn, body_en: bodyEn, category, visibility, status, pinned: p.pinned === true ? 'true' : 'false', publish_at: publishAt || (status === 'published' ? now : ''), expires_at: expiresAt, updated_at: now }
      const id = typeof p.id === 'string' && p.id ? p.id : ''
      if (id) {
        const a = mustGet(ctx.store, 'announcements', id, 'Pengumuman tidak ditemui.')
        if (a.visibility === 'public' && !actor.roles.includes('suak')) throw forbidden('Hanya SUAK boleh menyunting pengumuman awam.')
        const row = ctx.store.update('announcements', id, values)
        ctx.audit('announcement.update', 'announcement', id, { status: a.status, visibility: a.visibility }, { status, visibility })
        return toAnnouncementView(ctx.store, row, ctx.now)
      }
      const row = ctx.store.insert('announcements', { id: ctx.uuid(), created_at: now, created_by: actor.profile.id, ...values })
      ctx.audit('announcement.create', 'announcement', row.id, null, { title, status, visibility })
      return toAnnouncementView(ctx.store, row, ctx.now)
    },
  },
}
