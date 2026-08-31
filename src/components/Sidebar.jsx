"use client";

import { NavLink, useLocation } from "react-router-dom";
import { useContext, useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AuthContext } from "../App";

const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";

const MotionSpan = motion.span;
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

/**
 * Sidebar component with navigation and user profile.
 * @param {Object} props
 * @param {boolean} props.mobileMenuOpen - Whether mobile menu is open.
 * @param {function} props.setMobileMenuOpen - Function to toggle mobile menu.
 */
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

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // On mobile the sidebar always opens as a full overlay regardless of the desktop collapse state
  const showLabels = !isCollapsed || mobileMenuOpen;

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location, setMobileMenuOpen]);

  // Define all routes with metadata
  const mainRoutes = useMemo(
    () => [
      { to: "/", label: "Dashboard", icon: <HomeIcon className="h-6 w-6" /> },
      { to: "/leads", label: "NBD Lead", icon: <UsersIcon className="h-6 w-6" /> },
      { to: "/crr-enquiry", label: "CRR Enquiry", icon: <RetentionIcon className="h-6 w-6" /> },
      { to: "/call-tracker", label: "NBD Enquiry", icon: <BarChartIcon className="h-6 w-6" /> },
      { to: "/offer", label: "Offer", icon: <FileTextIcon className="h-6 w-6" /> },
      {
        to: "/customer-complaint",
        label: "Customer Complaint",
        icon: <MessageSquareIcon className="h-6 w-6" />,
      },
      {
        to: "/marketing-visit-tracker",
        label: "Marketing Visit",
        icon: <MapPinIcon className="h-6 w-6" />,
      },
      {
        to: "/order-not-received-fms",
        label: "Order Not Received",
        icon: <XCircleIcon className="h-6 w-6" />,
      },
    ],
    []
  );

  const adminRoutes = useMemo(
    () => [
      { to: "/admin-config", label: "User Management", icon: <SettingsIcon className="h-6 w-6" /> },
    ],
    []
  );

  const showAdminSection = isAdmin && isAdmin();

  return (
    <>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[320px] ${
          isCollapsed ? "md:w-[88px]" : "md:w-[320px]"
        } flex-col border-r border-slate-200/70 bg-white shadow-2xl shadow-slate-300/20 transition-[transform,width] duration-300 ease-in-out md:relative md:translate-x-0 md:shadow-sm ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Collapse toggle — desktop only */}
        <button
          type="button"
          onClick={toggleCollapsed}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-[4.25rem] z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 cursor-pointer md:flex"
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Brand / Logo */}
        <div className={`flex h-[5.5rem] shrink-0 items-center gap-4 border-b border-slate-100 bg-white px-6 ${isCollapsed ? "md:justify-center md:px-0" : ""}`}>
          <img
            src="/logo.png"
            alt="Passary Group"
            className="h-10 w-10 shrink-0 object-contain"
          />
          {showLabels && (
            <div className="min-w-0">
              <p className="truncate text-[18px] font-bold text-slate-900">
                Passary Refractories
              </p>
              <p className="truncate text-[13px] text-slate-500">

              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6" aria-label="Sidebar navigation">
          {showLabels && (
            <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Main</p>
          )}
          <div className="space-y-1">
            {mainRoutes.map((route) => (
              <SidebarLink key={route.to} route={route} showLabel={showLabels} />
            ))}
          </div>

          {showAdminSection && (
            <>
              <div className="my-4 border-t border-slate-100" />
              {showLabels && (
                <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Settings</p>
              )}
              <div className="space-y-1">
                {adminRoutes.map((route) => (
                  <SidebarLink key={route.to} route={route} showLabel={showLabels} />
                ))}
              </div>
            </>
          )}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-slate-100 p-4">
          {currentUser && <UserCard user={currentUser} userType={userType} showLabel={showLabels} />}
          <button
            onClick={logout}
            title="Logout"
            className={`group flex w-full items-center gap-4 rounded-xl px-5 py-3.5 text-[16px] font-medium text-slate-600 outline-none transition-colors duration-200 hover:bg-slate-50 hover:text-slate-900 ${
              showLabels ? "" : "md:justify-center md:px-0"
            }`}
          >
            <LogoutIcon className="h-6 w-6 flex-shrink-0 text-slate-400 group-hover:text-slate-600" />
            {showLabels && "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}

/** A single sidebar nav link */
function SidebarLink({ route, showLabel = true }) {
  return (
    <NavLink
      to={route.to}
      end={route.to === "/"}
      title={route.label}
      className={({ isActive }) =>
        `group relative mb-1.5 flex items-center gap-4 rounded-xl px-5 py-3.5 text-[16px] font-medium outline-none transition-colors duration-200 ${
          showLabel ? "" : "md:justify-center md:px-0"
        } ${
          isActive
            ? "bg-blue-50 border border-blue-600 text-blue-700 shadow-sm"
            : "border border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex-shrink-0 transition-colors duration-200 ${
              isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
            }`}
          >
            {route.icon}
          </span>
          {showLabel && <span className="flex-1 leading-none">{route.label}</span>}
        </>
      )}
    </NavLink>
  );
}

/** Displays the current user's avatar and name */
function UserCard({ user, userType, showLabel = true }) {
  const initial = (user.username || "U").charAt(0).toUpperCase();

  return (
    <div className={`flex items-center gap-4 px-4 py-3 ${showLabel ? "" : "md:justify-center md:px-0"}`} title={showLabel ? undefined : user.username}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[16px] font-bold text-white shadow-sm">
        {initial}
      </div>
      {showLabel && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-medium text-slate-900">
            {user.username}
          </p>
          <p className="truncate text-[13px] text-slate-500 capitalize">
            {userType || "Admin"}
          </p>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
