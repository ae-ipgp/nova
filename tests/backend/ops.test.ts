import { describe, expect, it } from 'vitest'
import { backupsToDelete } from '../../backend/src/backup'
import { sendDailyReminders } from '../../backend/src/notify'
import { TableStore } from '../../backend/src/store'
import { Gateway, SUAK } from './harness'

const REQ = { letterType: 'Surat keluar', subject: 'Permohonan Ujian', recipient: 'Pengarah', purpose: 'Ujian', letterDate: '2026-11-16', submit: true }
const env = (gw: Gateway) => ({ store: new TableStore(gw.io), services: gw.services, now: gw.clock, uuid: gw.deps.uuid })

function setup() {
  const gw = Gateway.withSuak()
  gw.ok('admin.series.save', { prefix: 'T', pattern: '{PREFIX}/{SEQ}/{YEAR}', year: 2026, nextSequence: 1, padding: 3, active: true }, SUAK.id)
  const ali = gw.member('ali', ['member'], { position: 'Ahli' })
  gw.ok('auth.me', {}, ali)
  return { gw, ali }
}
const to = (m: { to: string }[]) => m.map((x) => x.to).sort()

describe('system notification emails', () => {
  it('emails SUAK when a request is submitted, with the details and a link when the app URL is set', () => {
    const { gw, ali } = setup()
    gw.ok('admin.settings.set', { values: { app_url: 'https://nova.example/' } }, SUAK.id)
    gw.services.system.length = 0
    const r = gw.ok('ref.request.save', REQ, ali)
    expect(to(gw.services.system)).toEqual(['suak@moe-dl.edu.my'])
    const m = gw.services.system[0]
    expect(m.subject).toContain('Permohonan Ujian')
    expect(m.html).toContain(`https://nova.example/workspace/e-surat?open=${r.id}`)
    expect(m.html).toContain('Makluman NoVA')
  })

  it('drafts send nothing; decisions email the applicant with the reason or the number', () => {
    const { gw, ali } = setup()
    gw.services.system.length = 0
    gw.ok('ref.request.save', { ...REQ, submit: false }, ali)
    expect(gw.services.system).toHaveLength(0)
    const a = gw.ok('ref.request.save', REQ, ali)
    const b = gw.ok('ref.request.save', { ...REQ, subject: 'Kedua' }, ali)
    gw.services.system.length = 0
    gw.ok('ref.approve', { id: a.id }, SUAK.id)
    gw.ok('ref.reject', { id: b.id, reason: 'Butiran tidak lengkap' }, SUAK.id)
    const [ok, no] = gw.services.system
    expect(ok.to).toBe('ali@moe-dl.edu.my')
    expect(ok.text).toContain('T/001/2026')
    expect(no.text).toContain('Butiran tidak lengkap')
  })

  it('escapes user text in system mail', () => {
    const { gw, ali } = setup()
    gw.services.system.length = 0
    gw.ok('ref.request.save', { ...REQ, subject: '<img src=x onerror=alert(1)>' }, ali)
    expect(gw.services.system[0].html).not.toContain('<img src=x')
  })

  it('respects per-user opt-outs and the global switch, but never for security notices', () => {
    const { gw, ali } = setup()
    gw.ok('me.prefs.set', { notifyOff: ['request_decision', 'bogus'] }, ali)
    expect(gw.ok('auth.me', {}, ali).notifyOff).toEqual(['request_decision'])
    const r = gw.ok('ref.request.save', REQ, ali)
    gw.services.system.length = 0
    gw.ok('ref.approve', { id: r.id }, SUAK.id)
    expect(gw.services.system).toHaveLength(0) // opted out
    const aliProfile = gw.rows('profiles').find((p) => p.email === 'ali@moe-dl.edu.my')!.id
    gw.ok('admin.settings.set', { values: { notifications_enabled: 'false' } }, SUAK.id)
    gw.ok('admin.roles.grant', { profileId: aliProfile, role: 'secretariat' }, SUAK.id)
    expect(gw.services.system.map((m) => m.subject)).toEqual(['Akses NoVA anda telah diubah']) // security notice still sent
    gw.services.system.length = 0
    gw.ok('ref.request.save', REQ, ali)
    expect(gw.services.system).toHaveLength(0) // global switch off
  })

  it('a mail failure never breaks the action; low quota skips system mail', () => {
    const { gw, ali } = setup()
    gw.services.failFor.add('suak@moe-dl.edu.my')
    expect(gw.errorCode('ref.request.save', REQ, ali)).toBeNull()
    gw.services.failFor.clear()
    gw.services.system.length = 0
    gw.services.quota = 10
    gw.ok('ref.request.save', { ...REQ, subject: 'Lagi' }, ali)
    expect(gw.services.system).toHaveLength(0)
  })

  it('OPR submission, decision and action assignment are emailed to the right people', () => {
    const { gw, ali } = setup()
    const rev = gw.member('rev', ['secretariat'], { position: 'Setiausaha' })
    gw.ok('auth.me', {}, rev)
    gw.grant(rev, 'opr.approve')
    const content = { programName: 'Program', organiser: '', date: '2026-11-10', time: '', venue: 'Dewan', background: '', objectives: 'O', execution: 'E', participantCount: '', targetGroup: '', parties: '', outcome: 'H', impact: '', images: [], strengths: '', issues: '', suggestions: '', preparedBy: 'Ali' }
    const o = gw.ok('opr.save', { style: 'corporate', content }, ali)
    gw.services.system.length = 0
    gw.ok('opr.submit', { id: o.id }, ali)
    expect(to(gw.services.system)).toEqual(['rev@moe-dl.edu.my', 'suak@moe-dl.edu.my'])
    gw.services.system.length = 0
    gw.ok('opr.review', { id: o.id, decision: 'revise', note: 'Tambah gambar' }, rev)
    expect(to(gw.services.system)).toEqual(['ali@moe-dl.edu.my'])

    gw.ok('auth.me', {}, SUAK.id)
    const m = gw.ok('mtg.save', { title: 'AMT', meetingType: 'Mesyuarat AMT', startsAt: '2026-12-01T10:00:00+08:00', endsAt: '2026-12-01T11:00:00+08:00', location: 'B' }, SUAK.id)
    const ownerId = gw.rows('profiles').find((p) => p.email === 'ali@moe-dl.edu.my')!.id
    gw.services.system.length = 0
    gw.ok('mtg.action.save', { meetingId: m.meeting.id, description: 'Siapkan laporan', ownerId, dueDate: '2026-12-05', status: 'open' }, SUAK.id)
    expect(to(gw.services.system)).toEqual(['ali@moe-dl.edu.my'])
  })
})

