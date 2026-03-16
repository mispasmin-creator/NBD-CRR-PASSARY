"use client"

function KPIScore({ filters }) {
    const kpiBreakdown = [
        { label: "NBD Performance (40%)", score: 35, max: 40 },
        { label: "Retention (30%)", score: 25, max: 30 },
        { label: "Follow-up Discipline (20%)", score: 15, max: 20 },
        { label: "Process Hygiene (10%)", score: 7, max: 10 },
    ]

    const overallScore = 82
    const grade = overallScore >= 80 ? "A" : overallScore >= 70 ? "B" : overallScore >= 60 ? "C" : "D"

    let multiplier = 1;
    if (filters?.dateRange === "Weekly") multiplier = 0.25;
    else if (filters?.dateRange === "Quarterly") multiplier = 3;
    else if (filters?.dateRange === "Yearly") multiplier = 12;

    const projectedIncentive = (2.8 * multiplier).toFixed(1);

    const rangeText = filters?.dateRange === "Weekly" ? "Weekly" : filters?.dateRange === "Quarterly" ? "Quarterly" : filters?.dateRange === "Yearly" ? "Yearly" : "Monthly";

    return (
        <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 border border-slate-200 p-5 md:p-7 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6 md:mb-8 border-b border-slate-100 pb-4">
                <div className="bg-amber-100 p-2 rounded-xl text-amber-600 shadow-inner">
                    <span className="material-icons text-xl md:text-2xl block">emoji_events</span>
                </div>
                <h2 className="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight">KPI Score & {rangeText} Metrics</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 md:gap-8 flex-1 justify-center items-center">
                {/* Score Circle */}
                <div className="flex flex-col items-center justify-center mx-auto sm:mx-0 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm relative group">
                    <div className="relative w-28 h-28 md:w-32 md:h-32 mb-2 group-hover:scale-105 transition-transform duration-300">
                        <svg className="w-28 h-28 md:w-32 md:h-32 transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="none" />
                            <circle cx="50" cy="50" r="40" stroke="url(#kpiGradient)" strokeWidth="8" fill="none"
                                strokeDasharray={`${overallScore * 2.51} 251`} strokeLinecap="round" className="drop-shadow-md" />
                            <defs>
                                <linearGradient id="kpiGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                            <span className="text-4xl md:text-5xl font-black text-slate-800 tracking-tighter">{overallScore}</span>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full justify-center">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-700 shadow-sm border border-indigo-200">Grade: {grade}</span>
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-700 shadow-sm border border-emerald-200">Target Hit</span>
                    </div>
                </div>

                {/* Breakdown */}
                <div className="flex-1 w-full space-y-3 md:space-y-4">
                    {kpiBreakdown.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-sm md:text-sm p-3 md:p-3.5 bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-300 shadow-sm rounded-xl transition-all">
                            <span className="text-slate-600 font-medium">{item.label}</span>
                            <span className="font-extrabold text-slate-800 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">{item.score}/{item.max}</span>
                        </div>
                    ))}

                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-100 shadow-sm mt-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">Projected {rangeText} Incentive</p>
                        <p className="text-3xl md:text-4xl font-extrabold text-emerald-700 tracking-tight drop-shadow-sm">₹{projectedIncentive}L</p>
                        <p className="text-[11px] font-medium text-emerald-600/80 mt-1.5">Based on current achievement & quality gates</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default KPIScore
