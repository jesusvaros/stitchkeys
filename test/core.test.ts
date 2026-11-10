import { describe, expect, it } from 'vitest'
import {
  backspace, checkRow, formatInput, CROCHET, emptyInput, formatRow, KNITTING, nextDecrease, nextIncrease, parseRow, rowTotal,
  typeDigit, typeGroup, typeStitch, typeText, typeTimes, type InputState, type Row,
} from '../src'

const es = (row: Row) => formatRow(CROCHET, row, 'es')
const run = (...steps: ((s: InputState) => InputState)[]) => steps.reduce((s, f) => f(s), emptyInput())
const n = (d: number) => (s: InputState) => typeDigit(s, d)
const st = (id: string, v?: string) => (s: InputState) => typeStitch(s, id, v)

describe('counting and checking', () => {
  it('counts increases and decreases inside groups', () => {
    const row = parseRow(CROCHET, '(1 pb, 1 aum) x6')
    expect(checkRow(CROCHET, row, 12)).toEqual({ consumes: 12, produces: 18, status: 'ok', difference: 0 })
    expect(checkRow(CROCHET, parseRow(CROCHET, '(2 pb, 1 dism) x5'), 24)).toMatchObject({ consumes: 20, status: 'left', difference: 4 })
    expect(checkRow(CROCHET, parseRow(CROCHET, '30 pb'), 24)).toMatchObject({ status: 'short', difference: 6 })
  })

  it('does not check a row started in a ring or a row with free text', () => {
    expect(checkRow(CROCHET, parseRow(CROCHET, '6 pb en anillo mágico'), 40)).toMatchObject({ produces: 6, status: 'unchecked' })
    expect(checkRow(CROCHET, parseRow(CROCHET, '6 pb, cambiar a color B'), 6)).toMatchObject({ status: 'unchecked' })
  })

  it('writes knitting the way knitters do', () => {
    expect(formatRow(KNITTING, parseRow(KNITTING, '*k2, p2* x6'), 'us')).toBe('(k2, p2) ×6')
    expect(formatRow(KNITTING, parseRow(KNITTING, 'k2tog, yo, ssk'), 'us')).toBe('k2tog, yo, ssk')
    expect(formatRow(KNITTING, parseRow(KNITTING, 'CO 20'), 'uk')).toBe('CO 20')
  })
  it('counts knitting', () => {
    expect(checkRow(KNITTING, parseRow(KNITTING, '(k2, k2tog) x5'), 20)).toMatchObject({ consumes: 20, produces: 15, status: 'ok' })
  })
})

describe('writing and reading', () => {
  it('writes rows in each notation', () => {
    const row = parseRow(CROCHET, '(1 sc, 1 inc) x6')
    expect(es(row)).toBe('(1 pb, 1 aum) ×6')
    expect(formatRow(CROCHET, row, 'uk')).toBe('(1 dc, 1 inc) ×6')
    expect(es(parseRow(CROCHET, 'am, 6 pb'))).toBe('am, 6 pb')
  })

  it('reads the usual ways patterns write a row', () => {
    expect(es(parseRow(CROCHET, '6pb en anillo mágico (6)'))).toBe('am, 6 pb')
    expect(es(parseRow(CROCHET, '*2 pb, aum* x6 (24)'))).toBe('(2 pb, 1 aum) ×6')
    expect(es(parseRow(CROCHET, '6 aum (12)'))).toBe('6 aum')
    expect(es(parseRow(CROCHET, 'pb en bucle trasero 18'))).toBe('18 pb bt')
    expect(es(parseRow(CROCHET, '6 dism invisible'))).toBe('6 dism inv')
    expect(rowTotal('(1 pb, 1 aum) x6 (18)')).toBe(18)
  })

  it('keeps what it cannot read as text', () => {
    expect(parseRow(CROCHET, '5 pb, coser los ojos entre V8 y V9')).toEqual([
      { type: 'stitch', id: 'sc', count: 5 },
      { type: 'text', text: 'coser los ojos entre V8 y V9' },
    ])
  })
})

describe('typing', () => {
  it('types a sphere round: ( 1 pb 1 aum ) 6 ×n', () => {
    const s = run(typeGroup, n(1), st('sc'), n(1), st('inc'), n(6), typeTimes)
    expect(es(s.row)).toBe('(1 pb, 1 aum) ×6')
    expect(s.open).toBe(false)
  })

  it('adds to the same stitch when tapped again', () => {
    expect(es(run(st('sc'), st('sc'), st('sc')).row)).toBe('3 pb')
    expect(es(run(n(6), st('sc'), st('inc')).row)).toBe('6 pb, 1 aum')
  })

  it('repeats the whole row when no group is open', () => {
    expect(es(run(n(2), st('sc'), st('inc'), n(6), typeTimes).row)).toBe('(2 pb, 1 aum) ×6')
  })

  it('deletes digit, stitch, then the empty group', () => {
    let s = run(typeGroup, n(1), st('sc'), n(4))
    s = backspace(s)
    expect(s.pending).toBe('')
    s = backspace(s)
    expect(s.row).toEqual([{ type: 'group', items: [], times: 1 }])
    s = backspace(s)
    expect(s).toEqual(emptyInput())
  })

  it('reopens a closed group to delete inside it', () => {
    const s = backspace(run(typeGroup, st('sc'), st('inc'), n(6), typeTimes))
    expect(s.open).toBe(true)
    expect(es(backspace(s).row)).toBe('(1 pb)')
  })

  it('shows the row as it is being typed', () => {
    expect(formatInput(CROCHET, run(typeGroup, n(1), st('sc'), n(1)), 'es')).toBe('(1 pb, 1')
    expect(formatInput(CROCHET, run(typeGroup, n(3)), 'es')).toBe('(3')
    expect(formatInput(CROCHET, run(n(6), st('sc'), n(1)), 'es')).toBe('6 pb, 1')
  })

  it('types text and variants', () => {
    expect(es(run(n(6), st('dec', 'inv'), (s) => typeText(s, 'rellenar')).row)).toBe('6 dism inv, rellenar')
  })
})

describe('shapes', () => {
  it('builds the classic amigurumi sphere', () => {
    expect(es(nextIncrease(6)!)).toBe('6 aum')
    expect(es(nextIncrease(12)!)).toBe('(1 pb, 1 aum) ×6')
    expect(es(nextDecrease(24)!)).toBe('(2 pb, 1 dism) ×6')
    expect(es(nextDecrease(12)!)).toBe('6 dism')
    expect(nextIncrease(10)).toBeNull()
  })
})
