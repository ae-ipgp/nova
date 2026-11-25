import { Link } from 'react-router-dom'
import { Mascot } from '@/components/brand/mascot'
import { buttonVariants } from '@/components/ui/button-variants'

export function NotFoundPage({ home = '/' }: { home?: string }) {
  return (
    <div className="container-content flex flex-col items-start gap-6 py-24 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col items-start">
      <p className="font-mono text-micro uppercase tracking-[0.14em] text-blue">Ralat 404</p>
      <h1 className="mt-3 text-h1 font-extrabold">Halaman tidak ditemui.</h1>
      <p className="mt-3 max-w-lg text-body-lg text-slate">Pautan mungkin telah berubah atau anda tidak mempunyai akses kepada halaman ini.</p>
      <Link to={home} className={buttonVariants({ className: 'mt-8' })}>
        Kembali
      </Link>
      </div>
      <Mascot pose="shrug" size={260} />
    </div>
  )
}
