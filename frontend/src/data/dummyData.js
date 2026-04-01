export const trains = [
  { id: "EXP101", type: "Express",   priority: "High",   from: "Delhi",   to: "Kanpur",  currentStation: "Station A", delay: 15, status: "Delayed",   source: "Delhi",   destination: "Kanpur",  scheduledTime: "10:00", actualTime: "10:15" },
  { id: "PSS202", type: "Passenger", priority: "Medium", from: "Kanpur",  to: "Lucknow", currentStation: "Station C", delay: 5,  status: "On Time",   source: "Kanpur",  destination: "Lucknow", scheduledTime: "10:20", actualTime: "10:25" },
  { id: "FRG311", type: "Freight",   priority: "Low",    from: "Agra",    to: "Jaipur",  currentStation: "Station D", delay: 30, status: "Waiting",   source: "Agra",    destination: "Jaipur",  scheduledTime: "09:30", actualTime: "10:00" },
  { id: "EXP412", type: "Express",   priority: "High",   from: "Mumbai",  to: "Pune",    currentStation: "Station B", delay: 10, status: "Delayed",   source: "Mumbai",  destination: "Pune",    scheduledTime: "10:10", actualTime: "10:20" },
  { id: "MEM513", type: "Mail",      priority: "Medium", from: "Bhopal",  to: "Indore",  currentStation: "Station A", delay: 0,  status: "On Time",   source: "Bhopal",  destination: "Indore",  scheduledTime: "10:30", actualTime: "10:30" },
  { id: "T-601",  type: "Passenger", priority: "Low",    from: "Chennai", to: "Mysore",  currentStation: "Station B", delay: 7,  status: "Waiting",   source: "Chennai", destination: "Mysore",  scheduledTime: "09:50", actualTime: "09:57" },
  { id: "T-702",  type: "Express",   priority: "High",   from: "Delhi",   to: "Agra",    currentStation: "Station E", delay: 0,  status: "Moving",    source: "Delhi",   destination: "Agra",    scheduledTime: "10:45", actualTime: "10:45" },
  { id: "T-803",  type: "Freight",   priority: "Low",    from: "Pune",    to: "Nashik",  currentStation: "Station C", delay: 20, status: "Delayed",   source: "Pune",    destination: "Nashik",  scheduledTime: "08:00", actualTime: "08:20" },
];

export const kpiData = {
  totalTrains: 24,
  totalDelayBefore: 125,
  totalDelayAfter: 67,
  delayReduction: 46.4,
};

export const alerts = [
  { id: 1, type: "conflict", message: "EXP101 and EXP412 conflict at Station B platform 2", time: "10:42", severity: "high" },
  { id: 2, type: "platform", message: "Station B platform capacity reached (3/3)", time: "10:44", severity: "medium" },
  { id: 3, type: "delay",    message: "FRG311 delay propagating to PSS202 at Station C",  time: "10:48", severity: "high" },
  { id: 4, type: "info",     message: "Re-optimization completed — 3 conflicts resolved",   time: "10:50", severity: "low" },
];

export const sections = [
  { id: "A-B", from: "Station A", to: "Station B", status: "occupied", train: "EXP101", nextTrain: "EXP412",  clearanceTime: "11:05" },
  { id: "B-C", from: "Station B", to: "Station C", status: "conflict", train: "EXP412", nextTrain: "PSS202",  clearanceTime: "11:20" },
  { id: "C-D", from: "Station C", to: "Station D", status: "clear",    train: null,     nextTrain: "FRG311",  clearanceTime: "11:40" },
  { id: "D-E", from: "Station D", to: "Station E", status: "occupied", train: "FRG311", nextTrain: "T-702",   clearanceTime: "11:55" },
];

export const delayChartData = [
  { station: "Station A", before: 26, after: 14 },
  { station: "Station B", before: 24, after: 15 },
  { station: "Station C", before: 40, after: 27 },
  { station: "Station D", before: 22, after: 12 },
  { station: "Station E", before: 26, after: 16 },
];

export const throughputData = [
  { hour: "06:00", trains: 2 },
  { hour: "07:00", trains: 4 },
  { hour: "08:00", trains: 6 },
  { hour: "09:00", trains: 5 },
  { hour: "10:00", trains: 3 },
  { hour: "11:00", trains: 4 },
];

export const reportDelayData = [
  { name: "Mon", before: 45, after: 18 },
  { name: "Tue", before: 52, after: 22 },
  { name: "Wed", before: 38, after: 15 },
  { name: "Thu", before: 60, after: 25 },
  { name: "Fri", before: 55, after: 20 },
  { name: "Sat", before: 30, after: 12 },
  { name: "Sun", before: 25, after: 10 },
];

export const sectionUtilization = [
  { section: "A-B", utilization: 78 },
  { section: "B-C", utilization: 92 },
  { section: "C-D", utilization: 55 },
  { section: "D-E", utilization: 67 },
];

export const conflictData = [
  { day: "Mon", conflicts: 3 },
  { day: "Tue", conflicts: 5 },
  { day: "Wed", conflicts: 2 },
  { day: "Thu", conflicts: 7 },
  { day: "Fri", conflicts: 4 },
  { day: "Sat", conflicts: 1 },
  { day: "Sun", conflicts: 2 },
];

export const ganttData = [
  { id: "D101",   label: "D101",   start: 0,    width: 120, color: "#ef4444", status: "Moving",  startTime: "10:00", endTime: "10:30" },
  { id: "PSS200", label: "PSS200", start: 130,  width: 100, color: "#2563eb", status: "On Time", startTime: "10:30", endTime: "11:00" },
  { id: "TSS011", label: "TSS011", start: 0,    width: 200, color: "#f59e0b", status: "Waiting", startTime: "10:00", endTime: "11:00" },
];

export const stationStatus = [
  { name: "Station A", train: "EXP101", color: "#ef4444", indicator: "green" },
  { name: "Station B", train: "EXP101", color: "#ef4444", indicator: "green" },
  { name: "Station C", train: "PSS202", color: "#2563eb", indicator: "green" },
  { name: "Station D", train: "FRG311", color: "#f59e0b", indicator: "orange" },
  { name: "Station E", train: null,     color: null,      indicator: "white" },
];