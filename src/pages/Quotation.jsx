"use client"

// import { useState } from "react"
import { FileTextIcon, PlusIcon, TrashIcon, DownloadIcon, SaveIcon, ShareIcon, CopyIcon, EyeIcon } from "../components/Icons"
import { useState, useEffect } from "react"
import image1 from "../assests/WhatsApp Image 2025-05-14 at 4.11.43 PM.jpeg"
import imageform from "../assests/WhatsApp Image 2025-05-14 at 4.11.54 PM.jpeg"

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { mockApi } from "../services/mockApi"

function Quotation() {
  const [activeTab, setActiveTab] = useState("edit")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [quotationLink, setQuotationLink] = useState("")
  const [pdfUrl, setPdfUrl] = useState("")

  // At the top of your component, add:
  const params = new URLSearchParams(window.location.search);
  const isViewMode = params.has('view');

  // Dynamic dropdown options
  const [stateOptions, setStateOptions] = useState(["Select State"])
  const [companyOptions, setCompanyOptions] = useState(["Select Company"])
  const [referenceOptions, setReferenceOptions] = useState(["Select Reference"])
  const [isRevising, setIsRevising] = useState(false);
  const [existingQuotations, setExistingQuotations] = useState([]);
  const [selectedQuotation, setSelectedQuotation] = useState("");
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(false);
  // Add these state variables near the top of your component with other state declarations
  const [productCodes, setProductCodes] = useState([]);
  const [productNames, setProductNames] = useState([]);
  const [productData, setProductData] = useState({}); // To store code-name mappings
  const [selectedReferences, setSelectedReferences] = useState([]);
  const [preparedByOptions, setPreparedByOptions] = useState([])

  const [specialDiscount, setSpecialDiscount] = useState(0);

  // Add this near your other state declarations
  const [hiddenFields, setHiddenFields] = useState({
    validity: false,
    paymentTerms: false,
    delivery: false,
    freight: false,
    insurance: false,
    taxes: false
  });


  // State for dropdown data
  const [dropdownData, setDropdownData] = useState({})

  // Initialize quotation data with empty/default values
  const [quotationData, setQuotationData] = useState({
    quotationNo: "IN-NBD-...", // Default initial value
    date: new Date().toLocaleDateString("en-GB"),

    // Consignor details
    consignorState: "",
    consignorName: "",
    consignorAddress: "",
    consignorMobile: "",
    consignorPhone: "",
    consignorGSTIN: "",
    consignorStateCode: "",

    // Consignee details
    companyName: "",
    consigneeName: "",
    consigneeAddress: "",
    consigneeState: "",
    consigneeContactName: "",
    consigneeContactNo: "",
    consigneeGSTIN: "",
    consigneeStateCode: "",

    // MSME details
    msmeNumber: "",

    // Items
    items: [
      {
        id: 1,
        code: "",
        name: "",
        description: "",
        gst: 18,
        qty: 1,
        units: "Nos",
        rate: 0,
        discount: 0, // Percentage discount
        flatDiscount: 0, // Flat discount amount
        amount: 0,
      },
    ],

    // Totals
    subtotal: 0,
    totalFlatDiscount: 0,
    cgstRate: 9,
    sgstRate: 9,
    cgstAmount: 0,
    sgstAmount: 0,
    total: 0,


    // Terms
    validity: "The above quoted prices are valid up to 5 days from date of offer.",
    paymentTerms: "100% advance payment in the mode of NEFT, RTGS & DD",
    delivery: "Material is ready in our stock",
    freight: "Extra as per actual.",
    insurance: "Transit insurance for all shipment is at Buyer's risk.",
    taxes: "Extra as per actual.",

    // Bank details
    accountNo: "",
    bankName: "",
    bankAddress: "",
    ifscCode: "",
    email: "",
    website: "",
    pan: "",

    // Notes
    notes: [""],

    // Other fields
    preparedBy: "",
  });


  useEffect(() => {
    const fetchProductData = async () => {
      try {
        const products = await mockApi.fetchProducts();

        const codes = ["Select Code"];
        const names = ["Select Product"];
        const productDataMap = {};

        if (products) {
          products.forEach((prod) => {
            const code = prod.code;
            const name = prod.name;
            const description = prod.description || "";
            const rate = prod.rate || 0;

            if (code && !codes.includes(code)) {
              codes.push(code);
            }

            if (name && !names.includes(name)) {
              names.push(name);
            }

            // Store all product details including description and rate
            productDataMap[code] = {
              name: name,
              description: description,
              rate: rate
            };

            // Also create reverse mapping (name to code)
            productDataMap[name] = {
              code: code,
              description: description,
              rate: rate
            };
          });
        }

        setProductCodes(codes);
        setProductNames(names);
        setProductData(productDataMap);
      } catch (error) {
        console.error("Error fetching product data:", error);
        // Fallback data
        setProductCodes(["Select Code", "CODE1", "CODE2", "CODE3"]);
        setProductNames(["Select Product", "Product 1", "Product 2", "Product 3"]);
        setProductData({
          "CODE1": { name: "Product 1", description: "Description 1", rate: 100 },
          "CODE2": { name: "Product 2", description: "Description 2", rate: 200 },
          "CODE3": { name: "Product 3", description: "Description 3", rate: 300 },
          "Product 1": { code: "CODE1", description: "Description 1", rate: 100 },
          "Product 2": { code: "CODE2", description: "Description 2", rate: 200 },
          "Product 3": { code: "CODE3", description: "Description 3", rate: 300 }
        });
      }
    };

    fetchProductData();
  }, []);

  const handleInputChange = (field, value) => {
    setQuotationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle item changes with discount calculation
  const handleItemChange = (id, field, value) => {
    setQuotationData((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }

          // Ensure numeric calculations
          if (field === "qty" || field === "rate" || field === "discount" || field === "flatDiscount") {
            const baseAmount = Number(updatedItem.qty) * Number(updatedItem.rate)
            const discountedAmount = baseAmount * (1 - (Number(updatedItem.discount) / 100))
            updatedItem.amount = Math.max(0, discountedAmount - Number(updatedItem.flatDiscount))
          }

          return updatedItem
        }
        return item
      })

      // Calculate total flat discount from all items
      const totalFlatDiscount = newItems.reduce((sum, item) => sum + Number(item.flatDiscount), 0)
      const subtotal = Number(newItems.reduce((sum, item) => sum + item.amount, 0))
      // Remove the subtraction of totalFlatDiscount from taxable amount
      const taxableAmount = subtotal // Changed from (subtotal - totalFlatDiscount)
      const cgstAmount = Number((taxableAmount * (prev.cgstRate / 100)).toFixed(2))
      const sgstAmount = Number((taxableAmount * (prev.sgstRate / 100)).toFixed(2))
      const totalBeforeSpecialDiscount = taxableAmount + cgstAmount + sgstAmount
      const total = Math.max(0, totalBeforeSpecialDiscount - specialDiscount)

      return {
        ...prev,
        items: newItems,
        totalFlatDiscount,
        subtotal,
        cgstAmount,
        sgstAmount,
        total,
      }
    })
  }

  // Handle total flat discount change
  const handleFlatDiscountChange = (value) => {
    setQuotationData((prev) => {
      const numValue = Number(value)
      const subtotal = prev.items.reduce((sum, item) => sum + item.amount, 0)
      // Remove the subtraction of numValue from taxable amount
      const taxableAmount = subtotal // Changed from (subtotal - numValue)
      const cgstAmount = Number((taxableAmount * (prev.cgstRate / 100)).toFixed(2))
      const sgstAmount = Number((taxableAmount * (prev.sgstRate / 100)).toFixed(2))
      const total = Number((taxableAmount + cgstAmount + sgstAmount).toFixed(2))

      return {
        ...prev,
        totalFlatDiscount: numValue,
        subtotal: subtotal,
        cgstAmount,
        sgstAmount,
        total,
      }
    })
  }

  // Add these functions near your other handler functions
  const toggleFieldVisibility = (field) => {
    setHiddenFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };
  // Handle note changes
  const handleNoteChange = (index, value) => {
    setQuotationData((prev) => {
      const newNotes = [...prev.notes]
      newNotes[index] = value
      return {
        ...prev,
        notes: newNotes,
      }
    })
  }

  // This is the updated useEffect for fetching existing quotations
  // Make sure to add this near the beginning of your component

  useEffect(() => {
    const fetchExistingQuotations = async () => {
      try {
        console.log("Fetching existing quotations...");
        const quotationNumbers = await mockApi.fetchExistingQuotations();

        console.log("Quotation numbers result:", quotationNumbers);

        if (Array.isArray(quotationNumbers)) {
          setExistingQuotations(quotationNumbers);
        } else {
          setExistingQuotations([]);
        }
      } catch (error) {
        console.error("Error fetching quotation numbers:", error);
        setExistingQuotations([]);
      }
    };

    // Call immediately when component mounts
    fetchExistingQuotations();

    // Also refetch when isRevising changes to true
    if (isRevising) {
      fetchExistingQuotations();
    }
  }, [isRevising]); // Add isRevising as a dependency

  // Update the revising button click handler to ensure it fetches quotations
  const toggleRevising = () => {
    const newIsRevising = !isRevising;
    setIsRevising(newIsRevising);

    // When switching to revising mode, clear the selected quotation
    if (newIsRevising) {
      setSelectedQuotation("");
    }
  };

  // Then update your JSX for the revise button to use this handler
  // Replace the onClick in the button with:
  // onClick={toggleRevising}

  const handleQuotationSelect = async (quotationNo) => {
    if (!quotationNo) return;

    setIsLoadingQuotation(true);
    setSelectedQuotation(quotationNo);

    try {
      const result = await mockApi.getQuotationData(quotationNo);
      console.log("Loaded quotation data:", result);

      if (result.success) {
        const loadedData = result.quotationData;

        // Parse reference names from consignorName
        const references = loadedData.consignorName ?
          loadedData.consignorName.split(",").map(r => r.trim()).filter(r => r) :
          [];
        setSelectedReferences(references);

        // Parse the items string into proper items array
        let items = [];
        let specialDiscountFromItems = loadedData.specialDiscount || 0; // Get special discount from response

        if (loadedData.items && Array.isArray(loadedData.items) && loadedData.items.length > 0) {
          items = loadedData.items.map((item, index) => ({
            id: index + 1,
            ...item
          }));
        }
        // ... rest of your item parsing logic ...

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
        const totalFlatDiscount = Number(loadedData.totalFlatDiscount) || 0;
        const cgstRate = Number(loadedData.cgstRate) || 9;
        const sgstRate = Number(loadedData.sgstRate) || 9;
        const taxableAmount = Math.max(0, subtotal - totalFlatDiscount);
        const cgstAmount = Number((taxableAmount * (cgstRate / 100)).toFixed(2));
        const sgstAmount = Number((taxableAmount * (sgstRate / 100)).toFixed(2));
        const total = Number((taxableAmount + cgstAmount + sgstAmount - specialDiscountFromItems).toFixed(2));

        // Set the quotationData state with all fields
        setQuotationData({
          ...loadedData,
          items,
          subtotal,
          totalFlatDiscount,
          cgstRate,
          sgstRate,
          cgstAmount,
          sgstAmount,
          total,
          accountNo: loadedData.accountNo || "",
          bankName: loadedData.bankName || "",
          bankAddress: loadedData.bankAddress || "",
          ifscCode: loadedData.ifscCode || "",
          email: loadedData.email || "",
          website: loadedData.website || "",
          pan: loadedData.pan || "",
          consignorState: loadedData.consignorState || "",
          consignorName: loadedData.consignorName || "",
          consignorAddress: loadedData.consignorAddress || "",
          consignorMobile: loadedData.consignorMobile || "",
          consignorPhone: loadedData.consignorPhone || "",
          consignorGSTIN: loadedData.consignorGSTIN || "",
          consignorStateCode: loadedData.consignorStateCode || "",
          consigneeName: loadedData.consigneeName || "",
          consigneeAddress: loadedData.consigneeAddress || "",
          shipTo: loadedData.shipTo || "",
          consigneeState: loadedData.consigneeState || "",
          consigneeContactName: loadedData.consigneeContactName || "",
          consigneeContactNo: loadedData.consigneeContactNo || "",
          consigneeGSTIN: loadedData.consigneeGSTIN || "",
          consigneeStateCode: loadedData.consigneeStateCode || "",
          msmeNumber: loadedData.msmeNumber || "",
          preparedBy: loadedData.preparedBy || "",
          notes: Array.isArray(loadedData.notes) ? loadedData.notes :
            (loadedData.notes ? [loadedData.notes] : [""])
        });

        // Set the special discount from the response
        setSpecialDiscount(specialDiscountFromItems);
      }
    } catch (error) {
      console.error("Error fetching quotation data:", error);
      alert("Failed to load quotation data");
    } finally {
      setIsLoadingQuotation(false);
    }
  };



  // Add a new note
  const addNote = () => {
    setQuotationData((prev) => ({
      ...prev,
      notes: [...prev.notes, ""],
    }))
  }

  // Remove a note
  const removeNote = (index) => {
    setQuotationData((prev) => {
      const newNotes = [...prev.notes]
      newNotes.splice(index, 1)
      return {
        ...prev,
        notes: newNotes,
      }
    })
  }

  // Add a new item with discount fields
  const handleAddItem = () => {
    const newId = Math.max(0, ...quotationData.items.map((item) => item.id)) + 1
    setQuotationData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: newId,
          code: "",
          name: "",
          gst: 18,
          qty: 1,
          units: "Nos",
          rate: 0,
          discount: 0, // Percentage discount
          flatDiscount: 0, // Flat discount
          amount: 0,
        },
      ],
    }))
  }

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
        // Use existing fallback logic if needed
      }


      fetchDropdownData()
    }, [])


  // Add this function near the top of your component with other helper functions
  const getCurrentFinancialYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;

    // Financial year runs from April to March
    const financialYearStart = now.getMonth() >= 3 ? currentYear : currentYear - 1;
    const financialYearEnd = financialYearStart + 1;

    // Get last two digits of each year
    const startShort = String(financialYearStart).slice(-2);
    const endShort = String(financialYearEnd).slice(-2);

    return `${startShort}-${endShort}`;
  };

  // Handle reference name change and auto-fill mobile number
  const handleReferenceChange = (e) => {
    const selectedReference = e.target.value
    handleInputChange("consignorName", selectedReference)

    if (selectedReference && dropdownData.references && dropdownData.references[selectedReference]) {
      const referenceDetails = dropdownData.references[selectedReference]

      // Auto-fill mobile number from reference details
      if (referenceDetails.mobile) {
        handleInputChange("consignorMobile", referenceDetails.mobile)
      }
    } else {
      // Clear mobile field when no reference is selected or data is not available
      handleInputChange("consignorMobile", "")
    }
  }

  // Handle company change and auto-fill consignee details
  const handleCompanyChange = (e) => {
    const selectedCompany = e.target.value
    handleInputChange("consigneeName", selectedCompany)

    if (selectedCompany && dropdownData.companies && dropdownData.companies[selectedCompany]) {
      const companyDetails = dropdownData.companies[selectedCompany]

      // Auto-fill company details
      handleInputChange("consigneeAddress", companyDetails.address)      // Column P - Address
      handleInputChange("consigneeState", companyDetails.state)          // Column Q - State
      handleInputChange("consigneeContactName", companyDetails.contactName) // Column N - Contact Name
      handleInputChange("consigneeContactNo", companyDetails.contactNo)  // Column O - Contact No
      handleInputChange("consigneeGSTIN", companyDetails.gstin)          // Column R - GSTIN
      handleInputChange("consigneeStateCode", companyDetails.stateCode)  // Column S - State Code
    } else {
      // Clear fields when no company is selected or data is not available
      handleInputChange("consigneeAddress", "")
      handleInputChange("consigneeState", "")
      handleInputChange("consigneeContactName", "")
      handleInputChange("consigneeContactNo", "")
      handleInputChange("consigneeGSTIN", "")
      handleInputChange("consigneeStateCode", "")
    }
  }

  // Handle state change and auto-fill related fields
  const handleStateChange = (e) => {
    const selectedState = e.target.value
    handleInputChange("consignorState", selectedState)

    if (selectedState && dropdownData.states && dropdownData.states[selectedState]) {
      const stateDetails = dropdownData.states[selectedState]

      // Parse bank details (from column AB)
      if (stateDetails.bankDetails) {
        const bankDetailsText = stateDetails.bankDetails

        // Extract bank details using regex patterns
        const accountNoMatch = bankDetailsText.match(/Account No\.: ([^\n]+)/)
        const bankNameMatch = bankDetailsText.match(/Bank Name: ([^\n]+)/)
        const bankAddressMatch = bankDetailsText.match(/Bank Address: ([^\n]+)/)
        const ifscMatch = bankDetailsText.match(/IFSC CODE: ([^\n]+)/)
        const emailMatch = bankDetailsText.match(/Email: ([^\n]+)/)
        const websiteMatch = bankDetailsText.match(/Website: ([^\n]+)/)

        // Update bank details fields
        if (accountNoMatch) handleInputChange("accountNo", accountNoMatch[1])
        if (bankNameMatch) handleInputChange("bankName", bankNameMatch[1])
        if (bankAddressMatch) handleInputChange("bankAddress", bankAddressMatch[1])
        if (ifscMatch) handleInputChange("ifscCode", ifscMatch[1])
        if (emailMatch) handleInputChange("email", emailMatch[1])
        if (websiteMatch) handleInputChange("website", websiteMatch[1])
      }

      // Update other state details
      if (stateDetails.consignerAddress) {
        handleInputChange("consignorAddress", stateDetails.consignerAddress)
      }

      if (stateDetails.stateCode) {
        handleInputChange("consignorStateCode", stateDetails.stateCode)
      }

      if (stateDetails.gstin) {
        handleInputChange("consignorGSTIN", stateDetails.gstin)
      }

      if (stateDetails.msmeNumber) {
        handleInputChange("msmeNumber", stateDetails.msmeNumber)
      }

      // Add this line to set the PAN from state details
      if (stateDetails.pan) {
        handleInputChange("pan", stateDetails.pan)
      }
    } else {
      // Clear fields when no state is selected or data is not available
      handleInputChange("accountNo", "")
      handleInputChange("bankName", "")
      handleInputChange("bankAddress", "")
      handleInputChange("ifscCode", "")
      handleInputChange("email", "")
      handleInputChange("website", "")
      handleInputChange("pan", "") // Clear PAN field
      handleInputChange("consignorAddress", "")
      handleInputChange("consignorStateCode", "")
      handleInputChange("consignorGSTIN", "")
      handleInputChange("msmeNumber", "") // Clear MSME field
    }
  }

  useEffect(() => {
    const initializeQuotationNumber = async () => {
      try {
        const nextQuotationNumber = await getNextQuotationNumber();
        setQuotationData(prev => ({
          ...prev,
          quotationNo: nextQuotationNumber
        }));
      } catch (error) {
        console.error("Error initializing quotation number:", error);
      }
    };

    initializeQuotationNumber();
  }, []);

  // Generate PDF
  const handleGeneratePDF = () => {
    setIsGenerating(true)

    try {
      // Generate the PDF base64 data
      const base64Data = generatePDFFromData()

      // Convert base64 to Blob
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })

      // Create a link element to trigger download
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `Quotation_${quotationData.quotationNo}.pdf`

      // Append to body, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the URL object
      URL.revokeObjectURL(link.href)

      setIsGenerating(false)
      alert("PDF generated and downloaded successfully!")
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF")
      setIsGenerating(false)
    }
  }

  // Generate shareable link
  const handleGenerateLink = () => {
    setIsGenerating(true);

    // Create a unique identifier for this quotation
    const quotationId = `quotation_${Date.now()}`;

    // Store the current quotation data in localStorage with this ID
    localStorage.setItem(quotationId, JSON.stringify(quotationData));

    // Generate the link that will open this quotation in view-only mode
    const link = `${window.location.origin}${window.location.pathname}?view=${quotationId}`;

    setQuotationLink(link);
    setIsGenerating(false);
    alert("Quotation link has been successfully generated and is ready to share.");
  };

  useEffect(() => {
    // Check if we're in view mode (URL has ?view= parameter)
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('view');

    if (viewId) {
      // Load the quotation data from localStorage
      const savedQuotation = localStorage.getItem(viewId);

      if (savedQuotation) {
        try {
          const parsedData = JSON.parse(savedQuotation);
          setQuotationData(parsedData);
          setActiveTab("preview"); // Force preview mode
        } catch (error) {
          console.error("Error loading quotation data:", error);
        }
      }
    }
  }, []);

  // Generate PDF
  // Generate PDF
  const generatePDFFromData = () => {
    // Create a new jsPDF instance with landscape orientation for more width
    const doc = new jsPDF('p', 'mm', 'a4');

    // Page dimensions
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 10;
    let currentY = 20; // Starting Y position

    // Utility function to wrap text
    const wrapText = (text, maxWidth) => {
      return doc.splitTextToSize(text || '', maxWidth);
    };

    // Utility function to format currency
    const formatCurrency = (value) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value).replace('₹', '').trim();
    };

    // Function to check space and add new page if needed
    const checkSpace = (requiredHeight) => {
      if (currentY + requiredHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
        addPageHeader();
        return true;
      }
      return false;
    };

    // Function to add page header
    const addPageHeader = () => {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('QUOTATION', pageWidth / 2, currentY, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Quotation No: ${quotationData.quotationNo}`, margin, currentY + 10);
      doc.text(`Date: ${quotationData.date}`, pageWidth - margin, currentY + 10, { align: 'right' });

      currentY += 20;
    };

    // Add initial page header
    addPageHeader();

    // Prepare consignor and consignee details
    const consignorDetails = [
      // `Name: ${quotationData.consignorName}`,
      `Name: ${selectedReferences[0] || 'N/A'}`,
      `Address: ${quotationData.consignorAddress}`,
      `Mobile: ${quotationData.consignorMobile.split(",")[0] || 'N/A'}`,
      `GSTIN: ${quotationData.consignorGSTIN || 'N/A'}`,
      `State Code: ${quotationData.consignorStateCode || 'N/A'}`
    ];

    const consigneeDetails = [
      `Name: ${quotationData.consigneeName}`,
      `Address: ${quotationData.consigneeAddress}`,
      `GSTIN: ${quotationData.consigneeGSTIN || 'N/A'}`,
      `State Code: ${quotationData.consigneeStateCode || 'N/A'}`
    ];

    // Render Consignor & Consignee Details
    doc.setFont('helvetica', 'bold');
    doc.text('Consignor Details', margin, currentY);
    doc.text('Consignee Details', pageWidth / 2 + margin, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += 6;

    // Calculate required height for details
    const detailsHeight = Math.max(
      consignorDetails.length * 5,
      consigneeDetails.length * 5
    );

    checkSpace(detailsHeight + 20);

    // Render consignor details with text wrapping
    let consignorY = currentY;
    consignorDetails.forEach((line) => {
      const wrappedLines = wrapText(line, pageWidth / 2 - margin * 2);
      wrappedLines.forEach((wrappedLine) => {
        if (consignorY + 5 > pageHeight - margin) {
          doc.addPage();
          consignorY = margin + 20;
        }
        doc.text(wrappedLine, margin, consignorY);
        consignorY += 5;
      });
    });

    // Render consignee details with text wrapping
    let consigneeY = currentY;
    consigneeDetails.forEach((line) => {
      const wrappedLines = wrapText(line, pageWidth / 2 - margin * 2);
      wrappedLines.forEach((wrappedLine) => {
        if (consigneeY + 5 > pageHeight - margin) {
          doc.addPage();
          consigneeY = margin + 20;
        }
        doc.text(wrappedLine, pageWidth / 2 + margin, consigneeY);
        consigneeY += 5;
      });
    });

    // Update current Y to the max of both sections
    currentY = Math.max(consignorY, consigneeY) + 10;

    // Prepare items data for the table
    const itemsData = quotationData.items.map((item, index) => [
      index + 1,
      item.code,
      item.name,
      item.description, // Add description
      `${item.gst}%`,
      item.qty,
      item.units,
      formatCurrency(item.rate),
      `${item.discount}%`,
      formatCurrency(item.flatDiscount),
      formatCurrency(item.amount)
    ])

    // Calculate required height for the table
    const rowHeight = 10;
    const tableHeight = (itemsData.length + 1) * rowHeight; // +1 for header row

    // Check space and add new page if needed
    checkSpace(tableHeight + 50);

    // Use autoTable with custom settings
    autoTable(doc, {
      startY: currentY,
      head: [['S.No', 'Code', 'Product Name', 'Description', 'GST %', 'Qty', 'Units', 'Rate', 'Disc %', 'Flat Disc', 'Amount']],
      body: itemsData,
      margin: { top: currentY },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        lineColor: [200, 200, 200],
        lineWidth: 0.3
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 6, halign: 'center' },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 'auto' }, // Description column
        4: { cellWidth: 10, halign: 'center' },
        5: { cellWidth: 8, halign: 'center' },
        6: { cellWidth: 10, halign: 'center' },
        7: { cellWidth: 12, halign: 'right' },
        8: { cellWidth: 10, halign: 'center' },
        9: { cellWidth: 12, halign: 'right' },
        10: { cellWidth: 15, halign: 'right' }
      },
      didDrawPage: function (data) {
        // Reset Y position after table is drawn
        currentY = data.cursor.y;
      }
    });

    // Get the final Y position after the table
    currentY = doc.lastAutoTable.finalY + 10;

    // Financial Summary
    checkSpace(50);

    const summaryItems = [
      { label: 'Subtotal:', value: formatCurrency(quotationData.subtotal) },
      { label: 'Total Flat Discount:', value: `-${formatCurrency(quotationData.totalFlatDiscount)}` },
      { label: 'Taxable Amount:', value: formatCurrency(quotationData.subtotal - quotationData.totalFlatDiscount) },
      { label: `CGST (${quotationData.cgstRate}%):`, value: formatCurrency(quotationData.cgstAmount) },
      { label: `SGST (${quotationData.sgstRate}%):`, value: formatCurrency(quotationData.sgstAmount) },
      { label: 'Total:', value: formatCurrency(quotationData.total) }
    ];

    doc.setFont('helvetica', 'bold');
    doc.text('Financial Summary', margin, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += 7;

    summaryItems.forEach(item => {
      checkSpace(7);
      doc.text(item.label, margin, currentY);
      doc.text(item.value, pageWidth - margin - 10, currentY, { align: 'right' });
      currentY += 7;
    });

    // Terms & Conditions
    checkSpace(50);

    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions', margin, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += 7;

    const terms = [
      `Validity: ${quotationData.validity}`,
      `Payment Terms: ${quotationData.paymentTerms}`,
      `Delivery: ${quotationData.delivery}`,
      `Freight: ${quotationData.freight}`,
      `Insurance: ${quotationData.insurance}`,
      `Taxes: ${quotationData.taxes}`
    ];

    terms.forEach(term => {
      const wrappedLines = wrapText(term, pageWidth - margin * 2);
      wrappedLines.forEach(line => {
        checkSpace(7);
        doc.text(line, margin, currentY);
        currentY += 7;
      });
    });

    // Notes
    if (quotationData.notes && quotationData.notes.length > 0) {
      checkSpace(20);

      doc.setFont('helvetica', 'bold');
      doc.text('Notes', margin, currentY);
      doc.setFont('helvetica', 'normal');
      currentY += 7;

      quotationData.notes.filter(note => note.trim()).forEach(note => {
        const wrappedLines = wrapText(`• ${note}`, pageWidth - margin * 2);
        wrappedLines.forEach(line => {
          checkSpace(7);
          doc.text(line, margin, currentY);
          currentY += 7;
        });
      });
    }

    // Bank Details
    checkSpace(50);

    doc.setFont('helvetica', 'bold');
    doc.text('Bank Details', margin, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += 7;

    const bankDetails = [
      `Account No.: ${quotationData.accountNo}`,
      `Bank Name: ${quotationData.bankName}`,
      `Bank Address: ${quotationData.bankAddress}`,
      `IFSC Code: ${quotationData.ifscCode}`,
      `Email: ${quotationData.email}`,
      `Website: ${quotationData.website}`,
      `Company PAN: ${quotationData.pan}`
    ];

    bankDetails.forEach(detail => {
      const wrappedLines = wrapText(detail, pageWidth - margin * 2);
      wrappedLines.forEach(line => {
        checkSpace(7);
        doc.text(line, margin, currentY);
        currentY += 7;
      });
    });

    // Declaration
    checkSpace(40);

    doc.setFont('helvetica', 'bold');
    doc.text('Declaration', margin, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += 7;

    const declaration = [
      'We declare that this Quotation shows the actual price of the goods described',
      'and that all particulars are true and correct.'
    ];

    declaration.forEach(line => {
      const wrappedLines = wrapText(line, pageWidth - margin * 2);
      wrappedLines.forEach(wrappedLine => {
        checkSpace(7);
        doc.text(wrappedLine, margin, currentY);
        currentY += 7;
      });
    });

    // Prepared By
    doc.setFont('helvetica', 'bold');
    doc.text(`Prepared By: ${quotationData.preparedBy}`, margin, currentY + 10);

    // Add page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
    }

    // Generate Base64 PDF
    return doc.output('datauristring').split(',')[1];
  };

  // Modified handleSaveQuotation function to submit data in specified order
  // Modified handleSaveQuotation function to include item data after bank details
  const handleSaveQuotation = async () => {
    // Validate required fields
    if (!quotationData.consigneeName) {
      alert("Please select a company name")
      return
    }

    if (!quotationData.preparedBy) {
      alert("Please enter prepared by name")
      return
    }

    setIsSubmitting(true)

    try {
      // Generate PDF
      const base64Data = generatePDFFromData()

      // Handle revision numbering
      // Update the revision numbering logic in handleSaveQuotation
      let finalQuotationNo = quotationData.quotationNo;
      if (isRevising && selectedQuotation) {
        // Check if this is the first revision (no -## suffix)
        if (!finalQuotationNo.match(/-\d{2}$/)) {
          finalQuotationNo = `${finalQuotationNo}-01`;
        } else {
          // Increment the revision number
          const parts = finalQuotationNo.split('-');
          const lastPart = parts[parts.length - 1];
          const revisionNumber = parseInt(lastPart, 10);
          const newRevision = (revisionNumber + 1).toString().padStart(2, '0');
          parts[parts.length - 1] = newRevision;
          finalQuotationNo = parts.join('-');
        }
      }

      const fileName = `Quotation_${finalQuotationNo}.pdf`

      // 1. Upload PDF
      const pdfUrlResult = await mockApi.uploadFile({
        name: fileName,
        type: "application/pdf",
        base64Data: base64Data
      }, "pdf");

      // Get the PDF URL
      const pdfUrl = pdfUrlResult || "http://mock-pdf-url.com";

      // 2. Prepare Data (omitting lengthy array creation logic for brevity, passing entire state is better but adhering to structure)
      // For mock purpose, we can just pass the quotationData

      const result = await mockApi.saveQuotation({
        ...quotationData,
        quotationNo: finalQuotationNo,
        items: quotationData.items,
        pdfUrl: pdfUrl
      });

      if (!result.success) {
        throw new Error("Error saving quotation: " + (result.error || "Unknown error"))
      }

      // Mock item submission is handled by saveQuotation in simplified manner, 
      // or we can iterate if we really want to mimic individual item saves, but unnecessary for mock.

      // Simulate waiting
      await new Promise(resolve => setTimeout(resolve, 500));

      // Set the PDF URL for preview
      setPdfUrl(pdfUrl)

      // Update the quotation number in state if we revised
      if (isRevising && selectedQuotation) {
        setQuotationData(prev => ({
          ...prev,
          quotationNo: finalQuotationNo
        }));
      }

      alert("Quotation saved successfully with all items!")

      // Reset form to prepare for new quotation
      const nextQuotationNumber = await getNextQuotationNumber()
      setQuotationData({
        quotationNo: nextQuotationNumber,
        date: new Date().toLocaleDateString("en-GB"),
        consignorState: "",
        consignorName: "",
        consignorAddress: "",
        consignorMobile: "",
        consignorPhone: "",
        consignorGSTIN: "",
        consignorStateCode: "",
        companyName: "",
        consigneeName: "",
        consigneeAddress: "",
        consigneeState: "",
        consigneeContactName: "",
        consigneeContactNo: "",
        consigneeGSTIN: "",
        consigneeStateCode: "",
        msmeNumber: "",
        items: [
          {
            id: 1,
            code: "",
            name: "",
            gst: 18,
            qty: 1,
            units: "Nos",
            rate: 0,
            discount: 0,
            flatDiscount: 0,
            amount: 0,
          },
        ],
        totalFlatDiscount: 0,
        subtotal: 0,
        cgstRate: 9,
        sgstRate: 9,
        cgstAmount: 0,
        sgstAmount: 0,
        total: 0,
        validity: "The above quoted prices are valid up to 5 days from date of offer.",
        paymentTerms: "100% advance payment in the mode of NEFT, RTGS & DD",
        delivery: "Material is ready in our stock",
        freight: "Extra as per actual.",
        insurance: "Transit insurance for all shipment is at Buyer's risk.",
        taxes: "Extra as per actual.",
        accountNo: "",
        bankName: "",
        bankAddress: "",
        ifscCode: "",
        email: "",
        website: "",
        pan: "",
        notes: [""],
        preparedBy: "",
      })
    } catch (error) {
      alert("Error: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }


  // Helper function to increment quotation number
  const getNextQuotationNumber = async () => {
    // Send request to get last quotation number
    const nextQuotationNumber = await mockApi.getNextQuotationNumber();
    return nextQuotationNumber;


  } catch (error) {
    console.error("Error getting next quotation number:", error)
    // Fallback to default in case of any error
    return "IN-NBD-001"
  }
}


return (
  <div className="py-2">
    <div className="flex justify-between items-center mb-6">
      <img src={image1} alt="Logo" className="h-20 w-25 mr-3" />
      <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent flex items-center">
        DIVINE EMPIRE INDIA PVT. LTD.
      </h1>
      <button
        className={`px-4 py-2 rounded-md ${isRevising ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
        onClick={() => setIsRevising(!isRevising)}
      >
        {isRevising ? 'Cancel Revise' : 'Revise'}
      </button>
    </div>


    <div className="bg-white rounded-lg shadow border">
      <div className="border-b">
        <div className="flex">
          <button
            className={`px-4 py-2 font-medium ${activeTab === "edit"
              ? "bg-gradient-to-r from-indigo-500 to-sky-500 text-white rounded-tl-lg"
              : "text-gray-600"
              }`}
            onClick={() => setActiveTab("edit")}
          >
            Edit Quotation
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === "preview" ? "bg-gradient-to-r from-indigo-500 to-sky-500 text-white" : "text-gray-600"
              }`}
            onClick={() => setActiveTab("preview")}
          >
            Preview
          </button>
        </div>
      </div>

      <div className="p-4">
        {activeTab === "edit" ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-medium mb-4">Quotation Details</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Replace the existing Quotation No input field with this upgraded version */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Quotation No.</label>
                      {isRevising ? (
                        <div className="flex items-center">
                          <select
                            value={selectedQuotation}
                            onChange={(e) => handleQuotationSelect(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          >
                            <option value="">Select Quotation to Revise</option>
                            {existingQuotations && existingQuotations.length > 0 ? (
                              existingQuotations.map((quotation) => (
                                <option key={quotation} value={quotation}>
                                  {quotation}
                                </option>
                              ))
                            ) : (
                              <option value="" disabled>Loading quotations...</option>
                            )}
                          </select>
                          {isLoadingQuotation && (
                            <div className="ml-2">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={quotationData.quotationNo}
                          readOnly
                          className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                        />
                      )}
                    </div>


                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Date</label>
                      <input
                        type="date"
                        value={quotationData.date.split("/").reverse().join("-")}
                        onChange={(e) => {
                          // Convert from YYYY-MM-DD to DD/MM/YYYY format
                          const dateValue = e.target.value
                          if (dateValue) {
                            const [year, month, day] = dateValue.split("-")
                            handleInputChange("date", `${day}/${month}/${year}`)
                          }
                        }}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Prepared By</label>
                    <input
                      type="text"
                      list="preparedByList"
                      value={quotationData.preparedBy}
                      onChange={(e) => handleInputChange("preparedBy", e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="Enter or select the name of the person preparing this quotation"
                      required
                    />
                    <datalist id="preparedByList">
                      {preparedByOptions.map((name, idx) => (
                        <option key={idx} value={name} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">State</label>
                    <select
                      value={quotationData.consignorState}
                      onChange={handleStateChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      {stateOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <h3 className="text-lg font-medium mt-6 mb-4">Consignor Details</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Reference Name</label>

                    {/* Selected references display */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedReferences.map((ref) => (
                        <div key={ref} className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                          {ref}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = selectedReferences.filter(r => r !== ref);
                              setSelectedReferences(updated);
                              handleInputChange("consignorName", updated.join(", "));

                              // Update mobile numbers
                              if (updated.length > 0 && dropdownData.references) {
                                const mobileNumbers = updated
                                  .map(r => dropdownData.references[r]?.mobile)
                                  .filter(Boolean);
                                handleInputChange("consignorMobile", mobileNumbers.join(", "));
                              } else {
                                handleInputChange("consignorMobile", "");
                              }
                            }}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Dropdown select */}
                    <select
                      value="" // Always empty to allow new selections
                      onChange={(e) => {
                        const selectedRef = e.target.value;
                        if (selectedRef && !selectedReferences.includes(selectedRef)) {
                          const updated = [...selectedReferences, selectedRef];
                          setSelectedReferences(updated);
                          handleInputChange("consignorName", updated.join(", "));

                          // Update mobile numbers
                          if (dropdownData.references && dropdownData.references[selectedRef]?.mobile) {
                            const mobileNumbers = updated
                              .map(ref => dropdownData.references[ref]?.mobile)
                              .filter(Boolean);
                            handleInputChange("consignorMobile", mobileNumbers.join(", "));
                          }
                        }
                        e.target.value = ""; // Reset the select
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select Reference</option>
                      {referenceOptions
                        .filter(option => option !== "Select Reference" && !selectedReferences.includes(option))
                        .map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Address</label>
                    <textarea
                      value={quotationData.consignorAddress}
                      onChange={(e) => handleInputChange("consignorAddress", e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Mobile</label>
                      <input
                        type="text"
                        value={quotationData.consignorMobile}
                        onChange={(e) => handleInputChange("consignorMobile", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Phone</label>
                      <input
                        type="text"
                        value={quotationData.consignorPhone}
                        onChange={(e) => handleInputChange("consignorPhone", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">GSTIN</label>
                      <input
                        type="text"
                        value={quotationData.consignorGSTIN}
                        onChange={(e) => handleInputChange("consignorGSTIN", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">State Code</label>
                      <input
                        type="text"
                        value={quotationData.consignorStateCode}
                        onChange={(e) => handleInputChange("consignorStateCode", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">MSME No.</label>
                      <input
                        type="text"
                        value={quotationData.msmeNumber || ""}
                        onChange={(e) => handleInputChange("msmeNumber", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-medium mb-4">Consignee Details</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Company Name</label>
                    <select
                      value={quotationData.consigneeName}
                      onChange={handleCompanyChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    >
                      {companyOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Address</label>
                    <textarea
                      value={quotationData.consigneeAddress}
                      onChange={(e) => handleInputChange("consigneeAddress", e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      rows={3}
                      placeholder="Enter address"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Ship To</label>
                    <textarea
                      value={quotationData.shipTo || ""}
                      onChange={(e) => handleInputChange("shipTo", e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      rows={3}
                      placeholder="Enter shipping address if different from billing address"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">State</label>
                    <input
                      type="text"
                      value={quotationData.consigneeState}
                      onChange={(e) => handleInputChange("consigneeState", e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="Enter State"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Contact Name</label>
                      <input
                        type="text"
                        value={quotationData.consigneeContactName}
                        onChange={(e) => handleInputChange("consigneeContactName", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Contact No.</label>
                      <input
                        type="text"
                        value={quotationData.consigneeContactNo}
                        onChange={(e) => handleInputChange("consigneeContactNo", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">GSTIN</label>
                      <input
                        type="text"
                        value={quotationData.consigneeGSTIN}
                        onChange={(e) => handleInputChange("consigneeGSTIN", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">State Code</label>
                      <input
                        type="text"
                        value={quotationData.consigneeStateCode}
                        onChange={(e) => handleInputChange("consigneeStateCode", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Items</h3>
                  <button
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                    onClick={handleAddItem}
                  >
                    <PlusIcon className="h-4 w-4 inline mr-1" /> Add Item
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S No.</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">GST %</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty.</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Disc %</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Flat Disc</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {quotationData.items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2">{index + 1}</td>
                          <td className="px-4 py-2">
                            <div className="relative">
                              <input
                                type="text"
                                value={item.code}
                                onChange={(e) => {
                                  handleItemChange(item.id, "code", e.target.value);
                                  // Auto-fill product name, description and rate if code exists in mapping
                                  if (productData[e.target.value]) {
                                    const productInfo = productData[e.target.value];
                                    handleItemChange(item.id, "name", productInfo.name);
                                    handleItemChange(item.id, "description", productInfo.description);
                                    handleItemChange(item.id, "rate", productInfo.rate);
                                  }
                                }}
                                list={`code-list-${item.id}`}
                                className="w-24 p-1 border border-gray-300 rounded-md"
                              />
                              <datalist id={`code-list-${item.id}`}>
                                {productCodes.map((code) => (
                                  <option key={code} value={code} />
                                ))}
                              </datalist>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="relative">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => {
                                  handleItemChange(item.id, "name", e.target.value);
                                  // Auto-fill code, description and rate if product name exists in mapping
                                  if (productData[e.target.value]) {
                                    const productInfo = productData[e.target.value];
                                    handleItemChange(item.id, "code", productInfo.code);
                                    handleItemChange(item.id, "description", productInfo.description);
                                    handleItemChange(item.id, "rate", productInfo.rate);
                                  }
                                }}
                                list={`name-list-${item.id}`}
                                className="w-full p-1 border border-gray-300 rounded-md"
                                placeholder="Enter item name"
                                required
                              />
                              <datalist id={`name-list-${item.id}`}>
                                {productNames.map((name) => (
                                  <option key={name} value={name} />
                                ))}
                              </datalist>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="relative">
                              <input
                                type="text"
                                value={item.description || ""}
                                onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                                className="w-full p-1 border border-gray-300 rounded-md"
                                placeholder="Enter description"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={item.gst}
                              onChange={(e) => handleItemChange(item.id, "gst", Number.parseInt(e.target.value))}
                              className="w-20 p-1 border border-gray-300 rounded-md"
                            >
                              <option value="0">0%</option>
                              {/* <option value="5">5%</option> */}
                              {/* <option value="12">12%</option> */}
                              <option value="18">18%</option>
                              {/* <option value="28">28%</option> */}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) => handleItemChange(item.id, "qty", Number.parseInt(e.target.value) || 0)}
                              className="w-16 p-1 border border-gray-300 rounded-md"
                              placeholder="0"
                              required
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={item.units}
                              onChange={(e) => handleItemChange(item.id, "units", e.target.value)}
                              className="w-20 p-1 border border-gray-300 rounded-md"
                            >
                              <option value="Nos">Nos</option>
                              <option value="Pcs">Pcs</option>
                              <option value="Kg">Kg</option>
                              <option value="Set">Set</option>

                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => handleItemChange(item.id, "rate", Number.parseFloat(e.target.value) || 0)}
                              className="w-24 p-1 border border-gray-300 rounded-md"
                              placeholder="0.00"
                              required
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={item.discount}
                              onChange={(e) => handleItemChange(item.id, "discount", Number.parseFloat(e.target.value) || 0)}
                              className="w-20 p-1 border border-gray-300 rounded-md"
                              placeholder="0%"
                              min="0"
                              max="100"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={item.flatDiscount}
                              onChange={(e) => handleItemChange(item.id, "flatDiscount", Number.parseFloat(e.target.value) || 0)}
                              className="w-24 p-1 border border-gray-300 rounded-md"
                              placeholder="0.00"
                              min="0"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={item.amount}
                              className="w-24 p-1 border border-gray-300 rounded-md bg-gray-50"
                              readOnly
                            />
                          </td>
                          <td className="px-4 py-2">
                            <button
                              className="text-red-500 hover:text-red-700 p-1 rounded-md"
                              onClick={() => {
                                // Remove item
                                const newItems = quotationData.items.filter((i) => i.id !== item.id)
                                if (newItems.length === 0) return // Don't remove the last item

                                // Recalculate totals
                                const subtotal = newItems.reduce((sum, i) => sum + i.amount, 0)
                                const subtotalAfterDiscount = Math.max(0, subtotal - quotationData.totalFlatDiscount)
                                const cgstAmount = subtotalAfterDiscount * (quotationData.cgstRate / 100)
                                const sgstAmount = subtotalAfterDiscount * (quotationData.sgstRate / 100)
                                const total = subtotalAfterDiscount + cgstAmount + sgstAmount

                                setQuotationData({
                                  ...quotationData,
                                  items: newItems,
                                  subtotal,
                                  cgstAmount,
                                  sgstAmount,
                                  total,
                                })
                              }}
                              disabled={quotationData.items.length <= 1}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="9" className="px-4 py-2 text-right font-medium">
                          Subtotal:
                        </td>
                        <td className="border p-2">₹{typeof quotationData.subtotal === 'number' ? quotationData.subtotal.toFixed(2) : '0.00'}</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan="9" className="px-4 py-2 text-right font-medium">
                          Total Flat Discount:
                        </td>
                        <td className="p-2">₹{typeof quotationData.totalFlatDiscount === 'number' ? quotationData.totalFlatDiscount.toFixed(2) : '0.00'}</td>
                        <td></td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan="9" className="px-4 py-2 text-right font-medium">
                          Taxable Amount:
                        </td>
                        <td className="px-4 py-2">₹{quotationData.subtotal.toFixed(2)}</td> {/* Removed subtraction of totalFlatDiscount */}
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan="9" className="px-4 py-2 text-right font-medium">
                          CGST ({quotationData.cgstRate}%):
                        </td>
                        <td className="px-4 py-2">₹{quotationData.cgstAmount.toFixed(2)}</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan="9" className="px-4 py-2 text-right font-medium">
                          SGST ({quotationData.sgstRate}%):
                        </td>
                        <td className="px-4 py-2">₹{quotationData.sgstAmount.toFixed(2)}</td>
                        <td></td>
                      </tr>
                      {/* <tr className="font-bold">
      <td colSpan="9" className="px-4 py-2 text-right">
        Total:
      </td>
      <td className="px-4 py-2">₹{quotationData.total.toFixed(2)}</td>
      <td></td>
    </tr> */}

                      <tr>
                        <td colSpan="9" className="px-4 py-2 text-right font-medium">
                          Special Discount:
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={specialDiscount}
                            onChange={(e) => {
                              const discount = Number(e.target.value) || 0;
                              setSpecialDiscount(discount);
                              // Update the total with special discount
                              const taxableAmount = quotationData.subtotal - quotationData.totalFlatDiscount;
                              const totalBeforeSpecialDiscount = taxableAmount + quotationData.cgstAmount + quotationData.sgstAmount;
                              const newTotal = Math.max(0, totalBeforeSpecialDiscount - discount);
                              setQuotationData(prev => ({
                                ...prev,
                                total: newTotal
                              }));
                            }}
                            className="w-24 p-1 border border-gray-300 rounded-md"
                            min="0"
                          />
                        </td>
                        <td></td>
                      </tr>
                      <tr className="font-bold">
                        <td colSpan="9" className="px-4 py-2 text-right">
                          Grand Total:
                        </td>
                        <td className="px-4 py-2">₹{quotationData.total.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-medium mb-4">Terms & Conditions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries({
                  validity: "Validity",
                  paymentTerms: "Payment Terms",
                  delivery: "Delivery",
                  freight: "Freight",
                  insurance: "Insurance",
                  taxes: "Taxes",
                  // note: "Notes"
                }).map(([field, label]) => (
                  <div key={field} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium">{label}</label>
                      <button
                        type="button"
                        onClick={() => toggleFieldVisibility(field)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {hiddenFields[field] ? "Show" : "Hide"}
                      </button>
                    </div>
                    {!hiddenFields[field] && (
                      <input
                        type="text"
                        value={quotationData[field]}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    )}
                  </div>
                ))}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-medium mb-4">Notes</h3>
                  <div className="space-y-4">
                    {quotationData.notes.map((note, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => handleNoteChange(index, e.target.value)}
                          className="flex-1 p-2 border border-gray-300 rounded-md"
                          placeholder="Enter note"
                        />
                        {quotationData.notes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeNote(index)}
                            className="text-red-500 hover:text-red-700 p-2"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addNote}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" /> Add Note
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-medium mb-6 text-center">Bank Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Logo container with border and styling */}
                <div className="flex items-center justify-center p-6 rounded-lg border border-gray-200">
                  <img src={imageform} alt="ManiQuip Logo" className="max-h-100 w-auto object-contain" />
                </div>

                {/* Separator line for visual clarity on mobile */}
                <div className="md:hidden w-full border-t border-gray-200 my-4"></div>

                {/* Bank details section with better styling */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Account No.</label>
                      <input
                        type="text"
                        value={quotationData.accountNo}
                        onChange={(e) => handleInputChange("accountNo", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                      <input
                        type="text"
                        value={quotationData.bankName}
                        onChange={(e) => handleInputChange("bankName", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Bank Address</label>
                      <input
                        type="text"
                        value={quotationData.bankAddress}
                        onChange={(e) => handleInputChange("bankAddress", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                      <input
                        type="text"
                        value={quotationData.ifscCode}
                        onChange={(e) => handleInputChange("ifscCode", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="text"
                        value={quotationData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Website</label>
                      <input
                        type="text"
                        value={quotationData.website}
                        onChange={(e) => handleInputChange("website", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">PAN</label>
                      <input
                        type="text"
                        value={quotationData.pan}
                        onChange={(e) => handleInputChange("pan", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>


            <div className="flex justify-between">
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
                onClick={handleSaveQuotation}
                disabled={isSubmitting || isGenerating}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <SaveIcon className="h-4 w-4 mr-2" />
                    Save Quotation
                  </>
                )}
              </button>
              <div className="space-x-2">
                <button
                  className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-md flex items-center inline-flex"
                  onClick={handleGenerateLink}
                  disabled={isGenerating || isSubmitting}
                >
                  <ShareIcon className="h-4 w-4 mr-2" />
                  Generate Link
                </button>
                <button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center inline-flex"
                  onClick={handleGeneratePDF}
                  disabled={isGenerating || isSubmitting}
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  {isGenerating ? "Generating..." : "Generate PDF"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* The main quotation preview that will be captured for PDF */}
            <div id="quotation-preview" className="bg-white border p-6 rounded-lg">
              <div className="flex justify-between items-start border-b pb-4">
                <div className="w-1/3">
                  {/* <p className="font-bold">{quotationData.consignorName || "Consignor Name"}</p> */}
                  <p className="font-bold">{selectedReferences[0] || "Consignor Name"}</p>
                  <p className="text-sm">{quotationData.consignorAddress || "Consignor Address"}</p>
                  {/* <p className="text-sm">Mobile: {quotationData.consignorMobile || "N/A"}</p> */}
                  <p className="text-sm">Mobile: {quotationData.consignorMobile.split(",")[0] || "N/A"}</p>
                  <p className="text-sm">Phone: {quotationData.consignorPhone || "N/A"}</p>
                  <p className="text-sm">GSTIN: {quotationData.consignorGSTIN || "N/A"}</p>
                  <p className="text-sm">State Code: {quotationData.consignorStateCode || "N/A"}</p>
                </div>
                <div className="w-1/3 text-center">
                  <h1 className="text-xl font-bold">QUOTATION</h1>
                </div>
                <div className="w-1/3 text-right">
                  <p className="font-bold">Quo No: {quotationData.quotationNo}</p>
                  <p>Date: {quotationData.date}</p>
                  <p>Prepared By: {quotationData.preparedBy || "N/A"}</p>
                </div>
              </div>

              {/* Consignor and Consignee Details */}
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <h3 className="font-bold mb-2">Consignor Details</h3>
                  {/* <p>{quotationData.consignorName || "N/A"}</p> */}
                  <p>{selectedReferences[0] || "N/A"}</p> {/* Show only first reference */}
                  <p>{quotationData.consignorAddress || "N/A"}</p>
                  <p>GSTIN: {quotationData.consignorGSTIN || "N/A"}</p>
                  <p>State Code: {quotationData.consignorStateCode || "N/A"}</p>
                  <p>MSME Number: {quotationData.msmeNumber || "N/A"}</p>
                </div>
                <div>
                  <h3 className="font-bold mb-2">Consignee Details</h3>
                  <p>Company Name: {quotationData.consigneeName || "N/A"}</p>
                  <p>Contact Name: {quotationData.consigneeContactName || "N/A"}</p>
                  <p>Contact No.: {quotationData.consigneeContactNo || "N/A"}</p>
                  <p>State: {quotationData.consigneeState || "N/A"}</p>
                  <p>GSTIN: {quotationData.consigneeGSTIN || "N/A"}</p>
                  <p>State Code: {quotationData.consigneeStateCode || "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <h3 className="font-bold mb-2">Bill To</h3>
                  <p>{quotationData.consigneeAddress || "N/A"}</p>
                </div>
                <div>
                  <h3 className="font-bold mb-2">Ship To</h3>
                  <p>{quotationData.shipTo || "N/A"}</p>
                </div>
              </div>

              {/* Items Table with Comprehensive Details */}
              <div className="overflow-x-auto mt-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border">
                      <th className="border p-2 text-left">S No.</th>
                      <th className="border p-2 text-left">Code</th>
                      <th className="border p-2 text-left">Product Name</th>
                      <th className="border p-2 text-left">Description</th>
                      <th className="border p-2 text-left">GST %</th>
                      <th className="border p-2 text-left">Qty</th>
                      <th className="border p-2 text-left">Units</th>
                      <th className="border p-2 text-left">Rate</th>
                      <th className="border p-2 text-left">Disc %</th>
                      <th className="border p-2 text-left">Flat Disc</th>
                      <th className="border p-2 text-left">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotationData.items.map((item, index) => (
                      <tr key={item.id} className="border">
                        <td className="border p-2">{index + 1}</td>
                        <td className="border p-2">{item.code || "N/A"}</td>
                        <td className="border p-2">{item.name || "N/A"}</td>
                        <td className="border p-2">{item.description || "N/A"}</td>
                        <td className="border p-2">{item.gst}%</td>
                        <td className="border p-2">{item.qty}</td>
                        <td className="border p-2">{item.units}</td>
                        <td className="border p-2">₹{Number(item.rate).toFixed(2)}</td>
                        <td className="border p-2">{item.discount}%</td>
                        <td className="border p-2">₹{Number(item.flatDiscount).toFixed(2)}</td>
                        <td className="border p-2">₹{Number(item.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border">
                      <td colSpan="9" className="border p-2 text-right font-bold">Subtotal</td>
                      <td className="border p-2 font-bold">₹{Number(quotationData.subtotal).toFixed(2)}</td>
                    </tr>
                    <tr className="border">
                      <td colSpan="9" className="border p-2 text-right">Total Flat Discount</td>
                      <td className="border p-2">-₹{Number(quotationData.totalFlatDiscount).toFixed(2)}</td>
                    </tr>
                    <tr className="border">
                      <td colSpan="9" className="border p-2 text-right">Taxable Amount</td>
                      <td className="border p-2">₹{Number(quotationData.subtotal - quotationData.totalFlatDiscount).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Tax Details */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <h3 className="font-bold mb-2">Tax Breakdown</h3>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border">
                        <th className="border p-2 text-left">Tax Type</th>
                        <th className="border p-2 text-left">Rate</th>
                        <th className="border p-2 text-left">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border">
                        <td className="border p-2">CGST</td>
                        <td className="border p-2">{quotationData.cgstRate}%</td>
                        <td className="border p-2">₹{Number(quotationData.cgstAmount).toFixed(2)}</td>
                      </tr>
                      <tr className="border">
                        <td className="border p-2">SGST</td>
                        <td className="border p-2">{quotationData.sgstRate}%</td>
                        <td className="border p-2">₹{Number(quotationData.sgstAmount).toFixed(2)}</td>
                      </tr>
                      <tr className="border font-bold">
                        <td className="border p-2">Total Tax</td>
                        <td className="border p-2">{quotationData.cgstRate + quotationData.sgstRate}%</td>
                        <td className="border p-2">₹{Number(quotationData.cgstAmount + quotationData.sgstAmount).toFixed(2)}</td>
                      </tr>
                      <tr className="border">
                        <td colSpan="9" className="border p-2 text-right">Special Discount</td>
                        <td className="border p-2">-₹{Number(specialDiscount).toFixed(2)}</td>
                      </tr>
                      <tr className="border font-bold">
                        <td colSpan="9" className="border p-2 text-right">Grand Total</td>
                        <td className="border p-2">₹{Number(quotationData.total).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col justify-between">
                  <div>
                    <p className="font-bold">Amount Chargeable (in words)</p>
                    <p className="capitalize">
                      Rupees {Number(quotationData.total) > 0
                        ? new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                          minimumFractionDigits: 2
                        }).format(quotationData.total).replace('₹', '').trim() + ' Only'
                        : 'Zero Only'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl">Grand Total: ₹{Number(quotationData.total).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              {/* Terms and Conditions */}
              <div className="mt-4 border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Image container */}
                  <div className="flex items-center justify-center p-6 rounded-lg border border-gray-200">
                    <img src={imageform} alt="ManiQuip Logo" className="max-h-100 w-auto object-contain" />
                  </div>

                  {/* Terms and conditions content */}
                  <div>
                    <h3 className="font-bold mb-2">Terms & Conditions</h3>
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="py-1 font-medium">Validity</td>
                          <td className="py-1">{quotationData.validity}</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-medium">Payment Terms</td>
                          <td className="py-1">{quotationData.paymentTerms}</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-medium">Delivery</td>
                          <td className="py-1">{quotationData.delivery}</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-medium">Freight</td>
                          <td className="py-1">{quotationData.freight}</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-medium">Insurance</td>
                          <td className="py-1">{quotationData.insurance}</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-medium">Taxes</td>
                          <td className="py-1">{quotationData.taxes}</td>
                        </tr>
                      </tbody>
                    </table>

                    {quotationData.notes && quotationData.notes.filter(note => note.trim()).length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-bold mb-2">Notes</h4>
                        <ul className="list-disc pl-5">
                          {quotationData.notes.filter(note => note.trim()).map((note, index) => (
                            <li key={index} className="py-1">{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bank Details and Footer */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-4">
                <div>
                  <h3 className="font-bold mb-2">Bank Details</h3>
                  <p>Account No.: {quotationData.accountNo || "N/A"}</p>
                  <p>Bank Name: {quotationData.bankName || "N/A"}</p>
                  <p>Bank Address: {quotationData.bankAddress || "N/A"}</p>
                  <p>IFSC CODE: {quotationData.ifscCode || "N/A"}</p>
                  <p>Email: {quotationData.email || "N/A"}</p>
                  <p>Website: {quotationData.website || "N/A"}</p>
                  <p>Company PAN: {quotationData.pan || "N/A"}</p>
                </div>
                <div className="text-right">
                  <h3 className="font-bold mb-2">Declaration:</h3>
                  <p>
                    We declare that this Quotation shows the actual price of the goods described and that all
                    particulars are true and correct.
                  </p>
                  <p className="mt-4">Prepared By: {quotationData.preparedBy || "N/A"}</p>
                  <p className="mt-4 text-sm italic">
                    This Quotation is computer-generated and does not require a seal or signature.
                  </p>
                </div>
              </div>
            </div>

            {/* Rest of the existing preview section remains the same */}
            {quotationLink && (
              <div className="p-4 border rounded-md bg-gray-50">
                <p className="font-medium mb-2">Quotation Link:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={quotationLink}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                  <button
                    className="border border-gray-300 hover:bg-gray-100 p-2 rounded-md"
                    onClick={() => {
                      navigator.clipboard.writeText(quotationLink)
                      alert("Quotation link copied to clipboard")
                    }}
                  >
                    <CopyIcon className="h-4 w-4" />
                  </button>
                  <button className="border border-gray-300 hover:bg-gray-100 p-2 rounded-md">
                    <ShareIcon className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Share this link with the client. They can view and request updates to the quotation.
                </p>
              </div>
            )}

            {pdfUrl && (
              <div className="p-4 border rounded-md bg-gray-50">
                <p className="font-medium mb-2">PDF Document:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pdfUrl}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                  <button
                    className="border border-gray-300 hover:bg-gray-100 p-2 rounded-md"
                    onClick={() => {
                      navigator.clipboard.writeText(pdfUrl)
                      alert("PDF URL copied to clipboard")
                    }}
                  >
                    <CopyIcon className="h-4 w-4" />
                  </button>
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-gray-300 hover:bg-gray-100 p-2 rounded-md"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </a>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-md flex items-center">
                <EyeIcon className="h-4 w-4 mr-2" />
                View as Client
              </button>
              <div className="space-x-2">
                <button
                  className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-md flex items-center inline-flex"
                  onClick={handleGenerateLink}
                  disabled={isGenerating || isSubmitting}
                >
                  <ShareIcon className="h-4 w-4 mr-2" />
                  Generate Link
                </button>
                <button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center inline-flex"
                  onClick={handleGeneratePDF}
                  disabled={isGenerating || isSubmitting}
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  {isGenerating ? "Generating..." : "Download PDF"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)
}

export default Quotation