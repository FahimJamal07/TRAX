import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { reportDelayData, throughputData, conflictData, sectionUtilization } from '../data/dummyData'
import { Download, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { apiFetch } from '../utils/api'
import { getChartTooltipProps } from '../utils/chartTooltip'

const card = { padding: 24 }

export default function Reports() {
  const { isDarkMode } = useOutletContext() || { isDarkMode: false }
  const chartTooltipProps = getChartTooltipProps(isDarkMode)
  const [liveSchedule, setLiveSchedule] = useState(null)
  const [kpiSummary, setKpiSummary] = useState(null)
  const [trains, setTrains] = useState([])
  const [fetchError, setFetchError] = useState(null)

  // ── Live schedule from localStorage (set by Simulation page after optimize) ──
  useEffect(() => {
    const fetchSchedule = () => {
      const storedSchedule = localStorage.getItem('trax_live_schedule')
      const storedKpis = localStorage.getItem('trax_kpi_summary')
      if (storedSchedule) {
        try { setLiveSchedule(JSON.parse(storedSchedule)) }
        catch (e) { console.error('Failed to parse schedule:', e) }
      }
      if (storedKpis) {
        try { setKpiSummary(JSON.parse(storedKpis)) }
        catch (e) { console.error('Failed to parse KPI summary:', e) }
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

  const dynamicTotalDelays = liveSchedule
    ? Object.values(liveSchedule).reduce((sum, row) => sum + (Number(row?.total_delay_mins) || 0), 0)
    : 0

  const totalDelays = Number(kpiSummary?.total_delays_mins ?? dynamicTotalDelays)
  const currentDelayReduction = kpiSummary
    ? `${Number(kpiSummary.delay_reduction_percentage ?? 0).toFixed(1)}%`
    : `${Math.max(0, ((125 - totalDelays) / 125) * 100).toFixed(1)}%`
  const currentOnTime = kpiSummary
    ? `${Number(kpiSummary.on_time_percentage ?? 0).toFixed(1)}%`
    : (totalDelays > 0 ? '65.0%' : '88.0%')
  const currentConflictsResolved = String(Number(kpiSummary?.conflicts_resolved ?? 0))

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
    <div className="reports-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="text-slate-900 dark:text-white" style={{ fontSize: 20, fontWeight: 700 }}>Reports & Analytics</h2>
          <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: 13, marginTop: 2 }}>Weekly performance metrics and optimization impact</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {fetchError && (
            <span className="sim-alert sim-alert-danger" style={{ fontSize: 12, padding: '5px 10px' }}>
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
          { label: 'Avg Delay Reduction', value: currentDelayReduction, className: 'kpi kpi-blue' },
          { label: 'On-Time Arrivals', value: currentOnTime, className: 'kpi kpi-emerald' },
          { label: 'Conflicts Resolved', value: currentConflictsResolved, className: 'kpi kpi-amber' },
        ].map(item => (
          <div key={item.label} className={item.className} style={{ borderRadius: 14, padding: '20px 24px', textAlign: 'center' }}>
            <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
            <p className={item.label === 'Avg Delay Reduction' ? 'text-blue-600 dark:text-blue-400' : item.label === 'On-Time Arrivals' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} style={{ fontSize: 32, fontWeight: 800, marginTop: 6 }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="whatif-card whatif-card-neutral bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700 transition-colors duration-200" style={card}>
          <h3 className="text-slate-900 dark:text-white" style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Delay Analytics — Before vs After</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={reportDelayData} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip {...chartTooltipProps} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="before" name="Before (min)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="after" name="After (min)" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="whatif-card whatif-card-neutral bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700 transition-colors duration-200" style={card}>
          <h3 className="text-slate-900 dark:text-white" style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Throughput Per Hour</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={throughputData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip {...chartTooltipProps} />
              <Line type="monotone" dataKey="trains" name="Trains/Hour" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 5, fill: '#2563eb' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="whatif-card whatif-card-neutral bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700 transition-colors duration-200" style={card}>
          <h3 className="text-slate-900 dark:text-white" style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Daily Conflict Count</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={conflictData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip {...chartTooltipProps} />
              <Bar dataKey="conflicts" name="Conflicts" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="whatif-card whatif-card-neutral bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700 transition-colors duration-200" style={card}>
          <h3 className="text-slate-900 dark:text-white" style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>Section Utilization %</h3>
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