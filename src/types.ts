/** Notation styles a row can be written in. */
export type Locale = 'es' | 'us' | 'uk'

/** Crafts with a catalog. */
export type Craft = 'crochet' | 'knitting'

/**
 * One kind of stitch or step, as a key on the keyboard.
 *
 * `consumes` is how many stitches of the previous row it is worked into;
 * `produces` how many stitches it leaves for the next row. A crochet
 * increase consumes 1 and produces 2; a decrease consumes 2 and produces 1.
 */
export interface StitchDef {
  id: string
  /** The abbreviation in each notation: `{ es: 'pb', us: 'sc', uk: 'dc' }`. */
  abbr: Record<Locale, string>
  /** Full name, for the key's label and for screen readers. */
  name: Record<'es' | 'en', string>
  consumes: number
  produces: number
  /**
   * Starts a row from nothing (a magic ring, a foundation chain): a row
   * that begins with it is not checked against the previous row.
   */
  start?: boolean
  /** Ways of working it that keep its count (back loop only, invisible…). */
  variants?: VariantDef[]
  /** Written without a count: "am", not "1 am". */
  single?: boolean
}

export interface VariantDef {
  id: string
  /** How the variant is written after the stitch: "pb bt", "sc blo". */
  abbr: Record<Locale, string>
  name: Record<'es' | 'en', string>
}

/** A run of the same stitch: "6 pb", "1 aum", "dism inv". */
export interface StitchToken {
  type: 'stitch'
  id: string
  count: number
  variant?: string
}

/** A repeated group: "(1 pb, 1 aum) ×6". */
export interface GroupToken {
  type: 'group'
  items: Token[]
  times: number
}

/** Anything the keys do not cover, kept as written: "cambiar a color B". */
export interface TextToken {
  type: 'text'
  text: string
}

export type Token = StitchToken | GroupToken | TextToken

/** A row is its tokens, in order. */
export type Row = Token[]

export interface Catalog {
  craft: Craft
  stitches: StitchDef[]
}

/** How a row fits the one before it. */
export interface RowCheck {
  /** Stitches the row leaves for the next one. */
  produces: number
  /** Stitches of the previous row it works into. */
  consumes: number
  /**
   * `ok` when it uses exactly the previous row; `left` when stitches of the
   * previous row are left over; `short` when it needs more than there are;
   * `unchecked` when there is nothing to compare (a starting row, free text).
   */
  status: 'ok' | 'left' | 'short' | 'unchecked'
  /** How many are left over or missing. */
  difference: number
}
