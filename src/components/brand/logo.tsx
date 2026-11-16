import { cn } from '@/lib/cn'

/**
 * NO.VA monogram: a geometric "N" built from two pillars and a diagonal,
 * with an electric-blue node marking the "dot" in NO.VA.
 */
export function Monogram({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  const base = inverse ? '#ffffff' : '#102d4f'
  return (
    <svg viewBox="0 0 40 40" className={cn('size-8', className)} aria-hidden focusable="false">
      <rect width="40" height="40" rx="10" fill={inverse ? 'rgb(255 255 255 / 0.08)' : '#dcebfa'} />
      <path d="M11 29V11h4.2L25 23.6V11h4v18h-4.2L15 16.4V29z" fill={base} />
      <circle cx="31" cy="29" r="2.6" fill="#2c86d9" />
    </svg>
  )
}

export function Logo({
  className,
  inverse = false,
  showDescriptor = true,
}: {
  className?: string
  inverse?: boolean
  showDescriptor?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Monogram inverse={inverse} />
      <span className="flex flex-col leading-none">
        <span className={cn('font-display text-[1.0625rem] font-extrabold tracking-tight', inverse ? 'text-white' : 'text-navy')}>
          NO<span className={cn('mx-[0.03em]', inverse ? 'text-electric brightness-125' : 'text-electric')}>.</span>VA
        </span>
        {showDescriptor && (
          <span className={cn('mt-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.16em]', inverse ? 'text-sky/70' : 'text-slate')}>
            Digital Secretariat
          </span>
        )}
      </span>
    </span>
  )
}
