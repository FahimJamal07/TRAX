import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Search, Eye, Activity, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import KPICard from '../components/KPICard'
import AlertPanel from '../components/AlertPanel'
import TrainDetailModal from '../components/TrainDetailModal'
import TagBadge from '../components/TagBadge'
import { apiFetch } from '../utils/api'
import { getChartTooltipProps } from '../utils/chartTooltip'

// Station definitions used for delay/capacity analytics
const STATIONS = [
    { id: "A", name: "Station A", cx: 100, cy: 200, capacity: 3 },
    { id: "B", name: "Station B", cx: 350, cy: 200, capacity: 4 },
    { id: "C", name: "Station C", cx: 600, cy: 200, capacity: 3 },
    { id: "D", name: "Station D", cx: 850, cy: 200, capacity: 4 },
    { id: "E", name: "Station E", cx: 1100, cy: 200, capacity: 3 }
]

// Map integer priority weights from the API back to display labels
const PRIORITY_LABEL = { 10: 'High', 5: 'Medium', 1: 'Low' }

const formatIsoToAmPm = (value) => {
  if (!value) return '--'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return '--'
  return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function Dashboard() {
  const { isLoading: ganttLoading, isDarkMode = false } = useOutletContext() || {}
  const chartTooltipProps = getChartTooltipProps(isDarkMode)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [selectedTrain, setSelectedTrain] = useState(null)

  // ── Live API state ─────────────────────────────────────────────────────────
  const [trains, setTrains] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch the full train roster from FastAPI on mount.
  // This is the single source of truth — no localStorage needed.
  useEffect(() => {
    const fetchTrains = async () => {
      try {
        const res = await apiFetch('/api/v1/trains')
        if (!res) return
        if (!res.ok) throw new Error(`Server error: ${res.status}`)
        const data = await res.json()
        // Normalise integer priority → display label so Badges render correctly
        const normalised = data.map(t => ({
          ...t,
          priority: PRIORITY_LABEL[t.priority] ?? String(t.priority),
          currentStation: t.current_station,
        }))
        setTrains(normalised)
      } catch (err) {
        console.error('[Dashboard] Failed to fetch trains:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrains()
    window.addEventListener('trax_network_update', fetchTrains)
    return () => window.removeEventListener('trax_network_update', fetchTrains)
  }, [])


  const displayGanttData = trains.slice(0, 3).map((train, idx) => ({
    id: train.id,
    label: train.id,
    start: idx * 140,
    width: 100,
    color: train.delay > 0 ? '#ef4444' : '#22c55e',
    status: train.delay > 0 ? `Delayed (+${train.delay}m)` : 'On Time',
  }));

  // ── Computed: Infrastructure Saturation (Top 5 most occupied tracks) ─────────────
  const TRACK_SAFE_CAPACITY = 4
  const trackSaturation = Object.entries(
    trains.reduce((acc, train) => {
      const trackId = train.schedule?.track_id || train.track_id
      if (!trackId) return acc
      acc[trackId] = (acc[trackId] || 0) + 1
      return acc
    }, {})
  )
    .map(([trackId, count]) => {
      const saturationPct = Math.min(100, Math.round((count / TRACK_SAFE_CAPACITY) * 100))
      const color = saturationPct >= 90 ? '#ef4444' : saturationPct >= 70 ? '#f59e0b' : '#22c55e'
      return { trackId, count, saturationPct, color }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // ── Computed: Live Alerts (Delays + Capacity Conflicts) ─────────────────────────────
  const liveAlerts = [];
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  trains.forEach(train => {
    if ((train.delay ?? 0) > 0) {
      liveAlerts.push({
        id: `delay-${train.id}`,
        severity: train.delay > 20 ? 'high' : 'medium',
        message: `${train.id} is delayed by ${train.delay} mins`,
        time: currentTime,
      });
    }
  });

  STATIONS.forEach(station => {
    const dockedCount = trains.filter(
      t => (t.currentStation?.toLowerCase() || t.current_station?.toLowerCase()) === station.name.toLowerCase()
    ).length;
    if (dockedCount >= station.capacity) {
      liveAlerts.push({
        id: `capacity-${station.name}`,
        severity: 'high',
        message: `${station.name} capacity reached (${dockedCount}/${station.capacity})`,
        time: currentTime,
      });
    }
  });

  // ── Computed: Delay Analytics (Per-Station Aggregation) ──────────────────────────────
  const delaysByStation = STATIONS.map(station => {
    const trainAtStation = trains.filter(
      t => (t.currentStation?.toLowerCase() || t.current_station?.toLowerCase()) === station.name.toLowerCase()
    );
    const totalDelay = trainAtStation.reduce((sum, t) => sum + (t.delay ?? 0), 0);
    return {
      station: station.name,
      delay: totalDelay,
    };
  });

  const filtered = trains
    .filter(t => t.id.toLowerCase().includes(search.toLowerCase()))
    .filter(t => typeFilter === 'All Types' || t.type === typeFilter)

  const ganttHours = ['10:00', '10:30', '11:00', '11:30', '12:00']

  return (
    <div className="dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPI Cards — all values derived live from the API fetch */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard
          title="Total Trains"
          value={isLoading ? '…' : trains.length}
          icon={<Activity color="#2563eb" />}
          iconBg="#eff6ff"
          className="kpi-blue"
        />
        <KPICard
          title="Total Delay"
          value={isLoading ? '…' : trains.reduce((sum, t) => sum + (t.delay ?? 0), 0)}
          unit="min"
          icon={<Clock color="#ef4444" />}
          iconBg="#fef2f2"
          valueColor="#ef4444"
          className="kpi-red"
        />
        <KPICard
          title="Delayed Trains"
          value={isLoading ? '…' : trains.filter(t => t.delay > 0).length}
          icon={<AlertTriangle color="#f59e0b" />}
          iconBg="#fffbeb"
          valueColor="#f59e0b"
          className="kpi-amber"
        />
        <KPICard
          title="On Time"
          value={isLoading ? '…' : trains.filter(t => t.delay === 0).length}
          icon={<CheckCircle2 color="#16a34a" />}
          iconBg="#ecfdf5"
          valueColor="#16a34a"
          className="kpi-emerald"
        />
      </div>

      {/* Main Row: Train Table + Infrastructure Saturation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>

        {/* Train Schedule Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700 transition-colors duration-200" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h3 className="text-slate-900 dark:text-white" style={{ fontSize: 15, fontWeight: 700 }}>Train Schedule</h3>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Train" style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 12px 8px 30px', fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif', width: 160 }} />
              </div>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="surface-select" style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif', background: '#fff', color: '#374151' }}>
                <option>All Types</option><option>Express</option><option>Passenger</option><option>Freight</option><option>Mail</option>
              </select>
            </div>
          </div>
          <table className="w-full border-collapse text-slate-700 dark:text-slate-300" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700/50">
                {['Train ID', 'Type', 'Priority', 'From → To', 'Sch. Departure', 'Est. Arrival', 'Delay', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-slate-500 dark:text-slate-300" style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                // Loading skeleton row while the fetch is in-flight
                <tr>
                  <td colSpan={9} style={{ padding: '32px 0', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 18, height: 18, border: '2.5px solid #e5e7eb',
                        borderTopColor: '#2563eb', borderRadius: '50%',
                        animation: 'spin 0.75s linear infinite',
                      }} />
                      <span className="text-slate-500 dark:text-slate-400" style={{ fontSize: 13, fontWeight: 600 }}>Loading schedule…</span>
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="text-slate-900 dark:text-white" style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13, fontFamily: 'DM Mono, monospace' }}>{t.id}</td>
                    <td style={{ padding: '12px 16px' }}><TagBadge label={t.type} /></td>
                    <td style={{ padding: '12px 16px' }}><TagBadge label={t.priority} /></td>
                    <td className="text-slate-700 dark:text-slate-300" style={{ padding: '12px 16px', fontSize: 13 }}>{t.source} → {t.destination}</td>
                    <td className="text-slate-700 dark:text-slate-300" style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{formatIsoToAmPm(t.scheduled_departure)}</td>
                    <td className="text-slate-700 dark:text-slate-300" style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700 }}>{formatIsoToAmPm(t.expected_destination_arrival)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: t.delay > 0 ? '#ef4444' : '#16a34a', fontSize: 13 }}>
                      {t.delay > 0 ? `+${t.delay} min` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <TagBadge label={t.delay > 0 ? 'Delayed' : 'On Time'} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => setSelectedTrain(t)} className="bg-blue-50 dark:bg-blue-900/20 border border-transparent dark:border-blue-800/30 text-blue-600 dark:text-blue-400" style={{ borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Eye size={12} /> 
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Infrastructure Saturation Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700 transition-colors duration-200" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 className="text-slate-900 dark:text-white" style={{ fontSize: 15, fontWeight: 700 }}>Infrastructure Saturation</h3>
          </div>
          <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {trackSaturation.length === 0 ? (
              <div className="text-slate-500 dark:text-slate-400" style={{ fontSize: 13 }}>No active track occupancy data.</div>
            ) : (
              trackSaturation.map((track) => (
                <div key={track.trackId} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{track.trackId}</span>
                    <span className="text-slate-500 dark:text-slate-400" style={{ fontSize: 11, fontWeight: 700 }}>{track.count}/{TRACK_SAFE_CAPACITY}</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 9999, background: '#e2e8f0', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${track.saturationPct}%`,
                        background: track.color,
                        borderRadius: 9999,
                        transition: 'width 250ms ease',
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Delay Chart + Train Movement */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } }>

        {/* Delay Analytics Chart */}
        <div className="whatif-card whatif-card-neutral bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700 transition-colors duration-200" style={{padding:24}}>
          <h3 className="text-slate-900 dark:text-white" style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Delay Analytics</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={delaysByStation}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="station" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip {...chartTooltipProps} />
              <Legend iconType="triangle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="delay" name="Current Delay (mins)" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Train Movement Gantt */}
        <div className="whatif-card whatif-card-neutral bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700 transition-colors duration-200" style={{ padding: 24 }}>
          <h3 className="text-slate-900 dark:text-white" style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center' }}>
            Train Movement
            {ganttLoading && <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', marginLeft: 12 }}>⏳ Fetching...</span>}
          </h3>
          {/* Station Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8 }}>
            <div></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>
              {['Delhi', 'Agra', 'Kanpur', 'Lucknow'].map(s => (
                <span key={s} className="text-slate-500 dark:text-slate-400" style={{ fontSize: 11, fontWeight: 700 }}>{s}</span>
              ))}
            </div>
          </div>
          {/* Gantt Bars */}
          {displayGanttData.map((g) => (
            <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="text-slate-500 dark:text-slate-400" style={{ fontSize: 12, fontWeight: 700 }}>{g.label}</span>
              </div>
              <div className="whatif-card whatif-card-neutral w-full h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: `${(g.start / 400) * 100}%`, width: `${(g.width / 400) * 100}%`, height: '100%', background: g.color, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', boxShadow: `0 2px 8px ${g.color}55` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{g.label}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>{g.status}</span>
                </div>
              </div>
            </div>
          ))}
          {/* Time Labels */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, marginTop: 8 }}>
            <div></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {ganttHours.map(h => (
                <span key={h} className="text-slate-500 dark:text-slate-400" style={{ fontSize: 10 }}>{h}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <AlertPanel alerts={liveAlerts} />

      <TrainDetailModal train={selectedTrain} onClose={() => setSelectedTrain(null)} />
    </div>
  )
}