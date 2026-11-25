import { Archive, CalendarCheck2, Download, FileStack, Megaphone, Pin, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ATTENDANCE_LABELS } from '@shared/domain'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { FilterChips, TableShell, Td, Th } from '@/components/ui/misc'
import { StatusBadge } from '@/components/ui/status-badge'
import { useSite } from '@/hooks/use-site'
import { usePublic } from '@/hooks/use-public'
import { saveFile } from '@/lib/files'
import { callApi } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/format'
import { ATTENDANCE_UI } from '@/lib/status-ui'
import { PublicPage } from './public-page'
import { PublicState } from './public-state'
import { useToast } from '@/components/ui/toast'

export function AboutPage() {
  const { site } = useSite()
  const leaders = usePublic('public.leaders')
  const about = site.settings.about_text
  return (
    <PublicPage eyebrow="Mengenai JPP" title={site.settings.org_name || 'JPP IPGKKB'} description="Profil, fungsi dan senarai kepimpinan sesi aktif.">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 className="text-h3 font-bold">Profil</h2>
          <p className="mt-3 whitespace-pre-line text-body-lg text-ink">{about || 'Belum ditetapkan oleh pentadbir.'}</p>
        </div>
        <div>
          <h2 className="text-h3 font-bold">Kepimpinan {site.activeSession ? `· ${site.activeSession.name}` : ''}</h2>
          <div className="mt-3">
            <PublicState query={leaders} isEmpty={(d) => d.leaders.length === 0} empty={{ icon: Users, pose: 'book', title: 'Senarai kepimpinan belum diterbitkan', description: 'Nama hanya dipaparkan dengan persetujuan ahli dan selepas disahkan SUAK.' }}>
              {(d) => (
                <ul className="divide-y divide-line rounded-card border border-line bg-paper">
                  {d.leaders.map((l, i) => (
                    <li key={i} className="px-4 py-3"><p className="font-semibold text-navy">{l.name}</p><p className="text-caption text-slate">{[l.position, l.bureau].filter(Boolean).join(' · ')}</p></li>
                  ))}
                </ul>
              )}
            </PublicState>
          </div>
        </div>
      </div>
    </PublicPage>
  )
}

