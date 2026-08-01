// HTML export: a single self-contained file that shows the dashboard the way a
// viewer would see it — the filters and the cards, laid out — with none of the
// tools used to build it. No toolbar, no add/edit controls, no inputs, no
// buttons, no scripts. Just a dashboard to look at.
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
  const components = doc.pages?.[0]?.components ?? []

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
<main class="canvas-wrap">${renderCanvas(components)}</main>
</div>
</body>
</html>`
}

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
  return `<div class="canvas">${components.map(renderCard).join('\n')}</div>`
}

function renderCard(c) {
  const def = COMPONENT_TYPES[c.type]
  const { x, y, w, h } = c.layout
  // CSS grid lines are 1-based; the same 12-col / 40px / 12px-gap geometry as
  // the editor, so the export matches what was on the canvas.
  const style = `grid-column:${x + 1}/span ${w};grid-row:${y + 1}/span ${h}`
  const body = (PLACEHOLDERS[c.type] ?? placeholderUnknown)()
  const comment = c.comment
    ? `<div class="card-note">${esc(c.comment)}</div>`
    : ''
  return `<div class="card" style="${style}">
<div class="card-head"><span class="card-title">${esc(c.title ?? '')}</span><span class="card-type">${esc(def?.label ?? c.type)}</span></div>
<div class="card-body">${body}</div>
${comment}
</div>`
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
  // Donut: three grayscale slices, dash lengths mirroring registry.jsx.
  pie: () => `<svg class="fill" viewBox="0 0 100 60"><g transform="rotate(-90 50 30)" fill="none" stroke-width="11">
<circle cx="50" cy="30" r="18" stroke="${GRAY.dark}" stroke-dasharray="50.89 62.21" stroke-dashoffset="0"/>
<circle cx="50" cy="30" r="18" stroke="${GRAY.mid}" stroke-dasharray="39.58 73.52" stroke-dashoffset="-50.89"/>
<circle cx="50" cy="30" r="18" stroke="${GRAY.light}" stroke-dasharray="22.62 90.48" stroke-dashoffset="-90.48"/>
</g></svg>`,
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
.empty{color:#9ca3af;padding:24px}
.card{display:flex;flex-direction:column;overflow:hidden;background:#fff;border:1px solid #e5e7eb;border-radius:2px;min-width:0}
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
