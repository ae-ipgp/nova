import { FileStack, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { DocumentTypeView } from '@shared/api-contract'
import { BUILT_IN_KEYS } from '@shared/template-render'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { FormField, Notice, SelectField, TextAreaField } from '@/components/ui/form-field'
import { QueryState } from '@/components/ui/query-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/components/ui/toast'
import { useGatewayMutation, useGatewayQuery } from '@/hooks/use-gateway'

export function DocTypesPage() {
  const q = useGatewayQuery('admin.doctypes.list', {})
  const [editing, setEditing] = useState<DocumentTypeView | 'new' | null>(null)
  return (
    <section aria-labelledby="dt-h" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="dt-h" className="text-h3 font-bold">Jenis surat & sijil</h2>
          <p className="mt-1 max-w-2xl text-caption text-slate">Takrifkan medan dan teks templat. Gunakan <code className="font-mono">{'{{medan}}'}</code> dalam teks. Medan terbina dalam: {BUILT_IN_KEYS.map((k) => `{{${k}}}`).join(', ')} dan {'{{tujuan}}'}.</p>
        </div>
        <Button onClick={() => setEditing('new')}><Plus />Jenis baharu</Button>
      </div>
      <Notice tone="warning">Jenis bertanda <strong>CONTOH</strong> ialah teks pemegang tempat. Gantikan dengan format rasmi yang diluluskan; menyimpan jenis menghapuskan tanda CONTOH. Tiada ucapan, penutup atau moto ditambah oleh sistem.</Notice>
      <Card className="overflow-hidden">
        <QueryState query={q} empty={{ icon: FileStack, title: 'Tiada jenis dokumen' }}>
          {(rows) => (
            <ul className="divide-y divide-line">
              {rows.map((t) => (
                <li key={t.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-semibold text-navy">{t.name} <span className="font-mono text-micro text-slate">{t.code}</span></p><p className="text-caption text-slate">{t.kind === 'certificate' ? 'Sijil' : 'Surat'} · {t.fields.length} medan</p></div>
                  <div className="flex items-center gap-2">{t.isDemo && <StatusBadge tone="pending">CONTOH</StatusBadge>}<StatusBadge tone={t.active ? 'approved' : 'archived'}>{t.active ? 'Aktif' : 'Tidak aktif'}</StatusBadge><Button size="sm" variant="secondary" onClick={() => setEditing(t)}>Sunting</Button></div>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </Card>
      {editing && <DocTypeDialog existing={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </section>
  )
}

function DocTypeDialog({ existing, onClose }: { existing: DocumentTypeView | null; onClose: () => void }) {
  const toast = useToast()
  const save = useGatewayMutation('admin.doctypes.save', ['admin.doctypes.list', 'ref.options'])
  const [v, setV] = useState({ code: existing?.code ?? '', name: existing?.name ?? '', kind: existing?.kind ?? ('letter' as 'letter' | 'certificate'), description: existing?.description ?? '', bodyTemplate: existing?.bodyTemplate ?? '', active: existing?.active ?? true })
  const [fields, setFields] = useState<DocumentTypeView['fields']>(existing?.fields ?? [])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({ id: existing?.id, ...v, fields }, { onSuccess: () => (toast.success('Jenis dokumen disimpan.'), onClose()) })
  }
  return (
    <Dialog open onClose={onClose} size="lg" title={existing ? 'Sunting jenis dokumen' : 'Jenis dokumen baharu'} footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" form="dt-form" loading={save.isPending}>Simpan</Button></>}>
      <form id="dt-form" noValidate onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Kod" value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} maxLength={30} required />
          <FormField label="Nama" className="sm:col-span-1" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={100} required />
          <SelectField label="Jenis" value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value as 'letter' | 'certificate' })}><option value="letter">Surat</option><option value="certificate">Sijil</option></SelectField>
        </div>
        <FormField label="Penerangan" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={300} />
        <fieldset className="space-y-3 rounded-input border border-line p-3">
          <legend className="px-1 text-caption font-semibold">Medan yang diisi pemohon</legend>
          {fields.map((f, i) => (
            <div key={i} className="grid items-end gap-2 sm:grid-cols-[8rem_1fr_7rem_auto_auto]">
              <FormField label="Kunci" value={f.key} onChange={(e) => setFields(fields.map((x, k) => (k === i ? { ...x, key: e.target.value } : x)))} />
              <FormField label="Label" value={f.label} onChange={(e) => setFields(fields.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
              <SelectField label="Jenis" value={f.type} onChange={(e) => setFields(fields.map((x, k) => (k === i ? { ...x, type: e.target.value as typeof f.type } : x)))}><option value="text">Teks</option><option value="textarea">Teks panjang</option><option value="date">Tarikh</option></SelectField>
              <label className="flex h-11 items-center gap-1 text-caption"><input type="checkbox" checked={f.required} onChange={(e) => setFields(fields.map((x, k) => (k === i ? { ...x, required: e.target.checked } : x)))} className="size-4 accent-[var(--color-blue)]" />Wajib</label>
              <Button variant="tertiary" className="h-11" onClick={() => setFields(fields.filter((_, k) => k !== i))} aria-label={`Buang medan ${i + 1}`}><Trash2 /></Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => setFields([...fields, { key: '', label: '', required: true, type: 'text' }])} disabled={fields.length >= 20}>Tambah medan</Button>
        </fieldset>
        <TextAreaField label="Teks templat" rows={9} value={v.bodyTemplate} onChange={(e) => setV({ ...v, bodyTemplate: e.target.value })} maxLength={6000} required hint="Baris kosong = perenggan baharu. Gunakan {{kunci}} untuk medan." />
        <label className="flex items-center gap-2 text-caption font-medium"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} className="size-4 accent-[var(--color-blue)]" />Aktif</label>
        {save.error && <Notice>{save.error.message}</Notice>}
      </form>
    </Dialog>
  )
}
