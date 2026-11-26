import { CheckCircle2, Network, Users } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardBody } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { useSite } from '@/hooks/use-site'
import { usePublic } from '@/hooks/use-public'
import { t } from '@/i18n'
import { cn } from '@/lib/cn'
import { Cms, CmsFile, CmsImage, CmsListEditButton, listText, useCms, useCmsList, type ListField } from '@/lib/content'
import { useLangPref } from '@/lib/prefs'
import { PublicPage } from './public-page'
import { PublicState } from './public-state'

const PROGRESS_FIELDS = (): ListField[] => [
  { key: 'title', label: t('Tajuk') },
  { key: 'status', label: t('Status (cth. Sedang berjalan, Selesai)') },
  { key: 'text', label: t('Huraian'), multiline: true },
]
const LEGACY_FIELDS = (): ListField[] => [
  { key: 'title', label: t('Tajuk (cth. Legasi Ke-71)') },
  { key: 'period', label: t('Tempoh (cth. Sesi 2025/2026)') },
  { key: 'text', label: t('Huraian'), multiline: true },
]

/**
 * Organisasi: the organisation chart, the active leadership, work in progress and the legacy of earlier leaderships.
 * Everything except the leadership list is written by SUAK in "Mod suntingan"; nothing is invented here.
 */
export function OrganisationPage() {
  const { site } = useSite()
  const leaders = usePublic('public.leaders')
  const lang = useLangPref()
  const { items, editing } = useCms()
  const progress = useCmsList('org.progress')
  const legacy = useCmsList('org.legacy')
  const hasChart = items.get('org.chart')?.kind === 'image' && !items.get('org.chart')?.hidden
  const about = site.settings.about_text

  return (
    <PublicPage id="org" eyebrowMs="Organisasi" titleMs="Organisasi" descriptionMs="Carta organisasi, kepimpinan, kemajuan kerja dan legasi kepimpinan." title={site.settings.org_name || t('JPP IPGKKB')}>
      <div className="space-y-16">
        <section aria-labelledby="org-profile" className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 id="org-profile" className="text-h3 font-bold">
              <Cms id="org.profile.title" ms="Profil" />
            </h2>
            <p className="mt-3 whitespace-pre-line text-body-lg text-ink">{about || <Cms id="org.profile.text" ms="Belum ditetapkan oleh pentadbir." multiline />}</p>
          </div>
        </section>

        <section aria-labelledby="org-chart" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="org-chart" className="flex items-center gap-2 text-h3 font-bold">
              <Network className="size-5 text-link" aria-hidden />
              <Cms id="org.chart.title" ms="Carta organisasi" />
            </h2>
            <CmsFile id="org.chart.file" ms="Muat turun carta (PDF)" className={buttonVariants({ variant: 'secondary', size: 'sm' })} />
          </div>
          {hasChart || editing ? (
            <Card>
              <CardBody>
                <CmsImage id="org.chart" alt={t('Carta organisasi')} className="mx-auto max-h-[40rem] w-full object-contain" />
              </CardBody>
            </Card>
          ) : (
            <p className="rounded-card border border-line bg-ice p-6 text-body text-slate">{t('Carta organisasi belum diterbitkan.')}</p>
          )}
        </section>

        <section aria-labelledby="org-leaders">
          <h2 id="org-leaders" className="flex items-center gap-2 text-h3 font-bold">
            <Users className="size-5 text-link" aria-hidden />
            {t('Kepimpinan')} {site.activeSession ? `· ${site.activeSession.name}` : ''}
          </h2>
          <div className="mt-4">
            <PublicState query={leaders} isEmpty={(d) => d.leaders.length === 0} empty={{ icon: Users, pose: 'book', title: t('Senarai kepimpinan belum diterbitkan'), description: t('Nama hanya dipaparkan dengan persetujuan ahli dan selepas disahkan SUAK.') }}>
              {(d) => (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {d.leaders.map((l, i) => (
                    <li key={i} className="rounded-card border border-line bg-paper p-4 shadow-soft">
                      <p className="font-semibold text-heading">{l.name}</p>
                      <p className="text-caption text-slate">{[l.position, l.bureau].filter(Boolean).join(' · ')}</p>
                    </li>
                  ))}
                </ul>
              )}
            </PublicState>
          </div>
        </section>

        <section aria-labelledby="org-progress" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="org-progress" className="flex items-center gap-2 text-h3 font-bold">
              <CheckCircle2 className="size-5 text-link" aria-hidden />
              <Cms id="org.progress.title" ms="Kemajuan kerja" />
            </h2>
            <CmsListEditButton id="org.progress" fields={PROGRESS_FIELDS()} title={t('Sunting senarai kemajuan kerja')} />
          </div>
          {progress.length === 0 ? (
            <p className="rounded-card border border-line bg-ice p-6 text-body text-slate">{t('Kemajuan kerja belum diterbitkan.')}</p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {progress.map((it, i) => (
                <li key={i} className="rounded-card border border-line bg-paper p-5 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display text-body-lg font-bold text-heading">{listText(it, 'title', lang)}</p>
                    {listText(it, 'status', lang) && <StatusBadge tone="issued">{listText(it, 'status', lang)}</StatusBadge>}
                  </div>
                  {listText(it, 'text', lang) && <p className="mt-2 whitespace-pre-line text-body text-slate">{listText(it, 'text', lang)}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="org-legacy" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="org-legacy" className="text-h3 font-bold">
              <Cms id="org.legacy.title" ms="Legasi kepimpinan" />
            </h2>
            <CmsListEditButton id="org.legacy" fields={LEGACY_FIELDS()} title={t('Sunting senarai legasi')} />
          </div>
          {legacy.length === 0 ? (
            <p className="rounded-card border border-line bg-ice p-6 text-body text-slate">{t('Legasi kepimpinan belum diterbitkan.')}</p>
          ) : (
            <ol className="relative space-y-4 border-l-2 border-blue/30 pl-6">
              {legacy.map((it, i) => (
                <li key={i} className={cn('relative rounded-card border border-line bg-paper p-5 shadow-soft')}>
                  <span className="absolute top-6 -left-[1.95rem] size-3 rounded-full bg-blue ring-4 ring-paper" aria-hidden />
                  <p className="font-display text-body-lg font-bold text-heading">{listText(it, 'title', lang)}</p>
                  {listText(it, 'period', lang) && <p className="font-mono text-micro uppercase tracking-wide text-link">{listText(it, 'period', lang)}</p>}
                  {listText(it, 'text', lang) && <p className="mt-2 whitespace-pre-line text-body text-slate">{listText(it, 'text', lang)}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </PublicPage>
  )
}
