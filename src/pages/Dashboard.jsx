"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { RefreshCwIcon } from "../components/Icons"
import { fetchDashboardOverview } from "../services/dashboardStats"
import HeroStats from "../components/dashboard/HeroStats"
import ModuleStatCard from "../components/dashboard/ModuleStatCard"
import StatusDonut from "../components/dashboard/StatusDonut"
import MonthlyTrendChart from "../components/dashboard/MonthlyTrendChart"
import StatusBreakdownChart from "../components/dashboard/StatusBreakdownChart"
import AttentionPanel from "../components/dashboard/AttentionPanel"

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
}

const EMPTY_TOTALS = { total: 0, pending: 0, inProgress: 0, completed: 0, delayed: 0 }

function formatRelativeTime(date) {
  if (!date) return ""
  const diffSec = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000))
  if (diffSec < 10) return "just now"
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  return `${diffHr}h ago`
}

function Dashboard() {
  const [modules, setModules] = useState([])
  const [totals, setTotals] = useState(EMPTY_TOTALS)
  const [monthlyTrend, setMonthlyTrend] = useState([])
  const [fetchedAt, setFetchedAt] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true)
    else setIsLoading(true)
    try {
      const overview = await fetchDashboardOverview()
      setModules(overview.modules)
      setTotals(overview.totals)
      setMonthlyTrend(overview.monthlyTrend)
      setFetchedAt(overview.fetchedAt)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="min-h-full">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 pb-4">
        {/* Header */}
        <motion.section variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-[13px] text-slate-500 font-medium mt-0.5">
              Live overview across every module — jump straight into what needs work.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {fetchedAt && (
              <span className="text-[12px] text-slate-400 font-medium">
                Synced {formatRelativeTime(fetchedAt)}
              </span>
            )}
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </motion.section>

        {/* Hero KPIs */}
        <motion.section variants={itemVariants}>
          <HeroStats totals={totals} isLoading={isLoading} />
        </motion.section>

        {/* Module status grid */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-bold text-slate-500 uppercase tracking-widest">Module Status</h2>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-[148px] rounded-2xl bg-white border border-slate-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {modules.map((mod) => (
                <ModuleStatCard key={mod.key} mod={mod} />
              ))}
            </div>
          )}
        </motion.section>

        {/* Analytics: status distribution + activity trend */}
        <motion.section variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatusDonut totals={totals} isLoading={isLoading} />
          <MonthlyTrendChart data={monthlyTrend} isLoading={isLoading} />
        </motion.section>

        {/* Analytics: per-module breakdown + needs attention */}
        <motion.section variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatusBreakdownChart modules={modules} isLoading={isLoading} />
          <AttentionPanel modules={modules} isLoading={isLoading} />
        </motion.section>
      </motion.div>
    </div>
  )
}

export default Dashboard
