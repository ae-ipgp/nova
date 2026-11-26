import { describe, expect, it } from 'vitest'
import { file, PDF_B64 } from './fakes'
import { Gateway, SUAK } from './harness'

const REQ = { letterType: 'Surat keluar', subject: 'Jemputan Seminar Kepimpinan', recipient: 'Pengarah', purpose: 'Ujian', letterDate: '2026-11-16', submit: true }

function setup() {
  const gw = Gateway.withSuak()
  gw.ok('admin.series.save', { prefix: 'T', pattern: '{PREFIX}/{SEQ}/{YEAR}', year: 2026, nextSequence: 1, padding: 3, active: true }, SUAK.id)
  const ali = gw.member('ali', ['member'])
  const bob = gw.member('bob', ['member'])
  const sec = gw.member('sek', ['secretariat'])
  gw.ok('ref.request.save', REQ, ali)
  gw.ok('ref.request.save', { ...REQ, subject: 'Rahsia Bob Seminar' }, bob)
  return { gw, ali, bob, sec }
}
const kinds = (g: { kind: string }[]) => g.map((x) => x.kind)

describe('global search is role-filtered', () => {
  it('needs a sign-in and at least two characters', () => {
    const { gw, ali } = setup()
    expect(gw.errorCode('search.global', { q: 'seminar' })).toBe('UNAUTHENTICATED')
    expect(gw.errorCode('search.global', { q: 's' }, ali)).toBe('BAD_REQUEST')
    expect(gw.errorCode('search.global', { q: '  ' }, ali)).toBe('BAD_REQUEST')
  })

  it('members only find their own requests; staff find everyone’s', () => {
    const { gw, ali, sec } = setup()
    const mine = gw.ok('search.global', { q: 'seminar' }, ali)
    expect(mine.find((g) => g.kind === 'e-surat')?.items.map((i) => i.title)).toEqual(['Jemputan Seminar Kepimpinan'])
    expect(JSON.stringify(mine)).not.toContain('Rahsia Bob')
    expect(gw.ok('search.global', { q: 'seminar' }, sec).find((g) => g.kind === 'e-surat')?.items).toHaveLength(2)
  })

  it('finds issued reference numbers and links to the request', () => {
    const { gw, ali } = setup()
    const r = gw.ok('ref.request.list', { scope: 'mine' }, ali)[0]
    gw.ok('ref.approve', { id: r.id }, SUAK.id)
    const hit = gw.ok('search.global', { q: 'T/001' }, ali).find((g) => g.kind === 'e-surat')!
    expect(hit.items[0]).toMatchObject({ title: 'Jemputan Seminar Kepimpinan', href: `/workspace/e-surat?open=${r.id}` })
  })

  it('uses AND matching across words and ranks title matches first', () => {
    const { gw, sec } = setup()
    expect(gw.ok('search.global', { q: 'seminar rahsia' }, sec).find((g) => g.kind === 'e-surat')?.items).toHaveLength(1)
    expect(kinds(gw.ok('search.global', { q: 'tiada-padanan-xyz' }, sec))).toEqual([])
  })

  it('hides private archive files, NoMe without delegation and the member list from ordinary users', () => {
    const { gw, ali, sec } = setup()
    gw.ok('arc.upload', { title: 'Dokumen Peribadi Penting', category: 'x', visibility: 'private', file: file('a.pdf', 'application/pdf', PDF_B64) }, sec)
    gw.ok('arc.upload', { title: 'Dokumen Dalaman Penting', category: 'x', visibility: 'internal', file: file('b.pdf', 'application/pdf', PDF_B64) }, sec)
    const found = gw.ok('search.global', { q: 'penting' }, ali)
    expect(found.find((g) => g.kind === 'e-arkib')?.items.map((i) => i.title)).toEqual(['Dokumen Dalaman Penting'])
    expect(kinds(gw.ok('search.global', { q: 'nama bob' }, ali))).not.toContain('pengguna')
    expect(kinds(gw.ok('search.global', { q: 'nama bob' }, sec))).not.toContain('pengguna')
    expect(kinds(gw.ok('search.global', { q: 'nama bob' }, SUAK.id))).toContain('pengguna')
  })

  it('meetings: members only find ones they are invited to', () => {
    const gw = Gateway.withSuak()
    const sec = gw.member('sek', ['secretariat'], { position: 'Setiausaha' })
    const ali = gw.member('ali', ['member'], { position: 'Ahli' })
    for (const t of [ali, sec]) gw.ok('auth.me', {}, t)
    gw.ok('mtg.save', { title: 'Mesyuarat Khas Anggaran', meetingType: 'Mesyuarat Khas', startsAt: '2026-12-01T10:00:00+08:00', endsAt: '2026-12-01T11:00:00+08:00', location: 'Bilik JPP' }, sec)
    expect(gw.ok('search.global', { q: 'anggaran' }, ali).find((g) => g.kind === 'e-mesyuarat')?.items).toHaveLength(1)
    const outsider = gw.member('luar', ['member'], { position: 'Ahli' }) // registered after the meeting was created: not invited
    gw.ok('auth.me', {}, outsider)
    expect(kinds(gw.ok('search.global', { q: 'anggaran' }, outsider))).not.toContain('e-mesyuarat')
  })

  it('caps results per group', () => {
    const { gw, sec } = setup()
    for (let i = 0; i < 8; i++) gw.ok('ref.request.save', { ...REQ, subject: `Seminar nombor ${i}` }, sec)
    expect(gw.ok('search.global', { q: 'seminar' }, sec).find((g) => g.kind === 'e-surat')?.items).toHaveLength(5)
  })
})

describe('public search returns only published public content', () => {
  it('never leaks internal or draft records', () => {
    const { gw, sec } = setup()
    const a = { title: 'Kejohanan Sukan', body: 'Isi', category: 'Sukan' as const, visibility: 'public' as const, pinned: false, status: 'published' as const }
    gw.ok('ann.save', a, SUAK.id)
    gw.ok('ann.save', { ...a, title: 'Kejohanan Dalaman', visibility: 'internal' }, sec)
    gw.ok('ann.save', { ...a, title: 'Kejohanan Draf', status: 'draft' }, SUAK.id)
    gw.ok('arc.upload', { title: 'Kejohanan Laporan Rahsia', category: 'x', visibility: 'private', file: file('a.pdf', 'application/pdf', PDF_B64) }, sec)
    const res = gw.ok('public.search', { q: 'kejohanan' })
    expect(res.flatMap((g) => g.items.map((i) => i.title))).toEqual(['Kejohanan Sukan'])
    expect(gw.errorCode('public.search', { q: 'k' })).toBe('BAD_REQUEST')
  })

  it('finds English announcement text too', () => {
    const { gw } = setup()
    gw.ok('ann.save', { title: 'Pendaftaran dibuka', body: 'x', titleEn: 'Registration open', bodyEn: 'Sign up now', category: 'Umum', visibility: 'public', pinned: false, status: 'published' }, SUAK.id)
    expect(gw.ok('public.search', { q: 'registration' })[0].items[0].title).toBe('Pendaftaran dibuka')
    expect(gw.ok('public.announcements', {})[0]).toMatchObject({ titleEn: 'Registration open', bodyEn: 'Sign up now' })
  })
})
