"use client"

function ActiveEnquiries() {
    const enquiries = [
        { id: "ENQ001", customer: "Acme Corp", type: "NBD", value: "₹2.5L", stage: "Proposal", stageColor: "bg-orange-100 text-orange-700", nextFollowup: "12/17/2024", overdue: false, daysOld: 15, daysOldColor: "text-slate-600", assignedTo: "Salesperson A" },
        { id: "ENQ002", customer: "TechStart Inc", type: "CRR", value: "₹1.8L", stage: "Negotiation", stageColor: "bg-purple-100 text-purple-700", nextFollowup: "12/15/2024", overdue: true, daysOld: 26, daysOldColor: "text-red-600", assignedTo: "Salesperson A" },
        { id: "ENQ003", customer: "Global Solutions", type: "NBD", value: "₹4.2L", stage: "Qualified", stageColor: "bg-blue-100 text-blue-700", nextFollowup: "12/18/2024", overdue: false, daysOld: 11, daysOldColor: "text-slate-600", assignedTo: "Salesperson B" },
        { id: "ENQ007", customer: "StartUp Hub", type: "NBD", value: "₹0.9L", stage: "Contacted", stageColor: "bg-sky-100 text-sky-700", nextFollowup: "12/19/2024", overdue: false, daysOld: 6, daysOldColor: "text-slate-600", assignedTo: "Salesperson A" },
        { id: "ENQ008", customer: "Enterprise Plus", type: "CRR", value: "₹4.5L", stage: "Proposal", stageColor: "bg-orange-100 text-orange-700", nextFollowup: "12/12/2024", overdue: true, daysOld: 21, daysOldColor: "text-red-600", assignedTo: "Salesperson A" },
        { id: "ENQ009", customer: "Tech Innovators", type: "NBD-CRR", value: "₹1.8L", stage: "Negotiation", stageColor: "bg-purple-100 text-purple-700", nextFollowup: "12/18/2024", overdue: false, daysOld: 8, daysOldColor: "text-slate-600", assignedTo: "Salesperson B" },
        { id: "ENQ010", customer: "Digital Wave", type: "NBD", value: "₹2.1L", stage: "New", stageColor: "bg-gray-100 text-gray-700", nextFollowup: "12/17/2024", overdue: false, daysOld: 2, daysOldColor: "text-slate-600", assignedTo: "Salesperson B" },
    ]

    const getTypeColor = (type) => {
        if (type === "NBD") return "bg-blue-500 text-white"
        if (type === "CRR") return "bg-green-500 text-white"
        return "bg-gradient-to-r from-blue-500 to-green-500 text-white"
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-slate-100">
                <h2 className="text-base md:text-lg font-semibold text-slate-800">Active Enquiries</h2>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Business Type</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Value</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Stage</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Next Follow-up</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Days Old</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned To</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {enquiries.map((e, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-blue-600">{e.id}</td>
                                <td className="px-6 py-4 text-sm text-slate-800">{e.customer}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(e.type)}`}>{e.type}</span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-slate-700">{e.value}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${e.stageColor}`}>{e.stage}</span>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <span className="text-slate-600">{e.nextFollowup}</span>
                                    {e.overdue && <span className="text-red-500 text-xs ml-1">(Overdue)</span>}
                                </td>
                                <td className={`px-6 py-4 text-sm font-medium ${e.daysOldColor}`}>{e.daysOld} days</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{e.assignedTo}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
                {enquiries.map((e, i) => (
                    <div key={i} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className="text-sm font-medium text-blue-600">{e.id}</span>
                                <h3 className="text-base font-semibold text-slate-800 mt-0.5">{e.customer}</h3>
                            </div>
                            <span className="text-lg font-bold text-slate-800">{e.value}</span>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getTypeColor(e.type)}`}>{e.type}</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${e.stageColor}`}>{e.stage}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="text-slate-400">Follow-up:</span>
                                <span className="ml-1 text-slate-600">{e.nextFollowup}</span>
                                {e.overdue && <span className="text-red-500 ml-1">(Overdue)</span>}
                            </div>
                            <div>
                                <span className="text-slate-400">Age:</span>
                                <span className={`ml-1 font-medium ${e.daysOldColor}`}>{e.daysOld} days</span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-slate-400">Assigned:</span>
                                <span className="ml-1 text-slate-600">{e.assignedTo}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ActiveEnquiries
