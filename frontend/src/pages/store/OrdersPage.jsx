import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/components/auth/authContext'
import { apiRequest } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import Alert from '@/components/ui/Alert'
import Collapsible from '@/components/ui/Collapsible'
import Pagination from '@/components/ui/Pagination'
import Spinner from '@/components/ui/Spinner'

function OrdersPage() {
  const { token } = useAuth()
  const [page, setPage] = useState(1)
  const ordersQuery = useQuery({
    queryKey: ['orders', page],
    queryFn: () => apiRequest(`/orders?page=${page}&limit=10`, { token }).then((result) => result.data),
  })
  const orders = ordersQuery.data?.data || []
  return (
    <section className="space-y-5">
      <div><h1 className="text-2xl font-black text-stone-950 dark:text-white sm:text-3xl">Your orders</h1><p className="mt-1 text-sm text-stone-500">Order status and payment confirmation.</p></div>
      {ordersQuery.isLoading && <div className="flex justify-center py-12"><Spinner label="Loading orders" /></div>}
      {ordersQuery.isError && <Alert variant="destructive">{ordersQuery.error.message}</Alert>}
      {ordersQuery.isSuccess && !orders.length && <div className="rounded-2xl border border-dashed border-stone-300 p-12 text-center dark:border-stone-700"><p className="font-bold">No orders yet</p><Link to="/products" className="mt-3 inline-flex text-sm font-bold text-emerald-800">Explore products</Link></div>}
      <div className="space-y-3">
        {orders.map((order) => (
          <Collapsible
            key={order._id}
            title={`Order #${order._id.slice(-8)} · ${formatMoney(order.total, order.currency || 'INR')}`}
            subtitle={`${new Date(order.createdAt).toLocaleString()} · ${order.items.length} items · ${order.paymentStatus} · ${order.status}`}
          >
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={`${item.sku || item.name}-${index}`} className="flex justify-between gap-3 text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <strong>{formatMoney(item.unitPrice * item.quantity, order.currency || 'INR')}</strong>
                </div>
              ))}
              <Link to={`/orders/${order._id}`} className="inline-flex rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white">View order details</Link>
            </div>
          </Collapsible>
        ))}
      </div>
      <Pagination page={ordersQuery.data?.pagination?.page || page} pages={ordersQuery.data?.pagination?.pages || 1} onPageChange={setPage} />
    </section>
  )
}

export default OrdersPage
