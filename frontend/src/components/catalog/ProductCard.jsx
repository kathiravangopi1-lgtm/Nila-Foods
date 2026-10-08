import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import FavoriteButton from '@/components/catalog/FavoriteButton'
import RestockCheckbox from '@/components/catalog/RestockCheckbox'
import { useAuth } from '@/components/auth/authContext'
import { useFavorites } from '@/components/favorites/favoritesContext'
import { useToast } from '@/components/feedback/toastContext'
import { apiRequest } from '@/lib/api'

function imageUrl(value) {
  if (!value) return ''
  return value.startsWith('/uploads/') ? value : value
}

function ProductCard({ product }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, token } = useAuth()
  const { favoriteIds, toggleFavorite } = useFavorites()
  const { showToast } = useToast()
  const isFavorite = favoriteIds.includes(product._id)
  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: () => apiRequest('/cart', { token }).then((result) => result.data),
    enabled: Boolean(user),
  })
  const cartQuantity = user
    ? cartQuery.data?.items?.find((item) => item.product?._id === product._id)?.quantity || 0
    : 0
  const addToCart = useMutation({
    mutationFn: () => apiRequest('/cart/items', {
      method: 'POST',
      token,
      body: JSON.stringify({ productId: product._id, quantity: 1 }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      showToast(`${product.name} added to your cart.`, 'Added to cart', 'success')
    },
    onError: (error) => showToast(error.message, 'Could not add item', 'error'),
  })
  const changeCartQuantity = useMutation({
    mutationFn: (nextQuantity) => {
      const method = nextQuantity === 0 ? 'DELETE' : 'PATCH'
      return apiRequest(`/cart/items/${product._id}`, {
        method,
        token,
        ...(nextQuantity > 0 ? { body: JSON.stringify({ quantity: nextQuantity }) } : {}),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onError: (error) => showToast(error.message, 'Could not update cart', 'error'),
  })

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-stone-300 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
      <Link to={`/products/${product._id}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-emerald-50 dark:bg-stone-800">
          {product.images?.[0] ? (
            <img src={imageUrl(product.images[0])} alt={product.name} loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-105" />
          ) : (
            <div className="grid size-full place-items-center text-4xl text-emerald-800/40">🌿</div>
          )}
          {product.stock <= 0 && <span className="absolute bottom-2 left-2 rounded-full bg-stone-950/85 px-2.5 py-1 text-xs font-semibold text-white">Out of stock</span>}
        </div>
        <div className="px-1 pb-2 pt-4">
          <p className="truncate text-sm font-bold text-stone-900 dark:text-white">{product.name}</p>
          <p className="mt-1 min-h-9 line-clamp-2 text-xs leading-5 text-stone-500 dark:text-stone-400">{product.description}</p>
          <p className="mt-2 text-base font-extrabold text-emerald-900 dark:text-emerald-200">{product.currency === 'INR' ? '₹' : `${product.currency} `}{Number(product.price).toLocaleString('en-IN')}</p>
        </div>
      </Link>
      <div className="flex items-center gap-2 px-1 pb-1">
        {product.stock > 0 ? (
          cartQuantity > 0 ? (
            <div className="flex min-h-10 flex-1 items-center justify-between rounded-xl bg-emerald-800 px-2 text-white">
              <button
                type="button"
                aria-label={`Decrease ${product.name} quantity`}
                disabled={changeCartQuantity.isPending || addToCart.isPending}
                onClick={() => changeCartQuantity.mutate(cartQuantity - 1)}
                className="grid size-8 place-items-center rounded-lg text-lg font-bold hover:bg-emerald-900 disabled:opacity-50"
              >
                −
              </button>
              <span aria-live="polite" className="min-w-6 text-center text-sm font-bold">{cartQuantity}</span>
              <button
                type="button"
                aria-label={`Increase ${product.name} quantity`}
                disabled={changeCartQuantity.isPending || addToCart.isPending || cartQuantity >= product.stock}
                onClick={() => addToCart.mutate()}
                className="grid size-8 place-items-center rounded-lg text-lg font-bold hover:bg-emerald-900 disabled:opacity-50"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={addToCart.isPending}
              onClick={() => user ? addToCart.mutate() : navigate('/login')}
              className="min-h-10 flex-1 rounded-xl bg-emerald-800 px-3 text-xs font-bold text-white transition hover:bg-emerald-900 disabled:opacity-50"
            >
              {addToCart.isPending ? 'Adding…' : 'Add to cart'}
            </button>
          )
        ) : (
          <RestockCheckbox product={product} compact />
        )}
        <FavoriteButton
          liked={isFavorite}
          onChange={() => toggleFavorite(product._id)}
          label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          size={42}
        />
      </div>
    </article>
  )
}

export default ProductCard
