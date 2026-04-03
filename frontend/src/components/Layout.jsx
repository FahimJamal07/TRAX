import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { apiFetch } from '../utils/api'

function Layout({ onLogout }) {
  const [expressDelay, setExpressDelay] = React.useState('')
  const [freightDelay, setFreightDelay] = React.useState('')
  const [optimizedSchedule, setOptimizedSchedule] = React.useState(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false)
  const [isDarkMode, setIsDarkMode] = React.useState(localStorage.getItem('theme') === 'dark')

  React.useEffect(() => {
    const root = window.document.documentElement
    if (isDarkMode) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDarkMode])

  const handleOptimize = async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch('/api/v1/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          express_injected_delay: parseInt(expressDelay) || 0,
          freight_injected_delay: parseInt(freightDelay) || 0
        })
      })
      if (!res) return
      const data = await res.json()
      if (data.status === 'success') {
        localStorage.setItem('trax_live_schedule', JSON.stringify(data.schedule));
        window.dispatchEvent(new Event('trax_schedule_update'));
        setOptimizedSchedule(data.schedule)
      } else {
        alert(data.message)
      }
    } catch (err) {
      console.error(err)
      alert('Error fetching optimized schedule.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f0f4f8' }}>
      <Navbar onLogout={onLogout} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
        />
        <main className="app-main" style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f0f4f8' }}>
          <Outlet context={{ expressDelay, setExpressDelay, freightDelay, setFreightDelay, optimizedSchedule, isLoading, handleOptimize, isDarkMode }} />
        </main>
      </div>
    </div>
  )
}

export default Layout