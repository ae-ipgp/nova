import { Hash, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { SeriesView } from '@shared/api-contract'
import { validatePattern } from '@shared/reference-format'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { FormField, Notice } from '@/components/ui/form-field'
import { QueryState } from '@/components/ui/query-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/components/ui/toast'
import { useGatewayMutation, useGatewayQuery } from '@/hooks/use-gateway'
import { todayIso } from '@/lib/format'
import { t } from '@/i18n'

export function SeriesPage() {
  const q = useGatewayQuery('admin.series.list', {})
  const [editing, setEditing] = useState<SeriesView | 'new' | null>(null)
  return (
    <section aria-labelledby="series-h" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="series-h" className="text-h3 font-bold">{t('Siri nombor rujukan')}</h2>
          <p className="mt-1 max-w-2xl text-caption text-slate">{t('Format ialah konfigurasi: gunakan {PREFIX}, {YEAR} dan {SEQ}. Satu siri aktif bagi setiap tahun. Tiada nombor boleh dikeluarkan sehingga siri ditetapkan.', { PREFIX: '{PREFIX}', YEAR: '{YEAR}', SEQ: '{SEQ}' })}</p>
        </div>
        <Button onClick={() => setEditing('new')}><Plus />{t('Siri baharu')}</Button>
      </div>
      <Notice tone="warning">{t('Format rasmi (klasifikasi fail, turutan, reset tahunan) mesti disahkan oleh pihak institusi sebelum digunakan sebagai sistem rekod rasmi (Blueprint §16 #1). Contoh paparan hanyalah placeholder.')}</Notice>
      <Card className="overflow-hidden">
        <QueryState query={q} empty={{ icon: Hash, pose: 'construction', title: t('Siri belum ditetapkan'), description: t('Cipta siri bagi tahun semasa supaya SUAK boleh meluluskan permohonan.') }}>
          {(rows) => (
            <ul className="divide-y divide-line">
              {rows.map((s) => (
                <li key={s.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-body font-semibold text-heading">{s.pattern}</p>
                    <p className="text-caption text-slate">{t('Tahun {year} · awalan “{prefix}” · seterusnya {next} (lapik {padding}) · versi {version}', { year: s.year, prefix: s.prefix, next: s.nextSequence, padding: s.padding, version: s.version })}</p>
                    <p className="font-mono text-micro text-link">{t('Pratonton:')} {s.preview}</p>
                  </div>
                  <div className="flex items-center gap-2"><StatusBadge tone={s.active ? 'approved' : 'archived'}>{s.active ? t('Aktif') : t('Tidak aktif')}</StatusBadge><Button size="sm" variant="secondary" onClick={() => setEditing(s)}>{t('Sunting')}</Button></div>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </Card>
      {editing && <SeriesDialog existing={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </section>
  )
}

function SeriesDialog({ existing, onClose }: { existing: SeriesView | null; onClose: () => void }) {
  const toast = useToast()
  const save = useGatewayMutation('admin.series.save', ['admin.series.list'])
  const [v, setV] = useState({ prefix: existing?.prefix ?? '', pattern: existing?.pattern ?? '{PREFIX}/{SEQ}/{YEAR}', year: String(existing?.year ?? Number(todayIso().slice(0, 4))), nextSequence: String(existing?.nextSequence ?? 1), padding: String(existing?.padding ?? 3), active: existing?.active ?? true })
  const [error, setError] = useState<string | null>(null)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const bad = validatePattern(v.pattern)
    if (bad) return setError(bad)
    setError(null)
    save.mutate({ id: existing?.id, prefix: v.prefix, pattern: v.pattern, year: Number(v.year), nextSequence: Number(v.nextSequence), padding: Number(v.padding), active: v.active }, { onSuccess: () => (toast.success(t('Siri disimpan.')), onClose()) })
  }
  return (
    <Dialog open onClose={onClose} title={existing ? t('Sunting siri') : t('Siri baharu')} footer={<><Button variant="secondary" onClick={onClose}>{t('Batal')}</Button><Button type="submit" form="series-form" loading={save.isPending}>{t('Simpan')}</Button></>}>
      <form id="series-form" noValidate onSubmit={submit} className="space-y-4">
        <FormField label={t('Format')} className="font-mono" value={v.pattern} onChange={(e) => setV({ ...v, pattern: e.target.value })} required hint={t('Mesti mengandungi {SEQ}.')} />
        <FormField label={t('Awalan ({PREFIX})')} value={v.prefix} onChange={(e) => setV({ ...v, prefix: e.target.value })} maxLength={60} />
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label={t('Tahun')} type="number" value={v.year} onChange={(e) => setV({ ...v, year: e.target.value })} required />
          <FormField label={t('Turutan seterusnya')} type="number" min={1} value={v.nextSequence} onChange={(e) => setV({ ...v, nextSequence: e.target.value })} required />
          <FormField label={t('Lapik sifar')} type="number" min={0} max={8} value={v.padding} onChange={(e) => setV({ ...v, padding: e.target.value })} required />
        </div>
        <label className="flex items-center gap-2 text-caption font-medium"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} className="size-4 accent-[var(--color-blue)]" />{t('Aktif (menggantikan siri aktif lain bagi tahun ini)')}</label>
        {(error || save.error) && <Notice>{error ?? save.error?.message}</Notice>}
      </form>
    </Dialog>
  )
}
