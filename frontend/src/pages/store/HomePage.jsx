import { Link, useOutletContext } from 'react-router-dom'
import {
  ArrowRight,
  Baby,
  ChevronRight,
  Dumbbell,
  Headphones,
  House,
  Laptop,
  Smartphone,
  Sparkles,
  Shirt,
  Tv,
} from 'lucide-react'

const categories = [
  { label: 'Top picks', icon: Sparkles, query: 'featured' },
  { label: 'Mobiles', icon: Smartphone, query: 'mobiles' },
  { label: 'Fashion', icon: Shirt, query: 'fashion' },
  { label: 'Electronics', icon: Laptop, query: 'electronics' },
  { label: 'Home', icon: House, query: 'home' },
  { label: 'Appliances', icon: Tv, query: 'appliances' },
  { label: 'Audio', icon: Headphones, query: 'audio' },
  { label: 'Sports', icon: Dumbbell, query: 'sports' },
  { label: 'Kids', icon: Baby, query: 'kids' },
]

const todaysPicks = [
  {
    name: 'Wireless over-ear headphones',
    price: '₹2,499',
    oldPrice: '₹4,999',
    offer: '50% off',
    rating: '4.6',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=640&q=85',
  },
  {
    name: 'Everyday analog watch',
    price: '₹1,799',
    oldPrice: '₹3,499',
    offer: '48% off',
    rating: '4.4',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=640&q=85',
  },
  {
    name: 'Lightweight everyday sneakers',
    price: '₹2,199',
    oldPrice: '₹3,999',
    offer: '45% off',
    rating: '4.3',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=640&q=85',
  },
  {
    name: 'Compact instant camera',
    price: '₹6,499',
    oldPrice: '₹8,999',
    offer: '27% off',
    rating: '4.7',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=640&q=85',
  },
  {
    name: 'Minimal desk chair',
    price: '₹5,299',
    oldPrice: '₹7,499',
    offer: '29% off',
    rating: '4.2',
    image: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=640&q=85',
  },
  {
    name: 'Fresh notes eau de parfum',
    price: '₹899',
    oldPrice: '₹1,499',
    offer: '40% off',
    rating: '4.5',
    image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=640&q=85',
  },
]

const newFinds = [
  {
    name: 'Smart fitness watch',
    price: '₹3,299',
    oldPrice: '₹5,499',
    offer: '40% off',
    rating: '4.4',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=640&q=85',
  },
  {
    name: 'Studio wireless headphones',
    price: '₹3,799',
    oldPrice: '₹5,999',
    offer: '36% off',
    rating: '4.5',
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=640&q=85',
  },
  {
    name: 'Daily carry camera',
    price: '₹8,999',
    oldPrice: '₹11,999',
    offer: '25% off',
    rating: '4.6',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=640&q=85',
  },
  {
    name: 'Modern lounge chair',
    price: '₹6,499',
    oldPrice: '₹9,499',
    offer: '31% off',
    rating: '4.3',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=640&q=85',
  },
  {
    name: 'Weekend crossbody bag',
    price: '₹1,599',
    oldPrice: '₹2,499',
    offer: '36% off',
    rating: '4.2',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=640&q=85',
  },
  {
    name: 'Classic running shoes',
    price: '₹2,799',
    oldPrice: '₹4,499',
    offer: '38% off',
    rating: '4.4',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=640&q=85',
  },
]

