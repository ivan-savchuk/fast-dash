import { GridLayout, useContainerWidth } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
// Required, not optional: this is what makes each card `position: relative`,
// which is what anchors the resize handle to the card's own corner instead
// of the corner of the whole canvas.
import 'react-resizable/css/styles.css'

import { useMemo } from 'react'

import Card from './Card.jsx'
import { GRID_COLS, GRID_ROW_HEIGHT } from '../state/document.js'

// These must be module constants, not inline object literals. The library
// memoises its item rendering on the identity of these objects, so a fresh
// `{...}` on every render rebuilds every card on every keystroke and every
// drag update — which is exactly what made moving a card feel sluggish.
const GRID_CONFIG = {
  cols: GRID_COLS,
  rowHeight: GRID_ROW_HEIGHT,
  margin: [12, 12],
  containerPadding: [0, 0],
}
// `threshold` is how far the mouse must move before a drag starts (default 3px).
// 1px makes a card pick up the moment you move; a plain click still selects,
// because a click that never moves never crosses the threshold.
const DRAG_CONFIG = { enabled: true, cancel: '.no-drag', threshold: 1 }
const RESIZE_CONFIG = { enabled: true, handles: ['se'] }

// react-grid-layout does the placement, snapping, collision and resizing.
// It needs its own layout array (`i` = our component id) and hands the
// positions back through onDragStop / onResizeStop, which we push into the
// reducer so the document stays the single source of truth.

export default function Canvas({ components, selectedId, dispatch }) {
  // `mounted` is false until the container has been measured. Rendering the
  // grid before that places cards using a guessed 1280px width.
  const { width, containerRef, mounted } = useContainerWidth()

  // Same reason: a stable array identity keeps the library from re-syncing
  // its internal layout on unrelated renders.
  const layout = useMemo(
    () => components.map((c) => ({ i: c.id, ...c.layout })),
    [components],
  )

  const commitLayout = (next) => {
    // Belt and braces: drop any selection the drag managed to leave behind,
    // e.g. one started before the pointer entered a card.
    window.getSelection()?.removeAllRanges()
    dispatch({ type: 'setLayout', layout: next })
  }

  return (
    // The resize handle is a sibling of the Card, not a child, so the Card's
    // own guard never sees it. Catching mousedown here — in the capture phase,
    // before the library's handlers — covers cards and handles alike.
    <div
      ref={containerRef}
      className="min-h-full"
      onMouseDownCapture={(e) => {
        if (e.target.closest('input, textarea, button')) return
        e.preventDefault()
        // preventDefault suppresses the text selection, but it also suppresses
        // the browser's focus change. Without this, a title or description
        // field you typed in earlier keeps focus forever, and every keyboard
        // shortcut is then swallowed by the "ignore while typing" guard —
        // arrow keys scroll the page instead of moving the selected card.
        document.activeElement?.blur()
      }}
    >
      {components.length === 0 && (
        <p className="px-1 py-8 text-sm text-gray-400">
          Empty canvas. Add a component from the toolbar, or press 1–5.
        </p>
      )}

      {/* v2 of react-grid-layout groups its settings into config objects.
          Passing cols/rowHeight/draggableCancel at the top level does
          nothing — they are silently ignored. */}
      {mounted && (
        <GridLayout
          width={width}
          layout={layout}
          gridConfig={GRID_CONFIG}
          dragConfig={DRAG_CONFIG}
          resizeConfig={RESIZE_CONFIG}
          onDragStop={commitLayout}
          onResizeStop={commitLayout}
        >
          {components.map((c) => (
            <div key={c.id}>
              <Card component={c} selected={c.id === selectedId} dispatch={dispatch} />
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  )
}
