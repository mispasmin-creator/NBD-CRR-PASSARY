"use client"

import { useState } from "react"

function Analytics() {
    const [dateRange, setDateRange] = useState("month")

    const metrics = [
        { label: "Total Sales", value: "₹24,50,000", change: "+12%", positive: true },
        { label: "Conversion Rate", value: "32%", change: "+5%", positive: true },
        { label: "Active Leads", value: "156", change: "+8%", positive: true },
        { label: "Avg. Deal Size", value: "₹1,25,000", change: "-3%", positive: false },
    ]

    const salesByRep = [
        { name: "John Doe", sales: 850000, deals: 12, conversion: 38 },
        { name: "Jane Smith", sales: 720000, deals: 10, conversion: 35 },
        { name: "Mike Brown", sales: 580000, deals: 8, conversion: 28 },
        { name: "Sarah Wilson", sales: 450000, deals: 6, conversion: 25 },
    ]

    const salesByRegion = [
        { region: "Mumbai", sales: 980000, percentage: 40 },
        { region: "Delhi", sales: 735000, percentage: 30 },
        { region: "Bangalore", sales: 490000, percentage: 20 },
        { region: "Chennai", sales: 245000, percentage: 10 },
    ]

    const monthlyTrend = [
        { month: "Jan", sales: 1800000 },
        { month: "Feb", sales: 2100000 },
        { month: "Mar", sales: 1950000 },
        { month: "Apr", sales: 2300000 },
        { month: "May", sales: 2450000 },
        { month: "Jun", sales: 2200000 },
    ]

    const maxSales = Math.max(...monthlyTrend.map(m => m.sales))

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="py-2">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Analytics & Reports</h1>
                        <p className="text-slate-600 mt-1">Track sales performance and insights</p>
                    </div>
                    <div className="flex gap-2 mt-4 md:mt-0">
                        {["week", "month", "quarter", "year"].map(range => (
                            <button key={range} onClick={() => setDateRange(range)} className={`px-4 py-2 rounded-md font-medium capitalize ${dateRange === range ? "bg-sky-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>{range}</button>
                        ))}
                    </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {metrics.map((m, i) => (
                        <div key={i} className="bg-white rounded-lg shadow-md p-6">
                            <div className="text-sm text-slate-500">{m.label}</div>
                            <div className="text-2xl font-bold text-slate-800 mt-1">{m.value}</div>
                            <div className={`text-sm font-medium mt-2 ${m.positive ? "text-green-600" : "text-red-600"}`}>{m.change} vs last {dateRange}</div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Sales Trend Chart */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Sales Trend</h2>
                        <div className="flex items-end justify-between h-48 gap-2">
                            {monthlyTrend.map((m, i) => (
                                <div key={i} className="flex flex-col items-center flex-1">
                                    <div className="w-full bg-sky-500 rounded-t transition-all hover:bg-sky-600" style={{ height: `${(m.sales / maxSales) * 100}%` }} title={`₹${(m.sales / 100000).toFixed(1)}L`}></div>
                                    <div className="text-xs text-slate-500 mt-2">{m.month}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sales by Region */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Sales by Region</h2>
                        <div className="space-y-4">
                            {salesByRegion.map((r, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-600">{r.region}</span>
                                        <span className="font-medium">₹{(r.sales / 100000).toFixed(1)}L ({r.percentage}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div className="bg-sky-500 h-2 rounded-full transition-all" style={{ width: `${r.percentage}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sales by Rep Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="p-6 border-b">
                        <h2 className="text-lg font-semibold text-slate-800">Sales Rep Performance</h2>
                    </div>
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Sales Rep</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Total Sales</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Deals Closed</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Conversion Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {salesByRep.map((rep, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-800">{rep.name}</td>
                                    <td className="px-6 py-4 text-slate-600">₹{(rep.sales / 100000).toFixed(1)}L</td>
                                    <td className="px-6 py-4 text-slate-600">{rep.deals}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-20 bg-slate-100 rounded-full h-2">
                                                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${rep.conversion}%` }}></div>
                                            </div>
                                            <span className="text-slate-600">{rep.conversion}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Export Button */}
                <div className="mt-6 flex justify-end">
                    <button className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-6 rounded-md flex items-center gap-2">
                        <span className="material-icons text-sm">download</span> Export Report
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Analytics
