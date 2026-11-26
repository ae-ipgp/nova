# Mascot "Nuri"

Static PNG poses and expressions only (no animation or video). The name is a single constant,
`MASCOT_NAME` in `src/config/mascot.ts`; change it there if you prefer another.

## How to add the images

1. Name each file exactly as in the table and put it in `public/mascot/`
   (transparent background, ideally 1024–2048 px, optimised; the site shows them at 64–420 px).
2. Run `npm run mascot:check` to see what is present and what is still missing.
3. Commit and deploy. Missing files are skipped: the site shows the NoVA monogram or an icon
   instead, so you can add images in batches (for example 5 at a time) without breaking anything.

Start with the three that appear most: `wave`, `avatar`, `shrug`.

## Poses (`nuri-<pose>.png`)

| File | Pose | Appears in |
|---|---|---|
| `nuri-wave.png` | Waving hello | Landing hero |
| `nuri-avatar.png` | Head in a circle (64 px) | Help bubble button |
| `nuri-shrug.png` | Shrugging | 404 page |
| `nuri-shield.png` | Shield and key | Login, Semak Keaslian |
| `nuri-book.png` | Holding an open book, smiling | Mengenai JPP, Templat (empty) |
| `nuri-search.png` | Magnifying glass | e-Arkib, Arkib Awam (no results) |
| `nuri-calendar.png` | Pointing at a calendar | e-Mesyuarat (none upcoming), dashboard |
| `nuri-checklist.png` | Ticking a checklist | Public attendance (empty) |
| `nuri-writing.png` | Writing a report | e-OPR (empty) |
| `nuri-plane.png` | Paper plane / envelope | NoMe (empty) |
| `nuri-thumbsup.png` | Thumbs up | Dashboard "no pending actions" |
| `nuri-sleeping.png` | Asleep on papers, "zzz" | Empty lists (e-Surat, Papan Notis, Pengumuman) |
| `nuri-construction.png` | Hard hat | Series not configured, data not available |
| `nuri-stamp.png` | Stamping a paper | *(reserved: approval moments)* |
| `nuri-sorry.png` | Gentle apology | *(reserved: rejections)* |
| `nuri-waiting.png` | Hourglass | *(reserved: awaiting review)* |
| `nuri-handover.png` | Passing a folder | *(reserved: session handover)* |
| `nuri-celebrate.png` | Celebrating | *(reserved)* |
| `nuri-bow.png` | Small bow | *(reserved: sign-out)* |

## Expressions (`nuri-face-<expression>.png`, head only)

`neutral`, `happy` (used in the help panel header), `wink`, `focused`, `worried`, `surprised`,
`sleepy`, `proud`.

## Design rules

- Illustrations stay out of dense screens (tables, forms, the A4 report preview). They appear on
  the landing page, empty states, errors, loading/maintenance notices and the help bubble.
- Images are decorative (`alt=""`); the text always carries the meaning.
- Leave stamp faces, signs and speech bubbles blank: any wording is added by the interface.
