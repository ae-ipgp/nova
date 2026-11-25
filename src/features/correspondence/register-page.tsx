import { Download, ListOrdered } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toCsv } from '@shared/csv'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SearchBox, TableShell, Td, Th } from '@/components/ui/misc'
import { QueryState } from '@/components/ui/query-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { useGatewayQuery } from '@/hooks/use-gateway'
import { saveText } from '@/lib/files'
import { formatDateTime } from '@/lib/format'

export function RegisterPage() {
  const q = useGatewayQuery('ref.register', {})
  const [search, setSearch] = useState('')
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    return (q.data ?? []).filter((r) => !s || `${r.referenceNumber} ${r.subject} ${r.recipient} ${r.letterType}`.toLowerCase().includes(s))
  }, [q.data, search])

  return (
    <section aria-labelledby="reg-h" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="reg-h" className="sr-only">
          Daftar nombor rujukan
        </h2>
        <SearchBox value={search} onChange={setSearch} placeholder="Cari nombor, tajuk, penerima…" />
        <Button
          variant="secondary"
          disabled={!rows.length}
          onClick={() => saveText('daftar-nombor-rujukan.csv', 'text/csv', toCsv(['Nombor', 'Tajuk', 'Penerima', 'Jenis', 'Dikeluarkan', 'Oleh', 'Status', 'Sebab batal'], rows.map((r) => [r.referenceNumber, r.subject, r.recipient, r.letterType, r.issuedAt, r.issuedBy, r.voidedAt ? 'Dibatalkan' : 'Sah', r.voidReason])))}
        >
          <Download />
          Eksport CSV
        </Button>
      </div>
      <Card className="overflow-hidden">
        <QueryState query={q} isEmpty={() => rows.length === 0} empty={{ icon: ListOrdered, title: 'Belum ada nombor dikeluarkan', description: 'Nombor rasmi dipaparkan di sini selepas SUAK meluluskan permohonan.' }}>
          {() => (
            <TableShell minWidth="46rem">
              <thead>
                <tr>
                  <Th>Nombor rujukan</Th>
                  <Th>Tajuk / penerima</Th>
                  <Th>Dikeluarkan</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <Td className={`font-mono font-semibold ${r.voidedAt ? 'text-red line-through' : 'text-navy'}`}>{r.referenceNumber}</Td>
                    <Td>
                      <p className="font-semibold text-navy">{r.subject}</p>
                      <p className="text-slate">{r.recipient}</p>
                    </Td>
                    <Td className="whitespace-nowrap">
                      {formatDateTime(r.issuedAt)}
                      <p className="text-micro text-slate">{r.issuedBy}</p>
                    </Td>
                    <Td>
                      {r.voidedAt ? (
                        <>
                          <StatusBadge tone="rejected">Dibatalkan</StatusBadge>
                          <p className="mt-1 max-w-[14rem] text-micro text-slate">{r.voidReason}</p>
                        </>
                      ) : (
                        <StatusBadge tone="issued">Sah</StatusBadge>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </QueryState>
      </Card>
      <p className="text-micro text-slate">Keperluan: LTR-05 – LTR-07, LTR-09, LTR-10 · Daftar tidak boleh disunting; pembatalan hanya menambah status dan sebab.</p>
    </section>
  )
}
