// The document is the whole saved state: title + pages + components.
// Everything the user does goes through `reducer` below, which is what makes
// undo cheap: history is just a list of previous documents. The JSON export is
// always exactly `state.doc`.

import { COMPONENT_TYPES } from '../components/registry.jsx'
import { variantsFor } from '../components/placeholderArt.js'

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
  'cycleVariant',
  'renameFilter',
  'renamePage',
  'renameTab',
])

export function initialState(doc = createDocument()) {
  // activePageId and activeTabs are view state, not part of the saved document
  // — a reload always opens on the first page and the first tab of each Tabs
  // container. selectedId is likewise view state.
  return {
    doc,
    selectedId: null,
    activePageId: doc.pages[0].id,
    activeTabs: {},
    past: [],
    future: [],
    lastEdit: null,
  }
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
  const variants = variantsFor(componentType)
  const component = {
    id: nextId('c'),
    type: componentType,
    // Only types that can be drawn more than one way carry a `variant`, and
    // they carry it from birth so the export always names the choice. On a KPI
    // or a table the key would be meaningless, so it is absent rather than null.
    ...(variants.length > 1 ? { variant: variants[0].id } : {}),
    layout: { ...slot, w, h },
    title: def.defaultTitle,
    // The spec layer lands in Phase 3. The keys exist now so an early
    // export already round-trips through the final shape.
    spec: {},
    comment: '',
  }
  // A Tabs container starts with one empty tab. Its children are ordinary
  // components living in the tab's own list; see the nested helpers below.
  if (componentType === 'tabs') {
    component.tabs = [{ id: nextId('t'), name: 'Tab A', components: [] }]
  }
  return component
}

// --- nested-component helpers ---
//
// A Tabs container holds child components inside `tabs[].components`. Component
// ids are globally unique, so title / comment edits and deletes can find a
// component by id wherever it sits — top level or one tab deep — without the
// caller knowing where it lives. Only one level of nesting is supported (no
// tabs inside tabs), which these helpers assume by recursing only into `tabs`.

function updateInList(components, id, fn) {
  return components.map((c) => {
    if (c.id === id) return fn(c)
    if (c.type === 'tabs' && Array.isArray(c.tabs) && containsChild(c, id)) {
      return {
        ...c,
        tabs: c.tabs.map((t) => ({
          ...t,
          components: t.components.map((cc) => (cc.id === id ? fn(cc) : cc)),
        })),
      }
    }
    return c
  })
}

function removeInList(components, id) {
  if (components.some((c) => c.id === id)) return components.filter((c) => c.id !== id)
  return components.map((c) => {
    if (c.type === 'tabs' && Array.isArray(c.tabs) && containsChild(c, id)) {
      return {
        ...c,
        tabs: c.tabs.map((t) => ({ ...t, components: t.components.filter((cc) => cc.id !== id) })),
      }
    }
    return c
  })
}

function containsChild(container, id) {
  return (container.tabs ?? []).some((t) => (t.components ?? []).some((cc) => cc.id === id))
}

// Copy a react-grid-layout position `l` onto component `c`, returning the same
// reference when nothing moved so callers can detect a no-op drag cheaply.
function applyLayout(c, l) {
  if (!l) return c
  const same = l.x === c.layout.x && l.y === c.layout.y && l.w === c.layout.w && l.h === c.layout.h
  return same ? c : { ...c, layout: { x: l.x, y: l.y, w: l.w, h: l.h } }
}

function findInList(components, id) {
  for (const c of components) {
    if (c.id === id) return c
    if (c.type === 'tabs' && Array.isArray(c.tabs)) {
      for (const t of c.tabs) {
        const hit = (t.components ?? []).find((cc) => cc.id === id)
        if (hit) return hit
      }
    }
  }
  return null
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
  return id != null && doc.pages.some((p) => findInList(p.components, id) != null)
}

