import { ImagePlus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { contrastRatio, isHexColour, primaryIsReadable } from '@shared/colour'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Notice } from '@/components/ui/form-field'
import { useToast } from '@/components/ui/toast'
import { useGatewayMutation } from '@/hooks/use-gateway'
import { useSite } from '@/hooks/use-site'
import { useBrand } from '@/lib/brand'
import { FileError, shrinkFavicon, shrinkLogo } from '@/lib/files'
import { t } from '@/i18n'

const DEFAULT_PRIMARY = '#1769aa'
const DEFAULT_ACCENT = '#d4b77a'

/** Tetapan → Jenama: change the logo, favicon and the two brand colours. SUAK only (the gateway enforces it). */
export function BrandCard() {
  const toast = useToast()
  const { site } = useSite()
  const { logo } = useBrand()
  const save = useGatewayMutation('admin.brand.set', ['public.brand', 'site.config'])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const primary = site.settings.brand_primary || DEFAULT_PRIMARY
  const accent = site.settings.brand_accent || DEFAULT_ACCENT
  const [draftPrimary, setDraftPrimary] = useState(primary)
  const [draftAccent, setDraftAccent] = useState(accent)
  const primaryOk = isHexColour(draftPrimary) && primaryIsReadable(draftPrimary)

  const upload = async (kind: 'logo' | 'favicon', files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    setBusy(true)
    setError(null)
    try {
      const payload = kind === 'logo' ? await shrinkLogo(f) : await shrinkFavicon(f)
      save.mutate({ [kind]: payload }, { onSuccess: () => toast.success(kind === 'logo' ? 'Logo dikemas kini.' : 'Favicon dikemas kini.') })
    } catch (e) {
      setError(e instanceof FileError || e instanceof Error ? e.message : 'Muat naik gagal.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardBody className="space-y-5">
        <div>
          <h3 className="text-body font-bold">{t('Jenama (logo, favicon, warna)')}</h3>
          <p className="mt-1 text-caption text-slate">{t('Logo dan favicon dikecilkan secara automatik. Gunakan PNG/JPG/WebP; logo lutsinar disokong. Ikon aplikasi yang dipasang (PWA) kekal sehingga dikemas kini dalam kod.')}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-caption font-medium">{t('Logo')}</p>
            <div className="grid h-24 place-items-center rounded-input border border-line bg-navy p-3">
              {logo ? <img src={logo} alt={t('Logo semasa')} className="max-h-full max-w-full object-contain" /> : <span className="text-caption text-sky/70">{t('Logo lalai NO.VA')}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-input border border-line bg-paper px-3 text-caption font-medium text-heading hover:border-blue">
                <ImagePlus className="size-4" aria-hidden />
                {busy ? t('Memproses…') : t('Tukar logo')}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy} onChange={(e) => { void upload('logo', e.target.files); e.target.value = '' }} />
              </label>
              {logo && <Button size="sm" variant="tertiary" onClick={() => save.mutate({ removeLogo: true }, { onSuccess: () => toast.success(t('Logo lalai dipulihkan.')) })}><Trash2 />{t('Buang')}</Button>}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-caption font-medium">{t('Favicon')}</p>
            <div className="grid h-24 place-items-center rounded-input border border-line bg-ice">
              <FaviconPreview />
            </div>
            <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-input border border-line bg-paper px-3 text-caption font-medium text-heading hover:border-blue">
              <ImagePlus className="size-4" aria-hidden />
              {t('Tukar favicon')}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy} onChange={(e) => { void upload('favicon', e.target.files); e.target.value = '' }} />
            </label>
            <Button size="sm" variant="tertiary" onClick={() => save.mutate({ removeFavicon: true }, { onSuccess: () => toast.success(t('Favicon lalai dipulihkan.')) })}><Trash2 />{t('Lalai')}</Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ColourField label={t('Warna utama (butang, tab aktif)')} value={draftPrimary} onChange={setDraftPrimary} error={!primaryOk ? (isHexColour(draftPrimary) ? t('Kontras dengan teks putih {v1}:1 — minimum 4.5:1.', { v1: contrastRatio(draftPrimary, '#ffffff').toFixed(1) }) : t('Format #RRGGBB.')) : undefined} />
          <ColourField label={t('Warna aksen (hiasan kecil)')} value={draftAccent} onChange={setDraftAccent} error={!isHexColour(draftAccent) ? t('Format #RRGGBB.') : undefined} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={!primaryOk || !isHexColour(draftAccent) || (draftPrimary === primary && draftAccent === accent)} loading={save.isPending} onClick={() => save.mutate({ primary: draftPrimary, accent: draftAccent }, { onSuccess: () => toast.success(t('Warna jenama disimpan.')) })}>
            {t('Simpan warna')}
          </Button>
          <Button variant="secondary" onClick={() => { setDraftPrimary(DEFAULT_PRIMARY); setDraftAccent(DEFAULT_ACCENT); save.mutate({ primary: '', accent: '' }, { onSuccess: () => toast.success(t('Warna lalai dipulihkan.')) }) }}>
            <RotateCcw />{t('Pulihkan lalai')}
          </Button>
        </div>
        {(error || save.error) && <Notice>{error ?? save.error?.message}</Notice>}
      </CardBody>
    </Card>
  )
}

function FaviconPreview() {
  const href = document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href
  return href ? <img src={href} alt={t('Favicon semasa')} className="size-12 object-contain" /> : <span className="text-caption text-slate">{t('Lalai')}</span>
}

function ColourField({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-caption font-medium text-ink">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={t('{label} (pemilih)', { label: label })} value={isHexColour(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)} className="size-11 shrink-0 cursor-pointer rounded-input border border-line bg-paper p-1" />
        <input value={value} onChange={(e) => onChange(e.target.value.trim())} maxLength={7} aria-label={label} aria-invalid={error ? true : undefined} className="h-11 w-full rounded-input border border-line bg-paper px-3 font-mono text-body focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none" />
      </div>
      {error && <p className="mt-1 text-micro text-red">{error}</p>}
    </div>
  )
}
