import { useCallback, useMemo, useState } from 'react'
import { FavoritesContext } from './favoritesContext'

const STORAGE_KEY = 'nila-foods-favorites'

function readFavorites() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : []
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return []
  }
}

export function FavoritesProvider({ children }) {
  const [favoriteIds, setFavoriteIds] = useState(readFavorites)

  const toggleFavorite = useCallback((id) => {
    setFavoriteIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ favoriteIds, toggleFavorite }),
    [favoriteIds, toggleFavorite],
  )
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}
