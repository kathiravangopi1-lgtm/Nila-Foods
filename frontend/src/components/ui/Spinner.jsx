function Spinner({ label = 'Loading', className = '' }) {
  return (
    <span role="status" aria-label={label} className={`inline-flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400 ${className}`}>
      <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      <span>{label}</span>
    </span>
  )
}

export default Spinner
