import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { apiRequest } from '@/lib/api'

const MIN_CITY_SEARCH_LENGTH = 2

function LocationField({
  level,
  label,
  value,
  onValueChange,
  state = '',
  required = false,
  disabled = false,
}) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [search])

  const query = useQuery({
    queryKey: ['locations', level, 'India', state, debouncedSearch],
    queryFn: async () => {
      const parameters = new URLSearchParams()
      parameters.set('country', 'India')
      if (level === 'city' && state) parameters.set('state', state)
      if (debouncedSearch) parameters.set('search', debouncedSearch)
      const endpoint = { state: 'states', city: 'cities' }[level]
      const result = await apiRequest(`/locations/${endpoint}?${parameters}`)
      return result.data.map((location) => location.name)
    },
    enabled: level !== 'city' || debouncedSearch.length >= MIN_CITY_SEARCH_LENGTH,
  })

  const onInputValueChange = (nextValue, { reason }) => {
    setSearch(nextValue)
    if (reason === 'input' && nextValue !== value) onValueChange('')
  }

  let emptyText = 'No matching locations found.'
  if (level === 'city' && debouncedSearch.length < MIN_CITY_SEARCH_LENGTH) {
    emptyText = 'Type at least 2 characters to search for a city.'
  } else if (query.isFetching) {
    emptyText = 'Searching locations…'
  } else if (query.isError) {
    emptyText = query.error.message
  }

  return (
    <SearchableSelect
      label={label}
      value={value}
      onValueChange={onValueChange}
      onInputValueChange={onInputValueChange}
      options={query.data || []}
      placeholder={`Search ${label.toLowerCase()}…`}
      emptyText={emptyText}
      required={required}
      disabled={disabled}
    />
  )
}

export default LocationField
