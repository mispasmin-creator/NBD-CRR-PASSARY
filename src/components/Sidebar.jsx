"use client";

import { NavLink, useLocation } from "react-router-dom";
import { useContext, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { AuthContext } from "../App";

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

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location, setMobileMenuOpen]);

  // Define all routes with metadata
  const mainRoutes = useMemo(
    () => [
      { to: "/", label: "Dashboard", icon: <HomeIcon className="h-6 w-6" /> },
      { to: "/leads", label: "NBD Lead", icon: <UsersIcon className="h-6 w-6" /> },
      { to: "/call-tracker", label: "NBD Enquiry", icon: <BarChartIcon className="h-6 w-6" /> },
      { to: "/offer", label: "Offer", icon: <FileTextIcon className="h-6 w-6" /> },
      {
        to: "/customer-complaint",
        label: "Customer Complaint",
        icon: <MessageSquareIcon className="h-6 w-6" />,
      },
      {
        to: "/marketing-visit-tracker",
        label: "Marketing Visit Tracker",
        icon: <MapPinIcon className="h-6 w-6" />,
      },
      { to: "/crr-enquiry", label: "CRR Enquiry", icon: <RetentionIcon className="h-6 w-6" /> },
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
      { to: "/admin-config", label: "Administration", icon: <SettingsIcon className="h-6 w-6" /> },
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
        className={`fixed inset-y-0 left-0 z-50 flex w-[320px] flex-col border-r border-slate-200/70 bg-white shadow-2xl shadow-slate-300/20 transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:shadow-sm ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex h-[5.5rem] shrink-0 items-center gap-4 border-b border-slate-100 bg-white px-6">
          <img
            src="/logo.png"
            alt="Passary Group"
            className="h-10 w-10 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="truncate text-[18px] font-bold text-slate-900">
              Passary Refractories
            </p>
            <p className="truncate text-[13px] text-slate-500">
              
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6" aria-label="Sidebar navigation">

          <div className="space-y-1">
            {mainRoutes.map((route) => (
              <SidebarLink key={route.to} route={route} />
            ))}
          </div>

          {showAdminSection && (
            <>
              <div className="my-4 border-t border-slate-100" />
              <div className="space-y-1">
                {adminRoutes.map((route) => (
                  <SidebarLink key={route.to} route={route} />
                ))}
              </div>
            </>
          )}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-slate-100 p-4">
          {currentUser && <UserCard user={currentUser} userType={userType} />}
          <button
            onClick={logout}
            className="group flex w-full items-center gap-4 rounded-xl px-5 py-3.5 text-[16px] font-medium text-slate-600 outline-none transition-colors duration-200 hover:bg-slate-50 hover:text-slate-900"
          >
            <LogoutIcon className="h-6 w-6 flex-shrink-0 text-slate-400 group-hover:text-slate-600" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

/** A single sidebar nav link */
function SidebarLink({ route }) {
  return (
    <NavLink
      to={route.to}
      end={route.to === "/"}
      className={({ isActive }) =>
        `group relative mb-1.5 flex items-center gap-4 rounded-xl px-5 py-3.5 text-[16px] font-medium outline-none transition-colors duration-200 ${
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
          <span className="flex-1 leading-none">{route.label}</span>
        </>
      )}
    </NavLink>
  );
}

/** Displays the current user's avatar and name */
function UserCard({ user, userType }) {
  const initial = (user.username || "U").charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[16px] font-bold text-white shadow-sm">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-medium text-slate-900">
          {user.username}
        </p>
        <p className="truncate text-[13px] text-slate-500 capitalize">
          {userType || "Admin"}
        </p>
      </div>
    </div>
  );
}

export default Sidebar;
