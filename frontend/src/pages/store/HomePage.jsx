import { ArrowRight, Baby, Flower2, HeartPulse, Leaf, Sparkles, Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ProductCard from '@/components/catalog/ProductCard'
import { apiRequest } from '@/lib/api'

const categories = [
  { label: 'Herbal oils', icon: Flower2, query: 'herbal-oils' },
  { label: 'Herbal powders', icon: Sprout, query: 'herbal-powders' },
  { label: 'Hair care', icon: Sparkles, query: 'hair-care' },
  { label: 'Wellness', icon: HeartPulse, query: 'wellness' },
  { label: 'For little ones', icon: Baby, query: 'kids' },
]

function ProductRail({ title, subtitle, sort = 'newest' }) {
  const productsQuery = useQuery({
    queryKey: ['products', 'home', sort],
    queryFn: () => apiRequest(`/products?limit=6&sort=${sort}`).then((result) => result.data),
  })
  return (
    <section className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-end justify-between gap-4 px-5 pb-4 pt-5 sm:px-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-stone-950 dark:text-white sm:text-xl">{title}</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>
        </div>
        <Link to="/products" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-800 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-900 sm:text-sm">
          Shop all <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      {productsQuery.isLoading && <p className="px-5 pb-6 text-sm text-stone-500">Loading products…</p>}
      {productsQuery.isError && <p role="alert" className="px-5 pb-6 text-sm text-rose-700">{productsQuery.error.message}</p>}
      {productsQuery.isSuccess && !productsQuery.data.length && <p className="px-5 pb-6 text-sm text-stone-500">New products are being prepared. Please check back soon.</p>}
      {!!productsQuery.data?.length && <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-3 lg:grid-cols-6 sm:px-6">{productsQuery.data.map((product) => <ProductCard key={product._id} product={product} />)}</div>}
    </section>
  )
}

function HomePage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <nav aria-label="Shop by category" className="flex gap-2 overflow-x-auto rounded-2xl border border-stone-300 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:justify-between sm:gap-3 sm:px-5">
        {categories.map(({ label, icon: Icon, query }) => (
          <Link key={label} to={`/products?category=${query}`} className="flex min-w-[88px] shrink-0 flex-col items-center gap-2 rounded-xl px-2 py-2 text-center text-xs font-semibold text-stone-700 transition hover:bg-emerald-50 hover:text-emerald-900 dark:text-stone-200 dark:hover:bg-emerald-950 dark:hover:text-emerald-200 sm:min-w-0 sm:flex-1 sm:text-sm">
            <span className="grid size-11 place-items-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-stone-800 dark:text-emerald-300">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            {label}
          </Link>
        ))}
      </nav>

      <section className="grid gap-3 overflow-hidden rounded-2xl sm:grid-cols-[minmax(0,1.8fr)_minmax(220px,0.8fr)]">
        <div className="relative flex min-h-[300px] items-center overflow-hidden rounded-2xl bg-emerald-950 px-6 py-8 text-white sm:min-h-[340px] sm:px-10 lg:px-14">
          <img src="https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=1400&q=85" alt="" className="absolute inset-0 size-full object-cover opacity-35" />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-950/75 to-emerald-950/15" />
          <div className="relative z-10 max-w-lg">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em]">
              <Leaf aria-hidden="true" className="size-3.5 text-amber-200" />
              From nature, with care
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
              Nila Foods
              <br />
              <span className="text-amber-200">Naturally good.</span>
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-50/90 sm:text-base">
              Herbal oils, nourishing powders, and traditional sathu maavu for everyday wellness.
            </p>
            <Link to="/products" className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-200 px-5 py-3 text-sm font-bold text-emerald-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-100">
              Explore our products <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
          <Link to="/products?category=herbal-oils" className="group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-2xl bg-emerald-900 p-4 text-white sm:min-h-0 sm:p-5">
            <img src="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=700&q=85" alt="" className="absolute inset-0 size-full object-cover opacity-45 transition duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/15 to-transparent" />
            <span className="relative z-10 w-fit rounded-full bg-amber-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-950 sm:text-xs">Herbal care</span>
            <span className="relative z-10 mt-8 text-sm font-extrabold leading-tight sm:text-lg">A little oil.<br />A lot of care.</span>
          </Link>
          <Link to="/products?search=sathu%20maavu" className="group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-2xl bg-amber-900 p-4 text-white sm:min-h-0 sm:p-5">
            <img src="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=700&q=85" alt="" className="absolute inset-0 size-full object-cover opacity-45 transition duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/15 to-transparent" />
            <span className="relative z-10 w-fit rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white sm:text-xs">Traditional goodness</span>
            <span className="relative z-10 mt-8 text-sm font-extrabold leading-tight sm:text-lg">Sathu maavu<br />for the whole family.</span>
          </Link>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 dark:border-emerald-950 dark:bg-emerald-950/40 sm:px-6">
        <div>
          <p className="text-sm font-bold text-emerald-950 dark:text-emerald-100 sm:text-base">A wholesome touch of home</p>
          <p className="mt-1 text-xs text-emerald-900/75 dark:text-emerald-200/75 sm:text-sm">Thoughtful herbal products inspired by traditional goodness.</p>
        </div>
        <Sparkles aria-hidden="true" className="size-6 shrink-0 text-amber-600 dark:text-amber-300" />
      </div>

      <ProductRail title="Loved at Nila Foods" subtitle="Customer favourites for everyday care" />
      <ProductRail title="Everyday essentials" subtitle="Thoughtful choices for your home" sort="price-asc" />
    </div>
  )
}

export default HomePage
