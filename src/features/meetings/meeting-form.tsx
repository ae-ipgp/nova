import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MeetingView } from '@shared/api-contract'
import { MEETING_TYPES } from '@shared/domain'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { FormField, Notice, SelectField } from '@/components/ui/form-field'
import { useToast } from '@/components/ui/toast'
import { useGatewayMutation, useGatewayQuery } from '@/hooks/use-gateway'
import { fromLocalInput, toLocalInput } from '@/lib/format'
import { t } from '@/i18n'

export function MeetingFormDialog({ onClose, existing }: { onClose: () => void; existing?: MeetingView }) {
  const toast = useToast()
  const navigate = useNavigate()
  const members = useGatewayQuery('mtg.members', {})
  const save = useGatewayMutation('mtg.save', ['mtg.list', 'mtg.get', 'dashboard.summary'])
  const [title, setTitle] = useState(existing?.title ?? '')
  const [meetingType, setType] = useState<string>(existing?.meetingType ?? MEETING_TYPES[0])
  const [startsAt, setStarts] = useState(toLocalInput(existing?.startsAt ?? ''))
  const [endsAt, setEnds] = useState(toLocalInput(existing?.endsAt ?? ''))
  const [location, setLocation] = useState(existing?.location ?? '')
  const [link, setLink] = useState(existing?.link ?? '')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !startsAt || !endsAt) return setError(t('Lengkapkan tajuk, masa mula dan masa tamat.'))
    if (endsAt <= startsAt) return setError(t('Masa tamat mesti selepas masa mula.'))
    if (!location.trim() && !link.trim()) return setError(t('Nyatakan lokasi atau pautan.'))
    setError(null)
    save.mutate(
      { id: existing?.id, title, meetingType, startsAt: fromLocalInput(startsAt), endsAt: fromLocalInput(endsAt), location, link: link || undefined },
      {
        onSuccess: (d) => {
          toast.success(existing ? 'Mesyuarat dikemas kini.' : 'Mesyuarat dicipta dan ahli dijemput.')
          onClose()
          if (!existing) navigate(d.meeting.id)
        },
      },
    )
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={existing ? t('Sunting mesyuarat') : t('Mesyuarat baharu')}
      description={!existing ? t('Semua {v1} ahli aktif sesi ini akan dijemput. Pengecualian boleh ditetapkan kemudian.', { v1: members.data?.length ?? '…' }) : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('Batal')}
          </Button>
          <Button type="submit" form="mtg-form" loading={save.isPending}>
            {existing ? t('Simpan') : t('Cipta mesyuarat')}
          </Button>
        </>
      }
    >
      <form id="mtg-form" noValidate onSubmit={submit} className="space-y-4">
        <FormField label={t('Tajuk')} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} required />
        <SelectField label={t('Jenis mesyuarat')} value={meetingType} onChange={(e) => setType(e.target.value)}>
          {MEETING_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </SelectField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('Mula')} type="datetime-local" value={startsAt} onChange={(e) => setStarts(e.target.value)} required />
          <FormField label={t('Tamat')} type="datetime-local" value={endsAt} onChange={(e) => setEnds(e.target.value)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('Lokasi')} value={location} onChange={(e) => setLocation(e.target.value)} maxLength={150} />
          <FormField label={t('Pautan mesyuarat (https)')} type="url" value={link} onChange={(e) => setLink(e.target.value)} maxLength={300} />
        </div>
        {(error || save.error) && <Notice>{error ?? save.error?.message}</Notice>}
      </form>
    </Dialog>
  )
}
