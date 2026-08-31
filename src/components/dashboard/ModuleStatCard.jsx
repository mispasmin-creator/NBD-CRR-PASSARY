"use client"

import { useNavigate } from "react-router-dom"
import { AlertCircleIcon } from "../Icons"
import { MODULE_ICONS } from "./moduleIcons"

const CHIP_META = {
  pending: { label: "Pending", dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  inProgress: { label: "In Progress", dot: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50" },
  completed: { label: "Completed", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  delayed: { label: "Delayed", dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50" },
}

function ModuleStatCard({ mod }) {
  const navigate = useNavigate()
  const Icon = MODULE_ICONS[mod.icon]
  const completedPct = mod.total > 0 ? Math.round((mod.completed / mod.total) * 100) : 0

  return (
    <button
      type="button"
      onClick={() => navigate(mod.route)}
      className="group flex flex-col text-left bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-200 transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:bg-blue-100 transition-colors">
            {Icon && <Icon className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-slate-800 truncate">{mod.label}</p>
            <p className="text-[11px] text-slate-400 font-medium">Total records</p>
          </div>
        </div>
        <span className="text-2xl font-extrabold text-slate-900 tracking-tight shrink-0">
          {mod.available ? mod.total : "—"}
        </span>
      </div>

      {mod.available ? (
        <>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {mod.chips.map((chipKey) => {
              const meta = CHIP_META[chipKey]
              const value = mod[chipKey]
              return (
                <span
                  key={chipKey}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold ${meta.bg} ${meta.text}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {value} {meta.label}
                </span>
              )
            })}
          </div>
          <div className="mt-4 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${completedPct}%` }}
            />
          </div>
        </>
      ) : (
        <div className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-slate-400">
          <AlertCircleIcon className="h-4 w-4" />
          Live data unavailable
        </div>
      )}
    </button>
  )
}

export default ModuleStatCard
