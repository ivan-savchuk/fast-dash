import { useEffect, useState } from 'react'

import { COMPONENT_TYPES, TYPE_ORDER } from './registry.jsx'

// Menu width and height, needed to keep it on screen near the edges.
const WIDTH = 200
const HEIGHT = 210

// Click empty canvas, get the component list where the cursor already is.
// The whole point is not having to travel to the toolbar, so this is fully
// keyboard-driven too: 1-5 pick directly, arrows plus Enter browse, Esc closes.
export default function QuickPicker({ at, onPick, onClose }) {
  const [highlighted, setHighlighted] = useState(0)

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const step = e.key === 'ArrowDown' ? 1 : -1
        setHighlighted((i) => (i + step + TYPE_ORDER.length) % TYPE_ORDER.length)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        onPick(TYPE_ORDER[highlighted])
        return
      }
      const byKey = TYPE_ORDER.find((type) => COMPONENT_TYPES[type].key === e.key)
      if (byKey) {
        e.preventDefault()
        onPick(byKey)
      }
    }

    // Capture phase: this menu owns the keyboard while it is open.
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [highlighted, onPick, onClose])

  // Keep the menu on screen when the click was near the right or bottom edge.
  const left = Math.min(at.clientX, window.innerWidth - WIDTH - 8)
  const top = Math.min(at.clientY, window.innerHeight - HEIGHT - 8)

  return (
    <>
      {/* Anything outside the menu dismisses it. */}
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div
        className="fixed z-50 overflow-hidden rounded-sm border border-gray-300 bg-white py-1 shadow-lg"
        style={{ left, top, width: WIDTH }}
        role="menu"
      >
        {TYPE_ORDER.map((type, i) => (
          <button
            key={type}
            role="menuitem"
            className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${
              i === highlighted ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
            }`}
            onMouseEnter={() => setHighlighted(i)}
            onClick={() => onPick(type)}
          >
            {COMPONENT_TYPES[type].label}
            <kbd className="text-xs text-gray-400">{COMPONENT_TYPES[type].key}</kbd>
          </button>
        ))}
      </div>
    </>
  )
}
