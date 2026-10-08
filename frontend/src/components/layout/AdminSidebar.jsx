import { Boxes, ClipboardList, LayoutDashboard } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Boxes },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
]

function AdminSidebar() {
  return (
    <aside aria-label="Admin navigation" className="rounded-2xl border border-stone-300 bg-white p-2 dark:border-stone-800 dark:bg-stone-900 lg:sticky lg:top-24 lg:h-fit">
      <p className="px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Admin</p>
      <nav className="flex gap-2 overflow-x-auto lg:flex-col">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${isActive ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100' : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'}`}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default AdminSidebar
