"use client"

import { useState, useEffect, useContext } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { PlusIcon, SearchIcon, XIcon, RefreshCwIcon } from "../components/Icons"
import { AuthContext } from "../App"
import CallTrackerForm from "./Call-Tracker-Form"
import axios from "axios"
import { Download } from "lucide-react"
import Pagination from "../components/ui/Pagination"
import { exportToCsv } from "../utils/exportCsv"
import { getCurrentTimestamp, reformatIfDate } from "../utils/dateTime"

const PAGE_SIZE = 10

// All columns to display in "View" modal
const ALL_COLUMNS = [
  "Enquiry No.",
  "Product No.",
  "Firm Name",
  "Enquiry status",
  "Type Of Enquiry",
  "Location",
  "Name Of Sales Person",
  "Party Name",
  "Department",
  "Total Order Qty",
  "Expected",
  "When Required",
  "Area Of Application",
  "Upload File",
  "Contact Person Name",
  "Contact Person Mobile No.",
  "Email Id",
  "Lead Time For Convert In Order",
  "Did The Above Enquiry Come From Nbd Outgoing Sheet",
  "Offer No.",
  "Product Names",
  "Quetities",
  "Uom",
  "Proposal Amount 1",
  "Proposal Remarks 1",
  "Proposal Amount 2",
  "Proposal Remarks 2",
  "Proposal Amount 3",
  "Proposal Remarks 3",
  "G-mail",
]

// Helper to determine if an enquiry row originated from NBD Lead or was entered manually
const isFromNbdLead = (row) => {
  const fromNbd = String(
    row["Did The Above Enquiry Come From Nbd Outgoing Sheet"] ||
    row["Source"] ||
    row["Lead Source"] ||
    ""
  ).trim().toLowerCase()
  if (fromNbd === "yes" || fromNbd === "nbd lead" || fromNbd === "true") return true
  if (fromNbd === "no" || fromNbd === "manual" || fromNbd === "manually" || fromNbd === "false") return false

  const productNo = String(row["Product No."] || row["Product No"] || "").trim().toLowerCase()
  if (productNo.startsWith("ld-") || productNo.startsWith("lead-") || productNo.startsWith("ld/")) {
    return true
  }

  return false
}

// Key columns to show in the table (summary view)
const TABLE_COLUMNS = [
  "Enquiry No.",
  "Source",
  "Firm Name",
  "Enquiry status",
  "Name Of Sales Person",
  "Location",
  "Contact Person Mobile No.",
  "Expected Days",
  "Lead Time to Convert in Order",
]

// Extra columns shown on Call Tracker / Order Received / Order Not Received tabs
const CALL_TRACKER_COLUMNS = [
  "Current Stage",
  "Status",
  "Tracker Status",
  "Actual 1",
  "Freq",
]

// Header labels for columns whose sheet field name differs from its display name
const CALL_TRACKER_COLUMN_LABELS = {
  "Status": "Call Status",
  "Freq": "Freq",
}

