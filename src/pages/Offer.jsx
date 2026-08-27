"use client"

import { useState, useEffect, useContext, useCallback } from "react"
import {
    UsersIcon,
    TrendingUpIcon,
    ShareIcon,
    AlertCircleIcon,
    PhoneCallIcon,
    MessageSquareIcon,
    RefreshCwIcon,
    HistoryIcon,
    XIcon
} from "../components/Icons"
import { AuthContext } from "../App"
import axios from "axios"
import { Download } from "lucide-react"
import Pagination from "../components/ui/Pagination"
import { exportToCsv } from "../utils/exportCsv"

const PAGE_SIZE = 10

const TABS = [
    { id: "All Enquiries", label: "All" },
    { id: "Get Rates & Attached Offer Letter", label: "Rates & Offer Letter" },
    { id: "Check The Offer Letter In Accounts", label: "Accounts Check" },
    { id: "Check The Offer Letter In Sales Person", label: "Sales Check" },
    { id: "Technical Discussion When Accounts and Sales Approved Offer Letter", label: "Tech Discussion" },
    { id: "Send Offer Letter", label: "Send Offer" },
    { id: "History", label: "History" }
]

const TAB_CONFIG = {
    "Get Rates & Attached Offer Letter": {
        filterNotEmpty: 6, // Planned 1
        filterEmpty: 7,    // Actual1
        timestampCol: 7,
        inputColumns: [
            { key: 'offerLetter', label: 'Upload Offer Letter', storeCol: 9, type: 'file' }
        ],
        icon: <TrendingUpIcon className="h-4 w-4" />,
        colorClass: "bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200",
        badgeClass: "bg-teal-100 text-teal-700"
    },
    "Check The Offer Letter In Accounts": {
        filterNotEmpty: 10, // Planned 3
        filterEmpty: 11,    // Actual3
        timestampCol: 11,
        inputColumns: [
            { key: 'status', label: 'Status', storeCol: 13, type: 'select', options: ['Yes', 'No'] },
            { key: 'remarks', label: 'Remarks', storeCol: 14 }
        ],
        icon: <AlertCircleIcon className="h-4 w-4" />,
        colorClass: "bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-200",
        badgeClass: "bg-amber-100 text-amber-700"
    },
    "Check The Offer Letter In Sales Person": {
        filterNotEmpty: 15, // Planned 4
        filterEmpty: 16,    // Actual4
        timestampCol: 16,
        inputColumns: [
            { key: 'status2', label: 'Status', storeCol: 18, type: 'select', options: ['Yes', 'No'] },
            { key: 'remarks2', label: 'Remarks', storeCol: 19 }
        ],
        icon: <PhoneCallIcon className="h-4 w-4" />,
        colorClass: "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200",
        badgeClass: "bg-indigo-100 text-indigo-700"
    },
    "Technical Discussion When Accounts and Sales Approved Offer Letter": {
        filterNotEmpty: 20, // Planned 5
        filterEmpty: 21,    // Actual5
        timestampCol: 21,
        inputColumns: [
            { key: 'offerLetter', label: 'Upload Offer Letter', storeCol: 9, type: 'file' }
        ],
        icon: <MessageSquareIcon className="h-4 w-4" />,
        colorClass: "bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-200",
        badgeClass: "bg-violet-100 text-violet-700"
    },
    "Send Offer Letter": {
        filterNotEmpty: 25, // Planned 2
        filterEmpty: 26,    // Actual2
        timestampCol: 26,
        inputColumns: [],
        icon: <ShareIcon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary shadow-sm ring-1 ring-emerald-200",
        badgeClass: "bg-emerald-100 text-primary"
    }
}

const BASE_COLUMNS = [
    "Stage",
    "Enquiry No.",
    "Firm Name",
    "Party Name",
    "Offer Number",
    "Offer Letter",
]

const getDriveFileId = (url) => {
    if (!url) return null
    const str = String(url)
    const match1 = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (match1) return match1[1]
    const match2 = str.match(/[?&]id=([a-zA-Z0-9_-]+)/)
    if (match2) return match2[1]
    return null
}

