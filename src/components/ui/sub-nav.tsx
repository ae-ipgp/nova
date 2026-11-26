import { NavLink } from 'react-router-dom'
import { t } from '@/i18n'
import { cn } from '@/lib/cn'

/** Section tabs inside a module (routes, not local state, so links and back-button work). */
export function SubNav({ items, label }: { items: { to: string; label: string; end?: boolean; active?: boolean }[]; label: string }) {
  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line">
      {items.map((tt) => (
        <NavLink
          key={tt.to}
          to={tt.to}
          end={tt.end}
          className={({ isActive }) => cn('-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-caption font-semibold transition-colors', (tt.active ?? isActive) ? 'border-blue text-link' : 'border-transparent text-slate hover:text-heading')}
        >
          {t(tt.label)}
        </NavLink>
      ))}
    </nav>
  )
}
