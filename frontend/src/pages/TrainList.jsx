import React, { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import TrainDetailModal from '../components/TrainDetailModal'

const typeCfg = { Express: ['#fef2f2', '#ef4444'], Passenger: ['#eff6ff', '#2563eb'], Freight: ['#fffbeb', '#f59e0b'], Mail: ['#f0fdf4', '#16a34a'] }
const priCfg = { High: ['#fef2f2', '#ef4444'], Medium: ['#fffbeb', '#f59e0b'], Low: ['#f0fdf4', '#16a34a'] }
const statusCfg = { Delayed: ['#fef2f2', '#ef4444'], 'On Time': ['#f0fdf4', '#16a34a'], Waiting: ['#fffbeb', '#f59e0b'], Moving: ['#eff6ff', '#2563eb'], Scheduled: ['#f8fafc', '#64748b'] }

function Chip({ label, map }) {
  const [bg, color] = map[label] || ['#f8fafc', '#64748b']
  return <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{label}</span>
}

// Map integer priority weights (from the API) back to display labels for filter chips.
const PRIORITY_LABEL = { 10: 'High', 5: 'Medium', 1: 'Low' }

export default function TrainList() {
  // ── API data state ─────────────────────────────────────────────────────────
  const [trains, setTrains] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [typeF, setTypeF] = useState('All')
  const [priF, setPriF] = useState('All')
  const [statF, setStatF] = useState('All')
  const [sortBy, setSortBy] = useState('id')
  const [selected, setSelected] = useState(null)
  const [liveSchedule, setLiveSchedule] = useState(null)

  // ── Fetch train roster from FastAPI on mount ────────────────────────────────
  useEffect(() => {
    const fetchTrains = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/trains', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('trax_token')}`,
          },
        })
        if (!res.ok) throw new Error(`Server error: ${res.status}`)
        const data = await res.json()
        // Normalise: convert integer priority to a display label so existing
        // filter logic and Chip badges work without any further changes.
        const normalised = data.map(t => ({
          ...t,
          priority: PRIORITY_LABEL[t.priority] ?? String(t.priority),
          // API uses current_station; alias to currentStation for legacy JSX refs.
          currentStation: t.current_station,
        }))
        setTrains(normalised)
      } catch (err) {
        console.error('[TrainList] Failed to fetch trains:', err)
        setFetchError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrains()
    window.addEventListener('trax_network_update', fetchTrains)
    return () => window.removeEventListener('trax_network_update', fetchTrains)
  }, [])

  // ── Listen for live simulation updates from localStorage ────────────────────
  useEffect(() => {
    const fetchSchedule = () => {
      const raw = localStorage.getItem('trax_live_schedule')
      if (raw) {
        try {
          setLiveSchedule(JSON.parse(raw))
        } catch (e) {
          console.error('Failed to parse live schedule', e)
        }
      }
    }

    fetchSchedule()
    window.addEventListener('trax_schedule_update', fetchSchedule)
    return () => window.removeEventListener('trax_schedule_update', fetchSchedule)
  }, [])

  const sel = { border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif', background: '#fff', color: '#374151' }

  const allTrains = trains.map(t => {
    let newDelay = t.delay;
    let newStatus = t.status;

    if (liveSchedule) {
      if ((t.id === 'EXP101' || t.id === 'T-702') && liveSchedule.Express_Train) {
        newDelay = liveSchedule.Express_Train.total_delay_mins;
        newStatus = newDelay > 0 ? 'Delayed' : 'On Time';
      } else if ((t.id === 'FRG311' || t.id === 'T-803') && liveSchedule.Freight_Train) {
        newDelay = liveSchedule.Freight_Train.total_delay_mins;
        newStatus = newDelay > 0 ? 'Delayed' : 'On Time';
      }
    }
    return { ...t, delay: newDelay, status: newStatus };
  });

  const filtered = allTrains
    .filter(t => t.id.toLowerCase().includes(search.toLowerCase()) || (t.from || t.source).toLowerCase().includes(search.toLowerCase()))
    .filter(t => typeF === 'All' || t.type === typeF)
    .filter(t => priF === 'All' || t.priority === priF)
    .filter(t => statF === 'All' || (t.delay > 0 ? 'Delayed' : 'On Time') === statF)
    .sort((a, b) => {
      if (sortBy === 'delay') return b.delay - a.delay
      if (sortBy === 'priority') return ['High', 'Medium', 'Low'].indexOf(a.priority) - ['High', 'Medium', 'Low'].indexOf(b.priority)
      return a.id.localeCompare(b.id)
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f1f35' }}>Train List</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>All trains in the network — click a row for details</p>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by Train ID or Station..." style={{ ...sel, paddingLeft: 30, width: '100%' }} />
        </div>
        <select value={typeF} onChange={e => setTypeF(e.target.value)} style={sel}><option value="All">All Types</option><option>Express</option><option>Passenger</option><option>Freight</option><option>Mail</option></select>
        <select value={priF} onChange={e => setPriF(e.target.value)} style={sel}><option value="All">All Priorities</option><option>High</option><option>Medium</option><option>Low</option></select>
        <select value={statF} onChange={e => setStatF(e.target.value)} style={sel}><option value="All">All Statuses</option><option>Moving</option><option>Waiting</option><option>Delayed</option><option>On Time</option></select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={sel}><option value="id">Sort: ID</option><option value="delay">Sort: Delay</option><option value="priority">Sort: Priority</option></select>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>
            {isLoading ? 'Loading…' : `Showing ${filtered.length} trains`}
          </span>
          {fetchError && (
            <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>⚠ {fetchError}</span>
          )}
        </div>

        {/* ── Loading skeleton ───────────────────────────────────────────── */}
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 0', gap: 12 }}>
            <div style={{
              width: 22, height: 22, border: '3px solid #e5e7eb',
              borderTopColor: '#2563eb', borderRadius: '50%',
              animation: 'spin 0.75s linear infinite',
            }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Loading network data…</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Train ID', 'Type', 'Priority', 'Source', 'Destination', 'Current Station', 'Delay', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={t.id} onClick={() => setSelected(t)}
                    style={{ background: i % 2 === 0 ? '#ffffff' : '#fafbfc', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f6ff'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#ffffff' : '#fafbfc'}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f1f35', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>{t.id}</td>
                    <td style={{ padding: '12px 16px' }}><Chip label={t.type} map={typeCfg} /></td>
                    <td style={{ padding: '12px 16px' }}><Chip label={t.priority} map={priCfg} /></td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>{t.source}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>{t.destination}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>{t.currentStation}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: t.delay > 0 ? '#ef4444' : '#16a34a', fontSize: 13 }}>{t.delay > 0 ? `+${t.delay} min` : 'On time'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Chip label={t.delay > 0 ? 'Delayed' : 'On Time'} map={statusCfg} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <TrainDetailModal train={selected} onClose={() => setSelected(null)} />
    </div>
  )
}