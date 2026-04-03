import React from 'react'

function AlertPanel({ alerts = [] }) {
  const severityConfig = {
    high: {
      container: 'alert-surface alert-critical',
      text: 'text-red-600 dark:text-red-400',
      badge: 'alert-surface alert-critical',
      dot: '#ef4444',
      subtitle: 'text-slate-500 dark:text-slate-400'
    },
    medium: {
      container: 'alert-surface alert-warning',
      text: 'text-amber-700 dark:text-amber-400',
      badge: 'alert-surface alert-warning',
      dot: '#f59e0b',
      subtitle: 'text-slate-500 dark:text-slate-400'
    },
    low: {
      container: 'alert-surface alert-success',
      text: 'text-emerald-600 dark:text-emerald-400',
      badge: 'alert-surface alert-success',
      dot: '#10b981',
      subtitle: 'text-slate-500 dark:text-slate-400'
    },
  }

  return (
    <div className="surface-card surface-panel" style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      <div className="text-slate-900 dark:text-white" style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Alerts & Conflicts</h3>
        <span className={severityConfig.high.badge} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
          {alerts.filter(a => a.severity === 'high').length} Critical
        </span>
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
        {alerts.length === 0 ? (
          <div className="text-slate-500 dark:text-slate-400" style={{ padding: '20px', textAlign: 'center', fontSize: 13 }}>
            No active alerts
          </div>
        ) : (
          alerts.map(alert => {
            const config = severityConfig[alert.severity]
            return (
              <div key={alert.id} className={config.container} style={{ padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: config.dot, marginTop: 4, flexShrink: 0 }}></div>
                <div>
                  <p className={config.text} style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4 }}>{alert.message}</p>
                  <p className={config.subtitle} style={{ fontSize: 11, marginTop: 3 }}>{alert.time}</p>
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