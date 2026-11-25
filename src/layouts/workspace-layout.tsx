import { Bell, ChevronsLeft, ChevronsRight, LogOut, Megaphone, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { hasAnyRole, useAuth } from '@/app/auth-context'
import { HelpBubble } from '@/components/brand/help-bubble'
import { Logo, Monogram } from '@/components/brand/logo'
import { useSite } from '@/hooks/use-site'
import { MODULES, workspacePath, type ModuleDefinition } from '@/config/modules'
import { cn } from '@/lib/cn'
import { ROLE_KEYS, ROLE_LABELS, type RoleKey } from '@/types/domain'

const COLLAPSE_KEY = 'nova.sidebar.collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

export function WorkspaceLayout() {
  const { roles, mode } = useAuth()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* storage unavailable — preference is not persisted */
    }
  }, [collapsed])

  const visibleModules = MODULES.filter((m) => hasAnyRole(roles, m.navRoles))

  return (
    <div className="min-h-dvh bg-ice">
      <a href="#workspace-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-input focus:bg-white focus:px-4 focus:py-2 focus:text-navy">
        Langkau ke kandungan
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col bg-navy text-sky transition-[width] duration-200 lg:flex',
          collapsed ? 'w-sidebar-collapsed' : 'w-sidebar',
        )}
        aria-label="Navigasi ruang kerja"
      >
        <div className={cn('flex h-header items-center border-b border-white/10', collapsed ? 'justify-center' : 'px-5')}>
          <Link to="/workspace" aria-label="Dashboard NO.VA">
            {collapsed ? <Monogram inverse /> : <Logo inverse />}
          </Link>
        </div>
        <SidebarNav modules={visibleModules} collapsed={collapsed} />
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            'm-3 flex h-10 items-center gap-2 rounded-input text-caption text-sky/70 hover:bg-white/5 hover:text-white',
            collapsed ? 'justify-center' : 'px-3',
          )}
          aria-label={collapsed ? 'Kembangkan sidebar' : 'Kecilkan sidebar'}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          {!collapsed && <span>Kecilkan</span>}
        </button>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigasi ruang kerja">
          <button type="button" className="absolute inset-0 bg-navy-900/50" aria-label="Tutup menu" onClick={() => setDrawerOpen(false)} />
          <aside className="relative flex h-full w-[min(85vw,var(--spacing-sidebar))] flex-col bg-navy text-sky">
            <div className="flex h-header items-center justify-between border-b border-white/10 px-5">
              <Logo inverse />
              <button type="button" className="grid size-9 place-items-center rounded-input text-white" aria-label="Tutup menu" onClick={() => setDrawerOpen(false)}>
                <X className="size-5" />
              </button>
            </div>
            <SidebarNav modules={visibleModules} collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className={cn('flex min-h-dvh flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-sidebar-collapsed' : 'lg:pl-sidebar')}>
        <TopBar onOpenDrawer={() => setDrawerOpen(true)} />
        <MaintenanceBanner />
        {mode === 'preview' && <PreviewBanner />}
        <main id="workspace-main" className="container-content flex-1 pt-6 pb-24 md:pt-8">
          <Outlet />
        </main>
      </div>
      <HelpBubble />
    </div>
  )
}

function MaintenanceBanner() {
  const { site } = useSite()
  if (site.settings.maintenance_mode !== 'true') return null
  return (
    <div role="status" className="border-b border-amber/30 bg-amber-100">
      <p className="container-content py-2 text-caption text-ink">
        <strong className="font-semibold">Mod penyelenggaraan.</strong> {site.settings.maintenance_message || 'Pengguna biasa tidak boleh menghantar atau menyunting buat sementara waktu.'}
      </p>
    </div>
  )
}

function SidebarNav({
  modules,
  collapsed,
  onNavigate,
}: {
  modules: readonly ModuleDefinition[]
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-1">
        {modules.map((m) => {
          const Icon = m.icon
          return (
            <li key={m.code}>
              <NavLink
                to={workspacePath(m)}
                end={m.slug === ''}
                onClick={onNavigate}
                title={collapsed ? m.name : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex h-10 items-center gap-3 rounded-input text-caption font-medium transition-colors',
                    collapsed ? 'justify-center' : 'px-3',
                    isActive ? 'bg-blue text-white' : 'text-sky/75 hover:bg-white/5 hover:text-white',
                  )
                }
              >
                <Icon className="size-[1.125rem] shrink-0" aria-hidden />
                {collapsed ? <span className="sr-only">{m.name}</span> : <span className="truncate">{m.name}</span>}
              </NavLink>
            </li>
          )
        })}
        <li className="pt-2">
          <NavLink
            to="/workspace/papan-notis"
            title={collapsed ? 'Papan Notis' : undefined}
            onClick={onNavigate}
            className={({ isActive }) => cn('flex h-10 items-center gap-3 rounded-input text-caption font-medium transition-colors', collapsed ? 'justify-center' : 'px-3', isActive ? 'bg-blue text-white' : 'text-sky/75 hover:bg-white/5 hover:text-white')}
          >
            <Megaphone className="size-[1.125rem] shrink-0" aria-hidden />
            {collapsed ? <span className="sr-only">Papan Notis</span> : <span className="truncate">Papan Notis</span>}
          </NavLink>
        </li>
      </ul>
    </nav>
  )
}

