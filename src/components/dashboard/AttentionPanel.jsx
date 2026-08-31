"use client"

import { useNavigate } from "react-router-dom"
import { AlertTriangle, ChevronRight, CheckCircle2 } from "lucide-react"
import { MODULE_ICONS } from "./moduleIcons"

function AttentionPanel({ modules, isLoading }) {
  const navigate = useNavigate()
  const items = modules
    .filter((m) => m.available && m.delayed > 0)
    .sort((a, b) => b.delayed - a.delayed)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Needs Attention</h3>
          <p className="text-[11px] text-slate-400 font-medium">Modules with delayed or stuck records</p>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto max-h-[280px] pr-1">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-50 animate-pulse" />
          ))
        ) : items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-6 text-slate-400">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
            <p className="text-[13px] font-semibold text-slate-500">Nothing needs urgent attention</p>
            <p className="text-[11px] mt-0.5">All modules are on track</p>
          </div>
        ) : (
          items.map((mod) => {
            const Icon = MODULE_ICONS[mod.icon]
            return (
              <button
                key={mod.key}
                type="button"
                onClick={() => navigate(mod.route)}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/60 hover:bg-rose-50 px-3.5 py-2.5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {Icon && <Icon className="h-4 w-4 text-rose-500 shrink-0" />}
                  <span className="text-[13px] font-semibold text-slate-700 truncate">{mod.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[12px] font-extrabold text-rose-600">{mod.delayed}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-rose-400" />
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

export default AttentionPanel
