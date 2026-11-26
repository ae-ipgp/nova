import type { OprContent, OprView } from '@shared/api-contract'
import { OPR_STYLES, type OprStyle } from '@shared/domain'
import { EMPTY_OPR, narrativeLength, narrativeLimit, OPR_TEXT_LIMITS, renderOprHtml } from '@shared/opr-html'
import { badRequest, conflict, forbidden, notFound } from '../errors'
import { hasArea, type HandlerContext } from '../context'
import { envOf, notify, oprReviewers } from '../notify'
import { getSetting } from '../settings'
import type { Row } from '../store'
import { asPayload, isoDate, oneOf, str } from '../validate'
import { isStaff, mustGet, newest, person, requireActor } from './common'
import { findActiveSession } from './sessions'
import type { Handler } from './types'
import { readFile } from './uploads'

const ANY = { kind: 'roles', roles: ['member', 'secretariat', 'suak'] } as const
export const MAX_OPR_IMAGES = 4
const MAX_UPLOADED = 12

function parseContent(json: string): OprContent {
  try {
    return sanitize(JSON.parse(json) as unknown, false)
  } catch {
    return { ...EMPTY_OPR }
  }
}

/** Strict, bounded content. `strict` = also validate dates (used on write, not when reading old rows). */
export function sanitize(raw: unknown, strict: boolean, allowedImages?: string[]): OprContent {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const out = { ...EMPTY_OPR }
  for (const key of Object.keys(OPR_TEXT_LIMITS) as (keyof typeof OPR_TEXT_LIMITS)[]) {
    const v = typeof o[key] === 'string' ? (o[key] as string).trim() : ''
    if (v.length > OPR_TEXT_LIMITS[key]) {
      if (strict) throw badRequest(`Medan "${key}" melebihi ${OPR_TEXT_LIMITS[key]} aksara.`)
      out[key] = v.slice(0, OPR_TEXT_LIMITS[key])
    } else out[key] = v
  }
  if (strict && out.date) isoDate({ date: out.date }, 'date', 'Tarikh program')
  const images = Array.isArray(o.images) ? o.images : []
  if (strict && images.length > MAX_OPR_IMAGES) throw badRequest(`Maksimum ${MAX_OPR_IMAGES} gambar.`)
  out.images = images.slice(0, MAX_OPR_IMAGES).flatMap((i) => {
    const x = (i ?? {}) as Record<string, unknown>
    const fileId = typeof x.fileId === 'string' ? x.fileId : ''
    if (!fileId) return []
    if (allowedImages && !allowedImages.includes(fileId)) {
      if (strict) throw badRequest('Gambar tidak sah.')
      return []
    }
    return [{ fileId, caption: typeof x.caption === 'string' ? x.caption.trim().slice(0, 120) : '', credit: typeof x.credit === 'string' ? x.credit.trim().slice(0, 80) : '' }]
  })
  const limit = narrativeLimit(out.images.length)
  if (strict && narrativeLength(out) > limit) throw badRequest(`Kandungan terlalu panjang untuk satu halaman (${narrativeLength(out)}/${limit} aksara${out.images.length ? ' dengan gambar' : ''}).`)
  return out
}

const REQUIRED: [keyof OprContent, string][] = [
  ['programName', 'Nama program'],
  ['date', 'Tarikh'],
  ['venue', 'Tempat'],
  ['objectives', 'Objektif'],
  ['execution', 'Pelaksanaan'],
  ['outcome', 'Hasil'],
  ['preparedBy', 'Disediakan oleh'],
]

