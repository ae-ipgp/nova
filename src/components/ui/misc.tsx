import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { t } from '@/i18n'
import { cn } from '@/lib/cn'

export function SearchBox({ value, onChange, placeholder = 'Cari…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <label className={cn('relative block w-full sm:max-w-xs', className)}>
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate" aria-hidden />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10 w-full rounded-input border border-line bg-paper pr-3 pl-9 text-body focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none" />
    </label>
  )
}

/** Horizontally scrollable table wrapper that never widens the page on phones. */
export function TableShell({ children, minWidth = '40rem' }: { children: ReactNode; minWidth?: string }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-left text-caption" style={{ minWidth }}>
        {children}
      </table>
    </div>
  )
}

export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <th scope="col" className={cn('bg-ice px-4 py-3 text-micro font-semibold uppercase tracking-wide text-slate', className)}>
    {children}
  </th>
)
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cn('border-t border-line px-4 py-3 align-top', className)}>{children}</td>

export function DetailList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-micro font-semibold uppercase tracking-wide text-slate">{t(k)}</dt>
          <dd className="mt-0.5 break-words text-body text-ink">{v || <span className="text-slate">—</span>}</dd>
        </div>
      ))}
    </dl>
  )
}

export function FilterChips<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('rounded-full border px-3 py-1 text-caption font-medium transition-colors', value === o.value ? 'border-navy bg-navy text-white' : 'border-line bg-paper text-slate hover:border-blue hover:text-link')}
        >
          {t(o.label)}
        </button>
      ))}
    </div>
  )
}
