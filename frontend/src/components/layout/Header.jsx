import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Heart, Leaf, LogOut, Search, ShoppingCart, Sun, Moon, UserRound } from 'lucide-react'
import { useAuth } from '@/components/auth/authContext'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'

function Header({ theme, onToggleTheme }) {
  const { user, logout } = useAuth()
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false)

  return (
    <header data-site-header className="sticky top-0 z-20 border-b border-slate-300/80 bg-white/95 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex min-h-[76px] w-full max-w-[1600px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:gap-5 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Nila Foods home">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-800 text-white shadow-sm shadow-emerald-200 dark:bg-emerald-700">
            <Leaf aria-hidden="true" className="size-5" />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-stone-950 dark:text-white">
            Nila <span className="text-emerald-800 dark:text-emerald-300">Foods</span>
          </span>
        </Link>

        <form action="/products" method="get" role="search" className="order-3 flex w-full items-center rounded-xl border border-slate-300 bg-slate-50 px-3 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:ring-violet-950 sm:order-none sm:ml-2 sm:max-w-xl sm:flex-1">
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

        <NavLink to="/products" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-emerald-50 hover:text-emerald-900 dark:text-stone-200 dark:hover:bg-stone-800 md:inline-flex">
          Shop all
        </NavLink>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-pressed={theme === 'dark'}
            className="grid size-10 place-items-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun aria-hidden="true" className="size-5" /> : <Moon aria-hidden="true" className="size-5" />}
          </button>
          {user ? (
            <>
              <NavLink to="/account" aria-label="Your account" className="grid size-10 place-items-center rounded-full text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
                <UserRound aria-hidden="true" className="size-4" />
              </NavLink>
              {user.role === 'admin' && (
                <NavLink to="/admin" className="rounded-full px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-stone-800">
                  Admin
                </NavLink>
              )}
              <button type="button" onClick={() => setShowLogoutConfirmation(true)} aria-label="Sign out" className="grid size-10 place-items-center rounded-full text-stone-600 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
                <LogOut aria-hidden="true" className="size-4" />
              </button>
            </>
          ) : (
            <NavLink
              to="/login"
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              <UserRound aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Sign in</span>
            </NavLink>
          )}
          <NavLink to="/favorites" aria-label="Favourites" className="grid size-10 place-items-center rounded-full text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
            <Heart aria-hidden="true" className="size-4" />
          </NavLink>
          <NavLink
            to="/cart"
            aria-label="Shopping cart"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900"
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
