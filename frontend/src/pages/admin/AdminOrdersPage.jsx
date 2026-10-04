import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/components/auth/authContext'
import { useToast } from '@/components/feedback/toastContext'
import SelectField from '@/components/ui/SelectField'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import { apiRequest } from '@/lib/api'
import { formatMoney } from '@/lib/format'

const statusOptions = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
  .map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))
const nextStatuses = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

function AdminOrdersPage() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [orderToCancel, setOrderToCancel] = useState(null)
  const ordersQuery = useQuery({
    queryKey: ['orders', 'admin'],
    queryFn: () => apiRequest('/orders?limit=100', { token }).then((result) => result.data),
  })
  const changeStatus = useMutation({
    mutationFn: ({ id, status }) => apiRequest(`/orders/${id}/status`, { method: 'PATCH', token, body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setOrderToCancel(null)
      showToast('Order fulfilment status updated.', 'Order updated', 'success')
    },
    onError: (error) => showToast(error.message, 'Could not update order', 'error'),
  })

  return (
    <section className="space-y-5">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Admin</p><h1 className="mt-1 text-2xl font-black">Customer orders</h1></div>
      {ordersQuery.isLoading && <p className="py-12 text-center text-sm text-stone-500">Loading orders…</p>}
      {ordersQuery.isError && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{ordersQuery.error.message}</p>}
      {ordersQuery.data?.length === 0 && <p className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">No orders yet.</p>}
      <div className="space-y-3">
        {ordersQuery.data?.map((order) => (
          <article key={order._id} className="grid gap-4 rounded-2xl border border-stone-300 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
            <div className="min-w-0"><Link to={`/orders/${order._id}`} className="font-bold text-emerald-900 hover:underline dark:text-emerald-200">Order #{order._id.slice(-8)}</Link><p className="mt-1 truncate text-xs text-stone-500">{order.user?.name} · {order.user?.email}</p><p className="mt-1 text-xs text-stone-500">{new Date(order.createdAt).toLocaleString()} · {order.items.length} items · <strong className={order.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}>{order.paymentStatus}</strong></p><p className="mt-2 font-extrabold">{formatMoney(order.total, order.currency || 'INR')}</p></div>
            <SelectField
              label="Fulfilment status"
              value={order.status}
              options={[order.status, ...nextStatuses[order.status]].map((value) => statusOptions.find((option) => option.value === value))}
              onChange={(status) => {
                if (status === 'cancelled') setOrderToCancel(order)
                else changeStatus.mutate({ id: order._id, status })
              }}
            />
          </article>
        ))}
      </div>
      <ConfirmationDialog
        open={Boolean(orderToCancel)}
        title="Cancel this order?"
        description={orderToCancel ? `Order #${orderToCancel._id.slice(-8)} will be cancelled. Any reserved stock will be restored.` : ''}
        confirmLabel="Cancel order"
        isPending={changeStatus.isPending}
        onCancel={() => setOrderToCancel(null)}
        onConfirm={() => orderToCancel && changeStatus.mutate({ id: orderToCancel._id, status: 'cancelled' })}
      />
    </section>
  )
}

export default AdminOrdersPage
