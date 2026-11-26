import { Download, RefreshCw } from 'lucide-react'
import { promptInstall, refreshApp, useCanInstall, useUpdateAvailable } from '@/lib/pwa'
import { t } from '@/i18n'

/** "Versi baharu tersedia" after a release, and an install-as-app button when the browser offers one. */
export function UpdateBanner() {
  const update = useUpdateAvailable()
  const canInstall = useCanInstall()
  if (!update && !canInstall) return null
  return (
    <div role="status" className="border-b border-blue/30 bg-soft">
      <div className="container-content flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-caption text-ink">
        {update ? (
          <>
            <span>
              <strong className="font-semibold">{t('Versi baharu NoVA tersedia.')}</strong> {t('Muat semula untuk menggunakannya.')}
            </span>
            <button type="button" onClick={() => void refreshApp()} className="inline-flex items-center gap-1.5 font-semibold text-link hover:underline">
              <RefreshCw className="size-3.5" aria-hidden /> {t('Kemas kini')}
            </button>
          </>
        ) : (
          <>
            <span>{t('Pasang NoVA sebagai aplikasi pada peranti anda.')}</span>
            <button type="button" onClick={() => void promptInstall()} className="inline-flex items-center gap-1.5 font-semibold text-link hover:underline">
              <Download className="size-3.5" aria-hidden /> {t('Pasang')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
