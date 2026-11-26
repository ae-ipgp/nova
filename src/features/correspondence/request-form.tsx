import { useMemo, useState, type FormEvent } from 'react'
import type { RefRequestPayload, RefRequestView } from '@shared/api-contract'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { FormField, Notice, SelectField, TextAreaField } from '@/components/ui/form-field'
import { useToast } from '@/components/ui/toast'
import { useGatewayMutation, useGatewayQuery } from '@/hooks/use-gateway'
import { todayIso } from '@/lib/format'
import { t } from '@/i18n'

/** New / edit-draft permohonan nombor rujukan (LTR-01/02). Server issues the real number only after SUAK approves. */
export function RequestFormDialog({ open, onClose, draft }: { open: boolean; onClose: () => void; draft?: RefRequestView | null }) {
  const toast = useToast()
  const options = useGatewayQuery('ref.options', {}, { enabled: open })
  const save = useGatewayMutation('ref.request.save', ['ref.request.list', 'dashboard.summary'])
  const [letterType, setLetterType] = useState(draft?.letterType ?? '')
  const [subject, setSubject] = useState(draft?.subject ?? '')
  const [recipient, setRecipient] = useState(draft?.recipient ?? '')
  const [purpose, setPurpose] = useState(draft?.purpose ?? '')
  const [letterDate, setLetterDate] = useState(draft?.letterDate ?? todayIso())
  const [typeId, setTypeId] = useState(draft?.documentTypeId ?? '')
  const [fields, setFields] = useState<Record<string, string>>(draft?.fields ?? {})
  const [error, setError] = useState<string | null>(null)

  const type = useMemo(() => options.data?.types.find((t) => t.id === typeId), [options.data, typeId])

  const close = () => {
    setError(null)
    save.reset()
    onClose()
  }

  const submit = (send: boolean) => (e?: FormEvent) => {
    e?.preventDefault()
    if (!letterType || !subject.trim() || !recipient.trim() || !purpose.trim() || !letterDate) return setError(t('Lengkapkan semua medan wajib.'))
    if (type) for (const f of type.fields) if (f.required && !fields[f.key]?.trim()) return setError(t('{label} diperlukan.', { label: t(f.label) }))
    setError(null)
    const payload: RefRequestPayload = { id: draft?.id, letterType, subject, recipient, purpose, letterDate, documentTypeId: typeId || undefined, fields: type ? fields : undefined, submit: send }
    save.mutate(payload, { onSuccess: () => (toast.success(send ? 'Permohonan dihantar kepada SUAK.' : 'Draf disimpan.'), close()) })
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      size="lg"
      title={draft ? t('Sunting draf permohonan') : t('Permohonan nombor rujukan')}
      description={t('Anda akan menerima ID permohonan sementara. Nombor rasmi hanya dikeluarkan selepas SUAK meluluskan.')}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {t('Batal')}
          </Button>
          <Button variant="secondary" loading={save.isPending && !save.variables?.submit} onClick={() => submit(false)()}>
            {t('Simpan draf')}
          </Button>
          <Button loading={save.isPending && !!save.variables?.submit} onClick={() => submit(true)()}>
            {t('Hantar untuk kelulusan')}
          </Button>
        </>
      }
    >
      <form noValidate onSubmit={submit(true)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label={t('Jenis surat')} value={letterType} onChange={(e) => setLetterType(e.target.value)} required>
            <option value="">{t('Pilih…')}</option>
            {options.data?.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </SelectField>
          <FormField label={t('Tarikh surat')} type="date" value={letterDate} onChange={(e) => setLetterDate(e.target.value)} required />
        </div>
        <FormField label={t('Tajuk surat')} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required />
        <TextAreaField label={t('Penerima')} rows={2} hint={t('Nama dan jawatan/alamat penerima.')} value={recipient} onChange={(e) => setRecipient(e.target.value)} maxLength={300} required />
        <TextAreaField label={t('Tujuan')} rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={1000} required />

        <SelectField label={t('Jana dokumen (pilihan)')} hint={t('Pilih jenis dokumen untuk menjana PDF selepas kelulusan; biarkan kosong jika nombor rujukan sahaja.')} value={typeId} onChange={(e) => (setTypeId(e.target.value), setFields({}))}>
          <option value="">{t('Nombor rujukan sahaja')}</option>
          {options.data?.types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </SelectField>
        {type?.isDemo && <Notice tone="warning">{t('Templat ini ialah CONTOH dan belum diluluskan SUAK. PDF akan ditanda “bukan dokumen rasmi”.')}</Notice>}
        {type && (
          <div className="space-y-4 rounded-input border border-line bg-ice p-4">
            {type.fields.map((f) =>
              f.type === 'textarea' ? (
                <TextAreaField key={f.key} label={f.label} rows={3} required={f.required} value={fields[f.key] ?? ''} maxLength={f.max ?? 600} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} />
              ) : (
                <FormField key={f.key} label={f.label} type={f.type === 'date' ? 'date' : 'text'} required={f.required} value={fields[f.key] ?? ''} maxLength={f.max} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} />
              ),
            )}
          </div>
        )}
        {(error || save.error) && <Notice>{error ?? save.error?.message}</Notice>}
      </form>
    </Dialog>
  )
}
