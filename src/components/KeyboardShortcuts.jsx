import { COMPONENT_TYPES, TYPE_ORDER } from './registry.jsx'

// The five number keys that add a component are read from the registry rather
// than written down here, so this list stays true if a key ever changes.
const ADD_ROWS = TYPE_ORDER.map((type) => ({
  keys: COMPONENT_TYPES[type].key,
  label: COMPONENT_TYPES[type].label,
}))

// Everything the keyboard can do, grouped the way the header hint strip and the
// keydown handler in App.jsx already split it. Keep in step with that handler.
const GROUPS = [
  {
    title: 'Editing',
    rows: [
      { keys: '⌘Z', label: 'Undo' },
      { keys: '⇧⌘Z', label: 'Redo' },
      { keys: '⌘D', label: 'Duplicate selected card' },
      { keys: 'Delete', label: 'Delete selected card' },
    ],
  },
  {
    title: 'Add a component',
    rows: [
      ...ADD_ROWS,
      { keys: 'Click', label: 'Click empty canvas to add' },
    ],
  },
  {
    title: 'Selection & canvas',
    rows: [
      { keys: 'Arrows', label: 'Nudge selected card' },
      { keys: '[  ]', label: 'Cycle chart drawing' },
      { keys: 'Esc', label: 'Deselect / release the keyboard' },
    ],
  },
  {
    title: 'Pages',
    rows: [{ keys: '⌘⌥←  ⌘⌥→', label: 'Send selected card to previous / next page' }],
  },
  {
    title: 'View',
    rows: [{ keys: 'P', label: 'Present (Esc to exit)' }],
  },
]

// A read-only reference card. Escape and the global keydown guard that keeps it
// open both live in App.jsx, the same way Present mode is handled.
export default function KeyboardShortcuts({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-md border border-gray-300 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Keyboard shortcuts
          </h2>
          <button
            className="rounded-sm px-2 py-1 text-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-x-10 gap-y-6 px-5 py-5 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.rows.map((row) => (
                  <li key={row.label} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-gray-700 dark:text-gray-200">{row.label}</span>
                    <kbd className="shrink-0 rounded-sm border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {row.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
