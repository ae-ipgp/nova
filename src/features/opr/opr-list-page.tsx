import { FileText, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/auth-context'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card } from '@/components/ui/card'
import { FilterChips } from '@/components/ui/misc'
import { PageHeader } from '@/components/ui/page-header'
import { QueryState } from '@/components/ui/query-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { useGatewayQuery } from '@/hooks/use-gateway'
import { formatDate } from '@/lib/format'
import { OPR_STATUS_UI } from '@/lib/status-ui'

export function OprListPage() {
  const { roles } = useAuth()
  const staff = roles.includes('suak') || roles.includes('secretariat')
  const [scope, setScope] = useState<'mine' | 'all'>('mine')
  const q = useGatewayQuery('opr.list', { scope })
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="M06 · e-OPR" title="e-OPR" description="Laporan program satu halaman: bina, pratonton A4, hantar untuk pengesahan dan eksport PDF." actions={<Link to="baru" className={buttonVariants()}><Plus />OPR baharu</Link>} />
      {staff && <FilterChips label="Skop" value={scope} onChange={setScope} options={[{ value: 'mine', label: 'OPR saya' }, { value: 'all', label: 'Semua OPR' }]} />}
      <Card className="overflow-hidden">
        <QueryState query={q} empty={{ icon: FileText, pose: 'writing', title: 'Belum ada OPR', description: 'Mulakan laporan program pertama anda. Draf disimpan secara automatik.' }}>
          {(rows) => (
            <ul className="divide-y divide-line">
              {rows.map((o) => (
                <li key={o.id}>
                  <Link to={o.id} className="flex flex-col gap-1 px-5 py-4 hover:bg-ice sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy">{o.title}</p>
                      <p className="text-caption text-slate">{o.owner.name} · program {formatDate(o.programDate)} · versi {o.version}</p>
                    </div>
                    <StatusBadge tone={OPR_STATUS_UI[o.status].tone}>{OPR_STATUS_UI[o.status].label}</StatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </Card>
    </div>
  )
}
