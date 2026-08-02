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
// The placeholder art is written here in plain SVG rather than reused from the
// React components, so the exported file needs neither React nor Tailwind. That
// is a deliberate duplication; see docs/NOTES.md.

import { GRID_COLS, GRID_ROW_HEIGHT } from '../state/document.js'
import { COMPONENT_TYPES } from '../components/registry.jsx'

const GRAY = { dark: '#9ca3af', mid: '#c9cdd4', light: '#e5e7eb' }

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
<style>${STYLES}</style>
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
  const def = COMPONENT_TYPES[c.type]
  const { x, y, w, h } = c.layout
  // CSS grid lines are 1-based; the same 12-col / 40px / 12px-gap geometry as
  // the editor, so the export matches what was on the canvas.
  const style = `grid-column:${x + 1}/span ${w};grid-row:${y + 1}/span ${h}`

  // A Section header is a labelled band, not a chart card.
  if (c.type === 'section') {
    return `<div class="card section" style="${style}"><span class="section-label">${esc(c.title ?? '')}</span><span class="card-type">${esc(def?.label ?? c.type)}</span></div>`
  }
  const body = c.type === 'tabs' ? renderTabsCard(c) : (PLACEHOLDERS[c.type] ?? placeholderUnknown)()
  const comment = c.comment
    ? `<div class="card-note">${esc(c.comment)}</div>`
    : ''
  return `<div class="card" style="${style}">
<div class="card-head"><span class="card-title">${esc(c.title ?? '')}</span><span class="card-type">${esc(def?.label ?? c.type)}</span></div>
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

const PLACEHOLDERS = {
  kpi: () => `<div class="kpi">
<div class="kpi-num">1,234</div>
<div class="kpi-delta">▲ 12.5% vs. prior period</div>
<svg class="kpi-spark" viewBox="0 0 100 20" preserveAspectRatio="none"><polyline points="0,16 14,12 28,14 42,8 56,10 70,5 84,7 100,2" fill="none" stroke="${GRAY.dark}" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>
</div>`,
  timeseries: () => `<svg class="fill" viewBox="0 0 100 60" preserveAspectRatio="none">
${[15, 30, 45].map((yy) => `<line x1="0" y1="${yy}" x2="100" y2="${yy}" stroke="${GRAY.light}" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join('')}
<polyline points="0,48 12,40 24,44 36,28 48,32 60,20 72,24 84,12 100,8" fill="none" stroke="${GRAY.dark}" stroke-width="2" vector-effect="non-scaling-stroke"/>
<polyline points="0,54 12,52 24,50 36,46 48,48 60,40 72,42 84,36 100,30" fill="none" stroke="${GRAY.mid}" stroke-width="2" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>
<line x1="0" y1="58" x2="100" y2="58" stroke="${GRAY.mid}" stroke-width="1" vector-effect="non-scaling-stroke"/>
</svg>`,
  bar: () => `<svg class="fill" viewBox="0 0 100 60" preserveAspectRatio="none">
${[34, 46, 26, 52, 40, 56, 30].map((hh, i) => `<rect x="${i * 14 + 2}" y="${58 - hh}" width="10" height="${hh}" fill="${GRAY.mid}"/>`).join('')}
<line x1="0" y1="58" x2="100" y2="58" stroke="${GRAY.dark}" stroke-width="1" vector-effect="non-scaling-stroke"/>
</svg>`,
  table: () => {
    const head = `<div class="trow thead">${['Dimension', 'Measure 1', 'Measure 2', 'Measure 3'].map((t) => `<span>${t}</span>`).join('')}</div>`
    const rows = Array.from(
      { length: 5 },
      () => `<div class="trow">${Array.from({ length: 4 }, (_, c) => `<span><i class="bar" style="width:${c === 0 ? 80 : 55}%"></i></span>`).join('')}</div>`,
    ).join('')
    return `<div class="table">${head}${rows}</div>`
  },
  text: () =>
    `<div class="textblock">${['92%', '84%', '96%', '60%'].map((wdt) => `<i class="line" style="width:${wdt}"></i>`).join('')}</div>`,
  pivot: () => {
    const cols = 4
    const colHead = Array.from({ length: cols }, () => `<div class="pcell"><i class="phbar"></i></div>`).join('')
    const body = [0, 1, 1, 0, 1]
      .map((ind, ri) => {
        const rlabel = `<div class="rhead" style="padding-left:${ind * 14}px"><i class="pbar" style="width:${ind ? 55 : 75}%"></i></div>`
        const cells = Array.from({ length: cols }, (_, c) => `<div class="pcell"><i class="pbar" style="width:${45 + ((ri + c) % 3) * 15}%"></i></div>`).join('')
        return `<div class="prow pbody">${rlabel}${cells}</div>`
      })
      .join('')
    const tot = `<div class="prow ptot"><div class="rhead"><i class="pbar strong" style="width:50%"></i></div>${Array.from({ length: cols }, (_, c) => `<div class="pcell"><i class="pbar strong" style="width:${55 + (c % 2) * 15}%"></i></div>`).join('')}</div>`
    return `<div class="pivot"><div class="prow phead"><div class="rhead"></div>${colHead}</div>${body}${tot}</div>`
  },
  // Donut: three grayscale slices, dash lengths mirroring registry.jsx.
  pie: () => `<svg class="fill" viewBox="0 0 100 60"><g transform="rotate(-90 50 30)" fill="none" stroke-width="11">
<circle cx="50" cy="30" r="18" stroke="${GRAY.dark}" stroke-dasharray="50.89 62.21" stroke-dashoffset="0"/>
<circle cx="50" cy="30" r="18" stroke="${GRAY.mid}" stroke-dasharray="39.58 73.52" stroke-dashoffset="-50.89"/>
<circle cx="50" cy="30" r="18" stroke="${GRAY.light}" stroke-dasharray="22.62 90.48" stroke-dashoffset="-90.48"/>
</g></svg>`,
  combo: () => `<svg class="fill" viewBox="0 0 100 60" preserveAspectRatio="none">
${[30, 44, 26, 50, 38, 54].map((hh, i) => `<rect x="${i * 16 + 5}" y="${58 - hh}" width="10" height="${hh}" fill="${GRAY.light}"/>`).join('')}
<polyline points="10,38 26,28 42,42 58,18 74,26 90,10" fill="none" stroke="${GRAY.dark}" stroke-width="2" vector-effect="non-scaling-stroke"/>
<line x1="0" y1="58" x2="100" y2="58" stroke="${GRAY.mid}" stroke-width="1" vector-effect="non-scaling-stroke"/>
</svg>`,
  scatter: () => `<svg class="fill" viewBox="0 0 100 60" preserveAspectRatio="none">
${[[12, 45], [18, 50], [21, 38], [27, 47], [31, 53], [36, 35], [41, 44], [44, 30], [49, 48], [55, 33], [58, 41], [63, 44], [67, 26], [72, 36], [76, 23], [81, 31], [86, 20], [92, 29]].map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="0.9" fill="${GRAY.dark}" opacity="0.6"/>`).join('')}
<line x1="0" y1="58" x2="100" y2="58" stroke="${GRAY.mid}" stroke-width="1" vector-effect="non-scaling-stroke"/>
</svg>`,
  funnel: () => `<svg class="fill" viewBox="0 0 100 60" preserveAspectRatio="none">
