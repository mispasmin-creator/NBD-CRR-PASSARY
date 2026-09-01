"use client"

import { useState, useEffect, useContext, useCallback, useMemo } from "react"
import { AuthContext } from "../App"
import axios from "axios"
import {
  SearchIcon,
  XCircleIcon,
  RefreshCwIcon,
  ShoppingCartIcon,
  SlidersIcon,
  HistoryIcon,
  AlertTriangleIcon,
  FileTextIcon,
} from "../components/Icons"
import { X, Send, CheckCircle2, Download } from "lucide-react"
import Pagination from "../components/ui/Pagination"
import { exportToCsv } from "../utils/exportCsv"
import { getCurrentTimestamp, reformatIfDate } from "../utils/dateTime"

const PAGE_SIZE = 10

// Helper to format ISO date to display format
const displayDate = (dateVal) => {
  if (!dateVal) return ""
  try {
    return reformatIfDate(dateVal)
  } catch {
    return dateVal
  }
}

// Main workflow tabs
const MAIN_TABS = [
  { key: "all", label: "All", icon: FileTextIcon },
  { key: "notReceivedOrder", label: "Not Received Order Data", icon: XCircleIcon },
  { key: "getSample", label: "Get Sample Of Material", icon: ShoppingCartIcon },
  { key: "testing", label: "Testing Of Material", icon: SlidersIcon },
  { key: "takeAction", label: "Take Action", icon: AlertTriangleIcon },
  { key: "history", label: "History", icon: HistoryIcon },
]

const SOURCE_TABS = ["All", "Order Not Received", "NBD Lead", "NBD Enquiry", "CRR Enquiry"]

const SOURCE_BADGE_CLASSES = {
  "Order Not Received": "bg-rose-100 text-rose-800 border border-rose-200",
  "NBD Lead": "bg-sky-100 text-sky-800 border border-sky-200",
  "NBD Enquiry": "bg-indigo-100 text-indigo-800 border border-indigo-200",
  "CRR Enquiry": "bg-amber-100 text-amber-800 border border-amber-200",
}

// Which pipeline stage a record is currently sitting at (mirrors the
// activeMainTabRecords partitioning logic below).
const getRecordStage = (r) => {
  if (!r.isSubmitted) return "notReceivedOrder"
  if (!r.status1 || r.status1 === "-") return "getSample"
  if (!r.actual2 || r.actual2 === "-") return "testing"
  if (!r.actual3 || r.actual3 === "-") return "takeAction"
  return "history"
}

// The "Planned N" column that represents the due date for whichever stage a
// record is currently at — so whoever owns that stage knows by when they
// need to act, instead of seeing every stage's planned date at once.
const getDueDateForRecord = (r) => {
  const stage = getRecordStage(r)
  const val = stage === "getSample" ? r.planned1
    : stage === "testing" ? r.planned2
    : stage === "takeAction" ? r.planned3
    : ""
  return (!val || val === "-") ? "" : val
}

