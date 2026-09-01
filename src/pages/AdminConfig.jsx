"use client"

import { useContext, useEffect, useState } from "react"
import axios from "axios"
import { AuthContext } from "../App"
import { Plus, Users, ShieldCheck, Building2, Pencil, X, KeyRound, LayoutGrid, Download } from "lucide-react"
import { exportToCsv } from "../utils/exportCsv"

const USER_SHEET_NAME = "USER"
const PAGE_ACCESS_OPTIONS = {
    "All": [],
    "Dashboard": [],
    "NBD Lead": ["All Leads", "Update Status", "Call Tracking"],
    "CRR Enquiry": ["All Crm", "Give Rates", "Send Offer", "Get Order", "Order Not Recived"],
    "NBD Enquiry": ["All Enquiry", "Call Tracker", "Order Received", "Order Not Received"],
    "Offer": ["All Enquiries", "Rates & Offer Letter", "Accounts Check", "Sales Check", "Tech Discussion", "Send Offer"],
    "Customer Complaint": ["All Complaints", "Problem Assigned", "Site Report", "Problem Not Solve Next Action", "History"],
    "Marketing Visit Tracker": ["Assign Marketing", "Report", "Call Tracker", "History"],
    "Order Not Received": ["All", "Get Sample", "Testing", "Take Action"],
    "Admin Config": []
}
const EMPTY_FORM = {
    username: "",
    password: "",
    pages: [],
    pageTabs: {},
    firms: [],
    name: "",
    role: ""
}

const normalizeHeader = (value) => String(value || "").trim().toLowerCase()

