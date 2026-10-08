import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api'
import { AuthContext } from './authContext'

const AUTH_STORAGE_KEY = 'nila-foods-auth'

function readStoredAuth() {
  const stored = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!stored) return null

  try {
    const auth = JSON.parse(stored)
    return typeof auth.token === 'string' ? auth : null
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function AuthProvider({ children }) {
  const [storedAuth] = useState(readStoredAuth)
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(storedAuth))
  const [restoreError, setRestoreError] = useState('')

  useEffect(() => {
    if (!storedAuth) {
      return
    }

    let cancelled = false
    apiRequest('/auth/me', { token: storedAuth.token })
      .then(({ data }) => {
        if (cancelled) return
        setToken(storedAuth.token)
        setUser(data)
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: storedAuth.token }))
      })
      .catch(() => {
        if (cancelled) return
        window.localStorage.removeItem(AUTH_STORAGE_KEY)
        setRestoreError('Your saved sign-in could not be verified. Please sign in again.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [storedAuth])

  const login = async (email, password) => {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(result.token)
    setUser(result.user)
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: result.token }))
    return result.user
  }

  const googleLogin = async (credential) => {
    const result = await apiRequest('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    })
    setToken(result.token)
    setUser(result.user)
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: result.token }))
    return result.user
  }

  const register = async (registration) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(registration),
  })

  const changePassword = async (currentPassword, newPassword) => {
    const result = await apiRequest('/auth/change-password', {
      method: 'POST',
      token,
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    setToken(result.token)
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: result.token }))
  }

  const updateProfile = async (profile) => {
    const result = await apiRequest('/auth/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify(profile),
    })
    setUser((current) => ({ ...current, ...result.data }))
    return result.data
  }

  const logout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    setToken(null)
    setUser(null)
  }

  const value = { token, user, isLoading, restoreError, login, googleLogin, register, changePassword, updateProfile, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
