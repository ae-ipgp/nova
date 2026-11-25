import { describe, expect, it } from 'vitest'
import { Gateway, SUAK } from './harness'

const MEETING = { title: 'Mesyuarat AMT 1/2026', meetingType: 'Mesyuarat AMT', startsAt: '2026-12-01T10:00:00+08:00', endsAt: '2026-12-01T12:00:00+08:00', location: 'Bilik JPP' }

function setup() {
  const gw = Gateway.withSuak()
  const sec = gw.member('sek', ['secretariat'], { position: 'Setiausaha', bureau: 'Sekretariat' })
  const a = gw.member('ali', ['member'], { position: 'Ahli', bureau: 'Akademik' })
  const b = gw.member('bob', ['member'], { position: 'Ahli', bureau: 'Sukan' })
  const c = gw.member('cik', ['member'], { position: 'Ahli', bureau: 'Sukan' })
  for (const t of [sec, a, b, c]) gw.ok('auth.me', {}, t) // first sign-in activates
  const m = gw.ok('mtg.save', MEETING, sec)
  const memberId = (name: string) => m.invitees.find((i) => i.name === `Nama ${name}`)!.memberId
  return { gw, sec, a, b, c, m, memberId }
}

describe('meeting creation', () => {
  it('invites every active member by default and snapshots their position (MTG-02)', () => {
    const { m } = setup()
    expect(m.invitees.map((i) => i.name)).toEqual(['Nama ali', 'Nama bob', 'Nama cik', 'Nama sek'])
    expect(m.invitees.every((i) => i.status === 'pending')).toBe(true)
    expect(m.invitees.find((i) => i.name === 'Nama ali')).toMatchObject({ position: 'Ahli', bureau: 'Akademik' })
  })

  it('freezes the snapshot: later changes to a member do not rewrite history', () => {
    const { gw, m, a } = setup()
    const pid = gw.rows('profiles').find((p) => p.email === 'ali@moe-dl.edu.my')!.id
    gw.ok('admin.users.setMembership', { profileId: pid, position: 'Pengerusi', bureau: 'Baru', publicListing: false }, SUAK.id)
    const again = gw.ok('mtg.get', { id: m.meeting.id }, gw.member('sek2', ['secretariat']))
    expect(again.invitees.find((i) => i.name === 'Nama ali')).toMatchObject({ position: 'Ahli', bureau: 'Akademik' })
    void a
  })

  it('validates times, place and link', () => {
    const { gw, sec } = setup()
    expect(gw.errorCode('mtg.save', { ...MEETING, endsAt: MEETING.startsAt }, sec)).toBe('BAD_REQUEST')
    expect(gw.errorCode('mtg.save', { ...MEETING, location: '' }, sec)).toBe('BAD_REQUEST')
    expect(gw.errorCode('mtg.save', { ...MEETING, link: 'http://x' }, sec)).toBe('BAD_REQUEST')
    expect(gw.errorCode('mtg.save', { ...MEETING, meetingType: 'Lain' }, sec)).toBe('BAD_REQUEST')
  })

  it('members cannot create meetings and only see meetings they are invited to', () => {
    const { gw, a, m } = setup()
    expect(gw.errorCode('mtg.save', MEETING, a)).toBe('FORBIDDEN')
    expect(gw.ok('mtg.list', {}, a)).toHaveLength(1)
    const outsider = gw.member('luar', ['member'])
    gw.ok('auth.me', {}, outsider)
    expect(gw.ok('mtg.list', {}, outsider)).toHaveLength(0)
    expect(gw.errorCode('mtg.get', { id: m.meeting.id }, outsider)).toBe('NOT_FOUND')
  })

  it('cancelling needs a reason and blocks further edits', () => {
    const { gw, sec, m } = setup()
    expect(gw.errorCode('mtg.cancel', { id: m.meeting.id, reason: 'x' }, sec)).toBe('BAD_REQUEST')
    expect(gw.ok('mtg.cancel', { id: m.meeting.id, reason: 'Cuaca buruk' }, sec).meeting.status).toBe('cancelled')
    expect(gw.errorCode('mtg.save', { ...MEETING, id: m.meeting.id }, sec)).toBe('CONFLICT')
  })
})

