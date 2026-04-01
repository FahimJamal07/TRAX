import React, { useState } from 'react'
import { apiFetch } from '../utils/api'

export default function Settings() {
  const [s, setS] = useState(() => {
    const savedWeights = localStorage.getItem('trax_weights');
    const parsedWeights = savedWeights ? JSON.parse(savedWeights) : { express: 3, passenger: 2, freight: 1 };
    return {
      lineType: 'single',
      headway: 5,
      capacity: 3,
      expW: parsedWeights.express || 3,
      pasW: parsedWeights.passenger || 2,
      frtW: parsedWeights.freight || 1,
      mode: 'balanced'
    };
  });
  const [saved, setSaved] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const set = (k, v) => setS(p => ({ ...p, [k]: v }))

  const handleSave = () => {
    localStorage.setItem('trax_weights', JSON.stringify({
      express: s.expW,
      passenger: s.pasW,
      freight: s.frtW
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // Calls the real backend reset endpoint, wipes localStorage, then
  // forces a full page reload so every component re-fetches clean data.
  const handleReset = async () => {
    setIsResetting(true)
    try {
      const res = await apiFetch('/api/v1/reset', {
        method: 'POST',
      })
      if (!res) return
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      // Belt-and-braces: clear any residual localStorage artefacts
      localStorage.removeItem('trax_live_schedule')
      window.location.reload()
    } catch (err) {
      console.error('[Settings] Reset failed:', err)
      alert(`Reset failed: ${err.message}`)
      setIsResetting(false)
    }
  }

  const card = { background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', padding: 28, marginBottom: 0 }
  const inp = { border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif', width: '100%' }
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f1f35' }}>System Settings</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Configure network parameters and optimization behavior</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Section Config */}
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f1f35', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>Section Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={lbl}>Line Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['single', 'double'].map(t => (
                  <button key={t} onClick={() => set('lineType', t)} style={{ flex: 1, padding: '9px', borderRadius: 10, border: `1.5px solid ${s.lineType === t ? '#2563eb' : '#e5e7eb'}`, background: s.lineType === t ? '#eff6ff' : '#fff', color: s.lineType === t ? '#2563eb' : '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>Headway Time (min)</label>
              <input type="number" value={s.headway} onChange={e => set('headway', e.target.value)} style={inp} onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>
            <div>
              <label style={lbl}>Section Capacity</label>
              <input type="number" value={s.capacity} onChange={e => set('capacity', e.target.value)} style={inp} onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>
          </div>
        </div>

        {/* Priority Weights */}
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f1f35', marginBottom: 6, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>Priority Weights</h3>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Higher weight = higher scheduling priority during conflicts</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[
              { key: 'expW', label: 'Express Weight', color: '#ef4444', bgColor: '#fef2f2' },
              { key: 'pasW', label: 'Passenger Weight', color: '#2563eb', bgColor: '#eff6ff' },
              { key: 'frtW', label: 'Freight Weight', color: '#f59e0b', bgColor: '#fffbeb' },
            ].map(({ key, label, color, bgColor }) => (
              <div key={key}>
                <label style={lbl}>{label}</label>
                <input type="number" min="1" max="10" value={s[key]} onChange={e => set(key, e.target.value)} style={inp} onFocus={e => e.target.style.borderColor = color} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                <div style={{ marginTop: 8, height: 6, background: '#f1f5f9', borderRadius: 6 }}>
                  <div style={{ width: `${(s[key] / 10) * 100}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 0.3s ease' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Optimization Mode */}
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f1f35', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>Optimization Mode</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { value: 'minimize_delay', label: 'Minimize Delay', desc: 'Focus on reducing total delay across all trains', icon: '⏱️' },
              { value: 'maximize_throughput', label: 'Maximize Throughput', desc: 'Maximize trains handled per hour', icon: '📈' },
              { value: 'balanced', label: 'Balanced Mode', desc: 'Balance delay reduction with throughput', icon: '⚖️' },
            ].map(mode => (
              <button key={mode.value} onClick={() => set('mode', mode.value)} style={{ textAlign: 'left', padding: 16, borderRadius: 14, border: `2px solid ${s.mode === mode.value ? '#2563eb' : '#e5e7eb'}`, background: s.mode === mode.value ? '#eff6ff' : '#fafbfc', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{mode.icon}</div>
                <p style={{ fontSize: 13, fontWeight: 700, color: s.mode === mode.value ? '#2563eb' : '#374151' }}>{mode.label}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, lineHeight: 1.4 }}>{mode.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* System Reset */}
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f1f35', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>System Data</h3>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Clear persistent simulation data from local storage to reset dashboards to default.</p>
          <button
            onClick={handleReset}
            disabled={isResetting}
            style={{
              padding: '13px 32px', borderRadius: 12, border: 'none',
              background: isResetting
                ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: isResetting ? 'not-allowed' : 'pointer',
              fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
              width: 'fit-content',
              boxShadow: isResetting
                ? 'none'
                : '0 4px 12px rgba(220,38,38,0.3)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {isResetting ? (
              <>
                <div style={{
                  width: 14, height: 14,
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 0.75s linear infinite',
                }} />
                Resetting Database...
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </>
            ) : 'Clear Simulation Data'}
          </button>
        </div>

        <button onClick={handleSave} style={{ padding: '13px 32px', borderRadius: 12, border: 'none', background: saved ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: saved ? '0 4px 12px rgba(22,163,74,0.4)' : '0 4px 12px rgba(37,99,235,0.4)', transition: 'all 0.2s', width: 'fit-content' }}>
          {saved ? '✓ Settings Saved Successfully' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
