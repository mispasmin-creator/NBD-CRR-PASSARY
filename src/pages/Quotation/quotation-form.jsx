"use client"

import { useState, useEffect } from "react"
import QuotationDetails from "./quotation-details"
import ConsignorDetails from "./consignor-details"
import ConsigneeDetails from "./consignee-details"
import ItemsTable from "./items-table"
import TermsAndConditions from "./terms and conditions"
import BankDetails from "./bank-details"
import NotesSection from "./notes-section"
import SpecialOfferSection from "./special-offer-section"
import { getCompanyPrefix, getNextQuotationNumber } from "./quotation-service"
import { mockApi } from "../../services/mockApi"

const QuotationForm = ({
  quotationData,
  handleInputChange,
  handleItemChange,
  handleFlatDiscountChange,
  handleAddItem,
  handleNoteChange,
  addNote,
  removeNote,
  hiddenFields,
  toggleFieldVisibility,
  isRevising,
  existingQuotations,
  selectedQuotation,
  handleSpecialDiscountChange,
  handleQuotationSelect,
  isLoadingQuotation,
  specialDiscount,
  setSpecialDiscount,
  selectedReferences,
  setSelectedReferences,
  imageform,
  addSpecialOffer,
  removeSpecialOffer,
  handleSpecialOfferChange,
  setQuotationData, // ADD THIS LINE
  hiddenColumns,    // ADD THIS LINE
  setHiddenColumns, // ADD THIS LINE
}) => {
  const [dropdownData, setDropdownData] = useState({})
  const [stateOptions, setStateOptions] = useState(["Select State"])
  const [companyOptions, setCompanyOptions] = useState(["Select Company"])
  const [referenceOptions, setReferenceOptions] = useState(["Select Reference"])
  const [preparedByOptions, setPreparedByOptions] = useState([""])
  const [productCodes, setProductCodes] = useState([])
  const [productNames, setProductNames] = useState([])
  const [productData, setProductData] = useState({})
  const [isItemsLoading, setIsItemsLoading] = useState(false);

  // NEW: Lead number states
  const [showLeadNoDropdown, setShowLeadNoDropdown] = useState(false)
  const [leadNoOptions, setLeadNoOptions] = useState(["Select Lead No."])
  const [leadNoData, setLeadNoData] = useState({})

  // Fetch dropdown data for states and corresponding details
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const data = await mockApi.fetchQuotationDropdowns();

        if (data) {
          // Process state options
          const stateOptionsData = ["Select State", ...Object.keys(data.states || {})];
          setStateOptions(stateOptionsData);

          // Process company options
          const companyOptionsData = ["Select Company", ...Object.keys(data.companies || {})];
          setCompanyOptions(companyOptionsData);

          // Process reference options
          const referenceOptionsData = ["Select Reference", ...Object.keys(data.references || {})];
          setReferenceOptions(referenceOptionsData);

          // Process prepared by options
          const preparedByOptionsData = ["", ...(data.preparedBy || [])];
          setPreparedByOptions(preparedByOptionsData);

          // Update dropdown data map
          setDropdownData({
            states: data.states || {},
            companies: data.companies || {},
            references: data.references || {}
          });
        }
      } catch (error) {
        console.error("Error fetching dropdown data:", error)

        // Fallback mock data
        setStateOptions(["Select State", "Chhattisgarh", "Maharashtra", "Delhi"])
        // Keep existing fallback structure or simplify
      }
    }

    fetchDropdownData()
  }, [])

  // NEW: Fetch lead numbers from both sheets with filtering conditions
  // NEW: Fetch lead numbers from both sheets with filtering conditions
  useEffect(() => {
    const fetchLeadNumbers = async () => {
      try {
        const leadNoOptionsData = ["Select Lead No."]
        const leadNumbers = await mockApi.fetchLeadNumbers();

        if (leadNumbers) {
          const leadList = Object.keys(leadNumbers);
          leadNoOptionsData.push(...leadList);

          setLeadNoOptions(leadNoOptionsData)
          setLeadNoData(leadNumbers)
        }

      } catch (error) {
        console.error("Error fetching lead numbers:", error)
      }
    }

    fetchLeadNumbers()
  }, [])

  const handleSpecialDiscountChangeWrapper = (value) => {
    const discount = Number(value) || 0
    setSpecialDiscount(discount)
    handleSpecialDiscountChange(discount)
  }

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        const products = await mockApi.fetchProducts();

        const codes = ["Select Code"]
        const names = ["Select Product"]
        const productDataMap = {}

        if (products) {
          products.forEach((prod) => {
            const code = prod.code
            const name = prod.name
            const description = prod.description || ""
            const rate = prod.rate || 0

            if (code && !codes.includes(code)) {
              codes.push(code)
            }

            if (name && !names.includes(name)) {
              names.push(name)
            }

            productDataMap[code] = {
              name: name,
              description: description,
              rate: rate,
            }

            productDataMap[name] = {
              code: code,
              description: description,
              rate: rate,
            }
          });
        }

        setProductCodes(codes)
        setProductNames(names)
        setProductData(productDataMap)
      } catch (error) {
        console.error("Error fetching product data:", error)
        setProductCodes(["Select Code", "CODE1", "CODE2", "CODE3"])
        setProductNames(["Select Product", "Product 1", "Product 2", "Product 3"])
        setProductData({
          CODE1: { name: "Product 1", description: "Description 1", rate: 100 },
          "Product 1": { code: "CODE1", description: "Description 1", rate: 100 },
        })
      }
    }

    fetchProductData()
  }, [])

  // Function to handle quotation number updates
  const handleQuotationNumberUpdate = (newQuotationNumber) => {
    handleInputChange("quotationNo", newQuotationNumber)
  }

  // Helper function to safely convert value to string
  const safeToString = (value) => {
    if (value === null || value === undefined) return ""
    return String(value)
  }

  // NEW: Handle lead number selection and autofill
  const handleLeadNoSelect = async (selectedLeadNo) => {
    if (!selectedLeadNo || selectedLeadNo === "Select Lead No." || !leadNoData[selectedLeadNo]) {
      return;
    }

    setIsItemsLoading(true); // Start loading

    const leadData = leadNoData[selectedLeadNo]
    console.log("Selected lead data:", leadData)

    // Fill consignee details
    const companyName = leadData.companyName
    handleInputChange("consigneeName", companyName)
    handleInputChange("consigneeAddress", leadData.address)
    handleInputChange("consigneeState", leadData.state)
    handleInputChange("consigneeContactName", leadData.contactName)
    handleInputChange("consigneeContactNo", leadData.contactNo)
    handleInputChange("consigneeGSTIN", leadData.gstin)

    if (leadData.shipTo) {
      handleInputChange("shipTo", leadData.shipTo)
    }

    // IMPORTANT: Fill additional company details from dropdown data if available
    if (companyName && dropdownData.companies && dropdownData.companies[companyName]) {
      const companyDetails = dropdownData.companies[companyName]

      // Fill additional company details if not already filled from lead data
      if (!leadData.address && companyDetails.address) {
        handleInputChange("consigneeAddress", companyDetails.address)
      }
      if (!leadData.state && companyDetails.state) {
        handleInputChange("consigneeState", companyDetails.state)
      }
      if (!leadData.contactName && companyDetails.contactName) {
        handleInputChange("consigneeContactName", companyDetails.contactName)
      }
      if (!leadData.contactNo && companyDetails.contactNo) {
        handleInputChange("consigneeContactNo", companyDetails.contactNo)
      }
      if (!leadData.gstin && companyDetails.gstin) {
        handleInputChange("consigneeGSTIN", companyDetails.gstin)
      }
      if (companyDetails.stateCode) {
        handleInputChange("consigneeStateCode", companyDetails.stateCode)
      }
    }

    // CRITICAL: Get company prefix and update quotation number based on company name
    try {
      const companyPrefix = await getCompanyPrefix(companyName)
      const newQuotationNumber = await getNextQuotationNumber(companyPrefix)

      handleInputChange("quotationNo", newQuotationNumber)
      console.log("Updated quotation number to:", newQuotationNumber, "with prefix:", companyPrefix)
    } catch (error) {
      console.error("Error updating quotation number from lead selection:", error)
    }

    // Auto-fill items using the local handleAutoFillItems function
    try {
      await handleAutoFillItems(companyName)
    } catch (error) {
      console.error("Error auto-filling items:", error)
    }

    // Wait a bit to ensure productData is available
    await new Promise(resolve => setTimeout(resolve, 100))

    // Auto-fill items based on sheet data
    const autoItems = []

    if (leadData.sheet === "FMS") {
      const row = leadData.rowData
      const baValue = row[52] ? safeToString(row[52].v) : ""
      const bbValue = row[53] ? safeToString(row[53].v) : ""
      const biValue = row[60] ? safeToString(row[60].v) : ""

      console.log("FMS Lead - BA Value:", baValue, "BI Value:", biValue)

      if (baValue !== "" && biValue === "") {
        console.log("Processing FMS lead items...")

        // Regular columns AN-AW (indices 39-48)
        const itemColumns = [
          { nameCol: 39, qtyCol: 40 }, // AN, AO
          { nameCol: 41, qtyCol: 42 }, // AP, AQ
          { nameCol: 43, qtyCol: 44 }, // AR, AS
          { nameCol: 45, qtyCol: 46 }, // AT, AU
          { nameCol: 47, qtyCol: 48 }, // AV, AW
        ]

        for (const { nameCol, qtyCol } of itemColumns) {
          const itemName = row[nameCol] ? safeToString(row[nameCol].v).trim() : ""
          const itemQty = row[qtyCol] ? safeToString(row[qtyCol].v) : ""

          console.log(`Column ${nameCol} (Item Name):`, itemName)
          console.log(`Column ${qtyCol} (Quantity):`, itemQty)

          if (itemName !== "" && itemQty !== "") {
            const qty = isNaN(Number(itemQty)) ? 1 : Number(itemQty)
            autoItems.push({
              name: itemName,
              qty: qty,
            })
            console.log(`Added regular item from FMS: ${itemName}, qty: ${qty}`)
          }
        }

        // JSON data from CS column (index 96)
        const csValue = row[96] ? safeToString(row[96].v) : ""
        console.log("CS Value from FMS lead:", csValue)

        if (csValue !== "" && csValue !== "null" && csValue !== "undefined") {
          try {
            const jsonData = JSON.parse(csValue)
            if (Array.isArray(jsonData)) {
              jsonData.forEach((item) => {
                if (item.name && item.quantity !== undefined && item.quantity !== null) {
                  const qty = isNaN(Number(item.quantity)) ? 1 : Number(item.quantity)
                  autoItems.push({
                    name: item.name,
                    qty: qty,
                  })
                  console.log(`Added JSON item from FMS: ${item.name}, qty: ${qty}`)
                }
              })
            }
          } catch (error) {
            console.error("Error parsing JSON data from FMS:", error)
          }
        }
      } else {
        console.log("FMS lead conditions not met - BA:", baValue, "BI:", biValue)
      }
    } else if (leadData.sheet === "ENQUIRY") {
      const row = leadData.rowData
      const alValue = row[37] ? safeToString(row[37].v) : ""
      const amValue = row[38] ? safeToString(row[38].v) : ""
      const atValue = row[45] ? safeToString(row[45].v) : ""

      console.log("ENQUIRY Lead - AL Value:", alValue, "AT Value:", atValue)

      if (alValue !== "" && amValue === "") {
        console.log("Processing ENQUIRY lead items...")

        // FIRST: Process regular columns R-AK (indices 17-36) - 10 items
        const itemColumns = [
          { nameCol: 17, qtyCol: 18 }, // R, S
          { nameCol: 19, qtyCol: 20 }, // T, U
          { nameCol: 21, qtyCol: 22 }, // V, W
          { nameCol: 23, qtyCol: 24 }, // X, Y
          { nameCol: 25, qtyCol: 26 }, // Z, AA
          { nameCol: 27, qtyCol: 28 }, // AB, AC
          { nameCol: 29, qtyCol: 30 }, // AD, AE
          { nameCol: 31, qtyCol: 32 }, // AF, AG
          { nameCol: 33, qtyCol: 34 }, // AH, AI
          { nameCol: 35, qtyCol: 36 }, // AJ, AK
        ]

        console.log("Processing regular columns R-AK...")
        for (const { nameCol, qtyCol } of itemColumns) {
          const itemName = row[nameCol] ? safeToString(row[nameCol].v).trim() : ""
          const itemQty = row[qtyCol] ? safeToString(row[qtyCol].v) : ""

          console.log(`Column ${nameCol} (Item Name):`, itemName)
          console.log(`Column ${qtyCol} (Quantity):`, itemQty)

          if (itemName !== "" && itemQty !== "") {
            const qty = isNaN(Number(itemQty)) ? 1 : Number(itemQty)
            autoItems.push({
              name: itemName,
              qty: qty,
            })
            console.log(`Added regular item from R-AK: ${itemName}, qty: ${qty}`)
          }
        }

        console.log(`Regular items found: ${autoItems.length}`)

        // SECOND: Process JSON data from CB column (index 79) - Continue from item 11+
        const cbValue = row[79] ? safeToString(row[79].v) : ""
        console.log("CB Value from lead selection:", cbValue)

        if (cbValue !== "" && cbValue !== "null" && cbValue !== "undefined") {
          try {
            const jsonData = JSON.parse(cbValue)
            console.log("Parsed JSON data from CB column:", jsonData)

            if (Array.isArray(jsonData)) {
              console.log(`Processing ${jsonData.length} JSON items from CB column...`)
              jsonData.forEach((item, index) => {
                console.log(`Processing JSON item ${index + 1}:`, item)
                if (item.name && item.quantity !== undefined && item.quantity !== null) {
                  const qty = isNaN(Number(item.quantity)) ? 1 : Number(item.quantity)
                  autoItems.push({
                    name: item.name,
                    qty: qty,
                  })
                  console.log(`Added JSON item from CB: ${item.name}, qty: ${qty}`)
                } else {
                  console.log(`Skipped JSON item ${index + 1} - missing name or quantity`)
                }
              })
            } else {
              console.log("CB data is not an array:", typeof jsonData)
            }
          } catch (error) {
            console.error("Error parsing JSON data from ENQUIRY CB column:", error)
            console.log("Raw CB value that failed to parse:", cbValue)
          }
        } else {
          console.log("CB column is empty or null")
        }

        console.log(`Total items found for ENQUIRY lead: ${autoItems.length}`)
      } else {
        console.log("ENQUIRY lead conditions not met - AL:", alValue, "AT:", atValue)
      }
    }

    // Update items if found from lead data
    if (autoItems.length > 0) {
      console.log(`Creating ${autoItems.length} items from lead data...`)
      console.log("Current productData keys:", Object.keys(productData).slice(0, 10), "...") // Debug log

      const newItems = autoItems.map((item, index) => {
        // Auto-fill product code from productData with better matching
        let productInfo = null
        let productCode = ""
        let productDescription = ""
        let productRate = 0

        // Try exact match first
        if (productData[item.name]) {
          productInfo = productData[item.name]
        } else {
          // Try case-insensitive match
          const matchingKey = Object.keys(productData).find(key =>
            key.toLowerCase().trim() === item.name.toLowerCase().trim()
          )
          if (matchingKey) {
            productInfo = productData[matchingKey]
          }
        }

        if (productInfo) {
          productCode = productInfo.code || ""
          productDescription = productInfo.description || ""
          productRate = productInfo.rate || 0
        }

        console.log(`Lead Item ${index + 1}: "${item.name}" -> code: "${productCode}", rate: ${productRate}`)

        // If no code found, try a partial match
        if (!productCode) {
          const partialMatch = Object.keys(productData).find(key =>
            key.toLowerCase().includes(item.name.toLowerCase().substring(0, 10)) ||
            item.name.toLowerCase().includes(key.toLowerCase().substring(0, 10))
          )
          if (partialMatch && productData[partialMatch]) {
            productCode = productData[partialMatch].code || ""
            productDescription = productData[partialMatch].description || ""
            productRate = productData[partialMatch].rate || 0
            console.log(`Found partial match for "${item.name}": "${partialMatch}" -> code: "${productCode}"`)
          }
        }

        return {
          id: index + 1,
          code: productCode, // Auto-filled from productData
          name: item.name,
          description: productDescription, // Auto-filled from productData
          gst: 18,
          qty: item.qty,
          units: "Nos",
          rate: productRate, // Auto-filled from productData
          discount: 0,
          flatDiscount: 0,
          amount: item.qty * productRate, // Calculate initial amount
        }
      })

      handleInputChange("items", newItems)
      console.log("Items auto-filled from lead selection with codes and rates:", newItems)
    } else {
      console.log("No items found for this lead")
    }

    setIsItemsLoading(false); // Stop loading
  }

  // Function to auto-fill items based on company selection
  const handleAutoFillItems = async (companyName) => {
    if (!companyName || companyName === "Select Company") return

    try {
      console.log("Auto-filling items for company:", companyName)

      // Simplified mock implementation
      // In a real mock scenario, we would filter fmsData or enquiryToOrder for items
      const autoItems = [];

      // Mock some items for demo
      autoItems.push({
        name: "Product A",
        qty: 2
      });

      if (autoItems.length > 0) {
        const newItems = autoItems.map((item, index) => {
          // ... existing mapping logic ...
          let productInfo = null;
          let productCode = "";
          let productDescription = "";
          let productRate = 0;

          // Use product list to fill details
          if (productData[item.name]) {
            productInfo = productData[item.name];
            productCode = productInfo.code || "";
            productDescription = productInfo.description || "";
            productRate = productInfo.rate || 0;
          }

          return {
            id: index + 1,
            code: productCode,
            name: item.name,
            description: productDescription,
            gst: 18,
            qty: item.qty,
            units: "Nos",
            rate: productRate,
            discount: 0,
            flatDiscount: 0,
            amount: item.qty * productRate,
          }
        });

        handleInputChange("items", newItems);
      }

    } catch (error) {
      console.error("Error auto-filling items:", error);
    }
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <QuotationDetails
            quotationData={quotationData}
            handleInputChange={handleInputChange}
            isRevising={isRevising}
            existingQuotations={existingQuotations}
            selectedQuotation={selectedQuotation}
            handleQuotationSelect={handleQuotationSelect}
            isLoadingQuotation={isLoadingQuotation}
            preparedByOptions={preparedByOptions}
            stateOptions={stateOptions}
            dropdownData={dropdownData}
          />

          <ConsignorDetails
            quotationData={quotationData}
            handleInputChange={handleInputChange}
            referenceOptions={referenceOptions}
            selectedReferences={selectedReferences}
            setSelectedReferences={setSelectedReferences}
            dropdownData={dropdownData}
          />
        </div>

        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <ConsigneeDetails
            quotationData={quotationData}
            handleInputChange={handleInputChange}
            companyOptions={companyOptions}
            dropdownData={dropdownData}
            onQuotationNumberUpdate={handleQuotationNumberUpdate}
            onAutoFillItems={handleAutoFillItems}
            showLeadNoDropdown={showLeadNoDropdown}
            setShowLeadNoDropdown={setShowLeadNoDropdown}
            leadNoOptions={leadNoOptions}
            handleLeadNoSelect={handleLeadNoSelect}
          />
        </div>
      </div>

      <ItemsTable
        quotationData={quotationData}
        handleItemChange={handleItemChange}
        handleAddItem={handleAddItem}
        handleSpecialDiscountChange={handleSpecialDiscountChangeWrapper}
        specialDiscount={specialDiscount}
        setSpecialDiscount={setSpecialDiscount}
        productCodes={productCodes}
        productNames={productNames}
        productData={productData}
        setQuotationData={setQuotationData}
        isLoading={isItemsLoading}
        hiddenColumns={hiddenColumns}
        setHiddenColumns={setHiddenColumns}
      />

      <TermsAndConditions
        quotationData={quotationData}
        handleInputChange={handleInputChange}
        hiddenFields={hiddenFields}
        toggleFieldVisibility={toggleFieldVisibility}
      />

      <SpecialOfferSection
        quotationData={quotationData}
        handleInputChange={handleInputChange}
        addSpecialOffer={addSpecialOffer}
        removeSpecialOffer={removeSpecialOffer}
        handleSpecialOfferChange={handleSpecialOfferChange}
      />

      <NotesSection
        quotationData={quotationData}
        handleNoteChange={handleNoteChange}
        addNote={addNote}
        removeNote={removeNote}
      />

      <BankDetails quotationData={quotationData} handleInputChange={handleInputChange} imageform={imageform} />
    </div>
  )
}

export default QuotationForm