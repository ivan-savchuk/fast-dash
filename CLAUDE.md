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

Pre-Phase 1. No code scaffolded yet — `docs/` and this file only. If `src/` does not
exist, the first task is scaffolding, not editing.

Scaffold:

```bash
npm create vite@latest . -- --template react
npm install -D tailwindcss @tailwindcss/vite
npm install react-grid-layout
```

## Commands

```bash
npm run dev      # local dev server
npm run build    # static production build
npm run preview  # verify the build before shipping
```

## Architecture

Fill in once Phase 1 lands. Must document: the document object shape, the reducer's
action names, and how a component type maps to its SVG placeholder + spec fields.
That mapping is the one thing not readable from a single file.

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
