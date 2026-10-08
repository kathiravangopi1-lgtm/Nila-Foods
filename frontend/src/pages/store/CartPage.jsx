import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/components/auth/authContext'
import { useToast } from '@/components/feedback/toastContext'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import { apiRequest } from '@/lib/api'
import { formatMoney, resolveImageUrl } from '@/lib/format'

function CartPage() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [itemToRemove, setItemToRemove] = useState(null)
  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: () => apiRequest('/cart', { token }).then((result) => result.data),
    enabled: Boolean(user),
  })
  const updateItem = useMutation({
    mutationFn: ({ productId, quantity }) => apiRequest(`/cart/items/${productId}`, { method: 'PATCH', token, body: JSON.stringify({ quantity }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      setItemToRemove(null)
    },
    onError: (error) => showToast(error.message, 'Cart update failed', 'error'),
  })
  const removeItem = useMutation({
    mutationFn: (productId) => apiRequest(`/cart/items/${productId}`, { method: 'DELETE', token }),
    onSuccess: () => {
      setItemToRemove(null)
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
    onError: (error) => showToast(error.message, 'Could not remove item', 'error'),
  })
  const items = useMemo(() => cartQuery.data?.items ?? [], [cartQuery.data])
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.lineTotal, 0), [items])
  const currency = items[0]?.product?.currency || 'INR'

  if (!user) {
    return (
      <section className="mx-auto my-auto max-w-xl rounded-3xl border border-stone-300 bg-white p-7 text-center dark:border-stone-800 dark:bg-stone-900 sm:p-10">
        <h1 className="text-2xl font-black text-stone-950 dark:text-white">Sign in to see your cart</h1>
        <p className="mt-2 text-sm text-stone-500">Your cart is linked to your Nila Foods account.</p>
        <button type="button" onClick={() => navigate('/login', { state: { from: { pathname: '/cart' } } })} className="mt-5 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white">Sign in</button>
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-stone-950 dark:text-white sm:text-3xl">Your cart</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{items.length} {items.length === 1 ? 'item' : 'items'} selected</p>
      </div>
      {cartQuery.isLoading && <p className="py-12 text-center text-sm text-stone-500">Loading cart…</p>}
      {cartQuery.isError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{cartQuery.error.message}</p>}
      {cartQuery.isSuccess && !items.length && (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-14 text-center dark:border-stone-700 dark:bg-stone-900">
          <p className="text-lg font-bold text-stone-900 dark:text-white">Your cart is waiting for something good</p>
          <Link to="/products" className="mt-5 inline-flex rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white">Browse all products</Link>
        </div>
      )}
      {items.length > 0 && (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            {items.map(({ product, quantity, lineTotal }) => (
              <article key={product._id} className="flex gap-3 rounded-2xl border border-stone-300 bg-white p-3 dark:border-stone-800 dark:bg-stone-900 sm:gap-4 sm:p-4">
                <Link to={`/products/${product._id}`} className="size-24 shrink-0 overflow-hidden rounded-xl bg-emerald-50 sm:size-28">
                  {product.images?.[0] ? <img src={resolveImageUrl(product.images[0])} alt={product.name} className="size-full object-cover" /> : <span className="grid size-full place-items-center text-3xl">🌿</span>}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/products/${product._id}`} className="line-clamp-2 text-sm font-bold text-stone-900 dark:text-white">{product.name}</Link>
                  <p className="mt-1 text-sm font-extrabold text-emerald-900 dark:text-emerald-200">{formatMoney(lineTotal, product.currency)}</p>
                  <p className="mt-1 text-xs text-stone-500">{product.stock} available</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" aria-label={`Decrease ${product.name} quantity`} disabled={quantity <= 1 || updateItem.isPending} onClick={() => updateItem.mutate({ productId: product._id, quantity: quantity - 1 })} className="grid size-8 place-items-center rounded-lg border border-stone-300 disabled:opacity-40 dark:border-stone-700"><Minus className="size-4" /></button>
                    <span className="min-w-6 text-center text-sm font-bold">{quantity}</span>
                    <button type="button" aria-label={`Increase ${product.name} quantity`} disabled={quantity >= product.stock || updateItem.isPending} onClick={() => updateItem.mutate({ productId: product._id, quantity: quantity + 1 })} className="grid size-8 place-items-center rounded-lg border border-stone-300 disabled:opacity-40 dark:border-stone-700"><Plus className="size-4" /></button>
                    <button type="button" onClick={() => setItemToRemove(product)} className="ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-stone-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"><Trash2 className="size-4" /><span className="hidden sm:inline">Remove</span></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <aside className="sticky top-24 rounded-2xl border border-stone-300 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="text-lg font-bold text-stone-950 dark:text-white">Price details</h2>
            <div className="mt-4 flex justify-between text-sm text-stone-600 dark:text-stone-300"><span>Subtotal</span><span>{formatMoney(subtotal, currency)}</span></div>
            <div className="mt-2 flex justify-between text-sm text-stone-600 dark:text-stone-300"><span>Shipping</span><span>Calculated at checkout</span></div>
            <div className="my-4 border-t border-dashed border-stone-300 dark:border-stone-700" />
            <div className="flex justify-between font-extrabold text-stone-950 dark:text-white"><span>Total</span><span>{formatMoney(subtotal, currency)}</span></div>
            <Link to="/checkout" className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white hover:bg-emerald-900">Continue to checkout</Link>
            <p className="mt-3 text-center text-xs text-stone-500">Secure payment powered by Razorpay</p>
          </aside>
        </div>
      )}
      <ConfirmationDialog
        open={Boolean(itemToRemove)}
        title="Remove this item from your cart?"
        description={itemToRemove ? `${itemToRemove.name} will be removed from your cart.` : ''}
        confirmLabel="Remove item"
        isPending={removeItem.isPending}
        onCancel={() => setItemToRemove(null)}
        onConfirm={() => itemToRemove && removeItem.mutate(itemToRemove._id)}
      />
    </section>
  )
}

export default CartPage
