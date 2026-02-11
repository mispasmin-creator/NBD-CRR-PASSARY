"use client"

import { useState, useEffect } from "react"
import { mockApi } from "../services/mockApi"

const CallTrackerForm = ({ onClose = () => window.history.back() }) => {
  const [leadSources, setLeadSources] = useState([])
  const [scNameOptions, setScNameOptions] = useState([]) // Added SC Name options
  const [enquiryStates, setEnquiryStates] = useState([])
  const [nobOptions, setNobOptions] = useState([])
  const [salesTypes, setSalesTypes] = useState([])
  const [enquiryApproachOptions, setEnquiryApproachOptions] = useState([])
  const [productCategories, setProductCategories] = useState([])
  const [companyOptions, setCompanyOptions] = useState([])
  const [companyDetailsMap, setCompanyDetailsMap] = useState({})
  const [lastEnquiryNo, setLastEnquiryNo] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [receiverOptions, setReceiverOptions] = useState([])
  const [assignToProjectOptions, setAssignToProjectOptions] = useState([])

  const [newCallTrackerData, setNewCallTrackerData] = useState({
    enquiryNo: "",
    leadSource: "",
    scName: "", // Added SC Name field
    companyName: "",
    phoneNumber: "",
    salesPersonName: "",
    location: "",
    emailAddress: "",
    shippingAddress: "",
    enquiryReceiverName: "",
    enquiryAssignToProject: "",
    gstNumber: "",
    isCompanyAutoFilled: true // Added to track auto-fill status
  })

  const [enquiryFormData, setEnquiryFormData] = useState({
    enquiryDate: "",
    enquiryState: "",
    projectName: "",
    salesType: "",
    enquiryApproach: "",
  })

  const [items, setItems] = useState([{ id: "1", name: "", quantity: "" }])
  const [isCompanyAutoFilled, setIsCompanyAutoFilled] = useState(false);

  const [expectedFormData, setExpectedFormData] = useState({
    nextAction: "",
    nextCallDate: "",
    nextCallTime: "",
  })

  // Fetch dropdown data, company data, and last enquiry number when component mounts
  useEffect(() => {
    fetchDropdownData()
    fetchCompanyData()
    fetchLastEnquiryNumber()
  }, [])

  // Function to fetch the last enquiry number from the spreadsheet
  const fetchLastEnquiryNumber = async () => {
    try {
      const nextEnquiryNo = await mockApi.fetchLastEnquiryNumber();
      setLastEnquiryNo(nextEnquiryNo)
      setNewCallTrackerData(prev => ({
        ...prev,
        enquiryNo: nextEnquiryNo
      }))
    } catch (error) {
      console.error("Error fetching last enquiry number:", error)
      setLastEnquiryNo("En-01")
      setNewCallTrackerData(prev => ({
        ...prev,
        enquiryNo: "En-01"
      }))
    }
  }

  // Function to fetch dropdown data from DROPDOWN sheet with updated column references
  const fetchDropdownData = async () => {
    try {
      const data = await mockApi.fetchEnquiryDropdowns();

      setLeadSources(data.sources || []);
      setScNameOptions(data.scNames || []);
      setEnquiryStates(data.states || []);
      setSalesTypes(data.salesTypes || []);
      setProductCategories(data.productCategories || []);
      setNobOptions(data.nobOptions || []);
      setEnquiryApproachOptions(data.approachOptions || []);
      setReceiverOptions(data.receivers || []);
      setAssignToProjectOptions(data.assignToProjects || []);
    } catch (error) {
      console.error("Error fetching dropdown values:", error)
      // Fallback values already handled in mockApi or set here
      setLeadSources(["Website", "Other"])
    }
  }

  // Function to fetch company data
  const fetchCompanyData = async () => {
    try {
      // Using fetchQuotationDropdowns which returns companies object
      const data = await mockApi.fetchQuotationDropdowns();

      if (data && data.companies) {
        const companies = Object.keys(data.companies);
        const detailsMap = {};

        // Map the structure from mockApi (which is simpler) to what this component expects
        // This component expects: { phoneNumber, salesPerson, gstNumber, billingAddress, shippingAddress, enquiryReceiverName, enquiryAssignToProject }
        // mockApi returns: { address, state, contactName, contactNo, gstin, stateCode }

        companies.forEach(companyName => {
          const compData = data.companies[companyName];
          detailsMap[companyName] = {
            phoneNumber: compData.contactNo || "",
            salesPerson: compData.contactName || "",
            gstNumber: compData.gstin || "",
            billingAddress: compData.address || "",
            // Add defaults for missing fields or update mockApi if needed
            shippingAddress: compData.address || "",
            enquiryReceiverName: "",
            enquiryAssignToProject: ""
          };
        });

        setCompanyOptions(companies);
        setCompanyDetailsMap(detailsMap);
      }
    } catch (error) {
      console.error("Error fetching company data:", error)
      setCompanyOptions([])
      setCompanyDetailsMap({})
    }
  }

  // Handle company name change and auto-fill other fields
  const handleCompanyChange = (companyName) => {
    const isAutoFilled = true
    setNewCallTrackerData(prev => ({
      ...prev,
      companyName: companyName,
      isCompanyAutoFilled: true // Set to true when a company is selected
    }));

    // Auto-fill related fields if company is selected
    if (companyName) {
      const companyDetails = companyDetailsMap[companyName] || {}
      setNewCallTrackerData(prev => ({
        ...prev,
        phoneNumber: companyDetails.phoneNumber || "",
        salesPersonName: companyDetails.salesPerson || "",
        location: companyDetails.billingAddress || "",
        gstNumber: companyDetails.gstNumber || "",
        shippingAddress: companyDetails.shippingAddress || "",
        enquiryReceiverName: companyDetails.enquiryReceiverName || "",
        enquiryAssignToProject: companyDetails.enquiryAssignToProject || "",
        isCompanyAutoFilled: isAutoFilled
      }))
    }
  }

  // Function to handle adding a new item
  const addItem = () => {
    if (items.length < 300) { // Only add if less than 10 items
      const newId = (items.length + 1).toString()
      setItems([...items, { id: newId, name: "", quantity: "" }])
    }
  }

  // Function to handle removing an item
  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  // Function to update an item
  const updateItem = (id, field, value) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  // Helper function to format date to DD/MM/YYYY
  const formatDateToDDMMYYYY = (dateValue) => {
    if (!dateValue) return ""

    try {
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
      }
      return dateValue
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateValue // Return the original value if formatting fails
    }
  }

  const calculateTotalQuantity = () => {
    return items.reduce((total, item) => {
      const quantity = parseInt(item.quantity) || 0
      return total + quantity
    }, 0)
  }

  // Function to handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // consolidate all data
      const submissionData = {
        trackerData: newCallTrackerData,
        enquiryData: enquiryFormData,
        expectedData: expectedFormData,
        items: items,
        totalQuantity: calculateTotalQuantity(),
        submissionDate: new Date().toISOString()
      }

      console.log("Submitting enquiry data:", submissionData)

      const result = await mockApi.submitEnquiry(submissionData)

      if (result.success) {
        alert("Data submitted successfully!")
        onClose() // Close the form after successful submission
      } else {
        alert("Error submitting data: " + (result.error || "Unknown error"))
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      alert("Error submitting form: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">New Call Tracker</h2>
            <button
              type="button"
              onClick={() => {
                try {
                  onClose();
                } catch (error) {
                  console.error("Error closing form:", error);
                  // Fallback close method if onClose fails
                  const modal = document.querySelector('.fixed.inset-0');
                  if (modal) {
                    modal.style.display = 'none';
                  }
                }
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="leadSource" className="block text-sm font-medium text-gray-700">
                Lead Source
              </label>
              <select
                id="leadSource"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={newCallTrackerData.leadSource}
                onChange={(e) => setNewCallTrackerData({ ...newCallTrackerData, leadSource: e.target.value })}
                required
              >
                <option value="">Select source</option>
                {leadSources.map((source, index) => (
                  <option key={index} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            {/* Added SC Name field after Lead Source */}
            <div className="space-y-2">
              <label htmlFor="scName" className="block text-sm font-medium text-gray-700">
                SC Name
              </label>
              <select
                id="scName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={newCallTrackerData.scName}
                onChange={(e) => setNewCallTrackerData({ ...newCallTrackerData, scName: e.target.value })}
                required
              >
                <option value="">Select SC Name</option>
                {scNameOptions.map((scName, index) => (
                  <option key={index} value={scName}>
                    {scName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                Company Name
              </label>
              <input
                list="companyOptions"
                id="companyName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={newCallTrackerData.companyName}
                onChange={(e) => handleCompanyChange(e.target.value)}
                required
              />
              <datalist id="companyOptions">
                {companyOptions.map((company, index) => (
                  <option key={index} value={company} />
                ))}
              </datalist>
            </div>


            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-gray-50"
                placeholder="Phone number will auto-fill"
                value={newCallTrackerData.phoneNumber}
                onChange={(e) => setNewCallTrackerData({ ...newCallTrackerData, phoneNumber: e.target.value })}
                readOnly={isCompanyAutoFilled && newCallTrackerData.companyName !== ""}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="salesPersonName" className="block text-sm font-medium text-gray-700">
                Person Name
              </label>
              <input
                id="salesPersonName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-gray-50"
                placeholder="Sales person name will auto-fill"
                value={newCallTrackerData.salesPersonName}
                onChange={(e) => setNewCallTrackerData({ ...newCallTrackerData, salesPersonName: e.target.value })}
                readOnly={isCompanyAutoFilled && newCallTrackerData.companyName !== ""}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Billing Address
              </label>
              <input
                id="location"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-gray-50"
                placeholder="Location will auto-fill"
                value={newCallTrackerData.location}
                onChange={(e) => setNewCallTrackerData({ ...newCallTrackerData, location: e.target.value })}
                readOnly={isCompanyAutoFilled && newCallTrackerData.companyName !== ""}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="emailAddress" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="emailAddress"
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-gray-50"
                placeholder="Email will auto-fill"
                value={newCallTrackerData.emailAddress}
                onChange={(e) => setNewCallTrackerData({ ...newCallTrackerData, emailAddress: e.target.value })}
                readOnly={isCompanyAutoFilled && newCallTrackerData.companyName !== ""}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-700">
                Shipping Address
              </label>
              <input
                id="shippingAddress"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Enter shipping address"
                value={newCallTrackerData.shippingAddress}
                onChange={(e) => setNewCallTrackerData({
                  ...newCallTrackerData,
                  shippingAddress: e.target.value,
                  isCompanyAutoFilled: false // Allow manual editing
                })}
                readOnly={isCompanyAutoFilled && newCallTrackerData.companyName !== ""}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="enquiryReceiverName" className="block text-sm font-medium text-gray-700">
                Enquiry Receiver Name
              </label>
              <select
                id="enquiryReceiverName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={newCallTrackerData.enquiryReceiverName}
                onChange={(e) => setNewCallTrackerData({
                  ...newCallTrackerData,
                  enquiryReceiverName: e.target.value,
                  isCompanyAutoFilled: false // Allow manual selection
                })}
                disabled={isCompanyAutoFilled && newCallTrackerData.companyName !== ""}
              >
                <option value="">Select receiver</option>
                {receiverOptions.map((receiver, index) => (
                  <option key={index} value={receiver}>
                    {receiver}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="enquiryAssignToProject" className="block text-sm font-medium text-gray-700">
                Enquiry Assign to Project
              </label>
              <select
                id="enquiryAssignToProject"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={newCallTrackerData.enquiryAssignToProject}
                onChange={(e) => setNewCallTrackerData({
                  ...newCallTrackerData,
                  enquiryAssignToProject: e.target.value,
                  isCompanyAutoFilled: false // Allow manual selection
                })}
                disabled={isCompanyAutoFilled && newCallTrackerData.companyName !== ""}
              >
                <option value="">Select project</option>
                {assignToProjectOptions.map((project, index) => (
                  <option key={index} value={project}>
                    {project}
                  </option>
                ))}
              </select>
            </div>


            <div className="space-y-2">
              <label htmlFor="gstNumber" className="block text-sm font-medium text-gray-700">
                GST Number
              </label>
              <input
                id="gstNumber"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Enter GST number"
                value={newCallTrackerData.gstNumber}
                onChange={(e) => setNewCallTrackerData({
                  ...newCallTrackerData,
                  gstNumber: e.target.value,
                  isCompanyAutoFilled: false // Allow manual editing
                })}
                readOnly={newCallTrackerData.isCompanyAutoFilled && newCallTrackerData.companyName !== ""}
              />
            </div>

          </div>

          {/* Enquiry Details section */}
          <div className="space-y-6 border p-4 rounded-md mt-4">
            <h3 className="text-lg font-medium">Enquiry Details</h3>
            <hr className="border-gray-200" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="enquiryDate" className="block text-sm font-medium text-gray-700">
                  Enquiry Received Date
                </label>
                <input
                  id="enquiryDate"
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={enquiryFormData.enquiryDate}
                  onChange={(e) => setEnquiryFormData({ ...enquiryFormData, enquiryDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="enquiryState" className="block text-sm font-medium text-gray-700">
                  Enquiry for State
                </label>
                <select
                  id="enquiryState"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={enquiryFormData.enquiryState}
                  onChange={(e) => setEnquiryFormData({ ...enquiryFormData, enquiryState: e.target.value })}
                  required
                >
                  <option value="">Select state</option>
                  {enquiryStates.map((state, index) => (
                    <option key={index} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">
                  NOB
                </label>
                <select
                  id="projectName"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={enquiryFormData.projectName}
                  onChange={(e) => setEnquiryFormData({ ...enquiryFormData, projectName: e.target.value })}
                  required
                >
                  <option value="">Select NOB</option>
                  {nobOptions.map((nob, index) => (
                    <option key={index} value={nob}>
                      {nob}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="salesType" className="block text-sm font-medium text-gray-700">
                  Enquiry Type
                </label>
                <select
                  id="salesType"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={enquiryFormData.salesType}
                  onChange={(e) => setEnquiryFormData({ ...enquiryFormData, salesType: e.target.value })}
                  required
                >
                  <option value="">Select type</option>
                  {salesTypes.map((type, index) => (
                    <option key={index} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="enquiryApproach" className="block text-sm font-medium text-gray-700">
                  Enquiry Approach
                </label>
                <select
                  id="enquiryApproach"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={enquiryFormData.enquiryApproach}
                  onChange={(e) => setEnquiryFormData({ ...enquiryFormData, enquiryApproach: e.target.value })}
                  required
                >
                  <option value="">Select approach</option>
                  {enquiryApproachOptions.map((approach, index) => (
                    <option key={index} value={approach}>
                      {approach}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Items</h4>
                <button
                  type="button"
                  onClick={addItem}
                  disabled={items.length >= 300}
                  className={`px-3 py-1 text-xs border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md ${items.length >= 300 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  + Add Item {items.length >= 300 ? '(Max reached)' : ''}
                </button>
              </div>

              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-5 space-y-2">
                    <label htmlFor={`itemName-${item.id}`} className="block text-sm font-medium text-gray-700">
                      Item Name
                    </label>
                    <input
                      list={`item-options-${item.id}`}
                      id={`itemName-${item.id}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, "name", e.target.value)}
                      required
                    />
                    <datalist id={`item-options-${item.id}`}>
                      {productCategories.map((category, index) => (
                        <option key={index} value={category} />
                      ))}
                    </datalist>
                  </div>


                  <div className="md:col-span-5 space-y-2">
                    <label htmlFor={`quantity-${item.id}`} className="block text-sm font-medium text-gray-700">
                      Quantity
                    </label>
                    <input
                      id={`quantity-${item.id}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="Enter quantity"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="p-2 text-slate-500 hover:text-slate-700 disabled:opacity-50"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        <div className="p-6 border-t flex justify-between">
          <button
            type="button"
            onClick={() => {
              try {
                onClose();
              } catch (error) {
                console.error("Error closing form:", error);
                // Fallback close method if onClose fails
                const modal = document.querySelector('.fixed.inset-0');
                if (modal) {
                  modal.style.display = 'none';
                }
              }
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CallTrackerForm