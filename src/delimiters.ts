export type Delimiter = [string, string]

export const validateDelimiterOverrides = (
  raw: Record<string, unknown>,
): { valid: Record<string, Delimiter>; invalid: string[] } => {
  const valid: Record<string, Delimiter> = {}
  const invalid: string[] = []

  for (const [lang, v] of Object.entries(raw)) {
    if (
      Array.isArray(v) &&
      v.length === 2 &&
      typeof v[0] === 'string' &&
      typeof v[1] === 'string' &&
      v[0].length > 0 &&
      !v[0].startsWith('#!')
    )
      valid[lang] = [v[0], v[1]]
    else
      invalid.push(lang)
  }

  return { valid, invalid }
}

const hashes:     Delimiter = ['# ',  ' #']
const slashes:    Delimiter = ['/* ', ' */']
const semicolons: Delimiter = [';; ', ' ;;']
const parens:     Delimiter = ['(* ', ' *)']
const dashes:     Delimiter = ['-- ', ' --']
const percents:   Delimiter = ['%% ', ' %%']
const rustSlashes: Delimiter = ['// ', '']

export const defaultDelimiters: Record<string, Delimiter> = {
  c:                slashes,
  coffeescript:     hashes,
  cpp:              slashes,
  css:              slashes,
  dockerfile:       hashes,
  fsharp:           parens,
  go:               slashes,
  groovy:           slashes,
  haskell:          dashes,
  ini:              semicolons,
  jade:             slashes,
  java:             slashes,
  javascript:       slashes,
  javascriptreact:  slashes,
  latex:            percents,
  less:             slashes,
  lua:              dashes,
  makefile:         hashes,
  'objective-c':    slashes,
  ocaml:            parens,
  perl:             hashes,
  perl6:            hashes,
  php:              slashes,
  plaintext:        hashes,
  powershell:       hashes,
  python:           hashes,
  r:                hashes,
  ruby:             hashes,
  rust:             rustSlashes,
  scss:             slashes,
  shellscript:      hashes,
  sql:              hashes,
  swift:            slashes,
  typescript:       slashes,
  typescriptreact:  slashes,
  xsl:              slashes,
  yaml:             hashes,
}
