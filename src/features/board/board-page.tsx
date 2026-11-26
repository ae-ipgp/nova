import { Megaphone, Pin, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { AnnouncementView } from '@shared/api-contract'
import { ANNOUNCEMENT_CATEGORIES } from '@shared/domain'
import { useAuth } from '@/app/auth-context'
import { useDraft } from '@/hooks/use-draft'
import { useLangPref } from '@/lib/prefs'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { FormField, Notice, SelectField, TextAreaField } from '@/components/ui/form-field'
import { FilterChips } from '@/components/ui/misc'
import { PageHeader } from '@/components/ui/page-header'
import { QueryState } from '@/components/ui/query-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/components/ui/toast'
import { useGatewayMutation, useGatewayQuery } from '@/hooks/use-gateway'
import { formatDateTime, fromLocalInput, toLocalInput } from '@/lib/format'
import { t } from '@/i18n'

const INVALIDATE = ['ann.list', 'public.announcements', 'dashboard.summary'] as const

export function AnnouncementCard({ a, onEdit }: { a: AnnouncementView; onEdit?: () => void }) {
  const en = useLangPref() === 'en' && a.titleEn.trim() !== '' && a.bodyEn.trim() !== ''
  return (
    <Card className={a.pinned ? 'border-champagne' : undefined}>
      <CardBody className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {a.pinned && <span className="inline-flex items-center gap-1 text-micro font-bold uppercase tracking-wide text-heading"><Pin className="size-3.5" aria-hidden />{t('Penting')}</span>}
          {a.recent && <StatusBadge tone="issued">{t('Terkini')}</StatusBadge>}
          <span className="text-micro font-semibold uppercase tracking-wide text-link">{a.category}</span>
          {a.visibility === 'public' && <StatusBadge tone="approved">{t('Awam')}</StatusBadge>}
          {a.status !== 'published' && <StatusBadge tone={a.status === 'draft' ? 'draft' : 'archived'}>{a.status === 'draft' ? t('Draf') : t('Arkib')}</StatusBadge>}
        </div>
        <h3 className="text-body font-bold">{en ? a.titleEn : a.title}</h3>
        <p className="whitespace-pre-line text-body text-ink">{en ? a.bodyEn : a.body}</p>
        <p className="text-micro text-slate">{a.author} · {formatDateTime(a.publishAt || a.createdAt)}{a.expiresAt && t('· tamat {v1}', { v1: formatDateTime(a.expiresAt) })}</p>
        {onEdit && <Button size="sm" variant="secondary" onClick={onEdit}>{t('Sunting')}</Button>}
      </CardBody>
    </Card>
  )
}

/** Papan Notis: internal notice board for members, linked to the public Pengumuman page (SUAK publishes public ones). */
export function BoardPage() {
  const { roles } = useAuth()
  const staff = roles.includes('suak') || roles.includes('secretariat')
  const [scope, setScope] = useState<'board' | 'manage'>('board')
  const [editing, setEditing] = useState<AnnouncementView | 'new' | null>(null)
  const q = useGatewayQuery('ann.list', { scope })
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('M01 · Papan Notis')} title={t('Papan Notis')} description={t('Notis dan pengumuman untuk ahli. Pengumuman bertanda Awam turut dipaparkan di laman awam.')} actions={staff && <Button onClick={() => setEditing('new')}><Plus />{t('Tulis notis')}</Button>} />
      {staff && <FilterChips label={t('Paparan')} value={scope} onChange={setScope} options={[{ value: 'board', label: t('Papan') }, { value: 'manage', label: t('Urus semua') }]} />}
      <QueryState query={q} empty={{ icon: Megaphone, pose: 'sleeping', title: t('Papan notis kosong'), description: t('Tiada notis aktif buat masa ini.') }}>
        {(rows) => <ul className="grid gap-4 lg:grid-cols-2">{rows.map((a) => <li key={a.id}><AnnouncementCard a={a} onEdit={scope === 'manage' ? () => setEditing(a) : undefined} /></li>)}</ul>}
      </QueryState>
      {editing && <AnnouncementDialog existing={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function AnnouncementDialog({ existing, onClose }: { existing: AnnouncementView | null; onClose: () => void }) {
  const { roles } = useAuth()
  const toast = useToast()
  const save = useGatewayMutation('ann.save', INVALIDATE)
  const initial = { title: existing?.title ?? '', body: existing?.body ?? '', titleEn: existing?.titleEn ?? '', bodyEn: existing?.bodyEn ?? '', category: existing?.category ?? 'Umum', visibility: (existing?.visibility === 'public' ? 'public' : 'internal') as 'internal' | 'public', pinned: existing?.pinned ?? false, status: (existing?.status ?? 'published') as 'draft' | 'published' | 'archived', publishAt: toLocalInput(existing?.publishAt ?? ''), expiresAt: toLocalInput(existing?.expiresAt ?? '') }
  const draft = useDraft('announcement', initial, !existing)
  const { value: v, setValue: setV } = draft
  const [error, setError] = useState<string | null>(null)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!v.title.trim() || !v.body.trim()) return setError(t('Tajuk dan kandungan diperlukan.'))
    setError(null)
    save.mutate({ id: existing?.id, title: v.title, body: v.body, titleEn: v.titleEn, bodyEn: v.bodyEn, category: v.category, visibility: v.visibility, pinned: v.pinned, status: v.status, publishAt: v.publishAt ? fromLocalInput(v.publishAt) : undefined, expiresAt: v.expiresAt ? fromLocalInput(v.expiresAt) : undefined }, { onSuccess: () => (toast.success(t('Notis disimpan.')), draft.clear(), onClose()) })
  }
  return (
    <Dialog open onClose={onClose} size="lg" title={existing ? t('Sunting notis') : t('Notis baharu')} footer={<><Button variant="secondary" onClick={onClose}>{t('Batal')}</Button><Button type="submit" form="ann-form" loading={save.isPending}>{t('Simpan')}</Button></>}>
      <form id="ann-form" noValidate onSubmit={submit} className="space-y-4">
        {draft.restored && <p role="status" className="flex items-center justify-between gap-3 rounded-input border border-blue/30 bg-soft p-2.5 text-caption text-ink">{t('Draf yang belum disimpan dipulihkan.')} <button type="button" className="font-semibold text-link hover:underline" onClick={draft.discard}>{t('Buang draf')}</button></p>}
        <FormField label={t('Tajuk')} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={150} required />
        <TextAreaField label={t('Kandungan')} rows={6} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} maxLength={4000} required />
        <details className="rounded-input border border-line p-3" open={Boolean(v.titleEn || v.bodyEn)}>
          <summary className="cursor-pointer text-caption font-semibold text-heading">{t('Versi English (pilihan)')}</summary>
          <div className="mt-3 space-y-4">
            <FormField label={t('Title (English)')} hint={t('Dipaparkan kepada pembaca yang memilih English. Kosongkan kedua-dua medan jika tiada terjemahan.')} value={v.titleEn} onChange={(e) => setV({ ...v, titleEn: e.target.value })} maxLength={150} />
            <TextAreaField label={t('Content (English)')} rows={5} value={v.bodyEn} onChange={(e) => setV({ ...v, bodyEn: e.target.value })} maxLength={4000} />
          </div>
        </details>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label={t('Kategori')} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>{ANNOUNCEMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</SelectField>
          <SelectField label={t('Siapa boleh lihat')} value={v.visibility} onChange={(e) => setV({ ...v, visibility: e.target.value as 'internal' | 'public' })}>
            <option value="internal">{t('Ahli sahaja')}</option>
            {roles.includes('suak') && <option value="public">{t('Awam (laman umum)')}</option>}
          </SelectField>
          <SelectField label={t('Status')} value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as typeof v.status })}><option value="published">{t('Diterbitkan')}</option><option value="draft">{t('Draf')}</option><option value="archived">{t('Diarkibkan')}</option></SelectField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('Terbit pada (pilihan)')} type="datetime-local" value={v.publishAt} onChange={(e) => setV({ ...v, publishAt: e.target.value })} />
          <FormField label={t('Tamat pada (pilihan)')} type="datetime-local" value={v.expiresAt} onChange={(e) => setV({ ...v, expiresAt: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-caption font-medium"><input type="checkbox" checked={v.pinned} onChange={(e) => setV({ ...v, pinned: e.target.checked })} className="size-4 accent-[var(--color-blue)]" />{t('Semat sebagai Penting')}</label>
        {(error || save.error) && <Notice>{error ?? save.error?.message}</Notice>}
      </form>
    </Dialog>
  )
}
