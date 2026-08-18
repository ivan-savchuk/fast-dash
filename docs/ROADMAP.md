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

   Keyboard nudge of a nested child was left out here and **done later** (2026-08-18) —
   arrows were silently dead inside a tab, which is a hole in the keyboard-first principle
   rather than a missing feature. Still not done: tabs-inside-tabs (the picker excludes
   `tabs` when adding into a tab; the helpers assume one level).

6. ~~**Section header (Tier 3 chrome)**~~ — **done** (2026-08-02). A catalog-only type: a
   full-width, short labelled band (its title is the label) to group a page into zones.
   Renders as a compact band with no chart body or description — flat border like every
   other card.

7. ~~**Tier 2 chart catalog**~~ — **done** (2026-08-02). Added as grayscale placeholders in
   small batches, each mirrored in the HTML export: Combo (bar + line), Scatter, Funnel,
   Waterfall, Histogram, Box plot, Heatmap, Map (choropleth), Map (point). (Pivot shipped
   here too, and was removed again in item 11.)

Scope was narrowed in use (owner calls, 2026-08-02): **Tier 3 chrome stops at the section
header** — the rest (header-bar timestamp, breadcrumbs, legends/axis labels) was judged
mostly cosmetic and against the anti-fidelity principle, so it was skipped. **Dropped from
Tier 2**: Bubble, gauge / progress bar / bullet, calendar heatmap, treemap. **Filters as
placeable canvas components** (the last Tier 1 remnant) was skipped — the filter rail
already covers filters. All of these remain cheap to add later (one registry entry plus an
export mirror) if a real user asks.

8. ~~**De-duplicate the placeholder art**~~ — **done** (2026-08-16). Every chart drawing was
   written twice, once as JSX and once as an HTML string, and had begun to drift. Both now
   render from one description in `src/components/placeholderArt.js`. Behaviour-preserving:
   verified by diffing every placeholder rendered both ways, before against after. See
   `docs/NOTES.md`.

