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
  onShowShortcuts,
  onAddPage,
  count,
  canUndo,
  canRedo,
}) {
  const fileInput = useRef(null)
  // A single boolean now — there is one menu ("Options"), everything folds into
  // it, so opening and closing is one flag rather than a name.
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* The name of the whole dashboard used to be 16px against a card title's
            14px, which is not a hierarchy. */}
        {/* The title used to be flex-1 and stretched the full window. Capped at
            max-w-md it stays a title-sized field; the auto margin on the group
            to its right pushes the count and menu to the edge. */}
        <input
          className="min-w-0 max-w-md flex-1 truncate rounded-sm px-1 py-0.5 text-lg font-semibold text-gray-900 outline-none hover:bg-gray-50 focus:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-700 dark:focus:bg-gray-700"
          value={doc.title}
          onChange={(e) => dispatch({ type: 'setDocTitle', title: e.target.value })}
          aria-label="Dashboard title"
        />
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <span className="text-xs text-gray-400">
            {count} {count === 1 ? 'component' : 'components'}
          </span>
          <span className="h-5 w-px bg-gray-200 dark:bg-gray-600" />
          {/* One menu now holds everything that is not adding a component:
              the document actions, editing, presenting, how it looks, what to
              start from, and the reference card. The header used to carry five
              controls; it carries one, which is the point. */}
          <Menu
            label="Options"
            open={open}
            onToggle={() => setOpen((v) => !v)}
            onClose={close}
          >
            {/* The two things you reach for first: start over, then hand off. */}
            <MenuItem onClick={() => { close(); onNew() }}>New dashboard</MenuItem>

            {/* Export is what the tool is for, so it sits near the top even
                folded into this menu. Its two files stay a step to the side. */}
            <Submenu label="Export" width="w-56">
              <button
                className="block w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => { close(); onExportHtml() }}
              >
                <span className="block text-sm text-gray-800 dark:text-gray-100">HTML</span>
                <span className="block text-xs text-gray-400">The hand-over file</span>
              </button>
              <button
                className="block w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => { close(); onExport() }}
              >
                <span className="block text-sm text-gray-800 dark:text-gray-100">JSON</span>
                <span className="block text-xs text-gray-400">The editable spec</span>
              </button>
            </Submenu>

            <button
              className="block w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => { close(); fileInput.current?.click() }}
            >
              <span className="block text-sm text-gray-800 dark:text-gray-100">Import…</span>
              <span className="block text-xs text-gray-400">Open a saved JSON spec</span>
            </button>

            <Divider />

            {/* Undo and redo carry their shortcuts, so the menu doubles as the
                place you learn them. Disabled when there is no history. */}
            <Submenu label="Edit" width="w-44">
              <MenuItem
                onClick={() => { close(); dispatch({ type: 'undo' }) }}
                disabled={!canUndo}
                shortcut="⌘Z"
              >
                Undo
              </MenuItem>
              <MenuItem
                onClick={() => { close(); dispatch({ type: 'redo' }) }}
                disabled={!canRedo}
                shortcut="⇧⌘Z"
              >
                Redo
              </MenuItem>
            </Submenu>

            <MenuItem onClick={() => { close(); onPresent() }} shortcut="P">
              Present
            </MenuItem>

            <Submenu label="Colour scheme" width="w-56">
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
            </Submenu>

            <Submenu label="Start from template" width="w-64">
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
            </Submenu>

            <MenuItem onClick={() => { close(); onShowShortcuts() }}>
              Keyboard shortcuts
            </MenuItem>

            {/* Light/dark is a preference about this screen, not the document,
                so it sits apart at the very bottom. */}
            <Divider />
            <MenuItem onClick={onToggleTheme}>{dark ? '☀  Light mode' : '☾  Dark mode'}</MenuItem>
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
          {/* No overflow-hidden here: submenus fly out to the left with
              right-full and would be clipped by it. The rounded corners are
              2px, so an un-clipped hover square is invisible in practice. */}
          <div
            className={`absolute right-0 z-50 mt-1 ${width} rounded-sm border border-gray-300 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800`}
            role="menu"
          >
            {children}
          </div>
        </>
      )}
    </div>
  )
}

// A menu row that opens a second panel to its left on hover. The panel sits to
// the left because the Options menu is pinned to the right edge of the window,
// so flying out right would run off-screen. Children close the parent menu
// themselves (they call close()), which dismisses the whole stack.
function Submenu({ label, children, width = 'w-56' }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="flex cursor-default items-center justify-between px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700">
        <span>{label}</span>
        <span className="text-gray-400">▸</span>
      </div>
      {open && (
        <div
          className={`absolute top-0 right-full mr-0.5 ${width} rounded-sm border border-gray-300 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800`}
          role="menu"
        >
          {children}
        </div>
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

// One row in a menu. `shortcut`, when given, prints a key hint right-aligned —
// so a menu row can also teach the keystroke that does the same thing.
function MenuItem({ onClick, children, shortcut, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-6 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent dark:text-gray-100 dark:hover:bg-gray-700 dark:disabled:text-gray-600 dark:disabled:hover:bg-transparent"
    >
      <span>{children}</span>
      {shortcut && <kbd className="shrink-0 text-xs text-gray-400">{shortcut}</kbd>}
    </button>
  )
}

function Divider() {
  return <div className="my-1 h-px bg-gray-100 dark:bg-gray-700" />
}
