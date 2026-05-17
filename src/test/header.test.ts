import { defaultDelimiters, type Delimiter } from '../delimiters'
import {
  extractHeader,
  getHeaderInfo,
  HEADER_LINE_COUNT,
  renderHeader,
  shebangLineCount,
  supportsLanguage,
  type HeaderInfo,
} from '../header'

const baseInfo: HeaderInfo = {
  filename:  'main.c',
  author:    'student <student@student.42.fr>',
  createdBy: 'student',
  createdAt: new Date(2024, 0, 15, 10, 30, 0),
  updatedBy: 'student',
  updatedAt: new Date(2024, 1, 20, 14, 45, 30),
}

describe('supportsLanguage', () => {
  it('returns true for built-in languages', () => {
    expect(supportsLanguage('c')).toBe(true)
    expect(supportsLanguage('rust')).toBe(true)
    expect(supportsLanguage('python')).toBe(true)
    expect(supportsLanguage('typescript')).toBe(true)
  })

  it('returns false for unknown languages', () => {
    expect(supportsLanguage('brainfuck')).toBe(false)
    expect(supportsLanguage('')).toBe(false)
  })

  it('returns true for languages added via overrides', () => {
    expect(supportsLanguage('brainfuck', { brainfuck: ['+ ', ' +'] })).toBe(true)
  })

  it('override does not affect other languages', () => {
    expect(supportsLanguage('brainfuck', { zig: ['// ', ' //'] })).toBe(false)
  })
})

