"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { BarChart3 } from "lucide-react"

const SEGMENTS = [
  { key: "pending", name: "Pending", color: "#f59e0b" },
  { key: "inProgress", name: "In Progress", color: "#0ea5e9" },
  { key: "completed", name: "Completed", color: "#10b981" },
  { key: "delayed", name: "Delayed", color: "#f43f5e" },
]

function StatusBreakdownChart({ modules, isLoading }) {
  const data = modules
    .filter((m) => m.available)
    .map((m) => ({
      name: m.label,
      pending: m.pending,
      inProgress: m.inProgress,
      completed: m.completed,
      delayed: m.delayed,
    }))
    .sort((a, b) => (b.pending + b.inProgress + b.completed + b.delayed) - (a.pending + a.inProgress + a.completed + a.delayed))

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
          <BarChart3 className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Status Breakdown by Module</h3>
          <p className="text-[11px] text-slate-400 font-medium">Every record, split by where it stands</p>
        </div>
      </div>

      <div className="flex-1 min-h-[300px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[13px] text-slate-400 font-medium">
            No live data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(300, data.length * 42)}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                width={150}
                tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }}
              />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.08)", fontSize: 12 }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 8 }}
              />
              {SEGMENTS.map((seg) => (
                <Bar key={seg.key} dataKey={seg.key} name={seg.name} stackId="status" fill={seg.color} barSize={18} radius={seg.key === "delayed" ? [0, 4, 4, 0] : seg.key === "pending" ? [4, 0, 0, 4] : 0} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default StatusBreakdownChart
