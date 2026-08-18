// HTML export: a single self-contained file that shows the dashboard the way a
// viewer would see it — the filters and the cards, laid out — with none of the
// tools used to build it. No toolbar, no add/edit controls, no inputs. It stays
// read-only: nothing here lets a viewer change the data or the layout.
//
// The one script in the file is navigation-only: it switches page tabs without
// the viewport jumping (which is what a CSS `:target` anchor does). It is only
// emitted when there is more than one page, and it touches nothing but a
// visibility class. Everything else is plain HTML and CSS.
//
// The chart drawings come from `components/placeholderArt.js`, the same
// description the canvas draws from, turned into a plain string here by
// `artToHtml`. The placeholders that are boxes rather than drawings — KPI,
// table, text — are still built from markup below, because the exported
// file ships no Tailwind and has to use its own CSS; only their numbers and
// labels are shared. The file still needs neither React nor Tailwind to open.

import { GRID_COLS, GRID_ROW_HEIGHT, themeById } from '../state/document.js'
import { typeLabel } from '../components/registry.jsx'
import {
  artFor,
  columnTemplate,
  hasFormats,
  kpiSample,
  kpiSpark,
  TABLE,
  tableColumns,
  TEXT_LINES,
  variantParts,
} from '../components/placeholderArt.js'

export function downloadHtmlExport(doc) {
  const html = renderDashboardHtml(doc)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slug(doc.title)}.html`
  a.click()
  URL.revokeObjectURL(url)
}

// Pure: document object in, HTML string out. Kept side-effect-free so it can be
// tested without a browser.
export function renderDashboardHtml(doc) {
  const title = doc.title || 'Untitled dashboard'
  const filters = doc.filters ?? []
  const pages = doc.pages ?? []
  // The one script in the file, and only when something needs switching:
  // more than one page, or any Tabs container (whose inner tabs also switch).
  const needsScript =
    pages.length > 1 || pages.some((p) => (p.components ?? []).some((c) => c.type === 'tabs'))
  const script = needsScript ? `\n<script>${TAB_SCRIPT}</script>` : ''

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${themeVars(doc.theme)}${STYLES}</style>
</head>
<body>
<header class="head"><h1>${esc(title)}</h1></header>
<div class="shell">
${renderFilters(filters)}
<main class="canvas-wrap">${renderPages(pages)}</main>
</div>${script}
</body>
</html>`
}

// One page reads exactly as before — just its grid. Two or more become a tab
// strip: a row of tabs plus one section per page, only the active one shown.
// A viewer clicks a tab and the page swaps in place. The switch is a class
// toggle driven by TAB_SCRIPT (emitted once at the document level), rather than
// a CSS `:target` anchor, so the viewport does not scroll on switch.
function renderPages(pages) {
  if (pages.length <= 1) return renderCanvas(pages[0]?.components ?? [])
  const tabs = pages
    .map(
      (p, i) =>
        `<a class="ptab${i === 0 ? ' on' : ''}" role="tab" tabindex="0" data-tab="pg-${esc(p.id)}">${esc(p.name ?? `Page ${i + 1}`)}</a>`,
    )
    .join('')
  const sections = pages
    .map(
      (p, i) =>
        `<section class="page${i === 0 ? ' on' : ''}" data-page="pg-${esc(p.id)}">${renderCanvas(p.components ?? [])}</section>`,
    )
    .join('\n')
  return `<nav class="ptabs">${tabs}</nav>\n<div class="pages">${sections}</div>`
}

