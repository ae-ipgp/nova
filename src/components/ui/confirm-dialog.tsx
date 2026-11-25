import { useState } from 'react'
import { Button } from './button'
import { Dialog } from './dialog'
import { Notice, TextAreaField } from './form-field'

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
            Batal
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
        {reasonLabel && (
          <TextAreaField
            label={reasonLabel}
            rows={3}
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            error={touched && tooShort ? `Sekurang-kurangnya ${minReason} aksara.` : undefined}
            required
          />
        )}
        {error && <Notice>{error}</Notice>}
      </div>
    </Dialog>
  )
}
