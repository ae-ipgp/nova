// Lists which mascot images are present in public/mascot and which are still missing.
// Run: npm run mascot:check
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dir = join(here, '..', 'public', 'mascot')
const poses = ['wave', 'book', 'stamp', 'sorry', 'plane', 'search', 'calendar', 'checklist', 'waiting', 'construction', 'shrug', 'shield', 'writing', 'handover', 'thumbsup', 'celebrate', 'sleeping', 'bow', 'avatar']
const faces = ['neutral', 'happy', 'wink', 'focused', 'worried', 'surprised', 'sleepy', 'proud']
const expected = [...poses.map((p) => `nuri-${p}.png`), ...faces.map((f) => `nuri-face-${f}.png`)]
const present = expected.filter((f) => existsSync(join(dir, f)))
const missing = expected.filter((f) => !present.includes(f))
const extra = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.png') && !expected.includes(f)) : []
console.log(`Present: ${present.length}/${expected.length}`)
if (missing.length) console.log('Missing:\n  ' + missing.join('\n  '))
if (extra.length) console.log('Unrecognised PNG names (will not be used):\n  ' + extra.join('\n  '))
