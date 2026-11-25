import { describe, expect, it } from 'vitest'
import type { OprContent } from '@shared/api-contract'
import { EMPTY_OPR } from '@shared/opr-html'
import { file, PDF_B64, PNG_B64 } from './fakes'
import { Gateway, SUAK } from './harness'

const OPR: OprContent = { ...EMPTY_OPR, programName: 'Program Ujian', organiser: 'Biro X', date: '2026-11-10', time: '8 pagi', venue: 'Dewan', background: 'Latar', objectives: 'Objektif', execution: 'Pelaksanaan', outcome: 'Hasil', participantCount: '120', preparedBy: 'Ali' }

describe('Templat (M05)', () => {
  function setup() {
    const gw = Gateway.withSuak()
    const mgr = gw.member('mgr', ['secretariat'])
    gw.grant(mgr, 'templates.manage')
    const member = gw.member('ahli', ['member'])
    return { gw, mgr, member }
  }
  const T = { category: 'surat' as const, title: 'Surat jemputan', description: 'Perlu disemak', accessLevel: 'internal' as const, file: file('t.pdf', 'application/pdf', PDF_B64) }

  it('needs the delegated area; members can only download', () => {
    const { gw, member } = setup()
    const plain = gw.member('plain', ['secretariat'])
    expect(gw.errorCode('tpl.save', T, plain)).toBe('FORBIDDEN')
    expect(gw.errorCode('tpl.save', T, member)).toBe('FORBIDDEN')
  })

  it('creates, versions on new file, archives and hides archived from members', () => {
    const { gw, mgr, member } = setup()
    const t = gw.ok('tpl.save', T, mgr)
    expect(t).toMatchObject({ version: '1', status: 'active' })
    const v2 = gw.ok('tpl.save', { ...T, id: t.id, file: file('t2.pdf', 'application/pdf', PDF_B64) }, mgr)
    expect(v2.version).toBe('2')
    expect(gw.ok('tpl.list', {}, member)).toHaveLength(1)
    expect(gw.ok('tpl.download', { id: t.id }, member).mimeType).toBe('application/pdf')
    gw.ok('tpl.archive', { id: t.id, archived: true }, mgr)
    expect(gw.ok('tpl.list', {}, member)).toHaveLength(0)
    expect(gw.errorCode('tpl.download', { id: t.id }, member)).toBe('NOT_FOUND')
  })

  it('only SUAK can mark a template public; public site serves only active public ones', () => {
    const { gw, mgr } = setup()
    expect(gw.errorCode('tpl.save', { ...T, accessLevel: 'public' }, mgr)).toBe('FORBIDDEN')
    const internal = gw.ok('tpl.save', T, mgr)
    const pub = gw.ok('tpl.save', { ...T, title: 'Awam', accessLevel: 'public' }, SUAK.id)
    expect(gw.ok('public.templates', {}).map((t) => t.title)).toEqual(['Awam'])
    expect(gw.errorCode('public.templates.download', { id: internal.id })).toBe('NOT_FOUND')
    expect(gw.ok('public.templates.download', { id: pub.id }).mimeType).toBe('application/pdf')
    gw.ok('tpl.archive', { id: pub.id, archived: true }, SUAK.id)
    expect(gw.ok('public.templates', {})).toHaveLength(0)
  })

  it('rejects disguised or oversized uploads', () => {
    const { gw, mgr } = setup()
    expect(gw.errorCode('tpl.save', { ...T, file: file('a.exe', 'application/x-msdownload', btoa('MZ')) }, mgr)).toBe('BAD_REQUEST')
    expect(gw.errorCode('tpl.save', { ...T, file: file('a.pdf', 'application/pdf', btoa('not a pdf')) }, mgr)).toBe('BAD_REQUEST')
    expect(gw.errorCode('tpl.save', { ...T, file: file('a.pdf', 'application/pdf', btoa('%PDF' + 'x'.repeat(5_300_000))) }, mgr)).toBe('BAD_REQUEST')
  })
})

