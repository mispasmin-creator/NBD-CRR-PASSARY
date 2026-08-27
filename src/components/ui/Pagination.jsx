"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

/**
 * Simple client-side pagination bar.
 * @param {number} page - current page (1-based)
 * @param {number} pageSize
 * @param {number} totalItems
 * @param {(page: number) => void} onPageChange
 */
function Pagination({ page, pageSize, totalItems, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  if (totalItems === 0) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  // Build a compact page list: 1 ... p-1 p p+1 ... last
  const pages = []
  const addPage = (p) => { if (!pages.includes(p)) pages.push(p) }
  addPage(1)
  for (let p = page - 1; p <= page + 1; p++) {
    if (p > 1 && p < totalPages) addPage(p)
  }
  addPage(totalPages)
  pages.sort((a, b) => a - b)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 bg-gray-50 border-t border-gray-200 text-sm">
      <p className="text-gray-600 font-medium">
        Showing <span className="font-semibold text-gray-900">{start}</span>-<span className="font-semibold text-gray-900">{end}</span> of{" "}
        <span className="font-semibold text-gray-900">{totalItems}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, idx) => {
          const prevPage = pages[idx - 1]
          const showEllipsis = prevPage !== undefined && p - prevPage > 1
          return (
            <span key={p} className="flex items-center gap-1">
              {showEllipsis && <span className="px-1 text-gray-400">…</span>}
              <button
                type="button"
                onClick={() => onPageChange(p)}
                className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors cursor-pointer ${
                  p === page ? "bg-sky-600 text-white shadow-sm" : "text-gray-600 hover:bg-white border border-transparent hover:border-gray-200"
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
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default Pagination
