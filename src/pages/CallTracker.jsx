"use client"

import { useState, useEffect, useContext } from "react"
import { PlusIcon, SearchIcon, XIcon } from "../components/Icons"
import { AuthContext } from "../App"
import CallTrackerForm from "./Call-Tracker-Form"
import axios from "axios"

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

// Key columns to show in the table (summary view)
const TABLE_COLUMNS = [
  "Enquiry No.",
  "Firm Name",
  "Enquiry status",
  "Name Of Sales Person",
  "Location",
  "Contact Person Mobile No.",
]

// Extra columns shown on Call Tracker / Order Received / Order Not Received tabs
const CALL_TRACKER_COLUMNS = [
  "Current Stage",
  "Tracker Status",
  "Actual 1",
]

/**
 * Google Apps Script returns date cells as UTC ISO-8601 strings (e.g. "2026-02-14T18:30:00.000Z").
 * Sending these back as-is via setValues() stores them as TEXT — corrupting the date format.
 *
 * Fix: convert to IST (Asia/Kolkata) and format as DD/MM/YYYY HH:mm:ss — the Indian date
 * format that an Indian-locale Google Sheet correctly parses as a real date via setValues().
 * e.g. "2026-02-14T18:30:00.000Z" (UTC) → "15/02/2026" (IST midnight = Feb 15 in India)
 */
const normalizeForGSheets = (value) => {
  if (typeof value !== "string" || !value) return value
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return value
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  // Convert UTC → IST
  const istDate = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  const dd = String(istDate.getDate()).padStart(2, "0")
  const mo = String(istDate.getMonth() + 1).padStart(2, "0")
  const yr = istDate.getFullYear()
  const hh = String(istDate.getHours()).padStart(2, "0")
  const min = String(istDate.getMinutes()).padStart(2, "0")
  const ss = String(istDate.getSeconds()).padStart(2, "0")
  // Date-only if IST time is exactly midnight
  const isDateOnly = istDate.getHours() === 0 && istDate.getMinutes() === 0 && istDate.getSeconds() === 0
  return isDateOnly ? `${dd}/${mo}/${yr}` : `${dd}/${mo}/${yr} ${hh}:${min}:${ss}`
}