function AdminConfig() {
    const { showNotification } = useContext(AuthContext)
    const [users, setUsers] = useState([])
    const [headers, setHeaders] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [formData, setFormData] = useState(EMPTY_FORM)
    const [firmOptions, setFirmOptions] = useState([])

    const normalizePageName = (name) => {
        if (!name) return ""
        if (name.toLowerCase() === "nbd outgoing") return "NBD Lead"
        return name
    }

    const parsePageAccess = (value) => {
        if (!value) return { pages: [], pageTabs: {} }
        try {
            const parsed = JSON.parse(value)
            if (Array.isArray(parsed.pages)) {
                const pageTabs = {}
                parsed.pages.forEach(item => {
                    if (typeof item === "string") {
                        pageTabs[normalizePageName(item)] = []
                    } else if (item?.page) {
                        pageTabs[normalizePageName(item.page)] = Array.isArray(item.tabs) ? item.tabs : []
                    }
                })
                return {
                    pages: parsed.pages.map(item => normalizePageName(typeof item === "string" ? item : item.page)).filter(Boolean),
                    pageTabs
                }
            }
            const normalizedPage = normalizePageName(parsed.page)
            return {
                pages: normalizedPage ? [normalizedPage] : [],
                pageTabs: normalizedPage ? { [normalizedPage]: Array.isArray(parsed.tabs) ? parsed.tabs : [] } : {}
            }
        } catch {
            const legacyValue = normalizePageName(String(value).trim())
            const matchingPage = Object.keys(PAGE_ACCESS_OPTIONS).find(page => page.toLowerCase() === legacyValue.toLowerCase())
            const page = matchingPage || legacyValue
            return { pages: page ? [page] : [], pageTabs: page ? { [page]: [] } : {} }
        }
    }

    const parseFirmNames = (value) => String(value || "")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean)

    const getHeaderIndex = (headerList, key) => {
        const normalized = headerList.map(normalizeHeader)
        if (key === "username") {
            const usernameIndex = normalized.indexOf("username")
            return usernameIndex !== -1 ? usernameIndex : normalized.indexOf("usernae")
        }
        return normalized.indexOf(key)
    }

    const fetchUsers = async () => {
        const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
        if (!scriptUrl) {
            showNotification("Google Sheets configuration missing", "error")
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            const response = await axios.get(`${scriptUrl}?sheet=${USER_SHEET_NAME}&t=${Date.now()}`)
            if (!response.data?.success) throw new Error("Failed to fetch users")

            const rows = response.data.data || []
            const sheetHeaders = rows[0] || []
            setHeaders(sheetHeaders)

            const mappedUsers = rows.slice(1)
                .map((row, index) => ({
                    rowIndex: index + 2,
                    rawRow: row,
                    username: row[getHeaderIndex(sheetHeaders, "username")] || "",
                    password: row[getHeaderIndex(sheetHeaders, "password")] || "",
                    page_access: row[getHeaderIndex(sheetHeaders, "page_access")] || "",
                    firm_name: row[getHeaderIndex(sheetHeaders, "firm_name")] || "",
                    name: row[getHeaderIndex(sheetHeaders, "name")] || "",
                    role: row[getHeaderIndex(sheetHeaders, "role")] || "",
                    last_login: row[getHeaderIndex(sheetHeaders, "last_login")] || ""
                }))
                .filter(user => user.username)

            setUsers(mappedUsers)
        } catch (error) {
            console.error("Error fetching users:", error)
            showNotification("Failed to load users", "error")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
        const fetchFirms = async () => {
            try {
                const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
                const masterSheet = import.meta.env.VITE_MASTER_SHEET_NAME || "Master"
                const response = await axios.get(`${scriptUrl}?sheet=${masterSheet}&t=${Date.now()}`)
                const rows = response.data?.data || []
                setFirmOptions([...new Set(rows.map(row => String(row[0] || "").trim()).filter(Boolean))])
            } catch (error) {
                console.error("Error fetching firm names:", error)
            }
        }
        fetchFirms()
    }, [])

    const openAddForm = () => {
        setEditingUser(null)
        setFormData(EMPTY_FORM)
        setShowForm(true)
    }

    const openEditForm = (user) => {
        const access = parsePageAccess(user.page_access)
        setEditingUser(user)
        setFormData({
            username: String(user.username || ""),
            password: String(user.password || ""),
            pages: access.pages,
            pageTabs: access.pageTabs,
            firms: parseFirmNames(user.firm_name),
            name: String(user.name || ""),
            role: String(user.role || "")
        })
        setShowForm(true)
    }

    const closeForm = () => {
        setShowForm(false)
        setEditingUser(null)
        setFormData(EMPTY_FORM)
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL

        if (!formData.username.trim() || !formData.password) {
            showNotification("Username and password are required", "error")
            return
        }

        if (!headers.length) {
            showNotification("USER sheet headers could not be loaded", "error")
            return
        }

        try {
            setIsSaving(true)
            const rowData = editingUser
                ? [...editingUser.rawRow]
                : new Array(headers.length).fill("")

            while (rowData.length < headers.length) rowData.push("")

            const valuesToSave = {
                username: formData.username,
                password: formData.password,
                page_access: formData.pages.length
                    ? JSON.stringify({
                        pages: formData.pages.map(page => ({
                            page,
                            tabs: formData.pageTabs[page] || []
                        }))
                    })
                    : "",
                firm_name: formData.firms.join(", "),
                name: formData.name,
                role: formData.role
            }

            Object.entries(valuesToSave).forEach(([key, value]) => {
                const columnIndex = getHeaderIndex(headers, key)
                if (columnIndex !== -1) rowData[columnIndex] = value
            })

            const payload = new FormData()
            payload.append("action", editingUser ? "update" : "insert")
            payload.append("sheetName", USER_SHEET_NAME)
            if (editingUser) payload.append("rowIndex", String(editingUser.rowIndex))
            payload.append("rowData", JSON.stringify(rowData))

            const response = await axios.post(scriptUrl, payload)
            if (!response.data?.success) {
                throw new Error(response.data?.error || "User save failed")
            }

            showNotification(editingUser ? "User updated successfully" : "User added successfully", "success")
            closeForm()
            await fetchUsers()
        } catch (error) {
            console.error("Error saving user:", error)
            showNotification("Failed to save user", "error")
        } finally {
            setIsSaving(false)
        }
    }

    const adminCount = users.filter(user => String(user.role).toLowerCase() === "admin").length
    const initialOf = (value) => String(value || "U").trim().charAt(0).toUpperCase()

    const handleExportUsers = () => {
        exportToCsv("users", [
            { label: "Username", value: (u) => u.username || "" },
            { label: "Name", value: (u) => u.name || "" },
            { label: "Role", value: (u) => u.role || "" },
            { label: "Firm Name", value: (u) => u.firm_name || "" },
            { label: "Page Access", value: (u) => parsePageAccess(u.page_access).pages.join("; ") || "" },
            { label: "Last Login", value: (u) => u.last_login || "" },
        ], users)
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="py-2 space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Manage who can sign in and what each person can access</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportUsers}
                            disabled={users.length === 0}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted cursor-pointer disabled:opacity-50"
                        >
                            <Download className="h-4 w-4" />
                            Export
                        </button>
                        <button
                            onClick={openAddForm}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/20 transition-all hover:shadow-lg hover:from-sky-500 hover:to-indigo-500 cursor-pointer"
                        >
                            <Plus className="h-4 w-4" />
                            Add User
                        </button>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-card p-5 shadow-sm">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                            <Users className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-bold leading-none text-foreground">{users.length}</p>
                            <p className="mt-1 truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Users</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-card p-5 shadow-sm">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-bold leading-none text-foreground">{adminCount}</p>
                            <p className="mt-1 truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">Admins</p>
                        </div>
                    </div>
                    <div className="col-span-2 flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-card p-5 shadow-sm sm:col-span-1">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-bold leading-none text-foreground">{firmOptions.length}</p>
                            <p className="mt-1 truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">Firms Available</p>
                        </div>
                    </div>
                </div>

                {/* Users table */}
                <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-card shadow-md">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 z-10 bg-muted">
                                <tr className="border-b border-slate-200">
                                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">User</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Page Access</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Firm Name</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Login</th>
                                    <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-sky-600" />
                                                <p className="text-sm font-medium text-muted-foreground">Loading users...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                                                    <Users className="h-6 w-6 text-gray-300" />
                                                </div>
                                                <p className="text-base font-semibold text-gray-500">No users found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : users.map(user => {
                                    const pages = parsePageAccess(user.page_access).pages
                                    const isAdminRole = String(user.role).toLowerCase() === "admin"
                                    return (
                                        <tr key={user.rowIndex} className="transition-colors hover:bg-muted/60">
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${isAdminRole ? "bg-gradient-to-br from-purple-500 to-indigo-600" : "bg-gradient-to-br from-sky-500 to-blue-600"}`}>
                                                        {initialOf(user.name || user.username)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-foreground">{user.name || user.username}</p>
                                                        <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {pages.length === 0 ? (
                                                    <span className="text-sm text-muted-foreground">-</span>
                                                ) : (
                                                    <div className="flex max-w-[260px] flex-wrap gap-1.5">
                                                        {pages.slice(0, 3).map(page => (
                                                            <span key={page} className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 border border-sky-100">
                                                                {page}
                                                            </span>
                                                        ))}
                                                        {pages.length > 3 && (
                                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600" title={pages.slice(3).join(", ")}>
                                                                +{pages.length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 max-w-[160px] truncate text-sm text-muted-foreground" title={user.firm_name}>{user.firm_name || "-"}</td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${isAdminRole ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                                                    {user.role || "-"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-muted-foreground">{user.last_login || "-"}</td>
                                            <td className="px-5 py-3.5 text-center">
                                                <button
                                                    onClick={() => openEditForm(user)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 cursor-pointer"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
                        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-5 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                                    <Users className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-bold tracking-tight">{editingUser ? "Edit User" : "Add User"}</h3>
                            </div>
                            <button onClick={closeForm} className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white cursor-pointer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
                            <div className="flex-1 space-y-6 overflow-y-auto p-6">
                                {/* Basic details */}
                                <div className="rounded-2xl border border-slate-200/70 p-4">
                                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        <KeyRound className="h-3.5 w-3.5" /> Basic Details
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        {[
                                            ["username", "Username", "text", true],
                                            ["password", "Password", "password", true],
                                            ["name", "Name", "text", false]
                                        ].map(([key, label, type, required]) => (
                                            <div key={key}>
                                                <label className="mb-1 block text-sm font-medium text-muted-foreground">
                                                    {label}{required && <span className="text-red-500"> *</span>}
                                                </label>
                                                <input
                                                    type={type}
                                                    value={formData[key]}
                                                    onChange={(event) => setFormData(previous => ({ ...previous, [key]: event.target.value }))}
                                                    required={required}
                                                    autoComplete={key === "password" ? "new-password" : "off"}
                                                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                                                />
                                            </div>
                                        ))}

                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-muted-foreground">Role</label>
                                            <select
                                                value={formData.role}
                                                onChange={(event) => setFormData(previous => ({ ...previous, role: event.target.value }))}
                                                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 cursor-pointer"
                                            >
                                                <option value="">Select Role</option>
                                                <option value="admin">Admin</option>
                                                <option value="user">User</option>
                                                <option value="viewer">Viewer</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Page Access */}
                                <div className="rounded-2xl border border-slate-200/70 p-4">
                                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        <LayoutGrid className="h-3.5 w-3.5" /> Page Access
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.keys(PAGE_ACCESS_OPTIONS).map(page => {
                                            const isChecked = formData.pages.includes(page)
                                            return (
                                                <label
                                                    key={page}
                                                    className={`cursor-pointer select-none rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all ${
                                                        isChecked
                                                            ? "border-sky-600 bg-sky-50 text-sky-700 shadow-sm"
                                                            : "border-border bg-card text-muted-foreground hover:bg-muted/60"
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => setFormData(previous => {
                                                            const allPages = Object.keys(PAGE_ACCESS_OPTIONS)
                                                            const selectablePages = allPages.filter(item => item !== "All")

                                                            if (page === "All") {
                                                                const selectAll = !previous.pages.includes("All")
                                                                return {
                                                                    ...previous,
                                                                    pages: selectAll ? allPages : [],
                                                                    pageTabs: selectAll
                                                                        ? Object.fromEntries(selectablePages.map(item => [item, previous.pageTabs[item] || []]))
                                                                        : {}
                                                                }
                                                            }

                                                            const isSelected = previous.pages.includes(page)
                                                            const nextPageTabs = { ...previous.pageTabs }
                                                            if (isSelected) delete nextPageTabs[page]
                                                            else nextPageTabs[page] = []
                                                            const nextPages = isSelected
                                                                ? previous.pages.filter(item => item !== page && item !== "All")
                                                                : [...previous.pages.filter(item => item !== "All"), page]
                                                            const hasAllPages = selectablePages.every(item => nextPages.includes(item))

                                                            return {
                                                                ...previous,
                                                                pages: hasAllPages ? ["All", ...selectablePages] : nextPages,
                                                                pageTabs: nextPageTabs
                                                            }
                                                        })}
                                                        className="sr-only"
                                                    />
                                                    {page}
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>

                                {formData.pages.some(page => PAGE_ACCESS_OPTIONS[page]?.length > 0) && (
                                    <div className="rounded-2xl border border-slate-200/70 p-4">
                                        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            <LayoutGrid className="h-3.5 w-3.5" /> Tab Access
                                        </div>
                                        <div className="space-y-4">
                                            {formData.pages
                                                .filter(page => PAGE_ACCESS_OPTIONS[page]?.length > 0)
                                                .map(page => {
                                                    const selectedTabs = formData.pageTabs[page] || []
                                                    const isAllChecked = selectedTabs.length === PAGE_ACCESS_OPTIONS[page].length
                                                    return (
                                                        <div key={page}>
                                                            <p className="mb-2 text-sm font-semibold text-foreground">{page}</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                <label
                                                                    className={`cursor-pointer select-none rounded-full border px-3 py-1 text-xs font-bold transition-all ${
                                                                        isAllChecked
                                                                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                                                            : "border-border bg-card text-muted-foreground hover:bg-muted/60"
                                                                    }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isAllChecked}
                                                                        onChange={() => setFormData(previous => {
                                                                            const currentTabs = previous.pageTabs[page] || []
                                                                            const selectAll = currentTabs.length !== PAGE_ACCESS_OPTIONS[page].length
                                                                            return {
                                                                                ...previous,
                                                                                pageTabs: {
                                                                                    ...previous.pageTabs,
                                                                                    [page]: selectAll ? [...PAGE_ACCESS_OPTIONS[page]] : []
                                                                                }
                                                                            }
                                                                        })}
                                                                        className="sr-only"
                                                                    />
                                                                    All
                                                                </label>
                                                                {PAGE_ACCESS_OPTIONS[page].map(tab => {
                                                                    const isTabChecked = selectedTabs.includes(tab)
                                                                    return (
                                                                        <label
                                                                            key={`${page}-${tab}`}
                                                                            className={`cursor-pointer select-none rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                                                                                isTabChecked
                                                                                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                                                                    : "border-border bg-card text-muted-foreground hover:bg-muted/60"
                                                                            }`}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isTabChecked}
                                                                                onChange={() => setFormData(previous => {
                                                                                    const tabs = previous.pageTabs[page] || []
                                                                                    return {
                                                                                        ...previous,
                                                                                        pageTabs: {
                                                                                            ...previous.pageTabs,
                                                                                            [page]: tabs.includes(tab)
                                                                                                ? tabs.filter(item => item !== tab)
                                                                                                : [...tabs, tab]
                                                                                        }
                                                                                    }
                                                                                })}
                                                                                className="sr-only"
                                                                            />
                                                                            {tab}
                                                                        </label>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                        </div>
                                    </div>
                                )}

                                {/* Firm Name */}
                                <div className="rounded-2xl border border-slate-200/70 p-4">
                                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        <Building2 className="h-3.5 w-3.5" /> Firm Name
                                    </div>
                                    {firmOptions.length === 0 ? (
                                        <span className="text-sm text-muted-foreground">No firm names found</span>
                                    ) : (
                                        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                                            {(() => {
                                                const isAllFirmsChecked = formData.firms.length === firmOptions.length
                                                return (
                                                    <label
                                                        className={`cursor-pointer select-none rounded-full border px-3.5 py-1.5 text-sm font-bold transition-all ${
                                                            isAllFirmsChecked
                                                                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                                                                : "border-border bg-card text-muted-foreground hover:bg-muted/60"
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isAllFirmsChecked}
                                                            onChange={() => setFormData(previous => ({
                                                                ...previous,
                                                                firms: previous.firms.length === firmOptions.length ? [] : [...firmOptions]
                                                            }))}
                                                            className="sr-only"
                                                        />
                                                        All
                                                    </label>
                                                )
                                            })()}
                                            {firmOptions.map(firm => {
                                                const isFirmChecked = formData.firms.includes(firm)
                                                return (
                                                    <label
                                                        key={firm}
                                                        className={`cursor-pointer select-none rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
                                                            isFirmChecked
                                                                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                                                                : "border-border bg-card text-muted-foreground hover:bg-muted/60"
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isFirmChecked}
                                                            onChange={() => setFormData(previous => ({
                                                                ...previous,
                                                                firms: previous.firms.includes(firm)
                                                                    ? previous.firms.filter(item => item !== firm)
                                                                    : [...previous.firms, firm]
                                                            }))}
                                                            className="sr-only"
                                                        />
                                                        {firm}
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-muted/50 px-6 py-4">
                                <button type="button" onClick={closeForm} disabled={isSaving} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted cursor-pointer disabled:opacity-50">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 cursor-pointer">
                                    {isSaving && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                                    {isSaving ? "Saving..." : editingUser ? "Update User" : "Add User"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminConfig
