import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import ContactDetails from '@/components/layout/ContactDetails'

function ErrorPage({ notFound = false, inLayout = false }) {
  const error = useRouteError()
  const missingPage = notFound || (isRouteErrorResponse(error) && error.status === 404)
  const PageContainer = inLayout ? 'section' : 'main'

  return (
    <PageContainer className="mx-auto flex min-h-[65vh] w-full max-w-3xl items-center px-4 py-12 sm:px-6">
      <section className="w-full rounded-3xl border border-stone-300 bg-white p-7 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-10">
        <img src="/nila-logo.svg" alt="" className="mb-6 size-12" />
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-300">
          Nila Foods
        </p>
        <h1 className="mt-2 text-3xl font-black text-stone-950 dark:text-white">
          {missingPage ? 'We couldn’t find that page' : 'Something went wrong'}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600 dark:text-stone-300">
          {missingPage
            ? 'The page may have moved, or the address may be incorrect.'
            : 'Please try again. If the problem continues, our team will be happy to help.'}
        </p>
        {!missingPage && (
          <p className="mt-2 text-sm text-stone-500">
            {isRouteErrorResponse(error) ? `Error ${error.status}` : 'The page could not be loaded.'}
          </p>
        )}
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900">
            Go to home
          </Link>
          <Link to="/products" className="inline-flex min-h-11 items-center rounded-xl border border-stone-300 px-5 text-sm font-bold text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-100 dark:hover:bg-stone-800">
            Browse products
          </Link>
        </div>
        <div className="mt-8 border-t border-stone-200 pt-5 dark:border-stone-800">
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">Need a hand?</h2>
          <ContactDetails />
        </div>
      </section>
    </PageContainer>
  )
}

export default ErrorPage
