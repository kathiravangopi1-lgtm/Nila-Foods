import { Link } from 'react-router-dom'

function PagePlaceholder({ title }) {
  return (
    <section className="mx-auto flex min-h-80 max-w-2xl flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-950">
      <span className="grid size-12 place-items-center rounded-2xl bg-violet-50 text-xl font-bold text-violet-700">
        F
      </span>
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">{title}</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
        This page is ready for its feature UI. The shared site header, navigation, and footer stay in place as you move between routes.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-full bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800"
      >
        Back to home
      </Link>
    </section>
  )
}

export default PagePlaceholder
