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

// The colour on the canvas. A dashboard picks a global scheme and these resolve
// to its ramp; with no scheme they resolve to the greys the drawings have always
// used, so an untouched document is unchanged.
//
// They are CSS custom properties rather than values threaded through the
// renderers, so switching scheme repaints without rebuilding any drawing and
// neither renderer has to know that schemes exist. The export ships the same
// properties (it already does this for a table's `--cols`).
//
// **Data marks take the ramp; axes do not.** `GRAY.dark` is not a stand-in for
// "the data" — it is the series in the time series, but the *baseline* in the
// bar charts, whose bars are `GRAY.mid`. So the split is by role, not by shade:
// every mark that stands for a value uses a ramp step, while `baseline`,
// `leftAxis` and the gridlines stay grey. Colouring those would read as a
// mistake, and it is the only thing keeping a themed card from looking like a
// poster.
//
// Six steps, light to dark. Under a scheme each resolves to that scheme's ramp;
// with no scheme each falls back to the exact grey its own marks always used, so
// an unthemed document is unchanged. **Every step carries its own fallback** —
// one shared token would have to pick a single grey and would quietly restyle
// everything else. An earlier version did exactly that and gave every bar chart
// darker bars in neutral mode.
//
// Each scheme's ramp is computed rather than eyeballed: same hue, monotonically
// decreasing lightness, and **step 5 is the accent itself, verbatim**, so the
// single-accent look that shipped first is untouched by the ramp arriving.
const step = (n, fallback) => `var(--fd-a${n}, ${fallback})`

export const RAMP = [
  step(1, '#f0f1f3'),
  step(2, GRAY.light),
  step(3, GRAY.mid),
  step(4, '#b6bcc6'),
  step(5, GRAY.dark),
  step(6, '#6b7280'),
]

// Named steps, because most drawings want "the mark" rather than "step five".
export const ACCENT = RAMP[4]
export const ACCENT_MID = RAMP[2]
export const ACCENT_FILL = RAMP[1]

// **A chart with no parts wears the accent, not a ramp step.**
//
// The ramp exists to tell parts apart — stacked segments, two series, a
// heatmap's intensities. A plain bar chart has no parts: every bar means the
// same thing. Putting it on a middle step just makes it a washed-out tint of
// the colour it should be wearing, which is what happened when the ramp first
// landed and is the reason this token exists.
//
// It points at `--fd-accent` rather than `--fd-a5` only for readability — the
// two are the same colour by construction. The fallback is `GRAY.mid`, because
// that is what a bar fill has always been with no scheme set; `ACCENT` falls
// back to `GRAY.dark` and would quietly darken every neutral bar chart.
export const ACCENT_SOLID = `var(--fd-accent, ${GRAY.mid})`

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

// Maps scale uniformly and crop, rather than stretching to the card's shape.
// Two reasons: a stretched map reads as wrong in a way a stretched bar chart
// does not, and — the practical one — under a uniform scale a `<circle>` is
// still a circle, so the markers need no tricks. `slice` fills the card and
// lets the land bleed off the edges, which is what a real map does.
const mapView = (shapes) => ({
  viewBox: '0 0 100 60',
  stretch: true,
  fit: 'xMidYMid slice',
  shapes,
})

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
  seriesLine(TS_UPPER, ACCENT, false),
  seriesLine(TS_LOWER, ACCENT_MID, true),
  baseline(GRAY.mid),
])

// The same two series filled to the baseline — magnitude over time rather than
// only the shape of the trend. The larger series goes down first so the smaller
// one reads as sitting in front of it, not as a gap.
const TIMESERIES_AREA = cartesian([
  ...gridlines,
  ['polygon', { points: areaPts(TS_UPPER), fill: ACCENT_FILL }],
  ['polygon', { points: areaPts(TS_LOWER), fill: ACCENT_MID }],
  seriesLine(TS_UPPER, ACCENT, false),
  baseline(GRAY.mid),
])

// Stacked: the top edge is the total, and each band is one series' share of it.
// Its own points rather than the two above, because stacking those would put
// the total well outside the viewBox.
const TS_STACK_LOWER = [50, 48, 46, 44, 45, 42, 40, 41, 38]
const TS_STACK_TOTAL = [38, 32, 28, 24, 26, 20, 16, 18, 12]

const TIMESERIES_STACKED = cartesian([
  ...gridlines,
  ['polygon', { points: areaPts(TS_STACK_LOWER), fill: ACCENT_MID }],
  ['polygon', { points: bandPts(TS_STACK_TOTAL, TS_STACK_LOWER), fill: ACCENT_FILL }],
  seriesLine(TS_STACK_TOTAL, ACCENT, false),
  baseline(GRAY.mid),
])

