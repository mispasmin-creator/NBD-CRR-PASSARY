"use client"

import { useState, useContext } from "react"
import { AuthContext } from "../App"

function AdminConfig() {
    const { showNotification } = useContext(AuthContext)
    const [activeTab, setActiveTab] = useState("general")

    const [settings, setSettings] = useState({
        companyName: "Botivate",
        timezone: "Asia/Kolkata",
        dateFormat: "DD/MM/YYYY",
        currency: "INR",
        emailNotifications: true,
        autoBackup: true,
        sessionTimeout: 30,
    })

    const [users] = useState([
        { id: 1, username: "admin", name: "Admin User", role: "admin", status: "Active", lastLogin: "2024-12-23" },
        { id: 2, username: "john", name: "John Doe", role: "user", status: "Active", lastLogin: "2024-12-22" },
        { id: 3, username: "jane", name: "Jane Smith", role: "user", status: "Active", lastLogin: "2024-12-21" },
        { id: 4, username: "mike", name: "Mike Brown", role: "user", status: "Inactive", lastLogin: "2024-12-15" },
    ])

    const handleSave = () => {
        showNotification("Settings saved successfully", "success")
    }

    const tabs = [
        { id: "general", label: "General", icon: "settings" },
        { id: "users", label: "Users", icon: "people" },
        { id: "data", label: "Data Management", icon: "storage" },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="py-2">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Admin Configuration</h1>
                    <p className="text-slate-600 mt-1">System settings and user management</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium ${activeTab === t.id ? "bg-sky-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>
                            <span className="material-icons text-sm">{t.icon}</span> {t.label}
                        </button>
                    ))}
                </div>

                {/* General Settings */}
                {activeTab === "general" && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-6">General Settings</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                                <input type="text" value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} className="w-full px-4 py-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                                <select value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} className="w-full px-4 py-2 border rounded-md">
                                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                    <option value="UTC">UTC</option>
                                    <option value="America/New_York">America/New_York (EST)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Date Format</label>
                                <select value={settings.dateFormat} onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })} className="w-full px-4 py-2 border rounded-md">
                                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                                <select value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} className="w-full px-4 py-2 border rounded-md">
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Session Timeout (minutes)</label>
                                <input type="number" value={settings.sessionTimeout} onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })} className="w-full px-4 py-2 border rounded-md" />
                            </div>
                            <div className="flex flex-col gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={settings.emailNotifications} onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })} className="w-4 h-4" />
                                    <span className="text-slate-700">Enable Email Notifications</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={settings.autoBackup} onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })} className="w-4 h-4" />
                                    <span className="text-slate-700">Enable Auto Backup</span>
                                </label>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={handleSave} className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-6 rounded-md">Save Settings</button>
                        </div>
                    </div>
                )}

                {/* Users */}
                {activeTab === "users" && (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-slate-800">User Management</h2>
                            <button className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-md">+ Add User</button>
                        </div>
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Username</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Last Login</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-800">{u.username}</td>
                                        <td className="px-6 py-4 text-slate-600">{u.name}</td>
                                        <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${u.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>{u.role}</span></td>
                                        <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${u.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{u.status}</span></td>
                                        <td className="px-6 py-4 text-slate-600">{u.lastLogin}</td>
                                        <td className="px-6 py-4"><button className="text-sky-600 hover:text-sky-800 text-sm">Edit</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Data Management */}
                {activeTab === "data" && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-6">Data Management</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 border rounded-lg">
                                <h3 className="font-medium text-slate-800 mb-2">Export Data</h3>
                                <p className="text-sm text-slate-500 mb-4">Download all system data as CSV or JSON</p>
                                <div className="flex gap-2">
                                    <button className="bg-sky-600 hover:bg-sky-700 text-white py-2 px-4 rounded-md text-sm">Export CSV</button>
                                    <button className="bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-md text-sm">Export JSON</button>
                                </div>
                            </div>
                            <div className="p-4 border rounded-lg">
                                <h3 className="font-medium text-slate-800 mb-2">Import Data</h3>
                                <p className="text-sm text-slate-500 mb-4">Upload data from CSV or JSON files</p>
                                <button className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md text-sm">Import Data</button>
                            </div>
                            <div className="p-4 border rounded-lg">
                                <h3 className="font-medium text-slate-800 mb-2">Backup</h3>
                                <p className="text-sm text-slate-500 mb-4">Create a full system backup</p>
                                <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm">Create Backup</button>
                            </div>
                            <div className="p-4 border rounded-lg border-red-200">
                                <h3 className="font-medium text-red-800 mb-2">Danger Zone</h3>
                                <p className="text-sm text-slate-500 mb-4">Clear all cached data (irreversible)</p>
                                <button className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md text-sm">Clear Cache</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default AdminConfig
