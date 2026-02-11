"use client"

import { useState } from "react"

function RiskControl() {
    const [selectedCategory, setSelectedCategory] = useState("all")

    const riskMatrix = [
        { id: 1, risk: "Data Breach", category: "Security", likelihood: "Low", impact: "Critical", status: "Monitored", mitigation: "Encryption, Access Controls" },
        { id: 2, risk: "Revenue Target Miss", category: "Financial", likelihood: "Medium", impact: "High", status: "Active", mitigation: "Weekly reviews, Incentive programs" },
        { id: 3, risk: "Staff Turnover", category: "Operational", likelihood: "Medium", impact: "Medium", status: "Monitored", mitigation: "Retention programs, Training" },
        { id: 4, risk: "Compliance Violation", category: "Legal", likelihood: "Low", impact: "High", status: "Controlled", mitigation: "Regular audits, Policy updates" },
        { id: 5, risk: "System Downtime", category: "Technical", likelihood: "Low", impact: "High", status: "Controlled", mitigation: "Redundancy, Backups" },
    ]

    const complianceStatus = [
        { item: "Data Protection Policy", status: "Compliant", lastReview: "2024-12-01" },
        { item: "Sales Process Guidelines", status: "Compliant", lastReview: "2024-11-15" },
        { item: "Customer Privacy Standards", status: "Pending Review", lastReview: "2024-10-01" },
        { item: "Financial Reporting", status: "Compliant", lastReview: "2024-12-15" },
    ]

    const auditLogs = [
        { time: "2024-12-23 10:30", user: "Admin", action: "Updated risk assessment", details: "Modified Data Breach mitigation" },
        { time: "2024-12-22 14:20", user: "System", action: "Compliance check", details: "All systems verified" },
        { time: "2024-12-21 09:15", user: "Admin", action: "Policy update", details: "Sales guidelines revised" },
        { time: "2024-12-20 16:45", user: "Admin", action: "User audit", details: "Access review completed" },
    ]

    const categories = ["all", "Security", "Financial", "Operational", "Legal", "Technical"]
    const filteredRisks = riskMatrix.filter(r => selectedCategory === "all" || r.category === selectedCategory)

    const getStatusColor = (s) => ({ "Active": "bg-red-100 text-red-800", "Monitored": "bg-yellow-100 text-yellow-800", "Controlled": "bg-green-100 text-green-800" }[s] || "bg-gray-100 text-gray-800")
    const getImpactColor = (i) => ({ "Critical": "text-red-600", "High": "text-orange-600", "Medium": "text-yellow-600", "Low": "text-green-600" }[i] || "text-gray-600")
    const getLikelihoodColor = (l) => ({ "High": "text-red-600", "Medium": "text-yellow-600", "Low": "text-green-600" }[l] || "text-gray-600")

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="py-2">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Risk & Control</h1>
                    <p className="text-slate-600 mt-1">Monitor risks, compliance, and audit activities</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow-md p-4"><div className="text-sm text-slate-500">Total Risks</div><div className="text-2xl font-bold text-slate-800">{riskMatrix.length}</div></div>
                    <div className="bg-white rounded-lg shadow-md p-4"><div className="text-sm text-slate-500">Active Risks</div><div className="text-2xl font-bold text-red-600">{riskMatrix.filter(r => r.status === "Active").length}</div></div>
                    <div className="bg-white rounded-lg shadow-md p-4"><div className="text-sm text-slate-500">Monitored</div><div className="text-2xl font-bold text-yellow-600">{riskMatrix.filter(r => r.status === "Monitored").length}</div></div>
                    <div className="bg-white rounded-lg shadow-md p-4"><div className="text-sm text-slate-500">Controlled</div><div className="text-2xl font-bold text-green-600">{riskMatrix.filter(r => r.status === "Controlled").length}</div></div>
                </div>

                {/* Risk Matrix */}
                <div className="bg-white rounded-lg shadow-md mb-6">
                    <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="text-lg font-semibold text-slate-800">Risk Assessment Matrix</h2>
                        <div className="flex gap-2 flex-wrap">
                            {categories.map(c => (
                                <button key={c} onClick={() => setSelectedCategory(c)} className={`px-3 py-1 rounded-md text-sm capitalize ${selectedCategory === c ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{c}</button>
                            ))}
                        </div>
                    </div>
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Risk</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Likelihood</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Impact</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Mitigation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredRisks.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-800">{r.risk}</td>
                                    <td className="px-6 py-4 text-slate-600">{r.category}</td>
                                    <td className={`px-6 py-4 font-medium ${getLikelihoodColor(r.likelihood)}`}>{r.likelihood}</td>
                                    <td className={`px-6 py-4 font-medium ${getImpactColor(r.impact)}`}>{r.impact}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(r.status)}`}>{r.status}</span></td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">{r.mitigation}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Compliance Status */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Compliance Status</h2>
                        <div className="space-y-3">
                            {complianceStatus.map((c, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <div>
                                        <div className="font-medium text-slate-800">{c.item}</div>
                                        <div className="text-sm text-slate-500">Last reviewed: {c.lastReview}</div>
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded-full ${c.status === "Compliant" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{c.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Audit Log */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Audit Log</h2>
                        <div className="space-y-3">
                            {auditLogs.map((l, i) => (
                                <div key={i} className="border-b border-slate-100 pb-3 last:border-0">
                                    <div className="flex justify-between">
                                        <span className="font-medium text-slate-800">{l.action}</span>
                                        <span className="text-xs text-slate-400">{l.time}</span>
                                    </div>
                                    <div className="text-sm text-slate-500">{l.user} - {l.details}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RiskControl