Two items were cut here rather than built (2026-08-16, Ivan's call):

- **Interaction annotations** (draw.io-style arrows for cross-filter and drill-down) —
  **dropped**. Three or four sessions of work, and it turns the canvas from a grid of boxes
  into a diagram, which invites exactly the fiddling the tool exists to prevent. Speed is
  the product. Interactions can still be written in a card's description.
- **Component-count warning** — **dropped**. The anti-sprawl line is held by the tool being
  opinionated about layout, not by a counter scolding you past eight panels.

9. **Chart variants** — *in progress* (started 2026-08-16). A chart type can be drawn more
   than one way, and which way is a requirement rather than decoration, so a component
   carries an optional `variant` that the JSON and HTML exports both name. Six types earn
   variants; the rest would only get decoration.

   - **Bar** — vertical, horizontal, stacked, grouped. **Done** (2026-08-16), together with
     the machinery: `VARIANTS` in `placeholderArt.js`, `setVariant` / `cycleVariant`, the
     `TypeBadge` menu in the card header, and `[` / `]`.
   - **KPI** — with delta (default), with trend, number only. **Done** (2026-08-16). The
     first variant that is not a drawing: a KPI is text and layout, so the variant says
     which pieces are present rather than which silhouette to draw, and `VARIANTS` entries
     now carry either `art` or `parts`.

     The default was moved from *with trend* to *with delta* (Ivan's call) — the sparkline
     is the exception you ask for, not what every KPI starts as. Because the default is
     also the fallback for a component with no `variant`, **KPI cards in documents written
     before variants existed, and in all three templates, no longer show a sparkline.**
     That is the intended meaning of changing a default, not a regression; verified as the
     only difference, with everything else byte-identical.
   - **Time series** — line (default), area, stacked area. **Done** (2026-08-16). Line is
     the trend, area adds magnitude, stacked area says composition over time. The stacked
     variant carries its own sample points: stacking the line chart's two series would put
     the total well outside the viewBox.
   - **Scatter** — plain (default), with trend line, bubble. **Done** (2026-08-16). The
     trend line is a least-squares fit computed from the points rather than drawn by eye,
     so it follows the cloud and keeps following it if the points change. Bubble uses a
     thinned set of marks — eighteen sized ones overlap into a blob at card size — and
     brings back the bubble chart that was cut from Tier 2, as a variant rather than a
     new type.
   - **Pie** — donut (default), full circle. **Done** (2026-08-16). Same dash-offset trick
     as the donut with the stroke made twice the radius, so the ring closes over the
     middle. Its numbers are written out rather than derived from the donut's, so the
     donut still renders byte-for-byte what it always did; the harness checks that both
     agree on the 45/35/20 split.
   - **Heatmap** — grid (default), calendar. **Done** (2026-08-16). Grid asks which pair of
     dimensions is hot; calendar asks when it happened. Brings back the calendar heatmap
     cut from Tier 2, as a variant rather than a new type.

   **All six types now have variants — this item is complete.**

   Switching lives in the card header, not on carousel arrows at the card edges (owner's
   first proposal). The card itself is the drag handle, so an edge button would sit exactly
   where you grab to move or resize; the header is where Superset keeps the viz type, is
   already outside the drag path, and can show which variant is current instead of making
   you cycle blind to find out.

   Not done deliberately: variants are not searchable in the quick picker (adding a bar and
   then switching is two steps; making search match variant names would cut it to one), and
   a variant never changes `defaultSize` — resizing on switch would shove the neighbours
   around under the user.

10. **Table columns** — *in progress* (started 2026-08-17). A table's columns are its
    structure, so they are named on the card rather than described in prose:
    `spec.columns` holds `{ name, role, format }`, edited in a popover from the card
    header, and both exports carry it. This is the Phase 3 per-component metadata
    returning under the two conditions its post-mortem set — see `SPEC.md`.

    Values deliberately stay grey bars; a format sample carries what a fake row would
    without the card pretending to hold data (Ivan's original suggestion was mock data,
    changed after discussion).

11. **Pivot — removed** (2026-08-17, Ivan's call: *"we just can't do this"*). The type is
    gone from the catalog entirely: registry entry, `CATALOG_ORDER`, the export placeholder
    and its CSS, the `PIVOT` constants.

    It got four goes at a layout and none landed. The pattern in the failures is the part
    worth keeping, because it is a warning about this whole class of card:

    - repeated the measure names under every column — "clumsy… hard to say what value this
      mock brings";
    - named each axis once instead — "even more confusing";
    - copied Superset's renderer, but crushed the column dimensions into one
      `a › b › c` label and hardcoded the column count so adding a dimension changed
      nothing;
    - one band per dimension, then a bordered matrix with an axis-name gutter — still not
      it.

    The honest read: a pivot is the one BI object whose **whole meaning is its data
    shape**, and a grayscale mock has no data. Every version either invented data (fake
    value columns) or dropped so much that the card said nothing a Table could not. The
    other twenty types work because a silhouette or a column list carries their structure;
    a pivot's does not.

    Mock a crosstab as a **Table** card until there is a better idea. Any saved dashboard
    holding a pivot renders as a labelled "unknown component type" box — it imports and
    exports fine, it just has no drawing.

12. **Colour schemes** — **done** (2026-08-17). Four global schemes on the document
    (`doc.theme`): neutral, **Blue Rei**, **Green Matrix**, **Red Rose**. Picked from the
    Options menu, carried by the JSON, rendered by the HTML export.

    **This is the one deliberate exception to design principle #1**, and it was argued
    before it was built rather than slipped in. The principle exists to stop people arguing
    about colour chart by chart; a single global accent with no per-card control cannot
    produce that argument. What keeps it honest is that the split is **by role**, and it is
    enforced by tests: every mark standing for a value takes a step of a six-step ramp, in
    every chart, while axes, baselines and gridlines stay grey. The heatmap uses the whole
    ramp as a gradient, which is what a magnitude scale is supposed to be. Table and text
    stay grey — they are not charts. Chrome gets the accent in three places: the card
    selection ring and the two kinds of active tab.

    Shipped first as a single accent on each chart's primary mark, then widened to the full
    ramp across every chart at Ivan's request. Step 5 of each ramp is pinned to the original
    accent, so widening it changed nothing that was already coloured.

    Accents and ramps were computed rather than eyeballed — contrast-checked against both
    surfaces, monotonic in lightness — which is why Matrix green is the dark phosphor and
    not `#00ff41`. See `NOTES.md` for the mechanism and the fallback trap.

13. **Scatter redesign** — **done** (2026-08-17), from a seaborn `lmplot` Ivan supplied as
    reference. Three changes, in order of how much they matter:

    - **A confidence band** around the fit on the trend variant. This is the signature of
      the reference and the thing that says "regression" rather than "a line through some
      dots". Its shape is computed from the residual spread, so it has the real hourglass
      waist at the mean of x and flares at the extremes — a plain wedge would be a lie
      about the shape, and the waist is the part people recognise.
    - **A denser cloud**: 18 points to 46, generated from a seeded draw against a slope and
      then written out so it never moves again.
    - **Bigger, semi-transparent dots** (r 0.9 → 1.3, opacity 0.6 → 0.5) so overlaps darken
      and the cloud reads as density rather than as scattered specks.

    The fit line is solid now rather than dashed, matching the reference — the band already
    says it is a fit. Existing dashboards with a scatter card will look different; that was
    the point of the request.

14. **Map cards get a drawn basemap** — **done** (2026-08-17). Both map types sit on a
    basemap drawn as SVG, and the point map's markers are round at any card shape.

    A real CARTO tile was built first and then removed. It was blurry (a 256px raster blown
    up to a full-width card, with enormous country labels), it carried an attribution
    obligation on every card that Ivan did not want on screen, and it cost ~19KB in the
    bundle and again in every export holding a map. **The credit line could not simply be
    deleted while still shipping their tiles** — that is the licence, not a preference — so
    the tile went instead.

    Drawing it turned out better on every axis: sharp at any size, no bytes, no credit owed,
    and the land shapes double as the choropleth's regions, which finally makes every shade
    land on land instead of straddling a coastline.

    Maps also stopped stretching. They scale uniformly and crop (`xMidYMid slice`), which
    both reads right and means a `<circle>` stays a circle, so the markers need no tricks.

Also still open: a refinement pass over the chart placeholders, which were added
breadth-first and are internally inconsistent — inconsistent baseline strokes, gridlines on
the time series only, and `preserveAspectRatio="none"` applied to charts whose shape it
distorts. Now a one-file change each. **Dark mode is explicitly not part of it** — judged
good as it stands (2026-08-16).

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
