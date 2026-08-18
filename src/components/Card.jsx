import { memo } from 'react'

import ColumnEditor from './ColumnEditor.jsx'
import { COMPONENT_TYPES, typeLabel } from './registry.jsx'
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

// Duplicate and delete stay visible on every card while you are building.
//
// They were tried hidden-until-hover (2026-08-18) and reverted the same day,
// Ivan's call: on an editing canvas the affordance is worth more than the quiet,
// and a control you have to go hunting for is a control people forget exists.
// The place for a card with no controls on it is Present mode, not the canvas.
//
// The type badge is visible for a different reason — it is information rather
// than a control, and on a table it carries the column count, which is real spec.
const actionClass = (size) =>
  `no-drag flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm ${size} leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-100`

// The shell every card wears, editing or not.
const SHELL = 'flex h-full overflow-hidden rounded-sm border bg-white dark:bg-gray-800'
const QUIET_BORDER = 'border-gray-200 dark:border-gray-700'

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
function Card({ component, selected, activeTabId, selectedChildId, readOnly, onAddInto, dispatch }) {
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

  // An imported file may contain a type this build doesn't know about.
  // Show it as a labelled empty box rather than crashing the canvas.
  const def = COMPONENT_TYPES[component.type] ?? {
    label: component.type,
    Placeholder: UnknownPlaceholder,
  }
  const Placeholder = def.Placeholder

  // --- present mode ---
  //
  // The same rule the HTML export follows: anything that could change the
  // document is not rendered at all, rather than rendered and disabled. So the
  // title is text rather than an input, the buttons are gone, the type badge is
  // a label rather than a menu, and the description strip only exists when
  // there is a description — no reserved height, because nothing is going to be
  // typed into it.
  if (readOnly) {
    // The export names a non-default variant ("Bar (horizontal)") because there
    // the silhouette is all a reader has. Same reasoning here.
    const label = typeLabel(component.type, component.variant)

    if (component.type === 'section') {
      return (
        <div className={`${SHELL} ${QUIET_BORDER} items-center gap-2 px-3`}>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-200">
            {component.title}
          </span>
          <span className="shrink-0 text-[10px] tracking-wide text-gray-300 uppercase dark:text-gray-500">
            {label}
          </span>
        </div>
      )
    }

    return (
      <div className={`${SHELL} ${QUIET_BORDER} flex-col`}>
        <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-1.5 dark:border-gray-700">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
            {component.title}
          </span>
          <span className="shrink-0 text-[10px] tracking-wide text-gray-300 uppercase dark:text-gray-500">
            {label}
          </span>
        </div>

        <div className="min-h-0 flex-1 px-3 py-2">
          {isTabs ? (
            <TabsBody
              component={component}
              activeTabId={activeTabId}
              readOnly
              dispatch={dispatch}
            />
          ) : (
            <Placeholder variant={component.variant} spec={component.spec} id={id} />
          )}
        </div>

        {component.comment && (
          <div className="shrink-0 border-t border-gray-100 px-3 py-1.5 text-[11px] leading-snug text-gray-600 dark:border-gray-700 dark:text-gray-300">
            {component.comment}
          </div>
        )}
      </div>
    )
  }

  const ring = selected
    ? 'border-[var(--fd-accent)] ring-1 ring-[var(--fd-accent)]'
    : QUIET_BORDER

  // A Section header is a thin labelled band, not a chart card: its title is
  // the section label, and it has no chart body and no description. Duplicate
  // and delete stay, and it drags and resizes like any other card.
  if (component.type === 'section') {
    return (
      <div
        onMouseDown={onSelect}
        className={`group ${SHELL} ${ring} cursor-move items-center gap-2 px-3 select-none`}
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
          className={actionClass('text-sm')}
          onClick={onDuplicate}
          title="Duplicate component (⌘D)"
          aria-label="Duplicate component"
        >
          ⧉
        </button>
        <button
          className={actionClass('text-base')}
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
      className={`group ${SHELL} ${ring} cursor-move flex-col select-none`}
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
          className={actionClass('text-sm')}
          onClick={onDuplicate}
          title="Duplicate component (⌘D)"
          aria-label="Duplicate component"
        >
          ⧉
        </button>
        <button
          className={actionClass('text-base')}
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
          <Placeholder variant={component.variant} spec={component.spec} id={id} />
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
