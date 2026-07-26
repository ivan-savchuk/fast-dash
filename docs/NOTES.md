# BUILD NOTES

What is actually in the code, and the traps that cost time. `SPEC.md` says what the
tool should be; this says how it currently is.

Status: **Phase 1 complete.** Phase 2 (speed layer) and Phase 3 (spec layer) not started.

---

## File map

| File | Job |
|---|---|
| `src/state/document.js` | The document object, the reducer, grid geometry constants |
| `src/components/registry.jsx` | One entry per component type: label, default size, shortcut key, placeholder SVG |
| `src/components/Canvas.jsx` | `react-grid-layout` wiring |
| `src/components/Card.jsx` | Card chrome: header, title, type label, delete, description |
| `src/components/Toolbar.jsx` | Dashboard title, add buttons, export / import / new |
| `src/io/documentFile.js` | JSON download and file read, with validation |
| `src/App.jsx` | Reducer wiring, autosave, keyboard shortcuts |

Adding a sixth component type is one entry in `registry.jsx` and nothing else.

## State

One `useReducer` in `App.jsx` over `{ doc, selectedId }`. Only `doc` is exported or
saved; `selectedId` is view state.

Actions: `add`, `duplicate`, `delete`, `select`, `setLayout`, `nudge`, `rename`,
`setComment`, `setDocTitle`, `load`, `reset`, `undo`, `redo`.

`duplicate` places the copy directly under its source and pushes anything in those
columns down by the copy's height. Do not delegate that to the grid: left to resolve
the overlap itself, react-grid-layout sends the copy to the bottom of the page, far
from what you were looking at. The copy's `spec` is `structuredClone`d — sharing that
object would mean editing one card's metric silently changed its twin's in phase 3.

`reducer` handles only `undo` and `redo`; everything else runs through `applyAction`
and is then recorded by `record`. That split is deliberate — no individual action has
to remember to maintain history, so a new action cannot forget to.

History rules, all of which exist because the naive version is annoying to use:

- **Bursts collapse.** Consecutive `rename` / `setComment` / `setDocTitle` / `nudge` on
  the same target within 800ms are one entry. Typing a description is one undo, not one
  per character.
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

`1`–`5` add a component · arrows move the selected card one cell · `Delete` /
`Backspace` removes it · `Esc` deselects. Shortcuts are ignored while a text field has
focus.

`⌘D` duplicates the selected card. `⌘Z` undo, `⇧⌘Z` or `Ctrl+Y` redo. These fire even
while a text field has focus — the title and description are controlled inputs where
the browser's native undo cannot restore anything, and intercepting `⌘D` stops the
browser opening its bookmark dialog.

**Focus is manual here.** Suppressing text selection means calling `preventDefault` on
mousedown, which also suppresses the browser's focus change — so a title or description
field keeps focus forever and swallows every shortcut, and arrow keys scroll the page
instead of moving a card. Clicking a card, clicking empty canvas and pressing `Esc` all
call `blur()` explicitly to compensate. Anything new that suppresses a mousedown default
has to do the same.

---

## Traps in react-grid-layout v2

Version 2 is a TypeScript rewrite with a different API from every tutorial online.
All four of these cost real time; none of them fail loudly.

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

### 4. `react-resizable/css/styles.css` is required

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
