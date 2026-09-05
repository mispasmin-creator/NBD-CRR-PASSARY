"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

/**
 * Simple client-side pagination bar.
 * Design system: indigo-700 active page, slate-* neutrals, rounded-lg, sentence-case labels.
 * @param {number} page - current page (1-based)
 * @param {number} pageSize
 * @param {number} totalItems
 * @param {(page: number) => void} onPageChange
 */
function Pagination({ page, pageSize, totalItems, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  if (totalItems === 0) return null

  const start = (page - 1) * pageSize + 1
  const end   = Math.min(page * pageSize, totalItems)

  // Build compact page list: 1 ... p-1 p p+1 ... last
  const pages = []
  const addPage = (p) => { if (!pages.includes(p)) pages.push(p) }
  addPage(1)
  for (let p = page - 1; p <= page + 1; p++) {
    if (p > 1 && p < totalPages) addPage(p)
  }
  addPage(totalPages)
  pages.sort((a, b) => a - b)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-t border-slate-200">
      <p className="text-[11.5px] font-medium text-slate-400">
        Showing{" "}
        <span className="font-semibold text-slate-700">{start}–{end}</span>
        {" "}of{" "}
        <span className="font-semibold text-slate-700">{totalItems}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Previous page"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {pages.map((p, idx) => {
          const prevPage     = pages[idx - 1]
          const showEllipsis = prevPage !== undefined && p - prevPage > 1
          return (
            <span key={p} className="flex items-center gap-1">
              {showEllipsis && <span className="px-1 text-slate-400 text-xs select-none">…</span>}
              <button
                type="button"
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  p === page
                    ? "bg-indigo-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200"
                }`}
              >
                {p}
              </button>
            </span>
          )
        })}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label="Next page"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export default Pagination
