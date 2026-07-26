# ROADMAP

Phases gate on **usability milestones, not feature counts**. Do not start a phase until
the previous gate is genuinely met — "mostly" doesn't count.

---

## Phase 0 — validate before building

Run a session with a real colleague using Excalidraw or paper. If sketching boxes together
doesn't visibly improve her dashboard, the tool won't either.

**Gate:** the paper session produced a better dashboard than the prose spec did.

*Cheapest possible test of the core premise. If you skip this, note that you skipped it —
you're carrying the risk forward, not eliminating it.*

---

## Phase 1 — skeleton

Canvas with grid. Five components: KPI, line, bar, table, text. Place, move, resize,
delete. JSON export and import.

**Gate:** you can mock a real dashboard in under 10 minutes.

---

## Phase 2 — speed layer

Click-to-place quick picker (5 most common components). Keyboard shortcuts. Undo/redo.
Duplicate. Three or four starter templates.

**Gate:** someone who has never seen the tool is productive within 60 seconds, with no
instruction from you.

---

## Phase 3 — the spec layer

Per-component metadata (metric, dimension, granularity, aggregation, filters, source,
refresh) plus comments. HTML and PDF export.

**Gate:** a BI developer reads the exported JSON and says "I could build this."

**This phase is the whole differentiator. Do not let it slip behind fidelity work.**

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