const BAR_HEIGHTS = [34, 46, 26, 52, 40, 56, 30]

const BAR = cartesian([
  ...BAR_HEIGHTS.map((h, i) => [
    'rect',
    { x: i * 14 + 2, y: BASE_Y - h, width: 10, height: h, fill: ACCENT_SOLID },
  ]),
  baseline(GRAY.dark),
])

// Ranked left-to-right bars off a left-hand axis. Descending on purpose: a
// horizontal bar chart is what you reach for when the categories have long
// names and the point is the ranking.
const BAR_HORIZONTAL = cartesian([
  ...[88, 72, 60, 45, 33, 20].map((w, i) => [
    'rect',
    { x: AXIS_X, y: i * 10 + 1.5, width: w, height: 7, fill: ACCENT_SOLID },
  ]),
  leftAxis(GRAY.dark),
])

// Same bars as the vertical chart, each cut into three parts stacked bottom-up:
// one bar is a whole, and the parts are its composition.
const STACK_PARTS = [0.45, 0.35, 0.2]
const STACK_FILLS = [ACCENT, ACCENT_MID, ACCENT_FILL]

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
      ['rect', { x, y: BASE_Y - a, width: 7, height: a, fill: ACCENT }],
      ['rect', { x: x + 8, y: BASE_Y - b, width: 7, height: b, fill: ACCENT_MID }],
    ]
  }),
  baseline(GRAY.dark),
])

const COMBO = cartesian([
  ...[30, 44, 26, 50, 38, 54].map((h, i) => [
    'rect',
    { x: i * 16 + 5, y: BASE_Y - h, width: 10, height: h, fill: ACCENT_FILL },
  ]),
  [
    'polyline',
    {
      points: '10,38 26,28 42,42 58,18 74,26 90,10',
      fill: 'none',
      stroke: ACCENT,
      strokeWidth: 2,
      vectorEffect: 'non-scaling-stroke',
    },
  ],
  baseline(GRAY.mid),
])

// A dense cloud drawn edge to edge, the way a real scatter looks: enough marks
// that they overlap, so the shape of the distribution is what you read rather
// than the individual dots. Generated from a seeded draw against a downward
// slope (SVG y is inverted, so this is a positive correlation) and then written
// out, so it never moves again.
const SCATTER_PTS = [
  [6, 48], [11, 51], [11, 50], [16, 48], [17, 50], [18, 49], [18, 45], [19, 34],
  [21, 44], [23, 41], [24, 38], [27, 43], [29, 39], [31, 38], [34, 36], [34, 35],
  [35, 42], [38, 37], [39, 41], [42, 34], [44, 35], [45, 37], [47, 32], [49, 33],
  [53, 35], [53, 30], [56, 33], [60, 33], [60, 31], [60, 23], [62, 34], [62, 30],
  [62, 30], [63, 34], [64, 23], [64, 26], [65, 33], [65, 26], [66, 28], [66, 37],
  [67, 31], [77, 20], [79, 15], [85, 18], [85, 26], [86, 25],
]

// A dot is a **zero-length line with a round cap**, not a `<circle>`.
//
// These drawings stretch to whatever shape the card is (`preserveAspectRatio`
// is `none`), which turns a circle into an ellipse — measured at 4.17 wide to
// tall on a twelve-column card, and 0.28 on a narrow tall one. A zero-length
// subpath with `stroke-linecap: round` is drawn as a disc of the stroke's
// width, and `vector-effect: non-scaling-stroke` takes that width out of the
// stretched coordinate system, so the dot is round at every card shape and
// stays the same size on screen — which is how a real scatter behaves anyway.
// Verified by rasterising at four card shapes: constant, against a circle that
// tracked the stretch exactly.
//
// `size` is therefore in screen pixels, not viewBox units.
const dot = (cx, cy, size, color, opacity) => [
  'line',
  {
    x1: cx, y1: cy, x2: cx, y2: cy,
    stroke: color,
    strokeWidth: size,
    strokeLinecap: 'round',
    vectorEffect: 'non-scaling-stroke',
    ...(opacity == null ? {} : { opacity }),
  },
]

// Semi-transparent so overlaps darken, which is what makes a dense cloud read
// as density rather than as a smear.
const dots = (points) => points.map(([cx, cy]) => dot(cx, cy, 5, ACCENT, 0.5))

const SCATTER = cartesian([...dots(SCATTER_PTS), baseline(GRAY.mid)])

