export const apiFetch = async (endpoint, options = {}) => {
  const token = sessionStorage.getItem('trax_token')

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  // Construct full URL (assuming backend is at this address)
  const url = `http://127.0.0.1:8000${endpoint}`

  const response = await fetch(url, { ...options, headers })

  // Context-aware 401 trap: skip for auth endpoints so Login can handle password errors
  if (response.status === 401) {
    const isAuthRoute = endpoint.includes('/token') || endpoint.includes('/register')
    
    if (!isAuthRoute) {
      sessionStorage.removeItem('trax_token')
      sessionStorage.removeItem('trax_user')
      sessionStorage.setItem('session_expired', 'true')
      window.location.href = '/login'
      return null
    }
  }

  return response
}
