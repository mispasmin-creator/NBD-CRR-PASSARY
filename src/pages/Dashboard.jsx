import { useState } from "react"
import DashboardMetrics from "../components/dashboard/DashboardMetrics"
import DashboardCharts from "../components/dashboard/DashboardCharts"
import PendingTasks from "../components/dashboard/PendingTasks"
import RecentActivities from "../components/dashboard/RecentActivities"
import PipelineStats from "../components/dashboard/PipelineStats"
import MonthlyTargets from "../components/dashboard/MonthlyTargets"
import KPIScore from "../components/dashboard/KPIScore"
import ActiveEnquiries from "../components/dashboard/ActiveEnquiries"

function Dashboard() {
  const [filters, setFilters] = useState({
    type: "All",
    assignee: "All",
    dateRange: "This Month"
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="py-2">

        {/* Filters Top Bar */}
        <section className="mb-6 bg-white p-4 md:p-5 rounded-2xl shadow-sm hover:shadow-md border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between transition-all duration-300">
          <div className="flex items-center gap-3 text-slate-800 font-extrabold text-xl tracking-tight">
            <div className="bg-gradient-to-br from-indigo-100 to-blue-50 p-2.5 rounded-xl shadow-inner border border-indigo-100/50">
              <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            </div>
            Analytics
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.type}
              onChange={(e) => setFilters(p => ({ ...p, type: e.target.value }))}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-[13px] font-semibold bg-slate-50 text-slate-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm cursor-pointer transition-all"
            >
              <option value="All">All Segments</option>
              <option value="NBD">New Business (NBD)</option>
              <option value="CRR">Retention (CRR)</option>
              <option value="NBD-CRR">Hybrid (NBD-CRR)</option>
            </select>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(p => ({ ...p, dateRange: e.target.value }))}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-[13px] font-semibold bg-slate-50 text-slate-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm cursor-pointer transition-all"
            >
              <option value="Weekly">📅 Weekly View</option>
              <option value="Monthly">📆 Monthly View</option>
              <option value="Quarterly">📊 Quarterly View</option>
              <option value="Yearly">🏆 Yearly View</option>
            </select>
          </div>
        </section>

        {/* Section 1: Pipeline Stats - Top Row */}
        <section className="mb-6">
          <PipelineStats filters={filters} />
        </section>

        {/* Section 2: Monthly Targets & KPI Score - Two Columns on desktop, stacked on mobile */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
          <MonthlyTargets filters={filters} />
          <KPIScore filters={filters} />
        </section>

        {/* Section 3: Active Enquiries Table */}
        <section className="mb-6">
          <ActiveEnquiries filters={filters} />
        </section>

        {/* Section 4: Existing Dashboard Metrics */}
        <section className="mb-6">
          <DashboardMetrics filters={filters} />
        </section>

        {/* Section 5: Charts */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6">
          <div className="p-4 md:p-6">
            <DashboardCharts filters={filters} />
          </div>
        </section>

      </div>
    </div>
  )
}

export default Dashboard
