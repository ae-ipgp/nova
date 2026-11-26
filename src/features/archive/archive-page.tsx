import { Archive, Download, Globe, Lock, Plus, Users } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ArchiveQuery, ArchiveView } from '@shared/api-contract'
import { toCsv } from '@shared/csv'
import type { VisibilityLevel } from '@shared/domain'
import { useAuth } from '@/app/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog } from '@/components/ui/dialog'
import { FormField, Notice, SelectField, TextAreaField } from '@/components/ui/form-field'
import { DetailList, SearchBox, TableShell, Td, Th } from '@/components/ui/misc'
import { PageHeader } from '@/components/ui/page-header'
import { QueryState } from '@/components/ui/query-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/components/ui/toast'
import { useDownloader, useGatewayMutation, useGatewayQuery } from '@/hooks/use-gateway'
import { fileToPayload, saveText } from '@/lib/files'
import { formatDate } from '@/lib/format'
import { t } from '@/i18n'

const VIS: Record<VisibilityLevel, { label: string; icon: typeof Lock; tone: 'draft' | 'pending' | 'issued' }> = {
  private: { label: 'Peribadi', icon: Lock, tone: 'draft' },
  internal: { label: 'Dalaman', icon: Users, tone: 'pending' },
  public: { label: 'Awam', icon: Globe, tone: 'issued' },
}
const INVALIDATE = ['arc.list', 'public.archive'] as const

export function ArchivePage() {
  const { roles } = useAuth()
  const staff = roles.includes('suak') || roles.includes('secretariat')
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [f, setF] = useState<{ module: string; category: string; visibility: string; status: string; from: string; to: string }>({ module: '', category: '', visibility: '', status: 'active', from: '', to: '' })
  const [openId, setOpenId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const query: ArchiveQuery = useMemo(() => ({ q: q || undefined, module: f.module || undefined, category: f.category || undefined, visibility: (f.visibility || undefined) as VisibilityLevel | undefined, status: (f.status || undefined) as 'active' | 'archived' | undefined, from: f.from || undefined, to: f.to || undefined }), [q, f])
  const list = useGatewayQuery('arc.list', query, { placeholderData: (prev) => prev })
  const opened = list.data?.find((d) => d.id === openId) ?? null
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('M07 · e-Arkib')} title={t('e-Arkib')} description={t('Carian, penyimpanan dan pengambilan dokumen rasmi.')} actions={staff && <Button onClick={() => setUploading(true)}><Plus />{t('Muat naik dokumen')}</Button>} />
      <Card>
        <div className="space-y-3 p-4">
          <SearchBox value={q} onChange={setQ} placeholder={t('Cari tajuk atau nombor rujukan…')} className="sm:max-w-md" />
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SelectField label={t('Modul')} value={f.module} onChange={set('module')}><option value="">{t('Semua')}</option><option>{t('e-Surat')}</option><option>{t('e-OPR')}</option><option>{t('e-Arkib')}</option></SelectField>
            <FormField label={t('Kategori')} value={f.category} onChange={set('category')} placeholder={t('cth. Laporan')} />
            <SelectField label={t('Keterlihatan')} value={f.visibility} onChange={set('visibility')}><option value="">{t('Semua')}</option><option value="private">{t('Peribadi')}</option><option value="internal">{t('Dalaman')}</option><option value="public">{t('Awam')}</option></SelectField>
            <SelectField label={t('Status')} value={f.status} onChange={set('status')}><option value="active">{t('Aktif')}</option><option value="archived">{t('Diarkibkan')}</option><option value="">{t('Semua')}</option></SelectField>
            <FormField label={t('Dari')} type="date" value={f.from} onChange={set('from')} />
            <FormField label={t('Hingga')} type="date" value={f.to} onChange={set('to')} />
          </div>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <QueryState query={list} empty={{ icon: Archive, pose: 'search', title: t('Tiada dokumen ditemui'), description: t('Cuba buka penapis atau ubah istilah carian.') }}>
          {(rows) => (
            <>
              <div className="flex items-center justify-between border-b border-line px-4 py-2 text-caption text-slate">
                <span>{t('{n} dokumen', { n: rows.length })}</span>
                {staff && <Button size="sm" variant="tertiary" onClick={() => saveText('metadata-arkib.csv', 'text/csv', toCsv(['Tajuk', 'Kategori', 'Modul', 'Rujukan', 'Keterlihatan', 'Status', 'Versi', 'Sesi', 'Dicipta'], rows.map((d) => [d.title, d.category, d.module, d.referenceNumber, VIS[d.visibility].label, d.status, d.version, d.sessionName, d.createdAt.slice(0, 10)])))}><Download />{t('Eksport metadata')}</Button>}
              </div>
              <TableShell minWidth="46rem">
                <thead><tr><Th>{t('Tajuk')}</Th><Th>{t('Kategori')}</Th><Th>{t('Tarikh')}</Th><Th>{t('Akses')}</Th><Th><span className="sr-only">{t('Buka')}</span></Th></tr></thead>
                <tbody>
                  {rows.map((d) => {
                    const v = VIS[d.visibility]
                    return (
                      <tr key={d.id}>
                        <Td><p className="font-semibold text-heading">{d.title}</p>{d.referenceNumber && <p className="font-mono text-micro text-link">{d.referenceNumber}</p>}</Td>
                        <Td>{d.category}<p className="text-micro text-slate">{d.module}</p></Td>
                        <Td className="whitespace-nowrap">{formatDate(d.createdAt)}</Td>
                        <Td><StatusBadge tone={v.tone}>{t(v.label)}</StatusBadge>{d.status === 'archived' && <span className="ml-1"><StatusBadge tone="archived">{t('Arkib')}</StatusBadge></span>}</Td>
                        <Td className="text-right"><Button size="sm" variant="secondary" onClick={() => setOpenId(d.id)} aria-label={t('Buka {title}', { title: d.title })}>{t('Buka')}</Button></Td>
                      </tr>
                    )
                  })}
                </tbody>
              </TableShell>
            </>
          )}
        </QueryState>
      </Card>
      <p className="text-micro text-slate">{t('Keperluan: ARC-01 – ARC-08 · Fail disimpan secara peribadi dan hanya boleh dimuat turun selepas semakan kebenaran. Rekod rasmi tidak dipadam; ia diarkibkan.')}</p>
      {opened && <DocDialog d={opened} onClose={() => setOpenId(null)} />}
      {uploading && <UploadDialog onClose={() => setUploading(false)} />}
    </div>
  )
}

