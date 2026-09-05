"use client"

import { useEffect, useRef, useState } from "react"
import { MoreVertical } from "lucide-react"

/**
 * Compact 3-dot action menu for table rows.
 * @param {{ label: string, icon?: JSX.Element, onClick: () => void, danger?: boolean, hidden?: boolean }[]} items
 */
function ActionMenu({ items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const visibleItems = items.filter((item) => !item.hidden)
  if (visibleItems.length === 0) return null

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
        title="More actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-scale-in">
          {visibleItems.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => { setOpen(false); item.onClick() }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium transition-colors cursor-pointer ${
                item.danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ActionMenu

