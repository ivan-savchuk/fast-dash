import { memo } from 'react'

import ColumnEditor from './ColumnEditor.jsx'
import { COMPONENT_TYPES } from './registry.jsx'
import TabsBody from './TabsBody.jsx'
import TypeBadge from './TypeBadge.jsx'

// Superset's card pattern: flat white card, hairline border, a header strip
// with the title on the left, the chart body, then a one-line description.
// Drag anywhere on the card except the elements marked `no-drag` (the title,
// the description and the buttons).

// The description is the `comment` field from SPEC.md — the per-component
// note that makes the JSON export readable as a requirement. Capped at a
// tweet's length on purpose: long prose belongs in the spec, not the card.
export const COMMENT_MAX = 280

// Duplicate and delete are occasional, so they stay out of the way until you
// reach for them: invisible by default, revealed when the card is hovered
// (`group` on the card root), when it is selected, or when the button itself
// takes keyboard focus. They keep their box at all times, so nothing in the
// header moves when they appear.
//
// The type badge deliberately does NOT hide — it is information, not a control,
// and on a table it carries the column count, which is real spec.
const actionClass = (size) =>
  `no-drag flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm ${size} leading-none text-gray-400 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-100`

function UnknownPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center rounded-sm border border-dashed border-gray-200 text-[11px] text-gray-400 dark:border-gray-600">
      unknown component type
    </div>
  )
}

// memo: typing in one card's description must not re-render every other
// card's placeholder SVGs.
export default memo(Card)

