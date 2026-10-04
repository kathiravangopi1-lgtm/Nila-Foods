import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/components/auth/authContext'
import { apiRequest } from '@/lib/api'
import { formatMoney } from '@/lib/format'

function OrdersPage() {
  const { token } = useAuth()
  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: () => apiRequest('/orders?limit=100', { token }).then((result) => result.data),
  })
  return (
    <section className="space-y-5">
      <div><h1 className="text-2xl font-black text-stone-950 dark:text-white sm:text-3xl">Your orders</h1><p className="mt-1 text-sm text-stone-500">Order status and payment confirmation.</p></div>
      {ordersQuery.isLoading && <p className="py-12 text-center text-sm text-stone-500">Loading orders…</p>}
      {ordersQuery.isError && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{ordersQuery.error.message}</p>}
      {ordersQuery.isSuccess && !ordersQuery.data.length && <div className="rounded-2xl border border-dashed border-stone-300 p-12 text-center dark:border-stone-700"><p className="font-bold">No orders yet</p><Link to="/products" className="mt-3 inline-flex text-sm font-bold text-emerald-800">Explore products</Link></div>}
      <div className="space-y-3">
        {ordersQuery.data?.map((order) => (
          <Link key={order._id} to={`/orders/${order._id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-300 bg-white p-4 transition hover:border-emerald-300 dark:border-stone-800 dark:bg-stone-900">
            <div className="min-w-0"><p className="font-bold text-stone-900 dark:text-white">Order #{order._id.slice(-8)}</p><p className="mt-1 text-xs text-stone-500">{new Date(order.createdAt).toLocaleString()} · {order.items.length} items</p></div>
            <div className="ml-auto text-right"><p className="font-extrabold">{formatMoney(order.total, order.currency || 'INR')}</p><p className={`mt-1 text-xs font-semibold ${order.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>{order.paymentStatus} · {order.status}</p></div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default OrdersPage
