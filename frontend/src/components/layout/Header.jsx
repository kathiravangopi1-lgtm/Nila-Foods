import { Link, NavLink } from 'react-router-dom'
import { Search, ShoppingCart, Sun, Moon, UserRound } from 'lucide-react'

function Header({ theme, onToggleTheme }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex min-h-[76px] max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:gap-8 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Fake Kart home">
          <span className="grid size-10 place-items-center rounded-xl bg-violet-700 text-lg font-black text-white shadow-sm shadow-violet-200">
            F
          </span>
          <span className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            fake<span className="text-violet-700">kart</span>
          </span>
        </Link>

        <form action="/products" method="get" role="search" className="order-3 flex w-full items-center rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:ring-violet-950 sm:order-none sm:ml-2 sm:max-w-xl sm:flex-1">
          <Search aria-hidden="true" className="size-5 shrink-0 text-slate-500" />
          <input
            type="search"
            name="search"
            placeholder="Search for products, brands and more"
            aria-label="Search products"
            className="h-11 w-full bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 dark:text-white"
          />
          <button type="submit" className="sr-only">Search</button>
        </form>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-pressed={theme === 'dark'}
            className="grid size-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun aria-hidden="true" className="size-5" /> : <Moon aria-hidden="true" className="size-5" />}
          </button>
          <NavLink
            to="/login"
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <UserRound aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Sign in</span>
          </NavLink>
          <NavLink
            to="/admin"
            className="hidden rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 lg:inline-flex"
          >
            Admin
          </NavLink>
          <NavLink
            to="/cart"
            aria-label="Shopping cart"
            className="inline-flex items-center gap-2 rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
          >
            <ShoppingCart aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Cart</span>
          </NavLink>
        </div>
      </div>
    </header>
  )
}

export default Header
