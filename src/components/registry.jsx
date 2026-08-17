// One entry per component type: what it's called, how big it starts,
// which number key adds it, and what its grayscale placeholder looks like.
//
// The chart drawings themselves live in `placeholderArt.js`, described once
// and shared with the HTML export so the two can no longer drift apart.
// `SvgArt` below is the half that turns a description into React elements.
//
// The placeholders that are boxes rather than drawings — KPI, table,
// text, tabs, section — are still written here as ordinary markup, because the
// export ships no Tailwind and has to build them from its own CSS. Their
// numbers and labels still come from `placeholderArt.js`.

import { createElement } from 'react'
import {
  artFor,
  columnTemplate,
  hasFormats,
  KPI_SPARK,
  KPI_TEXT,
  TABLE,
  tableColumns,
  TABS_LABELS,
  TEXT_LINES,
  variantLabel,
  variantParts,
} from './placeholderArt.js'

// A shape is `[tag, attrs]`, or `[tag, attrs, children]` for a group. Attribute
// names are already in JSX spelling, so they spread straight onto the element.
function shapeToElement(shape, i) {
  const [tag, attrs, children] = shape
  return createElement(tag, { key: i, ...attrs }, children?.map(shapeToElement))
}

// `art.fit` overrides the usual stretch — maps scale uniformly and crop, so a
// circle drawn on one is still a circle.
function SvgArt({ art, className = 'h-full w-full' }) {
  return (
    <svg
      className={className}
      viewBox={art.viewBox}
      {...(art.fit
        ? { preserveAspectRatio: art.fit }
        : art.stretch
          ? { preserveAspectRatio: 'none' }
          : null)}
    >
      {art.shapes.map(shapeToElement)}
    </svg>
  )
}

// `chart` covers every type whose placeholder is nothing but a drawing. Types
// with more than one way to be drawn take the component's `variant`; the rest
// ignore it and `artFor` hands back their single drawing.
const chart = (type) =>
  function ChartPlaceholder({ variant }) {
    return <SvgArt art={artFor(type, variant)} />
  }

// The KPI is text and layout rather than a drawing, so its variants drop pieces
// instead of swapping silhouettes. Which pieces is shared with the export.
function KpiPlaceholder({ variant }) {
  const parts = variantParts('kpi', variant)
  return (
    <div className="flex h-full flex-col justify-center gap-1">
      <div className="text-2xl leading-none font-semibold text-gray-400 tabular-nums">
        {KPI_TEXT.value}
      </div>
      {/* The delta is the KPI's primary mark when there is no sparkline, and
          reads as one either way — a real KPI card colours its change. */}
      {parts.delta && (
        <div className="text-[11px]" style={{ color: 'var(--fd-accent)' }}>
          {KPI_TEXT.delta}
        </div>
      )}
      {parts.spark && <SvgArt art={KPI_SPARK} className="mt-1 h-5 w-full" />}
    </div>
  )
}

