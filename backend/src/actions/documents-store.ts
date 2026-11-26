import type { ArchiveView, TemplateView } from '@shared/api-contract'
import { extensionFor } from '@shared/files'
import { VISIBILITY, type VisibilityLevel } from '@shared/domain'
import { badRequest, conflict, forbidden, notFound } from '../errors'
import { hasArea, type HandlerContext } from '../context'
import type { Row, TableStore } from '../store'
import { asPayload, oneOf, str } from '../validate'
import { isStaff, mustGet, nameOf, newest, requireActor } from './common'
import { findActiveSession } from './sessions'
import type { Handler } from './types'
import { readFile } from './uploads'

const ANY = { kind: 'roles', roles: ['member', 'secretariat', 'suak'] } as const
const STAFF = { kind: 'roles', roles: ['secretariat', 'suak'] } as const
const SUAK_ONLY = { kind: 'roles', roles: ['suak'] } as const

export const TEMPLATE_CATEGORIES = ['surat', 'mesyuarat', 'pelaporan', 'pentadbiran', 'pengurusan'] as const

// ---------------------------------------------------------------------------
// Templat (M05)
// ---------------------------------------------------------------------------

export function toTemplateView(t: Row): TemplateView {
  return {
    id: t.id,
    category: t.category,
    title: t.title,
    description: t.description,
    version: t.version,
    accessLevel: t.access_level === 'public' ? 'public' : 'internal',
    status: t.status === 'archived' ? 'archived' : 'active',
    fileName: t.file_name,
    mimeType: t.mime_type,
    sizeBytes: Number(t.size_bytes) || 0,
    updatedAt: t.updated_at,
  }
}

const canManageTemplates = (ctx: HandlerContext) => hasArea(ctx.actor, 'templates.manage')

export const templateHandlers: {
  'tpl.list': Handler<'tpl.list'>
  'tpl.save': Handler<'tpl.save'>
  'tpl.archive': Handler<'tpl.archive'>
  'tpl.download': Handler<'tpl.download'>
} = {
  'tpl.list': {
    access: ANY,
    write: false,
    run: (_p, ctx) => {
      const manage = canManageTemplates(ctx)
      return ctx.store
        .all('templates')
        .filter((t) => manage || t.status !== 'archived')
        .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title, 'ms'))
        .map(toTemplateView)
    },
  },

  'tpl.save': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      if (!canManageTemplates(ctx)) throw forbidden('Anda tidak diberi kuasa mengurus templat.')
      const p = asPayload(raw)
      const category = oneOf(p, 'category', TEMPLATE_CATEGORIES, 'Kategori')
      const title = str(p, 'title', { max: 150, label: 'Tajuk' })
      const description = str(p, 'description', { max: 400, required: false })
      const accessLevel = oneOf(p, 'accessLevel', ['internal', 'public'] as const, 'Tahap akses')
      const file = readFile(p, 'file')
      const id = typeof p.id === 'string' && p.id ? p.id : ''
      const now = ctx.now.toISOString()
      if (accessLevel === 'public' && !actor.roles.includes('suak')) throw forbidden('Hanya SUAK boleh menandakan templat sebagai awam.')

      if (id) {
        const t = mustGet(ctx.store, 'templates', id, 'Templat tidak ditemui.')
        const values: Record<string, string> = { category, title, description, access_level: accessLevel, updated_at: now }
        if (file) {
          // New file = new version; the previous Drive file is kept (never deleted) for history.
          values.drive_file_id = ctx.services.files.save('templat', `${title}-v${Number(t.version) + 1}.${extensionFor(file.mimeType)}`, file.mimeType, file.base64)
          values.version = String((Number(t.version) || 1) + 1)
          values.file_name = file.name
          values.mime_type = file.mimeType
          values.size_bytes = String(Math.floor((file.base64.length * 3) / 4))
        }
        const row = ctx.store.update('templates', id, values)
        ctx.audit('template.update', 'template', id, { version: t.version, access: t.access_level }, { version: row.version, access: accessLevel })
        return toTemplateView(row)
      }
      if (!file) throw badRequest('Fail templat diperlukan.')
      const row = ctx.store.insert('templates', {
        id: ctx.uuid(),
        category,
        title,
        description,
        version: '1',
        access_level: accessLevel,
        status: 'active',
        drive_file_id: ctx.services.files.save('templat', `${title}-v1.${extensionFor(file.mimeType)}`, file.mimeType, file.base64),
        file_name: file.name,
        mime_type: file.mimeType,
        size_bytes: String(Math.floor((file.base64.length * 3) / 4)),
        created_at: now,
        updated_at: now,
        created_by: actor.profile.id,
      })
      ctx.audit('template.create', 'template', row.id, null, { title, access: accessLevel })
      return toTemplateView(row)
    },
  },

  'tpl.archive': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      if (!canManageTemplates(ctx)) throw forbidden('Anda tidak diberi kuasa mengurus templat.')
      const p = asPayload(raw)
      const t = mustGet(ctx.store, 'templates', str(p, 'id', { max: 64 }), 'Templat tidak ditemui.')
      const status = p.archived === true ? 'archived' : 'active'
      const row = ctx.store.update('templates', t.id, { status, updated_at: ctx.now.toISOString() })
      ctx.audit('template.status', 'template', t.id, { status: t.status }, { status })
      return toTemplateView(row)
    },
  },

  'tpl.download': {
    access: ANY,
    write: false,
    run: (raw, ctx) => {
      const t = mustGet(ctx.store, 'templates', str(asPayload(raw), 'id', { max: 64 }), 'Templat tidak ditemui.')
      if (t.status === 'archived' && !canManageTemplates(ctx)) throw notFound('Templat tidak ditemui.')
      const f = ctx.services.files.read(t.drive_file_id)
      if (!f) throw notFound('Fail tidak ditemui.')
      return { name: t.file_name || f.name, mimeType: f.mimeType, base64: f.base64 }
    },
  },
}

