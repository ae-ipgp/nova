import { Hourglass, LayoutGrid, Lock, X, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { hasAnyRole, useAuth } from '@/app/auth-context'
import { HelpBubble } from '@/components/brand/help-bubble'
import { Logo } from '@/components/brand/logo'
import { PageGate } from '@/components/page-gate'
import { SearchProvider } from '@/components/search-palette'
import { OutageNotice } from '@/components/shell/outage-notice'
import { SiteHeader } from '@/components/shell/site-header'
import { UpdateBanner } from '@/components/shell/update-banner'
import { MODULES, workspacePath } from '@/config/modules'
import { allWorkspacePages, boardPage } from '@/config/nav'
import { useSite } from '@/hooks/use-site'
import { t } from '@/i18n'
import { cn } from '@/lib/cn'
import { useVisibility, wsKey } from '@/lib/visibility'

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
        <SiteHeader variant="workspace" />
        <Rail items={items} />
        <div className="flex min-h-[calc(100dvh-var(--spacing-header))] flex-col lg:pl-[5.25rem]">
          <UpdateBanner />
          <OutageNotice />
          <MaintenanceBanner />
          {mode === 'preview' && <PreviewBanner />}
          <main id="workspace-main" className="container-content w-full flex-1 pt-6 pb-32 md:pt-8 lg:pb-16">
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

/** Vertical navy module rail with a rounded edge and a white tile for the current module (desktop). */
function Rail({ items }: { items: Item[] }) {
  const { stateOf } = useVisibility()
  return (
    <nav aria-label={t('Modul ruang kerja')} className="fixed top-[var(--spacing-header)] bottom-0 left-0 z-30 hidden w-[5.25rem] flex-col items-center gap-2 overflow-y-auto rounded-r-[2.25rem] bg-navy py-6 shadow-float lg:flex print:hidden">
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
            className={({ isActive }) => cn('group relative grid size-12 shrink-0 place-items-center rounded-2xl transition-all', isActive ? 'bg-white text-navy shadow-soft' : 'text-sky/75 hover:bg-white/10 hover:text-white')}
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

function PreviewBanner() {
  return (
    <div className="border-b border-amber/30 bg-amber-100/70">
      <p className="container-content py-2 text-caption text-ink">
        <strong className="font-semibold">{t('Mod pratonton pembangunan.')}</strong> {t('Log masuk dan pelayan data belum dikonfigurasi, jadi tiada data dimuatkan. Pemilih peranan hanya mengubah paparan; ia bukan kawalan akses.')}
      </p>
    </div>
  )
}
