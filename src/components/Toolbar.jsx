import { useRef, useState } from 'react'

import { COMPONENT_TYPES, TYPE_ORDER } from './registry.jsx'
import { TEMPLATE_LIST } from '../templates.js'

export default function Toolbar({
  doc,
  dispatch,
  onExport,
  onImportFile,
  onNew,
  onPickTemplate,
  count,
  canUndo,
  canRedo,
}) {
  const fileInput = useRef(null)
  const [templatesOpen, setTemplatesOpen] = useState(false)

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
          <div className="relative">
            <Button onClick={() => setTemplatesOpen((open) => !open)}>Templates ▾</Button>
            {templatesOpen && (
              <>
                <div className="fixed inset-0 z-40" onMouseDown={() => setTemplatesOpen(false)} />
                <div className="absolute right-0 z-50 mt-1 w-64 overflow-hidden rounded-sm border border-gray-300 bg-white py-1 shadow-lg">
                  {TEMPLATE_LIST.map((template) => (
                    <button
                      key={template.id}
                      className="block w-full px-3 py-2 text-left hover:bg-gray-100"
                      onClick={() => {
                        setTemplatesOpen(false)
                        onPickTemplate(template.id)
                      }}
                    >
                      <span className="block text-sm text-gray-800">{template.name}</span>
                      <span className="block text-xs text-gray-400">{template.summary}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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
          click canvas to add · ⌘D duplicates · arrows move · delete removes · ⌘Z undo
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
