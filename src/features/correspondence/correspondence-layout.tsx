import { Outlet } from 'react-router-dom'
import { useAuth } from '@/app/auth-context'
import { PageHeader } from '@/components/ui/page-header'
import { SubNav } from '@/components/ui/sub-nav'
import { t } from '@/i18n'

export function CorrespondenceLayout() {
  const { roles } = useAuth()
  const staff = roles.includes('suak') || roles.includes('secretariat')
  const items = [{ to: '/workspace/e-surat', label: t('Permohonan'), end: true }, ...(staff ? [{ to: '/workspace/e-surat/daftar', label: t('Daftar nombor') }, { to: '/workspace/e-surat/surat', label: t('Surat masuk & keluar') }] : [])]
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('M02 · e-Surat')} title={t('e-Surat')} description={t('Permohonan nombor rujukan, kelulusan SUAK dan daftar persuratan.')} />
      <SubNav label={t('Seksyen e-Surat')} items={items} />
      <Outlet />
    </div>
  )
}
