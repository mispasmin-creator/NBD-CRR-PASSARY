"use client"

import { useContext, useEffect, useState } from "react"
import axios from "axios"
import { AuthContext } from "../App"

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

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="py-2">
                <div className="bg-card rounded-lg shadow-md overflow-hidden">
                    <div className="p-6 border-b flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-foreground">User Management</h2>
                        <button
                            onClick={openAddForm}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-md"
                        >
                            + Add User
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Username</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Password</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Page Access</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Firm Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Last Login</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-muted-foreground">Loading users...</td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-muted-foreground">No users found</td>
                                    </tr>
                                ) : users.map(user => (
                                    <tr key={user.rowIndex} className="hover:bg-muted">
                                        <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">{user.username}</td>
                                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">••••••••</td>
                                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                            {parsePageAccess(user.page_access).pages.join(", ") || "-"}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{user.firm_name || "-"}</td>
                                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{user.name || "-"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs rounded-full ${String(user.role).toLowerCase() === "admin" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                                                {user.role || "-"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{user.last_login || "-"}</td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => openEditForm(user)} className="text-sky-600 hover:text-sky-800 text-sm">Edit</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-2xl rounded-xl bg-card shadow-2xl">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <h3 className="text-lg font-semibold text-foreground">{editingUser ? "Edit User" : "Add User"}</h3>
                            <button onClick={closeForm} className="text-2xl leading-none text-muted-foreground hover:text-muted-foreground">×</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2">
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
                                            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                        />
                                    </div>
                                ))}

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-muted-foreground">Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={(event) => setFormData(previous => ({ ...previous, role: event.target.value }))}
                                        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    >
                                        <option value="">Select Role</option>
                                        <option value="admin">Admin</option>
                                        <option value="user">User</option>
                                        <option value="viewer">Viewer</option>
                                    </select>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-2 block text-sm font-medium text-muted-foreground">Page Access</label>
                                    <div className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
                                        {Object.keys(PAGE_ACCESS_OPTIONS).map(page => (
                                            <label key={page} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.pages.includes(page)}
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
                                                    className="h-4 w-4 rounded border-border text-sky-600 focus:ring-sky-500"
                                                />
                                                {page}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {formData.pages.some(page => PAGE_ACCESS_OPTIONS[page]?.length > 0) && (
                                    <div className="sm:col-span-2">
                                        <label className="mb-2 block text-sm font-medium text-muted-foreground">Tab Access</label>
                                        <div className="space-y-3 rounded-md border border-border p-3">
                                            {formData.pages
                                                .filter(page => PAGE_ACCESS_OPTIONS[page]?.length > 0)
                                                .map(page => (
                                                    <div key={page}>
                                                        <p className="mb-2 text-sm font-semibold text-muted-foreground">{page}</p>
                                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={(formData.pageTabs[page] || []).length === PAGE_ACCESS_OPTIONS[page].length}
                                                                    onChange={() => setFormData(previous => {
                                                                        const selectedTabs = previous.pageTabs[page] || []
                                                                        const selectAll = selectedTabs.length !== PAGE_ACCESS_OPTIONS[page].length
                                                                        return {
                                                                            ...previous,
                                                                            pageTabs: {
                                                                                ...previous.pageTabs,
                                                                                [page]: selectAll ? [...PAGE_ACCESS_OPTIONS[page]] : []
                                                                            }
                                                                        }
                                                                    })}
                                                                    className="h-4 w-4 rounded border-border text-sky-600 focus:ring-sky-500"
                                                                />
                                                                All
                                                            </label>
                                                            {PAGE_ACCESS_OPTIONS[page].map(tab => (
                                                                <label key={`${page}-${tab}`} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={(formData.pageTabs[page] || []).includes(tab)}
                                                                        onChange={() => setFormData(previous => {
                                                                            const selectedTabs = previous.pageTabs[page] || []
                                                                            return {
                                                                                ...previous,
                                                                                pageTabs: {
                                                                                    ...previous.pageTabs,
                                                                                    [page]: selectedTabs.includes(tab)
                                                                                        ? selectedTabs.filter(item => item !== tab)
                                                                                        : [...selectedTabs, tab]
                                                                                }
                                                                            }
                                                                        })}
                                                                        className="h-4 w-4 rounded border-border text-sky-600 focus:ring-sky-500"
                                                                    />
                                                                    {tab}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                <div className="sm:col-span-2">
                                    <label className="mb-2 block text-sm font-medium text-muted-foreground">Firm Name</label>
                                    <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-2">
                                        {firmOptions.length === 0 ? (
                                            <span className="text-sm text-muted-foreground">No firm names found</span>
                                        ) : (
                                            <>
                                                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.firms.length === firmOptions.length}
                                                        onChange={() => setFormData(previous => ({
                                                            ...previous,
                                                            firms: previous.firms.length === firmOptions.length ? [] : [...firmOptions]
                                                        }))}
                                                        className="h-4 w-4 rounded border-border text-sky-600 focus:ring-sky-500"
                                                    />
                                                    All
                                                </label>
                                                {firmOptions.map(firm => (
                                                    <label key={firm} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.firms.includes(firm)}
                                                    onChange={() => setFormData(previous => ({
                                                        ...previous,
                                                        firms: previous.firms.includes(firm)
                                                            ? previous.firms.filter(item => item !== firm)
                                                            : [...previous.firms, firm]
                                                    }))}
                                                    className="h-4 w-4 rounded border-border text-sky-600 focus:ring-sky-500"
                                                />
                                                {firm}
                                            </label>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 rounded-b-xl border-t bg-muted px-6 py-4">
                                <button type="button" onClick={closeForm} disabled={isSaving} className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
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
