import GlideSelect from '@/components/GlideSelect'

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  className = '',
  labelClassName = 'text-sm',
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <span className={`${labelClassName.includes('text-xs') ? 'min-h-4 leading-4' : 'min-h-5 leading-5'} ${labelClassName} font-semibold text-stone-700 dark:text-stone-200`}>{label}</span>
      <GlideSelect
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        ariaLabel={label}
        size="lg"
        accentColor="#065f46"
        surfaceColor="var(--background)"
        highlightColor="color-mix(in srgb, #059669 18%, var(--background))"
        textColor="var(--foreground)"
        radius={16}
        className="block w-full"
      />
    </div>
  )
}

export default SelectField
