import React from 'react'

function AlertPanel({ alerts = [] }) {
  const cfg = {
    high:   { bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', text: '#b91c1c' },
    medium: { bg: '#fffbeb', border: '#fed7aa', dot: '#f59e0b', text: '#b45309' },
    low:    { bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6', text: '#1d4ed8' },
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f1f35' }}>Alerts & Conflicts</h3>
        <span style={{ background: '#fef2f2', color: '#ef4444', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: '1px solid #fecaca' }}>
          {alerts.filter(a => a.severity === 'high').length} Critical
        </span>
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
        {alerts.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            No active alerts
          </div>
        ) : (
          alerts.map(alert => {
            const c = cfg[alert.severity]
            return (
              <div key={alert.id} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, marginTop: 4, flexShrink: 0 }}></div>
                <div>
                  <p style={{ fontSize: 12, color: c.text, fontWeight: 500, lineHeight: 1.4 }}>{alert.message}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{alert.time}</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default AlertPanel