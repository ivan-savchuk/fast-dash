import { GridLayout, useContainerWidth } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

import { useMemo, useState } from 'react'

import Card from './Card.jsx'
import { GRID_COLS, GRID_ROW_HEIGHT } from '../state/document.js'

// The inside of a Tabs container: an inner tab strip over the active tab's own
// grid. Each tab is a nested react-grid-layout with the same geometry as the
// page (12 columns, 40px rows), and the children are ordinary <Card>s — the
// same component the page uses, with full chrome: title, type, duplicate,
// delete and description. A full-width container therefore makes a child chart
// the same pixel size, and behave the same, as it would on the page.
//
// Config objects are module constants — react-grid-layout memoises on their
// identity, and an inline object would rebuild every child on every render
// (see docs/NOTES.md, trap 3).
//
// The nested grid's drag-cancel is `.no-drag` (Card's own chrome: the title,
// description and buttons). Blocking a drag of the *container* from in here is
// done one level up, in Canvas, by adding `[data-tabs-content]` to the outer
// grid's cancel list — so this body must NOT itself be `.no-drag`, or the
// nested grid would refuse to drag its own children.
const NESTED_GRID = {
  cols: GRID_COLS,
  rowHeight: GRID_ROW_HEIGHT,
  margin: [12, 12],
  containerPadding: [0, 0],
}
const NESTED_DRAG = { enabled: true, cancel: '.no-drag', threshold: 1 }
const NESTED_RESIZE = { enabled: true, handles: ['se'] }
// Present mode. Module constants like the rest — react-grid-layout memoises its
// item rendering on the identity of these objects (see docs/NOTES.md, trap 3).
const LOCKED_DRAG = { enabled: false }
const LOCKED_RESIZE = { enabled: false }

export default function TabsBody({ component, activeTabId, selectedChildId, readOnly, dispatch, onAddInto }) {
  const tabs = component.tabs ?? []
  const active = tabs.find((t) => t.id === activeTabId) ?? tabs[0]
  const [editingId, setEditingId] = useState(null)
  const { width, containerRef, mounted } = useContainerWidth()

  const children = active?.components ?? []
  const layout = useMemo(() => children.map((c) => ({ i: c.id, ...c.layout })), [children])

  function commitRename(tabId, name) {
    setEditingId(null)
    const trimmed = name.trim()
    if (trimmed) dispatch({ type: 'renameTab', containerId: component.id, id: tabId, name: trimmed })
  }

  const commitLayout = (next) =>
    dispatch({
      type: 'setLayout',
      layout: next,
      container: { containerId: component.id, tabId: active.id },
    })

  return (
    // data-tabs-content marks this region so the container Card skips selecting
    // itself for clicks in here (children select themselves), and so the outer
    // grid does not drag the container when you interact inside a tab.
    <div data-tabs-content className="flex h-full flex-col">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 pb-1 dark:border-gray-700">
        {tabs.map((t) => {
          if (editingId === t.id && !readOnly) {
            return (
              <input
                key={t.id}
                autoFocus
                defaultValue={t.name}
                onFocus={(e) => e.target.select()}
                onBlur={(e) => commitRename(t.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.target.blur()
                  if (e.key === 'Escape') {
                    e.target.value = t.name
                    e.target.blur()
                  }
                }}
                className="no-drag w-24 rounded-sm border border-gray-300 px-1.5 py-0.5 text-xs outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                aria-label="Tab name"
              />
            )
          }
          const on = t.id === active?.id
          return (
            <div
              key={t.id}
              className={`flex shrink-0 items-center rounded-sm border text-xs ${
                on
                  ? 'border-[var(--fd-accent)] bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              <button
                className="max-w-[10rem] truncate py-0.5 pl-2 pr-1"
                onClick={() => dispatch({ type: 'selectTab', containerId: component.id, tabId: t.id })}
                onDoubleClick={() => !readOnly && setEditingId(t.id)}
                title={readOnly ? t.name : 'Click to open · double-click to rename'}
              >
                {t.name}
              </button>
              {/* Switching tabs is navigation, which a viewer may do — the HTML
                  export allows it too. Renaming, deleting and adding are edits,
                  so in present mode they are not rendered at all. */}
              {!readOnly && tabs.length > 1 && (
                <button
                  className="px-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={() => dispatch({ type: 'deleteTab', containerId: component.id, tabId: t.id })}
                  title="Delete tab"
                  aria-label={`Delete ${t.name}`}
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
        {!readOnly && (
          <button
            className="shrink-0 rounded-sm border border-gray-300 px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={() => dispatch({ type: 'addTab', id: component.id })}
            title="Add tab"
          >
            +
          </button>
        )}
      </div>

      <div ref={containerRef} className="mt-2 min-h-0 flex-1 overflow-auto">
        {mounted && children.length > 0 && (
          <GridLayout
            width={width}
            layout={layout}
            gridConfig={NESTED_GRID}
            dragConfig={readOnly ? LOCKED_DRAG : NESTED_DRAG}
            resizeConfig={readOnly ? LOCKED_RESIZE : NESTED_RESIZE}
            onDragStop={commitLayout}
            onResizeStop={commitLayout}
          >
            {children.map((child) => (
              <div key={child.id}>
                <Card
                component={child}
                selected={child.id === selectedChildId}
                readOnly={readOnly}
                dispatch={dispatch}
              />
              </div>
            ))}
          </GridLayout>
        )}
        {active && !readOnly && (
          <button
            className="mt-2 flex w-full items-center justify-center rounded-sm border border-dashed border-gray-300 py-3 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:text-gray-300"
            onClick={(e) => onAddInto(component.id, active.id, { clientX: e.clientX, clientY: e.clientY })}
          >
            + Add chart
          </button>
        )}
      </div>
    </div>
  )
}
