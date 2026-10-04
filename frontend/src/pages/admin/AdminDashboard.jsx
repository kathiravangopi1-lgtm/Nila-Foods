import { Link } from 'react-router-dom'
import { Boxes, ClipboardList, Leaf } from 'lucide-react'

function AdminDashboard() {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl bg-emerald-950 p-6 text-white sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Private workspace</p>
        <h1 className="mt-2 text-3xl font-black">Nila Foods admin</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100/80">Manage your catalog, stock, categories, and customer orders.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/admin/products" className="rounded-2xl border border-stone-300 bg-white p-6 transition hover:border-emerald-300 hover:shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <Boxes aria-hidden="true" className="size-7 text-emerald-800 dark:text-emerald-300" />
          <h2 className="mt-4 text-lg font-bold">Products and categories</h2>
          <p className="mt-1 text-sm text-stone-500">Add products, images, prices, and inventory.</p>
        </Link>
        <Link to="/admin/orders" className="rounded-2xl border border-stone-300 bg-white p-6 transition hover:border-emerald-300 hover:shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <ClipboardList aria-hidden="true" className="size-7 text-emerald-800 dark:text-emerald-300" />
          <h2 className="mt-4 text-lg font-bold">Customer orders</h2>
          <p className="mt-1 text-sm text-stone-500">Review paid orders and update fulfilment status.</p>
        </Link>
      </div>
      <p className="flex items-center gap-2 text-xs text-stone-500"><Leaf className="size-4" /> Admin links and screens are only available to accounts with the admin role.</p>
    </section>
  )
}

export default AdminDashboard
