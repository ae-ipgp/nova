#!/usr/bin/env node
/**
 * NO.VA i18n tooling (Malay is the source language; English lives in src/i18n/en/*.ts).
 *
 *   node scripts/i18n.mjs list            list every translatable message found in src/ (JSON on stdout)
 *   node scripts/i18n.mjs missing         messages that have no English entry (JSON)
 *   node scripts/i18n.mjs wrap [--write]  wrap bare Malay JSX text / attributes / literals in t() (dry-run unless --write)
 *
 * Uses the TypeScript compiler API, so formatting of untouched code is preserved byte-for-byte.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'ts-parser'

const ROOT = new URL('..', import.meta.url).pathname
const showUnwrapped = process.argv.includes('--unwrapped')
const unwrappedFound = []
const SRC = join(ROOT, 'src')

/** Attributes whose string value is shown to people. */
export const ATTRS = new Set(['legend', 'label', 'title', 'placeholder', 'aria-label', 'aria-description', 'description', 'hint', 'alt', 'confirmLabel', 'reasonLabel', 'eyebrow', 'error', 'summary', 'helper'])
/** Object keys whose string value is shown to people. */
export const KEYS = new Set(['title', 'description', 'label', 'message', 'placeholder', 'hint', 'confirmLabel', 'reasonLabel', 'eyebrow', 'summary', 'text', 'name', 'error'])
const NO_TRANSLATE_TAGS = new Set(['kbd', 'code', 'style', 'script', 'svg', 'path'])
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', middot: '·', mdash: '—', ndash: '–', hellip: '…', copy: '©' }

const decode = (s) => s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENTITIES[e] ?? m)))
const norm = (s) => s.replace(/\s+/g, ' ').trim()
const hasWords = (s) => /[A-Za-z]{2,}/.test(s)
const esc = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === 'i18n') continue
      walk(p, out)
    } else if (/\.(ts|tsx)$/.test(name) && !/\.d\.ts$/.test(name)) out.push(p)
  }
  return out
}

const isFn = (n) => ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n)
const insideFunction = (n) => {
  for (let p = n.parent; p; p = p.parent) if (isFn(p)) return true
  return false
}
const insideJsx = (n) => {
  for (let p = n.parent; p; p = p.parent) {
    if (ts.isJsxExpression(p) || ts.isJsxAttribute(p)) return true
    if (isFn(p) && !ts.isJsxExpression(p.parent ?? p)) { /* keep climbing: callbacks are usually still inside JSX */ }
  }
  return false
}
/** True when the literal sits in a className / cn() / clsx() / cva() context (Tailwind classes are never translated). */
const inClassContext = (n) => {
  for (let p = n.parent; p; p = p.parent) {
    if (ts.isJsxAttribute(p)) return /^(className|class)$/.test(p.name.getText())
    if (ts.isCallExpression(p) && /^(cn|clsx|cva|twMerge)$/.test(p.expression.getText())) return true
    if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || isFn(p)) return false
  }
  return false
}
const inKeysProperty = (n) => {
  for (let p = n.parent; p; p = p.parent) {
    if (ts.isConditionalExpression(p) || ts.isBinaryExpression(p) || ts.isParenthesizedExpression(p)) continue
    return ts.isPropertyAssignment(p) && KEYS.has(p.name.getText())
  }
  return false
}
const tagName = (el) => (ts.isJsxElement(el) ? el.openingElement.tagName.getText() : ts.isJsxSelfClosingElement(el) ? el.tagName.getText() : '')
const calleeText = (n) => (ts.isCallExpression(n) ? n.expression.getText() : '')

