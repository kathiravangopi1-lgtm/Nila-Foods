import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import Input from '@/components/ui/Input'

function IndianPincodeField({ value, onValueChange, onLocationResolved, disabled = false }) {
  const pincode = value.trim()
  const appliedPincodeRef = useRef('')
  const lookup = useQuery({
    queryKey: ['locations', 'india-pincode', pincode],
    queryFn: () => apiRequest(`/locations/india/pincode/${pincode}`).then((result) => result.data),
    enabled: /^\d{6}$/.test(pincode),
    retry: false,
  })

  useEffect(() => {
    if (!/^\d{6}$/.test(pincode)) {
      appliedPincodeRef.current = ''
      return
    }
    if (lookup.data && appliedPincodeRef.current !== pincode) {
      appliedPincodeRef.current = pincode
      onLocationResolved(lookup.data)
    }
  }, [lookup.data, onLocationResolved, pincode])

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
      <Input
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
      />
      <span id="indian-pincode-status" aria-live="polite" className={`min-h-4 text-xs ${statusClass}`}>
        {statusMessage}
      </span>
    </label>
  )
}

export default IndianPincodeField
