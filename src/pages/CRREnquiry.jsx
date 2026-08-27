"use client"

import { useState, useContext, useEffect, useCallback, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { AuthContext } from "../App"
import axios from "axios"
import { UsersIcon, TrendingUpIcon, ShareIcon, ShoppingCartIcon, AlertCircleIcon, RefreshCwIcon } from "../components/Icons"
import { X, Send, Image as ImageIcon, ExternalLink, CheckCircle, Paperclip, Download } from "lucide-react"
import Pagination from "../components/ui/Pagination"
import { exportToCsv } from "../utils/exportCsv"

const PAGE_SIZE = 10

const findColIdx = (headers, names, fallback = -1) => {
    if (!headers || headers.length === 0) return fallback
    const nameList = Array.isArray(names) ? names : [names]
    const idx = headers.findIndex(h => {
        const clean = String(h || '').trim().toLowerCase().replace(/[\s_\-]+/g, '')
        return nameList.some(target => {
            const cleanTarget = target.toLowerCase().replace(/[\s_\-]+/g, '')
            return clean === cleanTarget || clean.includes(cleanTarget)
        })
    })
    return idx !== -1 ? idx : fallback
}

const isStatusOrderNotReceived = (val) => {
    const s = String(val || '').trim().toLowerCase().replace(/[\s_\-]+/g, '')
    return s.includes('notreceive') || s.includes('notreceived')
}

function CRREnquiry() {
    const { showNotification } = useContext(AuthContext)
    const location = useLocation()
    const navigate = useNavigate()
    const [searchQuery, setSearchQuery] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isTabSubmitting, setIsTabSubmitting] = useState(false)
    const [activeTab, setActiveTab] = useState("All Crm")
    const [page, setPage] = useState(1)
    const [enquiries, setEnquiries] = useState([])
    const [sheetHeaders, setSheetHeaders] = useState([])
    const [isLoadingData, setIsLoadingData] = useState(false)

    const TABS = [
        "All Crm",
        "Give Rates",
        "Send Offer",
        "Get Order",
        "Order Not Recived"
    ]

    const tabConfig = useMemo(() => {
        const p1 = findColIdx(sheetHeaders, ['Planned 1', 'Planned1'], 14)
        const a1 = findColIdx(sheetHeaders, ['Actual 1', 'Actual1'], 15)
        const s1 = findColIdx(sheetHeaders, ['Status 1', 'Status1'], 17)
        const rMgmt = findColIdx(sheetHeaders, ['Rate Mgmt', 'RateMgmt'], 18)
        const remMgmt = findColIdx(sheetHeaders, ['Remarks From Mgmt', 'Remarks Mgmt'], 19)

        const p2 = findColIdx(sheetHeaders, ['Planned 2', 'Planned2'], 20)
        const a2 = findColIdx(sheetHeaders, ['Actual 2', 'Actual2'], 21)
        const imgCol = findColIdx(sheetHeaders, ['offer Image', 'Offer Image', 'OfferImage'], 23)
        const s2 = findColIdx(sheetHeaders, ['Status 2', 'Status2'], 24)

        return {
            "Give Rates": {
                filterNotEmpty: p1,
                filterEmpty: a1,
                timestampCol: a1,
                inputColumns: [
                    { key: 'status1', label: 'Status', storeCol: s1, type: 'text', placeholder: 'Enter Status (e.g. Rates Given / Pending)' },
                    { key: 'rateMgmt', label: 'Rate Mgmt', storeCol: rMgmt, type: 'text', placeholder: 'Enter Rate from Management' },
                    { key: 'remarksMgmt', label: 'Remarks From Mgmt', storeCol: remMgmt, type: 'textarea', placeholder: 'Enter Remarks from Management' }
                ]
            },
            "Send Offer": {
                filterNotEmpty: p2,
                filterEmpty: a2,
                timestampCol: a2,
                inputColumns: [
                    {
                        key: 'status2',
                        label: 'Status 2',
                        storeCol: s2,
                        type: 'select',
                        options: ['Order Receive', 'Order Not Receive'],
                        placeholder: 'Select Status'
                    },
                    {
                        key: 'offerImage',
                        label: 'Offer Image',
                        storeCol: imgCol,
                        type: 'file',
                        placeholder: 'Upload Offer Image'
                    }
                ]
            }
        }
    }, [sheetHeaders])

    const formulaColumnIndexes = useMemo(() => {
        if (!sheetHeaders || sheetHeaders.length === 0) return [14, 16, 20, 22, 25, 27, 29, 31]
        const indexes = []
        sheetHeaders.forEach((h, idx) => {
            const clean = String(h || '').trim().toLowerCase()
            if (clean.includes('planned') || clean.includes('delay')) {
                indexes.push(idx)
            }
        })
        return indexes
    }, [sheetHeaders])

    const [masterData, setMasterData] = useState({
        firmNames: [],
        partyNames: [],
        productNames: [],
        salesPersons: [],
        departments: []
    })

    const getEnquiryStage = useCallback((enquiry) => {
        const raw = enquiry.rawRow || []
        const p1 = findColIdx(sheetHeaders, ['Planned 1', 'Planned1'], 14)
        const a1 = findColIdx(sheetHeaders, ['Actual 1', 'Actual1'], 15)
        const p2 = findColIdx(sheetHeaders, ['Planned 2', 'Planned2'], 20)
        const a2 = findColIdx(sheetHeaders, ['Actual 2', 'Actual2'], 21)
        const s2 = findColIdx(sheetHeaders, ['Status 2', 'Status2'], 24)
        const p4 = findColIdx(sheetHeaders, ['Planned 4', 'Planned4'], 29)

        const p1Val = raw[p1]
        const a1Val = raw[a1]
        const p2Val = raw[p2]
        const a2Val = raw[a2]
        const s2Val = raw[s2]
        const p4Val = raw[p4]

        // 1. Give Rates: Planned 1 has value & Actual 1 is empty
        if (p1Val && String(p1Val).trim() !== "" && (!a1Val || String(a1Val).trim() === "")) {
            return "Give Rates"
        }

        // 2. Send Offer: (Planned 2 or Actual 1 has value) & Actual 2 is empty
        if ((p2Val || a1Val) && (!a2Val || String(a2Val).trim() === "")) {
            return "Send Offer"
        }

        // 3. If Send Offer is completed (Actual 2 is not empty):
        if (a2Val && String(a2Val).trim() !== "") {
            if (isStatusOrderNotReceived(s2Val)) {
                // If Status 2 was Order Not Receive -> goes to "Order Not Recived"
                return "Order Not Recived"
            } else {
                // If Status 2 was Order Receive -> goes to "Get Order"
                return "Get Order"
            }
        }

        if (p4Val && String(p4Val).trim() !== "") {
            return "Order Not Recived"
        }

        return "Completed"
    }, [sheetHeaders])

    const isEnquiryInTab = useCallback((enquiry, tab) => {
        const stage = getEnquiryStage(enquiry)
        if (tab === "All Crm") {
            // Exclude resolved enquiries (Get Order / Order Not Recived / Completed) from All tab
            return stage !== "Get Order" && stage !== "Order Not Recived" && stage !== "Completed"
        }
        return stage === tab
    }, [getEnquiryStage])

    const getTabCount = (tab) => {
        return enquiries.filter(e => isEnquiryInTab(e, tab)).length
    }

    const [updateModalOpen, setUpdateModalOpen] = useState(false)
    const [currentUpdateEnquiry, setCurrentUpdateEnquiry] = useState(null)
    const [currentUpdateStage, setCurrentUpdateStage] = useState(null)
    const [updateFormData, setUpdateFormData] = useState({})
    const [generatingLeadFor, setGeneratingLeadFor] = useState(null)

    // Flowchart edge: "CRR enquiry -> Lead". When a CRR enquiry ends up Order Not Received,
    // re-inject it into the NBD Lead (FMS) sheet so the sales team can re-pursue it as a fresh lead.
    const generateLeadFromEnquiry = async (enquiry) => {
        if (generatingLeadFor) return
        setGeneratingLeadFor(enquiry.id)
        try {
            const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
            const fmsSheetName = import.meta.env.VITE_FMS_SHEET_NAME

            if (!scriptUrl || !fmsSheetName) {
                showNotification("FMS sheet configuration missing in .env", "error")
                return
            }

            // Determine next Lead No. (format LE-N), same convention as NBD Lead page
            const fmsRes = await axios.get(`${scriptUrl}?sheet=${encodeURIComponent(fmsSheetName)}&t=${Date.now()}`)
            let maxId = 0
            if (fmsRes.data && Array.isArray(fmsRes.data.data)) {
                fmsRes.data.data.slice(6).forEach(row => {
                    const leadNo = String(row[1] || "")
                    if (leadNo.startsWith("LE-") || leadNo.startsWith("LI-")) {
                        const num = parseInt(leadNo.split("-")[1], 10)
                        if (!isNaN(num) && num > maxId) maxId = num
                    }
                })
            }
            const newLeadNumber = `LE-${maxId + 1}`

            const now = new Date()
            const formattedTimestamp = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

            const rowData = [
                formattedTimestamp,        // Column A: Timestamp
                newLeadNumber,              // Column B: Lead No.
                enquiry.firmName || "",     // Column C: Our Firm Name
                "CRR Enquiry",              // Column D: Lead Received From
                enquiry.salesPerson || "",  // Column E: Name Of The Sales Person
                enquiry.partyName || "",    // Column F: Name Of The Company
                enquiry.department || "",   // Column G: Department
                "",                          // Column H: Location (not captured on CRR enquiries)
            ]

            const payload = new URLSearchParams()
            payload.append("action", "insert")
            payload.append("sheetName", fmsSheetName)
            payload.append("rowData", JSON.stringify(rowData))

            const res = await axios.post(scriptUrl, payload)
            if (res.data && res.data.success) {
                showNotification(`Lead ${newLeadNumber} generated in NBD Lead from enquiry ${enquiry.enquiryNo}!`, "success")
            } else {
                throw new Error(res.data?.error || "Failed to create lead")
            }
        } catch (err) {
            console.error("Error generating lead from enquiry:", err)
            showNotification("Error generating lead: " + err.message, "error")
        } finally {
            setGeneratingLeadFor(null)
        }
    }

    const uploadFileToDrive = async (file) => {
        const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
        const folderId = import.meta.env.VITE_NBD_DRIVE_FOLDER_ID

        if (!scriptUrl || !folderId) throw new Error("Google Drive folder ID or script URL missing in .env")

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

    const handleStageClick = (enquiry, stage) => {
        if (!stage || stage === "Completed" || stage === "Get Order" || stage === "Order Not Recived") return
        setCurrentUpdateEnquiry(enquiry)
        setCurrentUpdateStage(stage)
        
        // Prefill existing values if any
        const config = tabConfig[stage]
        const initialValues = {}
        if (config) {
            config.inputColumns.forEach(col => {
                if (col.type !== 'file') {
                    const existingVal = enquiry.rawRow?.[col.storeCol]
                    initialValues[col.key] = existingVal ? String(existingVal).trim() : ""
                } else if (col.key === 'offerImage') {
                    initialValues[col.key] = enquiry.offerImage || ""
                }
            })
        }
        setUpdateFormData(initialValues)
        setUpdateModalOpen(true)
    }

    const handleUpdateStageSubmit = async (e) => {
        e.preventDefault()
        if (!currentUpdateEnquiry || !currentUpdateStage) return

        setIsTabSubmitting(true)

        try {
            const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
            const sheetName = import.meta.env.VITE_CRR_ENQUIRY_SHEET_NAME || 'ENQUIRY FMS'
            const timestamp = getCurrentTimestamp()

            // Fetch fresh sheet headers to ensure exact index resolution
            let freshHeaders = sheetHeaders
            const resFresh = await axios.get(`${scriptUrl}?sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`)
            if (resFresh.data && Array.isArray(resFresh.data.data)) {
                const allData = resFresh.data.data
                const headerRow = allData[5] || allData[4] || []
                if (headerRow.length > 0) {
                    freshHeaders = headerRow.map(h => String(h || '').trim())
                    setSheetHeaders(freshHeaders)
                }
            }

            // 1. Handle file upload if any (Offer Image)
            let offerImageUrl = updateFormData['offerImage']
            if (offerImageUrl instanceof File) {
                try {
                    offerImageUrl = await uploadFileToDrive(offerImageUrl)
                } catch (uploadErr) {
                    console.error("Offer image upload failed:", uploadErr)
                    showNotification("Failed to upload offer image to Drive: " + uploadErr.message, "error")
                    setIsTabSubmitting(false)
                    return
                }
            }

            // Resolve dynamic columns
            const currentP1 = findColIdx(freshHeaders, ['Planned 1', 'Planned1'], 14)
            const currentA1 = findColIdx(freshHeaders, ['Actual 1', 'Actual1'], 15)
            const currentS1 = findColIdx(freshHeaders, ['Status 1', 'Status1'], 17)
            const currentRMgmt = findColIdx(freshHeaders, ['Rate Mgmt', 'RateMgmt'], 18)
            const currentRemMgmt = findColIdx(freshHeaders, ['Remarks From Mgmt', 'Remarks Mgmt'], 19)

            const currentP2 = findColIdx(freshHeaders, ['Planned 2', 'Planned2'], 20)
            const currentA2 = findColIdx(freshHeaders, ['Actual 2', 'Actual2'], 21)
            const currentImgCol = findColIdx(freshHeaders, ['offer Image', 'Offer Image', 'OfferImage'], 23)
            const currentS2 = findColIdx(freshHeaders, ['Status 2', 'Status2'], 24)

            const activeConfigMap = {
                "Give Rates": {
                    timestampCol: currentA1,
                    fields: [
                        { colIdx: currentS1, val: updateFormData['status1'] || "" },
                        { colIdx: currentRMgmt, val: updateFormData['rateMgmt'] || "" },
                        { colIdx: currentRemMgmt, val: updateFormData['remarksMgmt'] || "" }
                    ]
                },
                "Send Offer": {
                    timestampCol: currentA2,
                    fields: [
                        { colIdx: currentS2, val: updateFormData['status2'] || "" },
                        { colIdx: currentImgCol, val: typeof offerImageUrl === 'string' ? offerImageUrl : (currentUpdateEnquiry.offerImage || "") }
                    ]
                }
            }

            const currentStagePlan = activeConfigMap[currentUpdateStage]
            const updatedRow = [...(currentUpdateEnquiry.rawRow || [])]
            while (updatedRow.length < Math.max(35, freshHeaders.length)) updatedRow.push("")

            // Format all existing columns
            for (let i = 0; i < updatedRow.length; i++) {
                updatedRow[i] = formatISODateToCustom(updatedRow[i])
            }

            // Formula columns set to null so Apps Script doesn't overwrite formulas
            formulaColumnIndexes.forEach(index => {
                if (index < updatedRow.length) {
                    updatedRow[index] = null
                }
            })

            // Set timestamp
            if (currentStagePlan && currentStagePlan.timestampCol !== -1) {
                updatedRow[currentStagePlan.timestampCol] = timestamp
            }

            // Set fields in updatedRow
            if (currentStagePlan && Array.isArray(currentStagePlan.fields)) {
                currentStagePlan.fields.forEach(f => {
                    if (f.colIdx !== -1) {
                        updatedRow[f.colIdx] = f.val
                    }
                })
            }

            // Save full row
            const formDataToSend = new FormData()
            formDataToSend.append('action', 'update')
            formDataToSend.append('sheetName', sheetName)
            formDataToSend.append('rowIndex', currentUpdateEnquiry.sheetRowIndex.toString())
            formDataToSend.append('rowData', JSON.stringify(updatedRow))
            await axios.post(scriptUrl, formDataToSend)

            // Direct cell updates for 100% guarantee on status & image
            if (currentStagePlan && Array.isArray(currentStagePlan.fields)) {
                for (const f of currentStagePlan.fields) {
                    if (f.colIdx !== -1 && f.val !== undefined) {
                        const cellPayload = new URLSearchParams()
                        cellPayload.append('action', 'updateCell')
                        cellPayload.append('sheetName', sheetName)
                        cellPayload.append('rowIndex', currentUpdateEnquiry.sheetRowIndex.toString())
                        cellPayload.append('columnIndex', (f.colIdx + 1).toString())
                        cellPayload.append('value', f.val)
                        await axios.post(scriptUrl, cellPayload).catch(() => null)
                    }
                }
            }

            showNotification(`Enquiry ${currentUpdateEnquiry.enquiryNo} updated successfully!`, "success")
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

    const fetchAllData = useCallback(async () => {
        setIsLoadingData(true)
        try {
            const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
            const masterSheetName = import.meta.env.VITE_MASTER_SHEET_NAME || 'Master'
            const enquirySheetName = import.meta.env.VITE_CRR_ENQUIRY_SHEET_NAME || 'ENQUIRY FMS'

            const [masterResponse, enquiryResponse] = await Promise.all([
                axios.get(`${scriptUrl}?sheet=${masterSheetName}&t=${new Date().getTime()}`),
                axios.get(`${scriptUrl}?sheet=${enquirySheetName}&t=${new Date().getTime()}`)
            ])
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

            if (enquiryResponse.data && enquiryResponse.data.data) {
                const allData = enquiryResponse.data.data
                const detectedHeaders = (allData[5] || allData[4] || []).map(h => String(h || '').trim())
                setSheetHeaders(detectedHeaders)

                // Detect Offer Image column
                const offerImageIdx = findColIdx(detectedHeaders, ['offer Image', 'Offer Image', 'OfferImage'], 23)

                const rawData = allData.slice(6)
                const mappedEnquiries = rawData.map((row, index) => {
                    const offerImageVal = offerImageIdx !== -1 && row[offerImageIdx] ? String(row[offerImageIdx]).trim() : ""
                    return {
                        id: row[1] ? row[1].toString() : `ENQ-${index + 1}`,
                        sheetRowIndex: index + 7,
                        timestamp: row[0] || "",
                        enquiryNo: row[1] || "",
                        firmName: row[2] || "",
                        partyName: row[3] || "",
                        productName: row[4] || "",
                        qty: row[5] || "",
                        department: row[6] || "",
                        whenRequired: row[7] || "",
                        salesPerson: row[8] || "",
                        orderReceivedParallelly: row[9] || "",
                        needPriceFromManagement: row[10] || "",
                        lastOrderReceivedDate: row[11] || "",
                        lastOrderReceivedPrice: row[12] || "",
                        status: row[13] || "",
                        offerImage: offerImageVal,
                        rawRow: row
                    }
                }).reverse()
                setEnquiries(mappedEnquiries)
            }
        } catch (error) {
            console.error("Error fetching data:", error)
            showNotification("Failed to fetch enquiries data", "error")
        } finally {
            setIsLoadingData(false)
        }
    }, [showNotification])

    useEffect(() => {
        fetchAllData()
    }, [fetchAllData])

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

    // Handoff from NBD Lead: "Enquiry Received" → "CRR Enquiry" opens this New Enquiry form, prefilled
    useEffect(() => {
        if (location.state?.openNewEnquiry) {
            const lead = location.state.lead || {}
            setFormData(prev => ({
                ...prev,
                firmName: lead.companyName || prev.firmName,
                partyNames: lead.companyName || prev.partyNames,
                department: lead.department || prev.department,
                salesPerson: lead.salesPerson || prev.salesPerson,
            }))
            setShowForm(true)
            // Clear the handoff state so a refresh/back doesn't reopen it
            navigate(location.pathname, { replace: true, state: {} })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state])

    const filteredEnquiries = enquiries.filter(e => {
        const matchesSearch = e.firmName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.enquiryNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.partyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.salesPerson?.toLowerCase().includes(searchQuery.toLowerCase())

        if (activeTab !== "All Crm") {
            return matchesSearch && isEnquiryInTab(e, activeTab)
        }

        return matchesSearch
    })

    // Reset to page 1 whenever the active tab or search term changes
    useEffect(() => {
        setPage(1)
    }, [activeTab, searchQuery])

    const paginatedEnquiries = filteredEnquiries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const handleExportEnquiries = () => {
        exportToCsv(`crr-enquiries-${activeTab.replace(/\s+/g, "-").toLowerCase()}`, [
            { label: "Enquiry No", value: (e) => e.enquiryNo || "" },
            { label: "Firm Name", value: (e) => e.firmName || "" },
            { label: "Party Name", value: (e) => e.partyName || "" },
            { label: "Product", value: (e) => e.productName || "" },
            { label: "Qty", value: (e) => e.qty || "" },
            { label: "Sales Person", value: (e) => e.salesPerson || "" },
            { label: "Status", value: (e) => e.status || "" },
        ], filteredEnquiries)
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

    return (
        <div className="py-2 min-h-screen">
            {/* Tabs */}
            <div className="flex space-x-2 rounded-2xl bg-white p-1.5 mb-8 w-fit mx-auto overflow-x-auto border border-slate-200 shadow-sm">
                {TABS.map((tab) => {
                    const count = getTabCount(tab)
                    const isActive = activeTab === tab

                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold leading-5 transition-all duration-200 whitespace-nowrap cursor-pointer ${
                                isActive
                                    ? "bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-200"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            {tab === "All Crm" && <UsersIcon className="h-4 w-4 text-sky-500" />}
                            {tab === "Give Rates" && <TrendingUpIcon className="h-4 w-4 text-teal-600" />}
                            {tab === "Send Offer" && <ShareIcon className="h-4 w-4 text-indigo-600" />}
                            {tab === "Get Order" && <ShoppingCartIcon className="h-4 w-4 text-emerald-600" />}
                            {tab === "Order Not Recived" && <AlertCircleIcon className="h-4 w-4 text-rose-600" />}
                            {tab}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isActive ? "bg-sky-100 text-sky-700" : "bg-gray-100 text-gray-500"}`}>
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Controls */}
            <div className="bg-card rounded-2xl shadow-sm border border-slate-200/70 p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
                        <input
                            type="text"
                            placeholder="Search by Enquiry No, Firm, Party, Product, Sales Person..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 flex-1 max-w-md"
                        />
                    </div>
                    <div className="flex gap-3 items-center">
                        <button
                            onClick={handleExportEnquiries}
                            disabled={filteredEnquiries.length === 0}
                            className="inline-flex items-center gap-2 bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted font-medium py-2 px-4 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <Download className="h-4 w-4" />
                            Export
                        </button>
                        <button
                            onClick={fetchAllData}
                            disabled={isLoadingData}
                            className="inline-flex items-center gap-2 bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted font-medium py-2 px-4 rounded-md transition-colors cursor-pointer"
                        >
                            <RefreshCwIcon className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        {activeTab === "All Crm" && (
                            <button
                                onClick={() => setShowForm(true)}
                                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-md transition-colors cursor-pointer"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                </svg>
                                New Enquiry
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Form: New CRR Enquiry */}
            {showForm && activeTab === "All Crm" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-200 transform transition-all">
                        <div className="p-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-10 flex justify-between items-center rounded-t-2xl">
                            <div className="flex flex-col">
                                <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    New CRR Enquiry
                                </h2>
                                <p className="text-sm font-medium text-slate-500 mt-1">Fill in the details below to create a new enquiry</p>
                            </div>
                            <button
                                onClick={() => setShowForm(false)}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors self-start cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Firm Name <span className="text-rose-500">*</span></label>
                                    <select required value={formData.firmName} onChange={(e) => setFormData({ ...formData, firmName: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                                        <option value="">Select Firm Name</option>
                                        {masterData.firmNames.map((name, index) => (<option key={index} value={name}>{name}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Party Names</label>
                                    <select value={formData.partyNames} onChange={(e) => setFormData({ ...formData, partyNames: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                                        <option value="">Select Party Name</option>
                                        {masterData.partyNames.map((name, index) => (<option key={index} value={name}>{name}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Product Name <span className="text-rose-500">*</span></label>
                                    <select required value={formData.productName} onChange={(e) => setFormData({ ...formData, productName: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                                        <option value="">Select Product Name</option>
                                        {masterData.productNames.map((name, index) => (<option key={index} value={name}>{name}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Qty <span className="text-rose-500">*</span></label>
                                    <input type="number" required value={formData.qty} onChange={(e) => setFormData({ ...formData, qty: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors" placeholder="Enter Quantity" />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Department</label>
                                    <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                                        <option value="">Select Department</option>
                                        {masterData.departments.map((dept, index) => (<option key={index} value={dept}>{dept}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">When Required <span className="text-rose-500">*</span></label>
                                    <input type="date" required value={formData.whenRequired} onChange={(e) => setFormData({ ...formData, whenRequired: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Sales Person <span className="text-rose-500">*</span></label>
                                    <select required value={formData.salesPerson} onChange={(e) => setFormData({ ...formData, salesPerson: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                                        <option value="">Select Sales Person</option>
                                        {masterData.salesPersons.map((person, index) => (<option key={index} value={person}>{person}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Order Received Parallelly?</label>
                                    <select value={formData.orderReceivedParallelly} onChange={(e) => setFormData({ ...formData, orderReceivedParallelly: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                                        <option value="">Select option</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Need Price From Mgt?</label>
                                    <select value={formData.needPriceFromManagement} onChange={(e) => setFormData({ ...formData, needPriceFromManagement: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                                        <option value="">Select option</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                {formData.needPriceFromManagement === "Yes" && (
                                    <>
                                        <div>
                                            <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Last Order Date</label>
                                            <input type="date" value={formData.lastOrderReceivedDate} onChange={(e) => setFormData({ ...formData, lastOrderReceivedDate: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors" />
                                        </div>
                                        <div>
                                            <label className="block text-[13px] font-bold text-slate-700 text-left mb-1.5 uppercase tracking-wider">Last Order Price</label>
                                            <input type="number" value={formData.lastOrderReceivedPrice} onChange={(e) => setFormData({ ...formData, lastOrderReceivedPrice: e.target.value })} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors" placeholder="Enter Last Price" />
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex justify-end gap-3 pt-5 border-t border-slate-100 mt-6 bg-slate-50 -mx-6 -mb-6 px-6 py-4 rounded-b-2xl">
                                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all cursor-pointer">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className={`px-6 py-2.5 text-sm font-bold text-white bg-sky-600 rounded-xl shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition-all hover:shadow-lg transform hover:-translate-y-0.5 cursor-pointer ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                    {isSubmitting ? 'Submitting...' : 'Submit Enquiry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-200/70 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="bg-muted border-b border-border sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                                    Action / Status
                                </th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                                    Enquiry No
                                </th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                                    Firm Name
                                </th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                                    Party Name
                                </th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                                    Product
                                </th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                                    Qty
                                </th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                                    Sales Person
                                </th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                                    Status
                                </th>
                                <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                                    Offer Image
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {isLoadingData ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-14 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary mb-3"></div>
                                            <p className="text-sm text-muted-foreground">Loading enquiries...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredEnquiries.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-14 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-sm font-medium">No enquiries found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedEnquiries.map((enquiry) => {
                                    const currentStage = getEnquiryStage(enquiry)
                                    return (
                                        <tr key={enquiry.id} className="hover:bg-muted/70 transition-colors duration-150">
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {activeTab === "All Crm" ? (
                                                    (() => {
                                                        const stage = currentStage

                                                        if (stage === "Give Rates") {
                                                            return (
                                                                <button
                                                                    onClick={() => handleStageClick(enquiry, "Give Rates")}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs bg-teal-100 text-teal-700 hover:bg-teal-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-sm"
                                                                >
                                                                    <TrendingUpIcon className="h-3 w-3" />
                                                                    Give Rates
                                                                </button>
                                                            )
                                                        } else if (stage === "Send Offer") {
                                                            return (
                                                                <button
                                                                    onClick={() => handleStageClick(enquiry, "Send Offer")}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-sm"
                                                                >
                                                                    <ShareIcon className="h-3 w-3" />
                                                                    Send Offer
                                                                </button>
                                                            )
                                                        } else if (stage === "Get Order") {
                                                            return (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 shadow-xs">
                                                                    <ShoppingCartIcon className="h-3 w-3" />
                                                                    Order Received
                                                                </span>
                                                            )
                                                        } else if (stage === "Order Not Recived") {
                                                            return (
                                                                <div className="flex flex-col items-center gap-1.5">
                                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 shadow-xs">
                                                                        <AlertCircleIcon className="h-3 w-3" />
                                                                        Order Not Received
                                                                    </span>
                                                                    <button
                                                                        onClick={() => generateLeadFromEnquiry(enquiry)}
                                                                        disabled={generatingLeadFor === enquiry.id}
                                                                        title="Re-inject this enquiry into NBD Lead for re-pursuit"
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700 hover:bg-sky-200 disabled:opacity-50 cursor-pointer"
                                                                    >
                                                                        {generatingLeadFor === enquiry.id ? "Generating..." : "Generate Lead"}
                                                                    </button>
                                                                </div>
                                                            )
                                                        }

                                                        return (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                                                                <CheckCircle className="h-3 w-3 text-emerald-600" />
                                                                Completed
                                                            </span>
                                                        )
                                                    })()
                                                ) : activeTab === "Get Order" ? (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 shadow-xs">
                                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                                        Order Received
                                                    </span>
                                                ) : activeTab === "Order Not Recived" ? (
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 shadow-xs">
                                                            <AlertCircleIcon className="h-3.5 w-3.5 text-rose-600" />
                                                            Order Not Received
                                                        </span>
                                                        <button
                                                            onClick={() => generateLeadFromEnquiry(enquiry)}
                                                            disabled={generatingLeadFor === enquiry.id}
                                                            title="Re-inject this enquiry into NBD Lead for re-pursuit"
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700 hover:bg-sky-200 disabled:opacity-50 cursor-pointer"
                                                        >
                                                            {generatingLeadFor === enquiry.id ? "Generating..." : "Generate Lead"}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleStageClick(enquiry, activeTab)}
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                                    >
                                                        Action
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-sky-100 text-sky-700 text-sm font-semibold">
                                                    {enquiry.enquiryNo || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-foreground font-medium text-sm max-w-[180px] truncate" title={enquiry.firmName}>{enquiry.firmName || '-'}</td>
                                            <td className="px-6 py-4 text-muted-foreground text-sm max-w-[180px] truncate" title={enquiry.partyName}>{enquiry.partyName || '-'}</td>
                                            <td className="px-6 py-4 text-muted-foreground text-sm max-w-[160px] truncate" title={enquiry.productName}>{enquiry.productName || '-'}</td>
                                            <td className="px-6 py-4 text-muted-foreground text-sm font-medium">{enquiry.qty || '-'}</td>
                                            <td className="px-6 py-4 text-muted-foreground text-sm max-w-[140px] truncate" title={enquiry.salesPerson}>{enquiry.salesPerson || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                                                    {enquiry.status || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {enquiry.offerImage ? (
                                                    <a
                                                        href={enquiry.offerImage}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold border border-indigo-200 transition-colors"
                                                    >
                                                        <ImageIcon className="h-3.5 w-3.5 text-indigo-600" />
                                                        View Image
                                                        <ExternalLink className="h-3 w-3 text-indigo-400" />
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {filteredEnquiries.length > 0 && (
                    <Pagination page={page} pageSize={PAGE_SIZE} totalItems={filteredEnquiries.length} onPageChange={setPage} />
                )}
            </div>

            {/* Update Stage Modal */}
            {updateModalOpen && currentUpdateStage && currentUpdateEnquiry && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto" onClick={() => !isTabSubmitting && setUpdateModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-t-2xl">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-white/10 rounded-lg">
                                    <ShareIcon className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-base md:text-lg font-bold tracking-tight">
                                        {currentUpdateStage}
                                    </h2>
                                    <p className="text-xs text-sky-100">
                                        Enquiry: {currentUpdateEnquiry.enquiryNo || currentUpdateEnquiry.id}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => !isTabSubmitting && setUpdateModalOpen(false)}
                                disabled={isTabSubmitting}
                                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateStageSubmit} className="flex flex-col">
                            <div className="p-6 space-y-4 text-xs">
                                {/* Enquiry Details Card */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-medium">Enquiry No:</span>
                                        <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                                            {currentUpdateEnquiry.enquiryNo || currentUpdateEnquiry.id}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-medium">Firm Name:</span>
                                        <span className="font-semibold text-slate-800">{currentUpdateEnquiry.firmName || "-"}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-medium">Party Name:</span>
                                        <span className="font-medium text-slate-700">{currentUpdateEnquiry.partyName || "-"}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-medium">Product / Qty:</span>
                                        <span className="font-medium text-slate-700">{currentUpdateEnquiry.productName || "-"} (Qty: {currentUpdateEnquiry.qty || "-"})</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-medium">Sales Person:</span>
                                        <span className="font-medium text-slate-700">{currentUpdateEnquiry.salesPerson || "-"}</span>
                                    </div>
                                    {currentUpdateEnquiry.offerImage && (
                                        <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                                            <span className="text-slate-500 font-medium">Existing Offer Image:</span>
                                            <a
                                                href={currentUpdateEnquiry.offerImage}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sky-600 hover:underline font-semibold flex items-center gap-1"
                                            >
                                                <ImageIcon className="h-3 w-3" /> View Attachment
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Dynamic Stage Input Fields */}
                                {tabConfig[currentUpdateStage]?.inputColumns.map((col) => (
                                    <div key={col.key} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                        <label className="block text-xs font-semibold text-slate-700">
                                            {col.label} {col.type !== 'file' && <span className="text-red-500">*</span>}
                                        </label>
                                        {col.type === 'select' ? (
                                            <select
                                                required
                                                value={updateFormData[col.key] || ""}
                                                onChange={(e) => setUpdateFormData({ ...updateFormData, [col.key]: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 text-sm text-slate-800 bg-white cursor-pointer"
                                            >
                                                <option value="">{col.placeholder || `Select ${col.label}`}</option>
                                                {col.options?.map((opt, oIdx) => (
                                                    <option key={oIdx} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        ) : col.type === 'textarea' ? (
                                            <textarea
                                                required
                                                rows={3}
                                                value={updateFormData[col.key] || ""}
                                                onChange={(e) => setUpdateFormData({ ...updateFormData, [col.key]: e.target.value })}
                                                placeholder={col.placeholder || `Enter ${col.label}`}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 text-sm text-slate-800 bg-white resize-none"
                                            />
                                        ) : col.type === 'file' ? (
                                            <div className="space-y-1.5">
                                                <input
                                                    type="file"
                                                    accept="image/*,application/pdf"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0]
                                                        if (file) {
                                                            setUpdateFormData(prev => ({ ...prev, [col.key]: file }))
                                                        }
                                                    }}
                                                    className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 transition-colors cursor-pointer border border-slate-200 rounded-xl p-2 bg-slate-50 focus:outline-none"
                                                />
                                                {updateFormData[col.key] && updateFormData[col.key] instanceof File && (
                                                    <p className="text-[11px] text-sky-600 font-semibold truncate flex items-center gap-1">
                                                        <Paperclip className="h-3 w-3 shrink-0" /> Selected: {updateFormData[col.key].name}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                required
                                                value={updateFormData[col.key] || ""}
                                                onChange={(e) => setUpdateFormData({ ...updateFormData, [col.key]: e.target.value })}
                                                placeholder={col.placeholder || `Enter ${col.label}`}
                                                className="w-full px-3 py-2 border-b border-slate-200 focus:border-sky-600 focus:outline-none text-sm text-slate-800 bg-transparent transition-colors"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3 justify-end border-t border-slate-100 px-6 py-4 bg-slate-50 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={() => setUpdateModalOpen(false)}
                                    disabled={isTabSubmitting}
                                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs md:text-sm rounded-lg border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isTabSubmitting}
                                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs md:text-sm rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                                >
                                    {isTabSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Uploading & Submitting...
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

export default CRREnquiry
