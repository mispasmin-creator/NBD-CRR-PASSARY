"use client"

import { useState, useEffect, useContext, useCallback } from "react"
import {
    SearchIcon,
    UsersIcon,
    TrendingUpIcon,
    ShareIcon,
    ShoppingCartIcon,
    AlertCircleIcon,
    PhoneCallIcon,
    MessageSquareIcon,
    RefreshCwIcon,
    XIcon
} from "../components/Icons"
import { AuthContext } from "../App"
import axios from "axios"

const TABS = [
    { id: "All Enquiries", label: "All" },
    { id: "Get Rates & Attached Offer Letter", label: "Rates & Offer Letter" },
    { id: "Check The Offer Letter In Accounts", label: "Accounts Check" },
    { id: "Check The Offer Letter In Sales Person", label: "Sales Check" },
    { id: "Technical Discussion When Accounts and Sales Approved Offer Letter", label: "Tech Discussion" },
    { id: "Send Offer Letter", label: "Send Offer" }
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
        colorClass: "bg-teal-50 text-teal-700 ring-teal-200",
        badgeClass: "bg-teal-100 text-teal-700"
    },
    "Check The Offer Letter In Accounts": {
        filterNotEmpty: 10, // Planned 3
        filterEmpty: 11,    // Actual3
        timestampCol: 11,
        inputColumns: [
            { key: 'status', label: 'Status', storeCol: 13 },
            { key: 'remarks', label: 'Remarks', storeCol: 14 }
        ],
        icon: <AlertCircleIcon className="h-4 w-4" />,
        colorClass: "bg-amber-50 text-amber-700 ring-amber-200",
        badgeClass: "bg-amber-100 text-amber-700"
    },
    "Check The Offer Letter In Sales Person": {
        filterNotEmpty: 15, // Planned 4
        filterEmpty: 16,    // Actual4
        timestampCol: 16,
        inputColumns: [
            { key: 'status2', label: 'Status2', storeCol: 18 },
            { key: 'remarks2', label: 'Remarks2', storeCol: 19 }
        ],
        icon: <PhoneCallIcon className="h-4 w-4" />,
        colorClass: "bg-indigo-50 text-indigo-700 ring-indigo-200",
        badgeClass: "bg-indigo-100 text-indigo-700"
    },
    "Technical Discussion When Accounts and Sales Approved Offer Letter": {
        filterNotEmpty: 20, // Planned 5
        filterEmpty: 21,    // Actual5
        timestampCol: 21,
        inputColumns: [
            { key: 'status3', label: 'Status3', storeCol: 23 },
            { key: 'remarks3', label: 'Remarks3', storeCol: 24 }
        ],
        icon: <MessageSquareIcon className="h-4 w-4" />,
        colorClass: "bg-violet-50 text-violet-700 ring-violet-200",
        badgeClass: "bg-violet-100 text-violet-700"
    },
    "Send Offer Letter": {
        filterNotEmpty: 25, // Planned 2
        filterEmpty: 26,    // Actual2
        timestampCol: 26,
        inputColumns: [],
        icon: <ShareIcon className="h-4 w-4" />,
        colorClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        badgeClass: "bg-emerald-100 text-emerald-700"
    }
}

const BASE_COLUMNS = [
    "Stage",
    "Enquiry No.",
    "Firm Name",
    "Party Name",
    "Offer Number",
]

