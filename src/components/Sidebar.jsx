"use client";

import { NavLink, useLocation } from "react-router-dom";
import { useContext, useMemo, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../App";
import {
  HomeIcon,
  UsersIcon,
  RetentionIcon,
  BarChartIcon,
  FileTextIcon,
  MessageSquareIcon,
  MapPinIcon,
  SettingsIcon,
  LogoutIcon,
  XCircleIcon,
  BuildingIcon,
} from "./Icons";
import { fetchDashboardOverview } from "../services/dashboardStats";

const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";
// Pending counts refresh — matches Dashboard's own auto-refresh cadence
const COUNTS_REFRESH_MS = 5 * 60 * 1000;

function Sidebar({ mobileMenuOpen, setMobileMenuOpen }) {
  const location = useLocation();
  const { userType, isAdmin, logout, currentUser } = useContext(AuthContext);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Mobile drawer always shows full sidebar
  const showLabels = !isCollapsed || mobileMenuOpen;

  // Per-module pending counts — same live stats Dashboard shows, indexed to
  // match fetchDashboardOverview()'s fixed module order (Leads, CRR, NBD
  // Enquiry, Offer, Complaint, Marketing, Order Not Received).
  const [moduleCounts, setModuleCounts] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const loadCounts = async () => {
      try {
        const overview = await fetchDashboardOverview();
        // "pending" alone under-counts — several modules (Order Not Received, CRR
        // Enquiry, Customer Complaint) bucket most of their active work as
        // "inProgress" or "delayed" instead. Anything not yet completed still
        // needs attention, so badge on total minus completed.
        if (isMounted) {
          setModuleCounts((overview?.modules ?? []).map((m) => Math.max(0, (m.total ?? 0) - (m.completed ?? 0))));
        }
      } catch {
        /* silent — badges just stay hidden until next successful refresh */
      }
    };
    // Delay the first fetch so it doesn't compete with the current page's own
    // (much more urgent) data load for the same slow Apps Script backend —
    // badges popping in a couple seconds late is fine; a slower page isn't.
    const initialTimer = setTimeout(loadCounts, 2500);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") loadCounts();
    }, COUNTS_REFRESH_MS);
    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(id);
    };
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, setMobileMenuOpen]);

  // Close drawer on Escape + lock body scroll
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMobileMenuOpen(false);
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileMenuOpen, setMobileMenuOpen]);

  const mainRoutes = useMemo(
    () => [
      { to: "/", label: "Dashboard", icon: <HomeIcon className="h-5 w-5" /> },
      { to: "/leads", label: "NBD Lead", icon: <UsersIcon className="h-5 w-5" />, moduleIndex: 0 },
      { to: "/crr-enquiry", label: "CRR Enquiry", icon: <RetentionIcon className="h-5 w-5" />, moduleIndex: 1 },
      { to: "/call-tracker", label: "NBD Enquiry", icon: <BarChartIcon className="h-5 w-5" />, moduleIndex: 2 },
      { to: "/offer", label: "Offer", icon: <FileTextIcon className="h-5 w-5" />, moduleIndex: 3 },
      {
        to: "/customer-complaint",
        label: "Customer Complaint",
        icon: <MessageSquareIcon className="h-5 w-5" />,
        moduleIndex: 4,
      },
      {
        to: "/marketing-visit-tracker",
        label: "Marketing Visit",
        icon: <MapPinIcon className="h-5 w-5" />,
        moduleIndex: 5,
      },
      {
        to: "/order-not-received-fms",
        label: "Order Not Received",
        icon: <XCircleIcon className="h-5 w-5" />,
        moduleIndex: 6,
      },
    ],
    []
  );

  const adminRoutes = useMemo(
    () => [
      { to: "/admin-config", label: "User Management", icon: <SettingsIcon className="h-5 w-5" /> },
      { to: "/master-sheet", label: "Master", icon: <BuildingIcon className="h-5 w-5" /> },
    ],
    []
  );

  const showAdminSection = typeof isAdmin === "function" ? isAdmin() : Boolean(isAdmin);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        aria-label="Main navigation"
        initial={false}
        animate={{ width: isCollapsed ? 88 : 288 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 md:static md:z-auto md:shadow-none ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={mobileMenuOpen ? { width: 288 } : undefined}
      >
        {/* Collapse toggle — desktop only */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-9 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:scale-110 hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md md:flex"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-3.5 w-3.5 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Brand */}
        <div className={`flex items-center gap-3 border-b border-slate-100 px-4 py-5 ${showLabels ? "" : "md:justify-center md:px-0"}`}>
          <img
            src="/logo.png"
            alt="Passary Refractories"
            className="h-11 w-11 shrink-0 object-contain"
          />
          <AnimatePresence initial={false}>
            {showLabels && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="min-w-0"
              >
                <p className="truncate text-base font-bold leading-tight text-slate-900">
                  Passary Refractories
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Close button — mobile only */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
            className="ml-auto rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 md:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          <ul className="space-y-1">
            {mainRoutes.map((route) => (
              <li key={route.to}>
                <SidebarLink
                  route={route}
                  showLabel={showLabels}
                  pendingCount={route.moduleIndex != null ? moduleCounts[route.moduleIndex] : undefined}
                />
              </li>
            ))}
          </ul>

          {showAdminSection && (
            <>
              <div className="my-4 border-t border-slate-100" />
              <ul className="space-y-1">
                {adminRoutes.map((route) => (
                  <li key={route.to}>
                    <SidebarLink route={route} showLabel={showLabels} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-100 p-3">
          {currentUser && (
            <UserCard user={currentUser} userType={userType} showLabel={showLabels} />
          )}
          <button
            type="button"
            onClick={logout}
            title={showLabels ? undefined : "Logout"}
            className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-1 ${
              showLabels ? "" : "md:justify-center md:px-0"
            }`}
          >
            <LogoutIcon className="h-4 w-4 shrink-0" />
            {showLabels && <span>Log out</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}

/** A single sidebar nav link */
function SidebarLink({ route, showLabel = true, pendingCount }) {
  const hasCount = Number.isFinite(pendingCount) && pendingCount > 0;

  return (
    <NavLink
      to={route.to}
      end={route.to === "/"}
      title={showLabel ? undefined : hasCount ? `${route.label} (${pendingCount} pending)` : route.label}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
          showLabel ? "" : "md:justify-center md:px-0"
        } ${
          isActive
            ? "bg-indigo-50 text-indigo-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {/* Left accent bar for active state */}
          {isActive && (
            <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-indigo-700" aria-hidden="true" />
          )}
          <span
            className={`relative shrink-0 transition-colors ${
              isActive ? "text-indigo-700" : "text-slate-400 group-hover:text-slate-600"
            }`}
          >
            {route.icon}
            {hasCount && !showLabel && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
          </span>
          {showLabel && <span className="truncate">{route.label}</span>}
          {hasCount && showLabel && (
            <span
              className={`ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                isActive ? "bg-indigo-100 text-indigo-700" : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {pendingCount > 99 ? "99+" : pendingCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

/** Displays the current user's avatar and name */
function UserCard({ user, userType, showLabel = true }) {
  const initial = (user.username || "U").charAt(0).toUpperCase();

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 ${
        showLabel ? "" : "md:justify-center md:px-0"
      }`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-700 text-[12px] font-bold text-white shadow-sm">
        {initial}
      </div>
      {showLabel && (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-slate-900">{user.username}</p>
          <p className="truncate text-[11px] capitalize text-slate-400">{userType || "Admin"}</p>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
