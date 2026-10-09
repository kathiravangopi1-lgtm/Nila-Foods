import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import Alert from '@/components/ui/Alert'
import Input from '@/components/ui/Input'
import OtpCodeInput from '@/components/auth/OtpCodeInput'
import { apiRequest } from '@/lib/api'

function EmailVerificationPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(location.state?.email || searchParams.get('email') || '')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(60)

  useEffect(() => {
    if (resendSeconds <= 0) return undefined
    const timeout = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timeout)
  }, [resendSeconds])

  const verify = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await apiRequest('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      })
      setVerified(true)
    } catch (verifyError) {
      setError(verifyError.message)
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setBusy(true)
    setError('')
    try {
      await apiRequest('/auth/resend-email-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setResendSeconds(60)
    } catch (resendError) {
      setError(resendError.message)
      if (resendError.retryAfterSeconds) setResendSeconds(resendError.retryAfterSeconds)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto my-auto w-full max-w-lg rounded-3xl border border-stone-300 bg-white p-6 dark:border-stone-800 dark:bg-stone-900 sm:p-9">
      <Link to="/login" className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">← Sign in</Link>
      <h1 className="mt-6 text-3xl font-black text-stone-950 dark:text-white">Verify your email</h1>
      <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
        Enter the code we sent to your email. It expires after 10 minutes.
      </p>
      {verified ? (
        <div className="mt-6 space-y-4">
          <Alert variant="success" title="Email verified">Your account is ready. You can now sign in.</Alert>
          <Link to="/login" className="flex h-12 items-center justify-center rounded-xl bg-emerald-800 text-sm font-bold text-white">Continue to sign in</Link>
        </div>
      ) : (
        <form onSubmit={verify} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">Email address</span>
            <Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 px-4" />
          </label>
          <OtpCodeInput value={otp} onChange={setOtp} disabled={busy} />
          {error && <Alert variant="destructive">{error}</Alert>}
          <button disabled={busy || otp.length !== 6} className="h-12 w-full rounded-xl bg-emerald-800 text-sm font-bold text-white disabled:opacity-50">
            {busy ? 'Verifying…' : 'Verify email'}
          </button>
          <button type="button" disabled={busy || resendSeconds > 0} onClick={resend} className="w-full py-2 text-sm font-semibold text-emerald-800 disabled:text-stone-400 dark:text-emerald-300">
            {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}
          </button>
        </form>
      )}
    </section>
  )
}

export default EmailVerificationPage
