import { useMemo, useState } from 'react'
import { emptyInput, formatInput, type InputState } from '../edit'
import { checkRow } from '../row'
import type { Catalog, Locale, Row, RowCheck } from '../types'

/**
 * The state of one row being typed, with what a screen shows of it: the row
 * written out (plus the count waiting for its stitch) and how it fits the
 * previous row.
 */
export function useStitchInput(catalog: Catalog, { initial = [], previous = null, locale }: {
  initial?: Row
  previous?: number | null
  locale: Locale
}): {
  state: InputState
  setState: (s: InputState) => void
  /** "(1 pb, 1 aum" while typing; the open group shows unclosed. */
  text: string
  check: RowCheck
  reset: (row?: Row) => void
} {
  const [state, setState] = useState<InputState>(() => ({ ...emptyInput(initial) }))
  const text = useMemo(() => formatInput(catalog, state, locale), [catalog, locale, state])
  const check = useMemo(() => checkRow(catalog, state.row, previous), [catalog, state.row, previous])
  return { state, setState, text, check, reset: (row = []) => setState(emptyInput(row)) }
}
