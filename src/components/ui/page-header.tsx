import { Eyebrow } from './eyebrow'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h1 className="text-h1 font-bold">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-body-lg text-slate">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  )
}
