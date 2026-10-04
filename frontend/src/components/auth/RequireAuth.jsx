import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './authContext'

function RequireAuth() {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <p className="py-16 text-center text-sm text-stone-500">Loading your account…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

export default RequireAuth
