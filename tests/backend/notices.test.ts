import { describe, expect, it } from 'vitest'
import { Gateway, SUAK } from './harness'

const NOTICE = { type: 'meeting_notice' as const, subject: 'Notis Mesyuarat', body: 'Sila hadir.\n\nTerima kasih.', eventAt: '2026-12-01T10:00:00+08:00', location: 'Bilik JPP', recipientSpec: { all: true } }

function setup() {
  const gw = Gateway.withSuak()
  const prep = gw.member('prep', ['secretariat'])
  const ali = gw.member('ali', ['member'], { bureau: 'Akademik' })
  gw.member('bob', ['member'], { bureau: 'Sukan' })
  gw.grant(prep, 'nome.prepare')
  return { gw, prep, ali }
}

describe('NoMe permissions (NME-04)', () => {
  it('secretariat without delegation cannot even prepare; members cannot see NoMe', () => {
    const { gw, ali } = setup()
    const plain = gw.member('plain', ['secretariat'])
    expect(gw.errorCode('notice.save', NOTICE, plain)).toBe('FORBIDDEN')
    expect(gw.errorCode('notice.list', {}, plain)).toBe('FORBIDDEN')
    expect(gw.errorCode('notice.list', {}, ali)).toBe('FORBIDDEN')
  })

  it('a preparer can draft and mark ready but cannot send', () => {
    const { gw, prep } = setup()
    const n = gw.ok('notice.save', NOTICE, prep)
    expect(n).toMatchObject({ status: 'draft', recipientCount: 4 })
    expect(gw.ok('notice.markReady', { id: n.id }, prep).status).toBe('ready')
    expect(gw.errorCode('notice.send', { id: n.id, confirmCount: 4 }, prep)).toBe('FORBIDDEN')
    expect(gw.services.sent).toHaveLength(0)
  })

  it('a delegated sender can send; SUAK always can', () => {
    const { gw, prep } = setup()
    gw.grant(prep, 'nome.send')
    const n = gw.ok('notice.save', NOTICE, prep)
    expect(gw.ok('notice.send', { id: n.id, confirmCount: 4 }, prep).status).toBe('sent')
    const n2 = gw.ok('notice.save', NOTICE, SUAK.id)
    expect(gw.ok('notice.send', { id: n2.id, confirmCount: 4 }, SUAK.id).status).toBe('sent')
  })
})

describe('sending', () => {
  it('sends ONE separate, escaped copy per recipient and logs each (NME-06)', () => {
    const { gw, prep } = setup()
    const n = gw.ok('notice.save', { ...NOTICE, subject: 'Notis <b>penting</b>', body: 'A <script>x</script>' }, prep)
    gw.ok('notice.send', { id: n.id, confirmCount: 4 }, SUAK.id)
    expect(gw.services.sent).toHaveLength(4)
    expect(new Set(gw.services.sent.map((m) => m.to)).size).toBe(4)
    const first = gw.services.sent.find((m) => m.to === 'ali@moe-dl.edu.my')!
    expect(first.html).not.toContain('<script>')
    expect(first.html).toContain('&lt;script&gt;')
    expect(first.html).toContain('Kepada Nama ali')
    expect(first.text).toContain('Lokasi: Bilik JPP')
    expect(gw.rows('email_logs').filter((l) => l.event_type === 'sent')).toHaveLength(4)
    expect(gw.rows('notice_recipients').every((r) => r.delivery_status === 'sent')).toBe(true)
  })

  it('requires the confirmed audience size to match (guards against wrong recipients)', () => {
    const { gw, prep } = setup()
    const n = gw.ok('notice.save', NOTICE, prep)
    expect(gw.errorCode('notice.send', { id: n.id, confirmCount: 2 }, SUAK.id)).toBe('CONFLICT')
    expect(gw.services.sent).toHaveLength(0)
  })

  it('never sends the same notice twice', () => {
    const { gw, prep } = setup()
    const n = gw.ok('notice.save', NOTICE, prep)
    gw.ok('notice.send', { id: n.id, confirmCount: 4 }, SUAK.id)
    expect(gw.errorCode('notice.send', { id: n.id, confirmCount: 4 }, SUAK.id)).toBe('CONFLICT')
    expect(gw.services.sent).toHaveLength(4)
  })

  it('records failures, reports partial status and retries only the failed ones (NME-07)', () => {
    const { gw, prep } = setup()
    gw.services.failFor.add('bob@moe-dl.edu.my')
    const n = gw.ok('notice.save', NOTICE, prep)
    const r = gw.ok('notice.send', { id: n.id, confirmCount: 4 }, SUAK.id)
    expect(r).toMatchObject({ status: 'partial', sentCount: 3, failedCount: 1 })
    expect(gw.ok('notice.deliveries', { id: n.id }, SUAK.id).find((d) => d.status === 'failed')?.error).toBe('Invalid address')
    gw.services.failFor.clear()
    const retried = gw.ok('notice.retry', { id: n.id }, SUAK.id)
    expect(retried).toMatchObject({ status: 'sent', sentCount: 4, failedCount: 0 })
    expect(gw.services.sent).toHaveLength(4) // 3 first time + only the failed one on retry
    expect(gw.errorCode('notice.retry', { id: n.id }, SUAK.id)).toBe('CONFLICT')
  })

  it('refuses to send when the daily mail quota is too low', () => {
    const { gw, prep } = setup()
    gw.services.quota = 2
    const n = gw.ok('notice.save', NOTICE, prep)
    expect(gw.errorCode('notice.send', { id: n.id, confirmCount: 4 }, SUAK.id)).toBe('CONFLICT')
    expect(gw.services.sent).toHaveLength(0)
  })

  it('only emails registered, non-suspended people', () => {
    const { gw, prep } = setup()
    const pid = gw.rows('profiles').find((p) => p.email === 'bob@moe-dl.edu.my')!.id
    gw.ok('admin.users.setStatus', { profileId: pid, status: 'suspended' }, SUAK.id) // bob must be active first
    const n = gw.ok('notice.save', NOTICE, prep)
    expect(n.recipientCount).toBe(3)
  })

  it('maintenance mode blocks everyone except SUAK', () => {
    const { gw, prep } = setup()
    gw.ok('admin.settings.set', { values: { maintenance_mode: 'true', maintenance_message: 'Sedang naik taraf' } }, SUAK.id)
    const res = gw.call('notice.save', NOTICE, prep)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res).toMatchObject({ error: { code: 'FORBIDDEN', message: 'Sedang naik taraf' } })
    expect(gw.errorCode('notice.save', NOTICE, SUAK.id)).toBeNull()
  })
})