function TopBar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const { mode, state } = useAuth()
  const session = state.status === 'signed_in' ? state.me.activeSession : null
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
      <div className="container-content flex h-header items-center gap-3">
        <button type="button" className="grid size-10 place-items-center rounded-input text-navy lg:hidden" aria-label="Buka menu" onClick={onOpenDrawer}>
          <Menu className="size-5" />
        </button>
        <Breadcrumb />
        <div className="ml-auto flex items-center gap-2">
          <span
            className="hidden max-w-[18rem] items-center gap-2 truncate rounded-full border border-line bg-ice px-3 py-1 text-micro font-medium text-slate md:inline-flex"
            title="Sesi JPP aktif"
          >
            <span className={cn('size-1.5 shrink-0 rounded-full', session ? 'bg-teal' : 'bg-slate')} aria-hidden />
            <span className="truncate">{session ? session.name : 'Tiada sesi aktif'}</span>
          </span>
          <button type="button" className="grid size-10 place-items-center rounded-input text-slate hover:bg-ice hover:text-navy" aria-label="Notifikasi (belum tersedia)" disabled>
            <Bell className="size-[1.125rem]" />
          </button>
          {mode === 'preview' && <RolePreviewSelect />}
          <ProfileMenu />
        </div>
      </div>
    </header>
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
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (state.status !== 'signed_in') return null
  const { me } = state
  const name = me.profile?.fullName ?? me.email

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Menu profil: ${name}`}
        className="grid size-10 place-items-center rounded-full bg-navy font-display text-caption font-bold text-white hover:bg-blue"
      >
        {initials(name)}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-card border border-line bg-paper p-2 shadow-float">
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="truncate font-semibold text-navy">{name}</p>
            <p className="truncate font-mono text-micro text-slate">{me.email}</p>
            {me.membership && (
              <p className="mt-1 text-micro text-slate">
                {[me.membership.position, me.membership.bureau].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="mt-2 flex flex-wrap gap-1">
              {roles.map((r) => (
                <span key={r} className="rounded bg-blue-100 px-1.5 py-0.5 text-micro font-semibold text-blue">
                  {ROLE_LABELS[r]}
                </span>
              ))}
            </p>
          </div>
          <button
            type="button"
            disabled={mode !== 'live'}
            onClick={async () => {
              setOpen(false)
              await signOut()
              navigate('/', { replace: true })
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-input px-3 py-2 text-left text-caption text-ink hover:bg-ice disabled:opacity-50"
          >
            <LogOut className="size-4" aria-hidden />
            Log keluar
          </button>
        </div>
      )}
    </div>
  )
}

function Breadcrumb() {
  const { pathname } = useLocation()
  const slug = pathname.replace(/^\/workspace\/?/, '').split('/')[0] ?? ''
  const current = MODULES.find((m) => m.slug === slug)
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-2 truncate text-caption">
        <li>
          <Link to="/workspace" className="text-slate hover:text-blue">
            Ruang Kerja
          </Link>
        </li>
        {current && current.slug !== '' && (
          <>
            <li aria-hidden className="text-line">
              /
            </li>
            <li aria-current="page" className="truncate font-semibold text-navy">
              {current.name}
            </li>
          </>
        )}
      </ol>
    </nav>
  )
}

function RolePreviewSelect() {
  const { roles, setPreviewRole } = useAuth()
  return (
    <div className="flex items-center gap-2 rounded-input border border-dashed border-amber/60 bg-amber-100/60 py-1 pr-1 pl-2.5">
      <span className="hidden text-micro font-semibold uppercase tracking-wide text-amber sm:inline" aria-hidden>
        Pratonton
      </span>
      <select
        aria-label="Pratonton navigasi sebagai peranan"
        value={roles[0]}
        onChange={(e) => setPreviewRole?.(e.target.value as RoleKey)}
        className="h-8 rounded-[6px] border border-line bg-paper px-2 text-caption text-navy"
      >
        {ROLE_KEYS.filter((r) => r !== 'public').map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
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
        <strong className="font-semibold">Mod pratonton pembangunan.</strong> Log masuk dan pelayan data belum dikonfigurasi, jadi tiada data
        dimuatkan. Pemilih peranan hanya mengubah paparan; ia bukan kawalan akses.
      </p>
    </div>
  )
}
