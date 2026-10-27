import { useState } from 'react'
import type { Category, Expense } from '../types'
import { createExpense, updateExpense } from '../lib/api'

type InitialValues = {
  description?: string
  amount?: string
  category_id?: number | null
  date?: string
  source?: 'manual' | 'voice'
  is_recurring?: boolean
  due_day?: number | null
}

type Props = {
  categories: Category[]
  onCreated: (expense: Expense) => void
  onClose: () => void
  initialValues?: InitialValues
  expenseId?: string
  onUpdated?: (expense: Expense) => void
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function ManualEntryDialog({ categories, onCreated, onClose, initialValues, expenseId, onUpdated }: Props) {
  const [form, setForm] = useState({
    description: initialValues?.description ?? '',
    amount:      initialValues?.amount      ?? '',
    category_id: initialValues?.category_id ?? categories[0]?.id ?? 0,
    date:        initialValues?.date        ?? todayISO(),
    is_recurring: initialValues?.is_recurring ?? false,
    due_day: initialValues?.due_day ? String(initialValues.due_day) : '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!form.description.trim()) { setError('Description is required.'); return }
    if (!form.amount || isNaN(parseFloat(form.amount))) { setError('Enter a valid amount.'); return }
    if (!form.category_id) { setError('Select a category.'); return }
    if (form.is_recurring && form.due_day && (parseInt(form.due_day) < 1 || parseInt(form.due_day) > 31)) {
      setError('Due day must be between 1 and 31.'); return
    }
    setError('')
    setSaving(true)
    try {
      if (expenseId) {
        const expense = await updateExpense(expenseId, {
          description: form.description.trim(),
          amount: form.amount,
          category_id: Number(form.category_id),
          date: form.date,
          is_recurring: form.is_recurring,
          due_day: form.is_recurring && form.due_day ? parseInt(form.due_day) : null,
        })
        onUpdated?.(expense)
      } else {
        const expense = await createExpense({
          description: form.description.trim(),
          amount: form.amount,
          category_id: Number(form.category_id),
          date: form.date,
          source: initialValues?.source ?? 'manual',
          is_recurring: form.is_recurring,
          due_day: form.is_recurring && form.due_day ? parseInt(form.due_day) : null,
        })
        onCreated(expense)
      }
    } catch {
      setError('Failed to save expense. Check the backend is running.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={dialog}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{expenseId ? 'Edit expense' : 'Add expense manually'}</h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <Field label="Description">
            <input
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="e.g. Groceries at Monoprix"
              style={inputStyle}
              autoFocus
            />
          </Field>

          <div style={{ display: 'flex', gap: 12 }}>
            <Field label="Amount (TND)" style={{ flex: 1 }}>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="0.000"
                style={{ ...inputStyle, textAlign: 'right' }}
              />
            </Field>
            <Field label="Date" style={{ flex: 1 }}>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Category">
            <select
              value={form.category_id}
              onChange={e => set('category_id', Number(e.target.value))}
              style={inputStyle}
            >
              {categories.length === 0 && <option value="">No categories — create one first</option>}
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.is_recurring}
              onChange={e => set('is_recurring', e.target.checked)}
            />
            Recurring expense
          </label>

          {form.is_recurring && (
            <Field label="Due day (1–31)">
              <input
                type="number"
                min="1"
                max="31"
                value={form.due_day}
                onChange={e => set('due_day', e.target.value)}
                placeholder="e.g. 1"
                style={{ ...inputStyle, width: 100 }}
              />
            </Field>
          )}

          {error && <p style={{ margin: 0, fontSize: 12, color: '#f43f5e' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving} style={{ ...submitBtn, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : expenseId ? 'Update expense' : 'Save expense'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 50,
}

const dialog: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  padding: '24px 28px',
  width: '100%',
  maxWidth: 460,
  boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
}

const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'var(--color-background)',
  color: 'var(--color-text)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const closeBtn: React.CSSProperties = {
  background: 'transparent', border: 'none',
  color: 'var(--color-text-muted)', cursor: 'pointer',
  fontSize: 16, padding: 4, lineHeight: 1,
}

const cancelBtn: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'transparent', color: 'var(--color-text)',
  fontSize: 13, cursor: 'pointer',
}

const submitBtn: React.CSSProperties = {
  padding: '7px 18px', borderRadius: 6,
  border: 'none', background: '#3b82f6',
  color: '#fff', fontSize: 13, fontWeight: 500,
  cursor: 'pointer',
}
