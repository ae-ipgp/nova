import { Link, Outlet } from 'react-router-dom'
import { Logo } from '@/components/brand/logo'
import { SITE } from '@/config/site'
import { t } from '@/i18n'

export function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link to="/" aria-label={t('Kembali ke laman utama')}>
          <Logo inverse />
        </Link>
        <div className="relative z-10">
          <p className="font-display text-[3.25rem] font-extrabold leading-[1.02] tracking-tight">
            {t('One platform.')}
            <br />
            {t('One Secretariat.')}
            <br />
            <span className="text-electric">{t('One official record.')}</span>
          </p>
        </div>
        <p className="text-caption text-sky/60">{SITE.organisationLong}</p>
        <div className="pointer-events-none absolute -right-32 -bottom-32 size-[28rem] rounded-full border border-white/10" aria-hidden />
        <div className="pointer-events-none absolute -right-12 -bottom-12 size-[18rem] rounded-full border border-white/10" aria-hidden />
      </aside>
      <main className="flex flex-col bg-paper">
        <div className="p-6 lg:hidden">
          <Link to="/" aria-label={t('Kembali ke laman utama')}>
            <Logo />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
