import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import ProductCard from '@/components/catalog/ProductCard'
import { useFavorites } from '@/components/favorites/favoritesContext'
import { apiRequest } from '@/lib/api'

function FavoritesPage() {
  const { favoriteIds } = useFavorites()
  const productsQuery = useQuery({
    queryKey: ['products', 'favorites'],
    queryFn: () => apiRequest('/products?limit=100').then((result) => result.data),
    enabled: favoriteIds.length > 0,
  })
  const products = productsQuery.data?.filter((product) => favoriteIds.includes(product._id)) || []

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-stone-950 dark:text-white sm:text-3xl">Your favourites</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Saved on this device for your next visit.</p>
      </div>
      {productsQuery.isLoading && <p className="py-12 text-center text-sm text-stone-500">Loading favourites…</p>}
      {productsQuery.isError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{productsQuery.error.message}</p>}
      {!favoriteIds.length && (
        <div className="rounded-2xl border border-dashed border-stone-300 px-5 py-14 text-center dark:border-stone-700">
          <p className="font-bold text-stone-900 dark:text-white">No favourites saved yet</p>
          <p className="mt-2 text-sm text-stone-500">Tap the heart on a product to save it here.</p>
          <Link to="/products" className="mt-5 inline-flex rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white">Explore products</Link>
        </div>
      )}
      {productsQuery.isSuccess && favoriteIds.length > 0 && products.length === 0 && (
        <p className="rounded-xl bg-stone-100 p-4 text-sm text-stone-600 dark:bg-stone-900 dark:text-stone-300">Saved products are no longer available.</p>
      )}
      {products.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{products.map((product) => <ProductCard key={product._id} product={product} />)}</div>}
    </section>
  )
}

export default FavoritesPage
