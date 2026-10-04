import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Leaf, LockKeyhole } from 'lucide-react'
import { useAuth } from '@/components/auth/authContext'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton'
import PasswordField from '@/components/auth/PasswordField'

function LoginPage() {
  const { login, googleLogin, restoreError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const finishLogin = useCallback((user) => {
    const requestedPath = location.state?.from?.pathname
    const destination = user.role === 'admin'
      ? '/admin'
      : requestedPath?.startsWith('/admin')
        ? '/'
        : requestedPath || '/'
    navigate(destination, { replace: true })
  }, [location.state, navigate])

  const submitLogin = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const user = await login(email, password)
      finishLogin(user)
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitGoogleCredential = useCallback(async (credential) => {
    setError('')
    setIsSubmitting(true)
    try {
      const user = await googleLogin(credential)
      finishLogin(user)
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [finishLogin, googleLogin])

  return (
    <section className="mx-auto my-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-stone-300 bg-white shadow-xl shadow-emerald-950/5 dark:border-stone-800 dark:bg-stone-900 md:grid-cols-2">
      <div className="relative hidden min-h-[520px] flex-col justify-between overflow-hidden bg-emerald-950 p-10 text-white md:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_15%,rgba(217,165,74,.32),transparent_40%),linear-gradient(145deg,#123b2c,#061f18)]" />
        <div className="relative">
          <span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-amber-200">
            <Leaf aria-hidden="true" className="size-6" />
          </span>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-amber-200">Nila Foods</p>
        </div>
        <div className="relative">
          <h1 className="text-4xl font-black leading-tight tracking-tight">Rooted in nature.<br />Made for everyday.</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-100/80">
            Sign in to discover herbal oils, nourishing powders, and traditional sathu maavu.
          </p>
        </div>
        <p className="relative text-xs text-emerald-100/60">Thoughtful goodness, from our home to yours.</p>
      </div>

      <div className="p-6 sm:p-10 lg:p-12">
        <Link to="/" className="text-sm font-semibold text-emerald-800 hover:text-emerald-700 dark:text-emerald-300">
          ← Back to Nila Foods
        </Link>
        <div className="mt-10">
          <span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 md:hidden">
            <Leaf aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-stone-950 dark:text-white">Welcome back</h2>
          <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
            Sign in to your Nila Foods account.
          </p>
          {location.state?.registered && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">Your account is ready. Sign in to continue.</p>}
        </div>

        <form onSubmit={submitLogin} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-stone-700 dark:text-stone-200">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-stone-700 dark:bg-stone-950 dark:text-white dark:focus:ring-emerald-950"
              placeholder="you@example.com"
            />
          </div>
          <PasswordField
            id="password"
            name="password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            leadingIcon={LockKeyhole}
          />
          {(error || restoreError) && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error || restoreError}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-stone-400">
          <span className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
          <span>or continue with</span>
          <span className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
        </div>
        <GoogleSignInButton onCredential={submitGoogleCredential} />

        <p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400">
          New to Nila Foods? <Link to="/register" className="font-bold text-emerald-800 hover:underline dark:text-emerald-300">Create an account</Link>
        </p>
      </div>
    </section>
  )
}

export default LoginPage
