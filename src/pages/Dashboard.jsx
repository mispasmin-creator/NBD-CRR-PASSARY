"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCwIcon } from "../components/Icons";
import { fetchDashboardOverview } from "../services/dashboardStats";
import HeroStats from "../components/dashboard/HeroStats";
import ModuleStatCard from "../components/dashboard/ModuleStatCard";
import StatusDonut from "../components/dashboard/StatusDonut";
import MonthlyTrendChart from "../components/dashboard/MonthlyTrendChart";
import StatusBreakdownChart from "../components/dashboard/StatusBreakdownChart";
import AttentionPanel from "../components/dashboard/AttentionPanel";

const EMPTY_TOTALS = { total: 0, pending: 0, inProgress: 0, completed: 0, delayed: 0 };
const AUTO_REFRESH_MS = 5 * 60 * 1000; // silent background refresh

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
};

function formatRelativeTime(date) {
  if (!date) return "";
  const diffSec = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

/** Keeps the "Synced Xs ago" label ticking without re-fetching. */
function useRelativeTime(date, intervalMs = 30000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!date) return;
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [date, intervalMs]);
  return formatRelativeTime(date);
}

function Dashboard() {
  const [modules, setModules] = useState([]);
  const [totals, setTotals] = useState(EMPTY_TOTALS);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadData = useCallback(async ({ manual = false, silent = false } = {}) => {
    if (manual) setIsRefreshing(true);
    else if (!silent) setIsLoading(true);

    try {
      const overview = await fetchDashboardOverview();
      if (!isMountedRef.current) return;
      setModules(overview?.modules ?? []);
      setTotals(overview?.totals ?? EMPTY_TOTALS);
      setMonthlyTrend(overview?.monthlyTrend ?? []);
      setFetchedAt(overview?.fetchedAt ?? new Date());
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error("Dashboard load failed:", err);
      setError(err?.message || "Unable to load dashboard data.");
    } finally {
      if (!isMountedRef.current) return;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Silent auto-refresh, paused while the tab is hidden
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") loadData({ silent: true });
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadData]);

  const syncedLabel = useRelativeTime(fetchedAt);
  const busy = isLoading || isRefreshing;
  const hasModules = modules.length > 0;
  const skeletonKeys = useMemo(() => Array.from({ length: 8 }, (_, i) => `sk-${i}`), []);

  return (
    <div className="min-h-full">
      <motion.div
        variants={containerVariants}
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        className="space-y-6 pb-4"
      >
        {/* Header */}
        <motion.section
          variants={itemVariants}
          className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500">
              Live overview across every module — jump straight into what needs work.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {fetchedAt && (
              <span className="text-[12px] font-medium text-slate-400" aria-live="polite">
                Synced {syncedLabel}
              </span>
            )}
            <button
              type="button"
              onClick={() => loadData({ manual: true })}
              disabled={busy}
              aria-busy={isRefreshing}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </motion.section>

        {/* Error banner */}
        {error && (
          <motion.section
            variants={itemVariants}
            role="alert"
            className="flex flex-col gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-[13px] font-semibold text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => loadData({ manual: true })}
              className="self-start rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-red-700 sm:self-auto"
            >
              Try again
            </button>
          </motion.section>
        )}

        {/* Hero KPIs */}
        <motion.section variants={itemVariants}>
          <HeroStats totals={totals} isLoading={isLoading} />
        </motion.section>

        {/* Module status grid */}
        <motion.section variants={itemVariants}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-500">
              Module Status
            </h2>
            {hasModules && !isLoading && (
              <span className="text-[12px] font-semibold text-slate-400">
                {modules.length} modules
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {skeletonKeys.map((key) => (
                <div
                  key={key}
                  className="h-[148px] animate-pulse rounded-2xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : hasModules ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {modules.map((mod) => (
                <ModuleStatCard key={mod.key} mod={mod} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-700">No module data yet</p>
              <p className="mt-1 text-[13px] text-slate-500">
                Once records start coming in, module stats will appear here.
              </p>
            </div>
          )}
        </motion.section>

        {/* Analytics: status distribution + activity trend */}
        <motion.section variants={itemVariants} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StatusDonut totals={totals} isLoading={isLoading} />
          <MonthlyTrendChart data={monthlyTrend} isLoading={isLoading} />
        </motion.section>

        {/* Analytics: per-module breakdown + needs attention */}
        <motion.section variants={itemVariants} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StatusBreakdownChart modules={modules} isLoading={isLoading} />
          <AttentionPanel modules={modules} isLoading={isLoading} />
        </motion.section>
      </motion.div>
    </div>
  );
}

export default Dashboard;
