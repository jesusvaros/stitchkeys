import type { Row } from './types'

// The rows a crochet sphere is made of: each round adds (or takes away) the
// same number of stitches, spread evenly. With 6 per round, the classic
// amigurumi ball: 6, 12, 18, 24… These need the crochet catalog (sc, inc, dec).

/**
 * The next increase round after one of `previous` stitches, spreading
 * `spread` increases evenly: after 12 → "(1 pb, 1 aum) ×6" (18). Null when
 * `previous` does not divide evenly.
 */
export function nextIncrease(previous: number, spread = 6): Row | null {
  if (previous <= 0 || previous % spread !== 0) return null
  const per = previous / spread
  if (per === 1) return [{ type: 'stitch', id: 'inc', count: spread }]
  return [{ type: 'group', items: [{ type: 'stitch', id: 'sc', count: per - 1 }, { type: 'stitch', id: 'inc', count: 1 }], times: spread }]
}

/**
 * The next decrease round: after 24 → "(2 pb, 1 dism) ×6" (18). Null when it
 * does not divide evenly or there is nothing left to decrease.
 */
export function nextDecrease(previous: number, spread = 6): Row | null {
  if (previous < spread * 2 || previous % spread !== 0) return null
  const per = previous / spread
  if (per === 2) return [{ type: 'stitch', id: 'dec', count: spread }]
  return [{ type: 'group', items: [{ type: 'stitch', id: 'sc', count: per - 2 }, { type: 'stitch', id: 'dec', count: 1 }], times: spread }]
}

/** One stitch in each: "24 pb" after 24. */
export function evenRound(previous: number): Row | null {
  return previous > 0 ? [{ type: 'stitch', id: 'sc', count: previous }] : null
}