/** Returns edits and found messages for one file. */
function scan(file) {
  const text = readFileSync(file, 'utf8')
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const edits = []
  const found = [] // { msg, kind, line }
  const manual = [] // spots the codemod will not touch
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1
  const wrapped = new Set()

  const add = (msg, kind, n, edit) => {
    found.push({ msg, kind, line: line(n) })
    if (edit) edits.push(edit)
  }

  const visit = (n) => {
    // Already wrapped: t('...') / tx('...')
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 't' && n.arguments[0] && ts.isStringLiteralLike(n.arguments[0])) {
      found.push({ msg: n.arguments[0].text, kind: 't()', line: line(n) })
      wrapped.add(n.arguments[0])
    }

    if (ts.isJsxText(n)) {
      const parent = n.parent
      if (NO_TRANSLATE_TAGS.has(tagName(parent))) return
      const raw = n.getText(sf)
      const msg = norm(decode(raw))
      if (!msg || !hasWords(msg)) return
      const siblings = parent.children ?? []
      const idx = siblings.indexOf(n)
      const prev = siblings[idx - 1]
      // A sentence continued after an expression or element ("… {x} penerima") cannot be translated in pieces.
      const continues = prev && !ts.isJsxText(prev) && /^[a-z(]/.test(msg) && !/^\s*\n/.test(raw)
      if (continues) {
        manual.push({ msg, kind: 'mixed', line: line(n) })
        found.push({ msg, kind: 'mixed', line: line(n) })
        return
      }
      const lead = raw.match(/^\s*/)[0]
      const trail = raw.match(/\s*$/)[0]
      add(msg, 'text', n, { start: n.getStart(sf), end: n.getEnd(), replace: `${lead}{t(${esc(msg)})}${trail}` })
      return
    }

    if (ts.isJsxAttribute(n) && n.initializer && ts.isStringLiteral(n.initializer) && ATTRS.has(n.name.getText())) {
      const msg = norm(n.initializer.text)
      if (msg && hasWords(msg)) add(msg, 'attr', n, { start: n.initializer.getStart(sf), end: n.initializer.getEnd(), replace: `{t(${esc(msg)})}` })
      return
    }

    if (ts.isTemplateExpression(n) && !(n.parent && ts.isTaggedTemplateExpression(n.parent)) && !inClassContext(n)) {
      const statics = [n.head.text, ...n.templateSpans.map((sp) => sp.literal.text)]
      const joined = statics.join(' ')
      if (/[A-Za-z]{3,}/.test(joined) && /\s/.test(statics.join('')) && !/^[/.#?&=]/.test(n.head.text)) {
        const names = []
        const vars = []
        const used = new Set()
        n.templateSpans.forEach((sp, i) => {
          const ex = sp.expression
          let base = ts.isIdentifier(ex) ? ex.text : ts.isPropertyAccessExpression(ex) ? ex.name.text : ts.isNonNullExpression(ex) && ts.isPropertyAccessExpression(ex.expression) ? ex.expression.name.text : `v${i + 1}`
          let name = base
          for (let k = 2; used.has(name); k++) name = base + k
          used.add(name)
          names.push(name)
          const code = ex.getText(sf)
          vars.push(`${name}: ${/(_LABELS|_UI)\[|\.label$|\.name$/.test(code) && /(_LABELS|_UI)\[|\.label$/.test(code) ? `t(${code})` : code}`)
        })
        const msg = statics.reduce((acc, st, i) => acc + st + (i < names.length ? `{${names[i]}}` : ''), '')
        const norm1 = norm(msg)
        add(norm1, 'tpl', n, { start: n.getStart(sf), end: n.getEnd(), replace: `t(${esc(norm1)}, { ${vars.join(', ')} })` })
        return
      }
    }
    if (ts.isStringLiteralLike(n) && !wrapped.has(n) && !ts.isJsxAttribute(n.parent) && !ts.isImportDeclaration(n.parent) && !ts.isExternalModuleReference(n.parent)) {
      const p = n.parent
      const msg = norm(n.text)
      if (msg && hasWords(msg) && /\s|^[A-Z]/.test(msg) && !/^[A-Z][A-Z0-9_]+$/.test(msg)) {
        // toast.success('…') / toast.error('…') / toast.info('…')
        if (ts.isCallExpression(p) && /^toast\.(success|error|info|warning)$/.test(calleeText(p)) && p.arguments[0] === n) {
          add(msg, 'toast', n, { start: n.getStart(sf), end: n.getEnd(), replace: `t(${esc(msg)})` })
          return
        }
        // setError('…'), new Error('…'), new ApiError(…, '…')
        if (insideFunction(n) && ((ts.isCallExpression(p) && /^(setError|set[A-Z]\w*Error|Error)$/.test(p.expression.getText()) && p.arguments.includes(n)) || (ts.isNewExpression(p) && /Error$/.test(p.expression.getText()) && (p.arguments ?? []).includes(n)))) {
          if (!/main\.tsx$/.test(file)) add(msg, 'error', n, { start: n.getStart(sf), end: n.getEnd(), replace: `t(${esc(msg)})` })
          return
        }
        // { title: '…' } style props
        if (ts.isPropertyAssignment(p) && p.initializer === n && KEYS.has(p.name.getText()) && !(/config\/modules\.ts$/.test(file) && p.name.getText() === 'text')) {
          const fn = insideFunction(n)
          add(msg, fn ? 'prop' : 'prop-module', n, fn ? { start: n.getStart(sf), end: n.getEnd(), replace: `t(${esc(msg)})` } : null)
          if (!fn) manual.push({ msg, kind: 'prop-module', line: line(n) })
          return
        }
        // cond ? 'A' : 'B'   and   x || 'A'   rendered in JSX
        if ((ts.isConditionalExpression(p) && (p.whenTrue === n || p.whenFalse === n)) || (ts.isBinaryExpression(p) && p.right === n && ['||', '??'].includes(p.operatorToken.getText()))) {
          if ((insideJsx(n) || inKeysProperty(n)) && insideFunction(n) && !inClassContext(n)) {
            add(msg, 'expr', n, { start: n.getStart(sf), end: n.getEnd(), replace: `t(${esc(msg)})` })
            return
          }
        }
        // ['Label', value] rows of <DetailList items={[…]}>: translated by the component at render time
        if (ts.isArrayLiteralExpression(p) && p.elements[0] === n && p.elements.length === 2) {
          for (let a = p.parent; a; a = a.parent) {
            if (ts.isJsxAttribute(a)) {
              if (a.name.getText() === 'items' && /DetailList$/.test(a.parent.parent.getText().slice(1, 12).split(/[\s>]/)[0] ?? '')) {
                found.push({ msg, kind: 'detail', line: line(n) })
                return
              }
              break
            }
          }
        }
      }
    }
    if (showUnwrapped && ts.isStringLiteralLike(n) && !wrapped.has(n) && !ts.isImportDeclaration(n.parent) && !inClassContext(n)) {
      const msg = norm(n.text)
      const p = n.parent
      const inT = ts.isCallExpression(p) && p.expression.getText() === 't'
      if (!inT && hasWords(msg) && /\s/.test(msg) && !/^[a-z][\w-]*(\s[\w:/.[\]%-]+)*$/.test(msg) && !/^(https?:|\/|@|#|\.|\w+:)/.test(msg)) unwrappedFound.push(`${relative(ROOT, file)}:${line(n)}  ${msg.slice(0, 110)}`)
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return { text, edits, found, manual }
}

/** Label tables read by shared components or helpers at render time (not wrapped in t() where they are declared). */
function tableMessages() {
  const out = new Set()
  const sources = [
    ['src/lib/audit-labels.ts', null],
    ['src/config/faq.ts', null],
    ['src/config/site.ts', null],
    ['src/config/modules.ts', null],
    ['src/features/administration/labels.ts', null],
    ['shared/domain.ts', /_LABELS?$/],
  ]
  for (const [rel, nameRe] of sources) {
    const file = join(ROOT, rel)
    const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
    const visit = (n) => {
      if (ts.isStringLiteralLike(n) && ts.isPropertyAssignment(n.parent) && n.parent.initializer === n) {
        let decl = n.parent
        while (decl && !ts.isVariableDeclaration(decl)) decl = decl.parent
        const name = decl?.name?.getText() ?? ''
        const key = n.parent.name.getText()
        const msg = norm(n.text)
        const wanted = nameRe ? nameRe.test(name) : true
        const skipKey = /^(to|href|icon|slug|code|phase|id|status|tone|kind|key|pose|navRoles|priority|email|domain)$/.test(key)
        if (wanted && !skipKey && hasWords(msg) && (/\s/.test(msg) || /^[A-Z]/.test(msg)) && !/^(https?:|\/|@)/.test(msg)) {
          if (rel.endsWith('modules.ts') && ts.isObjectLiteralExpression(n.parent.parent) && !['name', 'summary'].includes(key)) {
            /* requirement texts are specification references, not UI copy */
          } else out.add(msg)
        }
      }
      ts.forEachChild(n, visit)
    }
    visit(sf)
  }
  return [...out]
}

/** Malay messages the gateway sends back (backend/src). Placeholders are named after the interpolated value. */
function serverMessages() {
  const out = new Set()
  const dir = join(ROOT, 'backend', 'src')
  const walkTs = (d, o = []) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) walkTs(p, o)
      else if (/\.ts$/.test(n)) o.push(p)
    }
    return o
  }
  for (const f of walkTs(dir)) {
    const sf = ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true)
    const v = (n) => {
      if (ts.isCallExpression(n) && /^(badRequest|forbidden|notFound|conflict|busy|unauthenticated|httpError)$/.test(n.expression.getText())) {
        for (const a of n.arguments) {
          if (ts.isStringLiteralLike(a)) {
            if (/\s/.test(a.text)) out.add(norm(a.text))
          } else if (ts.isTemplateExpression(a)) {
            const used = new Set()
            const name = (ex, i) => {
              const ids = ex.getText().match(/[A-Za-z_]\w*/g) ?? []
              let base = (ids.filter((x) => !['length', 'size', 'toLocaleString', 'join', 'map', 'slice'].includes(x)).pop() ?? `v${i + 1}`).replace(/[A-Z_]{3,}/g, (m) => m.toLowerCase())
              let nm = base
              for (let k = 2; used.has(nm); k++) nm = base + k
              used.add(nm)
              return nm
            }
            const parts = [a.head.text, ...a.templateSpans.map((sp) => sp.literal.text)]
            out.add(norm(parts.reduce((acc, st, i) => acc + st + (i < a.templateSpans.length ? `{${name(a.templateSpans[i].expression, i)}}` : ''), '')))
          }
        }
      }
      ts.forEachChild(n, v)
    }
    v(sf)
  }
  return [...out].filter((m) => hasWords(m))
}

function applyEdits(text, edits) {
  const sorted = [...edits].sort((a, b) => b.start - a.start)
  let out = text
  for (const e of sorted) out = out.slice(0, e.start) + e.replace + out.slice(e.end)
  return out
}

function ensureImport(text) {
  if (/from '@\/i18n'/.test(text)) return text
  // after the last import statement
  const re = /^import[\s\S]*?from\s+['"][^'"]+['"]\n/gm
  let last = 0
  for (const m of text.matchAll(re)) last = m.index + m[0].length
  return text.slice(0, last) + "import { t } from '@/i18n'\n" + text.slice(last)
}

async function loadDictionary() {
  const dir = join(SRC, 'i18n', 'en')
  const dict = {}
  try {
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
      const src = readFileSync(join(dir, f), 'utf8')
      const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true)
      const visit = (n) => {
        if (ts.isPropertyAssignment(n) && (ts.isStringLiteralLike(n.name) || ts.isIdentifier(n.name)) && ts.isStringLiteralLike(n.initializer)) dict[n.name.text] = n.initializer.text
        ts.forEachChild(n, visit)
      }
      visit(sf)
    }
  } catch {
    /* no dictionary yet */
  }
  return dict
}

