import { MenuIcon } from "./Icons"
import { useContext } from "react"
import { AuthContext } from "../App"
import { useLocation } from "react-router-dom"

function MainNav({ logout, setMobileMenuOpen }) {
  const { currentUser, userType, isAdmin } = useContext(AuthContext)
  const location = useLocation()

  const getPageHeader = () => {
    const path = location.pathname
    if (path === "/") return { title: "Sales Performance System", description: "Monitor your sales pipeline and conversions in real-time", emoji: "📊" }
    if (path.startsWith("/leads")) return { title: "Lead Management", description: "Track and manage new business development leads", emoji: "👥" }
    if (path.startsWith("/follow-up")) return { title: "Call Tracker", description: "Track and manage all your follow-up calls", emoji: "📞" }
    if (path.startsWith("/call-tracker")) return { title: "Enquiry Tracker", description: "Track progress of enquiries through the sales pipeline", emoji: "📋" }
    if (path.startsWith("/quotation")) return { title: "Quotation Management", description: "Create and manage quotations for your customers", emoji: "📄" }
    if (path.startsWith("/crr-enquiry")) return { title: "CRR Enquiry", description: "Manage customer relationship and enquiry records", emoji: "🔄" }
    if (path.startsWith("/non-converted")) return { title: "Non-Converted Leads", description: "Track and analyze leads that did not convert", emoji: "❌" }
    if (path.startsWith("/visit-fms")) return { title: "Visit FMS", description: "Field Marketing Service visit tracking", emoji: "📍" }
    if (path.startsWith("/complaints")) return { title: "Complaints Management", description: "Track and resolve customer complaints efficiently", emoji: "💬" }
    if (path.startsWith("/analytics")) return { title: "Analytics Dashboard", description: "Detailed analytics and performance metrics", emoji: "📈" }
    if (path.startsWith("/control-panel")) return { title: "Control Panel", description: "Manage system settings and configurations", emoji: "⚙️" }
    if (path.startsWith("/risk-control")) return { title: "Risk Control", description: "Monitor and manage potential risks", emoji: "🛡️" }
    if (path.startsWith("/admin-config")) return { title: "Admin Configuration", description: "Configure admin settings and user permissions", emoji: "🔧" }
    return { title: "Sales Performance System", description: "", emoji: "📊" }
  }

  const { title, description, emoji } = getPageHeader()
  const showAdminView = (location.pathname.startsWith("/follow-up") || location.pathname.startsWith("/call-tracker")) && isAdmin && isAdmin()

  const now = new Date()
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })

  return (
    <header className="sticky top-0 z-40 h-16 flex items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm">
      <div className="flex items-center gap-3 flex-1">
        {/* Mobile hamburger */}
        <button
          type="button"
          className="text-slate-400 hover:text-slate-600 focus:outline-none md:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          onClick={() => setMobileMenuOpen(true)}
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        {/* Divider */}
        <div className="hidden md:block h-7 w-px bg-slate-200"></div>

        {/* Page title */}
        <div className="flex items-center gap-2.5">
          <span className="text-xl hidden sm:block">{emoji}</span>
          <div>
            <h1 className="text-[15px] font-bold text-slate-800 leading-tight">{title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {description && (
                <p className="text-[11px] text-slate-400 hidden md:block leading-none">{description}</p>
              )}
              {showAdminView && (
                <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                  Admin View — All Data
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Date */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium">
          <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {dateStr}
        </div>

        {/* User pill */}
        {currentUser && (
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg pl-1.5 pr-3 py-1.5 bg-white hover:bg-slate-50 transition-colors cursor-default">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-[11px] shadow-sm shrink-0">
              {String(currentUser.username || "U").charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block leading-none">
              <p className="text-[12px] font-semibold text-slate-700">{currentUser.username}</p>
              {userType && <p className="text-[10px] text-slate-400 capitalize mt-0.5">{userType}</p>}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default MainNav