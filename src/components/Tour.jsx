import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { useT } from '../i18n.jsx'

// A hand-rolled product tour — no library, the same React + Tailwind as the
// rest of the app. Each step either spotlights an element found by its
// `data-tour` selector, or (selector null) shows a centred card with no anchor.
// The spotlight is one transparent box with an enormous box-shadow: the
// standard dependency-free way to darken everything except a hole.
//
// `id` keys the translation; the English `title`/`body` here are also the
// fallback when a language has no string for that step.
const STEPS = [
  {
    id: 'welcome',
    selector: null,
    title: 'Welcome to FastDash',
    body: 'A fast sketchpad for BI dashboards. Lay out the pieces, write a note on each, and export a spec a developer can build from. This quick tour shows where everything lives.',
  },
  {
    id: 'add',
    selector: '[data-tour="add"]',
    title: 'Add a component',
    body: 'Click one of these to drop a KPI, chart, table or text block onto the canvas. The number keys 1–5 do the same without reaching for the mouse.',
  },
  {
    id: 'more',
    selector: '[data-tour="more"]',
    title: 'The whole catalogue',
    body: 'Pie, scatter, funnel, maps, tabs and more live here — start typing to find one. Clicking an empty spot on the canvas opens the same searchable list.',
  },
  {
    id: 'canvas',
    selector: '[data-tour="canvas"]',
    title: 'Place, move, resize',
    body: 'Drag a card to move it, drag a corner to resize; the grid snaps for you. Click an empty cell to add a component right where the cursor is.',
  },
  {
    id: 'filters',
    selector: '[data-tour="filters"]',
    reveal: 'filters',
    title: 'Filters',
    body: 'This rail — opened for you now — lists the dashboard-level filters people will use, like a date range or a region picker. They become part of the exported spec too.',
  },
  {
    id: 'page',
    selector: '[data-tour="page"]',
    title: 'More than one page',
    body: 'Split a dashboard across pages. A tab strip appears once there is a second page to switch between.',
  },
  {
    id: 'optmenu',
    selector: '[data-tour="opt-menu"]',
    reveal: 'menu',
    title: 'The Options menu',
    body: 'Everything that is not adding a component lives here — open it and you get import, present as a viewer sees it, colour schemes, starter templates, the keyboard shortcuts, and this tour again.',
  },
  {
    id: 'optexport',
    selector: '[data-tour="opt-export"]',
    reveal: 'menu',
    title: 'Export is the point',
    body: 'Hand off as an HTML file anyone can open in a browser, or as JSON that reads like a requirements spec a BI developer builds straight from — not just a picture of a layout.',
  },
  {
    id: 'done',
    selector: null,
    title: "That's the tour",
    body: 'Start from a blank canvas or pick a template in Options. Anything you do is undoable with ⌘Z. Have at it.',
  },
]

const PAD = 8 // spotlight padding around the target
const MARGIN = 14 // gap between the spotlight and the tooltip, and the screen edge
const TIP_W = 320 // tooltip width, matches the card below

const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi))

// Where to put the tooltip so it neither covers the target nor runs off screen.
// A big central target (the canvas) gets the card floated inside it; everything
// else gets the card on whichever side has the most room, centred on the
// target's other axis. The old "always below, aligned to the left edge" rule
// shoved the card over the toolbar for tall or full-width targets.
function placeTooltip(rect, tipH, vw, vh) {
  if (!rect) {
    return { left: (vw - TIP_W) / 2, top: (vh - tipH) / 2 }
  }
  if (rect.width > vw * 0.6 && rect.height > vh * 0.5) {
    return {
      left: clamp(rect.left + (rect.width - TIP_W) / 2, 8, vw - TIP_W - 8),
      top: clamp(rect.top + (rect.height - tipH) / 2, 8, vh - tipH - 8),
    }
  }
  const space = { bottom: vh - rect.bottom, top: rect.top, right: vw - rect.right, left: rect.left }
  const fits = {
    bottom: space.bottom >= tipH + MARGIN + 8,
    top: space.top >= tipH + MARGIN + 8,
    right: space.right >= TIP_W + MARGIN + 8,
    left: space.left >= TIP_W + MARGIN + 8,
  }
  const order = ['bottom', 'top', 'right', 'left']
  const side =
    order.find((s) => fits[s]) ?? order.reduce((a, b) => (space[a] >= space[b] ? a : b))

  if (side === 'bottom' || side === 'top') {
    const left = clamp(rect.left + rect.width / 2 - TIP_W / 2, 8, vw - TIP_W - 8)
    const top = side === 'bottom' ? rect.bottom + MARGIN : rect.top - MARGIN - tipH
    return { left, top: clamp(top, 8, vh - tipH - 8) }
  }
  const top = clamp(rect.top + rect.height / 2 - tipH / 2, 8, vh - tipH - 8)
  const left = side === 'right' ? rect.right + MARGIN : rect.left - MARGIN - TIP_W
  return { left: clamp(left, 8, vw - TIP_W - 8), top }
}