// Least-squares fit, computed rather than drawn by eye, so the line actually
// follows the cloud — and keeps following it if the points are ever changed.
function regression(points) {
  const n = points.length
  const mx = points.reduce((sum, [x]) => sum + x, 0) / n
  const my = points.reduce((sum, [, y]) => sum + y, 0) / n
  const Sxx = points.reduce((sum, [x]) => sum + (x - mx) ** 2, 0)
  const slope = points.reduce((sum, [x, y]) => sum + (x - mx) * (y - my), 0) / Sxx
  const at = (x) => my + slope * (x - mx)
  // Residual spread, and from it the standard error of the fitted mean — which
  // is smallest at the mean of x and grows toward the extremes. That is what
  // gives the band its hourglass waist; a plain wedge would be a lie about the
  // shape, and the waist is the part people recognise.
  const resid = Math.sqrt(points.reduce((s, [x, y]) => s + (y - at(x)) ** 2, 0) / (n - 2))
  const half = (x) => 1.96 * resid * Math.sqrt(1 / n + (x - mx) ** 2 / Sxx)
  return { at, half }
}

function fitLine(points) {
  const { at } = regression(points)
  return { x1: 0, y1: round2(at(0)), x2: 100, y2: round2(at(100)) }
}

// The confidence band, sampled along the fit and closed back along its lower
// edge.
function fitBand(points, steps = 10) {
  const { at, half } = regression(points)
  const xs = Array.from({ length: steps + 1 }, (_, i) => (100 * i) / steps)
  const edge = (sign) => xs.map((x) => `${round2(x)},${round2(at(x) + sign * half(x))}`)
  return [...edge(-1), ...edge(1).reverse()].join(' ')
}

