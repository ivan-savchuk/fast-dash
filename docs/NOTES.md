# BUILD NOTES

What is actually in the code, and the traps that cost time. `SPEC.md` says what the
tool should be; this says how it currently is.

Status: **Phase 1, 2 and 3 complete.** Phase 4 in progress: the quick picker is now a
searchable catalog (the keyed five keep their number keys; everything else is search-only),
Pie/Donut and a Tabs placeholder landed as the first catalog-only types, and dashboards are
now multi-page. Next in Phase 4: making the Tabs element host real nested cards.

---

## File map

| File | Job |
|---|---|
| `src/state/document.js` | The document object, the reducer, grid geometry constants |
| `src/components/registry.jsx` | One entry per component type: label, default size, shortcut key, placeholder |
| `src/components/placeholderArt.js` | The chart drawings, described once and shared by the canvas and the HTML export |
| `src/components/TypeBadge.jsx` | The type label in a card header, and the menu that switches a chart's variant |
| `src/components/Canvas.jsx` | `react-grid-layout` wiring, and click-to-grid-cell maths |
| `src/components/QuickPicker.jsx` | The menu that opens where you click the canvas — a search box over the full component catalog |
| `src/components/PageTabs.jsx` | The page tab strip: switch, add, rename (double-click), delete |
| `src/components/TabsBody.jsx` | Inside a Tabs container: the inner tab strip and the active tab's nested grid |
| `src/templates.js` | The three starter dashboards |
| `src/components/FilterRail.jsx` | The collapsible left filter rail |
| `src/io/htmlExport.js` | Read-only self-contained HTML export |
| `src/components/Card.jsx` | Card chrome: header, title, type label, delete, description |
| `src/components/Toolbar.jsx` | Dashboard title, add buttons, export / import / new |
| `src/io/documentFile.js` | JSON download and file read, with validation |
| `src/App.jsx` | Reducer wiring, autosave, keyboard shortcuts |

Adding a chart type is four short lines: the drawing in `placeholderArt.js`, `Placeholder:
chart('x')` in `registry.jsx`, `x: chart('x')` in the export's `PLACEHOLDERS`, and the name
in `CATALOG_ORDER`. The drawing itself is written once.

## State

One `useReducer` in `App.jsx` over `{ doc, selectedId }`. Only `doc` is exported or
saved; `selectedId` is view state.

Actions: `add`, `duplicate`, `delete`, `select`, `setLayout`, `nudge`, `rename`,
`setComment`, `setVariant`, `cycleVariant`, `setDocTitle`, `load`, `reset`, `undo`,
`redo`, plus the filter and page actions below.

**Pages.** `doc.pages` was always an array but only `pages[0]` was ever used; it now holds
many. `activePageId` is view state on the reducer (like `selectedId`), not part of the
saved document — a reload always opens on the first page. Every component action targets
the active page via `activePage(state)` / `replaceComponents(doc, pageId, components)`.
Page actions: `addPage`, `selectPage` (view-only, not history, like `select`),
`renamePage` (coalesces), `deletePage` (never removes the last page; moves to a neighbour
if the active one goes). `validPageId` keeps `activePageId` pointing at a real page after
undo, redo, import or reset. Dashboard filters stay document-level, shared across pages.

The HTML export renders every page. One page looks exactly as before; two or more get a
tab strip whose switching is driven by a small **navigation-only** inline script (the one
script in the file), so the viewport does not jump the way a CSS `:target` anchor makes it.
The export stays read-only — the script only toggles a visibility class, nothing editable.
The same script also drives the inner tabs of a Tabs container, scoped to each container's
own `.tabs-ph` so one container's tabs never switch another's. The export **compacts each
grid vertically** (`compactVertical` in `htmlExport.js`) the way react-grid-layout does on
screen, so a gap left in the stored `y` by a delete-after-duplicate does not show as an
empty band in the file.

## Tabs containers (nested grids)

A Tabs component (`type: 'tabs'`) holds `tabs: [{ id, name, components: [] }]`. Each child
is an ordinary component with its own layout in the tab's own 12-column grid, and it renders
with the same full `<Card>` the page uses — title, type, duplicate, delete, description.
`TabsBody.jsx` is the container's body: an inner tab strip over a **nested
`react-grid-layout`** for the active tab. Inner active-tab is view state (`activeTabs`, a
`{ containerId: tabId }` map on the reducer), not saved.

