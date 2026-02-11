"use client"

function MonthlyTargets() {
    const targets = [
        { type: "NBD", label: "New Business", achieved: 45, target: 60, remaining: 15, percentage: 75, color: "bg-blue-500", bgColor: "bg-blue-100", textColor: "text-blue-700" },
        { type: "NBD-CRR", label: "New to Repeat", achieved: 32, target: 40, remaining: 8, percentage: 80, color: "bg-gradient-to-r from-blue-500 to-green-500", bgColor: "bg-gradient-to-r from-blue-100 to-green-100", textColor: "text-slate-700" },
        { type: "CRR", label: "Customer Retention", achieved: 28, target: 35, remaining: 7, percentage: 80, color: "bg-green-500", bgColor: "bg-green-100", textColor: "text-green-700" },
    ]

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 md:p-6 h-full">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
                <span className="material-icons text-green-500 text-xl md:text-2xl">track_changes</span>
                <h2 className="text-base md:text-lg font-semibold text-slate-800">Monthly Targets & Achievement</h2>
            </div>

            <div className="space-y-4 md:space-y-5">
                {targets.map((t, i) => (
                    <div key={i} className="p-3 md:p-0 bg-slate-50 md:bg-transparent rounded-lg">
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-[10px] md:text-xs font-semibold rounded ${t.bgColor} ${t.textColor}`}>{t.type}</span>
                                <span className="text-xs md:text-sm text-slate-600">{t.label}</span>
                            </div>
                            <div className="text-xs md:text-sm">
                                <span className="font-bold text-slate-800">₹{t.achieved}L</span>
                                <span className="text-slate-400"> / ₹{t.target}L</span>
                            </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 md:h-2.5">
                            <div className={`h-2 md:h-2.5 rounded-full ${t.color} transition-all duration-500`} style={{ width: `${t.percentage}%` }}></div>
                        </div>
                        <p className="text-[10px] md:text-xs text-slate-400 mt-1.5">{t.percentage}% achieved • ₹{t.remaining}L remaining</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default MonthlyTargets
