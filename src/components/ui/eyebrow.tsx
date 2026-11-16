import { cn } from '@/lib/cn'

/** Small uppercase label used above headings, e.g. "02 / PRODUCT SCOPE". */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('font-mono text-micro font-medium uppercase tracking-[0.14em] text-blue', className)}>
      {children}
    </p>
  )
}
