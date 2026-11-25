import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/auth-context'
import { PageHeader } from '@/components/ui/page-header'
import { SubNav } from '@/components/ui/sub-nav'

export function MeetingsLayout() {
  const { roles } = useAuth()
  const { pathname } = useLocation()
  const onSummary = pathname.endsWith('/kehadiran')
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="M03 · e-Mesyuarat" title="e-Mesyuarat" description="Jadual, jemputan, kehadiran, minit dan tindakan susulan." />
      <SubNav
        label="Seksyen e-Mesyuarat"
        items={[
          { to: '/workspace/e-mesyuarat', label: 'Mesyuarat', end: true, active: !onSummary },
          { to: '/workspace/e-mesyuarat/kehadiran', label: roles.includes('suak') || roles.includes('secretariat') ? 'Ringkasan kehadiran' : 'Kehadiran saya' },
        ]}
      />
      <Outlet />
    </div>
  )
}
