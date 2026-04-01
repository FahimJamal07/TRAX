import React, { useState, useEffect } from 'react';

// Coordinates scaled perfectly for the sleek dashboard aesthetic
const STATIONS = [
    { id: "A", name: "Station A", letter: "A", cx: 100, cy: 200, capacity: 3 },
    { id: "B", name: "Station B", letter: "B", cx: 350, cy: 200, capacity: 4 },
    { id: "C", name: "Station C", letter: "C", cx: 600, cy: 200, capacity: 3 },
    { id: "D", name: "Station D", letter: "D", cx: 850, cy: 200, capacity: 4 },
    { id: "E", name: "Station E", letter: "E", cx: 1100, cy: 200, capacity: 3 }
];

const TRACK_LINES = {
    // Section A-B (100 to 350)
    "A-B-M":  { path: "M 100 200 L 350 200", type: "mainline", midX: 225, midY: 200 },
    "A-B-L1": { path: "M 100 200 L 130 160 L 320 160 L 350 200", type: "loop", midX: 225, midY: 160 },
    "A-B-L2": { path: "M 100 200 L 130 240 L 320 240 L 350 200", type: "loop", midX: 225, midY: 240 },
    // Section B-C (350 to 600)
    "B-C-M":  { path: "M 350 200 L 600 200", type: "mainline", midX: 475, midY: 200 },
    "B-C-L1": { path: "M 350 200 L 380 160 L 570 160 L 600 200", type: "loop", midX: 475, midY: 160 },
    "B-C-L2": { path: "M 350 200 L 380 240 L 570 240 L 600 200", type: "loop", midX: 475, midY: 240 },
    // Section C-D (600 to 850)
    "C-D-M":  { path: "M 600 200 L 850 200", type: "mainline", midX: 725, midY: 200 },
    "C-D-L1": { path: "M 600 200 L 630 160 L 820 160 L 850 200", type: "loop", midX: 725, midY: 160 },
    "C-D-L2": { path: "M 600 200 L 630 240 L 820 240 L 850 200", type: "loop", midX: 725, midY: 240 },
    // Section D-E (850 to 1100)
    "D-E-M":  { path: "M 850 200 L 1100 200", type: "mainline", midX: 975, midY: 200 },
    "D-E-L1": { path: "M 850 200 L 880 160 L 1070 160 L 1100 200", type: "loop", midX: 975, midY: 160 },
    "D-E-L2": { path: "M 850 200 L 880 240 L 1070 240 L 1100 200", type: "loop", midX: 975, midY: 240 }
};

const SECTIONS = [
    { id: "A-B", start: "Station A", end: "Station B" },
    { id: "B-C", start: "Station B", end: "Station C" },
    { id: "C-D", start: "Station C", end: "Station D" },
    { id: "D-E", start: "Station D", end: "Station E" }
];

