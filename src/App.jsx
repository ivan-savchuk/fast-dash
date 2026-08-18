import { useCallback, useEffect, useReducer, useRef, useState } from 'react'

import Canvas from './components/Canvas.jsx'
import FilterRail from './components/FilterRail.jsx'
import PageTabs from './components/PageTabs.jsx'
import QuickPicker from './components/QuickPicker.jsx'
import Toolbar from './components/Toolbar.jsx'
import { TYPE_BY_KEY } from './components/registry.jsx'
import { downloadDocument, readDocumentFile } from './io/documentFile.js'
import { downloadHtmlExport } from './io/htmlExport.js'
import { DEFAULT_THEME, initialState, reducer } from './state/document.js'
import { buildTemplate } from './templates.js'

const STORAGE_KEY = 'fastdash:document:v1'

// Restore the last session from localStorage. A corrupt value must never
// block startup, so any failure falls back to an empty document.
function bootstrap() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    // initialState builds the empty history around the restored document —
    // you cannot undo past the start of a session.
    if (saved) return initialState(JSON.parse(saved))
  } catch {
    // ignore and start clean
  }
  return initialState()
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, bootstrap)
  const [error, setError] = useState(null)
  // Where the quick picker was summoned: viewport coords to draw it, grid
  // coords to place whatever gets chosen.
  const [picker, setPicker] = useState(null)
  // Filter rail open/closed. UI state, not part of the document, but remembered
  // across sessions so it opens the way you left it.
  const [filtersOpen, setFiltersOpen] = useState(() => {
    try {
      return localStorage.getItem('fastdash:filtersOpen') !== 'false'
    } catch {
      return true
    }
  })
  // Dark theme. Persisted; falls back to the OS preference the first time.
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem('fastdash:theme')
      if (saved) return saved === 'dark'
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
    } catch {
      return false
    }
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('fastdash:theme', dark ? 'dark' : 'light')
    } catch {
      // remembering the theme is a nicety, not worth failing over
    }
  }, [dark])

  // The colour scheme, unlike the dark/light preference, belongs to the
  // document — so it is mirrored onto <html> from `doc.theme` rather than from
  // localStorage, and changes whenever you open a different dashboard.
  useEffect(() => {
    document.documentElement.dataset.scheme = state.doc.theme ?? DEFAULT_THEME
  }, [state.doc.theme])

  // True while the rail is animating its width. During that window the cards'
  // CSS transition is switched off so react-grid-layout can track the animating
  // canvas width frame-by-frame; otherwise the transition fights the per-frame
  // updates and the cards jerk. Matches the rail's 200ms width animation.
  const [railSettling, setRailSettling] = useState(false)
  const settleTimer = useRef(null)
  const { doc, selectedId, activePageId, activeTabs } = state
  // The page the user is looking at; the reducer keeps activePageId valid, but
  // fall back to the first page defensively for the very first render.
  const activePage = doc.pages.find((p) => p.id === activePageId) ?? doc.pages[0]
  const components = activePage.components

  // Open the quick picker aimed at a tab inside a Tabs container, rather than
  // at the page. Stable identity so it does not defeat the memo on Card.
  const handleAddInto = useCallback((containerId, tabId, at) => {
    setPicker({ clientX: at.clientX, clientY: at.clientY, container: { containerId, tabId } })
  }, [])

  // Autosave, but a beat after you stop rather than on every keystroke:
  // localStorage writes are synchronous: stringifying the document and writing
  // it blocks the main thread. Doing that on a timer meant the block landed
  // shortly after you dropped a card, which felt like the move being applied
  // late. So we wait for the browser to be genuinely idle instead, with a
  // 2s ceiling so a busy tab still saves.
  useEffect(() => {
    const save = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
      } catch {
        // storage full or disabled — not worth interrupting the user
      }
    }

    if (typeof requestIdleCallback === 'function') {
      const handle = requestIdleCallback(save, { timeout: 2000 })
      return () => cancelIdleCallback(handle)
    }
    // Safari has no requestIdleCallback.
    const timer = setTimeout(save, 400)
    return () => clearTimeout(timer)
  }, [doc])

  // Keyboard-first: number keys add, arrows move, delete removes.
  useEffect(() => {
    function onKeyDown(e) {
      // The quick picker owns the keyboard while it is open — otherwise 1-5
      // would both pick from the menu and add a second component below.
      if (picker) return

      // Undo/redo is checked first, and deliberately works while a text field
      // has focus. The title and description are controlled inputs, so the
      // browser's own undo cannot restore them anyway — and because a burst of
      // typing collapses into one history entry, one press undoes the whole
      // burst rather than a single character.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
        return
      }
      // Ctrl+Y is the Windows redo convention.
      if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        dispatch({ type: 'redo' })
        return
      }

      // Also checked before the text-field guard, so the browser never gets
      // the chance to open its bookmark dialog.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        if (selectedId) dispatch({ type: 'duplicate', id: selectedId })
        return
      }

      // Escape is handled before the text-field guard so it doubles as "give
      // me the keyboard back" when a title or description has focus.
      if (e.key === 'Escape') {
        e.target.blur?.()
        dispatch({ type: 'select', id: null })
        return
      }

      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) {
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (TYPE_BY_KEY[e.key]) {
        e.preventDefault()
        dispatch({ type: 'add', componentType: TYPE_BY_KEY[e.key] })
        return
      }

      const nudges = {
        ArrowLeft: { dx: -1, dy: 0 },
        ArrowRight: { dx: 1, dy: 0 },
        ArrowUp: { dx: 0, dy: -1 },
        ArrowDown: { dx: 0, dy: 1 },
      }
      if (nudges[e.key] && selectedId) {
        e.preventDefault()
        dispatch({ type: 'nudge', ...nudges[e.key] })
        return
      }

      // [ and ] step the selected chart through the ways it can be drawn — the
      // keyboard half of the type badge in the card header. Types with a single
      // drawing ignore it; the reducer decides, since the selection may be a
      // card nested inside a Tabs container.
      if ((e.key === '[' || e.key === ']') && selectedId) {
        e.preventDefault()
        dispatch({ type: 'cycleVariant', delta: e.key === ']' ? 1 : -1 })
        return
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        dispatch({ type: 'delete', id: selectedId })
        return
      }

    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, picker])

  async function handleImportFile(file) {
    try {
      dispatch({ type: 'load', doc: await readDocumentFile(file) })
      setError(null)
    } catch (err) {
      setError(`Could not import that file: ${err.message}`)
    }
  }

  function handlePickTemplate(templateId) {
    const doc = buildTemplate(templateId)
    if (!doc) return
    // No confirmation prompt: this is undoable like any other change, and a
    // dialog in the way of "show me what this looks like" is the wrong trade.
    dispatch({ type: 'load', doc })
    setError(null)
  }

  function handleNew() {
    // Every page, not just the one on screen. Standing on an empty second page
    // of a full dashboard, this used to wipe the lot without asking.
    const total = doc.pages.reduce((n, page) => n + page.components.length, 0)
    if (total > 0 && !window.confirm('Discard the current dashboard?')) return
    dispatch({ type: 'reset' })
    setError(null)
  }

  function toggleFilters() {
    setRailSettling(true)
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => setRailSettling(false), 260)

    setFiltersOpen((open) => {
      const next = !open
      try {
        localStorage.setItem('fastdash:filtersOpen', String(next))
      } catch {
        // remembering the panel state is a nicety, not worth failing over
      }
      return next
    })
  }

  return (
    // App shell: fixed to the viewport, with the filter rail and the canvas
    // each scrolling on their own.
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <Toolbar
        doc={doc}
        dispatch={dispatch}
        count={components.length}
        canUndo={state.past.length > 0}
        canRedo={state.future.length > 0}
        dark={dark}
        onToggleTheme={() => setDark((d) => !d)}
        onExport={() => downloadDocument(doc)}
        onExportHtml={() => downloadHtmlExport(doc)}
        onImportFile={handleImportFile}
        onNew={handleNew}
        onPickTemplate={handlePickTemplate}
        onMore={setPicker}
      />

      {error && (
        <div className="border-b border-gray-300 bg-gray-100 px-4 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>
            dismiss
          </button>
        </div>
      )}

      <PageTabs pages={doc.pages} activeId={activePage.id} dispatch={dispatch} />

      <div className="flex min-h-0 flex-1">
        <FilterRail
          filters={doc.filters ?? []}
          open={filtersOpen}
          onToggle={toggleFilters}
          dispatch={dispatch}
        />

        <main
          className="flex-1 overflow-auto p-4"
          onMouseDown={(e) => {
            // Click on empty canvas clears the selection and hands the keyboard
            // back, in case a title or description still had focus.
            if (e.target === e.currentTarget) {
              document.activeElement?.blur()
              dispatch({ type: 'select', id: null })
            }
          }}
        >
          <Canvas
            components={components}
            selectedId={selectedId}
            activeTabs={activeTabs}
            freezeAnim={railSettling}
            // A template replaces the whole document, so it is only offered when
            // there is nothing to replace. Otherwise standing on an empty second
            // page would put a one-click "wipe everything" in the middle of the
            // canvas.
            docEmpty={doc.pages.every((p) => p.components.length === 0)}
            dispatch={dispatch}
            onEmptyClick={setPicker}
            onAddInto={handleAddInto}
            onPickTemplate={handlePickTemplate}
          />
        </main>
      </div>

      {picker && (
        <QuickPicker
          at={picker}
          // No tabs inside tabs: only one level of nesting is supported.
          exclude={picker.container ? ['tabs'] : undefined}
          onClose={() => setPicker(null)}
          onPick={(componentType) => {
            if (picker.container) {
              // Auto-placed inside the tab — no grid cell to honour yet (4b).
              dispatch({ type: 'add', componentType, container: picker.container })
            } else if (picker.x == null) {
              // Opened from the toolbar's "+ N more", so the click was on a
              // button rather than on a spot in the grid. With no cell to
              // honour it takes the first gap it fits, exactly like the number
              // keys. Passing `at` here would clamp `undefined` into a NaN.
              dispatch({ type: 'add', componentType })
            } else {
              dispatch({ type: 'add', componentType, at: { x: picker.x, y: picker.y } })
            }
            setPicker(null)
          }}
        />
      )}
    </div>
  )
}