describe('daily reminders', () => {
  function withAction(due: string) {
    const { gw, ali } = setup()
    const m = gw.ok('mtg.save', { title: 'AMT', meetingType: 'Mesyuarat AMT', startsAt: '2026-12-01T10:00:00+08:00', endsAt: '2026-12-01T11:00:00+08:00', location: 'B' }, SUAK.id)
    const ownerId = gw.rows('profiles').find((p) => p.email === 'ali@moe-dl.edu.my')!.id
    gw.ok('mtg.action.save', { meetingId: m.meeting.id, description: 'Siapkan laporan', ownerId, dueDate: due, status: 'open' }, SUAK.id)
    gw.services.system.length = 0
    return { gw, ali }
  }

  it('reminds 3 days before, on the day, and weekly while overdue — once per day', () => {
    const { gw } = withAction('2026-11-19')
    expect(sendDailyReminders(env(gw))).toBe(1) // 16 Nov MYT: 3 days left
    expect(sendDailyReminders(env(gw))).toBe(0) // same day: no duplicate
    gw.clock = new Date('2026-11-17T01:00:00Z')
    expect(sendDailyReminders(env(gw))).toBe(0) // 2 days left: quiet
    gw.clock = new Date('2026-11-19T01:00:00Z')
    expect(sendDailyReminders(env(gw))).toBe(1) // due today
    gw.clock = new Date('2026-11-26T01:00:00Z')
    expect(sendDailyReminders(env(gw))).toBe(1) // 7 days overdue
    expect(gw.services.system[0].text).toContain('3 hari lagi')
  })

  it('does not remind about finished actions', () => {
    const { gw, ali } = withAction('2026-11-19')
    const id = gw.rows('meeting_actions')[0].id
    const meeting = gw.rows('meeting_actions')[0].meeting_id
    gw.ok('mtg.action.save', { id, meetingId: meeting, status: 'done' }, ali)
    gw.services.system.length = 0
    expect(sendDailyReminders(env(gw))).toBe(0)
  })
})

