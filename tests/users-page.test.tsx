import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserSummary } from '@shared/api-contract'
import { signedInAs } from './auth-fixtures'
import { renderRoute } from './render-route'

const calls: { action: string; payload: unknown; token?: string }[] = []
let users: UserSummary[] = []

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    callApi: vi.fn(async (action: string, payload: unknown, opts: { token?: string } = {}) => {
      calls.push({ action, payload, token: opts.token })
      if (action === 'admin.users.list') return users
      if (action === 'admin.users.register') {
        const p = payload as { email: string; fullName: string }
        if (p.email.startsWith('dup')) throw new actual.ApiError('CONFLICT', 'Akaun DELIMa ini telah didaftarkan.')
        const u: UserSummary = { profileId: 'new', email: p.email, fullName: p.fullName, accountStatus: 'invited', linked: false, roles: ['member'], areas: [], position: '', bureau: '', publicListing: false }
        users = [...users, u]
        return u
      }
      throw new Error(`unexpected ${action}`)
    }),
  }
})

const suakUser: UserSummary = {
  profileId: 'p-suak',
  email: 'suak@moe-dl.edu.my',
  fullName: 'Nur SUAK',
  accountStatus: 'active',
  linked: true,
  roles: ['suak'],
  areas: [],
  position: 'Setiausaha Agung Kehormat',
  bureau: '',
  publicListing: false,
}

beforeEach(() => {
  calls.length = 0
  users = [suakUser]
})

describe('Pengurusan › Pengguna', () => {
  it('lists users from the gateway with the signed-in token', async () => {
    renderRoute('/workspace/pengurusan/pengguna', signedInAs('suak'))
    expect(await screen.findByText('Nur SUAK')).toBeInTheDocument()
    expect(calls[0]).toEqual({ action: 'admin.users.list', payload: {}, token: 'token' })
  })

  it('validates DELIMa email before calling the gateway', async () => {
    const user = userEvent.setup()
    renderRoute('/workspace/pengurusan/pengguna', signedInAs('suak'))
    await screen.findByText('Nur SUAK')
    await user.click(screen.getByRole('button', { name: /Daftar pengguna/ }))
    const dialog = screen.getByRole('dialog', { name: 'Daftar pengguna' })
    await user.type(within(dialog).getByLabelText(/E-mel DELIMa/), 'ali@gmail.com')
    await user.type(within(dialog).getByLabelText(/Nama penuh/), 'Ali')
    await user.click(within(dialog).getByRole('button', { name: 'Daftar' }))
    expect(within(dialog).getByText(/Mesti akaun DELIMa/)).toBeInTheDocument()
    expect(calls.some((c) => c.action === 'admin.users.register')).toBe(false)
  })

  it('registers a user and refreshes the list', async () => {
    const user = userEvent.setup()
    renderRoute('/workspace/pengurusan/pengguna', signedInAs('suak'))
    await screen.findByText('Nur SUAK')
    await user.click(screen.getByRole('button', { name: /Daftar pengguna/ }))
    const dialog = screen.getByRole('dialog', { name: 'Daftar pengguna' })
    await user.type(within(dialog).getByLabelText(/E-mel DELIMa/), 'ali@moe-dl.edu.my')
    await user.type(within(dialog).getByLabelText(/Nama penuh/), 'Ali Ahmad')
    await user.click(within(dialog).getByRole('button', { name: 'Daftar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(calls.find((c) => c.action === 'admin.users.register')?.payload).toMatchObject({ email: 'ali@moe-dl.edu.my', fullName: 'Ali Ahmad', roles: ['member'] })
    expect(await screen.findByText('Ali Ahmad')).toBeInTheDocument()
  })

  it('keeps focus in the field being typed into (dialog regression)', async () => {
    const user = userEvent.setup()
    renderRoute('/workspace/pengurusan/pengguna', signedInAs('suak'))
    await screen.findByText('Nur SUAK')
    await user.click(screen.getByRole('button', { name: /Daftar pengguna/ }))
    const name = within(screen.getByRole('dialog')).getByLabelText(/Nama penuh/)
    await user.type(name, 'Siti Aminah')
    expect(name).toHaveValue('Siti Aminah')
    expect(name).toHaveFocus()
  })

  it('shows gateway conflicts inside the form', async () => {
    const user = userEvent.setup()
    renderRoute('/workspace/pengurusan/pengguna', signedInAs('suak'))
    await screen.findByText('Nur SUAK')
    await user.click(screen.getByRole('button', { name: /Daftar pengguna/ }))
    const dialog = screen.getByRole('dialog', { name: 'Daftar pengguna' })
    await user.type(within(dialog).getByLabelText(/E-mel DELIMa/), 'dup@moe-dl.edu.my')
    await user.type(within(dialog).getByLabelText(/Nama penuh/), 'Dup')
    await user.click(within(dialog).getByRole('button', { name: 'Daftar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Akaun DELIMa ini telah didaftarkan.')
  })

  it('asks for confirmation before suspending an account', async () => {
    const user = userEvent.setup()
    renderRoute('/workspace/pengurusan/pengguna', signedInAs('suak'))
    await user.click(await screen.findByRole('button', { name: 'Urus Nur SUAK' }))
    await user.click(screen.getByRole('button', { name: 'Gantung' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Gantung akaun Nur SUAK?')
    expect(calls.some((c) => c.action === 'admin.users.setStatus')).toBe(false)
  })
})
