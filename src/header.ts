import { Delimiter, defaultDelimiters } from './delimiters'
import {
  TEMPLATE,
  getField,
  setField,
  applyDelimiters,
} from './template'
export { HEADER_LINE_COUNT } from './template'

/**
 * Parsed fields from a 42 header block.
 *
 * `author` uses the format `"login <email>"`.
 * `createdAt` and `updatedAt` are second-precision dates (parsed from
 * the `YYYY/MM/DD HH:MM:SS` format stored in the header).
 */
export type HeaderInfo = {
  filename:  string
  author:    string
  createdBy: string
  createdAt: Date
  updatedBy: string
  updatedAt: Date
}

const twoDigit = (n: number) => String(n).padStart(2, '0')

const formatDate = (d: Date): string =>
  `${d.getFullYear()}/${twoDigit(d.getMonth() + 1)}/${twoDigit(d.getDate())} ` +
  `${twoDigit(d.getHours())}:${twoDigit(d.getMinutes())}:${twoDigit(d.getSeconds())}`

const parseDate = (s: string): Date => {
  const m = s.trim().match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/)
  return m
    ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
    : new Date()
}

/**
 * Returns `true` when the language ID has a built-in delimiter or is
 * covered by a user-provided override.
 */
export const supportsLanguage = (
  languageId: string,
  overrides: Record<string, Delimiter> = {},
): boolean => languageId in overrides || languageId in defaultDelimiters

/**
 * Returns the number of consecutive shebang (`#!`) lines at the start
 * of `text`.  Stops at the first line that does not start with `#!`.
 */
export const shebangLineCount = (text: string): number => {
  let count = 0
  for (const line of text.split('\n')) {
    if (line.startsWith('#!')) count++
    else break
  }
  return count
}

/**
 * Detects a 42 header at the start of `text` (after any shebang lines)
 * and returns the header block as a single LF-separated string, or
 * `null` if none is found.
 *
 * Scans only the first 1024 bytes and normalizes CRLF line endings
 * to LF so callers never need to handle carriage returns.
 */
export const extractHeader = (text: string): string | null => {
  // Skip past shebang lines so headers placed after them are found.
  let offset = 0
  for (const line of text.slice(0, 1024).split('\n')) {
    if (line.startsWith('#!')) offset += line.length + 1
    else break
  }
  const match = text.slice(offset, offset + 1024).match(/^(.{80}(\r\n|\n)){11}/)
  if (!match) return null
  const header = match[0].split('\r\n').join('\n')
  // Verify it actually looks like a 42 header to avoid false positives.
  return header.includes('By:') && header.includes('Created:') && header.includes('Updated:')
    ? header
    : null
}

/**
 * Parses the field placeholders out of a raw header string returned
 * by {@link extractHeader}.  The `createdAt`/`updatedAt` dates are
 * reconstructed from the header's text representation; seconds outside
 * the canonical range are clamped by the `Date` constructor.
 */
export const getHeaderInfo = (header: string): HeaderInfo => ({
  filename:  getField(header, 'FILENAME'),
  author:    getField(header, 'AUTHOR'),
  createdBy: getField(header, 'CREATEDBY'),
  createdAt: parseDate(getField(header, 'CREATEDAT')),
  updatedBy: getField(header, 'UPDATEDBY'),
  updatedAt: parseDate(getField(header, 'UPDATEDAT')),
})

/**
 * Renders a complete 42 header block for the given language and field
 * values.  All content lines are exactly 80 characters wide.
 *
 * @throws if no delimiter is registered for `languageId` (neither
 *         built-in nor via `overrides`).  Callers should guard with
 *         {@link supportsLanguage} first.
 */
export const renderHeader = (
  languageId: string,
  info: HeaderInfo,
  overrides: Record<string, Delimiter> = {},
): string => {
  const delimiter = overrides[languageId] ?? defaultDelimiters[languageId]
  if (!delimiter)
    throw new Error(
      `No delimiter configured for language '${languageId}'. ` +
      `Add an entry to '42header.languageDelimiters' in settings, ` +
      `e.g. { "${languageId}": ["/* ", " */"] }`,
    )
  return (
    [
      ['FILENAME',  info.filename],
      ['AUTHOR',    info.author],
      ['CREATEDAT', formatDate(info.createdAt)],
      ['CREATEDBY', info.createdBy],
      ['UPDATEDAT', formatDate(info.updatedAt)],
      ['UPDATEDBY', info.updatedBy],
    ] as const
  ).reduce(
    (h, [name, value]) => setField(h, name, value),
    applyDelimiters(TEMPLATE, delimiter),
  )
}
