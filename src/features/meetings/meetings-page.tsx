import { CalendarDays, MapPin, Plus, Video } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MEETING_TYPES } from '@shared/domain'
import { useAuth } from '@/app/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MeetingFormDialog } from './meeting-form'
import { FilterChips } from '@/components/ui/misc'
import { QueryState } from '@/components/ui/query-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { useGatewayQuery } from '@/hooks/use-gateway'
import { formatDateTime } from '@/lib/format'

type When = 'upcoming' | 'past' | 'all'

export function MeetingsPage() {
  const { roles } = useAuth()
  const staff = roles.includes('suak') || roles.includes('secretariat')
  const [when, setWhen] = useState<When>('upcoming')
  const [creating, setCreating] = useState(false)
  const q = useGatewayQuery('mtg.list', {})
  const [now] = useState(() => Date.now())

  const rows = useMemo(() => {
    const all = q.data ?? []
    const list = all.filter((m) => (when === 'all' ? true : when === 'upcoming' ? Date.parse(m.endsAt) >= now && m.status !== 'cancelled' : Date.parse(m.endsAt) < now || m.status === 'cancelled'))
    return when === 'upcoming' ? [...list].reverse() : list
  }, [q.data, when, now])

  return (
    <section aria-labelledby="mtg-h" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="mtg-h" className="sr-only">
          Senarai mesyuarat
        </h2>
        <FilterChips label="Masa" value={when} onChange={setWhen} options={[{ value: 'upcoming', label: 'Akan datang' }, { value: 'past', label: 'Lepas' }, { value: 'all', label: 'Semua' }]} />
        {staff && (
          <Button onClick={() => setCreating(true)}>
            <Plus />
            Mesyuarat baharu
          </Button>
        )}
      </div>
      <Card className="overflow-hidden">
        <QueryState query={q} isEmpty={() => rows.length === 0} empty={{ icon: CalendarDays, pose: 'calendar', title: when === 'upcoming' ? 'Tiada mesyuarat akan datang' : 'Tiada mesyuarat', description: staff ? 'Cipta mesyuarat untuk menjemput ahli dan merekod kehadiran.' : 'Mesyuarat yang anda dijemput akan dipaparkan di sini.' }}>
          {() => (
            <ul className="divide-y divide-line">
              {rows.map((m) => (
                <li key={m.id}>
                  <Link to={m.id} className="flex flex-col gap-2 px-5 py-4 hover:bg-ice sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy">{m.title}</p>
                      <p className="mt-0.5 text-caption text-slate">
                        {m.meetingType} · {formatDateTime(m.startsAt)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-caption text-slate">
                        {m.link && !m.location ? <Video className="size-3.5" aria-hidden /> : <MapPin className="size-3.5" aria-hidden />}
                        {m.location || 'Atas talian'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {m.status === 'cancelled' && <StatusBadge tone="rejected">Dibatalkan</StatusBadge>}
                      {m.published && <StatusBadge tone="issued">Diterbitkan</StatusBadge>}
                      {staff && m.inviteeCount > 0 && <StatusBadge tone={m.verifiedCount === m.inviteeCount ? 'approved' : 'pending'}>{m.verifiedCount}/{m.inviteeCount} disahkan</StatusBadge>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </Card>
      <p className="text-micro text-slate">Jenis: {MEETING_TYPES.join(' · ')} · Keperluan: MTG-01 – MTG-10</p>
      {creating && <MeetingFormDialog onClose={() => setCreating(false)} />}
    </section>
  )
}
