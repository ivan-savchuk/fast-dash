import { useRef } from 'react'

import { COMPONENT_TYPES, TYPE_ORDER } from './registry.jsx'

export default function Toolbar({
  doc,
  dispatch,
  onExport,
  onImportFile,
  onNew,
  count,
  canUndo,
  canRedo,
}) {
  const fileInput = useRef(null)

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <input
          className="min-w-0 flex-1 truncate rounded-sm px-1 py-0.5 text-base font-semibold text-gray-900 outline-none hover:bg-gray-50 focus:bg-gray-50"
          value={doc.title}
          onChange={(e) => dispatch({ type: 'setDocTitle', title: e.target.value })}
          aria-label="Dashboard title"
        />
        <span className="shrink-0 text-xs text-gray-400">
          {count} {count === 1 ? 'component' : 'components'}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <Button onClick={() => dispatch({ type: 'undo' })} disabled={!canUndo} title="Undo (⌘Z)">
            Undo
          </Button>
          <Button
            onClick={() => dispatch({ type: 'redo' })}
            disabled={!canRedo}
            title="Redo (⇧⌘Z)"
          >
            Redo
          </Button>
          <span className="mx-1 h-5 w-px bg-gray-200" />
          <Button onClick={onExport}>Export JSON</Button>
          <Button onClick={() => fileInput.current?.click()}>Import</Button>
          <Button onClick={onNew}>New</Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onImportFile(file)
            e.target.value = '' // allow re-importing the same file
          }}
        />
      </div>

      <div className="flex items-center gap-1.5 border-t border-gray-100 px-4 py-2">
        {TYPE_ORDER.map((type) => (
          <Button key={type} onClick={() => dispatch({ type: 'add', componentType: type })}>
            {COMPONENT_TYPES[type].label}
            <kbd className="ml-2 text-xs text-gray-400">{COMPONENT_TYPES[type].key}</kbd>
          </Button>
        ))}
        <span className="ml-auto text-xs text-gray-400">
          arrows move · delete removes · esc deselects · ⌘Z undo · ⇧⌘Z redo
        </span>
      </div>
    </header>
  )
}

function Button({ onClick, children, disabled, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded-sm border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:cursor-default disabled:border-gray-200 disabled:text-gray-300 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}
