export type AuthMode = 'login' | 'signup'

export type AuthValues = {
  name: string
  email: string
  password: string
  confirm: string
}

export type AuthField = keyof AuthValues

export type AuthErrors = Partial<Record<AuthField, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const MIN_PASSWORD_LENGTH = 8

/**
 * Client-side checks for the log-in and sign-up forms.
 * Log in only checks that fields are filled (the `email` field also accepts a username);
 * format and length rules apply when creating an account.
 */
export function validateAuth(values: AuthValues, mode: AuthMode): AuthErrors {
  const errors: AuthErrors = {}
  const email = values.email.trim()

  if (mode === 'login') {
    if (!email) errors.email = 'Enter your email or username.'
    if (!values.password) errors.password = 'Enter your password.'
    return errors
  }

  if (!values.name.trim()) errors.name = 'Enter your name.'

  if (!email) errors.email = 'Enter your email address.'
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email, like name@example.com.'

  if (!values.password) errors.password = 'Enter your password.'
  else if (values.password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Password is too short. Use at least ${MIN_PASSWORD_LENGTH} characters.`

  if (!values.confirm) errors.confirm = 'Confirm your password.'
  else if (values.confirm !== values.password) errors.confirm = 'Passwords don’t match.'

  return errors
}
