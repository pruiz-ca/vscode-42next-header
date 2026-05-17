import { Delimiter } from './delimiters'

export type FieldLoc = { offset: number; width: number }

export const TEMPLATE = `\
********************************************************************************
*                                                                              *
*                                                         :::      ::::::::    *
*    $FILENAME_________________________________________ :+:      :+:    :+:    *
*                                                     +:+ +:+         +:+      *
*    By: $AUTHOR___________________________________ +#+  +:+       +#+         *
*                                                 +#+#+#+#+#+   +#+            *
*    Created: $CREATEDAT_________ by $CREATEDBY_______ #+#    #+#              *
*    Updated: $UPDATEDAT_________ by $UPDATEDBY______ ###   ########.fr        *
*                                                                              *
********************************************************************************

`

export const HEADER_LINE_COUNT = TEMPLATE.split('\n').length - 1

const fieldCache = new Map<string, FieldLoc>()

export const locateField = (name: string): FieldLoc => {
  const cached = fieldCache.get(name)
  if (cached) return cached
  const match = TEMPLATE.match(new RegExp(`^((?:.*\\n)*.*)(\\$${name}_*)`))
  if (!match) throw new Error(`Field $${name} not found in template`)
  const loc: FieldLoc = { offset: match[1].length, width: match[2].length }
  fieldCache.set(name, loc)
  return loc
}

const pad = (value: string, width: number): string =>
  value.concat(' '.repeat(width)).slice(0, width)

export const getField = (header: string, name: string): string => {
  const { offset, width } = locateField(name)
  return header.slice(offset, offset + width)
}

export const setField = (header: string, name: string, value: string): string => {
  const { offset, width } = locateField(name)
  return header.slice(0, offset) + pad(value, width) + header.slice(offset + width)
}

export const applyDelimiters = (template: string, [left, right]: Delimiter): string =>
  template.replace(
    new RegExp(`^(.{${left.length}})(.*)(.{${right.length}})$`, 'gm'),
    (_match, _prefix, middle: string) => left + middle + right,
  )
