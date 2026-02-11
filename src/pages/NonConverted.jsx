"use client"

import { useState, useContext } from "react"
import { AuthContext } from "../App"

function NonConverted() {
    const { showNotification } = useContext(AuthContext)
    const [searchQuery, setSearchQuery] = useState("")
    const [reasonFilter, setReasonFilter] = useState("all")
    const [dateFilter, setDateFilter] = useState("")

    // Mock data for non-converted leads
    const [leads, setLeads] = useState([
        { id: 1, leadName: "Alpha Industries", contactPerson: "Sarah Connor", phone: "9876543210", email: "sarah@alpha.com", leadDate: "2024-12-15", reason: "Budget Constraints", salesRep: "John Doe", lastContact: "2024-12-20", notes: "Will reconsider next quarter" },
        { id: 2, leadName: "Beta Corp", contactPerson: "James Wilson", phone: "9876543211", email: "james@beta.com", leadDate: "2024-12-10", reason: "Competitor Chosen", salesRep: "Jane Smith", lastContact: "2024-12-18", notes: "Chose lower-priced option" },
        { id: 3, leadName: "Gamma Tech", contactPerson: "Emma Davis", phone: "9876543212", email: "emma@gamma.com", leadDate: "2024-12-05", reason: "No Response", salesRep: "Mike Brown", lastContact: "2024-12-12", notes: "Multiple attempts made" },
        { id: 4, leadName: "Delta Solutions", contactPerson: "Chris Lee", phone: "9876543213", email: "chris@delta.com", leadDate: "2024-12-01", reason: "Project Cancelled", salesRep: "John Doe", lastContact: "2024-12-08", notes: "Internal restructuring" },
    ])

    const reasons = ["Budget Constraints", "Competitor Chosen", "No Response", "Project Cancelled", "Timeline Mismatch", "Other"]

    const filteredLeads = leads.filter(lead => {
        const matchesSearch = lead.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.salesRep.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesReason = reasonFilter === "all" || lead.reason === reasonFilter
        const matchesDate = !dateFilter || lead.leadDate >= dateFilter
        return matchesSearch && matchesReason && matchesDate
    })

    const handleFollowUp = (lead) => {
        showNotification(`Follow-up scheduled for ${lead.leadName}`, "success")
    }

    const handleArchive = (id) => {
        setLeads(leads.filter(l => l.id !== id))
        showNotification("Lead archived successfully", "success")
    }

    const getReasonColor = (reason) => {
        switch (reason) {
            case "Budget Constraints": return "bg-yellow-100 text-yellow-800"
            case "Competitor Chosen": return "bg-red-100 text-red-800"
            case "No Response": return "bg-gray-100 text-gray-800"
            case "Project Cancelled": return "bg-purple-100 text-purple-800"
            case "Timeline Mismatch": return "bg-orange-100 text-orange-800"
            default: return "bg-blue-100 text-blue-800"
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="py-2">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Non-Converted Leads</h1>
                    <p className="text-slate-600 mt-1">Track and manage leads that didn't convert</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <div className="text-sm text-slate-500">Total Non-Converted</div>
                        <div className="text-2xl font-bold text-slate-800">{leads.length}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <div className="text-sm text-slate-500">Budget Issues</div>
                        <div className="text-2xl font-bold text-yellow-600">{leads.filter(l => l.reason === "Budget Constraints").length}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <div className="text-sm text-slate-500">Lost to Competitors</div>
                        <div className="text-2xl font-bold text-red-600">{leads.filter(l => l.reason === "Competitor Chosen").length}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <div className="text-sm text-slate-500">No Response</div>
                        <div className="text-2xl font-bold text-gray-600">{leads.filter(l => l.reason === "No Response").length}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Search leads, contacts, or sales rep..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 flex-1"
                        />
                        <select
                            value={reasonFilter}
                            onChange={(e) => setReasonFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            <option value="all">All Reasons</option>
                            {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Lead</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Sales Rep</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Reason</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Last Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{lead.leadName}</div>
                                            <div className="text-sm text-slate-500">{lead.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-800">{lead.contactPerson}</div>
                                            <div className="text-sm text-slate-500">{lead.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{lead.salesRep}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getReasonColor(lead.reason)}`}>
                                                {lead.reason}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{lead.lastContact}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleFollowUp(lead)}
                                                    className="text-sky-600 hover:text-sky-800 text-sm font-medium"
                                                >
                                                    Follow Up
                                                </button>
                                                <button
                                                    onClick={() => handleArchive(lead.id)}
                                                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                >
                                                    Archive
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredLeads.length === 0 && (
                        <div className="text-center py-12 text-slate-500">No non-converted leads found matching your criteria.</div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default NonConverted
