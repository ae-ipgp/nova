import type { UseQueryResult } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MascotPose } from '@/config/mascot'
import { Button } from './button'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'
import { t } from '@/i18n'

/** One consistent loading / error / empty treatment for every list (Blueprint §04, Definition of Done). */
export function QueryState<T>({
  query,
  isEmpty,
  empty,
  children,
  rows = 3,
}: {
  query: UseQueryResult<T>
  isEmpty?: (data: T) => boolean
  empty: { icon?: LucideIcon; pose?: MascotPose; title: string; description?: ReactNode; action?: ReactNode }
  children: (data: T) => ReactNode
  rows?: number
}) {
  if (query.isPending) {
    return (
      <div className="space-y-3 p-5" aria-busy="true" aria-label={t('Memuatkan')}>
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }
  if (query.isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t('Data tidak dapat dimuatkan')}
        description={query.error instanceof Error ? query.error.message : undefined}
        action={
          <Button variant="secondary" onClick={() => void query.refetch()}>
            {t('Cuba lagi')}
          </Button>
        }
      />
    )
  }
  const data = query.data as T
  if (isEmpty ? isEmpty(data) : Array.isArray(data) && data.length === 0) return <EmptyState {...empty} />
  return <>{children(data)}</>
}
