import { formatRow } from './row'
import type { Catalog, GroupToken, Locale, Row, Token } from './types'

/**
 * What is being typed: the row so far, a count waiting for its stitch
 * ("6" before tapping "aum") and whether a group is open at the end.
 * Typing always happens at the end of the row, as on a calculator.
 */
export interface InputState {
  row: Row
  pending: string
  open: boolean
}

export const emptyInput = (row: Row = []): InputState => ({ row, pending: '', open: false })

/** The token list typing goes into: the open group's, or the row's. */
function level(state: InputState): { items: Token[]; group: GroupToken | null } {
  const last = state.row[state.row.length - 1]
  if (state.open && last?.type === 'group') return { items: last.items, group: last }
  return { items: state.row, group: null }
}

/** A deep enough copy to edit without touching the previous state. */
function clone(state: InputState): InputState {
  return { ...state, row: state.row.map((t) => (t.type === 'group' ? { ...t, items: [...t.items] } : { ...t })) }
}

export function typeDigit(state: InputState, digit: number): InputState {
  // Counts over 999 are a typo, not a row.
  if (state.pending.length >= 3) return state
  return { ...state, pending: state.pending === '0' ? String(digit) : state.pending + digit }
}

/**
 * Adds a stitch with the count typed before it (1 if none). Tapping the same
 * stitch again with no count adds one more to it: pb, pb, pb → "3 pb".
 */
export function typeStitch(state: InputState, id: string, variant?: string): InputState {
  const next = clone(state)
  const { items } = level(next)
  const last = items[items.length - 1]
  const count = Number(state.pending) || 1
  if (!state.pending && last?.type === 'stitch' && last.id === id && last.variant === variant) {
    items[items.length - 1] = { ...last, count: last.count + 1 }
  } else {
    items.push(variant ? { type: 'stitch', id, count, variant } : { type: 'stitch', id, count })
  }
  return { ...next, pending: '' }
}

/** Opens a group, or closes the open one (×1 until "×n" sets how many times). */
export function typeGroup(state: InputState): InputState {
  if (state.open) return { ...state, open: false, pending: '' }
  const next = clone(state)
  next.row.push({ type: 'group', items: [], times: 1 })
  return { ...next, open: true, pending: '' }
}

/**
 * Repeats with the count typed before it (2 if none): closes the open group
 * with it, sets it on the group just closed, or repeats the whole row.
 */
export function typeTimes(state: InputState): InputState {
  const times = Number(state.pending) || 2
  const next = clone(state)
  const last = next.row[next.row.length - 1]
  if (last?.type === 'group' && (state.open || last.items.length > 0)) {
    next.row[next.row.length - 1] = { ...last, times }
    return { ...next, open: false, pending: '' }
  }
  if (next.row.length === 0) return { ...next, pending: '' }
  return { row: [{ type: 'group', items: next.row, times }], open: false, pending: '' }
}

/** Free text where the keys fall short: "cambiar a color B". */
export function typeText(state: InputState, text: string): InputState {
  if (!text.trim()) return state
  const next = clone(state)
  level(next).items.push({ type: 'text', text: text.trim() })
  return { ...next, pending: '' }
}

/** Deletes the last thing typed: a digit, then a stitch, then an empty group. */
export function backspace(state: InputState): InputState {
  if (state.pending) return { ...state, pending: state.pending.slice(0, -1) }
  const next = clone(state)
  const { items, group } = level(next)
  if (group && items.length === 0) {
    next.row.pop()
    return { ...next, open: false }
  }
  const last = next.row[next.row.length - 1]
  // A closed group opens again, to delete inside it.
  if (!group && last?.type === 'group') {
    next.row[next.row.length - 1] = { ...last, times: 1 }
    return { ...next, open: true }
  }
  items.pop()
  return next
}

/**
 * The row as it reads while typing: an open group without its closing
 * bracket, and the count waiting for its stitch at the end: "(1 pb, 1".
 */
export function formatInput(catalog: Catalog, state: InputState, locale: Locale): string {
  const parts = state.row.map((t, i) => {
    const text = formatRow(catalog, [t], locale)
    return state.open && i === state.row.length - 1 ? text.slice(0, -1) : text
  })
  let out = parts.join(', ')
  if (state.pending) out += out === '' || out.endsWith('(') ? state.pending : `, ${state.pending}`
  return out
}
