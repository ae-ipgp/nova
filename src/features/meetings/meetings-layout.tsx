import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/auth-context'
import { PageHeader } from '@/components/ui/page-header'
import { SubNav } from '@/components/ui/sub-nav'
import { t } from '@/i18n'

export function MeetingsLayout() {
  const { roles } = useAuth()
  const { pathname } = useLocation()
  const onSummary = pathname.endsWith('/kehadiran')
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('M03 · e-Mesyuarat')} title={t('e-Mesyuarat')} description={t('Jadual, jemputan, kehadiran, minit dan tindakan susulan.')} />
      <SubNav
        label={t('Seksyen e-Mesyuarat')}
        items={[
          { to: '/workspace/e-mesyuarat', label: t('Mesyuarat'), end: true, active: !onSummary },
          { to: '/workspace/e-mesyuarat/kehadiran', label: roles.includes('suak') || roles.includes('secretariat') ? t('Ringkasan kehadiran') : t('Kehadiran saya') },
        ]}
      />
      <Outlet />
    </div>
  )
}
