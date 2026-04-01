import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

function Layout({ onLogout }) {
  const [expressDelay, setExpressDelay] = React.useState('')
  const [freightDelay, setFreightDelay] = React.useState('')
  const [optimizedSchedule, setOptimizedSchedule] = React.useState(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleOptimize = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('trax_token')}`,
        },
        body: JSON.stringify({
          express_injected_delay: parseInt(expressDelay) || 0,
          freight_injected_delay: parseInt(freightDelay) || 0
        })
      })
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f0f4f8' }}>
      <Navbar onLogout={onLogout} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f0f4f8' }}>
          <Outlet context={{ expressDelay, setExpressDelay, freightDelay, setFreightDelay, optimizedSchedule, isLoading, handleOptimize }} />
        </main>
      </div>
    </div>
  )
}

export default Layout