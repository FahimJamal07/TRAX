import React, { useState, useEffect } from 'react'
import { Bell, ChevronDown, LogOut, Train } from 'lucide-react'
import { apiFetch } from '../utils/api'

function Navbar({ onLogout }) {
  const [time, setTime] = useState(new Date())
  const [showMenu, setShowMenu] = useState(false)
  const [user, setUser] = useState({ name: 'User', role: 'Operator', initials: 'U' })
  const [showNotifications, setShowNotifications] = useState(false)
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('trax_user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        const initials = userData.name
          ?.split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase() || 'U'
        setUser({
          name: userData.name || 'User',
          role: userData.role || 'Operator',
          initials: initials
        })
      }
    } catch (e) {
      console.error('Error reading user from sessionStorage:', e)
    }
  }, [])

  // Fetch live alerts from trains with delays
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await apiFetch('/api/v1/trains')
        if (!res) return
        if (!res.ok) return
        const trains = await res.json()

        // Generate alerts for any train currently experiencing a delay
        const activeAlerts = trains
          .filter(t => t.delay > 0)
          .map(t => ({
            id: t.id,
            message: `Train ${t.id} is experiencing a ${t.delay} minute delay.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }))

        setAlerts(activeAlerts)
      } catch (err) {
        console.error("Failed to fetch notification telemetry", err)
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, 5000)
    return () => clearInterval(interval)
  }, [])

  const formatted = time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' | ' + time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase()

  return (
    <header style={{
      background: 'linear-gradient(135deg, #0f1f35 0%, #1d3454 100%)',
      padding: '0 28px',
      height: 68,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 16px rgba(15,31,53,0.3)',
      position: 'relative',
      zIndex: 10,
    }}>
      {/* LEFT: Logo + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 44, height: 44,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          <Train size={22} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
            Train Traffic Control System
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>
            Real-Time Train Scheduling & Optimization
          </p>
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
          <span style={{ fontSize: 13 }}>🕐</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>{formatted}</span>
        </div>

        {/* Bell */}
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 0,
            }}
          >
            <Bell size={20} color="rgba(255,255,255,0.7)" />
          </button>
          {alerts.length > 0 && (
            <span style={{
              position: 'absolute', top: -6, right: -6,
              background: '#ef4444', color: '#fff',
              fontSize: 9, fontWeight: 700,
              width: 16, height: 16, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{alerts.length}</span>
          )}

          {/* Notification Dropdown */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: 8,
              width: 320,
              background: '#ffffff',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              border: '1px solid #e5e7eb',
              zIndex: 100,
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                background: '#1e293b',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ color: '#ffffff', fontWeight: 700, fontSize: 14 }}>Network Alerts</span>
                <span style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  borderRadius: 9999,
                  fontWeight: 700,
                }}>{alerts.length} Critical</span>
              </div>

              {/* Alert List */}
              <div style={{ maxHeight: 320, overflowY: 'auto', background: '#f8fafc' }}>
                {alerts.length === 0 ? (
                  <div style={{
                    padding: 24,
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: 13,
                    fontWeight: 500,
                  }}>
                    All systems nominal. No active delays.
                  </div>
                ) : (
                  alerts.map((alert, index) => (
                    <div
                      key={index}
                      style={{
                        padding: 16,
                        borderBottom: '1px solid #e2e8f0',
                        cursor: 'default',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 4,
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{alert.id} Delay</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{alert.time}</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#64748b' }}>{alert.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {alerts.length > 0 && (
                <div style={{
                  padding: 8,
                  background: '#ffffff',
                  borderTop: '1px solid #e2e8f0',
                  textAlign: 'center',
                }}>
                  <button
                    onClick={() => setAlerts([])}
                    style={{
                      fontSize: 12,
                      color: '#64748b',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      transition: 'color 0.2s',
                      padding: 4,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#1e293b'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                  >
                    Acknowledge All
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', position: 'relative' }}
          onClick={() => setShowMenu(!showMenu)}
        >
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, color: '#fff',
            border: '2px solid rgba(255,255,255,0.2)',
          }}>{user.initials}</div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{user.name}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{user.role}</span>
          </div>
          <ChevronDown size={15} color="rgba(255,255,255,0.6)" />

          {showMenu && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 8,
              background: '#fff', borderRadius: 12, padding: 8,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)', minWidth: 180,
              border: '1px solid #e5e7eb', zIndex: 100,
            }}>
              <button
                onClick={onLogout}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 8, border: 'none',
                  background: 'transparent', cursor: 'pointer', color: '#ef4444',
                  fontSize: 13, fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
                }}
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar