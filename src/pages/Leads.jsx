"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { PlusIcon, XIcon, PhoneCallIcon } from "../components/Icons"
import axios from "axios"
import { Download } from "lucide-react"
import Pagination from "../components/ui/Pagination"
import { exportToCsv } from "../utils/exportCsv"

const PAGE_SIZE = 10

// LocalStorage key for leads
const LEADS_STORAGE_KEY = "nbd_outgoing_leads"
const LEADS_COUNTER_KEY = "nbd_outgoing_leads_counter"

// Lead status colors
const statusColors = {
  Cold: "bg-blue-100 text-blue-800",
  Warm: "bg-yellow-100 text-yellow-800",
  Hot: "bg-red-100 text-red-800"
}

// Lead status options
const leadStatusOptions = ["Cold", "Warm", "Hot"]

// Classify a "Next Call" date against today, for the Call Tracking due-calls filter
const getCallDateCategory = (rawVal) => {
  if (!rawVal) return null
  const d = new Date(rawVal)
  if (isNaN(d.getTime())) return null
  const dayOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((dayOnly - today) / 86400000)
  if (diffDays < 0) return "overdue"
  if (diffDays === 0) return "today"
  if (diffDays === 1) return "tomorrow"
  if (diffDays <= 7) return "week"
  return "later"
}

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
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [notification, setNotification] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("updateStatus")
  const [page, setPage] = useState(1)
  const [callDateFilter, setCallDateFilter] = useState("all") // "all" | "overdue" | "today" | "tomorrow" | "week"

  const [masterFirmOptions, setMasterFirmOptions] = useState([])
  const [masterLeadReceivedFromOptions, setMasterLeadReceivedFromOptions] = useState([])
  const [masterSalesPersonOptions, setMasterSalesPersonOptions] = useState([])
  const [masterDepartmentOptions, setMasterDepartmentOptions] = useState([])
  const [masterProductOptions, setMasterProductOptions] = useState([])
  const [masterNextActionOptions, setMasterNextActionOptions] = useState([])
  const [detectedFreqColIdx, setDetectedFreqColIdx] = useState(21)

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

  // Fetch dropdown options from Master sheet
  const fetchMasterOptions = async () => {
    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
      const masterSheet = import.meta.env.VITE_MASTER_SHEET_NAME || 'Master'
      if (!scriptUrl) return

      const response = await axios.get(`${scriptUrl}?sheet=${encodeURIComponent(masterSheet)}&t=${Date.now()}`)
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const allRows = response.data.data
        if (allRows.length > 0) {
          const firstRow = (allRows[0] || []).map(h => String(h || "").trim().toLowerCase())
          const rows = allRows.slice(1)

          // 1. Our Firm Name column
          let firmIdx = firstRow.findIndex(h =>
            h.includes("firm name") || h.includes("our firm") || h === "firm"
          )
          if (firmIdx === -1) firmIdx = 0
          const firms = [...new Set(rows.map(r => String(r[firmIdx] || "").trim()).filter(Boolean))]
          if (firms.length > 0) setMasterFirmOptions(firms)

          // 2. Lead Received From column
          const leadReceivedIdx = firstRow.findIndex(h =>
            h.includes("lead received") || h.includes("lead source") || h.includes("received from")
          )
          if (leadReceivedIdx !== -1) {
            const leadSources = [...new Set(rows.map(r => String(r[leadReceivedIdx] || "").trim()).filter(Boolean))]
            if (leadSources.length > 0) setMasterLeadReceivedFromOptions(leadSources)
          }

          // 3. Name Of The Sales Person column
          let salesPersonIdx = firstRow.findIndex(h =>
            h.includes("sales person") || h.includes("sales executive") || h.includes("salesperson")
          )
          if (salesPersonIdx === -1) salesPersonIdx = 3
          const salesPersons = [...new Set(rows.map(r => String(r[salesPersonIdx] || "").trim()).filter(Boolean))]
          if (salesPersons.length > 0) setMasterSalesPersonOptions(salesPersons)

          // 4. Department column
          let deptIdx = firstRow.findIndex(h =>
            h.includes("department") || h === "dept"
          )
          if (deptIdx === -1) deptIdx = 4
          const departments = [...new Set(rows.map(r => String(r[deptIdx] || "").trim()).filter(Boolean))]
          if (departments.length > 0) setMasterDepartmentOptions(departments)

          // 5. Product Name column
          let productIdx = firstRow.findIndex(h =>
            h.includes("product name") || h.includes("product") || h.includes("product no")
          )
          if (productIdx === -1) productIdx = 2
          const products = [...new Set(rows.map(r => String(r[productIdx] || "").trim()).filter(Boolean))]
          if (products.length > 0) setMasterProductOptions(products)

          // 6. Next Action to be Taken column
          let nextActionIdx = firstRow.findIndex(h =>
            h.includes("next action") || h.includes("action to be taken") || h.includes("next action to be taken")
          )
          if (nextActionIdx !== -1) {
            const nextActions = [...new Set(rows.map(r => String(r[nextActionIdx] || "").trim()).filter(Boolean))]
            if (nextActions.length > 0) setMasterNextActionOptions(nextActions)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching master sheet options:", error)
    }
  }

  // Fetch data from Google Sheets (FMS Sheet Only)
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

      const response = await axios.get(`${scriptUrl}?sheet=${sheetName}&t=${Date.now()}`)

      if (response.data && response.data.success) {
        const sheetData = response.data.data

        // Process data from row 7 onwards (index 6)
        // We map first to preserve original row index (1-based)
        let freqColIdx = -1
        for (let r = 0; r < Math.min(sheetData.length, 7); r++) {
          const rowCandidate = (sheetData[r] || []).map(c => String(c || "").trim())
          const idx = rowCandidate.findIndex(h => h.toLowerCase() === "freq" || /^(freq|frequency|freq\.)/i.test(h) || /freq/i.test(h) || /no\.?\s*of\s*calls/i.test(h))
          if (idx !== -1) {
            freqColIdx = idx
            break
          }
        }
        if (freqColIdx === -1) freqColIdx = 21 // Column V (index 21) as default
        setDetectedFreqColIdx(freqColIdx)

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
              freqColIdx: freqColIdx,            // Exact detected Freq column index in sheet
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
              // Call Tracker Data directly from FMS Sheet
              trackerNextAction: row[16] || '',  // Column Q: Next Action
              trackerStatus: row[17] || '',      // Column R: Call Status
              trackerLastCall: displayDate(row[9]) || '', // Column J: Actual 1 / Last Call
              trackerEnquiry: row[18] || '',     // Column S: Enquiry Received
              trackerRemarks: row[19] || '',     // Column T: Cust Remarks
              trackerNextCall: (row[20] ? displayDate(row[20]) : "") || '', // Column U: Next Call Date
              trackerNextCallRaw: row[20] || '',  // Column U raw value, for date-based filtering
              trackerFreq: (row[freqColIdx] !== undefined && row[freqColIdx] !== null && String(row[freqColIdx]).trim() !== "") ? (parseInt(row[freqColIdx], 10) || 0) : (parseInt(row[21], 10) || 0)
            }
          })
          .reverse() // Show newest first

        setLeads(processedLeads)
        console.log('Fetched leads from Google Sheets (FMS only):', processedLeads.length)
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


  // Load leads from Google Sheets and Master options on component mount
  useEffect(() => {
    fetchLeadsFromSheet()
    fetchMasterOptions()
  }, [])

  const cleanUniqueOptions = (list) => {
    const seen = new Set()
    const result = []
    list.forEach(item => {
      const trimmed = String(item || "").trim()
      if (!trimmed) return
      const lower = trimmed.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        result.push(trimmed)
      }
    })
    return result
  }

  // All dropdown options below come strictly from the live Master sheet — no hardcoded fallback lists.
  const firmDropdownOptions = cleanUniqueOptions(masterFirmOptions)

  const leadReceivedFromDropdownOptions = cleanUniqueOptions(masterLeadReceivedFromOptions)

  const salesPersonDropdownOptions = cleanUniqueOptions(masterSalesPersonOptions)

  const departmentDropdownOptions = cleanUniqueOptions(masterDepartmentOptions)

  // Derived product options: master options > existing leads product names
  const productDropdownOptions = cleanUniqueOptions(
    masterProductOptions.length > 0
      ? masterProductOptions
      : leads.map(l => l.productName).filter(Boolean)
  )

  const defaultNextActionOptions = ["Enquiry Received", "Follow up", "Arrange visit"]
  // Derived next action options: master options > default options + existing call tracker next actions (strictly deduplicated)
  const nextActionDropdownOptions = cleanUniqueOptions(
    masterNextActionOptions.length > 0
      ? masterNextActionOptions
      : [...defaultNextActionOptions, ...leads.map(l => l.trackerNextAction).filter(Boolean)]
  )

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
    if (activeTab === "leads") {
      // All Leads = brand new leads only. Once "Update Status" has been done on a lead
      // (Column I / Planned 1 gets filled), it must move on and stop showing up here too.
      const colI = lead.rawData && lead.rawData[8] ? lead.rawData[8].toString().trim() : ""
      if (colI) return false
      const enquiryReceived = String(lead.trackerEnquiry || "").trim()
      if (enquiryReceived === "Yes" || enquiryReceived === "Cancel") return false
    }
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
      // Exclude leads already resolved as Enquiry Received (Yes) or Not Received (Cancel) —
      // those now live under their own tabs, only active/pending ones stay here
      const enquiryReceived = String(lead.trackerEnquiry || "").trim()
      if (enquiryReceived === "Yes" || enquiryReceived === "Cancel") return false

      // "Who do I need to call today / tomorrow / this week" filter, based on Next Call date
      if (callDateFilter !== "all") {
        const category = getCallDateCategory(lead.trackerNextCallRaw)
        if (callDateFilter === "week") {
          if (category !== "overdue" && category !== "today" && category !== "tomorrow" && category !== "week") return false
        } else if (category !== callDateFilter) {
          return false
        }
      }
    }
    if (activeTab === "history") {
      // Show resolved leads: Enquiry Received (Yes) or Enquiry Not Received (Cancel)
      const enquiryReceived = String(lead.trackerEnquiry || "").trim()
      if (enquiryReceived !== "Yes" && enquiryReceived !== "Cancel") return false
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

  // Reset to page 1 whenever the active tab, search, or call-date filter changes
  useEffect(() => {
    setPage(1)
  }, [activeTab, searchTerm, callDateFilter])

  const paginatedLeads = filteredLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleExportLeads = () => {
    exportToCsv(`nbd-leads-${activeTab}`, [
      { label: "Lead No.", value: (l) => l.leadNumber || "" },
      { label: "Our Firm Name", value: (l) => l.ourFirmName || "" },
      { label: "Lead Received From", value: (l) => l.leadReceivedFrom || "" },
      { label: "Sales Person", value: (l) => l.salesPerson || "" },
      { label: "Company", value: (l) => l.companyName || "" },
      { label: "Department", value: (l) => l.department || "" },
      { label: "Location", value: (l) => l.location || "" },
    ], filteredLeads)
  }

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

      // Set formula-based columns to null to prevent overwriting/blocking formulas
      // We do NOT set updateRowData[1] to null anymore to preserve Lead No / Index Number
      updateRowData[8] = null;  // Column I: Planned 1
      updateRowData[10] = null; // Column K: Delay 1

      // Column J (Index 9): Actual 1 - NOW UPDATED WITH TIMESTAMP
      updateRowData[9] = formattedUpdateTimestamp

      // IMPORTANT: Re-set Column A to its original value after any clearing
      updateRowData[0] = originalColumnA

      // Overwrite specific columns with new form data
      updateRowData[11] = updateFormData.productName
      updateRowData[12] = updateFormData.customerName
      updateRowData[13] = updateFormData.contactNo
      updateRowData[14] = updateFormData.emailId
      updateRowData[15] = updateFormData.remarks

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
    targetSystem: "",
    customerRemarks: "",
    nextCallDate: "",
    lastCallDate: ""
  })
  const isArrangeVisitSelected = String(callTrackerData.nextAction || "").trim().toLowerCase().includes("arrange visit")

  // Open Call Tracker Modal
  const handleCallTrackerClick = (lead) => {
    setCurrentLeadForCall(lead)
    const existingNextAction = lead.trackerNextAction || lead.rawData?.[16] || ""
    const isEnquiryReceived = String(existingNextAction).trim().toLowerCase().includes("enquiry received")
    const existingEnquiry = isEnquiryReceived ? "Yes" : (lead.trackerEnquiry || lead.rawData?.[18] || "Pending")

    setCallTrackerData({
      nextAction: existingNextAction,
      status: lead.trackerStatus || lead.rawData?.[17] || "",
      enquiryReceived: existingEnquiry,
      targetSystem: "",
      customerRemarks: lead.trackerRemarks || lead.rawData?.[19] || "",
      nextCallDate: "",
      lastCallDate: new Date().toISOString().slice(0, 16)
    })
    setIsCallTrackerOpen(true)
  }

  // Handle Call Tracker Submit (FMS Sheet Only)
  const handleCallTrackerSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!currentLeadForCall || !currentLeadForCall.rowIndex) {
        showNotification("No lead selected or missing row index", "error")
        setIsSubmitting(false)
        return
      }

      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
      const fmsSheetName = import.meta.env.VITE_FMS_SHEET_NAME

      if (!scriptUrl || !fmsSheetName) {
        showNotification('FMS sheet configuration missing', 'error')
        setIsSubmitting(false)
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

      let fmsRowData = [...(currentLeadForCall.rawData || [])]
      const fmsFreqCol = currentLeadForCall.freqColIdx ?? detectedFreqColIdx ?? 21
      const targetLen = Math.max(22, fmsFreqCol + 1)
      while (fmsRowData.length < targetLen) fmsRowData.push("")

      // Preserve formulas and timestamp format in FMS sheet
      fmsRowData[8] = null;  // Column I: Planned 1
      fmsRowData[10] = null; // Column K: Delay 1

      // Correctly format Column A timestamp to preserve it
      const rawColA = currentLeadForCall.rawData?.[0] || currentLeadForCall.timestamp
      if (rawColA) {
        const colADate = new Date(rawColA)
        if (!isNaN(colADate.getTime())) {
          const aMonth = colADate.getMonth() + 1
          const aDay = colADate.getDate()
          const aYear = colADate.getFullYear()
          const aHours = colADate.getHours()
          const aMinutes = colADate.getMinutes().toString().padStart(2, '0')
          const aSeconds = colADate.getSeconds().toString().padStart(2, '0')
          fmsRowData[0] = `${aMonth}/${aDay}/${aYear} ${aHours}:${aMinutes}:${aSeconds}`
        }
      }

      const isYes = callTrackerData.enquiryReceived === "Yes"
      const isCancel = callTrackerData.enquiryReceived === "Cancel"

      if (isYes && !callTrackerData.targetSystem) {
        showNotification("Please select which system (NBD Enquiry or CRR Enquiry) this enquiry should go to", "error")
        setIsSubmitting(false)
        return
      }

      fmsRowData[16] = callTrackerData.nextAction     // Column Q: Next Action
      fmsRowData[17] = callTrackerData.status         // Column R: Call Status
      fmsRowData[18] = callTrackerData.enquiryReceived // Column S: Enquiry Received
      fmsRowData[19] = isYes ? "" : callTrackerData.customerRemarks // Column T: Customer Remarks
      fmsRowData[20] = (isYes || isCancel) ? "" : (callTrackerData.nextCallDate ? formatDateToString(callTrackerData.nextCallDate) : "") // Column U: Next Call Date

      // Frequency increment: if Next Call Date is entered, increment Freq by +1
      if (callTrackerData.nextCallDate && !isYes && !isCancel) {
        const prevFreq = parseInt(currentLeadForCall.rawData?.[fmsFreqCol] ?? currentLeadForCall.trackerFreq ?? 0, 10) || 0
        fmsRowData[fmsFreqCol] = prevFreq + 1
      }

      const fmsUpdatePayload = new URLSearchParams()
      fmsUpdatePayload.append('action', 'update')
      fmsUpdatePayload.append('sheetName', fmsSheetName)
      fmsUpdatePayload.append('rowIndex', currentLeadForCall.rowIndex)
      fmsUpdatePayload.append('rowData', JSON.stringify(fmsRowData))

      const response = await axios.post(scriptUrl, fmsUpdatePayload, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })

      if (response.data && response.data.success) {
        showNotification("Call tracking updated successfully in FMS Sheet!", "success")
        setIsCallTrackerOpen(false)
        const leadForHandoff = {
          leadNumber: currentLeadForCall.leadNumber,
          companyName: currentLeadForCall.companyName,
          salesPerson: currentLeadForCall.salesPerson,
          department: currentLeadForCall.department,
          location: currentLeadForCall.location,
        }
        setCallTrackerData({
          nextAction: "",
          status: "",
          enquiryReceived: "Pending",
          targetSystem: "",
          customerRemarks: "",
          nextCallDate: "",
          lastCallDate: ""
        })
        if (isYes && callTrackerData.targetSystem === "CRR") {
          navigate("/crr-enquiry", { state: { openNewEnquiry: true, lead: leadForHandoff } })
        } else if (isYes && callTrackerData.targetSystem === "NBD") {
          navigate("/call-tracker", { state: { openNewEnquiry: true, lead: leadForHandoff } })
        } else if (isArrangeVisitSelected) {
          navigate("/marketing-visit-tracker", { state: { openNewVisit: true, lead: leadForHandoff } })
        } else {
          fetchLeadsFromSheet(false)
        }
      } else {
        console.error('FMS sheet update failed:', response.data)
        showNotification(`Update failed: ${response.data?.error || 'Unknown error'}`, 'error')
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
        <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm bg-black/40">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-transparent" onClick={() => setIsUpdateModalOpen(false)}></div>
            </div>

            {/* Centering trick */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-slate-200">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
                      <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        Update Lead Status
                      </h3>
                      <button onClick={() => setIsUpdateModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-xl transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </div>

                    <form onSubmit={handleUpdateSubmit} className="space-y-5">
                      {/* Product Name (Col L) */}
                      <div>
                        <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">
                          Product Name <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={updateFormData.productName}
                          onChange={(e) => setUpdateFormData({ ...updateFormData, productName: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                          required
                        >
                          <option value="">Select Product Name</option>
                          {productDropdownOptions.map((prod, idx) => (
                            <option key={idx} value={prod}>{prod}</option>
                          ))}
                        </select>
                      </div>

                      {/* Customer Name (Col M) */}
                      <div>
                        <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Name Of The Customer If Any</label>
                        <input
                          type="text"
                          value={updateFormData.customerName}
                          onChange={(e) => setUpdateFormData({ ...updateFormData, customerName: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                          placeholder="Enter Customer Name"
                        />
                      </div>

                      {/* Contact No (Col N) */}
                      <div>
                        <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Contact No. If Any</label>
                        <input
                          type="text"
                          value={updateFormData.contactNo}
                          onChange={(e) => setUpdateFormData({ ...updateFormData, contactNo: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                          placeholder="Enter Contact No."
                        />
                      </div>

                      {/* Email (Col O) */}
                      <div>
                        <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Email No. If Any</label>
                        <input
                          type="email"
                          value={updateFormData.emailId}
                          onChange={(e) => setUpdateFormData({ ...updateFormData, emailId: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                          placeholder="Enter Email"
                        />
                      </div>

                      {/* Remarks (Col P) */}
                      <div>
                        <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Remarks</label>
                        <textarea
                          value={updateFormData.remarks}
                          onChange={(e) => setUpdateFormData({ ...updateFormData, remarks: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                          placeholder="Enter Remarks"
                          rows="3"
                        />
                      </div>

                      <div className="mt-6 pt-5 border-t border-slate-100 sm:flex sm:flex-row-reverse bg-slate-50 -mx-6 -mb-6 px-6 py-4 rounded-b-2xl">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full inline-flex justify-center items-center rounded-xl border border-transparent shadow-md px-6 py-2.5 bg-sky-600 text-sm font-bold text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 sm:ml-3 sm:w-auto transition-all disabled:opacity-50 hover:shadow-lg transform hover:-translate-y-0.5"
                        >
                          {isSubmitting ? 'Updating...' : 'Update Status'}
                        </button>
                        <button
                          type="button"
                          className="mt-3 w-full inline-flex justify-center items-center rounded-xl border border-slate-200 shadow-sm px-6 py-2.5 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:mt-0 sm:w-auto transition-all"
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
      )}

      {/* Call Tracker Modal */}
      {
        isCallTrackerOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm bg-black/40">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-transparent" onClick={() => setIsCallTrackerOpen(false)}></div>
              </div>

              {/* Centering trick */}
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-slate-200">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      
                      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
                        <div className="flex flex-col">
                          <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                            Call Tracker
                          </h3>
                          <span className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                            Recording call for: <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{currentLeadForCall?.companyName}</span> <span className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md border border-indigo-100">{currentLeadForCall?.leadNumber}</span>
                          </span>
                        </div>
                        <button onClick={() => setIsCallTrackerOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-xl transition-colors self-start">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      </div>

                      <form onSubmit={handleCallTrackerSubmit} className="space-y-5">

                        {/* Last Date Of Call (Column K) - Read-Only */}
                        <div>
                          <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Last Date Of Call</label>
                          <input
                            type="datetime-local"
                            value={callTrackerData.lastCallDate}
                            readOnly
                            disabled
                            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-100 cursor-not-allowed text-slate-500 focus:outline-none"
                          />
                        </div>

                        {/* Next Action To Be Taken */}
                        <div>
                          <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Next Action To Be Taken</label>
                          <select
                            value={callTrackerData.nextAction}
                            onChange={(e) => {
                              const selected = e.target.value
                              const isEnq = String(selected || "").trim().toLowerCase().includes("enquiry received")
                              setCallTrackerData(prev => ({
                                ...prev,
                                nextAction: selected,
                                enquiryReceived: isEnq ? "Yes" : (prev.enquiryReceived === "Yes" ? "Pending" : prev.enquiryReceived)
                              }))
                            }}
                            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <option value="">Select Next Action</option>
                            {nextActionDropdownOptions.map((act, idx) => (
                              <option key={idx} value={act}>{act}</option>
                            ))}
                          </select>
                        </div>

                        {/* Status & Enquiry Received — hidden once Next Action = "Enquiry Received" (implies
                            Enquiry Received = Yes) or "Arrange Visit" (goes straight to Marketing Visit). */}
                        {callTrackerData.enquiryReceived !== "Yes" && !isArrangeVisitSelected && (
                          <>
                            <div>
                              <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Status</label>
                              <select
                                value={callTrackerData.status}
                                onChange={(e) => setCallTrackerData({ ...callTrackerData, status: e.target.value })}
                                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <option value="">Select Status</option>
                                {leadStatusOptions.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>

                            {/* Enquiry Received (Dropdown: Pending, Cancel) */}
                            <div>
                              <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Enquiry Received</label>
                              <select
                                value={callTrackerData.enquiryReceived}
                                onChange={(e) => setCallTrackerData({ ...callTrackerData, enquiryReceived: e.target.value })}
                                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Cancel">Cancel</option>
                              </select>
                            </div>
                          </>
                        )}

                        {/* Which system should this enquiry go to — only relevant once Enquiry Received = Yes */}
                        {callTrackerData.enquiryReceived === "Yes" && (
                          <div>
                            <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Send Enquiry To</label>
                            <select
                              value={callTrackerData.targetSystem}
                              onChange={(e) => setCallTrackerData({ ...callTrackerData, targetSystem: e.target.value })}
                              required
                              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <option value="">Select system...</option>
                              <option value="NBD">NBD Enquiry</option>
                              <option value="CRR">CRR Enquiry</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-1">Its New Enquiry form will open automatically after saving.</p>
                          </div>
                        )}

                        {isArrangeVisitSelected && (
                          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
                            The "Log Client Plant Visit Report" form (Marketing Visit Tracker) will open automatically after saving.
                          </div>
                        )}

                        {/* What Did The Customer Say - Hidden when Enquiry Received is Yes */}
                        {callTrackerData.enquiryReceived !== "Yes" && (
                          <div>
                            <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">What Did The Customer Say</label>
                            <textarea
                              value={callTrackerData.customerRemarks}
                              onChange={(e) => setCallTrackerData({ ...callTrackerData, customerRemarks: e.target.value })}
                              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                              placeholder="Enter customer remarks details..."
                              rows="3"
                            />
                          </div>
                        )}

                        {/* Next Call Date & Time - Hidden when Enquiry Received is Yes or Cancel */}
                        {callTrackerData.enquiryReceived !== "Yes" && callTrackerData.enquiryReceived !== "Cancel" && (
                          <div>
                            <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Next Call Date & Time</label>
                            <input
                              type="datetime-local"
                              value={callTrackerData.nextCallDate}
                              onChange={(e) => setCallTrackerData({ ...callTrackerData, nextCallDate: e.target.value })}
                              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                            />
                          </div>
                        )}

                        <div className="mt-6 pt-5 border-t border-slate-100 sm:flex sm:flex-row-reverse bg-slate-50 -mx-6 -mb-6 px-6 py-4 rounded-b-2xl">
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full inline-flex justify-center items-center rounded-xl border border-transparent shadow-md px-6 py-2.5 bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto transition-all disabled:opacity-50 hover:shadow-lg transform hover:-translate-y-0.5"
                          >
                            {isSubmitting ? 'Saving...' : 'Save Call Log'}
                          </button>
                          <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center items-center rounded-xl border border-slate-200 shadow-sm px-6 py-2.5 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:mt-0 sm:w-auto transition-all"
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
      
      {/* Tabs */}
      <div className="flex space-x-2 rounded-2xl bg-white p-1.5 mb-8 w-fit mx-auto overflow-x-auto border border-slate-200 shadow-sm">
        <button
          onClick={() => { setActiveTab("updateStatus"); setCallDateFilter("all") }}
          className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-center text-xs font-medium leading-4 transition-all duration-200 [&>svg]:hidden sm:flex-row sm:gap-2 sm:px-4 sm:text-left sm:text-sm sm:leading-5 sm:whitespace-nowrap sm:[&>svg]:block ${activeTab === "updateStatus"
            ? "bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
        >
          <svg className={`h-4 w-4 ${activeTab === "updateStatus" ? "" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Update Status
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeTab === "updateStatus" ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-500"}`}>{leads.filter(l => { const ci = l.rawData && l.rawData[8] ? l.rawData[8].toString().trim() : ""; const cj = l.rawData && l.rawData[9] ? l.rawData[9].toString().trim() : ""; return ci && !cj; }).length}</span>
        </button>
        <button
          onClick={() => setActiveTab("callTracking")}
          className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-center text-xs font-medium leading-4 transition-all duration-200 [&>svg]:hidden sm:flex-row sm:gap-2 sm:px-4 sm:text-left sm:text-sm sm:leading-5 sm:whitespace-nowrap sm:[&>svg]:block ${activeTab === "callTracking"
            ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
        >
          <svg className={`h-4 w-4 ${activeTab === "callTracking" ? "" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
          Call Tracking
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeTab === "callTracking" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>{leads.filter(l => { const ci = l.rawData && l.rawData[8] ? l.rawData[8].toString().trim() : ""; const cj = l.rawData && l.rawData[9] ? l.rawData[9].toString().trim() : ""; const er = String(l.trackerEnquiry || "").trim(); return ci && cj && er !== "Yes" && er !== "Cancel"; }).length}</span>
        </button>
        <button
          onClick={() => { setActiveTab("history"); setCallDateFilter("all") }}
          className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-center text-xs font-medium leading-4 transition-all duration-200 [&>svg]:hidden sm:flex-row sm:gap-2 sm:px-4 sm:text-left sm:text-sm sm:leading-5 sm:whitespace-nowrap sm:[&>svg]:block ${activeTab === "history"
            ? "bg-slate-100 text-slate-700 shadow-sm ring-1 ring-slate-300"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
        >
          <svg className={`h-4 w-4 ${activeTab === "history" ? "" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          History
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeTab === "history" ? "bg-slate-200 text-slate-700" : "bg-gray-100 text-gray-500"}`}>{leads.filter(l => { const er = String(l.trackerEnquiry || "").trim(); return er === "Yes" || er === "Cancel"; }).length}</span>
        </button>
      </div>

      {/* Controls */}
      <div className="bg-card rounded-2xl shadow-sm border border-slate-200/70 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 min-w-[250px]"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportLeads}
              disabled={filteredLeads.length === 0}
              className="bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <PlusIcon className="h-4 w-4" />
              New Lead
            </button>
          </div>
        </div>
      </div>

      {/* ===================== TAB 2: UPDATE STATUS ===================== */}
      {activeTab === "updateStatus" && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-card rounded-2xl shadow-md border border-slate-200/70 overflow-hidden">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full py-16">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
                    <p className="text-gray-600">Loading data...</p>
                  </div>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-gray-200">
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-teal-700 uppercase tracking-wider whitespace-nowrap">Action</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-teal-700 uppercase tracking-wider whitespace-nowrap">Lead No.</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-teal-700 uppercase tracking-wider whitespace-nowrap">Our Firm Name</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-teal-700 uppercase tracking-wider whitespace-nowrap">Lead Received From</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-teal-700 uppercase tracking-wider whitespace-nowrap">Sales Person</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-teal-700 uppercase tracking-wider whitespace-nowrap">Company</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-teal-700 uppercase tracking-wider whitespace-nowrap">Department</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-teal-700 uppercase tracking-wider whitespace-nowrap">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-card">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-20 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                              <svg className="h-6 w-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <p className="text-base font-semibold text-gray-500">No leads found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedLeads.map((lead, index) => (
                        <tr key={lead.leadNumber || index} className="hover:bg-teal-50/30 transition-colors duration-150">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <button
                              onClick={() => handleUpdateClick(lead)}
                              className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-md text-xs font-semibold hover:bg-teal-200 transition-colors cursor-pointer"
                            >
                              Update Status
                            </button>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-teal-100 text-teal-700 text-sm font-semibold">
                              {lead.leadNumber || '-'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-[160px] truncate" title={lead.ourFirmName}>{lead.ourFirmName || '-'}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-[160px] truncate" title={lead.leadReceivedFrom}>{lead.leadReceivedFrom || '-'}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-[160px] truncate" title={lead.salesPerson}>{lead.salesPerson || '-'}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900 max-w-[200px] truncate" title={lead.companyName}>{lead.companyName || '-'}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-[140px] truncate" title={lead.department}>{lead.department || '-'}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-[140px] truncate" title={lead.location}>{lead.location || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
            {filteredLeads.length > 0 && (
              <Pagination page={page} pageSize={PAGE_SIZE} totalItems={filteredLeads.length} onPageChange={setPage} />
            )}
          </div>

          {/* Mobile Card View - Update Status */}
          <div className="md:hidden space-y-3">
            {paginatedLeads.map((lead, index) => (
              <div key={lead.leadNumber || index} className="bg-card rounded-xl shadow-md border border-gray-100 p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-teal-100 text-teal-700 text-sm font-semibold">{lead.leadNumber || '-'}</span>
                  <button onClick={() => handleUpdateClick(lead)} className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold hover:bg-teal-200 transition-colors cursor-pointer">Update</button>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2 truncate" title={lead.companyName}>{lead.companyName}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-400">Our Firm:</span> <span className="text-gray-700">{lead.ourFirmName || '-'}</span></div>
                  <div><span className="text-gray-400">Lead From:</span> <span className="text-gray-700">{lead.leadReceivedFrom || '-'}</span></div>
                  <div><span className="text-gray-400">Sales Person:</span> <span className="text-gray-700">{lead.salesPerson || '-'}</span></div>
                  <div><span className="text-gray-400">Department:</span> <span className="text-gray-700">{lead.department || '-'}</span></div>
                  <div className="col-span-2"><span className="text-gray-400">Location:</span> <span className="text-gray-700">{lead.location || '-'}</span></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===================== TAB 3: CALL TRACKING ===================== */}
      {activeTab === "callTracking" && (
        <>
          {/* Who do I need to call — Today / Tomorrow / This Week */}
          {(() => {
            const eligible = leads.filter(l => {
              const colI = l.rawData && l.rawData[8] ? l.rawData[8].toString().trim() : ""
              const colJ = l.rawData && l.rawData[9] ? l.rawData[9].toString().trim() : ""
              const er = String(l.trackerEnquiry || "").trim()
              return colI && colJ && er !== "Yes" && er !== "Cancel"
            })
            const countFor = (cat) => eligible.filter(l => {
              const c = getCallDateCategory(l.trackerNextCallRaw)
              if (cat === "week") return c === "overdue" || c === "today" || c === "tomorrow" || c === "week"
              return c === cat
            }).length

            const cards = [
              { key: "overdue", label: "Overdue", color: "red" },
              { key: "today", label: "Call Today", color: "orange" },
              { key: "tomorrow", label: "Call Tomorrow", color: "amber" },
              { key: "week", label: "This Week", color: "sky" },
            ]
            const colorClasses = {
              red: { base: "bg-red-50 border-red-200 text-red-700", active: "bg-red-100 border-red-400 ring-2 ring-red-300 text-red-800", count: "bg-red-200 text-red-800", countBase: "bg-red-100 text-red-700" },
              orange: { base: "bg-orange-50 border-orange-200 text-orange-700", active: "bg-orange-100 border-orange-400 ring-2 ring-orange-300 text-orange-800", count: "bg-orange-200 text-orange-800", countBase: "bg-orange-100 text-orange-700" },
              amber: { base: "bg-amber-50 border-amber-200 text-amber-700", active: "bg-amber-100 border-amber-400 ring-2 ring-amber-300 text-amber-800", count: "bg-amber-200 text-amber-800", countBase: "bg-amber-100 text-amber-700" },
              sky: { base: "bg-sky-50 border-sky-200 text-sky-700", active: "bg-sky-100 border-sky-400 ring-2 ring-sky-300 text-sky-800", count: "bg-sky-200 text-sky-800", countBase: "bg-sky-100 text-sky-700" },
            }

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {cards.map(c => {
                  const isActive = callDateFilter === c.key
                  const cls = colorClasses[c.color]
                  return (
                    <button
                      key={c.key}
                      onClick={() => setCallDateFilter(isActive ? "all" : c.key)}
                      className={`flex items-center justify-between gap-2 rounded-xl border p-4 text-left transition-all hover:shadow-md ${isActive ? cls.active : cls.base
                        }`}
                    >
                      <span className="text-sm font-semibold">{c.label}</span>
                      <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${isActive ? cls.count : cls.countBase}`}>
                        {countFor(c.key)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })()}
          {callDateFilter !== "all" && (
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
              Showing only leads to call for: <span className="font-semibold text-gray-800">{callDateFilter === "week" ? "This Week (incl. today & overdue)" : callDateFilter.charAt(0).toUpperCase() + callDateFilter.slice(1)}</span>
              <button onClick={() => setCallDateFilter("all")} className="text-sky-600 hover:text-sky-800 font-medium underline">Clear</button>
            </div>
          )}

          {/* Desktop Table */}
          <div className="hidden md:block bg-card rounded-2xl shadow-md border border-slate-200/70 overflow-hidden">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full py-16">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-gray-600">Loading data...</p>
                  </div>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Action</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Lead No.</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Company</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Location</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Product</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Customer Name</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Contact No.</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Email</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Update Remarks</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Last Date Of Call</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Call Status</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Next Action</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Enquiry Received</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Cust. Remarks</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Next Call</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Freq</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-card">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan="16" className="px-4 py-20 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                              <PhoneCallIcon className="h-6 w-6 text-gray-300" />
                            </div>
                            <p className="text-base font-semibold text-gray-500">No leads found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedLeads.map((lead, index) => (
                        <tr key={lead.leadNumber || index} className="hover:bg-indigo-50/30 transition-colors duration-150">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <button
                              onClick={() => handleCallTrackerClick(lead)}
                              className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold hover:bg-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <PhoneCallIcon className="h-3 w-3" />
                              Call
                            </button>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 text-sm font-semibold">
                              {lead.leadNumber || '-'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900 max-w-[180px] truncate" title={lead.companyName}>{lead.companyName || '-'}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-[120px] truncate" title={lead.location}>{lead.location || '-'}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-[140px] truncate" title={lead.productName}>{lead.productName || '-'}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-[140px] truncate" title={lead.customerName}>{lead.customerName || '-'}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{lead.contactNo || '-'}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-[160px] truncate" title={lead.emailId}>{lead.emailId || '-'}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate" title={lead.remarks}>{lead.remarks || '-'}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 font-medium">{lead.trackerLastCall || '-'}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm">
                            {lead.trackerStatus ? (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${lead.trackerStatus === 'Hot' ? 'bg-red-100 text-red-800' :
                                lead.trackerStatus === 'Warm' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                {lead.trackerStatus}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-[140px] truncate" title={lead.trackerNextAction}>{lead.trackerNextAction || '-'}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm">
                            {lead.trackerEnquiry ? (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                lead.trackerEnquiry === 'Yes' ? 'bg-green-100 text-green-800' :
                                lead.trackerEnquiry === 'Cancel' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {lead.trackerEnquiry}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate" title={lead.trackerRemarks}>{lead.trackerRemarks || '-'}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm">
                            {(() => {
                              const cat = getCallDateCategory(lead.trackerNextCallRaw)
                              const badgeCls = cat === "overdue" ? "bg-red-100 text-red-700"
                                : cat === "today" ? "bg-orange-100 text-orange-700"
                                  : cat === "tomorrow" ? "bg-amber-100 text-amber-700"
                                    : "text-gray-600"
                              return (
                                <span className={`${cat ? `px-2 py-0.5 rounded font-medium ${badgeCls}` : "text-gray-600"}`}>
                                  {lead.trackerNextCall || '-'}{cat === "overdue" ? " (Overdue)" : cat === "today" ? " (Today)" : cat === "tomorrow" ? " (Tomorrow)" : ""}
                                </span>
                              )
                            })()}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-sm">
                            <span className="inline-flex items-center px-2 py-0.5 rounded font-bold bg-indigo-50 text-indigo-700 text-xs border border-indigo-200">
                              {lead.trackerFreq || 0}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
            {filteredLeads.length > 0 && (
              <Pagination page={page} pageSize={PAGE_SIZE} totalItems={filteredLeads.length} onPageChange={setPage} />
            )}
          </div>

          {/* Mobile Card View - Call Tracking */}
          <div className="md:hidden space-y-3">
            {paginatedLeads.map((lead, index) => (
              <div key={lead.leadNumber || index} className="bg-card rounded-xl shadow-md border border-gray-100 p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 text-sm font-semibold">{lead.leadNumber || '-'}</span>
                  <button
                    onClick={() => handleCallTrackerClick(lead)}
                    className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <PhoneCallIcon className="h-3 w-3" />
                    Call
                  </button>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2 truncate" title={lead.companyName}>{lead.companyName}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-400">Product:</span> <span className="text-gray-700">{lead.productName || '-'}</span></div>
                  <div><span className="text-gray-400">Customer:</span> <span className="text-gray-700">{lead.customerName || '-'}</span></div>
                  <div><span className="text-gray-400">Contact:</span> <span className="text-gray-700">{lead.contactNo || '-'}</span></div>
                  <div><span className="text-gray-400">Email:</span> <span className="text-gray-700">{lead.emailId || '-'}</span></div>
                  <div className="col-span-2"><span className="text-gray-400">Update Remarks:</span> <span className="text-gray-700">{lead.remarks || '-'}</span></div>
                  <div><span className="text-gray-400">Last Call:</span> <span className="text-gray-700">{lead.trackerLastCall || '-'}</span></div>
                  <div><span className="text-gray-400">Call Status:</span> <span className="font-medium">{lead.trackerStatus || '-'}</span></div>
                  <div><span className="text-gray-400">Enquiry:</span> <span className="font-semibold text-gray-800">{lead.trackerEnquiry || '-'}</span></div>
                  <div><span className="text-gray-400">Next Action:</span> <span className="text-gray-700">{lead.trackerNextAction || '-'}</span></div>
                  <div><span className="text-gray-400">Next Call:</span> <span className="text-gray-700">{lead.trackerNextCall || '-'}</span></div>
                  <div><span className="text-gray-400">Freq:</span> <span className="text-indigo-700 font-bold">{lead.trackerFreq || 0}</span></div>
                  <div className="col-span-2"><span className="text-gray-400">Call Remarks:</span> <span className="text-gray-700">{lead.trackerRemarks || '-'}</span></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===================== TAB 4: ENQUIRY RECEIVED ===================== */}
      {/* ===================== TAB: HISTORY (merged Enquiry Received + Enquiry Not Received) ===================== */}
      {activeTab === "history" && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-card rounded-2xl shadow-md border border-slate-200/70 overflow-hidden">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full py-16">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mb-4"></div>
                    <p className="text-gray-600">Loading data...</p>
                  </div>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Action</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Lead No.</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Company</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Location</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Product</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Customer Name</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Contact No.</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Email</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Update Remarks</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Last Date Of Call</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Call Status</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Next Action</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Cust. Remarks</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Next Call</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-card">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan="15" className="px-4 py-20 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                              <svg className="h-6 w-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <p className="text-base font-semibold text-gray-500">No resolved leads yet</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedLeads.map((lead, index) => {
                        const isReceived = String(lead.trackerEnquiry || "").trim() === "Yes"
                        return (
                          <tr key={lead.leadNumber || index} className="hover:bg-slate-50/60 transition-colors duration-150">
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <button
                                onClick={() => handleCallTrackerClick(lead)}
                                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <PhoneCallIcon className="h-3 w-3" />
                                Call
                              </button>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-sm font-semibold">
                                {lead.leadNumber || '-'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900 max-w-[180px] truncate" title={lead.companyName}>{lead.companyName || '-'}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-[120px] truncate" title={lead.location}>{lead.location || '-'}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-[140px] truncate" title={lead.productName}>{lead.productName || '-'}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-[140px] truncate" title={lead.customerName}>{lead.customerName || '-'}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{lead.contactNo || '-'}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-[160px] truncate" title={lead.emailId}>{lead.emailId || '-'}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate" title={lead.remarks}>{lead.remarks || '-'}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 font-medium">{lead.trackerLastCall || '-'}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm">
                              {lead.trackerStatus ? (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${lead.trackerStatus === 'Hot' ? 'bg-red-100 text-red-800' :
                                  lead.trackerStatus === 'Warm' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                  {lead.trackerStatus}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-[140px] truncate" title={lead.trackerNextAction}>{lead.trackerNextAction || '-'}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isReceived ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {isReceived ? 'Enquiry Received' : 'Enquiry Not Received'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate" title={lead.trackerRemarks}>{lead.trackerRemarks || '-'}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">{lead.trackerNextCall || '-'}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
            {filteredLeads.length > 0 && (
              <Pagination page={page} pageSize={PAGE_SIZE} totalItems={filteredLeads.length} onPageChange={setPage} />
            )}
          </div>

          {/* Mobile Card View - History */}
          <div className="md:hidden space-y-3">
            {paginatedLeads.map((lead, index) => {
              const isReceived = String(lead.trackerEnquiry || "").trim() === "Yes"
              return (
                <div key={lead.leadNumber || index} className="bg-card rounded-xl shadow-md border border-gray-100 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-sm font-semibold">{lead.leadNumber || '-'}</span>
                    <button
                      onClick={() => handleCallTrackerClick(lead)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <PhoneCallIcon className="h-3 w-3" />
                      Call
                    </button>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2 truncate" title={lead.companyName}>{lead.companyName}</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-gray-400">Product:</span> <span className="text-gray-700">{lead.productName || '-'}</span></div>
                    <div><span className="text-gray-400">Customer:</span> <span className="text-gray-700">{lead.customerName || '-'}</span></div>
                    <div><span className="text-gray-400">Contact:</span> <span className="text-gray-700">{lead.contactNo || '-'}</span></div>
                    <div><span className="text-gray-400">Email:</span> <span className="text-gray-700">{lead.emailId || '-'}</span></div>
                    <div className="col-span-2"><span className="text-gray-400">Update Remarks:</span> <span className="text-gray-700">{lead.remarks || '-'}</span></div>
                    <div><span className="text-gray-400">Last Call:</span> <span className="text-gray-700">{lead.trackerLastCall || '-'}</span></div>
                    <div><span className="text-gray-400">Call Status:</span> <span className="font-medium">{lead.trackerStatus || '-'}</span></div>
                    <div><span className="text-gray-400">Status:</span> <span className={`font-semibold ${isReceived ? 'text-green-700' : 'text-red-700'}`}>{isReceived ? 'Enquiry Received' : 'Enquiry Not Received'}</span></div>
                    <div><span className="text-gray-400">Next Action:</span> <span className="text-gray-700">{lead.trackerNextAction || '-'}</span></div>
                    <div><span className="text-gray-400">Next Call:</span> <span className="text-gray-700">{lead.trackerNextCall || '-'}</span></div>
                    <div className="col-span-2"><span className="text-gray-400">Call Remarks:</span> <span className="text-gray-700">{lead.trackerRemarks || '-'}</span></div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* New Lead Modal */}
      {
        isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm bg-black/40">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-transparent transition-opacity"
                onClick={() => setIsModalOpen(false)}
              />

              {/* Modal Panel */}
              <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-auto transform transition-all border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800">New Outgoing Lead</h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">Fill in the lead details below</p>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors"
                  >
                    <XIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Our Firm Name */}
                      <div className="space-y-1">
                        <label htmlFor="ourFirmName" className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">
                          Our Firm Name <span className="text-rose-500">*</span>
                        </label>
                        <select
                          id="ourFirmName"
                          value={formData.ourFirmName}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                          required
                        >
                          <option value="">Select firm name</option>
                          {firmDropdownOptions.map((firm, idx) => (
                            <option key={idx} value={firm}>{firm}</option>
                          ))}
                        </select>
                      </div>

                      {/* Lead Received From */}
                      <div className="space-y-1">
                        <label htmlFor="leadReceivedFrom" className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">
                          Lead Received From <span className="text-rose-500">*</span>
                        </label>
                        <select
                          id="leadReceivedFrom"
                          value={formData.leadReceivedFrom}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                          required
                        >
                          <option value="">Select lead source</option>
                          {leadReceivedFromDropdownOptions.map((source, idx) => (
                            <option key={idx} value={source}>{source}</option>
                          ))}
                        </select>
                      </div>

                      {/* Sales Person (Name Of The Sales Person) */}
                      <div className="space-y-1">
                        <label htmlFor="salesPerson" className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">
                          Name Of The Sales Person <span className="text-rose-500">*</span>
                        </label>
                        <select
                          id="salesPerson"
                          value={formData.salesPerson}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                          required
                        >
                          <option value="">Select sales person</option>
                          {salesPersonDropdownOptions.map((person, idx) => (
                            <option key={idx} value={person}>{person}</option>
                          ))}
                        </select>
                      </div>

                      {/* Company Name (Name Of The Company) */}
                      <div className="space-y-1">
                        <label htmlFor="companyName" className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">
                          Name Of The Company <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="companyName"
                          value={formData.companyName}
                          onChange={handleChange}
                          placeholder="Enter company name"
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                          required
                        />
                      </div>

                      {/* Department */}
                      <div className="space-y-1">
                        <label htmlFor="department" className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">
                          Department <span className="text-rose-500">*</span>
                        </label>
                        <select
                          id="department"
                          value={formData.department}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                          required
                        >
                          <option value="">Select department</option>
                          {departmentDropdownOptions.map((dept, idx) => (
                            <option key={idx} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>

                      {/* Location */}
                      <div className="space-y-1">
                        <label htmlFor="location" className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">
                          Location <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="location"
                          value={formData.location}
                          onChange={handleChange}
                          placeholder="Enter location"
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 text-sm font-bold text-white bg-sky-600 rounded-xl shadow-md hover:bg-sky-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition-all transform hover:-translate-y-0.5"
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
