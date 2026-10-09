import { API_BASE_URL } from '@/lib/api'

export function formatMoney(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount)
}

export function resolveImageUrl(path) {
  if (!path) return ''
  if (path.startsWith('/uploads/')) {
    if (API_BASE_URL.startsWith('http')) {
      return `${new URL(API_BASE_URL).origin}${path}`
    }
  }
  return path
}
