import { describe, expect, it } from 'vitest'
import { summariseAttendance } from '@shared/attendance'
import { toCsv } from '@shared/csv'
import { base64Bytes, isBase64, safeFileName } from '@shared/files'
import { formatReference, validatePattern } from '@shared/reference-format'
import { escapeHtml, extractPlaceholders, parseFields, renderPlain, textToHtml } from '@shared/template-render'

describe('reference format', () => {
  it('formats from configuration only', () => {
    expect(formatReference({ prefix: 'AAA', pattern: '{PREFIX}/{SEQ}/{YEAR}', year: 2027, sequence: 7, padding: 3 })).toBe('AAA/007/2027')
    expect(formatReference({ prefix: '', pattern: '{SEQ}', year: 2027, sequence: 1234, padding: 2 })).toBe('1234')
  })
  it('requires {SEQ} and known tokens', () => {
    expect(validatePattern('{PREFIX}/{YEAR}')).toMatch(/SEQ/)
    expect(validatePattern('{SEQ}/{FOO}')).toMatch(/FOO/)
    expect(validatePattern('{PREFIX}/{SEQ}/{YEAR}')).toBeNull()
    expect(validatePattern('')).not.toBeNull()
  })
})

describe('attendance summary', () => {
  it('counts late as attended by default but reports it separately', () => {
    const s = summariseAttendance(['present', 'late', 'excused', 'absent_without_reason'])
    expect(s).toMatchObject({ present: 1, late: 1, attended: 2, eligible: 4, percent: 50 })
  })
  it('can exclude late from attended', () => {
    expect(summariseAttendance(['present', 'late'], false)).toMatchObject({ attended: 1, eligible: 2, percent: 50 })
  })
  it('keeps exempted and pending out of the denominator', () => {
    const s = summariseAttendance(['present', 'exempted', 'pending'])
    expect(s).toMatchObject({ eligible: 1, percent: 100, exempted: 1, pending: 1 })
  })
  it('has no percentage without eligible meetings', () => {
    expect(summariseAttendance(['exempted']).percent).toBeNull()
    expect(summariseAttendance([]).percent).toBeNull()
  })
})

describe('templates', () => {
  it('finds and fills placeholders, leaving unknown ones empty', () => {
    expect(extractPlaceholders('A {{ nama }} B {{rujukan}} {{nama}}')).toEqual(['nama', 'rujukan'])
    expect(renderPlain('Hi {{nama}} {{x}}', { nama: 'Ali' })).toBe('Hi Ali ')
  })
  it('escapes HTML and keeps paragraphs', () => {
    expect(escapeHtml('<b>"x"&\'')).toBe('&lt;b&gt;&quot;x&quot;&amp;&#39;')
    expect(textToHtml('a<script>\nb\n\nc')).toBe('<p>a&lt;script&gt;<br>b</p><p>c</p>')
  })
  it('parses only well-formed field definitions', () => {
    expect(parseFields('[{"key":"nama","label":"Nama"},{"key":"Bad Key","label":"x"},5]')).toEqual([{ key: 'nama', label: 'Nama', required: true, type: 'text', max: undefined }])
    expect(parseFields('nope')).toEqual([])
  })
})

describe('csv and files', () => {
  it('quotes cells and neutralises formulas', () => {
    expect(toCsv(['a', 'b'], [['x,y', '=HYPERLINK("e")'], ['say "hi"', 5]])).toBe('﻿a,b\r\n"x,y","\'=HYPERLINK(""e"")"\r\n"say ""hi""",5\r\n')
  })
  it('measures base64 and sanitises names', () => {
    expect(base64Bytes(btoa('hello'))).toBe(5)
    expect(isBase64('aGVsbG8=')).toBe(true)
    expect(isBase64('not base64!')).toBe(false)
    expect(safeFileName('../../etc/passwd<>.pdf', 'x')).toBe('....etcpasswd.pdf')
    expect(safeFileName('   ', 'fallback')).toBe('fallback')
  })
})
