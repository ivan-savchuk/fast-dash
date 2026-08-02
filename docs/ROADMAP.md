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

Order of work:

1. ~~**Per-component inspector**~~ — built, then **discarded** (2026-07-29) before
   commit. It ate the canvas and forced one-metric-one-dimension, which is wrong for
   tables and combo charts. Parked, not cancelled; see `SPEC.md`.
2. ~~**Global filter rail**~~ — **done** (2026-07-29). Collapsible left rail of
   dashboard-level filters (label + Superset-native type), stored on the document and
   exported. Reorder by buttons or Alt+↑/↓. Templates ship with filters.
3. ~~**HTML export**~~ — **done** (2026-07-29). One self-contained, read-only file: the
   filter rail and the card grid, with each component's title and description. No build
   controls of any kind. This is the artefact you hand over.

Cut from the phase (2026-07-29, Ivan's call):

- **PDF / print stylesheet** — dropped. HTML is good enough to hand over; anyone who
  needs paper can print the page from the browser. Not worth a print stylesheet of our own.
- **Per-component metadata, take two** — dropped. The per-card inspector was already
  discarded once this phase; rebuilding a multi-metric version now is overkill. The
  `spec: {}` key stays on components so a future phase can still pick it up, but it is
  not Phase 3 work.

**Gate:** a BI developer reads the export and says "I could build this" — now judged on
the **HTML** export carrying titles, descriptions and the global filters, since
per-component metadata is out of scope.

**MET** (2026-08-01, Ivan's call). Everything in Phase 3 is built and the phase is closed
by owner decision. As with the Phase 2 and Phase 3-earlier gates, the unprompted test — a
real BI developer reading a real dashboard's HTML export without narration — was **not**
run, so the risk it was meant to catch is carried forward, not eliminated. Worth running
opportunistically during the Phase 5 pilot.

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

## Phase 4 — fidelity and breadth — *current*

Tier 2 components. Superset-style chrome. Interaction annotations. Component count warning.

Also completes the Tier 1 set left unbuilt since Phase 1: pie/donut and tabs/pages
(filter controls exist only as the global rail, not as placeable components).

**Gate:** only start after Phase 3 has been used in a real meeting with a real stakeholder.
Started 2026-08-01 by owner decision; the real-meeting test was not run first, so that
risk is carried forward.

Scope note: this is ~25 component types plus chrome. One component (or one chrome piece)
per session, as always — not a single mass-add. Two prerequisites before mass-adding
types: (1) the number-key model `1`–`5` cannot address 25 types, so the QuickPicker needs
categories or type-to-filter search; (2) hold the anti-sprawl line — more types tempt
cramming, which is the failure the tool exists to prevent (principle #1).

Shipped so far in Phase 4:

1. ~~**Searchable quick picker**~~ — **done** (2026-08-01). The popular five keep their
   number keys and toolbar buttons; everything else is search-only, reached by typing in
   the picker. `TYPE_ORDER` (keyed five) and `CATALOG_ORDER` (full list) in `registry.jsx`.
2. ~~**Pie/Donut**~~ — **done** (2026-08-01). First catalog-only type.
3. ~~**Multi-page dashboards**~~ — **done** (2026-08-01). Top-level page tabs (Superset's
   convention). `activePageId` is reducer view state; filters stay document-level. HTML
   export renders every page, switchable by a navigation-only inline script.
4. ~~**Tabs element, placeholder**~~ — **done** (2026-08-01). A catalog-only card: label
   strip over an empty region. Intentionally a placeholder — the next item makes it real.

5. ~~**Real nested Tabs (place charts inside a tab)**~~ — **done** (2026-08-02). Owner chose
   a nested grid per tab over a simple list. Planned as 4a/4b/4c and shipped together once
   each part was tested in the browser:

   - **4a** — data model + nested render + place-into-tab. The Tabs card carries
     `tabs: [{ id, name, components: [] }]`; each child is an ordinary component with a
     layout in the tab's own 12-col grid. New actions `addTab` / `selectTab` / `renameTab` /
     `deleteTab`; `add` / `setLayout` gained a `container` target; `delete` / `rename` /
     `setComment` / `duplicate` find a child by id anywhere.
   - **4b** — inner drag / resize. Each tab is a nested `react-grid-layout`, and the children
     are the same full `<Card>` the page uses (title, type, duplicate, delete, description).
     The outer/inner drag conflict is handled by cancel selectors — see `NOTES.md`.
   - **4c** — inner tab switching in the HTML export (a navigation-only script, scoped per
     container), and the export compacts each grid vertically so it matches the canvas.

   Not yet done, deliberately: keyboard nudge of a nested child (arrows are a no-op inside a
   tab for now), and no tabs-inside-tabs (the picker excludes `tabs` when adding into a tab;
   the helpers assume one level).

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
