import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { useAuth } from '@/app/auth-context'

/** Full-page explanation when the workspace cannot be opened. */
export function AccessState({
  title,
  children,
  showSignOut = true,
  action,
}: {
  title: string
  children: React.ReactNode
  showSignOut?: boolean
  action?: React.ReactNode
}) {
  const { signOut } = useAuth()
  return (
    <div className="flex min-h-dvh flex-col bg-ice">
      <header className="container-content flex h-header items-center">
        <Link to="/" aria-label="Laman utama NO.VA">
          <Logo />
        </Link>
      </header>
      <main className="container-content flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md rounded-card border border-line bg-paper p-8">
          <h1 className="text-h2 font-extrabold">{title}</h1>
          <div className="mt-3 space-y-3 text-body text-slate">{children}</div>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            {action}
            {showSignOut && (
              <Button variant="secondary" onClick={() => void signOut()}>
                Log keluar
              </Button>
            )}
            <Link to="/" className={buttonVariants({ variant: 'tertiary' })}>
              Ke portal awam
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