const mode = process.argv[2] ?? 'list'
const showTpl = process.argv.includes('--tpl')
const write = process.argv.includes('--write')
const files = walk(SRC)
const all = []
let changed = 0
for (const f of files) {
  const { text, edits, found, manual } = scan(f)
  const rel = relative(ROOT, f)
  for (const x of found) all.push({ ...x, file: rel })
  if (showTpl) for (const x of found.filter((y) => y.kind === 'tpl')) console.log(`${rel}:${x.line}  ${x.msg}`)
  if (mode === 'wrap') {
    if (manual.length) for (const m of manual) console.error(`MANUAL ${rel}:${m.line} [${m.kind}] ${m.msg}`)
    if (edits.length) {
      changed++
      if (write) writeFileSync(f, ensureImport(applyEdits(text, edits)))
    }
  }
}
if (mode === 'wrap') console.error(`${changed} file(s) ${write ? 'rewritten' : 'would change'}; ${all.filter((x) => x.kind !== 't()').length} edits`)
else if (mode === 'list') console.log(JSON.stringify([...new Set([...all.map((x) => x.msg), ...serverMessages(), ...tableMessages()])].sort(), null, 1))
else if (mode === 'missing') {
  const dict = await loadDictionary()
  const missing = [...new Set([...all.map((x) => x.msg), ...serverMessages(), ...tableMessages()])].filter((m) => !(m in dict)).sort()
  console.log(JSON.stringify(missing, null, 1))
}

if (showUnwrapped) console.log(unwrappedFound.join('\n'))