describe('e-Arkib (M07)', () => {
  function setup() {
    const gw = Gateway.withSuak()
    const sec = gw.member('sek', ['secretariat'])
    const member = gw.member('ahli', ['member'])
    return { gw, sec, member }
  }
  const D = { title: 'Minit lama', category: 'Minit', visibility: 'private' as const, file: file('m.pdf', 'application/pdf', PDF_B64) }

  it('private documents are invisible and undownloadable for members (AT-11)', () => {
    const { gw, sec, member } = setup()
    const d = gw.ok('arc.upload', D, sec)
    expect(gw.ok('arc.list', {}, member)).toHaveLength(0)
    expect(gw.errorCode('arc.download', { id: d.id }, member)).toBe('NOT_FOUND')
    expect(gw.ok('arc.download', { id: d.id }, sec).mimeType).toBe('application/pdf')
    expect(gw.errorCode('public.archive.download', { id: d.id })).toBe('NOT_FOUND')
  })

  it('searches and filters', () => {
    const { gw, sec } = setup()
    gw.ok('arc.upload', { ...D, referenceNumber: 'ABC/001/2026' }, sec)
    gw.ok('arc.upload', { ...D, title: 'Laporan', category: 'Laporan', visibility: 'internal' }, sec)
    expect(gw.ok('arc.list', { q: 'abc/001' }, sec)).toHaveLength(1)
    expect(gw.ok('arc.list', { category: 'Laporan' }, sec)).toHaveLength(1)
    expect(gw.ok('arc.list', { visibility: 'private' }, sec)).toHaveLength(1)
    expect(gw.ok('arc.list', { q: 'tiada-padanan' }, sec)).toHaveLength(0)
  })

  it('only SUAK publishes; the public gets a separate copy and unpublishing withdraws it', () => {
    const { gw, sec } = setup()
    const d = gw.ok('arc.upload', D, sec)
    expect(gw.errorCode('arc.setVisibility', { id: d.id, visibility: 'public' }, sec)).toBe('FORBIDDEN')
    gw.ok('arc.setVisibility', { id: d.id, visibility: 'public' }, SUAK.id)
    const row = gw.rows('archive_documents')[0]
    expect(row.public_file_id).not.toBe(row.drive_file_id)
    expect(gw.ok('public.archive', {})).toEqual([expect.objectContaining({ title: 'Minit lama' })])
    expect(Object.keys(gw.ok('public.archive', {})[0]).sort()).toEqual(['category', 'fileName', 'id', 'publishedAt', 'referenceNumber', 'title'])
    expect(gw.ok('public.archive.download', { id: d.id }).name).toBe('m.pdf')
    gw.ok('arc.setVisibility', { id: d.id, visibility: 'internal' }, SUAK.id)
    expect(gw.services.trashed.has(row.public_file_id)).toBe(true)
    expect(gw.ok('public.archive', {})).toHaveLength(0)
    expect(gw.errorCode('public.archive.download', { id: d.id })).toBe('NOT_FOUND')
  })

  it('archiving a public document withdraws it; records are never deleted (ARC-07)', () => {
    const { gw, sec } = setup()
    const d = gw.ok('arc.upload', D, sec)
    gw.ok('arc.setVisibility', { id: d.id, visibility: 'public' }, SUAK.id)
    gw.ok('arc.setStatus', { id: d.id, status: 'archived' }, sec)
    expect(gw.ok('public.archive', {})).toHaveLength(0)
    expect(gw.rows('archive_documents')).toHaveLength(1)
    expect(gw.errorCode('arc.setVisibility', { id: d.id, visibility: 'public' }, SUAK.id)).toBe('CONFLICT')
  })
})

