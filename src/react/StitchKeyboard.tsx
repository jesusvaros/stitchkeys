import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { stitchLabel } from '../catalog'
import { backspace, typeDigit, typeGroup, typeStitch, typeTimes, type InputState } from '../edit'
import type { Catalog, Locale, StitchDef } from '../types'

export interface QuickAction {
  label: string
  onPress: () => void
}

export interface StitchKeyboardProps {
  catalog: Catalog
  locale: Locale
  state: InputState
  onChange: (state: InputState) => void
  /** Stitch ids to show, in order; all of the catalog by default. */
  keys?: string[]
  /** Shortcuts shown above the keys: "Repetir V4", "Siguiente aumento"… */
  quick?: QuickAction[]
  /** The "Aa" key: switch to the system keyboard for free text. Hidden if not given. */
  onTextRequest?: () => void
  /** Called on every key press, e.g. for a haptic tick. */
  onKeyPress?: () => void
  /** Labels of the control keys, for other languages. */
  labels?: Partial<Labels>
  /** Long-press time before the variants show, in ms. */
  holdMs?: number
}

type Labels = { keyboard: string; group: string; times: string; text: string; delete: string; variants: string }
// The control keys speak the keyboard's language: Spanish for 'es', English for 'us' and 'uk'.
const LABELS: Record<'es' | 'en', Labels> = {
  es: { keyboard: 'Teclado de puntos', group: 'grupo', times: 'repetir', text: 'texto', delete: 'Borrar', variants: 'Variantes de' },
  en: { keyboard: 'Stitch keyboard', group: 'group', times: 'repeat', text: 'text', delete: 'Delete', variants: 'Variants of' },
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]

/**
 * A keyboard whose keys are stitches. Type the count, then the stitch:
 * "6" "aum" → "6 aum". "( )" opens and closes a group; "×n" repeats it by
 * the count typed before. Hold a key with dots to pick a variant (back loop,
 * invisible…), sliding onto it and letting go, as with accents on a phone.
 */
export function StitchKeyboard({
  catalog, locale, state, onChange, keys, quick, onTextRequest, onKeyPress, labels, holdMs = 350,
}: StitchKeyboardProps) {
  const lang = locale === 'es' ? 'es' : 'en'
  const l = { ...LABELS[lang], ...labels }
  const defs = (keys ?? catalog.stitches.map((s) => s.id))
    .map((id) => catalog.stitches.find((s) => s.id === id))
    .filter((s): s is StitchDef => !!s)
  // Taps can come faster than the host re-renders: each one builds on the
  // latest state typed, not on the one this render was given.
  const latest = useRef(state)
  useLayoutEffect(() => {
    latest.current = state
  }, [state])
  const press = (edit: (s: InputState) => InputState) => {
    onKeyPress?.()
    const next = edit(latest.current)
    latest.current = next
    onChange(next)
  }

  return (
    <div className="sk" role="group" aria-label={l.keyboard}>
      {quick && quick.length > 0 && (
        <div className="sk-quick">
          {quick.map((q) => (
            <button key={q.label} type="button" className="sk-quick__btn" onClick={() => { onKeyPress?.(); q.onPress() }}>{q.label}</button>
          ))}
        </div>
      )}
      <div className="sk-digits">
        {DIGITS.map((d) => (
          <Key key={d} className="sk-key sk-key--digit" onPress={() => press((s) => typeDigit(s, d))}>{d}</Key>
        ))}
      </div>
      <div className="sk-stitches">
        {defs.map((def) => (
          <StitchKey
            key={def.id}
            def={def}
            label={stitchLabel(catalog, def.id, locale)}
            name={def.name[lang]}
            variantsLabel={l.variants}
            variantLabel={(v) => stitchLabel(catalog, def.id, locale, v)}
            holdMs={holdMs}
            onPick={(variant) => press((s) => typeStitch(s, def.id, variant))}
          />
        ))}
      </div>
      <div className="sk-controls">
        <Key className={`sk-key sk-key--control${state.open ? ' is-open' : ''}`} onPress={() => press(typeGroup)} label={l.group}>
          {state.open ? ')' : '( )'}<small>{l.group}</small>
        </Key>
        <Key className="sk-key sk-key--control" onPress={() => press(typeTimes)} label={l.times}>
          ×{state.pending || 'n'}<small>{l.times}</small>
        </Key>
        {onTextRequest && (
          <Key className="sk-key sk-key--control" onPress={() => { onKeyPress?.(); onTextRequest() }} label={l.text}>
            Aa<small>{l.text}</small>
          </Key>
        )}
        <Key className="sk-key sk-key--control" onPress={() => press(backspace)} label={l.delete}>⌫</Key>
      </div>
    </div>
  )
}

