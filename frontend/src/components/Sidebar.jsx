import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FlaskConical, Train, Map, BarChart3, Settings } from 'lucide-react'

// Full nav catalogue with optional role restrictions.
// `roles: null`  → visible to every authenticated user.
// `roles: [...]` → only visible when userRole is in the list.
const NAV_CATALOGUE = [
  { path: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard, roles: null },
  { path: '/simulation', label: 'Simulation',  icon: FlaskConical,    roles: ['admin', 'controller'] },
  { path: '/trains',     label: 'Train List',  icon: Train,           roles: null },
  { path: '/map',        label: 'Section Map', icon: Map,             roles: null },
  { path: '/reports',    label: 'Reports',     icon: BarChart3,       roles: null },
  { path: '/settings',   label: 'Settings',    icon: Settings,        roles: ['admin'] },
]

function Sidebar() {
  const userRole = localStorage.getItem('trax_role') || 'controller'

  // Filter the catalogue down to what this role is allowed to see.
  const navItems = NAV_CATALOGUE.filter(
    ({ roles }) => roles === null || roles.includes(userRole)
  )

  return (
    <aside style={{ width: 220, background: 'linear-gradient(180deg, #0f1f35 0%, #162840 100%)', minHeight: '100%', display: 'flex', flexDirection: 'column', padding: '24px 0' }}>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px' }}>
        {navItems.map(({ path, label, icon }) => {
          const Icon = icon   // uppercase alias required for JSX component rendering
          return (
            <NavLink
              key={path}
              to={path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.55)',
                background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                transition: 'all 0.15s ease',
              })}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto', padding: '0 16px' }}>
        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>System</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>TTC-AI v2.4.1</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }}></div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>All systems online</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar