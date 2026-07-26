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

Actions: `add`, `delete`, `select`, `setLayout`, `nudge`, `rename`, `setComment`,
`setDocTitle`, `load`, `reset`. No component mutates state directly, so undo/redo in
Phase 2 is "keep a list of previous `doc` values" and nothing more.

Autosave writes the whole document to `localStorage` under `fastdash:document:v1`,
inside `requestIdleCallback`. A corrupt saved value must never block startup — the
bootstrap falls back to an empty document.

## Keyboard

`1`–`5` add a component · arrows move the selected card one cell · `Delete` /
`Backspace` removes it · `Esc` deselects. Shortcuts are ignored while a text field has
focus.

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
