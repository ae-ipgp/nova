import { useBrand } from '@/lib/brand'
import { cn } from '@/lib/cn'

export const LOGO_MAIN = '/brand/logo-main.png'
export const LOGO_FULL = '/brand/logo-full.png'
const LOGO_ALT = 'NoVA — Notion of Virtual Assistance'

/** NoVA mark. Shows the logo SUAK uploaded in Tetapan → Jenama, otherwise the official NoVA logo. It sits on a white tile so it stays readable in every theme. */
export function Monogram({ className }: { className?: string; inverse?: boolean }) {
  const { logo } = useBrand()
  return (
    <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl bg-white p-1 shadow-soft ring-1 ring-line', className)}>
      <img src={logo ?? LOGO_MAIN} alt="" className="max-h-full max-w-full object-contain" draggable={false} />
    </span>
  )
}

/** Mark + wordmark. The descriptor is the official name and is not translated. */
export function Logo({ className, inverse = false, showDescriptor = true }: { className?: string; inverse?: boolean; showDescriptor?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <Monogram />
      <span className="flex flex-col leading-none">
        <span className={cn('font-display text-[1.25rem] font-extrabold tracking-tight', inverse ? 'text-white' : 'text-heading')}>{'NoVA'}</span>
        {showDescriptor && (
          <span className={cn('mt-1 hidden text-[0.5625rem] font-semibold uppercase tracking-[0.14em] min-[470px]:block sm:text-[0.625rem]', inverse ? 'text-sky/75' : 'text-slate')}>{'Notion of Virtual Assistance'}</span>
        )}
      </span>
    </span>
  )
}

/** Expanded logo (mark + wordmark + name) for the footer, on a white plate so it works on the dark footer. */
export function FullLogo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-block rounded-2xl bg-white p-3 shadow-soft', className)}>
      <img src={LOGO_FULL} alt={LOGO_ALT} className="h-auto w-56 max-w-full" draggable={false} />
    </span>
  )
}
