import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react'

const variants = {
  default: {
    icon: Info,
    className: 'border-stone-300 bg-white text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100',
  },
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
  },
  destructive: {
    icon: AlertCircle,
    className: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100',
  },
  warning: {
    icon: TriangleAlert,
    className: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
  },
}

function Alert({ variant = 'default', title, children, className = '', role, ...props }) {
  const config = variants[variant] || variants.default
  const Icon = config.icon
  return (
    <div
      role={role || (variant === 'destructive' ? 'alert' : 'status')}
      className={`flex items-start gap-3 rounded-xl border p-3.5 text-sm ${config.className} ${className}`}
      {...props}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={title ? 'mt-1 text-xs leading-5 opacity-85' : 'leading-5'}>{children}</div>}
      </div>
    </div>
  )
}

export default Alert