describe('e-OPR (M06)', () => {
  function setup() {
    const gw = Gateway.withSuak()
    const owner = gw.member('ali', ['member'])
    const other = gw.member('bob', ['member'])
    const rev = gw.member('rev', ['secretariat'])
    gw.grant(rev, 'opr.approve')
    return { gw, owner, other, rev }
  }

  it('saves drafts, uploads images and only allows registered images in content (OPR-02)', () => {
    const { gw, owner } = setup()
    const o = gw.ok('opr.save', { style: 'corporate', content: OPR }, owner)
    const { fileId } = gw.ok('opr.image.add', { oprId: o.id, file: file('g.png', 'image/png', PNG_B64) }, owner)
    const saved = gw.ok('opr.save', { id: o.id, style: 'editorial', content: { ...OPR, images: [{ fileId, caption: 'Gambar 1', credit: '' }] } }, owner)
    expect(saved).toMatchObject({ style: 'editorial', status: 'draft', canEdit: true })
    expect(gw.errorCode('opr.save', { id: o.id, style: 'corporate', content: { ...OPR, images: [{ fileId: 'file-surat-1', caption: '', credit: '' }] } }, owner)).toBe('BAD_REQUEST')
    expect(gw.ok('opr.image.get', { oprId: o.id, fileId }, owner).mimeType).toBe('image/png')
    expect(gw.errorCode('opr.image.get', { oprId: o.id, fileId: 'file-surat-1' }, owner)).toBe('NOT_FOUND')
  })

  it('enforces the one-page content budget and image count (OPR-04)', () => {
    const { gw, owner } = setup()
    expect(gw.errorCode('opr.save', { style: 'corporate', content: { ...OPR, background: 'x'.repeat(1000) } }, owner)).toBe('BAD_REQUEST')
    // Every field within its own limit, but together more than one page can hold.
    const full = { ...OPR, background: 'y'.repeat(900), objectives: 'y'.repeat(700), execution: 'y'.repeat(900), outcome: 'y'.repeat(700), impact: 'z'.repeat(500), strengths: 'z'.repeat(400), issues: 'z'.repeat(400), suggestions: 'z'.repeat(400) }
    const res = gw.call('opr.save', { style: 'corporate', content: full }, owner)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.message).toMatch(/satu halaman/)
    // The allowance is smaller once a photo is attached.
    const o = gw.ok('opr.save', { style: 'corporate', content: OPR }, owner)
    const { fileId } = gw.ok('opr.image.add', { oprId: o.id, file: file('g.png', 'image/png', PNG_B64) }, owner)
    const mid = { ...OPR, background: 'y'.repeat(900), objectives: 'y'.repeat(700), execution: 'y'.repeat(900), outcome: 'y'.repeat(100), images: [{ fileId, caption: '', credit: '' }] }
    expect(gw.errorCode('opr.save', { id: o.id, style: 'corporate', content: mid }, owner)).toBe('BAD_REQUEST') // 2,600 > 2,500 with a photo
    expect(gw.errorCode('opr.save', { id: o.id, style: 'corporate', content: { ...mid, outcome: 'y'.repeat(0) } }, owner)).toBeNull()  // 2,500 fits
    expect(gw.errorCode('opr.save', { style: 'corporate', content: { ...mid, images: [] } }, owner)).toBeNull() // same text, no photo: fine
    expect(gw.errorCode('opr.image.add', { oprId: 'x', file: file('g.png', 'image/png', PNG_B64) }, owner)).toBe('NOT_FOUND')
  })

  it('only the owner sees or edits it; staff can read', () => {
    const { gw, owner, other } = setup()
    const o = gw.ok('opr.save', { style: 'corporate', content: OPR }, owner)
    expect(gw.errorCode('opr.get', { id: o.id }, other)).toBe('NOT_FOUND')
    expect(gw.errorCode('opr.save', { id: o.id, style: 'corporate', content: OPR }, other)).toBe('CONFLICT')
    expect(gw.errorCode('opr.list', { scope: 'all' }, owner)).toBe('FORBIDDEN')
  })

  it('submission requires the mandatory sections', () => {
    const { gw, owner } = setup()
    const o = gw.ok('opr.save', { style: 'corporate', content: { ...OPR, venue: '' } }, owner)
    expect(gw.errorCode('opr.submit', { id: o.id }, owner)).toBe('BAD_REQUEST')
  })

  it('review needs the delegated area; revision needs a note and creates version 2 on resubmission (OPR-06/07)', () => {
    const { gw, owner, rev } = setup()
    const o = gw.ok('opr.save', { style: 'corporate', content: OPR }, owner)
    gw.ok('opr.submit', { id: o.id }, owner)
    expect(gw.errorCode('opr.review', { id: o.id, decision: 'approve' }, owner)).toBe('FORBIDDEN')
    expect(gw.errorCode('opr.review', { id: o.id, decision: 'revise', note: 'x' }, rev)).toBe('BAD_REQUEST')
    const r = gw.ok('opr.review', { id: o.id, decision: 'revise', note: 'Tambah gambar' }, rev)
    expect(r).toMatchObject({ status: 'revision_requested', reviewNote: 'Tambah gambar' })
    expect(gw.ok('opr.get', { id: o.id }, owner).canEdit).toBe(true)
    gw.ok('opr.save', { id: o.id, style: 'corporate', content: { ...OPR, impact: 'Baru' } }, owner)
    expect(gw.ok('opr.submit', { id: o.id }, owner).version).toBe(2)
    expect(gw.rows('opr_versions').map((v) => v.version)).toEqual(['1', '2'])
  })

  it('approval renders the final PDF, files it in e-Arkib with metadata and locks the report (OPR-08)', () => {
    const { gw, owner, rev } = setup()
    const o = gw.ok('opr.save', { style: 'infographic', content: OPR }, owner)
    const { fileId } = gw.ok('opr.image.add', { oprId: o.id, file: file('g.png', 'image/png', PNG_B64) }, owner)
    gw.ok('opr.save', { id: o.id, style: 'infographic', content: { ...OPR, images: [{ fileId, caption: 'Foto', credit: 'Ali' }] } }, owner)
    gw.ok('opr.submit', { id: o.id }, owner)
    const a = gw.ok('opr.review', { id: o.id, decision: 'approve' }, rev)
    expect(a).toMatchObject({ status: 'approved', hasFinal: true, canEdit: false })
    const html = gw.services.rendered[0]
    expect(html).toContain('Program Ujian')
    expect(html).toContain('data:image/png;base64,')
    expect(html).not.toContain('DRAF')
    expect(gw.rows('archive_documents')[0]).toMatchObject({ module: 'e-OPR', category: 'Laporan', source_type: 'opr', visibility: 'internal' })
    expect(gw.errorCode('opr.save', { id: o.id, style: 'corporate', content: OPR }, owner)).toBe('CONFLICT')
    expect(gw.ok('opr.pdf', { id: o.id }, owner).name).toMatch(/\.pdf$/)
  })

  it('exports a watermarked draft PDF before approval', () => {
    const { gw, owner } = setup()
    const o = gw.ok('opr.save', { style: 'editorial', content: OPR }, owner)
    gw.ok('opr.pdf', { id: o.id }, owner)
    expect(gw.services.rendered[0]).toContain('DRAF')
  })
})

