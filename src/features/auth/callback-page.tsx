import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/auth-context'
import { buttonVariants } from '@/components/ui/button-variants'
import { Skeleton } from '@/components/ui/skeleton'
import { takeNextPath } from '@/lib/next-path'

/** Google returns here via Supabase. supabase-js exchanges the PKCE code on load. */
export function CallbackPage() {
  const { state } = useAuth()
  const navigate = useNavigate()
  const providerError = readProviderError()

  useEffect(() => {
    if (!providerError && state.status === 'signed_in') navigate(takeNextPath(), { replace: true })
  }, [providerError, state.status, navigate])

  if (providerError || state.status === 'signed_out' || state.status === 'error') {
    return (
      <div>
        <h1 className="text-h2 font-extrabold">Log masuk tidak berjaya</h1>
        <p className="mt-3 text-body text-slate">
          {providerError ?? (state.status === 'error' ? state.message : 'Sesi log masuk tidak dapat disahkan. Sila cuba sekali lagi.')}
        </p>
        <Link to="/log-masuk" className={buttonVariants({ className: 'mt-8 w-full' })}>
          Cuba lagi
        </Link>
      </div>
    )
  }
  return (
    <div aria-busy="true">
      <h1 className="text-h2 font-extrabold">Mengesahkan log masuk…</h1>
      <Skeleton className="mt-6 h-11 w-full" />
    </div>
  )
}

function readProviderError(): string | null {
  const params = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const message = params.get('error_description') ?? hash.get('error_description')
  return message ? message.replace(/\+/g, ' ') : null
}
