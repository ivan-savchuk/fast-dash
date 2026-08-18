import { useCallback, useEffect, useRef, useState } from 'react'

// The page tab strip. Dashboards are rarely one screen; this is how you move
// between them. Filters live on the document and are shared across pages
// (Superset's model), so only the card grid changes when you switch tabs.
//
// Double-click a tab to rename it. The × removes a page — with a confirm if it
// still holds components, and never on the last remaining page.
//
// The strip is only rendered at all once there are two pages (see App), so a
// single-page dashboard does not pay a whole bar of chrome for a tab it cannot
// switch away from. "+ Page" therefore cannot live here — there would be no way
// back to two pages from one — so it sits in the toolbar, which is its single
// home whatever the page count.
//
// ## Reordering
//
// Drag a tab where you want it. This replaces a pair of ‹ › buttons on the
// active tab, which were too small to aim at and only ever moved a page one
// slot at a time.
//
// **This is not HTML5 drag-and-drop.** That was tried for the filter rail and
// removed — see docs/NOTES.md — because the browser's own drag latency made it
// feel laggy and no amount of memoising fixed it. This is plain pointer events,
// the same thing react-grid-layout uses for cards, so there is no drag image,
// no dragover throttling and nothing to feel late.
//
// The tab rects are measured **once, at mousedown**, and every later decision is
// made against that snapshot. The strip visibly reflows while you drag (a gap
// opens where the tab will land), so measuring live would mean deciding against
// positions that are themselves moving.
//
// Alt+← / Alt+→ do the same thing from the keyboard — the convention the filter
// rail already uses for its rows, and what keeps design principle 5 true now
// that the buttons are gone.

// How far the pointer must travel before this counts as a drag rather than a
// click. Below it, a plain click still switches page and a double-click still
// starts a rename.
const DRAG_THRESHOLD = 4

// Where a tab dragged from index `from` would land if dropped at pointer x.
//
// `rects` are the tab bounding boxes as measured at mousedown, left to right.
// The insertion slot is however many midpoints the pointer has passed; taking
// the dragged tab out of the list first shifts everything after it left by one,
// which is what the adjustment accounts for. The result is the index the tab
// ends up at, ready to hand straight to `movePage`.
//
// Exported only so it can be tested against real coordinates — the geometry is
// the part of a drag that is easy to get subtly wrong and impossible to see.
export function dropIndex(rects, x, from) {
  let slot = rects.filter((r) => x > (r.left + r.right) / 2).length
  if (slot > from) slot -= 1
  return Math.min(Math.max(slot, 0), rects.length - 1)
}

