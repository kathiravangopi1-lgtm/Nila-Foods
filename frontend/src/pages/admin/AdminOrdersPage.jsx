import { Fragment, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useAuth } from '@/components/auth/authContext'
import { useToast } from '@/components/feedback/toastContext'
import SelectField from '@/components/ui/SelectField'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import Alert from '@/components/ui/Alert'
import Collapsible from '@/components/ui/Collapsible'
import Pagination from '@/components/ui/Pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import Spinner from '@/components/ui/Spinner'
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
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState({ field: 'createdAt', direction: 'desc' })
  const ordersQuery = useQuery({
    queryKey: ['orders', 'admin', page, sort.field, sort.direction],
    queryFn: () => apiRequest(`/orders?page=${page}&limit=10&sortBy=${sort.field}&direction=${sort.direction}`, { token }),
  })
  const toggleSort = (field) => {
    setPage(1)
    setSort((current) => ({
      field,
      direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }
  const sortButton = (label, field) => {
    const isSorted = sort.field === field
    const Icon = sort.direction === 'asc' ? ArrowUp : ArrowDown
    return (
      <button
        type="button"
        aria-label={`Sort by ${label}${isSorted ? `, currently ${sort.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}
        aria-pressed={isSorted}
        onClick={() => toggleSort(field)}
        className="inline-flex cursor-pointer items-center gap-1.5"
      >
        {label}
        {isSorted && <Icon aria-hidden="true" className="size-3.5" />}
      </button>
    )
  }
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
      {ordersQuery.isLoading && <div className="flex justify-center py-12"><Spinner label="Loading orders" /></div>}
      {ordersQuery.isError && <Alert variant="destructive">{ordersQuery.error.message}</Alert>}
      {ordersQuery.isSuccess && ordersQuery.data.data.length === 0 && <p className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500 dark:border-stone-700">No orders yet.</p>}
      {!!ordersQuery.data?.data?.length && (
        <Table>
          <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>{sortButton('date', 'createdAt')} / payment</TableHead><TableHead>{sortButton('total', 'total')}</TableHead><TableHead>{sortButton('status', 'status')}</TableHead></TableRow></TableHeader>
          <TableBody>
            {ordersQuery.data.data.map((order) => (
              <Fragment key={order._id}>
                <TableRow>
                  <TableCell><Link to={`/orders/${order._id}`} className="font-bold text-emerald-900 hover:underline dark:text-emerald-200">#{order._id.slice(-8)}</Link></TableCell>
                  <TableCell><span className="block font-semibold">{order.user?.name || 'Customer'}</span><span className="text-xs text-stone-500">{order.user?.email}</span></TableCell>
                  <TableCell><time dateTime={order.createdAt} className="block">{new Date(order.createdAt).toLocaleString()}</time><span className={`text-xs font-semibold ${order.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>{order.paymentStatus}</span></TableCell>
                  <TableCell className="font-extrabold">{formatMoney(order.total, order.currency || 'INR')}</TableCell>
                  <TableCell>
                    <SelectField
                      label={`Status for order ${order._id.slice(-8)}`}
                      value={order.status}
                      options={[order.status, ...nextStatuses[order.status]].map((value) => statusOptions.find((option) => option.value === value))}
                      onChange={(status) => {
                        if (status === 'cancelled') setOrderToCancel(order)
                        else changeStatus.mutate({ id: order._id, status })
                      }}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} className="!p-2">
                    <Collapsible title="Order items and delivery details" subtitle={`${order.items.length} items · ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''}`}>
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div key={`${item.sku || item.name}-${index}`} className="flex justify-between gap-3 text-sm">
                            <span>{item.name} × {item.quantity}</span>
                            <strong>{formatMoney(item.unitPrice * item.quantity, order.currency || 'INR')}</strong>
                          </div>
                        ))}
                        <p className="border-t border-stone-200 pt-2 text-xs text-stone-500 dark:border-stone-800">{order.shippingAddress?.recipient} · {order.shippingAddress?.addressLine1} · {order.shippingAddress?.postalCode}</p>
                      </div>
                    </Collapsible>
                  </TableCell>
                </TableRow>
              </Fragment>
            ))}
          </TableBody>
        </Table>
      )}
      <Pagination page={ordersQuery.data?.pagination?.page || page} pages={ordersQuery.data?.pagination?.pages || 1} onPageChange={setPage} />
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
