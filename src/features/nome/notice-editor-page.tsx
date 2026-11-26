import { ArrowLeft, Send } from 'lucide-react'
import { keepPreviousData } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { NoticeView, RecipientSpec } from '@shared/api-contract'
import { ASSIGNABLE_ROLES, NOTICE_TYPES, NOTICE_TYPE_LABELS, type NoticeType } from '@shared/domain'
import { useCan } from '@/app/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormField, Notice, SelectField, TextAreaField } from '@/components/ui/form-field'
import { QueryState } from '@/components/ui/query-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { TableShell, Td, Th } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { useGatewayMutation, useGatewayQuery } from '@/hooks/use-gateway'
import { fromLocalInput, formatDateTime, isFuture, toLocalInput } from '@/lib/format'
import { NOTICE_STATUS_UI } from '@/lib/status-ui'
import { ROLE_LABELS } from '@/types/domain'
import { t } from '@/i18n'

const INVALIDATE = ['notice.list', 'notice.get', 'notice.preview', 'notice.deliveries', 'dashboard.summary'] as const

export function NoticeEditorPage() {
  const { id = 'baru' } = useParams()
  const isNew = id === 'baru'
  const q = useGatewayQuery('notice.get', { id }, { enabled: !isNew })
  return (
    <div className="space-y-4">
      <Link to="/workspace/nome" className="inline-flex items-center gap-1 text-caption font-medium text-link hover:underline">
        <ArrowLeft className="size-4" aria-hidden />
        {t('Semua notis')}
      </Link>
      {isNew ? <Editor key="new" /> : <QueryState query={q} isEmpty={() => false} empty={{ title: '' }}>{(n) => <Editor key={n.id + n.status} notice={n} />}</QueryState>}
    </div>
  )
}

function Editor({ notice }: { notice?: NoticeView }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const canPrepare = useCan('nome.prepare')
  const members = useGatewayQuery('mtg.members', {})
  const groups = useGatewayQuery('admin.groups.list', {})
  const save = useGatewayMutation('notice.save', INVALIDATE)
  const locked = notice ? !['draft', 'ready'].includes(notice.status) : false

  const [type, setType] = useState<NoticeType>(notice?.type ?? 'meeting_notice')
  const [subject, setSubject] = useState(notice?.subject ?? '')
  const [body, setBody] = useState(notice?.body ?? '')
  const [eventAt, setEventAt] = useState(toLocalInput(notice?.eventAt ?? ''))
  const [location, setLocation] = useState(notice?.location ?? '')
  const [link, setLink] = useState(notice?.link ?? '')
  const [scheduledAt, setScheduledAt] = useState(toLocalInput(notice?.scheduledAt ?? ''))
  const [spec, setSpec] = useState<RecipientSpec>(notice?.recipientSpec ?? { all: true })
  const [error, setError] = useState<string | null>(null)
  const meetingId = notice?.meetingId ?? params.get('meeting') ?? ''
  // The query key includes the spec, so the count refreshes as selections change.
  const recipients = useGatewayQuery('notice.recipients', { spec }, { enabled: canPrepare && !locked, placeholderData: keepPreviousData })

  const bureaus = useMemo(() => [...new Set((members.data ?? []).map((m) => m.bureau).filter(Boolean))].sort(), [members.data])
  const toggle = <K extends 'roles' | 'bureaus' | 'groupIds' | 'profileIds'>(key: K, value: string) => {
    const cur = (spec[key] ?? []) as string[]
    setSpec({ ...spec, all: false, [key]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] })
  }

  const submit = () => {
    if (!subject.trim() || !body.trim()) return setError(t('Lengkapkan subjek dan kandungan.'))
    setError(null)
    save.mutate(
      { id: notice?.id, type, subject, body, eventAt: eventAt ? fromLocalInput(eventAt) : undefined, location, link, meetingId: meetingId || undefined, recipientSpec: spec, scheduledAt: scheduledAt ? fromLocalInput(scheduledAt) : undefined },
      { onSuccess: (n) => (toast.success(t('Draf disimpan.')), navigate(`/workspace/nome/${n.id}`, { replace: true })) },
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{notice ? t('Notis') : t('Notis baharu')}</CardTitle>
            {notice && <StatusBadge tone={NOTICE_STATUS_UI[notice.status].tone}>{NOTICE_STATUS_UI[notice.status].label}</StatusBadge>}
          </CardHeader>
          <CardBody>
            <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), submit())} noValidate>
              <fieldset disabled={locked || !canPrepare} className="space-y-4">
                <SelectField label={t('Kategori')} value={type} onChange={(e) => setType(e.target.value as NoticeType)}>
                  {NOTICE_TYPES.map((nt) => <option key={nt} value={nt}>{t(NOTICE_TYPE_LABELS[nt])}</option>)}
                </SelectField>
                <FormField label={t('Subjek')} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} required />
                <TextAreaField label={t('Kandungan')} rows={8} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} required hint={t('Baris kosong memulakan perenggan baharu. Teks biasa sahaja.')} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label={t('Tarikh & masa acara')} type="datetime-local" value={eventAt} onChange={(e) => setEventAt(e.target.value)} />
                  <FormField label={t('Lokasi')} value={location} onChange={(e) => setLocation(e.target.value)} maxLength={150} />
                </div>
                <FormField label={t('Pautan (https)')} type="url" value={link} onChange={(e) => setLink(e.target.value)} maxLength={300} />
                <FormField label={t('Jadualkan penghantaran (pilihan)')} type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} hint={t('Kosongkan untuk hantar sebaik sahaja disahkan. Dijadualkan dihantar dalam masa 15 minit selepas waktu yang dipilih.')} />
              </fieldset>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('Penerima')}</CardTitle>
            <span className="text-caption font-semibold text-heading" aria-live="polite">{recipients.data ? t('{count} penerima', { count: recipients.data.count }) : '…'}</span>
          </CardHeader>
          <CardBody>
            <fieldset disabled={locked || !canPrepare} className="space-y-5">
              <label className="flex items-center gap-2 text-caption font-medium">
                <input type="checkbox" checked={!!spec.all} onChange={(e) => setSpec(e.target.checked ? { all: true } : {})} className="size-4 accent-[var(--color-blue)]" />
                {t('Semua ahli berdaftar')}
              </label>
              <Group legend={t('Peranan')}>
                {ASSIGNABLE_ROLES.map((r) => <Chip key={r} on={!!spec.roles?.includes(r)} label={t(ROLE_LABELS[r])} onClick={() => toggle('roles', r)} />)}
              </Group>
              {bureaus.length > 0 && <Group legend={t('Biro')}>{bureaus.map((b) => <Chip key={b} on={!!spec.bureaus?.includes(b)} label={b} onClick={() => toggle('bureaus', b)} />)}</Group>}
              {!!groups.data?.length && <Group legend={t('Kumpulan tersimpan')}>{groups.data.filter((g) => g.active).map((g) => <Chip key={g.id} on={!!spec.groupIds?.includes(g.id)} label={`${g.name} (${g.profileIds.length})`} onClick={() => toggle('groupIds', g.id)} />)}</Group>}
              <details>
                <summary className="cursor-pointer text-caption font-semibold text-link">{t('Pilih individu')}</summary>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {members.data?.map((m) => <Chip key={m.profileId} on={!!spec.profileIds?.includes(m.profileId)} label={m.name} onClick={() => toggle('profileIds', m.profileId)} />)}
                </div>
              </details>
            </fieldset>
            {recipients.data && recipients.data.people.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-caption font-semibold text-link">{t('Senarai penerima ({n})', { n: recipients.data.count })}</summary>
                <ul className="mt-2 max-h-48 overflow-y-auto text-caption text-slate">
                  {recipients.data.people.map((p) => <li key={p.profileId}>{p.name} <span className="font-mono text-micro">{p.emailMasked}</span></li>)}
                </ul>
              </details>
            )}
            {recipients.error && <Notice className="mt-3">{recipients.error.message}</Notice>}
          </CardBody>
        </Card>

        {!locked && canPrepare && (
          <div className="flex flex-wrap items-center gap-2">
            <Button loading={save.isPending} onClick={submit}>{t('Simpan draf')}</Button>
            {(error || save.error) && <Notice>{error ?? save.error?.message}</Notice>}
          </div>
        )}
      </div>

      <div className="space-y-6">{notice ? <SendPanel notice={notice} /> : <Card><CardBody className="text-caption text-slate">{t('Simpan draf untuk melihat pratonton e-mel dan menghantar.')}</CardBody></Card>}</div>
    </div>
  )
}

function Group({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-micro font-semibold uppercase tracking-wide text-slate">{legend}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}
function Chip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`rounded-full border px-3 py-1 text-caption font-medium transition-colors ${on ? 'border-blue bg-blue-100 text-link' : 'border-line bg-paper text-slate hover:border-blue'}`}>
      {label}
    </button>
  )
}