// ---------------------------------------------------------------------------
// e-Arkib (M07)
// ---------------------------------------------------------------------------

export function toArchiveView(store: TableStore, d: Row): ArchiveView {
  return {
    id: d.id,
    title: d.title,
    category: d.category,
    referenceNumber: d.reference_number,
    module: d.module,
    description: d.description,
    visibility: (VISIBILITY as readonly string[]).includes(d.visibility) ? (d.visibility as VisibilityLevel) : 'private',
    status: d.status === 'archived' ? 'archived' : 'active',
    fileName: d.file_name,
    mimeType: d.mime_type,
    version: Number(d.version) || 1,
    sessionName: store.get('jpp_sessions', d.session_id)?.name ?? '',
    createdAt: d.created_at,
    publishedAt: d.published_at,
    owner: nameOf(store, d.created_by),
  }
}

/** Members read internal and public documents; only SUAK/Secretariat see private ones (ARC-05). */
export function canRead(ctx: HandlerContext, d: Row): boolean {
  if (isStaff(ctx.actor)) return true
  return d.visibility === 'internal' || d.visibility === 'public'
}

function unpublish(ctx: HandlerContext, d: Row): Record<string, string> {
  if (d.public_file_id) ctx.services.files.trash(d.public_file_id)
  return { public_file_id: '', published_at: '', published_by: '' }
}

