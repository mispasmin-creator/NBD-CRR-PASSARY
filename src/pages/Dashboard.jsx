import DashboardMetrics from "../components/dashboard/DashboardMetrics"
import DashboardCharts from "../components/dashboard/DashboardCharts"
import PendingTasks from "../components/dashboard/PendingTasks"
import RecentActivities from "../components/dashboard/RecentActivities"
import PipelineStats from "../components/dashboard/PipelineStats"
import MonthlyTargets from "../components/dashboard/MonthlyTargets"
import KPIScore from "../components/dashboard/KPIScore"
import ActiveEnquiries from "../components/dashboard/ActiveEnquiries"

function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="py-2">

        {/* Section 1: Pipeline Stats - Top Row */}
        <section className="mb-6">
          <PipelineStats />
        </section>

        {/* Section 2: Monthly Targets & KPI Score - Two Columns on desktop, stacked on mobile */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
          <MonthlyTargets />
          <KPIScore />
        </section>

        {/* Section 3: Active Enquiries Table */}
        <section className="mb-6">
          <ActiveEnquiries />
        </section>

        {/* Section 4: Existing Dashboard Metrics */}
        <section className="mb-6">
          <DashboardMetrics />
        </section>

        {/* Section 5: Charts */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6">
          <div className="p-4 md:p-6">
            <DashboardCharts />
          </div>
        </section>

      </div>
    </div>
  )
}

export default Dashboard
