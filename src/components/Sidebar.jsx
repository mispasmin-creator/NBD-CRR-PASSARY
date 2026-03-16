"use client"

import { Link, useLocation } from "react-router-dom"
import { HomeIcon, UsersIcon, PhoneCallIcon, BarChartIcon, FileTextIcon, LogoutIcon, RetentionIcon, XCircleIcon, MapPinIcon, MessageSquareIcon, PieChartIcon, SettingsIcon, AlertTriangleIcon, SlidersIcon } from "./Icons"
import { useContext } from "react"
import { AuthContext } from "../App"
import userAvatarLogo from "../assests/user-avatar-logo.png"

function Sidebar({ mobileMenuOpen, setMobileMenuOpen }) {
    const location = useLocation()
    const { userType, isAdmin, logout, currentUser } = useContext(AuthContext)

    const routes = [
        { href: "/", label: "Dashboard", icon: <HomeIcon className="h-5 w-5" />, active: location.pathname === "/" },
        { href: "/leads", label: "NBD Outgoing", icon: <UsersIcon className="h-5 w-5" />, active: location.pathname.startsWith("/leads") },
        { href: "/crr-enquiry", label: "CRR Enquiry", icon: <RetentionIcon className="h-5 w-5" />, active: location.pathname.startsWith("/crr-enquiry") },
        { href: "/call-tracker", label: "NBD Enquiry", icon: <BarChartIcon className="h-5 w-5" />, active: location.pathname.startsWith("/call-tracker") },
        { href: "/offer", label: "Offer", icon: <FileTextIcon className="h-5 w-5" />, active: location.pathname.startsWith("/offer") },
        // { href: "/follow-up", label: "Call Trackers", icon: <PhoneCallIcon className="h-5 w-5" />, active: location.pathname.startsWith("/follow-up") },
        // { href: "/non-converted", label: "Non-Converted", icon: <XCircleIcon className="h-5 w-5" />, active: location.pathname.startsWith("/non-converted") },
        // { href: "/visit-fms", label: "Visit FMS", icon: <MapPinIcon className="h-5 w-5" />, active: location.pathname.startsWith("/visit-fms") },
        // { href: "/complaints", label: "Complaints", icon: <MessageSquareIcon className="h-5 w-5" />, active: location.pathname.startsWith("/complaints") },
        // { href: "/quotation", label: "Quotations", icon: <FileTextIcon className="h-5 w-5" />, active: location.pathname.startsWith("/quotation") },
        // { href: "/analytics", label: "Analytics & Reports", icon: <PieChartIcon className="h-5 w-5" />, active: location.pathname.startsWith("/analytics") },
    ]

    const adminRoutes = [
        { href: "/control-panel", label: "Control Panel", icon: <SlidersIcon className="h-5 w-5" />, active: location.pathname.startsWith("/control-panel") },
        { href: "/risk-control", label: "Risk & Control", icon: <AlertTriangleIcon className="h-5 w-5" />, active: location.pathname.startsWith("/risk-control") },
        { href: "/admin-config", label: "Admin Config", icon: <SettingsIcon className="h-5 w-5" />, active: location.pathname.startsWith("/admin-config") },
    ]

    return (
        <>
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMobileMenuOpen(false)} />
            )}

            {/* Sidebar — 72 units wide (288px) */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>

                {/* ── Brand / Logo ── */}
                <div className="flex h-[4.5rem] items-center px-6 border-b border-slate-100 shrink-0 gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
                        <img src={userAvatarLogo} alt="Botivate" className="h-6 w-6 object-contain" />
                    </div>
                    <div>
                        <p className="text-[17px] font-extrabold text-slate-800 leading-tight tracking-tight">Botivate</p>
                        <p className="text-[11px] text-slate-400 leading-none mt-0.5 font-medium">Sales Platform</p>
                    </div>
                </div>

                {/* ── Navigation ── */}
                <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-3">Main Menu</p>

                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            to={route.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-[14px] font-semibold transition-all duration-150 group ${route.active
                                ? "bg-sky-50 text-sky-700 border border-sky-200 shadow-sm"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                        >
                            <span className={`flex-shrink-0 transition-colors ${route.active ? "text-sky-600" : "text-slate-400 group-hover:text-slate-600"
                                }`}>
                                {route.icon}
                            </span>
                            <span className="flex-1 leading-none">{route.label}</span>
                            {route.active && (
                                <span className="h-2 w-2 rounded-full bg-sky-500 flex-shrink-0"></span>
                            )}
                        </Link>
                    ))}

                    {isAdmin && isAdmin() && (
                        <>
                            <div className="pt-5 pb-2">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-3">Administration</p>
                            </div>
                            {adminRoutes.map((route) => (
                                <Link
                                    key={route.href}
                                    to={route.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-[14px] font-semibold transition-all duration-150 group ${route.active
                                        ? "bg-violet-50 text-violet-700 border border-violet-200 shadow-sm"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                >
                                    <span className={`flex-shrink-0 ${route.active ? "text-violet-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                                        {route.icon}
                                    </span>
                                    <span className="flex-1 leading-none">{route.label}</span>
                                </Link>
                            ))}
                        </>
                    )}
                </nav>

                {/* ── User Card + Logout ── */}
                <div className="border-t border-slate-100 p-4 shrink-0 space-y-2">
                    {currentUser && (
                        <div className="flex items-center gap-3.5 px-3 py-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-[14px] shadow-sm shrink-0">
                                {String(currentUser.username || "U").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-bold text-slate-700 truncate leading-tight">{currentUser.username}</p>
                                <p className="text-[11px] text-slate-400 capitalize font-medium mt-0.5">{userType || "User"}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={logout}
                        className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
                    >
                        <LogoutIcon className="h-5 w-5 flex-shrink-0" />
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    )
}

export default Sidebar