describe('page visibility', () => {
  it('a hidden, locked or soon module is closed to members but open to SUAK; others are unaffected', () => {
    const { gw, ali } = setup()
    expect(gw.errorCode('mtg.list', {}, ali)).toBeNull()
    for (const state of ['soon', 'locked', 'hidden']) {
      gw.ok('admin.settings.set', { values: { vis_ws_e_mesyuarat: state } }, SUAK.id)
      expect(gw.errorCode('mtg.list', {}, ali), state).toBe('FORBIDDEN')
      expect(gw.errorCode('mtg.list', {}, SUAK.id)).toBeNull()
      expect(gw.errorCode('ref.request.list', { scope: 'mine' }, ali)).toBeNull()
    }
    gw.ok('admin.settings.set', { values: { vis_ws_e_mesyuarat: 'published' } }, SUAK.id)
    expect(gw.errorCode('mtg.list', {}, ali)).toBeNull()
  })

  it('exposes public-page states to the site and validates them', () => {
    const gw = Gateway.withSuak()
    expect(gw.errorCode('admin.settings.set', { values: { vis_pub_arkib: 'bogus' } }, SUAK.id)).toBe('BAD_REQUEST')
    gw.ok('admin.settings.set', { values: { vis_pub_arkib: 'soon', vis_ws_nome: 'locked' } }, SUAK.id)
    const s = gw.ok('site.config', {}).settings
    expect(s.vis_pub_arkib).toBe('soon')
    expect(s.vis_pub_kehadiran).toBe('published')
  })
})

describe('canned replies', () => {
  it('are configured in Tetapan and offered to requesters', () => {
    const { gw, ali } = setup()
    expect(gw.ok('ref.options', {}, ali).cannedReplies).toEqual([])
    gw.ok('admin.settings.set', { values: { canned_replies: 'Butiran tidak lengkap\n\n  Sila lampirkan surat sokongan  ' } }, SUAK.id)
    expect(gw.ok('ref.options', {}, ali).cannedReplies).toEqual(['Butiran tidak lengkap', 'Sila lampirkan surat sokongan'])
  })
})

describe('backup export', () => {
  it('SUAK downloads a ZIP with one CSV per sheet, a manifest and restore notes, and it is audited', () => {
    const { gw } = setup()
    const r = gw.ok('admin.backup.export', {}, SUAK.id)
    expect(r.mimeType).toBe('application/zip')
    expect(r.name).toMatch(/^nova-sandaran-\d{4}-\d{2}-\d{2}\.zip$/)
    const files = gw.services.zips[0].map((f) => f.name)
    expect(files).toEqual(expect.arrayContaining(['data/profiles.csv', 'data/reference_register.csv', 'audit/audit_logs.csv', 'manifest.json', 'BACA-SAYA.txt']))
    const profiles = gw.services.zips[0].find((f) => f.name === 'data/profiles.csv')!.content
    expect(profiles).toContain('suak@moe-dl.edu.my')
    expect(JSON.parse(gw.services.zips[0].find((f) => f.name === 'manifest.json')!.content).schemaVersion).toBe(5)
    expect(gw.rows('audit_logs').some((a) => a.action === 'backup.export')).toBe(true)
  })

  it('only SUAK may export', () => {
    const { gw, ali } = setup()
    expect(gw.errorCode('admin.backup.export', {}, ali)).toBe('FORBIDDEN')
    expect(gw.errorCode('admin.backup.export', {}, gw.member('sys', ['system_admin']))).toBe('FORBIDDEN')
  })

  it('keeps the newest 12 copies per workbook and never touches files it did not name', () => {
    const files = Array.from({ length: 15 }, (_, i) => ({ id: `d${i}`, name: `NoVA — Data — 2026-${i}`, createdMs: i })).concat(
      Array.from({ length: 13 }, (_, i) => ({ id: `a${i}`, name: `NoVA — Audit — x${i}`, createdMs: 100 + i })),
      [{ id: 'other', name: 'Catatan peribadi', createdMs: 0 }],
    )
    const del = backupsToDelete(files, 12)
    expect(del.sort()).toEqual(['a0', 'd0', 'd1', 'd2'].sort())
    expect(del).not.toContain('other')
  })
})
