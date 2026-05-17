import { validateDelimiterOverrides } from '../delimiters'

describe('validateDelimiterOverrides', () => {
  it('accepts a valid [string, string] tuple', () => {
    const result = validateDelimiterOverrides({ zig: ['// ', ' //'] })
    expect(result.valid).toEqual({ zig: ['// ', ' //'] })
    expect(result.invalid).toEqual([])
  })

  it('accepts multiple valid entries', () => {
    const result = validateDelimiterOverrides({
      zig: ['// ', ' //'],
      ada: ['-- ', ' --'],
    })
    expect(Object.keys(result.valid)).toHaveLength(2)
    expect(result.valid['zig']).toEqual(['// ', ' //'])
    expect(result.valid['ada']).toEqual(['-- ', ' --'])
    expect(result.invalid).toEqual([])
  })

  it('rejects a single string value', () => {
    const result = validateDelimiterOverrides({ bad: '//' })
    expect(result.valid).toEqual({})
    expect(result.invalid).toEqual(['bad'])
  })

  it('rejects an array with wrong length', () => {
    const result = validateDelimiterOverrides({ bad: ['//'] })
    expect(result.valid).toEqual({})
    expect(result.invalid).toEqual(['bad'])
  })

  it('rejects an array with non-string entries', () => {
    const result = validateDelimiterOverrides({ bad: ['//', 42] })
    expect(result.valid).toEqual({})
    expect(result.invalid).toEqual(['bad'])
  })

  it('rejects non-array values', () => {
    const result = validateDelimiterOverrides({ bad: 42 })
    expect(result.valid).toEqual({})
    expect(result.invalid).toEqual(['bad'])
  })

  it('handles empty input', () => {
    const result = validateDelimiterOverrides({})
    expect(result.valid).toEqual({})
    expect(result.invalid).toEqual([])
  })

  it('separates valid from invalid entries', () => {
    const result = validateDelimiterOverrides({
      good:  ['// ', ' //'],
      bad:   'not-an-array',
      alsoGood: ['-- ', ' --'],
    })
    expect(result.valid).toEqual({
      good: ['// ', ' //'],
      alsoGood: ['-- ', ' --'],
    })
    expect(result.invalid).toEqual(['bad'])
  })

  it('rejects null and undefined values', () => {
    const result = validateDelimiterOverrides({
      nullLang: null,
      undefLang: undefined,
    } as Record<string, unknown>)
    expect(result.valid).toEqual({})
    expect(result.invalid).toEqual(['nullLang', 'undefLang'])
  })

  it('rejects nested arrays', () => {
    const result = validateDelimiterOverrides({ bad: [['// ', ' //']] })
    expect(result.valid).toEqual({})
    expect(result.invalid).toEqual(['bad'])
  })

  it('rejects empty string delimiters', () => {
    const result = validateDelimiterOverrides({ bad: ['', ''] })
    expect(result.valid).toEqual({})
    expect(result.invalid).toEqual(['bad'])
  })

  it('rejects object values', () => {
    const result = validateDelimiterOverrides({ bad: { left: '// ', right: ' //' } })
    expect(result.valid).toEqual({})
    expect(result.invalid).toEqual(['bad'])
  })

  it('rejects left delimiter starting with #!', () => {
    const result = validateDelimiterOverrides({ bad: ['#!', '!#'] })
    expect(result.valid).toEqual({})
    expect(result.invalid).toEqual(['bad'])
  })
})
