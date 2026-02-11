"use client"

import { useState, useContext } from "react"
import { AuthContext } from "../App"

function VisitFMS() {
    const { showNotification } = useContext(AuthContext)
    const [statusFilter, setStatusFilter] = useState("all")
    const [showForm, setShowForm] = useState(false)

    const [visits, setVisits] = useState([
        { id: 1, customerName: "ABC Corp", location: "Mumbai", salesRep: "John Doe", visitDate: "2024-12-23", visitTime: "10:00", duration: "2 hours", status: "Scheduled", outcome: "" },
        { id: 2, customerName: "XYZ Ltd", location: "Pune", salesRep: "Jane Smith", visitDate: "2024-12-22", visitTime: "14:00", duration: "1.5 hours", status: "Completed", outcome: "Positive" },
        { id: 3, customerName: "Tech Solutions", location: "Bangalore", salesRep: "Mike Brown", visitDate: "2024-12-21", visitTime: "11:00", duration: "1 hour", status: "Cancelled", outcome: "" },
    ])

    const [formData, setFormData] = useState({ customerName: "", location: "", salesRep: "", visitDate: "", visitTime: "", duration: "", notes: "" })

    const filteredVisits = visits.filter(v => statusFilter === "all" || v.status === statusFilter)

    const handleSubmit = (e) => {
        e.preventDefault()
        setVisits([{ id: visits.length + 1, ...formData, status: "Scheduled", outcome: "" }, ...visits])
        setFormData({ customerName: "", location: "", salesRep: "", visitDate: "", visitTime: "", duration: "", notes: "" })
        setShowForm(false)
        showNotification("Visit scheduled successfully", "success")
    }

    const updateStatus = (id, status) => {
        setVisits(visits.map(v => v.id === id ? { ...v, status, outcome: status === "Completed" ? "Positive" : "" } : v))
        showNotification(`Visit marked as ${status}`, "success")
    }

    const getStatusColor = (s) => s === "Scheduled" ? "bg-blue-100 text-blue-800" : s === "Completed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="py-2">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Visit FMS</h1>
                    <p className="text-slate-600 mt-1">Field Marketing Service visit tracking</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow-md p-4"><div className="text-sm text-slate-500">Scheduled</div><div className="text-2xl font-bold text-blue-600">{visits.filter(v => v.status === "Scheduled").length}</div></div>
                    <div className="bg-white rounded-lg shadow-md p-4"><div className="text-sm text-slate-500">Completed</div><div className="text-2xl font-bold text-green-600">{visits.filter(v => v.status === "Completed").length}</div></div>
                    <div className="bg-white rounded-lg shadow-md p-4"><div className="text-sm text-slate-500">Cancelled</div><div className="text-2xl font-bold text-red-600">{visits.filter(v => v.status === "Cancelled").length}</div></div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500">
                            <option value="all">All Statuses</option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                        <button onClick={() => setShowForm(!showForm)} className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-md">+ Schedule Visit</button>
                    </div>
                </div>

                {showForm && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4">Schedule New Visit</h2>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input type="text" placeholder="Customer Name" required value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} className="px-4 py-2 border rounded-md" />
                            <input type="text" placeholder="Location" required value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="px-4 py-2 border rounded-md" />
                            <input type="text" placeholder="Sales Rep" required value={formData.salesRep} onChange={(e) => setFormData({ ...formData, salesRep: e.target.value })} className="px-4 py-2 border rounded-md" />
                            <input type="date" required value={formData.visitDate} onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })} className="px-4 py-2 border rounded-md" />
                            <input type="time" required value={formData.visitTime} onChange={(e) => setFormData({ ...formData, visitTime: e.target.value })} className="px-4 py-2 border rounded-md" />
                            <input type="text" placeholder="Duration" required value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} className="px-4 py-2 border rounded-md" />
                            <div className="md:col-span-3 flex gap-2">
                                <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white py-2 px-6 rounded-md">Schedule</button>
                                <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 hover:bg-gray-300 py-2 px-6 rounded-md">Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Location</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Sales Rep</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date & Time</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredVisits.map((v) => (
                                <tr key={v.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium">{v.customerName}</td>
                                    <td className="px-6 py-4 text-slate-600">{v.location}</td>
                                    <td className="px-6 py-4 text-slate-600">{v.salesRep}</td>
                                    <td className="px-6 py-4">{v.visitDate} {v.visitTime}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(v.status)}`}>{v.status}</span></td>
                                    <td className="px-6 py-4">
                                        {v.status === "Scheduled" && (
                                            <div className="flex gap-2">
                                                <button onClick={() => updateStatus(v.id, "Completed")} className="text-green-600 hover:text-green-800 text-sm">Complete</button>
                                                <button onClick={() => updateStatus(v.id, "Cancelled")} className="text-red-600 hover:text-red-800 text-sm">Cancel</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredVisits.length === 0 && <div className="text-center py-12 text-slate-500">No visits found.</div>}
                </div>
            </div>
        </div>
    )
}

export default VisitFMS
