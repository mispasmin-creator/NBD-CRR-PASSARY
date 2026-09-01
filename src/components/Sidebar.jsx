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
} from "./Icons";

const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";
const MotionSpan = motion.span;

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
      { to: "/leads", label: "NBD Lead", icon: <UsersIcon className="h-5 w-5" /> },
      { to: "/crr-enquiry", label: "CRR Enquiry", icon: <RetentionIcon className="h-5 w-5" /> },
      { to: "/call-tracker", label: "NBD Enquiry", icon: <BarChartIcon className="h-5 w-5" /> },
      { to: "/offer", label: "Offer", icon: <FileTextIcon className="h-5 w-5" /> },
      {
        to: "/customer-complaint",
        label: "Customer Complaint",
        icon: <MessageSquareIcon className="h-5 w-5" />,
      },
      {
        to: "/marketing-visit-tracker",
        label: "Marketing Visit",
        icon: <MapPinIcon className="h-5 w-5" />,
      },
      {
        to: "/order-not-received-fms",
        label: "Order Not Received",
        icon: <XCircleIcon className="h-5 w-5" />,
      },
    ],
    []
  );

  const adminRoutes = useMemo(
    () => [
      { to: "/admin-config", label: "User Management", icon: <SettingsIcon className="h-5 w-5" /> },
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
          className="absolute -right-3 top-9 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 md:flex"
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
        <div className={`flex items-center gap-3 border-b border-slate-100 px-5 py-6 ${showLabels ? "" : "md:justify-center md:px-0"}`}>
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
                <p className="truncate text-base font-semibold leading-tight text-slate-900">
                  Passary Refractories
                </p>
                <p className="mt-0.5 truncate text-xs font-medium uppercase tracking-wider text-slate-400">
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
          <ul className="space-y-0.5">
            {mainRoutes.map((route) => (
              <li key={route.to}>
                <SidebarLink route={route} showLabel={showLabels} />
              </li>
            ))}
          </ul>

          {showAdminSection && (
            <>
              <div className="my-4 border-t border-slate-100" />
              <ul className="space-y-0.5">
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
            className={`mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 ${
              showLabels ? "" : "md:justify-center md:px-0"
            }`}
          >
            <LogoutIcon className="h-5 w-5 shrink-0" />
            {showLabels && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}

/** A single sidebar nav link */
function SidebarLink({ route, showLabel = true }) {
  return (
    <NavLink
      to={route.to}
      end={route.to === "/"}
      title={showLabel ? undefined : route.label}
      className={({ isActive }) =>
        `group relative flex items-center gap-4 rounded-xl px-4 py-3 text-[15px] font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
          showLabel ? "" : "md:justify-center md:px-0"
        } ${
          isActive
            ? "bg-blue-50 text-blue-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <MotionSpan
              layoutId="sidebar-active-indicator"
              className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-blue-600"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          <span
            className={`shrink-0 transition-colors ${
              isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
            }`}
          >
            {route.icon}
          </span>
          {showLabel && <span className="truncate">{route.label}</span>}
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
      className={`flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 ${
        showLabel ? "" : "md:justify-center md:px-0"
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
        {initial}
      </div>
      {showLabel && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{user.username}</p>
          <p className="truncate text-xs capitalize text-slate-500">{userType || "Admin"}</p>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
