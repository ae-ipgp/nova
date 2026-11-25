import type { CorrespondenceEntry, DocumentTypeView, RefRequestView, RegisterEntry } from '@shared/api-contract'
import { formatReference } from '@shared/reference-format'
import { parseFields, type FieldDef } from '@shared/template-render'
import { renderLetterHtml } from '../documents'
import { badRequest, conflict, forbidden, notFound } from '../errors'
import { getSetting } from '../settings'
import type { Row, TableStore } from '../store'
import { asPayload, isoDate, oneOf, str } from '../validate'
import { isStaff, mustGet, nameOf, newest, person, requireActor, requireReason } from './common'
import { findActiveSession } from './sessions'
import type { Handler } from './types'
import { readFile } from './uploads'


const REQUESTERS = { kind: 'roles', roles: ['member', 'secretariat', 'suak'] } as const
const STAFF = { kind: 'roles', roles: ['secretariat', 'suak'] } as const
const SUAK_ONLY = { kind: 'roles', roles: ['suak'] } as const

/** Malaysia time (UTC+8): the year a number is issued in follows the local calendar. */
export const mytYear = (now: Date): number => new Date(now.getTime() + 8 * 3600_000).getUTCFullYear()
const mytDateText = (now: Date): string =>
  new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' }).format(now)

export function toDocType(row: Row): DocumentTypeView {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    kind: row.kind === 'certificate' ? 'certificate' : 'letter',
    description: row.description,
    fields: parseFields(row.fields_json),
    bodyTemplate: row.body_template,
    isDemo: row.is_demo === 'true',
    active: row.active !== 'false',
  }
}

export function categoriesOf(store: TableStore): string[] {
  return getSetting(store, 'letter_categories')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 40)
}

function registerFor(store: TableStore, requestId: string): Row | undefined {
  return store.find('reference_register', (r) => r.request_id === requestId)
}

export function toRequestView(store: TableStore, r: Row): RefRequestView {
  const reg = registerFor(store, r.id)
  const type = r.document_type_id ? store.get('document_types', r.document_type_id) : undefined
  let fields: Record<string, string> = {}
  try {
    const parsed = JSON.parse(r.fields_json || '{}') as unknown
    if (parsed && typeof parsed === 'object') fields = Object.fromEntries(Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v)]))
  } catch {
    /* keep empty */
  }
  return {
    id: r.id,
    applicationId: `PRM-${r.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`,
    status: r.status as RefRequestView['status'],
    letterType: r.letter_type,
    subject: r.subject,
    recipient: r.recipient,
    purpose: r.purpose,
    letterDate: r.letter_date,
    documentTypeId: r.document_type_id,
    documentTypeName: type?.name ?? '',
    fields,
    applicant: person(store, r.applicant_id),
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
    reviewNote: r.review_note,
    referenceNumber: reg?.reference_number ?? '',
    voided: Boolean(reg?.voided_at),
    hasPdf: Boolean(r.pdf_file_id),
  }
}

