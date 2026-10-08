import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PeekRating from '@/components/PeekRating'
import FavoriteButton from '@/components/catalog/FavoriteButton'
import RestockCheckbox from '@/components/catalog/RestockCheckbox'
import { useAuth } from '@/components/auth/authContext'
import { useFavorites } from '@/components/favorites/favoritesContext'
import { useToast } from '@/components/feedback/toastContext'
import { apiRequest } from '@/lib/api'
import { formatMoney, resolveImageUrl } from '@/lib/format'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import Alert from '@/components/ui/Alert'
import Textarea from '@/components/ui/Textarea'
import Skeleton from '@/components/ui/Skeleton'

function ProductDetailsPage() {
  const { productId } = useParams()
  const { user, token } = useAuth()
  const { favoriteIds, toggleFavorite } = useFavorites()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [editingReviewId, setEditingReviewId] = useState('')
  const [reviewToDelete, setReviewToDelete] = useState(null)
  const [ratingFilter, setRatingFilter] = useState('')
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
  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: () => apiRequest('/cart', { token }).then((result) => result.data),
    enabled: Boolean(user),
  })
  const cartQuantity = user
    ? cartQuery.data?.items?.find((item) => item.product?._id === productId)?.quantity || 0
    : 0
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
  const updateCartQuantity = useMutation({
    mutationFn: (nextQuantity) => {
      if (nextQuantity === 0) {
        return apiRequest(`/cart/items/${productId}`, { method: 'DELETE', token })
      }
      if (cartQuantity === 0) {
        return apiRequest('/cart/items', {
          method: 'POST',
          token,
          body: JSON.stringify({ productId, quantity: nextQuantity }),
        })
      }
      return apiRequest(`/cart/items/${productId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ quantity: nextQuantity }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      if (!cartQuantity) showToast('This product is in your cart.', 'Added to cart', 'success')
    },
    onError: (error) => showToast(error.message, 'Could not update cart', 'error'),
  })
  const submitReview = useMutation({
    mutationFn: () => apiRequest(
      `/products/${productId}/reviews${editingReviewId ? `/${editingReviewId}` : ''}`,
      {
        method: editingReviewId ? 'PATCH' : 'POST',
        token,
        body: JSON.stringify({ rating, comment: reviewText }),
      },
    ),
    onSuccess: () => {
      setReviewText('')
      setRating(0)
      setEditingReviewId('')
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] })
      showToast(editingReviewId ? 'Your review has been updated.' : 'Thank you for sharing your review.', editingReviewId ? 'Review updated' : 'Review submitted', 'success')
    },
    onError: (error) => showToast(error.message, 'Could not submit review', 'error'),
  })
  const deleteReview = useMutation({
    mutationFn: (reviewId) => apiRequest(`/products/${productId}/reviews/${reviewId}`, { method: 'DELETE', token }),
    onSuccess: () => {
      setReviewToDelete(null)
      setEditingReviewId('')
      setReviewText('')
      setRating(0)
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] })
      showToast('Your review has been deleted.', 'Review deleted', 'success')
    },
    onError: (error) => showToast(error.message, 'Could not delete review', 'error'),
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
  const allReviews = reviewsQuery.data?.data || []
  const myReview = allReviews.find((review) => (
    review.user?._id === user?.id || review.user?._id === user?._id
  ))
  const visibleReviews = ratingFilter
    ? allReviews.filter((review) => review.rating === Number(ratingFilter))
    : allReviews
  if (productQuery.isLoading) return <div role="status" aria-label="Loading product" className="grid gap-6 py-4 lg:grid-cols-2"><Skeleton className="aspect-square w-full rounded-3xl" /><div className="space-y-5 rounded-3xl border border-stone-200 p-8 dark:border-stone-800"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-2/3" /><Skeleton className="h-6 w-1/3" /><Skeleton className="h-28 w-full" /><Skeleton className="h-12 w-full rounded-xl" /></div></div>
  if (productQuery.isError) return <Alert variant="destructive">{productQuery.error.message}</Alert>

  return (
    <section className="space-y-8">
      <Link to="/products" className="text-sm font-semibold text-emerald-800 hover:underline dark:text-emerald-300">← All products</Link>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-stone-300 bg-white p-2 dark:border-stone-800 dark:bg-stone-900 sm:p-3">
          <div className="aspect-square overflow-hidden rounded-2xl bg-emerald-50 dark:bg-stone-800">
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
          <div className="mt-6 flex items-center gap-3">
              {product.stock > 0 ? (
                cartQuery.isError ? (
                  <Alert variant="destructive" className="min-h-12 flex-1">{cartQuery.error.message}</Alert>
                ) : cartQuantity > 0 ? (
                  <div className="flex min-h-12 flex-1 items-center justify-between rounded-xl bg-emerald-800 px-2 text-white">
                    <button
                      type="button"
                      aria-label={`Decrease ${product.name} quantity`}
                      disabled={updateCartQuantity.isPending}
                      onClick={() => updateCartQuantity.mutate(cartQuantity - 1)}
                      className="grid size-10 place-items-center rounded-lg text-xl font-bold hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-50"
                    >
                      −
                    </button>
                    <span aria-live="polite" className="text-sm font-bold">{cartQuantity}</span>
                    <button
                      type="button"
                      aria-label={`Increase ${product.name} quantity`}
                      disabled={updateCartQuantity.isPending || cartQuantity >= product.stock}
                      onClick={() => updateCartQuantity.mutate(cartQuantity + 1)}
                      className="grid size-10 place-items-center rounded-lg text-xl font-bold hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={addToCart.isPending || cartQuery.isLoading}
                    onClick={() => user ? addToCart.mutate() : navigate('/login', { state: { from: { pathname: `/products/${productId}` } } })}
                    className="min-h-12 flex-1 rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-50"
                  >
                    {addToCart.isPending || cartQuery.isLoading ? 'Adding…' : 'Add to cart'}
                  </button>
                )
              ) : (
                <RestockCheckbox product={product} />
              )}
              <FavoriteButton
                liked={favoriteIds.includes(product._id)}
                onChange={() => toggleFavorite(product._id)}
                label={favoriteIds.includes(product._id) ? 'Remove from favourites' : 'Add to favourites'}
                size={48}
                className="shrink-0"
              />
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
        {user && (!myReview || editingReviewId) && (
          <form onSubmit={(event) => { event.preventDefault(); if (rating) submitReview.mutate() }} className="mt-5 grid gap-3 rounded-xl bg-stone-50 p-4 dark:bg-stone-950 sm:grid-cols-[auto_1fr_auto] sm:items-end">
            <label className="space-y-2">
              <span className="block text-xs font-bold text-stone-700 dark:text-stone-200">Your rating</span>
              <PeekRating value={rating} onChange={setRating} labels={['Poor', 'Fair', 'Good', 'Very good', 'Excellent']} size={24} />
            </label>
            <label className="space-y-2">
              <span className="block text-xs font-bold text-stone-700 dark:text-stone-200">Your review</span>
              <Textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} maxLength={2000} rows={3} placeholder="Share a few words (optional)" className="min-h-24 dark:bg-stone-900" />
            </label>
            <button disabled={!rating || submitReview.isPending} className="h-11 cursor-pointer rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{submitReview.isPending ? 'Saving…' : editingReviewId ? 'Save changes' : 'Submit review'}</button>
          </form>
        )}
        {user && myReview && !editingReviewId && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">You’ve reviewed this product.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => {
                setEditingReviewId(myReview._id)
                setRating(myReview.rating)
                setReviewText(myReview.comment || '')
              }} className="cursor-pointer rounded-lg border border-emerald-700 px-3 py-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">Edit review</button>
              <button type="button" onClick={() => setReviewToDelete(myReview)} className="cursor-pointer rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold text-rose-700 dark:border-rose-900 dark:text-rose-300">Delete review</button>
            </div>
          </div>
        )}
        {user && editingReviewId && (
          <button type="button" onClick={() => {
            setEditingReviewId('')
            setReviewText('')
            setRating(0)
          }} className="mt-3 cursor-pointer text-xs font-semibold text-stone-500 underline">Cancel editing</button>
        )}
        {!user && <p className="mt-5 text-sm text-stone-500"><Link to="/login" className="font-semibold text-emerald-800 hover:underline dark:text-emerald-300">Sign in</Link> to share a review.</p>}
        {reviewsQuery.isLoading && <p className="mt-5 text-sm text-stone-500">Loading reviews…</p>}
        {reviewsQuery.isError && <Alert variant="destructive" className="mt-5">{reviewsQuery.error.message}</Alert>}
        <div className="mt-5 flex flex-wrap items-center gap-2" aria-label="Filter reviews by rating">
          <span className="mr-1 text-xs font-semibold text-stone-600 dark:text-stone-300">Filter:</span>
          <button type="button" aria-pressed={!ratingFilter} onClick={() => setRatingFilter('')} className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold ${!ratingFilter ? 'border-emerald-700 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100' : 'border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300'}`}>
            All ({allReviews.length})
          </button>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = allReviews.filter((review) => review.rating === stars).length
            return (
              <button
                key={stars}
                type="button"
                aria-pressed={ratingFilter === String(stars)}
                disabled={!count}
                onClick={() => setRatingFilter(String(stars))}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${ratingFilter === String(stars) ? 'border-emerald-700 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100' : 'border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300'}`}
              >
                {stars} star ({count})
              </button>
            )
          })}
        </div>
        <div className="mt-5 divide-y divide-stone-100 dark:divide-stone-800">
          {visibleReviews.map((review) => (
            <article key={review._id} className="py-4 first:pt-0">
              <div className="flex flex-wrap items-center gap-3">
                <PeekRating value={review.rating} readOnly showTip={false} size={18} />
                <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">{review.user?.name || 'Nila Foods customer'}</span>
                <time className="text-xs text-stone-400">{new Date(review.createdAt).toLocaleDateString()}</time>
              </div>
              {review.title && <h3 className="mt-2 text-sm font-bold text-stone-900 dark:text-white">{review.title}</h3>}
              {review.comment && <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">{review.comment}</p>}
            </article>
          ))}
          {reviewsQuery.isSuccess && !visibleReviews.length && <p className="py-4 text-sm text-stone-500">{ratingFilter ? `No ${ratingFilter}-star reviews yet.` : 'No reviews yet. Be the first to share your experience.'}</p>}
        </div>
        <ConfirmationDialog
          open={Boolean(reviewToDelete)}
          title="Delete your review?"
          description="This review will be permanently removed."
          confirmLabel="Delete review"
          isPending={deleteReview.isPending}
          onCancel={() => setReviewToDelete(null)}
          onConfirm={() => reviewToDelete && deleteReview.mutate(reviewToDelete._id)}
        />
      </section>
    </section>
  )
}

export default ProductDetailsPage