Component ids are globally unique, so `updateInList` / `removeInList` / `findInList` in
`document.js` locate a component by id whether it is on the page or one tab deep — that is
why `rename`, `setComment` and `delete` need no container argument. `add`, `setLayout` and
`duplicate` do take a `container: { containerId, tabId }` (add and layout write into a
specific tab; duplicate is nested-aware and deep-clones a Tabs container's `tabs` so a copy
never shares tab objects with its source). Tab actions: `addTab`, `selectTab` (view-only,
not history), `renameTab` (coalesces), `deleteTab` (keeps at least one tab).

**The outer/inner drag conflict** is resolved with two different cancel selectors, not
event plumbing:

- The **outer** page grid (`Canvas.jsx`) cancels on `.no-drag, [data-tabs-content]`. The
  tab body carries `data-tabs-content`, so dragging anywhere inside a tab never drags the
  container — the container is moved by its header, resized by its corner.
- The **nested** grid cancels on plain `.no-drag`, which is exactly the class `Card` puts
  on its own title, description and buttons — so those still cancel a child drag and stay
  typeable. The tab body must therefore **not** be `.no-drag` itself, or the nested grid
  would refuse to drag its own children (every child is inside it).

A child click selects the child, not the container: `Card`'s select handler ignores
mousedowns that land in `[data-tabs-content]`, and the child's own `<Card>` selects itself.
The select is deliberately **not** `stopPropagation`'d, because the nested grid starts its
drag from the same mousedown and would otherwise never see it.

HTML export (`htmlExport.js`) is a pure `doc -> string` function plus a browser download
wrapper, so it is Node-testable. The output is one self-contained file — all CSS inline,
no React, no Tailwind, no external URLs, no `<script>` — and deliberately read-only: no
button, input, select, textarea, contenteditable or draggable. All user text is escaped.
The same 12-col / 40px / 12px-gap geometry is reproduced with CSS grid so the export
matches the canvas.

## Placeholder art is shared (2026-08-16)

Every chart placeholder used to be written twice — JSX in `registry.jsx`, an HTML string in
`htmlExport.js` — and the two had already drifted (the donut's dash gaps were rounded on one
side and not the other). `src/components/placeholderArt.js` now holds the single description
and each side renders it:

- a drawing is `{ viewBox, stretch, shapes }`; a shape is `[tag, attrs]`, or
  `[tag, attrs, children]` for a group;
- attribute names are written the way **JSX** needs them (`strokeWidth`), and the export
  hyphenates them on the way out (`stroke-width`) — one mechanical rule, not two lists;
- `stretch: true` emits `preserveAspectRatio="none"`. On for everything but the donut.

`SvgArt` in `registry.jsx` renders to React elements; `artToHtml` in `htmlExport.js` renders
to a string. Change a drawing in one place and both follow.

## Chart variants (2026-08-16)

A component carries an optional `variant` — `{ type: 'bar', variant: 'horizontal' }`. This
is spec data, not decoration: horizontal says the categories have long names and the point
is the ranking; stacked says composition. The HTML export spells it out ("Bar (horizontal)")
because there the silhouette is all a reader has.

`VARIANTS` in `placeholderArt.js` lists only the types that have a choice; everything else
keeps its single `ART` entry and gains no ceremony. Three rules make old documents safe:

- the **first entry is the default, and is the same drawing the type always had**;
- `artFor(type, variant)` falls back to that default for a missing type, a missing
  `variant`, or an id this build does not know (a file from a later version);
- `variantLabel` returns null for the default, so an untouched bar still reads "Bar"
  rather than gaining a "(vertical)" suffix.

Verified by rendering a variant-free document before and after the change: byte-identical
on both the canvas and the export.

Switching happens in the card header (`TypeBadge.jsx`), never on the card edges — the card
*is* the drag handle, so an edge button sits exactly where you grab to move or resize.
`[` and `]` cycle the selected card, and the reducer resolves current-to-next itself
because the selection may be a card nested inside a Tabs container.

**Trap — the variant menu must be a portal.** `react-grid-layout` runs with
`useCSSTransforms` (its default), so every card carries a CSS `transform`. A transformed
ancestor becomes the containing block for `position: fixed`, so a fixed menu inside a card
anchors to the *card* rather than the viewport — and the card is `overflow-hidden` on top
of that. `createPortal` to `document.body` escapes both. This fails silently, by rendering
the menu in the wrong place, not by erroring.

