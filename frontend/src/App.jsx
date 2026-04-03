import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Simulation from './pages/Simulation'
import TrainList from './pages/TrainList'
import SectionMap from './pages/SectionMap'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// Helper — true when a real JWT is stored for this browser session
const isLoggedIn  = () => !!sessionStorage.getItem('trax_token')
const getUserRole = () => localStorage.getItem('trax_role') || 'controller'

/**
 * Role-gated wrapper: redirects to /dashboard if the user's role is not in
 * the allowedRoles list. Used INSIDE the ProtectedRoute tree so we know the
 * user is already authenticated before we check clearance.
 */
function RoleRoute({ allowedRoles, children }) {
  return allowedRoles.includes(getUserRole())
    ? children
    : <Navigate to="/dashboard" replace />
}

function App() {
  const handleLogout = () => {
    sessionStorage.removeItem('trax_token')
    sessionStorage.removeItem('trax_user')
    localStorage.removeItem('trax_role')   // clear role alongside token
    localStorage.removeItem('trax_user')
    window.dispatchEvent(new Event('trax-auth-update'))
    window.location.href = '/login'
  }

  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login" element={
          isLoggedIn() ? <Navigate to="/dashboard" /> : <Login />
        } />
        <Route path="/signup" element={
          isLoggedIn() ? <Navigate to="/dashboard" /> : <Signup />
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout onLogout={handleLogout} />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard"  element={<Dashboard />} />
          <Route path="simulation" element={
            <RoleRoute allowedRoles={['admin', 'controller']}>
              <Simulation />
            </RoleRoute>
          } />
          <Route path="trains"     element={<TrainList />} />
          <Route path="map"        element={<SectionMap />} />
          <Route path="reports"    element={<Reports />} />
          <Route path="settings"   element={
            <RoleRoute allowedRoles={['admin']}>
              <Settings />
            </RoleRoute>
          } />
        </Route>
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App