"use client"

import { useState, useEffect } from "react"
import { mockApi } from "../services/mockApi"
import axios from "axios"

const CallTrackerForm = ({ onClose = () => window.history.back() }) => {
  const [formData, setFormData] = useState({
    productNo: "",
    firmName: "",
    enquiryStatus: "",
    typeOfEnquiry: "",
    location: "",
    salesPersonName: "",
    partyName: "",
    department: "",
    totalOrderQty: "",
    expected: "",
    whenRequired: "",
    areaOfApplication: "",
    uploadFile: null,
    contactPersonName: "",
    contactPersonMobile: "",
    emailId: "",
    leadTimeConvert: "",
    fromNbdOutgoing: "",
    offerNo: "",
    proposalAmount1: "",
    proposalRemarks1: "",
    proposalAmount2: "",
    proposalRemarks2: "",
    proposalAmount3: "",
    proposalRemarks3: "",
    gmail: ""
  })

  // Dynamic products list
  const [products, setProducts] = useState([
    { name: "", quantity: "", uom: "" }
  ])

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dropdown states (Fetched from Master Sheet)
  const [dropdowns, setDropdowns] = useState({
    firmNames: [],
    partyNames: [],
    productNos: [],
    enquiryStatuses: [],
    enquiryTypes: [],
    salesPersons: [],
    departments: []
  })

  const [leadSources, setLeadSources] = useState([])
  const [companyDetailsMap, setCompanyDetailsMap] = useState({})

  const uomOptions = ["Nos", "Kgs", "Mtrs", "Ltrs", "Sets"]

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        await fetchMasterSheetData()

        // Keep fetching other mock data if needed
        const dropdownData = await mockApi.fetchEnquiryDropdowns()
        setLeadSources(dropdownData.sources || [])

      } catch (error) {
        console.error("Error fetching form data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const fetchMasterSheetData = async () => {
    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
      const sheetName = import.meta.env.VITE_MASTER_SHEET_NAME

      if (!scriptUrl || !sheetName) return

      const response = await axios.get(`${scriptUrl}?sheet=${sheetName}`)
      if (response.data && response.data.success) {
        const rows = response.data.data.slice(1) // Row 2 starts data (index 1)

        const getUnique = (idx) => [...new Set(rows.map(r => r[idx]).filter(Boolean))]

        setDropdowns({
          firmNames: getUnique(0),    // Col A
          partyNames: getUnique(1),   // Col B
          salesPersons: getUnique(3), // Col D
          departments: getUnique(4),  // Col E
          productNos: getUnique(5),   // Col F
          enquiryStatuses: getUnique(6), // Col G
          enquiryTypes: getUnique(7)  // Col H
        })
      }
    } catch (error) {
      console.error("Error fetching master sheet:", error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, files } = e.target
    if (type === "file") {
      setFormData(prev => ({ ...prev, [name]: files[0] }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  // Handle firm name selection to auto-fill fields
  const handleFirmChange = (e) => {
    const firmName = e.target.value
    setFormData(prev => ({ ...prev, firmName }))

    if (firmName && companyDetailsMap[firmName]) {
      const details = companyDetailsMap[firmName]
      setFormData(prev => ({
        ...prev,
        firmName,
        location: details.address || prev.location,
        salesPersonName: details.contactName || prev.salesPersonName, // Assuming contact is sales person or related
        contactPersonName: details.contactName || prev.contactPersonName,
        contactPersonMobile: details.contactNo || prev.contactPersonMobile,
      }))
    }
  }

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...products]
    updatedProducts[index][field] = value
    setProducts(updatedProducts)
  }

  const addProduct = () => {
    setProducts([...products, { name: "", quantity: "", uom: "" }])
  }

  const removeProduct = (index) => {
    if (products.length > 1) {
      const updatedProducts = products.filter((_, i) => i !== index)
      setProducts(updatedProducts)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
    const sheetName = import.meta.env.VITE_NBD_ENQUIRY_SHEET_NAME

    if (!scriptUrl || !sheetName) {
      alert("Configuration missing for NBD Enquiry Sheet")
      setIsSubmitting(false)
      return
    }

    try {
      // 1. Fetch Sheet Data to Find Headers
      const response = await axios.get(`${scriptUrl}?sheet=${sheetName}`)
      if (!response.data || !response.data.success) {
        throw new Error("Failed to fetch sheet headers")
      }

      const sheetData = response.data.data
      let headerRowIndex = -1
      let headers = []

      // Find the header row (look for "Firm Name" and "Product No.")
      // Scan strictly the first 10 rows
      for (let i = 0; i < Math.min(sheetData.length, 10); i++) {
        const row = sheetData[i].map(c => String(c).trim())
        if (row.includes("Firm Name") && row.includes("Product No.")) {
          headerRowIndex = i
          headers = row
          break
        }
      }

      if (headerRowIndex === -1) {
        alert("Could not find headers in the sheet (checked first 10 rows). Please ensure 'Firm Name' and 'Product No.' headers exist.")
        setIsSubmitting(false)
        return
      }

      // 2. Generate Unique Enquiry No (Format: En-1, En-2...)
      // Find "Enquiry No." column index
      const enquiryNoIndex = headers.findIndex(h => h.trim().toLowerCase() === "enquiry no.")
      let nextEnquiryNo = "EN-1"

      if (enquiryNoIndex !== -1) {
        let maxId = 0
        // Scan all data rows (after header)
        for (let i = headerRowIndex + 1; i < sheetData.length; i++) {
          const val = String(sheetData[i][enquiryNoIndex] || "").trim()
          if (val.toLowerCase().startsWith("en-")) {
            const numPart = parseInt(val.substring(3))
            if (!isNaN(numPart) && numPart > maxId) {
              maxId = numPart
            }
          }
        }
        nextEnquiryNo = `EN-${maxId + 1}`
      }

      // 3. Upload file to Google Drive (if selected)
      const DRIVE_FOLDER_ID = "1lc018wT3S3sz-KP74QQGcqm0I_OEygLn"
      let uploadedFileUrl = ""

      if (formData.uploadFile) {
        try {
          // Convert file to Base64
          const fileBlob = formData.uploadFile
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result.split(",")[1]) // Strip data:...;base64,
            reader.onerror = reject
            reader.readAsDataURL(fileBlob)
          })

          const uploadPayload = new URLSearchParams()
          uploadPayload.append("action", "uploadFile")
          uploadPayload.append("fileName", fileBlob.name)
          uploadPayload.append("mimeType", fileBlob.type)
          uploadPayload.append("base64Data", base64)
          uploadPayload.append("folderId", DRIVE_FOLDER_ID)

          const uploadResponse = await axios.post(scriptUrl, uploadPayload)
          if (uploadResponse.data && uploadResponse.data.success) {
            uploadedFileUrl = uploadResponse.data.fileUrl || uploadResponse.data.url || ""
          } else {
            console.warn("File upload failed:", uploadResponse.data?.error)
          }
        } catch (uploadErr) {
          console.warn("File upload error:", uploadErr.message)
        }
      }

      // 4. Format Timestamp
      const now = new Date()
      // Format: M/D/YYYY H:mm:ss (e.g., 2/19/2026 4:58:00)
      const formattedTimestamp = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`

      // Map fields to header names as per user requirement
      const fieldMapping = {
        "Enquiry No.": nextEnquiryNo,
        "Product No.": formData.productNo,
        "Firm Name": formData.firmName,
        "Enquiry status": formData.enquiryStatus,
        "Type Of Enquiry": formData.typeOfEnquiry,
        "Location": formData.location,
        "Name Of Sales Person": formData.salesPersonName,
        "Party Name": formData.partyName,
        "Department": formData.department,
        "Total Order Qty": formData.totalOrderQty,
        "Expected": formData.expected,
        "When Required": formData.whenRequired,
        "Area Of Application": formData.areaOfApplication,
        "Upload File": uploadedFileUrl, // Google Drive URL (empty if no file or upload failed)
        "Contact Person Name": formData.contactPersonName,
        "Contact Person Mobile No.": formData.contactPersonMobile,
        "Email Id": formData.emailId,
        "Lead Time For Convert In Order": formData.leadTimeConvert,
        "Did The Above Enquiry Come From Nbd Outgoing Sheet": formData.fromNbdOutgoing,
        "Offer No.": formData.offerNo,
        "Product Names": products.map(p => p.name).join(", "),
        "Quetities": products.map(p => p.quantity).join(", "),
        "Uom": products.map(p => p.uom).join(", "),
        "Proposal Amount 1": formData.proposalAmount1,
        "Proposal Remarks 1": formData.proposalRemarks1,
        "Proposal Amount 2": formData.proposalAmount2,
        "Proposal Remarks 2": formData.proposalRemarks2,
        "Proposal Amount 3": formData.proposalAmount3,
        "Proposal Remarks 3": formData.proposalRemarks3,
        "G-mail": formData.gmail,
        "Timestamp": formattedTimestamp
      }

      // Create row data array based on header indices
      // Initialize array with empty strings up to the last header index
      let newRow = new Array(headers.length).fill("")

      Object.entries(fieldMapping).forEach(([key, value]) => {
        // Case-insensitive matching for headers
        const index = headers.findIndex(h => {
          const cleanH = h.toLowerCase().trim()
          const cleanKey = key.toLowerCase().trim()
          return cleanH === cleanKey || cleanH === cleanKey.replace(/\.$/, "") || cleanH.replace(/\.$/, "") === cleanKey
        })
        if (index !== -1) {
          newRow[index] = value
        }
      })

      // Submit Data
      const formDataToSend = new URLSearchParams()
      formDataToSend.append('action', 'insert')
      formDataToSend.append('sheetName', sheetName)
      formDataToSend.append('rowData', JSON.stringify(newRow))

      const submitResponse = await axios.post(scriptUrl, formDataToSend)

      if (submitResponse.data && submitResponse.data.success) {
        alert("Enquiry submitted successfully!")
        onClose()
      } else {
        alert("Failed to submit enquiry: " + (submitResponse.data.error || "Unknown error"))
      }

    } catch (error) {
      console.error("Submit error:", error)
      alert("Error submitting form: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <form id="enquiry-form" onSubmit={handleSubmit} className="space-y-8">

          {/* Section 1: Basic Info */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product No. (Enquiry No)</label>
                <select
                  name="productNo"
                  value={formData.productNo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500 bg-white"
                >
                  <option value="">Select Product No</option>
                  {dropdowns.productNos.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Firm Name</label>
                <select
                  name="firmName"
                  value={formData.firmName}
                  onChange={handleFirmChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500 bg-white"
                  required
                >
                  <option value="">Select Firm Name</option>
                  {dropdowns.firmNames.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Enquiry Status</label>
                <select
                  name="enquiryStatus"
                  value={formData.enquiryStatus}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Select Status</option>
                  {dropdowns.enquiryStatuses.map((s, i) => <option key={i} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type Of Enquiry</label>
                <select
                  name="typeOfEnquiry"
                  value={formData.typeOfEnquiry}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Select Type</option>
                  {dropdowns.enquiryTypes.map((t, i) => <option key={i} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name Of Sales Person</label>
                <select
                  name="salesPersonName"
                  value={formData.salesPersonName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500 bg-white"
                >
                  <option value="">Select Sales Person</option>
                  {dropdowns.salesPersons.map((p, i) => <option key={i} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Party Name</label>
                <select
                  name="partyName"
                  value={formData.partyName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500 bg-white"
                >
                  <option value="">Select Party Name</option>
                  {dropdowns.partyNames.map((p, i) => <option key={i} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500 bg-white"
                >
                  <option value="">Select Department</option>
                  {dropdowns.departments.map((d, i) => <option key={i} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total Order Qty</label>
                <input
                  type="number"
                  name="totalOrderQty"
                  value={formData.totalOrderQty}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expected</label>
                <input
                  type="text"
                  name="expected"
                  value={formData.expected}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Value/Date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">When Required</label>
                <input
                  type="date"
                  name="whenRequired"
                  value={formData.whenRequired}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Area Of Application</label>
                <input
                  type="text"
                  name="areaOfApplication"
                  value={formData.areaOfApplication}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Upload File</label>
                <input
                  type="file"
                  name="uploadFile"
                  onChange={handleChange}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact Details */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person Name</label>
                <input
                  type="text"
                  name="contactPersonName"
                  value={formData.contactPersonName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person Mobile No.</label>
                <input
                  type="tel"
                  name="contactPersonMobile"
                  value={formData.contactPersonMobile}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Id</label>
                <input
                  type="email"
                  name="emailId"
                  value={formData.emailId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">G-mail</label>
                <input
                  type="email"
                  name="gmail"
                  value={formData.gmail}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Additional Details */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Additional Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lead Time For Convert In Order</label>
                <input
                  type="text"
                  name="leadTimeConvert"
                  value={formData.leadTimeConvert}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Did The Above Enquiry Come From Nbd Outgoing Sheet?</label>
                <select
                  name="fromNbdOutgoing"
                  value={formData.fromNbdOutgoing}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Select Option</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Offer No.</label>
                <input
                  type="text"
                  name="offerNo"
                  value={formData.offerNo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Product Names, Quetities, Uom */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-semibold text-slate-800">Products</h3>
              <button type="button" onClick={addProduct} className="text-sm bg-sky-50 text-sky-600 px-3 py-1 rounded hover:bg-sky-100 font-medium transition-colors">
                + Add Product
              </button>
            </div>

            <div className="space-y-3">
              {products.map((product, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50 p-3 rounded-md">
                  <div className="md:col-span-6">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Product Names</label>
                    <input
                      type="text"
                      value={product.name}
                      onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500 text-sm"
                      placeholder="Product Name"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Quetities</label>
                    <input
                      type="number"
                      value={product.quantity}
                      onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500 text-sm"
                      placeholder="Qty"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Uom</label>
                    <input
                      list="uoms"
                      type="text"
                      value={product.uom}
                      onChange={(e) => handleProductChange(index, 'uom', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500 text-sm"
                      placeholder="UOM"
                    />
                    <datalist id="uoms">
                      {uomOptions.map((u, i) => <option key={i} value={u} />)}
                    </datalist>
                  </div>
                  <div className="md:col-span-1 flex justify-center pb-1">
                    <button type="button" onClick={() => removeProduct(index)} className="text-red-500 hover:text-red-700 p-1" disabled={products.length === 1}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Proposals */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Proposals</h3>
            <div className="space-y-6">
              {/* Proposal 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Proposal Amount 1</label>
                  <input
                    type="number"
                    name="proposalAmount1"
                    value={formData.proposalAmount1}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Proposal Remarks 1</label>
                  <input
                    type="text"
                    name="proposalRemarks1"
                    value={formData.proposalRemarks1}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>
              {/* Proposal 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Proposal Amount 2</label>
                  <input
                    type="number"
                    name="proposalAmount2"
                    value={formData.proposalAmount2}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Proposal Remarks 2</label>
                  <input
                    type="text"
                    name="proposalRemarks2"
                    value={formData.proposalRemarks2}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>
              {/* Proposal 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Proposal Amount 3</label>
                  <input
                    type="number"
                    name="proposalAmount3"
                    value={formData.proposalAmount3}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Proposal Remarks 3</label>
                  <input
                    type="text"
                    name="proposalRemarks3"
                    value={formData.proposalRemarks3}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>
            </div>
          </div>

        </form>
      </div>

      {/* Footer Buttons */}
      <div className="p-4 border-t bg-white flex justify-end gap-3 sticky bottom-0 rounded-b-lg">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 border border-slate-300 rounded-md text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="enquiry-form"
          disabled={isSubmitting}
          className="px-6 py-2 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-md font-medium hover:from-sky-700 hover:to-blue-700 transition-all shadow-sm flex items-center gap-2"
        >
          {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
          {isSubmitting ? "Submitting..." : "Submit Enquiry"}
        </button>
      </div>
    </div>
  )
}

export default CallTrackerForm