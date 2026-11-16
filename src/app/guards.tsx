import { ShieldAlert } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { AccessState } from '@/features/auth/access-state'
import type { RoleKey } from '@shared/domain'
import { hasAnyRole, useAuth } from './auth-context'

/**
 * Gate for /workspace. UX only: the gateway independently refuses every
 * request from users who are not registered, active and authorised.
 */
export function RequireWorkspace() {
  const { mode, state, roles, refresh } = useAuth()
  const location = useLocation()

  if (mode === 'unconfigured') {
    return (
      <AccessState title="Ruang kerja belum tersedia" showSignOut={false}>
        <p>NO.VA belum dikonfigurasi pada pelayan ini. Hubungi pentadbir sistem.</p>
      </AccessState>
    )
  }
  if (state.status === 'loading') return <WorkspaceLoading />
  if (state.status === 'signed_out') {
    return <Navigate to={`/log-masuk?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  if (state.status === 'error') {
    return (
      <AccessState title="Tidak dapat membuka ruang kerja" action={<Button onClick={() => void refresh()}>Cuba lagi</Button>}>
        <p>{state.message}</p>
      </AccessState>
    )
  }

  const { me } = state
  if (me.status === 'unregistered') {
    return (
      <AccessState title="Akaun belum didaftarkan">
        <p>
          Anda log masuk sebagai <strong className="font-semibold text-ink">{me.email}</strong>, tetapi akaun ini belum didaftarkan dalam NO.VA.
        </p>
        <p>Hubungi Sekretariat atau SUAK untuk mendaftarkan akaun DELIMa anda.</p>
      </AccessState>
    )
  }
  if (me.status === 'inactive') {
    return (
      <AccessState title="Akaun tidak aktif">
        <p>Akses akaun {me.email} telah digantung atau dinyahaktifkan. Hubungi SUAK jika anda fikir ini satu kesilapan.</p>
      </AccessState>
    )
  }
  if (!roles.length) {
    return (
      <AccessState title="Tiada peranan diberikan">
        <p>Akaun anda aktif tetapi belum diberikan sebarang peranan. Hubungi SUAK.</p>
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
        title="Akses tidak dibenarkan"
        description="Peranan anda tidak membenarkan akses ke halaman ini. Hubungi SUAK jika anda memerlukan akses."
        className="py-16"
      />
    </Card>
  )
}

function WorkspaceLoading() {
  return (
    <div className="min-h-dvh bg-ice p-6" aria-busy="true" aria-label="Memuatkan ruang kerja">
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
