import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'
import { apiFetch } from '../utils/api'

function Signup() {
  const navigate = useNavigate()

  // ── Form state ────────────────────────────────────────────────────────────
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')
  const [confirm,  setConfirm]    = useState('')
  const [role,     setRole]       = useState('viewer')
  const [showPass, setShowPass]   = useState(false)
  const [showConf, setShowConf]   = useState(false)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Client-side validation
    if (!username.trim() || !password || !confirm) {
      setError('All fields are required.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setIsLoading(true)
    try {
      const res = await apiFetch('/api/v1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, role }),
      })

      if (!res) return

      const data = await res.json()

      if (!res.ok) {
        // The FastAPI backend returns { detail: "..." } on errors
        setError(data.detail ?? `Registration failed (${res.status}).`)
        return
      }

      // Success — show toast, then redirect to /login after a short delay
      setSuccess('Account created! Redirecting to login…')
      setTimeout(() => navigate('/login'), 1800)
    } catch {
      setError('Could not connect to the server. Is the backend running?')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Shared input style (matches Login.jsx) ────────────────────────────────
  const inputBase = {
    width: '100%',
    border: '1.5px solid #e5e7eb',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'DM Sans, sans-serif',
    color: '#0f1f35',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  }
  const focus = (e) => (e.target.style.borderColor = '#2563eb')
  const blur  = (e) => (e.target.style.borderColor = '#e5e7eb')

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1f35 0%, #1d3454 60%, #243f68 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.1)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(255,255,255,0.15)', fontSize: 28 }}>🚆</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>Train Traffic Control System</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Indian Railways — Smart Traffic Management</p>
        </div>

        {/* ── Card ────────────────────────────────────────────────────────── */}
        <div style={{ background: '#ffffff', borderRadius: 20, padding: 36, boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f1f35', marginBottom: 24 }}>Create New Account</h2>

          {/* Error banner */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13, borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Success toast */}
          {success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: 13, borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={15} />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Username</label>
              <input
                id="signup-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. rajesh_kumar"
                style={inputBase}
                onFocus={focus}
                onBlur={blur}
                autoComplete="username"
              />
            </div>

            {/* Role */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Role</label>
              <select
                id="signup-role"
                value={role}
                onChange={e => setRole(e.target.value)}
                style={{ ...inputBase, background: '#fff', cursor: 'pointer' }}
                onFocus={focus}
                onBlur={blur}
              >
                <option value="viewer">Viewer — read-only access</option>
                <option value="controller">Controller — can run optimizations</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="signup-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  style={{ ...inputBase, paddingRight: 42 }}
                  onFocus={focus}
                  onBlur={blur}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="signup-confirm"
                  type={showConf ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  style={{ ...inputBase, paddingRight: 42 }}
                  onFocus={focus}
                  onBlur={blur}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConf(!showConf)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="signup-submit"
              type="submit"
              disabled={isLoading || !!success}
              style={{
                background: (isLoading || success) ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#fff', border: 'none', borderRadius: 12, padding: '13px',
                fontSize: 14, fontWeight: 700,
                cursor: (isLoading || success) ? 'not-allowed' : 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
                marginTop: 4,
                transition: 'background 0.2s',
              }}
            >
              {isLoading ? '⏳ Creating Account…' : success ? '✓ Done' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 20 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 20 }}>
          © 2025 Ministry of Railways — Government of India
        </p>
      </div>
    </div>
  )
}

export default Signup