export default function PageTabs({ pages, activeId, dropTargetId, dispatch }) {
  const [editingId, setEditingId] = useState(null)
  // { id, from, to } while a tab is being dragged, otherwise null.
  const [drag, setDrag] = useState(null)
  const stripRef = useRef(null)
  // Detaches the window listeners of a drag in flight. The strip can vanish
  // mid-drag — deleting a page can take the dashboard back to one — and
  // clearing state would leave the listeners attached to nothing.
  const detachRef = useRef(null)
  // Set when a drag actually happened, so the click that follows mouseup does
  // not also switch page.
  const draggedRef = useRef(false)

  function commitRename(id, name) {
    setEditingId(null)
    const trimmed = name.trim()
    // An empty name would render as an unclickable sliver; keep the old one.
    if (trimmed) dispatch({ type: 'renamePage', id, name: trimmed })
  }

  function handleDelete(page) {
    if (pages.length <= 1) return
    const n = page.components.length
    if (n > 0 && !window.confirm(`Delete "${page.name}" and its ${n} component${n === 1 ? '' : 's'}?`)) {
      return
    }
    dispatch({ type: 'deletePage', id: page.id })
  }

  const move = useCallback(
    (id, toIndex) => dispatch({ type: 'movePage', id, toIndex }),
    [dispatch],
  )

  function beginDrag(e, from, id) {
    if (e.button !== 0 || editingId) return
    const rects = [...stripRef.current.querySelectorAll('[data-page-tab]')].map((el) =>
      el.getBoundingClientRect(),
    )
    const startX = e.clientX
    draggedRef.current = false
    let to = from

    const onMove = (ev) => {
      if (!draggedRef.current && Math.abs(ev.clientX - startX) < DRAG_THRESHOLD) return
      draggedRef.current = true
      to = dropIndex(rects, ev.clientX, from)
      setDrag({ id, from, to })
    }

    const detach = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      detachRef.current = null
    }

    const onUp = () => {
      detach()
      setDrag(null)
      if (draggedRef.current && to !== from) move(id, to)
      // One frame later, so the click that mouseup is about to fire still sees
      // the flag and skips switching page.
      if (draggedRef.current) requestAnimationFrame(() => (draggedRef.current = false))
    }

    detachRef.current = detach
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  useEffect(() => () => detachRef.current?.(), [])

  return (
    <div
      ref={stripRef}
      className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 bg-white px-4 py-1.5 select-none dark:border-gray-700 dark:bg-gray-800"
    >
      {pages.map((page, i) => {
        const active = page.id === activeId
        if (editingId === page.id) {
          return (
            <input
              key={page.id}
              autoFocus
              defaultValue={page.name}
              onFocus={(e) => e.target.select()}
              onBlur={(e) => commitRename(page.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.target.blur()
                if (e.key === 'Escape') {
                  e.target.value = page.name // discard the edit
                  e.target.blur()
                }
              }}
              className="w-32 rounded-sm border border-gray-300 px-2 py-1 text-sm outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              aria-label="Page name"
            />
          )
        }
        // The gap that opens where the dragged tab will land. `to` is the index
        // it ends up at *after* being pulled out and put back, so dragging right
        // means it lands after the tab now sitting at `to`, and dragging left
        // means before it. Rendered as a real element rather than a border, so
        // nothing inherits a 2px jump when the drag ends; the rects were
        // snapshotted before any of this started moving.
        const atTarget = drag && drag.to === i && drag.from !== i
        const marker = atTarget ? (
          <div
            key={`slot-${page.id}`}
            className="h-6 w-0.5 shrink-0 rounded-full bg-[var(--fd-accent)]"
          />
        ) : null

        return [
          atTarget && drag.from > drag.to ? marker : null,
          <div
            key={page.id}
            // Canvas reads these at card-drag start to find the drop targets.
            // A data attribute rather than a ref registry: the strip and the
            // canvas are siblings, and one query at drag start is cheaper than
            // wiring a shared collection through App for something that is only
            // ever read at one instant.
            data-page-tab={page.id}
            // Alt+arrow reorders from the keyboard. Plain arrows are left alone:
            // outside a field they nudge the selected card on the canvas.
            onKeyDown={(e) => {
              if (!e.altKey) return
              if (e.key === 'ArrowLeft' && i > 0) {
                e.preventDefault()
                move(page.id, i - 1)
              } else if (e.key === 'ArrowRight' && i < pages.length - 1) {
                e.preventDefault()
                move(page.id, i + 1)
              }
            }}
            className={`flex shrink-0 items-center rounded-sm border text-sm ${
              drag?.id === page.id ? 'opacity-40' : ''
            } ${
              // A card is being dragged over this tab and will land here.
              dropTargetId === page.id
                ? 'ring-2 ring-[var(--fd-accent)] ring-offset-1 dark:ring-offset-gray-800'
                : ''
            } ${
              active
                ? 'border-[var(--fd-accent)] bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                : 'border-transparent text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <button
              className="max-w-[16rem] cursor-grab truncate py-1 pl-3 pr-1 text-left active:cursor-grabbing"
              onMouseDown={(e) => beginDrag(e, i, page.id)}
              onClick={() => {
                if (draggedRef.current) return
                dispatch({ type: 'selectPage', id: page.id })
              }}
              onDoubleClick={() => setEditingId(page.id)}
              title="Click to open · double-click to rename · drag to reorder (alt+←/→)"
            >
              {page.name}
            </button>
            {pages.length > 1 && (
              <button
                className="px-1.5 text-gray-400 hover:text-gray-700"
                onClick={() => handleDelete(page)}
                title="Delete page"
                aria-label={`Delete ${page.name}`}
              >
                ×
              </button>
            )}
          </div>,
          atTarget && drag.from < drag.to ? marker : null,
        ]
      })}
    </div>
  )
}
