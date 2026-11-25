import { FileDown, Mail, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
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
  const [openId, setOpenId] = useState<string | null>(null)
  const list = useGatewayQuery('ref.request.list', { scope })

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (list.data ?? []).filter((r) => (filter === 'all' || r.status === filter) && (!s || `${r.subject} ${r.recipient} ${r.applicationId} ${r.referenceNumber} ${r.applicant.name}`.toLowerCase().includes(s)))
  }, [list.data, filter, q])

  return (
    <section aria-labelledby="req-h" className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 id="req-h" className="sr-only">
          Permohonan nombor rujukan
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchBox value={q} onChange={setQ} placeholder="Cari tajuk, penerima, nombor…" />
          {staff && (
            <FilterChips label="Skop" value={scope} onChange={setScope} options={[{ value: 'all', label: 'Semua' }, { value: 'mine', label: 'Saya' }]} />
          )}
        </div>
        <Button onClick={() => (setDraft(null), setFormOpen(true))}>
          <Plus />
          Permohonan baharu
        </Button>
      </div>
      <FilterChips
        label="Status"
        value={filter}
        onChange={setFilter}
        options={[{ value: 'all', label: 'Semua' }, { value: 'submitted', label: 'Menunggu' }, { value: 'approved', label: 'Diluluskan' }, { value: 'rejected', label: 'Ditolak' }, { value: 'draft', label: 'Draf' }, { value: 'cancelled', label: 'Dibatalkan' }]}
      />

      <Card className="overflow-hidden">
        <QueryState query={list} isEmpty={() => rows.length === 0} empty={{ icon: Mail, pose: 'sleeping', title: 'Tiada permohonan', description: 'Permohonan nombor rujukan akan dipaparkan di sini.' }}>
          {() => (
            <TableShell minWidth="46rem">
              <thead>
                <tr>
                  <Th>ID permohonan</Th>
                  <Th>Tarikh</Th>
                  <Th>Pemohon</Th>
                  <Th>Tajuk</Th>
                  <Th>Status</Th>
                  <Th>
                    <span className="sr-only">Tindakan</span>
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
                      <p className="font-semibold text-navy">{r.subject}</p>
                      {r.referenceNumber && <p className={`font-mono text-micro ${r.voided ? 'text-red line-through' : 'text-blue'}`}>{r.referenceNumber}</p>}
                    </Td>
                    <Td>
                      <StatusBadge tone={REF_STATUS_UI[r.status].tone}>{REF_STATUS_UI[r.status].label}</StatusBadge>
                    </Td>
                    <Td className="text-right">
                      <Button size="sm" variant="secondary" onClick={() => setOpenId(r.id)} aria-label={`Buka ${r.subject}`}>
                        Buka
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </QueryState>
      </Card>
      <p className="text-micro text-slate">Keperluan: LTR-01 – LTR-09 · Nombor rasmi dijana oleh pelayan dan tidak boleh digunakan semula atau dipadam.</p>

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
      <Dialog open onClose={onClose} size="lg" title={r?.subject ?? 'Permohonan'} description={r ? <span className="font-mono">{r.applicationId}</span> : undefined}>
        <QueryState query={q} isEmpty={() => false} empty={{ title: '' }}>
          {(d) => (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={REF_STATUS_UI[d.status].tone}>{REF_STATUS_UI[d.status].label}</StatusBadge>
                {d.referenceNumber && (
                  <span className={`rounded border px-2 py-0.5 font-mono text-caption font-semibold ${d.voided ? 'border-red/30 text-red line-through' : 'border-blue/30 bg-blue-100 text-blue'}`}>{d.referenceNumber}</span>
                )}
                {d.voided && <StatusBadge tone="rejected">Nombor dibatalkan</StatusBadge>}
              </div>
              {d.status === 'rejected' && <Notice>Ditolak: {d.reviewNote}</Notice>}
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
                  Sejarah
                </h3>
                <ol className="mt-2 space-y-1 border-l-2 border-line pl-4 text-caption">
                  {d.history.map((h, i) => (
                    <li key={i}>
                      <span className="font-mono text-micro text-slate">{formatDateTime(h.at)}</span> · {h.actor || 'Sistem'} · {h.action}
                    </li>
                  ))}
                </ol>
              </section>
              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                {d.status === 'draft' && mine && <Button onClick={() => onEditDraft(d)}>Sunting draf</Button>}
                {(d.status === 'draft' || d.status === 'submitted') && mine && (
                  <Button variant="secondary" onClick={() => setDialog('cancel')}>
                    Batalkan permohonan
                  </Button>
                )}
                {suak && d.status === 'submitted' && (
                  <>
                    <Button onClick={() => setDialog('approve')}>Lulus & janakan nombor</Button>
                    <Button variant="destructive" onClick={() => setDialog('reject')}>
                      Tolak
                    </Button>
                  </>
                )}
                {d.hasPdf && (
                  <Button variant="secondary" onClick={() => void download('ref.pdf', { id: d.id })}>
                    <FileDown />
                    Muat turun PDF
                  </Button>
                )}
                {suak && d.status === 'approved' && !d.voided && (
                  <Button variant="destructive" onClick={() => setDialog('void')}>
                    Batalkan nombor
                  </Button>
                )}
              </div>
            </div>
          )}
        </QueryState>
      </Dialog>

      <ConfirmDialog
        open={dialog === 'approve'}
        title="Luluskan dan janakan nombor rasmi?"
        description="Satu nombor unik akan dijana mengikut format siri semasa. Nombor yang dikeluarkan tidak boleh digunakan semula atau dipadam."
        confirmLabel="Lulus & jana"
        pending={approve.isPending}
        error={approve.error?.message}
        onClose={close}
        onConfirm={() => approve.mutate({ id }, { onSuccess: (x) => (toast.success(`Nombor dikeluarkan: ${x.referenceNumber}`), close()) })}
      />
      <ConfirmDialog
        open={dialog === 'reject'}
        title="Tolak permohonan"
        description="Tiada nombor rasmi akan dijana. Pemohon akan melihat sebab ini."
        reasonLabel="Sebab penolakan"
        confirmLabel="Tolak"
        destructive
        pending={reject.isPending}
        error={reject.error?.message}
        onClose={close}
        onConfirm={(reason) => reject.mutate({ id, reason }, { onSuccess: () => (toast.success('Permohonan ditolak.'), close()) })}
      />
      <ConfirmDialog
        open={dialog === 'void'}
        title="Batalkan nombor rujukan"
        description="Nombor kekal dalam daftar dengan status dibatalkan, bersama sebab dan sejarah. Ia tidak akan digunakan semula."
        reasonLabel="Sebab pembatalan"
        confirmLabel="Batalkan nombor"
        destructive
        pending={voidMut.isPending}
        error={voidMut.error?.message}
        onClose={close}
        onConfirm={(reason) => voidMut.mutate({ id, reason }, { onSuccess: () => (toast.success('Nombor dibatalkan.'), close()) })}
      />
      <ConfirmDialog
        open={dialog === 'cancel'}
        title="Batalkan permohonan ini?"
        confirmLabel="Ya, batalkan"
        destructive
        pending={cancel.isPending}
        error={cancel.error?.message}
        onClose={close}
        onConfirm={() => cancel.mutate({ id }, { onSuccess: () => (toast.success('Permohonan dibatalkan.'), close()) })}
      />
    </>
  )
}

