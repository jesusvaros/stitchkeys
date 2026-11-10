import { ALIASES, stitchById, stitchLabel } from './catalog'
import type { Catalog, Locale, Row, RowCheck, Token } from './types'

// --- Counting -------------------------------------------------------------

interface Tally {
  consumes: number
  produces: number
  /** Free text inside: the count may be incomplete. */
  text: boolean
}

function tally(catalog: Catalog, tokens: Token[]): Tally {
  return tokens.reduce<Tally>(
    (t, token) => {
      if (token.type === 'text') return { ...t, text: true }
      if (token.type === 'group') {
        const inner = tally(catalog, token.items)
        return {
          consumes: t.consumes + inner.consumes * token.times,
          produces: t.produces + inner.produces * token.times,
          text: t.text || inner.text,
        }
      }
      const def = stitchById(catalog, token.id)
      if (!def) return { ...t, text: true }
      return { consumes: t.consumes + def.consumes * token.count, produces: t.produces + def.produces * token.count, text: t.text }
    },
    { consumes: 0, produces: 0, text: false },
  )
}

/** Whether the row starts from nothing (magic ring, foundation chain, cast on). */
export function isStartRow(catalog: Catalog, row: Row): boolean {
  const first = row[0]
  return !!first && first.type === 'stitch' && !!stitchById(catalog, first.id)?.start
}

/**
 * The row's stitch counts and how it fits a previous row of `previous`
 * stitches (null when there is none, as in a first row).
 */
export function checkRow(catalog: Catalog, row: Row, previous: number | null): RowCheck {
  const { consumes, produces, text } = tally(catalog, row)
  // Worked into a ring or chain: nothing of the previous row is used.
  if (isStartRow(catalog, row)) return { consumes: 0, produces, status: 'unchecked', difference: 0 }
  if (previous == null || text || row.length === 0) return { consumes, produces, status: 'unchecked', difference: 0 }
  const difference = previous - consumes
  return { consumes, produces, status: difference === 0 ? 'ok' : difference > 0 ? 'left' : 'short', difference: Math.abs(difference) }
}

// --- Writing --------------------------------------------------------------

const KNIT_COUNT_AFTER = new Set(['k', 'p', 'slp'])
const KNIT_COUNT_SPACED = new Set(['co', 'bo'])

function formatToken(catalog: Catalog, token: Token, locale: Locale): string {
  if (token.type === 'text') return token.text
  if (token.type === 'group') {
    const inner = token.items.map((t) => formatToken(catalog, t, locale)).join(', ')
    return token.times > 1 ? `(${inner}) ×${token.times}` : `(${inner})`
  }
  const label = stitchLabel(catalog, token.id, locale, token.variant)
  // English knitting patterns put the count after the stitch: "k2, p2", "sl1",
  // "CO 20", and a lone "k2tog" or "yo" (twice is "k2tog ×2").
  if (catalog.craft === 'knitting' && locale !== 'es') {
    if (KNIT_COUNT_AFTER.has(token.id)) return `${label}${token.count}`
    if (KNIT_COUNT_SPACED.has(token.id)) return `${label} ${token.count}`
    return token.count === 1 ? label : `${label} ×${token.count}`
  }
  // A ring is written alone ("am"); every other stitch with its count ("1 pb", "6 aum").
  return stitchById(catalog, token.id)?.single && token.count === 1 ? label : `${token.count} ${label}`
}

/** The row as written in a pattern: "am, 6 pb", "(1 pb, 1 aum) ×6". */
export function formatRow(catalog: Catalog, row: Row, locale: Locale): string {
  return row.map((t) => formatToken(catalog, t, locale)).join(', ')
}

// --- Reading --------------------------------------------------------------

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Every way of writing each stitch (and variant) in any locale, longest first. */
function vocabulary(catalog: Catalog) {
  const words: { word: string; id: string; variant?: string }[] = []
  for (const s of catalog.stitches) {
    const names = new Set([...Object.values(s.abbr), s.name.es, s.name.en, ...(ALIASES[s.id] ?? [])].map(norm))
    for (const w of names) {
      words.push({ word: w, id: s.id })
      for (const v of s.variants ?? []) {
        for (const va of new Set([...Object.values(v.abbr), v.name.es, v.name.en].map(norm))) {
          words.push({ word: `${w} ${va}`, id: s.id, variant: v.id })
          words.push({ word: `${w} en ${va}`, id: s.id, variant: v.id })
        }
      }
    }
  }
  return words.sort((a, b) => b.word.length - a.word.length)
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function readItem(raw: string, words: ReturnType<typeof vocabulary>): Token {
  const text = raw.trim()
  const plain = norm(text)
  for (const { word, id, variant } of words) {
    // "6 pb", "pb 6", "6pb", "pb" — the whole item must be the stitch and its count.
    const re = new RegExp(`^(?:(\\d+)\\s*)?${escape(word)}(?:\\s*(\\d+))?$`)
    const m = plain.match(re)
    if (m) {
      const count = Number(m[1] ?? m[2] ?? 1)
      return variant ? { type: 'stitch', id, count, variant } : { type: 'stitch', id, count }
    }
  }
  return { type: 'text', text }
}

/** Splits at commas outside brackets and outside *…* repeats. */
function splitTop(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let star = false
  let cur = ''
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1)
    else if (ch === '*') star = !star
    if (ch === ',' && depth === 0 && !star) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((x) => x.trim()).filter(Boolean)
}

const GROUP = /^(?:\(|\[|\*)(.*?)(?:\)|\]|\*)\s*(?:[x×]\s*(\d+)|(\d+)\s*(?:veces|times))?$/i
// A trailing total, "(18)", is the pattern's own check, not a stitch.
const TOTAL = /\s*\((\d+)(?:\s*(?:p|pts|puntos|sts|stitches))?\)\s*$/i

/**
 * Reads a row as patterns write it into tokens: "6 aum", "(1 pb, 1 aum) x6",
 * "*2 pb, aum* x6", "am, 6 pb". What it cannot read stays as text, so
 * nothing is lost. A trailing total "(18)" is dropped; read it with `rowTotal`.
 */
export function parseRow(catalog: Catalog, text: string): Row {
  const words = vocabulary(catalog)
  const body = text.replace(TOTAL, '').replace(/\s+en\s+(?:el\s+)?(?:anillo(?:\s+m[aá]gico)?|am)\b/i, '').trim()
  const read = (part: string): Token[] => {
    // "6 pb en am" was folded above; "am" alone stays a start stitch.
    const g = part.match(GROUP)
    if (g && /[([*]/.test(part[0])) {
      return [{ type: 'group', items: splitTop(g[1]).flatMap(read), times: Number(g[2] ?? g[3] ?? 1) }]
    }
    return [readItem(part, words)]
  }
  const tokens = splitTop(body).flatMap(read)
  // "6 pb en anillo mágico" means a ring first.
  if (/\ben\s+(?:el\s+)?(?:anillo|am\b)|\bin (?:a )?magic ring|\bin mr\b/i.test(text) && !(tokens[0]?.type === 'stitch' && tokens[0].id === 'mr')) {
    const ring = stitchById(catalog, 'mr')
    if (ring) tokens.unshift({ type: 'stitch', id: 'mr', count: 1 })
  }
  return tokens
}

/** The total a pattern writes at the end of a row, "(18)", or null. */
export function rowTotal(text: string): number | null {
  const m = text.match(TOTAL)
  return m ? Number(m[1]) : null
}
