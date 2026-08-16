import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { variantsFor } from './placeholderArt.js'

// The small type label in a card's header.
//
// For most types it is exactly what it always was — a static grey label. For a
// type that can be drawn more than one way it becomes the control that switches
// between them. The header is the only place such a control can live: the card
// itself is the drag handle (`cursor-move` in Card.jsx), so a button on the
// left or right edge would sit right where you grab to move or resize.
//
// Superset puts the viz type in the card header too, so this matches the
// reference rather than inventing a control.

const MENU_WIDTH = 150

export default function TypeBadge({ id, type, variant, label, dispatch }) {
  const list = variantsFor(type)
  const [open, setOpen] = useState(false)
  const [at, setAt] = useState(null)
  const [highlighted, setHighlighted] = useState(0)
  const buttonRef = useRef(null)

  const current = Math.max(
    0,
    list.findIndex((v) => v.id === variant),
  )

  // This menu owns Esc, the arrows and Enter while it is open — capture phase,
  // so App's window listener never sees them and Esc does not also deselect the
  // card. Same arrangement as QuickPicker.
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
        buttonRef.current?.focus()
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        const step = e.key === 'ArrowDown' ? 1 : -1
        setHighlighted((i) => (i + step + list.length) % list.length)
        return
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        pick(list[highlighted]?.id)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
    // No dependency array on purpose: the handler closes over `highlighted`,
    // which changes as you arrow through the menu. Re-subscribing per render is
    // cheaper than the bookkeeping, and the effect returns immediately unless
    // the menu is actually open.
  })

  function pick(next) {
    if (next) dispatch({ type: 'setVariant', id, variant: next })
    setOpen(false)
    buttonRef.current?.focus()
  }

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    // Measured on open rather than tracked: the menu closes on any click, so it
    // never has to survive a scroll or a drag.
    const r = buttonRef.current.getBoundingClientRect()
    setAt({
      left: Math.max(8, Math.min(r.left, window.innerWidth - MENU_WIDTH - 8)),
      top: r.bottom + 4,
    })
    setHighlighted(current)
    setOpen(true)
  }

  // Types with one drawing keep the plain label they have always had.
  if (list.length < 2) {
    return (
      <span className="shrink-0 text-[10px] tracking-wide text-gray-300 uppercase dark:text-gray-500">
        {label}
      </span>
    )
  }

  // Once a non-default variant is chosen the badge names it — "STACKED" says
  // more than "BAR", and the silhouette already says it is a bar.
  const shown = list[current] === list[0] ? label : list[current].label

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Change how this chart is drawn ([ and ])"
        className="no-drag shrink-0 cursor-pointer rounded-sm px-1 text-[10px] tracking-wide text-gray-300 uppercase hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
      >
        {shown} ▾
      </button>

      {/* A portal, not a plain fixed element: react-grid-layout puts a CSS
          transform on every card, and a transformed ancestor makes
          `position: fixed` anchor to the card instead of the viewport. The card
          is also `overflow-hidden`. Both are escaped by rendering to the body. */}
      {open &&
        at &&
        createPortal(
          // A portal escapes the DOM but *not* the React tree: events raised in
          // here still bubble to Card and Canvas as if the menu sat inside the
          // card. Canvas decides a click is "empty canvas, open the quick
          // picker" when the target is not inside a `.react-grid-item` — which
          // a portaled menu never is — so without this guard, picking a variant
          // also opened the add-component menu. The wrapper is unpositioned; the
          // two children below are both `fixed`, so it costs no layout.
          <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <div className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} />
            <div
              role="menu"
              className="fixed z-50 overflow-hidden rounded-sm border border-gray-300 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
              style={{ left: at.left, top: at.top, width: MENU_WIDTH }}
            >
              {list.map((v, i) => (
                <button
                  key={v.id}
                  role="menuitemradio"
                  aria-checked={i === current}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => pick(v.id)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${
                    i === highlighted
                      ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {v.label}
                  {i === current && <span className="text-xs text-gray-400">✓</span>}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
