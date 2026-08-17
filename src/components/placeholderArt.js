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

// The mirror of `baseline` for charts whose categories run down the left rather
// than along the bottom — a horizontal bar chart's axis.
const AXIS_X = 2
const leftAxis = (stroke) => [
  'line',
  { x1: AXIS_X, y1: 0, x2: AXIS_X, y2: 60, stroke, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' },
]

const cartesian = (shapes) => ({ viewBox: '0 0 100 60', stretch: true, shapes })

// Segment heights are fractions of a bar's total, so rounding keeps float noise
// (`15.299999999999999`) out of the markup.
const round2 = (n) => Number(n.toFixed(2))

// --- the drawings ---

// The nine sample points every time-series variant is drawn from. Two series:
// TS_UPPER is the larger one throughout (smaller y is higher on the chart), so
// filling it first and the smaller one over the top never leaves a hole.
const TS_X = [0, 12, 24, 36, 48, 60, 72, 84, 100]
const TS_UPPER = [48, 40, 44, 28, 32, 20, 24, 12, 8]
const TS_LOWER = [54, 52, 50, 46, 48, 40, 42, 36, 30]

const pts = (ys) => ys.map((y, i) => `${TS_X[i]},${y}`).join(' ')
// A series closed down to the baseline: the filled shape of an area chart.
const areaPts = (ys) => `${pts(ys)} 100,${BASE_Y} 0,${BASE_Y}`
// The band between two series — the upper edge left to right, then back along
// the lower edge. This is what makes a stack read as stacked rather than
// overlapping: each band sits on the one below instead of starting at zero.
const bandPts = (top, bottom) =>
  `${pts(top)} ${bottom.map((y, i) => `${TS_X[i]},${y}`).reverse().join(' ')}`

const gridlines = [15, 30, 45].map((y) => [
  'line',
  { x1: 0, y1: y, x2: 100, y2: y, stroke: GRAY.light, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' },
])

const seriesLine = (ys, stroke, dashed) => [
  'polyline',
  {
    points: pts(ys),
    fill: 'none',
    stroke,
    strokeWidth: 2,
    ...(dashed ? { strokeDasharray: '4 3' } : {}),
    vectorEffect: 'non-scaling-stroke',
  },
]

const TIMESERIES = cartesian([
  ...gridlines,
  seriesLine(TS_UPPER, GRAY.dark, false),
  seriesLine(TS_LOWER, GRAY.mid, true),
  baseline(GRAY.mid),
])

// The same two series filled to the baseline — magnitude over time rather than
// only the shape of the trend. The larger series goes down first so the smaller
// one reads as sitting in front of it, not as a gap.
const TIMESERIES_AREA = cartesian([
  ...gridlines,
  ['polygon', { points: areaPts(TS_UPPER), fill: GRAY.light }],
  ['polygon', { points: areaPts(TS_LOWER), fill: GRAY.mid }],
  seriesLine(TS_UPPER, GRAY.dark, false),
  baseline(GRAY.mid),
])

// Stacked: the top edge is the total, and each band is one series' share of it.
// Its own points rather than the two above, because stacking those would put
// the total well outside the viewBox.
const TS_STACK_LOWER = [50, 48, 46, 44, 45, 42, 40, 41, 38]
const TS_STACK_TOTAL = [38, 32, 28, 24, 26, 20, 16, 18, 12]

const TIMESERIES_STACKED = cartesian([
  ...gridlines,
  ['polygon', { points: areaPts(TS_STACK_LOWER), fill: GRAY.mid }],
  ['polygon', { points: bandPts(TS_STACK_TOTAL, TS_STACK_LOWER), fill: GRAY.light }],
  seriesLine(TS_STACK_TOTAL, GRAY.dark, false),
  baseline(GRAY.mid),
])

const BAR_HEIGHTS = [34, 46, 26, 52, 40, 56, 30]

const BAR = cartesian([
  ...BAR_HEIGHTS.map((h, i) => [
    'rect',
    { x: i * 14 + 2, y: BASE_Y - h, width: 10, height: h, fill: GRAY.mid },
  ]),
  baseline(GRAY.dark),
])

// Ranked left-to-right bars off a left-hand axis. Descending on purpose: a
// horizontal bar chart is what you reach for when the categories have long
// names and the point is the ranking.
const BAR_HORIZONTAL = cartesian([
  ...[88, 72, 60, 45, 33, 20].map((w, i) => [
    'rect',
    { x: AXIS_X, y: i * 10 + 1.5, width: w, height: 7, fill: GRAY.mid },
  ]),
  leftAxis(GRAY.dark),
])

// Same bars as the vertical chart, each cut into three parts stacked bottom-up:
// one bar is a whole, and the parts are its composition.
const STACK_PARTS = [0.45, 0.35, 0.2]
const STACK_FILLS = [GRAY.dark, GRAY.mid, GRAY.light]

const BAR_STACKED = cartesian([
  ...BAR_HEIGHTS.flatMap((total, i) => {
    let below = 0
    return STACK_PARTS.map((share, s) => {
      const height = round2(total * share)
      const y = round2(BASE_Y - below - height)
      below = round2(below + height)
      return ['rect', { x: i * 14 + 2, y, width: 10, height, fill: STACK_FILLS[s] }]
    })
  }),
  baseline(GRAY.dark),
])

// Two series side by side per category — the same measure split by a second
// dimension, compared rather than summed.
const GROUP_A = [40, 52, 30, 46, 36]
const GROUP_B = [28, 38, 44, 25, 50]

const BAR_GROUPED = cartesian([
  ...GROUP_A.flatMap((a, i) => {
    const x = i * 20 + 3
    const b = GROUP_B[i]
    return [
      ['rect', { x, y: BASE_Y - a, width: 7, height: a, fill: GRAY.dark }],
      ['rect', { x: x + 8, y: BASE_Y - b, width: 7, height: b, fill: GRAY.mid }],
    ]
  }),
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

const dots = (points) =>
  points.map(([cx, cy]) => ['circle', { cx, cy, r: 0.9, fill: GRAY.dark, opacity: 0.6 }])

const SCATTER = cartesian([...dots(SCATTER_PTS), baseline(GRAY.mid)])

// Least-squares fit, computed rather than drawn by eye, so the line actually
// follows the cloud — and keeps following it if the points are ever changed.
function fitLine(points) {
  const n = points.length
  const mx = points.reduce((sum, [x]) => sum + x, 0) / n
  const my = points.reduce((sum, [, y]) => sum + y, 0) / n
  const slope =
    points.reduce((sum, [x, y]) => sum + (x - mx) * (y - my), 0) /
    points.reduce((sum, [x]) => sum + (x - mx) ** 2, 0)
  const at = (x) => round2(my + slope * (x - mx))
  return { x1: 0, y1: at(0), x2: 100, y2: at(100) }
}

// The same cloud with the relationship drawn in — "is there a correlation" is a
// different question from "what does the spread look like".
const SCATTER_TREND = cartesian([
  ...dots(SCATTER_PTS),
  [
    'line',
    {
      ...fitLine(SCATTER_PTS),
      stroke: GRAY.dark,
      strokeWidth: 1.5,
      strokeDasharray: '5 3',
      vectorEffect: 'non-scaling-stroke',
    },
  ],
  baseline(GRAY.mid),
])

// Bubble: fewer marks, and a third measure carried by their size. Thinned out
// because eighteen sized marks on a card this small overlap into a blob.
const BUBBLE_PTS = [
  [14, 46, 2.2], [24, 40, 3.4], [33, 50, 1.6], [42, 34, 4.2], [50, 44, 2.6],
  [59, 28, 3], [68, 38, 4.8], [78, 24, 2], [88, 32, 3.6],
]

const SCATTER_BUBBLE = cartesian([
  ...BUBBLE_PTS.map(([cx, cy, r]) => [
    'circle',
    { cx, cy, r, fill: GRAY.mid, stroke: GRAY.dark, strokeWidth: 0.5, vectorEffect: 'non-scaling-stroke' },
  ]),
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

// The calendar form: one column per week, one row per weekday, shaded by
// intensity — the shape everyone knows from a contribution graph. A different
// question from the grid: "when did this happen" rather than "which pair is hot".
// Written as one digit per day so the pattern is readable and tunable in source;
// weekends (the last two rows) run quieter, which is what makes it read as real.
const CALENDAR_ROWS = [
  '01223104512230114023',
  '12334215023341225134',
  '23445320134452330245',
  '12335421245351241353',
  '01224310123240132042',
  '00112200011230021031',
  '00011100001120010020',
]

const HEATMAP_CALENDAR = cartesian(
  CALENDAR_ROWS.flatMap((row, r) =>
    [...row].map((ch, c) => [
      'rect',
      {
        x: c * 5 + 0.4,
        y: r * 8.5 + 0.5,
        width: 4.2,
        height: 7.5,
        fill: HEAT_SHADES[Number(ch)],
      },
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

// The same three slices as a solid pie. Same trick as the donut, but with the
// stroke made twice the radius so the "ring" closes over the middle: r=12 with
// an 24-wide stroke fills a disc of radius 24. Circumference of r=12 is ~75.4.
//
// Its numbers are written out rather than derived from the donut's, so the donut
// keeps rendering byte-for-byte what it always has. The 45/35/20 split is the
// same, and the harness checks that the two agree on it.
const PIE_C = 75.398
const pieGap = (len) => Number((PIE_C - len).toFixed(2))

const PIE = {
  viewBox: '0 0 100 60',
  stretch: false,
  shapes: [
    [
      'g',
      { transform: 'rotate(-90 50 30)', fill: 'none', strokeWidth: 24 },
      [
        [33.93, 0, GRAY.dark], // ~45%
        [26.39, -33.93, GRAY.mid], // ~35%
        [15.08, -60.32, GRAY.light], // ~20%
      ].map(([len, offset, stroke]) => [
        'circle',
        {
          cx: 50,
          cy: 30,
          r: 12,
          stroke,
          strokeDasharray: `${len} ${pieGap(len)}`,
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
  // The bar entry is the default (first) variant; see VARIANTS below.
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

// --- variants ---
//
// A type listed here can be drawn more than one way, and which way is a real
// requirement rather than decoration: a horizontal bar chart says the categories
// have long names and the point is the ranking; a stacked one says composition.
// That belongs in the export, so a component carries an optional `variant`.
//
// Only types with a choice appear here — the rest keep their single `ART` entry
// and gain no ceremony. The first entry is the default, and it is the *same
// drawing* the type has always had, so a document written before variants
// existed renders exactly as it did.

// A variant carries `art` when it is a different drawing, and `parts` when it is
// the same content with pieces left out. The KPI is the second kind: it is text
// and layout rather than a silhouette, so its markup is written separately on
// each side (the export ships no Tailwind) and only *which pieces are present*
// is shared — the same arrangement as TABLE and PIVOT below.
export const VARIANTS = {
  // Line is the trend; area adds magnitude; stacked area says composition over
  // time, which is a different question rather than a different look.
  timeseries: [
    { id: 'line', label: 'Line', art: TIMESERIES },
    { id: 'area', label: 'Area', art: TIMESERIES_AREA },
    { id: 'stacked', label: 'Stacked area', art: TIMESERIES_STACKED },
  ],
  // A donut leaves room for a total in the middle; a solid circle does not.
  // Labelled "Full circle" rather than "Pie", so that the export does not read
  // "Pie / Donut (pie)" — the type is already called Pie / Donut.
  pie: [
    { id: 'donut', label: 'Donut', art: DONUT },
    { id: 'pie', label: 'Full circle', art: PIE },
  ],
  // Grid asks which pair of dimensions is hot; calendar asks when it happened.
  heatmap: [
    { id: 'grid', label: 'Grid', art: HEATMAP },
    { id: 'calendar', label: 'Calendar', art: HEATMAP_CALENDAR },
  ],
  // Plain shows the spread; trend line answers "is there a correlation";
  // bubble carries a third measure in the mark size.
  scatter: [
    { id: 'plain', label: 'Plain', art: SCATTER },
    { id: 'trend', label: 'With trend line', art: SCATTER_TREND },
    { id: 'bubble', label: 'Bubble', art: SCATTER_BUBBLE },
  ],
  bar: [
    { id: 'vertical', label: 'Vertical', art: BAR },
    { id: 'horizontal', label: 'Horizontal', art: BAR_HORIZONTAL },
    { id: 'stacked', label: 'Stacked', art: BAR_STACKED },
    { id: 'grouped', label: 'Grouped', art: BAR_GROUPED },
  ],
  // How much context the number gets. A bare number needs half the height of one
  // with a sparkline under it, so this is a layout decision as much as a
  // presentational one — which is why it belongs in the export.
  //
  // Number-plus-delta is the default (Ivan's call, 2026-08-16): the sparkline is
  // the exception you ask for, not what every KPI starts as. Being first in the
  // list also makes it what a KPI with no `variant` renders, so KPI cards in
  // documents written before variants existed show no sparkline either.
  kpi: [
    { id: 'delta', label: 'With delta', parts: { delta: true, spark: false } },
    { id: 'trend', label: 'With trend', parts: { delta: true, spark: true } },
    { id: 'plain', label: 'Number only', parts: { delta: false, spark: false } },
  ],
}

export function variantsFor(type) {
  return VARIANTS[type] ?? []
}

// The variant entry to use. A type with no variants, an absent `variant`, or an
// id this build does not know (an imported file from a later version) all fall
// back to the type's default rather than rendering nothing.
function entryFor(type, variant) {
  const list = VARIANTS[type]
  if (!list) return null
  return list.find((v) => v.id === variant) ?? list[0]
}

// The drawing to use.
export function artFor(type, variant) {
  return entryFor(type, variant)?.art ?? ART[type]
}

// Which pieces of a composed placeholder to render — see `parts` above. Null for
// types whose variants are drawings rather than compositions.
export function variantParts(type, variant) {
  return entryFor(type, variant)?.parts ?? null
}

// Null when the variant is absent or is the default, so an untouched bar reads
// as plain "Bar" everywhere rather than suddenly gaining a "(vertical)" suffix.
export function variantLabel(type, variant) {
  const list = VARIANTS[type]
  if (!list) return null
  const hit = entryFor(type, variant)
  return hit === list[0] ? null : hit.label
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
  // A dimension's bar is wider than a measure's — the values are names rather
  // than numbers.
  barWidth: (role) => (role === 'dimension' ? 80 : 55),
}

// --- a table's columns ---
//
// A chart's structure is its silhouette. A table has none: its structure *is*
// the column list, which is why "Detail table" plus a grey grid tells a BI
// developer nothing and everything ends up as prose in the description. So a
// table's columns are real spec, held in `component.spec.columns`:
//
//   { name: 'Revenue', role: 'measure', format: '$1,234' }
//
// The values stay grey bars. A format sample says "currency", "count", "percent
// to one decimal" in one field, without the card pretending to hold real data —
// which would move the conversation onto numbers someone invented.

export const COLUMN_ROLES = ['dimension', 'measure']

// What a table shows before anyone has named anything: the headings it has
// always had, first column a dimension and the rest measures.
const FALLBACK_COLUMNS = TABLE.columns.map((name, i) => ({
  name,
  role: i === 0 ? 'dimension' : 'measure',
  format: '',
}))

// Normalised, so neither renderer has to defend against a half-written column
// from a hand-edited or newer file.
export function tableColumns(spec) {
  const cols = spec?.columns
  if (!Array.isArray(cols) || cols.length === 0) return FALLBACK_COLUMNS
  return cols.map((c) => ({
    name: c?.name ?? '',
    role: c?.role === 'dimension' ? 'dimension' : 'measure',
    format: c?.format ?? '',
  }))
}

// A dimension column is wider: it holds names, not numbers. For the fallback
// this is `1.4fr 1fr 1fr 1fr`, which is what `1.4fr repeat(3, 1fr)` has always
// resolved to.
export const columnTemplate = (columns) =>
  columns.map((c) => (c.role === 'dimension' ? '1.4fr' : '1fr')).join(' ')

// The format row is only worth its vertical space once something is in it.
export const hasFormats = (columns) => columns.some((c) => c.format)

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
