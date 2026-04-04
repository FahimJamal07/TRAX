import React, { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Train,
  Settings as SettingsIcon,
  Save,
} from 'lucide-react'

const MODE_OPTIONS = [
  {
    value: 'minimize_delay',
    title: 'Minimize Delay',
    description: 'Prioritize timetable adherence and reduce cumulative lateness.',
  },
  {
    value: 'balanced',
    title: 'Balanced Mode',
    description: 'Optimize both timetable adherence and total network clearing time.',
  },
  {
    value: 'maximize_throughput',
    title: 'Maximize Throughput',
    description: 'Prioritize total train flow and clear the network as fast as possible.',
  },
]

const WEIGHT_FIELDS = [
  { key: 'express', label: 'Express' },
  { key: 'passenger', label: 'Passenger' },
  { key: 'freight', label: 'Freight' },
]

const cardClass = 'whatif-card whatif-card-neutral bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700 transition-colors duration-200'
const cardPadding = { padding: 24 }
const sectionTitleStyle = { fontSize: 14, fontWeight: 700, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)' }
const inp = {
  border: '1.5px solid #e5e7eb',
  borderRadius: 10,
  padding: '10px 14px', 
  fontSize: 13,
  outline: 'none',
  fontFamily: 'DM Sans, sans-serif',
  width: '100%',
  color: '#0f1f35',
}
const rangeStyle = { width: '100%', height: 8, accentColor: '#2563eb' }
const fieldGroupStyle = { display: 'flex', flexDirection: 'column', rowGap: 10 }
const btnPrimary = {
  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '12px 24px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
  float: 'right',
}

