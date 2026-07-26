// The document is the whole saved state: title + pages + components.
// Everything the user does goes through `reducer` below, so undo stays cheap
// to add later (Phase 2) and the JSON export is always just `state.doc`.

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

export function initialState() {
  return { doc: createDocument(), selectedId: null }
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

// Every action returns a brand new state object — no mutation.
export function reducer(state, action) {
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
      return { ...state, doc: replaceComponents(state.doc, moved) }
    }

    // Keyboard nudge: arrow keys move the selected component one cell.
    case 'nudge': {
      if (!state.selectedId) return state
      const moved = page.components.map((c) => {
        if (c.id !== state.selectedId) return c
        const x = clamp(c.layout.x + action.dx, 0, GRID_COLS - c.layout.w)
        const y = Math.max(0, c.layout.y + action.dy)
        return { ...c, layout: { ...c.layout, x, y } }
      })
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

    // Used by both file import and localStorage restore.
    case 'load':
      return { doc: action.doc, selectedId: null }

    case 'reset':
      return initialState()

    default:
      return state
  }
}

function replaceComponents(doc, components) {
  const [page, ...rest] = doc.pages
  return { ...doc, pages: [{ ...page, components }, ...rest] }
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max)
}
