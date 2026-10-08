export function Table({ children, className = '' }) {
  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-stone-300 dark:border-stone-700 ${className}`}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">{children}</table>
    </div>
  )
}

export function TableHeader({ children }) {
  return <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-600 dark:bg-stone-950 dark:text-stone-300">{children}</thead>
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-stone-200 bg-white dark:divide-stone-800 dark:bg-stone-900">{children}</tbody>
}

export function TableRow({ children, className = '' }) {
  return <tr className={className}>{children}</tr>
}

export function TableHead({ children, className = '', ...props }) {
  return <th scope="col" className={`px-4 py-3 font-bold ${className}`} {...props}>{children}</th>
}

export function TableCell({ children, className = '', ...props }) {
  return <td className={`px-4 py-3 align-middle ${className}`} {...props}>{children}</td>
}
