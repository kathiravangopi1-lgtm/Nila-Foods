import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './authContext'

function RequireGuest() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <p role="status" className="py-14 text-center text-sm text-stone-500">Checking your sign-in…</p>
  }
  if (!user) return <Outlet />

  const requestedPath = location.state?.from?.pathname
  const destination = user.role === 'admin'
    ? '/admin'
    : requestedPath && !requestedPath.startsWith('/admin')
      ? requestedPath
      : '/'
  return <Navigate to={destination} replace />
}

export default RequireGuest
