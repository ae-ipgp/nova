import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Eyebrow } from '@/components/ui/eyebrow'

/**
 * Shell for public portal sub-pages. Content arrives in Phase 4 and must come
 * only from approved/published records (Blueprint §08E, §11).
 */
export function PublicPage({
  eyebrow,
  title,
  description,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  emptyIcon: LucideIcon
  emptyTitle: string
  emptyDescription: string
  children?: React.ReactNode
}) {
  return (
    <>
      <section className="border-b border-line bg-ice">
        <div className="container-content py-14 md:py-20">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-3 text-h1 font-extrabold">{title}</h1>
          <p className="mt-3 max-w-2xl text-body-lg text-slate">{description}</p>
        </div>
      </section>
      <section className="container-content py-12">
        {children ?? (
          <Card>
            <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} className="py-16" />
          </Card>
        )}
      </section>
    </>
  )
}
