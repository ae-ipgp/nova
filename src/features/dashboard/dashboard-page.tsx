import { CalendarDays, FileText, Inbox, ListChecks, Mail, Plus, Send, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePreviewRole } from '@/app/preview-role'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { MODULES, workspacePath } from '@/config/modules'
import { SITE } from '@/config/site'
import { cn } from '@/lib/cn'
import { ROLE_LABELS, type RoleKey } from '@/types/domain'

const KPIS = [
  { label: 'Permohonan nombor rujukan menunggu', icon: Inbox, module: 'e-surat' },
  { label: 'Mesyuarat seterusnya', icon: CalendarDays, module: 'e-mesyuarat' },
  { label: 'OPR dalam proses', icon: FileText, module: 'e-opr' },
  { label: 'Surat terkini', icon: Mail, module: 'e-surat' },
] as const

const QUICK_ACTIONS: { label: string; icon: typeof Plus; module: string; roles: readonly RoleKey[] }[] = [
  { label: 'Mohon nombor rujukan', icon: Plus, module: 'e-surat', roles: ['member', 'secretariat', 'suak'] },
  { label: 'Cipta mesyuarat', icon: CalendarDays, module: 'e-mesyuarat', roles: ['secretariat', 'suak'] },
  { label: 'Cipta NoMe', icon: Send, module: 'nome', roles: ['secretariat', 'suak'] },
  { label: 'Cipta OPR', icon: FileText, module: 'e-opr', roles: ['member', 'secretariat', 'suak'] },
]

export function DashboardPage() {
  const { role } = usePreviewRole()
  const actions = QUICK_ACTIONS.filter((a) => a.roles.includes(role))
  const dashboard = MODULES[0]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${ROLE_LABELS[role]} · ${SITE.demoSessionLabel}`}
        title="Your secretariat, at a glance."
        description="Ringkasan operasi, tindakan tertunggak dan aktiviti terkini mengikut peranan anda."
        actions={actions.slice(0, 2).map((a) => (
          <Link key={a.label} to={`/workspace/${a.module}`} className={buttonVariants({ variant: a === actions[0] ? 'primary' : 'secondary' })}>
            <a.icon />
            {a.label}
          </Link>
        ))}
      />

      {/* KPI strip — values arrive with Phase 2 data; never show invented numbers. */}
      <section aria-label="Penunjuk utama" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map(({ label, icon: Icon, module }) => (
          <Link key={label} to={`/workspace/${module}`} className="group rounded-card border border-line bg-paper p-5 transition-colors hover:border-blue">
            <div className="flex items-start justify-between gap-3">
              <p className="min-h-[2.8em] text-caption text-slate">{label}</p>
              <Icon className="size-4 shrink-0 text-blue" aria-hidden />
            </div>
            <p className="mt-4 font-display text-h2 font-bold text-line tabular">
              <span aria-hidden>—</span>
              <span className="sr-only">Tiada data</span>
            </p>
            <p className="mt-1 text-micro text-slate">Data tersedia selepas Fasa 2</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tindakan memerlukan perhatian</CardTitle>
          </CardHeader>
          <EmptyState icon={ListChecks} title="Tiada tindakan tertunggak" description="Permohonan, kelulusan dan tindakan susulan akan disusun mengikut keutamaan dan tarikh." />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mesyuarat akan datang</CardTitle>
          </CardHeader>
          <EmptyState icon={CalendarDays} title="Tiada mesyuarat dijadualkan" description="Mesyuarat dan status persediaan akan dipaparkan di sini." />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Aktiviti terkini</CardTitle>
          </CardHeader>
          <EmptyState icon={Activity} title="Belum ada aktiviti" description="Perubahan terkini yang anda dibenarkan lihat akan muncul di sini." />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tindakan pantas</CardTitle>
          </CardHeader>
          <CardBody>
            {actions.length ? (
              <ul className="grid gap-2">
                {actions.map((a) => (
                  <li key={a.label}>
                    <Link to={`/workspace/${a.module}`} className={cn(buttonVariants({ variant: 'secondary' }), 'w-full justify-start')}>
                      <a.icon />
                      {a.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-caption text-slate">Tiada tindakan pantas untuk peranan ini.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <p className="text-micro text-slate">
        Keperluan berkaitan: {dashboard.requirements.map((r) => r.id).join(', ')} · Laluan: <code className="font-mono">{workspacePath(dashboard)}</code>
      </p>
    </div>
  )
}
