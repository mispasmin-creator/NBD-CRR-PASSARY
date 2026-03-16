"use client"

import { useState, useEffect } from "react"
import { PlusIcon, XIcon, PhoneCallIcon } from "../components/Icons"
import axios from "axios"

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
  ourFirmName: "",
  leadReceivedFrom: "",
  salesPerson: "",
  companyName: "",
  department: "",
  location: ""
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
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("leads")

  // Helper to format ISO date (2026-02-14T09:53:00.000Z) to M/D/YYYY HH:mm:ss for display
  const displayDate = (dateVal) => {
    if (!dateVal) return ''
    try {
      const d = new Date(dateVal)
      if (isNaN(d.getTime())) return dateVal // Return as-is if not a valid date
      const m = d.getMonth() + 1
      const day = d.getDate()
      const yr = d.getFullYear()
      const hr = d.getHours()
      const min = d.getMinutes().toString().padStart(2, '0')
      const sec = d.getSeconds().toString().padStart(2, '0')
      return `${m}/${day}/${yr} ${hr}:${min}:${sec}`
    } catch {
      return dateVal
    }
  }

  // Fetch data from Google Sheets
  const fetchLeadsFromSheet = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true)
      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
      const sheetName = import.meta.env.VITE_FMS_SHEET_NAME

      if (!scriptUrl || !sheetName) {
        console.warn('Google Sheets configuration missing')
        if (showLoading) setIsLoading(false)
        return []
      }

      // Fetch data from Google Sheets
      const response = await axios.get(`${scriptUrl}?sheet=${sheetName}`)

      if (response.data && response.data.success) {
        const sheetData = response.data.data

        // Process data from row 7 onwards (index 6)
        // We map first to preserve original row index (1-based)
        const processedLeads = sheetData
          .map((row, index) => ({
            originalRow: row,
            rowIndex: index + 1 // 1-based row index for Google Sheets
          }))
          .slice(6) // Skip first 6 rows (headers)
          .filter(item => item.originalRow[0]) // Only include rows with timestamp (column A)
          .map(item => {
            const row = item.originalRow
            return {
              rowIndex: item.rowIndex,           // Store row index for updates
              rawData: row,                      // Store full row data to preserve other columns on update
              timestamp: displayDate(row[0]) || '',           // Column A: Timestamp
              leadNumber: row[1] || '',          // Column B: Lead No.
              ourFirmName: row[2] || '',         // Column C: Our Firm Name
              leadReceivedFrom: row[3] || '',    // Column D: Lead Received From
              salesPerson: row[4] || '',         // Column E: Name Of The Sales Person
              companyName: row[5] || '',         // Column F: Name Of The Company
              department: row[6] || '',          // Column G: Department
              location: row[7] || '',            // Column H: Location
              // Additional fields if they exist in sheet
              productName: row[11] || '',        // Column L
              customerName: row[12] || '',       // Column M
              contactNo: row[13] || '',          // Column N
              emailId: row[14] || '',            // Column O
              remarks: row[15] || '',            // Column P
              // Call Tracker Data (stored in Q-U)
              trackerNextAction: row[16] || '',  // Column Q
              trackerStatus: row[17] || '',      // Column R
              trackerEnquiry: row[18] || '',     // Column S
              trackerRemarks: row[19] || '',     // Column T
              trackerNextCall: displayDate(row[20]) || ''     // Column U
            }
          })
          .reverse() // Show newest first

        setLeads(processedLeads)
        console.log('Fetched leads from Google Sheets:', processedLeads.length)
        return processedLeads
      } else {
        console.error('Failed to fetch data from Google Sheets')
        showNotification('Failed to load data from Google Sheets', 'error')
        return []
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
      showNotification('Error loading data from Google Sheets', 'error')
      return []
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  // Load leads from Google Sheets on component mount
  useEffect(() => {
    fetchLeadsFromSheet()
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
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Basic validation
    if (!formData.ourFirmName || !formData.leadReceivedFrom || !formData.salesPerson || !formData.companyName) {
      showNotification("Please fill in all required fields", "error")
      setIsSubmitting(false)
      return
    }

    try {
      const now = new Date()

      // Format timestamp as M/D/YYYY H:mm:ss (e.g., 7/15/2024 12:22:59)
      const month = now.getMonth() + 1 // 0-indexed, so add 1
      const day = now.getDate()
      const year = now.getFullYear()
      const hours = now.getHours()
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')
      const formattedTimestamp = `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`

      // Submit to Google Sheets
      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
      const sheetName = import.meta.env.VITE_FMS_SHEET_NAME

      if (!scriptUrl || !sheetName) {
        showNotification('Google Sheets configuration missing in .env file', 'error')
        setIsSubmitting(false)
        return
      }

      // Fetch latest leads to check for duplicates and get the correct next ID
      // We pass false for showLoading to avoid UI flicker/spinner during submission (unless desired)
      // but since we are submitting (isSubmitting is true), main UI interaction is blocked anyway.
      const freshLeads = await fetchLeadsFromSheet(false)
      const leadsToCheck = (freshLeads && freshLeads.length > 0) ? freshLeads : leads

      // Generate Lead Number (Format: LE-1, LE-2, etc.)
      let maxId = 0

      // Check all existing leads for the highest number
      if (leadsToCheck && leadsToCheck.length > 0) {
        leadsToCheck.forEach(lead => {
          const leadNo = lead.leadNumber || ""
          // Check if lead number starts with LE- or LI- (migration support)
          if (leadNo.toString().startsWith("LE-") || leadNo.toString().startsWith("LI-")) {
            const parts = leadNo.split("-")
            if (parts.length > 1) {
              const numPart = parseInt(parts[1], 10)
              if (!isNaN(numPart) && numPart > maxId) {
                maxId = numPart
              }
            }
          }
        })
      }

      const newLeadNumber = `LE-${maxId + 1}`

      // Prepare data for Google Sheets
      // Only send: Column A (Timestamp) and Columns C-H (form fields)
      // Column B (Lead No.) is now generated and sent
      // A: Timestamp, C: Our Firm Name, D: Lead Received From, 
      // E: Name Of The Sales Person, F: Name Of The Company, G: Department, H: Location
      const rowData = [
        formattedTimestamp,        // Column A: Timestamp
        newLeadNumber,             // Column B: Lead No (Generated)
        formData.ourFirmName,       // Column C: Our Firm Name
        formData.leadReceivedFrom,  // Column D: Lead Received From
        formData.salesPerson,       // Column E: Name Of The Sales Person
        formData.companyName,       // Column F: Name Of The Company
        formData.department,        // Column G: Department
        formData.location          // Column H: Location
      ]

      const formDataToSend = new URLSearchParams()
      formDataToSend.append('action', 'insert')
      formDataToSend.append('sheetName', sheetName)
      formDataToSend.append('rowData', JSON.stringify(rowData))

      const response = await axios.post(scriptUrl, formDataToSend, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      if (response.data && response.data.success) {
        showNotification("Lead created successfully!", "success")

        // Reset form and close modal
        setFormData(initialFormData)
        setIsModalOpen(false)

        // Refresh data from Google Sheets
        await fetchLeadsFromSheet()
      } else {
        console.error('Google Sheets error:', response.data.error)
        showNotification('Failed to create lead in Google Sheets', 'error')
      }
    } catch (error) {
      console.error("Error creating lead:", error)
      showNotification("Error creating lead: " + error.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter leads based on search and active tab
  const filteredLeads = leads.filter(lead => {
    // Tab-based filtering using Column I (index 8) and Column J (index 9)
    if (activeTab === "updateStatus") {
      // Show only when Column I is filled AND Column J is empty
      const colI = lead.rawData && lead.rawData[8] ? lead.rawData[8].toString().trim() : ""
      const colJ = lead.rawData && lead.rawData[9] ? lead.rawData[9].toString().trim() : ""
      if (!colI || colJ) return false
    }
    if (activeTab === "callTracking") {
      // Show only when both Column I AND Column J are filled
      const colI = lead.rawData && lead.rawData[8] ? lead.rawData[8].toString().trim() : ""
      const colJ = lead.rawData && lead.rawData[9] ? lead.rawData[9].toString().trim() : ""
      if (!colI || !colJ) return false
    }

    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      String(lead.leadNumber || "").toLowerCase().includes(searchLower) ||
      String(lead.ourFirmName || "").toLowerCase().includes(searchLower) ||
      String(lead.leadReceivedFrom || "").toLowerCase().includes(searchLower) ||
      String(lead.companyName || "").toLowerCase().includes(searchLower) ||
      String(lead.salesPerson || "").toLowerCase().includes(searchLower) ||
      String(lead.department || "").toLowerCase().includes(searchLower) ||
      String(lead.location || "").toLowerCase().includes(searchLower)
    )
  })

  // Update Status Modal State
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [currentLeadForUpdate, setCurrentLeadForUpdate] = useState(null)
  const [updateFormData, setUpdateFormData] = useState({
    productName: "",
    customerName: "",
    contactNo: "",
    emailId: "",
    remarks: ""
  })

  // Open Update Modal
  const handleUpdateClick = (lead) => {
    setCurrentLeadForUpdate(lead)
    // Pre-fill fields if they exist, otherwise empty
    setUpdateFormData({
      productName: lead.productName || "",
      customerName: lead.customerName || "",
      contactNo: lead.contactNo || "",
      emailId: lead.emailId || "",
      remarks: lead.remarks || ""
    })
    setIsUpdateModalOpen(true)
  }

  // Handle Update Form Submission
  const handleUpdateSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!currentLeadForUpdate || !currentLeadForUpdate.rowIndex) {
        showNotification("Cannot update: Missing row index", "error")
        return
      }

      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
      const sheetName = import.meta.env.VITE_FMS_SHEET_NAME

      if (!scriptUrl || !sheetName) {
        showNotification('Google Sheets configuration missing', 'error')
        return
      }

      // Create a sparse array for update
      // We need to place values at correct indices matching Columns L, M, N, O, P
      // Column L is index 11
      // Column M is index 12
      // Column N is index 13
      // Column O is index 14
      // Column P is index 15

      // Start with existing data to preserve other columns
      // Create array of size 16 (up to Col P) filled with empty strings
      let updateRowData = new Array(16).fill("")

      // If we have raw data from the sheet, populate it first
      if (currentLeadForUpdate.rawData && Array.isArray(currentLeadForUpdate.rawData)) {
        currentLeadForUpdate.rawData.forEach((val, idx) => {
          if (idx < 16) updateRowData[idx] = val
        })
      }

      // Generate timestamp for update (M/D/YYYY H:mm:ss)
      const now = new Date()
      const month = now.getMonth() + 1
      const day = now.getDate()
      const year = now.getFullYear()
      const hours = now.getHours()
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')
      const formattedUpdateTimestamp = `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`

      // DEBUG: Log what rawData[0] contains so we can verify Column A preservation
      console.log("Column A rawData[0] value:", currentLeadForUpdate.rawData?.[0])

      // CRITICAL: Preserve Column A (original timestamp) - Convert ISO to M/D/YYYY HH:mm:ss format
      // Google Sheets returns dates in ISO format (e.g., 2026-02-18T08:18:23.000Z)
      // We must convert it to our standard format before sending back, otherwise Sheets re-interprets it
      let originalColumnA = ""
      const rawColA = currentLeadForUpdate.rawData?.[0] || currentLeadForUpdate.timestamp
      if (rawColA) {
        const colADate = new Date(rawColA)
        if (!isNaN(colADate.getTime())) {
          const aMonth = colADate.getMonth() + 1
          const aDay = colADate.getDate()
          const aYear = colADate.getFullYear()
          const aHours = colADate.getHours()
          const aMinutes = colADate.getMinutes().toString().padStart(2, '0')
          const aSeconds = colADate.getSeconds().toString().padStart(2, '0')
          originalColumnA = `${aMonth}/${aDay}/${aYear} ${aHours}:${aMinutes}:${aSeconds}`
        } else {
          originalColumnA = rawColA // If not a valid date, keep as-is
        }
      }
      console.log("Column A formatted value being sent:", originalColumnA)

      // Clear columns that contain ArrayFormulas.
      // Column B (Index 1): Lead No.
      updateRowData[1] = ""
      // Column I (Index 8): Planned 1
      updateRowData[8] = ""
      // Column J (Index 9): Actual 1 - NOW UPDATED WITH TIMESTAMP
      updateRowData[9] = formattedUpdateTimestamp
      // Column K (Index 10): Likely computed or needs to be empty to prevent issues
      updateRowData[10] = ""

      // IMPORTANT: Re-set Column A to its original value after any clearing
      updateRowData[0] = originalColumnA

      // Overwrite specific columns with new form data
      updateRowData[11] = updateFormData.productName
      updateRowData[12] = updateFormData.customerName
      updateRowData[13] = updateFormData.contactNo
      updateRowData[14] = updateFormData.emailId
      updateRowData[15] = updateFormData.remarks

      // checking for undefined and replacing with "" is already handled by initial fill("") and logic above
      for (let i = 0; i < 16; i++) {
        if (updateRowData[i] === undefined || updateRowData[i] === null) {
          updateRowData[i] = ""
        }
      }

      const formDataToSend = new URLSearchParams()
      formDataToSend.append('action', 'update')
      formDataToSend.append('sheetName', sheetName)
      formDataToSend.append('rowIndex', currentLeadForUpdate.rowIndex) // Pass row index
      formDataToSend.append('rowData', JSON.stringify(updateRowData))

      const response = await axios.post(scriptUrl, formDataToSend, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })

      if (response.data && response.data.success) {
        showNotification("Status updated successfully!", "success")
        setIsUpdateModalOpen(false)
        setUpdateFormData({
          productName: "",
          customerName: "",
          contactNo: "",
          emailId: "",
          remarks: ""
        })
        fetchLeadsFromSheet() // Refresh data
      } else {
        console.error('Google Sheets update error:', JSON.stringify(response.data))
        showNotification(`Update failed: ${response.data?.error || 'Unknown error'}`, 'error')
      }
    } catch (error) {
      console.error("Error updating status:", error)
      showNotification("Error updating status: " + error.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Call Tracker Modal State
  const [isCallTrackerOpen, setIsCallTrackerOpen] = useState(false)
  const [currentLeadForCall, setCurrentLeadForCall] = useState(null)
  const [callTrackerData, setCallTrackerData] = useState({
    nextAction: "",
    status: "",
    enquiryReceived: "Pending",
    customerRemarks: "",
    nextCallDate: "",
    lastCallDate: ""
  })

  // Open Call Tracker Modal
  const handleCallTrackerClick = (lead) => {
    setCurrentLeadForCall(lead)
    setCallTrackerData({
      nextAction: "",
      status: "",
      enquiryReceived: "Pending",
      customerRemarks: "",
      nextCallDate: "",
      lastCallDate: new Date().toISOString().slice(0, 16)
    })
    setIsCallTrackerOpen(true)
  }

  // Handle Call Tracker Submit
  const handleCallTrackerSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!currentLeadForCall) {
        showNotification("No lead selected", "error")
        return
      }

      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
      const targetSheetName = import.meta.env.VITE_CALL_TRACKER_SHEET_NAME

      if (!scriptUrl || !targetSheetName) {
        showNotification('Call Tracker configuration missing', 'error')
        return
      }

      // Helper to format any date to M/D/YYYY HH:mm:ss (no commas)
      const formatDateToString = (dateInput) => {
        const d = new Date(dateInput)
        if (isNaN(d.getTime())) return ""
        const m = d.getMonth() + 1
        const day = d.getDate()
        const yr = d.getFullYear()
        const hr = d.getHours()
        const min = d.getMinutes().toString().padStart(2, '0')
        const sec = d.getSeconds().toString().padStart(2, '0')
        return `${m}/${day}/${yr} ${hr}:${min}:${sec}`
      }

      // 1. Fetch Call Tracker Sheet Data to check for existence
      const response = await axios.get(`${scriptUrl}?sheet=${targetSheetName}`)

      let targetRowIndex = -1
      let existingRowData = []

      if (response.data && response.data.success) {
        const sheetData = response.data.data
        // Start checking from Row 3 (Index 2)
        // Column A is Index 0
        for (let i = 2; i < sheetData.length; i++) {
          const rowLeadNo = sheetData[i][0] ? String(sheetData[i][0]).trim() : ""
          const currentLeadNo = currentLeadForCall.leadNumber ? String(currentLeadForCall.leadNumber).trim() : ""

          if (rowLeadNo && currentLeadNo && rowLeadNo === currentLeadNo) {
            targetRowIndex = i
            existingRowData = sheetData[i]
            // Confirmed: Lead No matched in Column A (Row 3+)
            break
          }
        }
      } else {
        showNotification('Failed to fetch data from Call Tracker Sheet', 'error')
        setIsSubmitting(false)
        return
      }

      if (targetRowIndex === -1) {
        showNotification(`Lead Number ${currentLeadForCall.leadNumber} not found in Call Tracker Sheet (Row 3+)`, 'error')
        setIsSubmitting(false)
        return
      }

      // 2. Prepare Update Data for Call Tracker Sheet
      // Use existing row data to preserve other columns
      let trackerRowData = [...existingRowData]

      // Ensure array is long enough (16+)
      while (trackerRowData.length < 16) {
        trackerRowData.push("")
      }

      // Indices Mapping (Same as before):
      // 9: Status (Column J)
      // 10: Last Date Of Call (Column K)
      // 11: Next Call Date & Time (Column L)
      // 12: What Did The Customer Say (Column M)
      // 13: Next Action To Be Taken (Column N)
      // 15: Enquiry Received (Column P)

      trackerRowData[9] = callTrackerData.status
      trackerRowData[10] = callTrackerData.lastCallDate ? formatDateToString(callTrackerData.lastCallDate) : formatDateToString(new Date())
      trackerRowData[11] = callTrackerData.nextCallDate ? formatDateToString(callTrackerData.nextCallDate) : ""
      trackerRowData[12] = callTrackerData.customerRemarks
      trackerRowData[13] = callTrackerData.nextAction
      trackerRowData[15] = callTrackerData.enquiryReceived

      // Ensure no undefined
      for (let i = 0; i < trackerRowData.length; i++) {
        if (trackerRowData[i] === undefined || trackerRowData[i] === null) {
          trackerRowData[i] = ""
        }
      }

      const formDataToSend = new URLSearchParams()
      formDataToSend.append('action', 'update') // Update existing row
      formDataToSend.append('sheetName', targetSheetName)
      formDataToSend.append('rowIndex', targetRowIndex + 1) // 1-based index for Google Sheets
      formDataToSend.append('rowData', JSON.stringify(trackerRowData))

      const trackerResponse = await axios.post(scriptUrl, formDataToSend, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })

      if (trackerResponse.data && trackerResponse.data.success) {
        showNotification("Call tracked updated successfully in Tracker Sheet!", "success")

        // Refresh leads to show new data in table
        fetchLeadsFromSheet(false)

        setIsCallTrackerOpen(false)
        setCallTrackerData({
          nextAction: "",
          status: "",
          enquiryReceived: "Pending",
          customerRemarks: "",
          nextCallDate: "",
          lastCallDate: ""
        })

      } else {
        console.error('Tracker sheet update failed:', trackerResponse.data)
        showNotification('Failed to update Call Tracker sheet', 'error')
      }
    } catch (error) {
      console.error("Error tracking call:", error)
      showNotification("Error tracking call: " + error.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="py-2">
      {/* update status modal */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setIsUpdateModalOpen(false)}></div>
            </div>

            {/* Centering trick */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Update Lead Status
                    </h3>
                    <form onSubmit={handleUpdateSubmit} className="space-y-4">
                      {/* Product Name (Col L) */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 text-left">Product Name</label>
                        <input
                          type="text"
                          value={updateFormData.productName}
                          onChange={(e) => setUpdateFormData({ ...updateFormData, productName: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                          placeholder="Enter Product Name"
                          required
                        />
                      </div>

                      {/* Customer Name (Col M) */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 text-left">Name Of The Customer If Any</label>
                        <input
                          type="text"
                          value={updateFormData.customerName}
                          onChange={(e) => setUpdateFormData({ ...updateFormData, customerName: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                          placeholder="Enter Customer Name"
                        />
                      </div>

                      {/* Contact No (Col N) */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 text-left">Contact No. If Any</label>
                        <input
                          type="text"
                          value={updateFormData.contactNo}
                          onChange={(e) => setUpdateFormData({ ...updateFormData, contactNo: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                          placeholder="Enter Contact No."
                        />
                      </div>

                      {/* Email (Col O) */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 text-left">Email No. If Any</label>
                        <input
                          type="email"
                          value={updateFormData.emailId}
                          onChange={(e) => setUpdateFormData({ ...updateFormData, emailId: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                          placeholder="Enter Email"
                        />
                      </div>

                      {/* Remarks (Col P) */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 text-left">Remarks</label>
                        <textarea
                          value={updateFormData.remarks}
                          onChange={(e) => setUpdateFormData({ ...updateFormData, remarks: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                          placeholder="Enter Remarks"
                          rows="3"
                        />
                      </div>

                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-sky-600 text-base font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                        >
                          {isSubmitting ? 'Updating...' : 'Update Status'}
                        </button>
                        <button
                          type="button"
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                          onClick={() => setIsUpdateModalOpen(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      )
      }

      {/* Call Tracker Modal */}
      {
        isCallTrackerOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setIsCallTrackerOpen(false)}></div>
              </div>

              {/* Centering trick */}
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 bg-indigo-50 p-2 rounded text-indigo-700">
                        Call Tracker
                      </h3>
                      <div className="mb-4 text-xs text-gray-500">
                        Recording call for: <span className="font-semibold text-gray-700">{currentLeadForCall?.companyName}</span> ({currentLeadForCall?.leadNumber})
                      </div>
                      <form onSubmit={handleCallTrackerSubmit} className="space-y-4">

                        {/* Last Date Of Call (Column K) */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 text-left">Last Date Of Call</label>
                          <input
                            type="datetime-local"
                            value={callTrackerData.lastCallDate}
                            onChange={(e) => setCallTrackerData({ ...callTrackerData, lastCallDate: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                          />
                        </div>

                        {/* Next Action To Be Taken */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 text-left">Next Action To Be Taken</label>
                          <input
                            type="text"
                            value={callTrackerData.nextAction}
                            onChange={(e) => setCallTrackerData({ ...callTrackerData, nextAction: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. Follow up, Send Quote, etc."
                          />
                        </div>

                        {/* Status */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 text-left">Status</label>
                          <select
                            value={callTrackerData.status}
                            onChange={(e) => setCallTrackerData({ ...callTrackerData, status: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Select Status</option>
                            {leadStatusOptions.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>

                        {/* Enquiry Received (Dropdown: Pending, Cancel, Yes) */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 text-left">Enquiry Received</label>
                          <select
                            value={callTrackerData.enquiryReceived}
                            onChange={(e) => setCallTrackerData({ ...callTrackerData, enquiryReceived: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Cancel">Cancel</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>

                        {/* What Did The Customer Say */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 text-left">What Did The Customer Say</label>
                          <textarea
                            value={callTrackerData.customerRemarks}
                            onChange={(e) => setCallTrackerData({ ...callTrackerData, customerRemarks: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Enter customer remarks details..."
                            rows="3"
                          />
                        </div>

                        {/* Next Call Date & Time */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 text-left">Next Call Date & Time</label>
                          <input
                            type="datetime-local"
                            value={callTrackerData.nextCallDate}
                            onChange={(e) => setCallTrackerData({ ...callTrackerData, nextCallDate: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                          >
                            {isSubmitting ? 'Saving...' : 'Save Call Log'}
                          </button>
                          <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                            onClick={() => setIsCallTrackerOpen(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        )
      }

      {/* Notification */}
      {
        notification && (
          <div className="fixed top-4 right-4 z-50 max-w-md w-full md:w-auto">
            <div className={`px-6 py-4 rounded-lg border-l-8 shadow-xl text-lg font-medium ${notification.type === "success" ? "bg-green-100 border-green-500 text-green-800" : "bg-red-100 border-red-500 text-red-800"}`}>
              {notification.message}
            </div>
          </div>
        )
      }

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

      {/* Tabs - 3 tabs: Leads, Update Status, Call Tracking */}
      <div className="flex space-x-1 rounded-xl bg-gray-100 p-1 mb-4 w-fit">
        <button
          onClick={() => setActiveTab("leads")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium leading-5 transition-all duration-200 ${activeTab === "leads"
            ? "bg-white text-sky-700 shadow"
            : "text-gray-500 hover:text-gray-700 hover:bg-white/[0.12]"
            }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          All Leads
          <span className="bg-sky-100 text-sky-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">{leads.length}</span>
        </button>
        <button
          onClick={() => setActiveTab("updateStatus")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium leading-5 transition-all duration-200 ${activeTab === "updateStatus"
            ? "bg-white text-teal-700 shadow"
            : "text-gray-500 hover:text-gray-700 hover:bg-white/[0.12]"
            }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Update Status
          <span className="bg-teal-100 text-teal-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">{leads.filter(l => { const ci = l.rawData && l.rawData[8] ? l.rawData[8].toString().trim() : ""; const cj = l.rawData && l.rawData[9] ? l.rawData[9].toString().trim() : ""; return ci && !cj; }).length}</span>
        </button>
        <button
          onClick={() => setActiveTab("callTracking")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium leading-5 transition-all duration-200 ${activeTab === "callTracking"
            ? "bg-white text-indigo-700 shadow"
            : "text-gray-500 hover:text-gray-700 hover:bg-white/[0.12]"
            }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
          Call Tracking
          <span className="bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">{leads.filter(l => { const ci = l.rawData && l.rawData[8] ? l.rawData[8].toString().trim() : ""; const cj = l.rawData && l.rawData[9] ? l.rawData[9].toString().trim() : ""; return ci && cj; }).length}</span>
        </button>
      </div>

      {/* ===================== TAB 1: ALL LEADS ===================== */}
      {activeTab === "leads" && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:flex bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex-col" style={{ height: '550px' }}>
            <div className="overflow-auto flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mb-4"></div>
                    <p className="text-gray-600">Loading leads from Google Sheets...</p>
                  </div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-center text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Stage</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Lead No.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Our Firm Name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Lead Received From</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Sales Person</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-sky-700 uppercase tracking-wider whitespace-nowrap">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-4 py-16 text-center">
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
                      filteredLeads.map((lead, index) => {
                        const colI = lead.rawData && lead.rawData[8] ? lead.rawData[8].toString().trim() : ""
                        const colJ = lead.rawData && lead.rawData[9] ? lead.rawData[9].toString().trim() : ""
                        let stage = "new"
                        if (colI && !colJ) stage = "updateStatus"
                        if (colI && colJ) stage = "callTracking"

                        return (
                          <tr key={lead.leadNumber || index} className="hover:bg-sky-50/30 transition-all duration-150">
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {stage === "new" && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                                  New
                                </span>
                              )}
                              {stage === "updateStatus" && (
                                <button
                                  onClick={() => handleUpdateClick(lead)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold hover:bg-teal-200 transition-colors"
                                >
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  Update Status
                                </button>
                              )}
                              {stage === "callTracking" && (
                                <button
                                  onClick={() => handleCallTrackerClick(lead)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold hover:bg-indigo-200 transition-colors"
                                >
                                  <PhoneCallIcon className="h-3 w-3" />
                                  Call Tracking
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-sky-100 text-sky-700 text-sm font-semibold">
                                {lead.leadNumber || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{lead.timestamp || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">{lead.ourFirmName || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-sm">
                                {lead.leadReceivedFrom || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">{lead.salesPerson || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">{lead.companyName || '-'}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{lead.department || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{lead.location || '-'}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
            {leads.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t text-sm font-medium text-gray-600 flex-shrink-0">
                Showing {filteredLeads.length} of {leads.length} leads
              </div>
            )}
          </div>

          {/* Mobile Card View - All Leads */}
          <div className="md:hidden space-y-3">
            {filteredLeads.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
                <p className="text-lg font-semibold text-gray-500">No leads found</p>
              </div>
            ) : (
              filteredLeads.map((lead, index) => {
                const colI = lead.rawData && lead.rawData[8] ? lead.rawData[8].toString().trim() : ""
                const colJ = lead.rawData && lead.rawData[9] ? lead.rawData[9].toString().trim() : ""
                let stage = "new"
                if (colI && !colJ) stage = "updateStatus"
                if (colI && colJ) stage = "callTracking"

                return (
                  <div key={lead.leadNumber || index} className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
                    <div className="flex justify-between items-start mb-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-sky-100 text-sky-700 text-sm font-semibold">
                        {lead.leadNumber || 'No ID'}
                      </span>
                      {stage === "new" && <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">New</span>}
                      {stage === "updateStatus" && (
                        <button onClick={() => handleUpdateClick(lead)} className="px-3 py-1.5 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold hover:bg-teal-200 transition-colors">Update Status</button>
                      )}
                      {stage === "callTracking" && (
                        <button onClick={() => handleCallTrackerClick(lead)} className="px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold hover:bg-indigo-200 transition-colors flex items-center gap-1">
                          <PhoneCallIcon className="h-3 w-3" /> Call
                        </button>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">{lead.companyName}</h3>
                    <p className="text-sm text-gray-600 mb-2 font-medium">{lead.ourFirmName}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-gray-400">Source:</span> <span className="text-gray-700">{lead.leadReceivedFrom}</span></div>
                      <div><span className="text-gray-400">Sales:</span> <span className="text-gray-700">{lead.salesPerson}</span></div>
                      <div><span className="text-gray-400">Dept:</span> <span className="text-gray-700">{lead.department}</span></div>
                      <div><span className="text-gray-400">Location:</span> <span className="text-gray-700">{lead.location}</span></div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {/* ===================== TAB 2: UPDATE STATUS ===================== */}
      {activeTab === "updateStatus" && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:flex bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex-col" style={{ height: '550px' }}>
            <div className="overflow-auto flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
                    <p className="text-gray-600">Loading data...</p>
                  </div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-bold text-teal-700 uppercase tracking-wider whitespace-nowrap">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-teal-700 uppercase tracking-wider whitespace-nowrap">Lead No.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-teal-700 uppercase tracking-wider whitespace-nowrap">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-teal-700 uppercase tracking-wider whitespace-nowrap">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-teal-700 uppercase tracking-wider whitespace-nowrap">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-teal-700 uppercase tracking-wider whitespace-nowrap">Customer Name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-teal-700 uppercase tracking-wider whitespace-nowrap">Contact No.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-teal-700 uppercase tracking-wider whitespace-nowrap">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-teal-700 uppercase tracking-wider whitespace-nowrap">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-4 py-16 text-center">
                          <p className="text-lg font-semibold text-gray-500">No leads found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((lead, index) => (
                        <tr key={lead.leadNumber || index} className="hover:bg-teal-50/30 transition-all duration-150">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleUpdateClick(lead)}
                              className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-md text-xs font-semibold hover:bg-teal-200 transition-colors"
                            >
                              Update Status
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-teal-100 text-teal-700 text-sm font-semibold">
                              {lead.leadNumber || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{lead.companyName || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{lead.location || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{lead.productName || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{lead.customerName || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{lead.contactNo || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{lead.emailId || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate" title={lead.remarks}>{lead.remarks || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
            {leads.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t text-sm font-medium text-gray-600 flex-shrink-0">
                Showing {filteredLeads.length} of {leads.length} leads
              </div>
            )}
          </div>

          {/* Mobile Card View - Update Status */}
          <div className="md:hidden space-y-3">
            {filteredLeads.map((lead, index) => (
              <div key={lead.leadNumber || index} className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-teal-100 text-teal-700 text-sm font-semibold">{lead.leadNumber || '-'}</span>
                  <button onClick={() => handleUpdateClick(lead)} className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold hover:bg-teal-200 transition-colors">Update</button>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{lead.companyName}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-400">Product:</span> <span className="text-gray-700">{lead.productName || '-'}</span></div>
                  <div><span className="text-gray-400">Customer:</span> <span className="text-gray-700">{lead.customerName || '-'}</span></div>
                  <div><span className="text-gray-400">Contact:</span> <span className="text-gray-700">{lead.contactNo || '-'}</span></div>
                  <div><span className="text-gray-400">Email:</span> <span className="text-gray-700">{lead.emailId || '-'}</span></div>
                  <div className="col-span-2"><span className="text-gray-400">Remarks:</span> <span className="text-gray-700">{lead.remarks || '-'}</span></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===================== TAB 3: CALL TRACKING ===================== */}
      {activeTab === "callTracking" && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:flex bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex-col" style={{ height: '550px' }}>
            <div className="overflow-auto flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-gray-600">Loading data...</p>
                  </div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Lead No.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Call Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Next Action</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Enquiry</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Cust. Remarks</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Next Call</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-4 py-16 text-center">
                          <p className="text-lg font-semibold text-gray-500">No leads found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((lead, index) => (
                        <tr key={lead.leadNumber || index} className="hover:bg-indigo-50/30 transition-all duration-150">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleCallTrackerClick(lead)}
                              className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold hover:bg-indigo-200 transition-colors flex items-center gap-1"
                            >
                              <PhoneCallIcon className="h-3 w-3" />
                              Call
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 text-sm font-semibold">
                              {lead.leadNumber || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{lead.companyName || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{lead.location || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {lead.trackerStatus ? (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${lead.trackerStatus === 'Hot' ? 'bg-red-100 text-red-800' :
                                lead.trackerStatus === 'Warm' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                {lead.trackerStatus}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{lead.trackerNextAction || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{lead.trackerEnquiry || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate" title={lead.trackerRemarks}>{lead.trackerRemarks || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{lead.trackerNextCall || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
            {leads.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t text-sm font-medium text-gray-600 flex-shrink-0">
                Showing {filteredLeads.length} of {leads.length} leads
              </div>
            )}
          </div>

          {/* Mobile Card View - Call Tracking */}
          <div className="md:hidden space-y-3">
            {filteredLeads.map((lead, index) => (
              <div key={lead.leadNumber || index} className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 text-sm font-semibold">{lead.leadNumber || '-'}</span>
                  <button
                    onClick={() => handleCallTrackerClick(lead)}
                    disabled={!lead.rawData || !lead.rawData[9]}
                    className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-200 disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    <PhoneCallIcon className="h-3 w-3" />
                    Call
                  </button>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{lead.companyName}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-400">Status:</span> <span className="font-medium">{lead.trackerStatus || '-'}</span></div>
                  <div><span className="text-gray-400">Enquiry:</span> <span className="text-gray-700">{lead.trackerEnquiry || '-'}</span></div>
                  <div><span className="text-gray-400">Next Action:</span> <span className="text-gray-700">{lead.trackerNextAction || '-'}</span></div>
                  <div><span className="text-gray-400">Next Call:</span> <span className="text-gray-700">{lead.trackerNextCall || '-'}</span></div>
                  <div className="col-span-2"><span className="text-gray-400">Remarks:</span> <span className="text-gray-700">{lead.trackerRemarks || '-'}</span></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* New Lead Modal */}
      {
        isModalOpen && (
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
                      {/* Our Firm Name */}
                      <div className="space-y-1">
                        <label htmlFor="ourFirmName" className="block text-xs font-medium text-gray-700 text-left">
                          Our Firm Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="ourFirmName"
                          value={formData.ourFirmName}
                          onChange={handleChange}
                          placeholder="Enter our firm name"
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                          required
                        />
                      </div>

                      {/* Lead Received From */}
                      <div className="space-y-1">
                        <label htmlFor="leadReceivedFrom" className="block text-xs font-medium text-gray-700 text-left">
                          Lead Received From <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="leadReceivedFrom"
                          value={formData.leadReceivedFrom}
                          onChange={handleChange}
                          placeholder="Enter lead source"
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                          required
                        />
                      </div>

                      {/* Sales Person (Name Of The Sales Person) */}
                      <div className="space-y-1">
                        <label htmlFor="salesPerson" className="block text-xs font-medium text-gray-700 text-left">
                          Name Of The Sales Person <span className="text-red-500">*</span>
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

                      {/* Company Name (Name Of The Company) */}
                      <div className="space-y-1">
                        <label htmlFor="companyName" className="block text-xs font-medium text-gray-700 text-left">
                          Name Of The Company <span className="text-red-500">*</span>
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
                          Department <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="department"
                          value={formData.department}
                          onChange={handleChange}
                          placeholder="Enter department"
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                          required
                        />
                      </div>

                      {/* Location */}
                      <div className="space-y-1">
                        <label htmlFor="location" className="block text-xs font-medium text-gray-700 text-left">
                          Location <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="location"
                          value={formData.location}
                          onChange={handleChange}
                          placeholder="Enter location"
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                          required
                        />
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
        )
      }
    </div >
  )
}

export default Leads