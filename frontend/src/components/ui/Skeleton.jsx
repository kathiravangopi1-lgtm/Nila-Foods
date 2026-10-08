function Skeleton({ className = '', ...props }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800 ${className}`}
      {...props}
    />
  )
}

export function ProductSkeletonGrid({ count = 8 }) {
  return (
    <div aria-label="Loading products" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),240px))] justify-start gap-5">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-stone-300 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="px-1 pb-2 pt-4">
            <Skeleton className="h-4 w-3/4" />
            <div className="mt-2 space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <Skeleton className="mt-3 h-5 w-2/5" />
          </div>
          <div className="flex items-center gap-2 px-1 pb-1">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="size-[42px] shrink-0 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CheckoutSkeleton() {
  return (
    <section role="status" aria-label="Loading checkout" className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="rounded-3xl border border-stone-300 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-7">
        <div className="mb-8 flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-1 flex-1" />
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-1 flex-1" />
          <Skeleton className="size-9 rounded-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-5 w-40 sm:col-span-2" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full sm:col-span-2" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="mt-8 flex justify-end">
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>
      </div>
    </section>
  )
}

export default Skeleton
