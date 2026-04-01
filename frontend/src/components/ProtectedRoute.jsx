import React from 'react'
import { Navigate } from 'react-router-dom'

/**
 * Guards any route behind a valid JWT.
 * Reads trax_token directly from sessionStorage — no props required.
 */
function ProtectedRoute({ children }) {
  const token = sessionStorage.getItem('trax_token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default ProtectedRoute