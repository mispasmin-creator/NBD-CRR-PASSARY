"use client"

import { useState, useContext, useEffect, useCallback } from "react"
import { AuthContext } from "../App"
import axios from "axios"
import { UsersIcon, TrendingUpIcon, ShareIcon, ShoppingCartIcon, AlertCircleIcon } from "../components/Icons"

function CRREnquiry() {
    const { showNotification } = useContext(AuthContext)
    const [searchQuery, setSearchQuery] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isTabSubmitting, setIsTabSubmitting] = useState(false)
    const [activeTab, setActiveTab] = useState("All Crm")
    const [enquiries, setEnquiries] = useState([])
    const [isLoadingData, setIsLoadingData] = useState(false)
    const [selectedRows, setSelectedRows] = useState({})
    const [tabInputs, setTabInputs] = useState({})

    const TABS = [
        "All Crm",
        "Give Rates",
        "Send Offer",
        "Get Order",
        "Order Not Recived"
    ]

    const TAB_CONFIG = {
        "Give Rates": {
            filterNotEmpty: 14,
            filterEmpty: 15,
            timestampCol: 15,
            inputColumns: [
                { key: 'status1', label: 'Status 1', storeCol: 17 },
                { key: 'rateMgmt', label: 'Rate Mgmt', storeCol: 18 },
                { key: 'remarksMgmt', label: 'Remarks From Mgmt', storeCol: 19 }
            ]
        },
        "Send Offer": {
            filterNotEmpty: 20,
            filterEmpty: 21,
            timestampCol: 21,
            inputColumns: [
                { key: 'status2', label: 'Status 2', storeCol: 23 }
            ]
        },
        "Get Order": {
            filterNotEmpty: 24,
            filterEmpty: 25,
            timestampCol: 25,
            inputColumns: [
                { key: 'status3', label: 'Status 3', storeCol: 27 }
            ]
        },
        "Order Not Recived": {
            filterNotEmpty: 28,
            filterEmpty: 29,
            timestampCol: 29,
            inputColumns: [
                { key: 'status4', label: 'Status 4', storeCol: 31 }
            ]
        }
    }

    const getTabCount = (tab) => {
        if (tab === "All Crm") return enquiries.length
        const config = TAB_CONFIG[tab]
        if (!config) return 0

        return enquiries.filter(e => {
            const notEmptyVal = e.rawRow?.[config.filterNotEmpty]
            const emptyVal = e.rawRow?.[config.filterEmpty]
            return notEmptyVal && notEmptyVal.toString().trim() !== "" &&
                (!emptyVal || emptyVal.toString().trim() === "")
        }).length
    }

    const [masterData, setMasterData] = useState({
        firmNames: [],
        partyNames: [],
        productNames: [],
        salesPersons: [],
        departments: []
    })

    const getEnquiryStage = (enquiry) => {
        // Check tabs in order to find the current active stage
        for (const tab of TABS) {
            if (tab === "All Crm") continue

            const config = TAB_CONFIG[tab]
            if (!config) continue

            const notEmptyVal = enquiry.rawRow?.[config.filterNotEmpty]
            const emptyVal = enquiry.rawRow?.[config.filterEmpty]

            // If the criteria matches (Previous step done AND Current step pending)
            if (notEmptyVal && notEmptyVal.toString().trim() !== "" &&
                (!emptyVal || emptyVal.toString().trim() === "")) {
                return tab
            }
        }
        return "Completed" // If no pending stages found
    }

    const [updateModalOpen, setUpdateModalOpen] = useState(false)
    const [currentUpdateEnquiry, setCurrentUpdateEnquiry] = useState(null)
    const [currentUpdateStage, setCurrentUpdateStage] = useState(null)
    const [updateFormData, setUpdateFormData] = useState({})

    const handleStageClick = (enquiry, stage) => {
        if (stage === "Completed") return
        setCurrentUpdateEnquiry(enquiry)
        setCurrentUpdateStage(stage)
        setUpdateFormData({})
        setUpdateModalOpen(true)
    }

    const handleUpdateStageSubmit = async (e) => {
        e.preventDefault()
        if (!currentUpdateEnquiry || !currentUpdateStage) return

        const config = TAB_CONFIG[currentUpdateStage]
        setIsTabSubmitting(true)

        try {
            const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
            const sheetName = import.meta.env.VITE_CRR_ENQUIRY_SHEET_NAME || 'ENQUIRY FMS'
            const timestamp = getCurrentTimestamp()

            const updatedRow = [...(currentUpdateEnquiry.rawRow || [])]
            while (updatedRow.length < 32) updatedRow.push("")

            // Format all existing columns
            for (let i = 0; i < updatedRow.length; i++) {
                updatedRow[i] = formatISODateToCustom(updatedRow[i])
            }

            updatedRow[config.timestampCol] = timestamp
            config.inputColumns.forEach(col => {
                updatedRow[col.storeCol] = updateFormData[col.key] || ""
            })

            const formDataToSend = new FormData()
            formDataToSend.append('action', 'update')
            formDataToSend.append('sheetName', sheetName)
            formDataToSend.append('rowIndex', currentUpdateEnquiry.sheetRowIndex.toString())
            formDataToSend.append('rowData', JSON.stringify(updatedRow))

            await axios.post(scriptUrl, formDataToSend)

            showNotification(`Enquiry updated to ${currentUpdateStage} successfully!`, "success")
            setUpdateModalOpen(false)
            setUpdateFormData({})
            fetchAllData()
        } catch (error) {
            console.error("Error updating stage:", error)
            showNotification("Failed to update stage. Please try again.", "error")
        } finally {
            setIsTabSubmitting(false)
        }
    }

    const formatDateForSheet = (dateStr) => {
        if (!dateStr) return ""
        const parts = dateStr.split('-')
        if (parts.length !== 3) return ""
        const year = parts[0]
        const month = parseInt(parts[1], 10)
        const day = parseInt(parts[2], 10)
        const now = new Date()
        const hours = now.getHours()
        const minutes = now.getMinutes().toString().padStart(2, '0')
        const seconds = now.getSeconds().toString().padStart(2, '0')
        return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`
    }

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

    const fetchAllData = useCallback(async () => {
        setIsLoadingData(true)
        try {
            const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
            const masterSheetName = import.meta.env.VITE_MASTER_SHEET_NAME || 'Master'
            const enquirySheetName = import.meta.env.VITE_CRR_ENQUIRY_SHEET_NAME || 'ENQUIRY FMS'

            const masterResponse = await axios.get(`${scriptUrl}?sheet=${masterSheetName}&t=${new Date().getTime()}`)
            if (masterResponse.data && masterResponse.data.data) {
                const data = masterResponse.data.data.slice(1)
                setMasterData({
                    firmNames: [...new Set(data.map(row => row[0]).filter(Boolean))],
                    partyNames: [...new Set(data.map(row => row[1]).filter(Boolean))],
                    productNames: [...new Set(data.map(row => row[2]).filter(Boolean))],
                    salesPersons: [...new Set(data.map(row => row[3]).filter(Boolean))],
                    departments: [...new Set(data.map(row => row[4]).filter(Boolean))]
                })
            }

            const enquiryResponse = await axios.get(`${scriptUrl}?sheet=${enquirySheetName}&t=${new Date().getTime()}`)
            if (enquiryResponse.data && enquiryResponse.data.data) {
                const rawData = enquiryResponse.data.data.slice(6)
                const mappedEnquiries = rawData.map((row, index) => ({
                    id: index,
                    sheetRowIndex: index + 7,
                    rawRow: [...row],
                    timestamp: row[0] || "",
                    enquiryNo: row[1] || "",
                    firmName: row[2] || "",
                    partyName: row[3] || "",
                    productName: row[4] || "",
                    qty: row[5] || "",
                    department: row[6] || "",
                    whenRequired: row[7] || "",
                    salesPerson: row[8] || "",
                    status: row[13] || "Pending"
                })).filter(item => item.enquiryNo)
                setEnquiries(mappedEnquiries.reverse())
            }
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setIsLoadingData(false)
        }
    }, [])

    useEffect(() => {
        fetchAllData()
    }, [fetchAllData])

    useEffect(() => {
        setSelectedRows({})
        setTabInputs({})
    }, [activeTab])

    const initialFormData = {
        firmName: "",
        partyNames: "",
        productName: "",
        qty: "",
        department: "",
        whenRequired: "",
        salesPerson: "",
        orderReceivedParallelly: "",
        needPriceFromManagement: "",
        lastOrderReceivedDate: "",
        lastOrderReceivedPrice: ""
    }

    const [formData, setFormData] = useState(initialFormData)

    const currentTabConfig = TAB_CONFIG[activeTab]
    const isActionTab = !!currentTabConfig

    const filteredEnquiries = enquiries.filter(e => {
        const matchesSearch = e.firmName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.enquiryNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.partyName?.toLowerCase().includes(searchQuery.toLowerCase())

        if (isActionTab) {
            const notEmptyVal = e.rawRow?.[currentTabConfig.filterNotEmpty]
            const emptyVal = e.rawRow?.[currentTabConfig.filterEmpty]
            const matchesFilter = notEmptyVal && notEmptyVal.toString().trim() !== "" &&
                (!emptyVal || emptyVal.toString().trim() === "")
            return matchesSearch && matchesFilter
        }

        return matchesSearch
    })

    const hasSelectedRows = Object.values(selectedRows).some(v => v)

    const handleCheckboxToggle = (enquiryId) => {
        setSelectedRows(prev => ({
            ...prev,
            [enquiryId]: !prev[enquiryId]
        }))
    }

    const handleTabInputChange = (enquiryId, key, value) => {
        setTabInputs(prev => ({
            ...prev,
            [enquiryId]: {
                ...(prev[enquiryId] || {}),
                [key]: value
            }
        }))
    }

    const handleTabSubmit = async () => {
        if (!currentTabConfig) return

        const selectedEnquiries = filteredEnquiries.filter(e => selectedRows[e.id])
        if (selectedEnquiries.length === 0) {
            showNotification("Please select at least one row to submit.", "error")
            return
        }

        setIsTabSubmitting(true)
        try {
            const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
            const sheetName = import.meta.env.VITE_CRR_ENQUIRY_SHEET_NAME || 'ENQUIRY FMS'
            const timestamp = getCurrentTimestamp()

            for (const enquiry of selectedEnquiries) {
                const inputs = tabInputs[enquiry.id] || {}
                const updatedRow = [...(enquiry.rawRow || [])]
                while (updatedRow.length < 32) updatedRow.push("")

                // Format all existing columns to ensure no ISO dates are sent back (fixes timestamp issues across all columns)
                for (let i = 0; i < updatedRow.length; i++) {
                    updatedRow[i] = formatISODateToCustom(updatedRow[i])
                }

                updatedRow[currentTabConfig.timestampCol] = timestamp
                currentTabConfig.inputColumns.forEach(col => {
                    updatedRow[col.storeCol] = inputs[col.key] || ""
                })

                const formDataToSend = new FormData()
                formDataToSend.append('action', 'update')
                formDataToSend.append('sheetName', sheetName)
                formDataToSend.append('rowIndex', enquiry.sheetRowIndex.toString())
                formDataToSend.append('rowData', JSON.stringify(updatedRow))

                await axios.post(scriptUrl, formDataToSend)
            }

            showNotification(`${selectedEnquiries.length} row(s) updated successfully!`, "success")
            setSelectedRows({})
            setTabInputs({})
            fetchAllData()
        } catch (error) {
            console.error("Error updating rows:", error)
            showNotification("Failed to update. Please try again.", "error")
        } finally {
            setIsTabSubmitting(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
            const sheetName = import.meta.env.VITE_CRR_ENQUIRY_SHEET_NAME || 'ENQUIRY FMS'

            const fetchResponse = await axios.get(`${scriptUrl}?sheet=${sheetName}&t=${new Date().getTime()}`)
            let nextEnquiryNo = "ENQ1"

            if (fetchResponse.data && fetchResponse.data.data) {
                const sheetData = fetchResponse.data.data.slice(6)
                const existingIds = sheetData.map(row => {
                    const val = row[1] ? row[1].toString().toUpperCase() : ""
                    if (val.startsWith("ENQ")) {
                        const numStr = val.replace("ENQ", "").replace("-", "").trim()
                        return parseInt(numStr, 10)
                    }
                    return 0
                }).filter(n => !isNaN(n) && n > 0)

                if (existingIds.length > 0) {
                    const maxId = Math.max(...existingIds)
                    nextEnquiryNo = `ENQ${maxId + 1}`
                }
            }

            const currentTimestamp = getCurrentTimestamp()
            const formattedWhenRequired = formatDateForSheet(formData.whenRequired)
            const formattedLastOrderDate = formData.needPriceFromManagement === "Yes"
                ? formatDateForSheet(formData.lastOrderReceivedDate)
                : ""

            const rowData = [
                currentTimestamp,
                nextEnquiryNo,
                formData.firmName,
                formData.partyNames,
                formData.productName,
                formData.qty,
                formData.department,
                formattedWhenRequired,
                formData.salesPerson,
                formData.orderReceivedParallelly,
                formData.needPriceFromManagement,
                formattedLastOrderDate,
                formData.needPriceFromManagement === "Yes" ? formData.lastOrderReceivedPrice : ""
            ]

            const formDataToSend = new FormData()
            formDataToSend.append('action', 'insert')
            formDataToSend.append('sheetName', sheetName)
            formDataToSend.append('rowData', JSON.stringify(rowData))

            const response = await axios.post(scriptUrl, formDataToSend)

            if (response.data && response.data.success) {
                setFormData(initialFormData)
                setShowForm(false)
                showNotification(`Enquiry ${nextEnquiryNo} added successfully`, "success")
                fetchAllData()
            } else {
                throw new Error("Failed to add enquiry to sheet")
            }
        } catch (error) {
            console.error("Error submitting enquiry:", error)
            showNotification("Failed to submit enquiry. Please try again.", "error")
        } finally {
            setIsSubmitting(false)
        }
    }

    const baseColCount = 7
    const extraColCount = isActionTab ? (1 + currentTabConfig.inputColumns.length) : 0
    const totalColSpan = baseColCount + extraColCount

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="py-2">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">CRR Enquiry</h1>
                    <p className="text-slate-600 mt-1">Manage Customer Retention Rate enquiries</p>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 rounded-xl bg-white p-1 mb-6 w-fit overflow-x-auto border border-gray-200 shadow-sm">
                    {TABS.map((tab) => {
                        const count = getTabCount(tab)
                        const isActive = activeTab === tab

                        let Icon = UsersIcon
                        let activeClass = "bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-200"
                        let inactiveClass = "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        let badgeClass = "bg-sky-100 text-sky-700"

                        if (tab === "Give Rates") {
                            Icon = TrendingUpIcon
                            activeClass = "bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200"
                            badgeClass = "bg-teal-100 text-teal-700"
                        } else if (tab === "Send Offer") {
                            Icon = ShareIcon
                            activeClass = "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                            badgeClass = "bg-indigo-100 text-indigo-700"
                        } else if (tab === "Get Order") {
                            Icon = ShoppingCartIcon
                            activeClass = "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-200"
                            badgeClass = "bg-emerald-100 text-emerald-700"
                        } else if (tab === "Order Not Recived") {
                            Icon = AlertCircleIcon
                            activeClass = "bg-rose-50 text-rose-700 shadow-sm ring-1 ring-rose-200"
                            badgeClass = "bg-rose-100 text-rose-700"
                        }

                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                                    flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium leading-5 transition-all duration-200 whitespace-nowrap
                                    ${isActive ? activeClass : inactiveClass}
                                `}
                            >
                                <Icon className={`h-4 w-4 ${isActive ? '' : 'text-gray-400'}`} />
                                {tab}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badgeClass} ${isActive ? '' : 'bg-gray-100 text-gray-500'}`}>
                                    {count}
                                </span>
                            </button>
                        )
                    })}
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
                        </div>
                        <div className="flex gap-3">
                            {isActionTab && (
                                <button
                                    onClick={handleTabSubmit}
                                    disabled={isTabSubmitting || !hasSelectedRows}
                                    className={`bg-emerald-600 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 ${(isTabSubmitting || !hasSelectedRows) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-700'}`}
                                >
                                    {isTabSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Submit Selected
                                        </>
                                    )}
                                </button>
                            )}
                            <button
                                onClick={() => setShowForm(true)}
                                className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2"
                            >
                                <span className="material-icons text-sm">add</span>
                                New Enquiry
                            </button>
                        </div>
                    </div>
                </div>

                {/* Modal Form */}
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-800">New CRR Enquiry Form</h2>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="text-gray-500 hover:text-gray-700 focus:outline-none"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name</label>
                                        <select required value={formData.firmName} onChange={(e) => setFormData({ ...formData, firmName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500">
                                            <option value="">Select Firm Name</option>
                                            {masterData.firmNames.map((name, index) => (<option key={index} value={name}>{name}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Party Names</label>
                                        <select value={formData.partyNames} onChange={(e) => setFormData({ ...formData, partyNames: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500">
                                            <option value="">Select Party Name</option>
                                            {masterData.partyNames.map((name, index) => (<option key={index} value={name}>{name}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                                        <select required value={formData.productName} onChange={(e) => setFormData({ ...formData, productName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500">
                                            <option value="">Select Product Name</option>
                                            {masterData.productNames.map((name, index) => (<option key={index} value={name}>{name}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
                                        <input type="number" required value={formData.qty} onChange={(e) => setFormData({ ...formData, qty: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Enter Quantity" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                        <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500">
                                            <option value="">Select Department</option>
                                            {masterData.departments.map((dept, index) => (<option key={index} value={dept}>{dept}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">When Required</label>
                                        <input type="date" required value={formData.whenRequired} onChange={(e) => setFormData({ ...formData, whenRequired: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sales Person</label>
                                        <select required value={formData.salesPerson} onChange={(e) => setFormData({ ...formData, salesPerson: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500">
                                            <option value="">Select Sales Person</option>
                                            {masterData.salesPersons.map((person, index) => (<option key={index} value={person}>{person}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Order Received Parallelly?</label>
                                        <select value={formData.orderReceivedParallelly} onChange={(e) => setFormData({ ...formData, orderReceivedParallelly: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500">
                                            <option value="">Select option</option>
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Need Price From Management?</label>
                                        <select value={formData.needPriceFromManagement} onChange={(e) => setFormData({ ...formData, needPriceFromManagement: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500">
                                            <option value="">Select option</option>
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </div>
                                    {formData.needPriceFromManagement === "Yes" && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Last Order Received Date</label>
                                                <input type="date" value={formData.lastOrderReceivedDate} onChange={(e) => setFormData({ ...formData, lastOrderReceivedDate: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Last Order Received Price</label>
                                                <input type="number" value={formData.lastOrderReceivedPrice} onChange={(e) => setFormData({ ...formData, lastOrderReceivedPrice: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Enter Last Price" />
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                    <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-6 rounded-md transition-colors">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className={`bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-6 rounded-md transition-colors ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                        {isSubmitting ? 'Submitting...' : 'Submit Enquiry'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {activeTab === "All Crm" && (
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Stage</th>
                                    )}
                                    {isActionTab && (
                                        <>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-12">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                                    checked={filteredEnquiries.length > 0 && filteredEnquiries.every(e => selectedRows[e.id])}
                                                    onChange={(e) => {
                                                        const newSelected = {}
                                                        if (e.target.checked) {
                                                            filteredEnquiries.forEach(enq => { newSelected[enq.id] = true })
                                                        }
                                                        setSelectedRows(newSelected)
                                                    }}
                                                />
                                            </th>
                                            {currentTabConfig.inputColumns.map(col => (
                                                <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{col.label}</th>
                                            ))}
                                        </>
                                    )}
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Enquiry No</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Firm Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Party Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Sales Person</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {isLoadingData ? (
                                    <tr>
                                        <td colSpan={totalColSpan} className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-2"></div>
                                                <p className="text-sm text-slate-400">Loading enquiries...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredEnquiries.length === 0 ? (
                                    <tr>
                                        <td colSpan={totalColSpan} className="px-6 py-12 text-center text-slate-500">
                                            No enquiries found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEnquiries.map((enquiry) => {
                                        const isChecked = !!selectedRows[enquiry.id]
                                        const inputs = tabInputs[enquiry.id] || {}
                                        return (
                                            <tr key={enquiry.id} className="hover:bg-slate-50 transition-colors">
                                                {isActionTab && (
                                                    <>
                                                        <td className="px-4 py-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                                                checked={isChecked}
                                                                onChange={() => handleCheckboxToggle(enquiry.id)}
                                                            />
                                                        </td>
                                                        {currentTabConfig.inputColumns.map(col => (
                                                            <td key={col.key} className="px-4 py-4">
                                                                <input
                                                                    type="text"
                                                                    value={inputs[col.key] || ""}
                                                                    onChange={(e) => handleTabInputChange(enquiry.id, col.key, e.target.value)}
                                                                    disabled={!isChecked}
                                                                    placeholder={col.label}
                                                                    className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 ${isChecked ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                                                />
                                                            </td>
                                                        ))}
                                                    </>
                                                )}
                                                {activeTab === "All Crm" && (
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        {(() => {
                                                            const stage = getEnquiryStage(enquiry)
                                                            let stageClass = "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                            let Icon = null

                                                            if (stage === "Give Rates") {
                                                                stageClass = "bg-teal-100 text-teal-700 hover:bg-teal-200"
                                                                Icon = TrendingUpIcon
                                                            } else if (stage === "Send Offer") {
                                                                stageClass = "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                                                Icon = ShareIcon
                                                            } else if (stage === "Get Order") {
                                                                stageClass = "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                                                Icon = ShoppingCartIcon
                                                            } else if (stage === "Order Not Recived") {
                                                                stageClass = "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                                                Icon = AlertCircleIcon
                                                            }

                                                            return (
                                                                <button
                                                                    onClick={() => handleStageClick(enquiry, stage)}
                                                                    disabled={stage === "Completed"}
                                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${stageClass} ${stage === "Completed" ? 'cursor-default opacity-75' : 'cursor-pointer'}`}
                                                                >
                                                                    {Icon && <Icon className="h-3 w-3" />}
                                                                    {stage}
                                                                </button>
                                                            )
                                                        })()}
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 text-slate-700 font-medium text-sm">{enquiry.enquiryNo}</td>
                                                <td className="px-6 py-4 text-slate-800 font-medium text-sm">{enquiry.firmName}</td>
                                                <td className="px-6 py-4 text-slate-600 text-sm">{enquiry.partyName}</td>
                                                <td className="px-6 py-4 text-slate-600 text-sm">{enquiry.productName}</td>
                                                <td className="px-6 py-4 text-slate-600 text-sm">{enquiry.qty}</td>
                                                <td className="px-6 py-4 text-slate-600 text-sm">{enquiry.salesPerson}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                                        {enquiry.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Update Stage Modal */}
            {updateModalOpen && currentUpdateStage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">Update Stage</h2>
                                <p className="text-sm text-gray-500">{currentUpdateStage} - {currentUpdateEnquiry?.enquiryNo}</p>
                            </div>
                            <button
                                onClick={() => setUpdateModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleUpdateStageSubmit} className="p-6 space-y-4">
                            {TAB_CONFIG[currentUpdateStage].inputColumns.map((col) => (
                                <div key={col.key}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{col.label}</label>
                                    <input
                                        type="text"
                                        value={updateFormData[col.key] || ""}
                                        onChange={(e) => setUpdateFormData({ ...updateFormData, [col.key]: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow"
                                        placeholder={`Enter ${col.label}`}
                                        required
                                    />
                                </div>
                            ))}

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setUpdateModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isTabSubmitting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isTabSubmitting ? 'Updating...' : 'Update Stage'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div >
    )
}

export default CRREnquiry
