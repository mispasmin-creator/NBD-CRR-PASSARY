"use client"

import { useState, useEffect } from "react"
import { PlusIcon, XIcon } from "../components/Icons"

// LocalStorage key for leads
const LEADS_STORAGE_KEY = "nbd_outgoing_leads"
const LEADS_COUNTER_KEY = "nbd_outgoing_leads_counter"

// Lead status colors
const statusColors = {
  Cold: "bg-blue-100 text-blue-800",
  Warm: "bg-yellow-100 text-yellow-800",
  Hot: "bg-red-100 text-red-800"
}

// Lead sources options
const leadSourceOptions = ["Indiamart", "Justdial", "Social Media", "Website", "Referral", "Cold Call", "Exhibition", "Other"]

// Sales person options
const salesPersonOptions = ["Rahul Sharma", "Priya Patel", "Amit Kumar", "Sneha Gupta", "Vikram Singh"]

// Lead status options
const leadStatusOptions = ["Cold", "Warm", "Hot"]

// Initial form state
const initialFormData = {
  leadSource: "",
  salesPerson: "",
  companyName: "",
  department: "",
  location: "",
  productName: "",
  contactPersonName: "",
  mobileNumber: "",
  emailId: "",
  leadStatus: "Cold"
}

// Helper functions for localStorage
const getLeadsFromStorage = () => {
  try {
    const data = localStorage.getItem(LEADS_STORAGE_KEY)
    if (data) {
      const parsed = JSON.parse(data)
      return Array.isArray(parsed) ? parsed : []
    }
    return []
  } catch (error) {
    console.error("Error reading leads from storage:", error)
    return []
  }
}

const saveLeadsToStorage = (leads) => {
  try {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads))
  } catch (error) {
    console.error("Error saving leads to storage:", error)
  }
}

const getNextLeadNumber = () => {
  try {
    const counter = localStorage.getItem(LEADS_COUNTER_KEY)
    const nextNum = counter ? parseInt(counter, 10) + 1 : 1
    localStorage.setItem(LEADS_COUNTER_KEY, nextNum.toString())
    return `LEAD-${String(nextNum).padStart(3, '0')}`
  } catch (error) {
    console.error("Error generating lead number:", error)
    return `LEAD-${Date.now()}`
  }
}

