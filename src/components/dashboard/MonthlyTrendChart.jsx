"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUpIcon } from "../Icons"

function MonthlyTrendChart({ data, isLoading }) {
  const hasData = data && data.some((d) => d.count > 0)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
          <TrendingUpIcon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">New Activity Trend</h3>
          <p className="text-[11px] text-slate-400 font-medium">New records created, last 6 months</p>
        </div>
      </div>

      <div className="flex-1 min-h-[220px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
          </div>
        ) : !hasData ? (
          <div className="h-full flex items-center justify-center text-[13px] text-slate-400 font-medium">
            No live data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} allowDecimals={false} width={36} />
              <Tooltip
                cursor={{ stroke: "#cbd5e1", strokeDasharray: "3 3" }}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.08)", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="count" name="New Records" stroke="#2563eb" strokeWidth={2.5} fill="url(#trendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default MonthlyTrendChart
