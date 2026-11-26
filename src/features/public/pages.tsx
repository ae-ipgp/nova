import { Archive, CalendarCheck2, Download, FileStack, Megaphone, Pin } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ATTENDANCE_LABELS } from '@shared/domain'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { FilterChips, TableShell, Td, Th } from '@/components/ui/misc'
import { StatusBadge } from '@/components/ui/status-badge'
import { usePublic } from '@/hooks/use-public'
import { saveFile } from '@/lib/files'
import { callApi } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/format'
import { useLangPref } from '@/lib/prefs'
import { ATTENDANCE_UI } from '@/lib/status-ui'
import { PublicPage } from './public-page'
import { PublicState } from './public-state'
import { useToast } from '@/components/ui/toast'
import { t } from '@/i18n'

export function AttendancePage() {
  const q = usePublic('public.attendance')
  return (
    <PublicPage id="attendance" eyebrowMs="Kehadiran" titleMs="Rekod kehadiran mesyuarat" descriptionMs="Hanya rekod yang telah disahkan dan diterbitkan oleh SUAK dipaparkan.">
      <PublicState query={q} isEmpty={(d) => d.meetings.length === 0} empty={{ icon: CalendarCheck2, pose: 'checklist', title: t('Belum ada rekod kehadiran yang diterbitkan'), description: t('Rekod dipaparkan selepas disahkan dan diterbitkan.') }}>
        {(d) => (
          <div className="space-y-6">
            <p className="text-caption text-slate">{d.mode === 'aggregate' ? t('Paparan statistik sahaja.') : t('Paparan nama dan status.')}</p>
            {d.meetings.map((m) => (
              <Card key={m.id}>
                <CardBody className="space-y-4">
                  <div><h2 className="text-body font-bold">{m.title}</h2><p className="text-caption text-slate">{m.meetingType} · {formatDateTime(m.startsAt)}</p></div>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {([['Hadir', m.counts.present], ['Lewat', m.counts.late], ['Bersebab', m.counts.excused], ['Tanpa sebab', m.counts.absent]] as const).map(([k, n]) => (
                      <div key={k} className="rounded-input bg-ice p-3"><dt className="text-micro uppercase tracking-wide text-slate">{t(k)}</dt><dd className="font-display text-h2 font-bold text-heading tabular">{n}</dd></div>
                    ))}
                  </dl>
                  {m.rows && (
                    <TableShell minWidth="28rem"><thead><tr><Th>{t('Nama')}</Th><Th>{t('Jawatan / Biro')}</Th><Th>{t('Status')}</Th></tr></thead><tbody>{m.rows.map((r, i) => <tr key={i}><Td className="font-semibold text-heading">{r.name}</Td><Td>{[r.position, r.bureau].filter(Boolean).join(' · ')}</Td><Td><StatusBadge tone={ATTENDANCE_UI[r.status].tone}>{t(ATTENDANCE_LABELS[r.status])}</StatusBadge></Td></tr>)}</tbody></TableShell>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </PublicState>
    </PublicPage>
  )
}

export function AnnouncementsPage() {
  const q = usePublic('public.announcements')
  const en = useLangPref() === 'en'
  const [cat, setCat] = useState('all')
  const cats = useMemo(() => ['all', ...new Set((q.data ?? []).map((a) => a.category))], [q.data])
  return (
    <PublicPage id="announcements" eyebrowMs="Pengumuman" titleMs="Notis awam & makluman rasmi" descriptionMs="Hebahan dan makluman yang telah diluluskan untuk paparan awam.">
      <PublicState query={q} isEmpty={(d) => d.length === 0} empty={{ icon: Megaphone, pose: 'sleeping', title: t('Belum ada pengumuman'), description: t('Pengumuman akan dipaparkan di sini selepas diterbitkan.') }}>
        {(rows) => (
          <div className="space-y-5">
            {cats.length > 2 && <FilterChips label={t('Kategori')} value={cat} onChange={setCat} options={cats.map((c) => ({ value: c, label: c === 'all' ? t('Semua') : c }))} />}
            <ul className="grid gap-4 lg:grid-cols-2">
              {rows.filter((a) => cat === 'all' || a.category === cat).map((a) => (
                <li key={a.id}>
                  <Card className={a.pinned ? 'border-champagne' : undefined}><CardBody className="space-y-2">
                    <div className="flex items-center gap-2">{a.pinned && <span className="inline-flex items-center gap-1 text-micro font-bold uppercase text-heading"><Pin className="size-3.5" aria-hidden />{t('Penting')}</span>}<span className="text-micro font-semibold uppercase tracking-wide text-link">{a.category}</span></div>
                    <h2 className="text-body font-bold">{en && a.titleEn ? a.titleEn : a.title}</h2>
                    <p className="whitespace-pre-line text-body">{en && a.bodyEn ? a.bodyEn : a.body}</p>
                    <p className="text-micro text-slate">{formatDate(a.publishAt)}</p>
                  </CardBody></Card>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PublicState>
    </PublicPage>
  )
}

function useDownload() {
  const toast = useToast()
  return async (action: 'public.templates.download' | 'public.archive.download', id: string) => {
    try {
      saveFile(await callApi(action, { id }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Muat turun gagal.')
    }
  }
}

export function PublicTemplatesPage() {
  const q = usePublic('public.templates')
  const download = useDownload()
  return (
    <PublicPage id="templates" eyebrowMs="Pusat Templat" titleMs="Templat dokumen awam" descriptionMs="Templat yang boleh dimuat turun. Semak setiap templat sebelum menggunakannya.">
      <PublicState query={q} isEmpty={(d) => d.length === 0} empty={{ icon: FileStack, pose: 'book', title: t('Belum ada templat awam'), description: t('Templat rasmi akan disenaraikan selepas diluluskan.') }}>
        {(rows) => (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((tt) => (
              <li key={tt.id}><Card className="h-full"><CardBody className="flex h-full flex-col gap-2">
                <span className="text-micro font-semibold uppercase tracking-wide text-link">{tt.category}</span>
                <h2 className="text-body font-bold">{tt.title}</h2>
                {tt.description && <p className="text-caption text-slate">{tt.description}</p>}
                <p className="mt-auto text-micro text-slate">v{tt.version} · {formatDate(tt.updatedAt)}</p>
                <Button size="sm" onClick={() => void download('public.templates.download', tt.id)}><Download />{t('Muat turun')}</Button>
              </CardBody></Card></li>
            ))}
          </ul>
        )}
      </PublicState>
    </PublicPage>
  )
}

export function PublicArchivePage() {
  const q = usePublic('public.archive')
  const download = useDownload()
  return (
    <PublicPage id="archive" eyebrowMs="Arkib Awam" titleMs="Dokumen yang diluluskan untuk penerbitan" descriptionMs="Dokumen dalaman yang diterbitkan melalui kelulusan SUAK.">
      <PublicState query={q} isEmpty={(d) => d.length === 0} empty={{ icon: Archive, pose: 'search', title: t('Belum ada dokumen awam'), description: t('Dokumen akan muncul di sini selepas melalui proses penerbitan.') }}>
        {(rows) => (
          <Card className="overflow-hidden">
            <TableShell minWidth="38rem"><thead><tr><Th>{t('Dokumen')}</Th><Th>{t('Kategori')}</Th><Th>{t('Diterbitkan')}</Th><Th><span className="sr-only">{t('Muat turun')}</span></Th></tr></thead>
              <tbody>{rows.map((d) => <tr key={d.id}><Td><p className="font-semibold text-heading">{d.title}</p>{d.referenceNumber && <p className="font-mono text-micro text-link">{d.referenceNumber}</p>}</Td><Td>{d.category}</Td><Td className="whitespace-nowrap">{formatDate(d.publishedAt)}</Td><Td className="text-right"><Button size="sm" variant="secondary" onClick={() => void download('public.archive.download', d.id)} aria-label={t('Muat turun {title}', { title: d.title })}><Download />{t('Muat turun')}</Button></Td></tr>)}</tbody>
            </TableShell>
          </Card>
        )}
      </PublicState>
    </PublicPage>
  )
}
