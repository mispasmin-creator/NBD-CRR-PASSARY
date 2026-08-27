import { MenuIcon } from "./Icons"
import { useContext, useState, useRef, useEffect } from "react"
import { AuthContext } from "../App"
import { useLocation, useNavigate } from "react-router-dom"
import { Bell, ChevronDown, LogOut } from "lucide-react"

function MainNav({ logout, setMobileMenuOpen }) {
  const { currentUser, userType, isAdmin } = useContext(AuthContext)
  const location = useLocation()
  const navigate = useNavigate()

  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const userMenuRef = useRef(null)
  const notificationsRef = useRef(null)

  // Close either dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const getPageHeader = () => {
    const path = location.pathname
    if (path === "/") return { title: "Sales Performance System", description: "Monitor your sales pipeline and conversions in real-time" }
    if (path.startsWith("/leads")) return { title: "NBD Lead", description: "Track and manage new business development leads" }
    if (path.startsWith("/follow-up")) return { title: "Call Tracker", description: "Track and manage all your follow-up calls" }
    if (path.startsWith("/call-tracker")) return { title: "NBD Enquiry", description: "Track progress of enquiries through the sales pipeline" }
    if (path.startsWith("/quotation")) return { title: "Quotation Management", description: "Create and manage quotations for your customers" }
    if (path.startsWith("/crr-enquiry")) return { title: "CRR Enquiry", description: "Manage customer relationship and enquiry records" }
    if (path.startsWith("/offer")) return { title: "Offer", description: "Manage rates, offer letters and approvals" }
    if (path.startsWith("/customer-complaint")) return { title: "Customer Complaint", description: "Track and resolve customer complaints end-to-end" }
    if (path.startsWith("/marketing-visit-tracker")) return { title: "Marketing Visit Tracker", description: "Assign, log and follow up on client plant visits" }
    if (path.startsWith("/order-not-received-fms")) return { title: "Order Not Received FMS", description: "Consolidated view of Order Not Received records from NBD Lead, NBD Enquiry & CRR Enquiry" }
    if (path.startsWith("/non-converted")) return { title: "Non-Converted Leads", description: "Track and analyze leads that did not convert" }
    if (path.startsWith("/visit-fms")) return { title: "Visit FMS", description: "Field Marketing Service visit tracking" }
    if (path.startsWith("/complaints")) return { title: "Complaints Management", description: "Track and resolve customer complaints efficiently" }
    if (path.startsWith("/analytics")) return { title: "Analytics Dashboard", description: "Detailed analytics and performance metrics" }
    if (path.startsWith("/control-panel")) return { title: "Control Panel", description: "Manage system settings and configurations" }
    if (path.startsWith("/risk-control")) return { title: "Risk Control", description: "Monitor and manage potential risks" }
    if (path.startsWith("/admin-config")) return { title: "Admin Configuration", description: "Configure admin settings and user permissions" }
    return { title: "Dashboard", description: "" }
  }

  const { title, description } = getPageHeader()
  const showAdminView = (location.pathname.startsWith("/follow-up") || location.pathname.startsWith("/call-tracker")) && isAdmin && isAdmin()

  const now = new Date()
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })

  const handleLogoutClick = () => {
    setShowUserMenu(false)
    logout()
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-slate-200/70 bg-card px-5">
      <div className="flex flex-1 items-center gap-3 min-w-0">
        {/* Mobile hamburger */}
        <button
          type="button"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-muted-foreground focus:outline-none md:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        {/* Divider */}
        <div className="hidden h-7 w-px bg-slate-200 md:block"></div>

        {/* Page title */}
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold leading-tight text-foreground">{title}</h1>
            <div className="mt-0.5 flex items-center gap-2">
              {description && (
                <p className="hidden truncate text-[11px] leading-none text-muted-foreground md:block">{description}</p>
              )}
              {showAdminView && (
                <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/20 px-2.5 py-1 text-[10px] font-semibold text-primary md:inline-flex">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary"></span>
                  Admin View — All Data
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex shrink-0 items-center gap-2.5">
        {/* Date */}
        <div className="hidden items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-[11px] font-medium text-muted-foreground lg:flex">
          <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {dateStr}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setShowNotifications((prev) => !prev)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted cursor-pointer"
            title="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-slate-200 bg-card p-4 shadow-lg">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              <p className="mt-2 text-xs text-muted-foreground">You're all caught up — no new notifications.</p>
            </div>
          )}
        </div>

        {/* User menu */}
        {currentUser && (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex cursor-pointer items-center gap-2 rounded-full py-1 pl-1.5 pr-2 shadow-sm transition-colors hover:bg-muted"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-[11px] font-bold text-white shadow-sm">
                {String(currentUser.username || "U").charAt(0).toUpperCase()}
              </div>
              <div className="hidden leading-none sm:block">
                <p className="text-[12px] font-semibold text-muted-foreground">{currentUser.username}</p>
                {userType && <p className="mt-0.5 text-[10px] capitalize text-muted-foreground">{userType}</p>}
              </div>
              <ChevronDown className={`hidden h-3.5 w-3.5 text-muted-foreground transition-transform sm:block ${showUserMenu ? "rotate-180" : ""}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-slate-200 bg-card shadow-lg">
                <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-foreground">{currentUser.username}</p>
                    {userType && <p className="mt-0.5 truncate text-xs capitalize text-muted-foreground">{userType}</p>}
                </div>
                {isAdmin && isAdmin() && (
                  <button
                    type="button"
                    onClick={() => { setShowUserMenu(false); navigate("/admin-config") }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted cursor-pointer"
                  >
                    Administration
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

export default MainNav
