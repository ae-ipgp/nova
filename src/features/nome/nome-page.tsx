import { Plus, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NOTICE_TYPE_LABELS } from '@shared/domain'
import { useCan } from '@/app/auth-context'
import { Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button-variants'
import { PageHeader } from '@/components/ui/page-header'
import { QueryState } from '@/components/ui/query-state'
import { Notice } from '@/components/ui/form-field'
import { StatusBadge } from '@/components/ui/status-badge'
import { useGatewayQuery } from '@/hooks/use-gateway'
import { formatDateTime } from '@/lib/format'
import { NOTICE_STATUS_UI } from '@/lib/status-ui'

export function NoMePage() {
  const canPrepare = useCan('nome.prepare')
  const canSend = useCan('nome.send')
  const q = useGatewayQuery('notice.list', {}, { enabled: canPrepare || canSend })
  const allowed = canPrepare || canSend

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="M04 · NoMe"
        title="NoMe"
        description="Sediakan, semak dan hantar notis e-mel rasmi kepada ahli."
        actions={canPrepare && <Link to="baru" className={buttonVariants()}><Plus />Notis baharu</Link>}
      />
      {!allowed && <Notice tone="warning">Anda belum diberi kuasa menyediakan atau menghantar NoMe. Hubungi SUAK untuk mendapatkan akses.</Notice>}
      {allowed && (
        <Card className="overflow-hidden">
          <QueryState query={q} empty={{ icon: Send, pose: 'plane', title: 'Belum ada notis', description: 'Notis yang disediakan dan dihantar akan disenaraikan di sini.' }}>
            {(rows) => (
              <ul className="divide-y divide-line">
                {rows.map((n) => (
                  <li key={n.id}>
                    <Link to={n.id} className="flex flex-col gap-1 px-5 py-4 hover:bg-ice sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-navy">{n.subject}</p>
                        <p className="text-caption text-slate">
                          {NOTICE_TYPE_LABELS[n.type]} · {n.recipientCount} penerima · {formatDateTime(n.sentAt || n.scheduledAt || n.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(n.status === 'sent' || n.status === 'partial') && <span className="text-caption text-slate">{n.sentCount} berjaya{n.failedCount ? `, ${n.failedCount} gagal` : ''}</span>}
                        <StatusBadge tone={NOTICE_STATUS_UI[n.status].tone}>{NOTICE_STATUS_UI[n.status].label}</StatusBadge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </Card>
      )}
      <p className="text-micro text-slate">Keperluan: NME-01 – NME-09 · E-mel dihantar dari akaun pemilik melalui pelayan; tiada kunci rahsia di pelayar.</p>
    </div>
  )
}
