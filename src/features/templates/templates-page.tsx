import { Download, FileStack, Plus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { TemplateView } from '@shared/api-contract'
import { useCan } from '@/app/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { FormField, Notice, SelectField, TextAreaField } from '@/components/ui/form-field'
import { FilterChips, SearchBox } from '@/components/ui/misc'
import { PageHeader } from '@/components/ui/page-header'
import { QueryState } from '@/components/ui/query-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/app/auth-context'
import { useDownloader, useGatewayMutation, useGatewayQuery } from '@/hooks/use-gateway'
import { fileToPayload } from '@/lib/files'
import { formatBytes, formatDate } from '@/lib/format'
import { t } from '@/i18n'

const CATEGORIES = ['surat', 'mesyuarat', 'pelaporan', 'pentadbiran', 'pengurusan'] as const
const CAT_LABEL: Record<string, string> = { surat: 'Surat', mesyuarat: 'Mesyuarat', pelaporan: 'Pelaporan', pentadbiran: 'Pentadbiran', pengurusan: 'Pengurusan' }

export function TemplatesPage() {
  const manage = useCan('templates.manage')
  const { roles } = useAuth()
  const q = useGatewayQuery('tpl.list', {})
  const download = useDownloader()
  const [cat, setCat] = useState<string>('all')
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [editing, setEditing] = useState<TemplateView | 'new' | null>(null)
  const archive = useGatewayMutation('tpl.archive', ['tpl.list', 'public.templates'])

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    return (q.data ?? []).filter((tt) => (cat === 'all' || tt.category === cat) && (!s || `${tt.title} ${tt.description}`.toLowerCase().includes(s)))
  }, [q.data, cat, search])

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('M05 · Templat')} title={t('Pusat Templat')} description={t('Templat dokumen terkawal. Semak setiap templat sebelum menggunakannya.')} actions={manage && <Button onClick={() => setEditing('new')}><Plus />{t('Templat baharu')}</Button>} />
      <Notice tone="info">{t('Templat ialah titik permulaan. Pastikan format, maklumat dan kuasa tandatangan disemak dan dipersetujui sebelum digunakan secara rasmi (TPL-06).')}</Notice>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={search} onChange={setSearch} placeholder={t('Cari templat…')} />
        <FilterChips label={t('Kategori')} value={cat} onChange={setCat} options={[{ value: 'all', label: t('Semua') }, ...CATEGORIES.map((c) => ({ value: c as string, label: CAT_LABEL[c] }))]} />
      </div>
      <QueryState query={q} isEmpty={() => rows.length === 0} empty={{ icon: FileStack, pose: 'book', title: t('Tiada templat'), description: manage ? t('Muat naik templat pertama.') : t('Templat akan dipaparkan di sini selepas ditambah.') }}>
        {() => (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((tt) => (
              <li key={tt.id}>
                <Card className="flex h-full flex-col">
                  <CardBody className="flex flex-1 flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-micro font-semibold uppercase tracking-wide text-link">{CAT_LABEL[tt.category] ?? tt.category}</span>
                      <span className="flex gap-1">
                        {tt.accessLevel === 'public' && <StatusBadge tone="issued">{t('Awam')}</StatusBadge>}
                        {tt.status === 'archived' && <StatusBadge tone="archived">{t('Arkib')}</StatusBadge>}
                      </span>
                    </div>
                    <h2 className="text-body font-bold">{tt.title}</h2>
                    {tt.description && <p className="text-caption text-slate">{tt.description}</p>}
                    <p className="mt-auto pt-2 text-micro text-slate">v{tt.version} · {formatDate(tt.updatedAt)} · {tt.fileName} ({formatBytes(tt.sizeBytes)})</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" onClick={() => void download('tpl.download', { id: tt.id })}><Download />{t('Muat turun')}</Button>
                      {manage && <Button size="sm" variant="secondary" onClick={() => setEditing(tt)}>{t('Urus')}</Button>}
                      {manage && <Button size="sm" variant="tertiary" loading={archive.isPending && archive.variables?.id === tt.id} onClick={() => archive.mutate({ id: tt.id, archived: tt.status !== 'archived' })}>{tt.status === 'archived' ? t('Aktifkan') : t('Arkibkan')}</Button>}
                    </div>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      {editing && <TemplateDialog existing={editing === 'new' ? null : editing} canPublic={roles.includes('suak')} onClose={() => setEditing(null)} />}
    </div>
  )
}

function TemplateDialog({ existing, canPublic, onClose }: { existing: TemplateView | null; canPublic: boolean; onClose: () => void }) {
  const toast = useToast()
  const save = useGatewayMutation('tpl.save', ['tpl.list', 'public.templates'])
  const [category, setCategory] = useState<string>(existing?.category ?? 'surat')
  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [accessLevel, setAccess] = useState<'internal' | 'public'>(existing?.accessLevel ?? 'internal')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return setError(t('Tajuk diperlukan.'))
    if (!existing && !file) return setError(t('Pilih fail templat.'))
    try {
      const payload = file ? await fileToPayload(file) : undefined
      save.mutate({ id: existing?.id, category: category as (typeof CATEGORIES)[number], title, description, accessLevel, file: payload }, { onSuccess: (tt) => (toast.success(t('Templat disimpan (v{version}).', { version: tt.version })), onClose()) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fail tidak sah.')
    }
  }
  return (
    <Dialog open onClose={onClose} size="lg" title={existing ? t('Urus: {title}', { title: existing.title }) : t('Templat baharu')} description={existing ? t('Memuat naik fail baharu akan mencipta versi baharu; fail lama dikekalkan.') : undefined}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Batal')}</Button><Button type="submit" form="tpl-form" loading={save.isPending}>{t('Simpan')}</Button></>}>
      <form id="tpl-form" noValidate onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label={t('Kategori')} value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}</SelectField>
          <SelectField label={t('Akses')} value={accessLevel} onChange={(e) => setAccess(e.target.value as 'internal' | 'public')} hint={canPublic ? undefined : t('Hanya SUAK boleh menandakan templat sebagai awam.')}>
            <option value="internal">{t('Dalaman (ahli berdaftar)')}</option>
            {canPublic && <option value="public">{t('Awam (laman umum)')}</option>}
          </SelectField>
        </div>
        <FormField label={t('Tajuk')} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} required />
        <TextAreaField label={t('Penerangan')} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} />
        <div>
          <label htmlFor="tpl-file" className="mb-1.5 block text-caption font-medium text-ink">{t('Fail')} {existing ? t('(pilihan — versi baharu)') : '*'} {t('· PDF, DOCX, XLSX, PPTX, imej · maks 5 MB')}</label>
          <input id="tpl-file" type="file" accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-caption" />
        </div>
        {(error || save.error) && <Notice>{error ?? save.error?.message}</Notice>}
      </form>
    </Dialog>
  )
}
