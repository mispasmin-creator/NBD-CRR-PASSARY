"use client"

function PipelineStats() {
    const stats = [
        { label: "Total Pipeline", value: "₹17.8L", change: "↑ 15% from last month", color: "text-sky-600", bgColor: "bg-gradient-to-br from-sky-50 to-blue-50", borderColor: "border-sky-200", icon: "trending_up", iconBg: "bg-sky-100", iconColor: "text-sky-600" },
        { label: "NBD Pipeline", value: "₹9.8L", change: "↑ 22% growth quality", color: "text-emerald-600", bgColor: "bg-gradient-to-br from-emerald-50 to-green-50", borderColor: "border-emerald-200", icon: "trending_up", iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
        { label: "CRR Pipeline", value: "₹8.1L", change: "↑ 8% retention", color: "text-violet-600", bgColor: "bg-gradient-to-br from-violet-50 to-purple-50", borderColor: "border-violet-200", icon: "groups", iconBg: "bg-violet-100", iconColor: "text-violet-600" },
        { label: "Follow-ups Today", value: "0", change: "4 near closure", color: "text-orange-600", bgColor: "bg-gradient-to-br from-orange-50 to-amber-50", borderColor: "border-orange-200", icon: "calendar_today", iconBg: "bg-orange-100", iconColor: "text-orange-600" },
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {stats.map((stat, i) => (
                <div key={i} className={`${stat.bgColor} rounded-xl p-4 md:p-5 border ${stat.borderColor} shadow-sm hover:shadow-md transition-all duration-200`}>
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs md:text-sm text-slate-500 font-medium truncate">{stat.label}</p>
                            <h3 className={`text-xl md:text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</h3>
                            <p className="text-[10px] md:text-xs text-slate-400 mt-1.5 md:mt-2 truncate">{stat.change}</p>
                        </div>
                        <div className={`${stat.iconBg} ${stat.iconColor} p-2 md:p-2.5 rounded-lg flex-shrink-0`}>
                            <span className="material-icons text-lg md:text-xl">{stat.icon}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default PipelineStats
