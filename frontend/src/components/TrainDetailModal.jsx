import React from 'react'
import { X } from 'lucide-react'
import TagBadge from './TagBadge'

const formatTime = (value) => {
  if (!value) return '--'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function TrainDetailModal({ train, onClose }) {
  if (!train) return null

  const scheduledTime = formatTime(train.scheduledTime || train.scheduled_departure || train.departure_time)
  const actualTime = formatTime(train.actualTime || train.expected_destination_arrival || train.arrival_time)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,31,53,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
      <div className="surface-modal" style={{ borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f1f35' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Train {train.id}</h2>
            <TagBadge label={train.type} />
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              ['Priority', train.priority],
              ['Status', train.status],
              ['Total Delay', train.delay > 0 ? `+${train.delay} min` : 'On Time'],
              ['Route', `${train.from || train.source} → ${train.to || train.destination}`],
              ['Scheduled', scheduledTime],
              ['Actual', actualTime],
            ].map(([label, val]) => (
              <div key={label} className="modal-info-row bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50 p-3">
                <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding:16  }}>{label}</p>
                <p
                  className={label === 'Total Delay' && train.delay > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    marginTop: 4,
                    padding: 12,
                    color: label === 'Scheduled' || label === 'Actual' ? '#60a5fa' : undefined,
                  }}
                >
                  {val || '--'}
                </p>
              </div>
            ))}
          </div>

          <div className={train.delay > 0 ? 'status-footer status-footer-danger' : 'status-footer status-footer-success'} style={{ padding: '12px 16px' }}>
            <p className={train.delay > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'} style={{ fontSize: 12, fontWeight: 600 }}>Optimization Impact</p>
            <p className={train.delay > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'} style={{ fontSize: 12, marginTop: 4 }}>
              After re-optimization, estimated delay reduced from {train.delay} min to {Math.max(0, train.delay - 5)} min.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrainDetailModal