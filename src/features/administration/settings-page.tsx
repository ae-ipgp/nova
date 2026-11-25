import { useState } from 'react'
import type { SettingsResult } from '@shared/api-contract'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { FormField, Notice, SelectField, TextAreaField } from '@/components/ui/form-field'
import { QueryState } from '@/components/ui/query-state'
import { useToast } from '@/components/ui/toast'
import { useGatewayMutation, useGatewayQuery } from '@/hooks/use-gateway'

const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Identiti & perhubungan', keys: ['org_name', 'contact_email', 'contact_phone', 'contact_address', 'social_instagram', 'social_facebook', 'social_tiktok'] },
  { title: 'Kandungan awam', keys: ['about_text', 'privacy_text', 'privacy_effective_date'] },
  { title: 'Kepala surat & penandatangan', keys: ['letterhead_line1', 'letterhead_line2', 'letterhead_line3', 'signatory_title', 'verify_url', 'letter_categories'] },
  { title: 'E-mel (NoMe)', keys: ['mail_sender_name', 'mail_reply_to'] },
  { title: 'Kehadiran', keys: ['late_counts_as_present', 'public_attendance_mode'] },
  { title: 'Penyelenggaraan', keys: ['maintenance_mode', 'maintenance_message'] },
]

export function SettingsPage() {
  const q = useGatewayQuery('admin.settings.get', {})
  return (
    <section aria-labelledby="set-h" className="space-y-4">
      <div><h2 id="set-h" className="text-h3 font-bold">Tetapan</h2><p className="mt-1 text-caption text-slate">Konfigurasi bukan rahsia. Kunci dan rahsia teknikal tidak disimpan di sini (ADM-09). Perubahan direkodkan dalam log audit.</p></div>
      <QueryState query={q} isEmpty={() => false} empty={{ title: '' }} rows={4}>{(s) => <SettingsForm initial={s} />}</QueryState>
    </section>
  )
}

function SettingsForm({ initial }: { initial: SettingsResult }) {
  const toast = useToast()
  const save = useGatewayMutation('admin.settings.set', ['admin.settings.get', 'site.config'])
  const [values, setValues] = useState(initial.values)
  const changed = Object.fromEntries(Object.entries(values).filter(([k, v]) => v !== initial.values[k]))
  const dirty = Object.keys(changed).length > 0
  const field = (key: string) => initial.fields.find((f) => f.key === key)!

  return (
    <form className="space-y-6" onSubmit={(e) => (e.preventDefault(), save.mutate({ values: changed }, { onSuccess: () => toast.success('Tetapan disimpan.') }))} noValidate>
      {GROUPS.map((g) => (
        <Card key={g.title}>
          <CardBody className="space-y-4">
            <h3 className="text-body font-bold">{g.title}</h3>
            {g.keys.map((key) => {
              const f = field(key)
              const v = values[key] ?? ''
              const set = (x: string) => setValues({ ...values, [key]: x })
              const common = { label: f.label + (f.public ? '' : ' (dalaman)'), hint: f.help }
              if (f.kind === 'boolean') return <label key={key} className="flex items-start gap-3 text-caption"><input type="checkbox" checked={v === 'true'} onChange={(e) => set(e.target.checked ? 'true' : 'false')} className="mt-0.5 size-4 accent-[var(--color-blue)]" /><span><span className="block font-semibold text-ink">{f.label}</span>{f.help && <span className="block text-slate">{f.help}</span>}</span></label>
              if (f.kind === 'select') return <SelectField key={key} {...common} value={v} onChange={(e) => set(e.target.value)}>{f.options?.map((o) => <option key={o} value={o}>{o === 'aggregate' ? 'Statistik sahaja (lalai)' : o === 'named' ? 'Nama + status' : o}</option>)}</SelectField>
              if (f.kind === 'textarea') return <TextAreaField key={key} {...common} rows={key === 'privacy_text' ? 10 : 3} value={v} maxLength={f.max} onChange={(e) => set(e.target.value)} />
              return <FormField key={key} {...common} value={v} maxLength={f.max} onChange={(e) => set(e.target.value)} />
            })}
          </CardBody>
        </Card>
      ))}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <Button type="submit" loading={save.isPending} disabled={!dirty}>Simpan perubahan</Button>
        {dirty && <Button variant="secondary" onClick={() => setValues(initial.values)}>Buang</Button>}
        {save.error && <Notice>{save.error.message}</Notice>}
      </div>
    </form>
  )
}
