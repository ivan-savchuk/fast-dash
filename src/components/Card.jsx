import { memo } from 'react'

import { COMPONENT_TYPES } from './registry.jsx'
import TabsBody from './TabsBody.jsx'

// Superset's card pattern: flat white card, hairline border, a header strip
// with the title on the left, the chart body, then a one-line description.
// Drag anywhere on the card except the elements marked `no-drag` (the title,
// the description and the buttons).

// The description is the `comment` field from SPEC.md — the per-component
// note that makes the JSON export readable as a requirement. Capped at a
// tweet's length on purpose: long prose belongs in the spec, not the card.
export const COMMENT_MAX = 280

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
        className={`flex h-full cursor-move items-center gap-2 overflow-hidden rounded-sm border bg-white dark:bg-gray-800 px-3 select-none ${
          selected ? 'border-gray-500 ring-1 ring-gray-400' : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        <input
          className="no-drag min-w-0 flex-1 cursor-text truncate bg-transparent text-sm font-semibold tracking-wide text-gray-600 uppercase outline-none select-text focus:bg-gray-50 dark:text-gray-200 dark:focus:bg-gray-700"
          value={component.title}
          onChange={(e) => onRename(e.target.value)}
          aria-label="Section title"
        />
        <span className="shrink-0 text-[10px] tracking-wide text-gray-300 uppercase dark:text-gray-500">
          {def.label}
        </span>
        <button
          className="no-drag flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-sm leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-100"
          onClick={onDuplicate}
          title="Duplicate component (⌘D)"
          aria-label="Duplicate component"
        >
          ⧉
        </button>
        <button
          className="no-drag flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-base leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-100"
          onClick={onDelete}
          title="Delete component"
          aria-label="Delete component"
        >
          ✕
        </button>
      </div>
    )
  }

  // cursor-move advertises that the card itself is the drag handle; the
  // title, description and buttons opt out of dragging via `no-drag`.
  return (
    <div
      onMouseDown={onSelect}
      className={`flex h-full cursor-move flex-col overflow-hidden rounded-sm border bg-white dark:bg-gray-800 select-none ${
        selected ? 'border-gray-500 ring-1 ring-gray-400' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-1.5 dark:border-gray-700">
        <input
          className="no-drag min-w-0 flex-1 cursor-text truncate bg-transparent text-sm font-semibold text-gray-800 outline-none select-text focus:bg-gray-50 dark:text-gray-100 dark:focus:bg-gray-700"
          value={component.title}
          onChange={(e) => onRename(e.target.value)}
          aria-label="Component title"
        />
        <span className="shrink-0 text-[10px] tracking-wide text-gray-300 uppercase dark:text-gray-500">
          {def.label}
        </span>
        <button
          className="no-drag flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-sm leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-100"
          onClick={onDuplicate}
          title="Duplicate component (⌘D)"
          aria-label="Duplicate component"
        >
          ⧉
        </button>
        <button
          className="no-drag flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-base leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-100"
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
          <Placeholder />
        )}
      </div>

      <textarea
        className="no-drag h-10 shrink-0 cursor-text resize-none border-t border-gray-100 bg-transparent px-3 py-1.5 text-[11px] leading-snug text-gray-600 outline-none select-text placeholder:text-gray-300 focus:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:focus:bg-gray-700"
        value={component.comment ?? ''}
        maxLength={COMMENT_MAX}
        onChange={(e) => onComment(e.target.value)}
        placeholder="Describe what this answers…"
        aria-label="Component description"
      />
    </div>
  )
}
