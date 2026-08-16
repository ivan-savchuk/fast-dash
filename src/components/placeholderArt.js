// The placeholder drawings, described once.
//
// Every chart placeholder used to be written twice — once as JSX in
// `registry.jsx` for the canvas, once as an HTML string in `io/htmlExport.js`
// for the export. Same coordinates, same shades, two copies, and they had
// already drifted apart. This file is the single description; each side turns
// it into its own kind of markup:
//
//   canvas  → <SvgArt> in registry.jsx  (React elements)
//   export  → artToHtml() in io/htmlExport.js  (a plain string)
//
// A drawing is `{ viewBox, stretch, shapes }`. A shape is a `[tag, attrs]`
// pair, or `[tag, attrs, children]` for a group. Attribute names are written
// the way JSX needs them (`strokeWidth`), and the export converts them to the
// way HTML needs them (`stroke-width`) — one mechanical rule, not two lists.
//
// `stretch: true` emits `preserveAspectRatio="none"`, which lets the drawing
// squash to whatever shape the card is. It is on for everything except the
// donut, whose circle would turn into an oval.
//
// Placeholders stay grayscale on purpose: colour invites arguments about
// palettes instead of about layout (design principle #1).

export const GRAY = { dark: '#9ca3af', mid: '#c9cdd4', light: '#e5e7eb' }

