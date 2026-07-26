# CLAUDE.md

Dashboard prototyping tool — a browser-based sketchpad for laying out BI dashboards
fast, with structured per-component metadata that exports as a real spec.

Read `docs/SPEC.md` before any non-trivial change. Read `docs/ROADMAP.md` before
proposing new features — phase gates are real, not aspirational.

## Working agreement

- I am an analyst (SQL, some Python), **not a JS developer**. Explain what changed and
  why in plain terms. Never leave me with code I can't reason about.
- One feature per session. Implement, I test in the browser, we commit, then next.
- Commit at every working state. If a change makes things worse, we revert, not debug.
- Do not refactor unrelated code while fixing something. Keep diffs small and readable.
- If a request would break a design principle below, say so before writing code.

## Stack (settled — do not substitute)

- Vite + React + Tailwind
- `react-grid-layout` for canvas placement, snapping, collision, resize
- **No backend. Ever.** Static build only.
- **No chart library.** Placeholders are hand-written inline SVG.
- State: a single `useReducer` over one document object
- Persistence: `localStorage` autosave; JSON file for explicit save/load

Adding a dependency requires a reason stated out loud first. Default answer is no.

## Repo state

Phase 1 complete: grid canvas, five component types, place / move / resize / delete /
rename, per-card description, JSON export and import, localStorage autosave, keyboard
shortcuts. Phase 2 and Phase 3 not started.

## Commands

```bash
npm run dev      # local dev server
npm run build    # static production build
npm run preview  # verify the build before shipping — judge speed here, not in dev
npm run lint     # oxlint
```

## Architecture

`docs/NOTES.md` is the file map and the list of `react-grid-layout` v2 traps. **Read it
before touching the canvas** — four of its gotchas fail silently rather than erroring,
and one of them (a `process.env` read inside `react-draggable`) disables all dragging
and resizing with no visible error.

The short version:

- One `useReducer` in `App.jsx` over `{ doc, selectedId }`. Only `doc` is saved or
  exported. Every change is an action, so undo is a list of past `doc` values.
- `src/components/registry.jsx` maps a component type to its label, default size,
  number-key shortcut and placeholder SVG. A new component type is one entry there.
- `react-grid-layout` owns placement; its callbacks feed positions back into the
  reducer, which stays the source of truth.
- Overrides in `src/index.css` need extra specificity — that file is imported before
  the library stylesheets. Verify overrides in `dist/assets/*.css`, not by eye.

## Design principles (these override feature requests)

1. **Structurally faithful, visually neutral.** Real chart silhouettes and real BI chrome,
   but grayscale placeholder data. High visual fidelity invites bikeshedding about colors
   instead of arguments about structure.
2. **Speed is the product.** The competition is PowerPoint. Every interaction is measured
   against "would this have been faster in a slide?"
3. **The JSON export is the differentiator.** It must read as a requirements document a BI
   developer can build from — not a layout file. Never let fidelity work outrank it.
4. **Zero friction to adopt.** No login, no server, no install. A static file needs no
   infosec review.
5. **Keyboard-first.** Anything achievable by dragging should also be achievable without
   touching the mouse.
6. **Undo is non-negotiable.** Every state change goes through the reducer so history
   stays free.

## Reference

Apache Superset is the primary visual reference — flat cards on a grid, header strip,
collapsible filter rail. Borrow Tableau's whitespace discipline; Superset's default
density tempts users to cram, which is the exact failure this tool exists to prevent.

"Match Superset's card header pattern" is a checkable instruction. "Make it look
professional" is not — ask me for a concrete reference instead.

## Explicitly out of scope

Sankey, chord, radar, word cloud, anything 3D. Real data connections. Accounts.
Collaboration/multiplayer. A PDF library (use `window.print()` + a print stylesheet).
