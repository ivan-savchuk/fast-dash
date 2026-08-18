import { useCallback, useRef, useState } from 'react'

import Popover from './Popover.jsx'

// "Send this card to another page."
//
// Multi-page dashboards were build-only: you could add a second page, but
// nothing could ever get to it, so splitting a page after the fact meant
// rebuilding its cards by hand.
//
// It lives in the card header for the same reason the variant menu does — the
// card itself is the drag handle, so a control on an edge would sit exactly
// where you grab to move or resize.
//
// It appears only on the **selected** card, and only once there are two pages
// (both decided in Card). A `→` on every header was a fourth control competing
// with the title for room, for something you do a handful of times per
// dashboard.
//
// `Popover` owns the portal, the backdrop and Escape; this file owns the list.

const MENU_WIDTH = 180

export default function PageMover({ id, pages, activePageId, dispatch }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)

  const close = useCallback(() => {
    setOpen(false)
    buttonRef.current?.focus()
  }, [])

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Move this card to another page (⌘⌥← / ⌘⌥→)"
        aria-label="Move to another page"
        className="no-drag flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-xs leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-100"
      >
        →
      </button>

      {open && (
        <Popover anchorRef={buttonRef} width={MENU_WIDTH} onClose={close} className="py-1">
          <div className="px-3 pt-1 pb-0.5 text-[10px] font-medium tracking-wide text-gray-400 uppercase">
            Move to page
          </div>
          {pages.map((page) => {
            // The page it is already on is listed rather than hidden, so the
            // list reads as the whole dashboard rather than as a gap.
            const here = page.id === activePageId
            return (
              <button
                key={page.id}
                role="menuitem"
                disabled={here}
                onClick={() => {
                  dispatch({ type: 'moveToPage', id, pageId: page.id })
                  close()
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${
                  here
                    ? 'cursor-default text-gray-400 dark:text-gray-500'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span className="truncate">{page.name}</span>
                {here && <span className="ml-2 shrink-0 text-xs">here</span>}
              </button>
            )
          })}
        </Popover>
      )}
    </>
  )
}