// `dispatch` is taken directly rather than as four callback props: a callback
// created inline in the parent is a new value on every render, which would
// defeat the memo above.
function Card({ component, selected, activeTabId, selectedChildId, onAddInto, dispatch }) {
  const id = component.id
  const isTabs = component.type === 'tabs'

  // Text selection is suppressed one level up, in Canvas, so that the resize
  // handle is covered too.
  //
  // For a Tabs container, a click inside the tab body selects the child there,
  // not the container — so ignore mousedowns that land in `data-tabs-content`
  // and let the child's own handler win. The header still selects the container.
  const onSelect = (e) => {
    if (isTabs && e.target.closest('[data-tabs-content]')) return
    dispatch({ type: 'select', id })
  }
  const onDelete = () => dispatch({ type: 'delete', id })
  const onDuplicate = () => dispatch({ type: 'duplicate', id })
  const onRename = (title) => dispatch({ type: 'rename', id, title })
  const onComment = (comment) => dispatch({ type: 'setComment', id, comment })

  // A selected card shows its chrome unconditionally; an unselected one waits
  // for the pointer. `opacity-0` still leaves the button clickable and focusable.
  const actionState = selected ? 'opacity-100' : 'opacity-0'

  // An imported file may contain a type this build doesn't know about.
  // Show it as a labelled empty box rather than crashing the canvas.
  const def = COMPONENT_TYPES[component.type] ?? {
    label: component.type,
    Placeholder: UnknownPlaceholder,
  }
  const Placeholder = def.Placeholder

  // A Section header is a thin labelled band, not a chart card: its title is
  // the section label, and it has no chart body and no description. Duplicate
  // and delete stay, and it drags and resizes like any other card.
  if (component.type === 'section') {
    return (
      <div
        onMouseDown={onSelect}
        className={`group flex h-full cursor-move items-center gap-2 overflow-hidden rounded-sm border bg-white dark:bg-gray-800 px-3 select-none ${
          selected
            ? 'border-[var(--fd-accent)] ring-1 ring-[var(--fd-accent)]'
            : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        <input
          className="no-drag min-w-0 flex-1 cursor-text truncate bg-transparent text-sm font-semibold tracking-wide text-gray-600 uppercase outline-none select-text focus:bg-gray-50 dark:text-gray-200 dark:focus:bg-gray-700"
          value={component.title}
          onChange={(e) => onRename(e.target.value)}
          aria-label="Section title"
        />
        <TypeBadge
          id={id}
          type={component.type}
          variant={component.variant}
          label={def.label}
          dispatch={dispatch}
        />
        <button
          className={`${actionClass('text-sm')} ${actionState}`}
          onClick={onDuplicate}
          title="Duplicate component (⌘D)"
          aria-label="Duplicate component"
        >
          ⧉
        </button>
        <button
          className={`${actionClass('text-base')} ${actionState}`}
          onClick={onDelete}
          title="Delete component"
          aria-label="Delete component"
        >
          ✕
        </button>
      </div>
    )
  }

  // The description is the spec note, so a card that has one always shows it.
  // Empty, it used to put an identical grey prompt and hairline on every card
  // on the page, which is what made a canvas of cards read as a form rather
  // than as a dashboard. So an empty, unselected card shows a blank strip:
  // same 40px, no border, no prompt — hovering, selecting or focusing brings
  // both back. The height is reserved in every case, so the chart above never
  // resizes under the cursor.
  const hasComment = (component.comment ?? '').length > 0
  const noteRevealed = selected || hasComment

  // cursor-move advertises that the card itself is the drag handle; the
  // title, description and buttons opt out of dragging via `no-drag`.
  return (
    <div
      onMouseDown={onSelect}
      className={`group flex h-full cursor-move flex-col overflow-hidden rounded-sm border bg-white dark:bg-gray-800 select-none ${
        selected
          ? 'border-[var(--fd-accent)] ring-1 ring-[var(--fd-accent)]'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-1.5 dark:border-gray-700">
        <input
          className="no-drag min-w-0 flex-1 cursor-text truncate bg-transparent text-sm font-semibold text-gray-800 outline-none select-text focus:bg-gray-50 dark:text-gray-100 dark:focus:bg-gray-700"
          value={component.title}
          onChange={(e) => onRename(e.target.value)}
          aria-label="Component title"
        />
        {/* A table's badge is its column editor instead of the type label: the
            columns are what a reader needs, the type is obvious from the card
            body, and both exports still name it. Table has no variants, so
            nothing competes for the slot. */}
        {component.type === 'table' ? (
          <ColumnEditor id={id} spec={component.spec} dispatch={dispatch} />
        ) : (
          <TypeBadge
            id={id}
            type={component.type}
            variant={component.variant}
            label={def.label}
            dispatch={dispatch}
          />
        )}
        <button
          className={`${actionClass('text-sm')} ${actionState}`}
          onClick={onDuplicate}
          title="Duplicate component (⌘D)"
          aria-label="Duplicate component"
        >
          ⧉
        </button>
        <button
          className={`${actionClass('text-base')} ${actionState}`}
          onClick={onDelete}
          title="Delete component"
          aria-label="Delete component"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 px-3 py-2">
        {isTabs ? (
          <TabsBody
            component={component}
            activeTabId={activeTabId}
            selectedChildId={selectedChildId}
            onAddInto={onAddInto}
            dispatch={dispatch}
          />
        ) : (
          <Placeholder variant={component.variant} spec={component.spec} />
        )}
      </div>

      <textarea
        className={`no-drag h-10 shrink-0 cursor-text resize-none border-t bg-transparent px-3 py-1.5 text-[11px] leading-snug text-gray-600 outline-none select-text focus:bg-gray-50 dark:text-gray-300 dark:focus:bg-gray-700 ${
          noteRevealed
            ? 'border-gray-100 placeholder:text-gray-300 dark:border-gray-700'
            : 'border-transparent placeholder:text-transparent group-hover:border-gray-100 group-hover:placeholder:text-gray-300 focus:border-gray-100 focus:placeholder:text-gray-300 dark:group-hover:border-gray-700 dark:focus:border-gray-700'
        }`}
        value={component.comment ?? ''}
        maxLength={COMMENT_MAX}
        onChange={(e) => onComment(e.target.value)}
        placeholder="Describe what this answers…"
        aria-label="Component description"
      />
    </div>
  )
}
