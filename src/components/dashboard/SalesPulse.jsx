"use client"

import { PhoneCall, CalendarClock, ShoppingBag, Inbox } from "lucide-react"

function SalesPulse({ todayCalls, upcomingLeads, ordersReceived, enquiriesReceived, isLoading }) {
  const cards = [
    {
      label: "Today's Calls",
      value: todayCalls,
      icon: PhoneCall,
      accent: "text-indigo-600",
      iconBg: "bg-indigo-50 text-indigo-600 border border-indigo-100",
    },
    {
      label: "Upcoming Leads",
      value: upcomingLeads,
      icon: CalendarClock,
      accent: "text-amber-600",
      iconBg: "bg-amber-50 text-amber-600 border border-amber-100",
    },
    {
      label: "Orders Received",
      value: ordersReceived,
      icon: ShoppingBag,
      accent: "text-emerald-600",
      iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    },
    {
      label: "Enquiries Received",
      value: enquiriesReceived,
      icon: Inbox,
      accent: "text-sky-600",
      iconBg: "bg-sky-50 text-sky-600 border border-sky-100",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest truncate">{card.label}</p>
              <h3 className={`text-3xl font-extrabold mt-2 tracking-tight ${card.accent}`}>
                {isLoading ? (
                  <span className="inline-block h-8 w-16 rounded-lg bg-slate-100 animate-pulse align-middle" />
                ) : (
                  card.value
                )}
              </h3>
            </div>
            <div className={`p-3 rounded-xl shrink-0 ${card.iconBg}`}>
              <card.icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default SalesPulse
