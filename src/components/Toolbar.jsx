import { useRef, useState } from 'react'

import { CATALOG_ORDER, COMPONENT_TYPES, TYPE_ORDER } from './registry.jsx'
import { DEFAULT_THEME, THEMES } from '../state/document.js'
import { TEMPLATE_LIST } from '../templates.js'

// How many types the five buttons do not show. Computed rather than written
// down, so adding a type to the catalog updates the label by itself.
const HIDDEN_TYPES = CATALOG_ORDER.length - TYPE_ORDER.length

export default function Toolbar({
  doc,
  dispatch,
  dark,
  onToggleTheme,
  onExport,
  onExportHtml,
  onImportFile,
  onNew,
  onPickTemplate,
  onMore,
  onPresent,
  onAddPage,
  count,
  canUndo,
  canRedo,
}) {
  const fileInput = useRef(null)
  // One piece of state for both menus, so opening either closes the other.
  const [menu, setMenu] = useState(null)
  const close = () => setMenu(null)
  const toggle = (name) => setMenu((cur) => (cur === name ? null : name))

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* The name of the whole dashboard used to be 16px against a card title's
            14px, which is not a hierarchy. */}
        <input
          className="min-w-0 flex-1 truncate rounded-sm px-1 py-0.5 text-lg font-semibold text-gray-900 outline-none hover:bg-gray-50 focus:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-700 dark:focus:bg-gray-700"
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
          <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-600" />

          {/* Showing what a viewer sees used to mean exporting the HTML and
              opening the file — a download and a tab switch in the middle of a
              conversation. */}
          <Button onClick={onPresent} title="Show the dashboard as a viewer sees it (P)">
            Present
          </Button>

          {/* Export has its own button rather than a line inside a menu called
              "Options". The export is what the tool is for — everyone else's
              mockup tool exports a picture, this one exports a spec — and it was
              three clicks deep behind a word that promises settings. */}
          <Menu
            label="Export"
            open={menu === 'export'}
            onToggle={() => toggle('export')}
            onClose={close}
            width="w-52"
          >
            <MenuItem onClick={() => { close(); onExportHtml() }}>
              HTML — the hand-over file
            </MenuItem>
            <MenuItem onClick={() => { close(); onExport() }}>
              JSON — the editable spec
            </MenuItem>
          </Menu>

          {/* What is left really is options: how it looks, what to start from,
              and the two document-level actions. */}
          <Menu
            label="Options"
            open={menu === 'options'}
            onToggle={() => toggle('options')}
            onClose={close}
          >
            <MenuItem onClick={onToggleTheme}>{dark ? '☀  Light mode' : '☾  Dark mode'}</MenuItem>

            <Divider />
            <MenuLabel>Colour scheme</MenuLabel>
            {THEMES.map((theme) => {
              const current = (doc.theme ?? DEFAULT_THEME) === theme.id
              return (
                <button
                  key={theme.id}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => dispatch({ type: 'setTheme', theme: theme.id })}
                >
                  {/* The swatch is the only honest way to name a colour in
                      a menu — the words are a reference, not a hue. */}
                  <span
                    className="size-3 shrink-0 rounded-full border border-black/10 dark:border-white/20"
                    style={{ background: theme.accent }}
                  />
                  <span className="flex-1 text-sm text-gray-800 dark:text-gray-100">
                    {theme.name}
                  </span>
                  {current && <span className="text-xs text-gray-400">✓</span>}
                </button>
              )
            })}

            <Divider />
            <MenuLabel>Start from template</MenuLabel>
            {TEMPLATE_LIST.map((template) => (
              <button
                key={template.id}
                className="block w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => {
                  close()
                  onPickTemplate(template.id)
                }}
              >
                <span className="block text-sm text-gray-800 dark:text-gray-100">{template.name}</span>
                <span className="block text-xs text-gray-400">{template.summary}</span>
              </button>
            ))}

            <Divider />
            <MenuItem onClick={() => { close(); fileInput.current?.click() }}>Import…</MenuItem>
            <MenuItem onClick={() => { close(); onNew() }}>New dashboard</MenuItem>
          </Menu>
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

      <div className="flex items-center gap-1.5 border-t border-gray-100 px-4 py-2 dark:border-gray-700">
        {TYPE_ORDER.map((type) => (
          <Button key={type} onClick={() => dispatch({ type: 'add', componentType: type })}>
            {COMPONENT_TYPES[type].label}
            <kbd className="ml-2 text-xs text-gray-400">{COMPONENT_TYPES[type].key}</kbd>
          </Button>
        ))}
        {/* Five buttons for seventeen types made the tool look a third of its
            size — pie, combo, scatter, funnel, waterfall, histogram, box plot,
            heatmap, both maps, tabs and section were reachable only by clicking
            empty canvas and knowing to type. The count is computed, so it stays
            true. */}
        <Button
          title="Every component type, searchable"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            onMore({ clientX: r.left, clientY: r.bottom + 4 })
          }}
        >
          + {HIDDEN_TYPES} more…
        </Button>
        {/* Adding a page belongs with adding a component — both put something
            new on the canvas — and it has to live here rather than on the tab
            strip, because that strip is hidden while there is only one page. */}
        <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-600" />
        <Button onClick={onAddPage} title="Add a page to this dashboard">
          + Page
        </Button>
        <span className="ml-auto text-xs text-gray-400">
          click canvas to add · ⌘D duplicates · arrows move · delete removes · ⌘Z undo
        </span>
      </div>
    </header>
  )
}

// A labelled dropdown. Both menus in the header are one of these, so they open,
// close and dismiss identically rather than being written twice.
function Menu({ label, open, onToggle, onClose, children, width = 'w-60' }) {
  return (
    <div className="relative">
      <Button onClick={onToggle}>{label} ▾</Button>
      {open && (
        <>
          {/* Anything outside the menu dismisses it. */}
          <div className="fixed inset-0 z-40" onMouseDown={onClose} />
          <div
            className={`absolute right-0 z-50 mt-1 ${width} overflow-hidden rounded-sm border border-gray-300 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800`}
            role="menu"
          >
            {children}
          </div>
        </>
      )}
    </div>
  )
}

function Button({ onClick, children, disabled, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded-sm border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:cursor-default disabled:border-gray-200 disabled:text-gray-300 disabled:hover:bg-transparent dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 dark:active:bg-gray-600 dark:disabled:border-gray-700 dark:disabled:text-gray-600 dark:disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}

// One row in a menu.
function MenuItem({ onClick, children }) {
  return (
    <button
      className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function MenuLabel({ children }) {
  return (
    <div className="px-3 pt-1 pb-0.5 text-[10px] font-medium tracking-wide text-gray-400 uppercase">
      {children}
    </div>
  )
}

function Divider() {
  return <div className="my-1 h-px bg-gray-100 dark:bg-gray-700" />
}