export default function SectionMap() {
    const [trains, setTrains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null });
    const [stationTooltip, setStationTooltip] = useState({ visible: false, x: 0, y: 0, data: null });
    const [selectedBlock, setSelectedBlock] = useState(null);
    const [selectedTrainOverlay, setSelectedTrainOverlay] = useState(null);
    const [selectedStation, setSelectedStation] = useState(null);

    useEffect(() => {
        const fetchTopology = async () => {
            try {
                const token = localStorage.getItem('trax_token');
                if (!token) return;
                const headers = { 'Authorization': "Bearer " + token };

                const trainsRes = await fetch('http://127.0.0.1:8000/api/v1/trains', { headers });

                if (trainsRes.ok) {
                    setTrains(await trainsRes.json());
                }
            } catch (error) {
                console.error("Failed to fetch map data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTopology();
        const interval = setInterval(fetchTopology, 5000);
        window.addEventListener('trax_network_update', fetchTopology);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('trax_network_update', fetchTopology);
        };
    }, []);

    const getLaneStatus = (trackId) => {
        const trainsOnTrack = trains.filter(t => t.track_id === trackId);
        if (trainsOnTrack.length === 0) return { status: 'clear', line: '#94a3b8', bg: '#f1f5f9', text: '#64748b' };
        
        const hasDelay = trainsOnTrack.some(t => t.delay > 0);
        const hasConflict = trainsOnTrack.length > 1 && hasDelay;

        if (hasConflict) return { status: 'conflict', line: '#ef4444', bg: '#fef2f2', text: '#ef4444' };
        if (hasDelay) return { status: 'delayed', line: '#f97316', bg: '#fff7ed', text: '#f97316' };
        return { status: 'occupied', line: '#3b82f6', bg: '#eff6ff', text: '#3b82f6' };
    };

    const trainsByTrack = trains.reduce((acc, train) => {
        const trackId = train.schedule?.track_id || train.track_id;
        if (trackId && TRACK_LINES[trackId]) {
            if (!acc[trackId]) acc[trackId] = [];
            acc[trackId].push(train);
        }
        return acc;
    }, {});

    if (loading) return <div style={{ padding: 40, color: '#64748b', fontWeight: 600 }}>Initializing Visualization...</div>;

    return (
        <div style={{ minHeight: '100vh', paddingBottom: 64 }}>
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', padding: 32, marginBottom: 32 }}>
                <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f1f35', margin: 0 }}>Section Map</h2>
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, margin: 0 }}>Live track visualization — click a section for details</p>
                </div>

                <div style={{ width: '100%', overflowX: 'auto', position: 'relative', borderTop: '1px solid #f1f5f9', paddingTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '450px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <p style={{ position: 'absolute', top: 12, left: 0, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', margin: 0 }}>Track Layout — Zone A</p>
                    
                    <svg viewBox="0 60 1200 280" style={{ width: '100%', minWidth: 1100, height: '100%', minHeight: 300 }}>
                        <defs>
                            <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.06" floodColor="#000000" />
                            </filter>
                            <filter id="node-shadow" x="-30%" y="-30%" width="160%" height="160%">
                                <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.10" floodColor="#0f172a" />
                            </filter>
                            <filter id="badge-shadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.12" floodColor="#0f1f35" />
                            </filter>
                        </defs>

                        {/* 1. DRAW ALL PHYSICAL TRACKS */}
                        {Object.entries(TRACK_LINES).map(([trackId, coords]) => {
                            const lane = getLaneStatus(trackId);
                            const sectionId = trackId.substring(0, 3);
                            const isActiveBlock = selectedBlock?.id === trackId || selectedBlock?.id === sectionId;
                            const opacity = (selectedBlock && !isActiveBlock) ? 0.2 : 1;
                            const isMainline = coords.type === "mainline";
                            const strokeColor = lane.status === 'clear' ? (isMainline ? "#94a3b8" : "#e2e8f0") : lane.line;

                            return (
                                <g key={trackId} onClick={() => setSelectedBlock({ type: 'Lane', id: trackId })} style={{ cursor: 'pointer', opacity: opacity, transition: 'opacity 0.3s' }}>
                                    {/* Thick Base Line representing track status */}
                                    <path
                                        d={coords.path}
                                        fill="transparent"
                                        stroke={strokeColor} 
                                        strokeWidth={isMainline ? "8" : "4"} 
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeDasharray={isMainline ? "none" : "8 4"}
                                    />
                                    {/* Railway Cross-Ties (Dashed inner line for realism) */}
                                    {isMainline && (
                                        <path
                                            d={coords.path}
                                            fill="transparent"
                                            stroke="#ffffff" 
                                            strokeWidth="2" 
                                            strokeDasharray="6 6" 
                                            opacity="0.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            pointerEvents="none"
                                        />
                                    )}
                                    
                                    {/* Track Label */}
                                    <text x={coords.midX} y={coords.midY - 12} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">
                                        {isMainline ? "MAINLINE" : "LOOP"} ({trackId})
                                    </text>
                                    
                                </g>
                            );
                        })}

                        {/* 2. DRAW STATIONS (Solid cards that mask tracks behind labels) */}
                        {STATIONS.map((station) => {
                            const isNodeSelected = selectedBlock?.type === 'Station' && selectedBlock?.id === station.name;
                            const scale = isNodeSelected ? 'scale(1.15)' : 'scale(1)';

                            const dockedTrainList = trains.filter((t) =>
                                t.schedule?.current_station === station.name ||
                                t.currentStation === station.name ||
                                t.current_station === station.name
                            );
                            const dockedTrains = dockedTrainList.length;
                            const occupied = Math.min(dockedTrains, station.capacity);
                            const hasConflict = dockedTrains > station.capacity;

                            return (
                                <g 
                                    key={station.id} 
                                    style={{ cursor: 'pointer', transform: scale, transformOrigin: `${station.cx}px ${station.cy}px`, transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                    onMouseEnter={(e) => { 
                                        e.currentTarget.style.transform = 'scale(1.15)'; 
                                        setStationTooltip({
                                            visible: true,
                                            x: e.clientX,
                                            y: e.clientY,
                                            data: { ...station, occupied, occupiedCount: occupied, hasConflict, occupyingTrains: dockedTrainList }
                                        });
                                    }}
                                    onMouseMove={(e) => setStationTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))}
                                    onMouseLeave={(e) => { 
                                        e.currentTarget.style.transform = isNodeSelected ? 'scale(1.15)' : 'scale(1)'; 
                                        setStationTooltip({ visible: false, x: 0, y: 0, data: null });
                                    }}
                                    onClick={(e) => { 
                                        e.stopPropagation();
                                        setSelectedStation({ ...station, occupiedCount: occupied, occupyingTrains: dockedTrainList, hasConflict });
                                        setSelectedBlock({ type: 'Station', id: station.name }); 
                                    }}
                                >
                                    {/* Stable transparent hit area */}
                                    <circle cx={station.cx} cy={station.cy} r="38" fill="transparent" />

                                    {/* Solid Card Background - slightly narrower to give tracks more room */}
                                    <rect x={station.cx - 40} y={station.cy - 30} width="80" height="64" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" filter="url(#soft-shadow)" />

                                    {/* The Exact Train Logo Replication */}
                                    <g transform={`translate(${station.cx}, ${station.cy - 14})`}>
                                        {/* Black rounded square */}
                                        <rect x="-12" y="-12" width="24" height="24" rx="5" fill="#0f172a" />
                                        {/* White train chassis */}
                                        <rect x="-7" y="-7" width="14" height="12" rx="2" fill="#ffffff" />
                                        {/* Train roof/bumper */}
                                        <path d="M -4 -9 L 4 -9 L 5 -7 L -5 -7 Z" fill="#ffffff" />
                                        {/* Dark window cutout */}
                                        <rect x="-4" y="-4" width="8" height="4" rx="1" fill="#0f172a" />
                                        {/* Headlights */}
                                        <circle cx="-3" cy="3" r="1.2" fill="#0f172a" />
                                        <circle cx="3" cy="3" r="1.2" fill="#0f172a" />
                                    </g>

                                    {/* Station Name */}
                                    <text x={station.cx} y={station.cy + 14} textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">
                                        {station.name}
                                    </text>

                                    {/* Dynamic capacity dots */}
                                    <g transform={`translate(${station.cx - (station.capacity * 4)}, ${station.cy + 22})`}>
                                        {[...Array(station.capacity)].map((_, i) => (
                                            <circle
                                                key={i}
                                                cx={i * 8}
                                                cy="0"
                                                r="2.5"
                                                fill={i < occupied ? '#3b82f6' : '#cbd5e1'}
                                            />
                                        ))}
                                    </g>
                                </g>
                            );
                        })}

                        {/* 3. DRAW LIVE TRAINS ON TRACKS with anti-collision offsets */}
                        {Object.entries(trainsByTrack).flatMap(([trackId, trackTrains]) => {
                            const track = TRACK_LINES[trackId];
                            const totalOnTrack = trackTrains.length;

                            return trackTrains.map((train, index) => {
                                // Dynamic Compression: If 3 or more trains share a track, squeeze them to 50px apart. Otherwise 70px.
                                const spacing = totalOnTrack > 2 ? 50 : 70;
                                const xOffset = (index - (totalOnTrack - 1) / 2) * spacing;
                                const trainX = track.midX + xOffset;

                                const isDelayed = train.delay > 0;
                                const bgColor = isDelayed ? '#fef2f2' : '#ecfdf5';
                                const strokeColor = isDelayed ? '#f87171' : '#34d399';
                                const textColor = isDelayed ? '#dc2626' : '#059669';
                                const isSelected = selectedBlock?.type === 'Train' && selectedBlock?.id === train.id;

                                return (
                                    <g
                                        key={train.id}
                                        style={{ cursor: 'pointer' }}
                                        pointerEvents="all"
                                        onMouseEnter={(e) => {
                                            setTooltip({ visible: true, x: e.clientX, y: e.clientY, data: train });
                                        }}
                                        onMouseMove={(e) => setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))}
                                        onMouseLeave={() => {
                                            setTooltip({ visible: false, x: 0, y: 0, data: null });
                                        }}
                                        onClick={(e) => { e.stopPropagation(); setSelectedTrainOverlay(train); setSelectedBlock({ type: 'Train', id: train.id }); }}
                                    >
                                        <rect x={trainX - 30} y={track.midY - 12} width="60" height="24" rx="12" fill={bgColor} stroke={strokeColor} strokeWidth="2" filter="url(#badge-shadow)" />
                                        <text x={trainX} y={track.midY + 4} textAnchor="middle" fill={textColor} fontSize="11" fontWeight="bold">
                                            {train.id}
                                        </text>
                                        {(isSelected || (tooltip.visible && tooltip.data?.id === train.id)) && (
                                            <rect x={trainX - 33} y={track.midY - 15} width="66" height="30" rx="15" fill="transparent" stroke="#1d4ed8" strokeWidth="1.5" pointerEvents="none" />
                                        )}
                                    </g>
                                );
                            });
                        })}
                    </svg>
                </div>
            </div>

            {/* 4. STATION / SECTION INFO CARDS GRID */}
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f1f35', margin: 0 }}>Network Segment Telemetry</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 24 }}>Detailed breakdown of live traffic and capacity per topographical segment.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                {SECTIONS.map(section => {
                    const sectionTrackIds = Object.keys(TRACK_LINES).filter(k => k.startsWith(section.id));
                    const trainsInSection = trains.filter(t => sectionTrackIds.includes(t.track_id));
                    
                    let sectionStatus = 'clear';
                    let sColorStyle = { backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' };
                    if (trainsInSection.some(t => t.delay > 0)) {
                        sectionStatus = trainsInSection.length > 1 ? 'conflict' : 'occupied (delayed)';
                        sColorStyle = { backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' };
                    } else if (trainsInSection.length > 0) {
                        sectionStatus = 'occupied';
                        sColorStyle = { backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
                    }

                    const activeTrainsStr = trainsInSection.length > 0 ? trainsInSection.map(t => t.id).join(', ') : 'None';
                    const maxDelay = trainsInSection.length > 0 ? Math.max(...trainsInSection.map(t => t.delay)) : 0;
                    const isActive = selectedBlock?.id === section.id;

                    return (
                        <div 
                            key={section.id} 
                            onClick={() => setSelectedBlock({ type: 'Section', id: section.id })}
                            style={{
                                background: '#fff',
                                borderRadius: 16,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
                                border: isActive ? '2px solid #2563eb' : '1px solid rgba(0,0,0,0.05)',
                                padding: 24,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                transform: isActive ? 'translateY(-2px)' : 'none'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f1f35', margin: 0 }}>Section {section.id}</h3>
                                <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', padding: '4px 8px', borderRadius: 6, ...sColorStyle }}>
                                    {sectionStatus}
                                </span>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div>
                                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>ROUTE PATH</span>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: '#0f1f35' }}>
                                        {section.start} <span style={{ color: '#cbd5e1', margin: '0 4px' }}>→</span> {section.end}
                                    </span>
                                </div>
                                
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>LIVE TRAIN(S)</span>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0f1f35' }}>
                                            {activeTrainsStr}
                                        </span>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>MAX DEVIATION</span>
                                        <span style={{ fontSize: 15, fontWeight: 700, color: maxDelay > 0 ? '#ef4444' : '#10b981' }}>
                                            {maxDelay > 0 ? `+${maxDelay} mins` : (trainsInSection.length > 0 ? "On time" : "--")}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* FLOATING EXACT-POSITION TOOLTIP (On Hover) */}
            {tooltip.visible && tooltip.data && !selectedTrainOverlay && (
                <div 
                    style={{ position: 'fixed', zIndex: 50, top: tooltip.y - 15, left: tooltip.x, transform: 'translate(-50%, -100%)', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', padding: 20, borderRadius: 12, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', pointerEvents: 'none', minWidth: 220 }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: 12, marginBottom: 12 }}>
                        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>{tooltip.data.id}</span>
                        <span style={{ fontSize: 10, padding: '4px 8px', borderRadius: 4, fontWeight: 800, textTransform: 'uppercase', backgroundColor: tooltip.data.delay > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: tooltip.data.delay > 0 ? '#f87171' : '#34d399', border: tooltip.data.delay > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)' }}>
                            {tooltip.data.delay > 0 ? "DELAYED" : "ON TIME"}
                        </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 24px', fontSize: 14 }}>
                        <span style={{ color: '#94a3b8', fontWeight: 500 }}>Type:</span>
                        <span style={{ fontWeight: 700, textAlign: 'right' }}>{tooltip.data.type}</span>
                        <span style={{ color: '#94a3b8', fontWeight: 500 }}>Priority:</span>
                        <span style={{ fontWeight: 700, textAlign: 'right' }}>{tooltip.data.priority}</span>
                        <span style={{ color: '#94a3b8', fontWeight: 500 }}>Deviation:</span>
                        <span style={{ fontWeight: 700, textAlign: 'right', color: tooltip.data.delay > 0 ? '#f87171' : '#34d399' }}>
                            {tooltip.data.delay > 0 ? `+${tooltip.data.delay} min` : "On Time"}
                        </span>
                    </div>
                </div>
            )}
            
            {/* STATION HOVER TOOLTIP */}
            {stationTooltip.visible && stationTooltip.data && !selectedStation && (
                <div 
                    style={{ position: 'fixed', zIndex: 50, top: stationTooltip.y - 15, left: stationTooltip.x, transform: 'translate(-50%, -100%)', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', padding: 20, borderRadius: 12, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', pointerEvents: 'none', minWidth: 220 }}
                >
                    {(() => {
                        const N = stationTooltip.data.occupiedCount;
                        const C = stationTooltip.data.capacity;
                        const Occupied = Math.min(N, C);
                        const Queued = Math.max(0, N - C);
                        
                        return (
                            <>
                                <div style={{ paddingBottom: 12, borderBottom: '1px solid #334155', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
                                    <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>{stationTooltip.data.name}</span>
                                    <span
                                        style={{
                                            fontSize: 10,
                                            padding: '4px 8px',
                                            borderRadius: 6,
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em',
                                            backgroundColor: stationTooltip.data.hasConflict ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                            color: stationTooltip.data.hasConflict ? '#f87171' : '#34d399'
                                        }}
                                    >
                                        {stationTooltip.data.hasConflict ? 'CONFLICT' : 'CLEAR'}
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 24px', fontSize: 14 }}>
                                    <span style={{ color: '#94a3b8', fontWeight: 500 }}>Capacity:</span>
                                    <span style={{ fontWeight: 700, textAlign: 'right' }}>Max {C}</span>
                                    <span style={{ color: '#94a3b8', fontWeight: 500 }}>Utilization:</span>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right', alignItems: 'flex-end' }}>
                                        <span style={{ color: '#cbd5e1', fontWeight: 500 }}>
                                            Platforms: <span style={{ fontWeight: 'bold', color: 'white' }}>{Occupied} / {C}</span>
                                        </span>
                                        {Queued > 0 && (
                                            <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 'bold', marginTop: '2px' }}>
                                                +{Queued} trains queued on approach
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* TRAIN MODAL OVERLAY (On Click) */}
            {selectedTrainOverlay && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedTrainOverlay(null)}>
                    <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 400, maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h3 style={{ fontSize: 24, fontWeight: 800, color: '#0f1f35', margin: 0 }}>{selectedTrainOverlay.id}</h3>
                            <button onClick={() => setSelectedTrainOverlay(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 20, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontWeight: 'bold' }}>✕</button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Train Type</span>
                                <span style={{ color: '#0f1f35', fontSize: 14, fontWeight: 700 }}>{selectedTrainOverlay.type}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Priority Class</span>
                                <span style={{ color: '#0f1f35', fontSize: 14, fontWeight: 700 }}>{selectedTrainOverlay.priority}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Live Location (Lane)</span>
                                <span style={{ color: '#0f1f35', fontSize: 14, fontWeight: 700 }}>{selectedTrainOverlay.track_id}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Operational Status</span>
                                <span style={{ color: selectedTrainOverlay.delay > 0 ? '#ef4444' : '#10b981', fontSize: 14, fontWeight: 800 }}>
                                    {selectedTrainOverlay.delay > 0 ? "DELAYED" : "ON TIME"}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: 16, borderRadius: 12, backgroundColor: selectedTrainOverlay.delay > 0 ? '#fef2f2' : '#f0fdf4', border: selectedTrainOverlay.delay > 0 ? '1px solid #fecaca' : '1px solid #bbf7d0' }}>
                                <span style={{ color: selectedTrainOverlay.delay > 0 ? '#b91c1c' : '#15803d', fontSize: 14, fontWeight: 700 }}>Schedule Deviation</span>
                                <span style={{ color: selectedTrainOverlay.delay > 0 ? '#ef4444' : '#10b981', fontSize: 20, fontWeight: 900 }}>
                                    {selectedTrainOverlay.delay > 0 ? `+${selectedTrainOverlay.delay} mins` : 'On Time'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STATION MODAL OVERLAY (On Click) */}
            {selectedStation && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedStation(null)}>
                    <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 400, maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h3 style={{ fontSize: 24, fontWeight: 800, color: '#0f1f35', margin: 0 }}>{selectedStation.name}</h3>
                            <button onClick={() => setSelectedStation(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 20, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontWeight: 'bold' }}>✕</button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Station Identifier</span>
                                <span style={{ color: '#0f1f35', fontSize: 14, fontWeight: 700 }}>{selectedStation.id}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Max Platform Capacity</span>
                                <span style={{ color: '#0f1f35', fontSize: 14, fontWeight: 700 }}>{selectedStation.capacity} Bays</span>
                            </div>
                            
                            <div style={{ marginTop: 8 }}>
                                <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 12 }}>Currently Occupying Trains</span>
                                {selectedStation.occupyingTrains.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {selectedStation.occupyingTrains.map(t => (
                                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                                <span style={{ fontWeight: 700, color: '#0f1f35' }}>{t.id}</span>
                                                <span style={{ fontSize: 12, fontWeight: 800, color: t.delay > 0 ? '#ef4444' : '#10b981' }}>
                                                    {t.delay > 0 ? `Delayed (+${t.delay}m)` : 'On Time'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', color: '#64748b', fontSize: 14, fontWeight: 500 }}>
                                        No trains currently occupying platforms.
                                    </div>
                                )}
                            </div>
                            
                            {selectedStation.occupiedCount >= selectedStation.capacity && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: 16, borderRadius: 12, backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                                    <span style={{ color: '#b91c1c', fontSize: 14, fontWeight: 700 }}>Station Status</span>
                                    <span style={{ color: '#ef4444', fontSize: 16, fontWeight: 900 }}>AT CAPACITY</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}