# Mascot images

Put the mascot PNG files here (transparent background, ideally 1024–2048 px, optimised).

Naming: `nuri-<pose>.png` and `nuri-face-<expression>.png`. Run `npm run mascot:check` to see what is
still missing. The complete list with where each pose is used is in `docs/MASCOT.md`.
Missing files are skipped gracefully; the site shows the NoVA monogram instead.
