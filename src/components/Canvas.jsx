import { GridLayout, useContainerWidth } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
// Required, not optional: this is what makes each card `position: relative`,
// which is what anchors the resize handle to the card's own corner instead
// of the corner of the whole canvas.
import 'react-resizable/css/styles.css'

import { memo, useMemo, useRef } from 'react'

import Card from './Card.jsx'
import { GRID_COLS, GRID_ROW_HEIGHT, tabChildIds } from '../state/document.js'
import { TEMPLATE_LIST } from '../templates.js'
import { useT } from '../i18n.jsx'

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
//
// `[data-tabs-content]` is added to the cancel list so that dragging inside a
// Tabs container's body never drags the container itself — the nested grid in
// there handles its own children. The container is still dragged by its header.
// The nested grid uses a plain `.no-drag` cancel (Card's own chrome), which is
// why the two are different: if the tab body were marked `.no-drag`, the nested
// grid would refuse to drag its own children too.
const DRAG_CONFIG = { enabled: true, cancel: '.no-drag, [data-tabs-content]', threshold: 1 }
const RESIZE_CONFIG = { enabled: true, handles: ['se'] }
// Present mode. Module constants for the same reason as the two above.
const LOCKED_DRAG = { enabled: false }
const LOCKED_RESIZE = { enabled: false }

// react-grid-layout does the placement, snapping, collision and resizing.
// It needs its own layout array (`i` = our component id) and hands the
// positions back through onDragStop / onResizeStop, which we push into the
// reducer so the document stays the single source of truth.

// --- the empty canvas ---
//
// A blank grid with one line of grey text was the first thing anyone saw, which
// is the worst possible opening frame for a tool whose pitch is speed. The three
// starter dashboards were also buried in the Options menu, where nobody looking
// at an empty canvas would think to go.
//
// Grid cells are not square — a column is roughly 100px against a 40px row — so
// a thumbnail drawn on square cells would make every dashboard look like a
// tower. CELL_W is that real ratio, and GAP is the 12px gutter measured in the
// same units (12/100 of a column, 12/40 of a row: the same 0.3 either way).
const CELL_W = 2.5
const GAP = 0.3

// One viewBox height for all three, so they share a scale and line up: a shorter
// dashboard should look shorter, not be blown up to fill the same box.
const THUMB_ROWS = Math.max(
  ...TEMPLATE_LIST.map((t) => t.preview.reduce((max, c) => Math.max(max, c.y + c.h), 0)),
)

// The template's shape, drawn from the layout it is actually built from.
function TemplateThumb({ preview }) {
  return (
    <svg
      viewBox={`0 0 ${GRID_COLS * CELL_W} ${THUMB_ROWS}`}
      className="w-full rounded-sm bg-gray-50 dark:bg-gray-900"
      aria-hidden="true"
    >
      {preview.map((c, i) => (
        <rect
          key={i}
          x={c.x * CELL_W}
          y={c.y}
          width={c.w * CELL_W - GAP}
          height={c.h - GAP}
          rx="0.15"
          className="fill-gray-300 dark:fill-gray-600"
        />
      ))}
    </svg>
  )
}

// memo: the drop-target highlight lives on App, so every time a dragged card
// crosses onto or off a page tab, App re-renders. Without this that would
// re-render the grid in the middle of a react-grid-layout drag. Its props are
// all primitives, reducer-stable values or stable callbacks, so the memo holds.
export default memo(Canvas)