// The one placeholder whose content is real: a table's columns are its
// structure, so they are named rather than drawn. Values stay grey bars.
// Alignment carries the role — measures right, like every real data grid, and
// like every real data grid.
function TablePlaceholder({ spec }) {
  const columns = tableColumns(spec)
  const gridTemplateColumns = columnTemplate(columns)
  // Joined rather than interpolated: an empty alignment must not leave a
  // trailing space in the class attribute.
  const cls = (...parts) => parts.filter(Boolean).join(' ')
  const align = (role) => (role === 'measure' ? 'text-right' : '')
  return (
    <div className="flex h-full flex-col overflow-hidden text-[11px]">
      <div className="grid shrink-0 border-b border-gray-300 pb-1" style={{ gridTemplateColumns }}>
        {columns.map((c, i) => (
          <div key={i} className={cls('truncate pr-2 font-medium text-gray-400', align(c.role))}>
            {c.name}
          </div>
        ))}
      </div>
      {hasFormats(columns) && (
        <div className="grid shrink-0 pt-0.5 pb-1" style={{ gridTemplateColumns }}>
          {columns.map((c, i) => (
            <div
              key={i}
              className={cls('truncate pr-2 text-[10px] text-gray-300 dark:text-gray-500', align(c.role))}
            >
              {c.format}
            </div>
          ))}
        </div>
      )}
      {/* rows share the leftover height, so the grid fills a tall card */}
      {Array.from({ length: TABLE.rows }, (_, r) => (
        <div key={r} className="grid min-h-0 flex-1 items-center border-b border-gray-100"
          style={{ gridTemplateColumns }}>
          {columns.map((c, i) => (
            <div key={i} className={c.role === 'measure' ? 'flex justify-end pr-2' : 'pr-2'}>
              <div className="h-2 rounded bg-gray-200" style={{ width: `${TABLE.barWidth(c.role)}%` }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function TextPlaceholder() {
  return (
    <div className="flex h-full flex-col gap-2 pt-1">
      {TEXT_LINES.map((w, i) => (
        <div key={i} className="h-2 rounded bg-gray-200" style={{ width: w }} />
      ))}
    </div>
  )
}

function TabsPlaceholder() {
  // A Superset-style in-page Tabs element: a strip of tab labels over an empty
  // region. A placeholder only — the real container renders in TabsBody.jsx.
  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-gray-200 text-[11px]">
        {TABS_LABELS.map((t, i) => (
          <span
            key={t}
            className={`rounded-t-sm border border-b-0 px-2 py-0.5 ${
              i === 0
                ? 'border-gray-300 bg-gray-100 text-gray-500'
                : 'border-transparent text-gray-400'
            }`}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-2 flex-1 rounded-sm border border-dashed border-gray-200 bg-gray-50" />
    </div>
  )
}

function SectionPlaceholder() {
  // Fallback only — a Section header renders as a compact labelled band in
  // Card.jsx, and its own markup in the HTML export, so this is rarely shown.
  return <div className="h-full border-b-2 border-gray-300" />
}

export const COMPONENT_TYPES = {
  kpi: {
    label: 'KPI card',
    key: '1',
    defaultTitle: 'KPI',
    // Heights allow for the header strip plus the description box (~70px).
    defaultSize: { w: 3, h: 4 },
    Placeholder: KpiPlaceholder,
  },
  timeseries: {
    label: 'Time series',
    key: '2',
    defaultTitle: 'Trend over time',
    defaultSize: { w: 6, h: 6 },
    Placeholder: chart('timeseries'),
  },
  bar: {
    label: 'Bar',
    key: '3',
    defaultTitle: 'Breakdown by category',
    defaultSize: { w: 6, h: 6 },
    Placeholder: chart('bar'),
  },
  table: {
    label: 'Table',
    key: '4',
    defaultTitle: 'Detail table',
    defaultSize: { w: 6, h: 7 },
    Placeholder: TablePlaceholder,
  },
  text: {
    label: 'Text',
    key: '5',
    defaultTitle: 'Notes',
    defaultSize: { w: 4, h: 4 },
    Placeholder: TextPlaceholder,
  },
  // From here down: catalog-only types. No number key — they are reached
  // through the quick picker's search, not the toolbar or the digits. The
  // five above are the popular ones and keep their shortcut.
  pie: {
    label: 'Pie / Donut',
    defaultTitle: 'Share of total',
    defaultSize: { w: 4, h: 6 },
    Placeholder: chart('pie'),
  },
  combo: {
    label: 'Combo (bar + line)',
    defaultTitle: 'Two measures, dual axis',
    defaultSize: { w: 6, h: 6 },
    Placeholder: chart('combo'),
  },
  scatter: {
    label: 'Scatter',
    defaultTitle: 'Correlation',
    defaultSize: { w: 6, h: 6 },
    Placeholder: chart('scatter'),
  },
  funnel: {
    label: 'Funnel',
    defaultTitle: 'Conversion steps',
    defaultSize: { w: 4, h: 6 },
    Placeholder: chart('funnel'),
  },
  waterfall: {
    label: 'Waterfall',
    defaultTitle: 'Contribution to change',
    defaultSize: { w: 6, h: 6 },
    Placeholder: chart('waterfall'),
  },
  histogram: {
    label: 'Histogram',
    defaultTitle: 'Distribution',
    defaultSize: { w: 6, h: 6 },
    Placeholder: chart('histogram'),
  },
  boxplot: {
    label: 'Box plot',
    defaultTitle: 'Spread by group',
    defaultSize: { w: 6, h: 6 },
    Placeholder: chart('boxplot'),
  },
  heatmap: {
    label: 'Heatmap',
    defaultTitle: 'Intensity grid',
    defaultSize: { w: 6, h: 6 },
    Placeholder: chart('heatmap'),
  },
  choropleth: {
    label: 'Map (choropleth)',
    defaultTitle: 'By region',
    defaultSize: { w: 6, h: 6 },
    Placeholder: chart('choropleth'),
  },
  pointmap: {
    label: 'Map (point)',
    defaultTitle: 'Locations',
    defaultSize: { w: 6, h: 6 },
    Placeholder: chart('pointmap'),
  },
  tabs: {
    label: 'Tabs',
    defaultTitle: 'Tabbed section',
    // Full width and tall: the nested grid inside a tab is a 12-column grid of
    // the container's own width, so a full-width container makes a child chart
    // the same pixel size it would be on the page. A narrow container squeezes.
    defaultSize: { w: 12, h: 10 },
    Placeholder: TabsPlaceholder,
  },
  section: {
    label: 'Section header',
    defaultTitle: 'Section',
    // Full width and short: a labelled band you drop between cards to group a
    // page into zones. Its title is the section label.
    defaultSize: { w: 12, h: 2 },
    Placeholder: SectionPlaceholder,
  },
}

// The keyed five: toolbar buttons and number-key shortcuts, in this order.
export const TYPE_ORDER = ['kpi', 'timeseries', 'bar', 'table', 'text']

// The full catalog the quick picker searches, in the order it lists them.
// The keyed five come first; everything after is search-only.
export const CATALOG_ORDER = [
  'kpi',
  'timeseries',
  'bar',
  'table',
  'text',
  'pie',
  'combo',
  'scatter',
  'funnel',
  'waterfall',
  'histogram',
  'boxplot',
  'heatmap',
  'choropleth',
  'pointmap',
  'tabs',
  'section',
]

// Reverse lookup for the number-key shortcuts. Only the keyed five are here,
// so a search-only type can never be triggered by a stray digit.
export const TYPE_BY_KEY = Object.fromEntries(
  TYPE_ORDER.map((type) => [COMPONENT_TYPES[type].key, type]),
)

// What to call a component: "Bar", or "Bar (horizontal)" once a non-default
// variant is chosen. The HTML export uses this, because there the silhouette is
// all a reader has — naming the variant turns an inference into an instruction.
// Lives here rather than in placeholderArt.js, which knows the variants but not
// the type labels and must not import this file back.
export function typeLabel(type, variant) {
  const label = COMPONENT_TYPES[type]?.label ?? type
  const v = variantLabel(type, variant)
  return v ? `${label} (${v.toLowerCase()})` : label
}