**And the portal brings a second trap with it.** A portal escapes the DOM but *not* the
React tree — events raised inside it still bubble to `Card` and `Canvas` as though the menu
sat inside the card. `Canvas` decides a click means "empty canvas, open the quick picker"
when the target is not inside a `.react-grid-item` (`Canvas.jsx:59`), and a portaled menu
never is, so picking a variant also opened the add-component menu. The portal's contents
therefore stop `click` and `mousedown` at their own boundary. Any future portal rendered
from inside a card needs the same guard.

A variant never changes `defaultSize`. Switching one must not resize the card, or the
neighbours get shoved around under the user.

**Still deliberately separate:** the placeholders that are boxes rather than drawings — KPI,
table, pivot, text, tabs, section — and the filter controls. Their markup is Tailwind on the
canvas and hand-written CSS in the export, because the exported file ships no Tailwind. Only
their numbers and labels are shared (`TABLE`, `PIVOT`, `TEXT_LINES`, `KPI_TEXT`), so a column
count or a label still cannot drift; the markup itself has to be changed in both.

The refactor was verified by rendering every placeholder both ways before and after and
diffing. Two intended differences, both proven inert: the canvas's three donut dash gaps are
now rounded (`62.206999999999994` → `62.21`, 0.003 units on a 113-unit circumference), and the
export's box plot gained three attribute-less `<g>` wrappers that the canvas always had.

Global filters live on `doc.filters` (`[{ id, label, type }]`), not on components.
Reducer actions: `addFilter`, `renameFilter` (coalesces), `setFilterType`, `removeFilter`,
`moveFilter` (reorder, drives buttons and Alt+↑/↓). All undoable. Drag-and-drop reorder
was built and removed — native HTML5 DnD felt laggy in a narrow rail and no amount of
memoising the rows fixed the browser's own drag latency.

`add` takes an optional `at: {x, y}` grid cell, which is what the quick picker passes;
`x` is clamped so a wide component clicked near the right edge slides left to fit rather
than hanging off the grid. Without a cell — the toolbar buttons and the number keys —
the component takes the first gap it fits in, scanning left to right then down. That is
what lets four presses of `1` build a KPI row instead of four rows that each need
dragging into place, and it means a card added after a deletion reuses the hole.

`duplicate` places the copy directly under its source and pushes anything in those
columns down by the copy's height. Do not delegate that to the grid: left to resolve
the overlap itself, react-grid-layout sends the copy to the bottom of the page, far
from what you were looking at. The copy's `spec` is `structuredClone`d — sharing that
object would mean editing one card's metric silently changed its twin's in phase 3.

`reducer` handles only `undo` and `redo`; everything else runs through `applyAction`
and is then recorded by `record`. That split is deliberate — no individual action has
to remember to maintain history, so a new action cannot forget to.

History rules, all of which exist because the naive version is annoying to use:

- **Bursts collapse.** Consecutive `rename` / `setComment` / `setDocTitle` / `nudge` /
  `cycleVariant` on the same target within 800ms are one entry. Typing a description is
  one undo, not one per character, and cycling through four variants is one undo, not four.
- **No-ops are not recorded.** `setLayout` where nothing moved (a click that begins a
  drag and goes nowhere) and `nudge` against the canvas edge return the previous state
  unchanged. Otherwise undo appears to do nothing.
- **`select` is not history.** Only document changes are.
- **`load` and `reset` are history**, so an accidental Import or New is recoverable.
- Cap 100 entries. You cannot undo past the start of a session; a restored autosave is
  the floor.

The reducer is a pure function, so its behaviour is testable in Node without a browser —
`npx vite-node` a script that drives it and asserts on the result. That is how the
history rules above were checked.

Autosave writes the whole document to `localStorage` under `fastdash:document:v1`,
inside `requestIdleCallback`. A corrupt saved value must never block startup — the
bootstrap falls back to an empty document.

## Keyboard

`1`–`5` add a component · arrows move the selected card one cell · `[` / `]` step it
through the ways its chart can be drawn · `Delete` / `Backspace` removes it · `Esc`
deselects. Shortcuts are ignored while a text field has focus.

`⌘D` duplicates the selected card. `⌘Z` undo, `⇧⌘Z` or `Ctrl+Y` redo. These fire even
while a text field has focus — the title and description are controlled inputs where
the browser's native undo cannot restore anything, and intercepting `⌘D` stops the
browser opening its bookmark dialog.

While the quick picker is open it owns the keyboard — the global handler bails out
early — otherwise `1`–`5` would both pick from the menu and add a second component.

