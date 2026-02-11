"use client"

function KPIScore() {
    const kpiBreakdown = [
        { label: "NBD Performance (40%)", score: 35, max: 40 },
        { label: "Retention (30%)", score: 25, max: 30 },
        { label: "Follow-up Discipline (20%)", score: 15, max: 20 },
        { label: "Process Hygiene (10%)", score: 7, max: 10 },
    ]

    const overallScore = 82
    const grade = overallScore >= 80 ? "A" : overallScore >= 70 ? "B" : overallScore >= 60 ? "C" : "D"

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 md:p-6 h-full">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
                <span className="material-icons text-amber-500 text-xl md:text-2xl">emoji_events</span>
                <h2 className="text-base md:text-lg font-semibold text-slate-800">KPI Score & Incentive</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
                {/* Score Circle */}
                <div className="flex flex-col items-center justify-center mx-auto sm:mx-0">
                    <div className="relative w-24 h-24 md:w-28 md:h-28">
                        <svg className="w-24 h-24 md:w-28 md:h-28 transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                            <circle cx="50" cy="50" r="40" stroke="url(#kpiGradient)" strokeWidth="8" fill="none"
                                strokeDasharray={`${overallScore * 2.51} 251`} strokeLinecap="round" />
                            <defs>
                                <linearGradient id="kpiGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl md:text-3xl font-bold text-slate-800">{overallScore}</span>
                            <span className="text-xs md:text-sm text-slate-400">/100</span>
                        </div>
                    </div>
                    <div className="flex gap-1.5 md:gap-2 mt-2 md:mt-3">
                        <span className="px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-medium rounded bg-blue-100 text-blue-700">Grade: {grade}</span>
                        <span className="px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-medium rounded bg-green-100 text-green-700">Above Target</span>
                    </div>
                </div>

                {/* Breakdown */}
                <div className="flex-1 space-y-2 md:space-y-3">
                    {kpiBreakdown.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-xs md:text-sm p-2 md:p-0 bg-slate-50 md:bg-transparent rounded">
                            <span className="text-slate-600">{item.label}</span>
                            <span className="font-semibold text-slate-800">{item.score}/{item.max}</span>
                        </div>
                    ))}

                    <div className="border-t border-slate-100 pt-3 md:pt-4 mt-3 md:mt-4">
                        <p className="text-xs md:text-sm text-slate-500">Projected Monthly Incentive</p>
                        <p className="text-xl md:text-2xl font-bold text-green-600">₹2.8L</p>
                        <p className="text-[10px] md:text-xs text-slate-400 mt-0.5">Based on current achievement & quality gates</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default KPIScore
