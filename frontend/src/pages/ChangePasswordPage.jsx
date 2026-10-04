import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/components/auth/authContext'
import { useToast } from '@/components/feedback/toastContext'
import PasswordField from '@/components/auth/PasswordField'

function ChangePasswordPage() {
  const { changePassword } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (form.newPassword !== form.confirmPassword) {
      setError('Your new passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await changePassword(form.currentPassword, form.newPassword)
      showToast('Your password was changed.', 'Password updated', 'success')
      navigate('/account')
    } catch (changeError) {
      setError(changeError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto my-auto w-full max-w-lg rounded-3xl border border-stone-300 bg-white p-6 dark:border-stone-800 dark:bg-stone-900 sm:p-9">
      <Link to="/account" className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">← Account</Link>
      <h1 className="mt-5 text-2xl font-black text-stone-950 dark:text-white">Change password</h1>
      <p className="mt-2 text-sm text-stone-500">Enter your current password and choose a new one.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <PasswordField
          id="current-password"
          name="currentPassword"
          label="Current password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={update}
        />
        <PasswordField
          id="new-password"
          name="newPassword"
          label="New password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={update}
          minLength={8}
        />
        <PasswordField
          id="confirm-new-password"
          name="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={update}
          minLength={8}
        />
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <button disabled={busy} className="h-12 w-full rounded-xl bg-emerald-800 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Updating…' : 'Update password'}</button>
      </form>
    </section>
  )
}

export default ChangePasswordPage
