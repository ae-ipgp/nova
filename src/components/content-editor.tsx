import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ContentItem, ContentSetPayload, FilePayload } from '@shared/api-contract'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { FormField, Notice, TextAreaField } from '@/components/ui/form-field'
import { useToast } from '@/components/ui/toast'
import { useGatewayMutation } from '@/hooks/use-gateway'
import { englishOf, t } from '@/i18n'
import type { EditSpec, ListField } from '@/lib/content'
import { FileError, fileToPayload, shrinkImage } from '@/lib/files'

/** Edit one piece of page content: text (Malay + English), link, photo, file or list. SUAK only (the gateway enforces it). */
export function ContentEditor({ spec, item, onClose }: { spec: EditSpec; item: ContentItem | null; onClose: () => void }) {
  const toast = useToast()
  const save = useGatewayMutation('admin.content.set', ['public.content', 'public.content.file'])
  const reset = useGatewayMutation('admin.content.reset', ['public.content', 'public.content.file'])
  const [ms, setMs] = useState(item?.ms || spec.ms || '')
  const [en, setEn] = useState(item?.en || (spec.ms ? englishOf(spec.ms) : ''))
  const [url, setUrl] = useState(item?.url || spec.url || '')
  const [hidden, setHidden] = useState(item?.hidden ?? false)
  const [file, setFile] = useState<FilePayload | null>(null)
  const [removeFile, setRemoveFile] = useState(false)
  const [rows, setRows] = useState<Record<string, string>[]>(() => {
    try {
      const d = item?.json ? (JSON.parse(item.json) as unknown) : []
      return Array.isArray(d) ? (d as Record<string, string>[]) : []
    } catch {
      return []
    }
  })
  const [error, setError] = useState<string | null>(null)
  const kind = spec.kind
  const busy = save.isPending || reset.isPending

  const pickFile = async (f: File | undefined) => {
    if (!f) return
    setError(null)
    try {
      setFile(kind === 'image' ? await shrinkImage(f, 1600) : await fileToPayload(f))
      setRemoveFile(false)
    } catch (e) {
      setError(e instanceof FileError || e instanceof Error ? e.message : t('Muat naik gagal.'))
    }
  }

  const submit = () => {
    setError(null)
    const payload: ContentSetPayload = { id: spec.id, kind, hidden }
    if (kind === 'text' || kind === 'file') Object.assign(payload, { ms: ms.trim(), en: en.trim() })
    if (kind === 'text' && spec.hasLink) payload.url = url.trim()
    if (kind === 'list') payload.json = JSON.stringify(rows.filter((r) => Object.values(r).some((v) => v?.trim())))
    if (file) payload.file = file
    if (removeFile) payload.removeFile = true
    save.mutate(payload, { onSuccess: () => (toast.success(t('Kandungan disimpan.')), onClose()), onError: (e) => setError(e.message) })
  }

  const setRow = (i: number, key: string, value: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: value } : r)))
  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const j = i + d
      if (j < 0 || j >= rs.length) return rs
      const next = [...rs]
      ;[next[i], next[j]] = [next[j]!, next[i]!]
      return next
    })

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={spec.title ?? t('Sunting kandungan')}
      description={<span className="font-mono text-micro">{spec.id}</span>}
      footer={
        <>
          {item && (
            <Button variant="tertiary" className="mr-auto" disabled={busy} onClick={() => reset.mutate({ id: spec.id }, { onSuccess: () => (toast.success(t('Dipulihkan kepada asal.')), onClose()) })}>
              {t('Pulihkan asal')}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            {t('Batal')}
          </Button>
          <Button loading={save.isPending} onClick={submit}>
            {t('Simpan')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {(kind === 'text' || kind === 'file') &&
          (spec.multiline ? (
            <>
              <TextAreaField label={t('Teks (Bahasa Melayu)')} rows={5} value={ms} maxLength={4000} onChange={(e) => setMs(e.target.value)} />
              <TextAreaField label={t('Text (English)')} rows={5} value={en} maxLength={4000} onChange={(e) => setEn(e.target.value)} />
            </>
          ) : (
            <>
              <FormField label={t('Teks (Bahasa Melayu)')} value={ms} maxLength={4000} onChange={(e) => setMs(e.target.value)} />
              <FormField label={t('Text (English)')} value={en} maxLength={4000} onChange={(e) => setEn(e.target.value)} />
            </>
          ))}

        {kind === 'text' && spec.hasLink && (
          <FormField label={t('Pautan')} hint={t('https://…, /halaman-dalaman, mailto: atau tel:')} value={url} onChange={(e) => setUrl(e.target.value)} />
        )}

        {(kind === 'image' || kind === 'file') && (
          <div className="space-y-2">
            <label className="block text-caption font-medium text-ink">
              {kind === 'image' ? t('Gambar (JPG, PNG atau WebP)') : t('Fail (PDF, DOCX, XLSX, PPTX atau imej; maks 5 MB)')}
              <input
                type="file"
                accept={kind === 'image' ? 'image/png,image/jpeg,image/webp' : '.pdf,.docx,.xlsx,.pptx,image/png,image/jpeg,image/webp'}
                className="mt-1 block w-full text-caption"
                onChange={(e) => {
                  void pickFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </label>
            {file && <p className="text-caption text-link">{t('Dipilih: {name}', { name: file.name })}</p>}
            {item && !file && (
              <label className="flex items-center gap-2 text-caption">
                <input type="checkbox" className="size-4 accent-blue" checked={removeFile} onChange={(e) => setRemoveFile(e.target.checked)} />
                {t('Buang fail semasa')}
              </label>
            )}
          </div>
        )}

        {kind === 'list' && spec.fields && (
          <div className="space-y-3">
            {rows.length === 0 && <p className="text-caption text-slate">{t('Belum ada item. Tambah item pertama.')}</p>}
            {rows.map((row, i) => (
              <fieldset key={i} className="space-y-3 rounded-card border border-line p-4">
                <legend className="px-1 text-micro font-semibold uppercase tracking-wide text-slate">{t('Item {n}', { n: i + 1 })}</legend>
                {spec.fields!.map((f) => (
                  <ListFieldInput key={f.key} field={f} row={row} onChange={(key, v) => setRow(i, key, v)} />
                ))}
                <div className="flex gap-1">
                  <Button size="icon" variant="secondary" aria-label={t('Naik')} onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp />
                  </Button>
                  <Button size="icon" variant="secondary" aria-label={t('Turun')} onClick={() => move(i, 1)} disabled={i === rows.length - 1}>
                    <ArrowDown />
                  </Button>
                  <Button size="icon" variant="secondary" aria-label={t('Buang item {n}', { n: i + 1 })} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                </div>
              </fieldset>
            ))}
            <Button variant="secondary" onClick={() => setRows((rs) => [...rs, {}])} disabled={rows.length >= 60}>
              <Plus />
              {t('Tambah item')}
            </Button>
          </div>
        )}

        <label className="flex items-center gap-2 text-caption font-medium">
          <input type="checkbox" className="size-4 accent-blue" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
          {t('Sembunyikan elemen ini daripada pelawat')}
        </label>
        {error && <Notice>{error}</Notice>}
      </div>
    </Dialog>
  )
}

/** Each text field has a Malay and an English input (key and keyEn); a link field has one. */
function ListFieldInput({ field, row, onChange }: { field: ListField; row: Record<string, string>; onChange: (key: string, value: string) => void }) {
  if (field.url) return <FormField label={field.label} value={row[field.key] ?? ''} onChange={(e) => onChange(field.key, e.target.value)} />
  const Input = field.multiline ? TextAreaField : FormField
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Input label={`${field.label} (BM)`} value={row[field.key] ?? ''} maxLength={1500} onChange={(e) => onChange(field.key, e.target.value)} />
      <Input label={`${field.label} (EN)`} value={row[`${field.key}En`] ?? ''} maxLength={1500} onChange={(e) => onChange(`${field.key}En`, e.target.value)} />
    </div>
  )
}
