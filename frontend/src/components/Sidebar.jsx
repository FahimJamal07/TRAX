import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FlaskConical, Train, Map, BarChart3, Settings, TrainFront, ChevronLeft, ChevronRight } from 'lucide-react'

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

function Sidebar({ isSidebarCollapsed, setIsSidebarCollapsed }) {
  const userRole = localStorage.getItem('trax_role') || 'controller'

  // Filter the catalogue down to what this role is allowed to see.
  const navItems = NAV_CATALOGUE.filter(
    ({ roles }) => roles === null || roles.includes(userRole)
  )

  return (
    <aside className="sidebar-root" style={{ width: isSidebarCollapsed ? 80 : 220, background: 'linear-gradient(180deg, #0f1f35 0%, #162840 100%)', minHeight: '100%', display: 'flex', flexDirection: 'column', padding: '24px 0', transition: 'width 300ms ease-in-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'space-between', gap: 10, padding: isSidebarCollapsed ? '0 8px 18px 8px' : '0 16px 18px 16px', marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {!isSidebarCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(37,99,235,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59,130,246,0.35)' }}>
              <TrainFront className="w-8 h-8 text-blue-400" strokeWidth={1.5} color='#ffffff'/>
            </div>
            <div>
              <p style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700, lineHeight: 1.1 }}>Control Panel</p>
            </div>
          </div>
        )}
        {isSidebarCollapsed && (
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(37,99,235,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59,130,246,0.35)' }}>
            <TrainFront className="w-8 h-8 text-blue-400" strokeWidth={1.5} color='#ffffff' />
          </div>
        )}
      </div>

      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        style={{
          margin: '0 16px 14px 16px',
          alignSelf: isSidebarCollapsed ? 'center' : 'flex-end',
          width: 32,
          height: 32,
          borderRadius: 8,
          border: '1px solid rgba(148,163,184,0.25)',
          background: 'rgba(15,23,42,0.35)',
          color: '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(51,65,85,0.8)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(15,23,42,0.35)'
        }}
        aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: isSidebarCollapsed ? '0 8px' : '0 12px' }}>
        {navItems.map(({ path, label, icon }) => {
          const Icon = icon   // uppercase alias required for JSX component rendering
          return (
            <NavLink
              key={path}
              to={path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                gap: 12,
                padding: isSidebarCollapsed ? '11px 8px' : '11px 14px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.55)',
                background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                transition: 'all 0.15s ease',
              })}
              title={isSidebarCollapsed ? label : undefined}
            >
              <Icon size={17} />
              {!isSidebarCollapsed && <span>{label}</span>}
            </NavLink>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto', padding: isSidebarCollapsed ? '0 8px' : '0 16px' }}>
        {!isSidebarCollapsed ? (
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>System</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>TTC-AI v2.4.1</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }}></div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>All systems online</span>
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 8px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }}></div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar