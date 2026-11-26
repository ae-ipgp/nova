import { Activity, CalendarDays, FileText, Inbox, ListChecks, Mail, Plus, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth, useCan } from '@/app/auth-context'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useGatewayQuery } from '@/hooks/use-gateway'
import { cn } from '@/lib/cn'
import { describeAction } from '@/lib/audit-labels'
import { formatDate, formatDateTime } from '@/lib/format'
import { ROLE_LABELS } from '@/types/domain'
import { AnnouncementCard } from '../board/board-page'
import { t } from '@/i18n'

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? t('Selamat pagi') : h < 15 ? t('Selamat tengah hari') : h < 19 ? t('Selamat petang') : t('Selamat malam')
}

export function DashboardPage() {
  const { roles, state, mode } = useAuth()
  const me = state.status === 'signed_in' ? state.me : null
  const canSend = useCan('nome.prepare')
  const staff = roles.includes('suak') || roles.includes('secretariat')
  const q = useGatewayQuery('dashboard.summary', {}, { enabled: mode === 'live' && roles.some((r) => r !== 'system_admin') })
  const d = q.data
  const eyebrow = [roles.map((r) => ROLE_LABELS[r]).join(' · '), me?.activeSession?.name ?? 'Tiada sesi aktif'].filter(Boolean).join(' · ')
  const actions = [
    { label: t('Mohon nombor rujukan'), icon: Plus, to: '/workspace/e-surat', show: roles.some((r) => r !== 'system_admin') },
    { label: t('Cipta mesyuarat'), icon: CalendarDays, to: '/workspace/e-mesyuarat', show: staff },
    { label: t('Cipta NoMe'), icon: Send, to: '/workspace/nome/baru', show: canSend },
    { label: t('Cipta OPR'), icon: FileText, to: '/workspace/e-opr/baru', show: roles.some((r) => r !== 'system_admin') },
  ].filter((a) => a.show)

  const kpis = [
    { label: staff ? t('Permohonan menunggu kelulusan') : t('Permohonan saya menunggu'), icon: Inbox, to: '/workspace/e-surat', value: d?.pendingReferences },
    { label: t('Mesyuarat seterusnya'), icon: CalendarDays, to: '/workspace/e-mesyuarat', value: d ? (d.nextMeeting ? formatDate(d.nextMeeting.startsAt) : 'Tiada') : undefined },
    { label: t('OPR dalam proses'), icon: FileText, to: '/workspace/e-opr', value: d?.oprInProgress },
    { label: staff ? t('Surat bulan ini') : t('Tindakan terbuka saya'), icon: Mail, to: staff ? '/workspace/e-surat/surat' : '/workspace/e-mesyuarat', value: d ? (staff ? d.correspondenceThisMonth : d.openActions.length) : undefined },
  ]

  return (
    <div className="space-y-6">
      <section aria-label={t('Sambutan')} className="relative overflow-hidden rounded-hero bg-navy p-6 text-white md:p-8">
        <p className="font-mono text-micro uppercase tracking-[0.14em] text-sky/80">{eyebrow}</p>
        <h1 className="mt-2 max-w-2xl text-h1 font-extrabold text-white">{t('Your secretariat, at a glance.')}</h1>
        <p className="mt-2 max-w-xl text-body-lg text-sky/85">
          {me?.profile?.fullName ? `${greeting()}, ${me.profile.fullName.split(' ')[0]}. ` : ''}{t('Ringkasan operasi, tindakan tertunggak dan aktiviti terkini mengikut peranan anda.')}
        </p>
        {actions.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {actions.map((a, i) => (
              <Link key={a.label} to={a.to} className={buttonVariants({ variant: i === 0 ? 'inverse' : 'ghostInverse', size: 'sm' })}>
                <a.icon />
                {a.label}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-label={t('Penunjuk utama')} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} to={k.to} className="group rounded-card border border-line bg-paper p-5 transition-colors hover:border-blue">
            <div className="flex items-start justify-between gap-3">
              <p className="min-h-[2.8em] text-caption text-slate">{k.label}</p>
              <k.icon className="size-4 shrink-0 text-link" aria-hidden />
            </div>
            {k.value === undefined ? (
              mode === 'live' && q.isPending ? <Skeleton className="mt-4 h-8 w-16" /> : (
                <p className="mt-4 font-display text-h2 font-bold text-line"><span aria-hidden>—</span><span className="sr-only">{t('Tiada data')}</span></p>
              )
            ) : (
              <p className="mt-4 font-display text-h2 font-bold text-heading tabular">{k.value}</p>
            )}
          </Link>
        ))}
      </section>

      {q.isError && <p role="alert" className="rounded-input border border-red/30 bg-red-100 p-3 text-caption text-red">{q.error.message}</p>}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader><CardTitle>{t('Tindakan memerlukan perhatian')}</CardTitle></CardHeader>
          {d ? (
            d.openActions.length === 0 && !(staff && d.pendingReferences > 0) ? (
              <EmptyState icon={ListChecks} pose="thumbsup" title={t('Tiada tindakan tertunggak')} description={t('Permohonan, kelulusan dan tindakan susulan akan disusun mengikut keutamaan dan tarikh.')} />
            ) : (
              <ul className="divide-y divide-line">
                {staff && roles.includes('suak') && d.pendingReferences > 0 && <li><Link to="/workspace/e-surat" className="flex items-center justify-between px-5 py-3 hover:bg-ice"><span className="text-body font-semibold text-heading">{t('{n} permohonan nombor rujukan menunggu kelulusan anda', { n: d.pendingReferences })}</span><StatusBadge tone="pending">{t('Semak')}</StatusBadge></Link></li>}
                {d.openActions.map((a) => <li key={a.id}><Link to={`/workspace/e-mesyuarat/${a.meetingId}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-ice"><span><span className="block text-body font-semibold text-heading">{a.description}</span><span className="text-caption text-slate">{a.meetingTitle} · {formatDate(a.dueDate)}</span></span>{a.overdue && <StatusBadge tone="rejected">{t('Lewat')}</StatusBadge>}</Link></li>)}
              </ul>
            )
          ) : <EmptyState icon={ListChecks} title={t('Tiada data')} description={t('Data dimuatkan selepas log masuk.')} />}
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('Mesyuarat akan datang')}</CardTitle></CardHeader>
          {d?.nextMeeting ? (
            <CardBody><Link to={`/workspace/e-mesyuarat/${d.nextMeeting.id}`} className="block rounded-input hover:bg-ice"><p className="font-semibold text-heading">{d.nextMeeting.title}</p><p className="text-caption text-slate">{formatDateTime(d.nextMeeting.startsAt)}</p><p className="text-caption text-slate">{d.nextMeeting.location || t('Atas talian')}</p></Link></CardBody>
          ) : <EmptyState icon={CalendarDays} pose="calendar" title={t('Tiada mesyuarat dijadualkan')} description={t('Mesyuarat dan status persediaan akan dipaparkan di sini.')} />}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="board-h" className="space-y-3">
          <div className="flex items-center justify-between"><h2 id="board-h" className="text-h3 font-bold">{t('Papan Notis')}</h2><Link to="/workspace/papan-notis" className="text-caption font-semibold text-link hover:underline">{t('Lihat semua')}</Link></div>
          {q.isPending && mode === 'live' ? <Skeleton className="h-24 w-full" /> : d && d.board.length > 0 ? <ul className="space-y-3">{d.board.slice(0, 3).map((a) => <li key={a.id}><AnnouncementCard a={a} /></li>)}</ul> : <Card><EmptyState icon={Activity} title={t('Tiada notis aktif')} description={t('Notis terkini dari Sekretariat akan muncul di sini.')} /></Card>}
        </section>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{t('Tindakan pantas')}</CardTitle></CardHeader>
            <CardBody>
              {actions.length ? <ul className="grid gap-2">{actions.map((a) => <li key={a.label}><Link to={a.to} className={cn(buttonVariants({ variant: 'secondary' }), 'w-full justify-start')}><a.icon />{a.label}</Link></li>)}</ul> : <p className="text-caption text-slate">{t('Tiada tindakan pantas untuk peranan ini.')}</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t('Aktiviti terkini')}</CardTitle></CardHeader>
            {d && d.recentActivity.length > 0 ? <ul className="divide-y divide-line text-caption">{d.recentActivity.map((a, i) => <li key={i} className="px-5 py-2.5"><span className="font-mono text-micro text-slate">{formatDateTime(a.at)}</span><br />{describeAction(a.action)} <span className="text-slate">· {a.actor}</span></li>)}</ul> : <EmptyState icon={Activity} title={t('Belum ada aktiviti')} description={t('Perubahan terkini yang anda dibenarkan lihat akan muncul di sini.')} />}
          </Card>
        </div>
      </div>
    </div>
  )
}