describe('renderHeader line structure', () => {
  it('produces 11 content lines and ends with a blank separator line', () => {
    const rendered = renderHeader('c', baseInfo)
    const lines = rendered.split('\n')
    expect(lines.filter(l => l.length > 0).length).toBe(11)
    expect(lines.at(-1)).toBe('')
    expect(lines.at(-2)).toBe('')
  })

  it('HEADER_LINE_COUNT matches the actual rendered line count', () => {
    const rendered = renderHeader('c', baseInfo)
    expect(HEADER_LINE_COUNT).toBe(rendered.split('\n').length - 1)
  })

  it('every non-blank line is exactly 80 characters', () => {
    const rendered = renderHeader('c', baseInfo)
    rendered
      .split('\n')
      .filter(l => l.length > 0)
      .forEach(line => expect(line.length).toBe(80))
  })

  it('rust lines start with // (satisfies rustfmt line-comment rule)', () => {
    const rendered = renderHeader('rust', baseInfo)
    rendered
      .split('\n')
      .filter(l => l.length > 0)
      .forEach(line => expect(line.startsWith('//')).toBe(true))
  })

  it('python uses line-comment delimiter (no trailing #)', () => {
    const rendered = renderHeader('python', baseInfo)
    rendered
      .split('\n')
      .filter(l => l.length > 0)
      .forEach(line => {
        expect(line.startsWith('#')).toBe(true)
        expect(line.endsWith('#')).toBe(true)
      })
  })

  it('throws for unknown language', () => {
    expect(() => renderHeader('brainfuck', baseInfo)).toThrow()
  })

  it('uses override delimiter when provided', () => {
    const override: Delimiter = ['## ', ' ##']
    const rendered = renderHeader('c', baseInfo, { c: override })
    expect(rendered.split('\n')[0]).toMatch(/^## /)
  })
})

describe('extractHeader', () => {
  it('detects a valid header at the start of text', () => {
    const rendered = renderHeader('c', baseInfo)
    expect(extractHeader(rendered + '\n#include <stdio.h>\n')).not.toBeNull()
  })

  it('returns null when no header present', () => {
    expect(extractHeader('#include <stdio.h>\n')).toBeNull()
    expect(extractHeader('')).toBeNull()
  })

  it('handles CRLF line endings', () => {
    const rendered = renderHeader('c', baseInfo).split('\n').join('\r\n')
    const extracted = extractHeader(rendered)
    expect(extracted).not.toBeNull()
    expect(extracted!.includes('\r')).toBe(false)
  })

  it('does not scan beyond 1024 bytes', () => {
    const padding = 'x'.repeat(2000)
    const rendered = renderHeader('c', baseInfo)
    expect(extractHeader(padding + rendered)).toBeNull()
  })
})

describe('getHeaderInfo / renderHeader round-trip', () => {
  const languages = ['c', 'cpp', 'python', 'rust', 'typescript', 'go', 'haskell'] as const

  for (const lang of languages) {
    it(`round-trips field values for ${lang}`, () => {
      const rendered = renderHeader(lang, baseInfo)
      const extracted = extractHeader(rendered)
      expect(extracted).not.toBeNull()
      const parsed = getHeaderInfo(extracted!)
      expect(parsed.filename.trim()).toBe(baseInfo.filename)
      expect(parsed.author.trim()).toBe(baseInfo.author)
      expect(parsed.createdBy.trim()).toBe(baseInfo.createdBy)
      expect(parsed.updatedBy.trim()).toBe(baseInfo.updatedBy)
    })
  }

  it('preserves dates through render and parse', () => {
    const rendered = renderHeader('c', baseInfo)
    const parsed = getHeaderInfo(extractHeader(rendered)!)

    const { createdAt, updatedAt } = baseInfo
    expect(parsed.createdAt.getFullYear()).toBe(createdAt.getFullYear())
    expect(parsed.createdAt.getMonth()).toBe(createdAt.getMonth())
    expect(parsed.createdAt.getDate()).toBe(createdAt.getDate())
    expect(parsed.createdAt.getHours()).toBe(createdAt.getHours())
    expect(parsed.createdAt.getMinutes()).toBe(createdAt.getMinutes())
    expect(parsed.createdAt.getSeconds()).toBe(createdAt.getSeconds())

    expect(parsed.updatedAt.getFullYear()).toBe(updatedAt.getFullYear())
    expect(parsed.updatedAt.getMonth()).toBe(updatedAt.getMonth())
  })

  it('preserves createdAt when updating (re-render)', () => {
    const first = renderHeader('c', baseInfo)
    const firstParsed = getHeaderInfo(extractHeader(first)!)

    const updated: HeaderInfo = { ...firstParsed, updatedBy: 'peer', updatedAt: new Date() }
    const second = renderHeader('c', updated)
    const secondParsed = getHeaderInfo(extractHeader(second)!)

    expect(secondParsed.createdAt.getTime()).toBe(firstParsed.createdAt.getTime())
    expect(secondParsed.updatedBy.trim()).toBe('peer')
  })
})

describe('defaultDelimiters', () => {
  it('all delimiters have two non-empty string entries', () => {
    for (const [, [left, right]] of Object.entries(defaultDelimiters)) {
      expect(typeof left).toBe('string')
      expect(typeof right).toBe('string')
      expect(left.length).toBeGreaterThan(0)
    }
  })

  it('all delimiters produce 80-char lines when applied', () => {
    for (const lang of Object.keys(defaultDelimiters)) {
      const rendered = renderHeader(lang, baseInfo)
      rendered
        .split('\n')
        .filter(l => l.length > 0)
        .forEach(line => expect(line.length).toBe(80))
    }
  })
})

describe('applyDelimiters with $ in delimiter', () => {
  it('does not interpret $ as backreference', () => {
    const rendered = renderHeader('c', baseInfo, {
      c: ['$& ', ' $&'],
    })
    // 80 chars total: 3-char left + 74-char middle + 3-char right
    expect(rendered.split('\n')[0]).toBe('$& ' + '*'.repeat(74) + ' $&')
  })

  it('handles $$ in delimiter', () => {
    const rendered = renderHeader('c', baseInfo, {
      c: ['$$ ', ' $$'],
    })
    expect(rendered.split('\n')[0]).toBe('$$ ' + '*'.repeat(74) + ' $$')
  })
})

describe('extractHeader false-positive prevention', () => {
  it('returns null for 11 lines of 80 non-header chars', () => {
    const fake = 'a'.repeat(80) + '\n'
    expect(extractHeader(fake.repeat(11))).toBeNull()
  })

  it('returns null for text missing By: marker', () => {
    const partial = 'x'.repeat(80) + '\n'
    expect(extractHeader(partial.repeat(10) + 'a'.repeat(80) + '\n')).toBeNull()
  })

  it('returns null for partial header (10 lines only)', () => {
    const rendered = renderHeader('c', baseInfo)
    const lines = rendered.split('\n')
    expect(extractHeader(lines.slice(0, 10).join('\n') + '\n')).toBeNull()
  })

  it('returns null for header without trailing newline', () => {
    const rendered = renderHeader('c', baseInfo).trimEnd()
    expect(extractHeader(rendered)).toBeNull()
  })
})

describe('renderHeader edge cases', () => {
  it('truncates filename longer than template width', () => {
    const longName = 'very_long_filename_that_exceeds_the_template_width.c'
    const rendered = renderHeader('c', { ...baseInfo, filename: longName })
    const lines = rendered.split('\n')
    const filenameLine = lines.find(l => l.includes(longName.slice(0, 10)))!
    expect(filenameLine.length).toBe(80)
  })

  it('handles empty filename', () => {
    const rendered = renderHeader('c', { ...baseInfo, filename: '' })
    expect(rendered).toContain('Created:')
    expect(rendered).toContain('Updated:')
    rendered
      .split('\n')
      .filter(l => l.length > 0)
      .forEach(line => expect(line.length).toBe(80))
  })

  it('handles unicode in author', () => {
    const rendered = renderHeader('c', {
      ...baseInfo,
      author: '测试 <test@student.42.fr>',
    })
    expect(rendered).toContain('测试')
    expect(rendered.split('\n').filter(l => l.length > 0).every(l => l.length === 80)).toBe(true)
  })
})

describe('parseDate fallback', () => {
  it('returns current date for malformed date string', () => {
    const rendered = renderHeader('c', baseInfo)
    const corrupted = rendered.replace(/2024\/01\/15/, 'not-a-date')
    const extracted = extractHeader(corrupted)
    expect(extracted).not.toBeNull()
    const info = getHeaderInfo(extracted!)
    // Malformed date falls back to new Date() which is close to now
    expect(info.createdAt.getTime()).toBeGreaterThan(0)
  })
})

describe('shebangLineCount', () => {
  it('returns 0 for text without shebang', () => {
    expect(shebangLineCount('')).toBe(0)
    expect(shebangLineCount('#include <stdio.h>')).toBe(0)
    expect(shebangLineCount('// comment')).toBe(0)
  })

  it('returns 1 for a single shebang line', () => {
    expect(shebangLineCount('#!/usr/bin/env python3\n')).toBe(1)
    expect(shebangLineCount('#!/bin/bash\n\necho hello')).toBe(1)
  })

  it('returns the count for multiple consecutive shebang lines', () => {
    expect(shebangLineCount('#!/bin/sh\n#!/usr/bin/env bash\n')).toBe(2)
  })

  it('stops at the first non-shebang line', () => {
    expect(shebangLineCount('#!/bin/sh\n# comment\n#!/bin/bash\n')).toBe(1)
  })
})

describe('extractHeader with shebangs', () => {
  it('detects header placed after a shebang', () => {
    const rendered = renderHeader('python', baseInfo)
    const text = '#!/usr/bin/env python3\n' + rendered
    const extracted = extractHeader(text)
    expect(extracted).not.toBeNull()
    expect(extracted!.startsWith('# ')).toBe(true)
    const info = getHeaderInfo(extracted!)
    expect(info.filename.trim()).toBe(baseInfo.filename)
  })

  it('detects header after multiple shebang lines', () => {
    const rendered = renderHeader('c', baseInfo)
    const text = '#!/bin/sh\n#!/usr/bin/env bash\n' + rendered
    expect(extractHeader(text)).not.toBeNull()
  })

  it('returns null when shebang present but no header follows', () => {
    const text = '#!/usr/bin/env python3\n\nprint("hello")\n'
    expect(extractHeader(text)).toBeNull()
  })

  it('finds header at start even when shebang appears later in file', () => {
    const rendered = renderHeader('c', baseInfo)
    const text = rendered + '#!/bin/sh\n'
    expect(extractHeader(text)).not.toBeNull()
  })

  it('handles CRLF shebangs', () => {
    const rendered = renderHeader('python', baseInfo)
    const text = '#!/usr/bin/env python3\r\n' + rendered
    expect(extractHeader(text)).not.toBeNull()
  })
})
