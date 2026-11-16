import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'success' | 'error' | 'warning'
interface Toast {
  id: number
  tone: Tone
  message: string
}

const ToastContext = createContext<((tone: Tone, message: string) => void) | null>(null)

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle }
const TONES = { success: 'border-green/30 text-green', error: 'border-red/30 text-red', warning: 'border-amber/30 text-amber' }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const push = useCallback(
    (tone: Tone, message: string) => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t.slice(-2), { id, tone, message }])
      setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 4500)
    },
    [dismiss],
  )
  return (
    <ToastContext value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end" aria-live="polite" role="status">
        {toasts.map((t) => {
          const Icon = ICONS[t.tone]
          return (
            <div key={t.id} className={cn('pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border bg-paper p-4 shadow-float', TONES[t.tone])}>
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p className="flex-1 text-caption text-ink">{t.message}</p>
              <button type="button" onClick={() => dismiss(t.id)} className="text-slate hover:text-navy" aria-label="Tutup makluman">
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useToast() {
  const push = useContext(ToastContext)
  return useMemo(
    () => ({
      success: (m: string) => push?.('success', m),
      error: (m: string) => push?.('error', m),
      warning: (m: string) => push?.('warning', m),
    }),
    [push],
  )
}