function SendPanel({ notice }: { notice: NoticeView }) {
  const toast = useToast()
  const canSend = useCan('nome.send')
  const canPrepare = useCan('nome.prepare')
  const preview = useGatewayQuery('notice.preview', { id: notice.id }, { enabled: ['draft', 'ready'].includes(notice.status) })
  const deliveries = useGatewayQuery('notice.deliveries', { id: notice.id }, { enabled: ['sent', 'partial', 'failed'].includes(notice.status) })
  const ready = useGatewayMutation('notice.markReady', INVALIDATE)
  const send = useGatewayMutation('notice.send', INVALIDATE)
  const retry = useGatewayMutation('notice.retry', INVALIDATE)
  const cancel = useGatewayMutation('notice.cancel', INVALIDATE)
  const [dlg, setDlg] = useState<'send' | 'cancel' | null>(null)
  const count = preview.data?.recipients.count ?? notice.recipientCount
  const scheduled = isFuture(notice.scheduledAt)
  const finish = () => (send.reset(), cancel.reset(), setDlg(null))

  return (
    <>
      {['draft', 'ready'].includes(notice.status) && (
        <Card>
          <CardHeader><CardTitle>{t('Pratonton e-mel')}</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <QueryState query={preview} isEmpty={() => false} empty={{ title: '' }} rows={2}>
              {(p) => (
                <>
                  <iframe title={t('Pratonton e-mel')} sandbox="" srcDoc={p.html} className="h-[26rem] w-full rounded-input border border-line bg-white" />
                  <p className="text-micro text-slate">{t('{count} penerima · baki kuota e-mel hari ini: {left}', { count: p.recipients.count, left: p.quotaRemaining })}</p>
                </>
              )}
            </QueryState>
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              {notice.status === 'draft' && canPrepare && <Button variant="secondary" loading={ready.isPending} onClick={() => ready.mutate({ id: notice.id }, { onSuccess: () => toast.success(t('Ditandakan sedia untuk kelulusan.')) })}>{t('Tandakan sedia')}</Button>}
              {canSend ? <Button onClick={() => setDlg('send')}><Send />{scheduled ? t('Sahkan & jadualkan') : t('Sahkan & hantar')}</Button> : <p className="text-caption text-slate">{t('Penghantaran memerlukan kelulusan SUAK atau pemegang kuasa “Hantar NoMe”.')}</p>}
              <Button variant="tertiary" onClick={() => setDlg('cancel')}>{t('Batalkan notis')}</Button>
            </div>
            {(ready.error) && <Notice>{ready.error.message}</Notice>}
          </CardBody>
        </Card>
      )}

      {notice.status === 'scheduled' && (
        <Card><CardBody className="space-y-3"><p className="text-body">{t('Dijadualkan untuk {when} kepada {n} penerima.', { when: formatDateTime(notice.scheduledAt), n: notice.recipientCount })}</p>{(canSend || canPrepare) && <Button variant="secondary" onClick={() => setDlg('cancel')}>{t('Batalkan penjadualan')}</Button>}</CardBody></Card>
      )}

      {['sent', 'partial', 'failed'].includes(notice.status) && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{t('Laporan penghantaran')}</CardTitle>
            {canSend && notice.status !== 'sent' && <Button size="sm" loading={retry.isPending} onClick={() => retry.mutate({ id: notice.id }, { onSuccess: () => toast.success(t('Percubaan semula selesai.')) })}>{t('Cuba semula yang gagal')}</Button>}
          </CardHeader>
          <CardBody className="text-caption text-slate">{t('{sent} berjaya · {failed} gagal · {when}. Penerima yang sudah berjaya tidak akan dihantar semula.', { sent: notice.sentCount, failed: notice.failedCount, when: formatDateTime(notice.sentAt) })}</CardBody>
          <QueryState query={deliveries} empty={{ title: t('Tiada rekod') }} rows={2}>
            {(rows) => (
              <TableShell minWidth="28rem">
                <thead><tr><Th>{t('Penerima')}</Th><Th>{t('Status')}</Th></tr></thead>
                <tbody>{rows.map((r) => <tr key={r.id}><Td>{r.name}<p className="font-mono text-micro text-slate">{r.emailMasked}</p></Td><Td><StatusBadge tone={r.status === 'sent' ? 'approved' : r.status === 'failed' ? 'rejected' : 'pending'}>{r.status === 'sent' ? t('Dihantar') : r.status === 'failed' ? t('Gagal') : t('Menunggu')}</StatusBadge>{r.error && <p className="text-micro text-red">{r.error}</p>}</Td></tr>)}</tbody>
              </TableShell>
            )}
          </QueryState>
          {retry.error && <div className="p-4"><Notice>{retry.error.message}</Notice></div>}
        </Card>
      )}

      <ConfirmDialog
        open={dlg === 'send'}
        title={scheduled ? t('Jadualkan penghantaran?') : t('Hantar kepada {count} penerima?', { count: count })}
        description={t('Setiap penerima menerima satu salinan berasingan. Bilangan penerima disahkan: {count}. Penghantaran tidak boleh ditarik balik.', { count: count })}
        confirmLabel={scheduled ? t('Jadualkan') : t('Hantar kepada {count}', { count: count })}
        pending={send.isPending}
        error={send.error?.message}
        onClose={finish}
        onConfirm={() => send.mutate({ id: notice.id, confirmCount: count }, { onSuccess: (n) => (toast.success(n.status === 'scheduled' ? t('Penghantaran dijadualkan.') : t('Selesai: {sentCount} berjaya, {failedCount} gagal.', { sentCount: n.sentCount, failedCount: n.failedCount })), finish()) })}
      />
      <ConfirmDialog open={dlg === 'cancel'} title={t('Batalkan notis ini?')} confirmLabel={t('Ya, batalkan')} destructive pending={cancel.isPending} error={cancel.error?.message} onClose={finish} onConfirm={() => cancel.mutate({ id: notice.id }, { onSuccess: () => (toast.success(t('Notis dibatalkan.')), finish()) })} />
    </>
  )
}
