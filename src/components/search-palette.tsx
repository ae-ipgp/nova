import { CornerDownLeft, Search as SearchIcon } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SearchGroup } from '@shared/api-contract'
import { useGatewayQuery } from '@/hooks/use-gateway'
import { usePublic } from '@/hooks/use-public'
import { cn } from '@/lib/cn'
import { t } from '@/i18n'

export interface PageHit {
  to: string
  label: string
  keywords?: string
}

const GROUP_LABEL: Record<string, string> = {
  'e-surat': 'e-Surat',
  'e-mesyuarat': 'e-Mesyuarat',
  nome: 'NoMe',
  templat: 'Templat',
  opr: 'e-OPR',
  'e-arkib': 'e-Arkib',
  'papan-notis': 'Papan Notis',
  pengguna: 'Pengguna',
  pengumuman: 'Pengumuman',
  arkib: 'Arkib Awam',
}

interface SearchApi {
  open: () => void
}
const SearchContext = createContext<SearchApi>({ open: () => undefined })
// oxlint-disable-next-line react/only-export-components
export const useSearch = () => useContext(SearchContext)

function useDebounced(value: string, ms = 250): string {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** Search provider + palette. Opens with Ctrl/Cmd+K (or "/" outside text fields). */
export function SearchProvider({ scope, pages, children }: { scope: 'workspace' | 'public'; pages: PageHit[]; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(input|textarea|select)$/i.test((e.target as HTMLElement)?.tagName ?? '') || (e.target as HTMLElement)?.isContentEditable
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  const api = useMemo(() => ({ open: () => setOpen(true) }), [])
  return (
    <SearchContext value={api}>
      {children}
      {open && <Palette scope={scope} pages={pages} onClose={() => setOpen(false)} />}
    </SearchContext>
  )
}

interface Row {
  key: string
  title: string
  subtitle: string
  href: string
  group: string
}

function Palette({ scope, pages, onClose }: { scope: 'workspace' | 'public'; pages: PageHit[]; onClose: () => void }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const dq = useDebounced(q.trim())
  const listId = useId()
  const input = useRef<HTMLInputElement>(null)
  const ready = dq.length >= 2
  const ws = useGatewayQuery('search.global', { q: dq }, { enabled: scope === 'workspace' && ready })
  const pub = usePublic('public.search', { q: dq }, { enabled: scope === 'public' && ready })
  const remote = (scope === 'workspace' ? ws : pub)
  const groups = useMemo<SearchGroup[]>(() => (ready ? (remote.data ?? []) : []), [ready, remote.data])

  useEffect(() => {
    input.current?.focus()
  }, [])

  const rows = useMemo<Row[]>(() => {
    const terms = q.trim().toLowerCase().split(' ').filter(Boolean)
    const pageRows = terms.length
      ? pages.filter((p) => terms.every((term) => `${p.label} ${t(p.label)} ${p.keywords ?? ''}`.toLowerCase().includes(term))).slice(0, 5).map((p) => ({ key: `p:${p.to}`, title: t(p.label), subtitle: '', href: p.to, group: t('Halaman') }))
      : pages.slice(0, 8).map((p) => ({ key: `p:${p.to}`, title: t(p.label), subtitle: '', href: p.to, group: t('Halaman') }))
    const recordRows = groups.flatMap((g) => g.items.map((i) => ({ key: `${g.kind}:${i.id}`, title: i.title, subtitle: i.subtitle, href: i.href, group: t(GROUP_LABEL[g.kind] ?? g.kind) })))
    return [...pageRows, ...recordRows]
  }, [q, pages, groups])


  const go = useCallback(
    (row?: Row) => {
      if (!row) return
      onClose()
      navigate(row.href)
    },
    [navigate, onClose],
  )

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(rows.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(rows[active])
    }
  }

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [active, listId])

  let lastGroup = ''
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh] print:hidden" onKeyDown={onKey}>
      <button type="button" aria-label={t('Tutup carian')} tabIndex={-1} className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={t('Carian')} className="glass relative w-full max-w-xl overflow-hidden rounded-hero border border-line shadow-float">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <SearchIcon className="size-5 shrink-0 text-slate" aria-hidden />
          <input
            ref={input}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={rows[active] ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            placeholder={scope === 'workspace' ? t('Cari surat, mesyuarat, dokumen, halaman…') : t('Cari pengumuman, templat, dokumen awam…')}
            className="h-14 w-full bg-transparent text-body-lg text-ink placeholder:text-slate/70 focus:outline-none"
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-micro text-slate sm:block">Esc</kbd>
        </div>
        <ul id={listId} role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {rows.map((r, i) => {
            const header = r.group !== lastGroup ? ((lastGroup = r.group), r.group) : null
            return (
              <li key={r.key} role="presentation">
                {header && <p className="px-3 pt-2 pb-1 text-micro font-semibold uppercase tracking-wide text-slate">{t(header)}</p>}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-input px-3 py-2', i === active ? 'bg-blue-100' : 'hover:bg-ice')}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-body font-semibold text-heading">{r.title}</span>
                    {r.subtitle && <span className="block truncate text-caption text-slate">{r.subtitle}</span>}
                  </span>
                  {i === active && <CornerDownLeft className="size-4 shrink-0 text-link" aria-hidden />}
                </div>
              </li>
            )
          })}
          {ready && remote.isFetching && <li className="px-3 py-2 text-caption text-slate" aria-live="polite">{t('Mencari…')}</li>}
          {ready && !remote.isFetching && !remote.isError && groups.length === 0 && <li className="px-3 py-3 text-caption text-slate">{t('Tiada rekod ditemui untuk “')}{dq}”.</li>}
          {remote.isError && <li className="px-3 py-3 text-caption text-red">{t('Carian tidak dapat dibuat buat masa ini.')}</li>}
          {!ready && q.trim().length > 0 && <li className="px-3 py-2 text-caption text-slate">{t('Taip sekurang-kurangnya 2 aksara untuk mencari rekod.')}</li>}
        </ul>
      </div>
    </div>
  )
}

/** A button-styled trigger that looks like a search field. */
export function SearchTrigger({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { open } = useSearch()
  return (
    <button type="button" onClick={open} aria-label={t('Cari (Ctrl+K)')} className={cn('inline-flex items-center gap-2 rounded-full text-caption text-slate transition-colors hover:text-heading', compact ? 'size-10 justify-center' : 'h-10 border border-line bg-paper/60 px-4', className)}>
      <SearchIcon className="size-4" aria-hidden />
      {!compact && (
        <>
          <span>{t('Cari')}</span>
          <kbd className="ml-4 hidden rounded border border-line px-1.5 font-mono text-micro lg:block">Ctrl K</kbd>
        </>
      )}
    </button>
  )
}
