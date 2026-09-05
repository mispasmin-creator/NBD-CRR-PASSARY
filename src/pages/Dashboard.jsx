"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { RefreshCwIcon, TrendingUpIcon, PieChartIcon, AlertCircleIcon } from "../components/Icons";
import {
  UsersIcon, RetentionIcon, BarChartIcon, FileTextIcon,
  MessageSquareIcon, MapPinIcon, XCircleIcon,
} from "../components/Icons";
import {
  Layers, Clock3, CheckCircle2, AlertTriangle,
  PhoneCall, CalendarClock, ShoppingBag, Inbox,
  BarChart3, Trophy, ChevronRight, Zap,
  TrendingUp, Activity, Target, ArrowUpRight,
  RefreshCw, Wifi, Medal, Flame,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";
import { fetchDashboardOverview } from "../services/dashboardStats";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_TOTALS = { total: 0, pending: 0, inProgress: 0, completed: 0, delayed: 0 };
const AUTO_REFRESH_MS = 5 * 60 * 1000;

const MODULE_ICONS = {
  UsersIcon, RetentionIcon, BarChartIcon,
  FileTextIcon, MessageSquareIcon, MapPinIcon, XCircleIcon,
};

const STATUS_SEGMENTS = [
  { key: "pending",    label: "Pending",     color: "#f59e0b", Icon: Clock3 },
  { key: "inProgress", label: "In progress", color: "#0ea5e9", Icon: RefreshCw },
  { key: "completed",  label: "Completed",   color: "#10b981", Icon: CheckCircle2 },
  { key: "delayed",    label: "Delayed",     color: "#f43f5e", Icon: AlertTriangle },
];

// Per-module accent — cycling through 8 colors
const ACCENTS = [
  { ring: "#4338ca", iconBg: "bg-indigo-700" },
  { ring: "#0e7490", iconBg: "bg-cyan-700"   },
  { ring: "#0f766e", iconBg: "bg-teal-700"   },
  { ring: "#6d28d9", iconBg: "bg-violet-700" },
  { ring: "#be185d", iconBg: "bg-pink-700"   },
  { ring: "#c2410c", iconBg: "bg-orange-700" },
  { ring: "#15803d", iconBg: "bg-green-700"  },
  { ring: "#a16207", iconBg: "bg-yellow-700" },
];

const TOOLTIP_STYLE = {
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  fontSize: 12,
  fontFamily: "Inter, sans-serif",
};

const itemV = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } },
};
const listV = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.06 } },
};

// ─── Micro helpers ────────────────────────────────────────────────────────────

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

function useRelativeTime(date, intervalMs = 30_000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!date) return;
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [date, intervalMs]);
  return formatRelativeTime(date);
}

function useLiveClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/** Smooth animated counter */
function Count({ value, duration = 700 }) {
  const [n, setN] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    if (from === value) return;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (value - from) * ease));
      if (p < 1) requestAnimationFrame(tick);
      else { setN(value); prev.current = value; }
    };
    requestAnimationFrame(tick);
  }, [value, duration]);
  return <>{n}</>;
}

