"use client"

import { useState, useContext } from "react"
import { AuthContext } from "../App"

function CRREnquiry() {
    const { showNotification } = useContext(AuthContext)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [showForm, setShowForm] = useState(false)

    // Mock data for CRR Enquiries
    const [enquiries, setEnquiries] = useState([
        { id: 1, customerName: "ABC Corp", contactPerson: "John Doe", phone: "9876543210", email: "john@abc.com", enquiryDate: "2024-12-20", status: "Pending", priority: "High", notes: "Interested in renewal" },
        { id: 2, customerName: "XYZ Ltd", contactPerson: "Jane Smith", phone: "9876543211", email: "jane@xyz.com", enquiryDate: "2024-12-19", status: "In Progress", priority: "Medium", notes: "Requested callback" },
        { id: 3, customerName: "Tech Solutions", contactPerson: "Mike Brown", phone: "9876543212", email: "mike@tech.com", enquiryDate: "2024-12-18", status: "Resolved", priority: "Low", notes: "Contract renewed" },
    ])

    const [formData, setFormData] = useState({
        customerName: "", contactPerson: "", phone: "", email: "", status: "Pending", priority: "Medium", notes: ""
    })

    const filteredEnquiries = enquiries.filter(e => {
        const matchesSearch = e.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === "all" || e.status === statusFilter
        return matchesSearch && matchesStatus
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        const newEnquiry = {
            id: enquiries.length + 1,
            ...formData,
            enquiryDate: new Date().toISOString().split('T')[0]
        }
        setEnquiries([newEnquiry, ...enquiries])
        setFormData({ customerName: "", contactPerson: "", phone: "", email: "", status: "Pending", priority: "Medium", notes: "" })
        setShowForm(false)
        showNotification("Enquiry added successfully", "success")
    }

    const getStatusColor = (status) => {
        switch (status) {
            case "Pending": return "bg-yellow-100 text-yellow-800"
            case "In Progress": return "bg-blue-100 text-blue-800"
            case "Resolved": return "bg-green-100 text-green-800"
            default: return "bg-gray-100 text-gray-800"
        }
    }

    const getPriorityColor = (priority) => {
        switch (priority) {
            case "High": return "bg-red-100 text-red-800"
            case "Medium": return "bg-orange-100 text-orange-800"
            case "Low": return "bg-green-100 text-green-800"
            default: return "bg-gray-100 text-gray-800"
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="py-2">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">CRR Enquiry</h1>
                    <p className="text-slate-600 mt-1">Manage Customer Retention Rate enquiries</p>
                </div>

                {/* Controls */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <div className="flex flex-col sm:flex-row gap-4 flex-1">
                            <input
                                type="text"
                                placeholder="Search by customer or contact..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 min-w-[250px]"
                            />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                            >
                                <option value="all">All Statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                            </select>
                        </div>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2"
                        >
                            <span className="material-icons text-sm">add</span>
                            New Enquiry
                        </button>
                    </div>
                </div>

                {/* Add Form */}
                {showForm && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4">Add New CRR Enquiry</h2>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder="Customer Name" required value={formData.customerName}
                                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500" />
                            <input type="text" placeholder="Contact Person" required value={formData.contactPerson}
                                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500" />
                            <input type="tel" placeholder="Phone" required value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500" />
                            <input type="email" placeholder="Email" required value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500" />
                            <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500">
                                <option value="High">High Priority</option>
                                <option value="Medium">Medium Priority</option>
                                <option value="Low">Low Priority</option>
                            </select>
                            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500">
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                            </select>
                            <textarea placeholder="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 md:col-span-2" rows={2} />
                            <div className="md:col-span-2 flex gap-2">
                                <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-6 rounded-md transition-colors">Save</button>
                                <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-6 rounded-md transition-colors">Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Priority</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredEnquiries.map((enquiry) => (
                                    <tr key={enquiry.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{enquiry.customerName}</div>
                                            <div className="text-sm text-slate-500">{enquiry.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-800">{enquiry.contactPerson}</div>
                                            <div className="text-sm text-slate-500">{enquiry.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{enquiry.enquiryDate}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(enquiry.priority)}`}>
                                                {enquiry.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(enquiry.status)}`}>
                                                {enquiry.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{enquiry.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredEnquiries.length === 0 && (
                        <div className="text-center py-12 text-slate-500">No enquiries found matching your criteria.</div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default CRREnquiry
