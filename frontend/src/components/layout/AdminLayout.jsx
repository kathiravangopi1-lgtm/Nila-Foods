import { Outlet } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'

function AdminLayout() {
  return (
    <div className="grid w-full gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
      <AdminSidebar />
      <div className="min-w-0"><Outlet /></div>
    </div>
  )
}

export default AdminLayout
