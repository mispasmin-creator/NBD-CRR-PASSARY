"use client"

/**
 * Consistent page header: icon badge + bold title + muted subtitle/count
 * on the left, action buttons (Refresh, + Add, etc.) on the right.
 * Follows the design system: sentence-case labels, indigo-700 brand, slate hierarchy.
 */
function PageHeader({ icon, title, subtitle, iconColorClass = "bg-indigo-700", actions }) {
  return (
    <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${iconColorClass}`}>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-[17px] font-bold text-slate-900 truncate leading-tight">{title}</h1>
          {subtitle && <p className="text-[12px] font-medium text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

export default PageHeader
