import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  value,
  onChange,
  required = true,
  minLength,
  leadingIcon: LeadingIcon,
}) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-stone-700 dark:text-stone-200">
        {label}
      </label>
      <div className="relative">
        {LeadingIcon && (
          <LeadingIcon aria-hidden="true" className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
        )}
        <input
          id={id}
          name={name}
          type={isVisible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          value={value}
          onChange={onChange}
          className={`h-12 w-full rounded-xl border border-stone-300 bg-white pr-12 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-stone-700 dark:bg-stone-950 dark:text-white dark:focus:ring-emerald-950 ${LeadingIcon ? 'pl-11' : 'pl-4'}`}
        />
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label={`${isVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={isVisible}
          className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        >
          {isVisible
            ? <EyeOff aria-hidden="true" className="size-4" />
            : <Eye aria-hidden="true" className="size-4" />}
        </button>
      </div>
    </div>
  )
}

export default PasswordField