// Navigation only, for both page tabs and the inner tabs of a Tabs container.
// Page tabs are global; inner tabs are scoped to their own `.tabs-ph` so one
// container's tabs never switch another's. No data is touched and nothing is
// editable — the file stays read-only.
const TAB_SCRIPT = `
(function(){
  function pick(id){
    document.querySelectorAll('.ptab').forEach(function(t){t.classList.toggle('on',t.getAttribute('data-tab')===id);});
    document.querySelectorAll('.page').forEach(function(p){p.classList.toggle('on',p.getAttribute('data-page')===id);});
  }
  document.querySelectorAll('.ptab').forEach(function(t){
    t.addEventListener('click',function(){pick(this.getAttribute('data-tab'));});
    t.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(this.getAttribute('data-tab'));}});
  });
  document.querySelectorAll('.itab').forEach(function(t){
    function inner(){
      var root=t.closest('.tabs-ph'); if(!root)return;
      var id=t.getAttribute('data-itab');
      root.querySelectorAll('.itab').forEach(function(x){x.classList.toggle('on',x.getAttribute('data-itab')===id);});
      root.querySelectorAll('.ipane').forEach(function(x){x.classList.toggle('on',x.getAttribute('data-ipane')===id);});
    }
    t.addEventListener('click',inner);
    t.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();inner();}});
  });
})();`

function renderFilters(filters) {
  if (filters.length === 0) return ''
  const rows = filters
    .map(
      (f) => `<div class="filter">
<div class="filter-label">${esc(f.label ?? '')}</div>
${filterControl(f.type)}
</div>`,
    )
    .join('\n')
  return `<aside class="rail"><div class="rail-title">Filters</div>${rows}</aside>`
}

function renderCanvas(components) {
  if (components.length === 0) return '<p class="empty">This dashboard has no components.</p>'
  return `<div class="canvas">${compactVertical(components).map(renderCard).join('\n')}</div>`
}