function Key({ className, onPress, label, children }: { className: string; onPress: () => void; label?: string; children: ReactNode }) {
  return (
    <button type="button" className={className} aria-label={label} onClick={onPress}>
      {children}
    </button>
  )
}

/** A stitch key: tap for the stitch; hold, slide and let go for a variant. */
function StitchKey({ def, label, name, variantsLabel, variantLabel, holdMs, onPick }: {
  def: StitchDef
  label: string
  name: string
  variantsLabel: string
  variantLabel: (variant: string) => string
  holdMs: number
  onPick: (variant?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [over, setOver] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const held = useRef(false)
  const pressing = useRef(false)
  const key = useRef<HTMLButtonElement>(null)
  const variants = def.variants ?? []

  // Belt and braces for browsers that ignore touch-action: while a key with
  // variants is pressed, a finger moving does not scroll (that would cancel
  // the touch and close the variants).
  useEffect(() => {
    const el = key.current
    if (!el || variants.length === 0) return
    const stop = (e: TouchEvent) => {
      if (pressing.current && e.cancelable) e.preventDefault()
    }
    el.addEventListener('touchmove', stop, { passive: false })
    return () => el.removeEventListener('touchmove', stop)
  }, [variants.length])

  const optionAt = (e: ReactPointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)
    return (el?.closest('[data-sk-variant]') as HTMLElement | null)?.dataset.skVariant ?? null
  }
  const down = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (variants.length === 0) return
    held.current = false
    pressing.current = true
    e.currentTarget.setPointerCapture?.(e.pointerId)
    timer.current = setTimeout(() => {
      held.current = true
      setOpen(true)
    }, holdMs)
  }
  const move = (e: ReactPointerEvent) => {
    if (open) setOver(optionAt(e))
  }
  const up = (e: ReactPointerEvent) => {
    pressing.current = false
    clearTimeout(timer.current)
    if (!held.current) return
    const picked = optionAt(e)
    setOpen(false)
    setOver(null)
    if (picked) onPick(picked === '_' ? undefined : picked)
  }
  const cancel = () => {
    pressing.current = false
    clearTimeout(timer.current)
    setOpen(false)
    setOver(null)
  }

  return (
    <span className="sk-stitch">
      <button
        ref={key}
        type="button"
        className={`sk-key sk-key--stitch${variants.length ? ' has-variants' : ''}`}
        aria-label={name}
        aria-haspopup={variants.length ? 'menu' : undefined}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          // A hold already picked (or dismissed); a plain tap types the stitch.
          if (held.current) {
            held.current = false
            return
          }
          onPick()
        }}
        onKeyDown={(e) => {
          if (variants.length && (e.key === 'ArrowUp' || e.key === 'ContextMenu')) {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        <b>{label}</b>
        <small>{name}</small>
      </button>
      {open && (
        <span className="sk-variants" role="menu" aria-label={`${variantsLabel} ${name}`}>
          <button type="button" role="menuitem" data-sk-variant="_" className={over === '_' ? 'is-over' : undefined} onClick={() => { setOpen(false); onPick() }}>{label}</button>
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              role="menuitem"
              data-sk-variant={v.id}
              className={over === v.id ? 'is-over' : undefined}
              onClick={() => { setOpen(false); onPick(v.id) }}
            >
              {variantLabel(v.id)}
            </button>
          ))}
        </span>
      )}
    </span>
  )
}