function DocDialog({ d, onClose }: { d: ArchiveView; onClose: () => void }) {
  const { roles } = useAuth()
  const suak = roles.includes('suak')
  const staff = suak || roles.includes('secretariat')
  const toast = useToast()
  const download = useDownloader()
  const vis = useGatewayMutation('arc.setVisibility', INVALIDATE)
  const status = useGatewayMutation('arc.setStatus', INVALIDATE)
  const [confirm, setConfirm] = useState<VisibilityLevel | null>(null)
  return (
    <>
      <Dialog open onClose={onClose} size="lg" title={d.title} description={d.fileName}>
        <div className="space-y-5">
          <DetailList items={[['Kategori', d.category], ['Modul', d.module], ['Nombor rujukan', d.referenceNumber], ['Sesi', d.sessionName], ['Versi', String(d.version)], ['Dicipta', formatDate(d.createdAt)], ['Pemilik', d.owner], ['Diterbitkan', d.publishedAt ? formatDate(d.publishedAt) : '']]} />
          {d.description && <p className="text-body text-slate">{d.description}</p>}
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <Button onClick={() => void download('arc.download', { id: d.id })}><Download />{t('Muat turun')}</Button>
            {suak && d.visibility !== 'public' && d.status === 'active' && <Button variant="secondary" onClick={() => setConfirm('public')}><Globe />{t('Terbitkan kepada awam')}</Button>}
            {suak && d.visibility === 'public' && <Button variant="secondary" onClick={() => setConfirm('internal')}>{t('Tarik balik penerbitan')}</Button>}
            {suak && d.visibility === 'private' && <Button variant="secondary" onClick={() => vis.mutate({ id: d.id, visibility: 'internal' }, { onSuccess: () => toast.success(t('Dikongsi dengan ahli.')) })}>{t('Kongsi dengan ahli')}</Button>}
            {suak && d.visibility === 'internal' && <Button variant="secondary" onClick={() => vis.mutate({ id: d.id, visibility: 'private' }, { onSuccess: () => toast.success(t('Dijadikan peribadi.')) })}>{t('Jadikan peribadi')}</Button>}
            {staff && <Button variant="tertiary" loading={status.isPending} onClick={() => status.mutate({ id: d.id, status: d.status === 'archived' ? 'active' : 'archived' }, { onSuccess: () => toast.success(t('Status dikemas kini.')) })}>{d.status === 'archived' ? t('Aktifkan semula') : t('Arkibkan')}</Button>}
          </div>
          {(vis.error || status.error) && <Notice>{(vis.error ?? status.error)!.message}</Notice>}
        </div>
      </Dialog>
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'public' ? t('Terbitkan dokumen ini kepada awam?') : t('Tarik balik penerbitan?')}
        description={confirm === 'public' ? t('Satu salinan berasingan akan dipaparkan di laman awam. Pastikan dokumen tidak mengandungi maklumat peribadi atau sulit (nama, nombor telefon, e-mel, tandatangan, alasan peribadi).') : t('Salinan awam akan dibuang daripada laman awam.')}
        confirmLabel={confirm === 'public' ? t('Terbitkan') : t('Tarik balik')}
        pending={vis.isPending}
        error={vis.error?.message}
        onClose={() => setConfirm(null)}
        onConfirm={() => vis.mutate({ id: d.id, visibility: confirm! }, { onSuccess: () => (toast.success(confirm === 'public' ? t('Diterbitkan.') : t('Penerbitan ditarik balik.')), setConfirm(null)) })}
      />
    </>
  )
}

function UploadDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const upload = useGatewayMutation('arc.upload', INVALIDATE)
  const [v, setV] = useState({ title: '', category: '', description: '', referenceNumber: '', visibility: 'private' as 'private' | 'internal' })
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!v.title.trim() || !v.category.trim() || !file) return setError(t('Lengkapkan tajuk, kategori dan pilih fail.'))
    try {
      upload.mutate({ ...v, file: await fileToPayload(file) }, { onSuccess: () => (toast.success(t('Dokumen dimuat naik.')), onClose()) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fail tidak sah.')
    }
  }
  return (
    <Dialog open onClose={onClose} size="lg" title={t('Muat naik dokumen')} footer={<><Button variant="secondary" onClick={onClose}>{t('Batal')}</Button><Button type="submit" form="arc-form" loading={upload.isPending}>{t('Muat naik')}</Button></>}>
      <form id="arc-form" noValidate onSubmit={submit} className="space-y-4">
        <FormField label={t('Tajuk')} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={200} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('Kategori')} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} maxLength={80} required />
          <FormField label={t('Nombor rujukan')} value={v.referenceNumber} onChange={(e) => setV({ ...v, referenceNumber: e.target.value })} maxLength={80} />
        </div>
        <TextAreaField label={t('Penerangan')} rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={500} />
        <SelectField label={t('Keterlihatan')} value={v.visibility} onChange={(e) => setV({ ...v, visibility: e.target.value as 'private' | 'internal' })} hint={t('Penerbitan kepada awam dibuat berasingan oleh SUAK.')}><option value="private">{t('Peribadi (SUAK & Sekretariat)')}</option><option value="internal">{t('Dalaman (semua ahli)')}</option></SelectField>
        <div>
          <label htmlFor="arc-file" className="mb-1.5 block text-caption font-medium text-ink">{t('Fail * · PDF, DOCX, XLSX, PPTX, imej · maks 5 MB')}</label>
          <input id="arc-file" type="file" accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-caption" />
        </div>
        {(error || upload.error) && <Notice>{error ?? upload.error?.message}</Notice>}
      </form>
    </Dialog>
  )
}
