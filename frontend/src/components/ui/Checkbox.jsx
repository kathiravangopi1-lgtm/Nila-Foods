import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { Check } from 'lucide-react'

function Checkbox({ id, checked, onCheckedChange, disabled = false, className = '', ...props }) {
  return (
    <CheckboxPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={`grid size-5 shrink-0 cursor-pointer place-items-center rounded border border-stone-400 bg-white text-white outline-none transition data-checked:border-emerald-800 data-checked:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-600 dark:bg-stone-950 dark:data-checked:border-emerald-600 dark:data-checked:bg-emerald-700 ${className}`}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export default Checkbox
