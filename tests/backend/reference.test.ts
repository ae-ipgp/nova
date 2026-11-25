import { describe, expect, it } from 'vitest'
import { Gateway, SUAK } from './harness'
import { file, PDF_B64 } from './fakes'

const SERIES = { prefix: 'TEST', pattern: '{PREFIX}/{SEQ}/{YEAR}', year: 2026, nextSequence: 1, padding: 3, active: true }
const REQ = { letterType: 'Surat keluar', subject: 'Permohonan A', recipient: 'Pengarah', purpose: 'Ujian', letterDate: '2026-11-16', submit: true }

function setup() {
  const gw = Gateway.withSuak()
  gw.ok('admin.series.save', SERIES, SUAK.id)
  const member = gw.member('ahli', ['member'])
  const other = gw.member('lain', ['member'])
  return { gw, member, other }
}

describe('e-Surat reference numbers', () => {
  it('uses a temporary application ID and issues NO number on submission (LTR-03)', () => {
    const { gw, member } = setup()
    const r = gw.ok('ref.request.save', REQ, member)
    expect(r.status).toBe('submitted')
    expect(r.applicationId).toMatch(/^PRM-/)
    expect(r.referenceNumber).toBe('')
    expect(gw.rows('reference_register')).toHaveLength(0)
  })

  it('only SUAK can approve (AT-02)', () => {
    const { gw, member } = setup()
    const sec = gw.member('sek', ['secretariat'])
    const r = gw.ok('ref.request.save', REQ, member)
    expect(gw.errorCode('ref.approve', { id: r.id }, member)).toBe('FORBIDDEN')
    expect(gw.errorCode('ref.approve', { id: r.id }, sec)).toBe('FORBIDDEN')
    expect(gw.rows('reference_register')).toHaveLength(0)
  })

  it('issues one unique, configured number on approval and advances the sequence (AT-03)', () => {
    const { gw, member } = setup()
    const a = gw.ok('ref.request.save', REQ, member)
    const b = gw.ok('ref.request.save', { ...REQ, subject: 'Permohonan B' }, member)
    expect(gw.ok('ref.approve', { id: a.id }, SUAK.id).referenceNumber).toBe('TEST/001/2026')
    expect(gw.ok('ref.approve', { id: b.id }, SUAK.id).referenceNumber).toBe('TEST/002/2026')
    expect(gw.rows('reference_series')[0].next_sequence).toBe('3')
    expect(gw.rows('audit_logs').filter((x) => x.action === 'ref.approve')).toHaveLength(2)
  })

  it('refuses a second approval of the same request (no duplicate number, AT-04)', () => {
    const { gw, member } = setup()
    const r = gw.ok('ref.request.save', REQ, member)
    gw.ok('ref.approve', { id: r.id }, SUAK.id)
    expect(gw.errorCode('ref.approve', { id: r.id }, SUAK.id)).toBe('CONFLICT')
    expect(gw.rows('reference_register')).toHaveLength(1)
  })

  it('skips a number already in the register instead of duplicating it', () => {
    const { gw, member } = setup()
    const a = gw.ok('ref.request.save', REQ, member)
    gw.ok('ref.approve', { id: a.id }, SUAK.id)
    // Simulate a crash that left the series counter behind the register.
    gw.io.data.set('reference_series', gw.io.data.get('reference_series')!.map((row, i) => (i === 0 ? row : row.map((c, ci) => (ci === gw.io.data.get('reference_series')![0].indexOf('next_sequence') ? '1' : c)))))
    const b = gw.ok('ref.request.save', REQ, member)
    expect(gw.ok('ref.approve', { id: b.id }, SUAK.id).referenceNumber).toBe('TEST/002/2026')
  })

  it('does not issue numbers until SUAK configures a series (no invented format)', () => {
    const gw = Gateway.withSuak()
    const member = gw.member('ahli', ['member'])
    const r = gw.ok('ref.request.save', REQ, member)
    const res = gw.call('ref.approve', { id: r.id }, SUAK.id)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.message).toMatch(/belum ditetapkan/)
    expect(gw.ok('ref.request.get', { id: r.id }, member).status).toBe('submitted')
  })

  it('needs a series for the current year', () => {
    const gw = Gateway.withSuak()
    gw.ok('admin.series.save', { ...SERIES, year: 2025 }, SUAK.id)
    const member = gw.member('ahli', ['member'])
    const r = gw.ok('ref.request.save', REQ, member)
    expect(gw.errorCode('ref.approve', { id: r.id }, SUAK.id)).toBe('CONFLICT')
  })

  it('takes the year from Malaysia time at the year boundary', () => {
    const { gw, member } = setup()
    gw.ok('admin.series.save', { ...SERIES, year: 2027, prefix: 'NY' }, SUAK.id)
    gw.clock = new Date('2026-12-31T17:00:00.000Z') // 01:00 on 1 Jan 2027 in Malaysia
    const r = gw.ok('ref.request.save', REQ, member)
    expect(gw.ok('ref.approve', { id: r.id }, SUAK.id).referenceNumber).toBe('NY/001/2027')
  })

  it('rejection needs a written reason and issues nothing (AT-05)', () => {
    const { gw, member } = setup()
    const r = gw.ok('ref.request.save', REQ, member)
    expect(gw.errorCode('ref.reject', { id: r.id, reason: 'tak' }, SUAK.id)).toBe('BAD_REQUEST')
    const rej = gw.ok('ref.reject', { id: r.id, reason: 'Butiran tidak lengkap' }, SUAK.id)
    expect(rej).toMatchObject({ status: 'rejected', reviewNote: 'Butiran tidak lengkap', referenceNumber: '' })
    expect(gw.rows('reference_register')).toHaveLength(0)
    expect(gw.errorCode('ref.approve', { id: r.id }, SUAK.id)).toBe('CONFLICT')
  })

  it('voids a number without deleting or reusing it (LTR-06/07)', () => {
    const { gw, member } = setup()
    const r = gw.ok('ref.request.save', REQ, member)
    gw.ok('ref.approve', { id: r.id }, SUAK.id)
    expect(gw.errorCode('ref.void', { id: r.id, reason: 'x' }, SUAK.id)).toBe('BAD_REQUEST')
    const v = gw.ok('ref.void', { id: r.id, reason: 'Salah penerima' }, SUAK.id)
    expect(v).toMatchObject({ voided: true, referenceNumber: 'TEST/001/2026' })
    expect(gw.rows('reference_register')).toHaveLength(1)
    expect(gw.rows('reference_register')[0]).toMatchObject({ void_reason: 'Salah penerima', reference_number: 'TEST/001/2026' })
    expect(gw.errorCode('ref.void', { id: r.id, reason: 'sekali lagi' }, SUAK.id)).toBe('CONFLICT')
    const next = gw.ok('ref.request.save', REQ, member)
    expect(gw.ok('ref.approve', { id: next.id }, SUAK.id).referenceNumber).toBe('TEST/002/2026')
  })

  it('applicants see only their own requests; staff see all', () => {
    const { gw, member, other } = setup()
    const sec = gw.member('sek', ['secretariat'])
    const r = gw.ok('ref.request.save', REQ, member)
    expect(gw.ok('ref.request.list', { scope: 'mine' }, other)).toHaveLength(0)
    expect(gw.errorCode('ref.request.list', { scope: 'all' }, member)).toBe('FORBIDDEN')
    expect(gw.errorCode('ref.request.get', { id: r.id }, other)).toBe('NOT_FOUND')
    expect(gw.ok('ref.request.list', { scope: 'all' }, sec)).toHaveLength(1)
  })

  it('drafts are editable only by the owner, submitted requests are locked, owner can cancel', () => {
    const { gw, member, other } = setup()
    const d = gw.ok('ref.request.save', { ...REQ, submit: false }, member)
    expect(d.status).toBe('draft')
    expect(gw.errorCode('ref.request.save', { ...REQ, id: d.id, submit: false }, other)).toBe('NOT_FOUND')
    const s = gw.ok('ref.request.save', { ...REQ, id: d.id, subject: 'Baru', submit: true }, member)
    expect(s).toMatchObject({ status: 'submitted', subject: 'Baru' })
    expect(gw.errorCode('ref.request.save', { ...REQ, id: d.id, submit: false }, member)).toBe('CONFLICT')
    expect(gw.ok('ref.request.cancel', { id: d.id }, member).status).toBe('cancelled')
    expect(gw.errorCode('ref.approve', { id: d.id }, SUAK.id)).toBe('CONFLICT')
  })

  it('the System Administrator cannot request or approve', () => {
    const { gw } = setup()
    const sys = gw.member('sys', ['system_admin'])
    expect(gw.errorCode('ref.request.save', REQ, sys)).toBe('FORBIDDEN')
    expect(gw.errorCode('ref.approve', { id: 'x' }, sys)).toBe('FORBIDDEN')
  })

  it('validates the request fields', () => {
    const { gw, member } = setup()
    expect(gw.errorCode('ref.request.save', { ...REQ, subject: '' }, member)).toBe('BAD_REQUEST')
    expect(gw.errorCode('ref.request.save', { ...REQ, letterDate: '2026-02-30' }, member)).toBe('BAD_REQUEST')
    expect(gw.errorCode('ref.request.save', { ...REQ, documentTypeId: 'nope' }, member)).toBe('BAD_REQUEST')
  })

  it('records history for the request detail', () => {
    const { gw, member } = setup()
    const r = gw.ok('ref.request.save', REQ, member)
    gw.ok('ref.approve', { id: r.id }, SUAK.id)
    const d = gw.ok('ref.request.get', { id: r.id }, member)
    expect(d.history.map((h) => h.action)).toEqual(['ref.submit', 'ref.approve'])
  })
})

