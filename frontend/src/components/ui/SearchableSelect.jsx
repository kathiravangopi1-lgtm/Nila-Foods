import { useId, useMemo } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Combobox } from '@base-ui/react/combobox'

function SearchableSelect({
  label,
  value,
  onValueChange,
  onInputValueChange,
  options,
  placeholder = 'Search and select…',
  emptyText = 'No results found.',
  required = false,
  disabled = false,
}) {
  const id = useId()
  const availableOptions = value && !options.some((option) => (
    (typeof option === 'string' ? option : option.value) === value
  ))
    ? [...options, value]
    : options
  const optionsKey = JSON.stringify(availableOptions)
  const normalizedOptions = useMemo(() => JSON.parse(optionsKey).map((option) => (
    typeof option === 'string' ? { value: option, label: option } : option
  )), [optionsKey])
  const selectedOption = useMemo(
    () => normalizedOptions.find((option) => option.value === value) || null,
    [normalizedOptions, value],
  )

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-stone-700 dark:text-stone-200">
        {label}{required ? ' *' : ''}
      </label>
      <Combobox.Root
        items={normalizedOptions}
        value={selectedOption}
        onValueChange={(nextValue) => onValueChange(nextValue?.value || '')}
        itemToStringLabel={(option) => option.label}
        onInputValueChange={onInputValueChange}
        autoHighlight
      >
        <Combobox.InputGroup className="relative flex h-11 w-full items-center rounded-xl border border-stone-300 bg-white text-sm focus-within:border-emerald-700 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-emerald-700 dark:border-stone-700 dark:bg-stone-950 dark:text-white">
          <Combobox.Input
            id={id}
            required={required}
            disabled={disabled}
            aria-label={label}
            placeholder={placeholder}
            className="h-full min-w-0 flex-1 rounded-xl border-0 bg-transparent px-3 text-sm text-stone-950 outline-none placeholder:text-stone-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white dark:placeholder:text-stone-400"
          />
          <Combobox.Trigger
            aria-label={`Show ${label.toLowerCase()} options`}
            disabled={disabled}
            className="grid h-full w-10 shrink-0 place-items-center rounded-r-xl border-0 bg-transparent text-stone-500 disabled:cursor-not-allowed dark:text-stone-400"
          >
            <ChevronDown aria-hidden="true" className="size-4" />
          </Combobox.Trigger>
        </Combobox.InputGroup>
        <Combobox.Portal>
          <Combobox.Positioner className="z-[110] outline-none" sideOffset={4}>
            <Combobox.Popup className="w-[var(--anchor-width)] max-w-[var(--available-width)] overflow-hidden rounded-xl border border-stone-300 bg-white text-stone-950 shadow-lg dark:border-stone-700 dark:bg-stone-900 dark:text-white">
              <Combobox.Empty>
                <p className="px-3 py-3 text-sm text-stone-500 dark:text-stone-400">{emptyText}</p>
              </Combobox.Empty>
              <Combobox.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto p-1 outline-none">
                {(option) => (
                  <Combobox.Item
                    key={option.value}
                    value={option}
                    className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm outline-none data-highlighted:bg-emerald-50 data-highlighted:text-emerald-950 dark:data-highlighted:bg-emerald-950 dark:data-highlighted:text-emerald-100"
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    <Combobox.ItemIndicator>
                      <Check aria-hidden="true" className="size-4 text-emerald-800 dark:text-emerald-300" />
                    </Combobox.ItemIndicator>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  )
}

export default SearchableSelect
