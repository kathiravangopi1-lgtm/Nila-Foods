import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Clock3 } from 'lucide-react'
import { useAuth } from '@/components/auth/authContext'
import { apiRequest } from '@/lib/api'
import { formatMoney, resolveImageUrl } from '@/lib/format'

function OrderDetailsPage() {
  const { orderId } = useParams()
  const { token } = useAuth()
  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => apiRequest(`/orders/${orderId}`, { token }).then((result) => result.data),
    refetchInterval: (query) => query.state.data?.paymentStatus === 'pending' ? 4000 : false,
  })
  if (orderQuery.isLoading) return <p className="py-16 text-center text-sm text-stone-500">Loading your order…</p>
  if (orderQuery.isError) return <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{orderQuery.error.message}</p>
  const order = orderQuery.data
  const paid = order.paymentStatus === 'paid'

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <div className={`rounded-3xl p-6 sm:p-8 ${paid ? 'bg-emerald-800 text-white' : 'bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100'}`}>
        {paid ? <CheckCircle2 aria-hidden="true" className="size-10" /> : <Clock3 aria-hidden="true" className="size-10" />}
        <h1 className="mt-4 text-2xl font-black">{paid ? 'Thank you for your order!' : 'Payment confirmation pending'}</h1>
        <p className="mt-2 text-sm opacity-85">{paid ? 'Your payment is verified and your order is confirmed.' : 'We are waiting for the secure payment confirmation. This page checks for updates automatically.'}</p>
        <p className="mt-4 text-xs font-semibold">Order #{order._id.slice(-8)}</p>
      </div>
      <section className="rounded-2xl border border-stone-300 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-lg font-bold">Items</h2>
        <div className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
          {order.items.map((item, index) => (
            <div key={`${item.sku || item.name}-${index}`} className="flex items-center gap-3 py-3 first:pt-0">
              {item.image ? <img src={resolveImageUrl(item.image)} alt="" className="size-14 rounded-lg object-cover" /> : <div className="grid size-14 place-items-center rounded-lg bg-emerald-50">🌿</div>}
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p><p className="text-xs text-stone-500">Qty {item.quantity}</p></div>
              <p className="text-sm font-bold">{formatMoney(item.unitPrice * item.quantity, order.currency || 'INR')}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-stone-300 pt-4 dark:border-stone-800">
          <div className="flex justify-between text-sm"><span>Payment</span><span className="font-semibold capitalize">{order.paymentStatus}</span></div>
          {order.paymentMethod && <div className="mt-2 flex justify-between text-sm"><span>Method</span><span className="font-semibold capitalize">{order.paymentMethod}</span></div>}
          <div className="mt-3 flex justify-between text-base font-extrabold"><span>Total paid</span><span>{formatMoney(order.total, order.currency || 'INR')}</span></div>
        </div>
      </section>
      <div className="flex flex-wrap gap-3"><Link to="/orders" className="rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold dark:border-stone-700">All orders</Link><Link to="/products" className="rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white">Continue shopping</Link></div>
    </section>
  )
}

export default OrderDetailsPage
