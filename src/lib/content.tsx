import { useQuery } from '@tanstack/react-query'
import { Pencil, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { ContentItem, ContentKind } from '@shared/api-contract'
import { useAuth } from '@/app/auth-context'
import { ContentEditor } from '@/components/content-editor'
import { usePublic } from '@/hooks/use-public'
import { t } from '@/i18n'
import { callApi } from '@/lib/api'
import { cn } from '@/lib/cn'
import { isApiConfigured } from '@/lib/env'
import { dataUri, saveFile } from '@/lib/files'
import { useLangPref } from '@/lib/prefs'

/**
 * Admin-editable page content. Put `<Cms id="home.hero.title" ms="Teks Melayu" />` where a text should be editable:
 * the built-in wording (Malay source, English from the dictionary) is shown until SUAK overrides it in "Mod suntingan".
 * Links, photos, files and lists work the same way (CmsLink, CmsImage, CmsFile, useCmsList).
 */
export interface ListField {
  key: string
  label: string
  multiline?: boolean
  /** A link field: validated by the gateway. */
  url?: boolean
}

export interface EditSpec {
  id: string
  kind: ContentKind
  /** Malay source of the built-in text (for text/link/file labels). */
  ms?: string
  /** Built-in link target. */
  url?: string
  /** Offer the "link" field. */
  hasLink?: boolean
  multiline?: boolean
  fields?: ListField[]
  title?: string
}

interface Ctx {
  items: Map<string, ContentItem>
  canEdit: boolean
  editing: boolean
  setEditing: (v: boolean) => void
  edit: (spec: EditSpec) => void
}

const ContentContext = createContext<Ctx>({ items: new Map(), canEdit: false, editing: false, setEditing: () => undefined, edit: () => undefined })
// oxlint-disable-next-line react/only-export-components
export const useCms = () => useContext(ContentContext)

export function ContentProvider({ children }: { children: ReactNode }) {
  const { roles } = useAuth()
  const q = usePublic('public.content')
  const [editing, setEditing] = useState(false)
  const [spec, setSpec] = useState<EditSpec | null>(null)
  const canEdit = roles.includes('suak')
  const items = useMemo(() => new Map((q.data ?? []).map((i) => [i.id, i] as const)), [q.data])
  const edit = useCallback((s: EditSpec) => setSpec(s), [])
  const value = useMemo<Ctx>(() => ({ items, canEdit, editing: canEdit && editing, setEditing, edit }), [items, canEdit, editing, edit])
  return (
    <ContentContext value={value}>
      {children}
      {spec && <ContentEditor spec={spec} item={items.get(spec.id) ?? null} onClose={() => setSpec(null)} />}
      {value.editing && (
        <div role="status" className="fixed bottom-24 left-1/2 z-[65] flex -translate-x-1/2 items-center gap-3 rounded-full bg-navy-900 py-2 pr-2 pl-4 text-caption text-white shadow-float lg:bottom-6 print:hidden">
          <Pencil className="size-4 text-electric" aria-hidden />
          {t('Mod suntingan aktif: klik elemen bergaris putus-putus untuk mengubahnya.')}
          <button type="button" onClick={() => setEditing(false)} className="grid size-7 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label={t('Tamat suntingan')}>
            <X className="size-4" />
          </button>
        </div>
      )}
    </ContentContext>
  )
}

/** Header button (SUAK only) that turns edit mode on and off. */
export function EditModeButton({ className }: { className?: string }) {
  const { canEdit, editing, setEditing } = useCms()
  if (!canEdit) return null
  return (
    <button
      type="button"
      aria-pressed={editing}
      onClick={() => setEditing(!editing)}
      className={cn('inline-flex h-10 items-center gap-2 rounded-full border px-3 text-caption font-semibold transition-colors', editing ? 'border-blue bg-blue text-white' : 'border-line text-slate hover:border-blue hover:text-link', className)}
      title={t('Sunting kandungan halaman')}
    >
      <Pencil className="size-4" aria-hidden />
      <span className="hidden xl:inline">{t('Suntingan')}</span>
    </button>
  )
}

function pick(item: ContentItem | undefined, lang: 'ms' | 'en'): string {
  if (!item) return ''
  return lang === 'en' ? item.en || item.ms : item.ms || item.en
}

const onActivate = (fn: () => void) => ({
  onClick: (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    fn()
  },
  onKeyDown: (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      fn()
    }
  },
})

/** An editable piece of text. `ms` is the built-in Malay wording (English comes from the dictionary). */
export function Cms({ id, ms, multiline = false, hasLink = false }: { id: string; ms: string; multiline?: boolean; hasLink?: boolean }) {
  const { items, editing, edit } = useCms()
  const lang = useLangPref()
  const item = items.get(id)
  const text = (item?.kind === 'text' && pick(item, lang)) || t(ms)
  if (item?.hidden && !editing) return null
  if (!editing) return <>{text}</>
  return (
    <span role="button" tabIndex={0} className={cn('cms-edit', item?.hidden && 'opacity-40')} {...onActivate(() => edit({ id, kind: 'text', ms, multiline, hasLink }))}>
      {text}
    </span>
  )
}

