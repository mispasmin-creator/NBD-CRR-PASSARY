import { MenuIcon } from "./Icons"
import { useContext } from "react"
import { AuthContext } from "../App"
import { useLocation } from "react-router-dom"

function MainNav({ logout, setMobileMenuOpen }) {
  const { currentUser, userType, isAdmin } = useContext(AuthContext)
  const location = useLocation()

  const getPageHeader = () => {
    const path = location.pathname
    if (path === "/") return {
      title: "Sales Performance System",
      description: "Monitor your sales pipeline and track conversions in real-time"
    }
    if (path.startsWith("/leads")) return {
      title: "Lead Management",
      description: "Enter the details of the new lead"
    }
    if (path.startsWith("/follow-up")) return {
      title: "Call Tracker",
      description: "Track and manage all your follow-up calls"
    }
    if (path.startsWith("/call-tracker")) return {
      title: "Enquiry Tracker",
      description: "Track the progress of enquiries through the sales pipeline"
    }
    if (path.startsWith("/quotation")) return {
      title: "Quotation Management",
      description: "Create and manage quotations for your customers"
    }
    if (path.startsWith("/crr-enquiry")) return {
      title: "CRR Enquiry",
      description: "Manage customer relationship and enquiry records"
    }
    if (path.startsWith("/non-converted")) return {
      title: "Non-Converted Leads",
      description: "Track and analyze leads that did not convert"
    }
    if (path.startsWith("/visit-fms")) return {
      title: "Visit FMS",
      description: "Field Marketing Service visit tracking and management"
    }
    if (path.startsWith("/complaints")) return {
      title: "Complaints Management",
      description: "Track and resolve customer complaints efficiently"
    }
    if (path.startsWith("/analytics")) return {
      title: "Analytics Dashboard",
      description: "View detailed analytics and performance metrics"
    }
    if (path.startsWith("/control-panel")) return {
      title: "Control Panel",
      description: "Manage system settings and configurations"
    }
    if (path.startsWith("/risk-control")) return {
      title: "Risk Control",
      description: "Monitor and manage potential risks in your sales pipeline"
    }
    if (path.startsWith("/admin-config")) return {
      title: "Admin Configuration",
      description: "Configure admin settings and user permissions"
    }
    return { title: "Sales Performance System", description: "" }
  }

  const { title, description } = getPageHeader()
  const showAdminView = (location.pathname.startsWith("/follow-up") || location.pathname.startsWith("/call-tracker")) && isAdmin && isAdmin()

  return (
    <header className="sticky top-0 z-40 flex h-auto min-h-[4rem] w-full items-center justify-between border-b bg-white px-4 py-2 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <button
          type="button"
          className="text-slate-500 hover:text-slate-700 focus:outline-none md:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <MenuIcon className="h-6 w-6" />
        </button>

        <div className="flex flex-col">
          {title && <h1 className="text-xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">{title}</h1>}
          {description && <p className="text-sm text-slate-500 hidden md:block">{description}</p>}
          {showAdminView && <p className="text-green-600 font-semibold text-xs mt-0.5">Admin View: Showing all data</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* User profile section removed from here as requested */}
      </div>
    </header>
  )
}

export default MainNav