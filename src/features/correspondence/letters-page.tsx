import { ArrowDownLeft, ArrowUpRight, Inbox, Paperclip, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { CorrespondenceEntry } from '@shared/api-contract'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { FormField, Notice, SelectField, TextAreaField } from '@/components/ui/form-field'
import { FilterChips, SearchBox, TableShell, Td, Th } from '@/components/ui/misc'
import { QueryState } from '@/components/ui/query-state'
import { useToast } from '@/components/ui/toast'
import { useDownloader, useGatewayMutation, useGatewayQuery } from '@/hooks/use-gateway'
import { fileToPayload } from '@/lib/files'
import { formatDate, todayIso } from '@/lib/format'

export function LettersPage() {
  const [dir, setDir] = useState<'all' | 'in' | 'out'>('all')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const q = useGatewayQuery('corr.list', dir === 'all' ? {} : { direction: dir })
  const download = useDownloader()
  const s = search.trim().toLowerCase()
  const filter = (rows: CorrespondenceEntry[]) => rows.filter((r) => !s || `${r.subject} ${r.sender} ${r.recipient} ${r.referenceNumber} ${r.note}`.toLowerCase().includes(s))

  return (
    <section aria-labelledby="let-h" className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 id="let-h" className="sr-only">
          Surat masuk dan keluar
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchBox value={search} onChange={setSearch} placeholder="Cari tajuk, pengirim, penerima…" />
          <FilterChips label="Arah" value={dir} onChange={setDir} options={[{ value: 'all', label: 'Semua' }, { value: 'in', label: 'Masuk' }, { value: 'out', label: 'Keluar' }]} />
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus />
          Daftar surat
        </Button>
      </div>
      <Card className="overflow-hidden">
        <QueryState query={q} isEmpty={(d) => filter(d).length === 0} empty={{ icon: Inbox, title: 'Tiada surat direkodkan', description: 'Surat keluar yang diluluskan direkodkan automatik. Daftarkan surat masuk secara manual.' }}>
          {(rows) => (
            <TableShell minWidth="46rem">
              <thead>
                <tr>
                  <Th>Arah</Th>
                  <Th>Tarikh</Th>
                  <Th>Tajuk</Th>
                  <Th>Pengirim → Penerima</Th>
                  <Th>
                    <span className="sr-only">Fail</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {filter(rows).map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <span className="inline-flex items-center gap-1 font-semibold text-navy">
                        {r.direction === 'in' ? <ArrowDownLeft className="size-4 text-teal" aria-hidden /> : <ArrowUpRight className="size-4 text-blue" aria-hidden />}
                        {r.direction === 'in' ? 'Masuk' : 'Keluar'}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap">{formatDate(r.letterDate)}</Td>
                    <Td>
                      <p className="font-semibold text-navy">{r.subject}</p>
                      {(r.referenceNumber || r.note) && <p className="font-mono text-micro text-slate">{r.referenceNumber || r.note}</p>}
                    </Td>
                    <Td>
                      {r.sender} → {r.recipient}
                    </Td>
                    <Td className="text-right">
                      {r.file && (
                        <Button size="sm" variant="tertiary" onClick={() => void download('corr.file', { id: r.id })} aria-label={`Muat turun ${r.file.name}`}>
                          <Paperclip />
                          {r.file.name.length > 18 ? `${r.file.name.slice(0, 15)}…` : r.file.name}
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </QueryState>
      </Card>
      {adding && <AddLetterDialog onClose={() => setAdding(false)} />}
    </section>
  )
}

function AddLetterDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const create = useGatewayMutation('corr.create', ['corr.list', 'dashboard.summary'])
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [v, setV] = useState({ subject: '', sender: '', recipient: '', letterDate: todayIso(), note: '', referenceNumber: '' })
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!v.subject.trim() || !v.sender.trim() || !v.recipient.trim()) return setError('Lengkapkan tajuk, pengirim dan penerima.')
    try {
      const payload = file ? await fileToPayload(file) : undefined
      create.mutate({ direction, ...v, file: payload }, { onSuccess: () => (toast.success('Surat direkodkan.'), onClose()) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fail tidak sah.')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Daftar surat"
      description="Rekod surat masuk atau surat keluar yang tidak melalui permohonan nombor."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" form="letter-form" loading={create.isPending}>
            Simpan
          </Button>
        </>
      }
    >
      <form id="letter-form" noValidate onSubmit={submit} className="space-y-4">
        <SelectField label="Arah" value={direction} onChange={(e) => setDirection(e.target.value as 'in' | 'out')}>
          <option value="in">Surat masuk</option>
          <option value="out">Surat keluar</option>
        </SelectField>
        <FormField label="Tajuk" value={v.subject} onChange={set('subject')} maxLength={200} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Pengirim" value={v.sender} onChange={set('sender')} maxLength={200} required />
          <FormField label="Penerima" value={v.recipient} onChange={set('recipient')} maxLength={200} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Tarikh surat" type="date" value={v.letterDate} onChange={set('letterDate')} required />
          <FormField label="Nombor rujukan luar" value={v.referenceNumber} onChange={set('referenceNumber')} maxLength={80} />
        </div>
        <TextAreaField label="Catatan" rows={2} value={v.note} onChange={set('note')} maxLength={500} />
        <div>
          <label htmlFor="letter-file" className="mb-1.5 block text-caption font-medium text-ink">
            Lampiran (PDF, DOCX, imej; maks 5 MB)
          </label>
          <input id="letter-file" type="file" accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-caption" />
        </div>
        {(error || create.error) && <Notice>{error ?? create.error?.message}</Notice>}
      </form>
    </Dialog>
  )
}
