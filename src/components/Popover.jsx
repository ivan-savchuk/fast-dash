import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// A small panel anchored under something in a card header — the variant menu,
// the column editor. It exists as its own component because getting one of
// these right inside a card takes three non-obvious pieces, and hand-writing
// them a second time is how the second one ends up subtly broken.
//
// 1. **It has to be a portal.** `react-grid-layout` runs with `useCSSTransforms`
//    (its default), so every card carries a CSS transform, and a transformed
//    ancestor becomes the containing block for `position: fixed` — a fixed panel
//    inside a card anchors to the card, not the viewport. The card is
//    `overflow-hidden` as well. Rendering to `document.body` escapes both.
//
// 2. **A portal escapes the DOM but not the React tree.** Events raised inside
//    still bubble to Card and Canvas as though the panel sat in the card, and
//    Canvas reads a click whose target is not inside a `.react-grid-item` as
//    "empty canvas, open the quick picker". So the contents stop `click` and
//    `mousedown` at the portal boundary.
//
// 3. **Escape is caught in the capture phase**, before App's window listener,
//    so closing the panel does not also deselect the card.
//
// Both traps fail silently rather than erroring. See docs/NOTES.md.

export default function Popover({ anchorRef, width, onClose, className = '', role = 'menu', children }) {
  const [at, setAt] = useState(null)

  // Measured once on open rather than tracked: the panel closes on any click
  // outside, so it never has to survive a scroll or a drag.
  useLayoutEffect(() => {
    const r = anchorRef.current?.getBoundingClientRect()
    if (!r) return
    setAt({
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
      top: r.bottom + 4,
    })
  }, [anchorRef, width])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  if (!at) return null

  return createPortal(
    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div
        role={role}
        className={`fixed z-50 overflow-hidden rounded-sm border border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 ${className}`}
        style={{ left: at.left, top: at.top, width }}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
