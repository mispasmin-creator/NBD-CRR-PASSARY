"use client"

// Small initials avatar for a person's name — same visual idea as the Dashboard
// leaderboard avatars and the Sidebar user-initial circle, generalized so any
// table can drop it next to a Sales Person / Owner name.
const PALETTE = [
  "bg-indigo-600", "bg-cyan-700", "bg-teal-700", "bg-violet-700",
  "bg-pink-700", "bg-orange-600", "bg-emerald-600", "bg-amber-600",
]

function colorForName(name) {
  const str = String(name || "").trim()
  if (!str) return "bg-slate-300"
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

function Avatar({ name, size = "sm" }) {
  const initial = String(name || "").trim().charAt(0).toUpperCase() || "?"
  const sizeCls = size === "xs" ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-[11px]"
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${sizeCls} ${colorForName(name)}`}
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}

export default Avatar
