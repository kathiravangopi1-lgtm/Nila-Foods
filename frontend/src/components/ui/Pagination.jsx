import { ChevronLeft, ChevronRight } from 'lucide-react'

function Pagination({ page, pages, onPageChange, className = '' }) {
  if (!pages || pages <= 1) return null
  return (
    <nav aria-label="Pagination" className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-stone-300 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700"
      >
        <ChevronLeft aria-hidden="true" className="size-4" /> Previous
      </button>
      <span aria-live="polite" className="px-2 text-sm text-stone-500">Page {page} of {pages}</span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
        className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-stone-300 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700"
      >
        Next <ChevronRight aria-hidden="true" className="size-4" />
      </button>
    </nav>
  )
}

export default Pagination
