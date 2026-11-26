import { act, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDraft } from '@/hooks/use-draft'
import { renderReady, renderRoute } from './render-route'

let settings: Record<string, string> = {}
vi.mock('@/hooks/use-site', () => ({
  useSite: () => ({ site: { settings, activeSession: null }, loaded: true, failed: false }),
}))

beforeEach(() => {
  settings = {}
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('page visibility', () => {
  it('shows a coming-soon notice and removes hidden pages from navigation', async () => {
    settings = { vis_pub_arkib: 'soon', vis_pub_templat: 'hidden' }
    renderRoute('/arkib')
    expect(await screen.findByRole('heading', { level: 1, name: 'Akan datang' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Navigasi utama' })
    expect(within(nav).getByRole('link', { name: 'Arkib Awam' })).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'Templat' })).toBeNull()
  })

  it('shows a locked notice and a 404 for hidden public pages', async () => {
    settings = { vis_pub_kehadiran: 'locked', vis_pub_templat: 'hidden' }
    const first = renderRoute('/kehadiran')
    expect(await screen.findByRole('heading', { level: 1, name: /Dikunci/ })).toBeInTheDocument()
    first.unmount()
    renderRoute('/templat')
    expect(await screen.findByRole('heading', { level: 1, name: 'Halaman tidak ditemui.' })).toBeInTheDocument()
  })

  it('hides a workspace module from other roles but SUAK still sees it, flagged', async () => {
    settings = { vis_ws_e_opr: 'hidden' }
    const user = userEvent.setup()
    await renderReady('/workspace')
    await screen.findByRole('heading', { level: 1 })
    const rail = screen.getByRole('navigation', { name: 'Modul ruang kerja' })
    expect(within(rail).getByRole('link', { name: 'e-OPR' })).toBeInTheDocument() // preview role defaults to SUAK
    await user.selectOptions(screen.getByLabelText('Pratonton navigasi sebagai peranan'), 'member')
    expect(within(rail).queryByRole('link', { name: 'e-OPR' })).toBeNull()
  })

  it('tells SUAK when a module is not published', async () => {
    settings = { vis_ws_e_arkib: 'locked' }
    await renderReady('/workspace/e-arkib')
    expect(await screen.findByText(/hanya SUAK boleh melihatnya/)).toBeInTheDocument()
  })
})

describe('appearance', () => {
  it('switches theme and language from the appearance menu and remembers them', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await user.click(screen.getAllByRole('button', { name: 'Paparan dan bahasa' })[0]!)
    await user.click(screen.getByRole('radio', { name: /Lazuardi/ }))
    expect(document.documentElement.dataset.theme).toBe('lazuardi')
    expect(localStorage.getItem('nova.theme')).toBe('lazuardi')
    await user.click(screen.getByRole('radio', { name: 'English' }))
    expect(localStorage.getItem('nova.lang')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })
})

describe('search palette', () => {
  it('opens with Ctrl+K, lists pages and jumps to one with Enter', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    await user.keyboard('{Control>}k{/Control}')
    const box = await screen.findByRole('combobox')
    await user.type(box, 'arkib')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/arkib'))
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('does not offer pages that are hidden', async () => {
    settings = { vis_pub_arkib: 'hidden' }
    const user = userEvent.setup()
    renderRoute('/')
    await user.keyboard('{Control>}k{/Control}')
    await user.type(await screen.findByRole('combobox'), 'arkib')
    expect(screen.queryByRole('option', { name: /Arkib Awam/ })).toBeNull()
  })
})

describe('useDraft', () => {
  it('restores unsaved values after a reload and clears them on demand', async () => {
    vi.useFakeTimers()
    const first = renderHook(() => useDraft('t', { title: '', body: '' }))
    act(() => first.result.current.setValue({ title: 'Halo', body: '' }))
    act(() => void vi.advanceTimersByTime(500))
    first.unmount()

    const second = renderHook(() => useDraft('t', { title: '', body: '' }))
    expect(second.result.current.value.title).toBe('Halo')
    expect(second.result.current.restored).toBe(true)
    act(() => second.result.current.discard())
    expect(second.result.current.value.title).toBe('')
    expect(localStorage.getItem('nova.draft.t')).toBeNull()
    vi.useRealTimers()
  })

  it('never restores when editing an existing record', () => {
    localStorage.setItem('nova.draft.e', JSON.stringify({ title: 'lama' }))
    const { result } = renderHook(() => useDraft('e', { title: 'rekod' }, false))
    expect(result.current.value.title).toBe('rekod')
    expect(result.current.restored).toBe(false)
  })
})