// Charts that sit on an axis share this baseline: same y, same full width, so
// two of them placed side by side line up.
const BASE_Y = 58
const baseline = (stroke) => [
  'line',
  { x1: 0, y1: BASE_Y, x2: 100, y2: BASE_Y, stroke, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' },
]

const cartesian = (shapes) => ({ viewBox: '0 0 100 60', stretch: true, shapes })

// --- the drawings ---

const TIMESERIES = cartesian([
  // gridlines
  ...[15, 30, 45].map((y) => [
    'line',
    { x1: 0, y1: y, x2: 100, y2: y, stroke: GRAY.light, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' },
  ]),
  [
    'polyline',
    {
      points: '0,48 12,40 24,44 36,28 48,32 60,20 72,24 84,12 100,8',
      fill: 'none',
      stroke: GRAY.dark,
      strokeWidth: 2,
      vectorEffect: 'non-scaling-stroke',
    },
  ],
  [
    'polyline',
    {
      points: '0,54 12,52 24,50 36,46 48,48 60,40 72,42 84,36 100,30',
      fill: 'none',
      stroke: GRAY.mid,
      strokeWidth: 2,
      strokeDasharray: '4 3',
      vectorEffect: 'non-scaling-stroke',
    },
  ],
  baseline(GRAY.mid),
])

const BAR = cartesian([
  ...[34, 46, 26, 52, 40, 56, 30].map((h, i) => [
    'rect',
    { x: i * 14 + 2, y: BASE_Y - h, width: 10, height: h, fill: GRAY.mid },
  ]),
  baseline(GRAY.dark),
])

const COMBO = cartesian([
  ...[30, 44, 26, 50, 38, 54].map((h, i) => [
    'rect',
    { x: i * 16 + 5, y: BASE_Y - h, width: 10, height: h, fill: GRAY.light },
  ]),
  [
    'polyline',
    {
      points: '10,38 26,28 42,42 58,18 74,26 90,10',
      fill: 'none',
      stroke: GRAY.dark,
      strokeWidth: 2,
      vectorEffect: 'non-scaling-stroke',
    },
  ],
  baseline(GRAY.mid),
])

// An irregular cloud, drawn edge-to-edge so it fills the card rather than
// leaving blank margins. The dots are kept small so the stretch reads as a
// scatter, not as ovals.
const SCATTER_PTS = [
  [12, 45], [18, 50], [21, 38], [27, 47], [31, 53], [36, 35],
  [41, 44], [44, 30], [49, 48], [55, 33], [58, 41], [63, 44],
  [67, 26], [72, 36], [76, 23], [81, 31], [86, 20], [92, 29],
]

const SCATTER = cartesian([
  ...SCATTER_PTS.map(([cx, cy]) => ['circle', { cx, cy, r: 0.9, fill: GRAY.dark, opacity: 0.6 }]),
  baseline(GRAY.mid),
])

// Centred bars narrowing downward — reads as a funnel without the trapezoid
// maths, and stays grayscale.
const FUNNEL = cartesian(
  [
    [92, GRAY.light],
    [74, GRAY.mid],
    [58, GRAY.dark],
    [42, GRAY.mid],
    [26, GRAY.light],
  ].map(([w, fill], i) => ['rect', { x: 50 - w / 2, y: 4 + i * 11, width: w, height: 8, fill }]),
)

// Floating bars stepping up, with the start and total as full pillars.
const WATERFALL = cartesian([
  ...[
    [6, 34, 22, GRAY.dark],
    [22, 24, 10, GRAY.mid],
    [38, 24, 8, GRAY.mid],
    [54, 16, 8, GRAY.mid],
    [70, 16, 6, GRAY.mid],
    [86, 10, 46, GRAY.dark],
  ].map(([x, y, height, fill]) => ['rect', { x, y, width: 10, height, fill }]),
  baseline(GRAY.mid),
])

// Contiguous bars in a rough bell — a distribution, not a category bar chart.
const HISTOGRAM = cartesian([
  ...[8, 14, 22, 34, 46, 52, 50, 42, 30, 20, 12, 7].map((h, i) => [
    'rect',
    { x: i * 8 + 2, y: BASE_Y - h, width: 7.5, height: h, fill: GRAY.mid },
  ]),
  baseline(GRAY.mid),
])

// Three vertical box-and-whisker plots.
// [centre, whiskerTop, q3, median, q1, whiskerBottom]
const BOXPLOT = cartesian(
  [
    [22, 10, 20, 28, 38, 50],
    [50, 6, 16, 22, 34, 46],
    [78, 14, 24, 30, 40, 54],
  ].map(([cx, wTop, q3, med, q1, wBot]) => [
    'g',
    {},
    [
      ['line', { x1: cx, y1: wTop, x2: cx, y2: wBot, stroke: GRAY.mid, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }],
      ['line', { x1: cx - 5, y1: wTop, x2: cx + 5, y2: wTop, stroke: GRAY.mid, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }],
      ['line', { x1: cx - 5, y1: wBot, x2: cx + 5, y2: wBot, stroke: GRAY.mid, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }],
      ['rect', { x: cx - 9, y: q3, width: 18, height: q1 - q3, fill: GRAY.light, stroke: GRAY.dark, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }],
      ['line', { x1: cx - 9, y1: med, x2: cx + 9, y2: med, stroke: GRAY.dark, strokeWidth: 1.2, vectorEffect: 'non-scaling-stroke' }],
    ],
  ]),
)

// A grid of cells shaded by intensity — one grayscale ramp, blob in the middle.
const HEAT_SHADES = ['#f0f1f3', '#e5e7eb', '#c9cdd4', '#b6bcc6', '#9ca3af', '#6b7280']
const HEAT_ROWS = [
  [1, 2, 3, 4, 3, 2, 1, 0],
  [2, 3, 4, 5, 4, 3, 2, 1],
  [3, 4, 5, 5, 5, 4, 3, 2],
  [2, 3, 4, 5, 4, 3, 2, 1],
  [1, 2, 3, 4, 3, 2, 1, 0],
]

const HEATMAP = cartesian(
  HEAT_ROWS.flatMap((row, r) =>
    row.map((v, c) => [
      'rect',
      { x: c * 12.5 + 0.5, y: r * 12 + 0.5, width: 11.5, height: 11, fill: HEAT_SHADES[v] },
    ]),
  ),
)

// An abstract landmass split into regions — deliberately not real geography,
// which would only invite "that's not where Texas is" over the layout question.
const MAP_REGIONS = [
  '10,20 30,12 34,30 18,38 8,32',
  '30,12 52,10 50,28 34,30',
  '52,10 74,14 78,30 58,32 50,28',
  '18,38 34,30 46,40 40,52 20,50',
  '34,30 50,28 58,32 60,44 46,40',
  '58,32 78,30 88,40 74,52 60,44',
]
const MAP_SHADES = [GRAY.light, GRAY.mid, GRAY.dark, GRAY.mid, GRAY.light, GRAY.dark]
const MAP_POINTS = [[24, 24], [41, 19], [60, 20], [71, 34], [46, 37], [29, 45], [65, 43]]

const CHOROPLETH = cartesian(
  MAP_REGIONS.map((points, i) => [
    'polygon',
    { points, fill: MAP_SHADES[i], stroke: '#fff', strokeWidth: 0.8, vectorEffect: 'non-scaling-stroke' },
  ]),
)

const POINTMAP = cartesian([
  ...MAP_REGIONS.map((points) => [
    'polygon',
    { points, fill: GRAY.light, stroke: GRAY.mid, strokeWidth: 0.8, vectorEffect: 'non-scaling-stroke' },
  ]),
  ...MAP_POINTS.map(([cx, cy]) => ['circle', { cx, cy, r: 1.6, fill: GRAY.dark, opacity: 0.75 }]),
])

// A donut ring split into three grayscale slices. Circumference of an r=18
// circle is ~113.1; each slice is a dash of that length, offset so they sit end
// to end. Rotated -90° so the first slice starts at twelve o'clock. This is the
// one drawing that does not stretch — an oval donut reads as a mistake.
//
// The gap is rounded to two decimals: unrounded it serialises as
// `62.206999999999994`, which is float noise, not precision.
const DONUT_C = 113.097
const gap = (len) => Number((DONUT_C - len).toFixed(2))
const DONUT = {
  viewBox: '0 0 100 60',
  stretch: false,
  shapes: [
    [
      'g',
      { transform: 'rotate(-90 50 30)', fill: 'none', strokeWidth: 11 },
      [
        [50.89, 0, GRAY.dark], // ~45%
        [39.58, -50.89, GRAY.mid], // ~35%
        [22.62, -90.48, GRAY.light], // ~20%
      ].map(([len, offset, stroke]) => [
        'circle',
        {
          cx: 50,
          cy: 30,
          r: 18,
          stroke,
          strokeDasharray: `${len} ${gap(len)}`,
          strokeDashoffset: offset,
        },
      ]),
    ],
  ],
}

// The KPI sparkline. The rest of a KPI card is text and layout, not a drawing,
// so only the line itself lives here.
export const KPI_SPARK = {
  viewBox: '0 0 100 20',
  stretch: true,
  shapes: [
    [
      'polyline',
      {
        points: '0,16 14,12 28,14 42,8 56,10 70,5 84,7 100,2',
        fill: 'none',
        stroke: GRAY.dark,
        strokeWidth: 1.5,
        vectorEffect: 'non-scaling-stroke',
      },
    ],
  ],
}

// Keyed by component type. Only the types whose placeholder is pure drawing —
// the rest (KPI, table, pivot, text, tabs, section) are text and boxes, and
// they are built from CSS on each side because the export ships no Tailwind.
export const ART = {
  timeseries: TIMESERIES,
  bar: BAR,
  combo: COMBO,
  scatter: SCATTER,
  funnel: FUNNEL,
  waterfall: WATERFALL,
  histogram: HISTOGRAM,
  boxplot: BOXPLOT,
  heatmap: HEATMAP,
  choropleth: CHOROPLETH,
  pointmap: POINTMAP,
  pie: DONUT,
}

// --- shared numbers for the placeholders that are boxes rather than drawings ---
//
// Their markup genuinely differs between the two sides (Tailwind classes on the
// canvas, hand-written CSS in the export), but the *content* should not. These
// are the values both sides read.

export const KPI_TEXT = { value: '1,234', delta: '▲ 12.5% vs. prior period' }

export const TABLE = {
  columns: ['Dimension', 'Measure 1', 'Measure 2', 'Measure 3'],
  rows: 5,
  // First column is the dimension, so its bar is wider than the measures'.
  barWidth: (col) => (col === 0 ? 80 : 55),
}

// A crosstab: a wider row-header column with indented sub-rows (the second row
// dimension), right-aligned value bars, and a bold totals row. The indent and
// the totals row are what separate it from the plain Table placeholder.
export const PIVOT = {
  cols: 4,
  indents: [0, 1, 1, 0, 1],
  indentPx: 14,
  headWidth: (indent) => (indent ? 55 : 75),
  cellWidth: (row, col) => 45 + ((row + col) % 3) * 15,
  totalWidth: (col) => 55 + (col % 2) * 15,
}

export const TEXT_LINES = ['92%', '84%', '96%', '60%']

export const TABS_LABELS = ['Tab A', 'Tab B', 'Tab C']
