import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

const card = { background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', padding: 24 }
const label = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }
const input = { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif', color: '#0f1f35', background: '#fff' }
const btnPrimary = { width: '100%', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginTop: 8 }
const btnDanger = { ...btnPrimary, background: 'linear-gradient(135deg, #ef4444, #dc2626)' }

function SimCard({ title, children }) {
  return (
    <div style={card}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f1f35', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>{title}</h3>
      {children}
    </div>
  )
}

export default function Simulation() {
  const [trains, setTrains] = useState([])
  const [priorityTrainId, setPriorityTrainId] = useState('')
  const [secondaryTrainId, setSecondaryTrainId] = useState('')
  const [expressDelay, setExpressDelay] = useState('')
  const [freightDelay, setFreightDelay] = useState('')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState(null)
  const [error, setError] = useState(null)

  const [newTrain, setNewTrain] = useState({ id: '', type: 'Express', priority: 'High', source: 'Station A', destination: 'Station D', time: '' })
  const [blockForm, setBlockForm] = useState({ section: 'A-B', duration: '' })
  const [blockStart, setBlockStart] = useState('')
  const [isBlocking, setIsBlocking] = useState(false)
  const [blockError, setBlockError] = useState(null)
  const [blockResult, setBlockResult] = useState(null)
  const [capForm, setCapForm] = useState({ station: 'Station A', capacity: '' })
  const [results, setResults] = useState(null)
  const [isAddingTrain, setIsAddingTrain] = useState(false)

  // ── Toast Notification System ──────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    let isMounted = true

    const fetchTrains = async () => {
      try {
        const res = await apiFetch('/api/v1/trains')
        if (!res) return

        if (!res.ok) return

        const data = await res.json()
        const liveTrains = Array.isArray(data) ? data : []
        if (!isMounted) return

        setTrains(liveTrains)
        setPriorityTrainId((prev) => {
          if (prev && liveTrains.some((t) => t.id === prev)) return prev
          return liveTrains[0]?.id || ''
        })
        setSecondaryTrainId((prev) => {
          if (prev && liveTrains.some((t) => t.id === prev)) return prev
          return liveTrains[1]?.id || liveTrains[0]?.id || ''
        })
      } catch {
        // Keep existing selection if telemetry fetch fails.
      }
    }

    fetchTrains()

    return () => {
      isMounted = false
    }
  }, [])

  const handleOptimize = async () => {
    setIsOptimizing(true)
    setError(null)
    setOptimizationResult(null)

    // Read priority weights from local storage
    const savedWeights = localStorage.getItem('trax_weights');
    const parsedWeights = savedWeights ? JSON.parse(savedWeights) : null;

    try {
      const res = await apiFetch('/api/v1/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          express_injected_delay: parseInt(expressDelay) || 0,
          freight_injected_delay: parseInt(freightDelay) || 0,
          priority_train_id: priorityTrainId || null,
          secondary_train_id: secondaryTrainId || null,
          express_weight: parsedWeights ? parseInt(parsedWeights.express) : 10,
          freight_weight: parsedWeights ? parseInt(parsedWeights.freight) : 1,
          track_blockages: blockStart !== '' && blockForm.duration !== '' ? [
            {
              start_time: parseInt(blockStart) || 0,
              duration: parseInt(blockForm.duration) || 0
            }
          ] : [],
          capacity_changes: capForm.capacity !== '' ? [
            {
              station: capForm.station,
              capacity: parseInt(capForm.capacity) || 1
            }
          ] : []
        })
      })
      if (!res) return
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()
      if (data.status === 'success') {
        localStorage.setItem('trax_live_schedule', JSON.stringify(data.schedule));
        window.dispatchEvent(new Event('trax_schedule_update'));
        window.dispatchEvent(new Event('trax_network_update'));
        setOptimizationResult(data.schedule)
        showToast('Network Re-Optimized Successfully!', 'success')
      } else {
        throw new Error(data.message || 'Optimization failed')
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch')
      showToast(err.message || 'Failed to apply parameters', 'error')
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleAddTrain = async () => {
    if (!newTrain.id || !newTrain.time) {
      showToast('Please provide a Train ID and Scheduled Time.', 'error')
      return;
    }
    setIsAddingTrain(true)
    try {
      const res = await apiFetch('/api/v1/trains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTrain)
      })
      if (!res) return
      const data = await res.json()
      if (res.ok && data.status === 'success') {
        showToast(`Train ${newTrain.id} injected successfully! Network re-optimized.`, 'success')
        window.dispatchEvent(new Event('trax_network_update')) // Trigger frontend grid sync
        setNewTrain({ id: '', type: 'Express', priority: 'High', source: 'Station A', destination: 'Station D', time: '' })
      } else {
        showToast(data.detail || data.message || 'Failed to add train.', 'error')
      }
    } catch {
      showToast('Server connection error.', 'error')
    } finally {
      setIsAddingTrain(false)
    }
  }

  // ── Block Track Section handler ────────────────────────────────────────────
  // POSTs the blockage as a ghost interval to the CP-SAT optimizer.
  // The existing delay fields are forwarded too so a combined scenario works.
  const handleBlockage = async () => {
    setIsBlocking(true)
    setBlockError(null)
    setBlockResult(null)

    const savedWeights = localStorage.getItem('trax_weights')
    const parsedWeights = savedWeights ? JSON.parse(savedWeights) : null

    const payload = {
      express_injected_delay: parseInt(expressDelay) || 0,
      freight_injected_delay: parseInt(freightDelay) || 0,
      priority_train_id: priorityTrainId || null,
      secondary_train_id: secondaryTrainId || null,
      express_weight: parsedWeights ? parseInt(parsedWeights.express) : 10,
      freight_weight: parsedWeights ? parseInt(parsedWeights.freight) : 1,
      track_blockages: blockStart !== '' && blockForm.duration !== '' ? [
        {
          start_time: parseInt(blockStart) || 0,
          duration: parseInt(blockForm.duration) || 0
        }
      ] : [],
      capacity_changes: capForm.capacity !== '' ? [
        {
          station: capForm.station,
          capacity: parseInt(capForm.capacity) || 1
        }
      ] : []
    }

    try {
      const res = await apiFetch('/api/v1/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res) return

      if (res.status === 403) { setBlockError('You do not have permission to run optimizations.'); return }
      if (!res.ok) { const d = await res.json(); setBlockError(d.detail ?? `Server error (${res.status})`); return }

      const data = await res.json()
      if (data.status === 'success') {
        // Persist schedule + notify other components
        localStorage.setItem('trax_live_schedule', JSON.stringify(data.schedule))
        window.dispatchEvent(new Event('trax_schedule_update'))
        window.dispatchEvent(new Event('trax_network_update'))
        setBlockResult(data.schedule)
        showToast(`Blockage applied to Section ${blockForm.section}. Network reorganized.`, 'success')
        // Also populate the What-If panel at the bottom
        setResults({
          before: 125,
          after:  (data.schedule?.Express_Train?.total_delay_mins ?? 125) + (data.schedule?.Freight_Train?.total_delay_mins ?? 27),
          diff:   null, // computed in render
          note:   `Section ${blockForm.section} blocked for ${blockForm.duration || 0} min from t=${blockStart || 0}. Solver rescheduled all trains around the ghost interval.`,
        })
      } else {
        setBlockError(data.message || 'Blockage optimization failed.')
      }
    } catch {
      setBlockError('Could not connect to the server. Is the backend running?')
    } finally {
      setIsBlocking(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f1f35' }}>Simulation Panel</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Simulate disruptions and test optimization responses</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SimCard title="Add Delay to Train">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={label}>Select Priority Train</label>
                <select value={priorityTrainId} onChange={e => setPriorityTrainId(e.target.value)} style={input}>
                  {trains.length === 0 ? (
                    <option value="">No trains available</option>
                  ) : (
                    trains.map((train) => (
                      <option key={`priority-${train.id}`} value={train.id}>
                        {train.id} ({train.type || 'Unknown'})
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Delay (Min)</label>
                <input type="number" value={expressDelay} onChange={e => setExpressDelay(e.target.value)} placeholder="e.g. 15" style={input} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={label}>Select Secondary Train</label>
                <select value={secondaryTrainId} onChange={e => setSecondaryTrainId(e.target.value)} style={input}>
                  {trains.length === 0 ? (
                    <option value="">No trains available</option>
                  ) : (
                    trains.map((train) => (
                      <option key={`secondary-${train.id}`} value={train.id}>
                        {train.id} ({train.type || 'Unknown'})
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Delay (Min)</label>
                <input type="number" value={freightDelay} onChange={e => setFreightDelay(e.target.value)} placeholder="e.g. 25" style={input} />
              </div>
            </div>
            <button onClick={handleOptimize} disabled={isOptimizing} style={{ ...btnPrimary, cursor: isOptimizing ? 'not-allowed' : 'pointer', opacity: isOptimizing ? 0.7 : 1 }}>
              {isOptimizing ? "Optimizing..." : "Apply Delay & Re-Optimize"}
            </button>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                <strong>Error: </strong> {error}
              </div>
            )}
            {optimizationResult && (
              <div style={{ background: '#f0fdf4', border: '1px solid #4ade80', padding: '12px', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '13px', color: '#16a34a', margin: '0 0 8px 0', fontWeight: 'bold' }}>Optimization Successful</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#374151', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Express Train:</span>
                    <strong>{optimizationResult.Express_Train.new_start_time} (delay: {optimizationResult.Express_Train.total_delay_mins}m)</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#374151', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Freight Train:</span>
                    <strong>{optimizationResult.Freight_Train.new_start_time} (delay: {optimizationResult.Freight_Train.total_delay_mins}m)</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SimCard>

        <SimCard title="Add New Train">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={label}>Train ID</label>
                <input value={newTrain.id} onChange={e => setNewTrain({ ...newTrain, id: e.target.value })} placeholder="T-110" style={input} />
              </div>
              <div>
                <label style={label}>Type</label>
                <select value={newTrain.type} onChange={e => setNewTrain({ ...newTrain, type: e.target.value })} style={input}>
                  <option>Express</option><option>Passenger</option><option>Freight</option>
                </select>
              </div>
              <div>
                <label style={label}>Priority</label>
                <select value={newTrain.priority} onChange={e => setNewTrain({ ...newTrain, priority: e.target.value })} style={input}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
              <div>
                <label style={label}>Scheduled Time</label>
                <input type="time" value={newTrain.time} onChange={e => setNewTrain({ ...newTrain, time: e.target.value })} style={input} />
              </div>
              <div>
                <label style={label}>Source Station</label>
                <select value={newTrain.source} onChange={e => setNewTrain({ ...newTrain, source: e.target.value })} style={input}>
                  <option>Station A</option><option>Station B</option><option>Station C</option><option>Station D</option><option>Station E</option>
                </select>
              </div>
              <div>
                <label style={label}>Destination Station</label>
                <select value={newTrain.destination} onChange={e => setNewTrain({ ...newTrain, destination: e.target.value })} style={input}>
                  <option>Station A</option><option>Station B</option><option>Station C</option><option>Station D</option><option>Station E</option>
                </select>
              </div>
            </div>
            <button onClick={handleAddTrain} disabled={isAddingTrain} style={{ ...btnPrimary, cursor: isAddingTrain ? 'not-allowed' : 'pointer', opacity: isAddingTrain ? 0.7 : 1 }}>
              {isAddingTrain ? "Injecting..." : "Add Train & Re-Optimize"}
            </button>
          </div>
        </SimCard>

        <SimCard title="Block Track Section">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Section selector */}
            <div>
              <label style={label}>Affected Section</label>
              <select value={blockForm.section} onChange={e => setBlockForm({ ...blockForm, section: e.target.value })} style={input}>
                <option value="A-B">Section A-B</option>
                <option value="B-C">Section B-C</option>
                <option value="C-D">Section C-D</option>
                <option value="D-E">Section D-E</option>
              </select>
            </div>

            {/* Start time + Duration side-by-side */}
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={label}>Start Time (min from t=0)</label>
                <input
                  id="block-start"
                  type="number"
                  min="0"
                  value={blockStart}
                  onChange={e => setBlockStart(e.target.value)}
                  placeholder="e.g. 60"
                  style={input}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Duration (minutes)</label>
                <input
                  id="block-duration"
                  type="number"
                  min="1"
                  value={blockForm.duration}
                  onChange={e => setBlockForm({ ...blockForm, duration: e.target.value })}
                  placeholder="e.g. 30"
                  style={input}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              id="block-submit"
              onClick={handleBlockage}
              disabled={isBlocking}
              style={{ ...btnDanger, cursor: isBlocking ? 'not-allowed' : 'pointer', opacity: isBlocking ? 0.7 : 1 }}
            >
              {isBlocking ? '⏳ Applying Blockage…' : '🚧 Apply Blockage & Re-Optimize'}
            </button>

            {/* Error feedback */}
            {blockError && (
              <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                <strong>Error: </strong>{blockError}
              </div>
            )}

            {/* Success feedback */}
            {blockResult && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '12px', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '13px', color: '#c2410c', margin: '0 0 8px 0', fontWeight: 'bold' }}>🚧 Blockage Applied — Network Rescheduled</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#374151', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Express Train new slot:</span>
                    <strong>{blockResult.Express_Train?.new_start_time ?? '—'} min (delay: {blockResult.Express_Train?.total_delay_mins ?? '—'} m)</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#374151', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Freight Train new slot:</span>
                    <strong>{blockResult.Freight_Train?.new_start_time ?? '—'} min (delay: {blockResult.Freight_Train?.total_delay_mins ?? '—'} m)</strong>
                  </div>
                </div>
              </div>
            )}

          </div>
        </SimCard>

        <SimCard title="Platform Capacity Change">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={label}>Select Station</label>
              <select value={capForm.station} onChange={e => setCapForm({ ...capForm, station: e.target.value })} style={input}>
                <option>Station A</option><option>Station B</option><option>Station C</option><option>Station D</option><option>Station E</option>
              </select>
            </div>
            <div>
              <label style={label}>New Capacity</label>
              <input type="number" value={capForm.capacity} onChange={e => setCapForm({ ...capForm, capacity: e.target.value })} placeholder="e.g. 4" style={input} />
            </div>
            <button onClick={handleOptimize} disabled={isOptimizing} style={{ ...btnPrimary, cursor: isOptimizing ? 'not-allowed' : 'pointer', opacity: isOptimizing ? 0.7 : 1 }}>
              {isOptimizing ? "Updating..." : "Update Capacity & Re-Optimize"}
            </button>
          </div>
        </SimCard>
      </div>

      {results && (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f1f35', marginBottom: 16 }}>What-If Comparison</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Before (min)', value: results.before, bg: '#fef2f2', border: '#fecaca', color: '#ef4444' },
              { label: 'After (min)', value: results.after, bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb' },
              { label: 'Difference', value: `${results.diff > 0 ? '+' : ''}${results.diff} min`, bg: '#fffbeb', border: '#fed7aa', color: '#f59e0b' },
              { label: 'Changed Precedence', value: 'EXP101 → EXP412', bg: '#f8fafc', border: '#e2e8f0', color: '#374151' },
            ].map(item => (
              <div key={item.label} style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: 12, padding: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: item.color, marginTop: 6 }}>{item.value}</p>
              </div>
            ))}
          </div>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 16px' }}>
            <p style={{ fontSize: 12, color: '#2563eb' }}>{results.note}</p>
          </div>
        </div>
      )}

      {/* Enterprise Toast Overlay */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 30, right: 30, zIndex: 9999,
          background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: 12, padding: '16px 24px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: 12,
          animation: 'slideIn 0.3s ease-out forwards',
        }}>
          <span style={{ fontSize: 18 }}>{toast.type === 'error' ? '❌' : '✅'}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: toast.type === 'error' ? '#b91c1c' : '#15803d' }}>
            {toast.message}
          </span>
          <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </div>
      )}

    </div>
  )
}