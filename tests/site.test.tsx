import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContentItem } from '@shared/api-contract'
import { normalisePhone, telHref, whatsappHref } from '@/lib/phone'
import { liveAuth, signedInAs } from './auth-fixtures'
import { renderReady, renderRoute } from './render-route'

let settings: Record<string, string> = {}
let content: ContentItem[] = []
vi.mock('@/hooks/use-site', () => ({ useSite: () => ({ site: { settings, activeSession: null }, loaded: true, failed: false }) }))
vi.mock('@/hooks/use-public', () => ({
  usePublic: (action: string) => ({ data: action === 'public.content' ? content : undefined, isPending: false, isError: false, isFetching: false }),
}))

const item = (over: Partial<ContentItem>): ContentItem => ({ id: 'x', kind: 'text', ms: '', en: '', url: '', json: '', version: '1', hidden: false, ...over })

beforeEach(() => {
  settings = {}
  content = []
  localStorage.clear()
})

describe('phone links', () => {
  it('turns Malaysian numbers into tel: and WhatsApp links', () => {
    expect(normalisePhone('012-345 6789')).toBe('60123456789')
    expect(normalisePhone('+60 12-345 6789')).toBe('60123456789')
    expect(normalisePhone('0060123456789')).toBe('60123456789')
    expect(telHref('012-345 6789')).toBe('tel:+60123456789')
    expect(whatsappHref('012-345 6789')).toBe('https://wa.me/60123456789')
    expect(telHref('')).toBe('')
  })
})

describe('footer', () => {
  it('shows both phone numbers with working call and WhatsApp buttons, a bold first address line, the visitor count and the JPP portal link', () => {
    settings = {
      contact_phone: '012-345 6789',
      contact_phone_label: 'SUAK',
      contact_phone2: '019-876 5432',
      contact_phone2_label: 'Naib SUAK',
      contact_address: 'Pejabat JPP\nIPG Kampus Kota Bharu\n15050 Kelantan',
      visitor_count: '1234',
      jpp_portal_url: 'https://jpp.example.my',
    }
    renderRoute('/')
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: 'Hubungi SUAK melalui panggilan' })).toHaveAttribute('href', 'tel:+60123456789')
    expect(within(footer).getByRole('link', { name: 'Hubungi Naib SUAK melalui WhatsApp' })).toHaveAttribute('href', 'https://wa.me/60198765432')
    expect(within(footer).getByRole('link', { name: 'Hubungi Naib SUAK melalui WhatsApp' })).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(footer).getByText('Pejabat JPP').tagName).toBe('STRONG')
    expect(within(footer).getByLabelText('Bilangan pelawat: 1,234')).toBeInTheDocument()
    expect(within(footer).getByRole('link', { name: /Portal rasmi JPP/ })).toHaveAttribute('href', 'https://jpp.example.my')
    expect(within(footer).getByText('Berwibawa, berintegriti')).toBeInTheDocument()
    expect(within(footer).getAllByText('Pejabat Setiausaha Agung Kehormat').length).toBeGreaterThan(0)
  })

  it('shows nothing invented when nothing is configured', () => {
    renderRoute('/')
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).queryByText(/WhatsApp/)).toBeNull()
    expect(within(footer).queryByText(/Pelawat/)).toBeNull()
    expect(within(footer).queryByRole('link', { name: /Portal rasmi JPP/ })).toBeNull()
  })
})

describe('sign-in page', () => {
  it('has the same header and footer as the home page', () => {
    renderRoute('/log-masuk')
    expect(screen.getByRole('navigation', { name: 'Navigasi utama' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Log masuk')
  })
})

describe('Organisasi', () => {
  it('replaces Mengenai JPP and shows only what SUAK has entered', () => {
    content = [
      item({ id: 'org.progress', kind: 'list', json: JSON.stringify([{ title: 'Program Orientasi', status: 'Sedang berjalan', text: 'Butiran' }]) }),
      item({ id: 'org.legacy', kind: 'list', json: JSON.stringify([{ title: 'Legasi Ke-71', period: 'Sesi 2025/2026' }]) }),
    ]
    renderRoute('/organisasi')
    expect(screen.getByRole('navigation', { name: 'Navigasi utama' })).toHaveTextContent('Organisasi')
    expect(screen.getByText('Program Orientasi')).toBeInTheDocument()
    expect(screen.getByText('Sedang berjalan')).toBeInTheDocument()
    expect(screen.getByText('Legasi Ke-71')).toBeInTheDocument()
    expect(screen.getByText('Carta organisasi belum diterbitkan.')).toBeInTheDocument()
  })

  it('redirects the old /mengenai address', async () => {
    const { router } = renderRoute('/mengenai')
    await waitFor(() => expect(router.state.location.pathname).toBe('/organisasi'))
  })
})

describe('editable content', () => {
  it('shows SUAK text over the built-in wording, in each language, and can hide an element', () => {
    content = [
      item({ id: 'home.hero.line1', ms: 'Tajuk baharu,', en: 'New title,' }),
      item({ id: 'home.hero.cta2', hidden: true }),
    ]
    renderRoute('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tajuk baharu,')
    expect(screen.queryByText('Terokai NoVA')).toBeNull()
  })

  it('shows the editing outline only to SUAK once edit mode is switched on, and opens the editor', async () => {
    const user = userEvent.setup()
    await renderReady('/', signedInAs('suak'))
    expect(document.querySelector('.cms-edit')).toBeNull()
    await user.click(screen.getByRole('button', { name: /Suntingan/ }))
    expect(document.querySelectorAll('.cms-edit').length).toBeGreaterThan(3)
    await user.click(document.querySelector('.cms-edit')!)
    expect(await screen.findByRole('dialog', { name: 'Sunting kandungan' })).toBeInTheDocument()
    expect(screen.getByLabelText('Teks (Bahasa Melayu)')).toBeInTheDocument()
    expect(screen.getByLabelText('Text (English)')).toBeInTheDocument()
  })

  it('offers no editing to members or visitors', async () => {
    const visitor = renderRoute('/', liveAuth({ status: 'signed_out' }))
    expect(screen.queryByRole('button', { name: /Suntingan/ })).toBeNull()
    visitor.unmount()
    renderRoute('/', signedInAs('member'))
    expect(screen.queryByRole('button', { name: /Suntingan/ })).toBeNull()
  })
})

describe('workspace header and greeting', () => {
  it('uses the same header, the Google photo and the full name', async () => {
    const auth = { ...signedInAs('member'), identity: { name: 'MUHAMMAD ALI BIN AHMAD', avatarUrl: 'https://lh3.googleusercontent.com/a/photo' } }
    await renderReady('/workspace', auth)
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Panel suntingan anda.')
    expect(await screen.findByText(/MUHAMMAD ALI BIN AHMAD/, { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navigasi utama' })).toBeInTheDocument()
    const menu = screen.getByRole('button', { name: 'Menu profil: MUHAMMAD ALI BIN AHMAD' })
    expect(menu.querySelector('img')).toHaveAttribute('src', 'https://lh3.googleusercontent.com/a/photo')
    expect(menu.querySelector('img')).toHaveAttribute('referrerpolicy', 'no-referrer')
  })

  it('falls back to initials without a photo', async () => {
    await renderReady('/workspace', signedInAs('member'))
    const menu = await screen.findByRole('button', { name: 'Menu profil: Ali Ahmad' })
    expect(menu.querySelector('img')).toBeNull()
    expect(menu).toHaveTextContent('AA')
  })
})