${[[92, GRAY.light], [74, GRAY.mid], [58, GRAY.dark], [42, GRAY.mid], [26, GRAY.light]].map((s, i) => `<rect x="${50 - s[0] / 2}" y="${4 + i * 11}" width="${s[0]}" height="8" fill="${s[1]}"/>`).join('')}
</svg>`,
  waterfall: () => `<svg class="fill" viewBox="0 0 100 60" preserveAspectRatio="none">
${[[6, 34, 22, GRAY.dark], [22, 24, 10, GRAY.mid], [38, 24, 8, GRAY.mid], [54, 16, 8, GRAY.mid], [70, 16, 6, GRAY.mid], [86, 10, 46, GRAY.dark]].map((b) => `<rect x="${b[0]}" y="${b[1]}" width="10" height="${b[2]}" fill="${b[3]}"/>`).join('')}
<line x1="0" y1="58" x2="100" y2="58" stroke="${GRAY.mid}" stroke-width="1" vector-effect="non-scaling-stroke"/>
</svg>`,
  histogram: () => `<svg class="fill" viewBox="0 0 100 60" preserveAspectRatio="none">
${[8, 14, 22, 34, 46, 52, 50, 42, 30, 20, 12, 7].map((hh, i) => `<rect x="${i * 8 + 2}" y="${58 - hh}" width="7.5" height="${hh}" fill="${GRAY.mid}"/>`).join('')}
<line x1="0" y1="58" x2="100" y2="58" stroke="${GRAY.mid}" stroke-width="1" vector-effect="non-scaling-stroke"/>
</svg>`,
  boxplot: () => `<svg class="fill" viewBox="0 0 100 60" preserveAspectRatio="none">
