import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth, hasAnyRole } from '@/app/auth-context'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/cn'
import type { RoleKey } from '@shared/domain'
import { t } from '@/i18n'

const TABS: { to: string; label: string; roles: readonly RoleKey[] }[] = [
  { to: '/workspace/pengurusan/pengguna', label: 'Pengguna', roles: ['suak'] },
  { to: '/workspace/pengurusan/sesi', label: 'Sesi JPP', roles: ['suak', 'system_admin'] },
  { to: '/workspace/pengurusan/nombor', label: 'Nombor rujukan', roles: ['suak'] },
  { to: '/workspace/pengurusan/dokumen', label: 'Jenis dokumen', roles: ['suak'] },
  { to: '/workspace/pengurusan/kumpulan', label: 'Kumpulan', roles: ['suak'] },
  { to: '/workspace/pengurusan/tetapan', label: 'Tetapan', roles: ['suak'] },
  { to: '/workspace/pengurusan/audit', label: 'Log audit', roles: ['suak', 'system_admin'] },
]

export function AdminLayout() {
  const { roles } = useAuth()
  const tabs = TABS.filter((tt) => hasAnyRole(roles, tt.roles))
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('M08 · Pengurusan')} title={t('Pengurusan')} description={t('Pengguna, peranan dan sesi kepimpinan JPP.')} />
      <nav aria-label={t('Seksyen pengurusan')} className="flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((tt) => (
          <NavLink
            key={tt.to}
            to={tt.to}
            className={({ isActive }) =>
              cn(
                '-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-caption font-semibold transition-colors',
                isActive ? 'border-blue text-link' : 'border-transparent text-slate hover:text-heading',
              )
            }
          >
            {tt.label}
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
