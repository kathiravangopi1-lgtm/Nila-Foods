export function formatMoney(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount)
}

export function resolveImageUrl(path) {
  if (!path) return ''
  return path.startsWith('/uploads/') ? path : path
}
