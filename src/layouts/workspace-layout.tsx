import { Bell, ChevronsLeft, ChevronsRight, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { usePreviewRole } from '@/app/preview-role'
import { Logo, Monogram } from '@/components/brand/logo'
import { MODULES, workspacePath, type ModuleDefinition } from '@/config/modules'
import { SITE } from '@/config/site'
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
  const { role } = usePreviewRole()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* storage unavailable — preference is not persisted */
    }
  }, [collapsed])

  const visibleModules = MODULES.filter((m) => m.navRoles.includes(role))

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
        <PhaseBanner />
        <main id="workspace-main" className="container-content flex-1 py-6 md:py-8">
          <Outlet />
        </main>
      </div>
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
      </ul>
    </nav>
  )
}

function TopBar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
      <div className="container-content flex h-header items-center gap-3">
        <button type="button" className="grid size-10 place-items-center rounded-input text-navy lg:hidden" aria-label="Buka menu" onClick={onOpenDrawer}>
          <Menu className="size-5" />
        </button>
        <Breadcrumb />
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-line bg-ice px-3 py-1 text-micro font-medium text-slate md:inline-flex" title="Sesi JPP aktif (DEMO — perlu disahkan SUAK)">
            <span className="size-1.5 rounded-full bg-teal" aria-hidden />
            {SITE.demoSessionLabel}
            <span className="font-mono text-[0.625rem] text-amber">DEMO</span>
          </span>
          <button type="button" className="grid size-10 place-items-center rounded-input text-slate hover:bg-ice hover:text-navy" aria-label="Notifikasi (belum tersedia)" disabled>
            <Bell className="size-[1.125rem]" />
          </button>
          <RolePreviewSelect />
        </div>
      </div>
    </header>
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
  const { role, setRole } = usePreviewRole()
  return (
    <div className="flex items-center gap-2 rounded-input border border-dashed border-amber/60 bg-amber-100/60 py-1 pr-1 pl-2.5">
      <span className="hidden text-micro font-semibold uppercase tracking-wide text-amber sm:inline" aria-hidden>
        Pratonton
      </span>
      <select
        aria-label="Pratonton navigasi sebagai peranan"
        value={role}
        onChange={(e) => setRole(e.target.value as RoleKey)}
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

function PhaseBanner() {
  return (
    <div className="border-b border-amber/30 bg-amber-100/70">
      <p className="container-content py-2 text-caption text-ink">
        <strong className="font-semibold">Fasa 0 — pratonton struktur.</strong> Pengesahan, peranan dan data belum diaktifkan. Pemilih
        peranan hanya mengubah paparan navigasi; ia bukan kawalan akses.
      </p>
    </div>
  )
}