export const archiveHandlers: {
  'arc.list': Handler<'arc.list'>
  'arc.upload': Handler<'arc.upload'>
  'arc.download': Handler<'arc.download'>
  'arc.setVisibility': Handler<'arc.setVisibility'>
  'arc.setStatus': Handler<'arc.setStatus'>
} = {
  'arc.list': {
    access: ANY,
    write: false,
    run: (raw, ctx) => {
      const p = asPayload(raw)
      const q = (typeof p.q === 'string' ? p.q : '').trim().toLowerCase().slice(0, 100)
      const f = (k: string) => (typeof p[k] === 'string' ? (p[k] as string).slice(0, 80) : '')
      const from = f('from')
      const to = f('to')
      const rows = ctx.store
        .all('archive_documents')
        .filter((d) => canRead(ctx, d))
        .filter((d) => !q || `${d.title} ${d.reference_number} ${d.category} ${d.description}`.toLowerCase().includes(q))
        .filter((d) => !f('module') || d.module === f('module'))
        .filter((d) => !f('category') || d.category === f('category'))
        .filter((d) => !f('visibility') || d.visibility === f('visibility'))
        .filter((d) => !f('status') || (d.status || 'active') === f('status'))
        .filter((d) => !from || d.created_at.slice(0, 10) >= from)
        .filter((d) => !to || d.created_at.slice(0, 10) <= to)
      return newest(rows, 'created_at', 300).map((d) => toArchiveView(ctx.store, d))
    },
  },

  'arc.upload': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const session = findActiveSession(ctx.store)
      if (!session) throw badRequest('Tiada sesi JPP aktif.')
      const file = readFile(p, 'file', { required: true })!
      const now = ctx.now.toISOString()
      const row = ctx.store.insert('archive_documents', {
        id: ctx.uuid(),
        session_id: session.id,
        module: 'e-Arkib',
        title: str(p, 'title', { max: 200, label: 'Tajuk' }),
        category: str(p, 'category', { max: 80, label: 'Kategori' }),
        reference_number: str(p, 'referenceNumber', { max: 80, required: false }),
        description: str(p, 'description', { max: 500, required: false }),
        drive_file_id: ctx.services.files.save('arkib', file.name, file.mimeType, file.base64),
        file_name: file.name,
        mime_type: file.mimeType,
        visibility: oneOf(p, 'visibility', ['private', 'internal'] as const, 'Keterlihatan'),
        status: 'active',
        version: '1',
        source_type: 'upload',
        created_at: now,
        updated_at: now,
        created_by: actor.profile.id,
      })
      ctx.audit('archive.upload', 'archive', row.id, null, { title: row.title, visibility: row.visibility })
      return toArchiveView(ctx.store, row)
    },
  },

  'arc.download': {
    access: ANY,
    write: false,
    run: (raw, ctx) => {
      const d = mustGet(ctx.store, 'archive_documents', str(asPayload(raw), 'id', { max: 64 }), 'Dokumen tidak ditemui.')
      if (!canRead(ctx, d)) throw notFound('Dokumen tidak ditemui.')
      const f = ctx.services.files.read(d.drive_file_id)
      if (!f) throw notFound('Fail tidak ditemui.')
      return { name: d.file_name || f.name, mimeType: f.mimeType, base64: f.base64 }
    },
  },

  'arc.setVisibility': {
    access: SUAK_ONLY,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const d = mustGet(ctx.store, 'archive_documents', str(p, 'id', { max: 64 }), 'Dokumen tidak ditemui.')
      const visibility = oneOf(p, 'visibility', VISIBILITY, 'Keterlihatan')
      if (d.visibility === visibility) return toArchiveView(ctx.store, d)
      const now = ctx.now.toISOString()
      let values: Record<string, string> = { visibility, updated_at: now }
      if (visibility === 'public') {
        if ((d.status || 'active') === 'archived') throw conflict('Dokumen yang diarkibkan tidak boleh diterbitkan.')
        if (!d.drive_file_id) throw conflict('Tiada fail untuk diterbitkan.')
        // A separate copy: the public site can only ever reach this copy, never the original (Blueprint §08E).
        const copyId = ctx.services.files.copy(d.drive_file_id, 'awam', d.file_name || d.title)
        values = { ...values, public_file_id: copyId, published_at: now, published_by: actor.profile.id }
      } else if (d.visibility === 'public') {
        values = { ...values, ...unpublish(ctx, d) }
      }
      const row = ctx.store.update('archive_documents', d.id, values)
      ctx.audit(visibility === 'public' ? 'archive.publish' : 'archive.visibility', 'archive', d.id, { visibility: d.visibility }, { visibility })
      return toArchiveView(ctx.store, row)
    },
  },

  'arc.setStatus': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      const p = asPayload(raw)
      const d = mustGet(ctx.store, 'archive_documents', str(p, 'id', { max: 64 }), 'Dokumen tidak ditemui.')
      const status = oneOf(p, 'status', ['active', 'archived'] as const, 'Status')
      let values: Record<string, string> = { status, updated_at: ctx.now.toISOString() }
      // Archiving a public document also withdraws its public copy. Records are never hard-deleted (ARC-07).
      if (status === 'archived' && d.visibility === 'public') values = { ...values, visibility: 'internal', ...unpublish(ctx, d) }
      const row = ctx.store.update('archive_documents', d.id, values)
      ctx.audit('archive.status', 'archive', d.id, { status: d.status }, { status })
      return toArchiveView(ctx.store, row)
    },
  },
}