function CallTracker() {
  const { showNotification } = useContext(AuthContext)
  const location = useLocation()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [presetLeadNo, setPresetLeadNo] = useState(null)
  const [page, setPage] = useState(1)

  // Enquiry data
  const [enquiryRows, setEnquiryRows] = useState([])

  // Active Tab — persisted in localStorage so page refreshes / remounts don't reset it
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem("ct_activeTab") || "all"
  )

  // View Modal
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewRow, setViewRow] = useState(null)

  // New Enquiry Modal
  const [showNewCallTrackerForm, setShowNewCallTrackerForm] = useState(false)

  // Call Tracker Modal (per row)
  const [showCallTrackerModal, setShowCallTrackerModal] = useState(false)
  const [callTrackerRow, setCallTrackerRow] = useState(null)
  const [callTrackerForm, setCallTrackerForm] = useState({
    currentStage: "",
    customerSay: "",
    orderReceived: "",
    status: "",
    nextCallDate: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [updatingStage, setUpdatingStage] = useState({}) // tracks rows being saved inline
  const [trackerDetails, setTrackerDetails] = useState(null) // for display in View Modal

  // Order Cancel Modal
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelModalForm, setCancelModalForm] = useState({ personName: "", orderNo: "", fmsName: "", cancelQty: "" })

  // Master sheet dropdowns
  const [masterStageOptions, setMasterStageOptions] = useState([])
  const [masterStatusOptions, setMasterStatusOptions] = useState([])

  // Persist activeTab so it survives refreshes and component remounts
  useEffect(() => {
    localStorage.setItem("ct_activeTab", activeTab)
  }, [activeTab])

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchNBDEnquiryData()
    fetchMasterDropdowns()
  }, [])

  // ── Fetch Master Sheet (Col G = Status, Col I = Stage) ───────────────────
  const fetchMasterDropdowns = async () => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
    const masterSheet = import.meta.env.VITE_MASTER_SHEET_NAME
    if (!scriptUrl || !masterSheet) return

    // Google's large-response redirect (script.googleusercontent.com/macros/echo)
    // intermittently 404s — retry a couple of times before giving up.
    const maxAttempts = 3
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios.get(`${scriptUrl}?sheet=${masterSheet}&t=${Date.now()}`)
        if (!response.data || !response.data.success) return
        const rows = response.data.data || []
        // Data starts from row 2 (index 1)
        const dataRows = rows.slice(1)
        const getUnique = (colIdx) =>
          [...new Set(dataRows.map(r => String(r[colIdx] || "").trim()).filter(Boolean))]
        setMasterStatusOptions(getUnique(6))  // Col G = index 6
        setMasterStageOptions(getUnique(8))   // Col I = index 8
        return
      } catch (error) {
        if (attempt === maxAttempts) {
          console.error("Error fetching master sheet:", error)
        } else {
          await new Promise(resolve => setTimeout(resolve, 700 * attempt))
        }
      }
    }
  }

  const fetchNBDEnquiryData = async () => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
    const sheetName = import.meta.env.VITE_NBD_ENQUIRY_SHEET_NAME
    const fmsSheetName = import.meta.env.VITE_FMS_SHEET_NAME || "FMS"

    if (!scriptUrl || !sheetName) {
      showNotification("NBD Enquiry sheet config missing in .env", "error")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const maxAttempts = 4
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const [response, fmsRes] = await Promise.all([
          axios.get(`${scriptUrl}?sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`),
          fmsSheetName ? axios.get(`${scriptUrl}?sheet=${encodeURIComponent(fmsSheetName)}&t=${Date.now()}`).catch(() => null) : Promise.resolve(null)
        ])

        if (!response.data || !response.data.success) throw new Error("Failed to fetch sheet data")

        const allRows = response.data.data || []

        // Find header row — scan first 10 rows for a cell matching "Enquiry No."
        let headerRowIndex = 4 // default row 5 = index 4
        for (let i = 0; i < Math.min(allRows.length, 10); i++) {
          const row = (allRows[i] || []).map(c => String(c || "").trim())
          if (row.some(cell => cell.toLowerCase().replace(/\.$/, "") === "enquiry no")) {
            headerRowIndex = i
            break
          }
        }

        const headerRow = (allRows[headerRowIndex] || []).map(c => String(c || "").trim())

        // Data rows start after header
        const dataRows = allRows.slice(headerRowIndex + 1)

        const mappedRows = dataRows
          .map((row, rowOffset) => {
            if (row.every(cell => !cell)) return null
            const obj = {
              _sheetRowIdx: headerRowIndex + 1 + rowOffset  // 0-based index in raw sheet array
            }
            headerRow.forEach((h, idx) => {
              if (h) {
                let val = reformatIfDate(String(row[idx] || "").trim())
                obj[h] = val
                if (/^(freq|frequency|no\.?\s*of\s*calls)/i.test(h)) {
                  obj["Freq"] = val
                }
                if (/^expected(\s*days)?$/i.test(h.trim())) {
                  obj["Expected Days"] = val
                  obj["Expected"] = val
                }
                if (/^lead\s*time/i.test(h.trim())) {
                  obj["Lead Time to Convert in Order"] = val
                  obj["Lead Time For Convert In Order"] = val
                }
                if (/^(did the above enquiry come from nbd outgoing sheet|source|lead source)/i.test(h.trim())) {
                  obj["Did The Above Enquiry Come From Nbd Outgoing Sheet"] = val
                  obj["Source"] = val
                }
              }
            })
            return obj
          })
          .filter(Boolean)

        // Merge Leads from FMS Sheet that have Enquiry Received = Yes or Next Action = Enquiry Received
        if (fmsRes?.data?.success && Array.isArray(fmsRes.data.data)) {
          const fmsAllRows = fmsRes.data.data
          const existingEnqNos = new Set(
            mappedRows.map(r => String(r["Product No."] || r["Product No"] || r["Enquiry No."] || r["Enquiry No"] || "").trim().toLowerCase())
          )

          fmsAllRows.slice(6).forEach((fmsRow, idx) => {
            if (!fmsRow || !fmsRow[0]) return

            const leadNo = String(fmsRow[1] || "").trim()
            if (!leadNo) return

            // Note: Work Type / Project Size were added as new columns I/J on the FMS
            // sheet, which shifted every column from Planned 1 onward right by 2 —
            // these indices reflect the current real positions.
            const nextAction = String(fmsRow[18] || "").trim()
            const enquiryReceived = String(fmsRow[20] || "").trim()

            const isEnquiry = enquiryReceived.toLowerCase() === "yes" || nextAction.toLowerCase().includes("enquiry received")

            if (isEnquiry && !existingEnqNos.has(leadNo.toLowerCase())) {
              existingEnqNos.add(leadNo.toLowerCase())
              mappedRows.push({
                _sheetRowIdx: -(idx + 1),
                _fromFmsLead: true,
                _fmsRowIdx: 6 + idx + 1,
                "Enquiry No.": leadNo,
                "Product No.": leadNo,
                "Product No": leadNo,
                "Source": "NBD Lead",
                "Did The Above Enquiry Come From Nbd Outgoing Sheet": "Yes",
                "Firm Name": String(fmsRow[2] || "").trim(),
                "Lead Received From": String(fmsRow[3] || "").trim(),
                "Name Of Sales Person": String(fmsRow[4] || "").trim(),
                "Party Name": String(fmsRow[5] || "").trim(),
                "Department": String(fmsRow[6] || "").trim(),
                "Location": String(fmsRow[7] || "").trim(),
                "Product Names": String(fmsRow[13] || "").trim(),
                "Customer Name": String(fmsRow[14] || "").trim(),
                "Contact Person Name": String(fmsRow[14] || "").trim(),
                "Contact Person Mobile No.": String(fmsRow[15] || "").trim(),
                "Email Id": String(fmsRow[16] || "").trim(),
                "Remarks": String(fmsRow[17] || "").trim(),
                "Enquiry status": "Active",
                "Status": String(fmsRow[19] || "").trim(),
                "Current Stage": "Enquiry",
                "Tracker Status": "",
                "Actual 1": "",
                "Freq": String(fmsRow[23] || "0").trim()
              })
            }
          })
        }

        // Sort latest Enquiry No. first (EN-10 before EN-1, LEAD-10 before LEAD-1)
        mappedRows.sort((a, b) => {
          const aNo = parseEnquiryNo(a["Enquiry No."] || a["Enquiry No"] || "")
          const bNo = parseEnquiryNo(b["Enquiry No."] || b["Enquiry No"] || "")
          return bNo - aNo
        })

        setEnquiryRows(mappedRows)
        setIsLoading(false)
        return
      } catch (error) {
        if (attempt === maxAttempts) {
          console.error("Error fetching NBD Enquiry data:", error)
          showNotification("Failed to fetch enquiry data: " + error.message, "error")
          setIsLoading(false)
        } else {
          await new Promise(resolve => setTimeout(resolve, 800 * attempt))
        }
      }
    }
  }

  // Parse Enquiry No like "EN-5" → 5
  const parseEnquiryNo = (val) => {
    if (!val) return 0
    const match = String(val).match(/\d+/)
    return match ? parseInt(match[0]) : 0
  }

  // ── Filter by tab + search ─────────────────────────────────────────────────
  const filteredRows = enquiryRows.filter((row) => {
    const trackerStatus = String(row["Tracker Status"] || "").trim()
    // Tab-level filter
    if (activeTab === "all") {
      // Exclude Order Received ("Yes") and Order Not Received ("Tracker No" / "No") from All Enquiry
      if (trackerStatus === "Yes" || trackerStatus === "Tracker No" || trackerStatus === "No") return false
    } else if (activeTab === "callTracker") {
      // Pending only: exclude rows that are already actioned (Yes, No, or Tracker No)
      if (trackerStatus === "Yes" || trackerStatus === "Tracker No" || trackerStatus === "No") return false
    } else if (activeTab === "orderReceived") {
      if (trackerStatus !== "Yes") return false
    } else if (activeTab === "orderNotReceived") {
      if (trackerStatus !== "Tracker No" && trackerStatus !== "No") return false
    }
    // Search filter
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return Object.values(row).some(v => v && v.toString().toLowerCase().includes(term))
  })

  // Reset to page 1 whenever the active tab or search term changes
  useEffect(() => {
    setPage(1)
  }, [activeTab, searchTerm])

  const paginatedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleExportRows = () => {
    exportToCsv(`nbd-enquiry-${activeTab}`, [
      { label: "Enquiry No.", value: (r) => r["Enquiry No."] || "" },
      { label: "Firm Name", value: (r) => r["Firm Name"] || "" },
      { label: "Party Name", value: (r) => r["Party Name"] || "" },
      { label: "Name Of Sales Person", value: (r) => r["Name Of Sales Person"] || "" },
      { label: "Location", value: (r) => r["Location"] || "" },
      { label: "Current Stage", value: (r) => r["Current Stage"] || "" },
    ], filteredRows)
  }

  // ── Open Call Tracker Modal ───────────────────────────────────────────────
  const handleOpenCallTracker = async (row) => {
    setCallTrackerRow(row)

    // Start with FMS row data for fields stored there
    const prefilled = {
      currentStage: row["Current Stage"] || "",
      orderReceived: row["Tracker Status"] || "",
      status: "",
      customerSay: "",
      nextCallDate: "",
    }

    // Open modal IMMEDIATELY for zero-delay user feedback
    setCallTrackerForm(prefilled)
    setShowCallTrackerModal(true)

    // Fetch Status & What Did The Customer Say asynchronously from NBD CALL TRACKER sheet
    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
      const trackerSheet = import.meta.env.VITE_NBD_CALL_TRACKER_SHEET_NAME
      const enquiryNo = row["Enquiry No."] || row["Enquiry No"] || ""

      if (scriptUrl && trackerSheet && enquiryNo) {
        const res = await axios.get(`${scriptUrl}?sheet=${encodeURIComponent(trackerSheet)}&t=${Date.now()}`)
        if (res.data?.success) {
          const data = res.data.data || []

          // Headers are in row 2 → index 1
          const headers = (data[1] || []).map(h => String(h || "").trim())
          const findH = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase())

          const enqColIdx = findH("Enquiry No.")
          const statusColIdx = findH("Status")
          const customerSayColIdx = findH("What Did the Customer say")
          const nextDateColIdx = findH("Next Date of Call")

          // Walk from the bottom — find the most recent entry for this enquiry
          for (let i = data.length - 1; i >= 2; i--) {
            const r = data[i]
            if (enqColIdx !== -1 && String(r[enqColIdx] || "").trim() === enquiryNo) {
              setCallTrackerForm(prev => {
                const updated = { ...prev }
                if (statusColIdx !== -1) updated.status = String(r[statusColIdx] || "")
                if (customerSayColIdx !== -1) updated.customerSay = String(r[customerSayColIdx] || "")
                if (nextDateColIdx !== -1) {
                  // Sheet stores DD/MM/YYYY — convert to YYYY-MM-DD for HTML date input
                  const raw = String(r[nextDateColIdx] || "").trim()
                  if (raw) {
                    const [dd, mm, yyyy] = raw.split("/")
                    if (dd && mm && yyyy) updated.nextCallDate = `${yyyy}-${mm}-${dd}`
                  }
                }
                return updated
              })
              break
            }
          }
        }
      }
    } catch (err) {
      console.warn("Could not pre-fill from CALL TRACKER sheet:", err)
    }
  }

  // ── Open View Modal with Tracker Data ──────────────────────────────────────
  const handleOpenViewModal = async (row) => {
    setViewRow(row)
    setShowViewModal(true)
    setTrackerDetails(null) // Start fresh

    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
      const trackerSheet = import.meta.env.VITE_NBD_CALL_TRACKER_SHEET_NAME
      const enquiryNo = row["Enquiry No."] || row["Enquiry No"] || ""

      if (scriptUrl && trackerSheet && enquiryNo) {
        const res = await axios.get(`${scriptUrl}?sheet=${trackerSheet}&t=${Date.now()}`)
        if (res.data?.success) {
          const data = res.data.data || []
          const headers = (data[1] || []).map(h => String(h || "").trim())
          const findH = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase())

          const enqColIdx = findH("Enquiry No.")
          const statusColIdx = findH("Status")
          const stageColIdx = findH("Current Stage")
          const lastDateColIdx = findH("Last Date Of Call")
          const customerSayColIdx = findH("What Did the Customer say")
          const noOfCallsColIdx = findH("No. Of Calls Made")
          const freqColIdx = findH("Freq") !== -1 ? findH("Freq") : findH("Frequency") !== -1 ? findH("Frequency") : noOfCallsColIdx
          const orderRecivedColIdx = findH("Order Recived")

          let callCount = 0
          let latestEntry = null

          // Count and find latest
          for (let i = 2; i < data.length; i++) {
            const r = data[i]
            if (enqColIdx !== -1 && String(r[enqColIdx] || "").trim() === enquiryNo) {
              callCount++
              latestEntry = r
            }
          }

          if (latestEntry) {
            setTrackerDetails({
              status: statusColIdx !== -1 ? String(latestEntry[statusColIdx] || "") : "",
              currentStage: stageColIdx !== -1 ? String(latestEntry[stageColIdx] || "") : "",
              lastDateOfCall: lastDateColIdx !== -1 ? String(latestEntry[lastDateColIdx] || "") : "",
              customerSay: customerSayColIdx !== -1 ? String(latestEntry[customerSayColIdx] || "") : "",
              nextDateOfCall: nextDateColIdx !== -1 ? String(latestEntry[nextDateColIdx] || "") : "",
              freq: freqColIdx !== -1 ? String(latestEntry[freqColIdx] || "") : callCount,
              noOfCallsMade: noOfCallsColIdx !== -1 ? String(latestEntry[noOfCallsColIdx] || "") : callCount,
              orderRecived: orderRecivedColIdx !== -1 ? String(latestEntry[orderRecivedColIdx] || "") : "",
            })
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch tracker details for view:", err)
    }
  }

  // ── Inline Current Stage update (header-name driven, matches row by Enquiry No.) ──
  const handleInlineStageUpdate = async (row, newStage) => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
    const fmsSheetName = import.meta.env.VITE_NBD_ENQUIRY_SHEET_NAME
    const trackerSheetName = import.meta.env.VITE_NBD_CALL_TRACKER_SHEET_NAME
    const sheetRowIdx = row._sheetRowIdx
    if (!scriptUrl || !fmsSheetName || sheetRowIdx === undefined) return

    const enquiryNo = row["Enquiry No."] || row["Enquiry No"] || ""

    // Optimistic local update
    setEnquiryRows(prev =>
      prev.map(r => r._sheetRowIdx === sheetRowIdx ? { ...r, "Current Stage": newStage } : r)
    )
    setUpdatingStage(prev => ({ ...prev, [sheetRowIdx]: true }))

    try {
      // ── A. Update NBD ENQUIRY FMS sheet (partial row — avoids touching date columns) ──
      const fmsResponse = await axios.get(`${scriptUrl}?sheet=${fmsSheetName}&t=${Date.now()}`)
      if (!fmsResponse.data?.success) throw new Error("Failed to fetch FMS sheet")
      const fmsData = fmsResponse.data.data || []

      // Dynamically find the header row
      let fmsHeaderIdx = 4
      for (let i = 0; i < Math.min(fmsData.length, 10); i++) {
        const r = (fmsData[i] || []).map(c => String(c || "").trim())
        if (r.some(cell => cell.toLowerCase().replace(/\.$/, "") === "enquiry no")) {
          fmsHeaderIdx = i; break
        }
      }
      const fmsHeaders = (fmsData[fmsHeaderIdx] || []).map(c => String(c || "").trim())
      const findFmsCol = (name) => fmsHeaders.findIndex(h => h.toLowerCase() === name.toLowerCase())

      const fmsCurrentStageCol = findFmsCol("Current Stage")
      if (fmsCurrentStageCol === -1) throw new Error('"Current Stage" column not found in FMS')
      const fmsEnqNoCol = findFmsCol("Enquiry No.")

      // Match exact row by Enquiry No.
      let fmsTargetIdx = sheetRowIdx
      if (fmsEnqNoCol !== -1 && enquiryNo) {
        for (let i = fmsHeaderIdx + 1; i < fmsData.length; i++) {
          if (String(fmsData[i][fmsEnqNoCol] || "").trim() === enquiryNo) {
            fmsTargetIdx = i; break
          }
        }
      }

      // Full row: normalize existing cells so ISO date strings survive the round-trip
      const existingFmsRow = (fmsData[fmsTargetIdx] || []).map(reformatIfDate)
      while (existingFmsRow.length <= fmsCurrentStageCol) existingFmsRow.push("")
      existingFmsRow[fmsCurrentStageCol] = newStage

      const fmsPayload = new URLSearchParams()
      fmsPayload.append("action", "update")
      fmsPayload.append("sheetName", fmsSheetName)
      fmsPayload.append("rowIndex", (fmsTargetIdx + 1).toString())
      fmsPayload.append("rowData", JSON.stringify(existingFmsRow))
      await axios.post(scriptUrl, fmsPayload)

      // ── B. Update NBD CALL TRACKER sheet ────────────────────────────────────
      if (trackerSheetName && enquiryNo) {
        const trackerResponse = await axios.get(`${scriptUrl}?sheet=${trackerSheetName}&t=${Date.now()}`)
        if (trackerResponse.data?.success) {
          const trackerData = trackerResponse.data.data || []

          // Headers are in row 2 → index 1
          const trackerHeaders = (trackerData[1] || []).map(h => String(h || "").trim())
          const findTrackerCol = (name) => trackerHeaders.findIndex(h => h.toLowerCase() === name.toLowerCase())

          const tkEnqNoCol = findTrackerCol("Enquiry No.")
          const tkCurrentStageCol = findTrackerCol("Current Stage")

          if (tkCurrentStageCol !== -1 && tkEnqNoCol !== -1) {
            // Find the LAST matching row (most recent call entry for this enquiry)
            let tkTargetIdx = -1
            for (let i = trackerData.length - 1; i >= 2; i--) {
              if (String(trackerData[i][tkEnqNoCol] || "").trim() === enquiryNo) {
                tkTargetIdx = i; break
              }
            }

            if (tkTargetIdx !== -1) {
              const tkRow = [...(trackerData[tkTargetIdx] || [])]
              while (tkRow.length <= tkCurrentStageCol) tkRow.push("")
              tkRow[tkCurrentStageCol] = newStage

              const tkPayload = new URLSearchParams()
              tkPayload.append("action", "update")
              tkPayload.append("sheetName", trackerSheetName)
              tkPayload.append("rowIndex", (tkTargetIdx + 1).toString())
              tkPayload.append("rowData", JSON.stringify(tkRow))
              await axios.post(scriptUrl, tkPayload)
            }
          }
        }
      }

      showNotification("Current Stage updated in both sheets", "success")
    } catch (err) {
      console.error("Inline stage update error:", err)
      showNotification("Failed to update stage: " + err.message, "error")
      // Revert optimistic update
      setEnquiryRows(prev =>
        prev.map(r => r._sheetRowIdx === sheetRowIdx ? { ...r, "Current Stage": row["Current Stage"] || "" } : r)
      )
    } finally {
      setUpdatingStage(prev => ({ ...prev, [sheetRowIdx]: false }))
    }
  }

  // ── Submit Call Tracker Form ──────────────────────────────────────────────
  const handleCallTrackerSubmit = async (e) => {
    e.preventDefault()
    if (!callTrackerRow) return

    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
    const fmsSheetName = import.meta.env.VITE_NBD_ENQUIRY_SHEET_NAME
    const trackerSheetName = import.meta.env.VITE_NBD_CALL_TRACKER_SHEET_NAME

    if (!scriptUrl || !fmsSheetName || !trackerSheetName) {
      showNotification("Sheet configuration missing in .env", "error")
      return
    }

    const enquiryNo = callTrackerRow["Enquiry No."] || callTrackerRow["Enquiry No"] || ""

    if (callTrackerForm.orderReceived === "Pending") {
      if (!callTrackerForm.nextCallDate || String(callTrackerForm.nextCallDate).trim() === "") {
        showNotification("Next Date of Call is mandatory", "error")
        return
      }
      const now = new Date()
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      const today = `${y}-${m}-${d}`
      if (callTrackerForm.nextCallDate < today) {
        showNotification("Next Date of Call cannot be a back date", "error")
        return
      }
    }

    setIsSubmitting(true)
    try {
      // ── Step 1: Update latest matching row in NBD CALL TRACKER (by Enquiry No.) ──
      const trackerSheetRes = await axios.get(`${scriptUrl}?sheet=${encodeURIComponent(trackerSheetName)}&t=${Date.now()}`)
      const trackerData = trackerSheetRes.data?.data || []

      // Headers are in row 2 (index 1)
      const trackerHeaders = (trackerData[1] || []).map(h => String(h || "").trim())
      const findTrackerCol = (name) =>
        trackerHeaders.findIndex(h => h.toLowerCase() === name.toLowerCase())

      const tkEnqNoCol = findTrackerCol("Enquiry No.")
      const tkStatusCol = findTrackerCol("Status")
      const tkStageCol = findTrackerCol("Current Stage")
      const tkCustomerSayCol = findTrackerCol("What Did the Customer say")
      const tkOrderCol = findTrackerCol("Order Recived") || findTrackerCol("Order Received")
      const tkNextDateCol = findTrackerCol("Next Date of Call")
      const tkLastDateCol = findTrackerCol("Last Date Of Call")
      const tkNoOfCallsCol = findTrackerCol("No. Of Calls Made")
      let tkFreqCol = findTrackerCol("Freq")
      if (tkFreqCol === -1) tkFreqCol = findTrackerCol("Frequency")
      if (tkFreqCol === -1) tkFreqCol = trackerHeaders.findIndex(h => /^(freq|frequency)/i.test(h) || /freq/i.test(h))
      if (tkFreqCol === -1) {
        for (let r = 0; r < Math.min(trackerData.length, 4); r++) {
          const rowCandidate = (trackerData[r] || []).map(c => String(c || "").trim())
          const idx = rowCandidate.findIndex(h => h.toLowerCase() === "freq" || /^(freq|frequency)/i.test(h) || /freq/i.test(h))
          if (idx !== -1) {
            tkFreqCol = idx
            break
          }
        }
      }
      if (tkFreqCol === -1) tkFreqCol = tkNoOfCallsCol

      // Convert Next Date of Call from YYYY-MM-DD (HTML input) to DD/MM/YYYY (Indian format)
      const nextDateFormatted = (() => {
        if (!callTrackerForm.nextCallDate) return ""
        const [yr, mo, dy] = callTrackerForm.nextCallDate.split("-")
        return `${dy}/${mo}/${yr}`
      })()

      // Find the LATEST (bottom-most) row matching this Enquiry No.
      let tkTargetIdx = -1
      if (tkEnqNoCol !== -1 && enquiryNo) {
        for (let i = trackerData.length - 1; i >= 2; i--) {
          if (String(trackerData[i]?.[tkEnqNoCol] || "").trim() === enquiryNo) {
            tkTargetIdx = i; break
          }
        }
      }

      if (tkTargetIdx !== -1) {
        // UPDATE the existing latest row
        const existingTrackerRow = [...(trackerData[tkTargetIdx] || [])]
        if (tkStatusCol !== -1) existingTrackerRow[tkStatusCol] = callTrackerForm.status
        if (tkStageCol !== -1) existingTrackerRow[tkStageCol] = callTrackerForm.currentStage
        if (tkCustomerSayCol !== -1) existingTrackerRow[tkCustomerSayCol] = callTrackerForm.customerSay
        if (tkOrderCol !== -1) existingTrackerRow[tkOrderCol] = callTrackerForm.orderReceived
        if (tkNextDateCol !== -1) {
          existingTrackerRow[tkNextDateCol] = (callTrackerForm.orderReceived === "Pending" && nextDateFormatted)
            ? nextDateFormatted
            : ""
        }

        // New fields
        const nowISTStr = getCurrentTimestamp()
        if (tkLastDateCol !== -1) existingTrackerRow[tkLastDateCol] = nowISTStr

        if (tkFreqCol !== -1) {
          const prevFreq = parseInt(existingTrackerRow[tkFreqCol] || 0, 10) || 0
          existingTrackerRow[tkFreqCol] = (callTrackerForm.orderReceived === "Pending" && callTrackerForm.nextCallDate) ? prevFreq + 1 : prevFreq
        } else if (tkNoOfCallsCol !== -1) {
          let count = 0
          for (let i = 2; i < trackerData.length; i++) {
            if (String(trackerData[i]?.[tkEnqNoCol] || "").trim() === enquiryNo) count++
          }
          existingTrackerRow[tkNoOfCallsCol] = count
        }

        const trackerPayload = new URLSearchParams()
        trackerPayload.append("action", "update")
        trackerPayload.append("sheetName", trackerSheetName)
        trackerPayload.append("rowIndex", (tkTargetIdx + 1).toString()) // 1-based
        trackerPayload.append("rowData", JSON.stringify(existingTrackerRow))
        await axios.post(scriptUrl, trackerPayload)

      } else {
        // INSERT new row if no existing entry found for this Enquiry No.
        const maxCol = Math.max(17,
          tkEnqNoCol, tkStatusCol, tkStageCol,
          tkCustomerSayCol, tkOrderCol, tkNextDateCol, tkFreqCol
        )
        const newRow = new Array(maxCol + 1).fill("")
        if (tkEnqNoCol !== -1) newRow[tkEnqNoCol] = enquiryNo
        if (tkStatusCol !== -1) newRow[tkStatusCol] = callTrackerForm.status
        if (tkStageCol !== -1) newRow[tkStageCol] = callTrackerForm.currentStage
        if (tkCustomerSayCol !== -1) newRow[tkCustomerSayCol] = callTrackerForm.customerSay
        if (tkOrderCol !== -1) newRow[tkOrderCol] = callTrackerForm.orderReceived
        if (tkNextDateCol !== -1 && callTrackerForm.orderReceived === "Pending" && nextDateFormatted) {
          newRow[tkNextDateCol] = nextDateFormatted
        }

        // New fields
        const nowISTStr = getCurrentTimestamp()
        if (tkLastDateCol !== -1) newRow[tkLastDateCol] = nowISTStr
        if (tkFreqCol !== -1) {
          newRow[tkFreqCol] = (callTrackerForm.orderReceived === "Pending" && callTrackerForm.nextCallDate) ? 1 : 0
        } else if (tkNoOfCallsCol !== -1) {
          newRow[tkNoOfCallsCol] = 1
        }

        const trackerPayload = new URLSearchParams()
        trackerPayload.append("action", "insert")
        trackerPayload.append("sheetName", trackerSheetName)
        trackerPayload.append("rowData", JSON.stringify(newRow))
        await axios.post(scriptUrl, trackerPayload)
      }

      // ── Step 2: Update specific tracker columns in NBD ENQUIRY FMS (partial row, no date corruption) ──
      const fmsResponse = await axios.get(`${scriptUrl}?sheet=${encodeURIComponent(fmsSheetName)}&t=${Date.now()}`)
      if (!fmsResponse.data?.success) throw new Error("Failed to fetch NBD ENQUIRY FMS")
      const fmsData = fmsResponse.data.data || []

      // Dynamically find header row
      let fmsHeaderIdx = 4
      for (let i = 0; i < Math.min(fmsData.length, 10); i++) {
        const r = (fmsData[i] || []).map(c => String(c || "").trim())
        if (r.some(cell => cell.toLowerCase().replace(/\.$/, "") === "enquiry no")) {
          fmsHeaderIdx = i; break
        }
      }
      const fmsHeaders = (fmsData[fmsHeaderIdx] || []).map(c => String(c || "").trim())
      const findFmsCol = (name) => fmsHeaders.findIndex(h => h.toLowerCase() === name.toLowerCase() || h.toLowerCase().replace(/\.$/, "") === name.toLowerCase())

      const fmsEnqNoCol = findFmsCol("Enquiry No.") !== -1 ? findFmsCol("Enquiry No.") : findFmsCol("Enquiry No")
      const fmsCurrentStageCol = findFmsCol("Current Stage")
      const fmsTrackerStatusCol = findFmsCol("Tracker Status")
      const fmsActual1Col = findFmsCol("Actual 1")
      const fmsStatusCol = findFmsCol("Status")
      const fmsWhatCustomerSayCol = findFmsCol("What Did The Customer Say")
      let fmsFreqCol = findFmsCol("Freq")
      if (fmsFreqCol === -1) fmsFreqCol = findFmsCol("Frequency")
      if (fmsFreqCol === -1) fmsFreqCol = fmsHeaders.findIndex(h => /^(freq|frequency|no\.?\s*of\s*calls)/i.test(h) || /freq/i.test(h))
      if (fmsFreqCol === -1) {
        for (let r = 0; r < Math.min(fmsData.length, 7); r++) {
          const rowCandidate = (fmsData[r] || []).map(c => String(c || "").trim())
          const idx = rowCandidate.findIndex(h => h.toLowerCase() === "freq" || /^(freq|frequency)/i.test(h) || /freq/i.test(h))
          if (idx !== -1) {
            fmsFreqCol = idx
            break
          }
        }
      }

      // Match row by Enquiry No. (more reliable than _sheetRowIdx after sorts/inserts)
      const sheetRowIdx = callTrackerRow._sheetRowIdx
      let fmsTargetIdx = sheetRowIdx
      if (fmsEnqNoCol !== -1 && enquiryNo) {
        for (let i = fmsHeaderIdx + 1; i < fmsData.length; i++) {
          if (String(fmsData[i][fmsEnqNoCol] || "").trim() === enquiryNo) {
            fmsTargetIdx = i; break
          }
        }
      }

      const formattedTs = getCurrentTimestamp()

      if (fmsTargetIdx !== -1 && fmsTargetIdx < fmsData.length && fmsData[fmsTargetIdx]) {
        // Full row: normalize existing cells so ISO date strings survive the round-trip
        const existingFmsRow = (fmsData[fmsTargetIdx] || []).map(reformatIfDate)
        const maxFmsCol = Math.max(
          fmsCurrentStageCol, fmsTrackerStatusCol, fmsActual1Col, fmsStatusCol, fmsWhatCustomerSayCol, fmsFreqCol
        )
        while (existingFmsRow.length <= maxFmsCol) existingFmsRow.push("")

        if (fmsCurrentStageCol !== -1) existingFmsRow[fmsCurrentStageCol] = callTrackerForm.currentStage
        if (fmsTrackerStatusCol !== -1) existingFmsRow[fmsTrackerStatusCol] = callTrackerForm.orderReceived
        if (fmsActual1Col !== -1) existingFmsRow[fmsActual1Col] = formattedTs
        if (fmsStatusCol !== -1) existingFmsRow[fmsStatusCol] = callTrackerForm.status
        if (fmsWhatCustomerSayCol !== -1) existingFmsRow[fmsWhatCustomerSayCol] = callTrackerForm.customerSay
        if (fmsFreqCol !== -1 && callTrackerForm.nextCallDate) {
          const prevFmsFreq = parseInt(existingFmsRow[fmsFreqCol] || 0, 10) || 0
          existingFmsRow[fmsFreqCol] = prevFmsFreq + 1
        }

        const fmsPayload = new URLSearchParams()
        fmsPayload.append("action", "update")
        fmsPayload.append("sheetName", fmsSheetName)
        fmsPayload.append("rowIndex", (fmsTargetIdx + 1).toString())
        fmsPayload.append("rowData", JSON.stringify(existingFmsRow))
        await axios.post(scriptUrl, fmsPayload)
      } else {
        // Insert new row in NBD ENQUIRY FMS for this FMS Lead
        const newFmsRow = new Array(Math.max(fmsHeaders.length, 25)).fill("")
        fmsHeaders.forEach((h, colIdx) => {
          const cleanH = h.toLowerCase().replace(/\.$/, "")
          if (cleanH === "enquiry no") newFmsRow[colIdx] = enquiryNo
          else if (cleanH === "product no") newFmsRow[colIdx] = callTrackerRow["Product No."] || enquiryNo
          else if (cleanH === "firm name") newFmsRow[colIdx] = callTrackerRow["Firm Name"] || ""
          else if (cleanH === "party name") newFmsRow[colIdx] = callTrackerRow["Party Name"] || ""
          else if (cleanH === "name of sales person" || cleanH === "sales person") newFmsRow[colIdx] = callTrackerRow["Name Of Sales Person"] || ""
          else if (cleanH === "location") newFmsRow[colIdx] = callTrackerRow["Location"] || ""
          else if (cleanH === "department") newFmsRow[colIdx] = callTrackerRow["Department"] || ""
          else if (cleanH === "product names" || cleanH === "product name") newFmsRow[colIdx] = callTrackerRow["Product Names"] || ""
          else if (cleanH === "contact person mobile no" || cleanH === "contact person mobile no.") newFmsRow[colIdx] = callTrackerRow["Contact Person Mobile No."] || ""
          else if (cleanH === "email id") newFmsRow[colIdx] = callTrackerRow["Email Id"] || ""
          else if (cleanH === "current stage") newFmsRow[colIdx] = callTrackerForm.currentStage
          else if (cleanH === "tracker status") newFmsRow[colIdx] = callTrackerForm.orderReceived
          else if (cleanH === "actual 1") newFmsRow[colIdx] = formattedTs
          else if (cleanH === "status") newFmsRow[colIdx] = callTrackerForm.status
          else if (cleanH === "what did the customer say") newFmsRow[colIdx] = callTrackerForm.customerSay
          else if (cleanH === "source" || cleanH === "did the above enquiry come from nbd outgoing sheet") newFmsRow[colIdx] = "Yes"
        })

        const fmsPayload = new URLSearchParams()
        fmsPayload.append("action", "insert")
        fmsPayload.append("sheetName", fmsSheetName)
        fmsPayload.append("rowData", JSON.stringify(newFmsRow))
        await axios.post(scriptUrl, fmsPayload)
      }

      // ── Step 3: Insert into NBD OFFER FMS if Tracker Status is "Yes", or if the
      // Current Stage is set to "Make Offer" / "Make Re - Offer" ──
      const offerSheetName = import.meta.env.VITE_NBD_OFFER_FMS_SHEET_NAME
      const isOfferStage = callTrackerForm.currentStage === "Make Offer" || callTrackerForm.currentStage === "Make Re - Offer"
      let offerHandoffFailed = false
      if ((callTrackerForm.orderReceived === "Yes" || isOfferStage) && offerSheetName) {
        try {
          const offerResponse = await axios.get(`${scriptUrl}?sheet=${encodeURIComponent(offerSheetName)}&t=${Date.now()}`)
          if (offerResponse.data?.success) {
            const offerData = offerResponse.data.data || []
            
            // Find header row for Offer sheet
            let offerHeaderIdx = 0
            for (let i = 0; i < Math.min(offerData.length, 10); i++) {
              const r = (offerData[i] || []).map(c => String(c || "").trim())
              if (r.some(cell => cell.toLowerCase().replace(/\.$/, "") === "enquiry no")) {
                offerHeaderIdx = i; break
              }
            }
            
            const offerHeaders = (offerData[offerHeaderIdx] || []).map(c => String(c || "").trim())
            const findOfferCol = (name) => offerHeaders.findIndex(h => h.toLowerCase() === name.toLowerCase() || h.toLowerCase().replace(/\.$/, "") === name.toLowerCase())
            
            const oTimestampCol = findOfferCol("Timestamp")
            const oEnqCol = findOfferCol("Enquiry No.")
            const oFirmCol = findOfferCol("Firm Name")
            const oPartyCol = findOfferCol("Party Name")
            const oStageCol = findOfferCol("Stage") !== -1 ? findOfferCol("Stage") : findOfferCol("Current Stage")
            const oOfferNoCol = findOfferCol("Offer Number") !== -1 ? findOfferCol("Offer Number") : findOfferCol("Offer No.")
            
            // Check if this Enquiry No already exists
            let existingRowIdx = -1
            if (oEnqCol !== -1 && enquiryNo) {
                for (let i = offerHeaderIdx + 1; i < offerData.length; i++) {
                    if (String(offerData[i][oEnqCol] || "").trim() === enquiryNo) {
                        existingRowIdx = i; break
                    }
                }
            }

            const latestFirmName = callTrackerRow["Firm Name"] || ""
            const latestPartyName = callTrackerRow["Party Name"] || ""
            const latestStage = callTrackerForm.currentStage || callTrackerRow["Current Stage"] || ""
            const latestOfferNo = callTrackerRow["Offer No."] || callTrackerRow["Offer No"] || callTrackerRow["Offer Number"] || ""

            if (existingRowIdx === -1) {
                const maxCol = Math.max(oTimestampCol, oEnqCol, oFirmCol, oPartyCol, oStageCol, oOfferNoCol, 0)
                const newOfferRow = new Array(maxCol + 1).fill("")

                if (oTimestampCol !== -1) newOfferRow[oTimestampCol] = "=TODAY()" // Insert Google sheets formula for today's date
                if (oEnqCol !== -1) newOfferRow[oEnqCol] = enquiryNo
                if (oFirmCol !== -1) newOfferRow[oFirmCol] = latestFirmName
                if (oPartyCol !== -1) newOfferRow[oPartyCol] = latestPartyName
                if (oStageCol !== -1) newOfferRow[oStageCol] = latestStage
                if (oOfferNoCol !== -1) newOfferRow[oOfferNoCol] = latestOfferNo

                const offerPayload = new URLSearchParams()
                offerPayload.append("action", "insert")
                offerPayload.append("sheetName", offerSheetName)
                offerPayload.append("rowData", JSON.stringify(newOfferRow))

                await axios.post(scriptUrl, offerPayload)
            } else {
                // Row already exists for this enquiry — refresh Firm/Party/Stage/Offer Number
                // so later edits to the enquiry (e.g. Party Name or Offer No. filled in after
                // the first offer trigger) aren't left stale in the Offer sheet.
                // Use a sparse null array so formula columns (Planned 1..5, Delays) are never overwritten.
                const existingLength = (offerData[existingRowIdx] || []).length
                const maxCol = Math.max(oFirmCol, oPartyCol, oStageCol, oOfferNoCol, existingLength, 28)
                const offerUpdateRow = new Array(maxCol).fill(null)

                if (oFirmCol !== -1) offerUpdateRow[oFirmCol] = latestFirmName
                if (oPartyCol !== -1) offerUpdateRow[oPartyCol] = latestPartyName
                if (oStageCol !== -1) offerUpdateRow[oStageCol] = latestStage
                if (oOfferNoCol !== -1) offerUpdateRow[oOfferNoCol] = latestOfferNo

                const offerPayload = new URLSearchParams()
                offerPayload.append("action", "update")
                offerPayload.append("sheetName", offerSheetName)
                offerPayload.append("rowIndex", (existingRowIdx + 1).toString())
                offerPayload.append("rowData", JSON.stringify(offerUpdateRow))

                await axios.post(scriptUrl, offerPayload)
            }
          } else {
            offerHandoffFailed = true
          }
        } catch (err) {
          console.error("Error inserting into Offer FMS:", err)
          offerHandoffFailed = true
        }
      }

      // Optimistic local update — reflect submitted values immediately so no page refresh needed
      // (page refresh would reset the active tab back to "All Enquiry")
      setEnquiryRows(prev => prev.map(r => {
        if (r._sheetRowIdx !== callTrackerRow._sheetRowIdx) return r
        return {
          ...r,
          "Current Stage": callTrackerForm.currentStage,
          "Tracker Status": callTrackerForm.orderReceived,
          "Actual 1": formattedTs,
          "Status": callTrackerForm.status,
          "What Did The Customer Say": callTrackerForm.customerSay,
        }
      }))

      if (offerHandoffFailed) {
        showNotification("Call Tracker saved, but the Offer sheet update failed — please check the Offer page for this enquiry.", "error")
      } else {
        showNotification("Call Tracker details submitted successfully!", "success")
      }
      setShowCallTrackerModal(false)
      setCallTrackerRow(null)
      const wasOrderReceived = callTrackerForm.orderReceived === "Yes"
      setCallTrackerForm({ currentStage: "", customerSay: "", orderReceived: "", status: "", nextCallDate: "" })

      if (wasOrderReceived) {
        window.open("https://new-order-collection.vercel.app/order", "_blank", "noopener,noreferrer")
      }

    } catch (error) {
      console.error("Call Tracker Submit Error:", error)
      showNotification("Error: " + error.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Submit Cancel Order Form ──────────────────────────────────────────────
  const handleOpenCancelModal = (row) => {
    setCancelModalForm({
      personName: row["Contact Person Name"] || row["Name Of Sales Person"] || row["Name Of The Person"] || "",
      orderNo: row["Enquiry No."] || row["Enquiry No"] || "",
      fmsName: import.meta.env.VITE_NBD_ENQUIRY_SHEET_NAME || "NBD ENQUIRY FMS",
      cancelQty: "",
    })
    setShowCancelModal(true)
  }

  const handleCancelSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
    const cancelSheetName = import.meta.env.VITE_NBD_ORDER_CANCEL_SHEET_NAME

    if (!scriptUrl || !cancelSheetName) {
      showNotification("Order Cancel Sheet config missing in .env", "error")
      setIsSubmitting(false)
      return
    }

    try {
      const res = await axios.get(`${scriptUrl}?sheet=${encodeURIComponent(cancelSheetName)}&t=${Date.now()}`)
      const data = res.data?.data || []

      // Header is at row index 0
      const headers = (data[0] || []).map(h => String(h || "").trim())
      const findCol = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase())

      const tsCol = findCol("Timestamp")
      const personCol = findCol("Name Of The Person")
      const orderNoCol = findCol("Order No.")
      const fmsNameCol = findCol("FMS Name")
      const cancelQtyCol = findCol("Order Cancel Qty")

      const maxCol = Math.max(0, tsCol, personCol, orderNoCol, fmsNameCol, cancelQtyCol)
      const newRow = new Array(maxCol + 1).fill("")

      if (tsCol !== -1) {
        newRow[tsCol] = getCurrentTimestamp()
      }

      if (personCol !== -1) newRow[personCol] = cancelModalForm.personName
      if (orderNoCol !== -1) newRow[orderNoCol] = cancelModalForm.orderNo
      if (fmsNameCol !== -1) newRow[fmsNameCol] = cancelModalForm.fmsName
      if (cancelQtyCol !== -1) newRow[cancelQtyCol] = cancelModalForm.cancelQty

      const payload = new URLSearchParams()
      payload.append("action", "insert")
      payload.append("sheetName", cancelSheetName)
      payload.append("rowData", JSON.stringify(newRow))

      const postRes = await axios.post(scriptUrl, payload)
      if (postRes.data?.success) {
        showNotification("Cancel order saved successfully!", "success")
        setShowCancelModal(false)
      } else {
        throw new Error("Failed to insert row")
      }
    } catch (err) {
      console.error(err)
      showNotification("Error: " + err.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }


  return (
    <div className="py-2">

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-1.5 mb-8 w-full justify-center border border-slate-200 shadow-sm">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium leading-5 transition-all duration-200 whitespace-nowrap ${activeTab === "all"
            ? "bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-200"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          All Enquiry
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeTab === "all" ? "bg-sky-100 text-sky-700" : "bg-gray-100 text-gray-500"}`}>
            {enquiryRows.filter(r => { const ts = String(r["Tracker Status"] || "").trim(); return ts !== "Yes" && ts !== "Tracker No" && ts !== "No"; }).length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("callTracker")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium leading-5 transition-all duration-200 whitespace-nowrap ${activeTab === "callTracker"
            ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Call Tracker
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeTab === "callTracker" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>
            {enquiryRows.filter(r => { const ts = String(r["Tracker Status"] || "").trim(); return ts !== "Yes" && ts !== "Tracker No" && ts !== "No"; }).length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("orderReceived")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium leading-5 transition-all duration-200 whitespace-nowrap ${activeTab === "orderReceived"
            ? "bg-primary/20 text-primary shadow-sm ring-1 ring-emerald-200"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Order Received
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeTab === "orderReceived" ? "bg-emerald-100 text-primary" : "bg-gray-100 text-gray-500"}`}>
            {enquiryRows.filter(r => String(r["Tracker Status"] || "").trim() === "Yes").length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("orderNotReceived")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium leading-5 transition-all duration-200 whitespace-nowrap ${activeTab === "orderNotReceived"
            ? "bg-rose-50 text-rose-700 shadow-sm ring-1 ring-rose-200"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Order Not Received
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeTab === "orderNotReceived" ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-500"}`}>
            {enquiryRows.filter(r => String(r["Tracker Status"] || "").trim() === "Tracker No" || String(r["Tracker Status"] || "").trim() === "No").length}
          </span>
        </button>
      </div>

      {/* Controls */}
      <div className="bg-card rounded-2xl shadow-sm border border-slate-200/70 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <input
              type="text"
              placeholder="Search Enquiry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 min-w-[250px]"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportRows}
              disabled={filteredRows.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-gray-300 text-gray-600 font-medium rounded-md hover:bg-gray-50 text-sm cursor-pointer disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={fetchNBDEnquiryData}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-gray-300 text-gray-600 font-medium rounded-md hover:bg-gray-50 text-sm cursor-pointer"
            >
              <RefreshCwIcon className="h-4 w-4" />
              Refresh
            </button>
            {activeTab === "all" && (
              <button
                onClick={() => setShowNewCallTrackerForm(true)}
                className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm"
              >
                <PlusIcon className="h-4 w-4" /> New Enquiry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── New Enquiry Modal ── */}
      {showNewCallTrackerForm && activeTab === "all" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[90vh] overflow-hidden relative flex flex-col">
            <button
              onClick={() => setShowNewCallTrackerForm(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 z-10 p-2 bg-white rounded-xl shadow-sm transition-colors"
              style={{ zIndex: 60 }}
            >
              <XIcon className="h-6 w-6" />
            </button>
            <div className="flex-1 overflow-hidden">
              <CallTrackerForm
                presetLeadNo={presetLeadNo}
                onClose={() => { setShowNewCallTrackerForm(false); setPresetLeadNo(null); fetchNBDEnquiryData() }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── View Details Modal ── */}
      {showViewModal && viewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-10 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">Enquiry Details</h2>
                <p className="text-sm text-sky-600 font-medium mt-0.5">
                  {viewRow["Enquiry No."] || viewRow["Enquiry No"] || ""}
                </p>
              </div>
              <button
                onClick={() => { setShowViewModal(false); setViewRow(null) }}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-1">
              {ALL_COLUMNS.map((col) => {
                const val = viewRow[col]
                const isLink = col === "Upload File" && val && (val.startsWith("http://") || val.startsWith("https://"))
                return (
                  <div key={col} className="grid grid-cols-5 border-b border-gray-50 py-2 gap-2">
                    <span className="col-span-2 font-medium text-gray-500 text-sm">{col}</span>
                    <span className="col-span-3 text-gray-800 text-sm font-medium break-words">
                      {isLink ? (
                        <a
                          href={val}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-600 underline hover:text-sky-800 transition-colors"
                        >
                          View File ↗
                        </a>
                      ) : val ? val : <span className="text-gray-300">—</span>}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* ── Call Tracker Details Section ── */}
            {(trackerDetails || viewRow["Current Stage"] || viewRow["Tracker Status"]) && (
              <div className="px-6 pb-6 mt-4">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 overflow-hidden shadow-sm">
                  <div className="flex items-center gap-2 px-4 py-3 bg-indigo-600">
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-[13px] font-bold text-white uppercase tracking-wide">Call Tracker Details</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 gap-3">
                    {/* Status */}
                    <div className="grid grid-cols-5 gap-2 border-b border-indigo-100 pb-2">
                      <span className="col-span-2 text-[13px] font-medium text-indigo-700">Status</span>
                      <span className="col-span-3 text-[13px] font-semibold text-foreground">
                        {trackerDetails?.status || <span className="text-slate-300">—</span>}
                      </span>
                    </div>

                    {/* Current Stage */}
                    <div className="grid grid-cols-5 gap-2 border-b border-indigo-100 pb-2">
                      <span className="col-span-2 text-[13px] font-medium text-indigo-700">Current Stage</span>
                      <span className="col-span-3 text-[13px] font-semibold text-foreground">
                        {trackerDetails?.currentStage || viewRow["Current Stage"] || <span className="text-slate-300">—</span>}
                      </span>
                    </div>

                    {/* What Did the Customer say */}
                    <div className="grid grid-cols-5 gap-2 border-b border-indigo-100 pb-2">
                      <span className="col-span-2 text-[13px] font-medium text-indigo-700">What Did the Customer say</span>
                      <span className="col-span-3 text-[13px] font-semibold text-foreground break-words italic">
                        {trackerDetails?.customerSay || <span className="text-slate-300">—</span>}
                      </span>
                    </div>

                    {/* Next Date of Call */}
                    <div className="grid grid-cols-5 gap-2 border-b border-indigo-100 pb-2">
                      <span className="col-span-2 text-[13px] font-medium text-indigo-700">Next Date of Call</span>
                      <span className="col-span-3 text-[13px] font-semibold text-foreground">
                        {trackerDetails?.nextDateOfCall || <span className="text-slate-300">—</span>}
                      </span>
                    </div>

                    {/* Freq */}
                    <div className="grid grid-cols-5 gap-2 border-b border-indigo-100 pb-2">
                      <span className="col-span-2 text-[13px] font-medium text-indigo-700">Freq</span>
                      <span className="col-span-3 text-[13px] font-semibold text-foreground">
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-bold bg-indigo-50 text-indigo-700 text-xs border border-indigo-200">
                          {trackerDetails?.freq || viewRow["Freq"] || viewRow["Frequency"] || viewRow["No. Of Calls Made"] || 0}
                        </span>
                      </span>
                    </div>

                    {/* Order Received */}
                    <div className="grid grid-cols-5 gap-2">
                      <span className="col-span-2 text-[13px] font-medium text-indigo-700">Order Received</span>
                      <span className="col-span-3">
                        {trackerDetails?.orderRecived || viewRow["Tracker Status"] ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${(trackerDetails?.orderRecived || viewRow["Tracker Status"]) === "Yes"
                            ? "bg-emerald-100 text-primary"
                            : (trackerDetails?.orderRecived || viewRow["Tracker Status"]) === "Tracker No" || (trackerDetails?.orderRecived || viewRow["Tracker Status"]) === "No"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-muted/50 text-muted-foreground"
                            }`}>
                            {trackerDetails?.orderRecived || viewRow["Tracker Status"]}
                          </span>
                        ) : <span className="text-slate-300 text-[13px]">—</span>}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => { setShowViewModal(false); setViewRow(null) }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── Call Tracker Modal ── */}
      {showCallTrackerModal && callTrackerRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 modal-backdrop p-4">
          <div className="bg-card rounded-2xl shadow-2xl shadow-black/15 w-full max-w-lg animate-scale-in">
            {/* Header */}
            <div className="flex justify-between items-start p-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <svg className="h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <h2 className="text-[16px] font-bold text-foreground">Call Tracker</h2>
                </div>
                <p className="text-[12px] text-muted-foreground pl-10">
                  {callTrackerRow["Firm Name"] || ""}
                  {" · "}
                  <span className="text-sky-600 font-semibold">
                    {callTrackerRow["Enquiry No."] || callTrackerRow["Enquiry No"] || ""}
                  </span>
                </p>
              </div>
              <button
                onClick={() => { setShowCallTrackerModal(false); setCallTrackerRow(null) }}
                className="text-muted-foreground hover:text-muted-foreground hover:bg-muted/50 p-1.5 rounded-lg transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCallTrackerSubmit} className="p-6 space-y-4">

              {/* Order Received */}
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Order Received
                </label>
                <select
                  value={callTrackerForm.orderReceived}
                  onChange={(e) => setCallTrackerForm(p => ({ ...p, orderReceived: e.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-xl text-[13px] text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                >
                  <option value="">Select Status</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Pending">Expected</option>
                </select>
              </div>

              {/* Current Stage */}
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Current Stage <span className="text-red-400 normal-case tracking-normal">*</span>
                </label>
                <select
                  value={callTrackerForm.currentStage}
                  onChange={(e) => setCallTrackerForm(p => ({ ...p, currentStage: e.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-xl text-[13px] text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                  required
                >
                  <option value="">Select Stage</option>
                  {(() => {
                    const baseOptions = masterStageOptions.length > 0
                      ? masterStageOptions
                      : ["Initial Contact", "Qualified", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"]
                    // Ensure the pre-filled value is always available as an option
                    const prefill = callTrackerForm.currentStage
                    const allOptions = prefill && !baseOptions.includes(prefill)
                      ? [prefill, ...baseOptions]
                      : baseOptions
                    return allOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)
                  })()}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Status
                </label>
                <select
                  value={callTrackerForm.status}
                  onChange={(e) => setCallTrackerForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-xl text-[13px] text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                >
                  <option value="">Select Status</option>
                  {masterStatusOptions.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}
                </select>
              </div>

              {/* What Did the Customer Say */}
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  What Did the Customer Say <span className="text-red-400 normal-case tracking-normal">*</span>
                </label>
                <textarea
                  value={callTrackerForm.customerSay}
                  onChange={(e) => setCallTrackerForm(p => ({ ...p, customerSay: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-[13px] text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none transition-all"
                  placeholder="Enter customer feedback or remarks..."
                  required
                />
              </div>

              {/* Next Date of Call — only when Order Received = Pending */}
              {callTrackerForm.orderReceived === "Pending" && (
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Next Date of Call <span className="text-red-400 normal-case tracking-normal">*</span>
                  </label>
                  <input
                    type="date"
                    min={(() => {
                      const now = new Date()
                      const y = now.getFullYear()
                      const m = String(now.getMonth() + 1).padStart(2, '0')
                      const d = String(now.getDate()).padStart(2, '0')
                      return `${y}-${m}-${d}`
                    })()}
                    value={callTrackerForm.nextCallDate}
                    onChange={(e) => {
                      const val = e.target.value
                      const now = new Date()
                      const y = now.getFullYear()
                      const m = String(now.getMonth() + 1).padStart(2, '0')
                      const d = String(now.getDate()).padStart(2, '0')
                      const today = `${y}-${m}-${d}`
                      if (val && val < today) {
                        showNotification("Cannot select a back date", "error")
                        return
                      }
                      setCallTrackerForm(p => ({ ...p, nextCallDate: val }))
                    }}
                    className="w-full h-10 px-3 border border-border rounded-xl text-[13px] text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                    required
                  />
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowCallTrackerModal(false); setCallTrackerRow(null) }}
                  className="h-10 px-5 border border-border rounded-xl text-[13px] font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-semibold text-[13px] flex items-center gap-2 shadow-md shadow-indigo-200 transition-colors"
                >
                  {isSubmitting && <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/40 border-t-white"></div>}
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Cancel Order Modal ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 modal-backdrop p-4">
          <div className="bg-card rounded-2xl shadow-2xl shadow-black/15 w-full max-w-md animate-scale-in">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center">
                  <XIcon className="h-4 w-4 text-rose-600" />
                </div>
                <h2 className="text-[16px] font-bold text-foreground">Cancel Order Form</h2>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-muted-foreground hover:text-muted-foreground hover:bg-muted/50 p-1.5 rounded-lg transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCancelSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Name Of The Person
                </label>
                <input
                  type="text"
                  value={cancelModalForm.personName}
                  onChange={(e) => setCancelModalForm((p) => ({ ...p, personName: e.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-xl text-[13px] text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Order No.
                </label>
                <input
                  type="text"
                  value={cancelModalForm.orderNo}
                  onChange={(e) => setCancelModalForm((p) => ({ ...p, orderNo: e.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-xl text-[13px] text-foreground bg-muted focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all cursor-not-allowed"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  FMS Name
                </label>
                <input
                  type="text"
                  value={cancelModalForm.fmsName}
                  onChange={(e) => setCancelModalForm((p) => ({ ...p, fmsName: e.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-xl text-[13px] text-foreground bg-muted focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all cursor-not-allowed"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Order Cancel Qty <span className="text-red-400 normal-case tracking-normal">*</span>
                </label>
                <input
                  type="number"
                  value={cancelModalForm.cancelQty}
                  onChange={(e) => setCancelModalForm((p) => ({ ...p, cancelQty: e.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-xl text-[13px] text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="h-10 px-5 border border-border rounded-xl text-[13px] font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 px-6 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-semibold text-[13px] flex items-center gap-2 shadow-md shadow-rose-200 transition-colors"
                >
                  {isSubmitting && <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/40 border-t-white"></div>}
                  {isSubmitting ? "Submitting..." : "Submit Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Main Table ── */}
      <div className="bg-card rounded-2xl shadow-md border border-slate-200/70 overflow-hidden">
        {/* Table Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-muted/60">
          <div>
            <h2 className="text-[15px] font-bold text-foreground">
              {activeTab === "all" ? "All Enquiry"
                : activeTab === "callTracker" ? "Call Tracker"
                  : activeTab === "orderReceived" ? "Order Received"
                    : "Order Not Received"}
            </h2>
            {!isLoading && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {filteredRows.length} record{filteredRows.length !== 1 ? "s" : ""} found
              </p>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-20 text-muted-foreground">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-border border-t-sky-500 mb-3"></div>
            <p className="text-[13px] font-medium">Loading from NBD ENQUIRY FMS...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted border-b border-border">
                  {/* Call button column — only on Call Tracker tab */}
                  {activeTab === "callTracker" && (
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-indigo-600 uppercase tracking-widest whitespace-nowrap w-24">
                      Action
                    </th>
                  )}
                  {TABLE_COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="px-5 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                  {/* Extra Call Tracker columns for tracker tabs */}
                  {["callTracker", "orderReceived", "orderNotReceived"].includes(activeTab) &&
                    CALL_TRACKER_COLUMNS.map((col) => (
                      <th
                        key={col}
                        className="px-5 py-3.5 text-left text-[11px] font-bold text-indigo-500 uppercase tracking-widest whitespace-nowrap"
                      >
                        {CALL_TRACKER_COLUMN_LABELS[col] || col}
                      </th>
                    ))
                  }
                  {/* Current Stage column — shown on the "All Enquiry" tab too */}
                  {activeTab === "all" && (
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-indigo-500 uppercase tracking-widest whitespace-nowrap">
                      Current Stage
                    </th>
                  )}
                  {/* View chevron column */}
                  <th className="px-5 py-3.5 w-14"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.map((row, index) => (
                  <tr key={index} className="hover:bg-blue-50/40 transition-colors group">
                    {/* Call button — first column, only on Call Tracker tab */}
                    {activeTab === "callTracker" && (
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenCallTracker(row)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm shadow-indigo-200 transition-colors"
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          Call
                        </button>
                      </td>
                    )}
                    {TABLE_COLUMNS.map((col) => {
                      let val = row[col]
                      if (val === undefined || val === "") {
                        if (col === "Expected Days" || col === "Expected") {
                          val = row["Expected Days"] || row["Expected"] || ""
                        } else if (col === "Lead Time to Convert in Order" || col === "Lead Time For Convert In Order") {
                          val = row["Lead Time to Convert in Order"] || row["Lead Time For Convert In Order"] || ""
                        } else {
                          val = ""
                        }
                      }
                      return (
                        <td key={col} className="px-5 py-3.5 whitespace-nowrap" title={val}>
                          {col === "Enquiry No." ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-sky-100 text-sky-700 text-sm font-semibold">
                              {val || "—"}
                            </span>
                          ) : col === "Source" ? (
                            isFromNbdLead(row) ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                                NBD Lead
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Manual
                              </span>
                            )
                          ) : col === "Firm Name" ? (
                            <span className="text-[13px] font-semibold text-foreground">{val || <span className="text-slate-300">—</span>}</span>
                          ) : val ? (
                            <span className="text-[13px] text-muted-foreground">{val}</span>
                          ) : (
                            <span className="text-slate-300 text-[13px]">—</span>
                          )}
                        </td>
                      )
                    })}
                    {/* Extra Call Tracker columns for tracker tabs */}
                    {["callTracker", "orderReceived", "orderNotReceived"].includes(activeTab) &&
                      CALL_TRACKER_COLUMNS.map((col) => {
                        const val = row[col] || ""

                        return (
                          <td key={col} className="px-5 py-3.5 whitespace-nowrap" title={val}>
                            {col === "Current Stage" && val ? (
                              <span className="text-[13px] font-semibold text-foreground">{val}</span>
                            ) : col === "Tracker Status" && val ? (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${val === "Yes"
                                ? "bg-emerald-100 text-primary"
                                : val === "Tracker No" || val === "No"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-muted/50 text-muted-foreground"
                                }`}>
                                {val}
                              </span>
                            ) : col === "Status" && val ? (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${val === "Hot"
                                ? "bg-red-100 text-red-800"
                                : val === "Warm"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : val === "Cold"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-muted/50 text-muted-foreground"
                                }`}>
                                {val}
                              </span>
                            ) : col === "Freq" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded font-bold bg-indigo-50 text-indigo-700 text-xs border border-indigo-200">
                                {val || row["Frequency"] || row["No. Of Calls Made"] || 0}
                              </span>
                            ) : val ? (
                              <span className="text-[13px] text-muted-foreground">{val}</span>
                            ) : (
                              <span className="text-slate-300 text-[13px]">—</span>
                            )}
                          </td>
                        )
                      })
                    }
                    {/* Current Stage column — shown on the "All Enquiry" tab too */}
                    {activeTab === "all" && (() => {
                      const val = row["Current Stage"] || ""
                      return (
                        <td className="px-5 py-3.5 whitespace-nowrap" title={val}>
                          {val ? (
                            <span className="text-[13px] font-semibold text-foreground">{val}</span>
                          ) : (
                            <span className="text-slate-300 text-[13px]">—</span>
                          )}
                        </td>
                      )
                    })()}
                    {/* Chevron — View full details */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenViewModal(row)}
                        title="View Details"
                        className="p-2 text-slate-300 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors group-hover:text-muted-foreground"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={
                        TABLE_COLUMNS.length +
                        (["callTracker", "orderReceived", "orderNotReceived"].includes(activeTab) ? CALL_TRACKER_COLUMNS.length : 0) +
                        (activeTab === "all" ? 1 : 0) + // Current Stage col
                        (activeTab === "callTracker" ? 1 : 0) + // Action button col
                        1 // chevron col
                      }
                      className="px-6 py-20 text-center"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                          <svg className="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-muted-foreground">
                            {searchTerm ? `No results for "${searchTerm}"` : "No enquiry data found"}
                          </p>
                          <p className="text-[12px] text-muted-foreground mt-1">Try adjusting your search or refresh the data</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </>
        )}
        {!isLoading && filteredRows.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} totalItems={filteredRows.length} onPageChange={setPage} />
        )}
      </div>

    </div>
  )
}

export default CallTracker
