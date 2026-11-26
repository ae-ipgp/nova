import { Info, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ALLOWED_EMAIL_DOMAIN } from '@shared/identity'
import { useAuth } from '@/app/auth-context'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Mascot } from '@/components/brand/mascot'
import { cn } from '@/lib/cn'
import { safeNextPath } from '@/lib/next-path'
import { t } from '@/i18n'
import { Cms } from '@/lib/content'

/** Sign-in with the user's DELIMa Google account via Supabase (ADR-0002). */
export function LoginPage() {
  const { mode, state, signIn } = useAuth()
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next'))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (mode === 'live' && state.status === 'signed_in') return <Navigate to={next} replace />

  const start = async () => {
    setPending(true)
    setError(null)
    try {
      await signIn(next) // redirects to Google
    } catch {
      setError(t('Tidak dapat memulakan log masuk. Sila cuba lagi.'))
      setPending(false)
    }
  }

  return (
    <div className="bg-soft/50">
      <div className="container-content grid items-center gap-10 py-14 md:py-20 lg:grid-cols-[1fr_1.1fr]">
        <div className="hidden lg:block">
          <Mascot pose="wave" size={380} className="mx-auto" />
        </div>
        <div className="mx-auto w-full max-w-md rounded-hero border border-line bg-paper p-8 shadow-float">
          <Mascot pose="shield" size={88} className="mb-4 lg:hidden" />
          <h1 className="text-h2 font-extrabold">
            <Cms id="login.title" ms="Log masuk" />
          </h1>
          <p className="mt-2 text-body text-slate">
            {t('Gunakan akaun DELIMa anda (@{domain}). Hanya akaun yang telah didaftarkan oleh pentadbir boleh masuk ke Ruang Kerja.', { domain: ALLOWED_EMAIL_DOMAIN })}
          </p>

          <Button size="lg" className="mt-8 w-full" disabled={mode !== 'live'} loading={pending} onClick={start}>
            <LogIn />
            {t('Log masuk dengan DELIMa')}
          </Button>

          {error && (
            <p role="alert" className="mt-3 text-caption text-red">
              {error}
            </p>
          )}

          {mode !== 'live' && (
            <div role="note" className="mt-4 flex gap-3 rounded-input border border-amber/30 bg-amber-100/70 p-3 text-caption text-ink">
              <Info className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden />
              <p>{t('Log masuk belum dikonfigurasi pada pelayan ini.')}</p>
            </div>
          )}

          <ul className="mt-8 space-y-2 text-caption text-slate">
            <li>{t('• NoVA tidak menyimpan kata laluan anda. Pengesahan dibuat oleh Google.')}</li>
            <li>{t('• Akaun peribadi (contoh: Gmail) tidak diterima.')}</li>
          </ul>

          {mode === 'preview' && (
            <div className="mt-8 border-t border-line pt-6">
              <p className="text-caption text-slate">{t('Mod pembangunan:')}</p>
              <Link to="/workspace" className={cn(buttonVariants({ variant: 'secondary' }), 'mt-3 w-full')}>
                {t('Pratonton struktur ruang kerja')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
