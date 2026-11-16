import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MODULES, workspacePath } from '@/config/modules'
import { renderRoute } from './render-route'

describe('public portal', () => {
  it('renders the landing hero and all eight modules', () => {
    renderRoute('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('The Secretariat, in Motion.')
    for (const m of MODULES) expect(screen.getAllByText(m.name).length).toBeGreaterThan(0)
  })

  it.each([
    ['/mengenai', 'Jawatankuasa Perwakilan Pelajar'],
    ['/kehadiran', 'Rekod kehadiran mesyuarat'],
    ['/pengumuman', 'Notis awam & makluman rasmi'],
    ['/templat', 'Templat dokumen awam'],
    ['/arkib', 'Dokumen yang diluluskan untuk penerbitan'],
  ])('renders %s', (path, heading) => {
    renderRoute(path)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(heading)
  })

  it('shows a 404 for unknown paths', () => {
    renderRoute('/tiada-laman')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Halaman tidak ditemui.')
  })
})

describe('login', () => {
  it('offers DELIMa sign-in only, disabled until Phase 1', () => {
    renderRoute('/log-masuk')
    expect(screen.getByRole('button', { name: /Log masuk dengan DELIMa/ })).toBeDisabled()
    expect(screen.getByText('@moe-dl.edu.my')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Kata laluan/)).toBeNull()
  })
})

describe('workspace shell', () => {
  it('renders the dashboard without invented figures', () => {
    renderRoute('/workspace')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your secretariat, at a glance.')
    const kpis = screen.getByRole('region', { name: 'Penunjuk utama' })
    expect(within(kpis).getAllByText('Tiada data')).toHaveLength(4)
    expect(within(kpis).queryByText(/^\s*\d[\d,.]*\s*$/)).toBeNull()
  })

  it.each(MODULES.filter((m) => m.slug !== '').map((m) => [workspacePath(m), m] as const))('renders %s placeholder', (path, m) => {
    renderRoute(path)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(m.name)
    for (const r of m.requirements) expect(screen.getByText(r.id)).toBeInTheDocument()
  })

  it('filters sidebar navigation by previewed role', async () => {
    const user = userEvent.setup()
    renderRoute('/workspace')
    const nav = screen.getAllByRole('complementary', { name: 'Navigasi ruang kerja' })[0]
    expect(within(nav).getByRole('link', { name: 'Pengurusan' })).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Pratonton navigasi sebagai peranan'), 'member')
    expect(within(nav).queryByRole('link', { name: 'Pengurusan' })).toBeNull()
    expect(within(nav).queryByRole('link', { name: 'NoMe' })).toBeNull()
    expect(within(nav).getByRole('link', { name: 'e-Surat' })).toBeInTheDocument()
  })
})
