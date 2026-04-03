import React from 'react'
import { createPortal } from 'react-dom'

function TrackTooltip({ open, x, y, data, isDarkMode }) {
  if (!open || !data) return null

  const margin = 12
  const offset = 14
  const tooltipWidth = 248
  const tooltipHeight = 126
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = x + offset
  let top = y - tooltipHeight - offset

  if (left + tooltipWidth > vw - margin) left = vw - tooltipWidth - margin
  if (left < margin) left = margin

  if (top < margin) top = y + offset
  if (top + tooltipHeight > vh - margin) top = Math.max(margin, vh - tooltipHeight - margin)

  const warning = data.status === 'Occupied'
  const bgClass = warning
    ? (isDarkMode ? 'bg-red-900/20 border-red-800 text-slate-200 shadow-none' : 'bg-red-50 border-red-200 text-slate-700 shadow-sm')
    : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200 shadow-none' : 'bg-white border-slate-200 text-slate-700 shadow-sm')

  return createPortal(
    <div
      role="tooltip"
      style={{ zIndex: 1200, position: 'fixed', left, top, width: tooltipWidth }}
      className={`pointer-events-none rounded-xl border px-4 py-3 ${bgClass}`}
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Mainline Context</p>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <span className="text-slate-500 dark:text-slate-400">Track Segment ID</span>
        <span className="text-right font-semibold">{data.segmentId}</span>

        <span className="text-slate-500 dark:text-slate-400">Status</span>
        <span className="text-right font-semibold">{data.status}</span>

        <span className="text-slate-500 dark:text-slate-400">Speed Multiplier</span>
        <span className="text-right font-semibold">{data.speedMultiplier}</span>
      </div>
    </div>,
    document.body
  )
}

export default TrackTooltip
