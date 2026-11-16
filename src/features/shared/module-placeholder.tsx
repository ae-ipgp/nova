import { Construction } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import type { ModuleDefinition } from '@/config/modules'
import { RequirementList } from './requirement-list'

/**
 * Honest placeholder for a module that is planned but not yet built.
 * Shows scope and requirement IDs so reviewers can trace what is coming.
 */
export function ModulePlaceholder({ module }: { module: ModuleDefinition }) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={`${module.code} · Fasa ${module.phase}`} title={module.name} description={module.summary} />

      <Card>
        <EmptyState
          icon={Construction}
          title={`Modul ini akan dibina dalam Fasa ${module.phase}`}
          description="Struktur laluan dan navigasi telah disediakan. Fungsi, data dan kawalan akses belum dilaksanakan."
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keperluan yang dirancang</CardTitle>
          <StatusBadge tone="draft">Belum dilaksana</StatusBadge>
        </CardHeader>
        <RequirementList requirements={module.requirements} />
      </Card>
    </div>
  )
}
