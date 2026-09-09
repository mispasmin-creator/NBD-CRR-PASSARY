"use client"

import { useState, useEffect, useContext, useCallback } from "react"
import { AuthContext } from "../App"
import axios from "axios"
import { BuildingIcon, SearchIcon, PlusIcon, XIcon } from "../components/Icons"
import { Download, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import { exportToCsv } from "../utils/exportCsv"
import PageHeader from "../components/ui/PageHeader"
import { sortRows, nextSortDirection } from "../utils/sortRows"

// Small clickable header cell used to make a table column sortable —
// keeps the page's own className string (color/sticky) untouched.
function SortableTh({ column, label, sortConfig, onSort, className }) {
  const isActive = sortConfig.key === column
  return (
    <th onClick={() => onSort(column)} className={`${className} cursor-pointer select-none`}>
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && sortConfig.direction === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : isActive && sortConfig.direction === "desc" ? (
          <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  )
}

// Order here must exactly match the Master sheet's header row (row 1) —
// a new entry is submitted as a plain array in this same order.
const FIELDS = [
  { key: "firmName", label: "Firm Name" },
  { key: "partyNames", label: "Party Names" },
  { key: "productName", label: "Product Name" },
  { key: "salesPerson", label: "Name Of The Sales Person" },
  { key: "department", label: "Department" },
  { key: "productNo", label: "Product No." },
  { key: "enquiryStatus", label: "Enquiry Status" },
  { key: "typeOfEnquiry", label: "Type Of Enquiry" },
  { key: "currentStage", label: "Current Stage" },
  { key: "department2", label: "Department (Product)" },
  { key: "leadReceivedFrom", label: "Lead Received From" },
  { key: "nextAction", label: "Next Action To Be Taken" },
  { key: "uom", label: "UOM" },
]

const emptyForm = FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: "" }), {})

