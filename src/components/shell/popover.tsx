import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Small dismissible popover (outside click / Escape). Trigger is rendered by the caller. */
export function Popover({
  trigger,
  children,
  align = 'right',
  panelClassName,
  label,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  panelClassName?: string
  label: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div role="dialog" aria-label={label} className={cn('absolute top-full z-50 mt-2 rounded-card border border-line bg-paper p-2 shadow-float', align === 'right' ? 'right-0' : 'left-0', panelClassName)}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
