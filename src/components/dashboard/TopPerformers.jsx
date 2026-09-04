"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Trophy } from "lucide-react"

const RANK_COLORS = ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"]

function TopPerformers({ leaderboard, isLoading }) {
  const data = (leaderboard || []).map((p) => ({ name: p.name, converted: p.converted, leads: p.leads }))

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
          <Trophy className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Top Sales Performers</h3>
          <p className="text-[11px] text-slate-400 font-medium">Ranked by leads converted to enquiries</p>
        </div>
      </div>

      <div className="flex-1 min-h-[220px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[13px] text-slate-400 font-medium">
            No live data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, data.length * 46)}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                width={140}
                tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }}
              />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.08)", fontSize: 12 }}
                formatter={(value, name, props) => [`${value} converted (${props.payload.leads} leads)`, "Orders"]}
              />
              <Bar dataKey="converted" name="Converted" radius={[0, 6, 6, 0]} barSize={20}>
                {data.map((_, i) => (
                  <Cell key={i} fill={RANK_COLORS[i % RANK_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default TopPerformers