export default function Settings() {
  const [settings, setSettings] = useState(() => {
    try {
      const savedConfig = localStorage.getItem('trax_config')
      const parsed = savedConfig ? JSON.parse(savedConfig) : {}

      return {
        optimizationMode: parsed.mode ?? 'minimize_delay',
        headwayTime: parsed.headway ?? 5,
        weights: {
          express: parsed.expW ?? parsed.weights?.express ?? 8,
          passenger: parsed.pasW ?? parsed.weights?.passenger ?? 6,
          freight: parsed.frtW ?? parsed.weights?.freight ?? 4,
        },
        solverTimeout: parsed.solverTimeout ?? '30s',
        allowTrainDropping: parsed.allowTrainDropping ?? false,
      }
    } catch {
      return {
        optimizationMode: 'minimize_delay',
        headwayTime: 5,
        weights: {
          express: 8,
          passenger: 6,
          freight: 4,
        },
        solverTimeout: '30s',
        allowTrainDropping: false,
      }
    }
  })

  const setOptimizationMode = (nextMode) => {
    setSettings((prev) => ({ ...prev, optimizationMode: nextMode }))
  }

  const s = {
    mode: settings.optimizationMode,
  }

  const set = (key, value) => {
    if (key === 'mode') {
      setOptimizationMode(value)
    }
  }

  const allowTrainDropping = settings.allowTrainDropping
  const setAllowTrainDropping = (nextValue) => {
    setSettings((prev) => ({ ...prev, allowTrainDropping: nextValue }))
  }

  const handleSave = () => {
    const configPayload = {
      mode: settings.optimizationMode,
      headway: settings.headwayTime,
      solverTimeout: settings.solverTimeout,
      weights: settings.weights,
      allowTrainDropping: settings.allowTrainDropping,
    }
    localStorage.setItem('trax_config', JSON.stringify(configPayload))
    toast.success('Configuration saved successfully!')
  }

  return (
    <div className="settings-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 className="text-slate-900 dark:text-white" style={{ fontSize: 20, fontWeight: 700 }}>Engine Configuration Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: 13, marginTop: 2 }}>Configure the CP-SAT engine behavior and scheduling guardrails.</p>
        </div>
      </div>

      <section className={cardClass} style={{ ...cardPadding, borderRadius: 20 }}>
        <h2 className="text-slate-900 dark:text-white flex items-center" style={{ ...sectionTitleStyle, columnGap: 12 }}>
          <SettingsIcon className="w-5 h-5 shrink-0" style={{ marginRight: 2 }} />
          Optimization Mode
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[
            { value: 'minimize_delay', label: 'Minimize Delay', desc: 'Prioritize timetable adherence and reduce cumulative lateness.' },
            { value: 'balanced', label: 'Balanced Mode', desc: 'Optimize both timetable adherence and total network clearing time.' },
            { value: 'maximize_throughput', label: 'Maximize Throughput', desc: 'Prioritize total train flow and clear the network as fast as possible.' },
          ].map(mode => {
            const isActive = s.mode === mode.value;
            return (
              <div
                key={mode.value}
                onClick={() => set('mode', mode.value)}
                className={isActive ? "whatif-card-info" : "surface-card-secondary"}
                style={{ padding: '16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '12px', transition: 'all 0.2s' }}
              >
                {/* Custom Radio Dot */}
                <div style={{ 
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: '2px', transition: 'all 0.2s',
                  border: isActive ? '5px solid #3b82f6' : '2px solid #94a3b8', 
                  background: isActive ? '#fff' : 'transparent' 
                }}></div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: isActive ? '#3b82f6' : 'inherit' }}>
                    {mode.label}
                  </span>
                  <span className="surface-subtext" style={{ fontSize: 12, lineHeight: 1.4 }}>
                    {mode.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={cardClass} style={cardPadding}>
        <h2 className="text-slate-900 dark:text-white flex items-center" style={{ ...sectionTitleStyle, columnGap: 12 }}>
          <Train className="w-5 h-5 shrink-0" style={{ marginRight: 2 }} />
          Priority Weights
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {WEIGHT_FIELDS.map((field) => {
            const value = settings.weights[field.key]

            return (
              <div key={field.key} className={cardClass} style={{ padding: '16px', borderRadius: '12px' }}>
                <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-3">
                  {field.label}
                </label>
                <div className="flex items-center gap-3" style={{padding:4}}>
                  <input
                    type="range"
                    className="surface-input"
                    min={1}
                    max={10}
                    step={1}
                    value={value}
                    onChange={(e) => {
                      const next = Number(e.target.value)
                      setSettings((prev) => ({
                        ...prev,
                        weights: {
                          ...prev.weights,
                          [field.key]: next,
                        },
                      }))
                    }}
                    style={rangeStyle}
                  />
                  <span className="min-w-6 text-right text-slate-300 text-sm font-semibold" style={{marginLeft:8}}>
                    {value}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className={cardClass} style={cardPadding}>
        <h2 className="text-slate-900 dark:text-white flex items-center" style={{ ...sectionTitleStyle, columnGap: 12 }}>
          <SettingsIcon className="w-5 h-5 shrink-0" style={{ marginRight: 2 }} />
          Engine Guardrails
        </h2>

        <div className="flex flex-col gap-5">
          <label style={fieldGroupStyle}>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Global Headway Time (minutes)</span>
            <input
              type="number"
              min={1}
              className="surface-input"
              value={settings.headwayTime}
              onChange={(e) => {
                const next = Number(e.target.value)
                setSettings((prev) => ({ ...prev, headwayTime: Number.isNaN(next) ? 1 : Math.max(1, next) }))
              }}
              style={inp}
            />
          </label>

          <label style={fieldGroupStyle}>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200" style={{marginTop:10}}>Solver Time Limit</span>
            <select
              className="surface-input"
              value={settings.solverTimeout}
              onChange={(e) => setSettings((prev) => ({ ...prev, solverTimeout: e.target.value }))}
              style={inp}
            >
              <option value="5s">5s</option>
              <option value="15s">15s</option>
              <option value="30s">30s</option>
              <option value="60s">60s</option>
            </select>
          </label>
        </div>

        <div className="surface-card-secondary" style={{ marginTop: 20, padding: 16, borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Allow Train Dropping (Constraint Relaxation)</span>
              <span className="surface-subtext" style={{ fontSize: 12 }}>Lets the solver drop lower-priority trains if no feasible full schedule exists.</span>
            </div>
            <button
              type="button"
              onClick={() => setAllowTrainDropping(!allowTrainDropping)}
              style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: allowTrainDropping ? '#2563eb' : '#cbd5e1', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: allowTrainDropping ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}></div>
            </button>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={handleSave}
          style={btnPrimary}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Save className="w-5 h-5" />
            Save Configuration
          </span>
        </button>
      </div>
    </div>
  )
}
