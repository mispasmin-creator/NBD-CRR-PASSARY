"use client"

function PipelineStats({ filters }) {
    // Mock the data change based on filters
    const baseTotal = 17.8;
    const baseNBD = 9.8;
    const baseCRR = 8.1;

    let multiplier = 1;
    if (filters?.dateRange === "Weekly") multiplier = 0.25;
    else if (filters?.dateRange === "Quarterly") multiplier = 3;
    else if (filters?.dateRange === "Yearly") multiplier = 12;

    let showTotal = baseTotal * multiplier;
    let showNBD = baseNBD * multiplier;
    let showCRR = baseCRR * multiplier;

    if (filters?.type === "NBD") { showTotal = showNBD; showCRR = 0; }
    else if (filters?.type === "CRR") { showTotal = showCRR; showNBD = 0; }
    else if (filters?.type === "NBD-CRR") { showTotal = 2.5 * multiplier; showNBD = 0; showCRR = 0; }

    const followUps = Math.round(4 * multiplier) || 1;
    
    const rangeText = filters?.dateRange === "Weekly" ? "last week" : filters?.dateRange === "Quarterly" ? "last quarter" : filters?.dateRange === "Yearly" ? "last year" : "last month";

    const stats = [
        { label: "Total Pipeline", value: `₹${showTotal.toFixed(1)}L`, change: `↑ 15% from ${rangeText}`, color: "text-indigo-600", bgColor: "bg-gradient-to-br from-indigo-50 to-blue-50", borderColor: "border-indigo-100", icon: "trending_up", iconBg: "bg-white shadow-sm border border-indigo-100", iconColor: "text-indigo-600" },
        { label: "NBD Pipeline", value: `₹${showNBD.toFixed(1)}L`, change: `↑ 22% from ${rangeText}`, color: "text-emerald-600", bgColor: "bg-gradient-to-br from-emerald-50 to-green-50", borderColor: "border-emerald-100", icon: "trending_up", iconBg: "bg-white shadow-sm border border-emerald-100", iconColor: "text-emerald-600" },
        { label: "CRR Pipeline", value: `₹${showCRR.toFixed(1)}L`, change: `↑ 8% from ${rangeText}`, color: "text-violet-600", bgColor: "bg-gradient-to-br from-violet-50 to-purple-50", borderColor: "border-violet-100", icon: "groups", iconBg: "bg-white shadow-sm border border-violet-100", iconColor: "text-violet-600" },
        { label: "Follow-ups", value: `${followUps}`, change: "near closure", color: "text-orange-600", bgColor: "bg-gradient-to-br from-orange-50 to-amber-50", borderColor: "border-orange-100", icon: "calendar_today", iconBg: "bg-white shadow-sm border border-orange-100", iconColor: "text-orange-600" },
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {stats.map((stat, i) => (
                <div key={i} className={`${stat.bgColor} rounded-2xl p-5 md:p-6 border ${stat.borderColor} shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group`}>
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest truncate">{stat.label}</p>
                            <h3 className={`text-2xl md:text-3xl font-extrabold mt-2 tracking-tight ${stat.color}`}>{stat.value}</h3>
                            <p className="text-[11px] font-semibold text-slate-600 bg-white/60 inline-block px-2.5 py-1 rounded-md mt-3 truncate">{stat.change}</p>
                        </div>
                        <div className={`${stat.iconBg} ${stat.iconColor} p-3.5 rounded-xl flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                            <span className="material-icons text-xl md:text-2xl">{stat.icon}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default PipelineStats
