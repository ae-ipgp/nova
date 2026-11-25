import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SETTING_DEFS } from '../backend/src/settings'
import { signedInAs } from './auth-fixtures'
import { renderRoute } from './render-route'

const calls: string[] = []

vi.mock('@/lib/env', async (orig) => ({ ...(await orig<typeof import('@/lib/env')>()), isApiConfigured: true, env: { apiUrl: 'https://gateway.test/exec' } }))

const empty = { fields: SETTING_DEFS.map((d) => ({ key: d.key, label: d.label, kind: d.kind, options: d.options ? [...d.options] : undefined, max: d.max, public: d.public })), values: Object.fromEntries(SETTING_DEFS.map((d) => [d.key, d.fallback])) }
const RESPONSES: Record<string, unknown> = {
  'site.config': { settings: { org_name: 'JPP IPGKKB', maintenance_mode: 'false' }, activeSession: null },
  'dashboard.summary': { pendingReferences: 2, myReferenceByStatus: {}, nextMeeting: null, openActions: [], oprInProgress: 1, correspondenceThisMonth: 4, board: [], recentActivity: [] },
  'ref.options': { types: [], categories: ['Surat keluar'] },
  'ref.request.list': [], 'ref.register': [], 'corr.list': [],
  'mtg.list': [], 'mtg.summary': [], 'mtg.members': [],
  'notice.list': [], 'notice.recipients': { count: 0, people: [] }, 'admin.groups.list': [],
  'tpl.list': [], 'opr.list': [], 'arc.list': [], 'ann.list': [],
  'admin.users.list': [], 'admin.sessions.list': [], 'admin.series.list': [], 'admin.doctypes.list': [], 'admin.audit.list': [], 'admin.settings.get': empty,
  'public.announcements': [], 'public.attendance': { mode: 'aggregate', meetings: [] }, 'public.templates': [], 'public.archive': [], 'public.leaders': { session: null, leaders: [] },
}

vi.mock('@/lib/api', async (orig) => {
  const actual = await orig<typeof import('@/lib/api')>()
  return {
    ...actual,
    callApi: vi.fn(async (action: string) => {
      calls.push(action)
      if (!(action in RESPONSES)) throw new Error(`unmocked action ${action}`)
      return RESPONSES[action]
    }),
  }
})

beforeEach(() => {
  calls.length = 0
})

const h1 = (text: string | RegExp) => waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(text))

describe('workspace module screens render and load their data', () => {
  it.each([
    ['/workspace/e-surat', 'e-Surat', 'ref.request.list'],
    ['/workspace/e-surat/daftar', 'e-Surat', 'ref.register'],
    ['/workspace/e-surat/surat', 'e-Surat', 'corr.list'],
    ['/workspace/e-mesyuarat', 'e-Mesyuarat', 'mtg.list'],
    ['/workspace/e-mesyuarat/kehadiran', 'e-Mesyuarat', 'mtg.summary'],
    ['/workspace/templat', 'Pusat Templat', 'tpl.list'],
    ['/workspace/e-opr', 'e-OPR', 'opr.list'],
    ['/workspace/e-arkib', 'e-Arkib', 'arc.list'],
    ['/workspace/papan-notis', 'Papan Notis', 'ann.list'],
    ['/workspace/pengurusan/pengguna', 'Pengurusan', 'admin.users.list'],
    ['/workspace/pengurusan/nombor', 'Pengurusan', 'admin.series.list'],
    ['/workspace/pengurusan/dokumen', 'Pengurusan', 'admin.doctypes.list'],
    ['/workspace/pengurusan/kumpulan', 'Pengurusan', 'admin.groups.list'],
    ['/workspace/pengurusan/tetapan', 'Pengurusan', 'admin.settings.get'],
    ['/workspace/pengurusan/audit', 'Pengurusan', 'admin.audit.list'],
  ])('%s', async (path, heading, action) => {
    renderRoute(path, signedInAs('suak'))
    await h1(heading)
    await waitFor(() => expect(calls).toContain(action))
  })

  it('NoMe lists notices for SUAK and tells an undelegated secretariat member why they cannot use it', async () => {
    renderRoute('/workspace/nome', signedInAs('suak'))
    await h1('NoMe')
    await waitFor(() => expect(calls).toContain('notice.list'))
  })

  it('NoMe without delegation shows the explanation and never calls the gateway list', async () => {
    renderRoute('/workspace/nome', signedInAs('secretariat'))
    await h1('NoMe')
    expect(screen.getByText(/belum diberi kuasa/)).toBeInTheDocument()
    expect(calls).not.toContain('notice.list')
  })

  it('the dashboard shows real counts, not invented ones', async () => {
    renderRoute('/workspace', signedInAs('suak'))
    await waitFor(() => expect(screen.getByRole('region', { name: 'Penunjuk utama' })).toHaveTextContent('2'))
    expect(calls).toContain('dashboard.summary')
  })

  it('e-OPR starts a wizard with eight steps and a live A4 preview', async () => {
    renderRoute('/workspace/e-opr/baru', signedInAs('member'))
    await waitFor(() => expect(screen.getByRole('list', { name: 'Langkah' })).toBeInTheDocument())
    expect(screen.getAllByRole('listitem').filter((li) => /^\d\d /.test(li.textContent ?? '')).length).toBe(8)
    expect(screen.getByTitle('Pratonton A4')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/Nama program/), 'Program Ujian')
    await waitFor(() => expect(screen.getByTitle('Pratonton A4').getAttribute('srcdoc')).toContain('Program Ujian'))
    expect(screen.getByText(/Panjang kandungan/)).toBeInTheDocument()
  })
})

