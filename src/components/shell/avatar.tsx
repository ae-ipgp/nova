import { useState } from 'react'
import { cn } from '@/lib/cn'

// oxlint-disable-next-line react/only-export-components
export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?'
  )
}

/** The person's Google photo when there is one, initials otherwise (also if the photo fails to load). */
export function Avatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className={cn('grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-blue font-display text-caption font-bold text-white ring-2 ring-white/40', className)}>
      {src && !failed ? <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="size-full object-cover" draggable={false} /> : initials(name)}
    </span>
  )
}