const getPreviewImageUrl = (url) => {
    if (!url) return ""
    const fileId = getDriveFileId(url)
    if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`
    }
    return url
}

const getOfferLetterUrl = (row) => {
    if (!row) return ""
    if (row.rawRow && row.rawRow[9]) {
        const val = String(row.rawRow[9]).trim()
        if (val) return val
    }
    const keys = ["Upload Offer Letter", "Offer Letter", "Offer Image", "OfferLetter", "offerLetter"]
    for (const k of keys) {
        if (row[k] && String(row[k]).trim()) return String(row[k]).trim()
    }
    return ""
}

function Offer() {
    const { showNotification } = useContext(AuthContext)
    const [searchTerm, setSearchTerm] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [offerRows, setOfferRows] = useState([])
    const [activeTab, setActiveTab] = useState("All Enquiries")
    const [page, setPage] = useState(1)

    // Modal state
    const [isStageModalOpen, setIsStageModalOpen] = useState(false)
    const [modalLead, setModalLead] = useState(null)
    const [modalActiveTab, setModalActiveTab] = useState("")
    const [modalFormData, setModalFormData] = useState({})
    const [isModalSubmitting, setIsModalSubmitting] = useState(false)

    /**
     * Helper to format dates consistently for Google Sheets.
     */
    const formatISODateToCustom = (dateVal) => {
        if (dateVal === null || dateVal === undefined) return null
        if (!dateVal) return ""
        if (typeof dateVal === 'string' && (dateVal.includes('T') || dateVal.match(/^\d{4}-\d{2}-\d{2}/))) {
            const d = new Date(dateVal)
            if (isNaN(d.getTime())) return dateVal
            const hours = d.getHours()
            const minutes = d.getMinutes().toString().padStart(2, '0')
            const seconds = d.getSeconds().toString().padStart(2, '0')
            return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${hours}:${minutes}:${seconds}`
        }
        return dateVal
    }

    const getCurrentTimestamp = () => {
        return formatISODateToCustom(new Date().toISOString())
    }

    const parseEnquiryNo = (val) => {
        if (!val) return 0
        const match = String(val).match(/\d+/)
        return match ? parseInt(match[0]) : 0
    }

    const uploadFileToDrive = async (file) => {
        const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
        const folderId = import.meta.env.VITE_NBD_DRIVE_FOLDER_ID

        if (!scriptUrl || !folderId) throw new Error("Drive config missing in .env")

        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result.split(",")[1])
            reader.onerror = reject
            reader.readAsDataURL(file)
        })

        const payload = new URLSearchParams()
        payload.append("action", "uploadFile")
        payload.append("fileName", file.name)
        payload.append("mimeType", file.type)
        payload.append("base64Data", base64)
        payload.append("folderId", folderId)

        const response = await axios.post(scriptUrl, payload)
        if (response.data && response.data.success) {
            return response.data.fileUrl || response.data.url
        }
        throw new Error(response.data?.error || "File upload failed")
    }

    const fetchOfferData = useCallback(async () => {
        const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
        const sheetName = import.meta.env.VITE_NBD_OFFER_FMS_SHEET_NAME

        if (!scriptUrl || !sheetName) {
            showNotification("Offer sheet config missing in .env", "error")
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            const response = await axios.get(`${scriptUrl}?sheet=${sheetName}&t=${new Date().getTime()}`)
            if (!response.data || !response.data.success) throw new Error("Failed to fetch sheet data")

            const allRows = response.data.data || []

            // Header is in row 5 (index 4)
            const headerRow = allRows[4] || []
            const dataRows = allRows.slice(5)

            const mapped = dataRows
                .map((row, index) => {
                    const rowObj = {}
                    headerRow.forEach((h, i) => {
                        if (h) rowObj[h.trim()] = row[i] ? row[i].toString().trim() : ""
                    })

                    rowObj._originalIndex = index
                    rowObj._sheetRowIdx = index + 5
                    rowObj.rawRow = row

                    return rowObj
                })
                .filter(r => r["Enquiry No."] || r["Firm Name"])
                .sort((a, b) => parseEnquiryNo(b["Enquiry No."]) - parseEnquiryNo(a["Enquiry No."]))

            setOfferRows(mapped)
        } catch (error) {
            console.error("Error fetching offer data:", error)
            showNotification("Could not fetch offer data", "error")
        } finally {
            setIsLoading(false)
        }
    }, [showNotification])

    useEffect(() => {
        fetchOfferData()
    }, [fetchOfferData])

    const isHistoryRow = (row) => {
        const lastConfig = TAB_CONFIG["Send Offer Letter"]
        const lastActual = row.rawRow?.[lastConfig.filterEmpty]
        return Boolean(lastActual && String(lastActual).trim() !== "")
    }

    const isStageActive = (row, tabId) => {
        if (tabId === "Check The Offer Letter In Sales Person") {
            const actual3 = row.rawRow?.[11] // Accounts Check Actual3
            const planned4 = row.rawRow?.[15] // Sales Check Planned4
            const actual4 = row.rawRow?.[16] // Sales Check Actual4
            const isAccountsDone = (actual3 && String(actual3).trim() !== "") || (planned4 && String(planned4).trim() !== "")
            const isSalesPending = !actual4 || String(actual4).trim() === ""
            return isAccountsDone && isSalesPending
        }
        if (tabId === "Technical Discussion When Accounts and Sales Approved Offer Letter") {
            const actual4 = row.rawRow?.[16] // Sales Check Actual4
            const planned5 = row.rawRow?.[20] // Tech Discussion Planned5
            const actual5 = row.rawRow?.[21] // Tech Discussion Actual5
            const isSalesDone = (actual4 && String(actual4).trim() !== "") || (planned5 && String(planned5).trim() !== "")
            const isTechPending = !actual5 || String(actual5).trim() === ""
            return isSalesDone && isTechPending
        }
        if (tabId === "Send Offer Letter") {
            const actual5 = row.rawRow?.[21] // Tech Discussion Actual5
            const planned2 = row.rawRow?.[25] // Send Offer Planned2
            const actual2 = row.rawRow?.[26] // Send Offer Actual2
            const isTechDone = (actual5 && String(actual5).trim() !== "") || (planned2 && String(planned2).trim() !== "")
            const isSendPending = !actual2 || String(actual2).trim() === ""
            return isTechDone && isSendPending
        }
        const config = TAB_CONFIG[tabId]
        if (!config) return false
        const notEmptyVal = row.rawRow?.[config.filterNotEmpty]
        const emptyVal = row.rawRow?.[config.filterEmpty]
        return notEmptyVal && String(notEmptyVal).trim() !== "" &&
            (!emptyVal || String(emptyVal).trim() === "")
    }

    const getTabCount = (tabId) => {
        if (tabId === "All Enquiries") return offerRows.filter(row => !isHistoryRow(row)).length

        if (tabId === "History") {
            return offerRows.filter(isHistoryRow).length
        }

        return offerRows.filter(row => isStageActive(row, tabId)).length
    }

    const filteredRows = offerRows.filter(row => {
        const matchesSearch = Object.values(row).some(
            val => typeof val === 'string' && val.toLowerCase().includes(searchTerm.toLowerCase())
        )
        if (!matchesSearch) return false

        if (activeTab === "All Enquiries") {
            // Exclude rows that are in the History tab
            return !isHistoryRow(row)
        }

        if (activeTab === "History") {
            return isHistoryRow(row)
        }

        return isStageActive(row, activeTab)
    })

    // Reset to page 1 whenever the active tab or search term changes
    useEffect(() => {
        setPage(1)
    }, [activeTab, searchTerm])

    const paginatedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const handleExport = () => {
        exportToCsv(`offers-${activeTab.replace(/\s+/g, "-").toLowerCase()}`, [
            { label: "Enquiry No.", value: (r) => r["Enquiry No."] || "" },
            { label: "Firm Name", value: (r) => r["Firm Name"] || "" },
            { label: "Party Name", value: (r) => r["Party Name"] || "" },
            { label: "Offer Number", value: (r) => r["Offer Number"] || "" },
        ], filteredRows)
    }

    const isActionTab = !!TAB_CONFIG[activeTab]
    const currentTabConfig = TAB_CONFIG[activeTab]

    const columnsToRender = activeTab === "Check The Offer Letter In Sales Person"
        ? [...BASE_COLUMNS, "Accounts Status", "Accounts Remarks"]
        : activeTab === "Technical Discussion When Accounts and Sales Approved Offer Letter"
        ? [...BASE_COLUMNS, "Accounts Status", "Accounts Remarks", "Sales Status", "Sales Remarks"]
        : BASE_COLUMNS

    const handleModalSubmit = async (e) => {
        e.preventDefault()
        if (!modalLead || !modalActiveTab) return

        setIsModalSubmitting(true)
        const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
        const sheetName = import.meta.env.VITE_NBD_OFFER_FMS_SHEET_NAME
        const timestamp = getCurrentTimestamp()
        const config = TAB_CONFIG[modalActiveTab]
        const targetRowIndex = modalLead._sheetRowIdx + 1

        try {
            // 1. Update only the timestamp cell (1-indexed columnIndex)
            const tsPayload = new URLSearchParams()
            tsPayload.append('action', 'updateCell')
            tsPayload.append('sheetName', sheetName)
            tsPayload.append('rowIndex', targetRowIndex.toString())
            tsPayload.append('columnIndex', (config.timestampCol + 1).toString())
            tsPayload.append('value', timestamp)
            await axios.post(scriptUrl, tsPayload)

            // 2. Update only the specific input columns (handle file upload if needed)
            for (const inputConfig of config.inputColumns) {
                let valueToStore = modalFormData[inputConfig.key] || ""

                // If Account Check and status is Yes, remarks should be empty
                if (modalActiveTab === "Check The Offer Letter In Accounts" && inputConfig.key === "remarks" && modalFormData.status === "Yes") {
                    valueToStore = ""
                }
                // If Sales Check and status2 is Yes, remarks2 should be empty
                if (modalActiveTab === "Check The Offer Letter In Sales Person" && inputConfig.key === "remarks2" && modalFormData.status2 === "Yes") {
                    valueToStore = ""
                }

                if (inputConfig.type === 'file') {
                    if (valueToStore instanceof File) {
                        try {
                            valueToStore = await uploadFileToDrive(valueToStore)
                        } catch (err) {
                            console.error("Upload failed for modal row:", err)
                            showNotification(`Upload failed for ${modalLead["Enquiry No."]}`, "error")
                            valueToStore = ""
                        }
                    } else {
                        // Skip updating file column if no new file is uploaded
                        continue
                    }
                }

                const inputPayload = new URLSearchParams()
                inputPayload.append('action', 'updateCell')
                inputPayload.append('sheetName', sheetName)
                inputPayload.append('rowIndex', targetRowIndex.toString())
                inputPayload.append('columnIndex', (inputConfig.storeCol + 1).toString())
                inputPayload.append('value', valueToStore)
                await axios.post(scriptUrl, inputPayload)
            }

            showNotification(`Stage updated successfully!`, "success")
            setIsStageModalOpen(false)
            setModalFormData({})
            fetchOfferData()
        } catch (error) {
            console.error("Error submitting modal update:", error)
            showNotification("Failed to update row. Please try again.", "error")
        } finally {
            setIsModalSubmitting(false)
        }
    }

    return (
        <div className="py-2 min-h-screen">
            {/* Tabs */}
            <div className="flex space-x-2 rounded-2xl bg-white p-1.5 mb-8 w-fit mx-auto overflow-x-auto border border-slate-200 shadow-sm">
                {TABS.map((tab) => {
                    const count = getTabCount(tab.id)
                    const isActive = activeTab === tab.id
                    const config = TAB_CONFIG[tab.id] || (tab.id === "History" ? {
                        icon: <HistoryIcon className="h-4 w-4" />,
                        colorClass: "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-200",
                        badgeClass: "bg-emerald-100 text-emerald-700"
                    } : {
                        icon: <UsersIcon className="h-4 w-4" />,
                        colorClass: "bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-200",
                        badgeClass: "bg-sky-100 text-sky-700"
                    })

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold leading-5 transition-all duration-200 whitespace-nowrap cursor-pointer
                                ${isActive ? config.colorClass : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}
                            `}
                        >
                            <span className={`${isActive ? '' : 'text-gray-400'}`}>
                                {config.icon || <UsersIcon className="h-4 w-4" />}
                            </span>
                            {tab.label}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isActive ? config.badgeClass : "bg-gray-100 text-gray-500"}`}>
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Controls */}
            <div className="bg-card rounded-2xl shadow-sm border border-slate-200/70 p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div className="flex flex-col sm:flex-row gap-4 flex-1">
                        <input
                            type="text"
                            placeholder="Search enquiries by Firm, Party, Offer Number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 min-w-[250px] flex-1 max-w-md"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleExport}
                            disabled={isLoading || filteredRows.length === 0}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted font-bold rounded-xl shadow-sm transition-all text-sm whitespace-nowrap cursor-pointer disabled:opacity-50"
                        >
                            <Download className="h-4 w-4" />
                            Export
                        </button>
                        <button
                            onClick={fetchOfferData}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted font-bold rounded-xl shadow-sm transition-all text-sm whitespace-nowrap cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-200/70 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-muted/80 border-b border-border">
                                {isActionTab && (
                                    <th className="px-6 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest text-center whitespace-nowrap">
                                        Action
                                    </th>
                                )}
                                {columnsToRender.map((col) => (
                                    <th key={col} className="px-6 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columnsToRender.length + (isActionTab ? 1 : 0)} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative h-12 w-12">
                                                <div className="absolute inset-0 border-4 border-sky-100 rounded-full"></div>
                                                <div className="absolute inset-0 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                            <p className="text-sm font-semibold text-muted-foreground animate-pulse">Synchronizing offer data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={columnsToRender.length + (isActionTab ? 1 : 0)} className="px-6 py-20 text-center">
                                        <div className="bg-muted rounded-2xl p-8 inline-block">
                                            <UsersIcon className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                            <p className="text-sm font-bold text-muted-foreground italic">No enquiries found in this segment.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedRows.map((row) => {
                                    const originalIdx = offerRows.findIndex(r => r === row)

                                    return (
                                        <tr key={originalIdx} className="hover:bg-muted/50 transition-colors group">
                                            {isActionTab && (
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setModalLead(row)
                                                            setModalActiveTab(activeTab)
                                                            
                                                            // Prefill existing values
                                                            const initialValues = {}
                                                            if (currentTabConfig) {
                                                                currentTabConfig.inputColumns.forEach(col => {
                                                                    const val = row.rawRow?.[col.storeCol]
                                                                    if (val && col.type !== 'file') {
                                                                        initialValues[col.key] = String(val).trim()
                                                                    }
                                                                })
                                                            }
                                                            setModalFormData(initialValues)
                                                            setIsStageModalOpen(true)
                                                        }}
                                                        className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                                    >
                                                        Action
                                                    </button>
                                                </td>
                                            )}
                                            {columnsToRender.map((col) => {
                                                let val = row[col]
                                                let displayContent = val || <span className="text-slate-300 font-normal">N/A</span>

                                                // Handle stage badges in "All Enquiries" and "History" tabs
                                                if (col === "Stage" && (activeTab === "All Enquiries" || activeTab === "History")) {
                                                    if (activeTab === "History") {
                                                        displayContent = (
                                                            <span className="px-3 py-1 bg-emerald-100 text-primary rounded-lg text-[12px] font-bold">
                                                                Completed
                                                            </span>
                                                        )
                                                    } else {
                                                        let currentStageId = "New"
                                                        let isCompleted = false
                                                        for (let i = 1; i < TABS.length; i++) {
                                                            const tab = TABS[i]
                                                            if (tab.id === "History") continue
                                                            const config = TAB_CONFIG[tab.id]
                                                            if (!config) continue
                                                            const notEmptyVal = row.rawRow?.[config.filterNotEmpty]
                                                            const emptyVal = row.rawRow?.[config.filterEmpty]

                                                            if (notEmptyVal && String(notEmptyVal).trim() !== "" &&
                                                                (!emptyVal || String(emptyVal).trim() === "")) {
                                                                currentStageId = tab.id
                                                                break
                                                            }
                                                        }

                                                        if (currentStageId === "New") {
                                                            const lastConfig = TAB_CONFIG["Send Offer Letter"]
                                                            const lastActual = row.rawRow?.[lastConfig.filterEmpty]
                                                            if (lastActual && String(lastActual).trim() !== "") {
                                                                isCompleted = true
                                                                currentStageId = "Completed"
                                                            }
                                                        }

                                                        if (isCompleted) {
                                                            displayContent = (
                                                                <span className="px-3 py-1 bg-emerald-100 text-primary rounded-lg text-[12px] font-bold">
                                                                    Completed
                                                                </span>
                                                            )
                                                        } else if (currentStageId === "New") {
                                                            displayContent = (
                                                                <span className="px-3 py-1 bg-muted/50 text-muted-foreground rounded-lg text-[12px] font-bold">
                                                                    New
                                                                </span>
                                                            )
                                                        } else {
                                                            const config = TAB_CONFIG[currentStageId]
                                                            const tabLabel = TABS.find(t => t.id === currentStageId)?.label
                                                            displayContent = (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setModalLead(row)
                                                                        setModalActiveTab(currentStageId)
                                                                        setModalFormData({}) // Reset form
                                                                        setIsStageModalOpen(true)
                                                                    }}
                                                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${config.badgeClass} hover:opacity-80 shadow-sm whitespace-nowrap cursor-pointer`}
                                                                >
                                                                    {config.icon}
                                                                    {tabLabel}
                                                                </button>
                                                            )
                                                        }
                                                    }
                                                }

                                                // Handle Enquiry No highlights
                                                if (col === "Enquiry No.") {
                                                    displayContent = (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-sky-100 text-sky-700 text-sm font-semibold">
                                                            {val || "-"}
                                                        </span>
                                                    )
                                                }

                                                // Handle Offer Letter link & preview
                                                if (col === "Offer Letter") {
                                                    const offerUrl = getOfferLetterUrl(row)
                                                    if (offerUrl) {
                                                        const previewSrc = getPreviewImageUrl(offerUrl)
                                                        displayContent = (
                                                            <a
                                                                href={offerUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-200 shadow-2xs transition-all hover:scale-105"
                                                                title="View Offer Letter"
                                                            >
                                                                <img
                                                                    src={previewSrc}
                                                                    alt="Offer"
                                                                    className="h-4 w-4 object-cover rounded bg-white border border-indigo-200"
                                                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                                                />
                                                                <span>View Letter</span>
                                                                <svg className="h-3 w-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                </svg>
                                                            </a>
                                                        )
                                                    } else {
                                                        displayContent = <span className="text-slate-300 font-normal">—</span>
                                                    }
                                                }

                                                // Handle Accounts Status
                                                if (col === "Accounts Status") {
                                                    const accStatus = row.rawRow?.[13] ? String(row.rawRow[13]).trim() : ""
                                                    if (accStatus === "Yes") {
                                                        displayContent = (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                                Yes
                                                            </span>
                                                        )
                                                    } else if (accStatus === "No") {
                                                        displayContent = (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                                                                No
                                                            </span>
                                                        )
                                                    } else {
                                                        displayContent = accStatus ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                                                                {accStatus}
                                                            </span>
                                                        ) : <span className="text-slate-300 font-normal">—</span>
                                                    }
                                                }

                                                // Handle Accounts Remarks
                                                if (col === "Accounts Remarks") {
                                                    const accRemarks = row.rawRow?.[14] ? String(row.rawRow[14]).trim() : ""
                                                    displayContent = accRemarks ? (
                                                        <span className="text-xs font-medium text-slate-700 max-w-[200px] truncate block" title={accRemarks}>
                                                            {accRemarks}
                                                        </span>
                                                    ) : <span className="text-slate-300 font-normal">—</span>
                                                }

                                                // Handle Sales Status
                                                if (col === "Sales Status") {
                                                    const salesStatus = row.rawRow?.[18] ? String(row.rawRow[18]).trim() : ""
                                                    if (salesStatus === "Yes") {
                                                        displayContent = (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                                Yes
                                                            </span>
                                                        )
                                                    } else if (salesStatus === "No") {
                                                        displayContent = (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                                                                No
                                                            </span>
                                                        )
                                                    } else {
                                                        displayContent = salesStatus ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                                                                {salesStatus}
                                                            </span>
                                                        ) : <span className="text-slate-300 font-normal">—</span>
                                                    }
                                                }

                                                // Handle Sales Remarks
                                                if (col === "Sales Remarks") {
                                                    const salesRemarks = row.rawRow?.[19] ? String(row.rawRow[19]).trim() : ""
                                                    displayContent = salesRemarks ? (
                                                        <span className="text-xs font-medium text-slate-700 max-w-[200px] truncate block" title={salesRemarks}>
                                                            {salesRemarks}
                                                        </span>
                                                    ) : <span className="text-slate-300 font-normal">—</span>
                                                }

                                                return (
                                                    <td key={col} className="px-6 py-4 text-sm font-semibold text-muted-foreground whitespace-nowrap">
                                                        {displayContent}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {!isLoading && (
                    <Pagination page={page} pageSize={PAGE_SIZE} totalItems={filteredRows.length} onPageChange={setPage} />
                )}
            </div>

            {/* Stage Update Modal */}
            {isStageModalOpen && modalLead && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isModalSubmitting && setIsStageModalOpen(false)}></div>
                        </div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-card rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-slate-100">
                            {/* Modal Header */}
                            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-t-2xl">
                                <div>
                                    <h3 className="text-lg leading-6 font-extrabold text-white">
                                        {TABS.find(t => t.id === modalActiveTab)?.label || "Update Stage"}
                                    </h3>
                                    <p className="text-xs text-sky-100 font-medium mt-1">
                                        Enquiry No: <span className="font-bold bg-white/20 px-2 py-0.5 rounded">{modalLead["Enquiry No."]}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => !isModalSubmitting && setIsStageModalOpen(false)}
                                    disabled={isModalSubmitting}
                                    className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    <XIcon className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="px-6 py-5">
                                {/* Lead Details Summary */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 mb-5 text-xs">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 font-medium">Firm Name:</span>
                                        <span className="font-semibold text-slate-800">{modalLead["Firm Name"] || "-"}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 font-medium">Party Name:</span>
                                        <span className="font-medium text-slate-700">{modalLead["Party Name"] || "-"}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 font-medium">Offer Number:</span>
                                        <span className="font-medium text-slate-700">{modalLead["Offer Number"] || "-"}</span>
                                    </div>

                                    {/* View Document Button */}
                                    {(() => {
                                        const offerUrl = getOfferLetterUrl(modalLead)
                                        if (!offerUrl) return null
                                        return (
                                            <div className="flex justify-between items-center pt-2.5 border-t border-slate-200/80">
                                                <span className="text-slate-600 font-bold flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                    </svg>
                                                    Attached Offer Letter:
                                                </span>
                                                <a
                                                    href={offerUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 shadow-2xs text-xs transition-all hover:scale-105"
                                                >
                                                    <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    <span>View Document</span>
                                                    <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                            </div>
                                        )
                                    })()}

                                    {/* Accounts Status & Remarks for Sales Check / subsequent stages */}
                                    {(() => {
                                        const accStatus = modalLead.rawRow?.[13] ? String(modalLead.rawRow[13]).trim() : ""
                                        const accRemarks = modalLead.rawRow?.[14] ? String(modalLead.rawRow[14]).trim() : ""
                                        if (!accStatus && !accRemarks) return null

                                        return (
                                            <div className="pt-2.5 border-t border-slate-200/80 space-y-1.5">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-600 font-bold">Accounts Decision:</span>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                        accStatus === "Yes" ? "bg-emerald-100 text-emerald-800" :
                                                        accStatus === "No" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"
                                                    }`}>
                                                        {accStatus === "Yes" ? "Yes" : accStatus === "No" ? "No" : accStatus}
                                                    </span>
                                                </div>
                                                {accRemarks && (
                                                    <div className="flex justify-between items-start gap-2 bg-amber-50/80 p-2 rounded-lg border border-amber-200/70">
                                                        <span className="text-amber-800 font-bold whitespace-nowrap">Accounts Remark:</span>
                                                        <span className="text-amber-900 font-medium text-right">{accRemarks}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })()}

                                    {/* Sales Status & Remarks for Technical Discussion / subsequent stages */}
                                    {(() => {
                                        const salesStatus = modalLead.rawRow?.[18] ? String(modalLead.rawRow[18]).trim() : ""
                                        const salesRemarks = modalLead.rawRow?.[19] ? String(modalLead.rawRow[19]).trim() : ""
                                        if (!salesStatus && !salesRemarks) return null

                                        return (
                                            <div className="pt-2.5 border-t border-slate-200/80 space-y-1.5">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-600 font-bold">Sales Decision:</span>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                        salesStatus === "Yes" ? "bg-emerald-100 text-emerald-800" :
                                                        salesStatus === "No" ? "bg-rose-100 text-rose-700" : "bg-indigo-100 text-indigo-800"
                                                    }`}>
                                                        {salesStatus === "Yes" ? "Yes" : salesStatus === "No" ? "No" : salesStatus}
                                                    </span>
                                                </div>
                                                {salesRemarks && (
                                                    <div className="flex justify-between items-start gap-2 bg-indigo-50/80 p-2 rounded-lg border border-indigo-200/70">
                                                        <span className="text-indigo-800 font-bold whitespace-nowrap">Sales Remark:</span>
                                                        <span className="text-indigo-900 font-medium text-right">{salesRemarks}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })()}

                                </div>

                                <form onSubmit={handleModalSubmit} className="space-y-4">
                                    {(() => {
                                        const isAccYes = String(modalLead?.rawRow?.[13] || '').trim().toLowerCase() === 'yes'
                                        const isSalesYes = String(modalLead?.rawRow?.[18] || '').trim().toLowerCase() === 'yes'
                                        const isBothApproved = isAccYes && isSalesYes
                                        const isTechDiscussion = modalActiveTab === "Technical Discussion When Accounts and Sales Approved Offer Letter"

                                        if (TAB_CONFIG[modalActiveTab]?.inputColumns.length === 0 || (isTechDiscussion && isBothApproved)) {
                                            return (
                                                <div className="py-6 text-center bg-muted rounded-xl border border-slate-100">
                                                    <ShareIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                                    <p className="text-sm font-bold text-foreground">
                                                        {isTechDiscussion ? "Accounts & Sales Approved" : "Confirm Stage Submission"}
                                                    </p>
                                                    <p className="text-xs font-medium text-muted-foreground mt-1">
                                                        {isTechDiscussion 
                                                            ? "Both Accounts and Sales approved the offer letter. Submit to proceed to Send Offer Letter."
                                                            : "Submit to complete this stage and proceed to the next step."}
                                                    </p>
                                                </div>
                                            )
                                        }

                                        return (
                                            <div className="grid grid-cols-1 gap-4 text-xs">
                                                {TAB_CONFIG[modalActiveTab]?.inputColumns.map(col => {
                                                    // In Account Check, only show remarks if status is "No"
                                                    if (modalActiveTab === "Check The Offer Letter In Accounts" && col.key === "remarks" && modalFormData.status !== "No") {
                                                        return null
                                                    }
                                                    // In Sales Check, only show remarks2 if status2 is "No"
                                                    if (modalActiveTab === "Check The Offer Letter In Sales Person" && col.key === "remarks2" && modalFormData.status2 !== "No") {
                                                        return null
                                                    }

                                                    const isAccRemarks = modalActiveTab === "Check The Offer Letter In Accounts" && col.key === "remarks"
                                                    const isSalesRemarks = modalActiveTab === "Check The Offer Letter In Sales Person" && col.key === "remarks2"

                                                    return (
                                                        <div key={col.key} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                                            <label className="block text-xs font-semibold text-slate-700">
                                                                {col.label} <span className="text-red-500">*</span>
                                                            </label>
                                                            {col.type === 'file' ? (
                                                                <div className="relative">
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*,application/pdf"
                                                                        onChange={(e) => setModalFormData({ ...modalFormData, [col.key]: e.target.files[0] })}
                                                                        className="w-full text-xs text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 transition-colors cursor-pointer border border-border rounded-lg p-2 bg-muted focus:outline-none"
                                                                        required
                                                                    />
                                                                </div>
                                                            ) : (col.type === 'select' || col.options) ? (
                                                                <select
                                                                    value={modalFormData[col.key] || ""}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value
                                                                        setModalFormData(prev => {
                                                                            const updated = { ...prev, [col.key]: val }
                                                                            if (col.key === 'status' && val === 'Yes') {
                                                                                updated.remarks = ""
                                                                            }
                                                                            if (col.key === 'status2' && val === 'Yes') {
                                                                                updated.remarks2 = ""
                                                                            }
                                                                            return updated
                                                                        })
                                                                    }}
                                                                    className="w-full px-3 py-2 border-b border-slate-200 focus:border-sky-600 focus:outline-none text-sm text-slate-800 bg-transparent transition-colors cursor-pointer"
                                                                    required
                                                                >
                                                                    <option value="">Select {col.label}...</option>
                                                                    {(col.options || ['Yes', 'No']).map(opt => (
                                                                        <option key={opt} value={opt}>{opt}</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={modalFormData[col.key] || ""}
                                                                    onChange={(e) => setModalFormData({ ...modalFormData, [col.key]: e.target.value })}
                                                                    className="w-full px-3 py-2 border-b border-slate-200 focus:border-sky-600 focus:outline-none text-sm text-slate-800 bg-transparent transition-colors"
                                                                    placeholder={`Enter ${col.label}...`}
                                                                    required={
                                                                        isAccRemarks ? modalFormData.status === "No" :
                                                                        isSalesRemarks ? modalFormData.status2 === "No" :
                                                                        true
                                                                    }
                                                                />
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )
                                    })()}

                                    <div className="mt-6 pt-5 border-t border-slate-100 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsStageModalOpen(false)}
                                            disabled={isModalSubmitting}
                                            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs md:text-sm rounded-lg border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isModalSubmitting}
                                            className={`flex items-center justify-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg shadow-sm transition-all text-xs md:text-sm cursor-pointer
                                                ${isModalSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {isModalSubmitting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    <ShareIcon className="h-4 w-4" />
                                                    Submit and Save
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Offer
