"use client"

import { useState, useContext } from "react"
import { AuthContext } from "../App"

function Complaints() {
    const { showNotification } = useContext(AuthContext)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [showForm, setShowForm] = useState(false)
    const [selectedComplaint, setSelectedComplaint] = useState(null)

    const [complaints, setComplaints] = useState([
        { id: 1, customerName: "ABC Corp", contactPerson: "John Doe", phone: "9876543210", subject: "Product Quality Issue", priority: "High", status: "Open", createdDate: "2024-12-20", description: "Product not working as expected after 2 weeks" },
        { id: 2, customerName: "XYZ Ltd", contactPerson: "Jane Smith", phone: "9876543211", subject: "Delayed Delivery", priority: "Medium", status: "In Progress", createdDate: "2024-12-19", description: "Order delayed by 5 days" },
        { id: 3, customerName: "Tech Solutions", contactPerson: "Mike Brown", phone: "9876543212", subject: "Billing Discrepancy", priority: "Low", status: "Resolved", createdDate: "2024-12-18", description: "Invoice amount mismatch" },
    ])

    const [formData, setFormData] = useState({ customerName: "", contactPerson: "", phone: "", subject: "", priority: "Medium", description: "" })

    const filteredComplaints = complaints.filter(c => {
        const matchesSearch = c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || c.subject.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === "all" || c.status === statusFilter
        return matchesSearch && matchesStatus
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        setComplaints([{ id: complaints.length + 1, ...formData, status: "Open", createdDate: new Date().toISOString().split('T')[0] }, ...complaints])
        setFormData({ customerName: "", contactPerson: "", phone: "", subject: "", priority: "Medium", description: "" })
        setShowForm(false)
        showNotification("Complaint registered successfully", "success")
    }

    const updateStatus = (id, status) => {
        setComplaints(complaints.map(c => c.id === id ? { ...c, status } : c))
        showNotification(`Complaint marked as ${status}`, "success")
        setSelectedComplaint(null)
    }

    const getStatusColor = (s) => ({ "Open": "bg-red-100 text-red-800", "In Progress": "bg-yellow-100 text-yellow-800", "Resolved": "bg-green-100 text-green-800", "Closed": "bg-gray-100 text-gray-800" }[s] || "bg-gray-100 text-gray-800")
    const getPriorityColor = (p) => ({ "High": "bg-red-100 text-red-800", "Medium": "bg-orange-100 text-orange-800", "Low": "bg-green-100 text-green-800" }[p] || "bg-gray-100 text-gray-800")

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="py-2">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Complaints</h1>
                    <p className="text-slate-600 mt-1">Manage customer complaints and issues</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow-md p-4"><div className="text-sm text-slate-500">Total</div><div className="text-2xl font-bold text-slate-800">{complaints.length}</div></div>
                    <div className="bg-white rounded-lg shadow-md p-4"><div className="text-sm text-slate-500">Open</div><div className="text-2xl font-bold text-red-600">{complaints.filter(c => c.status === "Open").length}</div></div>
                    <div className="bg-white rounded-lg shadow-md p-4"><div className="text-sm text-slate-500">In Progress</div><div className="text-2xl font-bold text-yellow-600">{complaints.filter(c => c.status === "In Progress").length}</div></div>
                    <div className="bg-white rounded-lg shadow-md p-4"><div className="text-sm text-slate-500">Resolved</div><div className="text-2xl font-bold text-green-600">{complaints.filter(c => c.status === "Resolved").length}</div></div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="flex flex-col sm:flex-row gap-4 flex-1">
                            <input type="text" placeholder="Search complaints..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-4 py-2 border rounded-md flex-1 focus:ring-2 focus:ring-sky-500" />
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border rounded-md">
                                <option value="all">All Statuses</option>
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Closed">Closed</option>
                            </select>
                        </div>
                        <button onClick={() => setShowForm(!showForm)} className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-md">+ New Complaint</button>
                    </div>
                </div>

                {showForm && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4">Register New Complaint</h2>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder="Customer Name" required value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} className="px-4 py-2 border rounded-md" />
                            <input type="text" placeholder="Contact Person" required value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} className="px-4 py-2 border rounded-md" />
                            <input type="tel" placeholder="Phone" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="px-4 py-2 border rounded-md" />
                            <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="px-4 py-2 border rounded-md">
                                <option value="High">High Priority</option>
                                <option value="Medium">Medium Priority</option>
                                <option value="Low">Low Priority</option>
                            </select>
                            <input type="text" placeholder="Subject" required value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="px-4 py-2 border rounded-md md:col-span-2" />
                            <textarea placeholder="Description" required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="px-4 py-2 border rounded-md md:col-span-2" rows={3} />
                            <div className="md:col-span-2 flex gap-2">
                                <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white py-2 px-6 rounded-md">Submit</button>
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
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Subject</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Priority</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredComplaints.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedComplaint(c)}>
                                    <td className="px-6 py-4"><div className="font-medium">{c.customerName}</div><div className="text-sm text-slate-500">{c.contactPerson}</div></td>
                                    <td className="px-6 py-4 text-slate-600">{c.subject}</td>
                                    <td className="px-6 py-4 text-slate-600">{c.createdDate}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(c.priority)}`}>{c.priority}</span></td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(c.status)}`}>{c.status}</span></td>
                                    <td className="px-6 py-4">
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedComplaint(c); }} className="text-sky-600 hover:text-sky-800 text-sm">View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredComplaints.length === 0 && <div className="text-center py-12 text-slate-500">No complaints found.</div>}
                </div>

                {selectedComplaint && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedComplaint(null)}>
                        <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
                            <h2 className="text-xl font-bold mb-4">{selectedComplaint.subject}</h2>
                            <div className="space-y-3 mb-6">
                                <div><span className="font-medium">Customer:</span> {selectedComplaint.customerName}</div>
                                <div><span className="font-medium">Contact:</span> {selectedComplaint.contactPerson} ({selectedComplaint.phone})</div>
                                <div><span className="font-medium">Date:</span> {selectedComplaint.createdDate}</div>
                                <div><span className="font-medium">Priority:</span> <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(selectedComplaint.priority)}`}>{selectedComplaint.priority}</span></div>
                                <div><span className="font-medium">Status:</span> <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedComplaint.status)}`}>{selectedComplaint.status}</span></div>
                                <div><span className="font-medium">Description:</span> {selectedComplaint.description}</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedComplaint.status === "Open" && <button onClick={() => updateStatus(selectedComplaint.id, "In Progress")} className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-md">Start Progress</button>}
                                {selectedComplaint.status === "In Progress" && <button onClick={() => updateStatus(selectedComplaint.id, "Resolved")} className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md">Mark Resolved</button>}
                                {selectedComplaint.status === "Resolved" && <button onClick={() => updateStatus(selectedComplaint.id, "Closed")} className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md">Close</button>}
                                <button onClick={() => setSelectedComplaint(null)} className="bg-gray-200 hover:bg-gray-300 py-2 px-4 rounded-md">Close Modal</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Complaints
