const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()
const normalizedApiUrl = (configuredApiUrl || '/api').replace(/\/+$/, '')
export const API_BASE_URL = /\/api$/i.test(normalizedApiUrl)
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`

export async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  const responseBody = await response.text()
  let payload = {}
  if (responseBody) {
    try {
      const parsedBody = JSON.parse(responseBody)
      payload = parsedBody && typeof parsedBody === 'object'
        ? parsedBody
        : { error: typeof parsedBody === 'string' ? parsedBody : '' }
    } catch {
      payload = { error: responseBody.slice(0, 300) }
    }
  }

  if (!response.ok) {
    const errorMessage = payload.error
      || payload.message
      || (response.status === 401
        ? 'Authentication failed (401). The access token may be missing, expired, or invalid.'
        : `Request failed with status ${response.status}${response.statusText ? ` ${response.statusText}` : ''}.`)
    const error = new Error(errorMessage)
    error.status = response.status
    error.code = payload.code
    error.retryAfterSeconds = payload.retryAfterSeconds
    throw error
  }

  return payload
}
