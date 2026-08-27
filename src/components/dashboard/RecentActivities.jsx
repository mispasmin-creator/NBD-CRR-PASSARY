function RecentActivities() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 p-5 md:p-7 h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-6 md:mb-8 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#E5E7EB] p-2 rounded-xl text-[#4F46E5] shadow-inner">
            <span className="material-icons text-xl md:text-2xl block">history</span>
          </div>
          <h2 className="text-lg md:text-xl font-extrabold text-foreground tracking-tight">Recent Activity</h2>
        </div>
        <button type="button" className="text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors cursor-pointer">
          See All
        </button>
      </div>

      <div className="flex-1 space-y-1">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-start gap-3.5 py-3 border-b border-slate-100 last:border-0">
            <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {activity.user.charAt(0)}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground truncate">{activity.user}</p>
                <span className="shrink-0 text-[11px] text-muted-foreground">{activity.time}</span>
              </div>
              <p className="text-sm text-muted-foreground">{activity.action}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getBadgeColor(activity.type)}`}
                >
                  {activity.type}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">{activity.detail}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getBadgeColor(type) {
  switch (type) {
    case "Lead":
      return "bg-blue-100 text-blue-800"
    case "Follow-up":
      return "bg-blue-100 text-blue-800"
    case "Quotation":
      return "bg-sky-100 text-sky-800"
    case "Order":
      return "bg-emerald-100 text-emerald-800"
    default:
      return "bg-muted/50 text-foreground"
  }
}

const activities = [
  {
    user: "John Doe",
    action: "Created a new lead",
    type: "Lead",
    detail: "ABC Corp",
    time: "10 min ago",
  },
  {
    user: "Jane Smith",
    action: "Completed follow-up call",
    type: "Follow-up",
    detail: "XYZ Industries",
    time: "1 hour ago",
  },
  {
    user: "Mike Johnson",
    action: "Sent quotation",
    type: "Quotation",
    detail: "Q-005 to PQR Ltd",
    time: "3 hours ago",
  },
  {
    user: "Sarah Williams",
    action: "Received order confirmation",
    type: "Order",
    detail: "Order #1234 from ABC Corp",
    time: "Yesterday",
  },
  {
    user: "David Brown",
    action: "Updated lead information",
    type: "Lead",
    detail: "LMN Enterprises",
    time: "Yesterday",
  },
]

export default RecentActivities
