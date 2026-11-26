import { ArrowLeft, ArrowRight, Check, Download, ImagePlus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import type { OprContent, OprView } from '@shared/api-contract'
import { OPR_STYLES, type OprStyle } from '@shared/domain'
import { EMPTY_OPR, narrativeLength, narrativeLimit, OPR_TEXT_LIMITS, renderOprHtml } from '@shared/opr-html'
import { useAuth } from '@/app/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormField, Notice, SelectField, TextAreaField } from '@/components/ui/form-field'
import { QueryState } from '@/components/ui/query-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/components/ui/toast'
import { useDownloader, useGatewayMutation, useGatewayQuery } from '@/hooks/use-gateway'
import { useSite } from '@/hooks/use-site'
import { callApi } from '@/lib/api'
import { FileError, dataUri, shrinkImage } from '@/lib/files'
import { cn } from '@/lib/cn'
import { OPR_STATUS_UI } from '@/lib/status-ui'
import { A4Preview } from './a4-preview'
import { t } from '@/i18n'

const STEPS = ['Identiti', 'Tujuan', 'Pelaksanaan', 'Penyertaan', 'Hasil', 'Media', 'Refleksi', 'Semakan'] as const
const STYLE_LABEL: Record<OprStyle, string> = { corporate: 'Korporat', editorial: 'Editorial', infographic: 'Infografik' }
const INVALIDATE = ['opr.list', 'opr.get', 'dashboard.summary', 'arc.list'] as const
const draftKey = (id: string) => `nova.opr.draft.${id}`

export function OprEditorPage() {
  const { id = 'baru' } = useParams()
  const q = useGatewayQuery('opr.get', { id }, { enabled: id !== 'baru' })
  return (
    <div className="space-y-4">
      <Link to="/workspace/e-opr" className="inline-flex items-center gap-1 text-caption font-medium text-link hover:underline">
        <ArrowLeft className="size-4" aria-hidden />
        {t('Semua OPR')}
      </Link>
      {id === 'baru' ? <Editor key="new" /> : <QueryState query={q} isEmpty={() => false} empty={{ title: '' }}>{(o) => <Editor key={`${o.id}-${o.version}-${o.status}`} opr={o} />}</QueryState>}
    </div>
  )
}

function readLocal(id: string): { content: OprContent; style: OprStyle } | null {
  try {
    const raw = localStorage.getItem(draftKey(id))
    return raw ? (JSON.parse(raw) as { content: OprContent; style: OprStyle }) : null
  } catch {
    return null
  }
}

function Editor({ opr }: { opr?: OprView }) {
  const toast = useToast()
  const navigate = useNavigate()
  const download = useDownloader()
  const { site } = useSite()
  const { getToken, state } = useAuth()
  const canReview = opr?.canReview ?? false
  const editable = !opr || opr.canEdit
  const local = useMemo(() => (editable ? readLocal(opr?.id ?? 'baru') : null), [editable, opr?.id])
  const [content, setContent] = useState<OprContent>(() => ({ ...EMPTY_OPR, preparedBy: state.status === 'signed_in' ? (state.me.profile?.fullName ?? '') : '', ...(local?.content ?? opr?.content ?? {}) }))
  const [style, setStyle] = useState<OprStyle>(local?.style ?? opr?.style ?? 'corporate')
  const [step, setStep] = useState(0)
  const [oprId, setOprId] = useState(opr?.id ?? '')
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restored] = useState(Boolean(local))
  const [review, setReview] = useState<'approve' | 'revise' | null>(null)
  const save = useGatewayMutation('opr.save', INVALIDATE)
  const submit = useGatewayMutation('opr.submit', INVALIDATE)
  const reviewMut = useGatewayMutation('opr.review', INVALIDATE)
  const dirty = useRef(false)

  // Server-held images are fetched for the preview; just-uploaded ones are already in `thumbs`.
  const missing = content.images.filter((i) => !thumbs[i.fileId] && oprId)
  const fetched = useQueries({
    queries: missing.map((i) => ({
      queryKey: ['gateway', 'opr.image.get', oprId, i.fileId],
      staleTime: Infinity,
      queryFn: async () => dataUri(await callApi('opr.image.get', { oprId, fileId: i.fileId }, { token: await getToken() })),
    })),
  })
  const images = useMemo(() => {
    const out = { ...thumbs }
    missing.forEach((i, k) => {
      const d = fetched[k]?.data
      if (d) out[i.fileId] = d
    })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbs, fetched.map((f) => f.data).join('|')])

  // Local autosave (phone reloads must not lose work, OPR-02).
  useEffect(() => {
    if (!editable || !dirty.current) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey(oprId || 'baru'), JSON.stringify({ content, style }))
      } catch {
        /* storage unavailable */
      }
    }, 400)
    return () => clearTimeout(t)
  }, [content, style, oprId, editable])

  const set = <K extends keyof OprContent>(k: K, v: OprContent[K]) => {
    dirty.current = true
    setContent((c) => ({ ...c, [k]: v }))
  }
  const text = (k: Exclude<keyof OprContent, 'images'>) => ({ value: content[k], maxLength: OPR_TEXT_LIMITS[k], onChange: (e: { target: { value: string } }) => set(k, e.target.value) })
  const used = narrativeLength(content)
  const limit = narrativeLimit(content.images.length)

  const persist = useCallback(async (): Promise<OprView | null> => {
    setError(null)
    return new Promise((resolve) => {
      save.mutate({ id: oprId || undefined, style, content }, {
        onSuccess: (o) => {
          setOprId(o.id)
          try {
            localStorage.removeItem(draftKey(oprId || 'baru'))
            localStorage.removeItem(draftKey('baru'))
          } catch { /* ignore */ }
          dirty.current = false
          resolve(o)
        },
        onError: (e) => (setError(e.message), resolve(null)),
      })
    })
  }, [oprId, style, content, save])

  const saveDraft = async () => {
    const o = await persist()
    if (o) {
      toast.success(t('Draf disimpan.'))
      if (!opr) navigate(`/workspace/e-opr/${o.id}`, { replace: true })
    }
  }

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    setError(null)
    try {
      let id = oprId
      if (!id) {
        const o = await persist()
        if (!o) return
        id = o.id
      }
      let next = [...content.images]
      for (const f of Array.from(files)) {
        if (next.length >= 4) break
        const payload = await shrinkImage(f)
        const { fileId } = await callApi('opr.image.add', { oprId: id, file: payload }, { token: await getToken() })
        setThumbs((t) => ({ ...t, [fileId]: `data:${payload.mimeType};base64,${payload.base64}` }))
        next = [...next, { fileId, caption: '', credit: '' }]
      }
      dirty.current = true
      setContent((c) => ({ ...c, images: next }))
    } catch (e) {
      setError(e instanceof FileError || e instanceof Error ? e.message : 'Muat naik gambar gagal.')
    } finally {
      setBusy(false)
    }
  }

  const previewHtml = useMemo(() => renderOprHtml(content, { style, images, orgName: site.settings.org_name || 'JPP IPGKKB', watermark: opr?.status === 'approved' ? '' : 'DRAF — BELUM DISAHKAN', footer: opr?.status === 'approved' ? t('Disahkan melalui NoVA · Versi {version}', { version: opr.version }) : 'Draf — belum disahkan' }), [content, style, images, opr, site.settings.org_name])

  const finish = async () => {
    const o = await persist()
    if (!o) return
    submit.mutate({ id: o.id }, { onSuccess: () => (toast.success(t('OPR dihantar untuk pengesahan.')), navigate('/workspace/e-opr')) })
  }

  // ----- Read-only view (submitted / approved / not the owner) ---------------------------------------
  if (!editable) {
    return (
      <div className="space-y-4">
        <Card><CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-h2 font-bold">{opr!.title}</h2><StatusBadge tone={OPR_STATUS_UI[opr!.status].tone}>{OPR_STATUS_UI[opr!.status].label}</StatusBadge></div>
          {opr!.reviewNote && <Notice tone="warning">{t('Catatan penyemak:')} {opr!.reviewNote}</Notice>}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void download('opr.pdf', { id: opr!.id })}><Download />{t('Muat turun PDF')}</Button>
            {canReview && <><Button onClick={() => setReview('approve')}><Check />{t('Sahkan')}</Button><Button variant="destructive" onClick={() => setReview('revise')}>{t('Minta pembetulan')}</Button></>}
          </div>
        </CardBody></Card>
        <A4Preview html={previewHtml} title={t('Pratonton A4')} />
        <ConfirmDialog open={review === 'approve'} title={t('Sahkan OPR ini?')} description={t('PDF akhir akan dijana, disimpan dalam e-Arkib dengan metadata, dan laporan dikunci daripada suntingan.')} confirmLabel={t('Sahkan')} pending={reviewMut.isPending} error={reviewMut.error?.message} onClose={() => (setReview(null), reviewMut.reset())} onConfirm={() => reviewMut.mutate({ id: opr!.id, decision: 'approve' }, { onSuccess: () => (toast.success(t('OPR disahkan dan diarkibkan.')), setReview(null)) })} />
        <ConfirmDialog open={review === 'revise'} title={t('Minta pembetulan')} reasonLabel={t('Catatan untuk penyedia')} confirmLabel={t('Hantar catatan')} pending={reviewMut.isPending} error={reviewMut.error?.message} onClose={() => (setReview(null), reviewMut.reset())} onConfirm={(note) => reviewMut.mutate({ id: opr!.id, decision: 'revise', note }, { onSuccess: () => (toast.success(t('Dikembalikan untuk pembetulan.')), setReview(null)) })} />
      </div>
    )
  }

  // ----- Wizard ---------------------------------------------------------------------------------------
  const last = step === STEPS.length - 1
  return (
    <div className="space-y-5">
      {restored && <Notice tone="info">{t('Draf yang belum disimpan telah dipulihkan daripada peranti ini.')}</Notice>}
      {opr?.reviewNote && <Notice tone="warning">{t('Catatan penyemak:')} {opr.reviewNote}</Notice>}
      <ol className="flex gap-1 overflow-x-auto" aria-label={t('Langkah')}>
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => setStep(i)} aria-current={step === i ? 'step' : undefined} className={cn('whitespace-nowrap rounded-full border px-3 py-1 text-caption font-medium', step === i ? 'border-navy bg-navy text-white' : i < step ? 'border-blue/40 bg-blue-100 text-link' : 'border-line bg-paper text-slate')}>
              {String(i + 1).padStart(2, '0')} {s}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card><CardBody className="space-y-4">
          {step === 0 && <><FormField label={t('Nama program')} required {...text('programName')} /><FormField label={t('Penganjur')} {...text('organiser')} /><div className="grid gap-4 sm:grid-cols-2"><FormField label={t('Tarikh')} type="date" required value={content.date} onChange={(e) => set('date', e.target.value)} /><FormField label={t('Masa')} {...text('time')} placeholder={t('cth. 8.00 pagi – 1.00 petang')} /></div><FormField label={t('Tempat')} required {...text('venue')} /></>}
          {step === 1 && <><TextAreaField label={t('Latar belakang')} rows={5} {...text('background')} /><TextAreaField label={t('Objektif')} rows={4} required {...text('objectives')} /></>}
          {step === 2 && <><TextAreaField label={t('Ringkasan pelaksanaan')} rows={6} required {...text('execution')} hint={t('Aktiviti utama dan kaedah.')} /><TextAreaField label={t('Pihak terlibat')} rows={2} {...text('parties')} /></>}
          {step === 3 && <div className="grid gap-4 sm:grid-cols-2"><FormField label={t('Bilangan peserta')} inputMode="numeric" {...text('participantCount')} /><FormField label={t('Kumpulan sasaran')} {...text('targetGroup')} /></div>}
          {step === 4 && <><TextAreaField label={t('Hasil / pencapaian')} rows={5} required {...text('outcome')} /><TextAreaField label={t('Impak')} rows={3} {...text('impact')} /></>}
          {step === 5 && (
            <>
              <p className="text-caption text-slate">{t('2–4 gambar (JPG/PNG/WebP). Gambar dikecilkan dan dipotong 4:3 secara automatik sebelum dimuat naik.')}</p>
              <label className={cn('flex cursor-pointer items-center justify-center gap-2 rounded-input border border-dashed border-blue/50 bg-blue-100/40 p-4 text-caption font-semibold text-link', (busy || content.images.length >= 4) && 'pointer-events-none opacity-50')}>
                <ImagePlus className="size-4" aria-hidden />
                {busy ? t('Memproses…') : content.images.length >= 4 ? t('Had 4 gambar dicapai') : t('Tambah gambar')}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { void addImages(e.target.files); e.target.value = '' }} />
              </label>
              <ul className="grid gap-3 sm:grid-cols-2">
                {content.images.map((im, i) => (
                  <li key={im.fileId} className="space-y-2 rounded-input border border-line p-2">
                    {images[im.fileId] ? <img src={images[im.fileId]} alt={im.caption || t('Gambar {v1}', { v1: i + 1 })} className="aspect-[4/3] w-full rounded object-cover" /> : <div className="aspect-[4/3] animate-pulse rounded bg-slate-100" />}
                    <FormField label={t('Kapsyen')} value={im.caption} maxLength={120} onChange={(e) => set('images', content.images.map((x, k) => (k === i ? { ...x, caption: e.target.value } : x)))} />
                    <FormField label={t('Kredit')} value={im.credit} maxLength={80} onChange={(e) => set('images', content.images.map((x, k) => (k === i ? { ...x, credit: e.target.value } : x)))} />
                    <Button size="sm" variant="tertiary" onClick={() => set('images', content.images.filter((_, k) => k !== i))}><Trash2 />{t('Buang')}</Button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {step === 6 && <><TextAreaField label={t('Kekuatan')} rows={3} {...text('strengths')} /><TextAreaField label={t('Isu / cabaran')} rows={3} {...text('issues')} /><TextAreaField label={t('Cadangan penambahbaikan')} rows={3} {...text('suggestions')} /><FormField label={t('Disediakan oleh')} required {...text('preparedBy')} /></>}
          {step === 7 && (
            <>
              <SelectField label={t('Gaya')} value={style} onChange={(e) => { dirty.current = true; setStyle(e.target.value as OprStyle) }}>{OPR_STYLES.map((s) => <option key={s} value={s}>{STYLE_LABEL[s]}</option>)}</SelectField>
              <p className="text-caption text-slate">{t('Semak pratonton A4 di sebelah. Pastikan semua isi muat dalam satu halaman dan tiada teks terpotong.')}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={async () => { const o = await persist(); if (o) void download('opr.pdf', { id: o.id }) }}><Download />{t('PDF draf')}</Button>
                <Button loading={submit.isPending || save.isPending} onClick={() => void finish()}><Check />{t('Hantar untuk pengesahan')}</Button>
              </div>
            </>
          )}
          <p className={cn('text-micro tabular', used > limit * 0.9 ? 'text-amber' : 'text-slate')} aria-live="polite">{content.images.length ? t('Panjang kandungan: {used}/{limit} aksara (had satu halaman dengan gambar)', { used, limit }) : t('Panjang kandungan: {used}/{limit} aksara (had satu halaman, lebih rendah jika anda menambah gambar)', { used, limit })}</p>
          {used > limit && <Notice>{t('Kandungan melebihi had satu halaman. Ringkaskan sebelum menyimpan.')}</Notice>}
          {(error || save.error || submit.error) && <Notice>{error ?? save.error?.message ?? submit.error?.message}</Notice>}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
            <Button variant="secondary" onClick={() => setStep(step - 1)} disabled={step === 0}><ArrowLeft />{t('Sebelum')}</Button>
            <Button variant="tertiary" onClick={() => void saveDraft()} loading={save.isPending}>{t('Simpan draf')}</Button>
            {!last && <Button onClick={() => setStep(step + 1)}>{t('Seterusnya')}<ArrowRight /></Button>}
          </div>
        </CardBody></Card>
        <div className={cn(step === 7 ? 'block' : 'hidden xl:block')}><A4Preview html={previewHtml} title={t('Pratonton A4')} /></div>
      </div>
    </div>
  )
}
