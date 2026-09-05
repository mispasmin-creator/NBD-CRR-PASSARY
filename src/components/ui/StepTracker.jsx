"use client"

import { Check } from "lucide-react"

/**
 * Horizontal numbered step tracker for multi-step workflow entities.
 * `steps`: array of label strings, in order.
 * `currentStep`: label of the step currently active (matches an entry in `steps`).
 * A step before the current one is treated as done (checkmark, indigo-700),
 * the current step is highlighted (solid indigo-700), later steps are slate.
 * Follows design system: indigo-700 brand, rounded-lg, sentence-case labels.
 */
function StepTracker({ steps, currentStep }) {
  const currentIdx = steps.indexOf(currentStep)

  return (
    <div className="flex items-center w-full overflow-x-auto py-1">
      {steps.map((step, i) => {
        const isDone    = currentIdx !== -1 && i < currentIdx
        const isCurrent = i === currentIdx
        const isFuture  = currentIdx === -1 || i > currentIdx

        return (
          <div key={step} className="flex items-center shrink-0 last:flex-1">
            <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold shrink-0 transition-colors ${
                  isDone
                    ? "bg-indigo-700 text-white"
                    : isCurrent
                    ? "bg-indigo-700 text-white shadow-sm ring-4 ring-indigo-100"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-semibold text-center leading-tight px-1 ${
                  isCurrent ? "text-indigo-700" : isFuture ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 min-w-[20px] mx-1 -mt-4 rounded-full ${isDone ? "bg-indigo-700" : "bg-slate-200"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default StepTracker
