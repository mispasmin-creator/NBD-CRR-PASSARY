"use client"

function MonthlyTargets({ filters }) {
    const rawTargets = [
        { type: "NBD", label: "New Business", achieved: 45, target: 60, percentage: 75, color: "bg-blue-500", bgColor: "bg-blue-100", textColor: "text-blue-700" },
        { type: "NBD-CRR", label: "New to Repeat", achieved: 32, target: 40, percentage: 80, color: "bg-gradient-to-r from-blue-500 to-green-500", bgColor: "bg-gradient-to-r from-blue-100 to-green-100", textColor: "text-slate-700" },
        { type: "CRR", label: "Customer Retention", achieved: 28, target: 35, percentage: 80, color: "bg-green-500", bgColor: "bg-green-100", textColor: "text-green-700" },
    ]

    let multiplier = 1;
    if (filters?.dateRange === "Weekly") multiplier = 0.25;
    else if (filters?.dateRange === "Quarterly") multiplier = 3;
    else if (filters?.dateRange === "Yearly") multiplier = 12;

    const targets = rawTargets.filter(t => {
        if (!filters) return true;
        if (filters.type !== "All" && t.type !== filters.type) return false;
        return true;
    }).map(t => {
        const adjustedAchieved = t.achieved * multiplier;
        const adjustedTarget = t.target * multiplier;
        return {
            ...t,
            achieved: adjustedAchieved,
            target: adjustedTarget,
            remaining: adjustedTarget - adjustedAchieved,
        }
    });

    const rangeText = filters?.dateRange === "Weekly" ? "Weekly" : filters?.dateRange === "Quarterly" ? "Quarterly" : filters?.dateRange === "Yearly" ? "Yearly" : "Monthly";

    return (
        <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 border border-slate-200 p-5 md:p-7 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6 md:mb-8 border-b border-slate-100 pb-4">
                <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600 shadow-inner">
                    <span className="material-icons text-xl md:text-2xl block">track_changes</span>
                </div>
                <h2 className="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight">{rangeText} Targets & Achievements</h2>
            </div>

            <div className="space-y-6 md:space-y-7 flex-1 flex flex-col justify-center">
                {targets.map((t, i) => (
                    <div key={i} className="p-4 md:p-5 bg-slate-50 border border-slate-100 hover:border-slate-300 hover:bg-white shadow-sm hover:shadow-md transition-all rounded-2xl group">
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                            <div className="flex items-center gap-3">
                                <span className={`px-2.5 py-1 text-[11px] md:text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm border border-slate-200/50 ${t.bgColor} ${t.textColor} group-hover:scale-105 transition-transform`}>{t.type}</span>
                                <span className="text-sm md:text-base font-semibold text-slate-700">{t.label}</span>
                            </div>
                            <div className="text-sm md:text-base bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                                <span className="font-extrabold text-slate-800">₹{t.achieved.toFixed(1)}L</span>
                                <span className="text-slate-400 font-medium ml-1">/ ₹{t.target.toFixed(1)}L</span>
                            </div>
                        </div>
                        <div className="w-full bg-slate-200/80 rounded-full h-3 md:h-3.5 shadow-inner mt-4 overflow-hidden relative">
                            <div className={`h-full rounded-full ${t.color} shadow-sm transition-all duration-1000 ease-out`} style={{ width: `${t.percentage}%` }}></div>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                            <p className="text-[11px] md:text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">{t.percentage}% achieved</p>
                            <p className="text-[11px] md:text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">₹{t.remaining.toFixed(1)}L remaining</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default MonthlyTargets
