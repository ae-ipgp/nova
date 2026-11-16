import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function FormField({
  label,
  hint,
  error,
  required,
  className,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-caption font-medium text-ink">
        {label} {required && <span className="text-red" aria-hidden>*</span>}
      </label>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined}
        className={cn(
          'h-11 w-full rounded-input border bg-paper px-3 text-body text-ink placeholder:text-slate/70 focus:outline-none focus:ring-2 disabled:bg-ice disabled:text-slate',
          error ? 'border-red focus:ring-red/20' : 'border-line focus:border-blue focus:ring-blue/20',
        )}
        {...input}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1 text-micro text-slate">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-micro text-red">
          {error}
        </p>
      )}
    </div>
  )
}
