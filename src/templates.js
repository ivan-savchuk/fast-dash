// Starter dashboards. A blank grid is the slowest possible start — these give
// you a real shape to argue with, which is the whole point of the tool.
//
// Each component carries a description, deliberately. The descriptions are the
// example: they show what a useful spec note looks like, so the habit is
// already established before anyone reads the docs.

import { SCHEMA_VERSION, newComponentId, newFilterId } from './state/document.js'

// [type, x, y, w, h, title, description]
// filters: [label, type]
const TEMPLATES = [
  {
    id: 'executive',
    name: 'Executive overview',
    summary: 'KPI row, trend, breakdown, detail',
    title: 'Executive overview',
    filters: [
      ['Region', 'multi-select'],
      ['Date', 'date range'],
    ],
    components: [
      ['kpi', 0, 0, 3, 4, 'Revenue', 'Net of returns. Delta vs. same period last year.'],
      ['kpi', 3, 0, 3, 4, 'Orders', 'Count of completed orders. Excludes cancellations.'],
      ['kpi', 6, 0, 3, 4, 'Average order value', 'Revenue ÷ orders. Same filters as both.'],
      ['kpi', 9, 0, 3, 4, 'New customers', 'First purchase in the period.'],
      ['timeseries', 0, 4, 8, 6, 'Revenue over time', 'Monthly, 24 months. Prior year as a second line.'],
      ['bar', 8, 4, 4, 6, 'Revenue by region', 'Top 5 regions, descending. Rest grouped as Other.'],
      ['table', 0, 10, 12, 7, 'Detail by product', 'Sortable. Totals row. Drill from the bar chart.'],
    ],
  },
  {
    id: 'operational',
    name: 'Operational monitor',
    summary: 'Status row, wide trend, working table',
    title: 'Operational monitor',
    filters: [
      ['Team', 'dropdown'],
      ['Severity', 'multi-select'],
      ['Open only', 'toggle'],
    ],
    components: [
      ['kpi', 0, 0, 3, 4, 'Open tickets', 'Currently unresolved. Refreshed hourly.'],
      ['kpi', 3, 0, 3, 4, 'Breached SLA', 'Past due. Red when above zero.'],
      ['kpi', 6, 0, 3, 4, 'Median resolution time', 'Median, not mean — outliers distort this badly.'],
      ['text', 9, 0, 3, 4, 'How to read this', 'Who owns this dashboard and when it refreshes.'],
      ['timeseries', 0, 4, 12, 6, 'Volume by day', 'Daily, 90 days. Weekends shaded.'],
      ['table', 0, 10, 12, 7, 'Queue', 'One row per open item, oldest first. This is the working list.'],
    ],
  },
  {
    id: 'deepdive',
    name: 'Analysis deep dive',
    summary: 'Question up top, evidence below',
    title: 'Analysis deep dive',
    filters: [['Segment', 'dropdown']],
    components: [
      ['text', 0, 0, 12, 3, 'The question', 'State the decision this page supports, in one sentence.'],
      ['timeseries', 0, 3, 6, 6, 'Trend', 'The measure over time. Annotate anything that moved it.'],
      ['bar', 6, 3, 6, 6, 'Breakdown', 'Same measure split by the dimension under discussion.'],
      ['kpi', 0, 9, 3, 4, 'Headline number', 'The single figure someone will quote from this page.'],
      ['kpi', 3, 9, 3, 4, 'Comparison', 'What the headline is being judged against.'],
      ['table', 6, 9, 6, 7, 'Evidence', 'The rows behind the charts, for anyone who asks.'],
    ],
  },
]

// `preview` is the layout and nothing else — enough to draw a thumbnail of the
// template's shape. It is mapped from the very array `buildTemplate` builds
// from, so the picture and what clicking it produces cannot drift apart.
export const TEMPLATE_LIST = TEMPLATES.map(({ id, name, summary, components }) => ({
  id,
  name,
  summary,
  preview: components.map(([type, x, y, w, h]) => ({ type, x, y, w, h })),
}))

// Build a fresh document. Ids are generated per call so opening the same
// template twice never collides, and the result is an ordinary document with
// nothing template-specific left in it.
export function buildTemplate(templateId) {
  const template = TEMPLATES.find((t) => t.id === templateId)
  if (!template) return null

  return {
    version: SCHEMA_VERSION,
    title: template.title,
    filters: (template.filters ?? []).map(([label, type]) => ({
      id: newFilterId(),
      label,
      type,
    })),
    pages: [
      {
        id: 'p1',
        name: 'Overview',
        components: template.components.map(([type, x, y, w, h, title, comment]) => ({
          id: newComponentId(),
          type,
          layout: { x, y, w, h },
          title,
          spec: {},
          comment,
        })),
      },
    ],
  }
}
