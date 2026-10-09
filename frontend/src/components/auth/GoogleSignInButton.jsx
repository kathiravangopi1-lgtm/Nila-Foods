import { useEffect, useRef, useState } from 'react'

const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client'

function GoogleSignInButton({ onCredential }) {
  const buttonRef = useRef(null)
  const [error, setError] = useState('')
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId) return undefined

    let cancelled = false
    let script = document.querySelector(`script[src="${GOOGLE_SCRIPT_URL}"]`)
    const initialize = () => {
      if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          if (credential) onCredential(credential)
          else setError('Google did not return a sign-in credential. Please try again.')
        },
      })
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: document.documentElement.classList.contains('dark') ? 'filled_black' : 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'signin_with',
        width: Math.min(buttonRef.current.clientWidth, 400),
      })
    }
    const onScriptError = () => {
      if (!cancelled) setError('Google sign-in could not load. Check your connection and try again.')
    }

    if (window.google?.accounts?.id) {
      initialize()
    } else {
      if (!script) {
        script = document.createElement('script')
        script.src = GOOGLE_SCRIPT_URL
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
      script.addEventListener('load', initialize)
      script.addEventListener('error', onScriptError)
    }

    return () => {
      cancelled = true
      script?.removeEventListener('load', initialize)
      script?.removeEventListener('error', onScriptError)
    }
  }, [clientId, onCredential])

  const message = clientId
    ? error
    : 'Google sign-in needs VITE_GOOGLE_CLIENT_ID configured.'

  return (
    <div className="space-y-2">
      <div ref={buttonRef} className="flex min-h-10 w-full justify-center" />
      {message && <p role="status" className="text-center text-xs text-stone-500 dark:text-stone-400">{message}</p>}
    </div>
  )
}

export default GoogleSignInButton
