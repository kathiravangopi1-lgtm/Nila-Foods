import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Leaf } from 'lucide-react'
import { useAuth } from '@/components/auth/authContext'
import PasswordField from '@/components/auth/PasswordField'

function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Your passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password })
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (registrationError) {
      setError(registrationError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto my-auto w-full max-w-lg rounded-3xl border border-stone-300 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-9">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300"><Leaf className="size-5" />Nila Foods</Link>
      <h1 className="mt-6 text-3xl font-black text-stone-950 dark:text-white">Create your account</h1>
      <p className="mt-2 text-sm text-stone-500">Join Nila Foods for thoughtful everyday wellness.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        {[
          ['name', 'Full name', 'text', true],
          ['email', 'Email address', 'email', true],
          ['phone', 'Phone number (optional)', 'tel', false],
        ].map(([name, label, type, required]) => (
          <label key={name} className="block space-y-2">
            <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">{label}</span>
            <input name={name} type={type} value={form[name]} onChange={update} required={required} autoComplete={name} className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 dark:border-stone-700 dark:bg-stone-950 dark:text-white dark:focus:ring-emerald-950" />
          </label>
        ))}
        <PasswordField
          id="register-password"
          name="password"
          label="Password (at least 8 characters)"
          autoComplete="new-password"
          value={form.password}
          onChange={update}
          minLength={8}
        />
        <PasswordField
          id="register-confirm-password"
          name="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={update}
          minLength={8}
        />
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
        <button disabled={busy} className="h-12 w-full rounded-xl bg-emerald-800 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-50">{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="mt-5 text-center text-sm text-stone-500">Already have an account? <Link to="/login" className="font-bold text-emerald-800 dark:text-emerald-300">Sign in</Link></p>
    </section>
  )
}

export default RegisterPage