The canvas wrapper carries `min-h-[70vh]` and `pb-40`. Both exist so there is always
somewhere to click: the minimum height covers an empty canvas, the padding survives
however tall the grid grows. Delete either and a full dashboard has no empty space left
to summon the picker from.

**Focus is manual here.** Suppressing text selection means calling `preventDefault` on
mousedown, which also suppresses the browser's focus change — so a title or description
field keeps focus forever and swallows every shortcut, and arrow keys scroll the page
instead of moving a card. Clicking a card, clicking empty canvas and pressing `Esc` all
call `blur()` explicitly to compensate. Anything new that suppresses a mousedown default
has to do the same.

---

## Traps in react-grid-layout v2

Version 2 is a TypeScript rewrite with a different API from every tutorial online.
All five of these cost real time; none of them fail loudly.

### 1. `process.env` kills all dragging and resizing

`react-draggable` — used internally for both drag and resize — contains:

```js
function log(...args) {
  if (process.env.DRAGGABLE_DEBUG) console.log(...args);
}
```

`log()` runs on mousedown. A browser has no `process`, so it throws `ReferenceError`
before any callback fires. Symptom: cards render and look fine, but drag and resize do
nothing at all, with no visible error unless the console is open. Upstream issue
[#2266](https://github.com/react-grid-layout/react-grid-layout/issues/2266).

Fix: a `process` stub in `index.html`, before any module loads. `define` in
`vite.config.js` was tried first — it fixes the production build but not dev, because
Vite pre-bundles dependencies separately, and `optimizeDeps.rolldownOptions` rejects
`define`.

### 2. Settings moved into config objects

`cols`, `rowHeight`, `margin`, `containerPadding`, `draggableCancel`, `resizeHandles`
are no longer top-level props. They live in `gridConfig`, `dragConfig`, `resizeConfig`.
Passed at the top level they are silently ignored and you get the defaults — including
`rowHeight: 150`, which makes every card about 2.5× too tall.

### 3. Those config objects must be module constants

The library memoises its item rendering on the identity of `gridConfig` / `dragConfig` /
`resizeConfig`. An inline `{...}` is a new object every render, so every card is rebuilt
on every keystroke and every drag update. This is what made the canvas feel sluggish.
Same reasoning for `React.memo` on `Card`, which is why `Card` takes `dispatch` rather
than four inline callback props.

### 4. Vertical compaction is load-bearing — and it is a package deal

The grid runs the default vertical compactor. It is what keeps cards from overlapping
and what makes the canvas rearrange itself when you move something. It also pulls every
card up to the first free row, which means **arrow-key nudges into empty space appear to
do nothing**: the move is applied, then immediately undone by compaction.

Switching to `noCompactor` was tried and reverted (2026-07-26). It does fix the arrows
and allows deliberate whitespace, but it removes auto-rearrangement, and every code path
that writes positions directly then has to do its own collision work — nudge, duplicate,
quick-picker placement. Ivan judged the result worse.

So: the arrow limitation and auto-rearranging are the same mechanism. Any future attempt
has to keep compaction and give the arrows a different meaning — most plausibly swapping
a card with its neighbour rather than moving it one cell. Do not reach for `noCompactor`
again without reading this paragraph first.

### 5. `react-resizable/css/styles.css` is required

Not optional. Without it grid items are not `position: relative`, so the resize handle
anchors to the whole canvas instead of the card corner.

## CSS override order

`index.css` is imported before the library stylesheets, so an equal-strength selector
loses. Every override in `index.css` therefore carries an extra class for specificity
(`.react-grid-layout .react-grid-item…`, or a doubled `.react-grid-layout.react-grid-layout`).
Check overrides in `dist/assets/*.css` after changing them — a rule that lost the
cascade looks identical in the source file.

## Feel

Tuned by hand, and worth re-reading before changing:

- Drop-target ghost: grey, no transition. It is a preview; it should be under the
  cursor immediately.
- Cards being reflowed around a drag: 60ms. **Not zero** — with no transition every
  intermediate position renders raw and the canvas visibly twitches.
- The dragged or resized card itself: untransitioned by the library, tracks the cursor.
- Drag threshold 1px, so a card picks up the instant you move.
- Text selection is suppressed by `preventDefault` on mousedown in the canvas (the
  resize handle is a sibling of the card, so guarding inside `Card` is not enough).
  `user-select` alone does not work: the browser creates the selection anyway and it
  reappears when the drag ends.

## Verify a change

`npm run dev` double-renders everything (StrictMode) and is not representative of
speed. Judge performance on `npm run build && npm run preview`.