function MasterSheet() {
  const { showNotification } = useContext(AuthContext)
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [salesPersonFilter, setSalesPersonFilter] = useState("")
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState("")
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null })
  const handleSort = (key) => {
    setSortConfig((prev) => {
      const direction = nextSortDirection(prev, key)
      return { key: direction ? key : null, direction }
    })
  }
  const [showNewModal, setShowNewModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchMasterData = useCallback(async () => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
    const sheetName = import.meta.env.VITE_MASTER_SHEET_NAME || "Master"

    if (!scriptUrl) {
      showNotification("Google Apps Script URL missing in .env", "error")
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const response = await axios.get(`${scriptUrl}?sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`)
      if (!response.data || !response.data.success) throw new Error("Failed to fetch sheet data")

      const allRows = response.data.data || []
      const dataRows = allRows.slice(1) // row 0 is the header row

      const mapped = dataRows
        .map((row, index) => {
          const rowObj = { _rowIndex: index + 2 } // 1-indexed sheet row (header is row 1)
          FIELDS.forEach((f, i) => {
            rowObj[f.key] = row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : ""
          })
          return rowObj
        })
        .filter((r) => FIELDS.some((f) => r[f.key]))

      setRows(mapped)
    } catch (error) {
      console.error("Error fetching Master sheet data:", error)
      showNotification("Could not fetch Master sheet data", "error")
    } finally {
      setIsLoading(false)
    }
  }, [showNotification])

  useEffect(() => {
    fetchMasterData()
  }, [fetchMasterData])

  const filteredRows = rows.filter((row) => {
    if (salesPersonFilter && row.salesPerson.trim() !== salesPersonFilter) return false
    if (enquiryStatusFilter && row.enquiryStatus.trim() !== enquiryStatusFilter) return false
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return FIELDS.some((f) => row[f.key]?.toLowerCase().includes(term))
  })

  const salesPersonFilterOptions = Array.from(new Set(rows.map((r) => r.salesPerson.trim()).filter(Boolean))).sort()
  const enquiryStatusFilterOptions = Array.from(new Set(rows.map((r) => r.enquiryStatus.trim()).filter(Boolean))).sort()

  const paginatedRows = (sortConfig.key)
    ? sortRows(filteredRows, sortConfig.direction, (r) => r[sortConfig.key])
    : filteredRows

  const handleExport = () => {
    exportToCsv(
      "master-sheet",
      FIELDS.map((f) => ({ label: f.label, value: (r) => r[f.key] || "" })),
      filteredRows
    )
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
    const sheetName = import.meta.env.VITE_MASTER_SHEET_NAME || "Master"

    setIsSubmitting(true)
    try {
      const rowData = FIELDS.map((f) => form[f.key] || "")
      const payload = new URLSearchParams()
      payload.append("action", "insert")
      payload.append("sheetName", sheetName)
      payload.append("rowData", JSON.stringify(rowData))
      const response = await axios.post(scriptUrl, payload)

      if (!response.data || !response.data.success) throw new Error("Insert failed")

      showNotification("Master entry added successfully!", "success")
      setShowNewModal(false)
      setForm(emptyForm)
      fetchMasterData()
    } catch (error) {
      console.error("Error adding Master entry:", error)
      showNotification("Failed to add Master entry. Please try again.", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="h-full flex flex-col py-2 space-y-4">
        <PageHeader
          icon={<BuildingIcon className="h-4.5 w-4.5" />}
          iconColorClass="bg-primary"
          title="Master Sheet"
          subtitle={`${filteredRows.length} total ${filteredRows.length === 1 ? "entry" : "entries"}`}
        />
        {/* Controls Bar */}
        <div className="shrink-0 bg-card rounded-xl shadow-sm border border-slate-200/70 p-3 mb-3">
          <div className="flex flex-col md:flex-row gap-2 justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Master sheet..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="!pl-10 !pr-3 py-1.5 min-w-[220px] border rounded-md border-gray-300 text-sm focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <select
                value={salesPersonFilter}
                onChange={(e) => setSalesPersonFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm text-gray-700 bg-white cursor-pointer max-w-[150px]"
              >
                <option value="">All sales persons</option>
                {salesPersonFilterOptions.map((sp) => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
              </select>
              <select
                value={enquiryStatusFilter}
                onChange={(e) => setEnquiryStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm text-gray-700 bg-white cursor-pointer max-w-[150px]"
              >
                <option value="">All statuses</option>
                {enquiryStatusFilterOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {(salesPersonFilter || enquiryStatusFilter) && (
                <button
                  type="button"
                  onClick={() => { setSalesPersonFilter(""); setEnquiryStatusFilter("") }}
                  className="px-2 py-1.5 text-sm font-medium text-sky-600 hover:text-sky-800 underline whitespace-nowrap"
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleExport}
                disabled={filteredRows.length === 0}
                className="flex items-center justify-center gap-2 bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted font-medium py-1.5 px-3 text-sm rounded-md whitespace-nowrap shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-medium py-1.5 px-3 text-sm rounded-md whitespace-nowrap shadow-sm cursor-pointer"
              >
                <PlusIcon className="h-4 w-4" />
                New Entry
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl shadow-md border border-slate-200/70 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead className="bg-muted border-b sticky top-0 z-10">
                <tr>
                  {FIELDS.map((f, i) => (
                    <SortableTh
                      key={f.key}
                      column={f.key}
                      label={f.label}
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className={`px-5 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap ${
                        i === 0 ? "sticky left-0 z-20 bg-muted shadow-xs" : ""
                      }`}
                    />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={FIELDS.length} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={FIELDS.length} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No Master entries found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr key={row._rowIndex} className="group hover:bg-slate-50 transition-colors">
                      {FIELDS.map((f, i) => (
                        <td
                          key={f.key}
                          className={`px-5 py-3.5 text-sm whitespace-nowrap ${
                            i === 0
                              ? "sticky left-0 z-10 bg-white group-hover:bg-slate-50 shadow-xs font-mono font-bold text-primary"
                              : "text-slate-700"
                          }`}
                        >
                          {row[f.key] || "-"}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!isLoading && (
            <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 font-medium">
              {filteredRows.length} {filteredRows.length === 1 ? "entry" : "entries"}
            </div>
          )}
        </div>
      </div>

      {/* New Entry Modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !isSubmitting && setShowNewModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <BuildingIcon className="w-5 h-5 text-sky-500" />
                New Master Entry
              </h2>
              <button
                type="button"
                onClick={() => !isSubmitting && setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="block text-[13px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      {f.label}
                    </label>
                    <input
                      type="text"
                      placeholder={`Enter ${f.label}`}
                      value={form[f.key]}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-sky-600 rounded-xl shadow-md hover:bg-sky-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : "Save Entry"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MasterSheet
