import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BellToggle from '@/components/BellToggle'
import PeekRating from '@/components/PeekRating'
import PulseHeart from '@/components/PulseHeart'
import { useAuth } from '@/components/auth/authContext'
import { useFavorites } from '@/components/favorites/favoritesContext'
import { useToast } from '@/components/feedback/toastContext'
import { apiRequest } from '@/lib/api'
import { formatMoney, resolveImageUrl } from '@/lib/format'

function ProductDetailsPage() {
  const { productId } = useParams()
  const { user, token } = useAuth()
  const { favoriteIds, toggleFavorite } = useFavorites()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [selectedImage, setSelectedImage] = useState(0)

  const productQuery = useQuery({
    queryKey: ['product', productId],
    queryFn: () => apiRequest(`/products/${productId}`).then((result) => result.data),
    refetchInterval: (query) => query.state.data?.stock === 0 ? 30_000 : false,
  })
  const reviewsQuery = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => apiRequest(`/products/${productId}/reviews`),
  })
  const addToCart = useMutation({
    mutationFn: () => apiRequest('/cart/items', {
      method: 'POST', token, body: JSON.stringify({ productId, quantity: 1 }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      showToast('This product is in your cart.', 'Added to cart', 'success')
    },
    onError: (error) => showToast(error.message, 'Could not add item', 'error'),
  })
  const submitReview = useMutation({
    mutationFn: () => apiRequest(`/products/${productId}/reviews`, {
      method: 'POST', token, body: JSON.stringify({ rating, comment: reviewText }),
    }),
    onSuccess: () => {
      setReviewText('')
      setRating(0)
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] })
      showToast('Thank you for sharing your review.', 'Review submitted', 'success')
    },
    onError: (error) => showToast(error.message, 'Could not submit review', 'error'),
  })

  useEffect(() => {
    const product = productQuery.data
    if (!product || product.stock <= 0) return
    try {
      const watches = JSON.parse(localStorage.getItem('nila-foods-restock-watches') || '[]')
      if (watches.includes(product._id)) {
        localStorage.setItem('nila-foods-restock-watches', JSON.stringify(watches.filter((id) => id !== product._id)))
        window.dispatchEvent(new CustomEvent('nila-restock-available', { detail: [product.name] }))
      }
    } catch {
      localStorage.removeItem('nila-foods-restock-watches')
    }
  }, [productQuery.data])

  const product = productQuery.data
  if (productQuery.isLoading) return <p className="py-16 text-center text-sm text-stone-500">Loading product…</p>
  if (productQuery.isError) return <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{productQuery.error.message}</p>

  return (
    <section className="space-y-8">
      <Link to="/products" className="text-sm font-semibold text-emerald-800 hover:underline dark:text-emerald-300">← All products</Link>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-3xl bg-emerald-50 dark:bg-stone-900">
            {product.images?.[selectedImage] ? (
              <img src={resolveImageUrl(product.images[selectedImage])} alt={product.name} className="size-full object-cover" />
            ) : <div className="grid size-full place-items-center text-7xl text-emerald-800/40">🌿</div>}
          </div>
          {product.images?.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{product.images.map((image, index) => <button key={image} type="button" onClick={() => setSelectedImage(index)} className={`size-16 shrink-0 overflow-hidden rounded-xl border-2 ${selectedImage === index ? 'border-emerald-700' : 'border-transparent'}`}><img src={resolveImageUrl(image)} alt={`${product.name} ${index + 1}`} className="size-full object-cover" /></button>)}</div>}
        </div>
        <div className="rounded-3xl border border-stone-300 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-300">{product.category?.name || 'Nila Foods'}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-stone-950 dark:text-white">{product.name}</h1>
          <p className="mt-4 text-2xl font-extrabold text-emerald-900 dark:text-emerald-200">{formatMoney(product.price, product.currency)}</p>
          <div className="mt-3 flex items-center gap-2">
            <PeekRating value={reviewsQuery.data?.summary?.average || 0} readOnly showTip={false} size={20} />
            <span className="text-xs text-stone-500">{reviewsQuery.data?.summary?.count || 0} reviews</span>
          </div>
          <p className="mt-5 whitespace-pre-line text-sm leading-7 text-stone-600 dark:text-stone-300">{product.description}</p>
          <p className={`mt-5 text-sm font-semibold ${product.stock > 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
            {product.stock > 0 ? `${product.stock} available` : 'Currently out of stock'}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {product.stock > 0 ? (
              <button type="button" disabled={addToCart.isPending} onClick={() => user ? addToCart.mutate() : navigate('/login')} className="min-h-12 flex-1 rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-50">
                {addToCart.isPending ? 'Adding…' : 'Add to cart'}
              </button>
            ) : (
              <BellToggle
                defaultPressed={(() => { try { return JSON.parse(localStorage.getItem('nila-foods-restock-watches') || '[]').includes(product._id) } catch { return false } })()}
                onChange={(enabled) => {
                  let watches = []
                  try { watches = JSON.parse(localStorage.getItem('nila-foods-restock-watches') || '[]') } catch { localStorage.removeItem('nila-foods-restock-watches') }
                  localStorage.setItem('nila-foods-restock-watches', JSON.stringify(enabled ? [...new Set([...watches, product._id])] : watches.filter((id) => id !== product._id)))
                  window.dispatchEvent(new Event('nila-restock-watch-changed'))
                  showToast(enabled ? 'We saved a restock reminder on this device.' : 'Restock reminder removed.', 'Restock reminder', 'success')
                }}
              />
            )}
            <PulseHeart liked={favoriteIds.includes(product._id)} onChange={() => toggleFavorite(product._id)} label="Add to favourites" likedColor="#15803d" />
          </div>
          <p className="mt-4 text-xs leading-5 text-stone-500">Carefully packed by Nila Foods. Please check the product label for ingredients and usage instructions.</p>
        </div>
      </div>

      <section className="rounded-2xl border border-stone-300 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-stone-950 dark:text-white">Customer reviews</h2>
            <p className="mt-1 text-sm text-stone-500">{reviewsQuery.data?.summary?.count || 0} reviews</p>
          </div>
        </div>
        {user && (
          <form onSubmit={(event) => { event.preventDefault(); if (rating) submitReview.mutate() }} className="mt-5 grid gap-3 rounded-xl bg-stone-50 p-4 dark:bg-stone-950 sm:grid-cols-[auto_1fr_auto] sm:items-end">
            <label className="space-y-2">
              <span className="block text-xs font-bold text-stone-700 dark:text-stone-200">Your rating</span>
              <PeekRating value={rating} onChange={setRating} labels={['Poor', 'Fair', 'Good', 'Very good', 'Excellent']} size={24} />
            </label>
            <label className="space-y-2">
              <span className="block text-xs font-bold text-stone-700 dark:text-stone-200">Your review</span>
              <input value={reviewText} onChange={(event) => setReviewText(event.target.value)} maxLength={2000} placeholder="Share a few words (optional)" className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-700 dark:border-stone-700 dark:bg-stone-900 dark:text-white" />
            </label>
            <button disabled={!rating || submitReview.isPending} className="h-11 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white disabled:opacity-40">Submit review</button>
          </form>
        )}
        {!user && <p className="mt-5 text-sm text-stone-500"><Link to="/login" className="font-semibold text-emerald-800 hover:underline dark:text-emerald-300">Sign in</Link> to share a review.</p>}
        {reviewsQuery.isLoading && <p className="mt-5 text-sm text-stone-500">Loading reviews…</p>}
        {reviewsQuery.isError && <p role="alert" className="mt-5 text-sm text-rose-700">{reviewsQuery.error.message}</p>}
        <div className="mt-5 divide-y divide-stone-100 dark:divide-stone-800">
          {(reviewsQuery.data?.data || []).map((review) => (
            <article key={review._id} className="py-4 first:pt-0">
              <div className="flex flex-wrap items-center gap-3">
                <PeekRating value={review.rating} readOnly showTip={false} size={18} />
                <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">{review.user?.name || 'Nila Foods customer'}</span>
                <time className="text-xs text-stone-400">{new Date(review.createdAt).toLocaleDateString()}</time>
              </div>
              {review.comment && <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">{review.comment}</p>}
            </article>
          ))}
          {reviewsQuery.isSuccess && !reviewsQuery.data.data.length && <p className="py-4 text-sm text-stone-500">No reviews yet. Be the first to share your experience.</p>}
        </div>
      </section>
    </section>
  )
}

export default ProductDetailsPage
