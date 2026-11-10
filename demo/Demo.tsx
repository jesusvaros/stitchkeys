// The stitchkeys demo: a phone-sized row editor, the way a pattern app would
// use the keyboard. Also what the README's screenshots are taken from.
import { useState } from 'react'
import { CROCHET, KNITTING, nextIncrease, parseRow, type Locale } from '../src'
import { StitchKeyboard, useStitchInput } from '../src/react'

const START = new URLSearchParams(location.search)

export function Demo() {
  const [locale, setLocale] = useState<Locale>((START.get('locale') as Locale) ?? 'us')
  const [craft, setCraft] = useState<'crochet' | 'knitting'>(START.get('craft') === 'knitting' ? 'knitting' : 'crochet')
  const [previous, setPrevious] = useState(Number(START.get('previous') ?? 18))
  const catalog = craft === 'crochet' ? CROCHET : KNITTING
  const preset = START.get('row')
  const { state, setState, text, check, reset } = useStitchInput(catalog, { previous, locale, initial: preset ? parseRow(catalog, preset) : [] })
  const status = check.status === 'ok' ? `${check.produces} sts · fits` : check.status === 'left' ? `${check.difference} left over` : check.status === 'short' ? `${check.difference} short` : 'starting row'
  return (
    <main className="demo">
      <header className="demo__head">
        <h1>stitchkeys</h1>
        <p>A keyboard of stitches for writing crochet and knitting rows on a phone.</p>
      </header>
      <div className="demo__switches">
        <div role="group" aria-label="Terms">
          {(['us', 'uk', 'es'] as Locale[]).map((l) => <button key={l} aria-pressed={locale === l} onClick={() => setLocale(l)}>{l.toUpperCase()}</button>)}
        </div>
        <div role="group" aria-label="Craft">
          {(['crochet', 'knitting'] as const).map((c) => <button key={c} aria-pressed={craft === c} onClick={() => { setCraft(c); reset([]) }}>{c}</button>)}
        </div>
      </div>
      <section className="demo__row">
        <div className="demo__prev">
          <span>Previous row</span>
          <button onClick={() => setPrevious(Math.max(0, previous - 6))} aria-label="Fewer">−</button>
          <b>{previous}</b>
          <button onClick={() => setPrevious(previous + 6)} aria-label="More">+</button>
        </div>
        <p className="demo__text">{text || <span className="demo__placeholder">Tap a count, then a stitch</span>}</p>
        <p className={`demo__check demo__check--${check.status}`}>{status}</p>
      </section>
      <div className="demo__keys">
        <StitchKeyboard
          catalog={catalog}
          locale={locale}
          state={state}
          onChange={setState}
          quick={craft === 'crochet' ? [{ label: locale === 'es' ? 'Siguiente aumento' : 'Next increase', onPress: () => reset(nextIncrease(previous) ?? []) }] : undefined}
        />
      </div>
    </main>
  )
}

