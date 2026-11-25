import {
  Archive,
  CalendarDays,
  FileStack,
  FileText,
  LayoutDashboard,
  Mail,
  Send,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import type { RoleKey } from '@/types/domain'

export type Priority = 'P0' | 'P1' | 'P2'

export interface Requirement {
  id: string
  text: string
  priority: Priority
}

export interface ModuleDefinition {
  /** Blueprint module code, e.g. M02. */
  code: `M0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`
  /** URL segment under /workspace (empty for the dashboard index). */
  slug: string
  name: string
  summary: string
  icon: LucideIcon
  /** Delivery phase in which this module is built (§13). */
  phase: number
  /**
   * Roles that see this module in navigation. UX only — real authorisation
   * is enforced by the Apps Script gateway on every action (Phase 1).
   */
  navRoles: readonly RoleKey[]
  requirements: readonly Requirement[]
}

const INTERNAL: readonly RoleKey[] = ['member', 'secretariat', 'suak', 'system_admin']

/**
 * The eight NO.VA modules (Blueprint §02, requirements §07).
 * This list drives the sidebar, routes and Phase placeholders.
 */
export const MODULES: readonly ModuleDefinition[] = [
  {
    code: 'M01',
    slug: '',
    name: 'Dashboard',
    summary: 'Ringkasan operasi, status dan akses pantas.',
    icon: LayoutDashboard,
    phase: 1,
    navRoles: INTERNAL,
    requirements: [
      { id: 'DASH-01', priority: 'P0', text: 'Paparkan dashboard berbeza bagi Public, Member, Secretariat dan SUAK.' },
      { id: 'DASH-02', priority: 'P0', text: 'Paparkan bilangan permohonan nombor rujukan mengikut status.' },
      { id: 'DASH-03', priority: 'P0', text: 'Paparkan mesyuarat akan datang dan tindakan tertunggak.' },
      { id: 'DASH-04', priority: 'P1', text: 'Paparkan aktiviti terkini yang dibenarkan untuk peranan pengguna.' },
      { id: 'DASH-05', priority: 'P1', text: 'Paparkan statistik surat, mesyuarat, OPR dan arkib.' },
      { id: 'DASH-06', priority: 'P1', text: 'Sediakan quick actions mengikut kebenaran.' },
      { id: 'DASH-07', priority: 'P0', text: 'Paparkan sesi JPP aktif dan tarikh konteks.' },
      { id: 'NTB-01', priority: 'P1', text: 'Papan Notis dalaman yang dikaitkan dengan Pengumuman awam; notis awam hanya diterbitkan SUAK. (Lanjutan — dipersetujui pemilik produk)' },
    ],
  },
  {
    code: 'M02',
    slug: 'e-surat',
    name: 'e-Surat',
    summary: 'Permohonan nombor rujukan, daftar surat masuk/keluar dan status.',
    icon: Mail,
    phase: 2,
    navRoles: INTERNAL.filter((r) => r !== 'system_admin'),
    requirements: [
      { id: 'LTR-01', priority: 'P0', text: 'Pengguna yang dibenarkan boleh menghantar permohonan nombor rujukan.' },
      { id: 'LTR-02', priority: 'P0', text: 'Permohonan menyimpan jenis surat, tujuan, penerima, tarikh, pemohon dan lampiran jika perlu.' },
      { id: 'LTR-03', priority: 'P0', text: 'Sistem memberikan ID permohonan sementara, bukan nombor rasmi.' },
      { id: 'LTR-04', priority: 'P0', text: 'SUAK boleh menyemak, meluluskan atau menolak dengan alasan.' },
      { id: 'LTR-05', priority: 'P0', text: 'Nombor rasmi hanya dijana selepas kelulusan dan secara atomik.' },
      { id: 'LTR-06', priority: 'P0', text: 'Nombor yang telah dikeluarkan tidak boleh digunakan semula atau dipadam.' },
      { id: 'LTR-07', priority: 'P0', text: 'Pembatalan mengekalkan nombor, status, alasan dan sejarah.' },
      { id: 'LTR-08', priority: 'P1', text: 'Sediakan daftar surat masuk dan surat keluar.' },
      { id: 'LTR-09', priority: 'P1', text: 'Carian berdasarkan nombor, tajuk, penerima, tarikh dan status.' },
      { id: 'LTR-10', priority: 'P2', text: 'Sediakan eksport daftar untuk tujuan pentadbiran.' },
      { id: 'LTR-11', priority: 'P1', text: 'Jana PDF surat atau sijil bernombor selepas kelulusan SUAK daripada templat yang ditakrifkan. (Lanjutan — dipersetujui pemilik produk)' },
      { id: 'LTR-12', priority: 'P1', text: 'Semakan keaslian awam bagi nombor rujukan (wujud/sah/dibatalkan sahaja). (Lanjutan)' },
    ],
  },
  {
    code: 'M03',
    slug: 'e-mesyuarat',
    name: 'e-Mesyuarat',
    summary: 'Jadual, agenda, minit, kehadiran, keputusan dan tindakan.',
    icon: CalendarDays,
    phase: 2,
    navRoles: INTERNAL.filter((r) => r !== 'system_admin'),
    requirements: [
      { id: 'MTG-01', priority: 'P0', text: 'Cipta mesyuarat dengan tajuk, jenis, tarikh, masa, lokasi/pautan dan penganjur.' },
      { id: 'MTG-02', priority: 'P0', text: 'Tetapkan senarai ahli yang dijemput/layak hadir berdasarkan sesi dan jawatan.' },
      { id: 'MTG-03', priority: 'P1', text: 'Sediakan agenda dengan item, pembentang dan dokumen sokongan.' },
      { id: 'MTG-04', priority: 'P0', text: 'Rekod kehadiran: hadir, lewat, bersebab, tanpa sebab, belum disahkan.' },
      { id: 'MTG-05', priority: 'P0', text: 'Simpan pengesah dan masa pengesahan kehadiran.' },
      { id: 'MTG-06', priority: 'P1', text: 'Sediakan minit mesyuarat dengan keputusan dan tindakan.' },
      { id: 'MTG-07', priority: 'P1', text: 'Setiap tindakan mempunyai pemilik, tarikh akhir dan status.' },
      { id: 'MTG-08', priority: 'P0', text: 'Paparan awam hanya menggunakan rekod yang telah diterbitkan SUAK.' },
      { id: 'MTG-09', priority: 'P1', text: 'Sokong pengecualian kelayakan hadir dengan sebab dan tempoh.' },
      { id: 'MTG-10', priority: 'P1', text: 'Kira peratus kehadiran dengan denominator yang jelas.' },
    ],
  },
  {
    code: 'M04',
    slug: 'nome',
    name: 'NoMe',
    summary: 'Penyediaan, semakan dan penghantaran notis melalui e-mel.',
    icon: Send,
    phase: 2,
    navRoles: ['secretariat', 'suak'],
    requirements: [
      { id: 'NME-01', priority: 'P0', text: 'Sediakan composer notis dengan tajuk, kandungan, tarikh/masa, lokasi dan lampiran/link.' },
      { id: 'NME-02', priority: 'P0', text: 'Pilih penerima berdasarkan kumpulan, jawatan atau individu.' },
      { id: 'NME-03', priority: 'P0', text: 'Paparkan pratonton e-mel sebelum penghantaran.' },
      { id: 'NME-04', priority: 'P0', text: 'Penghantaran memerlukan pengesahan SUAK atau delegasi yang jelas.' },
      { id: 'NME-05', priority: 'P1', text: 'Sokong penghantaran serta-merta dan jadual penghantaran.' },
      { id: 'NME-06', priority: 'P0', text: 'Rekod provider message ID, masa, status dan ralat.' },
      { id: 'NME-07', priority: 'P1', text: 'Sokong retry terkawal tanpa menghantar pendua secara tidak sengaja.' },
      { id: 'NME-08', priority: 'P1', text: 'Sediakan kategori NoMe: notis, peringatan, perubahan, pembatalan, edaran minit, pengumuman.' },
      { id: 'NME-09', priority: 'P0', text: 'Gunakan sender domain yang disahkan; jangan simpan API key di frontend.' },
    ],
  },
  {
    code: 'M05',
    slug: 'templat',
    name: 'Templat',
    summary: 'Pusat templat dokumen terkawal dan muat turun.',
    icon: FileStack,
    phase: 3,
    navRoles: INTERNAL.filter((r) => r !== 'system_admin'),
    requirements: [
      { id: 'TPL-01', priority: 'P0', text: 'Paparkan templat mengikut kategori dan tahap akses.' },
      { id: 'TPL-02', priority: 'P0', text: 'Sediakan pratonton dan muat turun fail.' },
      { id: 'TPL-03', priority: 'P1', text: 'Simpan versi, tarikh kemas kini, pemilik dan status aktif/arkib.' },
      { id: 'TPL-04', priority: 'P0', text: 'Hadkan pengurusan templat kepada SUAK/pengguna yang diberi kuasa.' },
      { id: 'TPL-05', priority: 'P1', text: 'Sediakan templat surat jemputan, permohonan perasmi, dana, penghargaan, notis, agenda dan minit.' },
      { id: 'TPL-06', priority: 'P0', text: 'Sediakan label jelas bahawa templat perlu disemak sebelum digunakan.' },
      { id: 'TPL-07', priority: 'P2', text: 'Fasa lanjutan: Smart Document Generator menggunakan medan borang.' },
    ],
  },
  {
    code: 'M06',
    slug: 'e-opr',
    name: 'e-OPR',
    summary: 'Pembinaan, pratonton, pengesahan dan eksport laporan program.',
    icon: FileText,
    phase: 3,
    navRoles: INTERNAL.filter((r) => r !== 'system_admin'),
    requirements: [
      { id: 'OPR-01', priority: 'P0', text: 'Sediakan wizard berbahagian: identiti, penganjur, objektif, pelaksanaan, peserta, hasil, gambar, penambahbaikan.' },
      { id: 'OPR-02', priority: 'P0', text: 'Simpan draf secara selamat dan benarkan sambung kemudian.' },
      { id: 'OPR-03', priority: 'P0', text: 'Pratonton A4 sebelum eksport.' },
      { id: 'OPR-04', priority: 'P0', text: 'Jana PDF satu halaman dengan pemotongan/saiz imej terkawal.' },
      { id: 'OPR-05', priority: 'P1', text: 'Sediakan gaya Corporate, Editorial dan Infographic yang masih mematuhi identiti NO.VA.' },
      { id: 'OPR-06', priority: 'P0', text: 'Sediakan semakan/pengesahan sebelum status rasmi.' },
      { id: 'OPR-07', priority: 'P1', text: 'Rekod versi dan sejarah perubahan.' },
      { id: 'OPR-08', priority: 'P0', text: 'Simpan salinan akhir ke e-Arkib dengan metadata.' },
    ],
  },
  {
    code: 'M07',
    slug: 'e-arkib',
    name: 'e-Arkib',
    summary: 'Carian, penyimpanan dan pengambilan dokumen.',
    icon: Archive,
    phase: 3,
    navRoles: INTERNAL.filter((r) => r !== 'system_admin'),
    requirements: [
      { id: 'ARC-01', priority: 'P0', text: 'Simpan metadata dokumen: tajuk, kategori, tarikh, sesi, pemilik, status akses.' },
      { id: 'ARC-02', priority: 'P0', text: 'Simpan fail dalam storage bucket peribadi secara default.' },
      { id: 'ARC-03', priority: 'P0', text: 'Sediakan carian tajuk, nombor rujukan, kategori dan julat tarikh.' },
      { id: 'ARC-04', priority: 'P1', text: 'Sediakan penapis mengikut sesi, modul, status dan akses.' },
      { id: 'ARC-05', priority: 'P0', text: 'Benarkan muat turun hanya selepas pemeriksaan kebenaran.' },
      { id: 'ARC-06', priority: 'P0', text: 'Sokong dokumen awam melalui proses publish yang berasingan.' },
      { id: 'ARC-07', priority: 'P1', text: 'Simpan versi dan rekod arkib; jangan hard-delete rekod rasmi.' },
      { id: 'ARC-08', priority: 'P1', text: 'Sediakan eksport metadata dan proses serah tugas.' },
    ],
  },
  {
    code: 'M08',
    slug: 'pengurusan',
    name: 'Pengurusan',
    summary: 'Pengguna, peranan, konfigurasi, kelulusan dan audit.',
    icon: ShieldCheck,
    phase: 5,
    navRoles: ['suak', 'system_admin'],
    requirements: [
      { id: 'ADM-01', priority: 'P0', text: 'SUAK boleh mengundang, mengaktifkan, menggantung dan menyahaktifkan akaun.' },
      { id: 'ADM-02', priority: 'P0', text: 'SUAK boleh memberikan peranan berdasarkan senarai peranan yang dibenarkan.' },
      { id: 'ADM-03', priority: 'P0', text: 'Urus sesi JPP, jawatan, biro dan ahli.' },
      { id: 'ADM-04', priority: 'P0', text: 'Urus kategori surat, konfigurasi format nombor dan templat.' },
      { id: 'ADM-05', priority: 'P1', text: 'Urus penerima e-mel dan kumpulan penerima.' },
      { id: 'ADM-06', priority: 'P0', text: 'Sediakan audit log untuk tindakan kritikal.' },
      { id: 'ADM-07', priority: 'P1', text: 'Sediakan pengurusan pengumuman dan status penerbitan.' },
      { id: 'ADM-08', priority: 'P1', text: 'Sediakan export data dan laporan pentadbiran.' },
      { id: 'ADM-09', priority: 'P0', text: 'Sediakan tetapan sistem yang tidak mendedahkan rahsia teknikal.' },
    ],
  },
] as const

export function workspacePath(module: Pick<ModuleDefinition, 'slug'>): string {
  return module.slug ? `/workspace/${module.slug}` : '/workspace'
}

export function findModule(slug: string): ModuleDefinition | undefined {
  return MODULES.find((m) => m.slug === slug)
}
