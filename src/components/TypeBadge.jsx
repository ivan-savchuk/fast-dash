import { useCallback, useEffect, useRef, useState } from 'react'

import Popover from './Popover.jsx'
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
//
// `Popover` owns the portal, the backdrop and Escape; this file owns the list.

const MENU_WIDTH = 150

export default function TypeBadge({ id, type, variant, label, dispatch }) {
  const list = variantsFor(type)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const buttonRef = useRef(null)

  const current = Math.max(
    0,
    list.findIndex((v) => v.id === variant),
  )

  const close = useCallback(() => {
    setOpen(false)
    buttonRef.current?.focus()
  }, [])

  // Arrows and Enter belong to the menu while it is open — capture phase, so
  // App's window listener never sees them. Escape is Popover's.
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
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
    close()
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
        onClick={() => (open ? close() : (setHighlighted(current), setOpen(true)))}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Change how this chart is drawn ([ and ])"
        className="no-drag shrink-0 cursor-pointer rounded-sm px-1 text-[10px] tracking-wide text-gray-300 uppercase hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
      >
        {shown} ▾
      </button>

      {open && (
        <Popover anchorRef={buttonRef} width={MENU_WIDTH} onClose={close} className="py-1">
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
        </Popover>
      )}
    </>
  )
}
