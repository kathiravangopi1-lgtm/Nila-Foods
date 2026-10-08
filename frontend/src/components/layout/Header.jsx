import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Heart, LogOut, Search, ShoppingCart, Sun, Moon, UserRound } from 'lucide-react'
import { useAuth } from '@/components/auth/authContext'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import { apiRequest } from '@/lib/api'
import { formatMoney, resolveImageUrl } from '@/lib/format'

function Header({ theme, onToggleTheme }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  const suggestionsQuery = useQuery({
    queryKey: ['product-search-suggestions', debouncedSearch],
    queryFn: () => apiRequest(`/products?search=${encodeURIComponent(debouncedSearch)}&limit=6`).then((result) => result.data),
    enabled: isSearchOpen && debouncedSearch.length >= 2,
  })

  const submitSearch = (event) => {
    event.preventDefault()
    const query = search.trim()
    setIsSearchOpen(false)
    if (query) navigate(`/products?search=${encodeURIComponent(query)}`)
  }

  return (
    <header data-site-header className="sticky top-0 z-20 border-b border-slate-300/80 bg-white/95 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex min-h-[76px] w-full max-w-[1600px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:gap-5 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Nila Foods home">
          <img src="/nila-logo.svg" alt="" className="size-10 shrink-0" />
          <span className="text-xl font-extrabold tracking-tight text-stone-950 dark:text-white">
            Nila <span className="text-emerald-800 dark:text-emerald-300">Foods</span>
          </span>
        </Link>

        <form onSubmit={submitSearch} role="search" className="relative order-3 flex w-full min-w-0 items-center rounded-xl border border-slate-300 bg-slate-50 px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:ring-emerald-950 sm:order-none sm:ml-2 sm:flex-1">
          <Search aria-hidden="true" className="size-5 shrink-0 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => setIsSearchOpen(true)}
            onBlur={() => window.setTimeout(() => setIsSearchOpen(false), 150)}
            onKeyDown={(event) => { if (event.key === 'Escape') setIsSearchOpen(false) }}
            placeholder="Search for products, brands and more"
            aria-label="Search products"
            className="h-11 w-full min-w-0 flex-1 appearance-none rounded-none border-0 bg-transparent px-3 text-slate-900 shadow-none outline-none ring-0 placeholder:text-slate-500 focus:border-0 focus:outline-none focus:ring-0 focus-visible:ring-0 dark:bg-transparent dark:text-white"
          />
          <button type="submit" className="sr-only">Search</button>
          {isSearchOpen && search.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-stone-300 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-900">
              {suggestionsQuery.isLoading && <p className="px-4 py-3 text-sm text-stone-500">Searching products…</p>}
              {suggestionsQuery.isError && <p role="alert" className="px-4 py-3 text-sm text-rose-700">{suggestionsQuery.error.message}</p>}
              {suggestionsQuery.isSuccess && (suggestionsQuery.data?.length || 0) === 0 && <p className="px-4 py-3 text-sm text-stone-500">No matching products found.</p>}
              {suggestionsQuery.data?.map((product) => (
                <Link
                  key={product._id}
                  to={`/products/${product._id}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => { setIsSearchOpen(false); setSearch('') }}
                  className="flex items-center gap-3 border-b border-stone-100 px-3 py-2.5 text-sm last:border-0 hover:bg-emerald-50 dark:border-stone-800 dark:hover:bg-stone-800"
                >
                  <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-emerald-50 dark:bg-stone-800">
                    {product.images?.[0] && <img src={resolveImageUrl(product.images[0])} alt="" className="size-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-stone-900 dark:text-white">{product.name}</span>
                  <span className="shrink-0 text-xs font-bold text-emerald-800 dark:text-emerald-300">{formatMoney(product.price, product.currency)}</span>
                </Link>
              ))}
              <button type="submit" onMouseDown={(event) => event.preventDefault()} className="w-full cursor-pointer px-4 py-3 text-left text-xs font-bold text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-stone-800">
                See all results for “{search.trim()}”
              </button>
            </div>
          )}
        </form>

        <NavLink to="/products" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-emerald-50 hover:text-emerald-900 dark:text-stone-200 dark:hover:bg-stone-800 md:inline-flex">
          Shop all
        </NavLink>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            data-tooltip={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={theme === 'dark'}
            className="nav-tooltip relative grid size-10 place-items-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun aria-hidden="true" className="size-5" /> : <Moon aria-hidden="true" className="size-5" />}
          </button>
          {user ? (
            <>
              <NavLink to="/account" aria-label="Your account" data-tooltip="Your account" className="nav-tooltip relative grid size-10 place-items-center rounded-full text-stone-600 transition hover:bg-stone-100 hover:text-emerald-800 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-emerald-300">
                <UserRound aria-hidden="true" className="size-4" />
              </NavLink>
              {user.role === 'admin' && (
                <NavLink to="/admin" className="rounded-full px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 hover:text-emerald-950 dark:text-emerald-200 dark:hover:bg-stone-800 dark:hover:text-emerald-100">
                  Admin
                </NavLink>
              )}
              <button type="button" onClick={() => setShowLogoutConfirmation(true)} aria-label="Sign out" data-tooltip="Sign out" className="nav-tooltip relative cursor-pointer grid size-10 place-items-center rounded-full text-stone-600 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
                <LogOut aria-hidden="true" className="size-4" />
              </button>
            </>
          ) : (
            <NavLink
              to="/login"
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 hover:text-emerald-900 dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-emerald-200"
            >
              <UserRound aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Sign in</span>
            </NavLink>
          )}
          <NavLink to="/favorites" aria-label="Favourites" data-tooltip="Favourites" className="nav-tooltip relative grid size-10 place-items-center rounded-full text-stone-600 transition hover:bg-stone-100 hover:text-emerald-800 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-emerald-300">
            <Heart aria-hidden="true" className="size-4" />
          </NavLink>
          <NavLink
            to="/cart"
            aria-label="Shopping cart"
            data-tooltip="Shopping cart"
            className="nav-tooltip relative inline-flex items-center gap-2 rounded-full bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 hover:text-emerald-50"
          >
            <ShoppingCart aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Cart</span>
          </NavLink>
        </div>
      </div>
      <ConfirmationDialog
        open={showLogoutConfirmation}
        title="Sign out of Nila Foods?"
        description="You’ll need to sign in again to view your account, orders, and saved cart."
        confirmLabel="Sign out"
        onCancel={() => setShowLogoutConfirmation(false)}
        onConfirm={() => {
          logout()
          setShowLogoutConfirmation(false)
        }}
      />
    </header>
  )
}

export default Header