describe('Papan Notis / Pengumuman', () => {
  const A = { title: 'Notis', body: 'Isi', category: 'Umum' as const, visibility: 'internal' as const, pinned: false, status: 'published' as const }
  function setup() {
    const gw = Gateway.withSuak()
    return { gw, sec: gw.member('sek', ['secretariat']), member: gw.member('ahli', ['member']) }
  }

  it('secretariat posts internal notices; members read them; drafts stay hidden', () => {
    const { gw, sec, member } = setup()
    gw.ok('ann.save', A, sec)
    gw.ok('ann.save', { ...A, title: 'Draf', status: 'draft' }, sec)
    expect(gw.ok('ann.list', { scope: 'board' }, member).map((a) => a.title)).toEqual(['Notis'])
    expect(gw.errorCode('ann.save', A, member)).toBe('FORBIDDEN')
    expect(gw.errorCode('ann.list', { scope: 'manage' }, member)).toBe('FORBIDDEN')
    expect(gw.ok('ann.list', { scope: 'manage' }, sec)).toHaveLength(2)
  })

  it('only SUAK may publish public announcements; the public sees only live public ones (AT-01)', () => {
    const { gw, sec } = setup()
    expect(gw.errorCode('ann.save', { ...A, visibility: 'public' }, sec)).toBe('FORBIDDEN')
    gw.ok('ann.save', A, sec)
    gw.ok('ann.save', { ...A, title: 'Awam', visibility: 'public' }, SUAK.id)
    gw.ok('ann.save', { ...A, title: 'Awam draf', visibility: 'public', status: 'draft' }, SUAK.id)
    const pub = gw.ok('public.announcements', {})
    expect(pub.map((a) => a.title)).toEqual(['Awam'])
    expect(Object.keys(pub[0]).sort()).toEqual(['body', 'category', 'id', 'pinned', 'publishAt', 'title'])
  })

  it('respects publish and expiry times, pins first, marks recent as TERKINI', () => {
    const { gw, sec, member } = setup()
    gw.ok('ann.save', { ...A, title: 'Akan datang', publishAt: '2026-11-20T09:00:00.000Z' }, sec)
    gw.ok('ann.save', { ...A, title: 'Tamat', publishAt: '2026-11-01T09:00:00.000Z', expiresAt: '2026-11-10T09:00:00.000Z' }, sec)
    gw.ok('ann.save', { ...A, title: 'Biasa', publishAt: '2026-11-05T09:00:00.000Z' }, sec)
    gw.ok('ann.save', { ...A, title: 'Disemat', pinned: true, publishAt: '2026-11-02T09:00:00.000Z' }, sec)
    const board = gw.ok('ann.list', { scope: 'board' }, member)
    expect(board.map((a) => a.title)).toEqual(['Disemat', 'Biasa'])
    expect(board.every((a) => !a.recent)).toBe(true)
    gw.ok('ann.save', { ...A, title: 'Hari ini' }, sec)
    expect(gw.ok('ann.list', { scope: 'board' }, member).find((a) => a.title === 'Hari ini')?.recent).toBe(true)
  })

  it('archiving removes it from the board', () => {
    const { gw, sec, member } = setup()
    const a = gw.ok('ann.save', A, sec)
    gw.ok('ann.save', { ...A, id: a.id, status: 'archived' }, sec)
    expect(gw.ok('ann.list', { scope: 'board' }, member)).toHaveLength(0)
  })
})

