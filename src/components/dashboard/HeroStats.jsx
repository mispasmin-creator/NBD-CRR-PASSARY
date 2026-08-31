"use client"

import { Layers, Clock3, CheckCircle2, AlertTriangle } from "lucide-react"

function HeroStats({ totals, isLoading }) {
  const cards = [
    {
      label: "Total Records",
      value: totals.total,
      icon: Layers,
      accent: "text-slate-900",
      iconBg: "bg-slate-100 text-slate-600",
    },
    {
      label: "Active / Pending Work",
      value: totals.pending + totals.inProgress,
      icon: Clock3,
      accent: "text-amber-600",
      iconBg: "bg-amber-50 text-amber-600 border border-amber-100",
    },
    {
      label: "Completed",
      value: totals.completed,
      icon: CheckCircle2,
      accent: "text-emerald-600",
      iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    },
    {
      label: "Needs Attention",
      value: totals.delayed,
      icon: AlertTriangle,
      accent: "text-rose-600",
      iconBg: "bg-rose-50 text-rose-600 border border-rose-100",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest truncate">{card.label}</p>
              <h3 className={`text-3xl font-extrabold mt-2 tracking-tight ${card.accent}`}>
                {isLoading ? (
                  <span className="inline-block h-8 w-16 rounded-lg bg-slate-100 animate-pulse align-middle" />
                ) : (
                  card.value
                )}
              </h3>
            </div>
            <div className={`p-3 rounded-xl shrink-0 ${card.iconBg}`}>
              <card.icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default HeroStats
