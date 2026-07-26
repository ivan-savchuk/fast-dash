// The document is the whole saved state: title + pages + components.
// Everything the user does goes through `reducer` below, which is what makes
// undo cheap: history is just a list of previous documents. The JSON export is
// always exactly `state.doc`.

import { COMPONENT_TYPES } from '../components/registry.jsx'

export const SCHEMA_VERSION = 1

// Grid geometry. 12 columns is the Superset/Power BI convention.
export const GRID_COLS = 12
export const GRID_ROW_HEIGHT = 40

let idCounter = 0
const nextId = (prefix) => `${prefix}${++idCounter}_${Date.now().toString(36)}`

export function createDocument() {
  return {
    version: SCHEMA_VERSION,
    title: 'Untitled dashboard',
    pages: [{ id: 'p1', name: 'Overview', components: [] }],
  }
}

// How many steps back you can go. Documents are small; 100 is generous.
const HISTORY_LIMIT = 100

// Consecutive edits of the same kind to the same target within this window
// collapse into one history entry, so typing a description is one undo, not
// one per keystroke. Holding an arrow key is likewise one undo.
const COALESCE_MS = 800

// Edits that arrive in bursts and should be collapsed. A drag or a delete is
// a single deliberate act and is never coalesced.
const BURST_EDITS = new Set(['rename', 'setComment', 'setDocTitle', 'nudge'])

export function initialState(doc = createDocument()) {
  return { doc, selectedId: null, past: [], future: [], lastEdit: null }
}

// Find the first free row so a new component lands below existing ones
// instead of on top of them.
function firstFreeRow(components) {
  return components.reduce((max, c) => Math.max(max, c.layout.y + c.layout.h), 0)
}

function createComponent(componentType, components) {
  const def = COMPONENT_TYPES[componentType]
  return {
    id: nextId('c'),
    type: componentType,
    layout: {
      x: 0,
      y: firstFreeRow(components),
      w: def.defaultSize.w,
      h: def.defaultSize.h,
    },
    title: def.defaultTitle,
    // The spec layer lands in Phase 3. The keys exist now so an early
    // export already round-trips through the final shape.
    spec: {},
    comment: '',
  }
}

// Undo and redo are handled here; every other action is applied by
// `applyAction` below and then recorded in history. Keeping the two apart
// means no individual action has to remember to maintain history.
export function reducer(state, action) {
  switch (action.type) {
    case 'undo': {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      return {
        ...state,
        doc: previous,
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future],
        selectedId: componentExists(previous, state.selectedId) ? state.selectedId : null,
        lastEdit: null,
      }
    }

    case 'redo': {
      if (state.future.length === 0) return state
      const [next, ...rest] = state.future
      return {
        ...state,
        doc: next,
        past: [...state.past, state.doc],
        future: rest,
        selectedId: componentExists(next, state.selectedId) ? state.selectedId : null,
        lastEdit: null,
      }
    }

    default: {
      const next = applyAction(state, action)
      // Selection changes and no-ops are not history.
      if (next.doc === state.doc) return next
      return record(state, next, action)
    }
  }
}

// Push the outgoing document onto the undo stack, collapsing bursts of the
// same edit, and drop the redo stack — the timeline has branched.
function record(state, next, action) {
  const now = Date.now()
  const target = action.id ?? state.selectedId ?? null
  const coalesce =
    BURST_EDITS.has(action.type) &&
    state.lastEdit?.type === action.type &&
    state.lastEdit?.target === target &&
    now - state.lastEdit.at < COALESCE_MS

  return {
    ...next,
    past: coalesce ? state.past : [...state.past, state.doc].slice(-HISTORY_LIMIT),
    future: [],
    lastEdit: { type: action.type, target, at: now },
  }
}

function componentExists(doc, id) {
  return id != null && doc.pages.some((p) => p.components.some((c) => c.id === id))
}

