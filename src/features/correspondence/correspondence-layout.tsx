import { Outlet } from 'react-router-dom'
import { useAuth } from '@/app/auth-context'
import { PageHeader } from '@/components/ui/page-header'
import { SubNav } from '@/components/ui/sub-nav'

export function CorrespondenceLayout() {
  const { roles } = useAuth()
  const staff = roles.includes('suak') || roles.includes('secretariat')
  const items = [{ to: '/workspace/e-surat', label: 'Permohonan', end: true }, ...(staff ? [{ to: '/workspace/e-surat/daftar', label: 'Daftar nombor' }, { to: '/workspace/e-surat/surat', label: 'Surat masuk & keluar' }] : [])]
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="M02 · e-Surat" title="e-Surat" description="Permohonan nombor rujukan, kelulusan SUAK dan daftar persuratan." />
      <SubNav label="Seksyen e-Surat" items={items} />
      <Outlet />
    </div>
  )
}
