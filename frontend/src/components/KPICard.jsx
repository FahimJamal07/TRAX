import React from 'react'

function KPICard({ title, value, unit, subtitle, icon, iconBg, valueColor, className = '' }) {
  return (
    <div className={`surface-card kpi ${className}`.trim()} style={{
      borderRadius: 16,
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: iconBg || '#eff6ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, flexShrink: 0,
      }}>
        {React.isValidElement(icon)
          ? React.cloneElement(icon, {
              size: icon.props.size || 22,
              strokeWidth: icon.props.strokeWidth || 1.8,
            })
          : icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 12, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{title}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: valueColor || '#0f1f35', lineHeight: 1 }}>{value}</span>
          {unit && <span style={{ fontSize: 14, fontWeight: 500, color: valueColor || '#64748b' }}>{unit}</span>}
        </div>
        {subtitle && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{subtitle}</p>}
      </div>
    </div>
  )
}

export default KPICard