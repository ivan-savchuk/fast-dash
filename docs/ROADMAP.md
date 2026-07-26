# ROADMAP

Phases gate on **usability milestones, not feature counts**. Do not start a phase until
the previous gate is genuinely met — "mostly" doesn't count.

---

## Phase 0 — validate before building

Run a session with a real colleague using Excalidraw or paper. If sketching boxes together
doesn't visibly improve her dashboard, the tool won't either.

**Gate:** the paper session produced a better dashboard than the prose spec did.

**MET** (2026-07-26, Ivan's call). The core premise is treated as validated — sketching
boxes together does improve the result.

*Cheapest possible test of the core premise. If you skip this, note that you skipped it —
you're carrying the risk forward, not eliminating it.*

---

## Phase 1 — skeleton

Canvas with grid. Five components: KPI, line, bar, table, text. Place, move, resize,
delete. JSON export and import.

**Gate:** you can mock a real dashboard in under 10 minutes.

**MET** (2026-07-26). Composed a real one-page dashboard; Ivan's words were "blazingly
fast". Shipped: 12-column canvas, five component types, place / move / resize / delete /
rename, per-card description, JSON export and import, localStorage autosave, keyboard
shortcuts. See `docs/NOTES.md`.

---

## Phase 2 — speed layer

Click-to-place quick picker (5 most common components). Keyboard shortcuts. Undo/redo.
Duplicate. Three or four starter templates.

Basic shortcuts already landed in Phase 1: `1`–`5` add, arrows move, `Delete` removes,
`Esc` deselects. Remaining, in the order they are worth doing:

1. ~~**Undo/redo**~~ — **done** (2026-07-26). History of past documents, with bursts of
   typing collapsed into one step and no-ops excluded. See `docs/NOTES.md`.
2. ~~**Duplicate** (`Cmd+D`)~~ — **done** (2026-07-26). Copy lands directly below its
   source, carrying type, size, title and description; cards in the way are pushed
   down rather than the copy being sent to the bottom of the page.
3. ~~**Quick picker**~~ — **done** (2026-07-26). Click empty canvas, choose a type at
   the cursor, and the component lands on the cell you clicked. Mouse, `1`–`5`, or
   arrows plus Enter.
4. ~~**Starter templates**~~ — **done** (2026-07-26). Three: executive overview,
   operational monitor, analysis deep dive. Every component ships with a written
   description, so the templates also demonstrate what a useful spec note looks like.

**Gate:** someone who has never seen the tool is productive within 60 seconds, with no
instruction from you.

**MET** (2026-07-26, Ivan's call) — on his own use, not an observed session with a
newcomer. The unprompted 60-second test was not run, so the risk it was meant to catch is
carried forward rather than eliminated: the things a first-time user trips over are still
unknown. Worth running opportunistically during the Phase 5 pilot.

---

## Phase 3 — the spec layer — *current*

Per-component metadata (metric, dimension, granularity, aggregation, filters, source,
refresh) plus comments. HTML and PDF export.

Comments landed in Phase 1 as the per-card description. The `spec: {}` key has been
written into every component since then, so filling it in is not a schema change.

Order of work, one per session:

1. **Inspector panel** — a right-hand rail holding the spec fields for the selected
   component. The card is too small to hold them and cramming them in would wreck the
   canvas, which is the thing that already works. Dropdowns where a vocabulary exists,
   free text elsewhere; see the table in `SPEC.md`. Everything goes through the reducer,
   so it is undoable, and text edits coalesce the way titles and descriptions already do.
2. **Unfilled-spec affordance** — a quiet marker on cards with no metric, and a count in
   the toolbar. Without it nobody notices a half-specified dashboard until the BI
   developer does, which is exactly the gate.
3. **HTML export** — one self-contained file: the layout, then a spec table per
   component. This is the artefact you actually send to someone.
4. **Print stylesheet** — `window.print()`. No PDF library.

**Gate:** a BI developer reads the exported JSON and says "I could build this."

Judge it on a *real* dashboard someone asked for, not a demo, and let the developer read
it without narration — the moment it needs explaining, it has failed.

**This phase is the whole differentiator. Do not let it slip behind fidelity work.**

Deferred until the fields have been used in anger, because guessing now is how the spec
layer becomes a form nobody fills in:

- Dashboard-level defaults for source and refresh, inherited by components. Obvious
  duplication to remove, but only once we know whether they really are the same across a
  page.
- Per-type field sets (a KPI has no granularity; a table has no aggregation). Cheap to
  add later, and hiding fields too early hides the vocabulary.

---

## Phase 4 — fidelity and breadth

Tier 2 components. Superset-style chrome. Interaction annotations. Component count warning.

**Gate:** only start after Phase 3 has been used in a real meeting with a real stakeholder.

---

## Phase 5 — rollout

Pilot with two or three departments. Weekly feedback. Then internal announcement.
Ship as a static build on an internal host or GitHub Pages.

---

## Risks priced in now

**Phase 4 will try to jump the queue.** Adding chart types is fun and feels like progress.
It isn't the value. Hold the gate.

**Success has a cost.** If this catches on across departments, you become the owner of an
internal tool — feature requests, bug reports, "can it export to Power BI." Decide in
advance whether you want that. Consider open-sourcing internally so you aren't a single
point of failure.

**The competition is PowerPoint, not Mokkup.** People already mock dashboards in slides.
This has to be faster than that from the very first click, or they go back.
