// Save / load the document as a plain JSON file. No server involved —
// the browser writes the file straight to the Downloads folder.

export function downloadDocument(doc) {
  const json = JSON.stringify(doc, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slug(doc.title)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function readDocumentFile(file) {
  const doc = JSON.parse(await file.text())
  return validate(doc)
}

// Only checks the fields we actually rely on. Anything else in the file is
// left untouched so a hand-edited or future-version file survives the trip.
function validate(doc) {
  if (!doc || typeof doc !== 'object') throw new Error('Not a dashboard file.')
  if (!Array.isArray(doc.pages) || doc.pages.length === 0) {
    throw new Error('File has no pages.')
  }
  const pages = doc.pages.map((page, i) => {
    if (!Array.isArray(page.components)) {
      throw new Error(`Page ${i + 1} has no components list.`)
    }
    page.components.forEach((c) => {
      const l = c?.layout
      const ok =
        c?.id &&
        c?.type &&
        l &&
        ['x', 'y', 'w', 'h'].every((k) => Number.isFinite(l[k]))
      if (!ok) throw new Error(`Component "${c?.id ?? '?'}" is missing id, type or layout.`)
    })
    return { ...page, id: page.id ?? `p${i + 1}`, name: page.name ?? `Page ${i + 1}` }
  })

  // Filters are optional and only lightly checked: give each a stable id and a
  // type so the rail can render it, but keep any other fields the file carried.
  const filters = Array.isArray(doc.filters)
    ? doc.filters.map((f, i) => ({
        ...f,
        id: f?.id ?? `f${i + 1}`,
        label: f?.label ?? 'Filter',
        type: f?.type ?? 'dropdown',
      }))
    : []

  return {
    ...doc,
    version: doc.version ?? 1,
    title: doc.title ?? 'Untitled dashboard',
    filters,
    pages,
  }
}

function slug(title) {
  return (
    String(title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'dashboard'
  )
}
