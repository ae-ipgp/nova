import { t } from '@/i18n'
import { cn } from '@/lib/cn'
import type { StatusTone } from '@/types/domain'

const TONE_CLASSES: Record<StatusTone, string> = {
  draft: 'bg-slate-100 text-slate border-line',
  pending: 'bg-amber-100 text-amber border-amber/30',
  approved: 'bg-green-100 text-green border-green/30',
  rejected: 'bg-red-100 text-red border-red/30',
  issued: 'bg-blue-100 text-link border-blue/30',
  archived: 'bg-slate-100 text-slate border-line',
}

/**
 * Status chip. Always carries a text label — colour alone never conveys state
 * (Blueprint §04, accessibility).
 */
export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-micro font-semibold uppercase tracking-wide',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {typeof children === 'string' ? t(children) : children}
    </span>
  )
}