function Leads() {
  const [leads, setLeads] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [notification, setNotification] = useState(null)

  // Dummy data for initial load (newest first)
  const dummyLeads = [
    { leadNumber: "LEAD-020", leadSource: "Cold Call", salesPerson: "Vikram Singh", companyName: "PrintWorld Co", department: "Production", location: "Vadodara", productName: "Print Manager", contactPersonName: "Harish Patel", mobileNumber: "9900887766", emailId: "harish@printworld.com", leadStatus: "Warm", formattedDate: "27/01/2026 17:15" },
    { leadNumber: "LEAD-019", leadSource: "Referral", salesPerson: "Sneha Gupta", companyName: "EventHub Agency", department: "Events", location: "Noida", productName: "Event Planner", contactPersonName: "Sakshi Verma", mobileNumber: "1100998877", emailId: "sakshi@eventhub.com", leadStatus: "Cold", formattedDate: "27/01/2026 17:00" },
    { leadNumber: "LEAD-018", leadSource: "Website", salesPerson: "Amit Kumar", companyName: "SecureNet IT", department: "Security", location: "Gurgaon", productName: "Firewall Pro", contactPersonName: "Pradeep Malhotra", mobileNumber: "2211009988", emailId: "pradeep@securenet.com", leadStatus: "Hot", formattedDate: "27/01/2026 16:45" },
    { leadNumber: "LEAD-017", leadSource: "Social Media", salesPerson: "Priya Patel", companyName: "TravelEase Tours", department: "Sales", location: "Chandigarh", productName: "Booking System", contactPersonName: "Manish Kapoor", mobileNumber: "3322110099", emailId: "manish@travelease.com", leadStatus: "Warm", formattedDate: "27/01/2026 16:30" },
    { leadNumber: "LEAD-016", leadSource: "Justdial", salesPerson: "Rahul Sharma", companyName: "AgroFarms Inc", department: "Research", location: "Patna", productName: "Farm Manager", contactPersonName: "Sunita Devi", mobileNumber: "4433221100", emailId: "sunita@agrofarms.com", leadStatus: "Cold", formattedDate: "27/01/2026 16:15" },
    { leadNumber: "LEAD-015", leadSource: "Indiamart", salesPerson: "Vikram Singh", companyName: "SteelWorks Ltd", department: "Manufacturing", location: "Surat", productName: "Quality Control", contactPersonName: "Rohit Jain", mobileNumber: "5544332211", emailId: "rohit@steelworks.com", leadStatus: "Hot", formattedDate: "27/01/2026 16:00" },
    { leadNumber: "LEAD-014", leadSource: "Exhibition", salesPerson: "Sneha Gupta", companyName: "MediaPro Studios", department: "Production", location: "Bhopal", productName: "Video Editor", contactPersonName: "Anita Kapoor", mobileNumber: "6655443322", emailId: "anita@mediapro.com", leadStatus: "Warm", formattedDate: "27/01/2026 15:45" },
    { leadNumber: "LEAD-013", leadSource: "Cold Call", salesPerson: "Amit Kumar", companyName: "LogiTrans Corp", department: "Logistics", location: "Nagpur", productName: "Route Optimizer", contactPersonName: "Deepak Sharma", mobileNumber: "7766554433", emailId: "deepak@logitrans.com", leadStatus: "Cold", formattedDate: "27/01/2026 15:30" },
    { leadNumber: "LEAD-012", leadSource: "Referral", salesPerson: "Priya Patel", companyName: "RetailMart Chain", department: "Operations", location: "Indore", productName: "POS System", contactPersonName: "Kavita Agarwal", mobileNumber: "8877665544", emailId: "kavita@retailmart.com", leadStatus: "Hot", formattedDate: "27/01/2026 15:15" },
    { leadNumber: "LEAD-011", leadSource: "Website", salesPerson: "Rahul Sharma", companyName: "FinServe Bank", department: "Technology", location: "Lucknow", productName: "Banking Suite", contactPersonName: "Suresh Yadav", mobileNumber: "9988776655", emailId: "suresh@finserve.com", leadStatus: "Warm", formattedDate: "27/01/2026 15:00" },
    { leadNumber: "LEAD-010", leadSource: "Social Media", salesPerson: "Vikram Singh", companyName: "EduLearn Academy", department: "IT", location: "Jaipur", productName: "LMS Platform", contactPersonName: "Neha Joshi", mobileNumber: "1098765432", emailId: "neha@edulearn.com", leadStatus: "Cold", formattedDate: "27/01/2026 14:45" },
    { leadNumber: "LEAD-009", leadSource: "Justdial", salesPerson: "Sneha Gupta", companyName: "HealthCare Plus", department: "Admin", location: "Ahmedabad", productName: "Patient Portal", contactPersonName: "Dr. Ravi Mehta", mobileNumber: "2109876543", emailId: "ravi@healthcare.com", leadStatus: "Hot", formattedDate: "27/01/2026 14:30" },
    { leadNumber: "LEAD-008", leadSource: "Indiamart", salesPerson: "Amit Kumar", companyName: "Fresh Foods Pvt", department: "Supply Chain", location: "Kolkata", productName: "Inventory Pro", contactPersonName: "Meera Singh", mobileNumber: "3210987654", emailId: "meera@freshfoods.com", leadStatus: "Warm", formattedDate: "27/01/2026 14:15" },
    { leadNumber: "LEAD-007", leadSource: "Exhibition", salesPerson: "Priya Patel", companyName: "AutoMax Motors", department: "Service", location: "Pune", productName: "Fleet Manager", contactPersonName: "Arun Patel", mobileNumber: "4321098765", emailId: "arun@automax.com", leadStatus: "Cold", formattedDate: "27/01/2026 14:00" },
    { leadNumber: "LEAD-006", leadSource: "Cold Call", salesPerson: "Rahul Sharma", companyName: "Green Energy Co", department: "Procurement", location: "Hyderabad", productName: "Energy Monitor", contactPersonName: "Pooja Sharma", mobileNumber: "5432109876", emailId: "pooja@greenenergy.com", leadStatus: "Hot", formattedDate: "27/01/2026 13:45" },
    { leadNumber: "LEAD-005", leadSource: "Referral", salesPerson: "Vikram Singh", companyName: "Infra Build Ltd", department: "Engineering", location: "Chennai", productName: "Project Manager", contactPersonName: "Rajesh Kumar", mobileNumber: "6543210987", emailId: "rajesh@infrabuild.com", leadStatus: "Warm", formattedDate: "27/01/2026 13:30" },
    { leadNumber: "LEAD-004", leadSource: "Website", salesPerson: "Sneha Gupta", companyName: "CloudNet Systems", department: "Operations", location: "Bangalore", productName: "Cloud Storage", contactPersonName: "Vikram Singh", mobileNumber: "7654321098", emailId: "vikram@cloudnet.com", leadStatus: "Cold", formattedDate: "27/01/2026 13:15" },
    { leadNumber: "LEAD-003", leadSource: "Social Media", salesPerson: "Amit Kumar", companyName: "Digital Wave", department: "Marketing", location: "Delhi", productName: "Analytics Suite", contactPersonName: "Sneha Gupta", mobileNumber: "8765432109", emailId: "sneha@digitalwave.com", leadStatus: "Hot", formattedDate: "27/01/2026 13:00" },
    { leadNumber: "LEAD-002", leadSource: "Justdial", salesPerson: "Priya Patel", companyName: "TechSoft Solutions", department: "Sales", location: "Mumbai", productName: "CRM Pro", contactPersonName: "Amit Verma", mobileNumber: "9876543210", emailId: "amit@techsoft.com", leadStatus: "Warm", formattedDate: "27/01/2026 12:45" },
    { leadNumber: "LEAD-001", leadSource: "Indiamart", salesPerson: "Rahul Sharma", companyName: "Botivate", department: "IT Department", location: "Raipur", productName: "OS Botivate", contactPersonName: "Khusi Deshmukh", mobileNumber: "7000041821", emailId: "pratap6030@gmail.com", leadStatus: "Cold", formattedDate: "27/01/2026 12:30" }
  ]

  // Load leads from localStorage on component mount
  useEffect(() => {
    const storedLeads = getLeadsFromStorage()
    // Always load dummy data (clear existing and load fresh)
    localStorage.removeItem(LEADS_STORAGE_KEY)
    setLeads(dummyLeads)
    saveLeadsToStorage(dummyLeads)
  }, [])

  // Show notification
  const showNotification = (message, type = "success") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // Handle form input change
  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: value
    }))
  }

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const now = new Date()
      const leadNumber = getNextLeadNumber()

      const newLead = {
        leadNumber,
        leadSource: formData.leadSource,
        salesPerson: formData.salesPerson,
        companyName: formData.companyName,
        department: formData.department || "",
        location: formData.location,
        productName: formData.productName,
        contactPersonName: formData.contactPersonName,
        mobileNumber: formData.mobileNumber,
        emailId: formData.emailId || "",
        leadStatus: formData.leadStatus,
        leadType: "Outgoing",
        createdBy: "System",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        formattedDate: now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      }

      // Create updated leads array
      const updatedLeads = [newLead, ...leads]

      // Save to localStorage first
      saveLeadsToStorage(updatedLeads)

      // Update state
      setLeads(updatedLeads)

      // Reset form and close modal
      setFormData(initialFormData)
      setIsModalOpen(false)

      showNotification("Lead created successfully!", "success")
    } catch (error) {
      console.error("Error creating lead:", error)
      showNotification("Error creating lead: " + error.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter leads based on search
  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      (lead.leadNumber || "").toLowerCase().includes(searchLower) ||
      (lead.companyName || "").toLowerCase().includes(searchLower) ||
      (lead.contactPersonName || "").toLowerCase().includes(searchLower) ||
      (lead.productName || "").toLowerCase().includes(searchLower) ||
      (lead.salesPerson || "").toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="py-2">
      {/* Notification */}
      {notification && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${notification.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}>
          {notification.message}
        </div>
      )}

      {/* Header - All in one row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-800">NBD Outgoing</h1>
          <p className="text-xs text-gray-500">Manage outgoing leads and track sales pipeline</p>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium rounded-lg shadow-md shadow-sky-200 transition-all duration-200 flex-shrink-0"
        >
          <PlusIcon className="h-4 w-4" />
          New Lead
        </button>
      </div>


      {/* Leads Table - Desktop */}
      <div className="hidden md:flex bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex-col" style={{ height: '550px' }}>
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Lead #</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Source</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Sales Person</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Company</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Dept</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Location</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Product</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Mobile</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Email</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-lg font-semibold text-gray-500">No leads found</p>
                      <p className="text-sm text-gray-400 mt-1">Click "New Lead" to create your first outgoing lead</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead, index) => (
                  <tr key={lead.leadNumber || index} className="hover:bg-sky-50/30 transition-all duration-150">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-sky-100 text-sky-700 text-sm font-semibold">
                        {lead.leadNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-sm">
                        {lead.leadSource}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">{lead.salesPerson}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{lead.companyName}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{lead.department || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{lead.location}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{lead.productName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">{lead.contactPersonName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <a href={`tel:${lead.mobileNumber}`} className="text-sm text-sky-600 hover:text-sky-800 hover:underline">
                        {lead.mobileNumber}
                      </a>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {lead.emailId ? (
                        <a href={`mailto:${lead.emailId}`} className="text-sm text-sky-600 hover:text-sky-800 hover:underline truncate max-w-[150px] block">
                          {lead.emailId}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusColors[lead.leadStatus] || 'bg-gray-100 text-gray-800'}`}>
                        <span className={`w-2 h-2 rounded-full mr-1.5 ${lead.leadStatus === 'Hot' ? 'bg-red-500' :
                          lead.leadStatus === 'Warm' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}></span>
                        {lead.leadStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{lead.formattedDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {leads.length > 0 && (
          <div className="px-4 py-4 bg-gray-50 border-t text-sm font-medium text-gray-600 flex-shrink-0">
            Showing {filteredLeads.length} of {leads.length} leads
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="flex flex-col items-center justify-center text-gray-400">
              <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-500">No leads found</p>
              <p className="text-sm text-gray-400 mt-1">Click "New Lead" to create your first outgoing lead</p>
            </div>
          </div>
        ) : (
          filteredLeads.map((lead, index) => (
            <div key={lead.leadNumber || index} className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
              {/* Card Header */}
              <div className="flex justify-between items-start mb-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-sky-100 text-sky-700 text-sm font-semibold">
                  {lead.leadNumber}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusColors[lead.leadStatus] || 'bg-gray-100 text-gray-800'}`}>
                  <span className={`w-2 h-2 rounded-full mr-1.5 ${lead.leadStatus === 'Hot' ? 'bg-red-500' :
                    lead.leadStatus === 'Warm' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></span>
                  {lead.leadStatus}
                </span>
              </div>

              {/* Company & Contact */}
              <h3 className="text-base font-bold text-gray-900 mb-1">{lead.companyName}</h3>
              <p className="text-sm text-gray-600 mb-3">{lead.contactPersonName}</p>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div>
                  <span className="text-gray-400">Source:</span>
                  <span className="ml-1 text-gray-700">{lead.leadSource}</span>
                </div>
                <div>
                  <span className="text-gray-400">Sales:</span>
                  <span className="ml-1 text-gray-700">{lead.salesPerson}</span>
                </div>
                <div>
                  <span className="text-gray-400">Location:</span>
                  <span className="ml-1 text-gray-700">{lead.location}</span>
                </div>
                <div>
                  <span className="text-gray-400">Product:</span>
                  <span className="ml-1 text-gray-700">{lead.productName}</span>
                </div>
              </div>

              {/* Contact Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <a href={`tel:${lead.mobileNumber}`} className="flex-1 text-center py-2 bg-sky-50 text-sky-600 rounded-lg text-xs font-medium hover:bg-sky-100">
                  📞 {lead.mobileNumber}
                </a>
                {lead.emailId && (
                  <a href={`mailto:${lead.emailId}`} className="flex-1 text-center py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 truncate">
                    ✉️ Email
                  </a>
                )}
              </div>

              {/* Date */}
              <p className="text-xs text-gray-400 mt-2 text-right">{lead.formattedDate}</p>
            </div>
          ))
        )}

        {/* Mobile Footer */}
        {leads.length > 0 && (
          <div className="px-4 py-3 bg-white rounded-xl shadow-lg border border-gray-100 text-sm font-medium text-gray-600 text-center">
            Showing {filteredLeads.length} of {leads.length} leads
          </div>
        )}
      </div>

      {/* New Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Modal Panel */}
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-auto transform transition-all">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-sky-500 to-blue-600 rounded-t-xl">
                <div>
                  <h2 className="text-xl font-bold text-white">New Outgoing Lead</h2>
                  <p className="text-sm text-sky-100">Fill in the lead details below</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <XIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Lead Source */}
                    <div className="space-y-1">
                      <label htmlFor="leadSource" className="block text-xs font-medium text-gray-700 text-left">
                        Lead Source <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="leadSource"
                        value={formData.leadSource}
                        onChange={handleChange}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select source</option>
                        {leadSourceOptions.map((source, idx) => (
                          <option key={idx} value={source}>{source}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sales Person */}
                    <div className="space-y-1">
                      <label htmlFor="salesPerson" className="block text-xs font-medium text-gray-700 text-left">
                        Sales Person <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="salesPerson"
                        value={formData.salesPerson}
                        onChange={handleChange}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select sales person</option>
                        {salesPersonOptions.map((person, idx) => (
                          <option key={idx} value={person}>{person}</option>
                        ))}
                      </select>
                    </div>

                    {/* Company Name */}
                    <div className="space-y-1">
                      <label htmlFor="companyName" className="block text-xs font-medium text-gray-700 text-left">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        placeholder="Enter company name"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Department */}
                    <div className="space-y-1">
                      <label htmlFor="department" className="block text-xs font-medium text-gray-700 text-left">
                        Department
                      </label>
                      <input
                        type="text"
                        id="department"
                        value={formData.department}
                        onChange={handleChange}
                        placeholder="Enter department"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      />
                    </div>

                    {/* Location */}
                    <div className="space-y-1">
                      <label htmlFor="location" className="block text-xs font-medium text-gray-700 text-left">
                        Location (City) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="Enter city"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Product Name */}
                    <div className="space-y-1">
                      <label htmlFor="productName" className="block text-xs font-medium text-gray-700 text-left">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="productName"
                        value={formData.productName}
                        onChange={handleChange}
                        placeholder="Enter product/service"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Contact Person Name */}
                    <div className="space-y-1">
                      <label htmlFor="contactPersonName" className="block text-xs font-medium text-gray-700 text-left">
                        Contact Person <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="contactPersonName"
                        value={formData.contactPersonName}
                        onChange={handleChange}
                        placeholder="Enter contact name"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Mobile Number */}
                    <div className="space-y-1">
                      <label htmlFor="mobileNumber" className="block text-xs font-medium text-gray-700 text-left">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        id="mobileNumber"
                        value={formData.mobileNumber}
                        onChange={handleChange}
                        placeholder="Enter mobile number"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Email ID */}
                    <div className="space-y-1">
                      <label htmlFor="emailId" className="block text-xs font-medium text-gray-700 text-left">
                        Email ID
                      </label>
                      <input
                        type="email"
                        id="emailId"
                        value={formData.emailId}
                        onChange={handleChange}
                        placeholder="Enter email address"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      />
                    </div>

                    {/* Lead Status */}
                    <div className="space-y-1">
                      <label htmlFor="leadStatus" className="block text-xs font-medium text-gray-700 text-left">
                        Lead Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="leadStatus"
                        value={formData.leadStatus}
                        onChange={handleChange}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        required
                      >
                        {leadStatusOptions.map((status, idx) => (
                          <option key={idx} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-blue-600 rounded-lg hover:from-sky-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? "Creating..." : "Create Lead"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Leads