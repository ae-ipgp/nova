import { Plus, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { GroupView } from '@shared/api-contract'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { FormField, Notice } from '@/components/ui/form-field'
import { QueryState } from '@/components/ui/query-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/components/ui/toast'
import { useGatewayMutation, useGatewayQuery } from '@/hooks/use-gateway'

export function GroupsPage() {
  const q = useGatewayQuery('admin.groups.list', {})
  const [editing, setEditing] = useState<GroupView | 'new' | null>(null)
  return (
    <section aria-labelledby="grp-h" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 id="grp-h" className="text-h3 font-bold">Kumpulan penerima</h2><p className="mt-1 max-w-2xl text-caption text-slate">Kumpulan tersimpan untuk NoMe (ADM-05). Peranan dan biro boleh dipilih terus semasa menyusun notis.</p></div>
        <Button onClick={() => setEditing('new')}><Plus />Kumpulan baharu</Button>
      </div>
      <Card className="overflow-hidden">
        <QueryState query={q} empty={{ icon: Users, title: 'Tiada kumpulan', description: 'Cipta kumpulan untuk memilih penerima dengan cepat.' }}>
          {(rows) => <ul className="divide-y divide-line">{rows.map((g) => <li key={g.id} className="flex items-center justify-between gap-3 px-5 py-4"><div><p className="font-semibold text-navy">{g.name}</p><p className="text-caption text-slate">{g.profileIds.length} ahli</p></div><div className="flex items-center gap-2">{!g.active && <StatusBadge tone="archived">Tidak aktif</StatusBadge>}<Button size="sm" variant="secondary" onClick={() => setEditing(g)}>Sunting</Button></div></li>)}</ul>}
        </QueryState>
      </Card>
      {editing && <GroupDialog existing={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </section>
  )
}

function GroupDialog({ existing, onClose }: { existing: GroupView | null; onClose: () => void }) {
  const toast = useToast()
  const users = useGatewayQuery('admin.users.list', {})
  const save = useGatewayMutation('admin.groups.save', ['admin.groups.list'])
  const [name, setName] = useState(existing?.name ?? '')
  const [ids, setIds] = useState<string[]>(existing?.profileIds ?? [])
  const [active, setActive] = useState(existing?.active ?? true)
  const submit = (e: FormEvent) => (e.preventDefault(), save.mutate({ id: existing?.id, name, profileIds: ids, active }, { onSuccess: () => (toast.success('Kumpulan disimpan.'), onClose()) }))
  return (
    <Dialog open onClose={onClose} size="lg" title={existing ? 'Sunting kumpulan' : 'Kumpulan baharu'} footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" form="grp-form" loading={save.isPending}>Simpan</Button></>}>
      <form id="grp-form" noValidate onSubmit={submit} className="space-y-4">
        <FormField label="Nama kumpulan" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
        <fieldset><legend className="mb-1.5 text-caption font-medium">Ahli ({ids.length})</legend>
          <div className="max-h-64 overflow-y-auto rounded-input border border-line">
            {users.data?.map((u) => <label key={u.profileId} className="flex items-center gap-2 border-b border-line px-3 py-2 text-caption last:border-0"><input type="checkbox" checked={ids.includes(u.profileId)} onChange={(e) => setIds(e.target.checked ? [...ids, u.profileId] : ids.filter((x) => x !== u.profileId))} className="size-4 accent-[var(--color-blue)]" />{u.fullName} <span className="font-mono text-micro text-slate">{u.email}</span></label>)}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-caption font-medium"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-[var(--color-blue)]" />Aktif</label>
        {save.error && <Notice>{save.error.message}</Notice>}
      </form>
    </Dialog>
  )
}