${[[22, 10, 20, 28, 38, 50], [50, 6, 16, 22, 34, 46], [78, 14, 24, 30, 40, 54]].map(([cx, wTop, q3, med, q1, wBot]) => `<line x1="${cx}" y1="${wTop}" x2="${cx}" y2="${wBot}" stroke="${GRAY.mid}" stroke-width="1" vector-effect="non-scaling-stroke"/><line x1="${cx - 5}" y1="${wTop}" x2="${cx + 5}" y2="${wTop}" stroke="${GRAY.mid}" stroke-width="1" vector-effect="non-scaling-stroke"/><line x1="${cx - 5}" y1="${wBot}" x2="${cx + 5}" y2="${wBot}" stroke="${GRAY.mid}" stroke-width="1" vector-effect="non-scaling-stroke"/><rect x="${cx - 9}" y="${q3}" width="18" height="${q1 - q3}" fill="${GRAY.light}" stroke="${GRAY.dark}" stroke-width="1" vector-effect="non-scaling-stroke"/><line x1="${cx - 9}" y1="${med}" x2="${cx + 9}" y2="${med}" stroke="${GRAY.dark}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`).join('')}
</svg>`,
  choropleth: () => {
    const regions = ['10,20 30,12 34,30 18,38 8,32', '30,12 52,10 50,28 34,30', '52,10 74,14 78,30 58,32 50,28', '18,38 34,30 46,40 40,52 20,50', '34,30 50,28 58,32 60,44 46,40', '58,32 78,30 88,40 74,52 60,44']
    const shades = [GRAY.light, GRAY.mid, GRAY.dark, GRAY.mid, GRAY.light, GRAY.dark]
    return `<svg class="fill" viewBox="0 0 100 60" preserveAspectRatio="none">${regions.map((p, i) => `<polygon points="${p}" fill="${shades[i]}" stroke="#fff" stroke-width="0.8" vector-effect="non-scaling-stroke"/>`).join('')}</svg>`
  },
  pointmap: () => {
    const regions = ['10,20 30,12 34,30 18,38 8,32', '30,12 52,10 50,28 34,30', '52,10 74,14 78,30 58,32 50,28', '18,38 34,30 46,40 40,52 20,50', '34,30 50,28 58,32 60,44 46,40', '58,32 78,30 88,40 74,52 60,44']
    const pts = [[24, 24], [41, 19], [60, 20], [71, 34], [46, 37], [29, 45], [65, 43]]
    return `<svg class="fill" viewBox="0 0 100 60" preserveAspectRatio="none">${regions.map((p) => `<polygon points="${p}" fill="${GRAY.light}" stroke="${GRAY.mid}" stroke-width="0.8" vector-effect="non-scaling-stroke"/>`).join('')}${pts.map((pt) => `<circle cx="${pt[0]}" cy="${pt[1]}" r="1.6" fill="${GRAY.dark}" opacity="0.75"/>`).join('')}</svg>`
  },
  heatmap: () => {
    const shades = ['#f0f1f3', '#e5e7eb', '#c9cdd4', '#b6bcc6', '#9ca3af', '#6b7280']
    const rows = [
      [1, 2, 3, 4, 3, 2, 1, 0],
      [2, 3, 4, 5, 4, 3, 2, 1],
      [3, 4, 5, 5, 5, 4, 3, 2],
      [2, 3, 4, 5, 4, 3, 2, 1],
      [1, 2, 3, 4, 3, 2, 1, 0],
    ]
    return `<svg class="fill" viewBox="0 0 100 60" preserveAspectRatio="none">${rows
      .map((row, r) =>
        row
          .map(
            (v, c) =>
              `<rect x="${c * 12.5 + 0.5}" y="${r * 12 + 0.5}" width="11.5" height="11" fill="${shades[v]}"/>`,
          )
          .join(''),
      )
      .join('')}</svg>`
  },
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
.kpi-num{font-size:24px;line-height:1;font-weight:600;color:#9ca3af;font-variant-numeric:tabular-nums}
.kpi-delta{font-size:11px;color:#9ca3af}
.kpi-spark{height:20px;width:100%;margin-top:4px}
.table{display:flex;flex-direction:column;height:100%;font-size:11px}
.trow{display:grid;grid-template-columns:1.4fr repeat(3,1fr);align-items:center;flex:1;border-bottom:1px solid #f3f4f6}
.trow.thead{flex:none;color:#9ca3af;font-weight:500;border-bottom:1px solid #d1d5db;padding-bottom:4px}
.trow span{padding-right:8px;overflow:hidden}
.trow .bar{display:block;height:8px;border-radius:2px;background:#e5e7eb}
.textblock{display:flex;flex-direction:column;gap:8px;padding-top:4px}
.textblock .line{display:block;height:8px;border-radius:2px;background:#e5e7eb}
.pivot{display:flex;flex-direction:column;height:100%;font-size:11px}
.pivot .prow{display:grid;align-items:center;grid-template-columns:1.6fr repeat(4,1fr)}
.pivot .phead{flex:none;border-bottom:1px solid #d1d5db;padding-bottom:4px}
.pivot .pbody{flex:1;min-height:0;border-bottom:1px solid #f3f4f6}
.pivot .ptot{flex:none;border-top:2px solid #d1d5db;padding-top:4px}
.pivot .rhead{padding-right:8px}
.pivot .pcell{display:flex;justify-content:flex-end;padding-right:8px}
.pivot .pbar{display:block;height:8px;border-radius:2px;background:#e5e7eb}
.pivot .pbar.strong{background:#d1d5db}
.pivot .phbar{display:block;height:6px;width:32px;border-radius:2px;background:#d1d5db}
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