function validateFields(defs: FieldDef[], input: unknown): Record<string, string> {
  const given = input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : {}
  const out: Record<string, string> = {}
  for (const d of defs) {
    const raw = given[d.key]
    const v = typeof raw === 'string' ? raw.trim() : ''
    if (!v) {
      if (d.required) throw badRequest(`${d.label} diperlukan.`)
      continue
    }
    if (v.length > (d.max ?? 300)) throw badRequest(`${d.label} terlalu panjang.`)
    if (d.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw badRequest(`${d.label} mesti dalam format TTTT-BB-HH.`)
    out[d.key] = v
  }
  return out
}

/** Applicant, or any SUAK/Secretariat, may see a request. */
function canSee(actorId: string, isStaffUser: boolean, r: Row): boolean {
  return isStaffUser || r.applicant_id === actorId
}

export const referenceHandlers: {
  'ref.options': Handler<'ref.options'>
  'ref.request.list': Handler<'ref.request.list'>
  'ref.request.get': Handler<'ref.request.get'>
  'ref.request.save': Handler<'ref.request.save'>
  'ref.request.cancel': Handler<'ref.request.cancel'>
  'ref.approve': Handler<'ref.approve'>
  'ref.reject': Handler<'ref.reject'>
  'ref.void': Handler<'ref.void'>
  'ref.pdf': Handler<'ref.pdf'>
  'ref.register': Handler<'ref.register'>
  'corr.list': Handler<'corr.list'>
  'corr.create': Handler<'corr.create'>
  'corr.file': Handler<'corr.file'>
} = {
  'ref.options': {
    access: REQUESTERS,
    write: false,
    run: (_p, { store }) => ({
      types: store.all('document_types').filter((t) => t.active !== 'false').map(toDocType),
      categories: categoriesOf(store),
    }),
  },

  'ref.request.list': {
    access: REQUESTERS,
    write: false,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const scope = oneOf(asPayload(raw), 'scope', ['mine', 'all'] as const, 'Skop')
      if (scope === 'all' && !isStaff(actor)) throw forbidden()
      const rows = ctx.store.all('reference_requests').filter((r) => scope === 'all' || r.applicant_id === actor.profile.id)
      return newest(rows).map((r) => toRequestView(ctx.store, r))
    },
  },

  'ref.request.get': {
    access: REQUESTERS,
    write: false,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const id = str(asPayload(raw), 'id', { max: 64 })
      const r = mustGet(ctx.store, 'reference_requests', id, 'Permohonan tidak ditemui.')
      if (!canSee(actor.profile.id, isStaff(actor), r)) throw notFound('Permohonan tidak ditemui.')
      const history = ctx.store
        .all('audit_logs')
        .filter((a) => a.entity_type === 'ref_request' && a.entity_id === id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((a) => ({ at: a.created_at, actor: nameOf(ctx.store, a.actor_id), action: a.action }))
      return { ...toRequestView(ctx.store, r), history }
    },
  },

  'ref.request.save': {
    access: REQUESTERS,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const session = findActiveSession(ctx.store)
      if (!session) throw badRequest('Tiada sesi JPP aktif. Hubungi SUAK.')
      const letterType = str(p, 'letterType', { max: 80, label: 'Jenis surat' })
      const subject = str(p, 'subject', { max: 200, label: 'Tajuk surat' })
      const recipient = str(p, 'recipient', { max: 300, label: 'Penerima' })
      const purpose = str(p, 'purpose', { max: 1000, label: 'Tujuan' })
      const letterDate = isoDate(p, 'letterDate', 'Tarikh surat')
      const typeId = str(p, 'documentTypeId', { max: 64, required: false })
      let fields: Record<string, string> = {}
      if (typeId) {
        const type = ctx.store.get('document_types', typeId)
        if (!type || type.active === 'false') throw badRequest('Jenis dokumen tidak sah.')
        fields = validateFields(parseFields(type.fields_json), p.fields)
      }
      const submit = p.submit === true
      const now = ctx.now.toISOString()
      const id = typeof p.id === 'string' && p.id ? p.id : ''

      const values = {
        session_id: session.id,
        letter_type: letterType,
        subject,
        recipient,
        purpose,
        letter_date: letterDate,
        document_type_id: typeId,
        fields_json: JSON.stringify(fields),
        status: submit ? 'submitted' : 'draft',
        updated_at: now,
      }
      if (id) {
        const existing = mustGet(ctx.store, 'reference_requests', id, 'Permohonan tidak ditemui.')
        if (existing.applicant_id !== actor.profile.id) throw notFound('Permohonan tidak ditemui.')
        if (existing.status !== 'draft') throw conflict('Hanya draf boleh disunting. Batalkan dan cipta permohonan baharu jika perlu.')
        const row = ctx.store.update('reference_requests', id, values)
        ctx.audit(submit ? 'ref.submit' : 'ref.save', 'ref_request', id, { status: 'draft' }, { status: values.status, subject })
        return toRequestView(ctx.store, row)
      }
      const row = ctx.store.insert('reference_requests', { id: ctx.uuid(), applicant_id: actor.profile.id, created_at: now, created_by: actor.profile.id, ...values })
      ctx.audit(submit ? 'ref.submit' : 'ref.create', 'ref_request', row.id, null, { status: values.status, subject })
      return toRequestView(ctx.store, row)
    },
  },

  'ref.request.cancel': {
    access: REQUESTERS,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const id = str(asPayload(raw), 'id', { max: 64 })
      const r = mustGet(ctx.store, 'reference_requests', id, 'Permohonan tidak ditemui.')
      if (r.applicant_id !== actor.profile.id) throw notFound('Permohonan tidak ditemui.')
      if (r.status !== 'draft' && r.status !== 'submitted') throw conflict('Permohonan ini tidak boleh dibatalkan. Hubungi SUAK untuk membatalkan nombor yang telah dikeluarkan.')
      const row = ctx.store.update('reference_requests', id, { status: 'cancelled', updated_at: ctx.now.toISOString() })
      ctx.audit('ref.cancel', 'ref_request', id, { status: r.status }, { status: 'cancelled' })
      return toRequestView(ctx.store, row)
    },
  },

  'ref.approve': {
    access: SUAK_ONLY,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const id = str(p, 'id', { max: 64 })
      const note = str(p, 'note', { max: 500, required: false, label: 'Catatan' })
      const req = mustGet(ctx.store, 'reference_requests', id, 'Permohonan tidak ditemui.')
      if (req.status !== 'submitted') throw conflict('Hanya permohonan berstatus Dihantar boleh diluluskan.')
      if (registerFor(ctx.store, id)) throw conflict('Nombor rasmi telah dikeluarkan untuk permohonan ini.')

      // 1. Choose the series and the next free number (read-only; we hold the lock).
      const year = mytYear(ctx.now)
      const series = ctx.store.find('reference_series', (s) => s.active === 'true' && Number(s.year) === year)
      if (!series) throw conflict(`Siri nombor rujukan bagi tahun ${year} belum ditetapkan. Tetapkan format di Pengurusan › Nombor rujukan.`)
      let seq = Math.max(1, Number(series.next_sequence) || 1)
      const taken = new Set(ctx.store.all('reference_register').map((r) => r.reference_number.toLowerCase()))
      let number = ''
      for (let i = 0; i < 1000; i++) {
        number = formatReference({ prefix: series.prefix, pattern: series.format_pattern, year, sequence: seq, padding: Number(series.padding) || 0 })
        if (!taken.has(number.toLowerCase())) break
        seq++
        number = ''
      }
      if (!number) throw conflict('Tiada nombor kosong ditemui. Semak format siri nombor.')

      // 2. Render the document BEFORE any write, so a rendering failure leaves nothing half-done.
      const now = ctx.now.toISOString()
      const type = req.document_type_id ? ctx.store.get('document_types', req.document_type_id) : undefined
      let pdfId = ''
      if (type?.body_template) {
        const fields = JSON.parse(req.fields_json || '{}') as Record<string, string>
        const applicant = ctx.store.get('profiles', req.applicant_id)
        const session = ctx.store.get('jpp_sessions', req.session_id)
        const html = renderLetterHtml({
          letterheadLines: [getSetting(ctx.store, 'letterhead_line1'), getSetting(ctx.store, 'letterhead_line2'), getSetting(ctx.store, 'letterhead_line3')],
          referenceNumber: number,
          dateText: mytDateText(ctx.now),
          recipient: req.recipient,
          subject: req.subject,
          bodyTemplate: type.body_template,
          values: {
            ...fields,
            rujukan: number,
            tarikh: mytDateText(ctx.now),
            pemohon: applicant?.full_name ?? '',
            sesi: session?.name ?? '',
            tujuan: req.purpose,
          },
          signatoryName: actor.profile.full_name,
          signatoryTitle: getSetting(ctx.store, 'signatory_title'),
          verifyLine: getSetting(ctx.store, 'verify_url')
            ? `Semak keaslian: ${getSetting(ctx.store, 'verify_url')} (rujukan ${number}).`
            : `Semak keaslian dengan rujukan ${number} di portal NO.VA.`,
          isDemo: type.is_demo === 'true',
          kind: type.kind === 'certificate' ? 'certificate' : 'letter',
        })
        const fileName = `${number.replace(/[^A-Za-z0-9._-]+/g, '-')}.pdf`
        pdfId = ctx.services.files.save('surat', fileName, 'application/pdf', ctx.services.pdf.htmlToPdf(html))
      }

      // 3. Writes. The register insert is guarded by UNIQUE(reference_number) and UNIQUE(request_id).
      const reg = ctx.store.insert('reference_register', {
        id: ctx.uuid(),
        request_id: id,
        series_id: series.id,
        reference_number: number,
        issued_at: now,
        issued_by: actor.profile.id,
      })
      ctx.store.update('reference_series', series.id, { next_sequence: String(seq + 1), updated_at: now })
      const updated = ctx.store.update('reference_requests', id, {
        status: 'approved',
        reviewed_by: actor.profile.id,
        reviewed_at: now,
        review_note: note,
        pdf_file_id: pdfId,
        updated_at: now,
      })
      ctx.store.insert('correspondence', {
        id: ctx.uuid(),
        session_id: req.session_id,
        direction: 'out',
        reference_id: reg.id,
        subject: req.subject,
        sender: getSetting(ctx.store, 'org_name'),
        recipient: req.recipient,
        letter_date: req.letter_date,
        drive_file_id: pdfId,
        file_name: pdfId ? `${number}.pdf` : '',
        mime_type: pdfId ? 'application/pdf' : '',
        created_at: now,
        updated_at: now,
        created_by: actor.profile.id,
      })
      if (pdfId) {
        ctx.store.insert('archive_documents', {
          id: ctx.uuid(),
          session_id: req.session_id,
          module: 'e-Surat',
          title: req.subject,
          category: type?.kind === 'certificate' ? 'Sijil' : 'Surat',
          reference_number: number,
          drive_file_id: pdfId,
          visibility: 'private',
          status: 'active',
          version: '1',
          file_name: `${number}.pdf`,
          mime_type: 'application/pdf',
          source_type: 'reference_request',
          source_id: id,
          created_at: now,
          updated_at: now,
          created_by: actor.profile.id,
        })
      }
      ctx.audit('ref.approve', 'ref_request', id, { status: 'submitted' }, { status: 'approved', referenceNumber: number })
      return toRequestView(ctx.store, updated)
    },
  },

  'ref.reject': {
    access: SUAK_ONLY,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const id = str(p, 'id', { max: 64 })
      const reason = requireReason(str(p, 'reason', { max: 500, label: 'Sebab' }))
      const req = mustGet(ctx.store, 'reference_requests', id, 'Permohonan tidak ditemui.')
      if (req.status !== 'submitted') throw conflict('Hanya permohonan berstatus Dihantar boleh ditolak.')
      const row = ctx.store.update('reference_requests', id, {
        status: 'rejected',
        reviewed_by: actor.profile.id,
        reviewed_at: ctx.now.toISOString(),
        review_note: reason,
        updated_at: ctx.now.toISOString(),
      })
      ctx.audit('ref.reject', 'ref_request', id, { status: 'submitted' }, { status: 'rejected', reason })
      return toRequestView(ctx.store, row)
    },
  },

  'ref.void': {
    access: SUAK_ONLY,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const id = str(p, 'id', { max: 64 })
      const reason = requireReason(str(p, 'reason', { max: 500, label: 'Sebab' }))
      const req = mustGet(ctx.store, 'reference_requests', id, 'Permohonan tidak ditemui.')
      const reg = registerFor(ctx.store, id)
      if (!reg) throw conflict('Tiada nombor rasmi untuk dibatalkan.')
      if (reg.voided_at) throw conflict('Nombor ini telah dibatalkan.')
      // The number stays in the register forever; it is marked void, never deleted or reused (LTR-06/07).
      ctx.store.update('reference_register', reg.id, { voided_at: ctx.now.toISOString(), voided_by: actor.profile.id, void_reason: reason })
      ctx.audit('ref.void', 'ref_request', id, { referenceNumber: reg.reference_number }, { voided: true, reason })
      return toRequestView(ctx.store, req)
    },
  },

  'ref.pdf': {
    access: REQUESTERS,
    write: false,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const id = str(asPayload(raw), 'id', { max: 64 })
      const r = mustGet(ctx.store, 'reference_requests', id, 'Permohonan tidak ditemui.')
      if (!canSee(actor.profile.id, isStaff(actor), r)) throw notFound('Permohonan tidak ditemui.')
      if (!r.pdf_file_id) throw notFound('Tiada PDF untuk permohonan ini.')
      const file = ctx.services.files.read(r.pdf_file_id)
      if (!file) throw notFound('Fail tidak ditemui.')
      return { name: file.name, mimeType: file.mimeType, base64: file.base64 }
    },
  },

  'ref.register': {
    access: STAFF,
    write: false,
    run: (_p, { store }): RegisterEntry[] =>
      newest(store.all('reference_register'), 'issued_at').map((g) => {
        const req = store.get('reference_requests', g.request_id)
        return {
          id: g.id,
          referenceNumber: g.reference_number,
          requestId: g.request_id,
          subject: req?.subject ?? '',
          recipient: req?.recipient ?? '',
          letterType: req?.letter_type ?? '',
          issuedAt: g.issued_at,
          issuedBy: nameOf(store, g.issued_by),
          voidedAt: g.voided_at,
          voidReason: g.void_reason,
        }
      }),
  },

  'corr.list': {
    access: STAFF,
    write: false,
    run: (raw, { store }): CorrespondenceEntry[] => {
      const p = asPayload(raw)
      const dir = p.direction === 'in' || p.direction === 'out' ? p.direction : null
      return newest(store.all('correspondence').filter((c) => !dir || c.direction === dir)).map((c) => toCorr(store, c))
    },
  },

  'corr.create': {
    access: STAFF,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const direction = oneOf(p, 'direction', ['in', 'out'] as const, 'Arah')
      const session = findActiveSession(ctx.store)
      if (!session) throw badRequest('Tiada sesi JPP aktif.')
      const file = readFile(p, 'file')
      const now = ctx.now.toISOString()
      const fileId = file ? ctx.services.files.save('surat', file.name, file.mimeType, file.base64) : ''
      const row = ctx.store.insert('correspondence', {
        id: ctx.uuid(),
        session_id: session.id,
        direction,
        reference_id: '',
        subject: str(p, 'subject', { max: 200, label: 'Tajuk' }),
        sender: str(p, 'sender', { max: 200, label: 'Pengirim' }),
        recipient: str(p, 'recipient', { max: 200, label: 'Penerima' }),
        letter_date: isoDate(p, 'letterDate', 'Tarikh surat'),
        drive_file_id: fileId,
        file_name: file?.name ?? '',
        mime_type: file?.mimeType ?? '',
        note: [str(p, 'referenceNumber', { max: 80, required: false }), str(p, 'note', { max: 500, required: false })].filter(Boolean).join(' · '),
        created_at: now,
        updated_at: now,
        created_by: actor.profile.id,
      })
      ctx.audit('corr.create', 'correspondence', row.id, null, { direction, subject: row.subject })
      return toCorr(ctx.store, row)
    },
  },

  'corr.file': {
    access: STAFF,
    write: false,
    run: (raw, ctx) => {
      const id = str(asPayload(raw), 'id', { max: 64 })
      const c = mustGet(ctx.store, 'correspondence', id)
      if (!c.drive_file_id) throw notFound('Tiada fail.')
      const f = ctx.services.files.read(c.drive_file_id)
      if (!f) throw notFound('Fail tidak ditemui.')
      return { name: c.file_name || f.name, mimeType: f.mimeType, base64: f.base64 }
    },
  },
}

function toCorr(store: TableStore, c: Row): CorrespondenceEntry {
  const reg = c.reference_id ? store.get('reference_register', c.reference_id) : undefined
  return {
    id: c.id,
    direction: c.direction === 'in' ? 'in' : 'out',
    referenceNumber: reg?.reference_number ?? '',
    subject: c.subject,
    sender: c.sender,
    recipient: c.recipient,
    letterDate: c.letter_date,
    note: c.note,
    file: c.drive_file_id ? { id: c.id, name: c.file_name, mimeType: c.mime_type } : null,
    createdAt: c.created_at,
  }
}

