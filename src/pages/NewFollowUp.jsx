"use client"

import { useState, useContext, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { AuthContext } from "../App"
import { mockApi } from "../services/mockApi"
import { saveFormData, loadFormData, clearFormData, FORM_KEYS } from "../services/localStorageService"

// Initial empty states
const initialFormData = {
  leadNo: "",
  nextAction: "",
  nextCallDate: "",
  nextCallTime: "",
  customerFeedback: "",
  enquiryApproach: "",
}

const initialItems = [{ id: "1", name: "", quantity: "" }]

function NewFollowUp() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const leadId = searchParams.get("leadId")
  const leadNo = searchParams.get("leadNo")
  const { showNotification } = useContext(AuthContext)
  const [customerFeedbackOptions, setCustomerFeedbackOptions] = useState([])

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load saved data from localStorage on initial mount
  const savedData = loadFormData(FORM_KEYS.NEW_FOLLOW_UP)

  const [enquiryStatus, setEnquiryStatus] = useState(savedData?.enquiryStatus || "")
  const [items, setItems] = useState(savedData?.items || initialItems)
  const [formData, setFormData] = useState(() => {
    if (savedData?.formData) {
      return { ...savedData.formData, leadNo: leadNo || savedData.formData.leadNo || "" }
    }
    return { ...initialFormData, leadNo: leadNo || "" }
  })

  const [leadStatus, setLeadStatus] = useState(savedData?.leadStatus || "")

  // New state for dropdown options
  const [enquiryStates, setEnquiryStates] = useState([])
  const [salesTypes, setSalesTypes] = useState([])
  const [productCategories, setProductCategories] = useState([]) // New state for product categories
  const [nobOptions, setNobOptions] = useState([])
  const [enquiryApproachOptions, setEnquiryApproachOptions] = useState([])

  // Function to fetch dropdown data from DROPDOWNSHEET
  // Function to fetch dropdown data from DROPDOWNSHEET
  // Function to fetch dropdown data from DROPDOWNSHEET
  const fetchDropdownData = async () => {
    try {
      const data = await mockApi.fetchDropdowns()

      if (data) {
        setEnquiryStates(data.states || [])
        // Using some default mappings for other dropdowns as they might not be in the initial simplified mockApi response
        // In a real scenario, mockApi.fetchDropdowns should return all these.
        setSalesTypes(["NBD", "CRR", "NBD_CRR"])
        setProductCategories(["Product 1", "Product 2", "Product 3"])
        setNobOptions(data.nobs || [])
        setEnquiryApproachOptions(["Approach 1", "Approach 2", "Approach 3"])
        setCustomerFeedbackOptions(["Interested", "Not Interested", "Asked for Quotation", "Callback Later"])
      }
    } catch (error) {
      console.error("Error fetching dropdown values:", error)
      // Fallback values
      setEnquiryStates(["Maharashtra", "Gujarat", "Karnataka", "Tamil Nadu", "Delhi"])
      setSalesTypes(["NBD", "CRR", "NBD_CRR"])
      setProductCategories(["Product 1", "Product 2", "Product 3"])
      setNobOptions(["NOB 1", "NOB 2", "NOB 3"])
      setEnquiryApproachOptions(["Approach 1", "Approach 2", "Approach 3"]) // Fallback for enquiry approach
    }
  }

  useEffect(() => {
    // Fetch dropdown data when component mounts
    fetchDropdownData()

    // Prepopulate lead number if available
    if (leadNo) {
      setFormData((prevData) => ({
        ...prevData,
        leadNo: leadNo,
      }))
    }
  }, [leadNo])

  // Auto-save all form data to localStorage whenever any state changes
  useEffect(() => {
    const dataToSave = {
      formData,
      enquiryStatus,
      leadStatus,
      items
    }
    saveFormData(FORM_KEYS.NEW_FOLLOW_UP, dataToSave)
  }, [formData, enquiryStatus, leadStatus, items])

  // Function to clear the form
  const handleClearForm = () => {
    setFormData({ ...initialFormData, leadNo: leadNo || "" })
    setEnquiryStatus("")
    setLeadStatus("")
    setItems(initialItems)
    clearFormData(FORM_KEYS.NEW_FOLLOW_UP)
  }

  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }))
  }

  const calculateTotalQuantity = () => {
    return items.reduce((total, item) => {
      const quantity = parseInt(item.quantity) || 0
      return total + quantity
    }, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const currentDate = new Date()
      const formattedDate = formatDate(currentDate)

      // Prepare base row data (columns A-E)
      const rowData = [
        formattedDate, // A: Current date
        formData.leadNo, // B: Lead Number
        document.getElementById("customerFeedback").value, // C: Customer feedback
        leadStatus, // D: Hot/Cold/Warm status
        enquiryStatus, // E: Enquiry Status
      ]

      // Handle different scenarios
      if (enquiryStatus === "expected") {
        // Explicitly add columns F-K as empty (6 empty columns)
        rowData.push("", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "")

        // Then add columns V, W, X
        rowData.push(
          document.getElementById("nextAction").value, // V: Next action
          document.getElementById("nextCallDate").value, // W: Next call date
          document.getElementById("nextCallTime").value, // X: Next call time
        )
      }
      else if (enquiryStatus === "yes") {
        // Add columns F-K
        rowData.push(
          document.getElementById("enquiryDate").value, // F: Enquiry Received Date
          document.getElementById("enquiryState").value, // G: Enquiry for State
          document.getElementById("projectName").value, // H: Project Name (NOB)
          document.getElementById("salesType").value, // I: Sales Type
          formData.enquiryApproach, // J: Enquiry Approach
          "", // K: Project Value (empty)
        )

        // Handle first 5 items (columns L-U)
        const first5Items = items.slice(0, 5)

        // Add first 5 items in pairs (name, quantity)
        first5Items.forEach((item) => {
          rowData.push(item.name || "") // Product category
          rowData.push(item.quantity || "0") // Quantity (0 if null/empty)
        })

        // If less than 5 items, fill remaining slots with empty values
        const remainingSlots = 5 - first5Items.length
        for (let i = 0; i < remainingSlots; i++) {
          rowData.push("", "0") // Empty name and 0 quantity
        }

        // Pad to reach column AB (index 27)
        while (rowData.length < 27) {
          rowData.push("")
        }

        // Add tracking status in column AB (index 27)
        rowData.push(document.getElementById("leadsTrackingStatus").value)

        // Handle items 6 and onwards as JSON in column AC (index 28)
        if (items.length > 5) {
          const additionalItems = items.slice(5).map(item => ({
            name: item.name || "",
            quantity: item.quantity || "0"
          }))
          rowData.push(JSON.stringify(additionalItems)) // Column AC
        } else {
          rowData.push("") // Empty if no additional items
        }

        // Add total quantity in column AD (index 29)
        rowData.push(calculateTotalQuantity().toString())

      } else if (enquiryStatus === "not-interested") {
        // Pad columns F-K and then V-X with empty values
        rowData.push("", "", "", "", "", "", "", "", "")
      }

      console.log("Row Data to be submitted:", rowData)

      // Send the data
      const result = await mockApi.submitFollowUp({
        ...formData,
        leadStatus,
        enquiryStatus,
        items,
        rowData // Keeping raw rowData for structure if needed by mockApi later, or better yet pass structured data
      })

      if (result.success) {
        showNotification("Follow-up recorded successfully", "success")
        // Clear localStorage on successful submission
        clearFormData(FORM_KEYS.NEW_FOLLOW_UP)
        navigate("/follow-up")
      } else {
        showNotification("Error recording follow-up: " + (result.error || "Unknown error"), "error")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      showNotification("Error submitting form: " + error.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Function to format date as dd/mm/yyyy
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const addItem = () => {
    // Define maximum number of items allowed
    const MAX_ITEMS = 300

    // Only add a new item if we haven't reached the maximum
    if (items.length < MAX_ITEMS) {
      const newId = (items.length + 1).toString()
      setItems([...items, { id: newId, name: "", quantity: "" }])
    }
  }

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id, field, value) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  return (
    <div className="py-2">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Lead Follow-Up</h2>
          <p className="text-sm text-slate-500">
            Record details of the follow-up call
            {leadId && <span className="font-medium"> for Lead #{leadId}</span>}
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label htmlFor="enquiryNo" className="block text-sm font-medium text-gray-700">
                Lead No.
              </label>
              <input
                id="enquiryNo"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="LD-001"
                value={formData.leadNo}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="customerFeedback" className="block text-sm font-medium text-gray-700">
                What did the customer say?
              </label>
              <input
                list="customer-feedback-options"
                id="customerFeedback"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Select or type customer feedback"
                required
              />
              <datalist id="customer-feedback-options">
                {customerFeedbackOptions.map((feedback, index) => (
                  <option key={index} value={feedback} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Lead Status</label>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="hot"
                    name="leadStatus"
                    value="hot"
                    checked={leadStatus === "Relevant"}
                    onChange={() => setLeadStatus("Relevant")}
                    className="h-4 w-4 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="hot" className="text-sm text-gray-700">
                    Relevant
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="warm"
                    name="leadStatus"
                    value="warm"
                    checked={leadStatus === "Not Relevant"}
                    onChange={() => setLeadStatus("Not Relevant")}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="warm" className="text-sm text-gray-700">
                    Not Relevant
                  </label>
                </div>
                {/* <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="cold"
                    name="leadStatus"
                    value="cold"
                    checked={leadStatus === "cold"}
                    onChange={() => setLeadStatus("cold")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="cold" className="text-sm text-gray-700">
                    Cold
                  </label>
                </div> */}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Enquiry Received Status</label>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="yes"
                    name="enquiryStatus"
                    value="yes"
                    checked={enquiryStatus === "yes"}
                    onChange={() => setEnquiryStatus("yes")}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="yes" className="text-sm text-gray-700">
                    Yes
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="expected"
                    name="enquiryStatus"
                    value="expected"
                    checked={enquiryStatus === "expected"}
                    onChange={() => setEnquiryStatus("expected")}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="expected" className="text-sm text-gray-700">
                    Expected
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="not-interested"
                    name="enquiryStatus"
                    value="not-interested"
                    checked={enquiryStatus === "not-interested"}
                    onChange={() => setEnquiryStatus("not-interested")}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="not-interested" className="text-sm text-gray-700">
                    Not Interested
                  </label>
                </div>
              </div>
            </div>

            {enquiryStatus === "expected" && (
              <div className="space-y-4 border p-4 rounded-md">
                <div className="space-y-2">
                  <label htmlFor="nextAction" className="block text-sm font-medium text-gray-700">
                    Next Action
                  </label>
                  <input
                    id="nextAction"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="Enter next action"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="nextCallDate" className="block text-sm font-medium text-gray-700">
                      Next Call Date
                    </label>
                    <input
                      id="nextCallDate"
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="nextCallTime" className="block text-sm font-medium text-gray-700">
                      Next Call Time
                    </label>
                    <input
                      id="nextCallTime"
                      type="time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {enquiryStatus === "yes" && (
              <div className="space-y-6 border p-4 rounded-md">
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
                      value={formData.enquiryApproach}
                      onChange={handleChange}
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

                  <div className="space-y-2">
                    <label htmlFor="leadsTrackingStatus" className="block text-sm font-medium text-gray-700">
                      Leads Tracking Status
                    </label>
                    <select
                      id="leadsTrackingStatus"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    >
                      <option value="">Select status</option>
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  {/* <div className="space-y-2">
                    <label htmlFor="requiredDate" className="block text-sm font-medium text-gray-700">
                      Required Product Date
                    </label>
                    <input
                      id="requiredDate"
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="projectValue" className="block text-sm font-medium text-gray-700">
                      Project Approximate Value
                    </label>
                    <input
                      id="projectValue"
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="Enter value"
                      required
                    />
                  </div> */}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Items</h4>
                    <button
                      type="button"
                      onClick={addItem}
                      className="px-3 py-1 text-xs border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md"
                      disabled={items.length >= 300}
                    >
                      + Add Item ({items.length}/300)
                    </button>
                  </div>

                  {items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-5 space-y-2">
                        <label htmlFor={`itemName-${item.id}`} className="block text-sm font-medium text-gray-700">
                          Item Name 1
                        </label>
                        <input
                          list={`item-options-${item.id}`}
                          id={`itemName-${item.id}`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, "name", e.target.value)}
                          required
                          placeholder="Select or type item name"
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
            )}
          </div>
          <div className="p-6 border-t flex justify-between">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearForm}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Clear Form
              </button>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
              {isSubmitting ? "Saving..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewFollowUp
