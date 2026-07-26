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
}

export const TYPE_ORDER = ['kpi', 'timeseries', 'bar', 'table', 'text']

// Reverse lookup for the number-key shortcuts.
export const TYPE_BY_KEY = Object.fromEntries(
  TYPE_ORDER.map((type) => [COMPONENT_TYPES[type].key, type]),
)