describe('letters and certificates with PDF', () => {
  const typeId = (gw: Gateway, code = 'JEMPUTAN-DEMO') => gw.rows('document_types').find((t) => t.code === code)!.id
  function withDemo() {
    const s = setup()
    const demo = s.gw
    // bootstrap() already ran in withSuak(); demo types exist
    return { ...s, demo }
  }

  it('generates a stored PDF on approval, archives it and registers the outgoing letter', () => {
    const { gw, member } = withDemo()
    const r = gw.ok('ref.request.save', { ...REQ, documentTypeId: typeId(gw), fields: { program: 'Program Ujian', tarikh_program: '2026-12-01', tempat: 'Dewan' } }, member)
    const a = gw.ok('ref.approve', { id: r.id }, SUAK.id)
    expect(a).toMatchObject({ hasPdf: true, referenceNumber: 'TEST/001/2026' })
    expect(gw.services.rendered).toHaveLength(1)
    const html = gw.services.rendered[0]
    expect(html).toContain('TEST/001/2026')
    expect(html).toContain('Program Ujian')
    expect(html).toContain('CONTOH (DEMO)') // unapproved template is visibly marked
    expect(gw.rows('archive_documents')[0]).toMatchObject({ module: 'e-Surat', reference_number: 'TEST/001/2026', visibility: 'private' })
    expect(gw.rows('correspondence')[0]).toMatchObject({ direction: 'out', subject: 'Permohonan A' })
    const pdf = gw.ok('ref.pdf', { id: r.id }, member)
    expect(pdf.mimeType).toBe('application/pdf')
  })

  it('escapes user input so it cannot inject markup into the PDF', () => {
    const { gw, member } = withDemo()
    const r = gw.ok('ref.request.save', { ...REQ, recipient: '<script>alert(1)</script>', documentTypeId: typeId(gw), fields: { program: '<img src=x onerror=1>', tarikh_program: '2026-12-01', tempat: 'x' } }, member)
    gw.ok('ref.approve', { id: r.id }, SUAK.id)
    const html = gw.services.rendered[0]
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;script&gt;')
  })

  it('requires the fields the type defines', () => {
    const { gw, member } = withDemo()
    expect(gw.errorCode('ref.request.save', { ...REQ, documentTypeId: typeId(gw), fields: { program: 'x' } }, member)).toBe('BAD_REQUEST')
    expect(gw.errorCode('ref.request.save', { ...REQ, documentTypeId: typeId(gw), fields: { program: 'x', tarikh_program: 'bukan tarikh', tempat: 'y' } }, member)).toBe('BAD_REQUEST')
  })

  it('leaves nothing half-done if the PDF renderer fails', () => {
    const { gw, member } = withDemo()
    const r = gw.ok('ref.request.save', { ...REQ, documentTypeId: typeId(gw), fields: { program: 'x', tarikh_program: '2026-12-01', tempat: 'y' } }, member)
    gw.services.pdfShouldFail = true
    const original = console.error
    console.error = () => {}
    expect(gw.errorCode('ref.approve', { id: r.id }, SUAK.id)).toBe('INTERNAL')
    console.error = original
    expect(gw.rows('reference_register')).toHaveLength(0)
    expect(gw.rows('reference_series')[0].next_sequence).toBe('1')
    expect(gw.ok('ref.request.get', { id: r.id }, member).status).toBe('submitted')
  })

  it('stops other users reading someone else’s PDF', () => {
    const { gw, member, other } = withDemo()
    const r = gw.ok('ref.request.save', { ...REQ, documentTypeId: typeId(gw), fields: { program: 'x', tarikh_program: '2026-12-01', tempat: 'y' } }, member)
    gw.ok('ref.approve', { id: r.id }, SUAK.id)
    expect(gw.errorCode('ref.pdf', { id: r.id }, other)).toBe('NOT_FOUND')
  })

  it('a SUAK-saved document type is no longer marked DEMO, and unknown placeholders are refused', () => {
    const { gw } = withDemo()
    const t = gw.rows('document_types').find((x) => x.code === 'SIJIL-DEMO')!
    const base = { id: t.id, code: 'SIJIL-DEMO', name: 'Sijil', kind: 'certificate' as const, description: '', active: true, fields: [{ key: 'nama_penerima', label: 'Nama', required: true, type: 'text' as const }], bodyTemplate: 'Untuk {{nama_penerima}}' }
    const list = gw.ok('admin.doctypes.save', base, SUAK.id)
    expect(list.find((x) => x.id === t.id)?.isDemo).toBe(false)
    expect(gw.errorCode('admin.doctypes.save', { ...base, bodyTemplate: 'Untuk {{tiada}}' }, SUAK.id)).toBe('BAD_REQUEST')
    expect(gw.errorCode('admin.doctypes.save', { ...base, fields: [{ key: 'rujukan', label: 'x', required: true, type: 'text' }] }, SUAK.id)).toBe('BAD_REQUEST')
  })
})

