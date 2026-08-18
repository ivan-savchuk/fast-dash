import { FILTER_TYPES } from '../state/document.js'

// Superset's collapsible filter rail on the left. Holds the dashboard-level
// filters: a label and a control type each. They carry no data — the grayscale
// control under each row is a placeholder, structurally faithful to its type —
// but they live on the document and export as part of the spec.

// The rail sits in the flex flow and PUSHES the canvas: its width animates
// (44px collapsed ↔ 240px open) over 200ms, so the canvas narrows/widens
// gradually rather than in one jarring step. The cards' own transition is
// frozen for the same window (see App's railSettling / index.css .rgl-instant),
// so react-grid-layout tracks the animating width frame-by-frame and the cards
// slide smoothly with it instead of jerking. `overflow-hidden` plus a fixed
// inner width keeps the content from squishing while the width animates.
export default function FilterRail({ filters, open, onToggle, readOnly, dispatch }) {
  return (
    <aside
      className={`flex shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-200 ease-out dark:border-gray-700 dark:bg-gray-800 ${
        open ? 'w-60' : 'w-11'
      }`}
    >
      {open ? (
        <div className="flex h-full w-60 flex-col overflow-y-auto">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-700">
            <span className="text-[10px] tracking-wide text-gray-400 uppercase">Filters</span>
            <button
              className="flex size-6 items-center justify-center rounded-sm text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={onToggle}
              title="Hide filters"
              aria-label="Hide filters"
            >
              ◂
            </button>
          </div>

          <div className="flex flex-col gap-3 px-3 py-3">
            {filters.length === 0 && !readOnly && (
              <p className="text-xs text-gray-400">
                No filters yet. Add the dashboard-level filters people will use.
              </p>
            )}

            {filters.map((filter, i) => (
              <FilterRow
                key={filter.id}
                filter={filter}
                readOnly={readOnly}
                dispatch={dispatch}
                isFirst={i === 0}
                isLast={i === filters.length - 1}
                onUp={() => dispatch({ type: 'moveFilter', id: filter.id, toIndex: i - 1 })}
                onDown={() => dispatch({ type: 'moveFilter', id: filter.id, toIndex: i + 1 })}
              />
            ))}

            {!readOnly && (
              <button
                className="mt-1 rounded-sm border border-dashed border-gray-300 px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                onClick={() => dispatch({ type: 'addFilter' })}
              >
                + add filter
              </button>
            )}
          </div>
        </div>
      ) : (
        // The whole strip is the button, so the target is large and obvious.
        <button
          className="group flex h-full w-11 flex-col items-center gap-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={onToggle}
          title="Show filters"
          aria-label="Show filters"
        >
          <span className="flex size-8 items-center justify-center rounded-sm bg-gray-800 text-sm text-white group-hover:bg-gray-900 dark:bg-gray-600 dark:group-hover:bg-gray-500">
            »
          </span>
          <span className="text-[11px] font-medium tracking-wide text-gray-600 uppercase [writing-mode:vertical-rl] dark:text-gray-300">
            Filters{filters.length > 0 ? ` · ${filters.length}` : ''}
          </span>
        </button>
      )}
    </aside>
  )
}