function ProductRail({ title, subtitle, products }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-end justify-between gap-4 px-5 pb-4 pt-5 sm:px-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white sm:text-xl">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <Link
          to="/products"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-700 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-violet-800 sm:text-sm"
        >
          View all <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-5 sm:gap-4 sm:px-6">
        {products.map((product) => (
          <Link
            key={product.name}
            to="/products"
            className="group w-40 shrink-0 snap-start rounded-xl border border-slate-100 p-2 transition hover:border-violet-200 hover:shadow-md dark:border-slate-800 dark:hover:border-violet-900 sm:w-52"
          >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                className="size-full object-cover transition duration-300 group-hover:scale-105"
              />
              <span className="absolute left-2 top-2 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white sm:text-xs">
                {product.offer}
              </span>
            </div>
            <p className="mt-3 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{product.name}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="rounded bg-emerald-700 px-1.5 py-0.5 text-[10px] font-bold text-white">{product.rating} ★</span>
              <span className="truncate text-xs text-slate-500 dark:text-slate-400">Top rated</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-sm font-bold text-slate-950 dark:text-white">{product.price}</span>
              <span className="text-xs text-slate-400 line-through">{product.oldPrice}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function HomePage() {
  const { theme } = useOutletContext()

  return (
    <div className="space-y-5 sm:space-y-6">
      <nav
        aria-label="Shop by category"
        className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:justify-between sm:gap-3 sm:px-5"
      >
        {categories.map(({ label, icon: Icon, query }) => (
          <Link
            key={label}
            to={`/products?category=${query}`}
            className="flex min-w-[76px] shrink-0 flex-col items-center gap-2 rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700 dark:text-slate-200 dark:hover:bg-violet-950 dark:hover:text-violet-200 sm:min-w-0 sm:flex-1 sm:text-sm"
          >
            <span className="grid size-11 place-items-center rounded-full bg-violet-50 text-violet-700 dark:bg-slate-800 dark:text-violet-300">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            {label}
          </Link>
        ))}
      </nav>

      <section className="grid gap-3 overflow-hidden rounded-2xl sm:grid-cols-[minmax(0,1.8fr)_minmax(220px,0.8fr)]">
        <div className="relative flex min-h-[280px] items-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-950 via-violet-800 to-indigo-700 px-6 py-8 text-white sm:min-h-[330px] sm:px-10 lg:px-14">
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=85"
            alt=""
            className="absolute inset-0 size-full object-cover opacity-30 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-violet-950/95 via-violet-900/75 to-transparent" />
          <div className="relative z-10 max-w-lg">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em]">
              <Sparkles aria-hidden="true" className="size-3.5" />
              The weekend edit
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
              Good finds.
              <br />
              Great feeling.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-violet-100 sm:text-base">
              Discover everyday favorites across style, tech, and home.
            </p>
            <Link
              to="/products"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-violet-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-50"
            >
              Explore the deals <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <div className="absolute bottom-5 right-6 hidden items-center gap-2 sm:flex" aria-hidden="true">
            <span className="size-2 rounded-full bg-white" />
            <span className="size-2 rounded-full bg-white/40" />
            <span className="size-2 rounded-full bg-white/40" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
          <Link
            to="/products?category=electronics"
            className="group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-2xl bg-slate-900 p-4 text-white sm:min-h-0 sm:p-5"
          >
            <img
              src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85"
              alt=""
              className="absolute inset-0 size-full object-cover opacity-45 transition duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/15 to-transparent" />
            <span className="relative z-10 w-fit rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-950 sm:text-xs">
              Fresh deals
            </span>
            <span className="relative z-10 mt-8 text-sm font-extrabold leading-tight sm:text-lg">
              Sound good?
              <br />
              Save up to 50%
            </span>
          </Link>
          <Link
            to="/products?category=home"
            className="group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-2xl bg-orange-900 p-4 text-white sm:min-h-0 sm:p-5"
          >
            <img
              src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=700&q=85"
              alt=""
              className="absolute inset-0 size-full object-cover opacity-45 transition duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/15 to-transparent" />
            <span className="relative z-10 w-fit rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white sm:text-xs">
              Home refresh
            </span>
            <span className="relative z-10 mt-8 text-sm font-extrabold leading-tight sm:text-lg">
              Little upgrades.
              <br />
              Big difference.
            </span>
          </Link>
        </div>
      </section>

      <div className={`flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 sm:px-6 ${theme === 'dark' ? 'border-violet-900/70 bg-violet-950/30' : 'border-violet-100 bg-violet-50'}`}>
        <div>
          <p className="text-sm font-bold text-violet-950 dark:text-violet-100 sm:text-base">A little something for your day</p>
          <p className="mt-1 text-xs text-violet-800/75 dark:text-violet-200/70 sm:text-sm">Handpicked favorites. Happy prices. No endless searching.</p>
        </div>
        <Link to="/products" aria-label="Browse all products" className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-violet-700 shadow-sm transition hover:translate-x-0.5 dark:bg-slate-900 dark:text-violet-200">
          <ChevronRight aria-hidden="true" className="size-5" />
        </Link>
      </div>

      <ProductRail
        title="Enjoy your everyday"
        subtitle="Popular picks with feel-good prices"
        products={todaysPicks}
      />
      <ProductRail
        title="Suggested for you"
        subtitle="A few things we think you’ll love"
        products={newFinds}
      />
    </div>
  )
}

export default HomePage
