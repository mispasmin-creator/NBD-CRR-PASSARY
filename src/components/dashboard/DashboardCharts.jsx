

"use client"

import { useState, useEffect, useContext } from "react"
import { AuthContext } from "../../App" // Import AuthContext
import { mockApi } from "../../services/mockApi"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

// Fallback data in case of errors
const fallbackLeadData = [
  { month: "Jan", leads: 45, enquiries: 30, orders: 12 },
  { month: "Feb", leads: 52, enquiries: 35, orders: 15 },
  { month: "Mar", leads: 48, enquiries: 32, orders: 14 },
  { month: "Apr", leads: 70, enquiries: 45, orders: 20 },
  { month: "May", leads: 65, enquiries: 40, orders: 18 },
  { month: "Jun", leads: 58, enquiries: 38, orders: 16 },
]

const fallbackConversionData = [
  { name: "Leads", value: 124, color: "#60a5fa" },     // Bright Blue
  { name: "Enquiries", value: 82, color: "#06b6d4" },  // Bright Violet
  { name: "Quotations", value: 56, color: "#f472b6" }, // Bright Pink
  { name: "Orders", value: 27, color: "#09c385ff" },     // Bright Green
]

const fallbackSourceData = [
  { name: "Indiamart", value: 45, color: "#3b82f6" },     // Bright blue
  { name: "Justdial", value: 28, color: "#06b6d4" },      // Bright cyan
  { name: "Social Media", value: 20, color: "#09c385ff" },  // Bright emerald
  { name: "Website", value: 15, color: "#f59e0b" },       // Bright amber
  { name: "Referrals", value: 12, color: "#8b5cf6" },     // Bright purple
]

function DashboardCharts({ filters }) {
  const { currentUser, userType, isAdmin } = useContext(AuthContext) // Get user info and admin function
  const [activeTab, setActiveTab] = useState("overview")
  const [leadData, setLeadData] = useState(fallbackLeadData)
  const [conversionData, setConversionData] = useState(fallbackConversionData)
  const [sourceData, setSourceData] = useState(fallbackSourceData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

        const data = await mockApi.fetchDashboardAppCharts(currentUser, isAdmin);

        // apply mock filter effects here since no real backend exists
        let multiplier = 1;
        if (filters?.type === "NBD") multiplier = 0.6;
        else if (filters?.type === "CRR") multiplier = 0.3;
        else if (filters?.type === "NBD-CRR") multiplier = 0.1;

        if (filters?.dateRange === "Weekly") multiplier *= 0.25;
        else if (filters?.dateRange === "Quarterly") multiplier *= 3;
        else if (filters?.dateRange === "Yearly") multiplier *= 12;

        // Scale data sets for demonstration
        if (data.leadData.length > 0) {
          setLeadData(data.leadData.map(d => ({
            ...d,
            leads: Math.round(d.leads * multiplier),
            enquiries: Math.round(d.enquiries * multiplier),
            orders: Math.round(d.orders * multiplier)
          })));
        }
        if (data.conversionData.length > 0) {
          setConversionData(data.conversionData.map(d => ({
            ...d, value: Math.round(d.value * multiplier)
          })));
        }
        if (data.sourceData.length > 0) {
          setSourceData(data.sourceData.map(d => ({
            ...d, value: Math.round(d.value * multiplier)
          })));
        }

      } catch (error) {
        console.error("Error fetching chart data:", error)
        setError(error.message)
        // Fallback to demo data is already handled since we initialized state with it
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [currentUser, isAdmin, filters])



  return (
    <div className="flex flex-col h-full mt-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-2.5 rounded-xl text-indigo-600 shadow-inner border border-indigo-200/50">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">Sales Analytics</h3>
            <p className="text-xs text-slate-500 font-medium tracking-wide">( Lead → Order )</p>
          </div>
        </div>
        {isAdmin() && <p className="text-indigo-600 text-[11px] font-bold tracking-widest uppercase bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">Admin Access Level</p>}
      </div>

      <div className="mb-8 overflow-x-auto pb-2">
        <div className="inline-flex bg-slate-100/80 backdrop-blur-sm p-1.5 rounded-2xl shadow-inner border border-slate-200/60 sticky left-0 min-w-max">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === "overview" ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50 scale-100" : "text-slate-500 hover:text-slate-700 hover:bg-white/50 scale-95"}`}
          >
            📊 Monthly Overview
          </button>
          <button
            onClick={() => setActiveTab("conversion")}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === "conversion" ? "bg-white text-rose-600 shadow-sm border border-slate-200/50 scale-100" : "text-slate-500 hover:text-slate-700 hover:bg-white/50 scale-95"}`}
          >
            🎯 Conversion Funnel
          </button>
          <button
            onClick={() => setActiveTab("sources")}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === "sources" ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50 scale-100" : "text-slate-500 hover:text-slate-700 hover:bg-white/50 scale-95"}`}
          >
            🌍 Lead Sources
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          <p className="text-slate-500 font-medium animate-pulse">Analyzing sales data...</p>
        </div>
      ) : error ? (
        <div className="h-[400px] flex items-center justify-center p-6 bg-rose-50 rounded-3xl border border-rose-100">
          <p className="text-rose-500 font-medium flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Error loading data. Using fallback data.
          </p>
        </div>
      ) : (
        <div className="h-[400px] w-full bg-white rounded-3xl">
          {activeTab === "overview" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 500 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc', opacity: 0.6 }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
                  itemStyle={{ fontWeight: 700 }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: 600 }} />
                <Bar dataKey="leads" name="Total Leads" fill="#facc15" radius={[6, 6, 0, 0]} barSize={24} />
                <Bar dataKey="enquiries" name="Enquiries Generated" fill="#fb923c" radius={[6, 6, 0, 0]} barSize={24} />
                <Bar dataKey="orders" name="Orders Closed" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeTab === "conversion" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
              <div className="h-full w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={conversionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {conversionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      itemStyle={{ fontWeight: 700, color: '#1e293b' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text for donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black text-slate-800">{conversionData[0]?.value || 0}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Leads</span>
                </div>
              </div>

              <div className="flex flex-col justify-center overflow-y-auto max-h-[400px] px-2 md:px-6">
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 drop-shadow-sm">Conversion Funnel Drop-off</h4>
                <div className="space-y-6">
                  {conversionData.map((item, index) => (
                    <div key={index} className="space-y-2 group">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-extrabold text-slate-700 tracking-tight group-hover:text-indigo-600 transition-colors">{item.name}</span>
                        <div className="flex flex-col items-end">
                          <span className="text-xl font-black text-slate-800">{item.value}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3.5 shadow-inner overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                          style={{
                            width: `${(item.value / (conversionData[0].value || 1)) * 100}%`,
                            backgroundColor: item.color,
                          }}
                        ></div>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 text-right">
                        {((item.value / (conversionData[0].value || 1)) * 100).toFixed(1)}% Conversion
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "sources" && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={120}
                  dataKey="value"
                  stroke="white"
                  strokeWidth={3}
                  labelLine={false}
                  label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ fontWeight: 700 }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px', fontWeight: 600 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  )
}

export default DashboardCharts