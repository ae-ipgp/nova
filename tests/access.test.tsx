import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { liveAuth, me, signedInAs } from './auth-fixtures'
import { renderRoute } from './render-route'

describe('workspace gate', () => {
  it('sends signed-out visitors to login and remembers where they were going', async () => {
    const { router } = renderRoute('/workspace/e-surat', liveAuth({ status: 'signed_out' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/log-masuk'))
    expect(router.state.location.search).toBe('?next=%2Fworkspace%2Fe-surat')
  })

  it('explains when a DELIMa account is not registered', () => {
    renderRoute('/workspace', liveAuth({ status: 'signed_in', me: me({ status: 'unregistered', profile: null, roles: [] }) }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Akaun belum didaftarkan')
    expect(screen.getByText('ali@moe-dl.edu.my')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log keluar' })).toBeInTheDocument()
  })

  it('explains when an account is suspended', () => {
    renderRoute('/workspace', liveAuth({ status: 'signed_in', me: me({ status: 'inactive', roles: [] }) }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Akaun tidak aktif')
  })

  it('shows gateway errors with a retry', () => {
    const auth = liveAuth({ status: 'error', message: 'Sistem sedang sibuk.' })
    renderRoute('/workspace', auth)
    expect(screen.getByText('Sistem sedang sibuk.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cuba lagi' })).toBeInTheDocument()
  })

  it('is unavailable in a production build without configuration', () => {
    renderRoute('/workspace', { ...liveAuth({ status: 'signed_out' }), mode: 'unconfigured' })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ruang kerja belum tersedia')
  })

  it('shows the active session and profile for a signed-in member', async () => {
    const user = userEvent.setup()
    const auth = signedInAs('member')
    renderRoute('/workspace', auth)
    expect(screen.getAllByText('Legasi Ke-72').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Menu profil: Ali Ahmad' }))
    await user.click(screen.getByRole('button', { name: 'Log keluar' }))
    expect(auth.signOut).toHaveBeenCalled()
  })
})

describe('role-based navigation and pages (UX layer)', () => {
  it('hides Pengurusan and NoMe from members and blocks direct URLs', () => {
    renderRoute('/workspace/pengurusan/pengguna', signedInAs('member'))
    expect(screen.queryByRole('link', { name: 'Pengurusan' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'NoMe' })).toBeNull()
    expect(screen.getByText('Akses tidak dibenarkan')).toBeInTheDocument()
  })

  it('lets the System Administrator see sessions but not users', async () => {
    const { router } = renderRoute('/workspace/pengurusan', signedInAs('system_admin'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/workspace/pengurusan/sesi'))
    expect(screen.queryByRole('link', { name: 'Pengguna' })).toBeNull()
  })

  it('takes SUAK to user management', async () => {
    const { router } = renderRoute('/workspace/pengurusan', signedInAs('suak'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/workspace/pengurusan/pengguna'))
  })
})

describe('login page', () => {
  it('starts DELIMa sign-in and keeps the requested destination', async () => {
    const user = userEvent.setup()
    const auth = liveAuth({ status: 'signed_out' })
    renderRoute('/log-masuk?next=/workspace/e-arkib', auth)
    await user.click(screen.getByRole('button', { name: /Log masuk dengan DELIMa/ }))
    expect(auth.signIn).toHaveBeenCalledWith('/workspace/e-arkib')
  })

  it('ignores off-site destinations', async () => {
    const user = userEvent.setup()
    const auth = liveAuth({ status: 'signed_out' })
    renderRoute('/log-masuk?next=//evil.example', auth)
    await user.click(screen.getByRole('button', { name: /Log masuk dengan DELIMa/ }))
    expect(auth.signIn).toHaveBeenCalledWith('/workspace')
  })

  it('sends already signed-in users straight on', async () => {
    const { router } = renderRoute('/log-masuk?next=/workspace/e-opr', signedInAs('member'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/workspace/e-opr'))
  })
})
