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
        { label: "Total Pipeline", value: `₹${showTotal.toFixed(1)}L`, change: `↑ 15% from ${rangeText}`, color: "text-[#10B981]", bgColor: "bg-white", borderColor: "border-slate-200", icon: "trending_up", iconBg: "bg-emerald-50 border border-emerald-100", iconColor: "text-[#10B981]" },
        { label: "New Business Pipeline", value: `₹${showNBD.toFixed(1)}L`, change: `↑ 22% from ${rangeText}`, color: "text-[#10B981]", bgColor: "bg-white", borderColor: "border-slate-200", icon: "trending_up", iconBg: "bg-emerald-50 border border-emerald-100", iconColor: "text-[#10B981]" },
        { label: "Retention Pipeline", value: `₹${showCRR.toFixed(1)}L`, change: `↑ 8% from ${rangeText}`, color: "text-[#06B6D4]", bgColor: "bg-white", borderColor: "border-slate-200", icon: "groups", iconBg: "bg-cyan-50 border border-cyan-100", iconColor: "text-[#06B6D4]" },
        { label: "Follow-Ups", value: `${followUps}`, change: "near closure", color: "text-[#4F46E5]", bgColor: "bg-white", borderColor: "border-slate-200", icon: "calendar_today", iconBg: "bg-indigo-50 border border-indigo-100", iconColor: "text-[#4F46E5]" },
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {stats.map((stat, i) => (
                <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest truncate mb-2">{stat.label}</p>
                            <h3 className={`text-3xl md:text-4xl font-extrabold mt-1 tracking-tight ${stat.color}`}>{stat.value}</h3>
                            <div className="mt-4 flex items-center">
                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 inline-flex items-center px-2.5 py-1 rounded-lg truncate">{stat.change}</span>
                            </div>
                        </div>
                        <div className={`${stat.iconBg} ${stat.iconColor} p-4 rounded-2xl flex-shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-sm`}>
                            <span className="material-icons text-2xl md:text-3xl">{stat.icon}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default PipelineStats
