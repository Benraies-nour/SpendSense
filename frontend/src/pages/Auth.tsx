import type { FormEvent } from 'react'
import { useId, useState } from 'react'
import { ArrowRightIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { SiteHeader } from '../components/SiteHeader'
import { TextField } from '../components/TextField'
import { navigate, routeHref } from '../hooks/useHashRoute'
import { login, signUp } from '../lib/api'
import type { Theme } from '../hooks/useTheme'
import type { AuthField, AuthMode, AuthValues } from '../lib/validation'
import { MIN_PASSWORD_LENGTH, validateAuth } from '../lib/validation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog'

type AuthProps = {
  mode: AuthMode
  theme: Theme
  onToggleTheme: () => void
}

const emptyValues: AuthValues = { name: '', email: '', password: '', confirm: '' }

export function Auth({ mode, theme, onToggleTheme }: AuthProps) {
  const tabsName = useId()
  const [values, setValues] = useState<AuthValues>(emptyValues)
  const [touched, setTouched] = useState<Partial<Record<AuthField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [signInError, setSignInError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [welcomeName, setWelcomeName] = useState<string | null>(null)

  // Switching between log in and sign up starts a fresh submission,
  // but keeps what the user has already typed.
  const [prevMode, setPrevMode] = useState(mode)
  if (mode !== prevMode) {
    setPrevMode(mode)
    setSubmitted(false)
    setSignInError('')
  }

  const errors = validateAuth(values, mode)
  // An error shows once the field has been left with a value, or after a submit attempt.
  const visibleError = (field: AuthField) =>
    errors[field] && (touched[field] || submitted) ? errors[field] : undefined

  const fieldProps = (field: AuthField) => ({
    value: values[field],
    error: visibleError(field),
    onChange: (value: string) => {
      setValues((v) => ({ ...v, [field]: value }))
      setSignInError('')
    },
    onBlur: () => {
      if (values[field]) setTouched((t) => ({ ...t, [field]: true }))
    },
  })

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length > 0) return

    if (mode === 'login') {
      setSubmitting(true)
      try {
        await login(values.email, values.password)
        navigate('overview')
      } catch (err: any) {
        setSignInError(err.message ?? 'Login failed.')
      } finally {
        setSubmitting(false)
      }
      return
    }

    // Sign up — call the backend
    setSubmitting(true)
    try {
      await signUp(values.name, values.email, values.password)
      setWelcomeName(values.name)
    } catch (err: any) {
      setSignInError(err.message || 'Sign up failed. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div className="page page-auth">
      <Dialog open={welcomeName !== null}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Welcome, {welcomeName}!</DialogTitle>
            <DialogDescription>
              Your account is ready. Start by adding a category and setting your first budget.
            </DialogDescription>
          </DialogHeader>
          <button
            className="btn btn-primary btn-block"
            onClick={() => navigate('overview')}
          >
            Get started <ArrowRightIcon />
          </button>
        </DialogContent>
      </Dialog>
      <SiteHeader theme={theme} onToggleTheme={onToggleTheme} />
      <main className="auth-main">
        <div className="card elev-md auth-card">
          <div className="seg auth-tabs" role="tablist">
            <label className="seg-opt" role="tab" aria-selected={isLogin}>
              <input type="radio" name={tabsName} checked={isLogin} onChange={() => navigate('login')} />
              Log in
            </label>
            <label className="seg-opt" role="tab" aria-selected={!isLogin}>
              <input type="radio" name={tabsName} checked={!isLogin} onChange={() => navigate('signup')} />
              Sign up
            </label>
          </div>

          {isLogin ? (
            <form className="auth-form" noValidate onSubmit={handleSubmit}>
              <div>
                <h2>Welcome back</h2>
                <p className="auth-intro muted">Log in to see this month’s spending.</p>
              </div>
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                {...fieldProps('email')}
              />
              <TextField
                label="Password"
                type="password"
                autoComplete="current-password"
                labelAside={<a href="#">Forgot password?</a>}
                {...fieldProps('password')}
              />
              {signInError && (
                <p role="alert" className="form-error">
                  <WarningCircleIcon />
                  {signInError}
                </p>
              )}
              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? 'Logging in…' : 'Log in'}
              </button>
              <p className="auth-switch muted">
                New to SpendSense? <a href={routeHref.signup}>Create an account</a>
              </p>
            </form>
          ) : (
            <form className="auth-form" noValidate onSubmit={handleSubmit}>
              <div>
                <h2>Create your account</h2>
                <p className="auth-intro muted">Set budgets by category in a few minutes.</p>
              </div>
              <TextField label="Name" type="text" autoComplete="name" {...fieldProps('name')} />
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                {...fieldProps('email')}
              />
              <TextField
                label="Password"
                type="password"
                autoComplete="new-password"
                hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
                {...fieldProps('password')}
              />
              <TextField
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                {...fieldProps('confirm')}
              />
              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? 'Creating account… (may take ~30 s)' : 'Create account'}
              </button>
              <p className="auth-switch muted">
                Already have an account? <a href={routeHref.login}>Log in</a>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
