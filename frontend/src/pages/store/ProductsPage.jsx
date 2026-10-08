import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '@/components/catalog/ProductCard'
import SelectField from '@/components/ui/SelectField'
import Pagination from '@/components/ui/Pagination'
import { ProductSkeletonGrid } from '@/components/ui/Skeleton'
import Input from '@/components/ui/Input'
import { apiRequest } from '@/lib/api'

function hasRestockWatches() {
  try {
    return JSON.parse(window.localStorage.getItem('nila-foods-restock-watches') || '[]').length > 0
  } catch {
    window.localStorage.removeItem('nila-foods-restock-watches')
    return false
  }
}

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name' },
]

function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [hasWatches, setHasWatches] = useState(hasRestockWatches)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '')
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest')
  const [category, setCategory] = useState(searchParams.get('category') || '')

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiRequest('/categories').then((result) => result.data),
  })
  const selectedCategoryId = categoriesQuery.data?.find(
    (item) => item._id === category || item.slug === category,
  )?._id || ''
  const filters = new URLSearchParams()
  filters.set('page', searchParams.get('page') || '1')
  filters.set('limit', '24')
  filters.set('sort', searchParams.get('sort') || sort)
  if (searchParams.get('search')) filters.set('search', searchParams.get('search'))
  if (selectedCategoryId) filters.set('category', selectedCategoryId)
  if (searchParams.get('minPrice')) filters.set('minPrice', searchParams.get('minPrice'))
  if (searchParams.get('maxPrice')) filters.set('maxPrice', searchParams.get('maxPrice'))

  const productsQuery = useQuery({
    queryKey: ['products', filters.toString()],
    queryFn: () => apiRequest(`/products?${filters}`).then((result) => result),
    enabled: !category || Boolean(selectedCategoryId),
  })
  const restockQuery = useQuery({
    queryKey: ['products', 'restock-watches'],
    queryFn: () => apiRequest('/products?limit=100').then((result) => result.data),
    enabled: hasWatches,
    refetchInterval: hasWatches ? 30_000 : false,
  })

  useEffect(() => {
    const onWatchChange = () => setHasWatches(hasRestockWatches())
    window.addEventListener('nila-restock-watch-changed', onWatchChange)
    return () => window.removeEventListener('nila-restock-watch-changed', onWatchChange)
  }, [])

  useEffect(() => {
    let watchedIds = []
    try {
      watchedIds = JSON.parse(window.localStorage.getItem('nila-foods-restock-watches') || '[]')
    } catch {
      window.localStorage.removeItem('nila-foods-restock-watches')
    }
    const restocked = restockQuery.data?.filter(
      (product) => watchedIds.includes(product._id) && product.stock > 0,
    ) || []
    if (restocked.length) {
      window.dispatchEvent(new CustomEvent('nila-restock-available', { detail: restocked.map((product) => product.name) }))
      window.localStorage.setItem('nila-foods-restock-watches', JSON.stringify(
        watchedIds.filter((id) => !restocked.some((product) => product._id === id)),
      ))
      window.dispatchEvent(new Event('nila-restock-watch-changed'))
    }
  }, [restockQuery.data])

  const updateFilters = (changes) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    if (!Object.hasOwn(changes, 'page')) next.delete('page')
    setSearchParams(next)
  }

  const submitSearch = (event) => {
    event.preventDefault()
    updateFilters({ search: searchInput.trim() })
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-300">Nila Foods shop</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-stone-950 dark:text-white sm:text-3xl">All herbal products</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Find everyday care, naturally.</p>
        </div>
        {productsQuery.data?.pagination && (
          <span className="text-sm text-stone-500 dark:text-stone-400">{productsQuery.data.pagination.total} products</span>
        )}
      </div>

      <div className="grid items-end gap-4 rounded-2xl border border-stone-300 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="catalog-search" className="min-h-5 text-sm font-semibold leading-5 text-stone-700 dark:text-stone-200">Search products</label>
          <form onSubmit={submitSearch} className="flex h-11 min-w-0 items-center rounded-xl border border-stone-300 bg-stone-50 px-3 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-100 dark:border-stone-700 dark:bg-stone-950 dark:focus-within:ring-emerald-950">
            <Search aria-hidden="true" className="size-4 shrink-0 text-stone-500" />
            <Input id="catalog-search" aria-label="Search products" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search herbal oils, powders, sathu maavu…" className="!h-full !min-w-0 !flex-1 !rounded-none !border-0 !bg-transparent !px-3 !shadow-none !outline-none focus:!border-0 focus:!ring-0 dark:!bg-transparent" />
            <button className="shrink-0 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white">Search</button>
          </form>
        </div>
        <SelectField
          label="Sort by"
          value={searchParams.get('sort') || sort}
          options={sortOptions}
          onChange={(value) => { setSort(value); updateFilters({ sort: value }) }}
        />
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-[1fr_1fr_1fr_1fr]">
          <SelectField
            label="Category"
            value={category}
            options={[{ value: '', label: 'All categories' }, ...(categoriesQuery.data || []).map((item) => ({ value: item.slug, label: item.name }))]}
            onChange={(value) => { setCategory(value); updateFilters({ category: value }) }}
          />
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
            <span className="flex min-h-5 items-center gap-2 leading-5"><SlidersHorizontal aria-hidden="true" className="size-4" /> Minimum price</span>
            <Input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} onBlur={() => updateFilters({ minPrice })} placeholder="₹0" className="bg-stone-50 dark:bg-stone-950" />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
            <span className="min-h-5 leading-5">Maximum price</span>
            <Input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} onBlur={() => updateFilters({ maxPrice })} placeholder="No maximum" className="bg-stone-50 dark:bg-stone-950" />
          </label>
          <button type="button" onClick={() => { setSearchInput(''); setMinPrice(''); setMaxPrice(''); setSort('newest'); setCategory(''); setSearchParams({}) }} className="h-11 rounded-xl border border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800">Clear filters</button>
        </div>
      </div>

      {productsQuery.isLoading && <ProductSkeletonGrid />}
      {category && categoriesQuery.isSuccess && !selectedCategoryId && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">That category is not available yet. Browse all products or choose an active category.</p>}
      {productsQuery.isError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{productsQuery.error.message}</p>}
      {productsQuery.isSuccess && productsQuery.data.data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-14 text-center dark:border-stone-700 dark:bg-stone-900">
          <p className="text-lg font-bold text-stone-900 dark:text-white">No products found</p>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Try another category or clear your filters.</p>
        </div>
      )}
      {productsQuery.data?.data?.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),240px))] justify-start gap-5">
          {productsQuery.data.data.map((product) => <ProductCard key={product._id} product={product} />)}
        </div>
      )}
      {productsQuery.data?.pagination && (
        <Pagination
          page={productsQuery.data.pagination.page}
          pages={productsQuery.data.pagination.pages}
          onPageChange={(page) => updateFilters({ page: String(page) })}
          className="pt-2"
        />
      )}
    </section>
  )
}

export default ProductsPage