describe('public verification', () => {
  it('confirms existence and status only, without private details', () => {
    const { gw, member } = setup()
    const r = gw.ok('ref.request.save', REQ, member)
    gw.ok('ref.approve', { id: r.id }, SUAK.id)
    const v = gw.ok('public.verify', { reference: 'test/001/2026' })
    expect(v).toEqual({ found: true, status: 'issued', issuedAt: '2026-11-16', typeName: 'Surat keluar' })
    gw.ok('ref.void', { id: r.id, reason: 'Salah nombor' }, SUAK.id)
    expect(gw.ok('public.verify', { reference: 'TEST/001/2026' })).toMatchObject({ found: true, status: 'voided' })
    expect(gw.ok('public.verify', { reference: 'TEST/999/2026' })).toEqual({ found: false })
  })
})

describe('series configuration', () => {
  it('validates the pattern and keeps one active series per year', () => {
    const gw = Gateway.withSuak()
    expect(gw.errorCode('admin.series.save', { ...SERIES, pattern: '{PREFIX}/{YEAR}' }, SUAK.id)).toBe('BAD_REQUEST')
    expect(gw.errorCode('admin.series.save', { ...SERIES, pattern: '{SEQ}/{X}' }, SUAK.id)).toBe('BAD_REQUEST')
    gw.ok('admin.series.save', SERIES, SUAK.id)
    const list = gw.ok('admin.series.save', { ...SERIES, prefix: 'NEW' }, SUAK.id)
    expect(list.filter((s) => s.active)).toHaveLength(1)
    expect(list.find((s) => s.active)?.prefix).toBe('NEW')
  })

  it('only SUAK may configure it', () => {
    const gw = Gateway.withSuak()
    const sec = gw.member('sek', ['secretariat'])
    expect(gw.errorCode('admin.series.save', SERIES, sec)).toBe('FORBIDDEN')
  })

  it('audits format changes', () => {
    const gw = Gateway.withSuak()
    gw.ok('admin.series.save', SERIES, SUAK.id)
    expect(gw.rows('audit_logs').some((a) => a.action === 'series.save')).toBe(true)
  })
})

describe('correspondence register', () => {
  it('lets staff log incoming letters with a verified attachment', () => {
    const { gw } = setup()
    const sec = gw.member('sek', ['secretariat'])
    const c = gw.ok('corr.create', { direction: 'in', subject: 'Surat masuk', sender: 'Jabatan', recipient: 'JPP', letterDate: '2026-11-10', file: file('s.pdf', 'application/pdf', PDF_B64) }, sec)
    expect(c.file?.name).toBe('s.pdf')
    expect(gw.ok('corr.file', { id: c.id }, sec).mimeType).toBe('application/pdf')
    expect(gw.ok('corr.list', { direction: 'in' }, sec)).toHaveLength(1)
  })

  it('rejects files whose content does not match their type, and members cannot use the register', () => {
    const { gw, member } = setup()
    const sec = gw.member('sek', ['secretariat'])
    expect(gw.errorCode('corr.create', { direction: 'in', subject: 's', sender: 'a', recipient: 'b', letterDate: '2026-11-10', file: file('x.pdf', 'application/pdf', btoa('MZ-not-a-pdf')) }, sec)).toBe('BAD_REQUEST')
    expect(gw.errorCode('corr.list', {}, member)).toBe('FORBIDDEN')
  })
})
