import { ChevronDown } from 'lucide-react'

function Collapsible({ title, subtitle, children, defaultOpen = false, className = '' }) {
  return (
    <details open={defaultOpen} className={`group rounded-2xl border border-stone-300 bg-white dark:border-stone-800 dark:bg-stone-900 ${className}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-stone-900 dark:text-white">{title}</span>
          {subtitle && <span className="mt-1 block text-xs text-stone-500">{subtitle}</span>}
        </span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-stone-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-stone-200 px-4 py-4 dark:border-stone-800">{children}</div>
    </details>
  )
}

export default Collapsible
