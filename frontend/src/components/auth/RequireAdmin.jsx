import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './authContext'

function RequireAdmin() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-stone-500">Checking your account…</p>
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}

export default RequireAdmin
