import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth, hasAnyRole } from '@/app/auth-context'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/cn'
import type { RoleKey } from '@shared/domain'

const TABS: { to: string; label: string; roles: readonly RoleKey[] }[] = [
  { to: '/workspace/pengurusan/pengguna', label: 'Pengguna', roles: ['suak'] },
  { to: '/workspace/pengurusan/sesi', label: 'Sesi JPP', roles: ['suak', 'system_admin'] },
]

export function AdminLayout() {
  const { roles } = useAuth()
  const tabs = TABS.filter((t) => hasAnyRole(roles, t.roles))
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="M08 · Pengurusan" title="Pengurusan" description="Pengguna, peranan dan sesi kepimpinan JPP." />
      <nav aria-label="Seksyen pengurusan" className="flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cn(
                '-mb-px border-b-2 px-4 py-2.5 text-caption font-semibold transition-colors',
                isActive ? 'border-blue text-blue' : 'border-transparent text-slate hover:text-navy',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}

/** /workspace/pengurusan → the first section this role may open. */
export function AdminIndex() {
  const { roles } = useAuth()
  return <Navigate to={roles.includes('suak') ? 'pengguna' : 'sesi'} replace />
}