function OrderNotReceivedFMS() {
  const { showNotification } = useContext(AuthContext)
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("All")
  const [page, setPage] = useState(1)
  const [activeMainTab, setActiveMainTab] = useState("all")

  // Modal and Form States for "Order Not Received" Action Popup
  const [showActionModal, setShowActionModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [formData, setFormData] = useState({
    enquiryNo: "",
    firmName: "",
    companyName: "",
    productName: "",
    qty: "",
    nameOfFms: "NBD Lead",
    totalEnquiryValue: "",
    givenToWhom: "",
    rate: "",
    whyNotReceived: "",
    haveToTakeSample: "No",
    status: "Order Not Received",
  })

  // Modal and Form States for "Get Sample Of Material" Action Popup
  const [showSampleModal, setShowSampleModal] = useState(false)
  const [sampleRecord, setSampleRecord] = useState(null)
  const [sampleStatus, setSampleStatus] = useState("Sample Taken")

  // Modal and Form States for "Testing Of Material" Action Popup
  const [showTestingModal, setShowTestingModal] = useState(false)
  const [testingRecord, setTestingRecord] = useState(null)

  // Modal and Form States for "Take Action" Action Popup
  const [showTakeActionModal, setShowTakeActionModal] = useState(false)
  const [takeActionRecord, setTakeActionRecord] = useState(null)
  const [actionRemarks, setActionRemarks] = useState("")

  // ── Fetch & merge data from Order Not Received Sheet, NBD Lead, NBD Enquiry & CRR Enquiry ──
  const fetchAllData = useCallback(async () => {
    setIsLoading(true)
    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
      const onrSheetName = import.meta.env.VITE_ORDER_NOT_RECEIVED_SHEET_NAME || "Order Not Received"
      const fmsSheetName = import.meta.env.VITE_FMS_SHEET_NAME || "FMS"
      const nbdEnquirySheetName = import.meta.env.VITE_NBD_ENQUIRY_SHEET_NAME || "NBD ENQUIRY FMS"
      const crrEnquirySheetName = import.meta.env.VITE_CRR_ENQUIRY_SHEET_NAME || "ENQUIRY FMS"

      if (!scriptUrl) {
        showNotification && showNotification("Google Sheets configuration missing in .env", "error")
        setIsLoading(false)
        return
      }

      const [resOnr, resLead, resEnquiry, resCrr] = await Promise.all([
        axios.get(`${scriptUrl}?sheet=${encodeURIComponent(onrSheetName)}&t=${Date.now()}`).catch(() => null),
        axios.get(`${scriptUrl}?sheet=${encodeURIComponent(fmsSheetName)}&t=${Date.now()}`).catch(() => null),
        axios.get(`${scriptUrl}?sheet=${encodeURIComponent(nbdEnquirySheetName)}&t=${Date.now()}`).catch(() => null),
        axios.get(`${scriptUrl}?sheet=${encodeURIComponent(crrEnquirySheetName)}&t=${Date.now()}`).catch(() => null),
      ])

      // 0. Order Not Received Sheet (Main Tracking Sheet)
      let onrSheetRecords = []
      const submittedEnquirySet = new Set()

      if (resOnr?.data?.success && Array.isArray(resOnr.data.data)) {
        const allRows = resOnr.data.data
        let headerRowIndex = 4 // default row 5
        for (let i = 0; i < Math.min(allRows.length, 10); i++) {
          const row = (allRows[i] || []).map((c) => String(c || "").trim())
          if (
            row.some(
              (cell) =>
                cell.toLowerCase().includes("enquiry no of fms") ||
                cell.toLowerCase().includes("onr-00") ||
                cell.toLowerCase().includes("why us not received order")
            )
          ) {
            headerRowIndex = i
            break
          }
        }
        const dataRows = allRows.slice(headerRowIndex + 1)

        onrSheetRecords = dataRows
          .map((row, idx) => {
            if (!row || !row.some((cell) => cell && cell.toString().trim() !== "")) return null
            const timestamp = row[0] ? displayDate(row[0]) : ""
            const onrNo = String(row[1] || "").trim()
            const enquiryNo = String(row[2] || "").trim()
            const firmName = String(row[3] || "").trim()
            const companyName = String(row[4] || "").trim()
            const productName = String(row[5] || "").trim()
            const qty = String(row[6] || "").trim()
            const nameOfFms = String(row[7] || "").trim() || "Order Not Received"
            const totalEnquiryValue = String(row[8] || "").trim()
            const givenToWhom = String(row[9] || "").trim()
            const rate = String(row[10] || "").trim()
            const whyNotReceived = String(row[11] || "").trim()
            const haveToTakeSample = String(row[12] || "").trim()
            const status = String(row[13] || "").trim()
            const planned1 = String(row[14] || "").trim()
            const actual1 = row[15] ? displayDate(row[15]) : ""
            const delay1 = String(row[16] || "").trim()
            const status1 = String(row[17] || "").trim()
            const planned2 = String(row[18] || "").trim()
            const actual2 = row[19] ? displayDate(row[19]) : ""
            const delay2 = String(row[20] || "").trim()
            const planned3 = String(row[21] || "").trim()
            const actual3 = row[22] ? displayDate(row[22]) : ""
            const delay3 = String(row[23] || "").trim()
            const actionRemarksVal = String(row[24] || "").trim()

            if (enquiryNo) submittedEnquirySet.add(enquiryNo.toLowerCase())
            if (onrNo) submittedEnquirySet.add(onrNo.toLowerCase())

            return {
              key: `onr-sheet-${idx}`,
              sheetRowIndex: headerRowIndex + 1 + idx + 1, // 1-indexed row number in Google Sheet
              id: enquiryNo || onrNo || `ONR-${idx + 1}`,
              onrNo: onrNo,
              enquiryNo: enquiryNo,
              source: nameOfFms || "Order Not Received",
              isSubmitted: true,
              timestamp: timestamp,
              firmName: firmName || companyName,
              companyName: companyName || firmName,
              partyName: givenToWhom || "-",
              salesPerson: "-",
              department: "-",
              location: "-",
              product: productName,
              productName: productName,
              qty: qty,
              totalEnquiryValue: totalEnquiryValue,
              givenToWhom: givenToWhom,
              rate: rate,
              whyNotReceived: whyNotReceived,
              haveToTakeSample: haveToTakeSample,
              remark: whyNotReceived,
              status: status || "Order Not Received",
              planned1: planned1,
              actual1: actual1,
              delay1: delay1,
              status1: status1,
              planned2: planned2,
              actual2: actual2,
              delay2: delay2,
              planned3: planned3,
              actual3: actual3,
              delay3: delay3,
              actionRemarks: actionRemarksVal,
            }
          })
          .filter(Boolean)
      }

      const isAlreadySubmitted = (id, enqNo) => {
        const idStr = String(id || "").trim().toLowerCase()
        const enqStr = String(enqNo || "").trim().toLowerCase()
        return (idStr && submittedEnquirySet.has(idStr)) || (enqStr && submittedEnquirySet.has(enqStr))
      }

      // 1. NBD Lead (FMS sheet) - only unsubmitted rows
      let leadRecords = []
      if (resLead?.data?.success && Array.isArray(resLead.data.data)) {
        const rows = resLead.data.data.slice(6)
        leadRecords = rows
          .filter((row) => row && row[0] && String(row[18] || "").trim() === "Cancel")
          .map((row, idx) => {
            const id = String(row[1] || "").trim() || `LEAD-${idx + 1}`
            return {
              key: `lead-${idx}`,
              id: id,
              onrNo: "-",
              enquiryNo: id,
              source: "NBD Lead",
              isSubmitted: false,
              timestamp: displayDate(row[0]),
              firmName: String(row[5] || "").trim(),
              companyName: String(row[5] || "").trim(),
              partyName: String(row[12] || "").trim(),
              salesPerson: String(row[4] || "").trim(),
              department: String(row[6] || "").trim(),
              location: String(row[7] || "").trim(),
              product: String(row[11] || "").trim(),
              productName: String(row[11] || "").trim(),
              qty: "-",
              totalEnquiryValue: "-",
              givenToWhom: "-",
              rate: "-",
              whyNotReceived: String(row[19] || "").trim(),
              haveToTakeSample: "-",
              contactNo: String(row[13] || "").trim(),
              email: String(row[14] || "").trim(),
              remark: String(row[19] || "").trim(),
              status: String(row[18] || "").trim() || "Cancel",
              planned1: "-",
              actual1: "-",
              status1: "-",
              planned2: "-",
              actual2: "-",
              delay2: "-",
              planned3: "-",
              actual3: "-",
              delay3: "-",
              actionRemarks: "-",
            }
          })
          .filter((r) => !isAlreadySubmitted(r.id, r.enquiryNo))
      }

      // 2. NBD Enquiry (NBD ENQUIRY FMS sheet) - only unsubmitted rows
      let enquiryRecords = []
      if (resEnquiry?.data?.success && Array.isArray(resEnquiry.data.data)) {
        const allRows = resEnquiry.data.data
        let headerRowIndex = 4
        for (let i = 0; i < Math.min(allRows.length, 10); i++) {
          const row = (allRows[i] || []).map((c) => String(c || "").trim())
          if (row.some((cell) => cell.toLowerCase().replace(/\.$/, "") === "enquiry no")) {
            headerRowIndex = i
            break
          }
        }
        const headerRow = (allRows[headerRowIndex] || []).map((c) => String(c || "").trim())
        const dataRows = allRows.slice(headerRowIndex + 1)

        const mappedRows = dataRows
          .map((row) => {
            if (row.every((cell) => !cell)) return null
            const obj = {}
            headerRow.forEach((h, idx) => {
              if (h) obj[h] = String(row[idx] || "").trim()
            })
            return obj
          })
          .filter(Boolean)

        enquiryRecords = mappedRows
          .filter((row) => {
            const trackerStatus = String(row["Tracker Status"] || "").trim()
            return trackerStatus === "Tracker No" || trackerStatus === "No"
          })
          .map((row, idx) => {
            const enqNo = row["Enquiry No."] || `ENQ-${idx + 1}`
            return {
              key: `enquiry-${idx}`,
              id: enqNo,
              onrNo: "-",
              enquiryNo: enqNo,
              source: "NBD Enquiry",
              isSubmitted: false,
              timestamp: row["Timestamp"] || "",
              firmName: row["Firm Name"] || row["Party Name"] || "",
              companyName: row["Firm Name"] || row["Party Name"] || "",
              partyName: row["Contact Person Name"] || "",
              salesPerson: row["Name Of Sales Person"] || "",
              department: row["Department"] || "",
              location: row["Location"] || "",
              product: row["Type Of Enquiry"] || row["Area Of Application"] || "",
              productName: row["Type Of Enquiry"] || row["Area Of Application"] || "",
              qty: "-",
              totalEnquiryValue: "-",
              givenToWhom: "-",
              rate: "-",
              whyNotReceived: row["Current Stage"] || "",
              haveToTakeSample: "-",
              contactNo: row["Contact Person Mobile No."] || "",
              email: row["Email Id"] || row["G-mail"] || "",
              remark: row["Current Stage"] || "",
              status: row["Tracker Status"] || "",
              planned1: "-",
              actual1: "-",
              status1: "-",
              planned2: "-",
              actual2: "-",
              delay2: "-",
              planned3: "-",
              actual3: "-",
              delay3: "-",
              actionRemarks: "-",
            }
          })
          .filter((r) => !isAlreadySubmitted(r.id, r.enquiryNo))
      }

      // 3. CRR Enquiry (ENQUIRY FMS sheet) - only unsubmitted rows
      let crrRecords = []
      if (resCrr?.data?.success && Array.isArray(resCrr.data.data)) {
        const allData = resCrr.data.data
        let headerRowIndex = 5
        for (let i = 0; i < Math.min(allData.length, 10); i++) {
          const row = (allData[i] || []).map((c) => String(c || "").trim().toLowerCase())
          if (row.some((cell) => cell.includes("enquiry number") || cell.includes("enquiry no") || cell.includes("firm name"))) {
            headerRowIndex = i
            break
          }
        }
        const headers = (allData[headerRowIndex] || []).map((h) => String(h || "").trim())
        const dataRows = allData.slice(headerRowIndex + 1)

        const findCrrCol = (names, fb) => {
          const nList = Array.isArray(names) ? names : [names]
          const idx = headers.findIndex((h) => {
            const clean = String(h || "").trim().toLowerCase().replace(/[\s_\-]+/g, "")
            return nList.some((t) => {
              const cleanT = t.toLowerCase().replace(/[\s_\-]+/g, "")
              return clean === cleanT || clean.includes(cleanT)
            })
          })
          return idx !== -1 ? idx : fb
        }

        const enqNoIdx = findCrrCol(["Enquiry Number", "Enquiry No"], 1)
        const firmNameIdx = findCrrCol(["Firm Name"], 2)
        const partyNameIdx = findCrrCol(["Party Names", "Party Name"], 3)
        const productNameIdx = findCrrCol(["Product Name"], 4)
        const qtyIdx = findCrrCol(["Qty"], 5)
        const deptIdx = findCrrCol(["Department"], 6)
        const salesPersonIdx = findCrrCol(["Name Of The Sales Person", "Sales Person"], 8)
        const rateMgmtIdx = findCrrCol(["Rate Mgmt", "Rate"], 18)
        const remarksMgmtIdx = findCrrCol(["Remarks From Mgmt", "Remarks"], 19)
        const status2Idx = findCrrCol(["Status 2", "Status2"], 24)
        const status4Idx = findCrrCol(["Status 4", "Status4"], 32)
        const statusIdx = findCrrCol(["Status"], 13)

        crrRecords = dataRows
          .filter((row) => {
            if (!row || !row[enqNoIdx]) return false
            const s2 = String(row[status2Idx] || "").trim().toLowerCase().replace(/[\s_\-]+/g, "")
            const s4 = String(row[status4Idx] || "").trim().toLowerCase().replace(/[\s_\-]+/g, "")
            const st = String(row[statusIdx] || "").trim().toLowerCase().replace(/[\s_\-]+/g, "")
            
            const isNotReceived =
              s2.includes("notreceive") ||
              s2.includes("notreceived") ||
              s4.includes("notreceive") ||
              s4.includes("notreceived") ||
              st.includes("notreceive") ||
              st.includes("notreceived")

            return isNotReceived
          })
          .map((row, idx) => {
            const id = String(row[enqNoIdx] || "").trim() || `ENQ-${idx + 1}`
            const qtyVal = row[qtyIdx] ? String(row[qtyIdx]).trim() : "-"
            const rateVal = row[rateMgmtIdx] ? String(row[rateMgmtIdx]).trim() : "-"
            const whyVal = row[remarksMgmtIdx] || row[status2Idx] || "Order Not Received"

            return {
              key: `crr-${idx}`,
              id: id,
              onrNo: "-",
              enquiryNo: id,
              source: "CRR Enquiry",
              isSubmitted: false,
              timestamp: displayDate(row[0]),
              firmName: String(row[firmNameIdx] || "").trim(),
              companyName: String(row[firmNameIdx] || "").trim(),
              partyName: String(row[partyNameIdx] || "").trim(),
              salesPerson: String(row[salesPersonIdx] || "").trim(),
              department: String(row[deptIdx] || "").trim(),
              location: "",
              product: String(row[productNameIdx] || "").trim(),
              productName: String(row[productNameIdx] || "").trim(),
              qty: qtyVal,
              totalEnquiryValue: "-",
              givenToWhom: String(row[salesPersonIdx] || "").trim() || "-",
              rate: rateVal,
              whyNotReceived: String(whyVal).trim(),
              haveToTakeSample: "-",
              contactNo: "",
              email: "",
              remark: String(whyVal).trim(),
              status: "Order Not Received",
              planned1: "-",
              actual1: "-",
              status1: "-",
              planned2: "-",
              actual2: "-",
              delay2: "-",
              planned3: "-",
              actual3: "-",
              delay3: "-",
              actionRemarks: "-",
            }
          })
          .filter((r) => !isAlreadySubmitted(r.id, r.enquiryNo))
          .reverse()
      }

      // Merge: Unique records only (submitted ONR sheet records + unsubmitted pending sources)
      setRecords([...onrSheetRecords.reverse(), ...leadRecords.reverse(), ...enquiryRecords, ...crrRecords])
    } catch (error) {
      console.error("Error fetching Order Not Received data:", error)
      showNotification && showNotification("Failed to fetch Order Not Received data", "error")
    } finally {
      setIsLoading(false)
    }
  }, [showNotification])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // Helper to identify history records (where take action actual3 is recorded)
  const isHistoryRecord = (r) => Boolean(r.isSubmitted && r.actual3 && r.actual3 !== "-")

  // Partition records by active main tab (FMS Pipeline stages):
  // - "notReceivedOrder": ONLY pending records (waiting to be logged into Order Not Received)
  // - "getSample": Records logged in ONR sheet waiting for Sample action
  // - "testing": Records where sample has been processed (status1 is recorded), pending testing
  // - "takeAction": Records where testing has been completed (actual2 is recorded)
  // - "history": Records where take action has been completed (actual3 is recorded)
  // - "all": Active records (excludes records completed in History)
  const activeMainTabRecords = useMemo(() => {
    if (activeMainTab === "notReceivedOrder") {
      return records.filter((r) => !r.isSubmitted)
    }
    if (activeMainTab === "getSample") {
      return records.filter((r) => r.isSubmitted && (!r.status1 || r.status1 === "-"))
    }
    if (activeMainTab === "testing") {
      return records.filter((r) => r.isSubmitted && r.status1 && r.status1 !== "-" && (!r.actual2 || r.actual2 === "-"))
    }
    if (activeMainTab === "takeAction") {
      return records.filter((r) => r.isSubmitted && r.actual2 && r.actual2 !== "-" && (!r.actual3 || r.actual3 === "-"))
    }
    if (activeMainTab === "history") {
      return records.filter(isHistoryRecord)
    }
    // "all" tab: exclude records that are in History
    return records.filter((r) => !isHistoryRecord(r))
  }, [records, activeMainTab])

  // Calculate count badges for main workflow tabs
  const getMainTabCount = (tabKey) => {
    if (tabKey === "all") return records.filter((r) => !isHistoryRecord(r)).length
    if (tabKey === "notReceivedOrder") return records.filter((r) => !r.isSubmitted).length
    if (tabKey === "getSample") return records.filter((r) => r.isSubmitted && (!r.status1 || r.status1 === "-")).length
    if (tabKey === "testing") return records.filter((r) => r.isSubmitted && r.status1 && r.status1 !== "-" && (!r.actual2 || r.actual2 === "-")).length
    if (tabKey === "takeAction") return records.filter((r) => r.isSubmitted && r.actual2 && r.actual2 !== "-" && (!r.actual3 || r.actual3 === "-")).length
    if (tabKey === "history") return records.filter(isHistoryRecord).length
    return undefined
  }

  const tabCount = (tab) => (tab === "All" ? activeMainTabRecords.length : activeMainTabRecords.filter((r) => r.source === tab).length)

  // Filter records based on active tab partitioned list, source dropdown, and search input
  const filteredRecords = useMemo(() => {
    return activeMainTabRecords.filter((r) => {
      if (activeTab !== "All" && r.source !== activeTab) return false
      if (!searchTerm) return true
      const term = searchTerm.toLowerCase()
      return [
        r.id,
        r.onrNo,
        r.enquiryNo,
        r.firmName,
        r.companyName,
        r.partyName,
        r.salesPerson,
        r.department,
        r.location,
        r.product,
        r.productName,
        r.contactNo,
        r.remark,
        r.whyNotReceived,
        r.givenToWhom,
        r.source,
        r.status,
        r.status1,
        r.actual2,
        r.actual3,
        r.actionRemarks,
      ].some((v) => v && v.toString().toLowerCase().includes(term))
    })
  }, [activeMainTabRecords, activeTab, searchTerm])

  // Reset to page 1 whenever the main tab, source tab, or search term changes
  useEffect(() => {
    setPage(1)
  }, [activeMainTab, activeTab, searchTerm])

  const paginatedRecords = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleExportRecords = () => {
    exportToCsv(`order-not-received-${activeMainTab}`, [
      { label: "ONR No.", value: (r) => r.onrNo || "" },
      { label: "Enquiry No.", value: (r) => r.enquiryNo || r.id || "" },
      { label: "Firm Name", value: (r) => r.firmName || r.companyName || "" },
      { label: "Party Name", value: (r) => r.partyName || "" },
      { label: "Product", value: (r) => r.product || r.productName || "" },
      { label: "Source", value: (r) => r.source || "" },
      { label: "Reason", value: (r) => r.whyNotReceived || r.remark || "" },
      { label: "Status", value: (r) => r.status || "" },
    ], filteredRecords)
  }

  const activeMainTabMeta = MAIN_TABS.find((t) => t.key === activeMainTab) || MAIN_TABS[0]

  // Open "Order Not Received" Action Modal with row data prefilled
  const handleOpenActionModal = (record) => {
    setFormError("")
    setFormData({
      enquiryNo: record?.enquiryNo || record?.id || "",
      firmName: record?.firmName || "",
      companyName: record?.companyName || record?.firmName || "",
      productName: record?.productName || record?.product || "",
      qty: record?.qty !== "-" ? record?.qty || "" : "",
      nameOfFms: record?.source !== "Order Not Received" ? record?.source || "NBD Lead" : "NBD Lead",
      totalEnquiryValue: record?.totalEnquiryValue !== "-" ? record?.totalEnquiryValue || "" : "",
      givenToWhom: record?.givenToWhom !== "-" ? record?.givenToWhom || "" : "",
      rate: record?.rate !== "-" ? record?.rate || "" : "",
      whyNotReceived: record?.whyNotReceived || record?.remark || "",
      haveToTakeSample: record?.haveToTakeSample === "Yes" ? "Yes" : "No",
      status: record?.status || "Order Not Received",
    })
    setShowActionModal(true)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Open "Get Sample Of Material" Action Modal
  const handleOpenSampleModal = (record) => {
    setFormError("")
    setSampleRecord(record)
    setSampleStatus(record?.status1 && record.status1 !== "-" ? record.status1 : "Sample Taken")
    setShowSampleModal(true)
  }

  // Open "Testing Of Material" Action Modal
  const handleOpenTestingModal = (record) => {
    setFormError("")
    setTestingRecord(record)
    setShowTestingModal(true)
  }

  // Open "Take Action" Action Modal
  const handleOpenTakeActionModal = (record) => {
    setFormError("")
    setTakeActionRecord(record)
    setActionRemarks(record?.actionRemarks && record.actionRemarks !== "-" ? record.actionRemarks : "")
    setShowTakeActionModal(true)
  }

  // Handle Form Submission for "Get Sample Of Material" Action Popup
  const handleSampleSubmit = async (e) => {
    e.preventDefault()
    if (!sampleRecord) return
    setIsSubmitting(true)
    setFormError("")

    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
      const sheetName = import.meta.env.VITE_ORDER_NOT_RECEIVED_SHEET_NAME || "Order Not Received"
      const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID || "1aF5orXK7u4hI9b-19mO3eiUL6TWZ91GL9uqrEDag9Cc"

      if (!scriptUrl) {
        throw new Error("Google Apps Script URL is missing in .env")
      }

      const actualTimestamp = getCurrentTimestamp()

      // Fetch latest sheet to find exact column index of "Actual 1" and "Status 1" and matching row
      const resCurrent = await axios.get(`${scriptUrl}?sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`)
      let actual1ColIdx = 16 // 1-based default (Column P)
      let status1ColIdx = 18 // 1-based default (Column R)
      let targetRowIndex = sampleRecord.sheetRowIndex

      if (resCurrent?.data?.success && Array.isArray(resCurrent.data.data)) {
        const allRows = resCurrent.data.data
        let headerRowIndex = 4
        for (let i = 0; i < Math.min(allRows.length, 10); i++) {
          const row = (allRows[i] || []).map((c) => String(c || "").trim().toLowerCase())
          if (row.some((cell) => cell.includes("actual 1") || cell.includes("actual1") || cell.includes("status 1") || cell.includes("status1"))) {
            headerRowIndex = i
            break
          }
        }

        const headers = (allRows[headerRowIndex] || []).map((h) => String(h || "").trim().toLowerCase())
        const foundActual1Idx = headers.findIndex((h) => h === "actual 1" || h === "actual1")
        if (foundActual1Idx !== -1) actual1ColIdx = foundActual1Idx + 1

        const foundStatus1Idx = headers.findIndex((h) => h === "status 1" || h === "status1")
        if (foundStatus1Idx !== -1) status1ColIdx = foundStatus1Idx + 1

        // Match targetRowIndex by ONR No or Enquiry No
        const onrNoToMatch = String(sampleRecord.onrNo || "").trim().toLowerCase()
        const enqNoToMatch = String(sampleRecord.enquiryNo || sampleRecord.id || "").trim().toLowerCase()

        for (let r = headerRowIndex + 1; r < allRows.length; r++) {
          const row = allRows[r] || []
          const rOnr = String(row[1] || "").trim().toLowerCase()
          const rEnq = String(row[2] || "").trim().toLowerCase()
          if ((onrNoToMatch && onrNoToMatch !== "-" && rOnr && rOnr === onrNoToMatch) || (enqNoToMatch && rEnq && rEnq === enqNoToMatch)) {
            targetRowIndex = r + 1 // 1-indexed row number in Google Sheets
            break
          }
        }
      }

      if (!targetRowIndex) {
        throw new Error("Target row index in sheet not found")
      }

      // 1. Update Actual 1 (Timestamp)
      const actualPayload = new URLSearchParams()
      actualPayload.append("action", "updateCell")
      actualPayload.append("sheetName", sheetName)
      actualPayload.append("spreadsheetId", spreadsheetId)
      actualPayload.append("rowIndex", String(targetRowIndex))
      actualPayload.append("columnIndex", String(actual1ColIdx))
      actualPayload.append("value", actualTimestamp)
      await axios.post(scriptUrl, actualPayload)

      // 2. Update Status 1 (Selected Status)
      const statusPayload = new URLSearchParams()
      statusPayload.append("action", "updateCell")
      statusPayload.append("sheetName", sheetName)
      statusPayload.append("spreadsheetId", spreadsheetId)
      statusPayload.append("rowIndex", String(targetRowIndex))
      statusPayload.append("columnIndex", String(status1ColIdx))
      statusPayload.append("value", sampleStatus)
      await axios.post(scriptUrl, statusPayload)

      showNotification && showNotification(`Sample status "${sampleStatus}" updated successfully!`, "success")
      setShowSampleModal(false)

      // Refresh table data immediately
      await fetchAllData()

      // Move to "Testing Of Material" stage tab
      setActiveMainTab("testing")
    } catch (err) {
      console.error("Failed to update sample status:", err)
      setFormError(`Failed to submit: ${err.message || err.toString()}`)
      showNotification && showNotification("Failed to submit: " + (err.message || err.toString()), "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Form Submission for "Testing Of Material" Action Popup (Saves timestamp into Actual 2)
  const handleTestingSubmit = async (e) => {
    e.preventDefault()
    if (!testingRecord) return
    setIsSubmitting(true)
    setFormError("")

    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
      const sheetName = import.meta.env.VITE_ORDER_NOT_RECEIVED_SHEET_NAME || "Order Not Received"
      const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID || "1aF5orXK7u4hI9b-19mO3eiUL6TWZ91GL9uqrEDag9Cc"

      if (!scriptUrl) {
        throw new Error("Google Apps Script URL is missing in .env")
      }

      const actual2Timestamp = getCurrentTimestamp()

      // Fetch latest sheet to find exact column index of "Actual 2" and matching row
      const resCurrent = await axios.get(`${scriptUrl}?sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`)
      let actual2ColIdx = 20 // 1-based default (Column T)
      let targetRowIndex = testingRecord.sheetRowIndex

      if (resCurrent?.data?.success && Array.isArray(resCurrent.data.data)) {
        const allRows = resCurrent.data.data
        let headerRowIndex = 4
        for (let i = 0; i < Math.min(allRows.length, 10); i++) {
          const row = (allRows[i] || []).map((c) => String(c || "").trim().toLowerCase())
          if (row.some((cell) => cell.includes("actual 2") || cell.includes("actual2"))) {
            headerRowIndex = i
            break
          }
        }

        const headers = (allRows[headerRowIndex] || []).map((h) => String(h || "").trim().toLowerCase())
        const foundActual2Idx = headers.findIndex((h) => h === "actual 2" || h === "actual2" || h.startsWith("actual 2"))
        if (foundActual2Idx !== -1) actual2ColIdx = foundActual2Idx + 1

        // Match target row by ONR No or Enquiry No
        const onrNoToMatch = String(testingRecord.onrNo || "").trim().toLowerCase()
        const enqNoToMatch = String(testingRecord.enquiryNo || testingRecord.id || "").trim().toLowerCase()

        for (let r = headerRowIndex + 1; r < allRows.length; r++) {
          const row = allRows[r] || []
          const rOnr = String(row[1] || "").trim().toLowerCase()
          const rEnq = String(row[2] || "").trim().toLowerCase()
          if ((onrNoToMatch && onrNoToMatch !== "-" && rOnr && rOnr === onrNoToMatch) || (enqNoToMatch && rEnq && rEnq === enqNoToMatch)) {
            targetRowIndex = r + 1 // 1-indexed row number in Google Sheets
            break
          }
        }
      }

      if (!targetRowIndex) {
        throw new Error("Target row index in sheet not found")
      }

      // Update Actual 2 cell (Timestamp)
      const actual2Payload = new URLSearchParams()
      actual2Payload.append("action", "updateCell")
      actual2Payload.append("sheetName", sheetName)
      actual2Payload.append("spreadsheetId", spreadsheetId)
      actual2Payload.append("rowIndex", String(targetRowIndex))
      actual2Payload.append("columnIndex", String(actual2ColIdx))
      actual2Payload.append("value", actual2Timestamp)
      await axios.post(scriptUrl, actual2Payload)

      showNotification && showNotification("Testing of Material timestamp saved in Actual 2!", "success")
      setShowTestingModal(false)

      // Refresh table data immediately
      await fetchAllData()

      // Move to "Take Action" stage tab
      setActiveMainTab("takeAction")
    } catch (err) {
      console.error("Failed to update Actual 2 timestamp:", err)
      setFormError(`Failed to submit: ${err.message || err.toString()}`)
      showNotification && showNotification("Failed to submit: " + (err.message || err.toString()), "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Form Submission for "Take Action" Action Popup (Saves timestamp into Actual 3 & Remarks into Remarks column)
  const handleTakeActionSubmit = async (e) => {
    e.preventDefault()
    if (!takeActionRecord) return
    setIsSubmitting(true)
    setFormError("")

    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
      const sheetName = import.meta.env.VITE_ORDER_NOT_RECEIVED_SHEET_NAME || "Order Not Received"
      const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID || "1aF5orXK7u4hI9b-19mO3eiUL6TWZ91GL9uqrEDag9Cc"

      if (!scriptUrl) {
        throw new Error("Google Apps Script URL is missing in .env")
      }

      const actual3Timestamp = getCurrentTimestamp()

      // Fetch latest sheet to find exact column index of "Actual 3" and "Remarks" and matching row
      const resCurrent = await axios.get(`${scriptUrl}?sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`)
      let actual3ColIdx = 23 // 1-based default (Column W)
      let remarksColIdx = 25 // 1-based default (Column Y)
      let targetRowIndex = takeActionRecord.sheetRowIndex

      if (resCurrent?.data?.success && Array.isArray(resCurrent.data.data)) {
        const allRows = resCurrent.data.data
        let headerRowIndex = 4
        for (let i = 0; i < Math.min(allRows.length, 10); i++) {
          const row = (allRows[i] || []).map((c) => String(c || "").trim().toLowerCase())
          if (row.some((cell) => cell.includes("actual 3") || cell.includes("actual3") || cell.includes("remark"))) {
            headerRowIndex = i
            break
          }
        }

        const headers = (allRows[headerRowIndex] || []).map((h) => String(h || "").trim().toLowerCase())
        
        const foundActual3Idx = headers.findIndex((h) => h === "actual 3" || h === "actual3" || h.replace(/\s+/g, " ") === "actual 3" || h.startsWith("actual 3"))
        if (foundActual3Idx !== -1) actual3ColIdx = foundActual3Idx + 1

        const foundRemarksIdx = headers.findIndex((h) => h === "remarks" || h === "remark" || h.includes("remark"))
        if (foundRemarksIdx !== -1) remarksColIdx = foundRemarksIdx + 1

        // Match target row by ONR No or Enquiry No
        const onrNoToMatch = String(takeActionRecord.onrNo || "").trim().toLowerCase()
        const enqNoToMatch = String(takeActionRecord.enquiryNo || takeActionRecord.id || "").trim().toLowerCase()

        for (let r = headerRowIndex + 1; r < allRows.length; r++) {
          const row = allRows[r] || []
          const rOnr = String(row[1] || "").trim().toLowerCase()
          const rEnq = String(row[2] || "").trim().toLowerCase()
          if ((onrNoToMatch && onrNoToMatch !== "-" && rOnr && rOnr === onrNoToMatch) || (enqNoToMatch && rEnq && rEnq === enqNoToMatch)) {
            targetRowIndex = r + 1 // 1-indexed row number in Google Sheets
            break
          }
        }
      }

      if (!targetRowIndex) {
        throw new Error("Target row index in sheet not found")
      }

      // 1. Update Actual 3 (Timestamp)
      const actual3Payload = new URLSearchParams()
      actual3Payload.append("action", "updateCell")
      actual3Payload.append("sheetName", sheetName)
      actual3Payload.append("spreadsheetId", spreadsheetId)
      actual3Payload.append("rowIndex", String(targetRowIndex))
      actual3Payload.append("columnIndex", String(actual3ColIdx))
      actual3Payload.append("value", actual3Timestamp)
      await axios.post(scriptUrl, actual3Payload)

      // 2. Update Remarks
      const remarksPayload = new URLSearchParams()
      remarksPayload.append("action", "updateCell")
      remarksPayload.append("sheetName", sheetName)
      remarksPayload.append("spreadsheetId", spreadsheetId)
      remarksPayload.append("rowIndex", String(targetRowIndex))
      remarksPayload.append("columnIndex", String(remarksColIdx))
      remarksPayload.append("value", actionRemarks)
      await axios.post(scriptUrl, remarksPayload)

      showNotification && showNotification("Take Action data saved in Actual 3 & Remarks successfully!", "success")
      setShowTakeActionModal(false)

      // Refresh table data immediately
      await fetchAllData()
    } catch (err) {
      console.error("Failed to update Take Action data:", err)
      setFormError(`Failed to submit: ${err.message || err.toString()}`)
      showNotification && showNotification("Failed to submit: " + (err.message || err.toString()), "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Form Submission to "Order Not Received" Google Sheet
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormError("")
    setIsSubmitting(true)

    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
      const sheetName = import.meta.env.VITE_ORDER_NOT_RECEIVED_SHEET_NAME || "Order Not Received"
      const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID || "1aF5orXK7u4hI9b-19mO3eiUL6TWZ91GL9uqrEDag9Cc"

      if (!scriptUrl) {
        throw new Error("Google Apps Script URL is missing in .env")
      }

      // 1. Fetch current rows of "Order Not Received" sheet to find the first available row starting from Row 6
      const resCurrent = await axios.get(`${scriptUrl}?sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`)
      let targetRowIndex = 6 // Default to row 6 (1-indexed)

      if (resCurrent?.data?.success && Array.isArray(resCurrent.data.data)) {
        const allRows = resCurrent.data.data
        let headerRowIndex = 4 // Default row 5
        for (let i = 0; i < Math.min(allRows.length, 10); i++) {
          const row = (allRows[i] || []).map((c) => String(c || "").trim().toLowerCase())
          if (row.some((cell) => cell.includes("enquiry no of fms") || cell.includes("onr-00") || cell.includes("why us not received order"))) {
            headerRowIndex = i
            break
          }
        }

        const startDataRow = headerRowIndex + 1 // Index in 0-indexed array (Row 6 is index 5)
        let foundEmpty = false
        for (let r = startDataRow; r < allRows.length; r++) {
          const row = allRows[r] || []
          const col0 = String(row[0] || "").trim() // Timestamp
          const col2 = String(row[2] || "").trim() // Enquiry No
          const col3 = String(row[3] || "").trim() // Firm Name
          if (!col0 && !col2 && !col3) {
            targetRowIndex = r + 1 // 1-indexed sheet row number (e.g. Row 6)
            foundEmpty = true
            break
          }
        }
        if (!foundEmpty) {
          targetRowIndex = allRows.length + 1
        }
      }

      const timestampStr = getCurrentTimestamp()

      // Sheet Column Layout for "Order Not Received":
      // Index 0: Timestamp (automatic)
      // Index 1: ONR-00 (formula in sheet, keep blank)
      // Index 2: Enquiry No Of FMS
      // Index 3: Firm Name
      // Index 4: Name Of Company
      // Index 5: Product Name
      // Index 6: Qty
      // Index 7: Name Of FMS
      // Index 8: Total Enquiry Value
      // Index 9: Given To Whom
      // Index 10: Rate
      // Index 11: Why Us Not Received Order
      // Index 12: Have To  Take Sample ?
      // Index 13: Status
      // Index 14: Planned 1 (formula in sheet - do NOT write)
      const sheetRow = new Array(14).fill("")
      sheetRow[0] = timestampStr
      sheetRow[1] = "" // ONR-00 calculated via formula in sheet
      sheetRow[2] = formData.enquiryNo || ""
      sheetRow[3] = formData.firmName || ""
      sheetRow[4] = formData.companyName || ""
      sheetRow[5] = formData.productName || ""
      sheetRow[6] = formData.qty || ""
      sheetRow[7] = formData.nameOfFms || ""
      sheetRow[8] = formData.totalEnquiryValue || ""
      sheetRow[9] = formData.givenToWhom || ""
      sheetRow[10] = formData.rate || ""
      sheetRow[11] = formData.whyNotReceived || ""
      sheetRow[12] = formData.haveToTakeSample || "No"
      sheetRow[13] = formData.status || "Order Not Received"

      const payload = new URLSearchParams()
      payload.append("action", "update")
      payload.append("sheetName", sheetName)
      payload.append("spreadsheetId", spreadsheetId)
      payload.append("rowIndex", String(targetRowIndex))
      payload.append("rowData", JSON.stringify(sheetRow))

      const res = await axios.post(scriptUrl, payload)
      if (res.data && res.data.success === false) {
        throw new Error(res.data.error || "Submission rejected by spreadsheet server")
      }

      showNotification && showNotification(`Order Not Received form submitted successfully!`, "success")
      setShowActionModal(false)

      // Refresh table data immediately
      await fetchAllData()

      // Automatically switch to "Get Sample Of Material" tab to display submitted data
      setActiveMainTab("getSample")
    } catch (err) {
      console.error("Submission failed:", err)
      setFormError(`Failed to submit: ${err.message || err.toString()}`)
      showNotification && showNotification("Failed to submit: " + (err.message || err.toString()), "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Main Workflow Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-1.5 mb-8 w-full justify-center border border-slate-200 shadow-sm">
        {MAIN_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeMainTab === tab.key
          const count = getMainTabCount(tab.key)
          return (
            <button
              key={tab.key}
              onClick={() => setActiveMainTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold leading-5 transition-all duration-200 whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-rose-50 text-rose-700 shadow-sm ring-1 ring-rose-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "" : "text-gray-400"}`} />
              {tab.label}
              {count !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isActive ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {activeMainTab !== "all" &&
      activeMainTab !== "notReceivedOrder" &&
      activeMainTab !== "getSample" &&
      activeMainTab !== "testing" &&
      activeMainTab !== "takeAction" &&
      activeMainTab !== "history" ? (
        <div className="bg-card rounded-2xl shadow-md border border-slate-200/70 p-16 flex flex-col items-center justify-center text-center">
          <activeMainTabMeta.icon className="h-12 w-12 text-gray-300 mb-4" />
          <h2 className="text-lg font-bold text-gray-700 mb-1">{activeMainTabMeta.label}</h2>
          <p className="text-sm text-gray-400 max-w-md">
            This tab will be wired up once the sheet & form details are provided.
          </p>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="bg-card rounded-2xl shadow-sm border border-slate-200/70 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
                <div className="relative flex-1 max-w-md w-full">
                  <input
                    type="text"
                    placeholder="Search by ONR No, Enquiry No, Firm, Product, Reason..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full !pl-10 !pr-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <SearchIcon className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
                </div>
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md bg-card text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {SOURCE_TABS.map((tab) => (
                    <option key={tab} value={tab}>
                      {tab} ({tabCount(tab)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportRecords}
                  disabled={isLoading || filteredRecords.length === 0}
                  className="inline-flex items-center gap-2 bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted font-medium py-2 px-4 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
                <button
                  onClick={fetchAllData}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition-colors cursor-pointer"
                >
                  <RefreshCwIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-2xl shadow-md border border-slate-200/70 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-muted/60 flex justify-between items-center">
              <div>
                <h2 className="text-[15px] font-bold text-foreground">
                  {activeMainTab === "getSample"
                    ? "Get Sample Of Material (Stage 1)"
                    : activeMainTab === "testing"
                    ? "Testing Of Material (Stage 2)"
                    : activeMainTab === "takeAction"
                    ? "Take Action (Stage 3)"
                    : activeMainTab === "history"
                    ? "Order Not Received History"
                    : activeMainTab === "notReceivedOrder"
                    ? "Not Received Order Data (Pending Enquiries)"
                    : "All Order Not Received Records"}
                </h2>
                {!isLoading && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""} found
                  </p>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col justify-center items-center py-20 text-muted-foreground">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-border border-t-rose-500 mb-3"></div>
                <p className="text-[13px] font-medium">Loading Order Not Received data...</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gradient-to-r from-rose-50 to-red-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-center text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                          Action
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                          Timestamp
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                          ONR-00
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                          Enquiry No Of FMS
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                          Firm Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                          Name Of Company
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                          Product Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                          Name Of FMS
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                          Total Enquiry Value
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                          Given To Whom
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                          Rate
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                          Why Us Not Received Order
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                          Have To Take Sample ?
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                          Status
                        </th>
                        {(activeMainTab === "getSample" || activeMainTab === "testing" || activeMainTab === "takeAction" || activeMainTab === "all") && (
                          <th className="px-4 py-3 text-left text-xs font-bold text-amber-700 uppercase tracking-wider whitespace-nowrap">
                            Due Date
                          </th>
                        )}
                        {(activeMainTab === "getSample" || activeMainTab === "testing" || activeMainTab === "takeAction" || activeMainTab === "history" || activeMainTab === "all") && (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                              Actual 1
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                              Sample Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                              Actual 2
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                              Actual 3
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-rose-700 uppercase tracking-wider whitespace-nowrap">
                              Remarks
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={21} className="px-4 py-16 text-center">
                            <div className="flex flex-col items-center justify-center text-gray-400">
                              <XCircleIcon className="h-10 w-10 mb-3 text-gray-300" />
                              <p className="text-lg font-semibold text-gray-500">
                                {activeMainTab === "getSample"
                                  ? "No pending sample records found."
                                  : activeMainTab === "testing"
                                  ? "No records in Testing Of Material pending action."
                                  : activeMainTab === "takeAction"
                                  ? "No records in Take Action pending action."
                                  : activeMainTab === "history"
                                  ? "No completed records in History yet."
                                  : activeMainTab === "notReceivedOrder"
                                  ? "No pending records found. All enquiries have been processed!"
                                  : "No Order Not Received records found"}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedRecords.map((r) => (
                          <tr key={r.key} className="hover:bg-rose-50/30 transition-all duration-150">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              {activeMainTab === "takeAction" ? (
                                r.actual3 && r.actual3 !== "-" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg">
                                    <CheckCircle2 size={13} className="text-emerald-600" /> Action Taken
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenTakeActionModal(r)}
                                    className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                  >
                                    Action
                                  </button>
                                )
                              ) : activeMainTab === "testing" ? (
                                r.actual2 && r.actual2 !== "-" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg">
                                    <CheckCircle2 size={13} className="text-emerald-600" /> Tested
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenTestingModal(r)}
                                    className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                  >
                                    Action
                                  </button>
                                )
                              ) : activeMainTab === "getSample" ? (
                                r.status1 && r.status1 !== "-" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSampleModal(r)}
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs ${
                                      r.status1 === "Sample Taken"
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                                        : "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                                    }`}
                                    title="Click to change sample status"
                                  >
                                    <CheckCircle2 size={13} /> {r.status1}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSampleModal(r)}
                                    className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                  >
                                    Action
                                  </button>
                                )
                              ) : r.isSubmitted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg">
                                  <CheckCircle2 size={13} className="text-emerald-600" /> Logged
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenActionModal(r)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                  Action
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                              {r.timestamp || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {r.onrNo && r.onrNo !== "-" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs bg-rose-100 text-rose-800 border border-rose-200">
                                  {r.onrNo}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                                {r.enquiryNo || r.id || "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-900">
                              {r.firmName || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                              {r.companyName || r.firmName || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                              {r.productName || r.product || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 font-medium">
                              {r.qty || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  SOURCE_BADGE_CLASSES[r.source] || "bg-gray-100 text-gray-700 border border-gray-200"
                                }`}
                              >
                                {r.source}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 font-medium">
                              {r.totalEnquiryValue || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                              {r.givenToWhom || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                              {r.rate || "-"}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate" title={r.whyNotReceived || r.remark}>
                              {r.whyNotReceived || r.remark || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs">
                              {r.haveToTakeSample === "Yes" ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">Yes</span>
                              ) : r.haveToTakeSample === "No" ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-600">No</span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs">
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                {r.status || "-"}
                              </span>
                            </td>
                            {(activeMainTab === "getSample" || activeMainTab === "testing" || activeMainTab === "takeAction" || activeMainTab === "all") && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                {getDueDateForRecord(r) ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 ring-1 ring-amber-200 text-xs font-bold">
                                    {getDueDateForRecord(r)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
                              </td>
                            )}
                            {(activeMainTab === "getSample" || activeMainTab === "testing" || activeMainTab === "takeAction" || activeMainTab === "history" || activeMainTab === "all") && (
                              <>
                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 font-mono">
                                  {r.actual1 || "-"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs">
                                  {r.status1 && r.status1 !== "-" ? (
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                        r.status1 === "Sample Taken"
                                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                          : "bg-amber-100 text-amber-800 border border-amber-200"
                                      }`}
                                    >
                                      {r.status1}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 font-mono">
                                  {r.actual2 || "-"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 font-mono">
                                  {r.actual3 || "-"}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate" title={r.actionRemarks}>
                                  {r.actionRemarks || "-"}
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 p-4">
                  {filteredRecords.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-sm font-semibold">
                        {activeMainTab === "getSample"
                          ? "No pending sample records found."
                          : activeMainTab === "testing"
                          ? "No records in Testing Of Material pending action."
                          : activeMainTab === "takeAction"
                          ? "No records in Take Action pending action."
                          : activeMainTab === "history"
                          ? "No completed records in History yet."
                          : activeMainTab === "notReceivedOrder"
                          ? "No pending records found. All enquiries have been processed!"
                          : "No Order Not Received records found"}
                      </p>
                    </div>
                  ) : (
                    filteredRecords.map((r) => (
                      <div key={r.key} className="bg-card rounded-xl shadow-lg border border-gray-100 p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-1.5">
                            {r.onrNo && r.onrNo !== "-" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs bg-rose-100 text-rose-800 border border-rose-200">
                                {r.onrNo}
                              </span>
                            )}
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                              {r.enquiryNo || r.id || "-"}
                            </span>
                          </div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              SOURCE_BADGE_CLASSES[r.source] || "bg-gray-100 text-gray-700 border border-gray-200"
                            }`}
                          >
                            {r.source}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-2">{r.firmName || "-"}</h3>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">Company:</span>{" "}
                            <span className="text-gray-700">{r.companyName || "-"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Product:</span>{" "}
                            <span className="text-gray-700">{r.productName || r.product || "-"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Qty:</span>{" "}
                            <span className="text-gray-700">{r.qty || "-"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Enquiry Value:</span>{" "}
                            <span className="text-gray-700">{r.totalEnquiryValue || "-"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Given To:</span>{" "}
                            <span className="text-gray-700">{r.givenToWhom || "-"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Rate:</span>{" "}
                            <span className="text-gray-700">{r.rate || "-"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Date:</span>{" "}
                            <span className="text-gray-700">{r.timestamp || "-"}</span>
                          </div>
                          {(activeMainTab === "getSample" || activeMainTab === "testing" || activeMainTab === "takeAction" || activeMainTab === "all") && (
                            <div>
                              <span className="text-gray-400">Due Date:</span>{" "}
                              <span className="text-amber-800 font-bold">{getDueDateForRecord(r) || "-"}</span>
                            </div>
                          )}
                          {(activeMainTab === "getSample" || activeMainTab === "testing" || activeMainTab === "takeAction" || activeMainTab === "history" || activeMainTab === "all") && (
                            <>
                              <div>
                                <span className="text-gray-400">Actual 1:</span>{" "}
                                <span className="text-gray-700">{r.actual1 || "-"}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Sample Status:</span>{" "}
                                <span className="text-gray-700 font-semibold">{r.status1 || "-"}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Actual 2:</span>{" "}
                                <span className="text-gray-700">{r.actual2 || "-"}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Actual 3:</span>{" "}
                                <span className="text-gray-700">{r.actual3 || "-"}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-gray-400">Remarks:</span>{" "}
                                <span className="text-gray-700">{r.actionRemarks || "-"}</span>
                              </div>
                            </>
                          )}
                          <div className="col-span-2">
                            <span className="text-gray-400">Reason:</span>{" "}
                            <span className="text-gray-700">{r.whyNotReceived || r.remark || "-"}</span>
                          </div>
                          <div className="col-span-2 flex justify-between items-center">
                            <span className="font-semibold text-red-700">{r.status || "-"}</span>
                            {r.haveToTakeSample === "Yes" && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Sample Needed</span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end mt-3 pt-2 border-t border-gray-100">
                          {activeMainTab === "takeAction" ? (
                            r.actual3 && r.actual3 !== "-" ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg">
                                <CheckCircle2 size={13} className="text-emerald-600" /> Action Taken
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenTakeActionModal(r)}
                                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                              >
                                Action
                              </button>
                            )
                          ) : activeMainTab === "testing" ? (
                            r.actual2 && r.actual2 !== "-" ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg">
                                <CheckCircle2 size={13} className="text-emerald-600" /> Tested
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenTestingModal(r)}
                                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                              >
                                Action
                              </button>
                            )
                          ) : activeMainTab === "getSample" ? (
                            r.status1 && r.status1 !== "-" ? (
                              <button
                                type="button"
                                onClick={() => handleOpenSampleModal(r)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                                  r.status1 === "Sample Taken"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-amber-100 text-amber-800 border border-amber-300"
                                }`}
                              >
                                <CheckCircle2 size={13} /> {r.status1}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenSampleModal(r)}
                                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                              >
                                Action
                              </button>
                            )
                          ) : r.isSubmitted ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg">
                              <CheckCircle2 size={13} className="text-emerald-600" /> Logged
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenActionModal(r)}
                              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                            >
                              Action
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
            {!isLoading && filteredRecords.length > 0 && (
              <Pagination page={page} pageSize={PAGE_SIZE} totalItems={filteredRecords.length} onPageChange={setPage} />
            )}
          </div>
        </>
      )}

      {/* Modal 1: Order Not Received Form Popup */}
      {showActionModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => !isSubmitting && setShowActionModal(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden w-full max-w-2xl mx-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-rose-700 px-6 py-4 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2">
                <FileTextIcon className="h-5 w-5 text-white" />
                <h2 className="text-base md:text-lg font-bold tracking-tight">Order Not Received Form</h2>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setShowActionModal(false)}
                disabled={isSubmitting}
                className="text-white hover:text-rose-200 transition-colors p-1 cursor-pointer disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-semibold flex items-center gap-2">
                    <AlertTriangleIcon className="h-4 w-4 shrink-0" /> {formError}
                  </div>
                )}

                {/* 1. Enquiry No Of FMS * (Auto-Fetched) */}
                <div className="bg-muted/40 p-4 rounded-xl border border-border shadow-2xs space-y-1.5 opacity-90">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-foreground">
                      Enquiry No Of FMS <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">Auto-Fetched</span>
                  </div>
                  <input
                    type="text"
                    name="enquiryNo"
                    readOnly
                    disabled
                    value={formData.enquiryNo}
                    className="w-full px-3 py-2 border-b border-border text-sm text-muted-foreground bg-transparent cursor-not-allowed outline-none"
                  />
                </div>

                {/* 2. Firm Name * (Auto-Fetched) */}
                <div className="bg-muted/40 p-4 rounded-xl border border-border shadow-2xs space-y-1.5 opacity-90">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-foreground">
                      Firm Name <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">Auto-Fetched</span>
                  </div>
                  <input
                    type="text"
                    name="firmName"
                    readOnly
                    disabled
                    value={formData.firmName}
                    className="w-full px-3 py-2 border-b border-border text-sm text-muted-foreground bg-transparent cursor-not-allowed outline-none"
                  />
                </div>

                {/* 3. Name Of Company * (Auto-Fetched) */}
                <div className="bg-muted/40 p-4 rounded-xl border border-border shadow-2xs space-y-1.5 opacity-90">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-foreground">
                      Name Of Company <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">Auto-Fetched</span>
                  </div>
                  <input
                    type="text"
                    name="companyName"
                    readOnly
                    disabled
                    value={formData.companyName}
                    className="w-full px-3 py-2 border-b border-border text-sm text-muted-foreground bg-transparent cursor-not-allowed outline-none"
                  />
                </div>

                {/* 4. Product Name * (Auto-Fetched) */}
                <div className="bg-muted/40 p-4 rounded-xl border border-border shadow-2xs space-y-1.5 opacity-90">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-foreground">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">Auto-Fetched</span>
                  </div>
                  <input
                    type="text"
                    name="productName"
                    readOnly
                    disabled
                    value={formData.productName}
                    className="w-full px-3 py-2 border-b border-border text-sm text-muted-foreground bg-transparent cursor-not-allowed outline-none"
                  />
                </div>

                {/* 5. Qty * */}
                <div className="bg-card p-4 rounded-xl border border-border shadow-2xs space-y-1.5">
                  <label className="block text-xs font-semibold text-foreground">
                    Qty <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="qty"
                    required
                    placeholder="Your answer"
                    value={formData.qty}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border-b border-border focus:border-rose-600 focus:outline-none text-sm text-foreground bg-transparent transition-colors"
                  />
                </div>

                {/* 6. Name Of FMS * (Auto-Fetched) */}
                <div className="bg-muted/40 p-4 rounded-xl border border-border shadow-2xs space-y-1.5 opacity-90">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-foreground">
                      Name Of FMS <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">Auto-Fetched</span>
                  </div>
                  <input
                    type="text"
                    name="nameOfFms"
                    readOnly
                    disabled
                    value={formData.nameOfFms}
                    className="w-full px-3 py-2 border-b border-border text-sm text-muted-foreground bg-transparent cursor-not-allowed outline-none"
                  />
                </div>

                {/* 7. Total Enquiry Value * */}
                <div className="bg-card p-4 rounded-xl border border-border shadow-2xs space-y-1.5">
                  <label className="block text-xs font-semibold text-foreground">
                    Total Enquiry Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="totalEnquiryValue"
                    required
                    placeholder="Your answer"
                    value={formData.totalEnquiryValue}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border-b border-border focus:border-rose-600 focus:outline-none text-sm text-foreground bg-transparent transition-colors"
                  />
                </div>

                {/* 8. Given To Whom & Rate */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card p-4 rounded-xl border border-border shadow-2xs space-y-1.5">
                    <label className="block text-xs font-semibold text-foreground">
                      Given To Whom
                    </label>
                    <input
                      type="text"
                      name="givenToWhom"
                      placeholder="Your answer"
                      value={formData.givenToWhom}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border-b border-border focus:border-rose-600 focus:outline-none text-sm text-foreground bg-transparent transition-colors"
                    />
                  </div>

                  <div className="bg-card p-4 rounded-xl border border-border shadow-2xs space-y-1.5">
                    <label className="block text-xs font-semibold text-foreground">
                      Rate
                    </label>
                    <input
                      type="text"
                      name="rate"
                      placeholder="Your answer"
                      value={formData.rate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border-b border-border focus:border-rose-600 focus:outline-none text-sm text-foreground bg-transparent transition-colors"
                    />
                  </div>
                </div>

                {/* 9. Why Us Not Received Order * */}
                <div className="bg-card p-4 rounded-xl border border-border shadow-2xs space-y-1.5">
                  <label className="block text-xs font-semibold text-foreground">
                    Why Us Not Received Order <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="whyNotReceived"
                    required
                    rows={3}
                    placeholder="Your answer"
                    value={formData.whyNotReceived}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 text-sm text-foreground bg-card resize-none"
                  />
                </div>

                {/* 10. Have To Take Sample ? & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card p-4 rounded-xl border border-border shadow-2xs space-y-1.5">
                    <label className="block text-xs font-semibold text-foreground">
                      Have To Take Sample ? <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="haveToTakeSample"
                      required
                      value={formData.haveToTakeSample}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  <div className="bg-card p-4 rounded-xl border border-border shadow-2xs space-y-1.5">
                    <label className="block text-xs font-semibold text-foreground">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                    >
                      <option value="Order Not Received">Order Not Received</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Lost">Lost</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 justify-end border-t border-border px-6 py-4 shrink-0 bg-card">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground font-semibold text-xs md:text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs md:text-sm rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Submit and Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Get Sample Of Material Action Popup */}
      {showSampleModal && sampleRecord && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => !isSubmitting && setShowSampleModal(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden w-full max-w-lg mx-auto flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-rose-700 px-6 py-4 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCartIcon className="h-5 w-5 text-white" />
                <h2 className="text-base md:text-lg font-bold tracking-tight">Get Sample Of Material</h2>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setShowSampleModal(false)}
                disabled={isSubmitting}
                className="text-white hover:text-rose-200 transition-colors p-1 cursor-pointer disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSampleSubmit} className="flex flex-col">
              <div className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-semibold flex items-center gap-2">
                    <AlertTriangleIcon className="h-4 w-4 shrink-0" /> {formError}
                  </div>
                )}

                {/* Record Info Summary */}
                <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">ONR No / Enquiry:</span>
                    <span className="font-bold font-mono bg-rose-50 text-rose-800 px-2 py-0.5 rounded border border-rose-200">
                      {sampleRecord.onrNo && sampleRecord.onrNo !== "-" ? sampleRecord.onrNo : sampleRecord.enquiryNo || sampleRecord.id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Firm Name:</span>
                    <span className="font-semibold text-foreground">{sampleRecord.firmName || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Product:</span>
                    <span className="font-semibold text-foreground">{sampleRecord.productName || sampleRecord.product || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Planned 1:</span>
                    <span className="font-mono text-foreground">{sampleRecord.planned1 || "-"}</span>
                  </div>
                </div>

                {/* Status Dropdown * */}
                <div className="bg-card p-4 rounded-xl border border-border shadow-2xs space-y-2">
                  <label className="block text-xs font-semibold text-foreground">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="sampleStatus"
                    required
                    value={sampleStatus}
                    onChange={(e) => setSampleStatus(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 font-medium"
                  >
                    <option value="Sample Taken">Sample Taken</option>
                    <option value="Sample not taken">Sample not taken</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 justify-end border-t border-border px-6 py-4 shrink-0 bg-card">
                <button
                  type="button"
                  onClick={() => setShowSampleModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground font-semibold text-xs md:text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs md:text-sm rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Submit and Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Testing Of Material Action Popup */}
      {showTestingModal && testingRecord && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => !isSubmitting && setShowTestingModal(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden w-full max-w-lg mx-auto flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-rose-700 px-6 py-4 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2">
                <SlidersIcon className="h-5 w-5 text-white" />
                <h2 className="text-base md:text-lg font-bold tracking-tight">Testing Of Material</h2>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setShowTestingModal(false)}
                disabled={isSubmitting}
                className="text-white hover:text-rose-200 transition-colors p-1 cursor-pointer disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleTestingSubmit} className="flex flex-col">
              <div className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-semibold flex items-center gap-2">
                    <AlertTriangleIcon className="h-4 w-4 shrink-0" /> {formError}
                  </div>
                )}

                {/* Record Details Display */}
                <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">ONR No / Enquiry:</span>
                    <span className="font-bold font-mono bg-rose-50 text-rose-800 px-2 py-0.5 rounded border border-rose-200">
                      {testingRecord.onrNo && testingRecord.onrNo !== "-" ? testingRecord.onrNo : testingRecord.enquiryNo || testingRecord.id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Firm Name:</span>
                    <span className="font-semibold text-foreground">{testingRecord.firmName || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Company Name:</span>
                    <span className="font-semibold text-foreground">{testingRecord.companyName || testingRecord.firmName || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Product:</span>
                    <span className="font-semibold text-foreground">{testingRecord.productName || testingRecord.product || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Qty:</span>
                    <span className="font-medium text-foreground">{testingRecord.qty || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Sample Status:</span>
                    <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {testingRecord.status1 || "Sample Taken"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Sample Date (Actual 1):</span>
                    <span className="font-mono text-foreground">{testingRecord.actual1 || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Planned 2 Date:</span>
                    <span className="font-mono text-foreground">{testingRecord.planned2 || "-"}</span>
                  </div>
                </div>

                <div className="p-3 bg-rose-50/70 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-rose-600 shrink-0" />
                  <span>Clicking <b>Submit and Save</b> will record current timestamp in <b>Actual 2</b>.</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 justify-end border-t border-border px-6 py-4 shrink-0 bg-card">
                <button
                  type="button"
                  onClick={() => setShowTestingModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground font-semibold text-xs md:text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs md:text-sm rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Submit and Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Take Action Action Popup */}
      {showTakeActionModal && takeActionRecord && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => !isSubmitting && setShowTakeActionModal(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden w-full max-w-lg mx-auto flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-rose-700 px-6 py-4 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="h-5 w-5 text-white" />
                <h2 className="text-base md:text-lg font-bold tracking-tight">Take Action</h2>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setShowTakeActionModal(false)}
                disabled={isSubmitting}
                className="text-white hover:text-rose-200 transition-colors p-1 cursor-pointer disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleTakeActionSubmit} className="flex flex-col">
              <div className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-semibold flex items-center gap-2">
                    <AlertTriangleIcon className="h-4 w-4 shrink-0" /> {formError}
                  </div>
                )}

                {/* Record Details Display */}
                <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">ONR No / Enquiry:</span>
                    <span className="font-bold font-mono bg-rose-50 text-rose-800 px-2 py-0.5 rounded border border-rose-200">
                      {takeActionRecord.onrNo && takeActionRecord.onrNo !== "-" ? takeActionRecord.onrNo : takeActionRecord.enquiryNo || takeActionRecord.id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Firm Name:</span>
                    <span className="font-semibold text-foreground">{takeActionRecord.firmName || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Company Name:</span>
                    <span className="font-semibold text-foreground">{takeActionRecord.companyName || takeActionRecord.firmName || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Product:</span>
                    <span className="font-semibold text-foreground">{takeActionRecord.productName || takeActionRecord.product || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Qty:</span>
                    <span className="font-medium text-foreground">{takeActionRecord.qty || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Testing Done Date (Actual 2):</span>
                    <span className="font-mono text-foreground">{takeActionRecord.actual2 || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Planned 3 Date:</span>
                    <span className="font-mono text-foreground">{takeActionRecord.planned3 || "-"}</span>
                  </div>
                </div>

                {/* Remarks Input */}
                <div className="bg-card p-4 rounded-xl border border-border shadow-2xs space-y-1.5">
                  <label className="block text-xs font-semibold text-foreground">
                    Remarks <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="actionRemarks"
                    required
                    rows={3}
                    placeholder="Enter action remarks..."
                    value={actionRemarks}
                    onChange={(e) => setActionRemarks(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 text-sm text-foreground bg-card resize-none"
                  />
                </div>

                <div className="p-3 bg-rose-50/70 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-rose-600 shrink-0" />
                  <span>Clicking <b>Submit and Save</b> will record current timestamp in <b>Actual 3</b> & save remarks in <b>Remarks</b>.</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 justify-end border-t border-border px-6 py-4 shrink-0 bg-card">
                <button
                  type="button"
                  onClick={() => setShowTakeActionModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground font-semibold text-xs md:text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs md:text-sm rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Submit and Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderNotReceivedFMS
