import { ArrowLeft, Download, ExternalLink, MapPin, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/app/auth-context'
import type { AgendaItem, MeetingDetail } from '@shared/api-contract'
import { toCsv } from '@shared/csv'
import { ATTENDANCE_LABELS, type AttendanceStatus } from '@shared/domain'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormField, Notice, SelectField, TextAreaField } from '@/components/ui/form-field'
import { QueryState } from '@/components/ui/query-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/components/ui/toast'
import { Dialog } from '@/components/ui/dialog'
import { TableShell, Td, Th } from '@/components/ui/misc'
import { useGatewayMutation, useGatewayQuery } from '@/hooks/use-gateway'
import { saveText } from '@/lib/files'
import { formatDate, formatDateTime } from '@/lib/format'
import { ATTENDANCE_UI } from '@/lib/status-ui'
import { MeetingFormDialog } from './meeting-form'
import { t } from '@/i18n'

const INVALIDATE = ['mtg.get', 'mtg.list', 'mtg.summary', 'dashboard.summary', 'public.attendance'] as const
type Tab = 'attendance' | 'agenda' | 'minutes' | 'actions'

export function MeetingDetailPage() {
  const { id = '' } = useParams()
  const q = useGatewayQuery('mtg.get', { id })
  return (
    <div className="space-y-4">
      <Link to="/workspace/e-mesyuarat" className="inline-flex items-center gap-1 text-caption font-medium text-link hover:underline">
        <ArrowLeft className="size-4" aria-hidden />
        {t('Semua mesyuarat')}
      </Link>
      <QueryState query={q} isEmpty={() => false} empty={{ title: '' }}>
        {(d) => <Detail d={d} />}
      </QueryState>
    </div>
  )
}

