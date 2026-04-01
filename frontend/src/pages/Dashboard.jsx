import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Search, Eye } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import KPICard from '../components/KPICard'
import AlertPanel from '../components/AlertPanel'
import TrainDetailModal from '../components/TrainDetailModal'
import { apiFetch } from '../utils/api'

// Station definitions used for delay/capacity analytics
const STATIONS = [
    { id: "A", name: "Station A", cx: 100, cy: 200, capacity: 3 },
    { id: "B", name: "Station B", cx: 350, cy: 200, capacity: 4 },
    { id: "C", name: "Station C", cx: 600, cy: 200, capacity: 3 },
    { id: "D", name: "Station D", cx: 850, cy: 200, capacity: 4 },
    { id: "E", name: "Station E", cx: 1100, cy: 200, capacity: 3 }
]

const typeCfg = {
  Express: { bg: '#fef2f2', color: '#ef4444' },
  Passenger: { bg: '#eff6ff', color: '#2563eb' },
  Freight: { bg: '#fffbeb', color: '#f59e0b' },
  Mail: { bg: '#f0fdf4', color: '#16a34a' },
}
const priCfg = {
  High: { bg: '#fef2f2', color: '#ef4444' },
  Medium: { bg: '#fffbeb', color: '#f59e0b' },
  Low: { bg: '#f0fdf4', color: '#16a34a' },
}
const statusCfg = {
  Delayed: { bg: '#fef2f2', color: '#ef4444' },
  'On Time': { bg: '#f0fdf4', color: '#16a34a' },
  Waiting: { bg: '#fffbeb', color: '#f59e0b' },
  Moving: { bg: '#eff6ff', color: '#2563eb' },
  Scheduled: { bg: '#f8fafc', color: '#64748b' },
}

function Badge({ label, cfg }) {
  const c = cfg[label] || { bg: '#f8fafc', color: '#64748b' }
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{label}</span>
  )
}

// Map integer priority weights from the API back to display labels
const PRIORITY_LABEL = { 10: 'High', 5: 'Medium', 1: 'Low' }

export default function Dashboard() {
  const { isLoading: ganttLoading } = useOutletContext() || {};
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPI Cards — all values derived live from the API fetch */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard title="Total Trains" value={isLoading ? '…' : trains.length} icon="🚆" iconBg="#eff6ff" />
        <KPICard
          title="Total Delay"
          value={isLoading ? '…' : trains.reduce((sum, t) => sum + (t.delay ?? 0), 0)}
          unit="min" icon="🔴" iconBg="#fef2f2" valueColor="#ef4444"
        />
        <KPICard
          title="Delayed Trains"
          value={isLoading ? '…' : trains.filter(t => t.delay > 0).length}
          icon="📊" iconBg="#f0fdf4" valueColor="#16a34a"
        />
        <KPICard
          title="On Time"
          value={isLoading ? '…' : trains.filter(t => t.delay === 0).length}
          icon="📈" iconBg="#fffbeb" valueColor="#f59e0b"
        />
      </div>

      {/* Main Row: Train Table + Infrastructure Saturation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>

        {/* Train Schedule Table */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f1f35' }}>Train Schedule</h3>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Train" style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 12px 8px 30px', fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif', width: 160 }} />
              </div>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif', background: '#fff', color: '#374151' }}>
                <option>All Types</option><option>Express</option><option>Passenger</option><option>Freight</option><option>Mail</option>
              </select>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Train ID', 'Type', 'Priority', 'From → To', 'Delay', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                // Loading skeleton row while the fetch is in-flight
                <tr>
                  <td colSpan={7} style={{ padding: '32px 0', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 18, height: 18, border: '2.5px solid #e5e7eb',
                        borderTopColor: '#2563eb', borderRadius: '50%',
                        animation: 'spin 0.75s linear infinite',
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Loading schedule…</span>
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((t, i) => (
                  <tr key={t.id}
                    style={{ background: i % 2 === 0 ? '#ffffff' : '#fafbfc', borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f6ff'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#ffffff' : '#fafbfc'}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f1f35', fontSize: 13, fontFamily: 'DM Mono, monospace' }}>{t.id}</td>
                    <td style={{ padding: '12px 16px' }}><Badge label={t.type} cfg={typeCfg} /></td>
                    <td style={{ padding: '12px 16px' }}><Badge label={t.priority} cfg={priCfg} /></td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>{t.source} → {t.destination}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: t.delay > 0 ? '#ef4444' : '#16a34a', fontSize: 13 }}>
                      {t.delay > 0 ? `+${t.delay} min` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge label={t.delay > 0 ? 'Delayed' : 'On Time'} cfg={statusCfg} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => setSelectedTrain(t)} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600, color: '#2563eb', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Infrastructure Saturation Panel */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f1f35' }}>Infrastructure Saturation</h3>
          </div>
          <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {trackSaturation.length === 0 ? (
              <div style={{ fontSize: 13, color: '#64748b' }}>No active track occupancy data.</div>
            ) : (
              trackSaturation.map((track) => (
                <div key={track.trackId} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{track.trackId}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{track.count}/{TRACK_SAFE_CAPACITY}</span>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Delay Analytics Chart */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f1f35', marginBottom: 16 }}>Delay Analytics</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={delaysByStation}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="station" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }} />
              <Legend iconType="triangle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="delay" name="Current Delay (mins)" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Train Movement Gantt */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f1f35', marginBottom: 16, display: 'flex', alignItems: 'center' }}>
            Train Movement
            {ganttLoading && <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', marginLeft: 12 }}>⏳ Fetching...</span>}
          </h3>
          {/* Station Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8 }}>
            <div></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>
              {['Delhi', 'Agra', 'Kanpur', 'Lucknow'].map(s => (
                <span key={s} style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{s}</span>
              ))}
            </div>
          </div>
          {/* Gantt Bars */}
          {displayGanttData.map((g) => (
            <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{g.label}</span>
              </div>
              <div style={{ position: 'relative', height: 32, background: '#f8fafc', borderRadius: 8, overflow: 'hidden' }}>
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
                <span key={h} style={{ fontSize: 10, color: '#94a3b8' }}>{h}</span>
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