import { useSite } from '@/hooks/use-site'
import { formatDate } from '@/lib/format'
import { PublicPage } from './public-page'

/** Privacy notice text is SUAK/institution-approved content (Tetapan). Nothing is invented here. */
export function PrivacyPage() {
  const { site } = useSite()
  const text = site.settings.privacy_text
  return (
    <PublicPage eyebrow="Privasi" title="Dasar privasi" description="Bagaimana NO.VA mengendalikan data organisasi dan peribadi.">
      <div className="mx-auto max-w-3xl">
        {text ? (
          <>
            {site.settings.privacy_effective_date && <p className="mb-4 text-caption text-slate">Berkuat kuasa: {formatDate(site.settings.privacy_effective_date)}</p>}
            <div className="whitespace-pre-line text-body-lg leading-relaxed">{text}</div>
          </>
        ) : (
          <p className="rounded-card border border-line bg-ice p-6 text-body-lg text-slate">Belum ditetapkan oleh pentadbir. Dasar privasi akan diterbitkan selepas diluluskan oleh pihak institusi.</p>
        )}
        <h2 className="mt-10 text-h3 font-bold">Ringkasan teknikal</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-body text-slate">
          <li>Log masuk menggunakan akaun DELIMa melalui Google; NO.VA tidak menyimpan kata laluan.</li>
          <li>Rekod disimpan di Google Sheets dan fail di Google Drive milik akaun pentadbir, tidak dikongsi dengan pengguna.</li>
          <li>Maklumat awam ialah output terkawal yang diterbitkan SUAK; akses terus kepada rekod dalaman tidak disediakan.</li>
          <li>Tindakan kritikal direkodkan dalam log audit.</li>
        </ul>
      </div>
    </PublicPage>
  )
}
