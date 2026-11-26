import { FileDown, Mail, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { RefRequestView } from '@shared/api-contract'
import type { ReferenceRequestStatus } from '@shared/domain'
import { useAuth } from '@/app/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog } from '@/components/ui/dialog'
import { Notice } from '@/components/ui/form-field'
import { DetailList, FilterChips, SearchBox, TableShell, Td, Th } from '@/components/ui/misc'
import { QueryState } from '@/components/ui/query-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/components/ui/toast'
import { useDownloader, useGatewayMutation, useGatewayQuery } from '@/hooks/use-gateway'
import { formatDate, formatDateTime } from '@/lib/format'
import { REF_STATUS_UI } from '@/lib/status-ui'
import { RequestFormDialog } from './request-form'
import { t } from '@/i18n'

type Filter = 'all' | ReferenceRequestStatus
const INVALIDATE = ['ref.request.list', 'ref.request.get', 'ref.register', 'corr.list', 'dashboard.summary', 'arc.list'] as const

export function RequestsPage() {
  const { roles } = useAuth()
  const staff = roles.includes('suak') || roles.includes('secretariat')
  const [scope, setScope] = useState<'mine' | 'all'>(roles.includes('suak') ? 'all' : 'mine')
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<RefRequestView | null>(null)
  const [params] = useSearchParams()
  const [openId, setOpenId] = useState<string | null>(params.get('open'))
  const list = useGatewayQuery('ref.request.list', { scope })

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (list.data ?? []).filter((r) => (filter === 'all' || r.status === filter) && (!s || `${r.subject} ${r.recipient} ${r.applicationId} ${r.referenceNumber} ${r.applicant.name}`.toLowerCase().includes(s)))
  }, [list.data, filter, q])

  return (
    <section aria-labelledby="req-h" className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 id="req-h" className="sr-only">
          {t('Permohonan nombor rujukan')}
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchBox value={q} onChange={setQ} placeholder={t('Cari tajuk, penerima, nombor…')} />
          {staff && (
            <FilterChips label={t('Skop')} value={scope} onChange={setScope} options={[{ value: 'all', label: t('Semua') }, { value: 'mine', label: t('Saya') }]} />
          )}
        </div>
        <Button onClick={() => (setDraft(null), setFormOpen(true))}>
          <Plus />
          {t('Permohonan baharu')}
        </Button>
      </div>
      <FilterChips
        label={t('Status')}
        value={filter}
        onChange={setFilter}
        options={[{ value: 'all', label: t('Semua') }, { value: 'submitted', label: t('Menunggu') }, { value: 'approved', label: t('Diluluskan') }, { value: 'rejected', label: t('Ditolak') }, { value: 'draft', label: t('Draf') }, { value: 'cancelled', label: t('Dibatalkan') }]}
      />

      <Card className="overflow-hidden">
        <QueryState query={list} isEmpty={() => rows.length === 0} empty={{ icon: Mail, pose: 'sleeping', title: t('Tiada permohonan'), description: t('Permohonan nombor rujukan akan dipaparkan di sini.') }}>
          {() => (
            <TableShell minWidth="46rem">
              <thead>
                <tr>
                  <Th>{t('ID permohonan')}</Th>
                  <Th>{t('Tarikh')}</Th>
                  <Th>{t('Pemohon')}</Th>
                  <Th>{t('Tajuk')}</Th>
                  <Th>{t('Status')}</Th>
                  <Th>
                    <span className="sr-only">{t('Tindakan')}</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <Td className="font-mono text-micro">{r.applicationId}</Td>
                    <Td className="whitespace-nowrap">{formatDate(r.createdAt)}</Td>
                    <Td>{r.applicant.name}</Td>
                    <Td className="max-w-xs">
                      <p className="font-semibold text-heading">{r.subject}</p>
                      {r.referenceNumber && <p className={`font-mono text-micro ${r.voided ? 'text-red line-through' : 'text-link'}`}>{r.referenceNumber}</p>}
                    </Td>
                    <Td>
                      <StatusBadge tone={REF_STATUS_UI[r.status].tone}>{REF_STATUS_UI[r.status].label}</StatusBadge>
                    </Td>
                    <Td className="text-right">
                      <Button size="sm" variant="secondary" onClick={() => setOpenId(r.id)} aria-label={t('Buka {subject}', { subject: r.subject })}>
                        {t('Buka')}
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </QueryState>
      </Card>
      <p className="text-micro text-slate">{t('Keperluan: LTR-01 – LTR-09 · Nombor rasmi dijana oleh pelayan dan tidak boleh digunakan semula atau dipadam.')}</p>

      {formOpen && <RequestFormDialog open onClose={() => setFormOpen(false)} draft={draft} />}
      {openId && (
        <RequestDrawer
          id={openId}
          onClose={() => setOpenId(null)}
          onEditDraft={(r) => {
            setOpenId(null)
            setDraft(r)
            setFormOpen(true)
          }}
        />
      )}
    </section>
  )
}

function RequestDrawer({ id, onClose, onEditDraft }: { id: string; onClose: () => void; onEditDraft: (r: RefRequestView) => void }) {
  const { roles, state } = useAuth()
  const meId = state.status === 'signed_in' ? state.me.profile?.id : undefined
  const toast = useToast()
  const download = useDownloader()
  const q = useGatewayQuery('ref.request.get', { id })
  const canned = useGatewayQuery('ref.options', {}, { staleTime: 5 * 60_000 }).data?.cannedReplies ?? []
  const approve = useGatewayMutation('ref.approve', INVALIDATE)
  const reject = useGatewayMutation('ref.reject', INVALIDATE)
  const voidMut = useGatewayMutation('ref.void', INVALIDATE)
  const cancel = useGatewayMutation('ref.request.cancel', INVALIDATE)
  const [dialog, setDialog] = useState<'approve' | 'reject' | 'void' | 'cancel' | null>(null)
  const r = q.data
  const suak = roles.includes('suak')
  const mine = r?.applicant.profileId === meId
  const close = () => {
    approve.reset()
    reject.reset()
    voidMut.reset()
    cancel.reset()
    setDialog(null)
  }

  return (
    <>
      <Dialog open onClose={onClose} size="lg" title={r?.subject ?? t('Permohonan')} description={r ? <span className="font-mono">{r.applicationId}</span> : undefined}>
        <QueryState query={q} isEmpty={() => false} empty={{ title: '' }}>
          {(d) => (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={REF_STATUS_UI[d.status].tone}>{REF_STATUS_UI[d.status].label}</StatusBadge>
                {d.referenceNumber && (
                  <span className={`rounded border px-2 py-0.5 font-mono text-caption font-semibold ${d.voided ? 'border-red/30 text-red line-through' : 'border-blue/30 bg-blue-100 text-link'}`}>{d.referenceNumber}</span>
                )}
                {d.voided && <StatusBadge tone="rejected">{t('Nombor dibatalkan')}</StatusBadge>}
              </div>
              {d.status === 'rejected' && <Notice>{t('Ditolak:')} {d.reviewNote}</Notice>}
              <DetailList
                items={[
                  ['Pemohon', d.applicant.name],
                  ['Jenis surat', d.letterType],
                  ['Tarikh surat', formatDate(d.letterDate)],
                  ['Penerima', <span key="r" className="whitespace-pre-line">{d.recipient}</span>],
                  ['Tujuan', <span key="t" className="whitespace-pre-line">{d.purpose}</span>],
                  ['Dokumen dijana', d.documentTypeName],
                  ...Object.entries(d.fields).map(([k, v]): [string, string] => [k.replace(/_/g, ' '), v]),
                ]}
              />
              <section aria-labelledby="hist-h">
                <h3 id="hist-h" className="text-body font-bold">
                  {t('Sejarah')}
                </h3>
                <ol className="mt-2 space-y-1 border-l-2 border-line pl-4 text-caption">
                  {d.history.map((h, i) => (
                    <li key={i}>
                      <span className="font-mono text-micro text-slate">{formatDateTime(h.at)}</span> · {h.actor || t('Sistem')} · {h.action}
                    </li>
                  ))}
                </ol>
              </section>
              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                {d.status === 'draft' && mine && <Button onClick={() => onEditDraft(d)}>{t('Sunting draf')}</Button>}
                {(d.status === 'draft' || d.status === 'submitted') && mine && (
                  <Button variant="secondary" onClick={() => setDialog('cancel')}>
                    {t('Batalkan permohonan')}
                  </Button>
                )}
                {suak && d.status === 'submitted' && (
                  <>
                    <Button onClick={() => setDialog('approve')}>{t('Lulus & janakan nombor')}</Button>
                    <Button variant="destructive" onClick={() => setDialog('reject')}>
                      {t('Tolak')}
                    </Button>
                  </>
                )}
                {d.hasPdf && (
                  <Button variant="secondary" onClick={() => void download('ref.pdf', { id: d.id })}>
                    <FileDown />
                    {t('Muat turun PDF')}
                  </Button>
                )}
                {suak && d.status === 'approved' && !d.voided && (
                  <Button variant="destructive" onClick={() => setDialog('void')}>
                    {t('Batalkan nombor')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </QueryState>
      </Dialog>

      <ConfirmDialog
        open={dialog === 'approve'}
        title={t('Luluskan dan janakan nombor rasmi?')}
        description={t('Satu nombor unik akan dijana mengikut format siri semasa. Nombor yang dikeluarkan tidak boleh digunakan semula atau dipadam.')}
        confirmLabel={t('Lulus & jana')}
        pending={approve.isPending}
        error={approve.error?.message}
        onClose={close}
        onConfirm={() => approve.mutate({ id }, { onSuccess: (x) => (toast.success(t('Nombor dikeluarkan: {referenceNumber}', { referenceNumber: x.referenceNumber })), close()) })}
      />
      <ConfirmDialog
        open={dialog === 'reject'}
        title={t('Tolak permohonan')}
        description={t('Tiada nombor rasmi akan dijana. Pemohon akan melihat sebab ini.')}
        reasonLabel={t('Sebab penolakan')}
        suggestions={canned}
        confirmLabel={t('Tolak')}
        destructive
        pending={reject.isPending}
        error={reject.error?.message}
        onClose={close}
        onConfirm={(reason) => reject.mutate({ id, reason }, { onSuccess: () => (toast.success(t('Permohonan ditolak.')), close()) })}
      />
      <ConfirmDialog
        open={dialog === 'void'}
        title={t('Batalkan nombor rujukan')}
        description={t('Nombor kekal dalam daftar dengan status dibatalkan, bersama sebab dan sejarah. Ia tidak akan digunakan semula.')}
        reasonLabel={t('Sebab pembatalan')}
        suggestions={canned}
        confirmLabel={t('Batalkan nombor')}
        destructive
        pending={voidMut.isPending}
        error={voidMut.error?.message}
        onClose={close}
        onConfirm={(reason) => voidMut.mutate({ id, reason }, { onSuccess: () => (toast.success(t('Nombor dibatalkan.')), close()) })}
      />
      <ConfirmDialog
        open={dialog === 'cancel'}
        title={t('Batalkan permohonan ini?')}
        confirmLabel={t('Ya, batalkan')}
        destructive
        pending={cancel.isPending}
        error={cancel.error?.message}
        onClose={close}
        onConfirm={() => cancel.mutate({ id }, { onSuccess: () => (toast.success(t('Permohonan dibatalkan.')), close()) })}
      />
    </>
  )
}