// The canvas uses react-grid-layout's vertical compactor, which pulls every
// card up to the first free row. The stored layout is not always compact —
// deleting a card (after a duplicate pushed its neighbours down, say) leaves a
// gap in the y values that the editor hides but a raw CSS grid would show as an
// empty band. So the export compacts the same way the screen does: take cards
// top-to-bottom and slide each as far up as it will go without colliding.
function compactVertical(components) {
  const sorted = [...components].sort(
    (a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x,
  )
  const placed = []
  for (const c of sorted) {
    let l = { ...c.layout }
    while (l.y > 0 && !placed.some((p) => overlaps(p.layout, { ...l, y: l.y - 1 }))) {
      l = { ...l, y: l.y - 1 }
    }
    placed.push({ ...c, layout: l })
  }
  return placed
}

function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

function renderCard(c) {
  const { x, y, w, h } = c.layout
  // CSS grid lines are 1-based; the same 12-col / 40px / 12px-gap geometry as
  // the editor, so the export matches what was on the canvas.
  const style = `grid-column:${x + 1}/span ${w};grid-row:${y + 1}/span ${h}`
  // Unlike the canvas, the export has no control to open — so it spells the
  // variant out ("Bar (horizontal)"), turning what the silhouette implies into
  // something a BI developer can build from.
  const label = esc(typeLabel(c.type, c.variant))

  // A Section header is a labelled band, not a chart card.
  if (c.type === 'section') {
    return `<div class="card section" style="${style}"><span class="section-label">${esc(c.title ?? '')}</span><span class="card-type">${label}</span></div>`
  }
  const body =
    c.type === 'tabs'
      ? renderTabsCard(c)
      : (PLACEHOLDERS[c.type] ?? placeholderUnknown)(c.variant, c.spec, c.id)
  const comment = c.comment
    ? `<div class="card-note">${esc(c.comment)}</div>`
    : ''
  return `<div class="card" style="${style}">
<div class="card-head"><span class="card-title">${esc(c.title ?? '')}</span><span class="card-type">${label}</span></div>
<div class="card-body">${body}</div>
${comment}
</div>`
}

// A Tabs container in the export: the real tab names as a strip, and one pane
// per tab holding that tab's cards in a nested 12-column grid (the same card
// markup as the page). Only the active pane shows; TAB_SCRIPT switches them.
function renderTabsCard(c) {
  const tabs = c.tabs ?? []
  const strip = tabs
    .map(
      (t, i) =>
        `<span class="itab${i === 0 ? ' on' : ''}" role="tab" tabindex="0" data-itab="ip-${esc(t.id)}">${esc(t.name ?? '')}</span>`,
    )
    .join('')
  const panes = tabs
    .map((t, i) => {
      const comps = t.components ?? []
      const inner = comps.length
        ? `<div class="canvas">${compactVertical(comps).map(renderCard).join('')}</div>`
        : `<div class="tabs-panel"></div>`
      return `<div class="ipane${i === 0 ? ' on' : ''}" data-ipane="ip-${esc(t.id)}">${inner}</div>`
    })
    .join('')
  return `<div class="tabs-ph"><div class="tabs-strip">${strip}</div><div class="tabs-body">${panes}</div></div>`
}

// --- component placeholders (grayscale silhouettes, no data) ---

// The export half of the shared placeholder art. Attribute names arrive in the
// spelling JSX needs (`strokeWidth`); HTML wants them hyphenated, which is one
// mechanical rule rather than a second list to keep in step.
function artToHtml(art, cls = 'fill') {
  // `fit` overrides the usual stretch — maps scale uniformly and crop.
  const par = art.fit ?? (art.stretch ? 'none' : null)
  const ratio = par ? ` preserveAspectRatio="${par}"` : ''
  return `<svg class="${cls}" viewBox="${art.viewBox}"${ratio}>${art.shapes.map(shapeToHtml).join('')}</svg>`
}

function shapeToHtml([tag, attrs, children]) {
  const written = Object.entries(attrs)
    .map(([name, value]) => ` ${hyphenate(name)}="${value}"`)
    .join('')
  return children
    ? `<${tag}${written}>${children.map(shapeToHtml).join('')}</${tag}>`
    : `<${tag}${written}/>`
}

function hyphenate(name) {
  return name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
}

// Every type whose placeholder is nothing but a drawing renders straight from
// the shared description. Types that can be drawn more than one way take the
// component's `variant`; the rest ignore it.
const chart = (type) => (variant) => artToHtml(artFor(type, variant))

const PLACEHOLDERS = {
  // Built line by line rather than as one template, so a dropped piece leaves no
  // blank line behind and the default variant is exactly what it always was.
  kpi: (variant, _spec, id) => {
    const parts = variantParts('kpi', variant)
    // Same id, same sample as the canvas drew — the two cannot drift.
    const sample = kpiSample(id)
    const lines = [`<div class="kpi-num">${sample.value}</div>`]
    if (parts.delta) lines.push(`<div class="kpi-delta">${sample.delta}</div>`)
    if (parts.spark) lines.push(artToHtml(kpiSpark(sample), 'kpi-spark'))
    return `<div class="kpi">\n${lines.join('\n')}\n</div>`
  },
  timeseries: chart('timeseries'),
  bar: chart('bar'),
  // The column names are the one piece of user text inside a placeholder, so
  // they go through `esc` like every other. The grid template rides on a custom
  // property, so one CSS rule serves any number of columns.
  table: (_variant, spec) => {
    const columns = tableColumns(spec)
    const cells = (fn) => columns.map(fn).join('')
    const cls = (c) => (c.role === 'measure' ? ' class="m"' : '')
    const head = `<div class="trow thead">${cells((c) => `<span${cls(c)}>${esc(c.name)}</span>`)}</div>`
    const formats = hasFormats(columns)
      ? `<div class="trow tformat">${cells((c) => `<span${cls(c)}>${esc(c.format)}</span>`)}</div>`
      : ''
    const row = `<div class="trow">${cells((c) => `<span${cls(c)}><i class="bar" style="width:${TABLE.barWidth(c.role)}%"></i></span>`)}</div>`
    return `<div class="table" style="--cols:${columnTemplate(columns)}">${head}${formats}${row.repeat(TABLE.rows)}</div>`
  },
  text: () =>
    `<div class="textblock">${TEXT_LINES.map((wdt) => `<i class="line" style="width:${wdt}"></i>`).join('')}</div>`,
  pie: chart('pie'),
  combo: chart('combo'),
  scatter: chart('scatter'),
  funnel: chart('funnel'),
  waterfall: chart('waterfall'),
  histogram: chart('histogram'),
  boxplot: chart('boxplot'),
  choropleth: chart('choropleth'),
  pointmap: chart('pointmap'),
  heatmap: chart('heatmap'),
}

function placeholderUnknown() {
  return `<div class="unknown">unknown component type</div>`
}

// --- filter control placeholders ---

function filterControl(type) {
  switch (type) {
    case 'range':
      return `<div class="ctl-range"><span class="track"><i class="fill-range"></i><i class="knob" style="left:25%"></i><i class="knob" style="left:66%"></i></span><div class="range-lbl"><span>min</span><span>max</span></div></div>`
    case 'date range':
      return `<div class="ctl-daterange"><span class="box">from</span><span class="dash">–</span><span class="box">to</span></div>`
    case 'time grain':
      return `<div class="box between"><span>month</span><span class="caret">▾</span></div>`
    case 'search':
      return `<div class="box">⌕ search…</div>`
    case 'toggle':
      return `<div class="ctl-toggle"><span class="switch"><i></i></span><span class="muted">on / off</span></div>`
    case 'multi-select':
      return `<div class="box between"><span class="chips"><i>A</i><i>B</i></span><span class="caret">▾</span></div>`
    default:
      return `<div class="box between"><span>All</span><span class="caret">▾</span></div>`
  }
}

const ROW = GRID_ROW_HEIGHT

// The document's colour scheme, resolved to plain values in the file itself so
// the export needs nothing from the app. The drawings reference these two
// properties; see the note on ACCENT in components/placeholderArt.js. An absent
// or unknown theme resolves to the neutral greys, so an older document exports
// exactly as it always did.
function themeVars(theme) {
  const { accent, ramp } = themeById(theme)
  const steps = ramp.map((hex, i) => `--fd-a${i + 1}:${hex}`).join(';')
  return `:root{--fd-accent:${accent};${steps}}\n`
}

const STYLES = `
*{box-sizing:border-box;margin:0;padding:0}
body{font:13px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;background:#f9fafb}
.head{padding:14px 20px;border-bottom:1px solid #e5e7eb;background:#fff}
.head h1{font-size:16px;font-weight:600}
.shell{display:flex;align-items:flex-start}
.rail{width:220px;flex:none;padding:12px;border-right:1px solid #e5e7eb;background:#fff;min-height:calc(100vh - 49px)}
.rail-title{font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:#9ca3af;margin-bottom:10px}
.filter{border:1px solid #e5e7eb;border-radius:2px;padding:8px;margin-bottom:12px}
.filter-label{font-size:12px;font-weight:500;color:#374151;margin-bottom:6px}
.canvas-wrap{flex:1;padding:16px;min-width:0}
.canvas{display:grid;grid-template-columns:repeat(${GRID_COLS},1fr);grid-auto-rows:${ROW}px;gap:12px}
.ptabs{display:flex;flex-wrap:wrap;gap:2px;margin-bottom:16px;border-bottom:1px solid #e5e7eb}
.ptab{padding:7px 14px;font-size:13px;color:#6b7280;text-decoration:none;cursor:pointer;border:1px solid transparent;border-bottom:none;border-radius:3px 3px 0 0;margin-bottom:-1px}
.ptab:hover{background:#f3f4f6;color:#111827}
.ptab.on{color:#111827;background:#fff;border-color:#e5e7eb}
.pages .page{display:none}
.pages .page.on{display:block}
.empty{color:#9ca3af;padding:24px}
.card{display:flex;flex-direction:column;overflow:hidden;background:#fff;border:1px solid #e5e7eb;border-radius:2px;min-width:0}
.card.section{flex-direction:row;align-items:center;gap:8px;padding:0 12px}
.section-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#4b5563}
.card-head{display:flex;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid #f3f4f6}
.card-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600;color:#1f2937}
.card-type{flex:none;font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:#d1d5db}
.card-body{flex:1;min-height:0;padding:8px 12px}
.card-note{flex:none;border-top:1px solid #f3f4f6;padding:6px 12px;font-size:11px;line-height:1.35;color:#4b5563}
.fill{width:100%;height:100%}
.kpi{display:flex;flex-direction:column;justify-content:center;gap:4px;height:100%}
.kpi-num{font-size:30px;line-height:1;font-weight:600;color:#374151;font-variant-numeric:tabular-nums}
.kpi-delta{font-size:11px;color:var(--fd-accent)}
.kpi-spark{height:20px;width:100%;margin-top:4px}
.table{display:flex;flex-direction:column;height:100%;font-size:11px}
.trow{display:grid;grid-template-columns:var(--cols);align-items:center;flex:1;border-bottom:1px solid #f3f4f6}
.trow.thead{flex:none;color:#9ca3af;font-weight:500;border-bottom:1px solid #d1d5db;padding-bottom:4px}
.trow.tformat{flex:none;border-bottom:none;color:#d1d5db;font-size:10px;padding:2px 0 4px}
.trow span{padding-right:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trow span.m{text-align:right}
.trow .bar{display:block;height:8px;border-radius:2px;background:#e5e7eb}
.trow .m .bar{margin-left:auto}
.textblock{display:flex;flex-direction:column;gap:8px;padding-top:4px}
.textblock .line{display:block;height:8px;border-radius:2px;background:#e5e7eb}
.tabs-ph{display:flex;flex-direction:column;height:100%}
.tabs-strip{display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid #e5e7eb;font-size:11px}
.itab{padding:2px 8px;cursor:pointer;border:1px solid transparent;border-bottom:none;border-radius:3px 3px 0 0;color:#9ca3af}
.itab:hover{color:#6b7280}
.itab.on{border-color:#d1d5db;background:#f3f4f6;color:#6b7280}
.tabs-body{flex:1;min-height:0;margin-top:8px;overflow:auto}
.ipane{display:none}
.ipane.on{display:block}
.tabs-panel{height:100%;min-height:80px;border:1px dashed #e5e7eb;border-radius:2px;background:#f9fafb}
.unknown{display:flex;align-items:center;justify-content:center;height:100%;border:1px dashed #e5e7eb;border-radius:2px;font-size:11px;color:#9ca3af}
.box{display:flex;align-items:center;height:24px;border:1px solid #e5e7eb;border-radius:2px;background:#f9fafb;padding:0 8px;font-size:11px;color:#9ca3af}
.box.between{justify-content:space-between}
.caret{color:#d1d5db}
.chips i{display:inline-block;background:#e5e7eb;border-radius:2px;padding:0 4px;margin-right:4px;font-style:normal}
.ctl-daterange{display:flex;align-items:center;gap:4px}
.ctl-daterange .box{flex:1}
.ctl-daterange .dash{color:#d1d5db}
.ctl-range .track{position:relative;display:block;height:6px;border-radius:9999px;background:#e5e7eb}
.ctl-range .fill-range{position:absolute;left:25%;right:34%;top:0;bottom:0;border-radius:9999px;background:#d1d5db}
.ctl-range .knob{position:absolute;top:50%;width:12px;height:12px;margin-left:-6px;transform:translateY(-50%);border-radius:9999px;border:1px solid #d1d5db;background:#fff}
.range-lbl{display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;margin-top:4px}
.ctl-toggle{display:flex;align-items:center;gap:8px}
.ctl-toggle .switch{display:inline-flex;align-items:center;width:36px;height:20px;border-radius:9999px;background:#e5e7eb;padding:2px}
.ctl-toggle .switch i{display:block;width:16px;height:16px;border-radius:9999px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.15)}
.ctl-toggle .muted{font-size:11px;color:#9ca3af}
@media print{.rail{min-height:0}body{background:#fff}}
`

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function slug(title) {
  return (
    String(title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'dashboard'
  )
}
