import { useState } from 'react'

// The page tab strip. Dashboards are rarely one screen; this is how you add a
// second page and move between them. Filters live on the document and are
// shared across pages (Superset's model), so only the card grid changes when
// you switch tabs.
//
// Double-click a tab to rename it. The × removes a page — with a confirm if it
// still holds components, and never on the last remaining page.
//
// The strip is only rendered at all once there are two pages (see App), so a
// single-page dashboard does not pay a whole bar of chrome for a tab it cannot
// switch away from. "+ Page" therefore cannot live here — there would be no way
// back to two pages from one — so it sits in the toolbar, which is its single
// home whatever the page count.
export default function PageTabs({ pages, activeId, dispatch }) {
  const [editingId, setEditingId] = useState(null)

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

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 bg-white px-4 py-1.5 dark:border-gray-700 dark:bg-gray-800">
      {pages.map((page) => {
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
        return (
          <div
            key={page.id}
            className={`flex shrink-0 items-center rounded-sm border text-sm ${
              active
                ? 'border-[var(--fd-accent)] bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                : 'border-transparent text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <button
              className="max-w-[16rem] truncate py-1 pl-3 pr-1 text-left"
              onClick={() => dispatch({ type: 'selectPage', id: page.id })}
              onDoubleClick={() => setEditingId(page.id)}
              title="Click to open · double-click to rename"
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
          </div>
        )
      })}
    </div>
  )
}
