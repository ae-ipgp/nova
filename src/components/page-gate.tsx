import { Lock, Hourglass } from 'lucide-react'
import type { ReactNode } from 'react'
import { Mascot } from '@/components/brand/mascot'
import { NotFoundPage } from '@/features/shared/not-found-page'
import { useVisibility, type Scope } from '@/lib/visibility'
import { t } from '@/i18n'

/** Wraps a page/module: shows it when published; otherwise a coming-soon / locked notice or a 404. SUAK sees everything with a banner. */
export function PageGate({ scope, page, children }: { scope: Scope; page: string; children: ReactNode }) {
  const { stateOf, isSuak } = useVisibility()
  const state = stateOf(scope, page)
  if (state === 'published') return <>{children}</>
  if (scope === 'ws' && isSuak) {
    return (
      <div className="space-y-4">
        <p role="status" className="rounded-input border border-amber/30 bg-amber-100 p-3 text-caption text-ink">
          {t('Halaman ini bertanda {state}: hanya SUAK boleh melihatnya. Ubah di Tetapan.', { state: state === 'soon' ? t('Akan datang') : state === 'locked' ? t('Dikunci') : t('Disembunyikan') })}
        </p>
        {children}
      </div>
    )
  }
  if (state === 'hidden') return <NotFoundPage home={scope === 'ws' ? '/workspace' : '/'} />
  const soon = state === 'soon'
  const Icon = soon ? Hourglass : Lock
  return (
    <div className="container-content flex flex-col items-center gap-4 py-24 text-center">
      <Mascot pose="construction" size={180} fallback={<Icon className="size-12 text-link" aria-hidden />} />
      <h1 className="text-h2 font-extrabold">{soon ? t('Akan datang') : t('Dikunci buat sementara waktu')}</h1>
      <p className="max-w-md text-body-lg text-slate">{soon ? t('Bahagian ini belum dibuka. Ia akan tersedia tidak lama lagi.') : t('Bahagian ini sedang diselenggara atau dipertingkatkan. Sila cuba lagi kemudian.')}</p>
    </div>
  )
}