const imageIds = (r: Row): string[] => {
  try {
    const v = JSON.parse(r.image_ids || '[]') as unknown
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function toView(ctx: HandlerContext, r: Row): OprView {
  const actor = requireActor(ctx)
  const owner = r.created_by === actor.profile.id
  const status = (['draft', 'submitted', 'revision_requested', 'approved'].includes(r.status) ? r.status : 'draft') as OprView['status']
  return {
    id: r.id,
    title: r.title,
    programDate: r.program_date,
    status,
    style: (OPR_STYLES as readonly string[]).includes(r.style) ? (r.style as OprStyle) : 'corporate',
    version: Number(r.version) || 1,
    content: parseContent(r.content_json),
    owner: person(ctx.store, r.created_by),
    reviewNote: r.review_note,
    updatedAt: r.updated_at,
    hasFinal: Boolean(r.final_file_id),
    canEdit: owner && (status === 'draft' || status === 'revision_requested'),
    canReview: hasArea(actor, 'opr.approve') && status === 'submitted',
  }
}

function getVisible(ctx: HandlerContext, id: string): Row {
  const actor = requireActor(ctx)
  const r = mustGet(ctx.store, 'opr_reports', id, 'OPR tidak ditemui.')
  if (r.created_by !== actor.profile.id && !isStaff(actor)) throw notFound('OPR tidak ditemui.')
  return r
}

function loadImages(ctx: HandlerContext, content: OprContent): Record<string, string> {
  const out: Record<string, string> = {}
  for (const i of content.images) {
    const f = ctx.services.files.read(i.fileId)
    if (f) out[i.fileId] = `data:${f.mimeType};base64,${f.base64}`
  }
  return out
}

function renderPdf(ctx: HandlerContext, r: Row, watermark: string): string {
  const content = parseContent(r.content_json)
  const html = renderOprHtml(content, {
    style: (OPR_STYLES as readonly string[]).includes(r.style) ? (r.style as OprStyle) : 'corporate',
    images: loadImages(ctx, content),
    orgName: getSetting(ctx.store, 'org_name'),
    watermark,
    footer: watermark ? 'Draf — belum disahkan' : `Disahkan melalui NO.VA · Versi ${r.version}`,
  })
  return ctx.services.pdf.htmlToPdf(html)
}

export const oprHandlers: {
  'opr.list': Handler<'opr.list'>
  'opr.get': Handler<'opr.get'>
  'opr.save': Handler<'opr.save'>
  'opr.image.add': Handler<'opr.image.add'>
  'opr.image.get': Handler<'opr.image.get'>
  'opr.submit': Handler<'opr.submit'>
  'opr.review': Handler<'opr.review'>
  'opr.pdf': Handler<'opr.pdf'>
} = {
  'opr.list': {
    access: ANY,
    write: false,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const scope = oneOf(asPayload(raw), 'scope', ['mine', 'all'] as const, 'Skop')
      if (scope === 'all' && !isStaff(actor)) throw forbidden()
      return newest(ctx.store.all('opr_reports').filter((r) => scope === 'all' || r.created_by === actor.profile.id), 'updated_at').map((r) => toView(ctx, r))
    },
  },

  'opr.get': { access: ANY, write: false, run: (raw, ctx) => toView(ctx, getVisible(ctx, str(asPayload(raw), 'id', { max: 64 }))) },

  'opr.save': {
    access: ANY,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const session = findActiveSession(ctx.store)
      if (!session) throw badRequest('Tiada sesi JPP aktif.')
      const style = oneOf(p, 'style', OPR_STYLES, 'Gaya')
      const id = typeof p.id === 'string' && p.id ? p.id : ''
      const existing = id ? mustGet(ctx.store, 'opr_reports', id, 'OPR tidak ditemui.') : undefined
      if (existing && (existing.created_by !== actor.profile.id || !['draft', 'revision_requested'].includes(existing.status))) throw conflict('OPR ini tidak boleh disunting.')
      const content = sanitize(p.content, true, existing ? imageIds(existing) : [])
      const now = ctx.now.toISOString()
      const values = { title: content.programName || 'OPR tanpa tajuk', program_date: content.date, content_json: JSON.stringify(content), style, updated_at: now }
      if (existing) {
        const row = ctx.store.update('opr_reports', existing.id, values)
        return toView(ctx, row)
      }
      const row = ctx.store.insert('opr_reports', { id: ctx.uuid(), session_id: session.id, status: 'draft', version: '1', image_ids: '[]', created_at: now, created_by: actor.profile.id, ...values })
      ctx.audit('opr.create', 'opr', row.id, null, { title: values.title })
      return toView(ctx, row)
    },
  },

  'opr.image.add': {
    access: ANY,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const r = mustGet(ctx.store, 'opr_reports', str(p, 'oprId', { max: 64 }), 'OPR tidak ditemui.')
      if (r.created_by !== actor.profile.id || !['draft', 'revision_requested'].includes(r.status)) throw conflict('OPR ini tidak boleh disunting.')
      const ids = imageIds(r)
      if (ids.length >= MAX_UPLOADED) throw badRequest('Had muat naik gambar bagi OPR ini telah dicapai.')
      const file = readFile(p, 'file', { images: true, required: true })!
      const fileId = ctx.services.files.save('opr', `${r.id}-${ids.length + 1}-${file.name}`, file.mimeType, file.base64)
      ctx.store.update('opr_reports', r.id, { image_ids: JSON.stringify([...ids, fileId]), updated_at: ctx.now.toISOString() })
      return { fileId }
    },
  },

  'opr.image.get': {
    access: ANY,
    write: false,
    run: (raw, ctx) => {
      const p = asPayload(raw)
      const r = getVisible(ctx, str(p, 'oprId', { max: 64 }))
      const fileId = str(p, 'fileId', { max: 200 })
      if (!imageIds(r).includes(fileId)) throw notFound('Gambar tidak ditemui.')
      const f = ctx.services.files.read(fileId)
      if (!f) throw notFound('Gambar tidak ditemui.')
      return { name: f.name, mimeType: f.mimeType, base64: f.base64 }
    },
  },

  'opr.submit': {
    access: ANY,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const r = mustGet(ctx.store, 'opr_reports', str(asPayload(raw), 'id', { max: 64 }), 'OPR tidak ditemui.')
      if (r.created_by !== actor.profile.id) throw notFound('OPR tidak ditemui.')
      if (!['draft', 'revision_requested'].includes(r.status)) throw conflict('OPR ini telah dihantar.')
      const content = parseContent(r.content_json)
      for (const [k, label] of REQUIRED) if (!String(content[k]).trim()) throw badRequest(`${label} diperlukan sebelum dihantar.`)
      const now = ctx.now.toISOString()
      const version = r.status === 'revision_requested' ? (Number(r.version) || 1) + 1 : Number(r.version) || 1
      const row = ctx.store.update('opr_reports', r.id, { status: 'submitted', version: String(version), submitted_at: now, review_note: '', updated_at: now })
      ctx.store.insert('opr_versions', { id: ctx.uuid(), opr_id: r.id, version: String(version), content_json: r.content_json, saved_by: actor.profile.id, saved_at: now })
      ctx.audit('opr.submit', 'opr', r.id, { status: r.status }, { status: 'submitted', version })
      for (const reviewer of oprReviewers(ctx.store)) {
        if (reviewer.id === actor.profile.id) continue
        notify(envOf(ctx), 'opr_submitted', reviewer, { subject: `OPR untuk disahkan: ${r.title}`, body: `${actor.profile.full_name} menghantar OPR "${r.title}" (versi ${version}) untuk pengesahan.`, path: `/workspace/e-opr/${r.id}`, ctaText: 'Semak OPR' })
      }
      return toView(ctx, row)
    },
  },

  'opr.review': {
    access: ANY,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      if (!hasArea(actor, 'opr.approve')) throw forbidden('Anda tidak diberi kuasa mengesahkan OPR.')
      const p = asPayload(raw)
      const r = mustGet(ctx.store, 'opr_reports', str(p, 'id', { max: 64 }), 'OPR tidak ditemui.')
      if (r.status !== 'submitted') throw conflict('Hanya OPR yang dihantar boleh disemak.')
      const decision = oneOf(p, 'decision', ['approve', 'revise'] as const, 'Keputusan')
      const note = str(p, 'note', { max: 500, required: decision === 'revise', label: 'Catatan' })
      if (decision === 'revise' && note.length < 5) throw badRequest('Catatan pembetulan diperlukan (sekurang-kurangnya 5 aksara).')
      const now = ctx.now.toISOString()
      if (decision === 'revise') {
        const row = ctx.store.update('opr_reports', r.id, { status: 'revision_requested', review_note: note, reviewed_by: actor.profile.id, updated_at: now })
        ctx.audit('opr.revise', 'opr', r.id, { status: 'submitted' }, { status: 'revision_requested', note })
        notify(envOf(ctx), 'opr_decision', ctx.store.get('profiles', r.created_by), { subject: `OPR perlu pembetulan: ${r.title}`, body: `Penyemak meminta pembetulan bagi OPR anda.\n\nCatatan: ${note}`, path: `/workspace/e-opr/${r.id}` })
        return toView(ctx, row)
      }
      // Approve: render the final PDF first, then file it with metadata in e-Arkib (OPR-08).
      const base64 = renderPdf(ctx, r, '')
      const fileName = `OPR-${(r.title || 'laporan').replace(/[^A-Za-z0-9]+/g, '-').slice(0, 40)}-v${r.version}.pdf`
      const fileId = ctx.services.files.save('opr', fileName, 'application/pdf', base64)
      const archive = ctx.store.insert('archive_documents', {
        id: ctx.uuid(),
        session_id: r.session_id,
        module: 'e-OPR',
        title: r.title,
        category: 'Laporan',
        drive_file_id: fileId,
        visibility: 'internal',
        status: 'active',
        version: r.version,
        file_name: fileName,
        mime_type: 'application/pdf',
        source_type: 'opr',
        source_id: r.id,
        description: `OPR program ${r.program_date}`,
        created_at: now,
        updated_at: now,
        created_by: actor.profile.id,
      })
      const row = ctx.store.update('opr_reports', r.id, { status: 'approved', final_file_id: fileId, approved_by: actor.profile.id, approved_at: now, archive_id: archive.id, reviewed_by: actor.profile.id, review_note: note, updated_at: now })
      ctx.audit('opr.approve', 'opr', r.id, { status: 'submitted' }, { status: 'approved', archive: archive.id })
      notify(envOf(ctx), 'opr_decision', ctx.store.get('profiles', r.created_by), { subject: `OPR disahkan: ${r.title}`, body: 'OPR anda telah disahkan dan disimpan dalam e-Arkib.', path: `/workspace/e-opr/${r.id}` })
      return toView(ctx, row)
    },
  },

  'opr.pdf': {
    access: ANY,
    write: false,
    run: (raw, ctx) => {
      const r = getVisible(ctx, str(asPayload(raw), 'id', { max: 64 }))
      if (r.status === 'approved' && r.final_file_id) {
        const f = ctx.services.files.read(r.final_file_id)
        if (!f) throw notFound('Fail tidak ditemui.')
        return { name: f.name, mimeType: f.mimeType, base64: f.base64 }
      }
      return { name: `DRAF-${r.id}.pdf`, mimeType: 'application/pdf', base64: renderPdf(ctx, r, 'DRAF — BELUM DISAHKAN') }
    },
  },
}