function Offer() {
    const { showNotification } = useContext(AuthContext)
    const [searchTerm, setSearchTerm] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [offerRows, setOfferRows] = useState([])
    const [activeTab, setActiveTab] = useState("All Enquiries")
    const [selectedRows, setSelectedRows] = useState({})
    const [tabInputs, setTabInputs] = useState({})
    const [isTabSubmitting, setIsTabSubmitting] = useState(false)

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
            const headerRowIndex = 4
            const headerRow = (allRows[headerRowIndex] || []).map(c => String(c || "").trim())

            // Data rows start after header
            const dataRows = allRows.slice(headerRowIndex + 1)

            const mappedRows = dataRows
                .map((row, rowOffset) => {
                    if (row.every(cell => !cell)) return null
                    const obj = {
                        _sheetRowIdx: headerRowIndex + 1 + rowOffset,
                        rawRow: [...row]
                    }
                    headerRow.forEach((h, idx) => {
                        if (h) obj[h] = String(row[idx] || "").trim()
                    })
                    return obj
                })
                .filter(Boolean)

            // Sort latest Enquiry No first
            mappedRows.sort((a, b) => {
                const aNo = parseEnquiryNo(a["Enquiry No."] || a["Enquiry No"] || "")
                const bNo = parseEnquiryNo(b["Enquiry No."] || b["Enquiry No"] || "")
                return bNo - aNo
            })

            setOfferRows(mappedRows)
        } catch (error) {
            console.error("Error fetching Offer data:", error)
            showNotification("Failed to fetch offer data: " + error.message, "error")
        } finally {
            setIsLoading(false)
        }
    }, [showNotification])

    useEffect(() => {
        fetchOfferData()
    }, [fetchOfferData])

    useEffect(() => {
        // Reset selection when tab changes
        setSelectedRows({})
        setTabInputs({})
    }, [activeTab])

    const getTabCount = (tabId) => {
        if (tabId === "All Enquiries") return offerRows.length
        const config = TAB_CONFIG[tabId]
        if (!config) return 0

        return offerRows.filter(row => {
            const notEmptyVal = row.rawRow?.[config.filterNotEmpty]
            const emptyVal = row.rawRow?.[config.filterEmpty]
            return notEmptyVal && String(notEmptyVal).trim() !== "" &&
                (!emptyVal || String(emptyVal).trim() === "")
        }).length
    }

    const currentTabConfig = TAB_CONFIG[activeTab]
    const isActionTab = !!currentTabConfig

    const columnsToRender = BASE_COLUMNS.filter(col => col !== "Stage" || activeTab === "All Enquiries")

    const filteredRows = offerRows.filter((row) => {
        // Tab Filtering
        if (isActionTab) {
            const notEmptyVal = row.rawRow?.[currentTabConfig.filterNotEmpty]
            const emptyVal = row.rawRow?.[currentTabConfig.filterEmpty]
            const matchesTab = notEmptyVal && String(notEmptyVal).trim() !== "" &&
                (!emptyVal || String(emptyVal).trim() === "")
            if (!matchesTab) return false
        }

        // Search Filtering
        if (!searchTerm) return true
        const term = searchTerm.toLowerCase()
        return BASE_COLUMNS.some(col =>
            String(row[col] || "").toLowerCase().includes(term)
        )
    })

    const handleCheckboxToggle = (rowIdx) => {
        setSelectedRows(prev => ({
            ...prev,
            [rowIdx]: !prev[rowIdx]
        }))
    }

    const handleInputChange = (rowIdx, key, value) => {
        setTabInputs(prev => ({
            ...prev,
            [rowIdx]: {
                ...(prev[rowIdx] || {}),
                [key]: value
            }
        }))
    }

    const handleTabSubmit = async () => {
        if (!currentTabConfig) return

        const selectedToSubmit = offerRows.filter((_, idx) => selectedRows[idx])
        if (selectedToSubmit.length === 0) {
            showNotification("Please select at least one row to submit.", "error")
            return
        }

        setIsTabSubmitting(true)
        const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
        const sheetName = import.meta.env.VITE_NBD_OFFER_FMS_SHEET_NAME
        const timestamp = getCurrentTimestamp()

        try {
            for (const rowObj of selectedToSubmit) {
                const rowIndex = offerRows.findIndex(r => r === rowObj)
                const inputs = tabInputs[rowIndex] || {}

                const updatedRow = [...rowObj.rawRow]
                // 1. Set timestamp
                updatedRow[currentTabConfig.timestampCol] = timestamp

                // 2. Set input columns (handle file upload if needed)
                for (const inputConfig of currentTabConfig.inputColumns) {
                    let valueToStore = inputs[inputConfig.key] || ""

                    if (inputConfig.type === 'file' && valueToStore instanceof File) {
                        try {
                            valueToStore = await uploadFileToDrive(valueToStore)
                        } catch (err) {
                            console.error("Upload failed for row:", rowIndex, err)
                            showNotification(`Upload failed for ${rowObj["Enquiry No."]}`, "error")
                            // Skip this row's update or continue? For now, we continue but value will be empty
                            valueToStore = ""
                        }
                    }

                    updatedRow[inputConfig.storeCol] = valueToStore
                }

                // 3. Normalize for GSheets (handles ISO strings)
                const normalized = updatedRow.map(cell => formatISODateToCustom(cell))

                const formDataToSend = new URLSearchParams()
                formDataToSend.append('action', 'update')
                formDataToSend.append('sheetName', sheetName)
                formDataToSend.append('rowIndex', (rowObj._sheetRowIdx + 1).toString())
                formDataToSend.append('rowData', JSON.stringify(normalized))

                await axios.post(scriptUrl, formDataToSend)
            }

            showNotification(`${selectedToSubmit.length} row(s) updated successfully!`, "success")
            setSelectedRows({})
            setTabInputs({})
            fetchOfferData()
        } catch (error) {
            console.error("Error submitting tab updates:", error)
            showNotification("Failed to update rows. Please try again.", "error")
        } finally {
            setIsTabSubmitting(false)
        }
    }

    const handleModalSubmit = async (e) => {
        e.preventDefault()
        if (!modalLead || !modalActiveTab) return

        setIsModalSubmitting(true)
        const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
        const sheetName = import.meta.env.VITE_NBD_OFFER_FMS_SHEET_NAME
        const timestamp = getCurrentTimestamp()
        const config = TAB_CONFIG[modalActiveTab]

        try {
            const updatedRow = [...modalLead.rawRow]
            // 1. Set timestamp
            updatedRow[config.timestampCol] = timestamp

            // 2. Set input columns (handle file upload if needed)
            for (const inputConfig of config.inputColumns) {
                let valueToStore = modalFormData[inputConfig.key] || ""

                if (inputConfig.type === 'file' && valueToStore instanceof File) {
                    try {
                        valueToStore = await uploadFileToDrive(valueToStore)
                    } catch (err) {
                        console.error("Upload failed for modal row:", err)
                        showNotification(`Upload failed for ${modalLead["Enquiry No."]}`, "error")
                        valueToStore = ""
                    }
                }

                updatedRow[inputConfig.storeCol] = valueToStore
            }

            // 3. Normalize for GSheets (handles ISO strings)
            const normalized = updatedRow.map(cell => formatISODateToCustom(cell))

            const formDataToSend = new URLSearchParams()
            formDataToSend.append('action', 'update')
            formDataToSend.append('sheetName', sheetName)
            formDataToSend.append('rowIndex', (modalLead._sheetRowIdx + 1).toString())
            formDataToSend.append('rowData', JSON.stringify(normalized))

            await axios.post(scriptUrl, formDataToSend)

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

    const hasSelectedRows = Object.values(selectedRows).some(v => v)

    return (
        <div className="py-2 min-h-screen">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Offer Management</h1>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">Track and manage offer letter workflows</p>
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                        <input
                            type="search"
                            placeholder="Search enquiries..."
                            className="pl-10 w-full md:w-[320px] px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={fetchOfferData}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 shadow-sm transition-all text-sm whitespace-nowrap"
                    >
                        <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    {isActionTab && (
                        <button
                            onClick={handleTabSubmit}
                            disabled={isTabSubmitting || !hasSelectedRows}
                            className={`flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-md shadow-emerald-200/50 transition-all text-sm whitespace-nowrap
                                ${(isTabSubmitting || !hasSelectedRows) ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-[1.02] active:scale-95'}`}
                        >
                            {isTabSubmitting ? (
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <ShareIcon className="h-4 w-4" />
                            )}
                            Submit Selected
                        </button>
                    )}
                </div>
            </div>

            {/* ── Tab Navigation ── */}
            <div className="flex flex-wrap gap-1.5 mb-6 bg-slate-100/50 p-1 rounded-xl border border-slate-200/60 w-fit">
                {TABS.map((tab) => {
                    const count = getTabCount(tab.id)
                    const isActive = activeTab === tab.id
                    const config = TAB_CONFIG[tab.id] || {
                        icon: <UsersIcon className="h-3.5 w-3.5" />,
                        colorClass: "bg-sky-50 text-sky-700 ring-sky-200",
                        badgeClass: "bg-sky-100 text-sky-700"
                    }

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all duration-300 whitespace-nowrap
                                ${isActive
                                    ? `${config.colorClass} shadow-sm ring-1 scale-100`
                                    : "text-slate-500 hover:text-slate-800 hover:bg-white scale-[0.98]"}
                            `}
                        >
                            <span className={`${isActive ? '' : 'text-slate-400'}`}>
                                {config.icon || <UsersIcon className="h-3.5 w-3.5" />}
                            </span>
                            {tab.label}
                            <span className={`
                                ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black transition-colors
                                ${isActive ? config.badgeClass : "bg-slate-200 text-slate-500"}
                            `}>
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* ── Table Implementation ── */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200">
                                {isActionTab && (
                                    <th className="px-5 py-4 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 transition-all cursor-pointer"
                                            checked={filteredRows.length > 0 && filteredRows.every((_, idx) => {
                                                const originalIdx = offerRows.findIndex(r => r === filteredRows[idx])
                                                return selectedRows[originalIdx]
                                            })}
                                            onChange={(e) => {
                                                const newSelected = { ...selectedRows }
                                                filteredRows.forEach((row) => {
                                                    const originalIdx = offerRows.findIndex(r => r === row)
                                                    if (e.target.checked) newSelected[originalIdx] = true
                                                    else delete newSelected[originalIdx]
                                                })
                                                setSelectedRows(newSelected)
                                            }}
                                        />
                                    </th>
                                )}
                                {isActionTab && currentTabConfig.inputColumns.map(col => (
                                    <th key={col.key} className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                        {col.label}
                                    </th>
                                ))}
                                {columnsToRender.map((col) => (
                                    <th key={col} className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columnsToRender.length + (isActionTab ? 1 + currentTabConfig.inputColumns.length : 0)} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative h-12 w-12">
                                                <div className="absolute inset-0 border-4 border-sky-100 rounded-full"></div>
                                                <div className="absolute inset-0 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-400 animate-pulse">Synchronizing offer data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={columnsToRender.length + (isActionTab ? 1 + currentTabConfig.inputColumns.length : 0)} className="px-6 py-20 text-center">
                                        <div className="bg-slate-50 rounded-2xl p-8 inline-block">
                                            <UsersIcon className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                            <p className="text-sm font-bold text-slate-400 italic">No enquiries found in this segment.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((row) => {
                                    const originalIdx = offerRows.findIndex(r => r === row)
                                    const isSelected = !!selectedRows[originalIdx]
                                    const inputs = tabInputs[originalIdx] || {}

                                    return (
                                        <tr key={originalIdx} className={`hover:bg-slate-50/50 transition-colors group ${isSelected ? 'bg-sky-50/30' : ''}`}>
                                            {isActionTab && (
                                                <td className="px-5 py-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 transition-all cursor-pointer"
                                                        checked={isSelected}
                                                        onChange={() => handleCheckboxToggle(originalIdx)}
                                                    />
                                                </td>
                                            )}
                                            {isActionTab && currentTabConfig.inputColumns.map(col => (
                                                <td key={col.key} className="px-6 py-4">
                                                    {col.type === 'file' ? (
                                                        <input
                                                            type="file"
                                                            accept="image/*,application/pdf"
                                                            onChange={(e) => handleInputChange(originalIdx, col.key, e.target.files[0])}
                                                            disabled={!isSelected}
                                                            className={`
                                                                w-full min-w-[150px] text-xs transition-all file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold
                                                                ${isSelected
                                                                    ? 'file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer'
                                                                    : 'file:bg-slate-100 file:text-slate-400 opacity-60 pointer-events-none'}
                                                            `}
                                                        />
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={inputs[col.key] || ""}
                                                            onChange={(e) => handleInputChange(originalIdx, col.key, e.target.value)}
                                                            disabled={!isSelected}
                                                            placeholder={`Enter ${col.label}...`}
                                                            className={`
                                                                w-full min-w-[150px] px-3 py-1.5 text-sm font-medium border rounded-xl transition-all
                                                                ${isSelected
                                                                    ? 'bg-white border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500'
                                                                    : 'bg-slate-50 border-transparent text-slate-400 opacity-60 pointer-events-none'}
                                                            `}
                                                        />
                                                    )}
                                                </td>
                                            ))}
                                            {columnsToRender.map((col) => {
                                                let val = row[col]
                                                let displayContent = val || <span className="text-slate-300 font-normal">N/A</span>

                                                // Handle stage badges in "All Enquiries" tab
                                                if (col === "Stage" && activeTab === "All Enquiries") {
                                                    let currentStageId = "New"
                                                    let isCompleted = false
                                                    for (let i = 1; i < TABS.length; i++) {
                                                        const tab = TABS[i]
                                                        const config = TAB_CONFIG[tab.id]
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
                                                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[12px] font-bold">
                                                                Completed
                                                            </span>
                                                        )
                                                    } else if (currentStageId === "New") {
                                                        displayContent = (
                                                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[12px] font-bold">
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
                                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${config.badgeClass} hover:opacity-80 shadow-sm whitespace-nowrap`}
                                                            >
                                                                {config.icon}
                                                                {tabLabel}
                                                            </button>
                                                        )
                                                    }
                                                }

                                                // Handle Enquiry No highlights
                                                if (col === "Enquiry No.") {
                                                    displayContent = (
                                                        <span className="text-sky-600 font-black">
                                                            {val}
                                                        </span>
                                                    )
                                                }

                                                return (
                                                    <td key={col} className="px-6 py-4 text-sm font-semibold text-slate-700 whitespace-nowrap">
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
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Showing {filteredRows.length} of {offerRows.length} entries</span>
                    </div>
                )}
            </div>

            {/* Stage Update Modal */}
            {isStageModalOpen && modalLead && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsStageModalOpen(false)}></div>
                        </div>

                        {/* Centering trick */}
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border border-slate-100">
                            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
                                <div>
                                    <h3 className="text-lg leading-6 font-extrabold text-slate-800">
                                        Update Stage
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium mt-1">
                                        Enquiry No: <span className="text-sky-600 font-bold">{modalLead["Enquiry No."]}</span>
                                    </p>
                                </div>
                                <button onClick={() => setIsStageModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-200/50">
                                    <XIcon className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="px-6 py-5">
                                {/* Modal Tabs */}
                                <div className="flex flex-wrap gap-1 mb-5 p-1 bg-slate-100/50 rounded-xl border border-slate-200/60">
                                    {TABS.filter(t => t.id === modalActiveTab).map(tab => {
                                        const config = TAB_CONFIG[tab.id];
                                        return (
                                            <div
                                                key={tab.id}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${config.colorClass + ' shadow-sm ring-1 scale-100'}`}
                                            >
                                                <span>
                                                    {config.icon}
                                                </span>
                                                {tab.label}
                                            </div>
                                        )
                                    })}
                                </div>

                                <form onSubmit={handleModalSubmit} className="space-y-4">
                                    {TAB_CONFIG[modalActiveTab]?.inputColumns.length === 0 ? (
                                        <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                                            <ShareIcon className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                                            <p className="text-sm font-bold text-slate-500">No explicit inputs needed for this stage.</p>
                                            <p className="text-xs font-medium text-slate-400 mt-1">Submit to automatically update the timestamp.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {TAB_CONFIG[modalActiveTab]?.inputColumns.map(col => (
                                                <div key={col.key} className="col-span-1 md:col-span-2">
                                                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                                                        {col.label}
                                                    </label>
                                                    {col.type === 'file' ? (
                                                        <div className="relative">
                                                            <input
                                                                type="file"
                                                                accept="image/*,application/pdf"
                                                                onChange={(e) => setModalFormData({ ...modalFormData, [col.key]: e.target.files[0] })}
                                                                className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 transition-colors cursor-pointer border border-slate-200 rounded-xl p-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                                                required
                                                            />
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={modalFormData[col.key] || ""}
                                                            onChange={(e) => setModalFormData({ ...modalFormData, [col.key]: e.target.value })}
                                                            className="w-full px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm"
                                                            placeholder={`Enter ${col.label}...`}
                                                            required
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsStageModalOpen(false)}
                                            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isModalSubmitting}
                                            className={`flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-md shadow-emerald-200/50 transition-all text-sm
                                                ${isModalSubmitting ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-[1.02] active:scale-95'}`}
                                        >
                                            {isModalSubmitting ? (
                                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                <ShareIcon className="h-4 w-4" />
                                            )}
                                            {isModalSubmitting ? 'Submitting...' : 'Submit Stage Data'}
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
