import { useEffect, useReducer, useState } from 'react'

import Canvas from './components/Canvas.jsx'
import Toolbar from './components/Toolbar.jsx'
import { TYPE_BY_KEY } from './components/registry.jsx'
import { downloadDocument, readDocumentFile } from './io/documentFile.js'
import { initialState, reducer } from './state/document.js'

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
  const { doc, selectedId } = state
  const components = doc.pages[0].components

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
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return
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

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        dispatch({ type: 'delete', id: selectedId })
        return
      }

    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId])

  async function handleImportFile(file) {
    try {
      dispatch({ type: 'load', doc: await readDocumentFile(file) })
      setError(null)
    } catch (err) {
      setError(`Could not import that file: ${err.message}`)
    }
  }

  function handleNew() {
    if (components.length > 0 && !window.confirm('Discard the current dashboard?')) return
    dispatch({ type: 'reset' })
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Toolbar
        doc={doc}
        dispatch={dispatch}
        count={components.length}
        canUndo={state.past.length > 0}
        canRedo={state.future.length > 0}
        onExport={() => downloadDocument(doc)}
        onImportFile={handleImportFile}
        onNew={handleNew}
      />

      {error && (
        <div className="border-b border-gray-300 bg-gray-100 px-4 py-2 text-xs text-gray-700">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>
            dismiss
          </button>
        </div>
      )}

      <main
        className="p-4"
        onMouseDown={(e) => {
          // Click on empty canvas clears the selection and hands the keyboard
          // back, in case a title or description still had focus.
          if (e.target === e.currentTarget) {
            document.activeElement?.blur()
            dispatch({ type: 'select', id: null })
          }
        }}
      >
        <Canvas components={components} selectedId={selectedId} dispatch={dispatch} />
      </main>
    </div>
  )
}
