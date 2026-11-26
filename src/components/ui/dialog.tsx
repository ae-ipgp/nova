import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { t } from '@/i18n'

/**
 * Accessible modal: labelled, closes on Escape and backdrop click, moves focus
 * in on open and back to the trigger on close, keeps Tab inside.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}) {
  const panel = useRef<HTMLDivElement>(null)
  // Latest onClose without re-running the open effect (which would steal focus on every render).
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const node = panel.current
    const focusable = () =>
      Array.from(node?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter(
        (el) => !el.hasAttribute('disabled'),
      )
    ;(focusable()[1] ?? focusable()[0] ?? node)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      } else if (e.key === 'Tab') {
        const items = focusable()
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button type="button" aria-label={t('Tutup')} tabIndex={-1} className="absolute inset-0 bg-navy-900/50" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[90dvh] w-full flex-col rounded-t-card bg-paper shadow-float sm:rounded-card',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="text-h3 font-bold">
              {title}
            </h2>
            {description && (
              <div id={descId} className="mt-1 text-caption text-slate">
                {description}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-input text-slate hover:bg-ice hover:text-heading" aria-label={t('Tutup dialog')}>
            <X className="size-4" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">{footer}</footer>}
      </div>
    </div>
  )
}
