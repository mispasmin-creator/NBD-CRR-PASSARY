// DashboardMetrics.jsx - Updated to show user-specific data

import { useState, useEffect, useContext } from "react"
import { UsersIcon, PhoneCallIcon, FileTextIcon, ShoppingCartIcon, TrendingUpIcon, AlertCircleIcon } from "../Icons"
import { AuthContext } from "../../App" // Import AuthContext

import { mockApi } from "../../services/mockApi"

function DashboardMetrics({ filters }) {
  const { currentUser, userType, isAdmin } = useContext(AuthContext) // Get user info and admin function
  const [metrics, setMetrics] = useState({
    totalLeads: "0",
    pendingFollowups: "0",
    quotationsSent: "0",
    ordersReceived: "0",
    totalEnquiry: "0",
    pendingEnquiry: "0"
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true)

        const data = await mockApi.fetchDashboardMetrics(currentUser, isAdmin)

        let multiplier = 1;
        if (filters?.type === "NBD") multiplier = 0.6;
        else if (filters?.type === "CRR") multiplier = 0.3;
        else if (filters?.type === "NBD-CRR") multiplier = 0.1;

        if (filters?.dateRange === "Weekly") multiplier *= 0.25;
        else if (filters?.dateRange === "Quarterly") multiplier *= 3;
        else if (filters?.dateRange === "Yearly") multiplier *= 12;

        setMetrics({
          totalLeads: Math.round(parseInt(data.totalLeads) * multiplier).toString(),
          pendingFollowups: Math.round(parseInt(data.pendingFollowups) * multiplier).toString(),
          quotationsSent: Math.round(parseInt(data.quotationsSent) * multiplier).toString(),
          ordersReceived: Math.round(parseInt(data.ordersReceived) * multiplier).toString(),
          totalEnquiry: Math.round(parseInt(data.totalEnquiry) * multiplier).toString(),
          pendingEnquiry: Math.round(parseInt(data.pendingEnquiry) * multiplier).toString()
        })

      } catch (error) {
        console.error("Error fetching metrics:", error)
        setError(error.message)
        // Use fallback demo values
        setMetrics({
          totalLeads: "124",
          pendingFollowups: "38",
          quotationsSent: "56",
          ordersReceived: "27",
          totalEnquiry: "145",
          pendingEnquiry: "42"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [currentUser, isAdmin, filters]) // Re-run when filters change

  return (
    <div className="space-y-8">
      {/* Lead to Order Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          {/* Display admin view indicator similar to FollowUp page */}
          {isAdmin() && <p className="text-green-600 font-semibold">Admin View: Showing all data</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
          <MetricCard
            title="Total Leads"
            value={isLoading ? "Loading..." : metrics.totalLeads}
            change="+12%"
            trend="up"
            icon={<UsersIcon className="h-6 w-6" />}
            color="from-blue-500 to-indigo-600"
            dateRange={filters?.dateRange}
          />

          <MetricCard
            title="Pending Follow-ups"
            value={isLoading ? "Loading..." : metrics.pendingFollowups}
            change="+5%"
            trend="up"
            icon={<PhoneCallIcon className="h-6 w-6" />}
            color="from-sky-400 to-blue-500"
            dateRange={filters?.dateRange}
          />

          <MetricCard
            title="Quotations Sent"
            value={isLoading ? "Loading..." : metrics.quotationsSent}
            change="+8%"
            trend="up"
            icon={<FileTextIcon className="h-6 w-6" />}
            color="from-emerald-400 to-green-500"
            dateRange={filters?.dateRange}
          />

          <MetricCard
            title="Orders Received"
            value={isLoading ? "Loading..." : metrics.ordersReceived}
            change="-3%"
            trend="down"
            icon={<ShoppingCartIcon className="h-6 w-6" />}
            color="from-violet-500 to-purple-600"
            dateRange={filters?.dateRange}
          />
        </div>
      </div>

      {/* Enquiry to Order Section */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <MetricCard
            title="Total Enquiry"
            value={isLoading ? "Loading..." : metrics.totalEnquiry}
            change="+15%"
            trend="up"
            icon={<UsersIcon className="h-6 w-6" />}
            color="from-cyan-400 to-blue-500"
            dateRange={filters?.dateRange}
          />

          <MetricCard
            title="Pending Enquiry"
            value={isLoading ? "Loading..." : metrics.pendingEnquiry}
            change="+7%"
            trend="up"
            icon={<AlertCircleIcon className="h-6 w-6" />}
            color="from-rose-400 to-red-500"
            dateRange={filters?.dateRange}
          />
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, change, trend, icon, color, dateRange }) {
  const rangeText = dateRange === "Weekly" ? "from last week" : dateRange === "Quarterly" ? "from last quarter" : dateRange === "Yearly" ? "from last year" : "from last month";

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 overflow-hidden group">
      <div className={`h-1.5 bg-gradient-to-r ${color} w-1/3 group-hover:w-full transition-all duration-500`} />
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
            <h3 className="text-3xl font-extrabold mt-2 text-slate-800 tracking-tight">{value}</h3>
          </div>
          <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>{icon}</div>
        </div>
        <div className="flex items-center mt-6 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100/50 inline-flex w-full">
          {trend === "up" ? (
            <TrendingUpIcon className="h-4 w-4 text-emerald-500 mr-2" />
          ) : (
            <AlertCircleIcon className="h-4 w-4 text-rose-500 mr-2" />
          )}
          <span className={trend === "up" ? "text-emerald-600 font-semibold text-[13px]" : "text-rose-600 font-semibold text-[13px]"}>
            {change} <span className="text-slate-500 font-medium ml-1">{rangeText}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export default DashboardMetrics