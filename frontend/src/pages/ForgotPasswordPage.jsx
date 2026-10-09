import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '@/components/ui/Alert'
import Input from '@/components/ui/Input'
import OtpCodeInput from '@/components/auth/OtpCodeInput'
import PasswordField from '@/components/auth/PasswordField'
import { apiRequest } from '@/lib/api'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [stage, setStage] = useState('email')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)

  useEffect(() => {
    if (resendSeconds <= 0) return undefined
    const timeout = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timeout)
  }, [resendSeconds])

  const requestCode = async (event) => {
    event?.preventDefault()
    setBusy(true)
    setError('')
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setOtp('')
      setResendSeconds(60)
      setStage('otp')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await apiRequest('/auth/verify-reset-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      })
      setResetToken(result.resetToken)
      setStage('password')
    } catch (verifyError) {
      setError(verifyError.message)
    } finally {
      setBusy(false)
    }
  }

  const submitPassword = async (event) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, resetToken, newPassword }),
      })
      setStage('complete')
    } catch (resetError) {
      setError(resetError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto my-auto w-full max-w-lg rounded-3xl border border-stone-300 bg-white p-6 dark:border-stone-800 dark:bg-stone-900 sm:p-9">
      <Link to="/login" className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">← Sign in</Link>
      <h1 className="mt-6 text-3xl font-black text-stone-950 dark:text-white">Reset your password</h1>
      <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
        {stage === 'email' && 'Enter your email address and we’ll send a verification code if an account exists.'}
        {stage === 'otp' && 'Enter the 6-digit code sent to your email. The code expires in 10 minutes.'}
        {stage === 'password' && 'Choose a new password for your account.'}
        {stage === 'complete' && 'Your password has been reset successfully.'}
      </p>
      {stage === 'complete' ? (
        <div className="mt-6 space-y-4">
          <Alert variant="success" title="Password reset complete">Sign in with your new password.</Alert>
          <Link to="/login" className="flex h-12 items-center justify-center rounded-xl bg-emerald-800 text-sm font-bold text-white">Continue to sign in</Link>
        </div>
      ) : (
        <form onSubmit={stage === 'email' ? requestCode : stage === 'otp' ? verifyCode : submitPassword} className="mt-6 space-y-4">
          {stage === 'email' && (
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">Email address</span>
              <Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 px-4" />
            </label>
          )}
          {stage === 'otp' && (
            <>
              <p className="text-sm text-stone-600 dark:text-stone-300">Code sent to <span className="font-semibold">{email}</span></p>
              <OtpCodeInput value={otp} onChange={setOtp} disabled={busy} />
            </>
          )}
          {stage === 'password' && (
            <>
              <PasswordField id="reset-password" name="newPassword" label="New password (at least 8 characters)" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} />
              <PasswordField id="reset-confirm-password" name="confirmPassword" label="Confirm new password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} />
            </>
          )}
          {error && <Alert variant="destructive">{error}</Alert>}
          <button disabled={busy || (stage === 'otp' && otp.length !== 6)} className="h-12 w-full rounded-xl bg-emerald-800 text-sm font-bold text-white disabled:opacity-50">
            {busy ? 'Please wait…' : stage === 'email' ? 'Send verification code' : stage === 'otp' ? 'Verify code' : 'Reset password'}
          </button>
          {stage === 'otp' && (
            <button type="button" disabled={busy || resendSeconds > 0} onClick={requestCode} className="w-full py-2 text-sm font-semibold text-emerald-800 disabled:text-stone-400 dark:text-emerald-300">
              {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}
            </button>
          )}
        </form>
      )}
    </section>
  )
}

export default ForgotPasswordPage
