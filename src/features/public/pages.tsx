import { Archive, CalendarCheck2, FileStack, Megaphone, Users } from 'lucide-react'
import { PublicPage } from './public-page'

export function AboutPage() {
  return (
    <PublicPage
      eyebrow="Mengenai JPP"
      title="Jawatankuasa Perwakilan Pelajar"
      description="Profil, fungsi, struktur organisasi dan senarai kepimpinan sesi aktif."
      emptyIcon={Users}
      emptyTitle="Profil organisasi belum diterbitkan"
      emptyDescription="Kandungan rasmi akan dipaparkan selepas disediakan dan disahkan oleh SUAK."
    />
  )
}

export function AttendancePage() {
  return (
    <PublicPage
      eyebrow="Kehadiran"
      title="Rekod kehadiran mesyuarat"
      description="Senarai mesyuarat yang diterbitkan, rekod kehadiran yang disahkan dan statistik."
      emptyIcon={CalendarCheck2}
      emptyTitle="Belum ada rekod kehadiran yang diterbitkan"
      emptyDescription="Hanya nama, jawatan/biro, status kehadiran dan statistik yang disahkan akan dipaparkan. Alasan peribadi tidak sekali-kali diterbitkan."
    />
  )
}

export function AnnouncementsPage() {
  return (
    <PublicPage
      eyebrow="Pengumuman"
      title="Notis awam & makluman rasmi"
      description="Hebahan dan makluman yang telah diluluskan untuk paparan awam."
      emptyIcon={Megaphone}
      emptyTitle="Belum ada pengumuman"
      emptyDescription="Pengumuman akan dipaparkan di sini selepas diterbitkan."
    />
  )
}

export function PublicTemplatesPage() {
  return (
    <PublicPage
      eyebrow="Pusat Templat"
      title="Templat dokumen awam"
      description="Templat yang ditandakan Public dan boleh dimuat turun."
      emptyIcon={FileStack}
      emptyTitle="Belum ada templat awam"
      emptyDescription="Templat perlu disemak sebelum digunakan. Templat rasmi akan disenaraikan selepas diluluskan."
    />
  )
}

export function PublicArchivePage() {
  return (
    <PublicPage
      eyebrow="Arkib Awam"
      title="Dokumen yang diluluskan untuk penerbitan"
      description="Dokumen dalaman tidak menjadi awam hanya kerana mempunyai URL — setiap penerbitan melalui kelulusan."
      emptyIcon={Archive}
      emptyTitle="Belum ada dokumen awam"
      emptyDescription="Dokumen akan muncul di sini selepas melalui proses penerbitan yang berasingan."
    />
  )
}
