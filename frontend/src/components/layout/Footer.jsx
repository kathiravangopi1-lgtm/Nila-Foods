import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div>
          <Link to="/" className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">
            fake<span className="text-violet-700">kart</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
            A little something for every day. Discover your next favorite.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <li><Link className="transition hover:text-violet-700 dark:hover:text-violet-300" to="/products">Shop all</Link></li>
            <li><Link className="transition hover:text-violet-700 dark:hover:text-violet-300" to="/cart">Your cart</Link></li>
            <li><Link className="transition hover:text-violet-700 dark:hover:text-violet-300" to="/admin">Admin dashboard</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Your account</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <li><Link className="transition hover:text-violet-700 dark:hover:text-violet-300" to="/login">Sign in</Link></li>
            <li><Link className="transition hover:text-violet-700 dark:hover:text-violet-300" to="/register">Create account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-slate-400 dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} Fake Kart. All rights reserved.</span>
          <span>Made for good finds.</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
