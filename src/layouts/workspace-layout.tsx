import { Hourglass, LayoutGrid, Lock, LogOut, Mail, X, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { hasAnyRole, useAuth } from '@/app/auth-context'
import { HelpBubble } from '@/components/brand/help-bubble'
import { Logo, Monogram } from '@/components/brand/logo'
import { PageGate } from '@/components/page-gate'
import { SearchProvider, SearchTrigger } from '@/components/search-palette'
import { EmailPrefsDialog } from '@/components/shell/email-prefs-dialog'
import { Popover } from '@/components/shell/popover'
import { PrefsMenu } from '@/components/shell/prefs-menu'
import { OutageNotice } from '@/components/shell/outage-notice'
import { UpdateBanner } from '@/components/shell/update-banner'
import { MODULES, workspacePath } from '@/config/modules'
import { allWorkspacePages, boardPage } from '@/config/nav'
import { useSite } from '@/hooks/use-site'
import { cn } from '@/lib/cn'
import { useVisibility, wsKey } from '@/lib/visibility'
import { ROLE_KEYS, ROLE_LABELS, type RoleKey } from '@/types/domain'
import { t } from '@/i18n'

interface Item {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  /** Settings key under vis_ws_ (modules only). */
  vis?: string
}

const STATE_ICON = { soon: Hourglass, locked: Lock } as const

function useItems(): Item[] {
  const { roles } = useAuth()
  const { isListed } = useVisibility()
  return useMemo(() => {
    const mods: Item[] = MODULES.filter((m) => hasAnyRole(roles, m.navRoles)).map((m) => ({
      to: workspacePath(m),
      label: m.name,
      icon: m.icon,
      end: m.slug === '',
      vis: m.slug && m.slug !== 'pengurusan' ? wsKey(m.slug) : undefined,
    }))
    const board = boardPage()
    const all: Item[] = [...mods.slice(0, 1), { to: board.to, label: board.label, icon: board.icon, vis: 'papan_notis' }, ...mods.slice(1)]
    return all.filter((i) => !i.vis || isListed('ws', i.vis))
  }, [roles, isListed])
}

export function WorkspaceLayout() {
  const { roles, mode } = useAuth()
  const { isListed } = useVisibility()
  const pages = useMemo(() => allWorkspacePages(roles), [roles])
  const [menuOpen, setMenuOpen] = useState(false)
  const items = useItems()
  const { pathname } = useLocation()

  const slug = pathname.replace(/^\/workspace\/?/, '').split('/')[0] ?? ''
  const gateKey = slug && slug !== 'pengurusan' ? wsKey(slug) : null
  const searchPages = pages.filter((p) => {
    const s = p.to.replace(/^\/workspace\/?/, '').split('/')[0] ?? ''
    return !s || s === 'pengurusan' || isListed('ws', wsKey(s))
  })

  return (
    <SearchProvider scope="workspace" pages={searchPages}>
      <div className="min-h-dvh bg-ice">
        <a href="#workspace-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-input focus:bg-paper focus:px-4 focus:py-2 focus:text-heading">
          {t('Langkau ke kandungan')}
        </a>
        <TopPill />
        <Rail items={items} />
        <div className="flex min-h-dvh flex-col pt-[5.25rem] lg:pl-[5.5rem]">
          <UpdateBanner />
          <OutageNotice />
          <MaintenanceBanner />
          {mode === 'preview' && <PreviewBanner />}
          <main id="workspace-main" className="container-content w-full flex-1 pt-4 pb-32 md:pt-6 lg:pb-16">
            {gateKey ? (
              <PageGate scope="ws" page={gateKey}>
                <Outlet />
              </PageGate>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
        <Dock items={items} onMenu={() => setMenuOpen(true)} />
        {menuOpen && <MenuSheet items={items} onClose={() => setMenuOpen(false)} />}
        <HelpBubble raised />
      </div>
    </SearchProvider>
  )
}

/** Floating glass navigation pill: identity, where you are, search, appearance, profile. */
function TopPill() {
  const { state, mode } = useAuth()
  const session = state.status === 'signed_in' ? state.me.activeSession : null
  return (
    <header className="fixed inset-x-0 top-3 z-30 px-3 print:hidden">
      <div className="glass mx-auto flex h-14 max-w-[var(--container-content)] items-center gap-2 rounded-full border border-line pr-2 pl-4 shadow-soft">
        <Link to="/workspace" aria-label={t('Dashboard NO.VA')} className="shrink-0">
          <span className="hidden sm:block">
            <Logo showDescriptor={false} />
          </span>
          <span className="sm:hidden">
            <Monogram />
          </span>
        </Link>
        <Breadcrumb />
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-1 hidden max-w-[16rem] items-center gap-2 truncate rounded-full border border-line bg-ice px-3 py-1 text-micro font-medium text-slate xl:inline-flex" title={t('Sesi JPP aktif')}>
            <span className={cn('size-1.5 shrink-0 rounded-full', session ? 'bg-teal' : 'bg-slate')} aria-hidden />
            <span className="truncate">{session ? session.name : t('Tiada sesi aktif')}</span>
          </span>
          <SearchTrigger className="hidden md:inline-flex" />
          <SearchTrigger compact className="md:hidden" />
          {mode === 'preview' && <RolePreviewSelect />}
          <PrefsMenu />
          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}

function Breadcrumb() {
  const { pathname } = useLocation()
  const slug = pathname.replace(/^\/workspace\/?/, '').split('/')[0] ?? ''
  const current = slug === 'papan-notis' ? { name: t('Papan Notis') } : MODULES.find((m) => m.slug === slug)
  if (!current || !slug) return null
  return (
    <nav aria-label={t('Breadcrumb')} className="hidden min-w-0 md:block">
      <ol className="flex items-center gap-2 truncate text-caption">
        <li aria-hidden className="text-line">
          /
        </li>
        <li aria-current="page" className="truncate font-semibold text-heading">
          {current.name}
        </li>
      </ol>
    </nav>
  )
}

/** Vertical round-button module rail (desktop). */
function Rail({ items }: { items: Item[] }) {
  const { stateOf } = useVisibility()
  return (
    <nav aria-label={t('Modul ruang kerja')} className="fixed top-[5.25rem] left-4 z-20 hidden flex-col gap-2 lg:flex print:hidden">
      {items.map((i) => {
        const Icon = i.icon
        const st = i.vis ? stateOf('ws', i.vis) : 'published'
        const Badge = st === 'soon' || st === 'locked' ? STATE_ICON[st] : null
        return (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.end}
            aria-label={t(i.label)}
            className={({ isActive }) =>
              cn(
                'group glass relative grid size-12 place-items-center rounded-full border shadow-soft transition-all hover:-translate-y-0.5',
                isActive ? 'border-blue bg-blue text-white' : 'border-line text-slate hover:border-blue hover:text-link',
              )
            }
          >
            <Icon className="size-5" aria-hidden />
            {Badge && <Badge className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-amber-100 p-0.5 text-amber" aria-hidden />}
            <span className="pointer-events-none absolute left-full ml-3 hidden rounded-input bg-navy-900 px-2.5 py-1 text-caption font-medium whitespace-nowrap text-white shadow-float group-hover:block group-focus-visible:block">{t(i.label)}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

/** Phone bottom dock: up to four destinations plus the full menu. */
function Dock({ items, onMenu }: { items: Item[]; onMenu: () => void }) {
  const first = items.slice(0, 4)
  return (
    <nav aria-label={t('Navigasi pantas')} className="glass fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-full border border-line p-1.5 shadow-float lg:hidden print:hidden">
      {first.map((i) => {
        const Icon = i.icon
        return (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.end}
            className={({ isActive }) => cn('flex min-w-14 flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[0.6875rem] font-medium', isActive ? 'bg-blue text-white' : 'text-slate')}
          >
            <Icon className="size-5" aria-hidden />
            <span className="max-w-16 truncate">{t(i.label)}</span>
          </NavLink>
        )
      })}
      <button type="button" onClick={onMenu} className="flex min-w-14 flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[0.6875rem] font-medium text-slate" aria-haspopup="dialog">
        <LayoutGrid className="size-5" aria-hidden />
        {t('Menu')}
      </button>
    </nav>
  )
}

function MenuSheet({ items, onClose }: { items: Item[]; onClose: () => void }) {
  const { roles } = useAuth()
  const admin = allWorkspacePages(roles).filter((p) => p.to.startsWith('/workspace/pengurusan/'))
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={t('Menu ruang kerja')}>
      <button type="button" className="absolute inset-0 bg-navy-900/50" aria-label={t('Tutup menu')} onClick={onClose} />
      <div className="glass absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-hero border-t border-line p-4 pb-8 shadow-float">
        <div className="mb-3 flex items-center justify-between">
          <Logo showDescriptor={false} />
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full text-heading hover:bg-soft" aria-label={t('Tutup menu')}>
            <X className="size-5" />
          </button>
        </div>
        <ul className="grid grid-cols-3 gap-2">
          {items.map((i) => {
            const Icon = i.icon
            return (
              <li key={i.to}>
                <NavLink to={i.to} end={i.end} onClick={onClose} className={({ isActive }) => cn('flex flex-col items-center gap-1.5 rounded-card border p-3 text-center text-caption font-medium', isActive ? 'border-blue bg-soft text-heading' : 'border-line text-ink')}>
                  <Icon className="size-6 text-link" aria-hidden />
                  {t(i.label)}
                </NavLink>
              </li>
            )
          })}
        </ul>
        {admin.length > 0 && (
          <>
            <p className="mt-5 mb-2 text-micro font-semibold uppercase tracking-wide text-slate">{t('Pengurusan')}</p>
            <ul className="grid grid-cols-2 gap-2">
              {admin.map((p) => (
                <li key={p.to}>
                  <Link to={p.to} onClick={onClose} className="flex items-center gap-2 rounded-input border border-line px-3 py-2 text-caption text-ink">
                    <p.icon className="size-4 text-link" aria-hidden />
                    {t(p.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?'
  )
}

function ProfileMenu() {
  const { state, roles, signOut, mode } = useAuth()
  const navigate = useNavigate()
  const [emailOpen, setEmailOpen] = useState(false)
  if (state.status !== 'signed_in') return null
  const { me } = state
  const name = me.profile?.fullName ?? me.email
  return (
    <>
      <Popover
        label={t('Menu profil')}
        panelClassName="w-72"
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label={t('Menu profil: {name}', { name: name })}
            className="grid size-10 place-items-center rounded-full bg-navy font-display text-caption font-bold text-white hover:bg-blue"
          >
            {initials(name)}
          </button>
        )}
      >
        {(close) => (
          <>
            <div className="border-b border-line px-3 pb-3 pt-2">
              <p className="truncate font-semibold text-heading">{name}</p>
              <p className="truncate font-mono text-micro text-slate">{me.email}</p>
              {me.membership && <p className="mt-1 text-micro text-slate">{[me.membership.position, me.membership.bureau].filter(Boolean).join(' · ')}</p>}
              <p className="mt-2 flex flex-wrap gap-1">
                {roles.map((r) => (
                  <span key={r} className="rounded bg-soft px-1.5 py-0.5 text-micro font-semibold text-link">
                    {t(ROLE_LABELS[r])}
                  </span>
                ))}
              </p>
            </div>
            <button
              type="button"
              disabled={mode !== 'live'}
              onClick={() => {
                close()
                setEmailOpen(true)
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-input px-3 py-2 text-left text-caption text-ink hover:bg-soft disabled:opacity-50"
            >
              <Mail className="size-4" aria-hidden />
              {t('Pilihan e-mel')}
            </button>
            <button
              type="button"
              disabled={mode !== 'live'}
              onClick={async () => {
                close()
                await signOut()
                navigate('/', { replace: true })
              }}
              className="flex w-full items-center gap-2 rounded-input px-3 py-2 text-left text-caption text-ink hover:bg-soft disabled:opacity-50"
            >
              <LogOut className="size-4" aria-hidden />
              {t('Log keluar')}
            </button>
          </>
        )}
      </Popover>
      <EmailPrefsDialog open={emailOpen} onClose={() => setEmailOpen(false)} />
    </>
  )
}

function MaintenanceBanner() {
  const { site } = useSite()
  if (site.settings.maintenance_mode !== 'true') return null
  return (
    <div role="status" className="border-b border-amber/30 bg-amber-100">
      <p className="container-content py-2 text-caption text-ink">
        <strong className="font-semibold">{t('Mod penyelenggaraan.')}</strong> {site.settings.maintenance_message || t('Pengguna biasa tidak boleh menghantar atau menyunting buat sementara waktu.')}
      </p>
    </div>
  )
}

function RolePreviewSelect() {
  const { roles, setPreviewRole } = useAuth()
  return (
    <div className="flex items-center gap-2 rounded-input border border-dashed border-amber/60 bg-amber-100/60 py-1 pr-1 pl-2.5">
      <span className="hidden text-micro font-semibold uppercase tracking-wide text-amber sm:inline" aria-hidden>
        {t('Pratonton')}
      </span>
      <select aria-label={t('Pratonton navigasi sebagai peranan')} value={roles[0]} onChange={(e) => setPreviewRole?.(e.target.value as RoleKey)} className="h-8 rounded-[6px] border border-line bg-paper px-2 text-caption text-heading">
        {ROLE_KEYS.filter((r) => r !== 'public').map((r) => (
          <option key={r} value={r}>
            {t(ROLE_LABELS[r])}
          </option>
        ))}
      </select>
    </div>
  )
}

function PreviewBanner() {
  return (
    <div className="border-b border-amber/30 bg-amber-100/70">
      <p className="container-content py-2 text-caption text-ink">
        <strong className="font-semibold">{t('Mod pratonton pembangunan.')}</strong> {t('Log masuk dan pelayan data belum dikonfigurasi, jadi tiada data dimuatkan. Pemilih peranan hanya mengubah paparan; ia bukan kawalan akses.')}
      </p>
    </div>
  )
}
