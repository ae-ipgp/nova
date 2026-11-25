import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

const CONTROL =
  'w-full rounded-input border bg-paper px-3 text-body text-ink placeholder:text-slate/70 focus:outline-none focus:ring-2 disabled:bg-ice disabled:text-slate'
const tone = (error?: string) => (error ? 'border-red focus:ring-red/20' : 'border-line focus:border-blue focus:ring-blue/20')

function Wrapper({ id, label, hint, error, required, className, children }: { id: string; label: string; hint?: string; error?: string; required?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-caption font-medium text-ink">
        {label} {required && <span className="text-red" aria-hidden>*</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-micro text-slate">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-micro text-red">
          {error}
        </p>
      )}
    </div>
  )
}

const describedBy = (id: string, hint?: string, error?: string) => [hint && !error && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined

type Common = { label: string; hint?: string; error?: string }

export function FormField({ label, hint, error, required, className, ...input }: InputHTMLAttributes<HTMLInputElement> & Common) {
  const id = useId()
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <input id={id} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} className={cn(CONTROL, 'h-11', tone(error))} {...input} />
    </Wrapper>
  )
}

export function TextAreaField({ label, hint, error, required, className, rows = 4, ...input }: TextareaHTMLAttributes<HTMLTextAreaElement> & Common) {
  const id = useId()
  const len = typeof input.value === 'string' ? input.value.length : undefined
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea id={id} rows={rows} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} className={cn(CONTROL, 'py-2 leading-relaxed', tone(error))} {...input} />
      {input.maxLength && len !== undefined && (
        <p className={cn('mt-1 text-right text-micro tabular', len > input.maxLength * 0.95 ? 'text-amber' : 'text-slate')} aria-hidden>
          {len}/{input.maxLength}
        </p>
      )}
    </Wrapper>
  )
}

export function SelectField({ label, hint, error, required, className, children, ...input }: SelectHTMLAttributes<HTMLSelectElement> & Common) {
  const id = useId()
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <select id={id} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} className={cn(CONTROL, 'h-11', tone(error))} {...input}>
        {children}
      </select>
    </Wrapper>
  )
}

export function Notice({ tone: t = 'error', children, className }: { tone?: 'error' | 'info' | 'warning'; children: ReactNode; className?: string }) {
  const cls = { error: 'border-red/30 bg-red-100 text-red', info: 'border-blue/20 bg-blue-100 text-navy', warning: 'border-amber/30 bg-amber-100/70 text-ink' }[t]
  return (
    <p role={t === 'error' ? 'alert' : 'note'} className={cn('rounded-input border p-3 text-caption', cls, className)}>
      {children}
    </p>
  )
}
