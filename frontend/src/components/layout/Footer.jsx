import { Leaf } from 'lucide-react'
import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="mt-auto border-t border-stone-300 bg-white transition-colors dark:border-stone-800 dark:bg-stone-950">
      <div className="mx-auto grid w-full max-w-[1600px] gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-extrabold tracking-tight text-stone-950 dark:text-white">
            <Leaf aria-hidden="true" className="size-5 text-emerald-800 dark:text-emerald-300" />
            Nila <span className="text-emerald-800 dark:text-emerald-300">Foods</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-stone-500 dark:text-stone-400">
            Herbal oils, nourishing powders, and traditional goodness for everyday wellness.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm text-stone-500 dark:text-stone-400">
            <li><Link className="transition hover:text-emerald-800 dark:hover:text-emerald-300" to="/products">Shop all</Link></li>
            <li><Link className="transition hover:text-emerald-800 dark:hover:text-emerald-300" to="/favorites">Favourites</Link></li>
            <li><Link className="transition hover:text-emerald-800 dark:hover:text-emerald-300" to="/cart">Your cart</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">Your account</h2>
          <ul className="mt-3 space-y-2 text-sm text-stone-500 dark:text-stone-400">
            <li><Link className="transition hover:text-emerald-800 dark:hover:text-emerald-300" to="/account">My account</Link></li>
            <li><Link className="transition hover:text-emerald-800 dark:hover:text-emerald-300" to="/orders">My orders</Link></li>
            <li><Link className="transition hover:text-emerald-800 dark:hover:text-emerald-300" to="/login">Sign in</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-100 dark:border-stone-800">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 px-4 py-4 text-xs text-stone-400 dark:text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} Nila Foods. All rights reserved.</span>
          <span>Rooted in nature. Made with care.</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
