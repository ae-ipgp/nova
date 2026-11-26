import type { UseQueryResult } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { QueryState } from '@/components/ui/query-state'
import { EmptyState } from '@/components/ui/empty-state'
import type { MascotPose } from '@/config/mascot'
import { isApiConfigured } from '@/lib/env'
import { t } from '@/i18n'

/** Loading / error / empty for public data; explains when the data server is not configured. */
export function PublicState<T>({ query, empty, children, isEmpty }: { query: UseQueryResult<T>; empty: { icon?: LucideIcon; pose?: MascotPose; title: string; description?: ReactNode }; children: (data: T) => ReactNode; isEmpty?: (d: T) => boolean }) {
  if (!isApiConfigured) return <EmptyState pose="construction" title={t('Data awam belum tersedia')} description={t('Pelayan data belum dikonfigurasi pada tapak ini.')} className="py-14" />
  return (
    <QueryState query={query} empty={empty} isEmpty={isEmpty}>
      {children}
    </QueryState>
  )
}
