import { Download, ScrollText } from 'lucide-react'
import { useState } from 'react'
import { toCsv } from '@shared/csv'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FilterChips, TableShell, Td, Th } from '@/components/ui/misc'
import { QueryState } from '@/components/ui/query-state'
import { useGatewayQuery } from '@/hooks/use-gateway'
import { saveText } from '@/lib/files'
import { describeAction } from '@/lib/audit-labels'
import { formatDateTime } from '@/lib/format'

const FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'ref.', label: 'Nombor rujukan' },
  { value: 'meeting.', label: 'Mesyuarat' },
  { value: 'attendance.', label: 'Kehadiran' },
  { value: 'notice.', label: 'NoMe' },
  { value: 'archive.', label: 'Arkib' },
  { value: 'role.', label: 'Peranan' },
  { value: 'profile.', label: 'Akaun' },
  { value: 'settings.', label: 'Tetapan' },
]

export function AuditPage() {
  const [action, setAction] = useState('')
  const q = useGatewayQuery('admin.audit.list', { action: action || undefined, limit: 300 }, { placeholderData: (p) => p })
  return (
    <section aria-labelledby="aud-h" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 id="aud-h" className="text-h3 font-bold">Log audit</h2><p className="mt-1 max-w-2xl text-caption text-slate">Rekod tambah-sahaja bagi tindakan kritikal: pelaku, masa, objek dan perubahan. Tidak boleh disunting atau dipadam.</p></div>
        <Button variant="secondary" disabled={!q.data?.length} onClick={() => saveText('log-audit.csv', 'text/csv', toCsv(['Masa', 'Pelaku', 'Tindakan', 'Jenis', 'ID', 'Sebelum', 'Selepas'], (q.data ?? []).map((a) => [a.at, a.actor, a.action, a.entityType, a.entityId, a.before, a.after])))}><Download />CSV</Button>
      </div>
      <FilterChips label="Tapis tindakan" value={action} onChange={setAction} options={FILTERS} />
      <Card className="overflow-hidden">
        <QueryState query={q} empty={{ icon: ScrollText, title: 'Tiada rekod', description: 'Tindakan kritikal akan direkodkan di sini.' }}>
          {(rows) => (
            <TableShell minWidth="52rem">
              <thead><tr><Th>Masa</Th><Th>Pelaku</Th><Th>Tindakan</Th><Th>Perubahan</Th></tr></thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <Td className="whitespace-nowrap font-mono text-micro">{formatDateTime(a.at)}</Td>
                    <Td>{a.actor}</Td>
                    <Td><span className="font-semibold text-navy">{describeAction(a.action)}</span><p className="font-mono text-micro text-slate">{a.action} · {a.entityType} · {a.entityId.slice(0, 12)}</p></Td>
                    <Td className="max-w-sm break-words font-mono text-micro text-slate">{a.before && <p>− {a.before}</p>}{a.after && <p>+ {a.after}</p>}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </QueryState>
      </Card>
    </section>
  )
}
