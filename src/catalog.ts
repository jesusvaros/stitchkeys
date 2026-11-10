import type { Catalog, Craft, Locale, StitchDef, VariantDef } from './types'

// Abbreviations follow the Craft Yarn Council list for US/UK and the usual
// Spanish ones (pb, mpa, pa…). Spanish authors vary (dis/dism, "medio
// punto" for pb): `abbr` is what this library writes; `parseRow` also reads
// the common alternatives listed in ALIASES.

const BLO: VariantDef = { id: 'blo', abbr: { es: 'bt', us: 'blo', uk: 'blo' }, name: { es: 'bucle trasero', en: 'back loop only' } }
const FLO: VariantDef = { id: 'flo', abbr: { es: 'bd', us: 'flo', uk: 'flo' }, name: { es: 'bucle delantero', en: 'front loop only' } }
const INV: VariantDef = { id: 'inv', abbr: { es: 'inv', us: 'inv', uk: 'inv' }, name: { es: 'invisible', en: 'invisible' } }

const loops = [BLO, FLO]

export const CROCHET: Catalog = {
  craft: 'crochet',
  stitches: [
    { id: 'mr', abbr: { es: 'am', us: 'mr', uk: 'mr' }, name: { es: 'anillo mágico', en: 'magic ring' }, consumes: 0, produces: 0, start: true, single: true },
    { id: 'ch', abbr: { es: 'cad', us: 'ch', uk: 'ch' }, name: { es: 'cadeneta', en: 'chain' }, consumes: 0, produces: 1 },
    { id: 'sl', abbr: { es: 'pr', us: 'sl st', uk: 'ss' }, name: { es: 'punto raso', en: 'slip stitch' }, consumes: 1, produces: 1, variants: loops },
    { id: 'sc', abbr: { es: 'pb', us: 'sc', uk: 'dc' }, name: { es: 'punto bajo', en: 'single crochet' }, consumes: 1, produces: 1, variants: loops },
    { id: 'hdc', abbr: { es: 'mpa', us: 'hdc', uk: 'htr' }, name: { es: 'medio punto alto', en: 'half double crochet' }, consumes: 1, produces: 1, variants: loops },
    { id: 'dc', abbr: { es: 'pa', us: 'dc', uk: 'tr' }, name: { es: 'punto alto', en: 'double crochet' }, consumes: 1, produces: 1, variants: loops },
    { id: 'inc', abbr: { es: 'aum', us: 'inc', uk: 'inc' }, name: { es: 'aumento', en: 'increase' }, consumes: 1, produces: 2, variants: loops },
    { id: 'dec', abbr: { es: 'dism', us: 'dec', uk: 'dec' }, name: { es: 'disminución', en: 'decrease' }, consumes: 2, produces: 1, variants: [INV, ...loops] },
  ],
}

export const KNITTING: Catalog = {
  craft: 'knitting',
  stitches: [
    { id: 'co', abbr: { es: 'mont', us: 'CO', uk: 'CO' }, name: { es: 'montar', en: 'cast on' }, consumes: 0, produces: 1, start: true },
    { id: 'k', abbr: { es: 'd', us: 'k', uk: 'k' }, name: { es: 'derecho', en: 'knit' }, consumes: 1, produces: 1, variants: [{ id: 'tbl', abbr: { es: 'retorcido', us: 'tbl', uk: 'tbl' }, name: { es: 'retorcido', en: 'through back loop' } }] },
    { id: 'p', abbr: { es: 'r', us: 'p', uk: 'p' }, name: { es: 'revés', en: 'purl' }, consumes: 1, produces: 1 },
    { id: 'k2tog', abbr: { es: '2pjd', us: 'k2tog', uk: 'k2tog' }, name: { es: 'dos juntos al derecho', en: 'knit two together' }, consumes: 2, produces: 1 },
    { id: 'ssk', abbr: { es: 'ddd', us: 'ssk', uk: 'ssk' }, name: { es: 'deslizar, deslizar y tejer', en: 'slip, slip, knit' }, consumes: 2, produces: 1 },
    { id: 'yo', abbr: { es: 'hd', us: 'yo', uk: 'yfwd' }, name: { es: 'hebra delante', en: 'yarn over' }, consumes: 0, produces: 1 },
    { id: 'm1', abbr: { es: 'aum', us: 'M1', uk: 'M1' }, name: { es: 'aumento', en: 'make one' }, consumes: 0, produces: 1, variants: [{ id: 'l', abbr: { es: 'izq', us: 'L', uk: 'L' }, name: { es: 'a la izquierda', en: 'left' } }, { id: 'r', abbr: { es: 'der', us: 'R', uk: 'R' }, name: { es: 'a la derecha', en: 'right' } }] },
    { id: 'slp', abbr: { es: 'desl', us: 'sl', uk: 'sl' }, name: { es: 'deslizar', en: 'slip' }, consumes: 1, produces: 1 },
    { id: 'bo', abbr: { es: 'cerr', us: 'BO', uk: 'cast off' }, name: { es: 'cerrar', en: 'bind off' }, consumes: 1, produces: 0 },
  ],
}

export const CATALOGS: Record<Craft, Catalog> = { crochet: CROCHET, knitting: KNITTING }

/**
 * Other spellings the parser accepts for a stitch id, lower case. Kept apart
 * from the catalog so writing stays consistent while reading stays lenient.
 */
export const ALIASES: Record<string, string[]> = {
  mr: ['anillo mágico', 'anillo magico', 'anillo', 'magic ring', 'mc'],
  ch: ['cadenetas', 'cadena', 'ch'],
  sl: ['p.r.', 'pd', 'slst', 'sl st', 'ss'],
  sc: ['p.b.', 'mp', 'medio punto', 'sc'],
  dc: ['p.a.'],
  inc: ['aumento', 'aumentos', 'aum', 'inc'],
  dec: ['dis', 'dism', 'disminución', 'disminucion', 'disminuciones', 'dec', 'sc2tog', 'invdec'],
  k: ['k', 'knit'],
  p: ['p', 'purl'],
}

export function stitchById(catalog: Catalog, id: string): StitchDef | undefined {
  return catalog.stitches.find((s) => s.id === id)
}

/** The abbreviation as written in `locale`, with its variant if any: "pb bt". */
export function stitchLabel(catalog: Catalog, id: string, locale: Locale, variant?: string): string {
  const def = stitchById(catalog, id)
  if (!def) return id
  const v = variant ? def.variants?.find((x) => x.id === variant) : undefined
  return v ? `${def.abbr[locale]} ${v.abbr[locale]}` : def.abbr[locale]
}