function Detail({ d }: { d: MeetingDetail }) {
  const { meeting: m } = d
  const [tab, setTab] = useState<Tab>('attendance')
  const [editing, setEditing] = useState(false)
  const [dialog, setDialog] = useState<'cancel' | 'publish' | 'unpublish' | null>(null)
  const toast = useToast()
  const cancel = useGatewayMutation('mtg.cancel', INVALIDATE)
  const publish = useGatewayMutation('mtg.publish', INVALIDATE)
  const close = () => (cancel.reset(), publish.reset(), setDialog(null))

  return (
    <>
      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-h2 font-bold">{m.title}</h2>
              <p className="mt-1 text-body text-slate">
                {m.meetingType} · {formatDateTime(m.startsAt)} – {formatDateTime(m.endsAt).split(',').slice(-1)[0]}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-slate">
                {m.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden />
                    {m.location}
                  </span>
                )}
                {m.link && (
                  <a href={m.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-link hover:underline">
                    <ExternalLink className="size-3.5" aria-hidden />
                    {t('Sertai atas talian')}
                  </a>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {m.status === 'cancelled' && <StatusBadge tone="rejected">{t('Dibatalkan')}</StatusBadge>}
              {m.published && <StatusBadge tone="issued">{t('Diterbitkan kepada awam')}</StatusBadge>}
            </div>
          </div>
          {m.status === 'cancelled' && <Notice>{t('Dibatalkan:')} {m.cancelReason}</Notice>}
          {d.canManage && m.status !== 'cancelled' && (
            <div className="flex flex-wrap gap-2 border-tt border-line pt-3">
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                {t('Sunting')}
              </Button>
              <Link to={`/workspace/nome/baru?meeting=${m.id}`} className="inline-flex h-8 items-center gap-2 rounded-input border border-line bg-paper px-3 text-caption font-medium text-heading hover:border-blue hover:text-link">
                <Send className="size-4" aria-hidden />
                {t('Hantar notis')}
              </Link>
              <Button size="sm" variant="secondary" onClick={() => setDialog(m.published ? 'unpublish' : 'publish')} disabled={false}>
                {m.published ? t('Tarik balik penerbitan') : t('Terbitkan kehadiran')}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDialog('cancel')}>
                {t('Batalkan mesyuarat')}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <div role="tablist" aria-label={t('Bahagian mesyuarat')} className="flex gap-1 overflow-x-auto border-b border-line">
        {(['attendance', 'agenda', 'minutes', 'actions'] as const).map((tt) => (
          <button
            key={tt}
            role="tab"
            aria-selected={tab === tt}
            onClick={() => setTab(tt)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-caption font-semibold ${tab === tt ? 'border-blue text-link' : 'border-transparent text-slate hover:text-heading'}`}
          >
            {{ attendance: 'Kehadiran', agenda: 'Agenda', minutes: 'Minit', actions: 'Tindakan' }[tt]}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'attendance' && <AttendanceTab d={d} />}
        {tab === 'agenda' && <AgendaTab d={d} />}
        {tab === 'minutes' && <MinutesTab d={d} />}
        {tab === 'actions' && <ActionsTab d={d} />}
      </div>

      {editing && <MeetingFormDialog existing={m} onClose={() => setEditing(false)} />}
      <ConfirmDialog
        open={dialog === 'cancel'}
        title={t('Batalkan mesyuarat?')}
        description={t('Sebab akan direkodkan. Anda boleh menghantar notis pembatalan melalui NoMe.')}
        reasonLabel={t('Sebab pembatalan')}
        confirmLabel={t('Batalkan mesyuarat')}
        destructive
        pending={cancel.isPending}
        error={cancel.error?.message}
        onClose={close}
        onConfirm={(reason) => cancel.mutate({ id: m.id, reason }, { onSuccess: () => (toast.success(t('Mesyuarat dibatalkan.')), close()) })}
      />
      <ConfirmDialog
        open={dialog === 'publish' || dialog === 'unpublish'}
        title={dialog === 'publish' ? t('Terbitkan kehadiran kepada awam?') : t('Tarik balik penerbitan?')}
        description={dialog === 'publish' ? t('Hanya kehadiran yang telah disahkan dipaparkan. Alasan peribadi tidak sekali-kali diterbitkan. Mod paparan (statistik atau bernama) ditetapkan di Tetapan.') : t('Rekod akan dibuang daripada paparan awam.')}
        confirmLabel={dialog === 'publish' ? t('Terbitkan') : t('Tarik balik')}
        pending={publish.isPending}
        error={publish.error?.message}
        onClose={close}
        onConfirm={() => publish.mutate({ id: m.id, publish: dialog === 'publish' }, { onSuccess: () => (toast.success(t('Kemas kini disimpan.')), close()) })}
      />
    </>
  )
}

function AttendanceTab({ d }: { d: MeetingDetail }) {
  const toast = useToast()
  const set = useGatewayMutation('mtg.attendance.set', INVALIDATE)
  const verify = useGatewayMutation('mtg.attendance.verify', INVALIDATE)
  const exempt = useGatewayMutation('mtg.exempt', INVALIDATE)
  const [draft, setDraft] = useState<Record<string, { status: AttendanceStatus; reason: string }>>({})
  const [editReason, setEditReason] = useState('')
  const [exempting, setExempting] = useState<string | null>(null)
  const [exReason, setExReason] = useState('')
  const { canManage, canVerify } = d
  const entries = Object.entries(draft)
  const anyVerifiedChange = entries.some(([id]) => d.invitees.find((i) => i.memberId === id)?.verified)
  const error = set.error ?? verify.error ?? exempt.error

  const rowStatus = (memberId: string, fallback: AttendanceStatus) => draft[memberId]?.status ?? fallback

  if (!d.invitees.length) return <Card><CardBody className="text-caption text-slate">{canManage ? t('Tiada ahli dijemput.') : t('Anda tidak dijemput ke mesyuarat ini.')}</CardBody></Card>
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{canManage ? t('Rekod kehadiran') : t('Kehadiran saya')}</CardTitle>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => saveText('kehadiran.csv', 'text/csv', toCsv(['Nama', 'Jawatan', 'Biro', 'Status', 'Disahkan'], d.invitees.map((i) => [i.name, i.position, i.bureau, ATTENDANCE_LABELS[i.status], i.verified ? formatDateTime(i.verifiedAt) : ''])))}>
              <Download />
              {'CSV'}
            </Button>
            {canVerify && (
              <Button size="sm" onClick={() => verify.mutate({ meetingId: d.meeting.id }, { onSuccess: () => toast.success(t('Kehadiran disahkan.')) })} loading={verify.isPending} disabled={d.invitees.every((i) => i.verified)}>
                {t('Sahkan semua')}
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <TableShell minWidth="44rem">
        <thead>
          <tr>
            <Th>{t('Ahli')}</Th>
            <Th>{t('Jawatan / Biro')}</Th>
            <Th>{t('Status')}</Th>
            <Th>{t('Pengesah')}</Th>
          </tr>
        </thead>
        <tbody>
          {d.invitees.map((i) => (
            <tr key={i.memberId}>
              <Td className="font-semibold text-heading">{i.name}</Td>
              <Td>{[i.position, i.bureau].filter(Boolean).join(' · ') || '—'}</Td>
              <Td>
                {canManage && i.status !== 'exempted' && d.meeting.status !== 'cancelled' ? (
                  <div className="space-y-1.5">
                    <select
                      aria-label={t('Status kehadiran {name}', { name: i.name })}
                      value={rowStatus(i.memberId, i.status)}
                      onChange={(e) => setDraft({ ...draft, [i.memberId]: { status: e.target.value as AttendanceStatus, reason: draft[i.memberId]?.reason ?? i.reason } })}
                      className="h-9 rounded-input border border-line bg-paper px-2 text-caption"
                    >
                      {(['pending', 'present', 'late', 'excused', 'absent_without_reason'] as const).map((s) => (
                        <option key={s} value={s}>
                          {t(ATTENDANCE_LABELS[s])}
                        </option>
                      ))}
                    </select>
                    {rowStatus(i.memberId, i.status) === 'excused' && (
                      <input aria-label={t('Sebab {name} (peribadi)', { name: i.name })} placeholder={t('Sebab (peribadi)')} value={draft[i.memberId]?.reason ?? i.reason} maxLength={300} onChange={(e) => setDraft({ ...draft, [i.memberId]: { status: rowStatus(i.memberId, i.status), reason: e.target.value } })} className="h-9 w-full rounded-input border border-line px-2 text-caption" />
                    )}
                  </div>
                ) : (
                  <StatusBadge tone={ATTENDANCE_UI[i.status].tone}>{ATTENDANCE_UI[i.status].label}</StatusBadge>
                )}
                {i.status === 'exempted' && <p className="mt-1 text-micro text-slate">{i.exemptReason}{i.exemptUntil ? t('(hingga {v1})', { v1: formatDate(i.exemptUntil) }) : ''}</p>}
              </Td>
              <Td>
                {i.verified ? <span className="text-teal">✓ {i.verifiedBy}</span> : <span className="text-slate">{t('Belum')}</span>}
                {canManage && !i.verified && i.status !== 'exempted' && (
                  <Button size="sm" variant="tertiary" className="ml-1" onClick={() => (setExempting(i.memberId), setExReason(''))}>
                    {t('Kecualikan')}
                  </Button>
                )}
                {canManage && i.status === 'exempted' && !i.verified && (
                  <Button size="sm" variant="tertiary" onClick={() => exempt.mutate({ meetingId: d.meeting.id, memberId: i.memberId, reason: 'x', clear: true })}>
                    {t('Batal kecuali')}
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
      {canManage && entries.length > 0 && (
        <div className="space-y-3 border-tt border-line bg-ice p-4">
          {anyVerifiedChange && <FormField label={t('Sebab pembetulan (kehadiran telah disahkan)')} value={editReason} onChange={(e) => setEditReason(e.target.value)} maxLength={300} required hint={t('Pembetulan direkodkan dalam log audit.')} />}
          <div className="flex items-center gap-2">
            <Button
              loading={set.isPending}
              onClick={() => set.mutate({ meetingId: d.meeting.id, entries: entries.map(([memberId, v]) => ({ memberId, status: v.status, reason: v.reason })), editReason: editReason || undefined }, { onSuccess: () => (toast.success(t('Kehadiran disimpan.')), setDraft({}), setEditReason('')) })}
            >
              {t('Simpan {n} perubahan', { n: entries.length })}
            </Button>
            <Button variant="secondary" onClick={() => setDraft({})}>
              {t('Buang')}
            </Button>
          </div>
        </div>
      )}
      {error && <div className="p-4"><Notice>{error.message}</Notice></div>}
      <Dialog
        open={exempting !== null}
        onClose={() => setExempting(null)}
        title={t('Kecualikan ahli')}
        description={t('Ahli yang dikecualikan tidak dikira dalam penyebut peratus kehadiran. Sebab wajib dan direkodkan.')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setExempting(null)}>{t('Batal')}</Button>
            <Button loading={exempt.isPending} onClick={() => exempt.mutate({ meetingId: d.meeting.id, memberId: exempting!, reason: exReason }, { onSuccess: () => (setExempting(null), toast.success(t('Pengecualian direkodkan.'))) })}>
              {t('Kecualikan')}
            </Button>
          </>
        }
      >
        <TextAreaField label={t('Sebab pengecualian')} rows={3} value={exReason} onChange={(e) => setExReason(e.target.value)} maxLength={300} required />
        {exempt.error && <Notice className="mt-3">{exempt.error.message}</Notice>}
      </Dialog>
    </Card>
  )
}

function AgendaTab({ d }: { d: MeetingDetail }) {
  const toast = useToast()
  const save = useGatewayMutation('mtg.agenda.save', INVALIDATE)
  const [items, setItems] = useState<Omit<AgendaItem, 'sequence'>[]>(d.agenda.map(({ title, presenter, notes }) => ({ title, presenter, notes })))
  const [dirty, setDirty] = useState(false)
  const update = (i: number, patch: Partial<Omit<AgendaItem, 'sequence'>>) => (setItems(items.map((x, k) => (k === i ? { ...x, ...patch } : x))), setDirty(true))

  if (!d.canManage) {
    return (
      <Card>
        <CardBody>
          {d.agenda.length === 0 ? <p className="text-caption text-slate">{t('Agenda belum disediakan.')}</p> : (
            <ol className="space-y-3">
              {d.agenda.map((a) => (
                <li key={a.sequence} className="text-body">
                  <span className="font-mono text-micro text-slate">{a.sequence}.</span> <span className="font-semibold text-heading">{a.title}</span>
                  {a.presenter && <span className="text-slate"> — {a.presenter}</span>}
                  {a.notes && <p className="mt-0.5 whitespace-pre-line text-caption text-slate">{a.notes}</p>}
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    )
  }
  return (
    <Card>
      <CardBody className="space-y-4">
        {items.length === 0 && <p className="text-caption text-slate">{t('Belum ada item agenda.')}</p>}
        {items.map((it, i) => (
          <div key={i} className="grid gap-3 rounded-input border border-line p-3 sm:grid-cols-[1fr_12rem_auto]">
            <FormField label={t('Item {v1}', { v1: i + 1 })} value={it.title} onChange={(e) => update(i, { title: e.target.value })} maxLength={200} />
            <FormField label={t('Pembentang')} value={it.presenter} onChange={(e) => update(i, { presenter: e.target.value })} maxLength={100} />
            <Button className="self-end" variant="tertiary" onClick={() => (setItems(items.filter((_, k) => k !== i)), setDirty(true))} aria-label={t('Buang item {v1}', { v1: i + 1 })}>
              {t('Buang')}
            </Button>
            <TextAreaField className="sm:col-span-3" label={t('Nota')} rows={2} value={it.notes} onChange={(e) => update(i, { notes: e.target.value })} maxLength={1000} />
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => (setItems([...items, { title: '', presenter: '', notes: '' }]), setDirty(true))} disabled={items.length >= 40}>
            {t('Tambah item')}
          </Button>
          <Button loading={save.isPending} disabled={!dirty || items.some((x) => !x.title.trim())} onClick={() => save.mutate({ meetingId: d.meeting.id, items }, { onSuccess: () => (toast.success(t('Agenda disimpan.')), setDirty(false)) })}>
            {t('Simpan agenda')}
          </Button>
        </div>
        {save.error && <Notice>{save.error.message}</Notice>}
      </CardBody>
    </Card>
  )
}

function MinutesTab({ d }: { d: MeetingDetail }) {
  const toast = useToast()
  const save = useGatewayMutation('mtg.minutes.save', INVALIDATE)
  const approve = useGatewayMutation('mtg.minutes.approve', INVALIDATE)
  const { roles } = useAuth()
  const [content, setContent] = useState(d.minutes?.content ?? '')
  const m = d.minutes

  if (!d.canManage) {
    return <Card><CardBody>{m ? <div><StatusBadge tone="approved">{t('Versi')} {m.version} {t('· diluluskan')}</StatusBadge><p className="mt-3 whitespace-pre-line text-body">{m.content}</p></div> : <p className="text-caption text-slate">{t('Minit belum diluluskan.')}</p>}</CardBody></Card>
  }
  return (
    <Card>
      <CardBody className="space-y-4">
        {m && <StatusBadge tone={m.approvalStatus === 'approved' ? 'approved' : m.approvalStatus === 'submitted' ? 'pending' : 'draft'}>{t('Versi')} {m.version} · {{ draft: 'draf', submitted: 'menunggu kelulusan SUAK', approved: 'diluluskan' }[m.approvalStatus]}</StatusBadge>}
        <TextAreaField label={t('Kandungan minit')} rows={14} value={content} onChange={(e) => setContent(e.target.value)} maxLength={40000} hint={m?.approvalStatus === 'approved' ? t('Menyimpan akan mencipta versi baharu; versi lulus kekal dilihat ahli sehingga versi baharu diluluskan.') : undefined} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" loading={save.isPending && !save.variables?.submit} disabled={!content.trim()} onClick={() => save.mutate({ meetingId: d.meeting.id, content, submit: false }, { onSuccess: () => toast.success(t('Draf minit disimpan.')) })}>
            {t('Simpan draf')}
          </Button>
          <Button loading={save.isPending && !!save.variables?.submit} disabled={!content.trim()} onClick={() => save.mutate({ meetingId: d.meeting.id, content, submit: true }, { onSuccess: () => toast.success(t('Minit dihantar untuk kelulusan.')) })}>
            {t('Hantar untuk kelulusan')}
          </Button>
          {roles.includes('suak') && m?.approvalStatus === 'submitted' && (
            <Button loading={approve.isPending} onClick={() => approve.mutate({ meetingId: d.meeting.id }, { onSuccess: () => toast.success(t('Minit diluluskan.')) })}>
              {t('Luluskan minit')}
            </Button>
          )}
        </div>
        {(save.error || approve.error) && <Notice>{(save.error ?? approve.error)!.message}</Notice>}
      </CardBody>
    </Card>
  )
}

function ActionsTab({ d }: { d: MeetingDetail }) {
  const toast = useToast()
  const save = useGatewayMutation('mtg.action.save', INVALIDATE)
  const members = useGatewayQuery('mtg.members', {}, { enabled: d.canManage })
  const [form, setForm] = useState({ description: '', ownerId: '', dueDate: '' })

  return (
    <Card className="overflow-hidden">
      <CardBody className="space-y-4">
        {d.actions.length === 0 && <p className="text-caption text-slate">{t('Tiada tindakan susulan.')}</p>}
        <ul className="divide-y divide-line">
          {d.actions.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className={a.status === 'done' ? 'text-slate line-through' : 'font-semibold text-heading'}>{a.description}</p>
                <p className="text-caption text-slate">
                  {a.ownerName} {t('· tarikh akhir')} {formatDate(a.dueDate)} {a.overdue && <StatusBadge tone="rejected">{t('Lewat tempoh')}</StatusBadge>}
                </p>
              </div>
              <Button size="sm" variant="secondary" loading={save.isPending && save.variables?.id === a.id} onClick={() => save.mutate({ id: a.id, meetingId: d.meeting.id, description: a.description, ownerId: a.ownerId, dueDate: a.dueDate, status: a.status === 'done' ? 'open' : 'done' })}>
                {a.status === 'done' ? t('Buka semula') : t('Tandakan selesai')}
              </Button>
            </li>
          ))}
        </ul>
        {d.canManage && (
          <form
            className="grid gap-3 border-tt border-line pt-4 sm:grid-cols-[1fr_14rem_10rem_auto]"
            onSubmit={(e) => {
              e.preventDefault()
              save.mutate({ meetingId: d.meeting.id, description: form.description, ownerId: form.ownerId, dueDate: form.dueDate, status: 'open' }, { onSuccess: () => (toast.success(t('Tindakan ditambah.')), setForm({ description: '', ownerId: '', dueDate: '' })) })
            }}
          >
            <FormField label={t('Tindakan')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={400} required />
            <SelectField label={t('Pemilik')} value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} required>
              <option value="">{t('Pilih…')}</option>
              {members.data?.map((m) => (
                <option key={m.profileId} value={m.profileId}>
                  {m.name}
                </option>
              ))}
            </SelectField>
            <FormField label={t('Tarikh akhir')} type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
            <Button type="submit" className="self-end" loading={save.isPending && !save.variables?.id} disabled={!form.description || !form.ownerId || !form.dueDate}>
              {t('Tambah')}
            </Button>
          </form>
        )}
        {save.error && <Notice>{save.error.message}</Notice>}
      </CardBody>
    </Card>
  )
}