describe('public portal leakage (AT-01, AT-07, AT-11)', () => {
  it('anonymous callers reach only public actions and see no private data', () => {
    const gw = Gateway.withSuak()
    const sec = gw.member('sek', ['secretariat'])
    gw.ok('arc.upload', { title: 'RAHSIA', category: 'x', visibility: 'private', file: file('a.pdf', 'application/pdf', PDF_B64) }, sec)
    gw.ok('ann.save', { title: 'DALAMAN', body: 'x', category: 'Umum', visibility: 'internal', pinned: false, status: 'published' }, sec)
    for (const action of ['auth.me', 'admin.users.list', 'dashboard.summary', 'arc.list', 'tpl.list', 'ann.list', 'mtg.list', 'notice.list', 'ref.register', 'admin.audit.list', 'admin.settings.get'] as const) {
      expect(gw.errorCode(action, {}), action).toBe('UNAUTHENTICATED')
    }
    const everything = JSON.stringify([gw.ok('public.announcements', {}), gw.ok('public.archive', {}), gw.ok('public.templates', {}), gw.ok('public.attendance', {}), gw.ok('public.leaders', {}), gw.ok('site.config', {})])
    expect(everything).not.toContain('RAHSIA')
    expect(everything).not.toContain('DALAMAN')
    expect(everything).not.toContain('@moe-dl.edu.my')
  })

  it('lists only opted-in leaders by name, position and bureau', () => {
    const gw = Gateway.withSuak()
    gw.member('a', ['member'], { position: 'Pengerusi', bureau: 'Eksekutif', publicListing: true })
    gw.member('b', ['member'], { position: 'Ahli', bureau: 'Sukan' })
    const { leaders } = gw.ok('public.leaders', {})
    expect(leaders).toEqual([{ name: 'Nama a', position: 'Pengerusi', bureau: 'Eksekutif' }])
  })

  it('exposes only whitelisted settings publicly', () => {
    const gw = Gateway.withSuak()
    gw.ok('admin.settings.set', { values: { contact_email: 'sua@example.my', mail_reply_to: 'rahsia@example.my', verify_url: 'https://x.example/semak' } }, SUAK.id)
    const s = gw.ok('site.config', {}).settings
    expect(s.contact_email).toBe('sua@example.my')
    expect(s).not.toHaveProperty('mail_reply_to')
    expect(s).not.toHaveProperty('verify_url')
  })
})

