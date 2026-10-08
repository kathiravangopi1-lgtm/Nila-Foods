function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`min-h-24 w-full resize-y rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-950 outline-none transition placeholder:text-stone-500 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:opacity-70 dark:border-stone-700 dark:bg-stone-950 dark:text-white dark:placeholder:text-stone-400 dark:focus:ring-emerald-950 dark:disabled:bg-stone-900 ${className}`}
      {...props}
    />
  )
}

export default Textarea
