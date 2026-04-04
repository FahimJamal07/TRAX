# TRAX Frontend Development Guidelines

You are an Expert Frontend Architect working on Project TRAX, an enterprise Train Traffic Control System. Your primary directive is architectural and visual consistency.

## 1. Pattern Mimicry (LOOK FIRST, CODE SECOND)
Before generating any UI component or logic, you MUST search the workspace for similar existing implementations (e.g., look at `Simulation.jsx`, `Dashboard.jsx`, or `TrainList.jsx`).
* **Copy the exact DOM structure and styling patterns.** Do not invent new layouts or color schemes.
* If building a card, look at the `card` const object in `Simulation.jsx` or `Reports.jsx` and use the exact same inline styles.

## 2. Styling & Theming (Inline Styles + Semantic Hex Codes)
TRAX heavily relies on specific inline style objects to guarantee rendering consistency alongside some Tailwind.
* **Primary Cards:** Use the standard inline style: `style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', padding: 24 }}`
* **Color Palette (Strict):**
  * Navy (Headers/Dark text): `#0f1f35`
  * Brand Blue (Primary Actions): `#2563eb` to `#1d4ed8`
  * Slate (Subtext/Borders): `#64748b`, `#e5e7eb`
  * Success/Clear: `#16a34a` / `#f0fdf4`
  * Danger/Conflict: `#ef4444` / `#fef2f2`
* **Form Inputs:** Look at the `input` and `btnPrimary` consts in `Simulation.jsx` for exact styling. Do not use default HTML inputs.

## 3. Data Fetching & State Synchronization
The app uses a specific vanilla React fetching architecture. You must follow these rules for async data:
* **Fetching:** Use `useEffect` wrapping an async function that calls our custom `apiFetch('/api/v1/...')` utility. Always handle loading (`setIsLoading`) and error (`setError`) states.
* **Polling:** For live data (like trains or alerts), use `setInterval` inside `useEffect` and ensure it is cleared on unmount.
* **Global Sync:** When a mutation occurs (like saving settings or optimizing), trigger global updates using custom window events: `window.dispatchEvent(new Event('trax_network_update'))` or `trax_schedule_update`. Components should listen to these events to refetch data.
* **Local Storage:** `trax_live_schedule` and `trax_weights` are stored in localStorage. Parse them safely in `useEffect` or state initializers.

## 4. Component Architecture
* Keep functional components clean.
* Use Lucide-React (`lucide-react`) for all icons. Size them appropriately (usually `size={14}` to `size={20}`).
* If a component requires complex conditional rendering for statuses (Delayed, On Time, Moving), map them to specific background/text color configurations like `statusCfg` found in `Dashboard.jsx`.