describe('recipient selection', () => {
  it('selects by role, bureau, saved group and individual, without duplicates (NME-02)', () => {
    const { gw, prep } = setup()
    const ids = Object.fromEntries(gw.rows('profiles').map((p) => [p.email.split('@')[0], p.id]))
    expect(gw.ok('notice.recipients', { spec: { roles: ['secretariat'] } }, prep).count).toBe(1)
    expect(gw.ok('notice.recipients', { spec: { bureaus: ['Akademik'] } }, prep).people.map((x) => x.name)).toEqual(['Nama ali'])
    const groups = gw.ok('admin.groups.save', { name: 'Biro', profileIds: [ids.ali, ids.bob], active: true }, SUAK.id)
    expect(gw.ok('notice.recipients', { spec: { groupIds: [groups[0].id], profileIds: [ids.ali, ids.prep] } }, prep).count).toBe(3)
  })

  it('masks email addresses in previews', () => {
    const { gw, prep } = setup()
    const p = gw.ok('notice.recipients', { spec: { all: true } }, prep).people[0]
    expect(p.emailMasked).toMatch(/\*/)
    expect(p.emailMasked).not.toBe('ali@moe-dl.edu.my')
  })

  it('caps recipients per notice', () => {
    const { gw, prep } = setup()
    const rows = gw.io.data.get('profiles')!
    const header = rows[0] as string[]
    for (let i = 0; i < 160; i++) {
      const r = header.map(() => '')
      r[header.indexOf('id')] = `bulk-${i}`
      r[header.indexOf('email')] = `bulk${i}@moe-dl.edu.my`
      r[header.indexOf('full_name')] = `Bulk ${i}`
      r[header.indexOf('account_status')] = 'active'
      rows.push(r)
    }
    expect(gw.errorCode('notice.save', NOTICE, prep)).toBe('BAD_REQUEST')
  })
})

describe('scheduling', () => {
  it('schedules, then a time-driven run sends it once the time has come', async () => {
    const { processScheduledNotices } = await import('../../backend/src/actions/notices')
    const { TableStore } = await import('../../backend/src/store')
    const { gw, prep } = setup()
    gw.grant(prep, 'nome.send')
    const n = gw.ok('notice.save', { ...NOTICE, scheduledAt: '2026-11-17T09:00:00.000Z' }, prep)
    expect(gw.ok('notice.send', { id: n.id, confirmCount: 4 }, prep).status).toBe('scheduled')
    const run = () => processScheduledNotices(new TableStore(gw.io), gw.services, gw.clock, gw.deps.uuid)
    expect(run()).toBe(0)
    gw.clock = new Date('2026-11-17T09:05:00.000Z')
    expect(run()).toBe(1)
    expect(run()).toBe(0)
    expect(gw.services.sent).toHaveLength(4)
    expect(gw.ok('notice.get', { id: n.id }, prep).status).toBe('sent')
  })

  it('rejects a send time in the past, and cancelled notices never send', () => {
    const { gw, prep } = setup()
    expect(gw.errorCode('notice.save', { ...NOTICE, scheduledAt: '2026-11-15T09:00:00.000Z' }, prep)).toBe('BAD_REQUEST')
    const n = gw.ok('notice.save', NOTICE, prep)
    gw.ok('notice.cancel', { id: n.id }, prep)
    expect(gw.errorCode('notice.send', { id: n.id, confirmCount: 4 }, SUAK.id)).toBe('CONFLICT')
  })
})
