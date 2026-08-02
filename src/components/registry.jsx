// One entry per component type: what it's called, how big it starts,
// which number key adds it, and what its grayscale placeholder looks like.
//
// Placeholders are hand-written on purpose. They must read as the right
// *shape* of chart at a glance and carry no real data and no color —
// color invites arguments about palettes instead of about layout.

const GRAY = { dark: '#9ca3af', mid: '#c9cdd4', light: '#e5e7eb' }

function KpiPlaceholder() {
  return (
    <div className="flex h-full flex-col justify-center gap-1">
      <div className="text-2xl leading-none font-semibold text-gray-400 tabular-nums">1,234</div>
      <div className="text-[11px] text-gray-400">▲ 12.5% vs. prior period</div>
      <svg className="mt-1 h-5 w-full" viewBox="0 0 100 20" preserveAspectRatio="none">
        <polyline
          points="0,16 14,12 28,14 42,8 56,10 70,5 84,7 100,2"
          fill="none"
          stroke={GRAY.dark}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}

function TimeSeriesPlaceholder() {
  return (
    <svg className="h-full w-full" viewBox="0 0 100 60" preserveAspectRatio="none">
      {/* gridlines */}
      {[15, 30, 45].map((y) => (
        <line key={y} x1="0" y1={y} x2="100" y2={y} stroke={GRAY.light} strokeWidth="1"
          vectorEffect="non-scaling-stroke" />
      ))}
      <polyline
        points="0,48 12,40 24,44 36,28 48,32 60,20 72,24 84,12 100,8"
        fill="none" stroke={GRAY.dark} strokeWidth="2" vectorEffect="non-scaling-stroke"
      />
      <polyline
        points="0,54 12,52 24,50 36,46 48,48 60,40 72,42 84,36 100,30"
        fill="none" stroke={GRAY.mid} strokeWidth="2" strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
      />
      {/* axis */}
      <line x1="0" y1="58" x2="100" y2="58" stroke={GRAY.mid} strokeWidth="1"
        vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function BarPlaceholder() {
  const bars = [34, 46, 26, 52, 40, 56, 30]
  return (
    <svg className="h-full w-full" viewBox="0 0 100 60" preserveAspectRatio="none">
      {bars.map((h, i) => (
        <rect key={i} x={i * 14 + 2} y={58 - h} width="10" height={h} fill={GRAY.mid} />
      ))}
      <line x1="0" y1="58" x2="100" y2="58" stroke={GRAY.dark} strokeWidth="1"
        vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function TablePlaceholder() {
  const rows = 5
  const cols = 4
  return (
    <div className="flex h-full flex-col overflow-hidden text-[11px]">
      <div className="grid shrink-0 border-b border-gray-300 pb-1"
        style={{ gridTemplateColumns: `1.4fr repeat(${cols - 1}, 1fr)` }}>
        {Array.from({ length: cols }, (_, c) => (
          <div key={c} className="truncate pr-2 font-medium text-gray-400">
            {c === 0 ? 'Dimension' : `Measure ${c}`}
          </div>
        ))}
      </div>
      {/* rows share the leftover height, so the grid fills a tall card */}
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="grid min-h-0 flex-1 items-center border-b border-gray-100"
          style={{ gridTemplateColumns: `1.4fr repeat(${cols - 1}, 1fr)` }}>
          {Array.from({ length: cols }, (_, c) => (
            <div key={c} className="pr-2">
              <div className="h-2 rounded bg-gray-200" style={{ width: c === 0 ? '80%' : '55%' }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function ComboPlaceholder() {
  const bars = [30, 44, 26, 50, 38, 54]
  return (
    <svg className="h-full w-full" viewBox="0 0 100 60" preserveAspectRatio="none">
      {bars.map((h, i) => (
        <rect key={i} x={i * 16 + 5} y={58 - h} width="10" height={h} fill={GRAY.light} />
      ))}
      <polyline
        points="10,38 26,28 42,42 58,18 74,26 90,10"
        fill="none"
        stroke={GRAY.dark}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <line x1="0" y1="58" x2="100" y2="58" stroke={GRAY.mid} strokeWidth="1"
        vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// An irregular cloud, drawn edge-to-edge so it fills the card rather than
// leaving blank margins. preserveAspectRatio="none" lets it stretch like the
// bar and time-series placeholders; the dots are kept small so the stretch
// reads as a scatter, not as ovals.
const SCATTER_PTS = [
  [12, 45], [18, 50], [21, 38], [27, 47], [31, 53], [36, 35],
  [41, 44], [44, 30], [49, 48], [55, 33], [58, 41], [63, 44],
  [67, 26], [72, 36], [76, 23], [81, 31], [86, 20], [92, 29],
]

function ScatterPlaceholder() {
  return (
    <svg className="h-full w-full" viewBox="0 0 100 60" preserveAspectRatio="none">
      {SCATTER_PTS.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="0.9" fill={GRAY.dark} opacity="0.6" />
      ))}
      {/* Same baseline as the bar and time-series placeholders (y=58, full
          width) so the charts line up when placed next to each other. */}
      <line x1="0" y1="58" x2="100" y2="58" stroke={GRAY.mid} strokeWidth="1"
        vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function FunnelPlaceholder() {
  // Centred bars narrowing downward — reads as a funnel without the trapezoid
  // maths, and stays grayscale.
  const segs = [
    { w: 92, c: GRAY.light },
    { w: 74, c: GRAY.mid },
    { w: 58, c: GRAY.dark },
    { w: 42, c: GRAY.mid },
    { w: 26, c: GRAY.light },
  ]
  return (
    <svg className="h-full w-full" viewBox="0 0 100 60" preserveAspectRatio="none">
      {segs.map((s, i) => (
        <rect key={i} x={50 - s.w / 2} y={4 + i * 11} width={s.w} height="8" fill={s.c} />
      ))}
    </svg>
  )
}

function WaterfallPlaceholder() {
  // Floating bars stepping up, with the start and total as full pillars. Shares
  // the y=58 baseline with the other bar-like charts so they line up.
  const bars = [
    [6, 34, 22, GRAY.dark],
    [22, 24, 10, GRAY.mid],
    [38, 24, 8, GRAY.mid],
    [54, 16, 8, GRAY.mid],
    [70, 16, 6, GRAY.mid],
    [86, 10, 46, GRAY.dark],
  ]
  return (
    <svg className="h-full w-full" viewBox="0 0 100 60" preserveAspectRatio="none">
      {bars.map((b, i) => (
        <rect key={i} x={b[0]} y={b[1]} width="10" height={b[2]} fill={b[3]} />
      ))}
      <line x1="0" y1="58" x2="100" y2="58" stroke={GRAY.mid} strokeWidth="1"
        vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function HistogramPlaceholder() {
  // Contiguous bars in a rough bell — a distribution, not a category bar chart.
  const bars = [8, 14, 22, 34, 46, 52, 50, 42, 30, 20, 12, 7]
  return (
    <svg className="h-full w-full" viewBox="0 0 100 60" preserveAspectRatio="none">
      {bars.map((h, i) => (
        <rect key={i} x={i * 8 + 2} y={58 - h} width="7.5" height={h} fill={GRAY.mid} />
      ))}
      <line x1="0" y1="58" x2="100" y2="58" stroke={GRAY.mid} strokeWidth="1"
        vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function BoxPlotPlaceholder() {
  // Three vertical box-and-whisker plots. [cx, whiskerTop, q3, median, q1, whiskerBottom].
  const groups = [
    [22, 10, 20, 28, 38, 50],
    [50, 6, 16, 22, 34, 46],
    [78, 14, 24, 30, 40, 54],
  ]
  return (
    <svg className="h-full w-full" viewBox="0 0 100 60" preserveAspectRatio="none">
      {groups.map(([cx, wTop, q3, med, q1, wBot], i) => (
        <g key={i}>
          <line x1={cx} y1={wTop} x2={cx} y2={wBot} stroke={GRAY.mid} strokeWidth="1"
            vectorEffect="non-scaling-stroke" />
          <line x1={cx - 5} y1={wTop} x2={cx + 5} y2={wTop} stroke={GRAY.mid} strokeWidth="1"
            vectorEffect="non-scaling-stroke" />
          <line x1={cx - 5} y1={wBot} x2={cx + 5} y2={wBot} stroke={GRAY.mid} strokeWidth="1"
            vectorEffect="non-scaling-stroke" />
          <rect x={cx - 9} y={q3} width="18" height={q1 - q3} fill={GRAY.light}
            stroke={GRAY.dark} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1={cx - 9} y1={med} x2={cx + 9} y2={med} stroke={GRAY.dark} strokeWidth="1.2"
            vectorEffect="non-scaling-stroke" />
        </g>
      ))}
    </svg>
  )
}

const HEAT_SHADES = ['#f0f1f3', '#e5e7eb', '#c9cdd4', '#b6bcc6', '#9ca3af', '#6b7280']
const HEAT_ROWS = [
  [1, 2, 3, 4, 3, 2, 1, 0],
  [2, 3, 4, 5, 4, 3, 2, 1],
  [3, 4, 5, 5, 5, 4, 3, 2],
  [2, 3, 4, 5, 4, 3, 2, 1],
  [1, 2, 3, 4, 3, 2, 1, 0],
]

function HeatmapPlaceholder() {
  // A grid of cells shaded by intensity — one grayscale ramp, blob in the
  // middle. Colour would invite palette bikeshedding (principle #1).
  return (
    <svg className="h-full w-full" viewBox="0 0 100 60" preserveAspectRatio="none">
      {HEAT_ROWS.map((row, r) =>
        row.map((v, c) => (
          <rect key={`${r}-${c}`} x={c * 12.5 + 0.5} y={r * 12 + 0.5} width="11.5" height="11"
            fill={HEAT_SHADES[v]} />
        )),
      )}
    </svg>
  )
}

function DonutPlaceholder() {
  // A donut ring split into three grayscale slices. Circumference of an r=18
  // circle is ~113.1; each slice is a dash of that length, offset so they sit
  // end to end. Rotated -90° so the first slice starts at twelve o'clock.
  const C = 113.097
  const slices = [
    { len: 50.89, off: 0, color: GRAY.dark }, // ~45%
    { len: 39.58, off: -50.89, color: GRAY.mid }, // ~35%
    { len: 22.62, off: -90.48, color: GRAY.light }, // ~20%
  ]
  return (
    <svg className="h-full w-full" viewBox="0 0 100 60">
      <g transform="rotate(-90 50 30)" fill="none" strokeWidth="11">
        {slices.map((s, i) => (
          <circle
            key={i}
            cx="50"
            cy="30"
            r="18"
            stroke={s.color}
            strokeDasharray={`${s.len} ${C - s.len}`}
            strokeDashoffset={s.off}
          />
        ))}
      </g>
    </svg>
  )
}

function TabsPlaceholder() {
  // A Superset-style in-page Tabs element: a strip of tab labels over an empty
  // region. A placeholder only — it names the tabs and shows the shape, but it
  // does not host real child components.
  const tabs = ['Tab A', 'Tab B', 'Tab C']
  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-gray-200 text-[11px]">
        {tabs.map((t, i) => (
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

function TextPlaceholder() {
  const widths = ['92%', '84%', '96%', '60%']
  return (
    <div className="flex h-full flex-col gap-2 pt-1">
      {widths.map((w, i) => (
        <div key={i} className="h-2 rounded bg-gray-200" style={{ width: w }} />
      ))}
    </div>
  )
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
    Placeholder: TimeSeriesPlaceholder,
  },
  bar: {
    label: 'Bar',
    key: '3',
    defaultTitle: 'Breakdown by category',
    defaultSize: { w: 6, h: 6 },
    Placeholder: BarPlaceholder,
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
    Placeholder: DonutPlaceholder,
  },
  combo: {
    label: 'Combo (bar + line)',
    defaultTitle: 'Two measures, dual axis',
    defaultSize: { w: 6, h: 6 },
    Placeholder: ComboPlaceholder,
  },
  scatter: {
    label: 'Scatter',
    defaultTitle: 'Correlation',
    defaultSize: { w: 6, h: 6 },
    Placeholder: ScatterPlaceholder,
  },
  funnel: {
    label: 'Funnel',
    defaultTitle: 'Conversion steps',
    defaultSize: { w: 4, h: 6 },
    Placeholder: FunnelPlaceholder,
  },
  waterfall: {
    label: 'Waterfall',
    defaultTitle: 'Contribution to change',
    defaultSize: { w: 6, h: 6 },
    Placeholder: WaterfallPlaceholder,
  },
  histogram: {
    label: 'Histogram',
    defaultTitle: 'Distribution',
    defaultSize: { w: 6, h: 6 },
    Placeholder: HistogramPlaceholder,
  },
  boxplot: {
    label: 'Box plot',
    defaultTitle: 'Spread by group',
    defaultSize: { w: 6, h: 6 },
    Placeholder: BoxPlotPlaceholder,
  },
  heatmap: {
    label: 'Heatmap',
    defaultTitle: 'Intensity grid',
    defaultSize: { w: 6, h: 6 },
    Placeholder: HeatmapPlaceholder,
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
  'tabs',
  'section',
]

// Reverse lookup for the number-key shortcuts. Only the keyed five are here,
// so a search-only type can never be triggered by a stray digit.
export const TYPE_BY_KEY = Object.fromEntries(
  TYPE_ORDER.map((type) => [COMPONENT_TYPES[type].key, type]),
)