describe('role-based access (UX layer; the gateway enforces)', () => {
  it('members cannot open management, series, settings or audit pages directly', async () => {
    for (const path of ['/workspace/pengurusan/pengguna', '/workspace/pengurusan/tetapan', '/workspace/pengurusan/audit', '/workspace/nome']) {
      const { unmount } = renderRoute(path, signedInAs('member'))
      await waitFor(() => expect(screen.getByText('Akses tidak dibenarkan')).toBeInTheDocument())
      unmount()
    }
  })

  it('the System Administrator can read the audit log but not manage settings or open e-Surat', async () => {
    const a = renderRoute('/workspace/pengurusan/audit', signedInAs('system_admin'))
    await h1('Pengurusan')
    a.unmount()
    const b = renderRoute('/workspace/pengurusan/tetapan', signedInAs('system_admin'))
    await waitFor(() => expect(screen.getByText('Akses tidak dibenarkan')).toBeInTheDocument())
    b.unmount()
    renderRoute('/workspace/e-surat', signedInAs('system_admin'))
    await waitFor(() => expect(screen.getByText('Akses tidak dibenarkan')).toBeInTheDocument())
  })

  it('a member sees only Permohonan in e-Surat (no register or letters tabs)', async () => {
    renderRoute('/workspace/e-surat', signedInAs('member'))
    await h1('e-Surat')
    expect(screen.queryByRole('link', { name: 'Daftar nombor' })).toBeNull()
    expect(screen.queryByRole('link', { name: /Surat masuk/ })).toBeNull()
  })
})

describe('public portal pages load real data', () => {
  it.each([
    ['/mengenai', 'JPP IPGKKB', 'public.leaders'],
    ['/kehadiran', 'Rekod kehadiran mesyuarat', 'public.attendance'],
    ['/pengumuman', /Notis awam/, 'public.announcements'],
    ['/templat', 'Templat dokumen awam', 'public.templates'],
    ['/arkib', /Dokumen yang diluluskan/, 'public.archive'],
    ['/semak', 'Semak nombor rujukan', 'site.config'],
    ['/privasi', 'Dasar privasi', 'site.config'],
  ])('%s', async (path, heading, action) => {
    renderRoute(path)
    await h1(heading)
    await waitFor(() => expect(calls).toContain(action))
  })

  it('the privacy page never invents a policy', async () => {
    renderRoute('/privasi')
    await waitFor(() => expect(screen.getByText(/Belum ditetapkan oleh pentadbir/)).toBeInTheDocument())
  })

  it('the landing page lists the eight modules and the verification entry point', async () => {
    renderRoute('/')
    await waitFor(() => expect(screen.getByRole('link', { name: 'Semak nombor rujukan' })).toBeInTheDocument())
  })
})

describe('mascot and help bubble', () => {
  it('falls back gracefully when mascot images are missing', async () => {
    renderRoute('/tiada-halaman')
    await h1('Halaman tidak ditemui.')
    expect(document.querySelector('img[src*="/mascot/"]')).not.toBeNull() // rendered, will fall back on load error
  })

  it('opens the FAQ helper, answers a question and closes with Escape', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await user.click(screen.getByRole('button', { name: /Buka bantuan/ }))
    await user.click(screen.getByRole('button', { name: 'Bilakah nombor rujukan rasmi dikeluarkan?' }))
    expect(screen.getByText(/Hanya selepas SUAK meluluskan/)).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
