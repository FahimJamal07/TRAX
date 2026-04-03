import React, { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import TrainDetailModal from '../components/TrainDetailModal'
import TagBadge from '../components/TagBadge'
import { apiFetch } from '../utils/api'

// Map integer priority weights (from the API) back to display labels for filter chips.
const PRIORITY_LABEL = { 10: 'High', 5: 'Medium', 1: 'Low' }

const formatIsoToAmPm = (value) => {
  if (!value) return '--'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return '--'
  return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

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
        const res = await apiFetch('/api/v1/trains')
        if (!res) return
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
      const dynamicScheduleRow = liveSchedule[t.id]
      if (dynamicScheduleRow && typeof dynamicScheduleRow.total_delay_mins === 'number') {
        newDelay = dynamicScheduleRow.total_delay_mins
        newStatus = newDelay > 0 ? 'Delayed' : 'On Time'
      } else if ((t.id === 'EXP101' || t.id === 'T-702') && liveSchedule.Express_Train) {
        // Backward compatibility with legacy optimize payload.
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
    <div className="trainlist-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 className="text-slate-900 dark:text-white" style={{ fontSize: 20, fontWeight: 700 }}>Train List</h2>
        <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: 13, marginTop: 2 }}>All trains in the network — click a row for details</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700 transition-colors duration-200" style={{ padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by Train ID or Station..." style={{ ...sel, paddingLeft: 30, width: '100%' }} />
        </div>
        <select value={typeF} onChange={e => setTypeF(e.target.value)} style={sel}><option value="All">All Types</option><option>Express</option><option>Passenger</option><option>Freight</option><option>Mail</option></select>
        <select value={priF} onChange={e => setPriF(e.target.value)} style={sel}><option value="All">All Priorities</option><option>High</option><option>Medium</option><option>Low</option></select>
        <select value={statF} onChange={e => setStatF(e.target.value)} style={sel}><option value="All">All Statuses</option><option>Moving</option><option>Waiting</option><option>Delayed</option><option>On Time</option></select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={sel}><option value="id">Sort: ID</option><option value="delay">Sort: Delay</option><option value="priority">Sort: Priority</option></select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700 transition-colors duration-200" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="text-slate-500 dark:text-slate-400" style={{ fontSize: 13, fontWeight: 600 }}>
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
            <span className="text-slate-500 dark:text-slate-400" style={{ fontSize: 14, fontWeight: 600 }}>Loading network data…</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="surface-table w-full border-collapse text-slate-700 dark:text-slate-300" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700/50">
                  {['Train ID', 'Type', 'Priority', 'Source', 'Destination', 'Sch. Departure', 'Est. Arrival', 'Current Station', 'Delay', 'Status'].map(h => (
                    <th key={h} className="text-slate-500 dark:text-slate-300" style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} onClick={() => setSelected(t)} className="cursor-pointer border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="text-slate-900 dark:text-white" style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'DM Mono, monospace', fontSize: 13 }}>{t.id}</td>
                    <td style={{ padding: '12px 16px' }}><TagBadge label={t.type} /></td>
                    <td style={{ padding: '12px 16px' }}><TagBadge label={t.priority} /></td>
                    <td className="text-slate-700 dark:text-slate-300" style={{ padding: '12px 16px', fontSize: 13 }}>{t.source}</td>
                    <td className="text-slate-700 dark:text-slate-300" style={{ padding: '12px 16px', fontSize: 13 }}>{t.destination}</td>
                    <td className="text-slate-700 dark:text-slate-300" style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{formatIsoToAmPm(t.scheduled_departure)}</td>
                    <td className="text-slate-700 dark:text-slate-300" style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700 }}>{formatIsoToAmPm(t.expected_destination_arrival)}</td>
                    <td className="text-slate-700 dark:text-slate-300" style={{ padding: '12px 16px', fontSize: 13 }}>{t.currentStation}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: t.delay > 0 ? '#ef4444' : '#16a34a', fontSize: 13 }}>{t.delay > 0 ? `+${t.delay} min` : 'On time'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <TagBadge label={t.delay > 0 ? 'Delayed' : 'On Time'} />
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