// Reorder is by the up/down buttons or Alt+Arrow. Drag-and-drop was tried and
// removed — native HTML5 DnD felt laggy in a narrow rail and was not worth it.
function FilterRow({ filter, readOnly, dispatch, isFirst, isLast, onUp, onDown }) {
  // Present mode: a viewer sees the filter's name and the shape of its control,
  // which is exactly what the HTML export shows. The label field, the type
  // select and the reorder buttons are edits, so they are not rendered.
  if (readOnly) {
    return (
      <div className="rounded-sm border border-gray-200 p-2 dark:border-gray-700">
        <div className="mb-2 truncate text-xs font-medium text-gray-700 dark:text-gray-200">
          {filter.label}
        </div>
        <ControlPreview type={filter.type} />
      </div>
    )
  }

  // Alt+Arrow reorders even while the label input has focus: plain arrows move
  // the text caret, and outside a field they nudge the selected canvas card.
  const onKeyDown = (e) => {
    if (!e.altKey) return
    if (e.key === 'ArrowUp' && !isFirst) {
      e.preventDefault()
      onUp()
    } else if (e.key === 'ArrowDown' && !isLast) {
      e.preventDefault()
      onDown()
    }
  }

  return (
    <div onKeyDown={onKeyDown} className="rounded-sm border border-gray-200 p-2 dark:border-gray-700">
      <div className="mb-1 flex items-center gap-1">
        <input
          className="min-w-0 flex-1 bg-transparent text-xs font-medium text-gray-700 outline-none focus:bg-gray-50 dark:text-gray-200 dark:focus:bg-gray-700"
          value={filter.label}
          onChange={(e) => dispatch({ type: 'renameFilter', id: filter.id, label: e.target.value })}
          aria-label="Filter label"
        />
        <button
          className="shrink-0 px-0.5 text-xs text-gray-300 enabled:hover:text-gray-700 disabled:opacity-30"
          onClick={onUp}
          disabled={isFirst}
          title="Move up"
          aria-label="Move filter up"
        >
          ↑
        </button>
        <button
          className="shrink-0 px-0.5 text-xs text-gray-300 enabled:hover:text-gray-700 disabled:opacity-30"
          onClick={onDown}
          disabled={isLast}
          title="Move down"
          aria-label="Move filter down"
        >
          ↓
        </button>
        <button
          className="shrink-0 px-1 text-xs text-gray-300 hover:text-gray-700"
          onClick={() => dispatch({ type: 'removeFilter', id: filter.id })}
          aria-label="Remove filter"
        >
          ✕
        </button>
      </div>

      <select
        className="mb-2 w-full rounded-sm border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-600 outline-none focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        value={filter.type}
        onChange={(e) => dispatch({ type: 'setFilterType', id: filter.id, filterType: e.target.value })}
        aria-label="Filter type"
      >
        {FILTER_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <ControlPreview type={filter.type} />
    </div>
  )
}

// A neutral, grayscale placeholder that reads as the right kind of control at a
// glance — the whole point of the tool: real BI silhouettes, no real data.
function ControlPreview({ type }) {
  const box = 'flex h-6 items-center rounded-sm border border-gray-200 bg-gray-50 px-2 text-[11px] text-gray-400 dark:border-gray-600 dark:bg-gray-700'

  switch (type) {
    case 'range':
      return (
        <div>
          <div className="relative h-1.5 rounded-full bg-gray-200">
            {/* selected sub-range */}
            <div className="absolute inset-y-0 left-1/4 right-1/3 rounded-full bg-gray-300" />
            <div className="absolute top-1/2 left-1/4 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-300 bg-white shadow-sm" />
            <div className="absolute top-1/2 right-1/3 size-3 translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-300 bg-white shadow-sm" />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-gray-400">
            <span>min</span>
            <span>max</span>
          </div>
        </div>
      )
    case 'time grain':
      return (
        <div className={`${box} justify-between`}>
          <span>month</span>
          <span className="text-gray-300">▾</span>
        </div>
      )
    case 'date range':
      return (
        <div className="flex items-center gap-1">
          <div className={`${box} flex-1`}>from</div>
          <span className="text-gray-300">–</span>
          <div className={`${box} flex-1`}>to</div>
        </div>
      )
    case 'search':
      return <div className={box}>⌕ search…</div>
    case 'toggle':
      return (
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-9 items-center rounded-full bg-gray-200 px-0.5">
            <div className="size-4 rounded-full bg-white shadow-sm" />
          </div>
          <span className="text-[11px] text-gray-400">on / off</span>
        </div>
      )
    case 'multi-select':
      return (
        <div className={`${box} justify-between`}>
          <span className="flex gap-1">
            <span className="rounded-sm bg-gray-200 px-1">A</span>
            <span className="rounded-sm bg-gray-200 px-1">B</span>
          </span>
          <span className="text-gray-300">▾</span>
        </div>
      )
    default: // dropdown
      return (
        <div className={`${box} justify-between`}>
          <span>All</span>
          <span className="text-gray-300">▾</span>
        </div>
      )
  }
}
