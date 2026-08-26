import { useState } from "react"
import { motion } from "framer-motion"
import DashboardMetrics from "../components/dashboard/DashboardMetrics"
import DashboardCharts from "../components/dashboard/DashboardCharts"
import PendingTasks from "../components/dashboard/PendingTasks"
import RecentActivities from "../components/dashboard/RecentActivities"
import PipelineStats from "../components/dashboard/PipelineStats"
import MonthlyTargets from "../components/dashboard/MonthlyTargets"
import KPIScore from "../components/dashboard/KPIScore"
import ActiveEnquiries from "../components/dashboard/ActiveEnquiries"

// Framer motion variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
}

function Dashboard() {
  const [filters, setFilters] = useState({
    type: "All",
    assignee: "All",
    dateRange: "This Month"
  })

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-white relative overflow-hidden">
      {/* Decorative blurred background shapes */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>

      <motion.div 
        className="py-4 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Filters Top Bar */}
        <motion.section 
          variants={itemVariants}
          className="mb-8 bg-white/70 backdrop-blur-xl p-4 md:p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-col md:flex-row gap-4 items-center justify-between transition-all duration-300"
        >
          <div className="flex items-center gap-4 text-slate-800 font-extrabold text-2xl tracking-tight">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            </div>
            Analytics Overview
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative group">
              <select
                value={filters.type}
                onChange={(e) => setFilters(p => ({ ...p, type: e.target.value }))}
                className="appearance-none pl-5 pr-11 py-3 rounded-2xl text-[14px] font-bold bg-white/50 text-slate-700 hover:bg-white border border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm cursor-pointer transition-all duration-300 backdrop-blur-md"
              >
                <option value="All">All Segments</option>
                <option value="NBD">New Business (NBD)</option>
                <option value="CRR">Retention (CRR)</option>
                <option value="NBD-CRR">Hybrid (NBD-CRR)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-indigo-500 transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            <div className="relative group">
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(p => ({ ...p, dateRange: e.target.value }))}
                className="appearance-none pl-5 pr-11 py-3 rounded-2xl text-[14px] font-bold bg-white/50 text-slate-700 hover:bg-white border border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm cursor-pointer transition-all duration-300 backdrop-blur-md"
              >
                <option value="Weekly">📅 Weekly View</option>
                <option value="Monthly">📆 Monthly View</option>
                <option value="Quarterly">📊 Quarterly View</option>
                <option value="Yearly">🏆 Yearly View</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-indigo-500 transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Section 1: Pipeline Stats - Top Row */}
        <motion.section variants={itemVariants} className="mb-8">
          <PipelineStats filters={filters} />
        </motion.section>

        {/* Section 2: Monthly Targets & KPI Score - Two Columns on desktop, stacked on mobile */}
        <motion.section variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 mb-8">
          <div className="h-full"><MonthlyTargets filters={filters} /></div>
          <div className="h-full"><KPIScore filters={filters} /></div>
        </motion.section>

        {/* Section 3: Active Enquiries Table */}
        <motion.section variants={itemVariants} className="mb-8">
          <ActiveEnquiries filters={filters} />
        </motion.section>

        {/* Section 4: Existing Dashboard Metrics */}
        <motion.section variants={itemVariants} className="mb-8">
          <DashboardMetrics filters={filters} />
        </motion.section>

        {/* Section 5: Charts */}
        <motion.section variants={itemVariants} className="bg-white/60 backdrop-blur-lg rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white mb-6 overflow-hidden">
          <div className="p-4 md:p-8">
            <DashboardCharts filters={filters} />
          </div>
        </motion.section>

      </motion.div>
    </div>
  )
}

export default Dashboard
