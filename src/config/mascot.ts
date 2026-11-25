/**
 * Mascot "Nuri" — static PNG poses and expressions only (no animation/video).
 * Files live in /public/mascot/ named `nuri-<pose>.png` and `nuri-face-<expression>.png`.
 * Until a file exists the UI falls back to the NO.VA monogram/icon, so nothing breaks
 * while images are being added. Rename the mascot in one place: MASCOT_NAME.
 */
export const MASCOT_NAME = 'Nuri'

export const MASCOT_POSES = {
  wave: 'Melambai — sambutan (hero, log masuk)',
  book: 'Memegang buku sambil tersenyum (Mengenai, Templat)',
  stamp: 'Mengecop kelulusan (nombor rujukan diluluskan)',
  sorry: 'Memohon maaf, lembut (permohonan ditolak)',
  plane: 'Kapal terbang kertas / sampul (NoMe dihantar)',
  search: 'Kanta pembesar (carian, tiada hasil)',
  calendar: 'Menunjuk kalendar (mesyuarat akan datang)',
  checklist: 'Menanda senarai semak (kehadiran disahkan)',
  waiting: 'Jam pasir (menunggu semakan)',
  construction: 'Topi keledar (akan datang, penyelenggaraan)',
  shrug: 'Mengangkat bahu (halaman tidak ditemui)',
  shield: 'Perisai dan kunci (log masuk, keselamatan)',
  writing: 'Menulis laporan (e-OPR)',
  handover: 'Menyerahkan fail (serah tugas sesi)',
  thumbsup: 'Ibu jari ke atas (berjaya)',
  celebrate: 'Meraikan (pencapaian)',
  sleeping: 'Tidur (kosong, tiada tugasan)',
  bow: 'Tunduk hormat (log keluar)',
  avatar: 'Kepala dalam bulatan (pembantu bantuan, 64 px)',
} as const
export type MascotPose = keyof typeof MASCOT_POSES

export const MASCOT_FACES = {
  neutral: 'Neutral',
  happy: 'Gembira',
  wink: 'Kenyit mata',
  focused: 'Fokus',
  worried: 'Risau',
  surprised: 'Terkejut',
  sleepy: 'Mengantuk',
  proud: 'Bangga',
} as const
export type MascotFace = keyof typeof MASCOT_FACES

export const poseFile = (pose: MascotPose): string => `/mascot/nuri-${pose}.png`
export const faceFile = (face: MascotFace): string => `/mascot/nuri-face-${face}.png`
export const ALL_MASCOT_FILES: string[] = [
  ...(Object.keys(MASCOT_POSES) as MascotPose[]).map((p) => `nuri-${p}.png`),
  ...(Object.keys(MASCOT_FACES) as MascotFace[]).map((f) => `nuri-face-${f}.png`),
]
