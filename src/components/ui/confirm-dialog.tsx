import { useState } from 'react'
import { Button } from './button'
import { Dialog } from './dialog'
import { Notice, TextAreaField } from './form-field'
import { t } from '@/i18n'

/** Confirmation for consequential actions; optionally demands a written reason (rejections, voids, cancellations). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  reasonLabel,
  minReason = 5,
  pending = false,
  error,
  suggestions = [],
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description?: React.ReactNode
  confirmLabel: string
  destructive?: boolean
  reasonLabel?: string
  minReason?: number
  pending?: boolean
  error?: string
  /** One-click canned replies (Tetapan → Jawapan sedia). */
  suggestions?: string[]
  onConfirm: (reason: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const tooShort = Boolean(reasonLabel) && reason.trim().length < minReason
  const close = () => {
    setReason('')
    setTouched(false)
    onClose()
  }
  return (
    <Dialog
      open={open}
      onClose={close}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={pending}>
            {t('Batal')}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            loading={pending}
            onClick={() => {
              setTouched(true)
              if (!tooShort) onConfirm(reason.trim())
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {reasonLabel && suggestions.length > 0 && (
          <div>
            <p className="mb-1.5 text-micro font-semibold uppercase tracking-wide text-slate">{t('Jawapan sedia')}</p>
            <ul className="flex flex-wrap gap-1.5">
              {suggestions.map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => setReason(t.slice(0, 500))}
                    className="max-w-full truncate rounded-full border border-line bg-paper px-3 py-1 text-caption text-ink hover:border-blue hover:text-link"
                    title={t}
                  >
                    {t}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {reasonLabel && (
          <TextAreaField
            label={reasonLabel}
            rows={3}
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            error={touched && tooShort ? t('Sekurang-kurangnya {minReason} aksara.', { minReason: minReason }) : undefined}
            required
          />
        )}
        {error && <Notice>{error}</Notice>}
      </div>
    </Dialog>
  )
}
