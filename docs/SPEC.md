# SPEC — Dashboard Prototyping Tool

## Problem

Departments spec dashboards in prose. Prose can't expose layout problems. You only feel
"this is too crowded" or "these three charts answer the same question" when you see boxes
on a canvas. The result is dashboards that get built, then redesigned.

## Solution

A browser app — draw.io for dashboards. Place components on a grid, resize them, attach a
comment and structured metadata to each one, export the result as a machine-readable spec.

## Users

Non-technical stakeholders sketching what they want, usually in a live session with an
analyst. They will not read documentation. They must be productive within 60 seconds.

## Prior art and the gap

Mokkup.ai is closest (drag-drop dashboard wireframing, exports to Tableau/Power BI).
Balsamiq, Figma dashboard kits, PowerMockup and Excalidraw are general-purpose. All are
either heavyweight design tools or SaaS with accounts and pricing.

What this has that they don't:

- Zero friction — no login, one file
- Comment-per-component baked into the data model, not floating sticky notes
- A JSON round-trip that is a genuine machine-readable spec

**Everyone else exports pictures. This exports requirements.**

---

## Component set

### Tier 1 — the 80% (not viable without these)

| Component | Notes |
|---|---|
| KPI card | Big number, delta vs. prior period, optional sparkline. Most-used object in BI. |
| Time series | Line/area, single and multi-series |
| Bar | Vertical, horizontal, grouped, stacked |
| Table / data grid | Sortable columns, totals row |
| Pie / donut | People will demand it regardless of our opinion |
| Filter controls | Dropdown, multi-select, date range, search box, toggle |
| Text block | Headings, markdown notes, annotations |
| Tabs / pages | Dashboards are rarely one screen |

### Tier 2 — professional credibility

Combo chart (bar + line, dual axis) · pivot table / crosstab · scatter & bubble ·
heatmap and calendar heatmap · map (choropleth and point) · gauge, progress bar, bullet ·
funnel · histogram, box plot · treemap · waterfall

Combo charts are extremely common in real BI and rare in mockup tools — good early Tier 2 pick.

### Tier 3 — chrome (underrated, nearly free)

Header bar with title and last-refreshed timestamp · collapsible filter sidebar ·
section containers/groups · legends · axis labels · export/refresh buttons · breadcrumbs.

Static divs, no rendering. This is most of what makes a mockup *feel* like a real BI tool.

### Deliberately excluded

Sankey, chord, radar, word cloud, anything 3D. These signal "I discovered a chart type,"
not "I have a question to answer." Leaving them out is a feature.

---

## The spec layer

This is the differentiator. Each component carries structured fields beyond title and
position:

- **metric / measure**
- **dimension** (breakdown)
- **time granularity**
- **aggregation**
- **filters applied**
- **data source**
- **refresh cadence**
- **free-text comment**

Filled in, the JSON export stops being a layout file and becomes a requirements document.

### Where the spec is captured — the history

A **per-component inspector** was built (2026-07-26) and then discarded (2026-07-29)
before commit. A right-hand rail held metric, dimension, granularity, aggregation,
source, refresh and per-card filters. Two problems killed it:

- It was always open and ate a large slice of the canvas, which is the thing that
  already works.
- One metric / one dimension per card is wrong. A table or a combo chart carries
  several of each, and forcing them into single fields either lies or balloons into a
  form — the opposite of fast dashboard building.

Per-component metadata is **parked**, not cancelled. If it returns it needs a model that
admits multiple metrics and dimensions, and it must not be a permanent panel. The
`spec: {}` key stays on every component so the door is open.

### Global filters — the current model (2026-07-29)

What shipped instead is a **collapsible filter rail** on the left (Superset's
convention), holding the dashboard-level filters. Each filter is a label plus a control
type. They carry no data — the grayscale control under each is a placeholder — but they
live on the document and export, so a BI developer sees which filters the dashboard is
meant to have.

Filter types mirror Superset's native set:

| Type | Placeholder reads as |
|---|---|
| dropdown | single value select |
| multi-select | value select, several chips |
| range | numerical min/max slider |
| date range | time range, from–to |
| time grain | day/week/month selector |
| search | text search box |
| toggle | boolean switch |

Stored as `doc.filters: [{ id, label, type }]`. Reorder by up/down buttons or Alt+↑/↓.
Old files without a `filters` key load as an empty list.

## Draft JSON schema

Proposal — refine in Phase 3, but keep it flat and hand-editable.

```json
{
  "version": 1,
  "title": "Regional Sales Overview",
  "pages": [
    {
      "id": "p1",
      "name": "Overview",
      "components": [
        {
          "id": "c1",
          "type": "kpi",
          "layout": { "x": 0, "y": 0, "w": 3, "h": 2 },
          "title": "Net Revenue",
          "spec": {
            "metric": "net_revenue",
            "dimension": null,
            "granularity": "month",
            "aggregation": "sum",
            "filters": ["region = EMEA"],
            "source": "dwh.fact_sales",
            "refresh": "daily"
          },
          "comment": "Show delta vs. same month last year, not prior month."
        }
      ]
    }
  ]
}
```

Rules: every field optional except `id`, `type`, `layout`. Unknown fields survive a
round-trip. Version the schema from day one.

### Settled in Phase 1

- `layout` is in grid cells, not pixels: **12 columns**, row height **40px**, 12px
  gutters. A card's pixel size is therefore a function of viewport width, and a
  document opens correctly on a different screen.
- Every component is written with `spec: {}` and `comment: ""` present, even when
  empty. Phase 3 fills the `spec` keys; the shape does not change when it does, so an
  export made today round-trips through the final schema.
- `comment` is capped at **280 characters** — a tweet. It is the one-line answer to
  "what question does this card answer?". Longer reasoning belongs in the spec fields,
  not the card, and an uncapped field invites prose that layout cannot expose.
- Import validates only `id`, `type` and a numeric `layout`; every other field is
  passed through untouched. A component whose `type` this build does not recognise
  renders as a labelled empty box rather than failing the import — a newer file must
  still open in an older build.
- Single page for now. The `pages` array exists anyway so that adding tabs in Phase 4
  is not a schema change.

### Implemented component types

KPI card, time series, bar, table, text. Each carries a default size and a number-key
shortcut; see `docs/NOTES.md` for where to add a sixth.

## Planned, not yet designed

- **Interaction annotations** — draw.io-style arrows meaning "clicking this cross-filters
  that" or "drill-down to detail"
- **Component count warning** — a gentle nudge past ~8 panels per page. Dashboard sprawl
  is the exact failure this tool exists to prevent.

## Exports

| Format | Approach |
|---|---|
| JSON | Native. Round-trips for import and further editing. |
| HTML | Serialize the document into a self-contained string. |
| PDF | `window.print()` plus a print stylesheet. **No PDF library.** |
| YAML | Last, via `js-yaml`, or never. JSON already round-trips. |

JSON export is live: it downloads `<dashboard-title>.json` and re-imports. HTML and PDF
are Phase 3. There is also a `localStorage` autosave, which is a convenience, not an
export — the JSON file is the artefact you hand to a BI developer.

## Open question

Superset is the default visual reference, but **what do the departments actually deliver
in?** If they ship in Power BI, Power BI's layout grammar takes precedence — the mockup
should resemble the destination tool, or people will mock up things their platform can't
build. Resolve this before Phase 4.