export default function Tour({ onClose, onReveal }) {
  const t = useT()
  const [step, setStep] = useState(0)
  const [target, setTarget] = useState(null) // spotlit element's rect, or null
  const [tip, setTip] = useState(null) // { left, top } for the tooltip
  const tipRef = useRef(null)

  const total = STEPS.length
  const current = STEPS[step]
  const isLast = step === total - 1

  const next = useCallback(() => setStep((s) => Math.min(s + 1, total - 1)), [total])
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), [])

  // Tell the app what this step wants on screen — the filter rail, the Options
  // menu, or nothing. Runs before the measuring below can find those elements,
  // so the re-measures there catch them once the app has re-rendered.
  useEffect(() => {
    onReveal(current.reveal ?? 'none')
  }, [step, current.reveal, onReveal])

  // Find the target and place the tooltip. In a layout effect so the tooltip's
  // real height is known before paint, and re-run on resize/scroll so the
  // spotlight follows the element if the page shifts under it. The rAF and the
  // timeout re-measure after a revealed panel has actually appeared or finished
  // its open animation (the filter rail slides over ~200ms).
  useLayoutEffect(() => {
    function place() {
      const el = current.selector ? document.querySelector(current.selector) : null
      const rect = el ? el.getBoundingClientRect() : null
      setTarget(rect)

      const tipH = tipRef.current?.offsetHeight ?? 170
      setTip(placeTooltip(rect, tipH, window.innerWidth, window.innerHeight))
    }

    place()
    const raf = requestAnimationFrame(place)
    const settle = setTimeout(place, 260)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(settle)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [step, current.selector])

  // The tour owns the keyboard while it is open: Esc leaves, arrows and Enter
  // step through. App.jsx also ignores its own shortcuts while the tour is on,
  // so a number key cannot add a component behind the overlay.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        if (isLast) onClose()
        else next()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        back()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [isLast, next, back, onClose])

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Click-blocker. Transparent when a target is spotlit — the box-shadow
          below does the dimming through its hole — and a flat dim on the
          centred steps that reveal nothing. Swallows clicks so the app beneath
          cannot be touched mid-tour. */}
      <div
        className={`absolute inset-0 ${target ? '' : 'bg-black/50'}`}
        onMouseDown={(e) => e.preventDefault()}
      />

      {target &&
        (() => {
          // One box does the dimming (the huge shadow), a second identical box
          // pulses a bright ring on top to pull the eye to the target and nudge
          // the reader to actually try it. They are separate so the pulse's
          // fading opacity never makes the dark backdrop flicker with it.
          const spot = {
            left: target.left - PAD,
            top: target.top - PAD,
            width: target.width + PAD * 2,
            height: target.height + PAD * 2,
          }
          return (
            <>
              <div
                className="pointer-events-none absolute rounded-md transition-all duration-300 ease-out"
                style={{ ...spot, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}
              />
              <div
                className="pointer-events-none absolute animate-pulse rounded-md ring-2 ring-white/80 transition-all duration-300 ease-out"
                style={spot}
              />
            </>
          )
        })()}

      <div
        ref={tipRef}
        // Neutral chrome: pin the accent to grey so a focused button here never
        // takes the dashboard's colour scheme, the same rule the quick picker
        // follows.
        style={{ left: tip?.left ?? -9999, top: tip?.top ?? -9999, width: TIP_W, '--fd-accent': '#9ca3af' }}
        className="absolute rounded-md border border-gray-200 bg-white p-4 shadow-xl transition-[left,top] duration-300 ease-out dark:border-gray-700 dark:bg-gray-800"
        role="dialog"
        aria-modal="true"
        aria-label="Product tour"
      >
        <div className="mb-1 text-xs text-gray-400">
          {step + 1} / {total}
        </div>
        <h2 className="mb-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t(`tour.${current.id}.title`, current.title)}
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {t(`tour.${current.id}.body`, current.body)}
        </p>
        <div className="flex items-center justify-between">
          <button
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            onClick={onClose}
          >
            {isLast ? t('tour.btn.close', 'Close') : t('tour.btn.skip', 'Skip tour')}
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                className="rounded-sm border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                onClick={back}
              >
                {t('tour.btn.back', 'Back')}
              </button>
            )}
            <button
              className="rounded-sm border border-gray-800 bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-gray-900 dark:border-gray-500 dark:bg-gray-600 dark:hover:bg-gray-500"
              onClick={isLast ? onClose : next}
            >
              {isLast ? t('tour.btn.done', 'Done') : t('tour.btn.next', 'Next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
