import { Info, LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ALLOWED_EMAIL_DOMAIN } from '@shared/identity'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/cn'

/**
 * Sign-in is with the user's DELIMa Google account via Supabase Auth's Google
 * provider (ADR-0002). Wired in Phase 1; until then the button is disabled.
 */
export function LoginPage() {
  return (
    <div>
      <h1 className="text-h2 font-extrabold">Log masuk</h1>
      <p className="mt-2 text-body text-slate">
        Gunakan akaun DELIMa anda (<span className="font-mono text-caption text-ink">@{ALLOWED_EMAIL_DOMAIN}</span>). Hanya akaun yang telah
        didaftarkan oleh Sekretariat boleh masuk ke ruang kerja.
      </p>

      <Button size="lg" className="mt-8 w-full" disabled aria-describedby="login-disabled">
        <LogIn />
        Log masuk dengan DELIMa
      </Button>

      <div id="login-disabled" role="note" className="mt-4 flex gap-3 rounded-input border border-amber/30 bg-amber-100/70 p-3 text-caption text-ink">
        <Info className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden />
        <p>Log masuk akan diaktifkan dalam Fasa 1.</p>
      </div>

      <ul className="mt-8 space-y-2 text-caption text-slate">
        <li>• NO.VA tidak menyimpan kata laluan anda. Pengesahan dibuat oleh Google.</li>
        <li>• Akaun peribadi (contoh: Gmail) tidak diterima.</li>
      </ul>

      <div className="mt-8 border-t border-line pt-6">
        <p className="text-caption text-slate">Untuk semakan reka bentuk sahaja:</p>
        <Link to="/workspace" className={cn(buttonVariants({ variant: 'secondary' }), 'mt-3 w-full')}>
          Pratonton struktur ruang kerja
        </Link>
      </div>
    </div>
  )
}