function Canvas({
  components,
  selectedId,
  activeTabs,
  freezeAnim,
  docEmpty,
  readOnly,
  activePageId,
  dispatch,
  onEmptyClick,
  onAddInto,
  onPickTemplate,
  onStartTour,
  onDropTarget,
}) {
  const t = useT()
  // `mounted` is false until the container has been measured. Rendering the
  // grid before that places cards using a guessed 1280px width.
  const { width, containerRef, mounted } = useContainerWidth()
  const gridAreaRef = useRef(null)

  // Turn a click into the grid cell under the cursor, so a component added
  // from the quick picker lands where you pointed rather than at the bottom.
  function handleBackgroundClick(e) {
    // Clicks that land on a card are the card's business.
    if (e.target.closest('.react-grid-item')) return
    // And a click on a template card is the gallery's: without this, picking a
    // template would also open the quick picker on top of the dashboard it just
    // loaded. The only buttons inside this region are the gallery's — a card's
    // own buttons are already excluded above.
    if (e.target.closest('button')) return

    const rect = gridAreaRef.current.getBoundingClientRect()
    const [gapX, gapY] = GRID_CONFIG.margin
    const columnWidth = (width - gapX * (GRID_COLS - 1)) / GRID_COLS

    onEmptyClick({
      clientX: e.clientX,
      clientY: e.clientY,
      x: Math.floor((e.clientX - rect.left) / (columnWidth + gapX)),
      y: Math.floor((e.clientY - rect.top) / (GRID_ROW_HEIGHT + gapY)),
    })
  }

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

  // --- dragging a card onto a page tab ---
  //
  // Drag a card up to the page strip and drop it on another page's tab and it
  // goes there. This is what replaced a permanent control in every card header.
  //
  // react-grid-layout owns the pointer during a card drag, so this hangs off its
  // own callbacks rather than window listeners. onDragStart / onDrag /
  // onDragStop all hand back `(layout, oldItem, newItem, placeholder, e, node)`,
  // so the mouse event — and with it the pointer position — arrives for free,
  // and `newItem.i` is the dragged card's id at the moment of the drop.
  //
  // Deciding in onDragStop rather than on a mouseup of our own is the point.
  // The library fires that callback from inside its own mouseup handler, so a
  // window listener here would race it; taking the library's moment means there
  // is no ordering question to get wrong.
  const tabRects = useRef([])
  const dropTarget = useRef(null)

  // onDrag fires on every mousemove, so the highlight is pushed up to App only
  // when the answer changes — otherwise this re-renders the app shell
  // continuously for the length of a drag.
  const setDrop = (id) => {
    if (dropTarget.current === id) return
    dropTarget.current = id
    onDropTarget?.(id)
  }

  const pageUnder = (e) => {
    const x = e?.clientX
    const y = e?.clientY
    if (x == null || y == null) return null
    const hit = tabRects.current.find(
      (t) => x >= t.rect.left && x <= t.rect.right && y >= t.rect.top && y <= t.rect.bottom,
    )
    return hit?.id ?? null
  }

  const handleDragStart = () => {
    // Measured once. The strip cannot move during a card drag — the canvas
    // scrolls on its own and the strip does not — and reading layout on every
    // mousemove mid-drag is exactly what makes a drag feel heavy.
    //
    // The active page is filtered out here, so it is never a target and never
    // lights up: dropping a card on the page it is already on is an ordinary
    // move, not a page change.
    tabRects.current = [...document.querySelectorAll('[data-page-tab]')]
      .map((el) => ({ id: el.dataset.pageTab, rect: el.getBoundingClientRect() }))
      .filter((t) => t.id && t.id !== activePageId)
    setDrop(null)
  }

  const handleDrag = (_layout, _old, _item, _placeholder, e) => setDrop(pageUnder(e))

  const handleDragStop = (next, _old, item, _placeholder, e) => {
    const target = pageUnder(e)
    setDrop(null)
    tabRects.current = []
    if (target) {
      // The card is leaving this page, so the arrangement this drag produced
      // here is about to stop existing. Committing it would add a second,
      // pointless undo step describing a page the card is no longer on.
      window.getSelection()?.removeAllRanges()
      dispatch({ type: 'moveToPage', id: item?.i, pageId: target })
      return
    }
    commitLayout(next)
  }

  return (
    // The resize handle is a sibling of the Card, not a child, so the Card's
    // own guard never sees it. Catching mousedown here — in the capture phase,
    // before the library's handlers — covers cards and handles alike.
    <div
      ref={containerRef}
      className={`min-h-full${freezeAnim ? ' rgl-instant' : ''}`}
      // Nothing drags in present mode, so there is no drag-selection to
      // suppress — and not suppressing it is what lets a viewer select and copy
      // a card's title or note.
      onMouseDownCapture={
        readOnly
          ? undefined
          : (e) => {
              if (e.target.closest('input, textarea, button')) return
              e.preventDefault()
              // preventDefault suppresses the text selection, but it also
              // suppresses the browser's focus change. Without this, a title or
              // description field you typed in earlier keeps focus forever, and
              // every keyboard shortcut is then swallowed by the "ignore while
              // typing" guard — arrow keys scroll the page instead of moving
              // the selected card.
              document.activeElement?.blur()
            }
      }
    >
      {/* The grid is only as tall as its content, so this wrapper provides the
          empty space the quick picker is summoned from: a minimum height for an
          empty canvas, and padding below that survives however tall the grid
          grows. Without the padding a full dashboard leaves nowhere to click.

          The empty state lives INSIDE it, not above it. Outside, the whole band
          the template gallery occupies swallowed its clicks — the handler is on
          this element — so on an empty canvas you could not summon the picker
          anywhere near the cards. */}
      <div
        ref={gridAreaRef}
        // The click space exists so the picker can be summoned from it. In
        // present mode there is no picker, so the page ends where the dashboard
        // does instead of trailing 40rem of nothing.
        className={readOnly ? '' : 'min-h-[70vh] pb-40'}
        onClick={readOnly ? undefined : handleBackgroundClick}
      >
        {components.length === 0 && readOnly && (
          <div className="flex min-h-[60vh] items-center justify-center px-4">
            <p className="text-sm text-gray-400">This page has no components.</p>
          </div>
        )}

        {/* A page with nothing on it and no gallery to show is a whole screen of
            empty, and one line of grey text pinned to the top left of it reads
            as a stray label rather than as an invitation. Centred, it sits where
            the eye already is. The block is still inside the click region, so
            clicking the message itself opens the picker like any other empty
            spot. */}
        {components.length === 0 && !readOnly && !docEmpty && (
          <div className="flex min-h-[60vh] items-center justify-center px-4">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              {t('empty.page', 'This page is empty. Click anywhere to add a component, or press 1–5.')}
            </p>
          </div>
        )}

        {components.length === 0 && !readOnly && docEmpty && (
          <div className="mx-auto max-w-4xl px-1 pt-8 pb-4">
            {/* Centred over the three cards it introduces, rather than hanging
                off their left edge. */}
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              {t('empty.start', 'Start from a template — or click anywhere to place your first component.')}
            </p>

            {/* This branch only runs when the whole document is empty: picking
                a template replaces it, and that must not be one stray click away
                from a dashboard that already has pages in it. */}
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {TEMPLATE_LIST.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onPickTemplate(template.id)}
                  className="cursor-pointer rounded-sm border border-gray-200 bg-white p-3 text-left hover:border-[var(--fd-accent)] dark:border-gray-700 dark:bg-gray-800"
                >
                  <TemplateThumb preview={template.preview} />
                  <div className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {t(`template.${template.id}.name`, template.name)}
                  </div>
                  <div className="text-xs text-gray-400">{t(`template.${template.id}.summary`, template.summary)}</div>
                </button>
              ))}
            </div>

            {/* First-run discovery for the tour. It lives here — the whole-
                document-empty state, which is what a brand-new user lands on —
                rather than as standing chrome, and it disappears the moment
                anything is placed. It is a <button>, so the background click
                handler ignores it instead of opening the picker. */}
            <p className="mt-6 text-center text-xs text-gray-400">
              {t('empty.tour.pre', 'New here?')}{' '}
              <button
                onClick={onStartTour}
                className="underline decoration-gray-300 underline-offset-2 hover:text-gray-600 dark:decoration-gray-600 dark:hover:text-gray-200"
              >
                {t('empty.tour.link', 'Take a quick tour')}
              </button>{' '}
              {t('empty.tour.post', 'of the interface.')}
            </p>
          </div>
        )}

        {/* v2 of react-grid-layout groups its settings into config objects.
            Passing cols/rowHeight/draggableCancel at the top level does
            nothing — they are silently ignored. */}
        {mounted && (
          <GridLayout
            width={width}
            layout={layout}
            gridConfig={GRID_CONFIG}
            dragConfig={readOnly ? LOCKED_DRAG : DRAG_CONFIG}
            resizeConfig={readOnly ? LOCKED_RESIZE : RESIZE_CONFIG}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragStop={handleDragStop}
            onResizeStop={commitLayout}
          >
            {components.map((c) => {
              // Only Tabs containers need the nested props; for every other card
              // these stay null, so the memo on Card is not disturbed when the
              // selection or a tab changes elsewhere.
              const isTabs = c.type === 'tabs'
              const activeTabId = isTabs ? (activeTabs[c.id] ?? c.tabs?.[0]?.id ?? null) : null
              const selectedChildId =
                isTabs && tabChildIds(c).includes(selectedId) ? selectedId : null
              return (
                <div key={c.id}>
                  <Card
                    component={c}
                    selected={c.id === selectedId}
                    activeTabId={activeTabId}
                    selectedChildId={selectedChildId}
                    readOnly={readOnly}
                    onAddInto={onAddInto}
                    dispatch={dispatch}
                  />
                </div>
              )
            })}
          </GridLayout>
        )}
      </div>
    </div>
  )
}