/** Thin SVG ring */
function Ring({ pct = 0, size = 36, stroke = 3, color = "#10b981" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0" aria-hidden="true">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

/** Section divider heading */
function Section({ label, count }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <h2 className="text-[13.5px] font-bold text-slate-700 shrink-0">
        {label}
      </h2>
      {count != null && (
        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

/** Pulse skeleton */
function Skel({ h = "h-32", rounded = "rounded-2xl" }) {
  return <div className={`animate-pulse bg-slate-100 ${h} ${rounded} w-full`} />;
}

// ─── Hero KPI cards ───────────────────────────────────────────────────────────

const HERO = [
  { label: "Total records",   key: (t) => t.total,                  icon: Layers,        num: "text-slate-900",   icon2: "bg-slate-700"   },
  { label: "Active work",     key: (t) => t.pending + t.inProgress, icon: Zap,           num: "text-amber-600",   icon2: "bg-amber-500"   },
  { label: "Completed",       key: (t) => t.completed,              icon: CheckCircle2,  num: "text-emerald-600", icon2: "bg-emerald-500" },
  { label: "Needs attention", key: (t) => t.delayed,                icon: AlertTriangle, num: "text-rose-600",    icon2: "bg-rose-500"    },
];

function HeroCards({ totals, isLoading }) {
  const rate = totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
      {HERO.map((c, i) => {
        const val = c.key(totals);
        return (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 px-4 pt-4 pb-3.5 flex flex-col gap-3 hover:border-slate-300 hover:shadow-sm transition-all duration-200">
            {/* Icon + label row */}
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-slate-400 leading-none">{c.label}</p>
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${c.icon2} text-white`}>
                <c.icon className="h-3.5 w-3.5" strokeWidth={2.2} />
              </div>
            </div>
            {/* Number */}
            <div className={`text-[2rem] font-black tracking-tight leading-none ${c.num}`}>
              {isLoading
                ? <div className="h-8 w-14 rounded-lg bg-slate-100 animate-pulse" />
                : <Count value={val} />
              }
            </div>
            {/* Sub-line */}
            {!isLoading && i === 2 && (
              <div className="flex items-center gap-1.5">
                <Ring pct={rate} size={16} stroke={2} color="#10b981" />
                <span className="text-[11px] font-semibold text-emerald-600">{rate}% completion rate</span>
              </div>
            )}
            {!isLoading && i === 1 && totals.total > 0 && (
              <span className="text-[11px] font-semibold text-amber-500">
                {Math.round(((totals.pending + totals.inProgress) / totals.total) * 100)}% of pipeline
              </span>
            )}
            {!isLoading && (i === 0 || i === 3) && (
              <span className="text-[11px] text-slate-400 font-medium leading-none">
                {i === 0 ? "All modules combined" : val === 0 ? "All clear" : `${val} module${val > 1 ? "s" : ""} affected`}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Sales Pulse ──────────────────────────────────────────────────────────────

const PULSE = [
  { label: "Today's calls",   key: "todayCalls",        icon: PhoneCall,     color: "#4338ca" },
  { label: "Upcoming leads",  key: "upcomingLeads",     icon: CalendarClock, color: "#c2410c" },
  { label: "Orders received", key: "ordersReceived",    icon: ShoppingBag,   color: "#0f766e" },
  { label: "Enquiries in",    key: "enquiriesReceived", icon: Inbox,         color: "#0e7490" },
];

function SalesPulse({ data, isLoading }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
      {PULSE.map((c) => {
        const val = data[c.key] ?? 0;
        const I = c.icon;
        return (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 flex items-center gap-3 hover:shadow-sm transition-shadow">
            <div className="h-9 w-9 shrink-0 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center">
              <I className="h-4 w-4" style={{ color: c.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold text-slate-400 truncate">{c.label}</p>
              <p className="text-[18px] font-black leading-tight" style={{ color: c.color }}>
                {isLoading ? <span className="inline-block h-4 w-8 rounded bg-slate-100 animate-pulse" /> : <Count value={val} />}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Module Card ──────────────────────────────────────────────────────────────

function ModuleCard({ mod, idx }) {
  const navigate = useNavigate();
  const Icon = MODULE_ICONS[mod.icon];
  const pct  = mod.total > 0 ? Math.round((mod.completed / mod.total) * 100) : 0;
  const acc  = ACCENTS[idx % ACCENTS.length];

  return (
    <motion.button
      variants={itemV}
      type="button"
      onClick={() => navigate(mod.route)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      className="group flex flex-col text-left bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md p-4 transition-all duration-200 cursor-pointer relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    >
      {/* Top accent line */}
      <div className="absolute top-0 inset-x-0 h-[2px] rounded-t-xl" style={{ background: acc.ring }} />

      {/* Header: icon + count */}
      <div className="flex items-start justify-between gap-2 mt-1.5 mb-3">
        <div className={`h-9 w-9 shrink-0 rounded-xl ${acc.iconBg} text-white flex items-center justify-center group-hover:scale-105 transition-transform`}>
          {Icon && <Icon className="h-4 w-4" />}
        </div>
        {mod.available && (
          <div className="text-right">
            <div className="text-xl font-black text-slate-900 leading-none">
              <Count value={mod.total} duration={600} />
            </div>
            <span className="text-[9.5px] text-slate-400 font-semibold">records</span>
          </div>
        )}
      </div>

      {/* Label */}
      <p className="text-[12.5px] font-bold text-slate-700 truncate mb-2.5">{mod.label}</p>

      {mod.available ? (
        <>
          {/* Status chips — compact, icon-led */}
          <div className="flex flex-wrap gap-1 mb-3">
            {mod.completed > 0 && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CheckCircle2 className="h-2.5 w-2.5" /> {mod.completed}
              </span>
            )}
            {mod.pending > 0 && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                <Clock3 className="h-2.5 w-2.5" /> {mod.pending}
              </span>
            )}
            {mod.delayed > 0 && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100">
                <AlertTriangle className="h-2.5 w-2.5" /> {mod.delayed}
              </span>
            )}
          </div>

          {/* Progress row */}
          <div className="flex items-center gap-2 mt-auto">
            <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: acc.ring }}
              />
            </div>
            <Ring pct={pct} size={28} stroke={2.5} color={acc.ring} />
            <span className="text-[10px] font-black text-slate-500 w-7 text-right">{pct}%</span>
          </div>
        </>
      ) : (
        <div className="mt-auto flex items-center gap-1.5 text-[11px] text-slate-400">
          <AlertCircleIcon className="h-3.5 w-3.5" />
          No data
        </div>
      )}

      {/* Hover arrow */}
      <ArrowUpRight className="absolute bottom-3 right-3 h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
    </motion.button>
  );
}

// ─── Status Donut ─────────────────────────────────────────────────────────────

function StatusDonut({ totals, isLoading }) {
  const data = STATUS_SEGMENTS
    .map((s) => ({ name: s.label, value: totals[s.key], color: s.color }))
    .filter((d) => d.value > 0);
  const hasData = data.length > 0;

  const TT = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    const pct = totals.total > 0 ? Math.round((d.value / totals.total) * 100) : 0;
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
        <p className="font-bold text-slate-800">{d.name}</p>
        <p className="text-slate-500 mt-0.5">{d.value} · <strong>{pct}%</strong></p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center border border-violet-100">
          <PieChartIcon className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-slate-800 leading-none">Status distribution</p>
          <p className="text-[11px] text-slate-400 mt-0.5">All records, company-wide</p>
        </div>
      </div>

      <div className="flex-1 min-h-[200px] relative">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="h-5 w-5 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
          </div>
        ) : !hasData ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
            <Activity className="h-8 w-8" />
            <p className="text-[12px] font-semibold">No data yet</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={data} cx="50%" cy="50%"
                  innerRadius={60} outerRadius={88}
                  paddingAngle={2} dataKey="value" stroke="none"
                  animationBegin={100} animationDuration={700}
                >
                  {data.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<TT />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900">{totals.total}</span>
              <span className="text-[10px] font-semibold text-slate-400">Total</span>
            </div>
          </>
        )}
      </div>

      {/* Compact 2-col legend */}
      {hasData && !isLoading && (
        <div className="grid grid-cols-2 gap-1.5 mt-3">
          {STATUS_SEGMENTS.map((s) => {
            const val = totals[s.key];
            const pct = totals.total > 0 ? Math.round((val / totals.total) * 100) : 0;
            return (
              <div key={s.key} className="flex items-center justify-between bg-slate-50 rounded-lg px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-[10.5px] font-semibold text-slate-600 truncate">{s.label}</span>
                </div>
                <span className="text-[11px] font-black text-slate-700 ml-2 shrink-0">{val}<span className="font-normal text-slate-400 text-[9.5px]"> {pct}%</span></span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Monthly Trend ────────────────────────────────────────────────────────────

function MonthlyTrend({ data, isLoading }) {
  const hasData = data && data.some((d) => d.count > 0);

  const TT = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg">
        <p className="text-[10px] font-semibold text-slate-400">{label}</p>
        <p className="text-[15px] font-black text-indigo-700 mt-0.5">{payload[0]?.value} <span className="text-[10px] font-semibold text-slate-400">new</span></p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
          <TrendingUpIcon className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-slate-800 leading-none">Activity trend</p>
          <p className="text-[11px] text-slate-400 mt-0.5">New records, last 6 months</p>
        </div>
      </div>

      <div className="flex-1 min-h-[200px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="h-5 w-5 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
          </div>
        ) : !hasData ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
            <TrendingUp className="h-8 w-8" />
            <p className="text-[12px] font-semibold">No data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={data} margin={{ top: 8, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="aFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#4338ca" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#4338ca" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }} dy={6} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }} allowDecimals={false} width={28} />
              <Tooltip content={<TT />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1.5, strokeDasharray: "4 3" }} />
              <Area
                type="monotone" dataKey="count" name="New Records"
                stroke="#4338ca" strokeWidth={2} fill="url(#aFill)"
                dot={{ r: 3, fill: "#4338ca", stroke: "#fff", strokeWidth: 1.5 }}
                activeDot={{ r: 4.5, fill: "#4338ca", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ─── Module Breakdown Chart ───────────────────────────────────────────────────

function BreakdownChart({ modules, isLoading }) {
  const data = useMemo(() =>
    modules
      .filter((m) => m.available)
      .map((m) => ({
        name: m.label,
        pending: m.pending, inProgress: m.inProgress,
        completed: m.completed, delayed: m.delayed,
      }))
      .sort((a, b) =>
        (b.pending + b.inProgress + b.completed + b.delayed) -
        (a.pending + a.inProgress + a.completed + a.delayed)
      ),
    [modules]
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
          <BarChart3 className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-slate-800 leading-none">Module breakdown</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Records by module and status</p>
        </div>
      </div>

      <div className="flex-1 min-h-[260px]">
        {isLoading ? (
          <div className="space-y-2.5 pt-1">
            {[85, 60, 75, 50, 68, 45].map((w, i) => (
              <div key={i} className="h-3.5 rounded-full bg-slate-100 animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
            <BarChart3 className="h-8 w-8" />
            <p className="text-[12px] font-semibold">No data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(260, data.length * 40)}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }} barCategoryGap="32%">
              <CartesianGrid strokeDasharray="2 4" horizontal={false} stroke="#f8fafc" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={140} tick={{ fill: "#475569", fontSize: 10.5, fontWeight: 600 }} />
              <Tooltip cursor={{ fill: "rgba(248,250,252,0.7)" }} contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 10.5, fontWeight: 700, paddingTop: 8 }} />
              {STATUS_SEGMENTS.map((s, i) => (
                <Bar
                  key={s.key} dataKey={s.key} name={s.label}
                  stackId="s" fill={s.color} barSize={14}
                  radius={i === 0 ? [3,0,0,3] : i === STATUS_SEGMENTS.length - 1 ? [0,3,3,0] : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ─── Attention Panel ──────────────────────────────────────────────────────────

function AttentionPanel({ modules, isLoading }) {
  const navigate = useNavigate();
  const items = useMemo(
    () => modules.filter((m) => m.available && m.delayed > 0).sort((a, b) => b.delayed - a.delayed),
    [modules]
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
            <Flame className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-slate-800 leading-none">Needs attention</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Delayed or stuck records</p>
          </div>
        </div>
        {!isLoading && items.length > 0 && (
          <span className="text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full">
            {items.length} alert{items.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 rounded-xl bg-slate-50 animate-pulse" />)
        ) : items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-[13px] font-bold text-slate-700">All clear</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Every module is on track</p>
          </div>
        ) : (
          <AnimatePresence>
            {items.map((mod, i) => {
              const Icon = MODULE_ICONS[mod.icon];
              const acc  = ACCENTS[i % ACCENTS.length];
              return (
                <motion.button
                  key={mod.key}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  type="button"
                  onClick={() => navigate(mod.route)}
                  className="w-full flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/40 hover:bg-rose-50 px-3.5 py-2.5 text-left transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                >
                  <div className={`h-7 w-7 shrink-0 rounded-lg ${acc.iconBg} text-white flex items-center justify-center`}>
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-slate-800 truncate">{mod.label}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-md">{mod.delayed}</span>
                    <ChevronRight className="h-3 w-3 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

const RANK_STYLE = [
  { badge: "bg-amber-400 text-amber-950",  ring: "border-amber-200 bg-amber-50/60"  },
  { badge: "bg-slate-300 text-slate-700",  ring: "border-slate-200 bg-slate-50/60"  },
  { badge: "bg-orange-300 text-orange-950", ring: "border-orange-200 bg-orange-50/60" },
];

function Leaderboard({ leaderboard, isLoading }) {
  const data = useMemo(() =>
    (leaderboard || []).map((p) => ({ name: p.name, converted: p.converted, leads: p.leads })),
    [leaderboard]
  );
  const maxC = data.length > 0 ? Math.max(...data.map((d) => d.converted)) : 1;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
            <Trophy className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-slate-800 leading-none">Sales leaderboard</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Ranked by leads converted</p>
          </div>
        </div>
        {!isLoading && data.length > 0 && (
          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
            {data.length} reps
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 rounded bg-slate-100 animate-pulse w-3/4" />
                <div className="h-1.5 rounded-full bg-slate-100 animate-pulse" />
              </div>
              <div className="h-5 w-10 rounded bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-300 gap-2">
          <Trophy className="h-9 w-9" />
          <p className="text-[12px] font-semibold">No data yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((p, i) => {
            const barW = maxC > 0 ? Math.round((p.converted / maxC) * 100) : 0;
            const rank = RANK_STYLE[i];
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 border ${rank ? rank.ring : "border-transparent hover:bg-slate-50"} transition-colors`}
              >
                {/* Rank badge */}
                {rank ? (
                  <span className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-black ${rank.badge}`}>
                    {i + 1}
                  </span>
                ) : (
                  <span className="w-6 text-center shrink-0 text-[11px] font-bold text-slate-400">#{i + 1}</span>
                )}
                {/* Avatar */}
                <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[12px] font-black text-white ${
                  i === 0 ? "bg-indigo-700" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-amber-500" : "bg-slate-300"
                } shadow-sm`}>
                  {(p.name || "?").charAt(0).toUpperCase()}
                </div>
                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold text-slate-800 truncate leading-tight">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-600 transition-all duration-700" style={{ width: `${barW}%` }} />
                    </div>
                    <span className="text-[9.5px] text-slate-400 font-semibold shrink-0">{p.leads} leads</span>
                  </div>
                </div>
                {/* Count */}
                <span className="text-[15px] font-black text-indigo-700 shrink-0">{p.converted}</span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Summary strip ────────────────────────────────────────────────────────────

function SummaryStrip({ totals, modules, isLoading }) {
  const rate    = totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;
  const live    = modules.filter((m) => m.available).length;
  const urgent  = modules.filter((m) => m.available && m.delayed > 0).length;
  const waiting = totals.pending + totals.inProgress;

  const stats = [
    { label: "Completion",   val: `${rate}%`,    icon: Target,   color: "text-emerald-600" },
    { label: "Live modules", val: `${live}/${modules.length}`, icon: Wifi, color: "text-indigo-700" },
    { label: "Urgent",       val: urgent,         icon: Flame,    color: urgent > 0 ? "text-rose-600" : "text-emerald-600" },
    { label: "In queue",     val: waiting,        icon: Activity, color: "text-amber-600"  },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-3 shadow-sm">
      <div className="flex items-center gap-0 overflow-x-auto">
        {stats.map((s, i) => (
          <div key={s.label} className={`flex items-center gap-2.5 py-0.5 ${i < stats.length - 1 ? "pr-6 mr-6 border-r border-slate-100" : ""} shrink-0`}>
            <s.icon className={`h-3.5 w-3.5 shrink-0 ${s.color}`} />
            <div>
              <p className="text-[10.5px] font-semibold text-slate-400 leading-none">{s.label}</p>
              <p className={`text-[14px] font-black leading-tight mt-0.5 ${s.color}`}>
                {isLoading ? <span className="inline-block h-3.5 w-8 rounded bg-slate-100 animate-pulse" /> : s.val}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard() {
  const [modules, setModules]                     = useState([]);
  const [totals, setTotals]                       = useState(EMPTY_TOTALS);
  const [monthlyTrend, setMonthlyTrend]           = useState([]);
  const [todayCalls, setTodayCalls]               = useState(0);
  const [upcomingLeads, setUpcomingLeads]         = useState(0);
  const [ordersReceived, setOrdersReceived]       = useState(0);
  const [enquiriesReceived, setEnquiriesReceived] = useState(0);
  const [salesLeaderboard, setSalesLeaderboard]   = useState([]);
  const [fetchedAt, setFetchedAt]                 = useState(null);
  const [isLoading, setIsLoading]                 = useState(true);
  const [isRefreshing, setIsRefreshing]           = useState(false);
  const [error, setError]                         = useState(null);

  const isMounted  = useRef(true);
  const noMotion   = useReducedMotion();
  const clock      = useLiveClock();

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const loadData = useCallback(async ({ manual = false, silent = false } = {}) => {
    if (manual)       setIsRefreshing(true);
    else if (!silent) setIsLoading(true);
    try {
      const ov = await fetchDashboardOverview();
      if (!isMounted.current) return;
      setModules(ov?.modules                ?? []);
      setTotals(ov?.totals                  ?? EMPTY_TOTALS);
      setMonthlyTrend(ov?.monthlyTrend      ?? []);
      setTodayCalls(ov?.todayCalls          ?? 0);
      setUpcomingLeads(ov?.upcomingLeads    ?? 0);
      setOrdersReceived(ov?.ordersReceived  ?? 0);
      setEnquiriesReceived(ov?.enquiriesReceived ?? 0);
      setSalesLeaderboard(ov?.salesLeaderboard   ?? []);
      setFetchedAt(ov?.fetchedAt            ?? new Date());
      setError(null);
    } catch (e) {
      if (!isMounted.current) return;
      setError(e?.message || "Failed to load dashboard data.");
    } finally {
      if (!isMounted.current) return;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") loadData({ silent: true });
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadData]);

  const syncedLabel  = useRelativeTime(fetchedAt);
  const busy         = isLoading || isRefreshing;
  const hasModules   = modules.length > 0;
  const skels        = useMemo(() => Array.from({ length: 8 }, (_, i) => i), []);
  const pulseData    = { todayCalls, upcomingLeads, ordersReceived, enquiriesReceived };

  return (
    <div className="min-h-full">
      <motion.div
        variants={noMotion ? {} : listV}
        initial="hidden" animate="show"
        className="space-y-4 pb-6"
      >

        {/* ── Header ── */}
        <motion.div variants={itemV} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10.5px] font-semibold border border-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {clock.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                &nbsp;·&nbsp;
                {clock.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
              </span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
            <p className="text-[12px] font-medium text-slate-400 mt-0.5">
              Live overview — jump straight into what needs work.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {fetchedAt && !isLoading && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
                {isRefreshing
                  ? <RefreshCw className="h-3 w-3 animate-spin text-indigo-600" />
                  : <Wifi className="h-3 w-3 text-emerald-400" />
                }
                {isRefreshing ? "Syncing…" : `Synced ${syncedLabel}`}
              </span>
            )}
            <button
              type="button"
              onClick={() => loadData({ manual: true })}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-[13px] font-semibold px-3.5 py-2 shadow-sm shadow-indigo-200 transition-all hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <RefreshCwIcon className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Syncing" : "Refresh"}
            </button>
          </div>
        </motion.div>

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              role="alert"
              className="flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                <p className="text-[12.5px] font-semibold text-rose-700">{error}</p>
              </div>
              <button
                type="button" onClick={() => loadData({ manual: true })}
                className="shrink-0 text-[11px] font-bold text-rose-600 hover:text-rose-700 border border-rose-200 bg-white rounded-lg px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Summary strip ── */}
        <motion.div variants={itemV}>
          <SummaryStrip totals={totals} modules={modules} isLoading={isLoading} />
        </motion.div>

        {/* ── KPI cards ── */}
        <motion.div variants={itemV}>
          <Section label="Overview" />
          <HeroCards totals={totals} isLoading={isLoading} />
        </motion.div>

        {/* ── Sales pulse ── */}
        <motion.div variants={itemV}>
          <Section label="Sales pulse" />
          <SalesPulse data={pulseData} isLoading={isLoading} />
        </motion.div>

        {/* ── Module grid ── */}
        <motion.div variants={itemV}>
          <Section label="Module status" count={hasModules && !isLoading ? modules.length : undefined} />
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {skels.map((k) => <Skel key={k} h="h-[158px]" />)}
            </div>
          ) : hasModules ? (
            <motion.div
              variants={noMotion ? {} : listV}
              initial="hidden" animate="show"
              className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {modules.map((m, i) => <ModuleCard key={m.key} mod={m} idx={i} />)}
            </motion.div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
              <Layers className="h-8 w-8 text-slate-200 mx-auto mb-2.5" />
              <p className="text-[13px] font-bold text-slate-600">No module data yet</p>
              <p className="text-[11px] text-slate-400 mt-1">Records will appear once synced.</p>
            </div>
          )}
        </motion.div>

        {/* ── Charts row 1 ── */}
        <motion.div variants={itemV} className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          <StatusDonut   totals={totals}     isLoading={isLoading} />
          <MonthlyTrend  data={monthlyTrend} isLoading={isLoading} />
        </motion.div>

        {/* ── Charts row 2 ── */}
        <motion.div variants={itemV} className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          <BreakdownChart  modules={modules} isLoading={isLoading} />
          <AttentionPanel  modules={modules} isLoading={isLoading} />
        </motion.div>

        {/* ── Leaderboard ── */}
        <motion.div variants={itemV}>
          <Leaderboard leaderboard={salesLeaderboard} isLoading={isLoading} />
        </motion.div>

      </motion.div>
    </div>
  );
}

export default Dashboard;