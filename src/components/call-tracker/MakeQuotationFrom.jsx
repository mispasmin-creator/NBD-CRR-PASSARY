import { useState, useEffect } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { mockApi } from "../../services/mockApi"

function MakeQuotationForm({ enquiryNo, formData, onFieldChange }) {
  const location = useLocation()
  const params = useParams()
  const [sharedByOptions, setSharedByOptions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [fileError, setFileError] = useState(null)

  // Fetch dropdown options
  useEffect(() => {
    const fetchSharedByOptions = async () => {
      try {
        setIsLoading(true)
        const data = await mockApi.fetchValidationDropdowns();
        setSharedByOptions(data.validatorNameOptions || ["Rahul Sharma", "Priya Patel", "Amit Singh", "Neha Gupta"])
      } catch (error) {
        console.error("Error fetching dropdown options:", error)
        setSharedByOptions(["Rahul Sharma", "Priya Patel", "Amit Singh", "Neha Gupta"])
      } finally {
        setIsLoading(false)
      }
    }

    fetchSharedByOptions()
  }, [])

  // Add this new useEffect after the existing sharedByOptions useEffect
  useEffect(() => {
    const generateSendQuotationNo = async () => {
      if (!enquiryNo) return;

      try {
        const newQuotationNo = await mockApi.generateSendQuotationNo(enquiryNo);
        onFieldChange('sendQuotationNo', newQuotationNo);
      } catch (error) {
        console.error("Error generating quotation number:", error)
        onFieldChange('sendQuotationNo', `${enquiryNo}-1`);
      }
    }

    generateSendQuotationNo()
  }, [enquiryNo]) // Dependency on enquiryNo

  // Also modify the Send Quotation No. input field to be readonly:
  // Change this line in the JSX:
  // className="w-full p-2 border border-gray-300 rounded-md"
  // To:
  // className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
  // And add:
  // readOnly

  const handleChange = (e) => {
    const { name, value } = e.target
    onFieldChange(name, value)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setFileError("File size must be less than 10MB")
        onFieldChange('quotationFile', null)
      } else {
        setFileError(null)
        onFieldChange('quotationFile', file)
      }
    }
  }

  return (
    <div className="mt-6">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="enquiryNo" className="block text-sm font-medium">
              Enquiry No.
            </label>
            <input
              id="enquiryNo"
              name="enquiryNo"
              type="text"
              placeholder="ENQ-001"
              value={enquiryNo}
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
              readOnly
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="sendQuotationNo" className="block text-sm font-medium">
              Send Quotation No.
            </label>
            <input
              id="sendQuotationNo"
              name="sendQuotationNo"
              type="text"
              placeholder="QUO-001"
              value={formData.sendQuotationNo}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="quotationSharedBy" className="block text-sm font-medium">
              Quotation Shared By
            </label>
            <select
              id="quotationSharedBy"
              name="quotationSharedBy"
              value={formData.quotationSharedBy}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select person</option>
              {sharedByOptions.map((option, index) => (
                <option key={index} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="quotationNumber" className="block text-sm font-medium">
              Quotation Number
            </label>
            <input
              id="quotationNumber"
              name="quotationNumber"
              type="text"
              placeholder="QUO-001"
              value={formData.quotationNumber}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="valueWithoutTax" className="block text-sm font-medium">
              Quotation Value Without Tax
            </label>
            <input
              id="valueWithoutTax"
              name="valueWithoutTax"
              type="text"
              placeholder="₹10,000"
              value={formData.valueWithoutTax}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="valueWithTax" className="block text-sm font-medium">
              Quotation Value With Tax
            </label>
            <input
              id="valueWithTax"
              name="valueWithTax"
              type="text"
              placeholder="₹11,800"
              value={formData.valueWithTax}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="quotationFile" className="block text-sm font-medium">
            Quotation Upload
          </label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                </svg>
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PDF, Word, Excel, or image files (MAX. 10MB)</p>
              </div>
              <input
                id="quotationFile"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                required
              />
            </label>
          </div>
          {fileError && (
            <p className="mt-1 text-sm text-red-600">{fileError}</p>
          )}
          {formData.quotationFile && (
            <div className="flex items-center mt-2 p-2 bg-gray-50 rounded-md">
              <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm text-gray-600 flex-1">{formData.quotationFile.name}</span>
              <button
                type="button"
                onClick={() => onFieldChange('quotationFile', null)}
                className="text-red-500 hover:text-red-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="remarks" className="block text-sm font-medium">
            REMARK
          </label>
          <textarea
            id="remarks"
            name="remarks"
            placeholder="Enter any remarks about this quotation"
            value={formData.remarks}
            onChange={handleChange}
            rows="4"
            className="w-full p-2 border border-gray-300 rounded-md"
          ></textarea>
        </div>
      </div>
    </div>
  )
}

export default MakeQuotationForm