describe('attendance', () => {
  it('records statuses; excused needs a private reason', () => {
    const { gw, sec, m, memberId } = setup()
    expect(gw.errorCode('mtg.attendance.set', { meetingId: m.meeting.id, entries: [{ memberId: memberId('ali'), status: 'excused' }] }, sec)).toBe('BAD_REQUEST')
    const d = gw.ok('mtg.attendance.set', { meetingId: m.meeting.id, entries: [{ memberId: memberId('ali'), status: 'excused', reason: 'Sakit' }, { memberId: memberId('bob'), status: 'present' }] }, sec)
    expect(d.invitees.find((i) => i.name === 'Nama ali')).toMatchObject({ status: 'excused', reason: 'Sakit', verified: false })
  })

  it('hides reasons and other members’ attendance from ordinary members', () => {
    const { gw, sec, a, m, memberId } = setup()
    gw.ok('mtg.attendance.set', { meetingId: m.meeting.id, entries: [{ memberId: memberId('ali'), status: 'excused', reason: 'Sakit' }, { memberId: memberId('bob'), status: 'absent_without_reason' }] }, sec)
    const view = gw.ok('mtg.get', { id: m.meeting.id }, a)
    expect(view.invitees).toHaveLength(1)
    expect(view.invitees[0].reason).toBe('')
    expect(view.canManage).toBe(false)
  })

  it('verification needs every member recorded or exempted, and the delegated area (MTG-05)', () => {
    const { gw, sec, m, memberId } = setup()
    expect(gw.errorCode('mtg.attendance.verify', { meetingId: m.meeting.id }, sec)).toBe('FORBIDDEN')
    gw.grant(sec, 'meetings.verify')
    expect(gw.errorCode('mtg.attendance.verify', { meetingId: m.meeting.id }, sec)).toBe('CONFLICT') // all pending
    gw.ok('mtg.attendance.set', { meetingId: m.meeting.id, entries: ['ali', 'bob', 'cik', 'sek'].map((n) => ({ memberId: memberId(n), status: 'present' as const })) }, sec)
    const d = gw.ok('mtg.attendance.verify', { meetingId: m.meeting.id }, sec)
    expect(d.invitees.every((i) => i.verified && i.verifiedBy === 'Nama sek')).toBe(true)
  })

  it('correcting verified attendance needs permission, a reason, and is audited (AT-06)', () => {
    const { gw, sec, m, memberId } = setup()
    const rec = ['ali', 'bob', 'cik', 'sek'].map((n) => ({ memberId: memberId(n), status: 'present' as const }))
    gw.ok('mtg.attendance.set', { meetingId: m.meeting.id, entries: rec }, sec)
    gw.ok('mtg.attendance.verify', { meetingId: m.meeting.id }, SUAK.id)
    const change = { meetingId: m.meeting.id, entries: [{ memberId: memberId('ali'), status: 'absent_without_reason' as const }] }
    expect(gw.errorCode('mtg.attendance.set', change, sec)).toBe('FORBIDDEN')
    expect(gw.errorCode('mtg.attendance.set', change, SUAK.id)).toBe('BAD_REQUEST') // no reason
    const d = gw.ok('mtg.attendance.set', { ...change, editReason: 'Salah rekod' }, SUAK.id)
    expect(d.invitees.find((i) => i.name === 'Nama ali')?.status).toBe('absent_without_reason')
    const log = gw.rows('audit_logs').find((x) => x.action === 'attendance.correct')!
    expect(JSON.parse(log.before_json)).toMatchObject({ status: 'present' })
    expect(JSON.parse(log.after_json)).toMatchObject({ status: 'absent_without_reason', editReason: 'Salah rekod' })
  })

  it('exemption needs a reason, removes the member from the denominator and cannot change after verification (MTG-09)', () => {
    const { gw, sec, m, memberId } = setup()
    expect(gw.errorCode('mtg.exempt', { meetingId: m.meeting.id, memberId: memberId('ali'), reason: 'x' }, sec)).toBe('BAD_REQUEST')
    const d = gw.ok('mtg.exempt', { meetingId: m.meeting.id, memberId: memberId('ali'), reason: 'Latihan industri', until: '2027-01-31' }, sec)
    expect(d.invitees.find((i) => i.name === 'Nama ali')).toMatchObject({ status: 'exempted', exemptReason: 'Latihan industri' })
    expect(gw.errorCode('mtg.attendance.set', { meetingId: m.meeting.id, entries: [{ memberId: memberId('ali'), status: 'present' }] }, sec)).toBe('CONFLICT')
    const cleared = gw.ok('mtg.exempt', { meetingId: m.meeting.id, memberId: memberId('ali'), reason: 'x', clear: true }, sec)
    expect(cleared.invitees.find((i) => i.name === 'Nama ali')?.status).toBe('pending')
  })

  it('computes the rate with an explicit denominator (MTG-10)', () => {
    const { gw, sec, m, memberId } = setup()
    const m2 = gw.ok('mtg.save', { ...MEETING, title: 'Kedua', startsAt: '2026-12-08T10:00:00+08:00', endsAt: '2026-12-08T11:00:00+08:00' }, sec)
    const id2 = (n: string) => m2.invitees.find((i) => i.name === `Nama ${n}`)!.memberId
    gw.ok('mtg.attendance.set', { meetingId: m.meeting.id, entries: [{ memberId: memberId('ali'), status: 'present' }] }, sec)
    gw.ok('mtg.attendance.set', { meetingId: m2.meeting.id, entries: [{ memberId: id2('ali'), status: 'late' }] }, sec)
    gw.ok('mtg.exempt', { meetingId: m.meeting.id, memberId: memberId('bob'), reason: 'Cuti panjang' }, sec)
    const rows = gw.ok('mtg.summary', {}, sec)
    expect(rows.find((r) => r.name === 'Nama ali')).toMatchObject({ present: 1, late: 1, attended: 2, eligible: 2, percent: 100 })
    expect(rows.find((r) => r.name === 'Nama bob')).toMatchObject({ exempted: 1, eligible: 0, percent: null })
    // Setting off: late no longer counts as attended, but is still shown separately.
    gw.ok('admin.settings.set', { values: { late_counts_as_present: 'false' } }, SUAK.id)
    expect(gw.ok('mtg.summary', {}, sec).find((r) => r.name === 'Nama ali')).toMatchObject({ late: 1, attended: 1, percent: 50 })
  })

  it('members only get their own summary row', () => {
    const { gw, a } = setup()
    expect(gw.ok('mtg.summary', {}, a).map((r) => r.name)).toEqual(['Nama ali'])
  })
})

describe('public attendance privacy (AT-07, MTG-08)', () => {
  function published(gw: Gateway, sec: string, m: Awaited<ReturnType<typeof setup>>['m'], memberId: (n: string) => string) {
    gw.ok('mtg.attendance.set', { meetingId: m.meeting.id, entries: [
      { memberId: memberId('ali'), status: 'present' },
      { memberId: memberId('bob'), status: 'excused', reason: 'SENSITIF-ALASAN' },
      { memberId: memberId('cik'), status: 'absent_without_reason' },
      { memberId: memberId('sek'), status: 'late' },
    ] }, sec)
    gw.ok('mtg.attendance.verify', { meetingId: m.meeting.id }, SUAK.id)
  }

  it('shows nothing until SUAK publishes, and only verified data', () => {
    const { gw, sec, m, memberId } = setup()
    published(gw, sec, m, memberId)
    expect(gw.ok('public.attendance', {}).meetings).toHaveLength(0)
    expect(gw.errorCode('mtg.publish', { id: m.meeting.id, publish: true }, sec)).toBe('FORBIDDEN')
    gw.ok('mtg.publish', { id: m.meeting.id, publish: true }, SUAK.id)
    const pub = gw.ok('public.attendance', {})
    expect(pub.mode).toBe('aggregate')
    expect(pub.meetings[0].counts).toEqual({ present: 1, late: 1, excused: 1, absent: 1 })
    expect(pub.meetings[0].rows).toBeUndefined()
  })

  it('refuses to publish unverified attendance', () => {
    const { gw, m } = setup()
    expect(gw.errorCode('mtg.publish', { id: m.meeting.id, publish: true }, SUAK.id)).toBe('CONFLICT')
  })

  it('in "named" mode shows names and statuses but never private reasons or emails', () => {
    const { gw, sec, m, memberId } = setup()
    published(gw, sec, m, memberId)
    gw.ok('mtg.publish', { id: m.meeting.id, publish: true }, SUAK.id)
    gw.ok('admin.settings.set', { values: { public_attendance_mode: 'named' } }, SUAK.id)
    const pub = gw.ok('public.attendance', {})
    expect(pub.meetings[0].rows?.find((r) => r.name === 'Nama bob')).toEqual({ name: 'Nama bob', position: 'Ahli', bureau: 'Sukan', status: 'excused' })
    const json = JSON.stringify(pub)
    expect(json).not.toContain('SENSITIF-ALASAN')
    expect(json).not.toContain('@moe-dl.edu.my')
  })

  it('withdrawing publication removes it again', () => {
    const { gw, sec, m, memberId } = setup()
    published(gw, sec, m, memberId)
    gw.ok('mtg.publish', { id: m.meeting.id, publish: true }, SUAK.id)
    gw.ok('mtg.publish', { id: m.meeting.id, publish: false }, SUAK.id)
    expect(gw.ok('public.attendance', {}).meetings).toHaveLength(0)
  })
})