// Every action returns a brand new state object — no mutation.
function applyAction(state, action) {
  const page = state.doc.pages[0]

  switch (action.type) {
    case 'add': {
      const component = createComponent(action.componentType, page.components)
      return {
        ...state,
        selectedId: component.id,
        doc: replaceComponents(state.doc, [...page.components, component]),
      }
    }

    case 'duplicate': {
      const source = page.components.find((c) => c.id === (action.id ?? state.selectedId))
      if (!source) return state
      const copy = {
        ...source,
        id: nextId('c'),
        layout: { ...source.layout, y: source.layout.y + source.layout.h },
        // structuredClone so the copy does not share the spec object with its
        // source — phase 3 fills that in with nested values.
        spec: structuredClone(source.spec ?? {}),
      }
      return {
        ...state,
        selectedId: copy.id,
        doc: replaceComponents(state.doc, [...makeRoomFor(page.components, source, copy), copy]),
      }
    }

    case 'delete': {
      const rest = page.components.filter((c) => c.id !== action.id)
      return {
        ...state,
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        doc: replaceComponents(state.doc, rest),
      }
    }

    case 'select':
      return { ...state, selectedId: action.id }

    // react-grid-layout hands back the positions of every item after a
    // drag or resize. We copy them onto our own components.
    case 'setLayout': {
      const byId = new Map(action.layout.map((l) => [l.i, l]))
      const moved = page.components.map((c) => {
        const l = byId.get(c.id)
        if (!l) return c
        const same =
          l.x === c.layout.x && l.y === c.layout.y && l.w === c.layout.w && l.h === c.layout.h
        return same ? c : { ...c, layout: { x: l.x, y: l.y, w: l.w, h: l.h } }
      })
      // A click that starts a drag but goes nowhere must not become an undo
      // step. Unchanged components keep their identity, so this is cheap.
      if (moved.every((c, i) => c === page.components[i])) return state
      return { ...state, doc: replaceComponents(state.doc, moved) }
    }

    // Keyboard nudge: arrow keys move the selected component one cell.
    case 'nudge': {
      if (!state.selectedId) return state
      const moved = page.components.map((c) => {
        if (c.id !== state.selectedId) return c
        const x = clamp(c.layout.x + action.dx, 0, GRID_COLS - c.layout.w)
        const y = Math.max(0, c.layout.y + action.dy)
        if (x === c.layout.x && y === c.layout.y) return c
        return { ...c, layout: { ...c.layout, x, y } }
      })
      // Arrow key held against the edge of the canvas: nothing moved.
      if (moved.every((c, i) => c === page.components[i])) return state
      return { ...state, doc: replaceComponents(state.doc, moved) }
    }

    case 'rename': {
      const renamed = page.components.map((c) =>
        c.id === action.id ? { ...c, title: action.title } : c,
      )
      return { ...state, doc: replaceComponents(state.doc, renamed) }
    }

    case 'setComment': {
      const commented = page.components.map((c) =>
        c.id === action.id ? { ...c, comment: action.comment } : c,
      )
      return { ...state, doc: replaceComponents(state.doc, commented) }
    }

    case 'setDocTitle':
      return { ...state, doc: { ...state.doc, title: action.title } }

    // Import and New both stay undoable: they go through the same history
    // path as any other action, so an accidental import is recoverable.
    case 'load':
      return { ...state, doc: action.doc, selectedId: null }

    case 'reset':
      return { ...state, doc: createDocument(), selectedId: null }

    default:
      return state
  }
}

// A copy lands directly under its source. Anything that occupied that space is
// pushed straight down by the height of the copy — without this the grid
// resolves the overlap by sending the copy to the bottom of the page, which is
// nowhere near what you were looking at. Only components sharing columns with
// the copy move; the rest of the canvas is left alone, and react-grid-layout
// closes any gap left behind when it compacts.
function makeRoomFor(components, source, copy) {
  const top = copy.layout.y
  const overlapsColumns = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w

  return components.map((c) => {
    const sitsInTheWay = c.layout.y + c.layout.h > top
    if (c.id === source.id || !sitsInTheWay || !overlapsColumns(c.layout, copy.layout)) return c
    return { ...c, layout: { ...c.layout, y: c.layout.y + copy.layout.h } }
  })
}

function replaceComponents(doc, components) {
  const [page, ...rest] = doc.pages
  return { ...doc, pages: [{ ...page, components }, ...rest] }
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max)
}
