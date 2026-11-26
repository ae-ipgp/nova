import { Download, Percent } from 'lucide-react'
import { toCsv } from '@shared/csv'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TableShell, Td, Th } from '@/components/ui/misc'
import { QueryState } from '@/components/ui/query-state'
import { useGatewayQuery } from '@/hooks/use-gateway'
import { saveText } from '@/lib/files'
import { t } from '@/i18n'

export function AttendanceSummaryPage() {
  const q = useGatewayQuery('mtg.summary', {})
  return (
    <section aria-labelledby="sum-h" className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="sum-h" className="text-h3 font-bold">
            {t('Ringkasan kehadiran sesi aktif')}
          </h2>
          <p className="mt-1 max-w-2xl text-caption text-slate">
            {t('Peratus = (hadir + lewat jika dikira) ÷ mesyuarat yang layak dihadiri. Ahli yang dikecualikan dan kehadiran yang belum direkod tidak masuk dalam penyebut. Bersebab dan tanpa sebab dipaparkan berasingan dan tidak digabungkan.')}
          </p>
        </div>
        <Button variant="secondary" disabled={!q.data?.length} onClick={() => saveText('ringkasan-kehadiran.csv', 'text/csv', toCsv(['Nama', 'Jawatan', 'Biro', 'Hadir', 'Lewat', 'Bersebab', 'Tanpa sebab', 'Dikecualikan', 'Belum direkod', 'Layak', 'Peratus'], (q.data ?? []).map((r) => [r.name, r.position, r.bureau, r.present, r.late, r.excused, r.absent, r.exempted, r.pending, r.eligible, r.percent ?? ''])))}>
          <Download />
          {'CSV'}
        </Button>
      </div>
      <Card className="overflow-hidden">
        <QueryState query={q} empty={{ icon: Percent, title: t('Tiada data kehadiran'), description: t('Ringkasan muncul selepas kehadiran direkod.') }}>
          {(rows) => (
            <TableShell minWidth="52rem">
              <thead>
                <tr>
                  <Th>{t('Ahli')}</Th>
                  <Th className="text-right">{t('Hadir')}</Th>
                  <Th className="text-right">{t('Lewat')}</Th>
                  <Th className="text-right">{t('Bersebab')}</Th>
                  <Th className="text-right">{t('Tanpa sebab')}</Th>
                  <Th className="text-right">{t('Kecuali')}</Th>
                  <Th className="text-right">{t('Layak')}</Th>
                  <Th className="text-right">%</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.memberId}>
                    <Td>
                      <p className="font-semibold text-heading">{r.name}</p>
                      <p className="text-micro text-slate">{[r.position, r.bureau].filter(Boolean).join(' · ')}</p>
                    </Td>
                    {[r.present, r.late, r.excused, r.absent, r.exempted, r.eligible].map((n, i) => (
                      <Td key={i} className="text-right tabular">
                        {n}
                      </Td>
                    ))}
                    <Td className="text-right font-semibold tabular text-heading">{r.percent === null ? '—' : `${r.percent}%`}</Td>
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
