"use client"

import { useContext } from "react"
import { AuthContext } from "../App"

function ControlPanel() {
    const { currentUser } = useContext(AuthContext)

    const stats = [
        { label: "Total Users", value: "24", icon: "people", color: "bg-blue-500" },
        { label: "Active Sessions", value: "18", icon: "login", color: "bg-green-500" },
        { label: "Pending Tasks", value: "42", icon: "pending_actions", color: "bg-yellow-500" },
        { label: "System Alerts", value: "3", icon: "warning", color: "bg-red-500" },
    ]

    const quickActions = [
        { label: "Add New User", icon: "person_add", action: () => alert("Add User clicked") },
        { label: "System Backup", icon: "backup", action: () => alert("Backup initiated") },
        { label: "Clear Cache", icon: "cached", action: () => alert("Cache cleared") },
        { label: "View Logs", icon: "description", action: () => alert("Viewing logs") },
    ]

    const recentActivities = [
        { user: "John Doe", action: "Created new lead", time: "5 min ago" },
        { user: "Jane Smith", action: "Updated quotation #1234", time: "15 min ago" },
        { user: "Admin", action: "System backup completed", time: "1 hour ago" },
        { user: "Mike Brown", action: "Logged in", time: "2 hours ago" },
    ]

    const systemHealth = [
        { name: "Database", status: "Healthy", uptime: "99.9%" },
        { name: "API Server", status: "Healthy", uptime: "99.8%" },
        { name: "Cache Server", status: "Warning", uptime: "98.5%" },
        { name: "File Storage", status: "Healthy", uptime: "99.9%" },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="py-2">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Control Panel</h1>
                    <p className="text-slate-600 mt-1">Administrative overview and quick actions</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {stats.map((s, i) => (
                        <div key={i} className="bg-white rounded-lg shadow-md p-6 flex items-center gap-4">
                            <div className={`${s.color} text-white p-3 rounded-lg`}>
                                <span className="material-icons">{s.icon}</span>
                            </div>
                            <div>
                                <div className="text-sm text-slate-500">{s.label}</div>
                                <div className="text-2xl font-bold text-slate-800">{s.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {quickActions.map((a, i) => (
                                <button key={i} onClick={a.action} className="flex flex-col items-center p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                                    <span className="material-icons text-sky-600 mb-2">{a.icon}</span>
                                    <span className="text-sm text-slate-700">{a.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activities */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Activities</h2>
                        <div className="space-y-4">
                            {recentActivities.map((a, i) => (
                                <div key={i} className="flex justify-between items-start border-b border-slate-100 pb-3 last:border-0">
                                    <div>
                                        <div className="font-medium text-slate-800">{a.user}</div>
                                        <div className="text-sm text-slate-500">{a.action}</div>
                                    </div>
                                    <div className="text-xs text-slate-400">{a.time}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* System Health */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">System Health</h2>
                        <div className="space-y-3">
                            {systemHealth.map((s, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${s.status === "Healthy" ? "bg-green-500" : "bg-yellow-500"}`}></div>
                                        <span className="text-slate-700">{s.name}</span>
                                    </div>
                                    <span className="text-sm text-slate-500">{s.uptime}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Admin Info */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Current Session</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><span className="text-slate-500">Logged in as:</span> <span className="font-medium">{currentUser?.username || "Admin"}</span></div>
                        <div><span className="text-slate-500">Role:</span> <span className="font-medium capitalize">{currentUser?.userType || "admin"}</span></div>
                        <div><span className="text-slate-500">Last Login:</span> <span className="font-medium">{new Date().toLocaleString()}</span></div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ControlPanel
