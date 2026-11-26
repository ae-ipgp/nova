import { BadgeCheck, SearchX, ShieldAlert } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { VerifyResult } from '@shared/api-contract'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { FormField, Notice } from '@/components/ui/form-field'
import { Mascot } from '@/components/brand/mascot'
import { callApi } from '@/lib/api'
import { isApiConfigured } from '@/lib/env'
import { formatDate } from '@/lib/format'
import { PublicPage } from './public-page'
import { t } from '@/i18n'

/** Public "Semak keaslian": confirms only that a reference number exists and its status — never who or what it was for. */
export function VerifyPage() {
  const [ref, setRef] = useState(() => new URLSearchParams(window.location.search).get('no') ?? '')
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!ref.trim()) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      setResult(await callApi('public.verify', { reference: ref.trim() }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Semakan gagal.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicPage id="verify" eyebrowMs="Semak keaslian" titleMs="Semak nombor rujukan" descriptionMs="Masukkan nombor rujukan pada surat atau sijil untuk mengesahkan sama ada ia dikeluarkan oleh sistem ini.">
      <div className="mx-auto grid max-w-3xl gap-8 md:grid-cols-[1fr_auto] md:items-start">
        <div className="space-y-5">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <FormField label={t('Nombor rujukan')} value={ref} onChange={(e) => setRef(e.target.value)} maxLength={120} required className="[&_input]:font-mono" />
            <Button type="submit" size="lg" loading={busy} disabled={!isApiConfigured}>{t('Semak')}</Button>
          </form>
          {error && <Notice>{error}</Notice>}
          {result && (
            <Card className={result.found ? (result.status === 'issued' ? 'border-green/40' : 'border-red/40') : 'border-amber/40'}>
              <CardBody className="flex gap-3" role="status">
                {result.found && result.status === 'issued' && <BadgeCheck className="size-6 shrink-0 text-green" aria-hidden />}
                {result.found && result.status === 'voided' && <ShieldAlert className="size-6 shrink-0 text-red" aria-hidden />}
                {!result.found && <SearchX className="size-6 shrink-0 text-amber" aria-hidden />}
                <div>
                  {result.found && result.status === 'issued' && <><p className="font-bold text-heading">{t('Nombor ini sah.')}</p><p className="text-caption text-slate">{result.typeName} {t('· dikeluarkan')} {formatDate(result.issuedAt ?? '')}</p></>}
                  {result.found && result.status === 'voided' && <><p className="font-bold text-red">{t('Nombor ini telah dibatalkan.')}</p><p className="text-caption text-slate">{t('Dokumen yang membawa nombor ini tidak sah lagi.')}</p></>}
                  {!result.found && <><p className="font-bold text-heading">{t('Nombor tidak ditemui.')}</p><p className="text-caption text-slate">{t('Semak ejaan nombor. Jika dokumen anda membawa nombor ini, hubungi Sekretariat.')}</p></>}
                </div>
              </CardBody>
            </Card>
          )}
          <p className="text-micro text-slate">{t('Semakan hanya mengesahkan kewujudan dan status nombor. Tajuk, penerima dan pemohon tidak dipaparkan.')}</p>
        </div>
        <Mascot pose="shield" size={200} className="hidden md:block" />
      </div>
    </PublicPage>
  )
}
