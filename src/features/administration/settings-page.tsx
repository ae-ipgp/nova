import { Download } from 'lucide-react'
import { useState } from 'react'
import type { SettingsResult } from '@shared/api-contract'
import { PUBLIC_PAGE_KEYS, VISIBILITY_STATES, VISIBILITY_STATE_LABELS, WORKSPACE_PAGE_KEYS } from '@shared/domain'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { FormField, Notice, SelectField, TextAreaField } from '@/components/ui/form-field'
import { QueryState } from '@/components/ui/query-state'
import { useToast } from '@/components/ui/toast'
import { BrandCard } from './brand-card'
import { useDownloader, useGatewayMutation, useGatewayQuery } from '@/hooks/use-gateway'
import { t } from '@/i18n'

const PUBLIC_LABEL: Record<string, string> = { organisasi: 'Organisasi', kehadiran: 'Kehadiran', pengumuman: 'Pengumuman', templat: 'Templat', arkib: 'Arkib Awam', semak: 'Semak Keaslian' }
const WS_LABEL: Record<string, string> = { e_surat: 'e-Surat', e_mesyuarat: 'e-Mesyuarat', nome: 'NoMe', templat: 'Templat', e_opr: 'e-OPR', e_arkib: 'e-Arkib', papan_notis: 'Papan Notis' }

const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Identiti & perhubungan', keys: ['org_name', 'contact_email', 'contact_phone', 'contact_phone_label', 'contact_phone2', 'contact_phone2_label', 'contact_address', 'jpp_portal_url', 'social_instagram', 'social_facebook', 'social_tiktok'] },
  { title: 'Kandungan awam', keys: ['about_text', 'privacy_text', 'privacy_effective_date'] },
  { title: 'Kepala surat & penandatangan', keys: ['letterhead_line1', 'letterhead_line2', 'letterhead_line3', 'signatory_title', 'verify_url', 'letter_categories'] },
  { title: 'Jawapan sedia', keys: ['canned_replies'] },
  { title: 'E-mel (NoMe)', keys: ['mail_sender_name', 'mail_reply_to'] },
  { title: 'Makluman e-mel sistem', keys: ['notifications_enabled', 'app_url'] },
  { title: 'Kehadiran', keys: ['late_counts_as_present', 'public_attendance_mode'] },
  { title: 'Penyelenggaraan', keys: ['maintenance_mode', 'maintenance_message'] },
]

export function SettingsPage() {
  const q = useGatewayQuery('admin.settings.get', {})
  return (
    <section aria-labelledby="set-h" className="space-y-4">
      <div><h2 id="set-h" className="text-h3 font-bold">{t('Tetapan')}</h2><p className="mt-1 text-caption text-slate">{t('Konfigurasi bukan rahsia. Kunci dan rahsia teknikal tidak disimpan di sini (ADM-09). Perubahan direkodkan dalam log audit.')}</p></div>
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
    <div className="space-y-6">
    <BrandCard />
    <BackupCard />
    <form className="space-y-6" onSubmit={(e) => (e.preventDefault(), save.mutate({ values: changed }, { onSuccess: () => toast.success(t('Tetapan disimpan.')) }))} noValidate>
      <Card>
        <CardBody className="space-y-4">
          <div>
            <h3 className="text-body font-bold">{t('Keterlihatan halaman')}</h3>
            <p className="mt-1 text-caption text-slate">
              {t('Akan datang dan Dikunci memaparkan notis; Disembunyikan membuang halaman daripada navigasi. SUAK sentiasa boleh membuka halaman ruang kerja.')}
            </p>
          </div>
          <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
            <VisibilityColumn title={t('Portal awam')} scope="pub" keys={PUBLIC_PAGE_KEYS} labels={PUBLIC_LABEL} values={values} setValues={setValues} />
            <VisibilityColumn title={t('Ruang kerja')} scope="ws" keys={WORKSPACE_PAGE_KEYS} labels={WS_LABEL} values={values} setValues={setValues} />
          </div>
        </CardBody>
      </Card>
      {GROUPS.map((g) => (
        <Card key={g.title}>
          <CardBody className="space-y-4">
            <h3 className="text-body font-bold">{t(g.title)}</h3>
            {g.keys.map((key) => {
              const f = field(key)
              const v = values[key] ?? ''
              const set = (x: string) => setValues({ ...values, [key]: x })
              const common = { label: f.label + (f.public ? '' : ' (dalaman)'), hint: f.help }
              if (f.kind === 'boolean') return <label key={key} className="flex items-start gap-3 text-caption"><input type="checkbox" checked={v === 'true'} onChange={(e) => set(e.target.checked ? 'true' : 'false')} className="mt-0.5 size-4 accent-[var(--color-blue)]" /><span><span className="block font-semibold text-ink">{f.label}</span>{f.help && <span className="block text-slate">{f.help}</span>}</span></label>
              if (f.kind === 'select') return <SelectField key={key} {...common} value={v} onChange={(e) => set(e.target.value)}>{f.options?.map((o) => <option key={o} value={o}>{o === 'aggregate' ? t('Statistik sahaja (lalai)') : o === 'named' ? t('Nama + status') : o}</option>)}</SelectField>
              if (f.kind === 'textarea') return <TextAreaField key={key} {...common} rows={key === 'privacy_text' ? 10 : 3} value={v} maxLength={f.max} onChange={(e) => set(e.target.value)} />
              return <FormField key={key} {...common} value={v} maxLength={f.max} onChange={(e) => set(e.target.value)} />
            })}
          </CardBody>
        </Card>
      ))}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <Button type="submit" loading={save.isPending} disabled={!dirty}>{t('Simpan perubahan')}</Button>
        {dirty && <Button variant="secondary" onClick={() => setValues(initial.values)}>{t('Buang')}</Button>}
        {save.error && <Notice>{save.error.message}</Notice>}
      </div>
    </form>
    </div>
  )
}

function VisibilityColumn({
  title,
  scope,
  keys,
  labels,
  values,
  setValues,
}: {
  title: string
  scope: 'pub' | 'ws'
  keys: readonly string[]
  labels: Record<string, string>
  values: Record<string, string>
  setValues: (v: Record<string, string>) => void
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-micro font-semibold uppercase tracking-wide text-slate">{title}</legend>
      {keys.map((k) => {
        const key = `vis_${scope}_${k}`
        return (
          <label key={key} className="flex items-center justify-between gap-3 text-caption text-ink">
            <span>{t(labels[k] ?? k)}</span>
            <select
              value={values[key] || 'published'}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
              className="h-9 rounded-input border border-line bg-paper px-2 text-caption text-heading"
              aria-label={`${title}: ${t(labels[k] ?? k)}`}
            >
              {VISIBILITY_STATES.map((st) => (
                <option key={st} value={st}>
                  {t(VISIBILITY_STATE_LABELS[st])}
                </option>
              ))}
            </select>
          </label>
        )
      })}
    </fieldset>
  )
}

/** Monthly backups run automatically to Drive (keep 12); this downloads a copy on demand. */
function BackupCard() {
  const download = useDownloader()
  const [busy, setBusy] = useState(false)
  return (
    <Card>
      <CardBody className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-xl">
          <h3 className="text-body font-bold">{t('Sandaran data')}</h3>
          <p className="mt-1 text-caption text-slate">
            {t('Sandaran bulanan disimpan automatik ke Google Drive (12 salinan terkini). Anda juga boleh memuat turun salinan ZIP semua rekod sekarang. Fail ini mengandungi data peribadi: simpan dengan selamat.')}
          </p>
        </div>
        <Button
          variant="secondary"
          loading={busy}
          onClick={async () => {
            setBusy(true)
            await download('admin.backup.export', {})
            setBusy(false)
          }}
        >
          <Download />
          {t('Muat turun sandaran')}
        </Button>
      </CardBody>
    </Card>
  )
}
