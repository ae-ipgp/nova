import type { LucideIcon } from 'lucide-react'
import { Mascot } from '@/components/brand/mascot'
import type { MascotPose } from '@/config/mascot'
import { cn } from '@/lib/cn'

/** Explains why something is empty and what happens next (Blueprint §04). */
export function EmptyState({
  icon: Icon,
  pose,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  /** Mascot pose; falls back to the icon until the image exists. */
  pose?: MascotPose
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      {(Icon || pose) && (
        <div className="mb-4">
          {(() => {
            const iconNode = Icon && (
              <div className="grid size-11 place-items-center rounded-full bg-sky text-blue">
                <Icon className="size-5" aria-hidden />
              </div>
            )
            return pose ? <Mascot pose={pose} size={112} fallback={iconNode} /> : iconNode
          })()}
        </div>
      )}
      <p className="font-display text-body-lg font-semibold text-navy">{title}</p>
      {description && <p className="mt-1 max-w-md text-caption text-slate">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
