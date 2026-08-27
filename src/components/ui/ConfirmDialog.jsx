"use client"

import { AlertTriangle, CheckCircle2, X } from "lucide-react"

/**
 * Generic confirmation modal for destructive/consequential actions
 * (delete, approve, reject, cancel, etc.)
 *
 * @param {boolean} open
 * @param {"danger"|"success"|"default"} tone
 * @param {string} title
 * @param {string} message
 * @param {string} confirmLabel
 * @param {string} cancelLabel
 * @param {boolean} isLoading
 * @param {() => void} onConfirm
 * @param {() => void} onCancel
 */
function ConfirmDialog({
  open,
  tone = "default",
  title = "Are you sure?",
  message = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  const toneStyles = {
    danger: {
      iconBg: "bg-rose-50 text-rose-600",
      Icon: AlertTriangle,
      confirmBtn: "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500/30",
    },
    success: {
      iconBg: "bg-emerald-50 text-emerald-600",
      Icon: CheckCircle2,
      confirmBtn: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/30",
    },
    default: {
      iconBg: "bg-sky-50 text-sky-600",
      Icon: AlertTriangle,
      confirmBtn: "bg-sky-600 hover:bg-sky-700 focus:ring-sky-500/30",
    },
  }
  const { iconBg, Icon, confirmBtn } = toneStyles[tone] || toneStyles.default

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={() => !isLoading && onCancel && onCancel()}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 p-6">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            {message && <p className="mt-1 text-sm text-gray-500">{message}</p>}
          </div>
          <button
            type="button"
            onClick={() => !isLoading && onCancel && onCancel()}
            className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end gap-3 rounded-b-2xl bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:opacity-60 cursor-pointer ${confirmBtn}`}
          >
            {isLoading && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {isLoading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
