import { ShieldAlert } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { AccessState } from '@/features/auth/access-state'
import type { RoleKey } from '@shared/domain'
import { hasAnyRole, useAuth } from './auth-context'
import { t } from '@/i18n'

/**
 * Gate for /workspace. UX only: the gateway independently refuses every
 * request from users who are not registered, active and authorised.
 */
export function RequireWorkspace() {
  const { mode, state, roles, refresh } = useAuth()
  const location = useLocation()

  if (mode === 'unconfigured') {
    return (
      <AccessState title={t('Ruang kerja belum tersedia')} showSignOut={false}>
        <p>{t('NO.VA belum dikonfigurasi pada pelayan ini. Hubungi pentadbir sistem.')}</p>
      </AccessState>
    )
  }
  if (state.status === 'loading') return <WorkspaceLoading />
  if (state.status === 'signed_out') {
    return <Navigate to={`/log-masuk?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  if (state.status === 'error') {
    return (
      <AccessState title={t('Tidak dapat membuka ruang kerja')} action={<Button onClick={() => void refresh()}>{t('Cuba lagi')}</Button>}>
        <p>{state.message}</p>
      </AccessState>
    )
  }

  const { me } = state
  if (me.status === 'unregistered') {
    return (
      <AccessState title={t('Akaun belum didaftarkan')}>
        <p>
          {t('Anda log masuk sebagai {email}, tetapi akaun ini belum didaftarkan dalam NO.VA.', { email: me.email })}
        </p>
        <p>{t('Hubungi Sekretariat atau SUAK untuk mendaftarkan akaun DELIMa anda.')}</p>
      </AccessState>
    )
  }
  if (me.status === 'inactive') {
    return (
      <AccessState title={t('Akaun tidak aktif')}>
        <p>{t('Akses akaun {email} telah digantung atau dinyahaktifkan. Hubungi SUAK jika anda fikir ini satu kesilapan.', { email: me.email })}</p>
      </AccessState>
    )
  }
  if (!roles.length) {
    return (
      <AccessState title={t('Tiada peranan diberikan')}>
        <p>{t('Akaun anda aktif tetapi belum diberikan sebarang peranan. Hubungi SUAK.')}</p>
      </AccessState>
    )
  }
  return <Outlet />
}

/** In-layout gate for a module or page restricted to some roles. */
export function RequireRoles({ roles: allowed }: { roles: readonly RoleKey[] }) {
  const { roles } = useAuth()
  if (!hasAnyRole(roles, allowed)) return <Forbidden />
  return <Outlet />
}

export function Forbidden() {
  return (
    <Card>
      <EmptyState
        icon={ShieldAlert}
        title={t('Akses tidak dibenarkan')}
        description={t('Peranan anda tidak membenarkan akses ke halaman ini. Hubungi SUAK jika anda memerlukan akses.')}
        className="py-16"
      />
    </Card>
  )
}

function WorkspaceLoading() {
  return (
    <div className="min-h-dvh bg-ice p-6" aria-busy="true" aria-label={t('Memuatkan ruang kerja')}>
      <Skeleton className="h-10 w-48" />
      <Skeleton className="mt-8 h-24 w-full" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  )
}