// The same cloud with the relationship drawn in — "is there a correlation" is a
// different question from "what does the spread look like". Band first so the
// dots sit on top of it and the fit line on top of both.
const SCATTER_TREND = cartesian([
  ['polygon', { points: fitBand(SCATTER_PTS), fill: ACCENT, opacity: 0.16 }],
  ...dots(SCATTER_PTS),
  [
    'line',
    {
      ...fitLine(SCATTER_PTS),
      stroke: ACCENT,
      strokeWidth: 1.5,
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

// Bubbles suffer the stretch worst, being the biggest marks, so they are round
// caps too. Each is two of them: the outer disc is the outline colour and the
// inner one sits 2px inside it, which leaves a 1px ring — the separation that
// stops overlapping bubbles merging into one blob. Sizes are screen pixels.
const SCATTER_BUBBLE = cartesian([
  ...BUBBLE_PTS.flatMap(([cx, cy, r]) => {
    const size = round2(r * 3.4)
    return [dot(cx, cy, size, ACCENT), dot(cx, cy, size - 2, ACCENT_MID)]
  }),
  baseline(GRAY.mid),
])

// Centred bars narrowing downward — reads as a funnel without the trapezoid
// maths, and stays grayscale.
const FUNNEL = cartesian(
  [
    [92, ACCENT_FILL],
    [74, ACCENT_MID],
    [58, ACCENT],
    [42, ACCENT_MID],
    [26, ACCENT_FILL],
  ].map(([w, fill], i) => ['rect', { x: 50 - w / 2, y: 4 + i * 11, width: w, height: 8, fill }]),
)

// Floating bars stepping up, with the start and total as full pillars.
const WATERFALL = cartesian([
  ...[
    [6, 34, 22, ACCENT],
    [22, 24, 10, ACCENT_MID],
    [38, 24, 8, ACCENT_MID],
    [54, 16, 8, ACCENT_MID],
    [70, 16, 6, ACCENT_MID],
    [86, 10, 46, ACCENT],
  ].map(([x, y, height, fill]) => ['rect', { x, y, width: 10, height, fill }]),
  baseline(GRAY.mid),
])

// Contiguous bars in a rough bell — a distribution, not a category bar chart.
const HISTOGRAM = cartesian([
  ...[8, 14, 22, 34, 46, 52, 50, 42, 30, 20, 12, 7].map((h, i) => [
    'rect',
    { x: i * 8 + 2, y: BASE_Y - h, width: 7.5, height: h, fill: ACCENT_SOLID },
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
      ['line', { x1: cx, y1: wTop, x2: cx, y2: wBot, stroke: ACCENT_MID, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }],
      ['line', { x1: cx - 5, y1: wTop, x2: cx + 5, y2: wTop, stroke: ACCENT_MID, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }],
      ['line', { x1: cx - 5, y1: wBot, x2: cx + 5, y2: wBot, stroke: ACCENT_MID, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }],
      ['rect', { x: cx - 9, y: q3, width: 18, height: q1 - q3, fill: ACCENT_FILL, stroke: ACCENT, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }],
      ['line', { x1: cx - 9, y1: med, x2: cx + 9, y2: med, stroke: ACCENT, strokeWidth: 1.2, vectorEffect: 'non-scaling-stroke' }],
    ],
  ]),
)

// A grid of cells shaded by intensity — one grayscale ramp, blob in the middle.
// The heatmap ramp is the accent ramp: one hue, light to dark, which is what
// a magnitude scale is supposed to be.
const HEAT_SHADES = RAMP
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

// The basemap is drawn, not photographed.
//
// A real tile was tried and dropped: a 256px raster blown up to a full-width
// card is blurry, its country labels end up enormous, and shipping someone
// else's tiles carries an attribution obligation on every card and in every
// export. Drawn, it is sharp at any size, costs no bytes, needs no credit, and
// nobody argues about which country is which.
//
// The land shapes double as the choropleth's regions, which is what makes the
// shading land on land — an earlier version had abstract regions floating over
// real coastlines and straddling the sea.
//
// The sea, land and graticule are fixed dark neutrals rather than theme colours:
// one dark basemap works under both the light and the dark theme, and the accent
// is reserved for the data on top of it.
const MAP_SEA = '#0f1620'
const MAP_LAND = '#1f2a37'
const MAP_GRID = '#2c3a4b'

const graticule = [
  ['rect', { x: -20, y: -20, width: 140, height: 100, fill: MAP_SEA }],
  ...[10, 30, 50, 70, 90].map((x) => [
    'line',
    { x1: x, y1: -20, x2: x, y2: 80, stroke: MAP_GRID, strokeWidth: 0.6, vectorEffect: 'non-scaling-stroke' },
  ]),
  ...[8, 22, 38, 52].map((y) => [
    'line',
    { x1: -20, y1: y, x2: 120, y2: y, stroke: MAP_GRID, strokeWidth: 0.6, vectorEffect: 'non-scaling-stroke' },
  ]),
]

const MAP_REGIONS = [
  '10,20 30,12 34,30 18,38 8,32',
  '30,12 52,10 50,28 34,30',
  '52,10 74,14 78,30 58,32 50,28',
  '18,38 34,30 46,40 40,52 20,50',
  '34,30 50,28 58,32 60,44 46,40',
  '58,32 78,30 88,40 74,52 60,44',
]
const MAP_SHADES = [ACCENT_FILL, ACCENT_MID, ACCENT, ACCENT_MID, ACCENT_FILL, ACCENT]
// Kept toward the middle band on purpose: `slice` crops, so a marker parked near
// an edge disappears on a very wide or very tall card.
const MAP_POINTS = [[26, 26], [41, 22], [60, 23], [70, 34], [46, 37], [30, 40], [64, 36]]

// The land *is* the shaded regions here, so every shade lands on land.
const CHOROPLETH = mapView([
  ...graticule,
  ...MAP_REGIONS.map((points, i) => [
    'polygon',
    {
      points,
      fill: MAP_SHADES[i],
      // A hairline of sea between neighbours, so adjacent shades stay apart
      // without a white border drawn across the water.
      stroke: MAP_SEA,
      strokeWidth: 0.7,
      vectorEffect: 'non-scaling-stroke',
    },
  ]),
])

// Land stays neutral here — the dots are the data, so they get the accent.
// Plain circles: `mapView` scales uniformly, so a circle stays a circle.
const POINTMAP = mapView([
  ...graticule,
  ...MAP_REGIONS.map((points) => [
    'polygon',
    { points, fill: MAP_LAND, stroke: MAP_SEA, strokeWidth: 0.7, vectorEffect: 'non-scaling-stroke' },
  ]),
  ...MAP_POINTS.map(([cx, cy]) => [
    'circle',
    { cx, cy, r: 1.7, fill: ACCENT, stroke: MAP_SEA, strokeWidth: 0.6, vectorEffect: 'non-scaling-stroke' },
  ]),
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
        [50.89, 0, ACCENT], // ~45%
        [39.58, -50.89, ACCENT_MID], // ~35%
        [22.62, -90.48, ACCENT_FILL], // ~20%
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
        [33.93, 0, ACCENT], // ~45%
        [26.39, -33.93, ACCENT_MID], // ~35%
        [15.08, -60.32, ACCENT_FILL], // ~20%
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
        stroke: ACCENT,
        strokeWidth: 1.5,
        vectorEffect: 'non-scaling-stroke',
      },
    ],
  ],
}

// Keyed by component type. Only the types whose placeholder is pure drawing —
// the rest (KPI, table, text, tabs, section) are text and boxes, and
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
// is shared — the same arrangement as TABLE below.
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

export const TEXT_LINES = ['92%', '84%', '96%', '60%']

export const TABS_LABELS = ['Tab A', 'Tab B', 'Tab C']