function CallTracker() {
  const { showNotification } = useContext(AuthContext)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

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
    try {
      const response = await axios.get(`${scriptUrl}?sheet=${masterSheet}`)
      if (!response.data || !response.data.success) return
      const rows = response.data.data || []
      // Data starts from row 2 (index 1)
      const dataRows = rows.slice(1)
      const getUnique = (colIdx) =>
        [...new Set(dataRows.map(r => String(r[colIdx] || "").trim()).filter(Boolean))]
      setMasterStatusOptions(getUnique(6))  // Col G = index 6
      setMasterStageOptions(getUnique(8))   // Col I = index 8
    } catch (error) {
      console.error("Error fetching master sheet:", error)
    }
  }

  const fetchNBDEnquiryData = async () => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
    const sheetName = import.meta.env.VITE_NBD_ENQUIRY_SHEET_NAME

    if (!scriptUrl || !sheetName) {
      showNotification("NBD Enquiry sheet config missing in .env", "error")
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const response = await axios.get(`${scriptUrl}?sheet=${sheetName}`)
      if (!response.data || !response.data.success) throw new Error("Failed to fetch sheet data")

      const allRows = response.data.data || []

      // Find header row — scan first 10 rows for a cell matching "Enquiry No."
      let headerRowIndex = 4 // default row 5 = index 4
      for (let i = 0; i < Math.min(allRows.length, 10); i++) {
        const row = allRows[i].map(c => String(c || "").trim())
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
              let val = String(row[idx] || "").trim()
              if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
                const d = new Date(val);
                if (!isNaN(d.getTime())) {
                  val = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'Asia/Kolkata',
                    month: 'numeric', day: 'numeric', year: 'numeric',
                    hour: 'numeric', minute: 'numeric', second: 'numeric',
                    hour12: false,
                  }).format(d).replace(",", "")
                }
              }
              obj[h] = val
            }
          })
          return obj
        })
        .filter(Boolean)

      // Sort latest Enquiry No. first (EN-10 before EN-1)
      mappedRows.sort((a, b) => {
        const aNo = parseEnquiryNo(a["Enquiry No."] || a["Enquiry No"] || "")
        const bNo = parseEnquiryNo(b["Enquiry No."] || b["Enquiry No"] || "")
        return bNo - aNo
      })

      setEnquiryRows(mappedRows)
    } catch (error) {
      console.error("Error fetching NBD Enquiry data:", error)
      showNotification("Failed to fetch enquiry data: " + error.message, "error")
    } finally {
      setIsLoading(false)
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
    if (activeTab === "callTracker") {
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

    // Fetch Status & What Did The Customer Say from NBD CALL TRACKER sheet
    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
      const trackerSheet = import.meta.env.VITE_NBD_CALL_TRACKER_SHEET_NAME
      const enquiryNo = row["Enquiry No."] || row["Enquiry No"] || ""

      if (scriptUrl && trackerSheet && enquiryNo) {
        const res = await axios.get(`${scriptUrl}?sheet=${trackerSheet}`)
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
              if (statusColIdx !== -1) prefilled.status = String(r[statusColIdx] || "")
              if (customerSayColIdx !== -1) prefilled.customerSay = String(r[customerSayColIdx] || "")
              if (nextDateColIdx !== -1) {
                // Sheet stores DD/MM/YYYY — convert to YYYY-MM-DD for HTML date input
                const raw = String(r[nextDateColIdx] || "").trim()
                if (raw) {
                  const [dd, mm, yyyy] = raw.split("/")
                  if (dd && mm && yyyy) prefilled.nextCallDate = `${yyyy}-${mm}-${dd}`
                }
              }
              break
            }
          }
        }
      }
    } catch (err) {
      console.warn("Could not pre-fill from CALL TRACKER sheet:", err)
    }

    setCallTrackerForm(prefilled)
    setShowCallTrackerModal(true)
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
        const res = await axios.get(`${scriptUrl}?sheet=${trackerSheet}`)
        if (res.data?.success) {
          const data = res.data.data || []
          const headers = (data[1] || []).map(h => String(h || "").trim())
          const findH = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase())

          const enqColIdx = findH("Enquiry No.")
          const statusColIdx = findH("Status")
          const stageColIdx = findH("Current Stage")
          const lastDateColIdx = findH("Last Date Of Call")
          const customerSayColIdx = findH("What Did the Customer say")
          const nextDateColIdx = findH("Next Date of Call")
          const noOfCallsColIdx = findH("No. Of Calls Made")
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
      const fmsResponse = await axios.get(`${scriptUrl}?sheet=${fmsSheetName}`)
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
      const existingFmsRow = (fmsData[fmsTargetIdx] || []).map(normalizeForGSheets)
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
        const trackerResponse = await axios.get(`${scriptUrl}?sheet=${trackerSheetName}`)
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

    setIsSubmitting(true)
    try {
      // ── Step 1: Update latest matching row in NBD CALL TRACKER (by Enquiry No.) ──
      const trackerSheetRes = await axios.get(`${scriptUrl}?sheet=${trackerSheetName}`)
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
        const nowISTStr = new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }) // DD/MM/YYYY
        if (tkLastDateCol !== -1) existingTrackerRow[tkLastDateCol] = nowISTStr

        if (tkNoOfCallsCol !== -1) {
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
          tkCustomerSayCol, tkOrderCol, tkNextDateCol
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
        const nowISTStr = new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }) // DD/MM/YYYY
        if (tkLastDateCol !== -1) newRow[tkLastDateCol] = nowISTStr
        if (tkNoOfCallsCol !== -1) newRow[tkNoOfCallsCol] = 1 // First call

        const trackerPayload = new URLSearchParams()
        trackerPayload.append("action", "insert")
        trackerPayload.append("sheetName", trackerSheetName)
        trackerPayload.append("rowData", JSON.stringify(newRow))
        await axios.post(scriptUrl, trackerPayload)
      }

      // ── Step 2: Update specific tracker columns in NBD ENQUIRY FMS (partial row, no date corruption) ──
      const fmsResponse = await axios.get(`${scriptUrl}?sheet=${fmsSheetName}`)
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
      const findFmsCol = (name) => fmsHeaders.findIndex(h => h.toLowerCase() === name.toLowerCase())

      const fmsCurrentStageCol = findFmsCol("Current Stage")
      const fmsTrackerStatusCol = findFmsCol("Tracker Status")
      const fmsActual1Col = findFmsCol("Actual 1")
      const fmsStatusCol = findFmsCol("Status")
      const fmsWhatCustomerSayCol = findFmsCol("What Did The Customer Say")
      const fmsEnqNoCol = findFmsCol("Enquiry No.")

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

      const nowIST = new Date()
      // Use IST format "MM/dd/yyyy HH:mm:ss" without double conversion which leads to offset shifts.
      const formattedTs = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false,
      }).format(nowIST).replace(",", "")

      // Full row: normalize existing cells so ISO date strings survive the round-trip
      const existingFmsRow = (fmsData[fmsTargetIdx] || []).map(normalizeForGSheets)
      const maxFmsCol = Math.max(
        fmsCurrentStageCol, fmsTrackerStatusCol, fmsActual1Col, fmsStatusCol, fmsWhatCustomerSayCol
      )
      while (existingFmsRow.length <= maxFmsCol) existingFmsRow.push("")

      if (fmsCurrentStageCol !== -1) existingFmsRow[fmsCurrentStageCol] = callTrackerForm.currentStage
      if (fmsTrackerStatusCol !== -1) existingFmsRow[fmsTrackerStatusCol] = callTrackerForm.orderReceived
      if (fmsActual1Col !== -1) existingFmsRow[fmsActual1Col] = formattedTs
      if (fmsStatusCol !== -1) existingFmsRow[fmsStatusCol] = callTrackerForm.status
      if (fmsWhatCustomerSayCol !== -1) existingFmsRow[fmsWhatCustomerSayCol] = callTrackerForm.customerSay

      const fmsPayload = new URLSearchParams()
      fmsPayload.append("action", "update")
      fmsPayload.append("sheetName", fmsSheetName)
      fmsPayload.append("rowIndex", (fmsTargetIdx + 1).toString())
      fmsPayload.append("rowData", JSON.stringify(existingFmsRow))
      await axios.post(scriptUrl, fmsPayload)

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

      showNotification("Call Tracker details submitted successfully!", "success")
      setShowCallTrackerModal(false)
      setCallTrackerRow(null)
      setCallTrackerForm({ currentStage: "", customerSay: "", orderReceived: "", status: "", nextCallDate: "" })

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
      const res = await axios.get(`${scriptUrl}?sheet=${cancelSheetName}`)
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
        const nowIST = new Date()
        const formattedTs = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          month: 'numeric', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: 'numeric', second: 'numeric',
          hour12: false,
        }).format(nowIST).replace(",", "")
        newRow[tsCol] = formattedTs
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

      {/* ── Top Controls ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="search"
            placeholder="Search Enquiry..."
            className="pl-8 w-[220px] md:w-[300px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchNBDEnquiryData}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-600 font-medium rounded-md hover:bg-gray-50 text-sm"
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => setShowNewCallTrackerForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-medium rounded-md text-sm"
          >
            <PlusIcon className="inline-block mr-1.5 h-4 w-4" /> New Enquiry
          </button>
        </div>
      </div>

      {/* ── New Enquiry Modal ── */}
      {showNewCallTrackerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] overflow-hidden relative flex flex-col">
            <button
              onClick={() => setShowNewCallTrackerForm(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10 p-2 bg-white rounded-full shadow-sm"
              style={{ zIndex: 60 }}
            >
              <XIcon className="h-6 w-6" />
            </button>
            <div className="flex-1 overflow-hidden">
              <CallTrackerForm
                onClose={() => { setShowNewCallTrackerForm(false); fetchNBDEnquiryData() }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── View Details Modal ── */}
      {showViewModal && viewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Enquiry Details</h2>
                <p className="text-sm text-sky-600 font-medium mt-0.5">
                  {viewRow["Enquiry No."] || viewRow["Enquiry No"] || ""}
                </p>
              </div>
              <button
                onClick={() => { setShowViewModal(false); setViewRow(null) }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <XIcon className="h-6 w-6" />
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
                      <span className="col-span-3 text-[13px] font-semibold text-slate-800">
                        {trackerDetails?.status || <span className="text-slate-300">—</span>}
                      </span>
                    </div>

                    {/* Current Stage */}
                    <div className="grid grid-cols-5 gap-2 border-b border-indigo-100 pb-2">
                      <span className="col-span-2 text-[13px] font-medium text-indigo-700">Current Stage</span>
                      <span className="col-span-3 text-[13px] font-semibold text-slate-800">
                        {trackerDetails?.currentStage || viewRow["Current Stage"] || <span className="text-slate-300">—</span>}
                      </span>
                    </div>

                    {/* What Did the Customer say */}
                    <div className="grid grid-cols-5 gap-2 border-b border-indigo-100 pb-2">
                      <span className="col-span-2 text-[13px] font-medium text-indigo-700">What Did the Customer say</span>
                      <span className="col-span-3 text-[13px] font-semibold text-slate-800 break-words italic">
                        {trackerDetails?.customerSay || <span className="text-slate-300">—</span>}
                      </span>
                    </div>

                    {/* Next Date of Call */}
                    <div className="grid grid-cols-5 gap-2 border-b border-indigo-100 pb-2">
                      <span className="col-span-2 text-[13px] font-medium text-indigo-700">Next Date of Call</span>
                      <span className="col-span-3 text-[13px] font-semibold text-slate-800">
                        {trackerDetails?.nextDateOfCall || <span className="text-slate-300">—</span>}
                      </span>
                    </div>

                    {/* Order Received */}
                    <div className="grid grid-cols-5 gap-2">
                      <span className="col-span-2 text-[13px] font-medium text-indigo-700">Order Received</span>
                      <span className="col-span-3">
                        {trackerDetails?.orderRecived || viewRow["Tracker Status"] ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${(trackerDetails?.orderRecived || viewRow["Tracker Status"]) === "Yes"
                            ? "bg-emerald-100 text-emerald-700"
                            : (trackerDetails?.orderRecived || viewRow["Tracker Status"]) === "Tracker No" || (trackerDetails?.orderRecived || viewRow["Tracker Status"]) === "No"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-100 text-slate-600"
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
          <div className="bg-white rounded-2xl shadow-2xl shadow-black/15 w-full max-w-lg animate-scale-in">
            {/* Header */}
            <div className="flex justify-between items-start p-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <svg className="h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <h2 className="text-[16px] font-bold text-slate-800">Call Tracker</h2>
                </div>
                <p className="text-[12px] text-slate-500 pl-10">
                  {callTrackerRow["Firm Name"] || ""}
                  {" · "}
                  <span className="text-sky-600 font-semibold">
                    {callTrackerRow["Enquiry No."] || callTrackerRow["Enquiry No"] || ""}
                  </span>
                </p>
              </div>
              <button
                onClick={() => { setShowCallTrackerModal(false); setCallTrackerRow(null) }}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCallTrackerSubmit} className="p-6 space-y-4">

              {/* Current Stage */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Current Stage <span className="text-red-400 normal-case tracking-normal">*</span>
                </label>
                <select
                  value={callTrackerForm.currentStage}
                  onChange={(e) => setCallTrackerForm(p => ({ ...p, currentStage: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl text-[13px] text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
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
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Status
                </label>
                <select
                  value={callTrackerForm.status}
                  onChange={(e) => setCallTrackerForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl text-[13px] text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                >
                  <option value="">Select Status</option>
                  {masterStatusOptions.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}
                </select>
              </div>

              {/* What Did the Customer Say */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  What Did the Customer Say <span className="text-red-400 normal-case tracking-normal">*</span>
                </label>
                <textarea
                  value={callTrackerForm.customerSay}
                  onChange={(e) => setCallTrackerForm(p => ({ ...p, customerSay: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-[13px] text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none transition-all"
                  placeholder="Enter customer feedback or remarks..."
                  required
                />
              </div>

              {/* Order Received */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Order Received
                </label>
                <select
                  value={callTrackerForm.orderReceived}
                  onChange={(e) => setCallTrackerForm(p => ({ ...p, orderReceived: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl text-[13px] text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                >
                  <option value="">Select Status</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              {/* Next Date of Call — only when Order Received = Pending */}
              {callTrackerForm.orderReceived === "Pending" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Next Date of Call
                  </label>
                  <input
                    type="date"
                    value={callTrackerForm.nextCallDate}
                    onChange={(e) => setCallTrackerForm(p => ({ ...p, nextCallDate: e.target.value }))}
                    className="w-full h-10 px-3 border border-slate-300 rounded-xl text-[13px] text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                  />
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowCallTrackerModal(false); setCallTrackerRow(null) }}
                  className="h-10 px-5 border border-slate-300 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
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
          <div className="bg-white rounded-2xl shadow-2xl shadow-black/15 w-full max-w-md animate-scale-in">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center">
                  <XIcon className="h-4 w-4 text-rose-600" />
                </div>
                <h2 className="text-[16px] font-bold text-slate-800">Cancel Order Form</h2>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCancelSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Name Of The Person
                </label>
                <input
                  type="text"
                  value={cancelModalForm.personName}
                  onChange={(e) => setCancelModalForm((p) => ({ ...p, personName: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl text-[13px] text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Order No.
                </label>
                <input
                  type="text"
                  value={cancelModalForm.orderNo}
                  onChange={(e) => setCancelModalForm((p) => ({ ...p, orderNo: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl text-[13px] text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all cursor-not-allowed"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  FMS Name
                </label>
                <input
                  type="text"
                  value={cancelModalForm.fmsName}
                  onChange={(e) => setCancelModalForm((p) => ({ ...p, fmsName: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl text-[13px] text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all cursor-not-allowed"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Order Cancel Qty <span className="text-red-400 normal-case tracking-normal">*</span>
                </label>
                <input
                  type="number"
                  value={cancelModalForm.cancelQty}
                  onChange={(e) => setCancelModalForm((p) => ({ ...p, cancelQty: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl text-[13px] text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="h-10 px-5 border border-slate-300 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
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

      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-1 mb-4 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 ${activeTab === "all"
            ? "bg-sky-600 text-white shadow-sm shadow-sky-200"
            : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          All Enquiry
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${activeTab === "all" ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
            }`}>
            {enquiryRows.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("callTracker")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 ${activeTab === "callTracker"
            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
            : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Call Tracker
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${activeTab === "callTracker" ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
            }`}>
            {enquiryRows.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("orderReceived")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 ${activeTab === "orderReceived"
            ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
            : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Order Received
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${activeTab === "orderReceived" ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
            }`}>
            {enquiryRows.filter(r => String(r["Tracker Status"] || "").trim() === "Yes").length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("orderNotReceived")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 ${activeTab === "orderNotReceived"
            ? "bg-rose-600 text-white shadow-sm shadow-rose-200"
            : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Order Not Received
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${activeTab === "orderNotReceived" ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
            }`}>
            {enquiryRows.filter(r => String(r["Tracker Status"] || "").trim() === "Tracker No" || String(r["Tracker Status"] || "").trim() === "No").length}
          </span>
        </button>
      </div>

      {/* ── Main Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h2 className="text-[15px] font-bold text-slate-800">
              {activeTab === "all" ? "All Enquiry"
                : activeTab === "callTracker" ? "Call Tracker"
                  : activeTab === "orderReceived" ? "Order Received"
                    : "Order Not Received"}
            </h2>
            {!isLoading && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {filteredRows.length} record{filteredRows.length !== 1 ? "s" : ""} found
              </p>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-20 text-slate-400">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-slate-200 border-t-sky-500 mb-3"></div>
            <p className="text-[13px] font-medium">Loading from NBD ENQUIRY FMS...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {/* Call button column — only on Call Tracker tab */}
                  {activeTab === "callTracker" && (
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-indigo-600 uppercase tracking-widest whitespace-nowrap w-24">
                      Action
                    </th>
                  )}
                  {/* Cancel button column — only on Order Not Received tab */}
                  {activeTab === "orderNotReceived" && (
                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-rose-600 uppercase tracking-widest whitespace-nowrap w-24">
                      Action
                    </th>
                  )}
                  {TABLE_COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap"
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
                        {col}
                      </th>
                    ))
                  }
                  {/* View chevron column */}
                  <th className="px-5 py-3.5 w-14"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, index) => (
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
                    {/* Cancel Action button — only on Order Not Received tab */}
                    {activeTab === "orderNotReceived" && (
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenCancelModal(row)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm shadow-rose-200 transition-colors"
                        >
                          Cancel Form
                        </button>
                      </td>
                    )}
                    {/* Data Cells */}
                    {TABLE_COLUMNS.map((col) => {
                      const val = row[col] || ""
                      return (
                        <td key={col} className="px-5 py-3.5 whitespace-nowrap" title={val}>
                          {col === "Enquiry No." ? (
                            <span className="text-[13px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg">{val || "—"}</span>
                          ) : col === "Firm Name" ? (
                            <span className="text-[13px] font-semibold text-slate-800">{val || <span className="text-slate-300">—</span>}</span>
                          ) : val ? (
                            <span className="text-[13px] text-slate-600">{val}</span>
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

                        // ── Current Stage → inline editable dropdown ──
                        if (col === "Current Stage") {
                          const isSaving = updatingStage[row._sheetRowIdx]
                          const baseOpts = masterStageOptions.length > 0
                            ? masterStageOptions
                            : ["Initial Contact", "Qualified", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"]
                          const allOpts = val && !baseOpts.includes(val) ? [val, ...baseOpts] : baseOpts
                          return (
                            <td key={col} className="px-3 py-2.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={val}
                                  disabled={isSaving}
                                  onChange={(e) => handleInlineStageUpdate(row, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-8 px-2 pr-6 border border-indigo-200 rounded-lg text-[12px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 cursor-pointer transition-all"
                                >
                                  <option value="">— Select —</option>
                                  {allOpts.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                </select>
                                {isSaving && (
                                  <div className="animate-spin h-3.5 w-3.5 border-2 border-indigo-300 border-t-indigo-600 rounded-full flex-shrink-0" />
                                )}
                              </div>
                            </td>
                          )
                        }

                        return (
                          <td key={col} className="px-5 py-3.5 whitespace-nowrap" title={val}>
                            {col === "Tracker Status" && val ? (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${val === "Yes"
                                ? "bg-emerald-100 text-emerald-700"
                                : val === "Tracker No" || val === "No"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-slate-100 text-slate-600"
                                }`}>
                                {val}
                              </span>
                            ) : val ? (
                              <span className="text-[13px] text-slate-500">{val}</span>
                            ) : (
                              <span className="text-slate-300 text-[13px]">—</span>
                            )}
                          </td>
                        )
                      })
                    }
                    {/* Chevron — View full details */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenViewModal(row)}
                        title="View Details"
                        className="p-2 text-slate-300 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors group-hover:text-slate-400"
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
                        (activeTab === "callTracker" || activeTab === "orderNotReceived" ? 1 : 0) + // Action button col
                        1 // chevron col
                      }
                      className="px-6 py-20 text-center"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-slate-600">
                            {searchTerm ? `No results for "${searchTerm}"` : "No enquiry data found"}
                          </p>
                          <p className="text-[12px] text-slate-400 mt-1">Try adjusting your search or refresh the data</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}

export default CallTracker