import { Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/cn'

/**
 * Login UI only. Supabase Auth is wired in Phase 1; until then the form is
 * disabled and no credentials are collected or sent anywhere.
 */
export function LoginPage() {
  return (
    <div>
      <h1 className="text-h2 font-extrabold">Log masuk</h1>
      <p className="mt-2 text-body text-slate">Masuk ke ruang kerja NO.VA menggunakan akaun yang telah diundang oleh SUAK.</p>

      <div role="note" className="mt-6 flex gap-3 rounded-input border border-amber/30 bg-amber-100/70 p-3 text-caption text-ink">
        <Info className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden />
        <p>Pengesahan pengguna akan diaktifkan dalam Fasa 1. Borang ini dilumpuhkan dan tidak menghantar sebarang maklumat.</p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()} aria-describedby="login-disabled">
        <fieldset disabled className="space-y-4">
          <Field id="email" label="E-mel" type="email" autoComplete="email" />
          <Field id="password" label="Kata laluan" type="password" autoComplete="current-password" />
          <Button type="submit" className="w-full" size="lg">
            Log masuk
          </Button>
        </fieldset>
        <p id="login-disabled" className="sr-only">
          Borang log masuk belum aktif.
        </p>
      </form>

      <div className="mt-8 border-t border-line pt-6">
        <p className="text-caption text-slate">Untuk semakan reka bentuk sahaja:</p>
        <Link to="/workspace" className={cn(buttonVariants({ variant: 'secondary' }), 'mt-3 w-full')}>
          Pratonton struktur ruang kerja
        </Link>
      </div>
    </div>
  )
}

function Field({ id, label, type, autoComplete }: { id: string; label: string; type: string; autoComplete: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-caption font-medium text-ink">
        {label} <span className="text-red" aria-hidden>*</span>
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        autoComplete={autoComplete}
        className="h-11 w-full rounded-input border border-line bg-paper px-3 text-body text-ink placeholder:text-slate/70 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20 disabled:bg-ice"
      />
    </div>
  )
}
