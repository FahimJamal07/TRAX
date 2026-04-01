import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) { setError('Please enter username and password.'); return }
    setError('')
    setIsLoading(true)

    try {
      // FastAPI's OAuth2PasswordRequestForm expects application/x-www-form-urlencoded
      const body = new URLSearchParams()
      body.append('username', username)
      body.append('password', password)

      const res = await fetch('http://127.0.0.1:8000/api/v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })

      if (res.status === 401) {
        setError('Invalid credentials. Please check your username and password.')
        return
      }
      if (!res.ok) {
        setError(`Server error (${res.status}). Please try again.`)
        return
      }

      const data = await res.json()
      localStorage.setItem('trax_token', data.access_token)
      // The backend now includes "role" in the token response.
      // Store it separately so Sidebar and ProtectedRoute can read it
      // without having to decode the JWT on the client.
      localStorage.setItem('trax_role', data.role ?? 'controller')
      // Hard redirect so ProtectedRoute re-evaluates with the new token
      window.location.href = '/dashboard'
    } catch (err) {
      setError('Could not connect to the server. Is the backend running?')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1f35 0%, #1d3454 60%, #243f68 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.1)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(255,255,255,0.15)', fontSize: 28 }}>🚆</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>Train Traffic Control System</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Indian Railways — Smart Traffic Management</p>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 20, padding: 36, boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f1f35', marginBottom: 24 }}>Sign In to Your Account</h2>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13, borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username"
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'DM Sans, sans-serif', color: '#0f1f35', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '11px 40px 11px 14px', fontSize: 14, outline: 'none', fontFamily: 'DM Sans, sans-serif', color: '#0f1f35' }}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="rem" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: '#2563eb', width: 15, height: 15 }} />
              <label htmlFor="rem" style={{ fontSize: 13, color: '#64748b' }}>Remember me on this device</label>
            </div>
            <button type="submit" disabled={isLoading} style={{ background: isLoading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 4px 12px rgba(37,99,235,0.4)', marginTop: 4 }}>
              {isLoading ? '⏳ Signing in…' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 20 }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Create Account</Link>
          </p>
        </div>
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 20 }}>© 2025 Ministry of Railways — Government of India</p>
      </div>
    </div>
  )
}

export default Login