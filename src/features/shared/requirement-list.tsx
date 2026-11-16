import type { Requirement } from '@/config/modules'
import { cn } from '@/lib/cn'

const PRIORITY_CLASS: Record<Requirement['priority'], string> = {
  P0: 'bg-navy text-white',
  P1: 'bg-blue-100 text-blue',
  P2: 'bg-slate-100 text-slate',
}

export function RequirementList({ requirements }: { requirements: readonly Requirement[] }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-caption">
        <thead>
          <tr className="border-b border-line text-micro uppercase tracking-wide text-slate">
            <th scope="col" className="px-5 py-3 font-semibold">ID</th>
            <th scope="col" className="px-5 py-3 font-semibold">Keperluan fungsian</th>
            <th scope="col" className="px-5 py-3 font-semibold">Keutamaan</th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0">
              <td className="px-5 py-3 font-mono text-micro whitespace-nowrap text-navy">{r.id}</td>
              <td className="px-5 py-3 text-ink">{r.text}</td>
              <td className="px-5 py-3">
                <span className={cn('rounded px-1.5 py-0.5 font-mono text-micro font-semibold', PRIORITY_CLASS[r.priority])}>{r.priority}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
