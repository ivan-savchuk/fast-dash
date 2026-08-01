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

// Templates are built from these so a template opened twice never produces two
// items with the same id.
export const newComponentId = () => nextId('c')
export const newFilterId = () => nextId('f')
export const newPageId = () => nextId('p')

// Dashboard-level filter controls (Superset's filter rail). Each is a label
// plus a control type; they carry no data, but they export as part of the
// document so a BI developer sees which filters the dashboard is meant to have.
// Mirrors Superset's native filter set: value (dropdown / multi-select),
// numerical range, time range (date range), time grain, plus search and a
// boolean toggle.
export const FILTER_TYPES = [
  'dropdown',
  'multi-select',
  'range',
  'date range',
  'time grain',
  'search',
  'toggle',
]

export function createDocument() {
  return {
    version: SCHEMA_VERSION,
    title: 'Untitled dashboard',
    filters: [],
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
const BURST_EDITS = new Set([
  'rename',
  'setComment',
  'setDocTitle',
  'nudge',
  'renameFilter',
  'renamePage',
])

export function initialState(doc = createDocument()) {
  // activePageId is view state, not part of the saved document — a reload
  // always opens on the first page. selectedId is likewise view state.
  return { doc, selectedId: null, activePageId: doc.pages[0].id, past: [], future: [], lastEdit: null }
}

// The page the user is currently looking at; every component action targets it.
// Falls back to the first page if the id ever goes stale.
function activePage(state) {
  return state.doc.pages.find((p) => p.id === state.activePageId) ?? state.doc.pages[0]
}

// Keep an active-page id valid against a given document — after undo, redo or
// import the page it named may be gone.
function validPageId(doc, id) {
  return doc.pages.some((p) => p.id === id) ? id : doc.pages[0].id
}

const collide = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

// Where a new component goes when you have not pointed at a cell: the first
// gap it fits in, scanning left to right then down. Four KPI cards therefore
// fill a row rather than stacking into four rows that each need dragging into
// place — a KPI row is the most common thing anyone builds here.
//
// A component too wide for what is left of a row simply drops to the next one.
function firstFreeSlot(components, w, h) {
  const bottom = components.reduce((max, c) => Math.max(max, c.layout.y + c.layout.h), 0)

  for (let y = 0; y <= bottom; y++) {
    for (let x = 0; x + w <= GRID_COLS; x++) {
      const candidate = { x, y, w, h }
      if (!components.some((c) => collide(c.layout, candidate))) return { x, y }
    }
  }
  return { x: 0, y: bottom }
}

// `at` is the grid cell the quick picker was opened on. Without one — the
// toolbar buttons and the number keys — we find a slot.
function createComponent(componentType, components, at) {
  const def = COMPONENT_TYPES[componentType]
  const { w, h } = def.defaultSize
  const slot = at
    ? { x: clamp(at.x, 0, GRID_COLS - w), y: Math.max(0, at.y) }
    : firstFreeSlot(components, w, h)
  return {
    id: nextId('c'),
    type: componentType,
    layout: { ...slot, w, h },
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
        activePageId: validPageId(previous, state.activePageId),
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
        activePageId: validPageId(next, state.activePageId),
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
  const page = activePage(state)

  switch (action.type) {
    case 'add': {
      const component = createComponent(action.componentType, page.components, action.at)
      return {
        ...state,
        selectedId: component.id,
        doc: replaceComponents(state.doc, page.id, [...page.components, component]),
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
        doc: replaceComponents(state.doc, page.id, [
          ...makeRoomFor(page.components, source, copy),
          copy,
        ]),
      }
    }

    case 'delete': {
      const rest = page.components.filter((c) => c.id !== action.id)
      return {
        ...state,
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        doc: replaceComponents(state.doc, page.id, rest),
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
      return { ...state, doc: replaceComponents(state.doc, page.id, moved) }
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
      return { ...state, doc: replaceComponents(state.doc, page.id, moved) }
    }

    case 'rename': {
      const renamed = page.components.map((c) =>
        c.id === action.id ? { ...c, title: action.title } : c,
      )
      return { ...state, doc: replaceComponents(state.doc, page.id, renamed) }
    }

    case 'setComment': {
      const commented = page.components.map((c) =>
        c.id === action.id ? { ...c, comment: action.comment } : c,
      )
      return { ...state, doc: replaceComponents(state.doc, page.id, commented) }
    }

    case 'setDocTitle':
      return { ...state, doc: { ...state.doc, title: action.title } }

    // --- pages ---

    case 'addPage': {
      const newPage = {
        id: nextId('p'),
        name: `Page ${state.doc.pages.length + 1}`,
        components: [],
      }
      return {
        ...state,
        selectedId: null,
        activePageId: newPage.id,
        doc: { ...state.doc, pages: [...state.doc.pages, newPage] },
      }
    }

    // Switching pages changes only view state, so — like `select` — it is not
    // recorded in history: the outgoing doc is returned unchanged.
    case 'selectPage': {
      if (action.id === state.activePageId) return state
      if (!state.doc.pages.some((p) => p.id === action.id)) return state
      return { ...state, activePageId: action.id, selectedId: null }
    }

    case 'renamePage': {
      const pages = state.doc.pages.map((p) =>
        p.id === action.id ? { ...p, name: action.name } : p,
      )
      return { ...state, doc: { ...state.doc, pages } }
    }

    case 'deletePage': {
      // The last page is never deletable — a dashboard always has one page.
      if (state.doc.pages.length <= 1) return state
      const idx = state.doc.pages.findIndex((p) => p.id === action.id)
      if (idx === -1) return state
      const pages = state.doc.pages.filter((p) => p.id !== action.id)
      // If the active page was the one removed, move to its neighbour: the page
      // that slid into its slot, or the new last page if it was the last.
      const activePageId =
        action.id === state.activePageId
          ? pages[Math.min(idx, pages.length - 1)].id
          : state.activePageId
      const nextDoc = { ...state.doc, pages }
      return {
        ...state,
        activePageId,
        selectedId: componentExists(nextDoc, state.selectedId) ? state.selectedId : null,
        doc: nextDoc,
      }
    }

    case 'addFilter': {
      const filter = { id: nextId('f'), label: 'New filter', type: 'dropdown' }
      return { ...state, doc: replaceFilters(state.doc, [...docFilters(state.doc), filter]) }
    }

    case 'renameFilter': {
      const filters = docFilters(state.doc).map((f) =>
        f.id === action.id ? { ...f, label: action.label } : f,
      )
      return { ...state, doc: replaceFilters(state.doc, filters) }
    }

    case 'setFilterType': {
      const filters = docFilters(state.doc).map((f) =>
        f.id === action.id ? { ...f, type: action.filterType } : f,
      )
      return { ...state, doc: replaceFilters(state.doc, filters) }
    }

    case 'removeFilter': {
      const filters = docFilters(state.doc).filter((f) => f.id !== action.id)
      if (filters.length === docFilters(state.doc).length) return state
      return { ...state, doc: replaceFilters(state.doc, filters) }
    }

    // Reorder: pull the filter out and reinsert it at `toIndex`. Drives both
    // the up/down buttons and drag-and-drop.
    case 'moveFilter': {
      const list = docFilters(state.doc)
      const from = list.findIndex((f) => f.id === action.id)
      if (from === -1) return state
      const to = clamp(action.toIndex, 0, list.length - 1)
      if (to === from) return state
      const filters = [...list]
      const [moved] = filters.splice(from, 1)
      filters.splice(to, 0, moved)
      return { ...state, doc: replaceFilters(state.doc, filters) }
    }

    // Import and New both stay undoable: they go through the same history
    // path as any other action, so an accidental import is recoverable.
    case 'load':
      return {
        ...state,
        doc: action.doc,
        selectedId: null,
        activePageId: action.doc.pages[0].id,
      }

    case 'reset': {
      const fresh = createDocument()
      return { ...state, doc: fresh, selectedId: null, activePageId: fresh.pages[0].id }
    }

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

function replaceComponents(doc, pageId, components) {
  return {
    ...doc,
    pages: doc.pages.map((p) => (p.id === pageId ? { ...p, components } : p)),
  }
}

// Documents from before filters existed have no `filters` key; treat that as
// an empty list everywhere rather than special-casing at every read.
function docFilters(doc) {
  return doc.filters ?? []
}

function replaceFilters(doc, filters) {
  return { ...doc, filters }
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max)
}