// Every action returns a brand new state object — no mutation.
function applyAction(state, action) {
  const page = activePage(state)

  switch (action.type) {
    case 'add': {
      // Adding into a Tabs container's active tab rather than onto the page.
      if (action.container) {
        const { containerId, tabId } = action.container
        const container = page.components.find((c) => c.id === containerId && c.type === 'tabs')
        if (!container) return state
        const tab = container.tabs.find((t) => t.id === tabId) ?? container.tabs[0]
        const child = createComponent(action.componentType, tab.components, action.at)
        const comps = page.components.map((c) =>
          c.id !== containerId
            ? c
            : {
                ...c,
                tabs: c.tabs.map((t) =>
                  t.id !== tab.id ? t : { ...t, components: [...t.components, child] },
                ),
              },
        )
        return {
          ...state,
          selectedId: child.id,
          doc: replaceComponents(state.doc, page.id, comps),
        }
      }
      const component = createComponent(action.componentType, page.components, action.at)
      return {
        ...state,
        selectedId: component.id,
        doc: replaceComponents(state.doc, page.id, [...page.components, component]),
      }
    }

    case 'duplicate': {
      const id = action.id ?? state.selectedId

      const makeCopy = (source) => ({
        ...source,
        id: nextId('c'),
        layout: { ...source.layout, y: source.layout.y + source.layout.h },
        // structuredClone so the copy does not share the spec object with its
        // source — phase 3 fills that in with nested values.
        spec: structuredClone(source.spec ?? {}),
        // A duplicated Tabs container must not share tab objects with its
        // source, or editing one would change the other's tabs.
        ...(source.type === 'tabs' ? { tabs: structuredClone(source.tabs ?? []) } : {}),
      })

      const source = page.components.find((c) => c.id === id)
      if (source) {
        const copy = makeCopy(source)
        return {
          ...state,
          selectedId: copy.id,
          doc: replaceComponents(state.doc, page.id, [
            ...makeRoomFor(page.components, source, copy),
            copy,
          ]),
        }
      }

      // Not on the page — look for it inside a Tabs container and duplicate it
      // within its own tab.
      for (const cont of page.components) {
        if (cont.type !== 'tabs') continue
        for (const tab of cont.tabs) {
          const src = tab.components.find((c) => c.id === id)
          if (!src) continue
          const copy = makeCopy(src)
          const comps = page.components.map((c) =>
            c.id !== cont.id
              ? c
              : {
                  ...c,
                  tabs: c.tabs.map((t) =>
                    t.id !== tab.id
                      ? t
                      : { ...t, components: [...makeRoomFor(t.components, src, copy), copy] },
                  ),
                },
          )
          return {
            ...state,
            selectedId: copy.id,
            doc: replaceComponents(state.doc, page.id, comps),
          }
        }
      }
      return state
    }

    case 'delete': {
      // removeInList reaches nested children too, so deleting works whether the
      // card is on the page or inside a tab.
      const rest = removeInList(page.components, action.id)
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

      // A drag/resize inside a Tabs container's nested grid: write the moved
      // layouts back onto that tab's children.
      if (action.container) {
        const { containerId, tabId } = action.container
        let changed = false
        const comps = page.components.map((c) => {
          if (c.id !== containerId || c.type !== 'tabs') return c
          return {
            ...c,
            tabs: c.tabs.map((t) => {
              if (t.id !== tabId) return t
              const moved = t.components.map((cc) => applyLayout(cc, byId.get(cc.id)))
              if (moved.every((cc, i) => cc === t.components[i])) return t
              changed = true
              return { ...t, components: moved }
            }),
          }
        })
        if (!changed) return state
        return { ...state, doc: replaceComponents(state.doc, page.id, comps) }
      }

      const moved = page.components.map((c) => applyLayout(c, byId.get(c.id)))
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
      const renamed = updateInList(page.components, action.id, (c) => ({
        ...c,
        title: action.title,
      }))
      return { ...state, doc: replaceComponents(state.doc, page.id, renamed) }
    }

    case 'setComment': {
      const commented = updateInList(page.components, action.id, (c) => ({
        ...c,
        comment: action.comment,
      }))
      return { ...state, doc: replaceComponents(state.doc, page.id, commented) }
    }

    // Which way a chart is drawn — vertical or horizontal bars, and so on.
    // Both of these reach a card nested inside a Tabs container, because
    // `updateInList` and `findInList` already search one level down.

    // Picked explicitly from the card header's menu.
    case 'setVariant': {
      const current = findInList(page.components, action.id)
      // Re-picking the entry already ticked is not an edit, so it must not
      // become an undo step.
      if (!current || current.variant === action.variant) return state
      const updated = updateInList(page.components, action.id, (c) => ({
        ...c,
        variant: action.variant,
      }))
      return { ...state, doc: replaceComponents(state.doc, page.id, updated) }
    }

    // Stepped with the keyboard. The reducer resolves current-to-next itself so
    // the view never has to find the component — the selection may be nested.
    case 'cycleVariant': {
      const id = action.id ?? state.selectedId
      const current = id ? findInList(page.components, id) : null
      if (!current) return state
      const list = variantsFor(current.type)
      if (list.length < 2) return state
      // An absent or unrecognised variant is the default, which is index 0.
      const at = list.findIndex((v) => v.id === current.variant)
      const from = at === -1 ? 0 : at
      const variant = list[(from + action.delta + list.length) % list.length].id
      const updated = updateInList(page.components, id, (c) => ({ ...c, variant }))
      return { ...state, doc: replaceComponents(state.doc, page.id, updated) }
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

    // --- tabs inside a Tabs container ---

    case 'addTab': {
      let newTabId = null
      const comps = page.components.map((c) => {
        if (c.id !== action.id || c.type !== 'tabs') return c
        newTabId = nextId('t')
        const name = `Tab ${String.fromCharCode(65 + c.tabs.length)}`
        return { ...c, tabs: [...c.tabs, { id: newTabId, name, components: [] }] }
      })
      if (!newTabId) return state
      return {
        ...state,
        activeTabs: { ...state.activeTabs, [action.id]: newTabId },
        doc: replaceComponents(state.doc, page.id, comps),
      }
    }

    // View-only, like `select` and `selectPage`: not recorded in history.
    case 'selectTab': {
      if (state.activeTabs[action.containerId] === action.tabId) return state
      return {
        ...state,
        activeTabs: { ...state.activeTabs, [action.containerId]: action.tabId },
      }
    }

    case 'renameTab': {
      const comps = page.components.map((c) => {
        if (c.id !== action.containerId || c.type !== 'tabs') return c
        return {
          ...c,
          tabs: c.tabs.map((t) => (t.id === action.id ? { ...t, name: action.name } : t)),
        }
      })
      return { ...state, doc: replaceComponents(state.doc, page.id, comps) }
    }

    case 'deleteTab': {
      const container = page.components.find(
        (c) => c.id === action.containerId && c.type === 'tabs',
      )
      // A Tabs container always keeps at least one tab.
      if (!container || container.tabs.length <= 1) return state
      const idx = container.tabs.findIndex((t) => t.id === action.tabId)
      if (idx === -1) return state
      const remaining = container.tabs.filter((t) => t.id !== action.tabId)
      const comps = page.components.map((c) =>
        c.id === action.containerId ? { ...c, tabs: remaining } : c,
      )
      const nextDoc = replaceComponents(state.doc, page.id, comps)
      const wasActive =
        (state.activeTabs[action.containerId] ?? container.tabs[0].id) === action.tabId
      const activeTabs = wasActive
        ? {
            ...state.activeTabs,
            [action.containerId]: remaining[Math.min(idx, remaining.length - 1)].id,
          }
        : state.activeTabs
      return {
        ...state,
        activeTabs,
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

// Every child component id inside a Tabs container, across all its tabs. The
// view layer uses this to tell whether the current selection lives in a
// container without needing to know which tab.
export function tabChildIds(component) {
  if (component.type !== 'tabs' || !Array.isArray(component.tabs)) return []
  return component.tabs.flatMap((t) => (t.components ?? []).map((c) => c.id))
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