export function AttendancePage() {
  const q = usePublic('public.attendance')
  return (
    <PublicPage eyebrow="Kehadiran" title="Rekod kehadiran mesyuarat" description="Hanya rekod yang telah disahkan dan diterbitkan oleh SUAK dipaparkan. Alasan peribadi tidak sekali-kali diterbitkan.">
      <PublicState query={q} isEmpty={(d) => d.meetings.length === 0} empty={{ icon: CalendarCheck2, pose: 'checklist', title: 'Belum ada rekod kehadiran yang diterbitkan', description: 'Rekod dipaparkan selepas disahkan dan diterbitkan.' }}>
        {(d) => (
          <div className="space-y-6">
            <p className="text-caption text-slate">{d.mode === 'aggregate' ? 'Paparan statistik sahaja.' : 'Paparan nama dan status.'}</p>
            {d.meetings.map((m) => (
              <Card key={m.id}>
                <CardBody className="space-y-4">
                  <div><h2 className="text-body font-bold">{m.title}</h2><p className="text-caption text-slate">{m.meetingType} · {formatDateTime(m.startsAt)}</p></div>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {([['Hadir', m.counts.present], ['Lewat', m.counts.late], ['Bersebab', m.counts.excused], ['Tanpa sebab', m.counts.absent]] as const).map(([k, n]) => (
                      <div key={k} className="rounded-input bg-ice p-3"><dt className="text-micro uppercase tracking-wide text-slate">{k}</dt><dd className="font-display text-h2 font-bold text-navy tabular">{n}</dd></div>
                    ))}
                  </dl>
                  {m.rows && (
                    <TableShell minWidth="28rem"><thead><tr><Th>Nama</Th><Th>Jawatan / Biro</Th><Th>Status</Th></tr></thead><tbody>{m.rows.map((r, i) => <tr key={i}><Td className="font-semibold text-navy">{r.name}</Td><Td>{[r.position, r.bureau].filter(Boolean).join(' · ')}</Td><Td><StatusBadge tone={ATTENDANCE_UI[r.status].tone}>{ATTENDANCE_LABELS[r.status]}</StatusBadge></Td></tr>)}</tbody></TableShell>
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
  const [cat, setCat] = useState('all')
  const cats = useMemo(() => ['all', ...new Set((q.data ?? []).map((a) => a.category))], [q.data])
  return (
    <PublicPage eyebrow="Pengumuman" title="Notis awam & makluman rasmi" description="Hebahan dan makluman yang telah diluluskan untuk paparan awam.">
      <PublicState query={q} isEmpty={(d) => d.length === 0} empty={{ icon: Megaphone, pose: 'sleeping', title: 'Belum ada pengumuman', description: 'Pengumuman akan dipaparkan di sini selepas diterbitkan.' }}>
        {(rows) => (
          <div className="space-y-5">
            {cats.length > 2 && <FilterChips label="Kategori" value={cat} onChange={setCat} options={cats.map((c) => ({ value: c, label: c === 'all' ? 'Semua' : c }))} />}
            <ul className="grid gap-4 lg:grid-cols-2">
              {rows.filter((a) => cat === 'all' || a.category === cat).map((a) => (
                <li key={a.id}>
                  <Card className={a.pinned ? 'border-champagne' : undefined}><CardBody className="space-y-2">
                    <div className="flex items-center gap-2">{a.pinned && <span className="inline-flex items-center gap-1 text-micro font-bold uppercase text-navy"><Pin className="size-3.5" aria-hidden />Penting</span>}<span className="text-micro font-semibold uppercase tracking-wide text-blue">{a.category}</span></div>
                    <h2 className="text-body font-bold">{a.title}</h2>
                    <p className="whitespace-pre-line text-body">{a.body}</p>
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
    <PublicPage eyebrow="Pusat Templat" title="Templat dokumen awam" description="Templat yang ditandakan Awam dan boleh dimuat turun. Semak setiap templat sebelum menggunakannya.">
      <PublicState query={q} isEmpty={(d) => d.length === 0} empty={{ icon: FileStack, pose: 'book', title: 'Belum ada templat awam', description: 'Templat rasmi akan disenaraikan selepas diluluskan.' }}>
        {(rows) => (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((t) => (
              <li key={t.id}><Card className="h-full"><CardBody className="flex h-full flex-col gap-2">
                <span className="text-micro font-semibold uppercase tracking-wide text-blue">{t.category}</span>
                <h2 className="text-body font-bold">{t.title}</h2>
                {t.description && <p className="text-caption text-slate">{t.description}</p>}
                <p className="mt-auto text-micro text-slate">v{t.version} · {formatDate(t.updatedAt)}</p>
                <Button size="sm" onClick={() => void download('public.templates.download', t.id)}><Download />Muat turun</Button>
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
    <PublicPage eyebrow="Arkib Awam" title="Dokumen yang diluluskan untuk penerbitan" description="Dokumen dalaman tidak menjadi awam hanya kerana mempunyai URL — setiap penerbitan melalui kelulusan SUAK.">
      <PublicState query={q} isEmpty={(d) => d.length === 0} empty={{ icon: Archive, pose: 'search', title: 'Belum ada dokumen awam', description: 'Dokumen akan muncul di sini selepas melalui proses penerbitan.' }}>
        {(rows) => (
          <Card className="overflow-hidden">
            <TableShell minWidth="38rem"><thead><tr><Th>Dokumen</Th><Th>Kategori</Th><Th>Diterbitkan</Th><Th><span className="sr-only">Muat turun</span></Th></tr></thead>
              <tbody>{rows.map((d) => <tr key={d.id}><Td><p className="font-semibold text-navy">{d.title}</p>{d.referenceNumber && <p className="font-mono text-micro text-blue">{d.referenceNumber}</p>}</Td><Td>{d.category}</Td><Td className="whitespace-nowrap">{formatDate(d.publishedAt)}</Td><Td className="text-right"><Button size="sm" variant="secondary" onClick={() => void download('public.archive.download', d.id)} aria-label={`Muat turun ${d.title}`}><Download />Muat turun</Button></Td></tr>)}</tbody>
            </TableShell>
          </Card>
        )}
      </PublicState>
    </PublicPage>
  )
}
