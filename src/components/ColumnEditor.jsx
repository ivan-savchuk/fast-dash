import { useCallback, useRef, useState } from 'react'

import Popover from './Popover.jsx'
import { tableColumns } from './placeholderArt.js'

// The control in a table card's header, and the panel it opens.
//
// A table's columns are its structure, so they have to be nameable somewhere.
// Not on the card itself: a three-column-wide card gives each header about
// fifteen pixels, and roles, reordering and removal need more room than a text
// cursor. Not a permanent side panel either — one was built in Phase 3 and
// discarded for eating the canvas (see SPEC.md). A transient popover is the
// shape that is left, and `Popover` already carries the traps.
//
// Every edit goes out as one `setColumns` with the whole list, so the reducer
// has a single case and undo is free.

const PANEL_WIDTH = 300

const NEW_COLUMN = { name: '', role: 'measure', format: '' }

export default function ColumnEditor({ id, spec, dispatch }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const columns = tableColumns(spec)

  const close = useCallback(() => {
    setOpen(false)
    buttonRef.current?.focus()
  }, [])

  // `columns` may be the shared fallback list, so the first edit of an untouched
  // table writes a real copy of it rather than mutating the default.
  const commit = (next) => dispatch({ type: 'setColumns', id, columns: next })

  const update = (i, patch) =>
    commit(columns.map((c, j) => (j === i ? { ...c, ...patch } : c)))

  const move = (i, delta) => {
    const next = [...columns]
    const [taken] = next.splice(i, 1)
    next.splice(i + delta, 0, taken)
    commit(next)
  }

  const remove = (i) => commit(columns.filter((_, j) => j !== i))

  const label = `${columns.length} column${columns.length === 1 ? '' : 's'}`

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Name this table's columns"
        className="no-drag shrink-0 cursor-pointer rounded-sm px-1 text-[10px] tracking-wide text-gray-300 uppercase hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
      >
        ⊞ {label} ▾
      </button>

      {open && (
        <Popover
          anchorRef={buttonRef}
          width={PANEL_WIDTH}
          onClose={close}
          role="dialog"
          className="p-2"
        >
          <div className="mb-1.5 flex items-baseline justify-between px-0.5">
            <span className="text-[10px] tracking-wide text-gray-400 uppercase">Columns</span>
            <span className="text-[10px] text-gray-400">name · role · format</span>
          </div>

          {columns.map((c, i) => (
            <div key={i} className="mb-1 flex items-center gap-1">
              <input
                className="min-w-0 flex-1 rounded-sm border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-700 outline-none focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                value={c.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Column name"
                aria-label={`Column ${i + 1} name`}
              />
              {/* Two roles, so a toggle beats a dropdown: one click to flip. */}
              <button
                className="w-11 shrink-0 rounded-sm border border-gray-200 py-1 text-[10px] tracking-wide text-gray-500 uppercase hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                onClick={() =>
                  update(i, { role: c.role === 'dimension' ? 'measure' : 'dimension' })
                }
                title={
                  c.role === 'dimension'
                    ? 'A dimension — what you group by. Click to make it a measure.'
                    : 'A measure — what you aggregate. Click to make it a dimension.'
                }
                aria-label={`Column ${i + 1} role: ${c.role}`}
              >
                {c.role === 'dimension' ? 'dim' : 'msr'}
              </button>
              <input
                className="w-16 shrink-0 rounded-sm border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-500 outline-none focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                value={c.format}
                onChange={(e) => update(i, { format: e.target.value })}
                placeholder="$1,234"
                title="An example of the format — what a value looks like, not a real value"
                aria-label={`Column ${i + 1} format`}
              />
              <button
                className="shrink-0 px-0.5 text-xs text-gray-300 enabled:hover:text-gray-700 disabled:opacity-30"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                title="Move up"
                aria-label={`Move column ${i + 1} up`}
              >
                ↑
              </button>
              <button
                className="shrink-0 px-0.5 text-xs text-gray-300 enabled:hover:text-gray-700 disabled:opacity-30"
                onClick={() => move(i, 1)}
                disabled={i === columns.length - 1}
                title="Move down"
                aria-label={`Move column ${i + 1} down`}
              >
                ↓
              </button>
              <button
                className="shrink-0 px-1 text-xs text-gray-300 enabled:hover:text-gray-700 disabled:opacity-30"
                onClick={() => remove(i)}
                disabled={columns.length === 1}
                title={columns.length === 1 ? 'A table keeps at least one column' : 'Remove column'}
                aria-label={`Remove column ${i + 1}`}
              >
                ✕
              </button>
            </div>
          ))}

          <button
            className="mt-1 w-full rounded-sm border border-dashed border-gray-300 py-1 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={() => commit([...columns, { ...NEW_COLUMN }])}
          >
            + Add column
          </button>
        </Popover>
      )}
    </>
  )
}
