import { CalendarRange, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { SessionInfo } from '@shared/api-contract'
import { useAuth } from '@/app/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/components/ui/toast'
import { useGatewayMutation, useGatewayQuery } from '@/hooks/use-gateway'
import { FormField } from '@/components/ui/form-field'
import { formatDate, SESSION_STATUS_UI } from './labels'
import { t } from '@/i18n'

export function SessionsPage() {
  const { roles } = useAuth()
  const canManage = roles.includes('suak')
  const sessions = useGatewayQuery('admin.sessions.list', {})
  const [creating, setCreating] = useState(false)
  const [activating, setActivating] = useState<SessionInfo | null>(null)

  return (
    <section aria-labelledby="sessions-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="sessions-heading" className="text-h3 font-bold">
            {t('Sesi kepimpinan JPP')}
          </h2>
          <p className="mt-1 text-caption text-slate">{t('Rekod organisasi diikat kepada sesi. Hanya satu sesi aktif pada satu masa.')}</p>
        </div>
        {canManage && (
          <Button onClick={() => setCreating(true)}>
            <Plus />
            {t('Sesi baharu')}
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        {sessions.isPending ? (
          <div className="space-y-3 p-5" aria-busy="true" aria-label={t('Memuatkan sesi')}>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : sessions.isError ? (
          <EmptyState
            icon={CalendarRange}
            title={t('Senarai sesi tidak dapat dimuatkan')}
            description={sessions.error.message}
            action={
              <Button variant="secondary" onClick={() => void sessions.refetch()}>
                {t('Cuba lagi')}
              </Button>
            }
          />
        ) : sessions.data.length === 0 ? (
          <EmptyState icon={CalendarRange} title={t('Belum ada sesi')} description={t('Cipta sesi kepimpinan pertama untuk mula merekod keahlian.')} />
        ) : (
          <ul className="divide-y divide-line">
            {sessions.data.map((s) => (
              <li key={s.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-heading">{s.name}</p>
                  <p className="text-caption text-slate">
                    {formatDate(s.startDate)} — {formatDate(s.endDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge tone={SESSION_STATUS_UI[s.status].tone}>{SESSION_STATUS_UI[s.status].label}</StatusBadge>
                  {canManage && s.status === 'planned' && (
                    <Button size="sm" variant="secondary" onClick={() => setActivating(s)}>
                      {t('Aktifkan')}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-micro text-slate">{t('Keperluan: ADM-03, DASH-07 · Penguncian arkib sesi dan serah tugas penuh dalam Fasa 5.')}</p>

      {canManage && <CreateSessionDialog open={creating} onClose={() => setCreating(false)} />}
      {canManage && (
        <ActivateSessionDialog
          session={activating}
          current={sessions.data?.find((s) => s.status === 'active') ?? null}
          onClose={() => setActivating(null)}
        />
      )}
    </section>
  )
}

function CreateSessionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const create = useGatewayMutation('admin.sessions.create', ['admin.sessions.list'])
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    setName('')
    setStartDate('')
    setEndDate('')
    setError(null)
    create.reset()
    onClose()
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !startDate || !endDate) return setError(t('Lengkapkan semua medan.'))
    if (endDate < startDate) return setError(t('Tarikh tamat mesti selepas tarikh mula.'))
    setError(null)
    create.mutate({ name, startDate, endDate }, { onSuccess: (s) => (toast.success(t('Sesi {name} dicipta sebagai Dirancang.', { name: s.name })), close()) })
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t('Sesi baharu')}
      description={t('Sesi dicipta sebagai Dirancang. Aktifkan apabila kepimpinan baharu bermula.')}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {t('Batal')}
          </Button>
          <Button type="submit" form="session-form" loading={create.isPending}>
            {t('Cipta sesi')}
          </Button>
        </>
      }
    >
      <form id="session-form" noValidate onSubmit={submit} className="space-y-4">
        <FormField label={t('Nama sesi')} placeholder={t('cth. Legasi Ke-73 · Sesi 2027/2028')} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('Tarikh mula')} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          <FormField label={t('Tarikh tamat')} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
        {(error || create.error) && (
          <p role="alert" className="rounded-input border border-red/30 bg-red-100 p-3 text-caption text-red">
            {error ?? create.error?.message}
          </p>
        )}
      </form>
    </Dialog>
  )
}

function ActivateSessionDialog({ session, current, onClose }: { session: SessionInfo | null; current: SessionInfo | null; onClose: () => void }) {
  const toast = useToast()
  const activate = useGatewayMutation('admin.sessions.activate', ['admin.sessions.list', 'session.active'])
  const close = () => {
    activate.reset()
    onClose()
  }
  if (!session) return null
  return (
    <Dialog
      open
      onClose={close}
      title={t('Aktifkan {name}?', { name: session.name })}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {t('Batal')}
          </Button>
          <Button
            loading={activate.isPending}
            onClick={() => activate.mutate({ sessionId: session.id }, { onSuccess: () => (toast.success(t('{name} kini sesi aktif.', { name: session.name })), close()) })}
          >
            {t('Aktifkan')}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-body text-slate">
        {current ? (
          <p>
            {t('Sesi aktif sekarang, {name}, akan diarkibkan dan tidak boleh diaktifkan semula.', { name: current.name })}
          </p>
        ) : (
          <p>{t('Tiada sesi aktif sekarang.')}</p>
        )}
        <p>{t('Rekod baharu selepas ini akan diikat kepada sesi ini.')}</p>
        {activate.error && (
          <p role="alert" className="rounded-input border border-red/30 bg-red-100 p-3 text-caption text-red">
            {activate.error.message}
          </p>
        )}
      </div>
    </Dialog>
  )
}
