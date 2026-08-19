# FastDash

A browser sketchpad for laying out BI dashboards — draw.io for dashboards. Place
components on a grid, resize them, write down what each one answers, and export the result
as a spec a BI developer can build from.

**[Try it →](https://ivan-savchuk.github.io/fast-dash/)** · no login, no install, nothing to
set up.

---

## The problem

Departments spec dashboards in prose. Prose cannot expose layout problems. You only feel
"this is too crowded" or "these three charts answer the same question" when you see boxes
on a canvas — so dashboards get built, then redesigned.

The competition here is PowerPoint, not other design tools. People already mock dashboards
in slides. This has to be faster than that from the first click.

## What makes it different

Every other mockup tool exports a picture. This exports requirements.

A dashboard is a JSON document, and it round-trips — export it, hand-edit it, import it
back. Each component carries its position, its type, *how it is drawn*, and a one-line note
saying what question it answers:

```json
{
  "id": "c1_mt0fce60",
  "type": "bar",
  "variant": "horizontal",
  "layout": { "x": 0, "y": 0, "w": 6, "h": 6 },
  "title": "Revenue by region",
  "spec": {},
  "comment": "Top 5 regions, descending. Rest grouped as Other."
}
```

`variant` is spec, not styling: *horizontal* says the categories have long names and the
point is the ranking; *stacked* says composition. A table goes further and names its
columns, with a role and a format sample for each — a table has no silhouette, so its
column list **is** its structure.

There is also a one-file HTML export: the dashboard as a viewer sees it, self-contained,
no scripts beyond tab switching. That is the artefact you hand over.

## Sixty seconds

Open it, pick a starter template, and start rearranging. Or from an empty canvas:

| | |
|---|---|
| `1`–`5` | add a KPI, time series, bar, table or text block |
| click the canvas | add any of the other twelve types, searchable |
| drag / drag a corner | move and resize; the grid snaps and reflows |
| arrow keys | move the selected card one cell |
| `[` `]` | step a chart through the ways it can be drawn |
| `⌘D` | duplicate · `Delete` removes · `Esc` deselects |
| `⌘Z` / `⇧⌘Z` | undo / redo — every change, including import |
| `P` | Present mode: the dashboard as a viewer sees it |
| `⌘⌥←` `⌘⌥→` | send the selected card to another page |

Anything you can do by dragging can also be done from the keyboard.

## What is in it

**17 component types.** KPI card · Time series · Bar · Table · Text · Pie/Donut · Combo
(bar + line) · Scatter · Funnel · Waterfall · Histogram · Box plot · Heatmap · Map
(choropleth) · Map (point) · Tabs · Section header.

Six of them can be drawn more than one way — a bar is vertical, horizontal, stacked or
grouped; a scatter is plain, with a fitted trend line and confidence band, or a bubble
chart. Which one you pick is a requirement, so both exports name it.

**Dashboard chrome that behaves like the real thing.** A collapsible filter rail with the
seven Superset-native control types, multi-page tab strips, Tabs containers that host their
own nested grid of real cards, and section header bands.

**Three starter dashboards**, four colour schemes, a dark theme, and autosave.

## Your data never leaves your browser

There is no backend and no account. Dashboards live in your browser's `localStorage`;
exports are ordinary downloads. Nothing is uploaded, and the app requests nothing but its
own two files — no CDN, no fonts, no tiles, no analytics. The whole thing is three static
files, a little over 100 KB gzipped, and it runs just as happily from a file share or an
internal host as from the link above.

## Running it

```bash
npm install
npm run dev      # local dev server
npm run build    # static production build
npm run preview  # verify the build — judge speed here, not in dev
npm run lint
```

Vite · React · Tailwind · `react-grid-layout` for the canvas. **No backend, no chart
library** — every chart placeholder is hand-written inline SVG, described once and rendered
by both the canvas and the HTML export so the two cannot drift.

Pushes to `main` build and publish to GitHub Pages automatically.

## Design principles

These override feature requests.

1. **Structurally faithful, visually neutral.** Real chart silhouettes and real BI chrome,
   grayscale placeholder data. High visual fidelity invites bikeshedding about colours
   instead of arguments about structure.
2. **Speed is the product.** Every interaction is measured against "would this have been
   faster in a slide?"
3. **The export is the differentiator.** It has to read as a requirements document, not a
   layout file. Fidelity work never outranks it.
4. **Zero friction to adopt.** No login, no server, no install. A static file needs no
   infosec review.
5. **Keyboard-first.**
6. **Undo is non-negotiable.** Every change goes through one reducer, so history is free.

Deliberately not built: Sankey, chord, radar, word cloud, anything 3D, real data
connections, accounts, and collaboration. Leaving them out is a feature — they signal "I
discovered a chart type", not "I have a question to answer".

## Docs

- [`docs/SPEC.md`](docs/SPEC.md) — what the tool is, the component set, the JSON schema, and
  the decisions behind them
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — phases, what shipped, and what was cut and why
- [`docs/NOTES.md`](docs/NOTES.md) — the file map, and the traps that cost real time
  (`react-grid-layout` v2 has several that fail silently)

The docs record rejected approaches as carefully as accepted ones. If something looks like
an obvious improvement, check there first — it may already have been tried.
