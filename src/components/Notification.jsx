function Notification({ message, type = "info" }) {
  const config = {
    success: { bar: "bg-emerald-500", icon: "✓", iconBg: "bg-emerald-100 text-emerald-700", label: "Success" },
    error: { bar: "bg-red-500", icon: "✕", iconBg: "bg-red-100 text-red-700", label: "Error" },
    warning: { bar: "bg-amber-400", icon: "!", iconBg: "bg-amber-100 text-amber-700", label: "Warning" },
    info: { bar: "bg-sky-500", icon: "i", iconBg: "bg-sky-100 text-sky-700", label: "Info" },
  }
  const c = config[type] || config.info

  return (
    <div className="fixed top-5 right-5 z-[9999] animate-slide-down">
      <div className="flex items-stretch bg-white border border-slate-200 rounded-xl shadow-xl shadow-black/8 overflow-hidden min-w-[300px] max-w-sm">
        {/* Left accent bar */}
        <div className={`w-1.5 shrink-0 ${c.bar}`} />
        {/* Icon */}
        <div className={`flex items-center justify-center w-10 shrink-0 ${c.iconBg}`}>
          <span className="text-[13px] font-black leading-none">{c.icon}</span>
        </div>
        {/* Content */}
        <div className="flex-1 px-4 py-3.5">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{c.label}</p>
          <p className="text-[13px] font-medium text-slate-800 leading-snug">{message}</p>
        </div>
      </div>
    </div>
  )
}

export default Notification
