"use client"

import { useState, useEffect, useContext } from "react"
import { Link } from "react-router-dom"
import { SearchIcon, ArrowRightIcon } from "../components/Icons"
import { AuthContext } from "../App" // Import AuthContext
import { mockApi } from "../services/mockApi"

const slideIn = "animate-in slide-in-from-right duration-300"
const slideOut = "animate-out slide-out-to-right duration-300"
const fadeIn = "animate-in fade-in duration-300"
const fadeOut = "animate-out fade-out duration-300"

function FollowUp() {
  const { currentUser, userType, isAdmin } = useContext(AuthContext) // Get user info and admin function
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("pending")
  const [pendingFollowUps, setPendingFollowUps] = useState([])
  const [historyFollowUps, setHistoryFollowUps] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterType, setFilterType] = useState("all")
  const [dateFilter, setDateFilter] = useState("all") // New state for date filter
  const [showPopup, setShowPopup] = useState(false)
  const [selectedFollowUp, setSelectedFollowUp] = useState(null)
  const [companyFilter, setCompanyFilter] = useState("all")
  const [personFilter, setPersonFilter] = useState("all")
  const [phoneFilter, setPhoneFilter] = useState("all")
  const [visibleColumns, setVisibleColumns] = useState({
    timestamp: true,
    leadNo: true,
    companyName: true,
    customerSay: true,
    status: true,
    enquiryStatus: true,
    receivedDate: true,
    state: true,
    projectName: true,
    salesType: true,
    productDate: true,
    projectValue: true,
    item1: true,
    qty1: true,
    item2: true,
    qty2: true,
    item3: true,
    qty3: true,
    item4: true,
    qty4: true,
    item5: true,
    qty5: true,
    nextAction: true,
    callDate: true,
    callTime: true,
    itemQty: true, // Add this line
  })
  const [showColumnDropdown, setShowColumnDropdown] = useState(false)

  // Helper function to determine priority based on lead source
  const determinePriority = (source) => {
    if (!source) return "Low"

    const sourceLower = source.toLowerCase()
    if (sourceLower.includes("indiamart")) return "High"
    if (sourceLower.includes("website")) return "Medium"
    return "Low"
  }

  // Helper function to format next call time
  const formatNextCallTime = (timeValue) => {
    if (!timeValue) return ""

    try {
      // Check if it's a Date(YYYY,MM,DD,HH,MM,SS) format
      if (typeof timeValue === "string" && timeValue.startsWith("Date(")) {
        // Extract hours and minutes from the Date string
        const timeString = timeValue.substring(5, timeValue.length - 1)
        const [year, month, day, hours, minutes, seconds] = timeString
          .split(",")
          .map((part) => Number.parseInt(part.trim()))

        // Convert to 12-hour format
        const formattedHours = hours % 12 || 12 // Convert to 12-hour format
        const period = hours >= 12 ? "PM" : "AM"

        // Pad minutes with leading zero if needed
        const formattedMinutes = minutes.toString().padStart(2, "0")

        return `${formattedHours}:${formattedMinutes} ${period}`
      }

      // If it's already in HH:MM:SS format
      if (typeof timeValue === "string" && /^\d{2}:\d{2}:\d{2}$/.test(timeValue)) {
        const [hours, minutes] = timeValue.split(":").map(Number)

        // Convert to 12-hour format
        const formattedHours = hours % 12 || 12
        const period = hours >= 12 ? "PM" : "AM"

        // Pad minutes with leading zero if needed
        const formattedMinutes = minutes.toString().padStart(2, "0")

        return `${formattedHours}:${formattedMinutes} ${period}`
      }

      // Fallback to original value if parsing fails
      return timeValue
    } catch (error) {
      console.error("Error formatting time:", error)
      return timeValue
    }
  }

  // Helper function to calculate next call date (3 days after created date)
  const calculateNextCallDate = (createdDate) => {
    if (!createdDate) return ""

    try {
      // Parse the date - assuming format is DD/MM/YYYY
      const parts = createdDate.split("/")
      if (parts.length !== 3) return ""

      const date = new Date(parts[2], parts[1] - 1, parts[0])
      date.setDate(date.getDate() + 3) // Add 3 days for next call

      // Format as YYYY-MM-DD for display
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    } catch (error) {
      console.error("Error calculating next call date:", error)
      return ""
    }
  }

  // Helper function to format date to DD/MM/YYYY
  const formatDateToDDMMYYYY = (dateValue) => {
    if (!dateValue) return ""

    try {
      // Check if it's a Date object-like string (e.g. "Date(2025,3,22)")
      if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
        // Extract the parts from Date(YYYY,MM,DD) format
        const dateString = dateValue.substring(5, dateValue.length - 1)
        const [year, month, day] = dateString.split(",").map((part) => Number.parseInt(part.trim()))

        // JavaScript months are 0-indexed, but we need to display them as 1-indexed
        // Also ensure day and month are padded with leading zeros if needed
        return `${day.toString().padStart(2, "0")}/${(month + 1).toString().padStart(2, "0")}/${year}`
      }

      // Handle other date formats if needed
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
      }

      // If it's already in the correct format, return as is
      return dateValue
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateValue // Return the original value if formatting fails
    }
  }

  // Helper function to parse date from column CL and compare with today
  const getDateFromColumnCL = (dateValue) => {
    if (!dateValue) return null

    try {
      // Check if it's a Date object-like string (e.g. "Date(2025,4,27)")
      if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
        const dateString = dateValue.substring(5, dateValue.length - 1)
        const [year, month, day] = dateString.split(",").map((part) => Number.parseInt(part.trim()))
        // JavaScript months are 0-indexed
        return new Date(year, month, day)
      }

      // Try to parse as regular date
      const parsedDate = new Date(dateValue)
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate
      }

      return null
    } catch (error) {
      console.error("Error parsing date from column CL:", error)
      return null
    }
  }

  // Add this helper function after the other helper functions (around line 100)
  const formatItemQty = (itemQtyString) => {
    if (!itemQtyString) return ""

    try {
      const items = JSON.parse(itemQtyString)
      return items
        .filter(item => item.name && item.quantity && item.quantity !== "0")
        .map(item => `${item.name} : ${item.quantity}`)
        .join(", ")
    } catch (error) {
      console.error("Error parsing item quantity:", error)
      return itemQtyString // Return original string if parsing fails
    }
  }

  // Helper function to check date filter condition
  // Helper function to check date filter condition
  const checkDateFilter = (followUp, filterType) => {
    if (filterType === "all") return true

    if (activeTab === "pending") {
      // Get the text value from column CL (nextCallDate field)
      const columnCLValue = followUp.nextCallDate
      if (!columnCLValue) return false

      // Convert the column CL value to lowercase for comparison
      const columnCLText = String(columnCLValue).toLowerCase()

      // Match the filter type with the text in column CL
      switch (filterType) {
        case "today":
          return columnCLText.includes("today")
        case "overdue":
          return columnCLText.includes("overdue")
        case "upcoming":
          return columnCLText.includes("upcoming")
        default:
          return true
      }
    } else {
      // History tab filtering
      const nextCallDate = followUp.nextCallDate
      if (!nextCallDate) return false

      try {
        // Parse the date from DD/MM/YYYY format
        const [day, month, year] = nextCallDate.split("/")
        const followUpDate = new Date(year, month - 1, day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        switch (filterType) {
          case "today":
            return (
              followUpDate.getDate() === today.getDate() &&
              followUpDate.getMonth() === today.getMonth() &&
              followUpDate.getFullYear() === today.getFullYear()
            )
          case "older":
            return followUpDate < today
          default:
            return true
        }
      } catch (error) {
        console.error("Error parsing date:", error)
        return false
      }
    }
  }

  // Function to fetch data from FMS and Leads Tracker sheets
  useEffect(() => {
    const fetchFollowUpData = async () => {
      try {
        setIsLoading(true)

        const data = await mockApi.fetchFollowUps(currentUser, isAdmin)

        setPendingFollowUps(data.pending)
        setHistoryFollowUps(data.history)

      } catch (error) {
        console.error("Error fetching follow-up data:", error)
        // Fallback or empty state
        setPendingFollowUps([])
        setHistoryFollowUps([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchFollowUpData()
  }, [currentUser, isAdmin]) // Add isAdmin to dependencies

  // Add this function or modify the existing formatDateToDDMMYYYY function
  const formatPopupDate = (dateValue) => {
    if (!dateValue) return ""

    try {
      // Check if it's a Date object-like string (e.g. "Date(2025,4,3)")
      if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
        // Extract the parts from Date(YYYY,MM,DD) format
        const dateString = dateValue.substring(5, dateValue.length - 1)
        const [year, month, day] = dateString.split(",").map((part) => Number.parseInt(part.trim()))

        // JavaScript months are 0-indexed, but we need to display them as 1-indexed
        // Also ensure day and month are padded with leading zeros if needed
        return `${day.toString().padStart(2, "0")}/${(month + 1).toString().padStart(2, "0")}/${year}`
      }

      // If it's already in the correct format, return as is
      return dateValue
    } catch (error) {
      console.error("Error formatting popup date:", error)
      return dateValue // Return the original value if formatting fails
    }
  }

  // Filter function for search in both sections
  const filteredPendingFollowUps = pendingFollowUps.filter((followUp) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      searchTerm === "" ||
      (followUp.companyName && followUp.companyName.toLowerCase().includes(searchLower)) ||
      (followUp.leadId && followUp.leadId.toLowerCase().includes(searchLower)) ||
      (followUp.personName && followUp.personName.toLowerCase().includes(searchLower)) ||
      (followUp.phoneNumber && followUp.phoneNumber.toString().toLowerCase().includes(searchLower)) ||
      (followUp.leadSource && followUp.leadSource.toLowerCase().includes(searchLower)) ||
      (followUp.location && followUp.location.toLowerCase().includes(searchLower)) ||
      (followUp.customerSay && followUp.customerSay.toLowerCase().includes(searchLower)) ||
      (followUp.enquiryStatus && followUp.enquiryStatus.toLowerCase().includes(searchLower)) ||
      (followUp.assignedTo && followUp.assignedTo.toLowerCase().includes(searchLower))

    // Apply filter type for Column R
    const matchesFilterType = (() => {
      if (filterType === "first") {
        return followUp.enquiryStatus === "" || followUp.enquiryStatus === null
      } else if (filterType === "multi") {
        return followUp.enquiryStatus === "expected"
      } else {
        return true
      }
    })()

    // Apply date filter based on column CL
    const matchesDateFilter = checkDateFilter(followUp, dateFilter)

    // Apply company filter
    const matchesCompanyFilter = companyFilter === "all" || followUp.companyName === companyFilter

    // Apply person filter
    const matchesPersonFilter = personFilter === "all" || followUp.personName === personFilter

    // Apply phone filter
    const phoneToCompare = followUp.phoneNumber ? followUp.phoneNumber.toString().trim() : ""
    const matchesPhoneFilter = phoneFilter === "all" || phoneToCompare === phoneFilter.toString().trim()

    return (
      matchesSearch &&
      matchesFilterType &&
      matchesDateFilter &&
      matchesCompanyFilter &&
      matchesPersonFilter &&
      matchesPhoneFilter
    )
  })

  useEffect(() => {
    // Reset specific filters when switching tabs
    if (activeTab !== "pending") {
      setCompanyFilter("all")
      setPersonFilter("all")
      setPhoneFilter("all")
    }
  }, [activeTab])

  const filteredHistoryFollowUps = historyFollowUps.filter((followUp) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      searchTerm === "" ||
      (followUp.leadNo && followUp.leadNo.toString().toLowerCase().includes(searchLower)) ||
      (followUp.customerSay && followUp.customerSay.toLowerCase().includes(searchLower)) ||
      (followUp.status && followUp.status.toLowerCase().includes(searchLower)) ||
      (followUp.enquiryReceivedStatus && followUp.enquiryReceivedStatus.toLowerCase().includes(searchLower)) ||
      (followUp.enquiryReceivedDate && followUp.enquiryReceivedDate.toLowerCase().includes(searchLower)) ||
      (followUp.enquiryState && followUp.enquiryState.toLowerCase().includes(searchLower)) ||
      (followUp.projectName && followUp.projectName.toLowerCase().includes(searchLower)) ||
      (followUp.salesType && followUp.salesType.toLowerCase().includes(searchLower)) ||
      (followUp.requiredProductDate && followUp.requiredProductDate.toLowerCase().includes(searchLower)) ||
      (followUp.projectApproxValue && followUp.projectApproxValue.toString().toLowerCase().includes(searchLower)) ||
      (followUp.itemName1 && followUp.itemName1.toLowerCase().includes(searchLower)) ||
      (followUp.itemName2 && followUp.itemName2.toLowerCase().includes(searchLower)) ||
      (followUp.itemName3 && followUp.itemName3.toLowerCase().includes(searchLower)) ||
      (followUp.itemName4 && followUp.itemName4.toLowerCase().includes(searchLower)) ||
      (followUp.itemName5 && followUp.itemName5.toLowerCase().includes(searchLower)) ||
      (followUp.nextAction && followUp.nextAction.toLowerCase().includes(searchLower)) ||
      (followUp.nextCallDate && followUp.nextCallDate.toLowerCase().includes(searchLower)) ||
      (followUp.nextCallTime && followUp.nextCallTime.toLowerCase().includes(searchLower))

    // Apply filter type for history - check column E (enquiryReceivedStatus)
    const matchesFilterType = (() => {
      if (filterType === "first") {
        return (
          followUp.enquiryReceivedStatus === "" ||
          followUp.enquiryReceivedStatus === null ||
          followUp.enquiryReceivedStatus === "New"
        )
      } else if (filterType === "multi") {
        return followUp.enquiryReceivedStatus === "Expected" || followUp.enquiryReceivedStatus === "expected"
      } else {
        return true
      }
    })()

    // Apply date filter based on column Z
    const matchesDateFilter = (() => {
      if (dateFilter === "all") return true

      // Get the text value from column Z (historyDateFilter field)
      const columnZValue = followUp.historyDateFilter
      if (!columnZValue) return false

      // Convert the column Z value to lowercase for comparison
      const columnZText = String(columnZValue).toLowerCase()

      // Match the filter type with the text in column Z
      switch (dateFilter) {
        case "today":
          return columnZText.includes("today")
        case "overdue":
          return columnZText.includes("overdue")
        case "upcoming":
          return columnZText.includes("upcoming")
        default:
          return true
      }
    })()

    return matchesSearch && matchesFilterType && matchesDateFilter
  })

  // Add this function inside your FollowUp component
  const calculateDateFilterCounts = () => {
    const counts = {
      today: 0,
      overdue: 0,
      upcoming: 0,
      older: 0,
    }

    // Calculate counts for pending follow-ups
    pendingFollowUps.forEach((followUp) => {
      const columnCLValue = followUp.nextCallDate
      if (!columnCLValue) return

      const columnCLText = String(columnCLValue).toLowerCase()

      if (columnCLText.includes("today")) counts.today++
      if (columnCLText.includes("overdue")) counts.overdue++
      if (columnCLText.includes("upcoming")) counts.upcoming++
    })

    // Calculate counts for history follow-ups
    historyFollowUps.forEach((followUp) => {
      const nextCallDate = followUp.nextCallDate
      if (!nextCallDate) return

      try {
        const [day, month, year] = nextCallDate.split("/")
        const followUpDate = new Date(year, month - 1, day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (
          followUpDate.getDate() === today.getDate() &&
          followUpDate.getMonth() === today.getMonth() &&
          followUpDate.getFullYear() === today.getFullYear()
        ) {
          counts.today++
        } else if (followUpDate < today) {
          counts.older++
        }
      } catch (error) {
        console.error("Error parsing date:", error)
      }
    })

    return counts
  }

  const handleColumnToggle = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }))
  }

  const handleSelectAll = () => {
    const allSelected = Object.values(visibleColumns).every(Boolean)
    const newState = Object.fromEntries(Object.keys(visibleColumns).map((key) => [key, !allSelected]))
    setVisibleColumns(newState)
  }

  const columnOptions = [
    { key: "timestamp", label: "Timestamp" },
    { key: "leadNo", label: "Lead No." },
    { key: "companyName", label: "Company Name" },
    { key: "customerSay", label: "Customer Say" },
    { key: "status", label: "Status" },
    { key: "enquiryStatus", label: "Enquiry Status" },
    { key: "receivedDate", label: "Received Date" },
    { key: "state", label: "State" },
    { key: "projectName", label: "Project Name" },
    { key: "salesType", label: "Sales Type" },
    { key: "productDate", label: "Product Date" },
    { key: "projectValue", label: "Project Value" },
    { key: "item1", label: "Item 1" },
    { key: "qty1", label: "Qty 1" },
    { key: "item2", label: "Item 2" },
    { key: "qty2", label: "Qty 2" },
    { key: "item3", label: "Item 3" },
    { key: "qty3", label: "Qty 3" },
    { key: "item4", label: "Item 4" },
    { key: "qty4", label: "Qty 4" },
    { key: "item5", label: "Item 5" },
    { key: "qty5", label: "Qty 5" },
    { key: "nextAction", label: "Next Action" },
    { key: "callDate", label: "Call Date" },
    { key: "callTime", label: "Call Time" },
    { key: "itemQty", label: "Item/Qty" }, // Add this line
  ]

  // Get the counts
  const dateFilterCounts = calculateDateFilterCounts()

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColumnDropdown && !event.target.closest(".relative")) {
        setShowColumnDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showColumnDropdown])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-2">
        {/* Header Section - Fully Responsive */}
        <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:justify-between lg:items-start mb-6 lg:mb-8">
          {/* Title Section Removed - Moved to MainNav */}

          {/* Filters Section - Responsive Grid */}
          <div className="flex flex-col space-y-3 lg:space-y-0 lg:flex-row lg:space-x-3 lg:items-center">
            {/* Mobile: Stack filters vertically, Desktop: Horizontal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row gap-2 lg:gap-3">
              {/* Company Name Filter - Only show for pending tab */}
              {activeTab === "pending" && (
                <div className="min-w-0">
                  <input
                    list="company-options"
                    value={companyFilter === "all" ? "" : companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value || "all")}
                    placeholder="Select or type company"
                    className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                  <datalist id="company-options">
                    <option value="all">All Companies</option>
                    {Array.from(new Set(pendingFollowUps.map((item) => item.companyName)))
                      .filter(Boolean)
                      .map((company) => (
                        <option key={company} value={company} />
                      ))}
                  </datalist>
                </div>
              )}

              {/* Person Name Filter - Only show for pending tab */}
              {activeTab === "pending" && (
                <div className="min-w-0">
                  <input
                    list="person-options"
                    value={personFilter === "all" ? "" : personFilter}
                    onChange={(e) => setPersonFilter(e.target.value || "all")}
                    placeholder="Select or type person"
                    className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                  <datalist id="person-options">
                    <option value="all">All Persons</option>
                    {Array.from(new Set(pendingFollowUps.map((item) => item.personName)))
                      .filter(Boolean)
                      .map((person) => (
                        <option key={person} value={person} />
                      ))}
                  </datalist>
                </div>
              )}

              {/* Phone Number Filter - Only show for pending tab */}
              {activeTab === "pending" && (
                <div className="min-w-0">
                  <input
                    list="phone-options"
                    value={phoneFilter === "all" ? "" : phoneFilter}
                    onChange={(e) => setPhoneFilter(e.target.value || "all")}
                    placeholder="Select or type number"
                    className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                  <datalist id="phone-options">
                    <option value="all">All Numbers</option>
                    {Array.from(
                      new Set(
                        pendingFollowUps
                          .map((item) => (item.phoneNumber ? item.phoneNumber.toString().trim() : ""))
                          .filter(Boolean),
                      ),
                    ).map((phone) => (
                      <option key={phone} value={phone} />
                    ))}
                  </datalist>
                </div>
              )}

              {/* Date Filter */}
              <div className="min-w-0">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  <option value="all">All</option>
                  {activeTab === "pending" ? (
                    <>
                      <option value="today">Today ({dateFilterCounts.today})</option>
                      <option value="overdue">Overdue ({dateFilterCounts.overdue})</option>
                      <option value="upcoming">Upcoming ({dateFilterCounts.upcoming})</option>
                    </>
                  ) : (
                    <>
                      <option value="today">Today's Calls</option>
                      <option value="older">Older Calls</option>
                    </>
                  )}
                </select>
              </div>

              {/* Column Selection Dropdown - Only show for history tab */}
              {activeTab === "history" && (
                <div className="min-w-0 relative">
                  <button
                    onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                    className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white flex items-center justify-between"
                  >
                    <span>Select Columns</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${showColumnDropdown ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showColumnDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                      <div className="p-2">
                        {/* Select All Option */}
                        <div className="flex items-center p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            id="select-all"
                            checked={Object.values(visibleColumns).every(Boolean)}
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                          />
                          <label htmlFor="select-all" className="ml-2 text-sm font-medium text-gray-900 cursor-pointer">
                            All Columns
                          </label>
                        </div>

                        <hr className="my-2" />

                        {/* Individual Column Options */}
                        {columnOptions.map((option) => (
                          <div key={option.key} className="flex items-center p-2 hover:bg-gray-50 rounded">
                            <input
                              type="checkbox"
                              id={`column-${option.key}`}
                              checked={visibleColumns[option.key]}
                              onChange={() => handleColumnToggle(option.key)}
                              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                            />
                            <label
                              htmlFor={`column-${option.key}`}
                              className="ml-2 text-sm text-gray-700 cursor-pointer flex-1"
                            >
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Filter Dropdown */}
              <div className="min-w-0">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  <option value="all">All</option>
                  <option value="first">First Followup</option>
                  <option value="multi">Expected</option>
                </select>
              </div>
            </div>

            {/* Search Input - Full width on mobile */}
            <div className="relative w-full lg:w-auto lg:min-w-[250px]">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="search"
                placeholder="Search Call Tracker..."
                className="pl-8 w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Card Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">All Call Tracker</h2>
          </div>

          {/* Card Content */}
          <div className="p-4 sm:p-6">
            {/* Tab Navigation - Responsive */}
            <div className="mb-4 sm:mb-6">
              <div className="inline-flex w-full sm:w-auto rounded-md shadow-sm">
                <button
                  onClick={() => setActiveTab("pending")}
                  className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-l-md transition-colors ${activeTab === "pending"
                    ? "bg-sky-100 text-sky-800 border-sky-200"
                    : "bg-white text-slate-700 hover:bg-slate-50 border-gray-300"
                    } border`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-r-md transition-colors ${activeTab === "history"
                    ? "bg-sky-100 text-sky-800 border-sky-200"
                    : "bg-white text-slate-700 hover:bg-slate-50 border-gray-300"
                    } border border-l-0`}
                >
                  History
                </button>
              </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                <p className="text-slate-500 mt-4">Loading follow-up data...</p>
              </div>
            ) : (
              <>
                {/* Pending Tab Content */}
                {activeTab === "pending" && (
                  <div className="-mx-4 sm:mx-0">
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4 px-4 pb-4">
                      {filteredPendingFollowUps.map((followUp, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {followUp.leadId}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${determinePriority(followUp.leadSource) === "High" ? "bg-red-100 text-red-800" :
                                  determinePriority(followUp.leadSource) === "Medium" ? "bg-yellow-100 text-yellow-800" :
                                    "bg-green-100 text-green-800"
                                  }`}>
                                  {determinePriority(followUp.leadSource)} Priority
                                </span>
                              </div>
                              <h3 className="font-bold text-gray-900 text-lg">{followUp.companyName}</h3>
                              <p className="text-sm text-gray-600">{followUp.personName}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">Phone</p>
                              <p className="font-medium">{followUp.phoneNumber}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Next Call</p>
                              <p className="font-medium text-orange-600">{followUp.nextCallDate || "Not Set"}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500">Customer Say</p>
                              <p className="text-gray-700 bg-gray-50 p-2 rounded text-xs line-clamp-2">{followUp.customerSay || "No feedback recorded"}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500">Enquiry Status</p>
                              <p className="font-medium">{followUp.enquiryStatus || "-"}</p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-100 flex justify-end">
                            <button
                              onClick={() => {
                                setSelectedFollowUp(followUp)
                                setShowPopup(true)
                              }}
                              className="flex items-center justify-center px-4 py-2 border border-sky-600 rounded-md text-sm font-medium text-sky-600 bg-white hover:bg-sky-50 w-full"
                            >
                              View Details & Update
                            </button>
                          </div>
                        </div>
                      ))}
                      {filteredPendingFollowUps.length === 0 && (
                        <div className="text-center py-8 text-gray-500">No pending follow-ups found</div>
                      )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <div className="inline-block min-w-full align-middle">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-slate-50">
                              <tr>
                                <th
                                  scope="col"
                                  className="sticky left-0 z-10 bg-slate-50 px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                                >
                                  Actions
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                >
                                  Call Date
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                >
                                  Lead No.
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                >
                                  Company Name
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                >
                                  Person Name
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                >
                                  Phone No.
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                >
                                  Lead Source
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                >
                                  Location
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                >
                                  Customer Say
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                >
                                  Enquiry Status
                                </th>
                                {isAdmin() && (
                                  <th
                                    scope="col"
                                    className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                  >
                                    Assigned To
                                  </th>
                                )}
                                <th
                                  scope="col"
                                  className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                >
                                  Item/Qty
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredPendingFollowUps.length > 0 ? (
                                filteredPendingFollowUps.map((followUp, index) => (
                                  <tr key={`${followUp.leadId}-${index}`} className="hover:bg-slate-50 transition-colors">
                                    <td className="sticky left-0 z-10 bg-white px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium border-r border-gray-200">
                                      <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                                        <Link to={`/follow-up/new?leadId=${followUp.leadId}&leadNo=${followUp.leadId}`}>
                                          <button className="w-full sm:w-auto px-2 sm:px-3 py-1 text-xs border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md transition-colors whitespace-nowrap">
                                            Call Now <ArrowRightIcon className="ml-1 h-3 w-3 inline" />
                                          </button>
                                        </Link>
                                      </div>
                                    </td>
                                    <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
                                      {followUp.timestamp}
                                    </td>
                                    <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                                      {followUp.leadId}
                                    </td>
                                    <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                      <div
                                        className="max-w-[120px] sm:max-w-[150px] truncate"
                                        title={followUp.companyName}
                                      >
                                        {followUp.companyName}
                                      </div>
                                    </td>
                                    <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                      <div
                                        className="max-w-[100px] sm:max-w-[120px] truncate"
                                        title={followUp.personName}
                                      >
                                        {followUp.personName}
                                      </div>
                                    </td>
                                    <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
                                      {followUp.phoneNumber}
                                    </td>
                                    <td className="px-3 sm:px-4 py-3 sm:py-4">
                                      <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${followUp.priority === "High"
                                          ? "bg-red-100 text-red-800"
                                          : followUp.priority === "Medium"
                                            ? "bg-blue-100 text-blue-800"
                                            : "bg-slate-100 text-slate-800"
                                          }`}
                                      >
                                        {followUp.leadSource}
                                      </span>
                                    </td>
                                    <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                      <div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.location}>
                                        {followUp.location}
                                      </div>
                                    </td>
                                    <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                      <div
                                        className="max-w-[150px] sm:max-w-[200px] truncate"
                                        title={followUp.customerSay}
                                      >
                                        {followUp.customerSay}
                                      </div>
                                    </td>
                                    <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                      <div
                                        className="max-w-[100px] sm:max-w-[120px] truncate"
                                        title={followUp.enquiryStatus}
                                      >
                                        {followUp.enquiryStatus}
                                      </div>
                                    </td>
                                    {isAdmin() && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
                                        {followUp.assignedTo}
                                      </td>
                                    )}
                                    <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                      <div
                                        className="min-w-[300px] break-words whitespace-normal"
                                        title={formatItemQty(followUp.itemQty)}
                                      >
                                        {formatItemQty(followUp.itemQty)}
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td
                                    colSpan={isAdmin() ? 12 : 11} // Increased by 1 for the new column
                                    className="px-4 py-8 text-center text-sm text-slate-500"
                                  >
                                    <div className="flex flex-col items-center space-y-2">
                                      <svg
                                        className="h-12 w-12 text-gray-300"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={1}
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                      </svg>
                                      <p>No pending follow-ups found</p>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* History Tab Content */}
                {activeTab === "history" && (
                  <div className="-mx-4 sm:mx-0">
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4 px-4 pb-4">
                      {filteredHistoryFollowUps.map((followUp, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs font-semibold text-gray-500">{followUp.timestamp}</span>
                              <h3 className="font-bold text-gray-900">{followUp.companyName}</h3>
                              <p className="text-xs text-blue-600 font-medium">{followUp.leadNo}</p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${followUp.status === "Completed" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                              {followUp.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <div>
                              <span className="block text-xs text-gray-400">Project</span>
                              <p className="truncate">{followUp.projectName}</p>
                            </div>
                            <div>
                              <span className="block text-xs text-gray-400">Enquiry Status</span>
                              <p>{followUp.enquiryReceivedStatus}</p>
                            </div>
                            <div>
                              <span className="block text-xs text-gray-400">Sales Type</span>
                              <p>{followUp.salesType}</p>
                            </div>
                            <div>
                              <span className="block text-xs text-gray-400">Value</span>
                              <p>{followUp.projectApproxValue}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {filteredHistoryFollowUps.length === 0 && (
                        <div className="text-center py-8 text-gray-500">No history found</div>
                      )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <div className="inline-block min-w-full align-middle">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-slate-50 sticky top-0">
                              <tr>
                                {visibleColumns.timestamp && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Timestamp
                                  </th>
                                )}
                                {visibleColumns.leadNo && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Lead No.
                                  </th>
                                )}
                                {visibleColumns.companyName && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Company Name
                                  </th>
                                )}
                                {visibleColumns.customerSay && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Customer Say
                                  </th>
                                )}
                                {visibleColumns.status && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Status
                                  </th>
                                )}
                                {visibleColumns.enquiryStatus && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Enquiry Status
                                  </th>
                                )}
                                {visibleColumns.receivedDate && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Received Date
                                  </th>
                                )}
                                {visibleColumns.state && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    State
                                  </th>
                                )}
                                {visibleColumns.projectName && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Project Name
                                  </th>
                                )}
                                {visibleColumns.salesType && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Sales Type
                                  </th>
                                )}
                                {visibleColumns.productDate && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Product Date
                                  </th>
                                )}
                                {visibleColumns.projectValue && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Project Value
                                  </th>
                                )}
                                {visibleColumns.item1 && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Item 1
                                  </th>
                                )}
                                {visibleColumns.qty1 && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Qty 1
                                  </th>
                                )}
                                {visibleColumns.item2 && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Item 2
                                  </th>
                                )}
                                {visibleColumns.qty2 && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Qty 2
                                  </th>
                                )}
                                {visibleColumns.item3 && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Item 3
                                  </th>
                                )}
                                {visibleColumns.qty3 && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Qty 3
                                  </th>
                                )}
                                {visibleColumns.item4 && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Item 4
                                  </th>
                                )}
                                {visibleColumns.qty4 && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Qty 4
                                  </th>
                                )}
                                {visibleColumns.item5 && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Item 5
                                  </th>
                                )}
                                {visibleColumns.qty5 && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Qty 5
                                  </th>
                                )}
                                {visibleColumns.nextAction && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Next Action
                                  </th>
                                )}
                                {visibleColumns.callDate && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Call Date
                                  </th>
                                )}
                                {visibleColumns.callTime && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Call Time
                                  </th>
                                )}
                                {visibleColumns.itemQty && (
                                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Item/Qty
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredHistoryFollowUps.length > 0 ? (
                                filteredHistoryFollowUps.map((followUp, index) => (
                                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                                    {visibleColumns.timestamp && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
                                        {followUp.timestamp}
                                      </td>
                                    )}
                                    {visibleColumns.leadNo && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                                        {followUp.leadNo}
                                      </td>
                                    )}
                                    {visibleColumns.companyName && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                        <div
                                          className="max-w-[120px] sm:max-w-[150px] truncate"
                                          title={followUp.companyName}
                                        >
                                          {followUp.companyName}
                                        </div>
                                      </td>
                                    )}
                                    {visibleColumns.customerSay && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                        <div
                                          className="max-w-[150px] sm:max-w-[200px] truncate"
                                          title={followUp.customerSay}
                                        >
                                          {followUp.customerSay}
                                        </div>
                                      </td>
                                    )}
                                    {visibleColumns.status && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4">
                                        <span
                                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${followUp.status === "Completed"
                                            ? "bg-green-100 text-green-800"
                                            : followUp.status === "Pending"
                                              ? "bg-sky-100 text-sky-800"
                                              : "bg-red-100 text-red-800"
                                            }`}
                                        >
                                          {followUp.status}
                                        </span>
                                      </td>
                                    )}
                                    {visibleColumns.enquiryStatus && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                        <div
                                          className="max-w-[100px] sm:max-w-[120px] truncate"
                                          title={followUp.enquiryReceivedStatus}
                                        >
                                          {followUp.enquiryReceivedStatus}
                                        </div>
                                      </td>
                                    )}
                                    {visibleColumns.receivedDate && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
                                        {followUp.enquiryReceivedDate}
                                      </td>
                                    )}
                                    {visibleColumns.state && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                        <div
                                          className="max-w-[80px] sm:max-w-[100px] truncate"
                                          title={followUp.enquiryState}
                                        >
                                          {followUp.enquiryState}
                                        </div>
                                      </td>
                                    )}
                                    {visibleColumns.projectName && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                        <div
                                          className="max-w-[100px] sm:max-w-[120px] truncate"
                                          title={followUp.projectName}
                                        >
                                          {followUp.projectName}
                                        </div>
                                      </td>
                                    )}
                                    {visibleColumns.salesType && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
                                        {followUp.salesType}
                                      </td>
                                    )}
                                    {visibleColumns.productDate && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
                                        {followUp.requiredProductDate}
                                      </td>
                                    )}
                                    {visibleColumns.projectValue && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
                                        {followUp.projectApproxValue}
                                      </td>
                                    )}
                                    {visibleColumns.item1 && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                        <div
                                          className="max-w-[100px] sm:max-w-[120px] truncate"
                                          title={followUp.itemName1}
                                        >
                                          {followUp.itemName1}
                                        </div>
                                      </td>
                                    )}
                                    {visibleColumns.qty1 && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
                                        {followUp.quantity1}
                                      </td>
                                    )}
                                    {visibleColumns.item2 && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                        <div
                                          className="max-w-[100px] sm:max-w-[120px] truncate"
                                          title={followUp.itemName2}
                                        >
                                          {followUp.itemName2}
                                        </div>
                                      </td>
                                    )}
                                    {visibleColumns.qty2 && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
                                        {followUp.quantity2}
                                      </td>
                                    )}
                                    {visibleColumns.item3 && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                        <div
                                          className="max-w-[100px] sm:max-w-[120px] truncate"
                                          title={followUp.itemName3}
                                        >
                                          {followUp.itemName3}
                                        </div>
                                      </td>
                                    )}
                                    {visibleColumns.qty3 && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
                                        {followUp.quantity3}
                                      </td>
                                    )}
                                    {visibleColumns.item4 && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                        <div
                                          className="max-w-[100px] sm:max-w-[120px] truncate"
                                          title={followUp.itemName4}
                                        >
                                          {followUp.itemName4}
                                        </div>
                                      </td>
                                    )}
                                    {visibleColumns.qty4 && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
                                        {followUp.quantity4}
                                      </td>
                                    )}
                                    {visibleColumns.item5 && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                        <div
                                          className="max-w-[100px] sm:max-w-[120px] truncate"
                                          title={followUp.itemName5}
                                        >
                                          {followUp.itemName5}
                                        </div>
                                      </td>
                                    )}
                                    {visibleColumns.qty5 && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
                                        {followUp.quantity5}
                                      </td>
                                    )}
                                    {visibleColumns.nextAction && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                        <div
                                          className="max-w-[100px] sm:max-w-[120px] truncate"
                                          title={followUp.nextAction}
                                        >
                                          {followUp.nextAction}
                                        </div>
                                      </td>
                                    )}
                                    {visibleColumns.callDate && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
                                        {followUp.nextCallDate}
                                      </td>
                                    )}
                                    {visibleColumns.callTime && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
                                        {followUp.nextCallTime}
                                      </td>
                                    )}
                                    {visibleColumns.itemQty && (
                                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
                                        <div
                                          className="min-w-[300px] break-words whitespace-normal"
                                          title={formatItemQty(followUp.itemQty)}
                                        >
                                          {formatItemQty(followUp.itemQty)}
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td
                                    colSpan={Object.values(visibleColumns).filter(Boolean).length}
                                    className="px-4 py-8 text-center text-sm text-slate-500"
                                  >
                                    <div className="flex flex-col items-center space-y-2">
                                      <svg
                                        className="h-12 w-12 text-gray-300"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={1}
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                      </svg>
                                      <p>No history found</p>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Responsive Popup Modal */}
        {showPopup && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${fadeIn}`}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPopup(false)}></div>
            <div
              className={`relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden ${slideIn}`}
            >
              {/* Modal Header - Sticky */}
              <div className="sticky top-0 bg-white border-b p-4 sm:p-6 flex justify-between items-center z-10">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate pr-4">
                  Follow-up Details: {selectedFollowUp?.leadId}
                </h3>
                <button
                  onClick={() => setShowPopup(false)}
                  className="flex-shrink-0 text-gray-500 hover:text-gray-700 focus:outline-none p-1"
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

              {/* Modal Content - Scrollable */}
              <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="p-4 sm:p-6 space-y-6">
                  {/* Responsive Grid Layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Lead Number */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">Lead Number</p>
                      <p className="text-base font-semibold break-words">{selectedFollowUp?.leadId}</p>
                    </div>

                    {/* Person Name */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">Person Name</p>
                      <p className="text-base break-words">{selectedFollowUp?.personName}</p>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">Phone Number</p>
                      <p className="text-base break-words">{selectedFollowUp?.phoneNumber}</p>
                    </div>

                    {/* Lead Source */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">Lead Source</p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedFollowUp?.priority === "High"
                          ? "bg-red-100 text-red-800"
                          : selectedFollowUp?.priority === "Medium"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-800"
                          }`}
                      >
                        {selectedFollowUp?.leadSource}
                      </span>
                    </div>

                    {/* Company Name */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">Company Name</p>
                      <p className="text-base break-words">{selectedFollowUp?.companyName}</p>
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">Location</p>
                      <p className="text-base break-words">{selectedFollowUp?.location}</p>
                    </div>

                    {/* Created Date */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">Created Date</p>
                      <p className="text-base">{formatPopupDate(selectedFollowUp?.createdAt)}</p>
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">Priority</p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedFollowUp?.priority === "High"
                          ? "bg-red-100 text-red-800"
                          : selectedFollowUp?.priority === "Medium"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-800"
                          }`}
                      >
                        {selectedFollowUp?.priority}
                      </span>
                    </div>
                  </div>

                  {/* Customer Say - Full width */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">What Customer Said</p>
                    <div className="p-4 bg-gray-50 rounded-md">
                      <p className="text-base break-words">{selectedFollowUp?.customerSay}</p>
                    </div>
                  </div>

                  {/* Enquiry Status - Full width */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">Enquiry Status</p>
                    <p className="text-base break-words">{selectedFollowUp?.enquiryStatus}</p>
                  </div>
                </div>
              </div>

              {/* Modal Footer - Sticky */}
              <div className="sticky bottom-0 border-t bg-white p-4 sm:p-6 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowPopup(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
                >
                  Close
                </button>
                <Link
                  to={`/follow-up/new?leadId=${selectedFollowUp?.leadId}&leadNo=${selectedFollowUp?.leadId}`}
                  className="w-full sm:w-auto"
                >
                  <button className="w-full px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors">
                    Call Now <ArrowRightIcon className="ml-1 h-4 w-4 inline" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FollowUp
