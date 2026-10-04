import GlideSelect from '@/components/GlideSelect'

function SelectField({ label, value, onChange, options, placeholder = 'Select an option', className = '' }) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <span className="min-h-5 text-sm font-semibold leading-5 text-stone-700 dark:text-stone-200">{label}</span>
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
        className="block w-full"
      />
    </div>
  )
}

export default SelectField