describe('agenda, minutes and actions', () => {
  it('replaces the agenda without deleting rows', () => {
    const { gw, sec, m } = setup()
    gw.ok('mtg.agenda.save', { meetingId: m.meeting.id, items: [{ title: 'A', presenter: 'X', notes: '' }, { title: 'B', presenter: '', notes: '' }, { title: 'C', presenter: '', notes: '' }] }, sec)
    const d = gw.ok('mtg.agenda.save', { meetingId: m.meeting.id, items: [{ title: 'Baru', presenter: '', notes: '' }] }, sec)
    expect(d.agenda.map((a) => a.title)).toEqual(['Baru'])
    expect(gw.rows('meeting_agendas')).toHaveLength(3)
    expect(gw.errorCode('mtg.agenda.save', { meetingId: m.meeting.id, items: [{ title: '' }] }, sec)).toBe('BAD_REQUEST')
  })

  it('minutes go draft → submitted → approved by SUAK; members see only approved minutes', () => {
    const { gw, sec, a, m } = setup()
    gw.ok('mtg.minutes.save', { meetingId: m.meeting.id, content: 'Draf minit', submit: false }, sec)
    expect(gw.ok('mtg.get', { id: m.meeting.id }, a).minutes).toBeNull()
    expect(gw.errorCode('mtg.minutes.approve', { meetingId: m.meeting.id }, SUAK.id)).toBe('CONFLICT')
    gw.ok('mtg.minutes.save', { meetingId: m.meeting.id, content: 'Minit akhir', submit: true }, sec)
    expect(gw.errorCode('mtg.minutes.approve', { meetingId: m.meeting.id }, sec)).toBe('FORBIDDEN')
    gw.ok('mtg.minutes.approve', { meetingId: m.meeting.id }, SUAK.id)
    expect(gw.ok('mtg.get', { id: m.meeting.id }, a).minutes).toMatchObject({ content: 'Minit akhir', approvalStatus: 'approved', version: 1 })
    // Editing approved minutes starts a new version.
    gw.ok('mtg.minutes.save', { meetingId: m.meeting.id, content: 'Pindaan', submit: false }, sec)
    expect(gw.rows('meeting_minutes')).toHaveLength(2)
    expect(gw.ok('mtg.get', { id: m.meeting.id }, a).minutes?.content).toBe('Minit akhir')
  })

  it('actions have an owner and due date; owners may only tick off their own (MTG-07)', () => {
    const { gw, sec, a, b, m } = setup()
    const ownerId = gw.rows('profiles').find((p) => p.email === 'ali@moe-dl.edu.my')!.id
    const d = gw.ok('mtg.action.save', { meetingId: m.meeting.id, description: 'Sediakan laporan', ownerId, dueDate: '2026-11-01', status: 'open' }, sec)
    expect(d.actions[0]).toMatchObject({ ownerName: 'Nama ali', overdue: true })
    const id = d.actions[0].id
    expect(gw.errorCode('mtg.action.save', { id, meetingId: m.meeting.id, description: 'x', ownerId, dueDate: '2027-01-01', status: 'done' }, b)).toBe('FORBIDDEN')
    expect(gw.ok('mtg.action.save', { id, meetingId: m.meeting.id, status: 'done' }, a).actions[0]).toMatchObject({ status: 'done', overdue: false, description: 'Sediakan laporan' })
    expect(gw.errorCode('mtg.action.save', { meetingId: m.meeting.id, description: 'x', ownerId, dueDate: '2027-01-01', status: 'open' }, a)).toBe('FORBIDDEN')
  })
})