describe('settings, audit and dashboard', () => {
  it('validates settings and audits changes without storing long texts in the log', () => {
    const gw = Gateway.withSuak()
    expect(gw.errorCode('admin.settings.set', { values: { nope: 'x' } }, SUAK.id)).toBe('BAD_REQUEST')
    expect(gw.errorCode('admin.settings.set', { values: { social_instagram: 'http://insecure' } }, SUAK.id)).toBe('BAD_REQUEST')
    expect(gw.errorCode('admin.settings.set', { values: { contact_email: 'bukan-emel' } }, SUAK.id)).toBe('BAD_REQUEST')
    expect(gw.errorCode('admin.settings.set', { values: { public_attendance_mode: 'semua' } }, SUAK.id)).toBe('BAD_REQUEST')
    gw.ok('admin.settings.set', { values: { privacy_text: 'x'.repeat(500) } }, SUAK.id)
    const log = gw.rows('audit_logs').find((a) => a.action === 'settings.set')!
    expect(log.after_json.length).toBeLessThan(200)
    expect(gw.ok('admin.settings.get', {}, SUAK.id).values.privacy_text).toHaveLength(500)
    const sec = gw.member('sek', ['secretariat'])
    expect(gw.errorCode('admin.settings.set', { values: { org_name: 'X' } }, sec)).toBe('FORBIDDEN')
  })

  it('the audit viewer is read-only, filterable, and open to SUAK and System Administrator only', () => {
    const gw = Gateway.withSuak()
    const sys = gw.member('sys', ['system_admin'])
    const sec = gw.member('sek', ['secretariat'])
    expect(gw.ok('admin.audit.list', { action: 'profile.register' }, sys).every((a) => a.action.startsWith('profile.register'))).toBe(true)
    expect(gw.errorCode('admin.audit.list', {}, sec)).toBe('FORBIDDEN')
    expect(gw.errorCode('admin.settings.get', {}, sys)).toBe('FORBIDDEN')
  })

  it('summarises the dashboard per role', () => {
    const gw = Gateway.withSuak()
    gw.ok('admin.series.save', { prefix: 'T', pattern: '{SEQ}', year: 2026, nextSequence: 1, padding: 1, active: true }, SUAK.id)
    const m = gw.member('ahli', ['member'])
    gw.ok('ref.request.save', { letterType: 'x', subject: 's', recipient: 'r', purpose: 'p', letterDate: '2026-11-16', submit: true }, m)
    expect(gw.ok('dashboard.summary', {}, SUAK.id).pendingReferences).toBe(1)
    const mine = gw.ok('dashboard.summary', {}, m)
    expect(mine.myReferenceByStatus).toEqual({ submitted: 1 })
    expect(mine.correspondenceThisMonth).toBe(0)
    expect(gw.errorCode('dashboard.summary', {}, gw.member('sys', ['system_admin']))).toBe('FORBIDDEN')
  })
})
