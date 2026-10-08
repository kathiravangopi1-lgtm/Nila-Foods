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

      <div className="flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 dark:border-emerald-950 dark:bg-emerald-950/40 sm:px-6">
        <div>
          <p className="text-sm font-bold text-emerald-950 dark:text-emerald-100 sm:text-base">A wholesome touch of home</p>
          <p className="mt-1 text-xs text-emerald-900/75 dark:text-emerald-200/75 sm:text-sm">Thoughtful herbal products inspired by traditional goodness.</p>
        </div>
        <svg viewBox="0 0 1024 1024" role="img" aria-label="Nila Foods botanical leaf" className="size-12 shrink-0">
          <path d="M859.29 140.28c-5.31-15.34-79.28-7-116 9.42s-163.34 116.58-188.52 172-17.35 64.14-30 84.29-17.1 33.3-22.12 27.66-2.24-16.66 7.83-36.5 28-55 32.21-78.58-10.15-111.32-11.56-147.31-15.46-105.8-33.6-106.37-69.25 69.39-75.15 122.11-17.46 139.43 4.21 195.12 34.11 42.14 41.25 66.88-14 82.5-40.95 117.38-37 46.84-48.27 43.18-17-29-9.06-46.76 26.22-37.12 26.48-61.55-9.33-113.22-15.22-136.06S360 291.87 358 272.34s2.85-67.45-10.61-72.41c-23.69-7.57-57.39 50.77-76.1 132.25s6.86 148 15.18 161.37 27.85 46.23 41.65 61.22 25.81 20.89 29.44 46.57 5.44 38.52-9.79 74.66-66.06 149.34-83 166.45c-4.19-42.4 6.47-30.15 7.41-63.57s-3.05-43.81 3-74.05-21.14-139.41-46-168.41c-12.13-15.05-8-53.59-15.32-54.33s-9.44-2.44-13.92 22.33-43 102-34.27 169.44 12.82 73.72 21.86 87.69 21.56 23.3 31.14 50.25 10.82 40.5 20.73 48.44-16.17 92.81-16.17 92.81l28.17 6s24.82-125.4 50.13-137 37.28 17.63 83.27 17.95 103.84-15.91 129.29-26.22 41.21-16.06 66.32-36.4 56.41-67.58 74.87-89.77 31.63-25.58 25.85-33.46-33.3-3.41-61-1.88-114.7 6.52-178.61 29.73-85.12 71.8-96.12 84.38-14.63 27.62-24.49 21.32-4.73-14.71 1.28-23.38 78.23-177 162.4-192.17c40.67-5.8 37.86 24.72 92.36 26s138.9-18.76 202.48-98.5c47.14-59.19 61-113.91 66.63-121s-28.71-13.21-53.39-6.47-35 16.15-58.92 19.32S607 402.11 563.34 443s-47.73 91-66.93 103.09-41.9 25-44.33 17.05 42.39-100.88 78.53-141.68c11.65-13.69 29-5.41 67.11-24.61s144-102.73 174.92-136.36 32.09-58.69 57.77-79.74 30.84-34.75 28.88-40.47z" fill="#73C69A" />
          <path d="M207.57 519c-11.4 41.54-7.11 122.14 1.1 161.26s31.48 151.17 31.48 151.17-17-118.18-24.28-165.4-8.3-147.03-8.3-147.03zM322.07 240.56C306.49 289.51 307.36 371 310.53 395s25.7 143.29 39 158.6c-17.27-74.25-28.49-121-33.21-164.41-4.65-43.1-0.32-77.72 5.75-148.63zM641.9 671.54c-33.45 39-103.26 81.1-125.27 91S381.22 816 361.2 812.71c72.25-24.34 117.88-39.36 157.31-58.18 39.09-18.66 66.27-40.53 123.39-82.99zM486 95.61c-10.09 27.71-43.91 204.72-21.09 280.17C450.33 288.82 486 95.61 486 95.61zM792.13 181.21c-39.45 21.42-213.55 167.5-225.74 185.64 33.42-22.3 225.74-185.64 225.74-185.64zM808.82 411.65c-18.6 24.78-170.91 157-273.46 145 159.64-32.19 273.46-145 273.46-145z" fill="#00757F" />
        </svg>
      </div>

      <ProductRail title="Loved at Nila Foods" subtitle="Customer favourites for everyday care" />
      <ProductRail title="Everyday essentials" subtitle="Thoughtful choices for your home" sort="price-asc" />
    </div>
  )
}

export default HomePage
