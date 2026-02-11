"use client"

import { useState, useContext, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { AuthContext } from "../App"
import { mockApi } from "../services/mockApi"
import { saveFormData, loadFormData, clearFormData, FORM_KEYS } from "../services/localStorageService"
import MakeQuotationForm from "../components/call-tracker/MakeQuotationFrom"
import QuotationValidationForm from "../components/call-tracker/QuotationValidationForm"
import OrderExpectedForm from "../components/call-tracker/OrderExpectedForm"
import OrderStatusForm from "../components/call-tracker/OrderStatusFrom"

// Initial empty states
const initialFormData = {
  enquiryNo: "",
  enquiryStatus: "",
  customerFeedback: "",
}

const initialQuotationData = {
  companyName: "",
  sendQuotationNo: "",
  quotationSharedBy: "",
  quotationNumber: "",
  valueWithoutTax: "",
  valueWithTax: "",
  remarks: "",
  quotationFile: null,
  quotationFileUrl: "",
}

const initialValidationData = {
  validationQuotationNumber: "",
  validatorName: "",
  sendStatus: "",
  validationRemark: "",
  faqVideo: "no",
  productVideo: "no",
  offerVideo: "no",
  productCatalog: "no",
  productImage: "no",
}

const initialOrderExpectedData = {
  nextCallDate: "",
  nextCallTime: "",
  followupStatus: "",
}

const initialOrderStatusData = {
  orderStatusQuotationNumber: "",
  orderStatus: "",
  acceptanceVia: "",
  paymentMode: "",
  paymentTerms: "",
  transportMode: "",
  creditDays: "",
  creditLimit: "",
  conveyedForRegistration: "",
  orderVideo: "",
  acceptanceFile: null,
  orderRemark: "",
  apologyVideo: null,
  reasonStatus: "",
  reasonRemark: "",
  holdReason: "",
  holdingDate: "",
  holdRemark: "",
}

function NewCallTracker() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const leadId = searchParams.get("leadId")
  const { showNotification } = useContext(AuthContext)
  const [customerFeedbackOptions, setCustomerFeedbackOptions] = useState([])

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load saved data from localStorage on initial mount
  const savedData = loadFormData(FORM_KEYS.NEW_CALL_TRACKER)

  const [currentStage, setCurrentStage] = useState(savedData?.currentStage || "")
  const [formData, setFormData] = useState(() => {
    if (savedData?.formData) {
      return { ...savedData.formData, enquiryNo: leadId || savedData.formData.enquiryNo || "" }
    }
    return { ...initialFormData, enquiryNo: leadId || "" }
  })
  const [enquiryStatusOptions, setEnquiryStatusOptions] = useState([])
  const [isLoadingDropdown, setIsLoadingDropdown] = useState(false)

  // State for MakeQuotationForm data
  const [quotationData, setQuotationData] = useState(
    savedData?.quotationData || initialQuotationData
  )

  // State for QuotationValidationForm data
  const [validationData, setValidationData] = useState(
    savedData?.validationData || initialValidationData
  )

  // State for OrderExpectedForm data
  const [orderExpectedData, setOrderExpectedData] = useState(
    savedData?.orderExpectedData || initialOrderExpectedData
  )

  // State for OrderStatusForm data
  const [orderStatusData, setOrderStatusData] = useState(
    savedData?.orderStatusData || initialOrderStatusData
  )

  // Add this function inside the NewCallTracker component
  const fetchLatestQuotationNumber = async (enquiryNo) => {
    try {
      return await mockApi.fetchLatestQuotationNumber(enquiryNo)
    } catch (error) {
      console.error("Error fetching quotation number:", error)
      return ""
    }
  }

  // Fetch dropdown options from DROPDOWN sheet column G
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        setIsLoadingDropdown(true)

        const data = await mockApi.fetchDropdowns()

        if (data) {
          // We need to map the mock data to what this component expects
          // Assuming fetchDropdowns returns general dropdowns structure
          // Adjust if specific structure needed
          setEnquiryStatusOptions(data.statuses || ["hot", "warm", "cold"]) // Add statuses to mockApi/dummyData if missing
          setCustomerFeedbackOptions(data.feedbacks || ["Interested", "Not Interested"])
        }
      } catch (error) {
        console.error("Error fetching dropdown options:", error)
        // Fallback options if fetch fails
        setEnquiryStatusOptions(["hot", "warm", "cold"])
        setCustomerFeedbackOptions(["Feedback 1", "Feedback 2", "Feedback 3"])
      } finally {
        setIsLoadingDropdown(false)
      }
    }

    fetchDropdownOptions()
  }, [])

  // Update form data when leadId changes
  useEffect(() => {
    if (leadId) {
      setFormData(prevData => ({
        ...prevData,
        enquiryNo: leadId
      }))
    }
  }, [leadId])

  // Auto-save all form data to localStorage whenever any state changes
  useEffect(() => {
    const dataToSave = {
      currentStage,
      formData,
      quotationData: { ...quotationData, quotationFile: null }, // Don't save file objects
      validationData,
      orderExpectedData,
      orderStatusData: { ...orderStatusData, acceptanceFile: null, apologyVideo: null } // Don't save file objects
    }
    saveFormData(FORM_KEYS.NEW_CALL_TRACKER, dataToSave)
  }, [currentStage, formData, quotationData, validationData, orderExpectedData, orderStatusData])

  // Function to clear the form
  const handleClearForm = () => {
    setCurrentStage("")
    setFormData({ ...initialFormData, enquiryNo: leadId || "" })
    setQuotationData(initialQuotationData)
    setValidationData(initialValidationData)
    setOrderExpectedData(initialOrderExpectedData)
    setOrderStatusData(initialOrderStatusData)
    clearFormData(FORM_KEYS.NEW_CALL_TRACKER)
  }

  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData(prevData => ({
      ...prevData,
      [id]: value
    }))
  }

  // Handler for quotation form data updates
  const handleQuotationChange = (field, value) => {
    setQuotationData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handler for validation form data updates
  const handleValidationChange = (field, value) => {
    setValidationData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handler for order expected form data updates
  const handleOrderExpectedChange = (field, value) => {
    setOrderExpectedData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handler for order status form data updates
  const handleOrderStatusChange = (field, value) => {
    setOrderStatusData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Function to format date as dd/mm/yyyy
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Function to upload image/video to Google Drive
  const uploadFileToDrive = async (file, fileType = "image") => {
    try {
      return await mockApi.uploadFile(file)
    } catch (error) {
      console.error("Error uploading file:", error)
      throw error
    }
  }



  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const currentDate = new Date();
      const formattedDate = formatDate(currentDate);

      // If there's a quotation file and it's an image, upload it first
      let fileUrl = "";
      if (currentStage === "make-quotation" && quotationData.quotationFile) {
        const fileType = quotationData.quotationFile.type.startsWith("image/") ? "image" : "pdf";
        showNotification(`Uploading ${fileType}...`, "info");
        fileUrl = await uploadFileToDrive(quotationData.quotationFile, fileType);
        showNotification(`${fileType.charAt(0).toUpperCase() + fileType.slice(1)} uploaded successfully`, "success");
      }

      // If there are order status files, upload them
      let acceptanceFileUrl = "";
      let apologyVideoUrl = "";

      // Generate order number if status is "yes"
      let orderNumber = "";
      if (currentStage === "order-status" && orderStatusData.orderStatus === "yes") {
        // Get the latest order number from the sheet
        const latestOrderNumber = await getLatestOrderNumber();
        orderNumber = generateNextOrderNumber(latestOrderNumber);

        if (orderStatusData.acceptanceFile) {
          showNotification("Uploading acceptance file...", "info");
          acceptanceFileUrl = await uploadFileToDrive(orderStatusData.acceptanceFile);
          showNotification("Acceptance file uploaded successfully", "success");
        }
      } else if (currentStage === "order-status" && orderStatusData.orderStatus === "no") {
        if (orderStatusData.apologyVideo) {
          showNotification("Uploading apology video...", "info");
          apologyVideoUrl = await uploadFileToDrive(orderStatusData.apologyVideo);
          showNotification("Apology video uploaded successfully", "success");
        }
      }

      // Prepare row data based on the selected stage
      let rowData = [
        formattedDate, // Date
        formData.enquiryNo, // Enquiry No
        formData.enquiryStatus, // Status (hot/warm/cold)
        formData.customerFeedback, // Customer feedback
        currentStage, // Current Stage
      ];

      // Add stage-specific data based on what's selected
      if (currentStage === "make-quotation") {
        rowData.push(
          quotationData.sendQuotationNo,
          quotationData.quotationSharedBy,
          quotationData.quotationNumber, // Column H
          quotationData.valueWithoutTax,
          quotationData.valueWithTax,
          fileUrl || "", // Add the image URL in column K
          quotationData.remarks // Add the remarks in column L
        );
        // Add empty values for columns M-AI (validation, order expected, and order status columns)
        rowData.push(...new Array(29).fill(""));
      } else if (currentStage === "quotation-validation") {
        // Add empty values for columns F-G
        rowData.push("", "");
        // Add quotation number in column H
        rowData.push(validationData.validationQuotationNumber);
        // Add empty values for columns I-L (remaining quotation data)
        rowData.push("", "", "", "");
        // Add validation data for columns M-T
        rowData.push(
          validationData.validatorName, // Column M
          validationData.sendStatus, // Column N
          validationData.validationRemark, // Column O
          validationData.faqVideo, // Column P
          validationData.productVideo, // Column Q
          validationData.offerVideo, // Column R
          validationData.productCatalog, // Column S
          validationData.productImage // Column T
        );
        // Add empty values for columns U-AI (order expected and order status columns)
        rowData.push(...new Array(15).fill(""));
      } else if (currentStage === "order-expected") {
        // Add empty values for columns F-T
        rowData.push(...new Array(15).fill(""));
        // Add order expected data for columns U-V
        rowData.push(
          orderExpectedData.nextCallDate, // Column U
          orderExpectedData.nextCallTime // Column V
        );
        rowData.push(...new Array(16).fill(""));
        // Add followup status in column AM
        rowData.push(orderExpectedData.followupStatus); // Column AM
        // Add empty values for columns W-AI (order status columns)
        rowData.push(...new Array(17).fill(""));
      } else if (currentStage === "order-status") {
        // Add empty values for columns F-G
        rowData.push("", "");
        // Add quotation number in column H
        rowData.push(orderStatusData.orderStatusQuotationNumber);
        // Add empty values for columns I-V
        rowData.push(...new Array(14).fill(""));
        // Add order status in column W
        rowData.push(orderStatusData.orderStatus);

        // Based on order status, add data to appropriate columns
        if (orderStatusData.orderStatus === "yes") {
          // Add YES data for columns X-AC
          rowData.push(
            orderStatusData.acceptanceVia, // Column X
            orderStatusData.paymentMode, // Column Y
            orderStatusData.paymentTerms, // Column Z
            orderStatusData.transportMode || "", // Column AD (new field)
            orderStatusData.conveyedForRegistration || "", // Column AE (new field)
            orderStatusData.orderVideo, // Column AA
            acceptanceFileUrl || "", // Column AB
            orderStatusData.orderRemark // Column AC
          );
          rowData.push(...new Array(8).fill(""));
          rowData.push(
            orderStatusData.creditDays, // Column AN - Credit Days
            orderStatusData.creditLimit // Column AO - Credit Limit
          );
          rowData.push("");
          // Add the generated order number in column AQ (index 42)
          rowData.push(orderNumber); // Column AQ - Order Number
          rowData.push(
            orderStatusData.destination || "", // Column AR - Destination
            orderStatusData.poNumber || "" // Column AS - PO Number
          );
          // Add empty values for remaining columns (AF-AI)
          rowData.push(...new Array(4).fill(""));
        } else if (orderStatusData.orderStatus === "no") {
          // Add empty values for YES columns (X-AE)
          rowData.push(...new Array(8).fill(""));
          // Add NO data for columns AF-AH
          rowData.push(
            apologyVideoUrl || "", // Column AF
            orderStatusData.reasonStatus, // Column AG
            orderStatusData.reasonRemark // Column AH
          );
          // Add empty values for HOLD columns (AI-AL)
          rowData.push(...new Array(3).fill(""));
        } else if (orderStatusData.orderStatus === "hold") {
          // Add empty values for YES and NO columns (X-AH)
          rowData.push(...new Array(11).fill(""));
          // Add HOLD data for columns AI-AL
          rowData.push(
            orderStatusData.holdReason, // Column AI
            orderStatusData.holdingDate, // Column AJ
            orderStatusData.holdRemark // Column AK
          );
          // Add empty value for remaining column
          rowData.push(""); // Column AL
        } else {
          // If no status selected, fill all columns with empty
          rowData.push(...new Array(12).fill(""));
        }
      } else {
        // Add empty values for all stage-specific columns (F-AI)
        rowData.push(...new Array(30).fill(""));
      }

      console.log("Row Data to be submitted:", rowData);

      const result = await mockApi.submitCallTracker({
        rowData // simplified for mock
      })

      if (result.success) {
        showNotification("Call tracker updated successfully", "success");
        // Clear localStorage on successful submission
        clearFormData(FORM_KEYS.NEW_CALL_TRACKER);
        navigate("/call-tracker");
      } else {
        showNotification(
          "Error updating call tracker: " + (result.error || "Unknown error"),
          "error"
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      showNotification("Error submitting form: " + error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to get the latest order number from the sheet
  const getLatestOrderNumber = async () => {
    try {
      return await mockApi.getLatestOrderNumber()
    } catch (error) {
      console.error("Error fetching latest order number:", error);
      return "DO-00"; // Fallback
    }
  };

  // Helper function to generate the next order number
  const generateNextOrderNumber = (latestOrderNumber) => {
    // Extract the numeric part
    const match = latestOrderNumber.match(/DO-(\d+)/);
    let nextNumber = 1;

    if (match && match[1]) {
      nextNumber = parseInt(match[1], 10) + 1;
    }

    // Format with leading zeros
    const paddedNumber = String(nextNumber).padStart(2, "0");
    return `DO-${paddedNumber}`;
  };

  return (
    <div className="py-2">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Call Tracker</h2>
          <p className="text-sm text-slate-500">
            Track the progress of the enquiry
            {formData.enquiryNo && <span className="font-medium"> for Enquiry #{formData.enquiryNo}</span>}
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label htmlFor="enquiryNo" className="block text-sm font-medium text-gray-700">
                Enquiry No.
              </label>
              <input
                id="enquiryNo"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="En-01"
                value={formData.enquiryNo}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="enquiryStatus" className="block text-sm font-medium text-gray-700">
                Enquiry Status
              </label>
              <select
                id="enquiryStatus"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={formData.enquiryStatus}
                onChange={handleInputChange}
                required
              >
                <option value="">Select status</option>
                {enquiryStatusOptions.map((option, index) => (
                  <option key={index} value={option.toLowerCase()}>{option}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="customerFeedback" className="block text-sm font-medium text-gray-700">
                What Did Customer Say
              </label>
              <input
                list="customer-feedback-options"
                id="customerFeedback"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Select or type customer feedback"
                value={formData.customerFeedback}
                onChange={handleInputChange}
                required
              />
              <datalist id="customer-feedback-options">
                {customerFeedbackOptions.map((feedback, index) => (
                  <option key={index} value={feedback} />
                ))}
              </datalist>
            </div>


            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Current Stage</label>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="make-quotation"
                    name="currentStage"
                    value="make-quotation"
                    checked={currentStage === "make-quotation"}
                    onChange={async (e) => {
                      setCurrentStage(e.target.value)
                    }}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="make-quotation" className="text-sm text-gray-700">
                    Make Quotation
                  </label>
                </div>
                {/* <div className="flex items-center space-x-2">
      <input
        type="radio"
        id="quotation-validation"
        name="currentStage"
        value="quotation-validation"
        checked={currentStage === "quotation-validation"}
        onChange={async (e) => {
          const stage = e.target.value
          setCurrentStage(stage)
          
          if (formData.enquiryNo) {
            // Fetch the latest quotation number for this enquiry
            const quotationNumber = await fetchLatestQuotationNumber(formData.enquiryNo)
            if (quotationNumber) {
              setValidationData(prev => ({
                ...prev,
                validationQuotationNumber: quotationNumber
              }))
            }
          }
        }}
        className="h-4 w-4 text-sky-600 focus:ring-sky-500"
      />
      <label htmlFor="quotation-validation" className="text-sm text-gray-700">
        Quotation Validation
      </label>
    </div> */}
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="order-expected"
                    name="currentStage"
                    value="order-expected"
                    checked={currentStage === "order-expected"}
                    onChange={async (e) => {
                      setCurrentStage(e.target.value)
                    }}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="order-expected" className="text-sm text-gray-700">
                    Order Expected
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="order-status"
                    name="currentStage"
                    value="order-status"
                    checked={currentStage === "order-status"}
                    onChange={async (e) => {
                      const stage = e.target.value
                      setCurrentStage(stage)

                      if (formData.enquiryNo) {
                        // Fetch the latest quotation number for this enquiry
                        const quotationNumber = await fetchLatestQuotationNumber(formData.enquiryNo)
                        if (quotationNumber) {
                          setOrderStatusData(prev => ({
                            ...prev,
                            orderStatusQuotationNumber: quotationNumber
                          }))
                        }
                      }
                    }}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="order-status" className="text-sm text-gray-700">
                    Order Status
                  </label>
                </div>
              </div>
            </div>

            {currentStage === "make-quotation" && (
              <MakeQuotationForm
                enquiryNo={formData.enquiryNo}
                formData={quotationData}
                onFieldChange={handleQuotationChange}
              />
            )}
            {currentStage === "quotation-validation" && (
              <QuotationValidationForm
                enquiryNo={formData.enquiryNo}
                formData={validationData}
                onFieldChange={handleValidationChange}
              />
            )}
            {currentStage === "order-expected" && (
              <OrderExpectedForm
                enquiryNo={formData.enquiryNo}
                formData={orderExpectedData}
                onFieldChange={handleOrderExpectedChange}
              />
            )}
            {currentStage === "order-status" && (
              <OrderStatusForm
                enquiryNo={formData.enquiryNo}
                formData={orderStatusData}
                onFieldChange={handleOrderStatusChange}
              />
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
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
              {isSubmitting ? "Saving..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewCallTracker