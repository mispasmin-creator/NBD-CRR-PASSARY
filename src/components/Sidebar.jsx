"use client"

import { Link, useLocation } from "react-router-dom"
import { HomeIcon, UsersIcon, PhoneCallIcon, BarChartIcon, FileTextIcon, ShieldIcon, LogoutIcon, RetentionIcon, XCircleIcon, MapPinIcon, MessageSquareIcon, PieChartIcon, SettingsIcon, AlertTriangleIcon, SlidersIcon } from "./Icons"
import { useContext } from "react"
import { AuthContext } from "../App"
import botivateLogo from "../assests/Botivate-logo.png"
import userAvatarLogo from "../assests/user-avatar-logo.png"

function Sidebar({ mobileMenuOpen, setMobileMenuOpen }) {
    const location = useLocation()
    const { userType, isAdmin, logout } = useContext(AuthContext)

    // Base routes available to all users
    const routes = [
        { href: "/", label: "Dashboard", icon: <HomeIcon className="h-5 w-5 mr-3" />, active: location.pathname === "/" },
        { href: "/leads", label: "NBD Outgoing", icon: <UsersIcon className="h-5 w-5 mr-3" />, active: location.pathname.startsWith("/leads") },
        { href: "/call-tracker", label: "NBD Enquiry", icon: <BarChartIcon className="h-5 w-5 mr-3" />, active: location.pathname.startsWith("/call-tracker") },
        { href: "/crr-enquiry", label: "CRR Enquiry", icon: <RetentionIcon className="h-5 w-5 mr-3" />, active: location.pathname.startsWith("/crr-enquiry") },
        { href: "/follow-up", label: "Call Trackers", icon: <PhoneCallIcon className="h-5 w-5 mr-3" />, active: location.pathname.startsWith("/follow-up") },
        { href: "/non-converted", label: "Non-Converted", icon: <XCircleIcon className="h-5 w-5 mr-3" />, active: location.pathname.startsWith("/non-converted") },
        { href: "/visit-fms", label: "Visit FMS", icon: <MapPinIcon className="h-5 w-5 mr-3" />, active: location.pathname.startsWith("/visit-fms") },
        { href: "/complaints", label: "Complaints", icon: <MessageSquareIcon className="h-5 w-5 mr-3" />, active: location.pathname.startsWith("/complaints") },
        { href: "/quotation", label: "Quotations", icon: <FileTextIcon className="h-5 w-5 mr-3" />, active: location.pathname.startsWith("/quotation") },
        { href: "/analytics", label: "Analytics & Reports", icon: <PieChartIcon className="h-5 w-5 mr-3" />, active: location.pathname.startsWith("/analytics") },
    ]

    // Admin-only routes
    const adminRoutes = [
        { href: "/control-panel", label: "Control Panel", icon: <SlidersIcon className="h-5 w-5 mr-3" />, active: location.pathname.startsWith("/control-panel") },
        { href: "/risk-control", label: "Risk & Control", icon: <AlertTriangleIcon className="h-5 w-5 mr-3" />, active: location.pathname.startsWith("/risk-control") },
        { href: "/admin-config", label: "Admin Config", icon: <SettingsIcon className="h-5 w-5 mr-3" />, active: location.pathname.startsWith("/admin-config") },
    ]

    return (
        <>
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-slate-100 text-slate-800 transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto flex flex-col ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="flex h-16 items-center justify-start border-b border-slate-100 px-6">
                    <Link to="/" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
                        <div className="flex flex-row items-center gap-2">
                            <img src={userAvatarLogo} alt="Botivate" className="h-10 w-auto object-contain" />
                            <span className="text-xl font-bold text-sky-600">Botivate</span>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    {routes.map((route) => (
                        <Link key={route.href} to={route.href} onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${route.active ? "bg-sky-500 text-white shadow-md shadow-sky-200 hover:bg-sky-600" : "text-slate-600 hover:bg-sky-50 hover:text-sky-600"}`}>
                            {route.icon}
                            {route.label}
                        </Link>
                    ))}

                    {isAdmin && isAdmin() && (
                        <>
                            <div className="pt-4 pb-2 px-3">
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin</div>
                            </div>
                            {adminRoutes.map((route) => (
                                <Link key={route.href} to={route.href} onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${route.active ? "bg-sky-500 text-white shadow-md shadow-sky-200 hover:bg-sky-600" : "text-slate-600 hover:bg-sky-50 hover:text-sky-600"}`}>
                                    {route.icon}
                                    {route.label}
                                </Link>
                            ))}
                        </>
                    )}
                </nav>

                <div className="border-t border-slate-100 p-4">
                    <button onClick={logout} className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors duration-200">
                        <LogoutIcon className="h-5 w-5 mr-3" />
                        Logout
                    </button>
                </div>
            </aside>
        </>
    )
}

export default Sidebar
