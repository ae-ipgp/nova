import { useState } from 'react'
import { NOTIFY_KINDS, NOTIFY_LABELS, type NotifyKind } from '@shared/domain'
import { useAuth } from '@/app/auth-context'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useGatewayMutation } from '@/hooks/use-gateway'
import { t } from '@/i18n'

/** "Pilihan e-mel": switch individual system emails off. Security notices cannot be switched off. */
export function EmailPrefsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useAuth()
  const initial = state.status === 'signed_in' ? state.me.notifyOff : []
  return open ? <Inner initial={initial} onClose={onClose} /> : null
}

function Inner({ initial, onClose }: { initial: NotifyKind[]; onClose: () => void }) {
  const [off, setOff] = useState<Set<NotifyKind>>(new Set(initial))
  const save = useGatewayMutation('me.prefs.set', [])
  const toast = useToast()
  const toggle = (k: NotifyKind) =>
    setOff((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  return (
    <Dialog
      open
      onClose={onClose}
      title={t('Pilihan e-mel')}
      description={t('Pilih makluman e-mel sistem yang anda mahu terima. Notis keselamatan (contohnya akses anda diubah) sentiasa dihantar.')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('Batal')}
          </Button>
          <Button
            loading={save.isPending}
            onClick={() =>
              save.mutate(
                { notifyOff: [...off] },
                {
                  onSuccess: () => {
                    toast.success(t('Pilihan e-mel disimpan.'))
                    onClose()
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            {t('Simpan')}
          </Button>
        </>
      }
    >
      <ul className="space-y-1">
        {NOTIFY_KINDS.map((k) => (
          <li key={k}>
            <label className="flex cursor-pointer items-start gap-3 rounded-input px-2 py-2 hover:bg-soft">
              <input type="checkbox" className="mt-1 size-4 accent-blue" checked={!off.has(k)} onChange={() => toggle(k)} />
              <span className="text-body text-ink">{t(NOTIFY_LABELS[k])}</span>
            </label>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
