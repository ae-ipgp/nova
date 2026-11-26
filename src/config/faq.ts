/**
 * Help-bubble content. Only facts about how NoVA itself works — never institutional policy,
 * deadlines or eligibility (those are SUAK's to publish, Blueprint §16). Answers are written, not AI-generated.
 */
export interface FaqItem {
  q: string
  a: string
  to?: { href: string; label: string }
}

export const FAQ: readonly FaqItem[] = [
  { q: 'Bagaimana saya log masuk?', a: 'Tekan "Log masuk dengan DELIMa" dan gunakan akaun DELIMa anda (@moe-dl.edu.my). Akaun peribadi seperti Gmail tidak diterima.', to: { href: '/log-masuk', label: 'Ke halaman log masuk' } },
  { q: 'Saya log masuk tetapi tiada akses.', a: 'Akaun anda perlu didaftarkan oleh SUAK terlebih dahulu. Hubungi Sekretariat dan berikan e-mel DELIMa anda.' },
  { q: 'Bilakah nombor rujukan rasmi dikeluarkan?', a: 'Hanya selepas SUAK meluluskan permohonan anda. Selepas permohonan dihantar, anda hanya menerima ID permohonan sementara (PRM-…) yang bukan nombor rasmi.' },
  { q: 'Bagaimana saya menyemak keaslian surat?', a: 'Masukkan nombor rujukan pada halaman Semak Keaslian. Sistem hanya mengesahkan sama ada nombor itu wujud dan sah.', to: { href: '/semak', label: 'Semak keaslian' } },
  { q: 'Di mana saya boleh memuat turun templat?', a: 'Templat awam tersedia di Pusat Templat. Templat dalaman boleh didapati selepas log masuk. Semak templat sebelum menggunakannya.', to: { href: '/templat', label: 'Pusat Templat' } },
  { q: 'Mengapa permohonan saya ditolak?', a: 'SUAK wajib menulis sebab penolakan. Buka permohonan anda di e-Surat untuk membaca sebabnya, kemudian hantar permohonan baharu jika perlu.' },
  { q: 'Adakah rekod kehadiran saya dipaparkan kepada umum?', a: 'Hanya selepas disahkan dan diterbitkan oleh SUAK. Alasan peribadi ketidakhadiran tidak sekali-kali dipaparkan.', to: { href: '/kehadiran', label: 'Kehadiran awam' } },
  { q: 'Apa yang perlu dilakukan jika laman tidak dapat dibuka?', a: 'Cuba muat semula halaman. Jika masalah berterusan, hubungi Sekretariat menggunakan maklumat perhubungan di bahagian bawah laman.' },
]
