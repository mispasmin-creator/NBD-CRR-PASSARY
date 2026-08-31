"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { PieChartIcon } from "../Icons"

const SEGMENTS = [
  { key: "pending", label: "Pending", color: "#f59e0b" },
  { key: "inProgress", label: "In Progress", color: "#0ea5e9" },
  { key: "completed", label: "Completed", color: "#10b981" },
  { key: "delayed", label: "Delayed", color: "#f43f5e" },
]

function StatusDonut({ totals, isLoading }) {
  const data = SEGMENTS.map((s) => ({ name: s.label, value: totals[s.key], color: s.color })).filter((d) => d.value > 0)
  const hasData = data.length > 0

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-lg bg-violet-50 text-violet-600 border border-violet-100">
          <PieChartIcon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Status Distribution</h3>
          <p className="text-[11px] text-slate-400 font-medium">All records, company-wide</p>
        </div>
      </div>

      <div className="flex-1 min-h-[220px] relative">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
          </div>
        ) : !hasData ? (
          <div className="h-full flex items-center justify-center text-[13px] text-slate-400 font-medium">
            No live data available
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.08)", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900">{totals.total}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</span>
            </div>
          </>
        )}
      </div>

      {hasData && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
          {SEGMENTS.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label} <span className="text-slate-400 font-bold">{totals[s.key]}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default StatusDonut
