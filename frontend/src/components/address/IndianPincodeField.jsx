import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'

function IndianPincodeField({ value, onValueChange, onLocationResolved, disabled = false }) {
  const pincode = value.trim()
  const lookup = useQuery({
    queryKey: ['locations', 'india-pincode', pincode],
    queryFn: () => apiRequest(`/locations/india/pincode/${pincode}`).then((result) => result.data),
    enabled: /^\d{6}$/.test(pincode),
    retry: false,
  })

  useEffect(() => {
    if (lookup.data) onLocationResolved(lookup.data)
  }, [lookup.data, onLocationResolved])

  let statusMessage = ''
  let statusClass = 'text-stone-500 dark:text-stone-400'
  if (lookup.isFetching) {
    statusMessage = 'Looking up city and state…'
  } else if (lookup.isError) {
    statusMessage = lookup.error.message
    statusClass = 'text-rose-700 dark:text-rose-300'
  } else if (lookup.data) {
    statusMessage = `Found ${lookup.data.city}, ${lookup.data.state}.`
    statusClass = 'text-emerald-800 dark:text-emerald-300'
  }

  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">PIN code *</span>
      <input
        name="postalCode"
        type="text"
        inputMode="numeric"
        autoComplete="postal-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        disabled={disabled}
        value={value}
        onChange={(event) => onValueChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
        aria-describedby="indian-pincode-status"
        className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-700 disabled:bg-stone-100 dark:border-stone-700 dark:bg-stone-950 dark:text-white dark:disabled:bg-stone-900"
      />
      <span id="indian-pincode-status" aria-live="polite" className={`min-h-4 text-xs ${statusClass}`}>
        {statusMessage}
      </span>
    </label>
  )
}

export default IndianPincodeField
