import { useEffect, useMemo, useState } from 'react'

import { COMPONENT_TYPES, CATALOG_ORDER } from './registry.jsx'

// Menu width, and a height estimate used only to keep it on screen near the
// bottom edge. The list itself scrolls once it is taller than the cap.
const WIDTH = 220
const HEIGHT = 320

// Click empty canvas, get a searchable component list where the cursor already
// is. The five popular types keep their number keys on the toolbar; here the
// whole catalog is reachable by typing a few letters. Type to filter, arrows
// plus Enter to browse, Esc to close.
export default function QuickPicker({ at, onPick, onClose }) {
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return CATALOG_ORDER
    return CATALOG_ORDER.filter((type) => COMPONENT_TYPES[type].label.toLowerCase().includes(q))
  }, [query])

  // Keep the highlight in range as the list narrows under a new query.
  const active = Math.min(highlighted, Math.max(matches.length - 1, 0))

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (matches.length === 0) return
        const step = e.key === 'ArrowDown' ? 1 : -1
        setHighlighted((i) => {
          const cur = Math.min(i, matches.length - 1)
          return (cur + step + matches.length) % matches.length
        })
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const type = matches[active]
        if (type) onPick(type)
        return
      }
      // Every other key — letters, digits, backspace — belongs to the search
      // box, so it is deliberately not intercepted here.
    }

    // Capture phase: this menu owns Esc / arrows / Enter while it is open.
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [matches, active, onPick, onClose])

  // Keep the menu on screen when the click was near the right or bottom edge.
  const left = Math.min(at.clientX, window.innerWidth - WIDTH - 8)
  const top = Math.max(8, Math.min(at.clientY, window.innerHeight - HEIGHT - 8))

  return (
    <>
      {/* Anything outside the menu dismisses it. */}
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div
        className="fixed z-50 overflow-hidden rounded-sm border border-gray-300 bg-white shadow-lg"
        style={{ left, top, width: WIDTH }}
        role="menu"
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlighted(0)
          }}
          placeholder="Search components…"
          aria-label="Search components"
          className="w-full border-b border-gray-200 px-3 py-2 text-sm outline-none placeholder:text-gray-400"
        />
        <div className="max-h-64 overflow-auto py-1">
          {matches.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No match</div>
          ) : (
            matches.map((type, i) => (
              <button
                key={type}
                role="menuitem"
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${
                  i === active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                }`}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => onPick(type)}
              >
                {COMPONENT_TYPES[type].label}
                {COMPONENT_TYPES[type].key && (
                  <kbd className="text-xs text-gray-400">{COMPONENT_TYPES[type].key}</kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  )
}
