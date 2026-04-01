import React from 'react'
import { X } from 'lucide-react'

function TrainDetailModal({ train, onClose }) {
  if (!train) return null

  const typeColor = { Express: ['#fef2f2','#ef4444'], Passenger: ['#eff6ff','#2563eb'], Freight: ['#fffbeb','#f59e0b'], Mail: ['#f0fdf4','#16a34a'] }
  const [bg, color] = typeColor[train.type] || ['#f8fafc','#64748b']

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,31,53,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f1f35' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Train {train.id}</h2>
            <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{train.type}</span>
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
              ['Scheduled', train.scheduledTime],
              ['Actual', train.actualTime],
            ].map(([label, val]) => (
              <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: label === 'Total Delay' && train.delay > 0 ? '#ef4444' : '#0f1f35', marginTop: 4 }}>{val}</p>
              </div>
            ))}
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 16px' }}>
            <p style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>Optimization Impact</p>
            <p style={{ fontSize: 12, color: '#3b82f6', marginTop: 4 }}>
              After re-optimization, estimated delay reduced from {train.delay} min to {Math.max(0, train.delay - 5)} min.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrainDetailModal