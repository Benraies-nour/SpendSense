import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'
import { WarningCircleIcon } from '@phosphor-icons/react'

type TextFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: ReactNode
  /** Extra content on the label row, e.g. a "Forgot password?" link. */
  labelAside?: ReactNode
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'id'>

/** Labelled input with an inline error message (or a hint when valid). */
export function TextField({ label, value, onChange, error, hint, labelAside, ...inputProps }: TextFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const labelElement = <label htmlFor={id}>{label}</label>

  return (
    <div className="field">
      {labelAside ? (
        <div className="field-label-row">
          {labelElement}
          {labelAside}
        </div>
      ) : (
        labelElement
      )}
      <input
        id={id}
        className="input"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        {...inputProps}
      />
      {error ? (
        <p id={messageId} role="alert" className="field-error">
          <WarningCircleIcon />
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
