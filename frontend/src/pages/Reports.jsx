import React, { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { reportDelayData, throughputData, conflictData, sectionUtilization } from '../data/dummyData'
import { Download, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { apiFetch } from '../utils/api'

const card = { background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', padding: 24 }

export default function Reports() {
  const [liveSchedule, setLiveSchedule] = useState(null)
  const [trains, setTrains] = useState([])
  const [fetchError, setFetchError] = useState(null)

  // ── Live schedule from localStorage (set by Simulation page after optimize) ──
  useEffect(() => {
    const fetchSchedule = () => {
      const storedSchedule = localStorage.getItem('trax_live_schedule')
      if (storedSchedule) {
        try { setLiveSchedule(JSON.parse(storedSchedule)) }
        catch (e) { console.error('Failed to parse schedule:', e) }
      }
    }
    fetchSchedule()
    window.addEventListener('trax_schedule_update', fetchSchedule)
    return () => window.removeEventListener('trax_schedule_update', fetchSchedule)
  }, [])

  // ── Fetch live train roster from the secured API (with polling) ──────────
  useEffect(() => {
    const fetchTrains = async () => {
      try {
        const res = await apiFetch('/api/v1/trains')
        if (!res) return
        if (!res.ok) throw new Error(`API error ${res.status}`)
        setTrains(await res.json())
        setFetchError(null)
      } catch (err) {
        setFetchError(err.message)
        console.error('Failed to fetch trains:', err)
      }
    }
    
    fetchTrains() // Initial fetch
    const interval = setInterval(fetchTrains, 5000) // Poll every 5 seconds
    
    return () => clearInterval(interval) // Cleanup on unmount
  }, [])

  const totalDelays = liveSchedule
    ? (liveSchedule?.Express_Train?.total_delay_mins || 0) + (liveSchedule?.Freight_Train?.total_delay_mins || 0)
    : 0;

  const currentDelayReduction = liveSchedule
    ? ((125 - totalDelays) / 125 * 100).toFixed(1) + '%'
    : '58.6%';

  const currentOnTime = liveSchedule
    ? (totalDelays > 0 ? '65%' : '88%')
    : '73%';

  const currentConflictsResolved = liveSchedule
    ? (totalDelays > 0 ? '22' : '26')
    : '24';

  // ── CSV export ──────────────────────────────────────────────────────────────
  const exportToCSV = () => {
    const header = ['ID', 'Type', 'Priority', 'Source', 'Destination', 'Status', 'Delay (min)']
    const rows = trains.map(t => [
      t.id, t.type, t.priority, t.source, t.destination, t.status, t.delay ?? 0,
    ])
    const csvContent = [header, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'trax_network_report.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── PDF export ──────────────────────────────────────────────────────────────
  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('TRAX Network Status Report', 14, 15)
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text(`Generated: ${new Date().toLocaleString()}  |  Trains loaded: ${trains.length}`, 14, 22)
    const tableData = trains.map(t => [
      t.id, t.type, t.priority, `${t.source} \u2192 ${t.destination}`, t.status, t.delay ?? 0,
    ])
    autoTable(doc, {
      head: [['ID', 'Type', 'Priority', 'Route', 'Status', 'Delay (min)']],
      body: tableData,
      startY: 27,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
      alternateRowStyles: { fillColor: [239, 246, 255] },
    })
    doc.save('trax_network_report.pdf')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f1f35' }}>Reports & Analytics</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Weekly performance metrics and optimization impact</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {fetchError && (
            <span style={{ fontSize: 12, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '5px 10px' }}>
              ⚠️ {fetchError}
            </span>
          )}
          <button
            id="export-csv"
            onClick={exportToCSV}
            disabled={trains.length === 0}
            title={trains.length === 0 ? 'Waiting for train data…' : `Export ${trains.length} trains as CSV`}
            style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1.5px solid #e5e7eb', background: '#fff', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, color: '#374151', cursor: trains.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: trains.length === 0 ? 0.5 : 1 }}>
            <Download size={14} /> Export CSV
          </button>
          <button
            id="export-pdf"
            onClick={exportToPDF}
            disabled={trains.length === 0}
            title={trains.length === 0 ? 'Waiting for train data…' : `Export ${trains.length} trains as PDF`}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: trains.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 2px 8px rgba(37,99,235,0.3)', opacity: trains.length === 0 ? 0.5 : 1 }}>
            <FileText size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Avg Delay Reduction', value: currentDelayReduction, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
          { label: 'On-Time Arrivals', value: currentOnTime, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'Conflicts Resolved', value: currentConflictsResolved, color: '#f59e0b', bg: '#fffbeb', border: '#fed7aa' },
        ].map(item => (
          <div key={item.label} style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: 14, padding: '20px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
            <p style={{ fontSize: 32, fontWeight: 800, color: item.color, marginTop: 6 }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f1f35', marginBottom: 16 }}>Delay Analytics — Before vs After</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={reportDelayData} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="before" name="Before (min)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="after" name="After (min)" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f1f35', marginBottom: 16 }}>Throughput Per Hour</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={throughputData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }} />
              <Line type="monotone" dataKey="trains" name="Trains/Hour" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 5, fill: '#2563eb' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f1f35', marginBottom: 16 }}>Daily Conflict Count</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={conflictData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }} />
              <Bar dataKey="conflicts" name="Conflicts" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f1f35', marginBottom: 20 }}>Section Utilization %</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sectionUtilization.map(item => {
              const color = item.utilization > 85 ? '#ef4444' : item.utilization > 65 ? '#f59e0b' : '#22c55e'
              return (
                <div key={item.section}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Section {item.section}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color }}>{item.utilization}%</span>
                  </div>
                  <div style={{ height: 10, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${item.utilization}%`, height: '100%', background: color, borderRadius: 10, transition: 'width 0.5s ease' }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}