/** A link or button whose label and target are editable. Style it with className (e.g. buttonVariants). */
export function CmsLink({ id, to, ms, className, children }: { id: string; to: string; ms: string; className?: string; children?: ReactNode }) {
  const { items, editing, edit } = useCms()
  const lang = useLangPref()
  const item = items.get(id)
  const label = (item?.kind === 'text' && pick(item, lang)) || t(ms)
  const target = (item?.kind === 'text' && item.url) || to
  if (item?.hidden && !editing) return null
  const content = (
    <>
      {label}
      {children}
    </>
  )
  if (editing) {
    return (
      <span role="button" tabIndex={0} className={cn(className, 'cms-edit', item?.hidden && 'opacity-40')} {...onActivate(() => edit({ id, kind: 'text', ms, url: to, hasLink: true }))}>
        {content}
      </span>
    )
  }
  if (target.startsWith('/')) return <Link to={target} className={className}>{content}</Link>
  const external = /^https:/.test(target)
  return (
    <a href={target} className={className} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {content}
    </a>
  )
}

function useContentFile(item: ContentItem | undefined) {
  const id = item?.id ?? ''
  return useQuery({
    queryKey: ['gateway', 'public.content.file', id, item?.version],
    queryFn: ({ signal }) => callApi('public.content.file', { id }, { signal }),
    enabled: isApiConfigured && Boolean(item) && (item?.kind === 'image' || item?.kind === 'file'),
    staleTime: Infinity,
  })
}

/** A photo SUAK can replace. `src` is the built-in image (may be empty: nothing is shown until a photo is uploaded). */
export function CmsImage({ id, src, alt, className }: { id: string; src?: string; alt: string; className?: string }) {
  const { items, editing, edit } = useCms()
  const item = items.get(id)
  const file = useContentFile(item?.kind === 'image' ? item : undefined)
  const shown = file.data ? dataUri(file.data) : src
  if (item?.hidden && !editing) return null
  if (!shown && !editing) return null
  const img = shown ? <img src={shown} alt={alt} className={className} loading="lazy" draggable={false} /> : null
  if (!editing) return img
  return (
    <span role="button" tabIndex={0} className={cn('cms-edit block', item?.hidden && 'opacity-40')} {...onActivate(() => edit({ id, kind: 'image', title: alt }))}>
      {img ?? <span className="grid h-32 place-items-center rounded-card border border-dashed border-blue text-caption text-link">{t('Tambah gambar')}</span>}
    </span>
  )
}

/** A downloadable file (PDF, DOCX, …) with an editable label. Nothing shows until SUAK uploads a file. */
export function CmsFile({ id, ms, className }: { id: string; ms: string; className?: string }) {
  const { items, editing, edit } = useCms()
  const lang = useLangPref()
  const [busy, setBusy] = useState(false)
  const item = items.get(id)
  const label = (item?.kind === 'file' && pick(item, lang)) || t(ms)
  const has = item?.kind === 'file'
  if ((item?.hidden || !has) && !editing) return null
  if (editing) {
    return (
      <span role="button" tabIndex={0} className={cn(className, 'cms-edit', item?.hidden && 'opacity-40')} {...onActivate(() => edit({ id, kind: 'file', ms }))}>
        {label}
      </span>
    )
  }
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          const f = await callApi('public.content.file', { id })
          if (f) saveFile(f)
        } finally {
          setBusy(false)
        }
      }}
    >
      {label}
    </button>
  )
}

export interface CmsListItem {
  [key: string]: string
}

/** Items of an admin-edited list (empty until SUAK adds some). Use <CmsListEditButton> to edit it. */
// oxlint-disable-next-line react/only-export-components
export function useCmsList(id: string): CmsListItem[] {
  const { items } = useCms()
  const item = items.get(id)
  return useMemo(() => {
    if (!item || item.kind !== 'list' || item.hidden) return []
    try {
      const data = JSON.parse(item.json) as unknown
      return Array.isArray(data) ? (data as CmsListItem[]) : []
    } catch {
      return []
    }
  }, [item])
}

/** The language-aware value of a list item field: `title` / `titleEn`. */
// oxlint-disable-next-line react/only-export-components
export function listText(it: CmsListItem, key: string, lang: 'ms' | 'en'): string {
  return lang === 'en' ? it[`${key}En`] || it[key] || '' : it[key] || it[`${key}En`] || ''
}

/** Shown to SUAK in edit mode next to a list: opens the list editor. */
export function CmsListEditButton({ id, fields, title }: { id: string; fields: ListField[]; title: string }) {
  const { editing, edit } = useCms()
  if (!editing) return null
  return (
    <button type="button" className="cms-edit inline-flex items-center gap-2 rounded-full px-3 py-1 text-caption font-semibold text-link" onClick={() => edit({ id, kind: 'list', fields, title })}>
      <Pencil className="size-3.5" aria-hidden /> {title}
    </button>
  )
}

