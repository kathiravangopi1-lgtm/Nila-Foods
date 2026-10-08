export function formatMoney(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount)
}

export function resolveImageUrl(path) {
  if (!path) return ''
  if (path.startsWith('/uploads/')) {
    const apiUrl = import.meta.env.VITE_API_URL?.trim()
    if (apiUrl?.startsWith('http')) {
      return `${new URL(apiUrl).origin}${path}`
    }
  }
  return path
}
